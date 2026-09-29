import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { MemberSpendingData } from '../types/index.ts';
import { AddSpendingModal } from '../components/AddSpendingModal.tsx';
import { Plus, Receipt, ShieldCheck } from 'lucide-react';

export const MemberSpending: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<MemberSpendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchSpending = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/spending?userId=${user.id}&role=${user.role}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch spending:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpending();
  }, [user]);

  const spent = data?.totalSpentThisMonth || 0;
  const budget = data?.monthlyBudget || 250000;
  const progressPercent = Math.min(100, Math.round((spent / budget) * 100));

  // Category breakdown for subtle single visualization
  const categoryTotals: Record<string, number> = {};
  data?.transactions.forEach((tx) => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17211D]">Spending</h1>
          <p className="text-xs text-[#5E6964]">Confidential field and operations expenses</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[10px] shadow-2xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Expense</span>
        </button>
      </div>

      {/* Strict Privacy Callout */}
      <div className="px-3.5 py-2.5 bg-[#F3FAF7] border border-[#E7F4EE] rounded-[12px] flex items-center gap-2 text-xs text-[#0F513B]">
        <ShieldCheck className="w-4 h-4 shrink-0 text-[#146C4E]" />
        <span>Confidential: Financial data is private and hidden from team leaders and administrators.</span>
      </div>

      {/* Main Balance & Budget Summary */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs">
        <div className="text-xs text-[#5E6964] font-medium mb-1">Spent this month (September 2026)</div>
        <div className="text-3xl font-bold font-mono-numbers text-[#17211D] tracking-tight">
          ₦{spent.toLocaleString()}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[#5E6964] mb-1.5">
            <span>
              <span className="font-semibold text-[#17211D] font-mono-numbers">₦{spent.toLocaleString()}</span> of ₦{budget.toLocaleString()} budget
            </span>
            <span className="font-semibold font-mono-numbers text-[#146C4E]">{progressPercent}%</span>
          </div>

          {/* Horizontal Progress Bar */}
          <div className="w-full h-2.5 bg-[#F7F9F8] border border-[#E2E8E5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#146C4E] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Compact Category Distribution Bar */}
        {Object.keys(categoryTotals).length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#E2E8E5]">
            <div className="text-[11px] font-semibold text-[#89928E] uppercase tracking-wider mb-2">
              Top Categories
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryTotals).slice(0, 4).map(([cat, total]) => (
                <div
                  key={cat}
                  className="px-2.5 py-1 bg-[#F7F9F8] border border-[#E2E8E5] rounded-[8px] text-[11px] text-[#5E6964] flex items-center gap-1.5"
                >
                  <span className="font-medium text-[#17211D]">{cat}</span>
                  <span className="text-[#CBD6D1]">·</span>
                  <span className="font-mono-numbers font-semibold text-[#0F513B]">
                    ₦{total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Transaction Records List */}
      <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-[#17211D] mb-3">Recent Transactions</h2>

        {loading ? (
          <div className="space-y-2 py-4">
            <div className="h-12 bg-[#E9EFEC] rounded-[10px] animate-pulse"></div>
            <div className="h-12 bg-[#E9EFEC] rounded-[10px] animate-pulse"></div>
          </div>
        ) : !data?.transactions || data.transactions.length === 0 ? (
          <div className="text-center py-8 bg-[#F7F9F8] rounded-[12px] border border-dashed border-[#E2E8E5]">
            <Receipt className="w-6 h-6 text-[#CBD6D1] mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-[#17211D]">No expenses recorded yet</p>
            <p className="text-[11px] text-[#5E6964] mt-0.5">Keep track of receipts and transport claims.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8E5]">
            {data.transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#17211D] truncate">
                      {tx.merchant}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-[6px] bg-[#F7F9F8] border border-[#E2E8E5] text-[#5E6964]">
                      {tx.category}
                    </span>
                  </div>
                  {tx.description && (
                    <p className="text-[11px] text-[#5E6964] mt-0.5 line-clamp-1">
                      {tx.description}
                    </p>
                  )}
                  <div className="text-[10px] text-[#89928E] mt-1 flex items-center gap-2">
                    <span>
                      {new Date(tx.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {tx.receipt && (
                      <>
                        <span className="text-[#CBD6D1]">·</span>
                        <span className="font-mono-numbers">Ref: {tx.receipt}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold font-mono-numbers text-[#17211D]">
                    ₦{tx.amount.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddSpendingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSpendingAdded={fetchSpending}
      />
    </div>
  );
};
