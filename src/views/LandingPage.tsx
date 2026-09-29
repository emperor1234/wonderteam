import React from 'react';
import { Download, Flame, Target, Trophy, BookOpen, ArrowRight, CheckCircle2, Zap, Users } from 'lucide-react';

interface LandingPageProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  deferredPrompt?: any;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenRegister, onOpenLogin, deferredPrompt }) => {
  const handleJoin = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
      } catch (err) {
        console.log('PWA install prompt:', err);
      }
    }
    onOpenRegister();
  };

  const features = [
    { icon: <Flame className="w-5 h-5 text-[#D97706]" />, title: 'Daily Roll-Call Streaks', desc: 'Check in between 9:30–10:00 AM WAT. Build consistency that shows up on the team leaderboard.' },
    { icon: <Target className="w-5 h-5 text-[#146C4E]" />, title: 'AI-Prioritized Tasks', desc: 'Gemini AI ranks your daily to-dos so client proposals, outreach, and deals get executed first.' },
    { icon: <Trophy className="w-5 h-5 text-[#D97706]" />, title: 'Team Leaderboard', desc: 'Earn XP and badges based on streaks and completion rates. See where you stand.' },
    { icon: <BookOpen className="w-5 h-5 text-[#146C4E]" />, title: 'Growth Reading Library', desc: 'Search and read books on entrepreneurship, sales, and mindset—right inside the app.' },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9F8] text-[#17211D] flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#E2E8E5] h-14 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-[#146C4E] flex items-center justify-center text-white font-bold text-xs">W</div>
          <span className="font-bold text-sm tracking-tight">WonderTeam</span>
          <span className="hidden sm:block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E7F4EE] text-[#0F513B]">Networking & Freelancing</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenLogin} className="px-3 py-1.5 text-xs font-semibold text-[#5E6964] hover:text-[#17211D] transition-colors">Sign In</button>
          <button type="button" onClick={handleJoin} className="px-4 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] transition-all flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5" /><span>Get Started</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-4 sm:px-8 pt-16 pb-20 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#E7F4EE] border border-[#CBD6D1] text-[#0F513B] text-xs font-semibold mb-6">
            <Zap className="w-3.5 h-3.5" /><span>Your Daily Operating System</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#17211D] leading-[1.15] mb-5">
            Build income and team<br className="hidden sm:block" /> networks with daily discipline.
          </h1>
          <p className="text-sm sm:text-base text-[#5E6964] max-w-xl leading-relaxed mb-8">
            WonderTeam keeps your team aligned with morning standups, AI-ranked tasks, gamified leaderboards, and a curated growth library.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-sm">
            <button type="button" onClick={handleJoin}
              className="flex-1 px-6 py-3.5 bg-[#146C4E] hover:bg-[#0F513B] text-white text-sm font-bold rounded-[12px] transition-all shadow-md flex items-center justify-center gap-2 group">
              <Download className="w-4 h-4 text-[#A3E5CB]" />
              <span>Create Account & Install</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button type="button" onClick={onOpenLogin}
              className="flex-1 px-5 py-3.5 bg-white border border-[#CBD6D1] hover:bg-[#F7F9F8] text-[#17211D] text-sm font-semibold rounded-[12px] transition-colors text-center">
              Sign In
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-[#5E6964]">
            {['PWA Instant Install', 'Daily 09:30 AM Standups', 'AI Task Prioritizer'].map((item) => (
              <span key={item} className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-[#146C4E]" />{item}</span>
            ))}
          </div>
        </section>

        <section className="px-4 sm:px-8 py-16 bg-white border-y border-[#E2E8E5]">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D] mb-2">Everything your team needs to execute</h2>
              <p className="text-sm text-[#5E6964]">No noise. Just tools that build real compounding results.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f) => (
                <div key={f.title} className="p-5 bg-[#F7F9F8] rounded-[18px] border border-[#E2E8E5] space-y-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-white border border-[#E2E8E5] flex items-center justify-center shadow-xs">{f.icon}</div>
                  <h3 className="text-sm font-bold text-[#17211D]">{f.title}</h3>
                  <p className="text-xs text-[#5E6964] leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-8 py-14">
          <div className="max-w-4xl mx-auto">
            <div className="p-6 sm:p-8 bg-[#0F513B] text-white rounded-[22px] shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-[#A3E5CB] text-[11px] font-semibold">
                  <Users className="w-3.5 h-3.5" /><span>For Networkers & Freelancers</span>
                </div>
                <h3 className="text-xl font-bold">Start building your best habits today.</h3>
                <p className="text-xs text-white/75 max-w-md">Morning quotes, attendance streaks, AI task prioritization — for people serious about growth.</p>
              </div>
              <button type="button" onClick={handleJoin}
                className="shrink-0 px-6 py-3 bg-white text-[#0F513B] hover:bg-[#E7F4EE] text-xs font-bold rounded-[12px] transition-all shadow-md flex items-center gap-1.5">
                <Download className="w-4 h-4 text-[#146C4E]" /><span>Join & Install</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E2E8E5] py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1.5">
          <div className="w-5 h-5 rounded-[6px] bg-[#146C4E] flex items-center justify-center text-white font-bold text-[10px]">W</div>
          <span className="font-bold text-sm text-[#17211D]">WonderTeam</span>
        </div>
        <p className="text-xs text-[#5E6964]">Built for networkers and freelancers growing together.</p>
      </footer>
    </div>
  );
};
