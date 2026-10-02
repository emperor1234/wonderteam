import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useChat } from '../context/ChatContext.tsx';
import { NotificationBell } from './NotificationBell.tsx';
import { Download, WifiOff, Home, BookOpen, CheckSquare, Receipt, User as UserIcon, LogOut, MessageCircle } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  currentTab?: string;
  onSelectTab?: (tab: string) => void;
  isAdmin?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, currentTab, onSelectTab, isAdmin }) => {
  const { user, isOffline, logout } = useAuth();
  const { enabled, totalUnread } = useChat();
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
    ...(enabled
      ? [{ id: 'messages', label: 'Messages', icon: MessageCircle, badge: totalUnread }]
      : []),
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
                  {'badge' in item && (item.badge ?? 0) > 0 && (
                    <span className="min-w-[16px] h-4 px-1 rounded-full bg-[#C84C4C] text-white text-[9px] font-bold flex items-center justify-center">
                      {item.badge! > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {user && <NotificationBell />}

          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#146C4E] bg-[#E7F4EE] hover:bg-[#d8ece2] rounded-[8px] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* User Account Menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="inline-flex items-center gap-2 p-1.5 hover:bg-[#F7F9F8] text-[#17211D] text-xs font-medium rounded-[10px] border border-[#E2E8E5] transition-all"
              >
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-[#CBD6D1]"
                />
                <span className="font-semibold text-xs hidden sm:inline truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-[10px] text-[#5E6964] hidden md:inline">
                  ({user.role === 'admin' ? 'Leader' : 'Member'})
                </span>
              </button>

              {showSwitchMenu && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-[14px] border border-[#E2E8E5] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-[#E2E8E5]">
                    <div className="font-bold text-xs text-[#17211D] truncate">{user.name}</div>
                    <div className="text-[11px] text-[#5E6964] truncate">{user.email}</div>
                    <div className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E7F4EE] text-[#0F513B] uppercase tracking-wider">
                      {user.role === 'admin' ? 'Field Administrator' : 'Network Member'}
                    </div>
                  </div>

                  <div className="py-1">
                    {onSelectTab && (
                      <button
                        onClick={() => {
                          setShowSwitchMenu(false);
                          onSelectTab('profile');
                        }}
                        className="w-full px-4 py-2 text-left text-xs text-[#17211D] hover:bg-[#F7F9F8] flex items-center gap-2 font-medium transition-colors"
                      >
                        <UserIcon className="w-3.5 h-3.5 text-[#5E6964]" />
                        <span>My Profile & Hierarchy</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowSwitchMenu(false);
                        onOpenAuth();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-[#17211D] hover:bg-[#F7F9F8] flex items-center gap-2 font-medium transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#5E6964]" />
                      <span>Account Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-[#E2E8E5] pt-1">
                    <button
                      onClick={() => {
                        setShowSwitchMenu(false);
                        logout();
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-[#C84C4C] hover:bg-[#FFF0F0] flex items-center gap-2 font-semibold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] shadow-2xs transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>
    </>
  );
};
