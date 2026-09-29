/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { AdminSidebar } from './components/AdminSidebar.tsx';
import { AuthModal } from './components/AuthModal.tsx';

// Member Views
import { MemberHome } from './views/MemberHome.tsx';
import { MemberLibrary } from './views/MemberLibrary.tsx';
import { MemberTasks } from './views/MemberTasks.tsx';
import { MemberSpending } from './views/MemberSpending.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { LandingPage } from './views/LandingPage.tsx';

// Admin Views
import { AdminOverview } from './views/AdminOverview.tsx';
import { AdminAttendance } from './views/AdminAttendance.tsx';
import { AdminLeaderboard } from './views/AdminLeaderboard.tsx';
import { AdminTasks } from './views/AdminTasks.tsx';
import { AdminTeam } from './views/AdminTeam.tsx';

function MainAppShell() {
  const { user, isLoading } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Navigation tab states
  // Member tabs: 'home' | 'tasks' | 'spending' | 'profile' | 'landing'
  // Admin tabs: 'overview' | 'attendance' | 'leaderboard' | 'library' | 'tasks' | 'team'
  const [memberTab, setMemberTab] = useState<string>('home');
  const [adminTab, setAdminTab] = useState<string>('overview');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Capture PWA prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Register PWA service worker if available in browser
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration note:', err);
      });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[#F7F9F8] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-[10px] bg-[#146C4E] text-white flex items-center justify-center font-bold text-lg mx-auto shadow-xs animate-pulse">
            W
          </div>
          <div className="text-xs font-semibold text-[#5E6964]">Loading WonderTeam Hub...</div>
        </div>
      </div>
    );
  }

  // If user is not logged in, show the full Landing Page with automatic download
  if (!user || memberTab === 'landing') {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-[#F7F9F8] text-[#17211D]">
        <LandingPage
          onOpenRegister={() => setIsAuthModalOpen(true)}
          onOpenLogin={() => setIsAuthModalOpen(true)}
          deferredPrompt={deferredPrompt}
        />
        {user && (
          <div className="fixed bottom-4 right-4 z-50">
            <button
              type="button"
              onClick={() => setMemberTab('home')}
              className="px-4 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] shadow-lg transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        )}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => {
            setIsAuthModalOpen(false);
            if (memberTab === 'landing') setMemberTab('home');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#F7F9F8] text-[#17211D]">
      {/* Top Application Header */}
      <Navbar
        onOpenAuth={() => setIsAuthModalOpen(true)}
        currentTab={isAdmin ? adminTab : memberTab}
        onSelectTab={(tab) => {
          if (isAdmin) setAdminTab(tab);
          else setMemberTab(tab);
        }}
        isAdmin={isAdmin}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sidebar (Only for Admin) */}
        {isAdmin && (
          <AdminSidebar currentTab={adminTab} onSelectTab={setAdminTab} />
        )}

        {/* Content Area */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {isAdmin ? (
            // ADMIN SCREENS (Strictly no finance/spending)
            <div>
              {adminTab === 'overview' && (
                <AdminOverview
                  onNavigateToAttendance={() => setAdminTab('attendance')}
                  onNavigateToTasks={() => setAdminTab('tasks')}
                  onNavigateToLeaderboard={() => setAdminTab('leaderboard')}
                />
              )}
              {adminTab === 'attendance' && <AdminAttendance />}
              {adminTab === 'leaderboard' && <AdminLeaderboard />}
              {adminTab === 'library' && <MemberLibrary />}
              {adminTab === 'tasks' && <AdminTasks />}
              {adminTab === 'team' && <AdminTeam />}
            </div>
          ) : (
            // MEMBER SCREENS
            <div>
              {memberTab === 'home' && (
                <MemberHome
                  onNavigateToTasks={() => setMemberTab('tasks')}
                  onNavigateToLibrary={() => setMemberTab('library')}
                  onNavigateToSpending={() => setMemberTab('spending')}
                />
              )}
              {memberTab === 'library' && <MemberLibrary />}
              {memberTab === 'tasks' && <MemberTasks />}
              {memberTab === 'spending' && <MemberSpending />}
              {memberTab === 'profile' && (
                <ProfileView onOpenAuth={() => setIsAuthModalOpen(true)} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={isAdmin ? adminTab : memberTab}
        onSelectTab={(tab) => {
          if (isAdmin) setAdminTab(tab);
          else setMemberTab(tab);
        }}
      />

      {/* Authentication Modal with Sponsor, Director, World Team Leader & Image */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  );
}
