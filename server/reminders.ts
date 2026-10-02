import type { AppNotification, DatabaseState, NotificationPreferences, NotificationType, TaskItem } from './db.ts';
import { getDefaultNotificationPreferences } from './db.ts';
import { getGMT1Info, getWATPeriodDetails, pickCuratedQuote } from './wat.ts';

export interface ReminderDraft {
  key: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export function getPreferences(db: DatabaseState, userId: string): NotificationPreferences {
  const stored = (db.notificationPreferences || []).find((p) => p.userId === userId);
  return { ...getDefaultNotificationPreferences(userId), ...(stored || {}) };
}

export function isWithinQuietHours(prefs: NotificationPreferences, gmt1Hour: number): boolean {
  const { quietHoursStart: start, quietHoursEnd: end } = prefs;
  if (start === null || end === null) return false;
  if (start === end) return true;
  if (start < end) return gmt1Hour >= start && gmt1Hour < end;
  // Window wraps past midnight, e.g. 22:00 -> 06:00
  return gmt1Hour >= start || gmt1Hour < end;
}

export function isTypeEnabled(prefs: NotificationPreferences, type: NotificationType): boolean {
  if (!prefs.enabled) return false;
  switch (type) {
    case 'message':
      return prefs.messages;
    case 'motivation':
      return prefs.motivation;
    case 'todo':
      return prefs.todos;
    case 'budget':
      return prefs.budget;
    case 'attendance':
      return prefs.attendance;
    case 'reading':
      return prefs.reading;
    default:
      return true;
  }
}

function getWATDateStr(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value || '1970';
  const m = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${y}-${m}-${day}`;
}

function getWATMonthStr(d: Date = new Date()): string {
  return getWATDateStr(d).slice(0, 7);
}

function daySeed(dateStr: string): number {
  let seed = 0;
  for (let i = 0; i < dateStr.length; i += 1) seed = (seed * 31 + dateStr.charCodeAt(i)) % 100000;
  return seed;
}

function isOverdue(task: TaskItem, dateStr: string): boolean {
  if (!task.dueDate) return false;
  return task.dueDate < dateStr && task.status !== 'completed';
}

function isDueToday(task: TaskItem, dateStr: string): boolean {
  return task.dueDate === dateStr && task.status !== 'completed';
}

/**
 * Builds the list of notifications a user should receive right now.
 *
 * Reminders are time-window based rather than purely time based: a window that
 * has already passed inside quiet hours simply waits for the next day. Each
 * reminder carries a stable `key` so the caller can deduplicate pushes that a
 * cron job and an open browser tab would otherwise both fire.
 */
export function buildReminderDrafts(db: DatabaseState, userId: string): ReminderDraft[] {
  const user = db.users.find((u) => u.id === userId);
  if (!user) return [];

  const prefs = getPreferences(db, userId);
  if (!prefs.enabled) return [];

  const gmt1 = getGMT1Info();
  const today = getWATDateStr();
  const month = getWATMonthStr();
  const seed = daySeed(today);
  const firstName = (user.name || 'Member').split(' ')[0];
  const drafts: ReminderDraft[] = [];

  const attendanceToday = (db.attendance || []).find((a) => a.userId === userId && a.date === today);
  const hasClockedIn = Boolean(attendanceToday?.clockIn);
  const isClockedOut = Boolean(attendanceToday?.clockOut);
  const tasks = (db.tasks || []).filter((t) => t.assigneeId === userId);
  const overdueTasks = tasks.filter((t) => isOverdue(t, today));
  const dueTodayTasks = tasks.filter((t) => isDueToday(t, today));
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const monthSpending = (db.spending || []).filter((s) => s.userId === userId && (s.date || '').startsWith(month));
  const spent = monthSpending.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const budget = (db.budgets || []).find((b) => b.userId === userId && b.month === month);
  const monthlyBudget = Number(budget?.monthlyBudget) || 0;
  const budgetPercent = monthlyBudget > 0 ? Math.round((spent / monthlyBudget) * 100) : 0;
  const readingBooks = (db.savedBooks || []).filter((b) => b.userId === userId && b.status === 'reading');

  // --- Attendance: clock-in nudge, clock-out nudge, day-end streak check ---
  if (isTypeEnabled(prefs, 'attendance') && !hasClockedIn) {
    if (gmt1.isBetween930and1000) {
      drafts.push({
        key: `attendance-checkin-${today}`,
        type: 'attendance',
        title: 'Clock in now',
        body: `Good morning ${firstName}. The office register closes at 10:00 AM WAT - clock in to protect your streak.`,
        link: 'home',
      });
    } else if (gmt1.totalMin > 600 && gmt1.totalMin < 780) {
      drafts.push({
        key: `attendance-missed-${today}`,
        type: 'attendance',
        title: 'You have not clocked in',
        body: `It is ${gmt1.timeStr} WAT and your attendance is still unmarked. Your team leader can see this status.`,
        link: 'home',
      });
    }
  }

  if (isTypeEnabled(prefs, 'attendance') && hasClockedIn && !isClockedOut) {
    const hoursWorked = attendanceRecordHours(attendanceToday?.clockInTimestamp);
    if (hoursWorked >= 9) {
      drafts.push({
        key: `attendance-clockout-${today}`,
        type: 'attendance',
        title: 'Ready to clock out?',
        body: `You are ${Math.floor(hoursWorked)}h into today's shift. Close your register entry so the duration is recorded.`,
        link: 'home',
      });
    }
  }

  // --- To-do list: window nudge, overdue sweep, end-of-day planning ---
  if (isTypeEnabled(prefs, 'todo')) {
    const hasTodoToday = tasks.some((t) => (t.createdAt || '').startsWith(today));
    if (gmt1.isWithinTodoWindow && !hasTodoToday) {
      drafts.push({
        key: `todo-window-${today}`,
        type: 'todo',
        title: 'Write your to-do list',
        body: `${firstName}, the to-do window closes at 11:00 AM WAT. An empty list is logged as unserious by the team leader.`,
        link: 'tasks',
      });
    }
    if (overdueTasks.length > 0) {
      drafts.push({
        key: `todo-overdue-${today}`,
        type: 'todo',
        title: `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'}`,
        body: `Still open: ${overdueTasks.slice(0, 3).map((t) => t.title).join(', ')}${overdueTasks.length > 3 ? ' and more' : ''}.`,
        link: 'tasks',
      });
    }
    if (gmt1.h >= 17 && dueTodayTasks.length > 0) {
      drafts.push({
        key: `todo-eod-${today}`,
        type: 'todo',
        title: 'Close out your tasks',
        body: `${dueTodayTasks.length} task${dueTodayTasks.length === 1 ? '' : 's'} were due today. Complete or reschedule them before the night review.`,
        link: 'tasks',
      });
    }
    if (gmt1.h >= 19 && pendingTasks.length > 0 && overdueTasks.length === 0 && dueTodayTasks.length === 0) {
      drafts.push({
        key: `todo-plan-tomorrow-${today}`,
        type: 'todo',
        title: 'Plan tomorrow',
        body: `${pendingTasks.length} open task${pendingTasks.length === 1 ? '' : 's'} carry over. Set tomorrow's Income Producing Activities now.`,
        link: 'tasks',
      });
    }
  }

  // --- Budget: threshold and overspend alerts ---
  if (isTypeEnabled(prefs, 'budget') && monthlyBudget > 0 && spent > 0) {
    if (budgetPercent >= 100) {
      drafts.push({
        key: `budget-over-${month}`,
        type: 'budget',
        title: 'Monthly budget exceeded',
        body: `You have spent ₦${spent.toLocaleString('en-NG')} of your ₦${monthlyBudget.toLocaleString('en-NG')} budget for ${month}. Pause new spending and review your ledger.`,
        link: 'spending',
      });
    } else if (budgetPercent >= 80) {
      drafts.push({
        key: `budget-near-${month}`,
        type: 'budget',
        title: `${budgetPercent}% of your budget used`,
        body: `₦${spent.toLocaleString('en-NG')} of ₦${monthlyBudget.toLocaleString('en-NG')} spent for ${month}. ₦${(monthlyBudget - spent).toLocaleString('en-NG')} left.`,
        link: 'spending',
      });
    }
  }

  // --- Motivation: one quote per WAT period ---
  if (isTypeEnabled(prefs, 'motivation')) {
    const { period, timeTitle } = getWATPeriodDetails(gmt1.h);
    const periodIndex = period === 'morning' ? 0 : period === 'afternoon' ? 1 : period === 'night' ? 2 : 3;
    const streak = (db.attendance || []).filter(
      (a) => a.userId === userId && (a.status === 'present' || a.status === 'clocked_out')
    ).length;
    const quote = pickCuratedQuote(period, seed + periodIndex);
    drafts.push({
      key: `quote-${today}-${period}`,
      type: 'motivation',
      title: timeTitle,
      body: `"${quote.quote}" - ${quote.author}${
        streak > 0 ? ` · ${streak}-day attendance streak active.` : ''
      }`,
      link: 'home',
    });
  }

  // --- Reading nudge for active books ---
  if (isTypeEnabled(prefs, 'reading') && readingBooks.length > 0 && gmt1.h >= 20) {
    drafts.push({
      key: `reading-${today}`,
      type: 'reading',
      title: 'Growth library time',
      body: `You have ${readingBooks.length} book${readingBooks.length === 1 ? '' : 's'} in progress: ${readingBooks
        .slice(0, 2)
        .map((b) => b.title)
        .join(', ')}. A few pages tonight keeps the momentum.`,
      link: 'library',
    });
  }

  return drafts;
}

function attendanceRecordHours(clockInTimestamp?: number): number {
  if (!clockInTimestamp) return 0;
  return (Date.now() - clockInTimestamp) / 3_600_000;
}

/** True when a reminder with the same key was already pushed on this WAT day. */
export function hasAlreadyNotified(db: DatabaseState, userId: string, key: string): boolean {
  return (db.notifications || []).some(
    (n) => n.userId === userId && typeof n.meta?.reminderKey === 'string' && n.meta.reminderKey === key
  );
}

export function createReminderNotification(
  userId: string,
  draft: ReminderDraft
): AppNotification {
  return {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type: draft.type,
    title: draft.title,
    body: draft.body,
    link: draft.link,
    createdAt: new Date().toISOString(),
    readBy: [],
    meta: { reminderKey: draft.key, delivery: 'push' },
  };
}

const MAX_NOTIFICATIONS = 400;

/** Keeps the inbox bounded so the JSONB state row never grows without limit. */
export function trimNotifications(notifications: AppNotification[]): AppNotification[] {
  if (notifications.length <= MAX_NOTIFICATIONS) return notifications;
  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return sorted.slice(0, MAX_NOTIFICATIONS);
}
