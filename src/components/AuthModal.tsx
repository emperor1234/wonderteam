import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { compressImageUnder10KB } from '../utils/imageHelper.ts';
import { DEFAULT_OFFICE_LOCATION } from '../utils/timeAndLocation.ts';
import { X, Upload, Check, AlertCircle, ShieldCheck, MapPin, Navigation } from 'lucide-react';
import { UserRole, OfficeLocation } from '../types/index.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Signin fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register fields
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [sponsorName, setSponsorName] = useState('');
  const [uplineDirector, setUplineDirector] = useState('');
  const [uplineWorldTeamLeader, setUplineWorldTeamLeader] = useState('');
  const [profileImage, setProfileImage] = useState<string>('');
  const [imageSizeStr, setImageSizeStr] = useState<string>('');
  const [isImageValid, setIsImageValid] = useState<boolean>(true);

  // Mobile Office Location (Mandatory on account creation)
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCaptureLocation = () => {
    setIsLocating(true);
    setError(null);
    if (!navigator.geolocation) {
      // Fallback to default office location
      setOfficeLocation(DEFAULT_OFFICE_LOCATION);
      setLocationSuccessMsg(`Registered Location: ${DEFAULT_OFFICE_LOCATION.address}`);
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(5));
        const lng = parseFloat(pos.coords.longitude.toFixed(5));
        const loc: OfficeLocation = {
          lat,
          lng,
          address: `Lagos Central Office (Lat: ${lat}, Lng: ${lng})`,
        };
        setOfficeLocation(loc);
        setLocationSuccessMsg(`GPS Location Captured: ${lat}, ${lng}`);
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation prompt rejected or unavailable, setting Lagos Campus default:', err);
        setOfficeLocation(DEFAULT_OFFICE_LOCATION);
        setLocationSuccessMsg(`Default Registered Office: ${DEFAULT_OFFICE_LOCATION.address}`);
        setIsLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setError(null);

    try {
      const processed = await compressImageUnder10KB(file);
      setProfileImage(processed.base64);
      setImageSizeStr(processed.formattedSize);
      setIsImageValid(processed.isWithinLimit);
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!sponsorName || !uplineDirector || !uplineWorldTeamLeader) {
      setError('Please provide all upline credentials (Sponsor, Director, and World Team Leader)');
      setIsLoading(false);
      return;
    }

    if (!officeLocation) {
      setError('Mobile GPS location of the office is strictly required before creating an account. Please click "Capture Office Location".');
      setIsLoading(false);
      return;
    }

    try {
      await register({
        name,
        email: regEmail,
        password: regPassword,
        role,
        sponsorName,
        uplineDirector,
        uplineWorldTeamLeader,
        profileImage: profileImage || '',
        officeLocation,
      });

      // Automatic download of member pass & credentials upon account creation
      try {
        const passData = {
          hub: 'WonderTeam · Networking & Freelance Hub',
          member: {
            name,
            email: regEmail,
            role: role === 'admin' ? 'Team Director' : 'Team Member',
            sponsor: sponsorName,
            director: uplineDirector,
            worldTeamLeader: uplineWorldTeamLeader,
            registeredOffice: officeLocation.address,
            registeredAt: new Date().toISOString(),
          },
          dailySchedule: {
            morningStandupWindow: '09:30 AM – 10:00 AM WAT',
            todoPlanningWindow: '09:30 AM – 11:00 AM WAT',
            coreDiscipline: 'Income Producing Activities (IPAs)',
          },
          onboardingChecklist: [
            '1. Check in daily on-time between 09:30 AM and 10:00 AM WAT.',
            '2. Add and prioritize daily tasks before 11:00 AM WAT.',
            '3. Read 1 chapter daily in the Growth Library (Google Embedded Books API).',
            '4. Track business expenses privately in Member Spending.',
          ],
        };
        const blob = new Blob([JSON.stringify(passData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WonderTeam-Member-Pass-${name.replace(/\s+/g, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (dlErr) {
        console.warn('Pass download note:', dlErr);
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-[16px] border border-[#E2E8E5] shadow-xl overflow-hidden max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#E2E8E5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[6px] bg-[#146C4E] text-white flex items-center justify-center text-xs font-bold">
              W
            </div>
            <h2 className="text-sm font-semibold text-[#17211D]">
              {mode === 'signin' ? 'Sign In to WonderTeam' : 'Create Member Account'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[6px] text-[#89928E] hover:text-[#17211D] hover:bg-[#F7F9F8]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>


        {/* Scrollable Form Area */}
        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-[#FFF0F0] border border-[#E2E8E5] rounded-[10px] text-xs text-[#C84C4C] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="flex rounded-[10px] bg-[#F7F9F8] p-1 border border-[#E2E8E5] mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-all ${
                mode === 'signin'
                  ? 'bg-white text-[#17211D] shadow-xs'
                  : 'text-[#5E6964] hover:text-[#17211D]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-[8px] transition-all ${
                mode === 'register'
                  ? 'bg-white text-[#17211D] shadow-xs'
                  : 'text-[#5E6964] hover:text-[#17211D]'
              }`}
            >
              Register (with Upline & Photo)
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[10px] transition-colors"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Profile Image with 10KB Constraint */}
              <div className="p-3 bg-[#F7F9F8] rounded-[12px] border border-[#CBD6D1]">
                <label className="block text-xs font-semibold text-[#17211D] mb-1.5">
                  Profile Image (Max 10KB limit)
                </label>
                <div className="flex items-center gap-3">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Preview"
                      className="w-12 h-12 rounded-full object-cover border-2 border-[#146C4E]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#E2E8E5] flex items-center justify-center text-xs text-[#89928E]">
                      10KB
                    </div>
                  )}

                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageSelect}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressing}
                      className="px-3 py-1.5 bg-white hover:bg-[#E2E8E5] border border-[#CBD6D1] text-xs font-medium text-[#17211D] rounded-[8px] inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#5E6964]" />
                      <span>{isCompressing ? 'Compressing...' : 'Select Photo'}</span>
                    </button>
                    {imageSizeStr && (
                      <div className="text-[11px] mt-1 flex items-center gap-1 text-[#146C4E]">
                        <Check className="w-3 h-3" />
                        <span>Optimized: {imageSizeStr} (under 10KB limit)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Role selection */}
              <div>
                <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                  Account Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('member')}
                    className={`py-2 px-3 border rounded-[10px] text-xs font-medium text-left ${
                      role === 'member'
                        ? 'bg-[#E7F4EE] border-[#146C4E] text-[#0F513B]'
                        : 'bg-white border-[#E2E8E5] text-[#5E6964]'
                    }`}
                  >
                    <div className="font-semibold">Team Member</div>
                    <div className="text-[10px] opacity-80">Attendance, tasks, own spending</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 border rounded-[10px] text-xs font-medium text-left ${
                      role === 'admin'
                        ? 'bg-[#E7F4EE] border-[#146C4E] text-[#0F513B]'
                        : 'bg-white border-[#E2E8E5] text-[#5E6964]'
                    }`}
                  >
                    <div className="font-semibold">Admin / Leader</div>
                    <div className="text-[10px] opacity-80">Team presence, tasks (no finance)</div>
                  </button>
                </div>
              </div>

              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amara Okafor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="member@wonderteam.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5E6964] mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                />
              </div>

              {/* Required Upline Hierarchy Credentials */}
              <div className="pt-2 border-t border-[#E2E8E5] space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#146C4E]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Upline Verification Credentials</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5E6964] mb-1">
                    Name of Your Sponsor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daniel Mensah"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5E6964] mb-1">
                    Upline Director *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mariam Yusuf"
                    value={uplineDirector}
                    onChange={(e) => setUplineDirector(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#5E6964] mb-1">
                    Upline World Team Leader *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chief Babatunde Adeleke"
                    value={uplineWorldTeamLeader}
                    onChange={(e) => setUplineWorldTeamLeader(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD6D1] rounded-[10px] text-xs text-[#17211D] focus:outline-none focus:ring-2 focus:ring-[#E7F4EE] focus:border-[#146C4E]"
                  />
                </div>
              </div>

              {/* Mandatory Mobile Office GPS Location */}
              <div className="p-3.5 bg-[#F7F9F8] rounded-[12px] border border-[#CBD6D1] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#17211D]">
                    <MapPin className="w-4 h-4 text-[#146C4E]" />
                    <span>Registered Office Location (GPS) *</span>
                  </div>
                  <span className="text-[10px] text-[#B7791F] font-semibold uppercase">Mandatory</span>
                </div>
                <p className="text-[11px] text-[#5E6964]">
                  WonderTeam tracks attendance against this office coordinate. You must be at this location to mark attendance.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCaptureLocation}
                    disabled={isLocating}
                    className="px-3 py-2 bg-white hover:bg-[#E7F4EE] border border-[#CBD6D1] text-xs font-semibold text-[#146C4E] rounded-[8px] inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Detecting GPS...' : officeLocation ? 'Re-capture Location' : 'Capture Mobile Office Location'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOfficeLocation(DEFAULT_OFFICE_LOCATION);
                      setLocationSuccessMsg(`Campus Set: ${DEFAULT_OFFICE_LOCATION.address}`);
                    }}
                    className="px-2.5 py-2 bg-[#F3FAF7] hover:bg-[#E7F4EE] border border-[#E7F4EE] text-[11px] font-medium text-[#0F513B] rounded-[8px]"
                  >
                    Use Lagos Campus (Default)
                  </button>
                </div>

                {officeLocation && (
                  <div className="mt-2 p-2 bg-[#E7F4EE] rounded-[8px] border border-[#CBD6D1] text-xs text-[#0F513B] flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-[#146C4E]" />
                    <div>
                      <div className="font-bold">Office Coordinate Registered</div>
                      <div className="text-[11px] font-mono-numbers opacity-90">
                        Lat: {officeLocation.lat}, Lng: {officeLocation.lng}
                      </div>
                      <div className="text-[10px] opacity-75">{officeLocation.address}</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-[#146C4E] hover:bg-[#0F513B] text-white text-xs font-semibold rounded-[10px] transition-colors"
                >
                  {isLoading ? 'Creating Account...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
