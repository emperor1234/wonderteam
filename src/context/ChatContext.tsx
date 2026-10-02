import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext.tsx';
import type { ChatDurability } from '../lib/chat-db.ts';
import {
  flushOutbox,
  getThreadCursor,
  initChatStore,
  listMessages,
  markThreadRead,
  pendingCount as readPendingCount,
  queueMessage,
  syncThread,
  tickFor,
  unreadInThread,
  type LocalMessage,
  type ThreadCursor,
  type TickStatus,
} from '../lib/chat-sync.ts';

/**
 * Polling drives serverless function invocations, which are the scarcest resource
 * on a Hobby/Free deployment, so the cadences are deliberately relaxed and both
 * timers are suppressed while the tab is hidden. Returning to the tab triggers
 * an immediate catch-up, so a stale background tab costs nothing.
 */
const THREAD_POLL_MS = 30_000;
const MESSAGE_POLL_MS = 10_000;

export interface ThreadPeer {
  id: string;
  name: string;
  role: string;
  profileImage: string;
}

export interface ThreadSummary {
  threadId: string;
  peer: ThreadPeer;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface ChatContextType {
  /** False when the deployment has no chat database configured. */
  enabled: boolean;
  /** 'opfs' when history is persisted on the device, 'memory' when it is not. */
  durability: ChatDurability | null;
  threads: ThreadSummary[];
  threadsLoading: boolean;
  totalUnread: number;
  pendingCount: number;
  isOffline: boolean;
  activeThreadId: string | null;
  activeMessages: LocalMessage[];
  activeCursor: ThreadCursor | null;
  openThread: (threadId: string) => void;
  closeThread: () => void;
  sendMessage: (recipientId: string, body: string) => Promise<void>;
  threadPeer: (threadId: string) => ThreadPeer | null;
  refreshThreads: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

/** True while the tab is the one the user is actually looking at. */
function tabIsVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isOffline } = useAuth();

  const [enabled, setEnabled] = useState<boolean>(true);
  /** null until the server has told us whether chat exists on this deployment. */
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [durability, setDurability] = useState<ChatDurability | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState<boolean>(false);
  const [totalUnread, setTotalUnread] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<LocalMessage[]>([]);
  const [activeCursor, setActiveCursor] = useState<ThreadCursor | null>(null);
  const [activeUnread, setActiveUnread] = useState<number>(0);

  const userId = user?.id ?? null;
  const syncingRef = useRef<boolean>(false);

  /**
   * Mirrors the open thread so an in-flight sync can tell whether its result is
   * still the one the user is looking at. Without this, switching conversations
   * while a request is in flight paints the previous thread's messages.
   */
  const activeThreadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setThreads([]);
      setTotalUnread(0);
      setActiveThreadId(null);
      activeThreadRef.current = null;
      setActiveMessages([]);
      setActiveCursor(null);
      return;
    }
    // Waiting for the first successful thread response avoids downloading the
    // local SQLite store on deployments where messaging is not configured.
    if (configured !== true) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await initChatStore();
        if (!cancelled) setDurability(result);
      } catch (err) {
        console.error('Chat store failed to open:', err);
        if (!cancelled) setDurability('memory');
      }
      try {
        // The outbox is persisted, so a reload can still have queued messages.
        // Seeding from it stops the "waiting to send" count from starting at zero.
        const queued = await readPendingCount();
        if (!cancelled) setPendingCount(queued);
      } catch {
        // Keep the count at zero if the outbox cannot be read.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, configured]);

  const refreshThreads = useCallback(async () => {
    if (!userId || !tabIsVisible()) return;
    setThreadsLoading(true);
    try {
      const res = await fetch('/api/chat/threads');
      if (res.status === 503) {
        setEnabled(false);
        setConfigured(false);
        return;
      }
      if (!res.ok) return;
      setConfigured(true);
      const data = await res.json();
      const list = (data.threads ?? []) as ThreadSummary[];
      setThreads(list);
      setTotalUnread(list.reduce((sum, t) => sum + (t.unreadCount || 0), 0));
    } catch {
      // Offline: keep whatever list we already have.
    } finally {
      setThreadsLoading(false);
    }
  }, [userId]);

  // Thread list drives the nav badge, so it polls on a slower cadence.
  useEffect(() => {
    if (!userId || !enabled) return;
    void refreshThreads();
    const timer = window.setInterval(() => {
      if (navigator.onLine) void refreshThreads();
    }, THREAD_POLL_MS);
    const onVisible = () => {
      if (tabIsVisible()) void refreshThreads();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, enabled, refreshThreads]);

  const refreshThread = useCallback(
    async (threadId: string, markRead = false) => {
      if (!userId || syncingRef.current) return;
      syncingRef.current = true;
      try {
        const outcome = await syncThread(threadId, { markRead, reportSeen: true });
        // The user may have switched conversations or closed the thread while the
        // request was in flight; in that case the result is stale.
        if (activeThreadRef.current !== threadId) return;
        setActiveMessages(outcome.messages);
        setActiveCursor(await getThreadCursor(threadId));
        if (outcome.received > 0) void refreshThreads();
      } catch (err) {
        if ((err as Error).message.includes('Sync failed (401')) {
          // Session expired; the app shell handles re-authentication.
        }
      } finally {
        syncingRef.current = false;
      }
    },
    [userId, refreshThreads]
  );

  // Queued messages go out immediately on reconnect.
  useEffect(() => {
    if (!userId) return;
    const flush = async () => {
      if (!navigator.onLine) return;
      try {
        const result = await flushOutbox();
        if (result.sent > 0 || result.failed > 0) {
          // Permanently rejected messages leave the outbox too, so both counters
          // have to move; leaving them would strand a non-zero total on screen.
          setPendingCount((n) => Math.max(0, n - result.sent - result.failed));
          const threadId = activeThreadRef.current;
          if (threadId && result.sent > 0) void refreshThread(threadId);
        }
      } catch {
        // Leave the outbox for the next attempt.
      }
    };
    void flush();
    window.addEventListener('online', flush);
    const timer = window.setInterval(() => {
      if (tabIsVisible()) void flush();
    }, MESSAGE_POLL_MS);
    return () => {
      window.removeEventListener('online', flush);
      window.clearInterval(timer);
    };
  }, [userId, refreshThread]);

  // Full message sync only for the thread actually on screen. Every tick marks
  // read, because a message that arrives while the thread stays open would
  // otherwise never advance the read cursor and would still be counted as unread
  // in the conversation list after the member closes it.
  useEffect(() => {
    if (!userId || !activeThreadId) return;
    void refreshThread(activeThreadId, true);
    const timer = window.setInterval(() => {
      if (navigator.onLine && tabIsVisible()) void refreshThread(activeThreadId, true);
    }, MESSAGE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [userId, activeThreadId, refreshThread]);

  const openThread = useCallback(
    async (threadId: string) => {
      activeThreadRef.current = threadId;
      setActiveThreadId(threadId);
      // Paint from the local cache first, then reconcile with the server.
      try {
        const cached = await listMessages(threadId);
        if (activeThreadRef.current !== threadId) return;
        setActiveMessages(cached);
        setActiveCursor(await getThreadCursor(threadId));
      } catch {
        if (activeThreadRef.current === threadId) setActiveMessages([]);
      }
    },
    []
  );

  const closeThread = useCallback(() => {
    const threadId = activeThreadRef.current;
    activeThreadRef.current = null;
    setActiveThreadId(null);
    setActiveMessages([]);
    setActiveCursor(null);
    setActiveUnread(0);

    if (threadId && userId) {
      // Polling stops on close, so this is the only chance to record the read
      // cursor for everything the member actually saw.
      void markThreadRead(threadId, userId)
        .then(() => refreshThreads())
        .catch(() => undefined);
    }
  }, [userId, refreshThreads]);

  const sendMessage = useCallback(
    async (recipientId: string, body: string) => {
      if (!userId) return;
      const trimmed = body.trim();
      if (!trimmed) return;

      await queueMessage({ senderId: userId, recipientId, body: trimmed });
      setPendingCount((n) => n + 1);

      const repaint = async () => {
        const threadId = activeThreadRef.current;
        if (!threadId) return;
        const threadMessages = await listMessages(threadId);
        if (activeThreadRef.current !== threadId) return;
        setActiveMessages(threadMessages);
        setActiveCursor(await getThreadCursor(threadId));
      };

      await repaint();

      // Push straight away instead of waiting for the next poll tick, so the
      // pending tick turns into a sent tick while the sender is still watching.
      // flushOutbox is guarded against overlapping runs.
      if (navigator.onLine) {
        try {
          const result = await flushOutbox();
          if (result.sent > 0 || result.failed > 0) {
            setPendingCount((n) => Math.max(0, n - result.sent - result.failed));
          }
        } catch {
          // Stays queued for the next flush.
        }
        await repaint();
      }
    },
    [userId]
  );

  const threadPeer = useCallback(
    (threadId: string) => threads.find((t) => t.threadId === threadId)?.peer ?? null,
    [threads]
  );

  // Local unread count for the open thread, so the badge clears as soon as the
  // messages are marked read rather than waiting for the next server round trip.
  useEffect(() => {
    if (!activeThreadId || !userId) {
      setActiveUnread(0);
      return;
    }
    let cancelled = false;
    void unreadInThread(activeThreadId, userId)
      .then((n) => {
        if (!cancelled) setActiveUnread(n);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeThreadId, userId, activeMessages]);

  // A background tab stops polling, so the read cursor is reported directly when
  // the user comes back rather than waiting for the next sync tick.
  useEffect(() => {
    if (!userId) return;
    const reportRead = async () => {
      const threadId = activeThreadRef.current;
      if (!threadId || !tabIsVisible()) return;
      try {
        await markThreadRead(threadId, userId);
        void refreshThreads();
      } catch {
        // Ignore: the next sync reports the same cursor.
      }
    };
    document.addEventListener('visibilitychange', reportRead);
    window.addEventListener('focus', reportRead);
    return () => {
      document.removeEventListener('visibilitychange', reportRead);
      window.removeEventListener('focus', reportRead);
    };
  }, [userId, refreshThreads]);

  /**
   * The badge is derived from the server's per-thread unread counts, which are
   * the only numbers that account for messages this device has not downloaded.
   * Subtracting a locally computed count instead would erase the unread totals of
   * every other thread.
   */
  const badgeUnread = useMemo(() => {
    if (!activeThreadId) return totalUnread;
    return threads.reduce(
      (sum, t) => sum + (t.threadId === activeThreadId ? 0 : t.unreadCount || 0),
      0
    );
  }, [threads, totalUnread, activeThreadId]);

  const value: ChatContextType = {
    enabled,
    durability,
    threads,
    threadsLoading,
    totalUnread: badgeUnread,
    pendingCount,
    isOffline,
    activeThreadId,
    activeMessages,
    activeCursor,
    openThread,
    closeThread,
    sendMessage,
    threadPeer,
    refreshThreads,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export type { LocalMessage, ThreadCursor, TickStatus };
export { tickFor };
