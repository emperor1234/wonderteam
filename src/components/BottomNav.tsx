import React from 'react';
import { Home, BookOpen, CheckSquare, Receipt, User as UserIcon, LayoutDashboard, Clock, Users, Trophy, MessageCircle, type LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useChat } from '../context/ChatContext.tsx';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const { enabled, totalUnread } = useChat();
  const isAdmin = user?.role === 'admin';

  // Member navigation: Home, Library (Reading & Dictionary), Tasks, Spending, Profile
  const memberItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'spending', label: 'Spending', icon: Receipt },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  // Admin navigation: Overview, Attendance, Leaderboard, Tasks, Team
  const adminItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leaderboard', label: 'Ranks', icon: Trophy },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'team', label: 'Team', icon: Users },
  ];

  const items = [...(isAdmin ? adminItems : memberItems)];
  if (enabled) {
    items.push({ id: 'messages', label: 'Messages', icon: MessageCircle, badge: totalUnread });
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8E5] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="h-16 flex items-center justify-around px-1.5 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const showBadge = (item.badge ?? 0) > 0;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex-1 h-full flex flex-col items-center justify-center gap-1 min-w-[44px] transition-colors ${
                isActive ? 'text-[#146C4E]' : 'text-[#89928E] hover:text-[#5E6964]'
              }`}
            >
              <div
                className={`p-1 rounded-[8px] transition-colors ${
                  isActive ? 'bg-[#E7F4EE] text-[#0F513B]' : ''
                }`}
              >
                <Icon className="w-5 h-5" stroke="1.8" />
                {showBadge && (
                  <span className="absolute top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#C84C4C] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                    {item.badge! > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium tracking-tight leading-none ${isActive ? 'font-semibold text-[#0F513B]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
