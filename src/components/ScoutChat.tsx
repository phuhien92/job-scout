"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import {
  Alert,
  ChatHeader,
  ChatMarker,
  PromptSuggestions,
  type PromptSuggestion,
} from "@robr0/design-system";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { ChatPromptInput } from "@/components/ChatPromptInput";
import { JobCard } from "@/components/JobCard";
import {
  asJobListings,
  messageText,
  toolPartName,
} from "@/lib/chat/tool-parts";
import styles from "./ScoutChat.module.css";

const SUGGESTION_KEYS = [
  "scoutSuggestionRemote",
  "scoutSuggestionFullstack",
  "scoutSuggestionDesign",
] as const;

export function ScoutChat() {
  const t = useTranslations();
  const { messages, sendMessage, stop, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const handleSend = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    await sendMessage({ text: trimmed });
  };

  const suggestions: PromptSuggestion[] = SUGGESTION_KEYS.map((key) => ({
    id: key,
    label: t(key),
  }));

  return (
    <div className={styles.scout}>
      <ChatHeader title={t("scoutHeading")} />
      <Conversation
        className={`chat-ai-thread ${styles.thread}`}
        aria-label={t("scoutThreadLabel")}
      >
        <ConversationContent>
          {!hasMessages && <ChatMarker line>{t("scoutDescription")}</ChatMarker>}

          {messages.map((message, index) => {
            if (message.role === "user") {
              const text = messageText(message);
              if (!text) return null;
              return (
                <Message key={message.id} from="user">
                  <MessageContent>
                    <p>{text}</p>
                  </MessageContent>
                </Message>
              );
            }

            const text = messageText(message);
            const pending =
              index === messages.length - 1 && isStreaming && text.length === 0;
            const nodes = [];

            if (text.length > 0) {
              nodes.push(
                <MessageResponse key={`${message.id}-text`}>{text}</MessageResponse>,
              );
            }

            for (const [partIndex, part] of message.parts.entries()) {
              const name = toolPartName(part as { type: string; toolName?: string });
              const toolCallId =
                "toolCallId" in part && typeof part.toolCallId === "string"
                  ? part.toolCallId
                  : `${message.id}-${partIndex}`;
              const state = "state" in part ? String(part.state) : "";

              if (name === "search-jobs") {
                if (state === "input-streaming" || state === "input-available") {
                  nodes.push(
                    <p key={`${toolCallId}-pending`} className={styles.pending}>
                      {t("scoutTyping")}
                    </p>,
                  );
                }
                if (state === "output-available" && "output" in part) {
                  const jobs = asJobListings(part.output);
                  if (jobs.length === 0) {
                    nodes.push(
                      <p key={`${toolCallId}-empty`} className={styles.pending}>
                        {t("scoutNoJobs")}
                      </p>,
                    );
                  } else {
                    nodes.push(
                      <div key={toolCallId} className={styles.jobList}>
                        {jobs.map((job) => (
                          <JobCard key={`${toolCallId}-${job.url}`} job={job} />
                        ))}
                      </div>,
                    );
                  }
                }
              }
            }

            if (pending && nodes.length === 0) {
              return (
                <Message key={message.id} from="assistant">
                  <MessageContent>
                    <p className={styles.pending}>{t("scoutTyping")}</p>
                  </MessageContent>
                </Message>
              );
            }

            if (nodes.length === 0) return null;

            return (
              <Message key={message.id} from="assistant">
                <MessageContent className={`w-full max-w-full ${styles.assistantContent}`}>
                  {nodes}
                </MessageContent>
              </Message>
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
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {!hasMessages && (
        <div className={styles.suggestions}>
          <PromptSuggestions
            ariaLabel={t("scoutSuggestionsLabel")}
            suggestions={suggestions}
            onValueChange={(id) => {
              const suggestion = suggestions.find((item) => item.id === id);
              if (suggestion) void handleSend(suggestion.label);
            }}
            layout="wrap"
          />
        </div>
      )}

      <ChatPromptInput
        status={status}
        stop={stop}
        placeholder={t("scoutComposerPlaceholder")}
        sendLabel={t("scoutComposerSendLabel")}
        stopLabel={t("scoutComposerStopLabel")}
        onSend={handleSend}
      />
    </div>
  );
}
