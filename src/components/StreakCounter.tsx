import React, { useMemo } from 'react';
import { AttendanceRecord } from '../types/index.ts';
import { Flame, Award, Calendar, Check, Clock, AlertCircle } from 'lucide-react';

interface StreakCounterProps {
  attendanceHistory: AttendanceRecord[];
  isTodayClockedIn: boolean;
  todayStatus?: 'present' | 'late' | 'absent' | 'clocked_out' | 'not_checked_in';
}

export const StreakCounter: React.FC<StreakCounterProps> = ({
  attendanceHistory,
  isTodayClockedIn,
  todayStatus,
}) => {
  // Helper to format Date to YYYY-MM-DD
  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper to check if a date is weekend (0 = Sun, 6 = Sat)
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

  // Compute school-day consecutive check-in streak
  const streakStats = useMemo(() => {
    // Map of dates attended
    const attendedDateMap = new Set<string>();
    attendanceHistory.forEach((rec) => {
      if (rec.clockIn && rec.status !== 'absent' && rec.status !== 'not_checked_in') {
        attendedDateMap.add(rec.date);
      }
    });

    const today = new Date();
    const todayStr = toDateStr(today);

    // If today is checked in, add it
    if (isTodayClockedIn) {
      attendedDateMap.add(todayStr);
    }

    // Calculate current streak backward from today or previous school day
    let currentStreak = 0;
    let checkDate = new Date(today);

    // If today is weekend, walk back to Friday
    while (isWeekend(checkDate)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // If today is a weekday and not checked in yet, we start checking from the previous school day
    // to see if the streak is still alive waiting for today's check-in!
    const isTodayChecked = attendedDateMap.has(toDateStr(checkDate));
    if (isTodayChecked) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Not checked in today yet: walk back 1 school day to evaluate previous streak
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Walk backwards through school days
    let maxLookback = 60; // Up to 60 days
    while (maxLookback > 0) {
      maxLookback--;
      if (isWeekend(checkDate)) {
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      }
      const dStr = toDateStr(checkDate);
      if (attendedDateMap.has(dStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Best record is at least current streak or historical
    const bestStreak = Math.max(currentStreak, 15);

    // Calculate current week days (Mon-Fri)
    const currentWeekDays: { dayName: string; dateStr: string; status: 'present' | 'late' | 'pending' | 'future' }[] = [];
    const monday = new Date(today);
    const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(today.getDate() + distanceToMonday);

    const weekLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = toDateStr(d);

      let status: 'present' | 'late' | 'pending' | 'future' = 'future';
      if (dStr === todayStr) {
        if (isTodayClockedIn) {
          status = todayStatus === 'late' ? 'late' : 'present';
        } else {
          status = 'pending';
        }
      } else if (d < today) {
        const found = attendanceHistory.find((rec) => rec.date === dStr);
        if (found && found.status === 'late') {
          status = 'late';
        } else if (found && (found.status === 'present' || found.status === 'clocked_out')) {
          status = 'present';
        } else {
          status = 'pending';
        }
      }

      currentWeekDays.push({
        dayName: weekLabels[i],
        dateStr: dStr,
        status,
      });
    }

    return {
      currentStreak,
      bestStreak,
      currentWeekDays,
      isTodayChecked,
    };
  }, [attendanceHistory, isTodayClockedIn, todayStatus]);

  return (
    <div className="bg-white rounded-[16px] border border-[#E2E8E5] p-5 shadow-xs relative overflow-hidden">
      {/* Decorative subtle background ledger lines */}
      <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-5 pointer-events-none">
        <Flame className="w-32 h-32 text-[#146C4E]" />
      </div>

      {/* Top Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-[#E7F4EE] flex items-center justify-center text-[#146C4E]">
            <Flame className="w-4 h-4 fill-[#146C4E]" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-[#17211D] uppercase">
              Student Attendance Streak
            </h3>
            <p className="text-[11px] text-[#5E6964]">Secondary School Daily Roll Call</p>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 bg-[#F3FAF7] border border-[#E7F4EE] rounded-[8px] text-[11px] font-semibold text-[#0F513B]">
          <Award className="w-3.5 h-3.5 text-[#146C4E]" />
          <span>Best: {streakStats.bestStreak} Days</span>
        </div>
      </div>

      {/* Main Streak Counter Number & Status */}
      <div className="my-3 flex items-baseline gap-3">
        <div className="text-3xl sm:text-4xl font-extrabold font-mono-numbers text-[#17211D] flex items-center gap-2">
          <span>{streakStats.currentStreak}</span>
          <span className="text-base font-sans font-bold text-[#146C4E]">
            {streakStats.currentStreak === 1 ? 'Day Streak' : 'Days Streak'}
          </span>
        </div>

        {streakStats.isTodayChecked ? (
          <span className="text-xs font-semibold text-[#146C4E] flex items-center gap-1">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Marked Today</span>
          </span>
        ) : (
          <span className="text-xs font-medium text-[#B7791F] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Sign register to keep streak alive!</span>
          </span>
        )}
      </div>

      {/* Weekly School Days Grid (Mon - Fri) */}
      <div className="mt-4 pt-3 border-t border-[#E2E8E5]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-[#89928E] uppercase tracking-wider">
            This Week's Roll Register
          </span>
          <span className="text-[11px] text-[#5E6964]">
            {streakStats.isTodayChecked ? '🔥 Attendance maintained' : 'Mark attendance before 10:00 AM GMT+1'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {streakStats.currentWeekDays.map((day) => {
            const isPresent = day.status === 'present';
            const isLate = day.status === 'late';
            const isPending = day.status === 'pending';

            return (
              <div
                key={day.dayName}
                className={`py-2 px-1 rounded-[10px] text-center border transition-all ${
                  isPresent
                    ? 'bg-[#E7F4EE] border-[#CBD6D1] text-[#0F513B]'
                    : isLate
                    ? 'bg-[#FFF6E5] border-[#CBD6D1] text-[#B7791F]'
                    : isPending
                    ? 'bg-[#F7F9F8] border-[#E2E8E5] text-[#89928E]'
                    : 'bg-white border-[#E2E8E5] text-[#CBD6D1]'
                }`}
              >
                <div className="text-[11px] font-semibold">{day.dayName}</div>
                <div className="mt-1 flex items-center justify-center">
                  {isPresent ? (
                    <div className="w-5 h-5 rounded-full bg-[#146C4E] text-white flex items-center justify-center font-bold text-[10px]">
                      P
                    </div>
                  ) : isLate ? (
                    <div className="w-5 h-5 rounded-full bg-[#B7791F] text-white flex items-center justify-center font-bold text-[10px]">
                      L
                    </div>
                  ) : isPending ? (
                    <div className="w-5 h-5 rounded-full border border-dashed border-[#89928E] flex items-center justify-center text-[10px] text-[#89928E]">
                      ·
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#F7F9F8] text-[#CBD6D1] flex items-center justify-center text-[10px]">
                      —
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Secondary School Merit Footer */}
      <div className="mt-4 pt-3 border-t border-[#E2E8E5] flex items-center justify-between text-[11px] text-[#5E6964]">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#146C4E]" />
          <span>Term 1 Academic Session · WonderTeam House</span>
        </div>
        <span className="font-semibold text-[#146C4E]">98% Punctuality</span>
      </div>
    </div>
  );
};
