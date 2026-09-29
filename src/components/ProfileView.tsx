import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { compressImageUnder10KB, MAX_PROFILE_IMAGE_BYTES } from '../utils/imageHelper.ts';
import { UserCheck, Shield, Upload, Check, AlertCircle, LogOut, KeyRound } from 'lucide-react';

interface ProfileViewProps {
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onOpenAuth }) => {
  const { user, updateProfile, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCompressing, setIsCompressing] = useState(false);
  const [fileFeedback, setFileFeedback] = useState<{
    msg: string;
    isError: boolean;
  } | null>(null);

  // Edit fields
  const [isEditingHierarchy, setIsEditingHierarchy] = useState(false);
  const [sponsorName, setSponsorName] = useState(user?.sponsorName || '');
  const [uplineDirector, setUplineDirector] = useState(user?.uplineDirector || '');
  const [uplineWorldTeamLeader, setUplineWorldTeamLeader] = useState(user?.uplineWorldTeamLeader || '');
  const [isSaving, setIsSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  if (!user) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setFileFeedback(null);

    try {
      // Auto compress to fit strictly under 10KB
      const processed = await compressImageUnder10KB(file);
      if (processed.isWithinLimit) {
        await updateProfile({ profileImage: processed.base64 });
        setFileFeedback({
          msg: `Photo updated successfully (${processed.formattedSize} / 10KB limit)`,
          isError: false,
        });
      } else {
        setFileFeedback({
          msg: `Image is ${processed.formattedSize}, which exceeds the 10KB limit. Please try another image.`,
          isError: true,
        });
      }
    } catch (err: any) {
      setFileFeedback({
        msg: err.message || 'Failed to process image',
        isError: true,
      });
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveHierarchy = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        sponsorName,
        uplineDirector,
        uplineWorldTeamLeader,
      });
      setIsEditingHierarchy(false);
      setFileFeedback({ msg: 'Upline hierarchy details updated.', isError: false });
    } catch (err: any) {
      setFileFeedback({ msg: err.message || 'Failed to update', isError: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordFeedback({ msg: 'New password must be at least 6 characters long.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ msg: 'New passwords do not match.', isError: true });
      return;
    }
    setIsChangingPassword(true);
    setPasswordFeedback(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      setPasswordFeedback({ msg: 'Password updated successfully!', isError: false });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordFeedback({ msg: err.message || 'Error updating password', isError: true });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      {/* Header Profile Identity Card */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          {/* Avatar with 10KB indicator */}
          <div className="relative group shrink-0">
            <img
              src={user.profileImage}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-[#CBD6D1] shadow-2xs"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressing}
              className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-medium transition-opacity"
              title="Upload new profile image (<10KB)"
            >
              <Upload className="w-4 h-4 mb-0.5" />
              <span>{isCompressing ? '...' : '< 10KB'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-lg font-bold text-[#17211D] truncate">{user.name}</h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E7F4EE] text-[#0F513B] uppercase tracking-wide">
                {user.role === 'admin' ? 'Leader / Admin' : 'Team Member'}
              </span>
            </div>
            <p className="text-xs text-[#5E6964] mt-0.5 truncate">{user.email}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F7F9F8] hover:bg-[#E2E8E5] border border-[#CBD6D1] rounded-[8px] text-xs font-medium text-[#17211D] transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#5E6964]" />
                <span>{isCompressing ? 'Compressing...' : 'Change Photo (Max 10KB)'}</span>
              </button>
            </div>
          </div>
        </div>

        {fileFeedback && (
          <div
            className={`mt-4 p-2.5 rounded-[10px] border text-xs flex items-center gap-2 ${
              fileFeedback.isError
                ? 'bg-[#FFF0F0] border-[#E2E8E5] text-[#C84C4C]'
                : 'bg-[#F3FAF7] border-[#E7F4EE] text-[#0F513B]'
            }`}
          >
            {fileFeedback.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Check className="w-4 h-4 shrink-0" />
            )}
            <span>{fileFeedback.msg}</span>
          </div>
        )}
      </div>

      {/* Network Upline Hierarchy (Core Requirement) */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-[#17211D]">Network Leadership Hierarchy</h2>
            <p className="text-xs text-[#5E6964]">Mandatory upline authentication credentials</p>
          </div>
          <button
            onClick={() => setIsEditingHierarchy(!isEditingHierarchy)}
            className="text-xs font-semibold text-[#146C4E] hover:underline"
          >
            {isEditingHierarchy ? 'Cancel' : 'Edit Info'}
          </button>
        </div>

        {isEditingHierarchy ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#5E6964] mb-1">
                Sponsor Name *
              </label>
              <input
                type="text"
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5E6964] mb-1">
                Upline Director *
              </label>
              <input
                type="text"
                value={uplineDirector}
                onChange={(e) => setUplineDirector(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5E6964] mb-1">
                Upline World Team Leader *
              </label>
              <input
                type="text"
                value={uplineWorldTeamLeader}
                onChange={(e) => setUplineWorldTeamLeader(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsEditingHierarchy(false)}
                className="px-3 py-1.5 border border-[#E2E8E5] text-xs rounded-[8px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHierarchy}
                disabled={isSaving}
                className="px-3 py-1.5 bg-[#146C4E] text-white text-xs font-semibold rounded-[8px]"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Sponsor */}
            <div className="p-3 bg-[#F7F9F8] rounded-[12px] border border-[#E2E8E5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E7F4EE] flex items-center justify-center text-[#146C4E]">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#89928E] uppercase tracking-wider">
                    Sponsor Name
                  </div>
                  <div className="text-xs font-semibold text-[#17211D]">
                    {user.sponsorName || 'Direct Sponsor'}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-[#5E6964]">Direct Upline</span>
            </div>

            {/* Upline Director */}
            <div className="p-3 bg-[#F7F9F8] rounded-[12px] border border-[#E2E8E5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E7F4EE] flex items-center justify-center text-[#146C4E]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#89928E] uppercase tracking-wider">
                    Upline Director
                  </div>
                  <div className="text-xs font-semibold text-[#17211D]">
                    {user.uplineDirector || 'Regional Director'}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-[#5E6964]">Director Tier</span>
            </div>

            {/* Upline World Team Leader */}
            <div className="p-3 bg-[#F7F9F8] rounded-[12px] border border-[#E2E8E5] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#E7F4EE] flex items-center justify-center text-[#146C4E]">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-[#89928E] uppercase tracking-wider">
                    Upline World Team Leader
                  </div>
                  <div className="text-xs font-semibold text-[#17211D]">
                    {user.uplineWorldTeamLeader || 'World Team Leader'}
                  </div>
                </div>
              </div>
              <span className="text-[11px] text-[#5E6964]">Executive Level</span>
            </div>
          </div>
        )}
      </div>

      {/* Security & Password */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#146C4E]" />
          <div>
            <h2 className="text-sm font-semibold text-[#17211D]">Security & Password</h2>
            <p className="text-xs text-[#5E6964]">Update your login password</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          {passwordFeedback && (
            <div
              className={`p-2.5 rounded-[10px] border text-xs flex items-center gap-2 ${
                passwordFeedback.isError
                  ? 'bg-[#FFF0F0] border-[#E2E8E5] text-[#C84C4C]'
                  : 'bg-[#F3FAF7] border-[#E7F4EE] text-[#0F513B]'
              }`}
            >
              {passwordFeedback.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <Check className="w-4 h-4 shrink-0" />
              )}
              <span>{passwordFeedback.msg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5E6964] mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full h-9 px-3 bg-[#F7F9F8] border border-[#CBD6D1] rounded-[8px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#5E6964] mb-1">
                New Password (min 6 chars)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full h-9 px-3 bg-[#F7F9F8] border border-[#CBD6D1] rounded-[8px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#5E6964] mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full h-9 px-3 bg-[#F7F9F8] border border-[#CBD6D1] rounded-[8px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isChangingPassword || !newPassword}
            className="px-4 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[8px] shadow-2xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isChangingPassword ? (
              <span>Updating...</span>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      </div>

      {/* Account Actions */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-semibold text-[#17211D]">Account Operations</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={onOpenAuth}
            className="flex-1 px-4 py-2.5 bg-[#F7F9F8] hover:bg-[#E2E8E5] border border-[#E2E8E5] text-xs font-semibold text-[#17211D] rounded-[10px] text-center"
          >
            Register Another Account / Switch
          </button>
          <button
            onClick={logout}
            className="px-4 py-2.5 bg-[#FFF0F0] hover:bg-[#ffe5e5] border border-[#E2E8E5] text-xs font-semibold text-[#C84C4C] rounded-[10px] inline-flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
