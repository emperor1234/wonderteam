import React, { useEffect, useRef } from 'react';
import { tickFor, type LocalMessage, type ThreadCursor } from '../../lib/chat-sync.ts';
import { AlertCircle, Check, CheckCheck, Clock } from 'lucide-react';

interface MessageBubbleProps {
  message: LocalMessage;
  cursor: ThreadCursor | null;
  isOwn: boolean;
  showTail: boolean;
  showSender: boolean;
  senderName: string;
  senderImage: string;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function TickMark({ message, cursor }: { message: LocalMessage; cursor: ThreadCursor | null }) {
  const tick = tickFor(message, cursor);

  if (tick === 'pending') {
    return <Clock className="w-3.5 h-3.5 text-[#8C9791]" stroke="2" />;
  }
  if (tick === 'failed') {
    return <AlertCircle className="w-3.5 h-3.5 text-[#C84C4C]" stroke="2" />;
  }
  if (tick === 'sent') {
    return <Check className="w-3.5 h-3.5 text-[#8C9791]" stroke="2.5" />;
  }
  if (tick === 'delivered') {
    return <CheckCheck className="w-3.5 h-3.5 text-[#8C9791]" stroke="2.5" />;
  }
  return <CheckCheck className="w-3.5 h-3.5 text-[#7FD4F5]" stroke="2.5" />;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  cursor,
  isOwn,
  showTail,
  showSender,
  senderName,
  senderImage,
}) => {
  // A queued message can transiently carry last_error while it is still being
  // retried, so only an unsequenced message is treated as permanently failed.
  const failed = message.seq === null && Boolean(message.lastError);

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${showTail ? 'mt-2' : ''}`}>
      <div className={`flex items-end gap-2 max-w-[82%] ${isOwn ? 'flex-row-reverse' : ''}`}>
        {!isOwn && showTail && senderImage ? (
          <img
            src={senderImage}
            alt=""
            className="w-6 h-6 rounded-full object-cover border border-[#CBD6D1] mb-0.5 shrink-0"
          />
        ) : null}

        <div>
          {!isOwn && showSender && (
            <div className="text-[11px] font-semibold text-[#5E6964] mb-1 px-1">{senderName}</div>
          )}
          <div
            className={`px-3 py-2 text-[14px] leading-relaxed break-words whitespace-pre-wrap ${
              isOwn
                ? 'bg-[#146C4E] text-white rounded-[16px_16px_4px_16px]'
                : 'bg-white text-[#17211D] border border-[#E2E8E5] rounded-[16px_16px_16px_4px]'
            }`}
          >
            {message.body}
          </div>
          <div
            className={`flex items-center gap-1 mt-0.5 px-1 ${
              isOwn ? 'justify-end' : 'justify-start'
            }`}
          >
            <span className={`text-[10px] ${isOwn ? 'text-[#89928E]' : 'text-[#8C9791]'}`}>
              {formatTime(message.serverCreatedAt ?? message.clientCreatedAt)}
            </span>
            {isOwn && <TickMark message={message} cursor={cursor} />}
            {failed && (
              <span className="text-[10px] font-medium text-[#C84C4C]">Not sent</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ConversationProps {
  messages: LocalMessage[];
  cursor: ThreadCursor | null;
  currentUserId: string;
  peerName: string;
  peerImage: string;
  emptyLabel: string;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const Conversation: React.FC<ConversationProps> = ({
  messages,
  cursor,
  currentUserId,
  peerName,
  peerImage,
  emptyLabel,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  // Follow new messages only when the reader is already at the bottom, so
  // scrolling back through history is not yanked away by an incoming message.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !pinnedToBottom.current) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  const handleScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    pinnedToBottom.current = node.scrollHeight - node.scrollTop - node.clientHeight < 80;
  };

  let previousDay = '';
  let previousSender = '';

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-0.5"
    >
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-center px-6">
          <p className="text-xs text-[#89928E] leading-relaxed">{emptyLabel}</p>
        </div>
      ) : null}

      {messages.map((message) => {
        const stamp = message.serverCreatedAt ?? message.clientCreatedAt;
        const day = dayLabel(stamp);
        const showDayDivider = day !== previousDay;
        const isOwn = message.senderId === currentUserId;
        const showSender = !isOwn && message.senderId !== previousSender;

        previousDay = day;
        previousSender = message.senderId;

        return (
          <React.Fragment key={message.id}>
            {showDayDivider && (
              <div className="flex justify-center my-3">
                <span className="text-[10px] font-semibold text-[#89928E] bg-[#F7F9F8] border border-[#E2E8E5] px-2.5 py-1 rounded-full">
                  {day}
                </span>
              </div>
            )}
            <MessageBubble
              message={message}
              cursor={cursor}
              isOwn={isOwn}
              showTail={showDayDivider || showSender}
              showSender={showSender}
              senderName={peerName}
              senderImage={peerImage}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
};
