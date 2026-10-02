import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useNotifications } from '../context/NotificationContext.tsx';
import type { AppNotification, NotificationType } from '../types/index.ts';
import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  Megaphone,
  Quote,
  ListTodo,
  Wallet,
  Clock,
  BookOpen,
  MessageCircle,
  Settings2,
  X,
  Send,
  Smartphone,
} from 'lucide-react';

const TYPE_META: Record<NotificationType, { icon: any; tint: string; label: string }> = {
  message: { icon: MessageCircle, tint: 'bg-[#E7F4EE] text-[#0F513B]', label: 'Message' },
  motivation: { icon: Quote, tint: 'bg-[#FFF8E7] text-[#B7791F]', label: 'Motivation' },
  todo: { icon: ListTodo, tint: 'bg-[#F0F2FF] text-[#4338CA]', label: 'To-do' },
  budget: { icon: Wallet, tint: 'bg-[#FFF3E0] text-[#D97706]', label: 'Budget' },
  attendance: { icon: Clock, tint: 'bg-[#E7F4EE] text-[#0F513B]', label: 'Attendance' },
  reading: { icon: BookOpen, tint: 'bg-[#F8F0FF] text-[#7E22CE]', label: 'Reading' },
  system: { icon: Bell, tint: 'bg-[#F7F9F8] text-[#5E6964]', label: 'System' },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const NotificationRow: React.FC<{ notification: AppNotification }> = ({ notification }) => {
  const { markRead } = useNotifications();
  const meta = TYPE_META[notification.type] || TYPE_META.system;
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => !notification.read && markRead(notification.id)}
      className={`w-full text-left px-3.5 py-3 flex gap-2.5 border-b border-[#E2E8E5] transition-colors hover:bg-[#F7F9F8] ${
        notification.read ? 'opacity-70' : 'bg-white'
      }`}
    >
      <span className={`mt-0.5 w-7 h-7 rounded-[9px] flex items-center justify-center shrink-0 ${meta.tint}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#17211D] truncate">{notification.title}</span>
          {!notification.read && <span className="w-1.5 h-1.5 rounded-full bg-[#146C4E] shrink-0" />}
          <span className="ml-auto text-[10px] text-[#89928E] shrink-0">{timeAgo(notification.createdAt)}</span>
        </span>
        <span className="block text-[11px] text-[#5E6964] leading-relaxed mt-0.5 break-words">
          {notification.body}
        </span>
        {notification.createdByName && (
          <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-[#146C4E] bg-[#E7F4EE] px-1.5 py-0.5 rounded-[5px]">
            From {notification.createdByName}
          </span>
        )}
      </span>
    </button>
  );
};

export const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const {
    isSupported,
    permission,
    isSubscribed,
    isBusy,
    error,
    notifications,
    unreadCount,
    preferences,
    enableNotifications,
    disableNotifications,
    updatePreferences,
    markAllRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draft, setDraft] = useState({ title: '', body: '' });
  const [sendState, setSendState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isOpen]);

  if (!user || !isSupported) return null;

  const needsPermission = permission !== 'granted' || !isSubscribed;
  const isAdmin = user.role === 'admin';

  const handleSend = async () => {
    if (!draft.title.trim() || !draft.body.trim()) return;
    setSendState('sending');
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title.trim(),
          body: draft.body.trim(),
          type: 'message',
        }),
      });
      if (!res.ok) throw new Error('Send failed');
      setDraft({ title: '', body: '' });
      setSendState('sent');
      setTimeout(() => setSendState('idle'), 2500);
    } catch {
      setSendState('failed');
      setTimeout(() => setSendState('idle'), 3000);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center w-8 h-8 rounded-[10px] border border-[#E2E8E5] bg-white hover:bg-[#F7F9F8] text-[#5E6964] transition-colors"
      >
        {permission === 'granted' ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#C84C4C] text-white text-[9px] font-bold flex items-center justify-center border border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-[min(22rem,calc(100vw-1.5rem))] bg-white rounded-[14px] border border-[#E2E8E5] shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#E2E8E5]">
            <span className="text-xs font-bold text-[#17211D]">Notifications</span>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#146C4E] hover:bg-[#E7F4EE] rounded-[7px] transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                aria-label="Notification settings"
                className={`p-1.5 rounded-[7px] transition-colors ${
                  showSettings ? 'bg-[#E7F4EE] text-[#146C4E]' : 'text-[#89928E] hover:bg-[#F7F9F8]'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close notifications"
                className="p-1.5 text-[#89928E] hover:bg-[#F7F9F8] rounded-[7px] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {needsPermission && (
            <div className="px-3.5 py-3 bg-[#F7F9F8] border-b border-[#E2E8E5] space-y-2">
              <div className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-[#146C4E] mt-0.5 shrink-0" />
                <div className="text-[11px] text-[#5E6964] leading-relaxed">
                  <span className="font-bold text-[#17211D]">Turn on push notifications</span> to get
                  messages, motivational quotes, to-do reminders, budget alerts and attendance nudges
                  even when WonderTeam is closed.
                </div>
              </div>
              {permission === 'denied' ? (
                <div className="text-[10px] font-semibold text-[#C84C4C]">
                  Notifications are blocked. Re-enable them in your browser's site settings.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={enableNotifications}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#146C4E] hover:bg-[#0F513B] disabled:opacity-60 text-white text-[11px] font-bold rounded-[8px] transition-colors"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {isBusy ? 'Enabling...' : 'Enable notifications'}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="px-3.5 py-2 bg-[#FFF0F0] border-b border-[#E2E8E5] text-[10px] font-semibold text-[#C84C4C]">
              {error}
            </div>
          )}

          {showSettings && preferences && (
            <div className="px-3.5 py-3 border-b border-[#E2E8E5] bg-[#F7F9F8] space-y-2.5">
              <ToggleRow
                label="All notifications"
                checked={preferences.enabled}
                onChange={(v) => updatePreferences({ enabled: v })}
              />
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
                <ToggleRow
                  label="Messages"
                  checked={preferences.messages}
                  disabled={!preferences.enabled}
                  onChange={(v) => updatePreferences({ messages: v })}
                />
                <ToggleRow
                  label="Motivation"
                  checked={preferences.motivation}
                  disabled={!preferences.enabled}
                  onChange={(v) => updatePreferences({ motivation: v })}
                />
                <ToggleRow
                  label="To-do list"
                  checked={preferences.todos}
                  disabled={!preferences.enabled}
                  onChange={(v) => updatePreferences({ todos: v })}
                />
                <ToggleRow
                  label="Budget"
                  checked={preferences.budget}
                  disabled={!preferences.enabled}
                  onChange={(v) => updatePreferences({ budget: v })}
                />
                <ToggleRow
                  label="Attendance"
                  checked={preferences.attendance}
                  disabled={!preferences.enabled}
                  onChange={(v) => updatePreferences({ attendance: v })}
                />
                <ToggleRow
                  label="Reading"
                  checked={preferences.reading}
                  disabled={!preferences.enabled}
                  onChange={(v) => updatePreferences({ reading: v })}
                />
              </div>

              <div className="pt-2 border-t border-[#E2E8E5] flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#5E6964]">Quiet hours (WAT)</span>
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#17211D]">
                  <select
                    value={preferences.quietHoursStart ?? ''}
                    onChange={(e) =>
                      updatePreferences({
                        quietHoursStart: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="bg-white border border-[#E2E8E5] rounded-[6px] px-1 py-0.5"
                  >
                    <option value="">off</option>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                  <span className="text-[#89928E]">to</span>
                  <select
                    value={preferences.quietHoursEnd ?? ''}
                    onChange={(e) =>
                      updatePreferences({
                        quietHoursEnd: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="bg-white border border-[#E2E8E5] rounded-[6px] px-1 py-0.5"
                  >
                    <option value="">off</option>
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, '0')}:00
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isSubscribed && (
                <button
                  type="button"
                  onClick={disableNotifications}
                  disabled={isBusy}
                  className="w-full text-[10px] font-semibold text-[#C84C4C] hover:bg-[#FFF0F0] py-1.5 rounded-[8px] transition-colors"
                >
                  Turn off notifications on this device
                </button>
              )}
            </div>
          )}

          {isAdmin && (
            <div className="px-3.5 py-3 border-b border-[#E2E8E5]">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#146C4E] mb-2">
                <Megaphone className="w-3.5 h-3.5" />
                Message the team
              </div>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="Title"
                maxLength={120}
                className="w-full px-2.5 py-1.5 mb-1.5 text-[11px] bg-[#F7F9F8] border border-[#E2E8E5] rounded-[8px] focus:outline-none focus:border-[#146C4E]"
              />
              <textarea
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder="What does the team need to know?"
                maxLength={500}
                rows={2}
                className="w-full px-2.5 py-1.5 mb-2 text-[11px] bg-[#F7F9F8] border border-[#E2E8E5] rounded-[8px] focus:outline-none focus:border-[#146C4E] resize-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sendState === 'sending' || !draft.title.trim() || !draft.body.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#146C4E] hover:bg-[#0F513B] disabled:opacity-50 text-white text-[11px] font-bold rounded-[8px] transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendState === 'sending' ? 'Sending...' : 'Send'}
                </button>
                {sendState === 'sent' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#146C4E]">
                    <Check className="w-3 h-3" /> Delivered
                  </span>
                )}
                {sendState === 'failed' && (
                  <span className="text-[10px] font-bold text-[#C84C4C]">Failed to send</span>
                )}
              </div>
            </div>
          )}

          <div className="max-h-[22rem] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-3.5 py-8 text-center">
                <Bell className="w-6 h-6 text-[#CBD6D1] mx-auto mb-2" />
                <div className="text-[11px] text-[#89928E]">Nothing new right now</div>
              </div>
            ) : (
              notifications.map((n) => <NotificationRow key={n.id} notification={n} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, checked, disabled, onChange }) => (
  <label className={`flex items-center gap-2 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative rounded-full transition-colors ${
        checked ? 'bg-[#146C4E]' : 'bg-[#CBD6D1]'
      }`}
      style={{ height: '18px', width: '32px' }}
    >
      <span
        className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${
          checked ? 'left-4' : 'left-0.5'
        }`}
      />
    </button>
    <span className="text-[11px] font-semibold text-[#17211D]">{label}</span>
  </label>
);
