import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { MotivationalQuoteData } from '../types/index.ts';
import { Sun, Moon, Sunset, Sparkles, RefreshCw, Quote } from 'lucide-react';

const FALLBACK_QUOTES: Record<string, { quote: string; author: string; note: string }> = {
  morning: {
    quote: "Either you run the day or the day runs you. Start with your most important activities.",
    author: "Jim Rohn",
    note: "This is your power window. Write your to-do list and prioritize your income-producing activities now.",
  },
  afternoon: {
    quote: "The fortune is in the follow-up. Keep your afternoon pipeline active.",
    author: "Eric Worre",
    note: "Check your open tasks and follow up with prospects before the day ends.",
  },
  night: {
    quote: "Review your day honestly. Did you move toward your goal with real action today?",
    author: "John C. Maxwell",
    note: "Reflect on today, prepare tomorrow's priorities, and rest well.",
  },
  '1am_midnight': {
    quote: "While the world sleeps, the visionaries are building their future.",
    author: "Napoleon Hill",
    note: "Use these quiet hours wisely. Your focus now compounds into freedom later.",
  },
};

function getClientTimePeriod(): 'morning' | 'afternoon' | 'night' | '1am_midnight' {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 5) return '1am_midnight';
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'night';
}

export const MotivationalQuoteCard: React.FC = () => {
  const { user } = useAuth();
  const [quoteData, setQuoteData] = useState<MotivationalQuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuote = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/motivational-quote?userId=${user.id}`);
      if (res.ok) {
        setQuoteData(await res.json());
      } else throw new Error('API error');
    } catch {
      const period = getClientTimePeriod();
      const fb = FALLBACK_QUOTES[period];
      const labels: Record<string, string> = {
        morning: 'Morning Ignition',
        afternoon: 'Afternoon Momentum',
        night: 'Evening Reflection',
        '1am_midnight': '1AM Midnight Drive',
      };
      setQuoteData({ quote: fb.quote, author: fb.author, timePeriod: period, timeTitle: labels[period], personalizedNote: fb.note });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchQuote(); }, [fetchQuote]);

  const getPeriodConfig = (period?: string) => {
    switch (period) {
      case 'morning': return { icon: <Sun className="w-3.5 h-3.5" />, badge: 'bg-[#FFF8E7] text-[#B7791F] border-[#FCE8B2]', accent: 'border-l-[#F59E0B]' };
      case 'afternoon': return { icon: <Sun className="w-3.5 h-3.5" />, badge: 'bg-[#FFF3E0] text-[#D97706] border-[#FFCC80]', accent: 'border-l-[#F97316]' };
      case 'night': return { icon: <Sunset className="w-3.5 h-3.5" />, badge: 'bg-[#F0F2FF] text-[#4338CA] border-[#C7D2FE]', accent: 'border-l-[#6366F1]' };
      case '1am_midnight': return { icon: <Moon className="w-3.5 h-3.5" />, badge: 'bg-[#F8F0FF] text-[#7E22CE] border-[#E9D5FF]', accent: 'border-l-[#A855F7]' };
      default: return { icon: <Sparkles className="w-3.5 h-3.5" />, badge: 'bg-[#E7F4EE] text-[#0F513B] border-[#CBD6D1]', accent: 'border-l-[#146C4E]' };
    }
  };

  if (!quoteData && !isLoading) return null;

  const config = getPeriodConfig(quoteData?.timePeriod);

  return (
    <div className={`relative overflow-hidden bg-white rounded-[18px] border border-[#CBD6D1] border-l-4 ${config.accent} p-4 sm:p-5 shadow-xs`}>
      <Quote className="absolute -right-3 -bottom-3 w-24 h-24 text-[#F0F4F2] stroke-[1] pointer-events-none" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-bold border ${config.badge}`}>
            {config.icon}
            <span>{quoteData?.timeTitle || 'Daily Mindset'}</span>
          </span>
          <button type="button" onClick={fetchQuote} disabled={isLoading}
            className="p-1.5 text-[#89928E] hover:text-[#146C4E] hover:bg-[#E7F4EE] rounded-[8px] transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#146C4E]' : ''}`} />
          </button>
        </div>
        {isLoading && !quoteData ? (
          <div className="space-y-2 py-1">
            <div className="h-4 bg-[#E9EFEC] rounded w-full animate-pulse" />
            <div className="h-4 bg-[#E9EFEC] rounded w-4/5 animate-pulse" />
          </div>
        ) : (
          <div>
            <blockquote className="text-sm sm:text-[15px] font-semibold text-[#17211D] leading-relaxed italic">
              "{quoteData?.quote}"
            </blockquote>
            <div className="mt-1.5 text-xs font-bold text-[#146C4E]">— {quoteData?.author}</div>
          </div>
        )}
        {quoteData?.personalizedNote && !isLoading && (
          <div className="pt-2.5 border-t border-[#E2E8E5] flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#146C4E] shrink-0 mt-0.5" />
            <p className="text-xs text-[#5E6964] leading-relaxed">
              <span className="font-semibold text-[#17211D]">Coach Note: </span>{quoteData.personalizedNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
