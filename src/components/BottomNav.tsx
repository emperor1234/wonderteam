import React from 'react';
import { Home, BookOpen, CheckSquare, Receipt, User as UserIcon, LayoutDashboard, Clock, Users, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Member navigation: Home, Library (Reading & Dictionary), Tasks, Spending, Profile
  const memberItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'spending', label: 'Spending', icon: Receipt },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  // Admin navigation: Overview, Attendance, Leaderboard, Tasks, Team
  const adminItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leaderboard', label: 'Ranks', icon: Trophy },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'team', label: 'Team', icon: Users },
  ];

  const items = isAdmin ? adminItems : memberItems;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E2E8E5] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="h-16 flex items-center justify-around px-2 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex-1 h-full flex flex-col items-center justify-center gap-1 min-w-[44px] transition-colors ${
                isActive ? 'text-[#146C4E]' : 'text-[#89928E] hover:text-[#5E6964]'
              }`}
            >
              <div
                className={`p-1 rounded-[8px] transition-colors ${
                  isActive ? 'bg-[#E7F4EE] text-[#0F513B]' : ''
                }`}
              >
                <Icon className="w-5 h-5 stroke-[1.8]" />
              </div>
              <span className={`text-[11px] font-medium tracking-tight ${isActive ? 'font-semibold text-[#0F513B]' : ''}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
