import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { TeamMemberDirectoryItem } from '../types/index.ts';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  UserPlus,
} from 'lucide-react';

export const AdminTeam: React.FC = () => {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMemberDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Delete modal state
  const [memberToDelete, setMemberToDelete] = useState<TeamMemberDirectoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const handleToggleRole = async (targetMember: TeamMemberDirectoryItem) => {
    if (!user || user.role !== 'admin') {
      showError('Only administrators can change member roles.');
      return;
    }

    const newRole = targetMember.role === 'admin' ? 'member' : 'admin';
    setActionLoadingId(targetMember.id);

    try {
      const res = await fetch('/api/admin/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          targetUserId: targetMember.id,
          newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Failed to update user role.');
        return;
      }

      showToast(
        newRole === 'admin'
          ? `Promoted ${targetMember.name} to Leader (Admin)`
          : `Changed ${targetMember.name} to Member`
      );
      await fetchTeam();
    } catch {
      showError('Network error while updating role. Please try again.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!memberToDelete || !user) return;
    setIsDeleting(true);

    try {
      const res = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: user.id,
          targetUserId: memberToDelete.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Failed to delete user account.');
        return;
      }

      showToast(`Account for ${memberToDelete.name} was permanently deleted.`);
      setMemberToDelete(null);
      await fetchTeam();
    } catch {
      showError('Network error while deleting account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 pb-20 max-w-5xl mx-auto">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 p-3 bg-[#146C4E] text-white text-xs font-semibold rounded-[10px] shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-16 right-4 z-50 p-3 bg-[#C84C4C] text-white text-xs font-semibold rounded-[10px] shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E2E8E5] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#146C4E] uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>Team Administration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">
            Team & Member Management
          </h1>
          <p className="text-xs text-[#5E6964]">
            Manage member accounts, assign admin privileges, and maintain network operations securely.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#89928E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search members..."
            className="w-full h-9 pl-9 pr-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] placeholder:text-[#89928E] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-44 bg-[#E9EFEC] rounded-[16px] animate-pulse"></div>
          <div className="h-44 bg-[#E9EFEC] rounded-[16px] animate-pulse"></div>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-10 text-center space-y-3">
          <Users className="w-10 h-10 text-[#CBD6D1] mx-auto" />
          <h3 className="text-sm font-bold text-[#17211D]">
            {searchQuery ? 'No matching members found' : 'No team members registered yet'}
          </h3>
          <p className="text-xs text-[#5E6964] max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search criteria.'
              : 'As new members register with your team, they will automatically appear here for role assignment and monitoring.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMembers.map((member) => {
            const isSelf = user?.id === member.id;
            const isTargetAdmin = member.role === 'admin';
            const isActionLoading = actionLoadingId === member.id;

            return (
              <div
                key={member.id}
                className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs flex flex-col justify-between hover:border-[#CBD6D1] transition-all"
              >
                <div>
                  {/* Member Top Info */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.profileImage}
                        alt={member.name}
                        className="w-11 h-11 rounded-full object-cover border border-[#CBD6D1] shrink-0"
                      />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-[#17211D] truncate">{member.name}</h3>
                          {isSelf && (
                            <span className="text-[10px] font-semibold text-[#146C4E] bg-[#E7F4EE] px-1.5 py-0.5 rounded-[4px]">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#5E6964] truncate">{member.email}</p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-[6px] shrink-0 ${
                        isTargetAdmin
                          ? 'bg-[#146C4E] text-white'
                          : 'bg-[#E7F4EE] text-[#0F513B]'
                      }`}
                    >
                      {isTargetAdmin ? 'Leader' : 'Member'}
                    </span>
                  </div>

                  {/* Upline Leadership Network */}
                  <div className="space-y-1.5 mt-4 pt-3 border-t border-[#E2E8E5] text-xs">
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

                {/* Bottom Actions Bar */}
                <div className="mt-4 pt-3 border-t border-[#E2E8E5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono-numbers text-[#5E6964]">
                    <span>
                      <strong className="text-[#17211D]">{member.pendingTasks ?? 0}</strong> pending
                    </span>
                    <span className="text-[#CBD6D1]">·</span>
                    <span>
                      <strong className="text-[#146C4E]">{member.completedTasks ?? 0}</strong> done
                    </span>
                  </div>

                  {/* Admin action buttons */}
                  {!isSelf && (
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleToggleRole(member)}
                        disabled={isActionLoading}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[11px] font-bold border transition-colors ${
                          isTargetAdmin
                            ? 'bg-white border-[#CBD6D1] text-[#5E6964] hover:bg-[#FFF0F0] hover:text-[#C84C4C] hover:border-[#C84C4C]/40'
                            : 'bg-[#E7F4EE] border-[#CBD6D1] text-[#0F513B] hover:bg-[#D5EFE3]'
                        }`}
                        title={isTargetAdmin ? 'Demote to regular member' : 'Promote to admin'}
                      >
                        {isTargetAdmin ? (
                          <>
                            <ShieldAlert className="w-3 h-3 text-[#B7791F]" />
                            <span>Remove Admin</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3 h-3 text-[#146C4E]" />
                            <span>Make Admin</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemberToDelete(member)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[11px] font-bold bg-white hover:bg-[#FFF0F0] text-[#89928E] hover:text-[#C84C4C] border border-[#CBD6D1] hover:border-[#C84C4C]/40 transition-colors"
                        title="Delete member account"
                      >
                        <Trash2 className="w-3 h-3 text-[#C84C4C]" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => !isDeleting && setMemberToDelete(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-[20px] shadow-2xl overflow-hidden border border-[#E2E8E5] p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F0] text-[#C84C4C] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setMemberToDelete(null)}
                className="p-1 rounded-[6px] text-[#89928E] hover:text-[#17211D]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-[#17211D]">
                Delete Member Account?
              </h3>
              <p className="text-xs text-[#5E6964] mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-[#17211D]">{memberToDelete.name}</strong> (
                {memberToDelete.email})?
              </p>
              <div className="mt-3 p-3 bg-[#FFF8E7] rounded-[10px] border border-[#FCE8B2] text-[11px] text-[#B7791F] space-y-1">
                <p className="font-semibold">⚠️ This action cannot be reversed:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                  <li>All attendance registers will be wiped</li>
                  <li>All assigned and personal tasks will be removed</li>
                  <li>Account login access will be terminated immediately</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-[#F7F9F8] hover:bg-[#E2E8E5] text-[#17211D] rounded-[10px] text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-[#C84C4C] hover:bg-[#A83838] text-white rounded-[10px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
