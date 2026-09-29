import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { X, Check, Plus, Loader2 } from 'lucide-react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  defaultType?: 'personal' | 'assigned';
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAddedCount(0);
      setError(null);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const saveTask = async (taskTitle: string): Promise<boolean> => {
    if (!taskTitle.trim() || !user) return false;

    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(),
          description: '',
          assigneeId: user.id,
          type: 'personal',
          priority: 'medium',
          dueDate: new Date().toISOString().substring(0, 10),
          dueTime: '05:00 PM',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save task');
      }

      onTaskCreated();
      return true;
    } catch (err: any) {
      setError(err.message || 'Error saving task');
      return false;
    }
  };

  // 1. "Save and Continue" - saves immediately, resets input, stays open for next task
  const handleSaveAndContinue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError('Please type a task title first');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const success = await saveTask(title);
    setIsSubmitting(false);

    if (success) {
      setTitle('');
      setAddedCount((prev) => prev + 1);
      inputRef.current?.focus();
    }
  };

  // 2. "Save" - saves current task if entered and automatically closes modal
  const handleSaveAndClose = async () => {
    if (!title.trim()) {
      // If user already added one or more tasks with Save and Continue, close cleanly
      if (addedCount > 0) {
        onClose();
      } else {
        setError('Please enter a task title');
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const success = await saveTask(title);
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-md rounded-t-[20px] sm:rounded-[18px] border border-[#E2E8E5] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8E5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-[#17211D]">Add New Task</h2>
            {addedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#E7F4EE] text-[#0F513B]">
                {addedCount} added
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#89928E] hover:text-[#17211D] hover:bg-[#F7F9F8] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveAndContinue} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 bg-[#FFF0F0] text-[#C84C4C] rounded-[10px] text-xs font-medium border border-[#FCDAD7]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#5E6964] mb-1.5">
              Task Title
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              placeholder="e.g., Follow up on freelance proposal, reach out to 3 team members..."
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              className="w-full h-11 px-3.5 bg-white border border-[#CBD6D1] rounded-[10px] text-sm text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E] placeholder:text-[#89928E] transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
            {/* Save and Continue */}
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="w-full sm:flex-1 h-10 bg-[#F7F9F8] hover:bg-[#E7F4EE] hover:text-[#0F513B] disabled:opacity-50 text-[#17211D] border border-[#CBD6D1] text-xs font-bold rounded-[10px] transition-colors flex items-center justify-center gap-1.5 active:scale-98"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-[#146C4E]" />
              )}
              <span>Save and Continue</span>
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={handleSaveAndClose}
              disabled={isSubmitting || (!title.trim() && addedCount === 0)}
              className="w-full sm:flex-1 h-10 bg-[#146C4E] hover:bg-[#0F513B] disabled:opacity-50 text-white text-xs font-bold rounded-[10px] transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
