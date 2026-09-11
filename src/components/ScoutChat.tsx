"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useTranslations } from "next-intl";
import {
  Alert,
  ChatHeader,
  ChatMarker,
  ChatMessage,
  ChatThread,
  Composer,
  PromptSuggestions,
  Prose,
  type PromptSuggestion,
} from "@robr0/design-system";
import styles from "./ScoutChat.module.css";

const SUGGESTION_KEYS = [
  "scoutSuggestionRemote",
  "scoutSuggestionFullstack",
  "scoutSuggestionDesign",
] as const;

export function ScoutChat() {
  const t = useTranslations();
  const [input, setInput] = useState("");
  const { messages, sendMessage, stop, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const handleSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    try {
      await sendMessage({ text: trimmed });
      setInput("");
    } catch {
      setInput(value);
    }
  };

  const suggestions: PromptSuggestion[] = SUGGESTION_KEYS.map((key) => ({
    id: key,
    label: t(key),
  }));

  const renderText = (message: UIMessage) => {
    const textParts = message.parts.filter((part) => part.type === "text");
    return textParts.map((part, index) => <p key={index}>{part.text}</p>);
  };

  return (
    <div className={styles.scout}>
      <ChatHeader title={t("scoutHeading")} />
      <ChatThread anchor ariaLabel={t("scoutThreadLabel")} className={styles.thread}>
        {!hasMessages && <ChatMarker line>{t("scoutDescription")}</ChatMarker>}

        {messages.map((message, index) => {
          if (message.role === "user") {
            return (
              <ChatMessage
                key={message.id}
                role="user"
                author={t("scoutUserLabel")}
                bubble
                tail
              >
                {renderText(message)}
              </ChatMessage>
            );
          }

          const textParts = message.parts.filter((part) => part.type === "text");
          const pending =
            index === messages.length - 1 && isStreaming && textParts.length === 0;

          return (
            <ChatMessage
              key={message.id}
              role="assistant"
              author={t("scoutAssistantLabel")}
              pending={pending}
              pendingLabel={t("scoutTyping")}
            >
              {textParts.length > 0 && <Prose size="sm">{renderText(message)}</Prose>}
            </ChatMessage>
          );
        })}

        {status === "error" && error && (
          <div className={styles.error}>
            <Alert
              variant="error"
              title={t("scoutErrorTitle")}
              description={error.message}
              dismissible
              onDismiss={() => clearError()}
            />
          </div>
        )}
      </ChatThread>

      {!hasMessages && (
        <div className={styles.suggestions}>
          <PromptSuggestions
            ariaLabel={t("scoutSuggestionsLabel")}
            suggestions={suggestions}
            onValueChange={(id) => {
              const suggestion = suggestions.find((item) => item.id === id);
              if (suggestion) void handleSubmit(suggestion.label);
            }}
            layout="wrap"
          />
        </div>
      )}

      <Composer
        value={input}
        onValueChange={setInput}
        onSubmit={(value) => void handleSubmit(value)}
        streaming={isStreaming}
        onStop={() => stop()}
        aiGlow
        placeholder={t("scoutComposerPlaceholder")}
        sendLabel={t("scoutComposerSendLabel")}
        stopLabel={t("scoutComposerStopLabel")}
        className={styles.composer}
      />
    </div>
  );
}