import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { AttendanceRecord } from '../types/index.ts';
import { X, Clock } from 'lucide-react';

interface AttendanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttendanceHistoryModal: React.FC<AttendanceHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !user) return;
    setLoading(true);
    fetch(`/api/attendance/history?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => setHistory(data))
      .catch((err) => console.error('Failed to load attendance history', err))
      .finally(() => setLoading(false));
  }, [isOpen, user]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-[16px] border border-[#E2E8E5] shadow-xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E2E8E5] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#17211D]">Attendance History</h2>
            <p className="text-xs text-[#5E6964]">Verified shifts and presence records</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-[#89928E] hover:text-[#17211D] hover:bg-[#F7F9F8]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="space-y-2 py-4">
              <div className="h-14 bg-[#E9EFEC] rounded-[10px] animate-pulse"></div>
              <div className="h-14 bg-[#E9EFEC] rounded-[10px] animate-pulse"></div>
              <div className="h-14 bg-[#E9EFEC] rounded-[10px] animate-pulse"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="w-8 h-8 text-[#CBD6D1] mx-auto mb-2" />
              <p className="text-xs text-[#5E6964]">No shift history logged yet.</p>
            </div>
          ) : (
            history.map((rec) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-[12px] border border-[#E2E8E5] bg-[#F7F9F8] flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-semibold text-[#17211D]">
                    {new Date(rec.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-[#5E6964] mt-0.5 font-mono-numbers">
                    {rec.clockIn} → {rec.clockOut || 'Active'}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-bold font-mono-numbers text-[#146C4E]">
                    {rec.durationFormatted || '—'}
                  </div>
                  <span className="text-[11px] font-medium text-[#89928E] capitalize">
                    {rec.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E2E8E5] bg-[#F7F9F8] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#E2E8E5] text-xs font-medium text-[#17211D] rounded-[10px] hover:bg-[#E2E8E5]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
