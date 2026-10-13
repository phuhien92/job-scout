"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useTranslations } from "next-intl";
import {
  AgentStatus,
  Alert,
  Button,
  ChatHeader,
  ChatMessage,
  ChatThread,
  Composer,
  EmptyState,
  PromptSuggestions,
  Prose,
  type PromptSuggestion,
} from "@robr0/design-system";
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

function renderText(message: UIMessage) {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part, index) => <p key={index}>{part.text}</p>);
}

export function ScoutChat() {
  const t = useTranslations();
  const [input, setInput] = useState("");
  const { messages, sendMessage, stop, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const inputRef = useRef(input);
  const inputRevisionRef = useRef(0);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const isStreaming = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  const handleSend = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;

    const submittedDraft = inputRef.current;
    const submittedRevision = inputRevisionRef.current;
    const submittedComposerDraft = submittedDraft.trim() === trimmed;

    try {
      await sendMessage({ text: trimmed });
      if (
        statusRef.current === "ready" &&
        submittedComposerDraft &&
        inputRevisionRef.current === submittedRevision
      ) {
        inputRef.current = "";
        setInput("");
      }
    } catch {
      // useChat exposes the request error; keep the draft so it can be retried.
    }
  };

  const suggestions: PromptSuggestion[] = SUGGESTION_KEYS.map((key) => ({
    id: key,
    label: t(key),
  }));

  return (
    <div className={styles.scout}>
      <ChatHeader title={t("scoutHeading")} />
      <ChatThread anchor ariaLabel={t("scoutThreadLabel")} className={styles.thread}>
        {!hasMessages && (
          <div className={styles.empty}>
            <EmptyState
              icon="travel_explore"
              title={t("scoutGreetingGuest")}
              description={t("scoutDescription")}
              action={
                <Button
                  href="/profile"
                  variant="secondary"
                  size="compact"
                  label={t("scoutUploadResume")}
                />
              }
            />
          </div>
        )}

        {messages.map((message, index) => {
          if (message.role === "user") {
            const text = messageText(message);
            if (!text) return null;

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

          const text = messageText(message);
          const nodes: ReactNode[] = [];

          if (text.length > 0) {
            nodes.push(
              <Prose key={`${message.id}-text`} size="sm">
                {renderText(message)}
              </Prose>,
            );
          }

          for (const [partIndex, part] of message.parts.entries()) {
            const name = toolPartName(part as { type: string; toolName?: string });
            if (name !== "search-jobs") continue;

            const toolCallId =
              "toolCallId" in part && typeof part.toolCallId === "string"
                ? part.toolCallId
                : `${message.id}-${partIndex}`;
            const state = "state" in part ? String(part.state) : "";

            if (state === "input-streaming" || state === "input-available") {
              nodes.push(
                <div key={`${toolCallId}-pending`} className={styles.toolState}>
                  <AgentStatus
                    state="working"
                    size="compact"
                    label={t("scoutTyping")}
                  />
                </div>,
              );
              continue;
            }

            if (state === "output-error") {
              const description =
                "errorText" in part && typeof part.errorText === "string"
                  ? part.errorText
                  : t("chatErrorGeneric");
              nodes.push(
                <Alert
                  key={`${toolCallId}-error`}
                  variant="error"
                  size="compact"
                  title={t("scoutErrorTitle")}
                  description={description}
                />,
              );
              continue;
            }

            if (state === "output-available" && "output" in part) {
              const jobs = asJobListings(part.output);
              if (jobs.length === 0) {
                nodes.push(
                  <EmptyState
                    key={`${toolCallId}-empty`}
                    icon="search_off"
                    size="compact"
                    variant="bordered"
                    title={t("scoutNoJobsTitle")}
                    description={t("scoutNoJobs")}
                  />,
                );
              } else {
                nodes.push(
                  <div
                    key={toolCallId}
                    className={styles.jobList}
                    aria-label={t("scoutResultsLabel")}
                  >
                    {jobs.map((job) => (
                      <JobCard key={`${toolCallId}-${job.url}`} job={job} />
                    ))}
                  </div>,
                );
              }
            }
          }

          const pending =
            index === messages.length - 1 && isStreaming && nodes.length === 0;

          if (nodes.length === 0 && !pending) return null;

          return (
            <ChatMessage
              key={message.id}
              role="assistant"
              author={t("scoutAssistantLabel")}
              pending={pending}
              pendingLabel={t("scoutTyping")}
              className={styles.assistantMessage}
            >
              {nodes}
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
              if (suggestion) void handleSend(suggestion.label);
            }}
            layout="wrap"
          />
        </div>
      )}

      <Composer
        value={input}
        onValueChange={(value) => {
          inputRef.current = value;
          inputRevisionRef.current += 1;
          setInput(value);
        }}
        onSubmit={(value) => void handleSend(value)}
        streaming={isStreaming}
        onStop={() => stop()}
        aiGlow
        name="scout-search"
        aria-label={t("scoutComposerLabel")}
        placeholder={t("scoutComposerPlaceholder")}
        sendLabel={t("scoutComposerSendLabel")}
        stopLabel={t("scoutComposerStopLabel")}
        className={styles.composer}
      />
    </div>
  );
}
