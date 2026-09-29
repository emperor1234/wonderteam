import React from 'react';
import {
  Sparkles,
  Download,
  Flame,
  Target,
  Trophy,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Zap,
  Users,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface LandingPageProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  deferredPrompt?: any;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenRegister,
  onOpenLogin,
  deferredPrompt,
}) => {
  // Trigger automatic download + PWA prompt when user clicks "Create Account & Download"
  const handleCreateAccountWithDownload = async () => {
    // 1. If PWA install prompt is available, trigger it
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
      } catch (err) {
        console.log('PWA prompt error:', err);
      }
    }

    // 2. Trigger automatic download of the WonderTeam Web App shortcut package
    try {
      const manifestData = {
        name: 'WonderTeam',
        short_name: 'WonderTeam',
        description: 'Networking & Freelancing Daily Operations Hub',
        start_url: '/',
        display: 'standalone',
        theme_color: '#146C4E',
        background_color: '#F7F9F8',
        installedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(manifestData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'WonderTeam-App-Config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download error:', e);
    }

    // 3. Open Account Creation modal
    onOpenRegister();
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#17211D] flex flex-col selection:bg-[#E7F4EE] selection:text-[#0F513B]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E2E8E5] h-16 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[10px] bg-[#146C4E] flex items-center justify-center text-white font-bold text-sm shadow-xs">
            W
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-[#17211D]">
              WonderTeam
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E7F4EE] text-[#0F513B]">
              Networking & Freelancing
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenLogin}
            className="px-3.5 py-2 text-xs font-semibold text-[#5E6964] hover:text-[#17211D] transition-colors"
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={handleCreateAccountWithDownload}
            className="px-4 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] transition-all shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Join & Install</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="px-4 sm:px-8 pt-12 pb-16 max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E7F4EE] border border-[#CBD6D1] text-[#0F513B] text-xs font-semibold animate-in fade-in">
            <Sparkles className="w-3.5 h-3.5 text-[#146C4E]" />
            <span>The Daily Operating System for Freelancers & Networkers</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#17211D] leading-[1.15] max-w-3xl mx-auto">
            Scale your freelance income & team network with disciplined execution.
          </h1>

          <p className="text-sm sm:text-base text-[#5E6964] max-w-2xl mx-auto leading-relaxed">
            Eliminate procrastination with morning roll-call streaks, AI-prioritized Income Producing Activities (IPAs), gamified team leaderboards, and an integrated growth library with Google Books.
          </p>

          {/* Call to Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
              type="button"
              onClick={handleCreateAccountWithDownload}
              className="w-full sm:w-auto px-6 py-3.5 bg-[#146C4E] hover:bg-[#0F513B] text-white text-sm font-bold rounded-[12px] transition-all shadow-md flex items-center justify-center gap-2 group"
            >
              <Download className="w-4 h-4 text-[#A3E5CB]" />
              <span>Create Account & Install App</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onOpenLogin}
              className="w-full sm:w-auto px-5 py-3.5 bg-white border border-[#CBD6D1] hover:bg-[#F7F9F8] text-[#17211D] text-sm font-semibold rounded-[12px] transition-colors"
            >
              Existing Member Sign In
            </button>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[#5E6964]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#146C4E]" />
              PWA Instant Install
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#146C4E]" />
              Daily 09:30 AM Standups
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#146C4E]" />
              Gemini AI IPA Prioritizer
            </span>
          </div>
        </section>

        {/* 4 Feature Pillars Grid */}
        <section className="px-4 sm:px-8 py-12 bg-white border-y border-[#E2E8E5]">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">
                Designed for Ambitious Freelancers & Network Builders
              </h2>
              <p className="text-xs sm:text-sm text-[#5E6964] max-w-lg mx-auto">
                No fluffy motivational noise. Real tools built to build compounding consistency.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {/* Feature 1 */}
              <div className="p-6 bg-[#F7F9F8] rounded-[20px] border border-[#E2E8E5] space-y-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#E7F4EE] text-[#146C4E] flex items-center justify-center">
                  <Flame className="w-5 h-5 text-[#D97706]" />
                </div>
                <h3 className="text-base font-bold text-[#17211D]">
                  Daily 09:30 AM Attendance & Streaks
                </h3>
                <p className="text-xs text-[#5E6964] leading-relaxed">
                  Start your day on time. Check in between 09:30 AM and 10:00 AM WAT to lock in your daily streak and earn consistency verification.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 bg-[#F7F9F8] rounded-[20px] border border-[#E2E8E5] space-y-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#E7F4EE] text-[#146C4E] flex items-center justify-center">
                  <Target className="w-5 h-5 text-[#146C4E]" />
                </div>
                <h3 className="text-base font-bold text-[#17211D]">
                  Gemini AI: Income Producing Activities
                </h3>
                <p className="text-xs text-[#5E6964] leading-relaxed">
                  Cut through busywork. Gemini AI analyzes your daily to-dos and rearranges them so client proposals, outreach, and contracts get executed first.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 bg-[#F7F9F8] rounded-[20px] border border-[#E2E8E5] space-y-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#E7F4EE] text-[#146C4E] flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-[#D97706]" />
                </div>
                <h3 className="text-base font-bold text-[#17211D]">
                  Gamified Team Leaderboards
                </h3>
                <p className="text-xs text-[#5E6964] leading-relaxed">
                  Track member streaks and task completion rates to gamify collective growth with Growth XP, podium standings, and achievement badges.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 bg-[#F7F9F8] rounded-[20px] border border-[#E2E8E5] space-y-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#E7F4EE] text-[#146C4E] flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[#146C4E]" />
                </div>
                <h3 className="text-base font-bold text-[#17211D]">
                  21 Growth Disciplines & Google Books
                </h3>
                <p className="text-xs text-[#5E6964] leading-relaxed">
                  Sharpen your mind with curated classics in leadership, sales, and focus. Read inside the app with Google Embedded Books and look up terms in the integrated dictionary.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Motivational Time Slot Callout */}
        <section className="px-4 sm:px-8 py-12 max-w-4xl mx-auto">
          <div className="p-6 sm:p-8 bg-linear-to-r from-[#0F513B] to-[#146C4E] text-white rounded-[24px] shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[#A3E5CB] text-[11px] font-semibold">
                <Zap className="w-3.5 h-3.5" />
                <span>Personalized Daily Mentorship</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                Inspiration when you need it: Morning, Afternoon, Night & 1:00 AM Midnight
              </h3>
              <p className="text-xs text-white/80 max-w-lg leading-relaxed">
                Adaptive quotes and personal coaching notes calculated live based on your actual streaks, pending tasks, and time of day.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateAccountWithDownload}
              className="shrink-0 px-6 py-3.5 bg-white text-[#0F513B] hover:bg-[#E7F4EE] text-xs font-bold rounded-[12px] transition-all shadow-md flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-[#146C4E]" />
              <span>Get Started Now</span>
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8E5] py-8 px-4 text-center text-xs text-[#5E6964]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-[6px] bg-[#146C4E] flex items-center justify-center text-white font-bold text-[10px]">
            W
          </div>
          <span className="font-bold text-[#17211D]">WonderTeam Hub</span>
        </div>
        <p>Built for freelancers and networkers collaborating together. All rights reserved.</p>
      </footer>
    </div>
  );
};
