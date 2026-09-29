/**
 * Time (GMT+1) & Geolocation (Office boundary) helpers for WonderTeam
 */

export interface GMTPlus1Info {
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number; // minutes from midnight
  formattedTime: string; // "09:42 AM (GMT+1)"
  timeStr: string; // "09:42 AM"
  dateStr: string; // "YYYY-MM-DD"
  isBefore930: boolean;
  isWithinAttendanceWindow: boolean; // 9:30 AM - 10:00 AM
  isPast10am: boolean;
  isWithinTodoWindow: boolean; // 9:30 AM - 11:00 AM
  isPast11am: boolean;
}

/**
 * Returns current time evaluated in GMT+1 (WAT - West Africa Time)
 */
export function getGMTPlus1Info(targetDate: Date = new Date()): GMTPlus1Info {
  // Extract parts using Africa/Lagos (UTC+1 year-round)
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(targetDate);
  const findPart = (type: string) => parts.find((p) => p.type === type)?.value || '0';

  const hours = parseInt(findPart('hour'), 10);
  const minutes = parseInt(findPart('minute'), 10);
  const seconds = parseInt(findPart('second'), 10);
  const year = findPart('year');
  const month = findPart('month');
  const day = findPart('day');

  const totalMinutes = hours * 60 + minutes;

  // 09:30 AM = 9 * 60 + 30 = 570 minutes
  // 10:00 AM = 10 * 60 = 600 minutes
  // 11:00 AM = 11 * 60 = 660 minutes
  const isBefore930 = totalMinutes < 570;
  const isWithinAttendanceWindow = totalMinutes >= 570 && totalMinutes <= 600;
  const isPast10am = totalMinutes > 600;

  const isWithinTodoWindow = totalMinutes >= 570 && totalMinutes <= 660;
  const isPast11am = totalMinutes > 660;

  // 12-hour format string
  let h12 = hours % 12;
  h12 = h12 ? h12 : 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const strH = String(h12).padStart(2, '0');
  const strM = String(minutes).padStart(2, '0');
  const formattedTime = `${strH}:${strM} ${ampm} (GMT+1)`;
  const dateStr = `${year}-${month}-${day}`;

  return {
    hours,
    minutes,
    seconds,
    totalMinutes,
    formattedTime,
    timeStr: `${strH}:${strM} ${ampm}`,
    dateStr,
    isBefore930,
    isWithinAttendanceWindow,
    isPast10am,
    isWithinTodoWindow,
    isPast11am,
  };
}

/**
 * Calculates Haversine distance in meters between two lat/lng pairs
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const phi1 = rad(lat1);
  const phi2 = rad(lat2);
  const deltaPhi = rad(lat2 - lat1);
  const deltaLambda = rad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(2)}km`;
}

// Office allowed threshold in meters
export const OFFICE_PERIMETER_METERS = 200;

// Default office location: WonderTeam Lagos Central Campus (Victoria Island, Lagos, Nigeria)
export const DEFAULT_OFFICE_LOCATION = {
  lat: 6.4281,
  lng: 3.4219,
  address: 'WonderTeam Campus, Victoria Island, Lagos, Nigeria',
};
