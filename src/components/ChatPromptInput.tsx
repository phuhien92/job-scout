"use client";

import type { ChatStatus } from "ai";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";

type Props = {
  status: ChatStatus;
  stop: () => void;
  placeholder: string;
  sendLabel: string;
  stopLabel: string;
  className?: string;
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
};

export function ChatPromptInput({
  status,
  stop,
  placeholder,
  sendLabel,
  stopLabel,
  className,
  onSend,
  disabled = false,
}: Props) {
  const isStreaming = status === "submitted" || status === "streaming";

  const handleSubmit = async (message: PromptInputMessage) => {
    const trimmed = message.text.trim();
    if (!trimmed || isStreaming || disabled) {
      return;
    }
    await onSend(trimmed);
  };

  return (
    <div className={`chat-ai-composer ${className ?? ""}`.trim()}>
      <PromptInputProvider>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              placeholder={placeholder}
              disabled={disabled}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div />
            <PromptInputSubmit
              status={status}
              onStop={stop}
              disabled={disabled && !isStreaming}
              aria-label={isStreaming ? stopLabel : sendLabel}
            />
          </PromptInputFooter>
        </PromptInput>
      </PromptInputProvider>
    </div>
  );
}
