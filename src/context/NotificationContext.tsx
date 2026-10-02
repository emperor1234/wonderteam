import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext.tsx';
import type { AppNotification, NotificationPreferences } from '../types/index.ts';

type PermissionState = NotificationPermission | 'unsupported';

interface NotificationContextType {
  isSupported: boolean;
  permission: PermissionState;
  isSubscribed: boolean;
  isBusy: boolean;
  error: string | null;
  notifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  lastLink: string | null;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
  updatePreferences: (patch: Partial<NotificationPreferences>) => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearLink: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/** How often an open app checks for new notifications and due reminders. */
const POLL_INTERVAL_MS = 60_000;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Notifications could not be enabled';
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const shownIdsRef = useRef<Set<string>>(new Set());

  // Chrome exposes `window.Notification` on insecure origins but refuses to grant
  // permission there, so isSecureContext is the signal that actually matters.
  // On http://<LAN-IP> the inbox still works; only OS-level push is unavailable.
  const isSupported =
    typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext;

  useEffect(() => {
    if (!isSupported) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, [isSupported]);

  // Sync permission and subscription state when the signed-in user changes.
  useEffect(() => {
    let cancelled = false;

    async function syncState() {
      if (!isSupported) return;
      setPermission(Notification.permission);

      if (!user) {
        setIsSubscribed(false);
        setNotifications([]);
        setUnreadCount(0);
        setPreferences(null);
        return;
      }

      try {
        const res = await fetch('/api/push/status');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setIsSubscribed(Boolean(data.subscribed));
        setPreferences(data.preferences || null);
      } catch {
        // Offline: keep whatever state we already had.
      }
    }

    syncState();
    return () => {
      cancelled = true;
    };
  }, [user, isSupported]);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications?limit=40');
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setUnreadCount(Number(data.unreadCount) || 0);
      if (data.preferences) setPreferences(data.preferences);
      if (typeof data.subscribed === 'boolean') setIsSubscribed(data.subscribed);
    } catch {
      // Ignore: the next poll will retry.
    }
  }, [user]);

  const raiseLocally = useCallback(
    async (items: Array<{ id: string; title: string; body: string; link?: string }>) => {
      if (!isSupported || Notification.permission !== 'granted' || items.length === 0) return;

      const registration = await getServiceWorkerRegistration();
      for (const item of items) {
        if (registration?.active) {
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            id: item.id,
            title: item.title,
            body: item.body,
            link: item.link,
          });
        } else {
          try {
            new Notification(item.title, { body: item.body, icon: '/icon-192.png' });
          } catch {
            // Browser refused an in-page notification; the inbox still has it.
          }
        }
      }
    },
    [isSupported]
  );

  /**
   * Polls the inbox and asks the server for any reminders that are due now.
   * This is the open-app delivery path: the server deduplicates by reminder key,
   * so the same reminder is never shown twice and never collides with the
   * scheduled push that reaches members with the app closed.
   */
  const poll = useCallback(async () => {
    if (!user || document.visibilityState === 'hidden') return;

    try {
      const res = await fetch('/api/push/reminders');
      if (res.ok) {
        const data = await res.json();
        const reminders: Array<{ id: string; title: string; body: string; link?: string }> =
          Array.isArray(data.reminders) ? data.reminders : [];
        const fresh = reminders.filter((r) => !shownIdsRef.current.has(r.id));
        fresh.forEach((r) => shownIdsRef.current.add(r.id));
        if (fresh.length > 0 && !data.quiet) await raiseLocally(fresh);
      }
    } catch {
      // Ignore: reminders are time-window based and retried on the next poll.
    }

    await refresh();
  }, [user, refresh, raiseLocally]);

  useEffect(() => {
    if (!user) return;
    poll();
    const timer = window.setInterval(poll, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') poll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, poll]);

  // The service worker asks an open tab to switch views when a notification is
  // clicked, which avoids reloading the app and losing the current session.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'NOTIFICATION_CLICK' && typeof data.link === 'string') {
        setLastLink(data.link);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!isSupported || !user) return false;
    setIsBusy(true);
    setError(null);

    try {
      if (!window.isSecureContext) {
        setError('Notifications need HTTPS. Open WonderTeam over HTTPS or install it to your home screen.');
        return false;
      }

      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') {
        setError(
          result === 'denied'
            ? 'Notifications are blocked in your browser settings. Re-enable them to get reminders.'
            : 'Notification permission was not granted.'
        );
        return false;
      }

      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        setError('This browser cannot register the WonderTeam service worker.');
        return false;
      }

      const keyRes = await fetch('/api/push/vapid-key');
      if (!keyRes.ok) throw new Error('Push notifications are not configured on the server');
      const { publicKey } = await keyRes.json();

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
        });
      }

      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!saveRes.ok) throw new Error('Could not register this device for notifications');

      setIsSubscribed(true);
      await poll();
      return true;
    } catch (err) {
      setError(describeError(err));
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [isSupported, user, poll]);

  const disableNotifications = useCallback(async () => {
    if (!user) return;
    setIsBusy(true);
    setError(null);

    try {
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsSubscribed(false);
      setIsBusy(false);
    }
  }, [user]);

  const updatePreferences = useCallback(
    async (patch: Partial<NotificationPreferences>) => {
      if (!user) return;
      const next = { ...(preferences as NotificationPreferences), ...patch };
      setPreferences(next);

      try {
        const res = await fetch('/api/push/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: patch }),
        });
        if (!res.ok) throw new Error('Could not save notification settings');
        const data = await res.json();
        if (data.preferences) setPreferences(data.preferences);
        if (!next.enabled) setIsSubscribed(false);
      } catch (err) {
        setError(describeError(err));
        setPreferences(preferences);
      }
    },
    [user, preferences]
  );

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await fetch('/api/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id] }),
        });
      } catch {
        // Ignore: the next poll re-syncs read state.
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      // Ignore: the next poll re-syncs read state.
    }
  }, []);

  const value = useMemo<NotificationContextType>(
    () => ({
      isSupported,
      permission,
      isSubscribed,
      isBusy,
      error,
      notifications,
      unreadCount,
      preferences,
      lastLink,
      enableNotifications,
      disableNotifications,
      updatePreferences,
      markAllRead,
      markRead,
      refresh,
      clearLink: () => setLastLink(null),
    }),
    [
      isSupported,
      permission,
      isSubscribed,
      isBusy,
      error,
      notifications,
      unreadCount,
      preferences,
      lastLink,
      enableNotifications,
      disableNotifications,
      updatePreferences,
      markAllRead,
      markRead,
      refresh,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
