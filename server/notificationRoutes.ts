import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDb, saveDb } from './db.ts';
import type { AppNotification, NotificationType } from './db.ts';
import { getVapidKeys, sendPushToAllSubscribers, sendPushToUser, countSubscriptions } from './push.ts';
import {
  buildReminderDrafts,
  createReminderNotification,
  getPreferences,
  hasAlreadyNotified,
  isWithinQuietHours,
  isTypeEnabled,
  trimNotifications,
  type ReminderDraft,
} from './reminders.ts';
import { getGMT1Info } from './wat.ts';

const router = Router();

/**
 * Cron endpoints are the only notification surface that cannot present a
 * session cookie, so they are mounted before the session boundary and guarded
 * by the shared CRON_SECRET instead.
 */
export const cronRouter = Router();

/**
 * Vercel Cron authenticates with `Authorization: Bearer $CRON_SECRET`. Outside
 * production the secret is optional so the schedule can be exercised locally.
 */
function requireCronSecret(req: Request, res: Response, next: () => void) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret && process.env.NODE_ENV !== 'production') return next();

  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (secret && token === secret) return next();

  return res.status(401).json({
    error: 'Invalid or missing cron secret',
    detail: secret
      ? 'Set CRON_SECRET to the same value in the project environment so Vercel Cron can authenticate.'
      : 'CRON_SECRET is not set, so scheduled reminders cannot be delivered. Members with the app open still get reminders.',
  });
}

const NOTIFICATION_TYPES: NotificationType[] = [
  'message',
  'motivation',
  'todo',
  'budget',
  'attendance',
  'reading',
  'system',
];

const BROADCAST_TARGET_ALL = 'all';

export function buildPushPayload(notification: AppNotification) {
  return {
    title: notification.title,
    body: notification.body,
    icon: notification.icon || '/icon-192.png',
    badge: '/icon-192.png',
    tag: `wonderteam-${notification.id}`,
    renotify: true,
    requireInteraction: notification.type === 'message',
    urgency: notification.type === 'message' ? 'high' : 'normal',
    timestamp: Date.now(),
    data: {
      notificationId: notification.id,
      type: notification.type,
      link: notification.link,
      createdAt: notification.createdAt,
    },
  };
}

function normalizeSubscription(input: any): { endpoint: string; keys: { p256dh: string; auth: string } } | null {
  const endpoint = input?.endpoint || input?.subscription?.endpoint;
  const keys = input?.keys || input?.subscription?.keys;
  if (typeof endpoint !== 'string' || !endpoint.startsWith('https://')) return null;
  if (!keys?.p256dh || !keys?.auth) return null;
  return { endpoint, keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) } };
}

function findVisibleNotifications(db: Awaited<ReturnType<typeof getDb>>, userId: string): AppNotification[] {
  return (db.notifications || [])
    .filter((n) => n.userId === userId || n.userId === BROADCAST_TARGET_ALL)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function isVisibleTo(notification: AppNotification, userId: string): boolean {
  return notification.userId === userId || notification.userId === BROADCAST_TARGET_ALL;
}

/** Identity always comes from the verified session, never from the payload. */
function sessionUserId(req: Request): string {
  return (req as any).user?.id;
}

function sessionIsAdmin(req: Request): boolean {
  return (req as any).isAdmin === true;
}

/**
 * Creates a notification for one user and pushes it to that user's devices.
 * Used by feature code (such as chat delivery) that needs to notify a user
 * outside of the notification routes themselves.
 */
export async function deliverDirectNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  createdBy?: string;
  createdByName?: string;
  meta?: Record<string, any>;
}): Promise<AppNotification | null> {
  const db = await getDb();
  if (!db.users.some((u) => u.id === input.userId)) return null;

  const prefs = getPreferences(db, input.userId);
  const notification: AppNotification = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    createdAt: new Date().toISOString(),
    readBy: [],
    meta: input.meta,
  };

  db.notifications = trimNotifications([...(db.notifications || []), notification]);

  // The inbox keeps the record even when push is muted or the user is offline;
  // only the OS-level push is suppressed by preferences and quiet hours.
  if (isTypeEnabled(prefs, input.type) && !isWithinQuietHours(prefs, getGMT1Info().h)) {
    await sendPushToUser(db, input.userId, buildPushPayload(notification));
  }

  await saveDb(db);
  return notification;
}

// -------------------------------------------------------------
// PUSH SUBSCRIPTION MANAGEMENT
// -------------------------------------------------------------

router.get('/push/vapid-key', async (_req: Request, res: Response) => {
  try {
    const keys = await getVapidKeys();
    return res.json({ publicKey: keys.publicKey });
  } catch (err: any) {
    console.error('Failed to resolve VAPID key:', err?.message);
    return res.status(500).json({ error: 'Push notifications are not configured' });
  }
});

router.post('/push/subscribe', async (req: Request, res: Response) => {
  const userId = sessionUserId(req);
  const userAgent = req.get('user-agent') || undefined;
  const normalized = normalizeSubscription(req.body?.subscription);

  if (!userId) return res.status(401).json({ error: 'Sign in to continue' });
  if (!normalized) return res.status(400).json({ error: 'A valid push subscription is required' });

  const db = await getDb();
  if (!db.users.some((u) => u.id === userId)) {
    return res.status(404).json({ error: 'User not found' });
  }

  db.pushSubscriptions = db.pushSubscriptions || [];
  const now = new Date().toISOString();
  const existing = db.pushSubscriptions.find((s) => s.endpoint === normalized.endpoint);

  if (existing) {
    existing.userId = userId;
    existing.keys = normalized.keys;
    existing.lastUsedAt = now;
    if (userAgent) existing.userAgent = userAgent;
  } else {
    db.pushSubscriptions.push({
      id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      endpoint: normalized.endpoint,
      keys: normalized.keys,
      userAgent,
      createdAt: now,
      lastUsedAt: now,
    });
  }

  await saveDb(db);
  return res.json({ success: true, subscribed: true });
});

router.post('/push/unsubscribe', async (req: Request, res: Response) => {
  const userId = sessionUserId(req);
  const { endpoint } = req.body || {};
  if (!userId || typeof endpoint !== 'string' || !endpoint) {
    return res.status(400).json({ error: 'endpoint is required' });
  }

  const db = await getDb();
  const before = (db.pushSubscriptions || []).length;
  db.pushSubscriptions = (db.pushSubscriptions || []).filter(
    (s) => !(s.userId === userId && s.endpoint === endpoint)
  );
  const removed = before !== db.pushSubscriptions.length;

  if (removed) await saveDb(db);
  return res.json({ success: true, removed });
});

router.get('/push/status', async (req: Request, res: Response) => {
  const userId = sessionUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to continue' });

  const db = await getDb();
  const devices = (db.pushSubscriptions || []).filter((s) => s.userId === userId);

  return res.json({
    subscribed: devices.length > 0,
    deviceCount: devices.length,
    teamDeviceCount: await countSubscriptions(db),
    preferences: getPreferences(db, userId),
  });
});

router.get('/push/preferences', async (req: Request, res: Response) => {
  const userId = sessionUserId(req);
  if (!userId) return res.status(401).json({ error: 'Sign in to continue' });

  const db = await getDb();
  return res.json({ preferences: getPreferences(db, userId) });
});

router.post('/push/preferences', async (req: Request, res: Response) => {
  const userId = sessionUserId(req);
  const preferences = req.body?.preferences;
  if (!userId || !preferences) {
    return res.status(400).json({ error: 'preferences are required' });
  }

  const db = await getDb();

  const current = getPreferences(db, userId);
  const clampHour = (value: any, fallback: number | null) => {
    if (value === null) return null;
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0 || num > 23) return fallback;
    return Math.round(num);
  };

  const next = {
    ...current,
    enabled: preferences.enabled === undefined ? current.enabled : Boolean(preferences.enabled),
    messages: preferences.messages === undefined ? current.messages : Boolean(preferences.messages),
    motivation: preferences.motivation === undefined ? current.motivation : Boolean(preferences.motivation),
    todos: preferences.todos === undefined ? current.todos : Boolean(preferences.todos),
    budget: preferences.budget === undefined ? current.budget : Boolean(preferences.budget),
    attendance: preferences.attendance === undefined ? current.attendance : Boolean(preferences.attendance),
    reading: preferences.reading === undefined ? current.reading : Boolean(preferences.reading),
    quietHoursStart: clampHour(preferences.quietHoursStart, current.quietHoursStart),
    quietHoursEnd: clampHour(preferences.quietHoursEnd, current.quietHoursEnd),
  };

  db.notificationPreferences = db.notificationPreferences || [];
  const index = db.notificationPreferences.findIndex((p) => p.userId === userId);
  if (index >= 0) db.notificationPreferences[index] = next;
  else db.notificationPreferences.push(next);

  // Turning the master switch off should also stop future delivery for this user.
  if (!next.enabled) {
    db.pushSubscriptions = (db.pushSubscriptions || []).filter((s) => s.userId !== userId);
  }

  await saveDb(db);

  return res.json({ success: true, preferences: next });
});

// -------------------------------------------------------------
// NOTIFICATION INBOX
// -------------------------------------------------------------

router.get('/notifications', async (req: Request, res: Response) => {
  const userId = sessionUserId(req);
  const limit = Math.min(Number(req.query.limit) || 40, 100);
  if (!userId) return res.status(401).json({ error: 'Sign in to continue' });

  const db = await getDb();

  const all = findVisibleNotifications(db, userId);
  const notifications = all.slice(0, limit).map((n) => ({
    ...n,
    read: (n.readBy || []).includes(userId),
  }));

  return res.json({
    notifications,
    unreadCount: all.filter((n) => !(n.readBy || []).includes(userId)).length,
    totalCount: all.length,
    preferences: getPreferences(db, userId),
    subscribed: (db.pushSubscriptions || []).some((s) => s.userId === userId),
  });
});

router.post('/notifications/read', async (req: Request, res: Response) => {
  const userId = sessionUserId(req);
  const { ids, all } = req.body || {};
  if (!userId) return res.status(401).json({ error: 'Sign in to continue' });

  const db = await getDb();
  const targets = (db.notifications || []).filter(
    (n) => isVisibleTo(n, userId) && (all === true || (Array.isArray(ids) && ids.includes(n.id)))
  );

  for (const notification of targets) {
    notification.readBy = notification.readBy || [];
    if (!notification.readBy.includes(userId)) notification.readBy.push(userId);
  }

  if (targets.length > 0) await saveDb(db);
  return res.json({ success: true, updated: targets.length });
});

router.post('/notifications/delete', async (req: Request, res: Response) => {
  const userId = sessionUserId(req);
  const { id } = req.body || {};
  if (!userId) return res.status(401).json({ error: 'Sign in to continue' });
  if (typeof id !== 'string' || !id) return res.status(400).json({ error: 'id is required' });

  const db = await getDb();
  const before = (db.notifications || []).length;
  db.notifications = (db.notifications || []).filter((n) => n.id !== id || !isVisibleTo(n, userId));

  if (db.notifications.length !== before) await saveDb(db);
  return res.json({ success: true });
});

// -------------------------------------------------------------
// TEAM MESSAGES (ADMIN BROADCAST)
// -------------------------------------------------------------

router.post('/notifications/send', async (req: Request, res: Response) => {
  const { title, body, type, link, targetUserId } = req.body || {};

  if (!sessionIsAdmin(req)) {
    return res.status(403).json({ error: 'Unauthorized: Admin privileges required to send team messages' });
  }
  if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
  const notificationType: NotificationType = NOTIFICATION_TYPES.includes(type) ? type : 'message';

  const db = await getDb();
  const admin = (req as any).user as { id: string; name: string };

  const target = typeof targetUserId === 'string' && targetUserId ? targetUserId : BROADCAST_TARGET_ALL;
  if (target !== BROADCAST_TARGET_ALL && !db.users.some((u) => u.id === target)) {
    return res.status(404).json({ error: 'Target user not found' });
  }

  const notification: AppNotification = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId: target,
    type: notificationType,
    title: String(title).slice(0, 120),
    body: String(body).slice(0, 500),
    link: typeof link === 'string' && link ? link.slice(0, 40) : undefined,
    createdBy: admin.id,
    createdByName: admin.name,
    createdAt: new Date().toISOString(),
    readBy: [],
  };

  db.notifications = trimNotifications([...(db.notifications || []), notification]);

  const recipientIds =
    target === BROADCAST_TARGET_ALL
      ? db.users.map((u) => u.id).filter((id) => id !== admin.id)
      : [target];

  let delivered = 0;
  let failed = 0;
  for (const userId of recipientIds) {
    const prefs = getPreferences(db, userId);
    // A team-wide announcement still respects each member's own settings.
    if (!isTypeEnabled(prefs, notificationType)) continue;
    if (isWithinQuietHours(prefs, getGMT1Info().h)) continue;
    const result = await sendPushToUser(db, userId, buildPushPayload(notification));
    delivered += result.delivered;
    failed += result.failed;
  }

  await saveDb(db);

  return res.json({
    success: true,
    notification,
    recipients: recipientIds.length,
    push: { delivered, failed },
  });
});

router.get('/notifications/team-feed', async (_req: Request, res: Response) => {
  const db = await getDb();
  const feed = (db.notifications || [])
    .filter((n) => n.userId === BROADCAST_TARGET_ALL)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);
  return res.json({ feed });
});

// -------------------------------------------------------------
// REMINDERS: OPEN TAB (LOCAL DELIVERY) + VERCEL CRON (PUSH DELIVERY)
// -------------------------------------------------------------

async function commitDrafts(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
  drafts: ReminderDraft[]
): Promise<AppNotification[]> {
  const created: AppNotification[] = [];
  for (const draft of drafts) {
    if (hasAlreadyNotified(db, userId, draft.key)) continue;
    const notification = createReminderNotification(userId, draft);
    created.push(notification);
    db.notifications = [...(db.notifications || []), notification];
  }
  if (created.length > 0) db.notifications = trimNotifications(db.notifications);
  return created;
}

/**
 * Called by the client while the app is open. Persists the reminder so it
 * appears in the inbox, then returns it so the tab can raise a local OS
 * notification. `persist: false` keeps this a read-only preview.
 */
router.get('/push/reminders', async (req: Request, res: Response) => {
  const userId = sessionUserId(req);
  const persist = req.query.persist !== 'false';
  if (!userId) return res.status(401).json({ error: 'Sign in to continue' });

  const db = await getDb();

  const prefs = getPreferences(db, userId);
  const quiet = isWithinQuietHours(prefs, getGMT1Info().h);
  const pending = buildReminderDrafts(db, userId).filter(
    (d) => !hasAlreadyNotified(db, userId, d.key)
  );

  if (!persist || pending.length === 0) {
    return res.json({
      quiet,
      reminders: persist
        ? []
        : pending.map((d) => ({ id: `preview_${d.key}`, title: d.title, body: d.body, type: d.type, link: d.link })),
    });
  }

  const created = await commitDrafts(db, userId, pending);
  await saveDb(db);

  return res.json({
    quiet,
    reminders: created.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type,
      link: n.link,
      createdAt: n.createdAt,
    })),
  });
});

/**
 * Vercel Cron entry point. Walks every member who has at least one push
 * subscription, creates their due reminders once, and delivers them through
 * the Web Push service so reminders still arrive while the app is closed.
 */
cronRouter.get('/push/cron/reminders', requireCronSecret, async (_req: Request, res: Response) => {
  const db = await getDb();
  const gmt1 = getGMT1Info();

  const subscriberIds = Array.from(new Set((db.pushSubscriptions || []).map((s) => s.userId)));
  const summary: Array<{ userId: string; created: number; delivered: number }> = [];

  let totalCreated = 0;
  let totalDelivered = 0;

  for (const userId of subscriberIds) {
    const prefs = getPreferences(db, userId);
    const quiet = isWithinQuietHours(prefs, gmt1.h);

    const drafts = buildReminderDrafts(db, userId).filter((d) => !hasAlreadyNotified(db, userId, d.key));
    if (drafts.length === 0) continue;

    const created = await commitDrafts(db, userId, drafts);
    if (created.length === 0) continue;

    let delivered = 0;
    if (!quiet) {
      for (const notification of created) {
        const result = await sendPushToUser(db, userId, buildPushPayload(notification));
        delivered += result.delivered;
      }
    }

    totalCreated += created.length;
    totalDelivered += delivered;
    summary.push({ userId, created: created.length, delivered });
  }

  db.notifications = trimNotifications(db.notifications || []);
  await saveDb(db);

  return res.json({
    success: true,
    ranAt: new Date().toISOString(),
    watTime: gmt1.timeStr,
    subscribers: subscriberIds.length,
    created: totalCreated,
    delivered: totalDelivered,
    summary,
  });
});

/** Manual fan-out helper: pushes an existing notification to every subscriber. */
router.post('/push/broadcast-existing', async (req: Request, res: Response) => {
  const { notificationId } = req.body || {};
  if (!sessionIsAdmin(req)) {
    return res.status(403).json({ error: 'Administrator privileges required' });
  }
  if (!notificationId) return res.status(400).json({ error: 'notificationId is required' });

  const db = await getDb();
  const notification = (db.notifications || []).find((n) => n.id === notificationId);
  if (!notification) return res.status(404).json({ error: 'Notification not found' });

  const result = await sendPushToAllSubscribers(db, buildPushPayload(notification));
  await saveDb(db);

  return res.json({ success: true, push: result });
});

export default router;
