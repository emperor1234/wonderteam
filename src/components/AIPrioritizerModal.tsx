import React, { useState } from 'react';
import { TaskItem, IPAPrioritizeResponse } from '../types/index.ts';
import { Sparkles, CheckCircle2, AlertCircle, ArrowUpDown, X, Zap, Target, TrendingUp, HelpCircle } from 'lucide-react';

interface AIPrioritizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  userId?: string;
  onPrioritiesApplied: () => void;
}

export const AIPrioritizerModal: React.FC<AIPrioritizerModalProps> = ({
  isOpen,
  onClose,
  tasks,
  userId,
  onPrioritiesApplied,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<IPAPrioritizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleRunPrioritization = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/prioritize-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          tasks,
          saveToDb: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to prioritize tasks');
      }

      const data: IPAPrioritizeResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error communicating with Gemini AI');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyToDb = async () => {
    if (!result || !userId) return;
    setIsApplying(true);
    try {
      const res = await fetch('/api/ai/prioritize-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          tasks: result.prioritizedTasks,
          saveToDb: true,
        }),
      });

      if (res.ok) {
        onPrioritiesApplied();
        onClose();
      }
    } catch (err: any) {
      console.error('Failed to apply priorities to DB:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'prospecting':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F4EE] text-[#0F513B] border border-[#CBD6D1]">📞 Prospecting (IPA)</span>;
      case 'inviting':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F4EE] text-[#0F513B] border border-[#CBD6D1]">📩 Inviting (IPA)</span>;
      case 'presentation':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F4EE] text-[#0F513B] border border-[#CBD6D1]">💼 Presentation (IPA)</span>;
      case 'closing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F4EE] text-[#0F513B] border border-[#CBD6D1]">🤝 Closing / Sign-Up (IPA)</span>;
      case 'retailing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E7F4EE] text-[#0F513B] border border-[#CBD6D1]">📦 Retail Order / PV (IPA)</span>;
      case 'followup':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF6E5] text-[#B7791F] border border-[#CBD6D1]">🔄 Follow-Up</span>;
      case 'team_training':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0F4FF] text-[#2B6CB0] border border-[#CBD6D1]">👥 Team Duplication</span>;
      case 'mindset_reading':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F7F9F8] text-[#5E6964] border border-[#E2E8E5]">📖 Growth Reading</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F7F9F8] text-[#5E6964] border border-[#E2E8E5]">General Task</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl max-h-[90vh] rounded-[20px] border border-[#CBD6D1] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-linear-to-r from-[#0F513B] to-[#146C4E] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-white/15 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-[#A3E5CB]" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Gemini AI IPA Prioritizer</h2>
              <p className="text-xs text-[#A3E5CB]">Networking & Freelancing · Income Producing Activities Optimizer</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-[#FFF0F0] text-[#C84C4C] rounded-[12px] flex items-center gap-2 border border-[#C84C4C]/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!result && !isLoading && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F7F9F8] rounded-[14px] border border-[#E2E8E5] space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-[#17211D]">
                  <Target className="w-4 h-4 text-[#146C4E]" />
                  <span>The Entrepreneur Income Producing Principle</span>
                </div>
                <p className="text-xs text-[#5E6964] leading-relaxed">
                  In high-performance freelancing and networking, 80% of results come from <strong>Income Producing Activities (IPAs)</strong>: Client Outreach, Proposals, Project Deliveries, Follow-Ups, and Closing deals.
                </p>
                <p className="text-xs text-[#5E6964] leading-relaxed">
                  Gemini AI analyzes your to-dos, detects direct revenue drivers, rearranges tasks in maximum impact order, and flags non-IPAs that should be scheduled for later hours.
                </p>
              </div>

              <div className="border border-[#E2E8E5] rounded-[12px] p-3 divide-y divide-[#E2E8E5]">
                <div className="text-[11px] font-bold text-[#17211D] uppercase tracking-wider mb-2">
                  Tasks Ready for AI Optimization ({tasks.length})
                </div>
                {tasks.slice(0, 5).map((t, idx) => (
                  <div key={t.id} className="py-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#17211D] truncate mr-2">
                      {idx + 1}. {t.title}
                    </span>
                    <span className="text-[10px] text-[#5E6964] capitalize shrink-0 px-2 py-0.5 bg-[#F7F9F8] rounded">
                      {t.priority} Priority
                    </span>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <div className="pt-2 text-[11px] text-[#89928E] text-center">
                    + {tasks.length - 5} more tasks
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleRunPrioritization}
                disabled={tasks.length === 0}
                className="w-full py-3 bg-[#146C4E] hover:bg-[#0F513B] disabled:opacity-50 text-white text-xs font-bold rounded-[12px] transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#A3E5CB]" />
                <span>Optimize Tasks with Gemini AI</span>
              </button>
            </div>
          )}

          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-10 h-10 border-3 border-[#CBD6D1] border-t-[#146C4E] rounded-full animate-spin"></div>
              <div className="text-sm font-bold text-[#17211D]">Analyzing Income Producing Activities...</div>
              <p className="text-xs text-[#5E6964] max-w-sm">
                Gemini is evaluating your daily goals against high-converting prospecting, presentation, and sales standards.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Score card */}
              <div className="p-4 bg-linear-to-r from-[#E7F4EE] to-[#F7F9F8] border border-[#146C4E]/20 rounded-[14px] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#146C4E] flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>IPA Business Score</span>
                  </div>
                  <div className="text-xl font-black text-[#0F513B] mt-0.5">
                    {result.ipaScore}% Direct Revenue Focus
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-[#5E6964]">
                    {result.prioritizedTasks.filter((t) => t.isIPA).length} of {result.prioritizedTasks.length} are IPAs
                  </span>
                </div>
              </div>

              {/* Coaching summary */}
              <div className="p-3.5 bg-white border border-[#CBD6D1] rounded-[14px] shadow-2xs space-y-1.5">
                <div className="text-[11px] font-bold text-[#17211D] uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#B7791F]" />
                  <span>Strategic Coach Takeaway</span>
                </div>
                <p className="text-xs text-[#17211D] leading-relaxed">
                  {result.summaryTip}
                </p>
                <p className="text-[11px] text-[#5E6964] leading-relaxed italic pt-1 border-t border-[#E2E8E5]">
                  "{result.analysis}"
                </p>
              </div>

              {/* Prioritized Tasks List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#17211D] uppercase tracking-wider">
                    Recommended Execution Order
                  </span>
                  <span className="text-[11px] text-[#5E6964]">Ordered by business impact</span>
                </div>

                <div className="space-y-2">
                  {result.prioritizedTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className={`p-3 rounded-[12px] border transition-all ${
                        task.priority === 'high'
                          ? 'bg-[#E7F4EE]/40 border-[#146C4E]/30'
                          : task.priority === 'medium'
                          ? 'bg-white border-[#E2E8E5]'
                          : 'bg-[#F7F9F8] border-[#E2E8E5]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#146C4E] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-xs text-[#17211D] leading-tight">
                              {task.title}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {getCategoryBadge(task.ipaCategory)}
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  task.priority === 'high'
                                    ? 'bg-[#C84C4C] text-white'
                                    : task.priority === 'medium'
                                    ? 'bg-[#B7791F] text-white'
                                    : 'bg-[#89928E] text-white'
                                }`}
                              >
                                {task.priority} Priority
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {task.aiPriorityReason && (
                        <p className="mt-2 text-[11px] text-[#5E6964] bg-white/80 p-2 rounded-[8px] border border-[#CBD6D1]/50 leading-relaxed">
                          💡 {task.aiPriorityReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3.5 bg-[#F7F9F8] border-t border-[#E2E8E5] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[#CBD6D1] bg-white hover:bg-[#E9EFEC] text-[#17211D] text-xs font-semibold rounded-[10px] transition-colors"
          >
            Cancel
          </button>

          {result ? (
            <button
              type="button"
              onClick={handleApplyToDb}
              disabled={isApplying}
              className="px-4 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] transition-all shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#A3E5CB]" />
              <span>{isApplying ? 'Applying...' : 'Apply Priorities to My To-Dos'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunPrioritization}
              disabled={isLoading || tasks.length === 0}
              className="px-4 py-2 bg-[#146C4E] hover:bg-[#0F513B] disabled:opacity-50 text-white text-xs font-bold rounded-[10px] transition-all shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#A3E5CB]" />
              <span>Prioritize Now</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
