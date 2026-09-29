import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ArrowLeftRight, Download, WifiOff, Home, BookOpen, CheckSquare, Receipt, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, currentTab, onSelectTab, isAdmin }) => {
  const { user, availableUsers, switchUser, isOffline } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const memberNavItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'library', label: 'Library & Reading', icon: BookOpen },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'spending', label: 'Spending', icon: Receipt },
    { id: 'profile', label: 'Profile', icon: UserIcon },
  ];

  return (
    <>
      {isOffline && (
        <div className="bg-[#FFF6E5] border-b border-[#E2E8E5] px-4 py-2 text-center text-xs text-[#B7791F] flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>You're offline. Changes will sync when you're back online.</span>
        </div>
      )}

      <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8E5] h-14 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-[#146C4E] flex items-center justify-center text-white font-semibold text-sm tracking-tight shadow-xs">
            W
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[15px] tracking-tight text-[#17211D]">
                WonderTeam
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#E7F4EE] text-[#0F513B] tracking-wide">
                {user?.role === 'admin' ? 'TEAM LEAD' : 'MEMBER'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Desktop Navigation for Team Members */}
        {!isAdmin && onSelectTab && (
          <nav className="hidden md:flex items-center gap-1 bg-[#F7F9F8] p-1 rounded-[10px] border border-[#E2E8E5]">
            {memberNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-colors ${
                    isActive
                      ? 'bg-white text-[#0F513B] shadow-xs'
                      : 'text-[#5E6964] hover:text-[#17211D]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#146C4E]' : 'text-[#89928E]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#146C4E] bg-[#E7F4EE] hover:bg-[#d8ece2] rounded-[8px] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* Quick Role / User Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowSwitchMenu(!showSwitchMenu)}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-[#F7F9F8] hover:bg-[#E2E8E5] text-[#17211D] text-xs font-medium rounded-[10px] border border-[#E2E8E5] transition-all"
              title="Switch between Team Member and Admin role"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-[#5E6964]" />
              <span className="hidden md:inline text-[#5E6964]">Switch Profile:</span>
              <span className="font-semibold truncate max-w-[110px]">{user?.name.split(' ')[0] || 'Guest'}</span>
            </button>

            {showSwitchMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-[12px] border border-[#E2E8E5] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-[#E2E8E5] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#89928E] uppercase tracking-wider">
                    Select Profile
                  </span>
                  <button
                    onClick={() => {
                      setShowSwitchMenu(false);
                      onOpenAuth();
                    }}
                    className="text-xs font-medium text-[#146C4E] hover:underline"
                  >
                    + New User
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto py-1">
                  {availableUsers.map((u) => {
                    const isSelected = u.id === user?.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setShowSwitchMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-[#E7F4EE] text-[#0F513B]' : 'hover:bg-[#F7F9F8] text-[#17211D]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img
                            src={u.profileImage}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-[#E2E8E5]"
                          />
                          <div className="truncate">
                            <div className="text-xs font-medium truncate">{u.name}</div>
                            <div className="text-[10px] text-[#89928E] capitalize">{u.role === 'admin' ? 'Admin / Team Leader' : 'Team Member'}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#146C4E]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* User Avatar Mini */}
          {user ? (
            <button
              onClick={onOpenAuth}
              className="relative p-0.5 rounded-full focus:outline-none focus:ring-2 focus:ring-[#146C4E]"
              title="Account & Upline Info"
            >
              <img
                src={user.profileImage}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-[#CBD6D1]"
              />
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1.5 bg-[#146C4E] text-white text-xs font-medium rounded-[10px]"
            >
              Sign In
            </button>
          )}
        </div>
      </header>
    </>
  );
};
