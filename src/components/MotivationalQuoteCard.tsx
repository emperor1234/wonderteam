import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { MotivationalQuoteData } from '../types/index.ts';
import { Sparkles, Sun, Sunset, Moon, Flame, RefreshCw, Quote } from 'lucide-react';

export const MotivationalQuoteCard: React.FC = () => {
  const { user } = useAuth();
  const [quoteData, setQuoteData] = useState<MotivationalQuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuote = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/ai/motivational-quote?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setQuoteData(data);
      }
    } catch (err) {
      console.error('Failed to load motivational quote:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [user]);

  if (!quoteData && !isLoading) return null;

  const getTimePeriodIcon = (period?: string) => {
    switch (period) {
      case 'morning':
        return <Sun className="w-4 h-4 text-[#B7791F]" />;
      case 'afternoon':
        return <Sun className="w-4 h-4 text-[#D97706]" />;
      case 'night':
        return <Sunset className="w-4 h-4 text-[#6366F1]" />;
      case '1am_midnight':
        return <Moon className="w-4 h-4 text-[#A855F7]" />;
      default:
        return <Flame className="w-4 h-4 text-[#146C4E]" />;
    }
  };

  const getPeriodBadge = (period?: string) => {
    switch (period) {
      case 'morning':
        return { label: '🌅 Morning Ignition (05:00 - 11:59)', bg: 'bg-[#FFF8E7] text-[#B7791F] border-[#FCE8B2]' };
      case 'afternoon':
        return { label: '☀️ Afternoon Momentum (12:00 - 17:59)', bg: 'bg-[#FFF3E0] text-[#D97706] border-[#FFCC80]' };
      case 'night':
        return { label: '🌙 Evening Reflection (18:00 - 23:59)', bg: 'bg-[#F0F2FF] text-[#4338CA] border-[#C7D2FE]' };
      case '1am_midnight':
        return { label: '⚡ 1:00 AM Midnight Visionary Hustle (00:00 - 04:59)', bg: 'bg-[#F8F0FF] text-[#7E22CE] border-[#E9D5FF]' };
      default:
        return { label: '🔥 Daily Mindset', bg: 'bg-[#E7F4EE] text-[#0F513B] border-[#CBD6D1]' };
    }
  };

  const badge = getPeriodBadge(quoteData?.timePeriod);

  return (
    <div className="relative overflow-hidden bg-white rounded-[18px] border border-[#CBD6D1] p-4 sm:p-5 shadow-xs transition-all">
      {/* Subtle background quote mark */}
      <Quote className="absolute -right-3 -bottom-3 w-28 h-28 text-[#F0F4F2] stroke-[1] pointer-events-none -z-0" />

      <div className="relative z-10 space-y-3">
        {/* Top period header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-bold border ${badge.bg}`}>
              {getTimePeriodIcon(quoteData?.timePeriod)}
              <span>{badge.label}</span>
            </span>
            {quoteData?.activityHighlight && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E7F4EE] text-[#0F513B]">
                {quoteData.activityHighlight}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={fetchQuote}
            disabled={isLoading}
            className="p-1.5 text-[#89928E] hover:text-[#146C4E] hover:bg-[#E7F4EE] rounded-[8px] transition-colors"
            title="Refresh motivational quote with Gemini AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#146C4E]' : ''}`} />
          </button>
        </div>

        {/* Quote text */}
        {isLoading && !quoteData ? (
          <div className="space-y-2 py-2">
            <div className="h-4 bg-[#E9EFEC] rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-[#E9EFEC] rounded w-1/2 animate-pulse"></div>
          </div>
        ) : (
          <div>
            <blockquote className="text-sm sm:text-base font-semibold text-[#17211D] leading-relaxed italic">
              "{quoteData?.quote}"
            </blockquote>
            <div className="mt-1.5 text-xs font-bold text-[#146C4E] flex items-center gap-1.5">
              <span>— {quoteData?.author}</span>
              <span className="text-[#CBD6D1]">·</span>
              <span className="text-[11px] text-[#5E6964] font-normal">Entrepreneur Guidance</span>
            </div>
          </div>
        )}

        {/* Personalized note based on app activity */}
        {quoteData?.personalizedNote && (
          <div className="pt-2.5 border-t border-[#E2E8E5] flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#146C4E] shrink-0 mt-0.5" />
            <p className="text-xs text-[#5E6964] leading-relaxed">
              <span className="font-semibold text-[#17211D]">Personalized Coach Note: </span>
              {quoteData.personalizedNote}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
