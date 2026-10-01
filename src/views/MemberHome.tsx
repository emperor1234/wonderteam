import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { TaskRow } from '../components/TaskRow.tsx';
import { AddTaskModal } from '../components/AddTaskModal.tsx';
import { AttendanceHistoryModal } from '../components/AttendanceHistoryModal.tsx';
import { AIPrioritizerModal } from '../components/AIPrioritizerModal.tsx';
import { MotivationalQuoteCard } from '../components/MotivationalQuoteCard.tsx';
import { TaskItem, AttendanceRecord, WorkEthicStatus } from '../types/index.ts';
import {
  Sparkles,
  Plus,
  BookOpen,
  Clock,
  CheckCircle2,
  ChevronRight,
  Target,
  Flame,
  Receipt,
  Calendar,
  ShieldCheck,
  AlertCircle,
  Briefcase,
  Users,
} from 'lucide-react';

interface MemberHomeProps {
  onNavigateToTasks: () => void;
  onNavigateToLibrary?: () => void;
  onNavigateToSpending?: () => void;
}

export const MemberHome: React.FC<MemberHomeProps> = ({
  onNavigateToTasks,
  onNavigateToLibrary,
  onNavigateToSpending,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceRecord | null>(null);
  const [isTodayClockedIn, setIsTodayClockedIn] = useState<boolean>(false);
  const [workEthicStatus, setWorkEthicStatus] = useState<WorkEthicStatus>('pending_check');
  const [unseriousReason, setUnseriousReason] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState<number>(0);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isClockingIn, setIsClockingIn] = useState(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAIPrioritizerOpen, setIsAIPrioritizerOpen] = useState(false);

  const fetchAttendanceData = async () => {
    if (!user) return;
    try {
      const [statusRes, historyRes] = await Promise.all([
        fetch(`/api/attendance/status?userId=${user.id}`),
        fetch(`/api/attendance/history?userId=${user.id}`),
      ]);
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setIsTodayClockedIn(sData.isClockedIn);
        setAttendanceRecord(sData.record || null);
        if (sData.workEthicStatus) {
          setWorkEthicStatus(sData.workEthicStatus);
        }
        if (sData.unseriousReason) {
          setUnseriousReason(sData.unseriousReason);
        }
      }
      if (historyRes.ok) {
        const history: AttendanceRecord[] = await historyRes.json();
        // Calculate consecutive streak
        let streak = 0;
        for (const item of history) {
          if (item.status === 'present' || item.status === 'clocked_out') {
            streak++;
          } else {
            break;
          }
        }
        setStreakCount(streak);
      }
    } catch (err) {
      console.error('Failed to load attendance info:', err);
    }
  };

  const fetchTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/tasks?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchAttendanceData();
  }, [user]);

  const handleToggleTask = async (taskId: string) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === 'completed' ? 'todo' : 'completed' }
          : t
      )
    );

    try {
      await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      fetchAttendanceData();
    } catch (err) {
      console.error('Failed to toggle task:', err);
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch('/api/tasks/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      fetchAttendanceData();
    } catch (err) {
      console.error('Failed to delete task:', err);
      fetchTasks();
    }
  };

  const handleQuickClockIn = async () => {
    if (!user || isClockingIn) return;
    setIsClockingIn(true);
    try {
      // Default to office coordinates or current location
      const office = user.officeLocation || { lat: 6.5244, lng: 3.3792 };
      const res = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          clientLocation: {
            lat: office.lat,
            lng: office.lng,
          },
          period: 'Daily Business Standup',
        }),
      });

      if (res.ok) {
        await fetchAttendanceData();
      }
    } catch (err) {
      console.error('Clock-in error:', err);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleQuickClockOut = async () => {
    if (!user || isClockingIn) return;
    setIsClockingIn(true);
    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        await fetchAttendanceData();
      }
    } catch (err) {
      console.error('Clock-out error:', err);
    } finally {
      setIsClockingIn(false);
    }
  };

  // Metrics
  const completedToday = tasks.filter((t) => t.status === 'completed').length;
  const remainingToday = tasks.filter((t) => t.status !== 'completed').length;
  const ipaTasks = tasks.filter((t) => t.isIPA);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  const firstName = user?.name ? user.name.split(' ')[0] : 'Member';

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-20">
      {/* Clean, Simple Header for Networking & Freelancing Hub */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#146C4E] uppercase tracking-wider mb-0.5">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Networking & Freelance Hub · WonderTeam</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">
            Welcome, {firstName}
          </h1>
          <div className="text-xs text-[#5E6964] mt-0.5 flex flex-wrap items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#89928E]" />
            <span>{formattedDate}</span>
            <span className="text-[#CBD6D1]">·</span>
            <span>Lead: {user?.sponsorName || 'Leadership Team'}</span>
          </div>
        </div>

        {/* Member Active Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#E7F4EE] border border-[#CBD6D1] rounded-[10px] text-xs font-semibold text-[#0F513B]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#146C4E]" />
          <span>Active Member</span>
        </div>
      </div>

      {/* 1. Personalized Motivational Quote Card (Morning, Afternoon, Night, 1am Midnight) */}
      <MotivationalQuoteCard />

      {/* 2. Simplified Daily Attendance & Consistency Card */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-[#E7F4EE] text-[#146C4E] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#17211D] uppercase tracking-wide">
                Daily Check-In & Consistency
              </h2>
              <p className="text-[11px] text-[#5E6964]">
                Roll call window: 09:30 AM – 10:00 AM (WAT / GMT+1)
              </p>
            </div>
          </div>

          {/* Streak indicator */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-[#FFF6E5] border border-[#FCE8B2] rounded-[8px] text-[11px] font-bold text-[#B7791F]">
            <Flame className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]" />
            <span>{streakCount} Day Streak</span>
          </div>
        </div>

        {/* Current status display & action */}
        <div className="pt-2 border-t border-[#E2E8E5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            {isTodayClockedIn ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-[#E7F4EE] text-[#0F513B]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#146C4E]" />
                <span>Checked In ({attendanceRecord?.clockIn || 'On-Time'})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-[#FFF6E5] text-[#B7791F]">
                <Clock className="w-3.5 h-3.5 text-[#B7791F]" />
                <span>Ready for Today's Check-In</span>
              </span>
            )}

            {/* Work ethic badge */}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                workEthicStatus === 'serious'
                  ? 'bg-[#E7F4EE] text-[#0F513B]'
                  : workEthicStatus === 'unserious'
                  ? 'bg-[#FFF0F0] text-[#C84C4C]'
                  : 'bg-[#F7F9F8] text-[#5E6964]'
              }`}
            >
              Status: {workEthicStatus === 'serious' ? 'Serious' : workEthicStatus === 'unserious' ? 'Unserious' : 'Pending'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isTodayClockedIn ? (
              <button
                type="button"
                onClick={handleQuickClockIn}
                disabled={isClockingIn}
                className="px-4 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] transition-all shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isClockingIn ? 'Checking In...' : 'Check In Now'}</span>
              </button>
            ) : attendanceRecord?.status !== 'clocked_out' ? (
              <button
                type="button"
                onClick={handleQuickClockOut}
                disabled={isClockingIn}
                className="px-3 py-1.5 bg-[#F7F9F8] hover:bg-[#E9EFEC] border border-[#CBD6D1] text-[#17211D] text-xs font-semibold rounded-[8px] transition-colors"
              >
                <span>Clock Out</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-[#5E6964]">Day Completed</span>
            )}

            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="text-xs font-semibold text-[#5E6964] hover:text-[#17211D] underline ml-1"
            >
              History
            </button>
          </div>
        </div>

        {workEthicStatus === 'unserious' && (
          <div className="p-2.5 bg-[#FFF0F0] border border-[#C84C4C]/30 rounded-[10px] text-xs text-[#C84C4C] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {unseriousReason || 'Daily to-do list was not written between 9:30 AM – 11:00 AM WAT.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="font-bold underline text-[11px] shrink-0"
            >
              Write To-Do Now
            </button>
          </div>
        )}
      </div>

      {/* 3. Income Producing Activities (IPAs) & Daily To-Do Planner */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <Target className="w-4 h-4 text-[#146C4E]" />
              <h2 className="text-sm font-bold text-[#17211D]">
                Income Producing Activities (IPAs)
              </h2>
            </div>
            <p className="text-[11px] text-[#5E6964] mt-0.5">
              Prospecting · Client Pitches · Proposals · Follow-ups · Closing
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Gemini AI IPA Prioritizer Button */}
            <button
              type="button"
              onClick={() => setIsAIPrioritizerOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E7F4EE] hover:bg-[#D5EFE3] text-[#0F513B] border border-[#CBD6D1] text-xs font-bold rounded-[8px] transition-colors shadow-2xs"
              title="Organize your to-dos with Gemini AI based on Income Producing Activities"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#146C4E]" />
              <span>Prioritize with Gemini</span>
            </button>

            {/* Add Task Button */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[8px] transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Progress stat pill */}
        <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-[#F7F9F8] rounded-[10px] border border-[#E2E8E5]">
          <span className="text-[#5E6964]">
            <strong>{completedToday}</strong> completed · <strong>{remainingToday}</strong> remaining
          </span>
          {ipaTasks.length > 0 && (
            <span className="text-[#146C4E] font-semibold text-[11px]">
              {ipaTasks.length} Identified IPAs
            </span>
          )}
        </div>

        {/* Task List */}
        {isLoadingTasks ? (
          <div className="space-y-2 py-2">
            <div className="h-12 bg-[#E9EFEC] rounded-[10px] animate-pulse"></div>
            <div className="h-12 bg-[#E9EFEC] rounded-[10px] animate-pulse"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-7 bg-[#F7F9F8] rounded-[12px] border border-dashed border-[#CBD6D1] space-y-2">
            <p className="text-xs font-bold text-[#17211D]">No to-dos scheduled yet today</p>
            <p className="text-[11px] text-[#5E6964] max-w-sm mx-auto">
              Add your primary prospecting calls, invitations, and follow-ups to maintain your Serious status.
            </p>
            <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#146C4E] text-white text-xs font-bold rounded-[8px] hover:bg-[#0F513B]"
              >
                Add First To-Do
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="relative">
                <TaskRow
                  task={task}
                  onToggle={handleToggleTask}
                  onDelete={handleDeleteTask}
                />
                {task.isIPA && (
                  <div className="absolute right-3 top-3 pointer-events-none">
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#E7F4EE] text-[#0F513B] border border-[#CBD6D1]">
                      IPA
                    </span>
                  </div>
                )}
              </div>
            ))}

            {tasks.length > 5 && (
              <button
                type="button"
                onClick={onNavigateToTasks}
                className="w-full mt-2 py-2 text-center text-xs font-semibold text-[#5E6964] hover:text-[#17211D] flex items-center justify-center gap-1"
              >
                <span>View all {tasks.length} to-dos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 4. Quick Access Hub: Library & Spending */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Digital Library Card */}
        {onNavigateToLibrary && (
          <button
            type="button"
            onClick={onNavigateToLibrary}
            className="p-4 bg-linear-to-br from-[#0F513B] to-[#146C4E] text-white rounded-[16px] text-left shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#A3E5CB] uppercase tracking-wider mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Team Library & Growth</span>
              </div>
              <h3 className="text-sm font-bold tracking-tight">
                21 Growth Disciplines
              </h3>
              <p className="text-xs text-white/80 mt-1 leading-relaxed">
                Read with the Google Embedded Book API & look up terms in Free Dictionary.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#A3E5CB] group-hover:text-white transition-colors">
              <span>Open Library</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )}

        {/* Business Spending Card */}
        {onNavigateToSpending && (
          <button
            type="button"
            onClick={onNavigateToSpending}
            className="p-4 bg-white border border-[#CBD6D1] rounded-[16px] text-left shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#146C4E] uppercase tracking-wider mb-1">
                <Receipt className="w-3.5 h-3.5" />
                <span>Business Spending</span>
              </div>
              <h3 className="text-sm font-bold tracking-tight text-[#17211D]">
                Monthly Expense & Budget
              </h3>
              <p className="text-xs text-[#5E6964] mt-1 leading-relaxed">
                Log business supplies, transport, event tickets, and product orders.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#146C4E] group-hover:text-[#0F513B] transition-colors">
              <span>Manage Expenses</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )}
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTaskCreated={fetchTasks}
      />

      <AttendanceHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <AIPrioritizerModal
        isOpen={isAIPrioritizerOpen}
        onClose={() => setIsAIPrioritizerOpen(false)}
        tasks={tasks}
        userId={user?.id}
        onPrioritiesApplied={fetchTasks}
      />
    </div>
  );
};
