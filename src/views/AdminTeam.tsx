import React, { useState, useEffect } from 'react';
import { TeamMemberDirectoryItem } from '../types/index.ts';
import { Users, Shield, UserCheck, CheckCircle2, Clock } from 'lucide-react';

export const AdminTeam: React.FC = () => {
  const [members, setMembers] = useState<TeamMemberDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((data) => setMembers(data))
      .catch((err) => console.error('Failed to load team:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5 pb-20">
      {/* Header */}
      <div className="border-b border-[#E2E8E5] pb-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">
          Team & Network Hierarchy
        </h1>
        <p className="text-xs text-[#5E6964]">
          Operational member directory, upline director assignments, and active task distribution
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-40 bg-[#E9EFEC] rounded-[16px] animate-pulse"></div>
          <div className="h-40 bg-[#E9EFEC] rounded-[16px] animate-pulse"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                {/* Member Top Info */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={member.profileImage}
                      alt={member.name}
                      className="w-11 h-11 rounded-full object-cover border border-[#CBD6D1]"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-[#17211D]">{member.name}</h3>
                      <p className="text-xs text-[#5E6964]">{member.email}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-[6px] bg-[#E7F4EE] text-[#0F513B]">
                    {member.role === 'admin' ? 'Leader' : 'Member'}
                  </span>
                </div>

                {/* Upline Leadership Network */}
                <div className="space-y-2 mt-4 pt-3 border-t border-[#E2E8E5] text-xs">
                  <div className="flex items-center justify-between text-[#5E6964]">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <UserCheck className="w-3.5 h-3.5 text-[#146C4E]" />
                      <span>Sponsor:</span>
                    </span>
                    <span className="font-semibold text-[#17211D]">
                      {member.sponsorName || 'Direct'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#5E6964]">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-[#146C4E]" />
                      <span>Upline Director:</span>
                    </span>
                    <span className="font-semibold text-[#17211D]">
                      {member.uplineDirector || 'Regional Director'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[#5E6964]">
                    <span className="flex items-center gap-1.5 text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-[#146C4E]" />
                      <span>World Team Leader:</span>
                    </span>
                    <span className="font-semibold text-[#17211D]">
                      {member.uplineWorldTeamLeader || 'Executive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workload strip */}
              <div className="mt-4 pt-3 border-t border-[#E2E8E5] flex items-center justify-between text-xs">
                <span className="text-[#89928E]">Assigned Tasks:</span>
                <div className="flex items-center gap-2 font-mono-numbers">
                  <span className="text-[#17211D] font-bold">{member.pendingTasks} pending</span>
                  <span className="text-[#CBD6D1]">·</span>
                  <span className="text-[#146C4E] font-medium">{member.completedTasks} done</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
