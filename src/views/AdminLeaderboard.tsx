import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Flame,
  CheckCircle2,
  Search,
  Medal,
  Target,
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
  ipaCompletionRate: number;
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

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/leaderboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const members = data?.leaderboard || [];
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const top3 = members.slice(0, 3);

  const getRankDisplay = (rank: number) => {
    const base = 'w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-xs shrink-0';
    if (rank === 1)
      return <div className={`${base} bg-[#FEF3C7] border-2 border-[#F59E0B] text-[#B45309]`}>1</div>;
    if (rank === 2)
      return <div className={`${base} bg-[#F3F4F6] border-2 border-[#9CA3AF] text-[#4B5563]`}>2</div>;
    if (rank === 3)
      return <div className={`${base} bg-[#FFEDD5] border-2 border-[#D97706] text-[#9A3412]`}>3</div>;
    return (
      <div className="w-7 h-7 rounded-full bg-[#F7F9F8] border border-[#CBD6D1] text-[#5E6964] font-bold text-xs flex items-center justify-center shrink-0">
        {rank}
      </div>
    );
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'Diamond':
        return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
      case 'Elite':
        return 'bg-[#F3E8FF] text-[#7E22CE] border-[#E9D5FF]';
      case 'Pro':
        return 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]';
      case 'Rising':
        return 'bg-[#E7F4EE] text-[#0F513B] border-[#CBD6D1]';
      default:
        return 'bg-[#F4F4F5] text-[#52525B] border-[#E4E4E7]';
    }
  };

  const getPodiumStyle = (idx: number) => {
    if (idx === 0) return 'border-[#F59E0B] ring-1 ring-[#F59E0B]/30';
    if (idx === 1) return 'border-[#9CA3AF]';
    return 'border-[#D97706]/50';
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-5 pb-24">
        <div className="h-8 bg-[#E9EFEC] rounded-[10px] w-56 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[#E9EFEC] rounded-[16px] animate-pulse" />
          ))}
        </div>
        <div className="h-56 bg-[#E9EFEC] rounded-[18px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-[#E2E8E5] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#146C4E] uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4 text-[#D97706]" />
            <span>Growth Gamification · Streaks & XP</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17211D]">Team Leaderboard</h1>
          <p className="text-xs text-[#5E6964] mt-0.5">
            Attendance streaks · IPA completion · XP score · Rank standings
          </p>
        </div>
        <button
          type="button"
          onClick={fetchLeaderboard}
          disabled={isLoading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-2 border border-[#CBD6D1] bg-white hover:bg-[#F7F9F8] text-[#17211D] rounded-[10px] text-xs font-semibold transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#146C4E]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-[16px] border border-[#CBD6D1] shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5E6964] uppercase tracking-wider mb-2">
              <Crown className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Top Rank</span>
            </div>
            <div className="text-sm font-bold text-[#17211D] truncate">
              {data.summary.topPerformer?.name || '—'}
            </div>
            <div className="text-[11px] text-[#146C4E] font-semibold mt-0.5">
              {data.summary.topPerformer
                ? `${data.summary.topPerformer.points} XP · ${data.summary.topPerformer.streak}d streak`
                : 'No data yet'}
            </div>
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-[#CBD6D1] shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5E6964] uppercase tracking-wider mb-2">
              <Flame className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Longest Streak</span>
            </div>
            <div className="text-2xl font-bold text-[#17211D]">{data.summary.highestStreak}</div>
            <div className="text-[11px] text-[#5E6964]">consecutive days</div>
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-[#CBD6D1] shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5E6964] uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#146C4E]" />
              <span>Team Completion</span>
            </div>
            <div className="text-2xl font-bold text-[#146C4E]">{data.summary.avgCompletionRate}%</div>
            <div className="text-[11px] text-[#5E6964]">average task rate</div>
          </div>

          <div className="bg-white p-4 rounded-[16px] border border-[#CBD6D1] shadow-2xs">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5E6964] uppercase tracking-wider mb-2">
              <Target className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Active Members</span>
            </div>
            <div className="text-2xl font-bold text-[#17211D]">{data.summary.activeMembers}</div>
            <div className="text-[11px] text-[#5E6964]">in competition</div>
          </div>
        </div>
      )}

      {/* Podium Top 3 */}
      {top3.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#17211D] uppercase tracking-wider mb-3">
            <Medal className="w-4 h-4 text-[#D97706]" />
            <span>Podium Leaders</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3.map((member, idx) => (
              <div
                key={member.id}
                className={`p-5 rounded-[18px] bg-white border transition-shadow hover:shadow-md ${getPodiumStyle(idx)}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-11 h-11 rounded-[12px] object-cover border border-[#CBD6D1]"
                      />
                      <div className="absolute -top-2 -left-2">{getRankDisplay(member.rank)}</div>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#17211D] leading-tight">{member.name}</h3>
                      <p className="text-[11px] text-[#5E6964] truncate max-w-[100px]">{member.email}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getLevelStyle(
                      member.level
                    )}`}
                  >
                    {member.level}
                  </span>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-[#E2E8E5]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5E6964] flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#D97706]" />
                      Streak
                    </span>
                    <span className="font-bold text-[#17211D]">{member.streak} days</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5E6964] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-[#146C4E]" />
                      Task Rate
                    </span>
                    <span className="font-bold text-[#146C4E]">{member.completionRate}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#E9EFEC] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#146C4E] rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, member.completionRate)}%` }}
                    />
                  </div>
                  {member.ipaCompletionRate > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#5E6964] flex items-center gap-1">
                        <Target className="w-3 h-3 text-[#2563EB]" />
                        IPA Rate
                      </span>
                      <span className="font-bold text-[#2563EB]">{member.ipaCompletionRate}%</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[#89928E]">Growth XP</span>
                    <span className="text-base font-black text-[#0F513B]">{member.points} XP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && !isLoading && (
        <div className="bg-white rounded-[18px] border border-[#E2E8E5] p-12 text-center space-y-3">
          <Trophy className="w-10 h-10 text-[#CBD6D1] mx-auto" />
          <p className="text-sm font-bold text-[#17211D]">No members on the leaderboard yet</p>
          <p className="text-xs text-[#5E6964]">
            Members will appear here once they start completing tasks and checking in.
          </p>
        </div>
      )}

      {/* Full Rankings */}
      {members.length > 0 && (
        <div className="bg-white rounded-[18px] border border-[#CBD6D1] shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E2E8E5] flex flex-col sm:flex-row sm:items-center gap-3">
            <h2 className="text-sm font-bold text-[#17211D] shrink-0">
              All Rankings ({members.length})
            </h2>
            <div className="relative sm:ml-auto w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#89928E]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member..."
                className="w-full h-9 pl-9 pr-3 bg-[#F7F9F8] border border-[#CBD6D1] rounded-[8px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
              />
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F7F9F8] border-b border-[#E2E8E5] text-[#5E6964] font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Streak</th>
                  <th className="py-3 px-4">Task Rate</th>
                  <th className="py-3 px-4">IPA Rate</th>
                  <th className="py-3 px-4">Badges</th>
                  <th className="py-3 px-4 text-right">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E5]">
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-[#F7F9F8]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex justify-center">{getRankDisplay(member.rank)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.avatar}
                          alt=""
                          className="w-9 h-9 rounded-[10px] object-cover border border-[#CBD6D1]"
                        />
                        <div>
                          <div className="font-bold text-[#17211D]">{member.name}</div>
                          <div className="text-[11px] text-[#5E6964]">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FFF6E5] text-[#B7791F] border border-[#FCE8B2] rounded-[8px] font-bold">
                        <Flame className="w-3 h-3 text-[#D97706]" />
                        {member.streak}d
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-32 space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-[#146C4E]">{member.completionRate}%</span>
                          <span className="text-[#89928E]">
                            {member.completedTasks}/{member.totalTasks}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#E9EFEC] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#146C4E] rounded-full"
                            style={{ width: `${Math.min(100, member.completionRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#2563EB]">{member.ipaCompletionRate}%</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {member.badges.slice(0, 2).map((b) => (
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
                      <span className="font-bold text-sm text-[#0F513B]">{member.points}</span>
                    </td>
                  </tr>
                ))}
                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-[#5E6964]">
                      No members match your search
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden divide-y divide-[#E2E8E5]">
            {filteredMembers.map((member) => (
              <div key={member.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankDisplay(member.rank)}
                    <img
                      src={member.avatar}
                      alt=""
                      className="w-10 h-10 rounded-[10px] object-cover border border-[#CBD6D1]"
                    />
                    <div>
                      <h3 className="font-bold text-xs text-[#17211D]">{member.name}</h3>
                      <p className="text-[11px] text-[#5E6964]">{member.email}</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-[#0F513B]">{member.points} XP</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs bg-[#F7F9F8] p-2.5 rounded-[10px]">
                  <div className="text-center">
                    <div className="text-[10px] text-[#5E6964] mb-0.5">Streak</div>
                    <div className="font-bold text-[#17211D] flex items-center justify-center gap-0.5">
                      <Flame className="w-3 h-3 text-[#D97706]" />
                      {member.streak}d
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[#5E6964] mb-0.5">Task Rate</div>
                    <div className="font-bold text-[#146C4E]">{member.completionRate}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-[#5E6964] mb-0.5">IPA Rate</div>
                    <div className="font-bold text-[#2563EB]">{member.ipaCompletionRate}%</div>
                  </div>
                </div>
                {member.badges.length > 0 && (
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
                )}
              </div>
            ))}
            {filteredMembers.length === 0 && (
              <div className="py-8 text-center text-xs text-[#5E6964]">No members found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
