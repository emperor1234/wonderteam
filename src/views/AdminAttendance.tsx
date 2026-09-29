import React, { useState, useEffect } from 'react';
import { TeamAttendanceSummary, TeamMemberLiveStatus } from '../types/index.ts';
import { Clock, RefreshCw, Download, CheckCircle, AlertCircle } from 'lucide-react';

export const AdminAttendance: React.FC = () => {
  const [summary, setSummary] = useState<TeamAttendanceSummary | null>(null);
  const [members, setMembers] = useState<TeamMemberLiveStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'present' | 'late' | 'not_checked_in' | 'unserious'>('all');

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/attendance/team');
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setMembers(data.members);
      }
    } catch (err) {
      console.error('Error fetching admin attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const total = summary?.total || 0;
  const presentCount = summary?.presentCount || 0;
  const purePresent = summary?.purePresent || 0;
  const lateCount = summary?.lateCount || 0;
  const notCheckedInCount = summary?.notCheckedInCount || 0;
  const unseriousCount = summary?.unseriousCount || 0;

  const filteredMembers = members.filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'present') return m.status === 'present';
    if (filter === 'late') return m.status === 'late';
    if (filter === 'not_checked_in') return m.status === 'not_checked_in' || m.status === 'absent';
    if (filter === 'unserious') return m.workEthicStatus === 'unserious';
    return true;
  });

  const exportCSV = () => {
    const headers = ['Team Member', 'Roll Status', 'Work Ethic Status', 'Clock In', 'Duration', 'Remarks'];
    const rows = members.map((m) => [
      m.name,
      m.status,
      m.workEthicStatus || 'pending',
      m.clockIn,
      m.duration,
      `"${m.lastActivity.replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wonderteam_register_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E2E8E5] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">
            Attendance & Presence
          </h1>
          <p className="text-xs text-[#5E6964]">
            {new Intl.DateTimeFormat('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }).format(new Date())}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAttendance}
            className="p-2 border border-[#E2E8E5] bg-white rounded-[8px] text-[#5E6964] hover:bg-[#F7F9F8] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#E2E8E5] bg-white hover:bg-[#F7F9F8] text-xs font-semibold text-[#17211D] rounded-[8px] shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#5E6964]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Dominant Presence Summary Banner */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-[#5E6964] uppercase tracking-wider block mb-1">
              Active Team Shift Presence
            </span>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold font-mono-numbers text-[#17211D]">
                {presentCount} / {total} present
              </span>
            </div>
            <p className="text-xs text-[#5E6964] mt-1.5">
              Live presence status aggregated across all active team field territories.
            </p>
          </div>

          {/* Restrained horizontal distribution bar */}
          <div className="md:w-72 bg-[#F7F9F8] p-3 rounded-[12px] border border-[#E2E8E5] space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#146C4E]">{purePresent} On Time</span>
              <span className="text-[#B7791F]">{lateCount} Late</span>
              <span className="text-[#89928E]">{notCheckedInCount} Unchecked</span>
            </div>
            <div className="h-2 w-full bg-[#E2E8E5] rounded-full flex overflow-hidden">
              <div
                style={{ width: `${total ? (purePresent / total) * 100 : 0}%` }}
                className="bg-[#146C4E] h-full"
              />
              <div
                style={{ width: `${total ? (lateCount / total) * 100 : 0}%` }}
                className="bg-[#B7791F] h-full"
              />
              <div
                style={{ width: `${total ? (notCheckedInCount / total) * 100 : 0}%` }}
                className="bg-[#CBD6D1] h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[#89928E] text-[11px] font-semibold uppercase tracking-wider">
          Filter:
        </span>
        {(['all', 'present', 'late', 'not_checked_in', 'unserious'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors ${
              filter === key
                ? key === 'unserious'
                  ? 'bg-[#C84C4C] text-white shadow-2xs font-bold'
                  : 'bg-[#146C4E] text-white shadow-2xs'
                : key === 'unserious'
                ? 'bg-[#FFF0F0] border border-[#C84C4C] text-[#C84C4C] hover:bg-[#FFE5E5]'
                : 'bg-white border border-[#E2E8E5] text-[#5E6964] hover:bg-[#F7F9F8]'
            }`}
          >
            {key === 'all'
              ? 'All Members'
              : key === 'present'
              ? 'Present'
              : key === 'late'
              ? 'Late'
              : key === 'not_checked_in'
              ? 'Not Checked In'
              : '⚠️ Unserious (To-Do Missed)'}
          </button>
        ))}
      </div>

      {/* Live Team Presence List: Desktop Table & Mobile Stacked Cards */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] shadow-xs overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E2E8E5] bg-[#F7F9F8] text-[11px] font-semibold text-[#89928E] uppercase tracking-wider">
                <th className="py-3 px-4">Team Member</th>
                <th className="py-3 px-4">Roll Call Status</th>
                <th className="py-3 px-4">Morning To-Do (9:30–11am)</th>
                <th className="py-3 px-4">Dashboard Status</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8E5] text-xs">
              {filteredMembers.map((m) => (
                <tr key={m.memberId} className="hover:bg-[#F7F9F8] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={m.avatar}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover border border-[#CBD6D1]"
                      />
                      <span className="font-semibold text-[#17211D]">{m.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 font-semibold text-[11px] capitalize ${
                        m.status === 'present'
                          ? 'text-[#146C4E]'
                          : m.status === 'late'
                          ? 'text-[#B7791F]'
                          : 'text-[#89928E]'
                      }`}
                    >
                      {m.status === 'present' && <CheckCircle className="w-3.5 h-3.5" />}
                      {m.status === 'late' && <AlertCircle className="w-3.5 h-3.5" />}
                      {m.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {m.hasWrittenTodoToday ? (
                      <span className="text-[11px] font-semibold text-[#146C4E]">
                        ✓ Written on time
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-[#C84C4C]">
                        ✗ Not written
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {m.workEthicStatus === 'unserious' ? (
                      <span className="px-2 py-0.5 rounded-[4px] bg-[#FFF0F0] text-[#C84C4C] border border-[#C84C4C] text-[10px] font-black uppercase tracking-wider inline-block">
                        UNSERIOUS
                      </span>
                    ) : m.workEthicStatus === 'serious' ? (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-[#E7F4EE] text-[#0F513B] text-[10px] font-bold inline-block">
                        SERIOUS
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-[#FFF6E5] text-[#B7791F] text-[10px] font-medium inline-block">
                        TO-DO PENDING
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono-numbers text-[#17211D]">
                    {m.clockIn}
                  </td>
                  <td className="py-3 px-4 font-mono-numbers text-[#5E6964]">
                    {m.duration}
                  </td>
                  <td className="py-3 px-4 text-[#5E6964] max-w-xs truncate">
                    {m.lastActivity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked View */}
        <div className="md:hidden divide-y divide-[#E2E8E5]">
          {filteredMembers.map((m) => (
            <div key={m.memberId} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={m.avatar}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border border-[#CBD6D1]"
                  />
                  <div>
                    <div className="font-semibold text-xs text-[#17211D]">{m.name}</div>
                    <div className="text-[11px] text-[#89928E]">{m.duration} elapsed</div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {m.workEthicStatus === 'unserious' && (
                    <span className="px-1.5 py-0.5 rounded-[4px] bg-[#FFF0F0] text-[#C84C4C] border border-[#C84C4C] text-[10px] font-black uppercase">
                      UNSERIOUS
                    </span>
                  )}
                  <span
                    className={`text-[11px] font-semibold capitalize ${
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
              </div>

              <div className="text-xs text-[#5E6964] bg-[#F7F9F8] p-2 rounded-[8px] flex items-center justify-between font-mono-numbers">
                <span>Check-in: {m.clockIn}</span>
                <span className="text-[11px] font-sans truncate max-w-[150px]">{m.lastActivity}</span>
              </div>
              {m.workEthicStatus === 'unserious' && (
                <div className="text-[10px] font-semibold text-[#C84C4C]">
                  Marked Unserious: To-do list was not written between 9:30 AM – 11:00 AM GMT+1
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
