import React from 'react';
import { LayoutDashboard, Clock, BookOpen, CheckSquare, Users, Trophy, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AdminSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leaderboard', label: 'Team Leaderboard', icon: Trophy },
    { id: 'library', label: 'Growth Library', icon: BookOpen },
    { id: 'tasks', label: 'Operations & Tasks', icon: CheckSquare },
    { id: 'team', label: 'Team Directory', icon: Users },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[232px] bg-white border-r border-[#E2E8E5] min-h-[calc(100dvh-3.5rem)] shrink-0 p-4">
      {/* Admin Info Summary */}
      <div className="mb-6 px-3 py-2.5 bg-[#F7F9F8] rounded-[10px] border border-[#E2E8E5]">
        <div className="text-[11px] font-semibold text-[#89928E] uppercase tracking-wider mb-1">
          Leader Console
        </div>
        <div className="font-semibold text-xs text-[#17211D] truncate">{user?.name}</div>
        <div className="text-[11px] text-[#5E6964] truncate">Director: {user?.uplineDirector}</div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-[#E7F4EE] text-[#0F513B] font-semibold shadow-xs'
                  : 'text-[#5E6964] hover:bg-[#F7F9F8] hover:text-[#17211D]'
              }`}
            >
              <Icon className={`w-4 h-4 stroke-[2] ${isActive ? 'text-[#0F513B]' : 'text-[#89928E]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Security Privacy Notice */}
      <div className="mt-auto pt-4 border-t border-[#E2E8E5]">
        <div className="flex items-start gap-2 text-[11px] text-[#89928E] leading-relaxed">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-[#146C4E] mt-0.5" />
          <span>Finance & spending separated from leader oversight by protocol.</span>
        </div>
      </div>
    </aside>
  );
};
