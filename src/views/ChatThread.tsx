import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { useChat } from '../context/ChatContext.tsx';
import { Conversation } from '../components/chat/Conversation.tsx';
import { PromptInput } from '../components/chat/PromptInput.tsx';
import { ArrowLeft, WifiOff } from 'lucide-react';

interface ChatThreadProps {
  onBack: () => void;
}

export const ChatThread: React.FC<ChatThreadProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { activeThreadId, activeMessages, activeCursor, threadPeer, sendMessage, isOffline } =
    useChat();

  if (!activeThreadId) return null;

  const peer = threadPeer(activeThreadId);
  // A thread can outlive the account it was opened with, so fall back to a
  // neutral label rather than rendering "undefined".
  const peerName = peer?.name ?? 'Unknown member';
  const recipientId = peer?.id ?? null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#F7F9F8] text-[#17211D]">
      <header className="shrink-0 min-h-14 px-2 flex items-center gap-2 bg-white border-b border-[#E2E8E5] pt-[env(safe-area-inset-top,0px)]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="p-2 -ml-1 rounded-full text-[#0F513B] hover:bg-[#E7F4EE] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" stroke="2.2" />
        </button>

        {peer?.profileImage ? (
          <img
            src={peer.profileImage}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-[#CBD6D1]"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#E7F4EE] text-[#0F513B] flex items-center justify-center font-bold text-xs">
            {peerName[0]?.toUpperCase() ?? '?'}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-[#17211D] truncate">{peerName}</div>
          <div className="text-[10px] text-[#89928E]">
            {isOffline
              ? 'Waiting to reconnect'
              : peer?.role === 'admin'
                ? 'Team Lead'
                : 'Member'}
          </div>
        </div>

        {isOffline && <WifiOff className="w-4 h-4 text-[#B7791F] mr-2" />}
      </header>

      <Conversation
        messages={activeMessages}
        cursor={activeCursor}
        currentUserId={user?.id ?? ''}
        peerName={peerName}
        peerImage={peer?.profileImage ?? ''}
        emptyLabel={`No messages with ${peerName} yet. Say hello to start the conversation.`}
      />

      <PromptInput
        onSend={async (body) => {
          if (!recipientId) return;
          await sendMessage(recipientId, body);
        }}
        disabled={!recipientId}
        placeholder={
          isOffline ? 'Type a message — it sends when you reconnect' : 'Type a message'
        }
      />
    </div>
  );
};
