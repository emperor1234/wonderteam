import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X } from 'lucide-react';

interface AddSpendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpendingAdded: () => void;
}

const CATEGORIES = [
  'Transport',
  'Meals & Food',
  'Supplies & Equipment',
  'Client Meeting',
  'Airtime & Data',
  'Logistics',
  'Other',
];

export const AddSpendingModal: React.FC<AddSpendingModalProps> = ({
  isOpen,
  onClose,
  onSpendingAdded,
}) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [receipt, setReceipt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !merchant) {
      setError('Please provide both amount and merchant name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/spending/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          role: user?.role,
          amount: parseFloat(amount),
          category,
          merchant: merchant.trim(),
          description: description.trim(),
          date,
          receipt: receipt.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add spending');
      }

      onSpendingAdded();
      onClose();
      setAmount('');
      setMerchant('');
      setDescription('');
      setReceipt('');
    } catch (err: any) {
      setError(err.message || 'Error saving spending');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-[16px] border border-[#E2E8E5] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#E2E8E5] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#17211D]">Record Spending</h2>
            <p className="text-xs text-[#5E6964]">Confidential personal operational expense</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#89928E] hover:text-[#17211D] hover:bg-[#F7F9F8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-[#FFF0F0] text-[#C84C4C] rounded-[10px] text-xs">
              {error}
            </div>
          )}

          {/* Amount in ₦ */}
          <div>
            <label className="block text-xs font-semibold text-[#5E6964] mb-1">
              Amount (₦ Naira) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#146C4E]">
                ₦
              </span>
              <input
                type="number"
                step="50"
                min="0"
                required
                placeholder="8,500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 pl-8 pr-3 bg-white border border-[#CBD6D1] rounded-[10px] text-sm font-semibold font-mono-numbers text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-[#5E6964] mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Merchant */}
          <div>
            <label className="block text-xs font-semibold text-[#5E6964] mb-1">
              Merchant / Payee *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Uber, MTN Data, Local Logistics"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#5E6964] mb-1">
              Description / Operational Purpose
            </label>
            <input
              type="text"
              placeholder="e.g. Transit to distribution hub"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-11 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
            />
          </div>

          {/* Date & Optional Receipt Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs font-mono-numbers text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                Receipt Ref (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. REC-8921"
                value={receipt}
                onChange={(e) => setReceipt(e.target.value)}
                className="w-full h-11 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#E2E8E5]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 border border-[#E2E8E5] text-xs font-medium text-[#5E6964] rounded-[10px] hover:bg-[#F7F9F8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 h-10 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[10px] transition-colors"
            >
              {isSubmitting ? 'Saving...' : 'Save Spending'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
