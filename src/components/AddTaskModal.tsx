import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, Plus, CheckCircle2 } from 'lucide-react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({ isOpen, onClose, onTaskCreated }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(''); // empty = today
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayStr = new Date().toISOString().substring(0, 10);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setError(null);
  };

  const saveTask = async (): Promise<boolean> => {
    if (!title.trim()) {
      setError('Please enter a task title.');
      return false;
    }
    if (!user) return false;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          assigneeId: user.id,
          type: 'personal',
          priority: 'medium',
          dueDate: dueDate || todayStr,
          dueTime: '05:00 PM',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Failed to save task.');
        return false;
      }
      onTaskCreated();
      return true;
    } catch {
      setError('Network error. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const ok = await saveTask();
    if (ok) {
      setSavedCount((prev) => prev + 1);
      resetForm();
    }
  };

  const handleSave = async () => {
    const ok = await saveTask();
    if (ok) {
      resetForm();
      onClose();
    }
  };

  const handleClose = () => {
    resetForm();
    setSavedCount(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-[20px] rounded-t-[20px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#E2E8E5]">
          <div>
            <h2 className="text-base font-bold text-[#17211D]">Add New Task</h2>
            {savedCount > 0 && (
              <p className="text-xs text-[#146C4E] font-semibold flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {savedCount} task{savedCount !== 1 ? 's' : ''} saved this session
              </p>
            )}
          </div>
          <button type="button" onClick={handleClose}
            className="p-1.5 rounded-[8px] text-[#5E6964] hover:bg-[#F7F9F8] hover:text-[#17211D] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto">
          {error && (
            <div className="p-3 bg-[#FFF0F0] border border-[#C84C4C]/30 rounded-[10px] text-xs text-[#C84C4C] font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#17211D]">
              What needs to get done? <span className="text-[#C84C4C]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveAndContinue(); } }}
              placeholder="e.g. Call 5 prospects, send proposal..."
              autoFocus
              className="w-full px-3.5 py-2.5 bg-[#F7F9F8] border border-[#CBD6D1] rounded-[10px] text-sm text-[#17211D] placeholder:text-[#89928E] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#17211D]">Notes <span className="text-[#89928E] font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any relevant notes..."
              rows={2}
              className="w-full px-3.5 py-2.5 bg-[#F7F9F8] border border-[#CBD6D1] rounded-[10px] text-sm text-[#17211D] placeholder:text-[#89928E] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#17211D]">Due Date <span className="text-[#89928E] font-normal">(defaults to today)</span></label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={todayStr}
              className="w-full px-3.5 py-2.5 bg-[#F7F9F8] border border-[#CBD6D1] rounded-[10px] text-sm text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
            />
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-5 pb-5 pt-3 border-t border-[#E2E8E5] flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSaveAndContinue}
            disabled={isSaving || !title.trim()}
            className="flex-1 py-2.5 bg-[#E7F4EE] hover:bg-[#D5EFE3] text-[#0F513B] text-sm font-bold rounded-[12px] border border-[#CBD6D1] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Save & Continue</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="flex-1 py-2.5 bg-[#146C4E] hover:bg-[#0F513B] text-white text-sm font-bold rounded-[12px] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isSaving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Saving...</span></>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /><span>Save</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
