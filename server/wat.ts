export type WATPeriod = 'morning' | 'afternoon' | 'night' | '1am_midnight';

export interface GMT1Info {
  h: number;
  m: number;
  totalMin: number;
  timeStr: string;
  isBefore930: boolean;
  isPast1000: boolean;
  isBetween930and1000: boolean;
  isBeforeTodoWindow: boolean;
  isWithinTodoWindow: boolean;
  isPast1100: boolean;
}

// WonderTeam runs on WAT (Africa/Lagos, GMT+1). All attendance windows,
// reminder schedules and quiet hours are expressed in this single zone so the
// server, the cron job and the client never disagree about "now".
export function getGMT1Info(d: Date = new Date(), simulatedTime?: { hour: number; minute?: number }): GMT1Info {
  const totalMin = (() => {
    if (simulatedTime && typeof simulatedTime.hour === 'number') {
      return simulatedTime.hour * 60 + (simulatedTime.minute ?? 0);
    }
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(d);
    const h = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const m = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    return h * 60 + m;
  })();

  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;

  let h12 = h % 12;
  h12 = h12 ? h12 : 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const strH = String(h12).padStart(2, '0');
  const strM = String(m).padStart(2, '0');
  const timeStr = `${strH}:${strM} ${ampm}`;

  return {
    h,
    m,
    totalMin,
    timeStr,
    isBefore930: totalMin < 570,
    isPast1000: totalMin > 600,
    isBetween930and1000: totalMin >= 570 && totalMin <= 600,
    isBeforeTodoWindow: totalMin < 570,
    isWithinTodoWindow: totalMin >= 570 && totalMin <= 660,
    isPast1100: totalMin > 660,
  };
}

export function getWATPeriodDetails(hour: number): { period: WATPeriod; timeTitle: string } {
  if (hour >= 0 && hour < 5) {
    return { period: '1am_midnight', timeTitle: '1:00 AM Midnight Visionary Hustle' };
  }
  if (hour >= 5 && hour < 12) {
    return { period: 'morning', timeTitle: 'Morning Ignition & Prospecting Power' };
  }
  if (hour >= 12 && hour < 18) {
    return { period: 'afternoon', timeTitle: 'Afternoon Momentum & Presentation Drive' };
  }
  return { period: 'night', timeTitle: 'Night Reflection & Daily Volume Review' };
}

export const CURATED_MOTIVATIONAL_QUOTES: Record<WATPeriod, Array<{ quote: string; author: string }>> = {
  morning: [
    {
      quote: 'Either you run the day or the day runs you. Start your morning with Income Producing Activities before anything else.',
      author: 'Jim Rohn',
    },
    {
      quote: 'Discipline is the bridge between your goals and your team milestones. Win the morning, win the business.',
      author: 'Jim Rohn',
    },
    {
      quote: 'Success in networking and freelancing is simply a few simple disciplines, practiced every single morning without fail.',
      author: 'Eric Worre',
    },
    {
      quote: 'Your attitude this morning sets the altitude of your entire day. Reach out to three prospective partners or clients before noon.',
      author: 'Zig Ziglar',
    },
  ],
  afternoon: [
    {
      quote: 'The fortune is in the follow-up. Keep your afternoon pipeline active and connect with every interested prospect.',
      author: 'Eric Worre',
    },
    {
      quote: 'Action cures fear. Inaction breeds doubt. Reach out to that prospect and deliver that client presentation now.',
      author: 'Norman Vincent Peale',
    },
    {
      quote: "You don't have to be great to start, but you must start to be great. Finish today's pitches with passion.",
      author: 'Les Brown',
    },
    {
      quote: 'Energy flows where focus goes. Stay locked on your daily income-producing calls and project deliverables.',
      author: 'Tony Robbins',
    },
  ],
  night: [
    {
      quote: 'Review your day with honesty: Did you touch your dream today with real conversations? Consistent seeds multiply into generational legacy.',
      author: 'John C. Maxwell',
    },
    {
      quote: 'Preparation tonight creates victory tomorrow. Lock in your top Income Producing Activities before going to rest.',
      author: 'Brian Tracy',
    },
    {
      quote: 'Rest if you must, but never quit. Every follow-up and presentation you delivered today is building compounding freedom.',
      author: 'Les Brown',
    },
    {
      quote: "Never go to sleep without a request to your mind for tomorrow's prospecting and leadership breakthrough.",
      author: 'Thomas Edison',
    },
  ],
  '1am_midnight': [
    {
      quote: 'While the world is sleeping, the true visionaries are building. The late night hours you invest in your mind and your vision will pay lifelong dividends.',
      author: 'Napoleon Hill',
    },
    {
      quote: "1:00 AM is where champions are forged. When the average have checked out, your burning desire and relentless drive keep your dream alive.",
      author: 'Eric Thomas',
    },
    {
      quote: 'The midnight oil you burn today creates the freedom and financial independence that most people will only ever dream of tomorrow.',
      author: 'Jim Rohn',
    },
    {
      quote: "Greatness is built in the quiet, unseen hours. Stand firm in your belief, feed your entrepreneur spirit, and know your harvest is coming.",
      author: 'Les Brown',
    },
  ],
};

/** Deterministic pick so a reminder re-run on the same day yields the same quote. */
export function pickCuratedQuote(period: WATPeriod, seed: number) {
  const list = CURATED_MOTIVATIONAL_QUOTES[period];
  return list[Math.abs(seed) % list.length];
}
