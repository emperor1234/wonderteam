import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  CheckCircle2,
  TrendingUp,
  Search,
  Filter,
  Medal,
  Award,
  Sparkles,
  Zap,
  Target,
  ArrowUpRight,
  RefreshCw,
  Crown,
} from 'lucide-react';

interface LeaderboardMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  sponsorName: string;
  streak: number;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  completedIPAs: number;
  points: number;
  badges: string[];
  level: string;
  rank: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardMember[];
  summary: {
    topPerformer: LeaderboardMember | null;
    highestStreak: number;
    avgCompletionRate: number;
    activeMembers: number;
  };
}

export const AdminLeaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<'all' | 'month' | 'week'>('all');

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/leaderboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load leaderboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const members = data?.leaderboard || [];
  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = members.slice(0, 3);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-8 h-8 rounded-full bg-[#FEF3C7] border-2 border-[#F59E0B] text-[#B45309] font-black text-sm flex items-center justify-center shadow-xs">
            1
          </div>
        );
      case 2:
        return (
          <div className="w-8 h-8 rounded-full bg-[#F3F4F6] border-2 border-[#9CA3AF] text-[#4B5563] font-black text-sm flex items-center justify-center shadow-xs">
            2
          </div>
        );
      case 3:
        return (
          <div className="w-8 h-8 rounded-full bg-[#FFEDD5] border-2 border-[#D97706] text-[#9A3412] font-black text-sm flex items-center justify-center shadow-xs">
            3
          </div>
        );
      default:
        return (
          <div className="w-7 h-7 rounded-full bg-[#F7F9F8] border border-[#CBD6D1] text-[#5E6964] font-bold text-xs flex items-center justify-center">
            {rank}
          </div>
        );
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Diamond':
        return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
      case 'Platinum':
        return 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
      case 'Gold':
        return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
      default:
        return 'bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E2E8E5] pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#146C4E] uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4 text-[#D97706]" />
            <span>Growth Gamification & Analytics</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17211D]">
            Team Leaderboard
          </h1>
          <p className="text-xs text-[#5E6964] mt-0.5">
            Track consecutive attendance streaks, daily to-do completion rates, and gamified growth XP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchLeaderboard}
            disabled={isLoading}
            className="p-2 border border-[#CBD6D1] bg-white hover:bg-[#F7F9F8] text-[#17211D] rounded-[10px] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-2xs"
            title="Refresh Leaderboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#146C4E]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Gamification Summary Stats Strip */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-[16px] border border-[#CBD6D1] shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-[#5E6964] uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Top Rank #1</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-[#17211D] truncate">
              {data.summary.topPerformer ? data.summary.topPerformer.name : '—'}
            </div>
            <div className="text-[11px] text-[#146C4E] font-semibold">
              {data.summary.topPerformer ? `${data.summary.topPerformer.points} XP · ${data.summary.topPerformer.streak}d streak` : 'No data'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-[#CBD6D1] shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-[#5E6964] uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Highest Streak</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-[#17211D]">
              {data.summary.highestStreak} Days
            </div>
            <div className="text-[11px] text-[#5E6964]">
              Consecutive on-time check-ins
            </div>
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-[#CBD6D1] shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-[#5E6964] uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#146C4E]" />
              <span>Team Completion Rate</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-[#146C4E]">
              {data.summary.avgCompletionRate}%
            </div>
            <div className="text-[11px] text-[#5E6964]">
              Average to-do execution
            </div>
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-[#CBD6D1] shadow-2xs space-y-1">
            <div className="text-[11px] font-bold text-[#5E6964] uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Active Partners</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono-numbers text-[#17211D]">
              {data.summary.activeMembers} Members
            </div>
            <div className="text-[11px] text-[#5E6964]">
              In active competition
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#17211D] uppercase tracking-wider mb-3">
            <Medal className="w-4 h-4 text-[#D97706]" />
            <span>Podium Champions</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {top3.map((member, idx) => {
              const isGold = idx === 0;
              const isSilver = idx === 1;
              const isBronze = idx === 2;

              return (
                <div
                  key={member.id}
                  className={`relative p-5 rounded-[18px] border transition-all ${
                    isGold
                      ? 'bg-linear-to-b from-[#FFFDF5] to-white border-[#F59E0B] shadow-sm ring-2 ring-[#F59E0B]/20'
                      : isSilver
                      ? 'bg-linear-to-b from-[#F9FAFB] to-white border-[#9CA3AF] shadow-2xs'
                      : 'bg-linear-to-b from-[#FFFBF7] to-white border-[#D97706]/40 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-12 h-12 rounded-[14px] object-cover border border-[#CBD6D1]"
                        />
                        <div className="absolute -top-1.5 -left-1.5">
                          {getRankBadge(member.rank)}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-[#17211D] leading-tight">
                          {member.name}
                        </h3>
                        <p className="text-[11px] text-[#5E6964] mt-0.5 truncate max-w-[130px]">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getLevelColor(
                        member.level
                      )}`}
                    >
                      {member.level}
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-[#E2E8E5]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5E6964] flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-[#D97706]" />
                        <span>Current Streak</span>
                      </span>
                      <span className="font-bold font-mono-numbers text-[#17211D]">
                        {member.streak} Days
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5E6964] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#146C4E]" />
                        <span>Task Completion</span>
                      </span>
                      <span className="font-bold font-mono-numbers text-[#146C4E]">
                        {member.completionRate}% ({member.completedTasks}/{member.totalTasks})
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-[#E9EFEC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#146C4E] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, member.completionRate)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] font-semibold text-[#89928E]">
                        Growth Score
                      </span>
                      <span className="text-sm font-black font-mono-numbers text-[#0F513B]">
                        {member.points} XP
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full Leaderboard Table & Search */}
      <div className="bg-white rounded-[18px] border border-[#CBD6D1] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E2E8E5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#17211D]">
              All Member Rankings ({members.length})
            </h2>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#89928E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full h-9 pl-9 pr-3 bg-[#F7F9F8] border border-[#CBD6D1] rounded-[8px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9F8] border-b border-[#E2E8E5] text-[#5E6964] font-semibold">
                <th className="py-3 px-4 w-12 text-center">Rank</th>
                <th className="py-3 px-4">Member</th>
                <th className="py-3 px-4">Streak</th>
                <th className="py-3 px-4">Task Completion</th>
                <th className="py-3 px-4">Badges</th>
                <th className="py-3 px-4 text-right">Growth XP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5]">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-[#F7F9F8]/60 transition-colors">
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex justify-center">{getRankBadge(member.rank)}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt=""
                        className="w-9 h-9 rounded-[10px] object-cover border border-[#CBD6D1]"
                      />
                      <div>
                        <div className="font-bold text-[#17211D] text-xs">{member.name}</div>
                        <div className="text-[11px] text-[#5E6964]">{member.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#FFF6E5] text-[#B7791F] border border-[#FCE8B2] rounded-[8px] text-xs font-bold font-mono-numbers">
                      <Flame className="w-3.5 h-3.5 text-[#D97706]" />
                      <span>{member.streak} Days</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="space-y-1 w-36">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono-numbers font-bold text-[#146C4E]">
                          {member.completionRate}%
                        </span>
                        <span className="text-[#89928E]">
                          {member.completedTasks}/{member.totalTasks} tasks
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#E9EFEC] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#146C4E] rounded-full"
                          style={{ width: `${Math.min(100, member.completionRate)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {member.badges.map((b) => (
                        <span
                          key={b}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E7F4EE] text-[#0F513B] border border-[#CBD6D1]"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-bold font-mono-numbers text-sm text-[#0F513B]">
                      {member.points} XP
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List View */}
        <div className="md:hidden divide-y divide-[#E2E8E5]">
          {filteredMembers.map((member) => (
            <div key={member.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {getRankBadge(member.rank)}
                  <img
                    src={member.avatar}
                    alt=""
                    className="w-10 h-10 rounded-[10px] object-cover border border-[#CBD6D1]"
                  />
                  <div>
                    <h3 className="font-bold text-xs text-[#17211D] leading-tight">
                      {member.name}
                    </h3>
                    <p className="text-[11px] text-[#5E6964]">{member.email}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold font-mono-numbers text-sm text-[#0F513B]">
                    {member.points} XP
                  </span>
                </div>
              </div>

              {/* Stats pill on mobile */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-[#F7F9F8] p-2.5 rounded-[10px]">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#D97706]" />
                  <span className="text-[#5E6964]">Streak:</span>
                  <strong className="font-mono-numbers text-[#17211D]">{member.streak}d</strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#146C4E]" />
                  <span className="text-[#5E6964]">Rate:</span>
                  <strong className="font-mono-numbers text-[#146C4E]">
                    {member.completionRate}%
                  </strong>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1">
                {member.badges.map((b) => (
                  <span
                    key={b}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E7F4EE] text-[#0F513B] border border-[#CBD6D1]"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
