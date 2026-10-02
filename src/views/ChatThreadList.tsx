import React from 'react';
import { useChat } from '../context/ChatContext.tsx';
import { MessageCircle, RefreshCw, AlertTriangle } from 'lucide-react';

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface ChatThreadListProps {
  onOpenThread: (threadId: string) => void;
}

export const ChatThreadList: React.FC<ChatThreadListProps> = ({ onOpenThread }) => {
  const { enabled, threads, threadsLoading, durability, refreshThreads, pendingCount } = useChat();

  // The tab can still be the active view when the deployment turns out to have
  // no chat database, so explain that rather than rendering a blank screen.
  if (!enabled) {
    return (
      <div className="max-w-2xl mx-auto">
        <h2 className="text-sm font-bold text-[#17211D] mb-1 px-1">Messages</h2>
        <p className="text-[11px] text-[#89928E] mb-3 px-1">Direct messages between members</p>

        <div className="px-4 py-4 bg-white border border-[#E2E8E5] rounded-[14px]">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#B7791F] shrink-0 mt-0.5" />
            <div className="text-[12px] text-[#5E6964] leading-relaxed">
              <p className="font-bold text-[#17211D] mb-1">Messaging is not switched on yet</p>
              <p>
                This deployment has no chat database connected, so conversations cannot be
                created. Everything else in WonderTeam keeps working normally.
              </p>
              <p className="mt-2 text-[11px] text-[#89928E]">
                To turn it on, add the two chat variables to the deployment and redeploy:
              </p>
              <ul className="mt-1 space-y-0.5 text-[11px] font-medium text-[#17211D]">
                <li>
                  <code className="text-[#146C4E]">TURSO_DATABASE_URL</code>
                </li>
                <li>
                  <code className="text-[#146C4E]">TURSO_AUTH_TOKEN</code>
                </li>
              </ul>
              <p className="mt-2 text-[11px] text-[#89928E]">
                Create a free database at turso.tech. No code change is needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
        <div>
          <h2 className="text-sm font-bold text-[#17211D]">Messages</h2>
          <p className="text-[11px] text-[#89928E] mt-0.5">
            {threads.length === 0
              ? 'No conversations yet'
              : `${threads.length} conversation${threads.length === 1 ? '' : 's'}`}
            {pendingCount > 0 ? ` · ${pendingCount} waiting to send` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshThreads()}
          aria-label="Refresh conversations"
          className="p-2 rounded-[10px] text-[#5E6964] hover:bg-[#F7F9F8] transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${threadsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {durability === 'memory' && (
        <div className="flex items-start gap-2 mb-3 px-3 py-2.5 bg-[#FFF6E5] border border-[#F0DDB4] rounded-[12px]">
          <AlertTriangle className="w-4 h-4 text-[#B7791F] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#8A5D17] leading-relaxed">
            Offline storage is unavailable in this browser, so chat history will not be
            saved on this device. Messages still send and arrive normally.
          </p>
        </div>
      )}

      {threads.length === 0 && !threadsLoading ? (
        <div className="py-16 text-center">
          <MessageCircle className="w-8 h-8 text-[#CBD6D1] mx-auto mb-3" stroke="1.5" />
          <p className="text-xs text-[#89928E] leading-relaxed px-6">
            No one to message yet. Conversations appear here once your team is set up.
          </p>
        </div>
      ) : null}

      <div className="space-y-1.5">
        {threads.map((thread) => (
          <button
            key={thread.threadId}
            type="button"
            onClick={() => onOpenThread(thread.threadId)}
            className="w-full flex items-center gap-3 p-3 bg-white border border-[#E2E8E5] rounded-[14px] hover:border-[#CBD6D1] transition-colors text-left"
          >
            {thread.peer.profileImage ? (
              <img
                src={thread.peer.profileImage}
                alt=""
                className="w-11 h-11 rounded-full object-cover border border-[#CBD6D1] shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#E7F4EE] text-[#0F513B] flex items-center justify-center font-bold text-sm shrink-0">
                {thread.peer.name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold text-[#17211D] truncate">
                  {thread.peer.name}
                </span>
                <span className="text-[10px] text-[#89928E] shrink-0">
                  {relativeTime(thread.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p
                  className={`text-[12px] truncate flex-1 ${
                    thread.unreadCount > 0
                      ? 'text-[#17211D] font-medium'
                      : 'text-[#89928E]'
                  }`}
                >
                  {thread.lastMessage ?? 'No messages yet'}
                </p>
                {thread.unreadCount > 0 && (
                  <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#146C4E] text-white text-[10px] font-bold flex items-center justify-center">
                    {thread.unreadCount > 99 ? '99+' : thread.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
