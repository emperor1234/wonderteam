import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';

interface PromptInputProps {
  onSend: (body: string) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_LENGTH = 4000;

export const PromptInput: React.FC<PromptInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message',
}) => {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Grow with the content up to a ceiling, then scroll internally.
  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, 120)}px`;
  }, [value]);

  const submit = async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled || sending) return;
    setSending(true);
    try {
      // Clear optimistically, but give the text back if the send throws, so a
      // failure while offline can never swallow a typed message.
      setValue('');
      await onSend(trimmed);
    } catch (err) {
      setValue((current) => (current ? `${current}\n${trimmed}` : trimmed));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !sending;

  return (
    <div className="border-t border-[#E2E8E5] bg-white px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Message"
          className="flex-1 resize-none text-[14px] leading-relaxed px-3 py-2.5 rounded-[20px] bg-[#F7F9F8] border border-[#E2E8E5] text-[#17211D] placeholder:text-[#89928E] focus:outline-none focus:border-[#146C4E] focus:bg-white transition-colors max-h-[120px] min-h-[42px] disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!canSend}
          aria-label="Send message"
          className="w-11 h-11 shrink-0 rounded-full bg-[#146C4E] text-white flex items-center justify-center disabled:bg-[#CBD6D1] disabled:text-[#F7F9F8] transition-colors"
        >
          <Send className="w-[18px] h-[18px]" stroke="2.5" />
        </button>
      </div>
    </div>
  );
};
