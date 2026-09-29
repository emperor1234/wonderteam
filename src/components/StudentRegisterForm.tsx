import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { AttendanceRecord, WorkEthicStatus } from '../types/index.ts';
import {
  getGMTPlus1Info,
  calculateDistanceMeters,
  formatDistance,
  DEFAULT_OFFICE_LOCATION,
  OFFICE_PERIMETER_METERS,
  GMTPlus1Info,
} from '../utils/timeAndLocation.ts';
import {
  School,
  CheckCircle2,
  AlertTriangle,
  Clock,
  History,
  FileCheck,
  UserCheck,
  Check,
  Award,
  Bell,
  MapPin,
  Navigation,
  Flame,
  AlertCircle,
  X,
} from 'lucide-react';

interface StudentRegisterFormProps {
  onOpenHistory: () => void;
  onAttendanceUpdated: () => void;
}

export const StudentRegisterForm: React.FC<StudentRegisterFormProps> = ({
  onOpenHistory,
  onAttendanceUpdated,
}) => {
  const { user } = useAuth();
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lazy bone prompt modal
  const [showLazyBoneModal, setShowLazyBoneModal] = useState<boolean>(false);
  const [distanceMismatched, setDistanceMismatched] = useState<number>(0);

  // Work ethic status
  const [workEthicStatus, setWorkEthicStatus] = useState<WorkEthicStatus>('pending_check');
  const [unseriousReason, setUnseriousReason] = useState<string | undefined>(undefined);
  const [hasWrittenTodoToday, setHasWrittenTodoToday] = useState<boolean>(false);

  // Form check-in fields
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Morning Assembly & Roll Call');
  const [remark, setRemark] = useState<string>('');
  const [honorPledge, setHonorPledge] = useState<boolean>(false);
  const [elapsedText, setElapsedText] = useState<string>('0m');
  const [showDismissModal, setShowDismissModal] = useState<boolean>(false);

  // Live GMT+1 clock state
  const [gmt1, setGmt1] = useState<GMTPlus1Info>(getGMTPlus1Info());

  // Location simulation toggle for test convenience
  const [simulateOutsideOffice, setSimulateOutsideOffice] = useState<boolean>(false);
  const [simulatedTimePreset, setSimulatedTimePreset] = useState<'live' | '9:45' | '9:15' | '10:15' | '11:30'>('live');
  const [currentGPS, setCurrentGPS] = useState<{ lat: number; lng: number } | null>(null);
  const [isAcquiringLocation, setIsAcquiringLocation] = useState<boolean>(false);

  // Registered office coordinates
  const office = user?.officeLocation || DEFAULT_OFFICE_LOCATION;

  // Live timer for GMT+1 clock or simulated preset
  useEffect(() => {
    const updateClock = () => {
      if (simulatedTimePreset === 'live') {
        setGmt1(getGMTPlus1Info());
      } else if (simulatedTimePreset === '9:45') {
        const d = new Date();
        d.setHours(9, 45, 0, 0);
        const info = getGMTPlus1Info(d);
        info.hours = 9;
        info.minutes = 45;
        info.totalMinutes = 585;
        info.formattedTime = '09:45 AM (GMT+1)';
        info.timeStr = '09:45 AM';
        info.isBefore930 = false;
        info.isWithinAttendanceWindow = true;
        info.isPast10am = false;
        info.isWithinTodoWindow = true;
        info.isPast11am = false;
        setGmt1(info);
      } else if (simulatedTimePreset === '9:15') {
        const d = new Date();
        d.setHours(9, 15, 0, 0);
        const info = getGMTPlus1Info(d);
        info.hours = 9;
        info.minutes = 15;
        info.totalMinutes = 555;
        info.formattedTime = '09:15 AM (GMT+1)';
        info.timeStr = '09:15 AM';
        info.isBefore930 = true;
        info.isWithinAttendanceWindow = false;
        info.isPast10am = false;
        info.isWithinTodoWindow = false;
        info.isPast11am = false;
        setGmt1(info);
      } else if (simulatedTimePreset === '10:15') {
        const d = new Date();
        d.setHours(10, 15, 0, 0);
        const info = getGMTPlus1Info(d);
        info.hours = 10;
        info.minutes = 15;
        info.totalMinutes = 615;
        info.formattedTime = '10:15 AM (GMT+1)';
        info.timeStr = '10:15 AM';
        info.isBefore930 = false;
        info.isWithinAttendanceWindow = false;
        info.isPast10am = true;
        info.isWithinTodoWindow = true;
        info.isPast11am = false;
        setGmt1(info);
      } else if (simulatedTimePreset === '11:30') {
        const d = new Date();
        d.setHours(11, 30, 0, 0);
        const info = getGMTPlus1Info(d);
        info.hours = 11;
        info.minutes = 30;
        info.totalMinutes = 690;
        info.formattedTime = '11:30 AM (GMT+1)';
        info.timeStr = '11:30 AM';
        info.isBefore930 = false;
        info.isWithinAttendanceWindow = false;
        info.isPast10am = true;
        info.isWithinTodoWindow = false;
        info.isPast11am = true;
        setGmt1(info);
      }
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [simulatedTimePreset]);

  const getSimulatedTimePayload = () => {
    if (simulatedTimePreset === '9:45') return { hour: 9, minute: 45 };
    if (simulatedTimePreset === '9:15') return { hour: 9, minute: 15 };
    if (simulatedTimePreset === '10:15') return { hour: 10, minute: 15 };
    if (simulatedTimePreset === '11:30') return { hour: 11, minute: 30 };
    return undefined;
  };

  const fetchStatus = async () => {
    if (!user) return;
    try {
      const sim = getSimulatedTimePayload();
      const query = sim ? `?userId=${user.id}&simHour=${sim.hour}&simMin=${sim.minute}` : `?userId=${user.id}`;
      const res = await fetch(`/api/attendance/status${query}`);
      if (res.ok) {
        const data = await res.json();
        setIsClockedIn(data.isClockedIn);
        setCurrentRecord(data.record);
        if (data.record?.durationFormatted) {
          setElapsedText(data.record.durationFormatted);
        }
        if (data.workEthicStatus) {
          setWorkEthicStatus(data.workEthicStatus);
        }
        if (data.unseriousReason) {
          setUnseriousReason(data.unseriousReason);
        }
        if (data.hasWrittenTodoToday !== undefined) {
          setHasWrittenTodoToday(data.hasWrittenTodoToday);
        }
      }
    } catch (err) {
      console.error('Failed to fetch attendance status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      if (currentRecord?.clockInTimestamp && !currentRecord.clockOut) {
        const elapsedMinutes = Math.max(1, Math.floor((Date.now() - currentRecord.clockInTimestamp) / 60000));
        const h = Math.floor(elapsedMinutes / 60);
        const m = elapsedMinutes % 60;
        setElapsedText(h > 0 ? `${h}h ${m}m` : `${m}m`);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, currentRecord?.clockInTimestamp]);

  // Acquire live GPS coordinates
  const acquireDeviceGPS = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve) => {
      if (simulateOutsideOffice) {
        // Simulated outside office location (approx 1.8km away)
        const fakeLocation = {
          lat: office.lat + 0.016,
          lng: office.lng + 0.012,
        };
        setCurrentGPS(fakeLocation);
        resolve(fakeLocation);
        return;
      }

      if (!navigator.geolocation) {
        setCurrentGPS(office);
        resolve(office);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: parseFloat(pos.coords.latitude.toFixed(5)),
            lng: parseFloat(pos.coords.longitude.toFixed(5)),
          };
          setCurrentGPS(coords);
          resolve(coords);
        },
        () => {
          // If permission denied in test browser, default to office
          setCurrentGPS(office);
          resolve(office);
        },
        { timeout: 6000 }
      );
    });
  };

  const handleMarkPresence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    if (!honorPledge) {
      setErrorMessage('Please check the honor affirmation to confirm your physical presence on school/office grounds.');
      return;
    }

    setIsSubmitting(true);
    setIsAcquiringLocation(true);
    setErrorMessage(null);

    // 1. Check Location requirement
    // "when the user want to create or take an attendance, it should to open their location,
    // if it doesn't match the initial location when they create the account, it should prompt them to go to office you lazy bone."
    const location = await acquireDeviceGPS();
    setIsAcquiringLocation(false);

    const distance = calculateDistanceMeters(location.lat, location.lng, office.lat, office.lng);

    if (distance > OFFICE_PERIMETER_METERS) {
      setDistanceMismatched(distance);
      setShowLazyBoneModal(true);
      setIsSubmitting(false);
      return;
    }

    // 2. Submit attendance with location and period
    try {
      const simulatedTime = getSimulatedTimePayload();
      const res = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          clientLocation: location,
          period: selectedPeriod,
          remark: remark.trim() || undefined,
          simulatedTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.isLocationMismatch) {
          setDistanceMismatched(data.distanceMeters || distance);
          setShowLazyBoneModal(true);
          return;
        }
        throw new Error(data.error || 'Failed to mark presence in school register');
      }

      await fetchStatus();
      onAttendanceUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not record attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignDismissal = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to sign dismissal');
      }
      setShowDismissModal(false);
      await fetchStatus();
      onAttendanceUpdated();
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not record dismissal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-[16px] border border-[#CBD6D1] p-5 shadow-xs animate-pulse">
        <div className="h-5 bg-[#E9EFEC] w-1/3 rounded mb-3"></div>
        <div className="h-10 bg-[#E9EFEC] w-2/3 rounded mb-4"></div>
        <div className="h-28 bg-[#E9EFEC] w-full rounded-[10px]"></div>
      </div>
    );
  }

  const isShiftComplete = currentRecord && currentRecord.clockIn && currentRecord.clockOut;
  const isMarkedToday = isClockedIn || isShiftComplete;

  const todayDateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  // Determine what status would be assigned right now based on GMT+1 rule
  const projectedStatus = gmt1.isWithinAttendanceWindow ? 'present' : 'late';

  return (
    <>
      {/* ------------------------------------------------------------- */}
      {/* LAZY BONE LOCATION MISMATCH MODAL                              */}
      {/* ------------------------------------------------------------- */}
      {showLazyBoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-[18px] border-2 border-[#C84C4C] shadow-2xl overflow-hidden p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#FFF0F0] border-2 border-[#C84C4C] text-[#C84C4C] flex items-center justify-center mx-auto animate-bounce">
              <MapPin className="w-8 h-8" />
            </div>

            <div>
              {/* Exact user requested prompt */}
              <h3 className="text-xl font-black text-[#C84C4C] uppercase tracking-tight">
                Go to office you lazy bone
              </h3>
              <p className="text-xs text-[#17211D] font-bold mt-1.5">
                Location Mismatch Detected
              </p>
              <p className="text-xs text-[#5E6964] mt-1 leading-relaxed">
                You are currently <strong className="text-[#C84C4C] font-mono-numbers">{formatDistance(distanceMismatched)}</strong> away from your registered office location:
              </p>
              <div className="mt-2 p-2.5 bg-[#F7F9F8] rounded-[8px] border border-[#E2E8E5] text-[11px] text-[#17211D] font-medium">
                {office.address}
              </div>
            </div>

            <div className="p-3 bg-[#FFF6E5] rounded-[10px] border border-[#B7791F] text-[11px] text-[#B7791F] text-left">
              Attendance can only be signed when your mobile GPS matches the registered office perimeter.
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowLazyBoneModal(false);
                  setSimulateOutsideOffice(false);
                }}
                className="w-full py-2.5 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-bold rounded-[10px] transition-colors"
              >
                I Have Arrived at the Office (Retry)
              </button>
              <button
                type="button"
                onClick={() => setShowLazyBoneModal(false)}
                className="w-full py-2 bg-[#F7F9F8] hover:bg-[#E2E8E5] text-[#5E6964] text-xs font-semibold rounded-[10px]"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN SCHOOL ATTENDANCE REGISTER COMPONENT                     */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-[18px] border-2 border-[#CBD6D1] shadow-xs relative overflow-hidden">
        {/* Official School Register Binder Header */}
        <div className="bg-[#F7F9F8] border-b-2 border-[#E2E8E5] px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#146C4E] text-white flex items-center justify-center shadow-xs">
              <School className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[12px] font-black tracking-tight text-[#17211D] uppercase">
                WonderTeam Secondary School
              </div>
              <div className="text-[10px] text-[#5E6964] font-medium">
                Official Class Register · Form Class SS3A · Term 1 (2026/2027)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenHistory}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-[#E7F4EE] border border-[#CBD6D1] text-[#146C4E] text-xs font-semibold rounded-[8px] transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span>Roll Ledger</span>
            </button>
          </div>
        </div>

        {/* Date & Official GMT+1 Clock Subhead */}
        <div className="px-5 py-2.5 bg-[#FAFBFB] border-b border-[#E2E8E5] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#17211D]">{todayDateFormatted}</span>
            <span className="text-[#CBD6D1]">·</span>
            <span className="text-[#146C4E] font-bold font-mono-numbers flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{gmt1.formattedTime}</span>
            </span>
          </div>

          {/* Simulation testing controls for test verification */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#89928E] font-medium">Test Time:</span>
              {(
                [
                  { key: 'live', label: 'Live WAT' },
                  { key: '9:45', label: '09:45 AM (On-time)' },
                  { key: '9:15', label: '09:15 AM (Late)' },
                  { key: '10:15', label: '10:15 AM (Late)' },
                  { key: '11:30', label: '11:30 AM (Unserious)' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setSimulatedTimePreset(preset.key)}
                  className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold transition-colors ${
                    simulatedTimePreset === preset.key
                      ? 'bg-[#146C4E] text-white shadow-2xs'
                      : 'bg-white border border-[#CBD6D1] text-[#5E6964] hover:bg-[#E7F4EE]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] text-[#89928E] font-medium">GPS:</span>
              <button
                type="button"
                onClick={() => setSimulateOutsideOffice(!simulateOutsideOffice)}
                className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold transition-colors ${
                  simulateOutsideOffice
                    ? 'bg-[#FFF0F0] text-[#C84C4C] border border-[#C84C4C]'
                    : 'bg-[#E7F4EE] text-[#0F513B] border border-[#CBD6D1]'
                }`}
                title="Click to toggle outside office simulation for testing the lazy bone prompt"
              >
                {simulateOutsideOffice ? 'Outside Office (1.8km Mismatch)' : 'At Office (Matched)'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-5">
          {errorMessage && (
            <div className="mb-4 p-3 bg-[#FFF0F0] border border-[#E2E8E5] rounded-[10px] text-xs text-[#C84C4C] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs font-bold hover:underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Student Identity Ledger Card */}
          <div className="mb-4 p-3.5 bg-[#F7F9F8] rounded-[12px] border border-[#E2E8E5] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={user?.profileImage}
                alt=""
                className="w-10 h-10 rounded-full object-cover border-2 border-[#CBD6D1]"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#17211D]">{user?.name}</span>
                  <span className="px-1.5 py-0.5 rounded-[4px] bg-[#E7F4EE] text-[#0F513B] text-[10px] font-bold">
                    SS3 STUDENT
                  </span>
                </div>
                <div className="text-[11px] text-[#5E6964] mt-0.5 flex items-center gap-2">
                  <span>Roll ID: <strong className="font-mono-numbers text-[#17211D]">WT-2026/042</strong></span>
                  <span className="text-[#CBD6D1]">·</span>
                  <span>House Mentor: {user?.sponsorName || 'Daniel Mensah'}</span>
                </div>
              </div>
            </div>

            <div className="text-right text-[11px] text-[#5E6964]">
              <div className="flex items-center justify-end gap-1 text-[#146C4E] font-medium">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[170px]">{office.address.split(',')[0]}</span>
              </div>
              <div>Form Tutor: <strong className="text-[#17211D]">{user?.uplineDirector || 'Mrs. Mariam Yusuf'}</strong></div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* RULE 1 & 2 BANNER: ATTENDANCE WINDOW & TO-DO WORK ETHIC     */}
          {/* ----------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Rule 1: Attendance Window Indicator */}
            <div className="p-3 bg-[#F7F9F8] rounded-[10px] border border-[#E2E8E5] text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-[#5E6964] uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#146C4E]" />
                  <span>Roll Call Window</span>
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-[4px] ${
                    gmt1.isWithinAttendanceWindow
                      ? 'bg-[#E7F4EE] text-[#0F513B]'
                      : 'bg-[#FFF6E5] text-[#B7791F]'
                  }`}
                >
                  {gmt1.isWithinAttendanceWindow ? 'On-Time (Present)' : 'Late Arrival'}
                </span>
              </div>
              <p className="text-[11px] text-[#5E6964]">
                Mark attendance between <strong>9:30 AM – 10:00 AM GMT+1</strong>. Before 9:30 AM or after 10:00 AM is recorded as <strong>Late</strong>.
              </p>
            </div>

            {/* Rule 2: To-Do List Work Ethic Status ("Unserious" Flag) */}
            <div
              className={`p-3 rounded-[10px] border text-xs ${
                workEthicStatus === 'unserious'
                  ? 'bg-[#FFF0F0] border-[#C84C4C] text-[#C84C4C]'
                  : workEthicStatus === 'serious'
                  ? 'bg-[#E7F4EE] border-[#146C4E] text-[#0F513B]'
                  : 'bg-[#F7F9F8] border-[#E2E8E5] text-[#5E6964]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  <span>Work Ethic Status</span>
                </span>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-[4px] ${
                    workEthicStatus === 'unserious'
                      ? 'bg-[#C84C4C] text-white'
                      : workEthicStatus === 'serious'
                      ? 'bg-[#146C4E] text-white'
                      : 'bg-[#B7791F] text-white'
                  }`}
                >
                  {workEthicStatus === 'unserious'
                    ? 'Unserious'
                    : workEthicStatus === 'serious'
                    ? 'Serious'
                    : 'To-Do Window Active'}
                </span>
              </div>
              <p className="text-[11px]">
                {workEthicStatus === 'unserious'
                  ? unseriousReason || 'Marked Unserious: To-do list was not written between 9:30 AM – 11:00 AM GMT+1!'
                  : workEthicStatus === 'serious'
                  ? '✓ To-do list successfully recorded during morning window.'
                  : 'Write your daily to-do list before 11:00 AM GMT+1 to avoid being marked Unserious.'}
              </p>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* STATE A: Student has NOT yet marked attendance today        */}
          {/* ----------------------------------------------------------- */}
          {!isMarkedToday ? (
            <form onSubmit={handleMarkPresence} className="space-y-4">
              <div className="border-t border-[#E2E8E5] pt-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-[#17211D] uppercase tracking-wide flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-[#146C4E]" />
                    <span>Daily Roll Call Entry</span>
                  </h4>
                  <span className="text-[11px] text-[#5E6964] font-medium flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-[#146C4E]" />
                    <span>GPS Verification Active</span>
                  </span>
                </div>

                {/* Status Projection Notification based on GMT+1 window */}
                <div
                  className={`p-3 rounded-[10px] border mb-3 flex items-start gap-2.5 text-xs ${
                    gmt1.isWithinAttendanceWindow
                      ? 'bg-[#E7F4EE] border-[#146C4E] text-[#0F513B]'
                      : 'bg-[#FFF6E5] border-[#B7791F] text-[#B7791F]'
                  }`}
                >
                  {gmt1.isWithinAttendanceWindow ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#146C4E] mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#B7791F] mt-0.5" />
                  )}
                  <div>
                    <div className="font-bold">
                      {gmt1.isWithinAttendanceWindow
                        ? 'Current Time is Within Official On-Time Window (Marked Present)'
                        : gmt1.isBefore930
                        ? `Early Arrival at ${gmt1.timeStr} (Before 9:30 AM GMT+1 window -> Marked Late)`
                        : `Past 10:00 AM GMT+1 Deadline (Marked Late)`}
                    </div>
                    <div className="text-[11px] opacity-85 mt-0.5">
                      {gmt1.isWithinAttendanceWindow
                        ? 'You will receive full on-time presence credit for Form SS3.'
                        : 'Rule requirement: Attendance must be marked strictly between 9:30 AM and 10:00 AM GMT+1.'}
                    </div>
                  </div>
                </div>

                {/* Roll Call Period */}
                <div className="mb-3.5">
                  <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                    Roll Call Period
                  </label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs font-medium text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                  >
                    <option value="Morning Assembly & Roll Call">Morning Assembly & Roll Call (09:30 AM - 10:00 AM GMT+1)</option>
                    <option value="Period 1 Morning Session">Period 1 - Mathematics / Sciences</option>
                    <option value="Mid-day Subject Session">Mid-day Subject Session</option>
                    <option value="Afternoon Study & Prep">Afternoon Prep Session</option>
                  </select>
                </div>

                {/* Arrival Note / Remarks */}
                <div className="mb-3.5">
                  <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                    Student Arrival Remarks / Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Arrived on campus on time, reporting to Form Class SS3"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                  />
                </div>

                {/* Honor Declaration Checkbox */}
                <div className="p-3 bg-[#F7F9F8] rounded-[10px] border border-[#CBD6D1] mb-4">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={honorPledge}
                      onChange={(e) => setHonorPledge(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#146C4E] focus:ring-[#146C4E] border-[#CBD6D1]"
                    />
                    <span className="text-[#17211D] leading-snug">
                      <strong>Physical Presence & Location Affirmation:</strong> I affirm that I am physically present at the registered office ({office.address}) and ready to mark today's roll register.
                    </span>
                  </label>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting || isAcquiringLocation}
                  className="w-full min-h-[46px] bg-[#146C4E] hover:bg-[#0F513B] active:translate-y-px text-white text-xs font-bold uppercase tracking-wider rounded-[10px] transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {isAcquiringLocation ? (
                    <span>Verifying GPS Location...</span>
                  ) : isSubmitting ? (
                    <span>Recording in Register...</span>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Mark My Presence in School Register</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ----------------------------------------------------------- */
            /* STATE B: Student IS Marked -> Stamped Register Receipt     */
            /* ----------------------------------------------------------- */
            <div className="space-y-4">
              <div className="p-4 bg-[#F3FAF7] border-2 border-[#146C4E] rounded-[14px] relative overflow-hidden">
                {/* Stamp Watermark */}
                <div className="absolute right-4 top-4 border-2 border-[#146C4E] text-[#146C4E] rounded-[8px] px-3 py-1 font-mono-numbers font-black text-xs rotate-[-6deg] opacity-80 uppercase tracking-widest pointer-events-none select-none">
                  ✓ REGISTER VERIFIED
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-black text-sm shrink-0 ${
                      currentRecord?.status === 'late' ? 'bg-[#B7791F]' : 'bg-[#146C4E]'
                    }`}
                  >
                    {currentRecord?.status === 'late' ? 'L' : 'P'}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0F513B] uppercase tracking-wide">
                      {currentRecord?.status === 'late'
                        ? 'Late Arrival Recorded in Register'
                        : 'Signed & Marked Present in School Register'}
                    </div>
                    <div className="text-xs text-[#17211D] font-medium mt-0.5">
                      Arrival Signed: <strong className="font-mono-numbers text-[#146C4E]">{currentRecord?.clockIn}</strong>
                      {currentRecord?.clockOut ? (
                        <span> · Dismissal: <strong className="font-mono-numbers text-[#17211D]">{currentRecord.clockOut}</strong></span>
                      ) : (
                        <span> · Active in Class Session</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5E6964] mt-1">
                      {currentRecord?.lastActivity || 'Present for Class SS3 Morning Roll Call'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E7F4EE] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-[#5E6964]">
                    <Clock className="w-3.5 h-3.5 text-[#146C4E]" />
                    <span>School Day Duration:</span>
                    <span className="font-bold font-mono-numbers text-[#17211D]">
                      {isShiftComplete ? currentRecord?.durationFormatted : elapsedText}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-[#0F513B] font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-[#146C4E]" />
                    <span>Office GPS Matched</span>
                  </div>
                </div>
              </div>

              {/* School Dismissal Action */}
              {isClockedIn ? (
                showDismissModal ? (
                  <div className="p-3 bg-[#F7F9F8] rounded-[12px] border border-[#CBD6D1]">
                    <p className="text-xs text-[#17211D] font-medium mb-2.5">
                      Sign afternoon dismissal from school? Duration: <strong className="text-[#146C4E] font-mono-numbers">{elapsedText}</strong>
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSignDismissal}
                        disabled={isSubmitting}
                        className="flex-1 min-h-[40px] bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[10px] transition-colors"
                      >
                        {isSubmitting ? 'Recording...' : 'Confirm Dismissal'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDismissModal(false)}
                        className="px-3 min-h-[40px] bg-white border border-[#E2E8E5] text-xs font-medium text-[#5E6964] rounded-[10px] hover:bg-[#F7F9F8]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDismissModal(true)}
                    className="w-full min-h-[44px] bg-white hover:bg-[#F7F9F8] text-[#17211D] border border-[#CBD6D1] text-xs font-semibold rounded-[10px] transition-all shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Sign Afternoon School Dismissal (2:40 PM)</span>
                  </button>
                )
              ) : isShiftComplete ? (
                <div className="p-3 bg-[#FAFBFB] rounded-[10px] border border-[#E2E8E5] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#146C4E]" />
                    <span className="font-semibold text-[#17211D]">Daily attendance register complete</span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenHistory}
                    className="text-xs font-bold text-[#146C4E] hover:underline"
                  >
                    View in Roll Book
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Register Footer */}
        <div className="bg-[#F7F9F8] border-t border-[#E2E8E5] px-5 py-2.5 flex items-center justify-between text-[11px] text-[#5E6964]">
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-[#146C4E]" />
            <span>Form Tutor: {user?.uplineDirector || 'Mrs. Mariam Yusuf'}</span>
          </div>
          <span className="font-mono-numbers">WAT (GMT+1) Verified</span>
        </div>
      </div>
    </>
  );
};
