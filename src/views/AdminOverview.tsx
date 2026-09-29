import React, { useState, useEffect } from 'react';
import { TeamAttendanceSummary, TeamMemberLiveStatus, TaskItem } from '../types/index.ts';
import { Users, Clock, AlertTriangle, ArrowRight, ShieldCheck, Trophy, Flame } from 'lucide-react';

interface AdminOverviewProps {
  onNavigateToAttendance: () => void;
  onNavigateToTasks: () => void;
  onNavigateToLeaderboard?: () => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  onNavigateToAttendance,
  onNavigateToTasks,
  onNavigateToLeaderboard,
}) => {
  const [attendanceSummary, setAttendanceSummary] = useState<TeamAttendanceSummary | null>(null);
  const [liveMembers, setLiveMembers] = useState<TeamMemberLiveStatus[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/attendance/team').then((r) => r.json()),
      fetch('/api/tasks?role=admin').then((r) => r.json()),
    ])
      .then(([attData, tasksData]) => {
        setAttendanceSummary(attData.summary);
        setLiveMembers(attData.members);
        setTasks(tasksData);
      })
      .catch((err) => console.error('Error loading admin overview:', err))
      .finally(() => setLoading(false));
  }, []);

  const totalMembers = attendanceSummary?.total || 4;
  const presentCount = attendanceSummary?.presentCount || 0;
  const lateCount = attendanceSummary?.lateCount || 0;
  const notCheckedInCount = attendanceSummary?.notCheckedInCount || 0;

  const tasksNeedingAttention = tasks.filter(
    (t) => t.status === 'blocked' || (t.status !== 'completed' && t.priority === 'high')
  );
  const tasksDueToday = tasks.filter((t) => t.status !== 'completed');

  return (
    <div className="space-y-6 pb-20">
      {/* Header briefing */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#E2E8E5] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">
            Operations Briefing
          </h1>
          <p className="text-xs text-[#5E6964]">
            {new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }).format(new Date())}{' '}
            · Lagos Field Command
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#146C4E] bg-[#E7F4EE] px-3 py-1 rounded-[8px] self-start sm:self-auto font-medium">
          <ShieldCheck className="w-4 h-4" />
          <span>Leader Operations Mode</span>
        </div>
      </div>

      {/* Row 1: Primary Large Presence Module + Compact Work Module */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Dominant Presence Module (2 cols on desktop) */}
        <div className="md:col-span-2 bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#5E6964] uppercase tracking-wider">
              Daily Team Presence
            </span>
            <button
              onClick={onNavigateToAttendance}
              className="text-xs font-medium text-[#146C4E] hover:underline flex items-center gap-1"
            >
              <span>Detailed Attendance</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold font-mono-numbers text-[#17211D]">
              {presentCount} / {totalMembers}
            </span>
            <span className="text-xs font-medium text-[#146C4E]">Present on shift</span>
          </div>

          {/* Secondary operational presence indicators */}
          <div className="mt-4 pt-3 border-t border-[#E2E8E5] flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#146C4E]"></span>
              <span className="text-[#5E6964]">On time:</span>
              <span className="font-bold font-mono-numbers text-[#17211D]">
                {attendanceSummary?.purePresent || 0}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#B7791F]"></span>
              <span className="text-[#5E6964]">Late:</span>
              <span className="font-bold font-mono-numbers text-[#17211D]">{lateCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#CBD6D1]"></span>
              <span className="text-[#5E6964]">Pending check-in:</span>
              <span className="font-bold font-mono-numbers text-[#17211D]">{notCheckedInCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C84C4C]"></span>
              <span className="text-[#5E6964]">Unserious (No To-Do):</span>
              <span className="font-bold font-mono-numbers text-[#C84C4C]">
                {attendanceSummary?.unseriousCount || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Compact Work Module (1 col) */}
        <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#5E6964] uppercase tracking-wider">
                Active Workload
              </span>
              <button
                onClick={onNavigateToTasks}
                className="text-xs font-medium text-[#146C4E] hover:underline"
              >
                View
              </button>
            </div>
            <div className="text-3xl font-extrabold font-mono-numbers text-[#17211D] mt-1">
              {tasksDueToday.length}
            </div>
            <p className="text-xs text-[#5E6964] mt-1">Tasks requiring team completion today</p>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E2E8E5] flex items-center justify-between text-xs">
            <span className="text-[#5E6964]">Needing attention:</span>
            <span className="font-bold font-mono-numbers text-[#C84C4C]">
              {tasksNeedingAttention.length}
            </span>
          </div>
        </div>
      </div>

      {/* Gamified Team Leaderboard Card */}
      {onNavigateToLeaderboard && (
        <div className="p-4 bg-linear-to-r from-[#146C4E] to-[#0F513B] rounded-[16px] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-white/15 text-[#A3E5CB] flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-[#FEF3C7]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Team Growth Leaderboard</h3>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[#A3E5CB] text-[10px] font-bold uppercase tracking-wider">
                  Live Gamification
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                Track consecutive streaks, IPA completion percentages, and member podium standings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToLeaderboard}
            className="shrink-0 px-4 py-2 bg-white text-[#0F513B] hover:bg-[#E7F4EE] text-xs font-bold rounded-[10px] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span>View Full Leaderboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Content Split: Live Team Attendance + Tasks Needing Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Live Team Presence List */}
        <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#146C4E]" />
              <h2 className="text-sm font-semibold text-[#17211D]">Today's Attendance Status</h2>
            </div>
            <button
              onClick={onNavigateToAttendance}
              className="text-xs font-semibold text-[#146C4E] hover:underline"
            >
              Full List
            </button>
          </div>

          {loading ? (
            <div className="space-y-2 py-2">
              <div className="h-12 bg-[#E9EFEC] rounded-[10px] animate-pulse"></div>
              <div className="h-12 bg-[#E9EFEC] rounded-[10px] animate-pulse"></div>
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8E5]">
              {liveMembers.map((m) => (
                <div key={m.memberId} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 truncate">
                    <img
                      src={m.avatar}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-[#CBD6D1]"
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[#17211D] truncate">{m.name}</div>
                      <div className="text-[11px] text-[#89928E] truncate">{m.lastActivity}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="text-xs font-mono-numbers font-medium text-[#17211D]">
                      {m.clockIn !== '—' ? m.clockIn : 'No check-in'}
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      {m.workEthicStatus === 'unserious' ? (
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#FFF0F0] text-[#C84C4C] border border-[#C84C4C] text-[10px] font-black uppercase tracking-wider">
                          UNSERIOUS
                        </span>
                      ) : m.workEthicStatus === 'serious' ? (
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-[#E7F4EE] text-[#0F513B] text-[10px] font-bold">
                          SERIOUS
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-[#FFF6E5] text-[#B7791F] text-[10px] font-medium">
                          TO-DO PENDING
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-medium capitalize ${
                          m.status === 'present'
                            ? 'text-[#146C4E]'
                            : m.status === 'late'
                            ? 'text-[#B7791F]'
                            : 'text-[#89928E]'
                        }`}
                      >
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>
                    {m.workEthicStatus === 'unserious' && (
                      <div className="text-[10px] text-[#C84C4C] font-semibold">
                        To-do list not taken before 11:00 AM
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks Needing Attention */}
        <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B7791F]" />
              <h2 className="text-sm font-semibold text-[#17211D]">Tasks Needing Attention</h2>
            </div>
            <button
              onClick={onNavigateToTasks}
              className="text-xs font-semibold text-[#146C4E] hover:underline"
            >
              All Tasks
            </button>
          </div>

          {tasksNeedingAttention.length === 0 ? (
            <div className="text-center py-8 bg-[#F7F9F8] rounded-[12px] border border-dashed border-[#E2E8E5]">
              <p className="text-xs font-semibold text-[#17211D]">No blocked or high-risk tasks</p>
              <p className="text-[11px] text-[#5E6964] mt-0.5">Team workload is proceeding on schedule.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasksNeedingAttention.map((t) => (
                <div
                  key={t.id}
                  className="p-3 bg-[#F7F9F8] border border-[#E2E8E5] rounded-[10px] flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#17211D]">{t.title}</span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-[4px] ${
                          t.status === 'blocked'
                            ? 'bg-[#FFF0F0] text-[#C84C4C]'
                            : 'bg-[#FFF6E5] text-[#B7791F]'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5E6964] mt-0.5">
                      Assignee: <span className="text-[#17211D] font-medium">{t.assigneeName}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono-numbers text-[#89928E] shrink-0">
                    {t.dueTime}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
