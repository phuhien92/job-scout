"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  AgentStatus,
  Alert,
  DocumentChip,
  ToastProvider,
  type DocumentChipFileType,
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

import type { ResumeFileType, ResumeSummary } from "@/lib/working-memory/types";
import {
  asClarifyPayload,
  asRewritePayload,
  messageText,
  toolPartName,
  type ClarifyPayload,
} from "@/lib/chat/tool-parts";

import { ClarifyCard } from "./ClarifyCard";
import styles from "./Optimize.module.css";
import { ResumeArtifact } from "./ResumeArtifact";
import { TargetingSummary, type TargetingAnswer } from "./TargetingSummary";

interface Props {
  resume: ResumeSummary;
}

type ClarifyAnswer = TargetingAnswer & {
  toolCallId: string;
  topic: "role" | "industry";
};

function chipType(fileType: ResumeFileType): DocumentChipFileType {
  switch (fileType) {
    case "pdf":
      return "pdf";
    case "docx":
      return "doc";
    case "txt":
      return "generic";
  }
}

function fileTypeMeta(fileType: ResumeFileType, t: (key: string) => string): string {
  switch (fileType) {
    case "pdf":
      return t("optimizeFileTypePdf");
    case "docx":
      return t("optimizeFileTypeDoc");
    case "txt":
      return t("optimizeFileTypeTxt");
  }
}

async function persistTargeting(patch: {
  targetRole?: string;
  targetIndustry?: string;
}) {
  try {
    await fetch("/api/optimize/targeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch {
    // Non-blocking: conversation still advances even if persist fails.
  }
}

function OptimizeChatInner({ resume }: Props) {
  const t = useTranslations();
  const [answers, setAnswers] = useState<ClarifyAnswer[]>([]);

  const seedText = t("optimizeSeedMessage");
  const skippedLabel = t("optimizeClarifySkipped");

  const { messages, sendMessage, regenerate, stop, status, error, clearError } =
    useChat({
      transport: new DefaultChatTransport({
        api: "/api/chat",
        body: { entry: "optimize" },
      }),
    });

  const isStreaming = status === "submitted" || status === "streaming";

  // Seed once when the session opens. React Strict Mode runs effect setup →
  // cleanup → setup; useChat's cleanup calls stop(), which aborts the first
  // request but leaves the optimistic user message. Defer the send so the
  // aborted pass is cancelled, then recover orphan seeds via regenerate.
  useEffect(() => {
    if (status !== "ready") return;
    if (messages.some((message) => message.role === "assistant")) return;

    const first = messages[0];
    const isOrphanSeed =
      messages.length === 1 &&
      first?.role === "user" &&
      messageText(first) === seedText;

    if (messages.length > 0 && !isOrphanSeed) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (isOrphanSeed) {
        void regenerate();
      } else {
        void sendMessage({ text: seedText });
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [status, messages, seedText, sendMessage, regenerate]);

  const answeredIds = useMemo(
    () => new Set(answers.map((item) => item.toolCallId)),
    [answers],
  );

  const summaryItems = useMemo(() => {
    const byTopic = new Map<string, ClarifyAnswer>();
    for (const answer of answers) {
      byTopic.set(answer.topic, answer);
    }
    return ["role", "industry"]
      .map((topic) => byTopic.get(topic))
      .filter((item): item is ClarifyAnswer => Boolean(item))
      .map(({ question, answer }) => ({ question, answer }));
  }, [answers]);

  const showSummary = summaryItems.length >= 2;

  const visibleMessages = useMemo(
    () =>
      messages.filter((message, index) => {
        if (index === 0 && message.role === "user" && messageText(message) === seedText) {
          return false;
        }
        return true;
      }),
    [messages, seedText],
  );

  const summaryHostMessageId = useMemo(() => {
    if (!showSummary) return null;
    const answerIds = new Set(answers.map((item) => item.toolCallId));
    let fallbackId: string | null = null;

    for (let messageIndex = 0; messageIndex < visibleMessages.length; messageIndex += 1) {
      const message = visibleMessages[messageIndex]!;
      if (message.role !== "assistant") continue;

      const text = messageText(message);
      const hasRewrite = message.parts.some((part) => {
        const name = toolPartName(part as { type: string; toolName?: string });
        return name === "rewrite-resume";
      });
      if (text.length === 0 && !hasRewrite) continue;

      fallbackId = message.id;

      const priorClarifyAnswered = visibleMessages.slice(0, messageIndex).some((prior) =>
        prior.parts.some((part) => {
          const name = toolPartName(part as { type: string; toolName?: string });
          if (name !== "clarify") return false;
          const id =
            "toolCallId" in part && typeof part.toolCallId === "string"
              ? part.toolCallId
              : "";
          return id ? answerIds.has(id) : false;
        }),
      );

      if (priorClarifyAnswered || hasRewrite) {
        return message.id;
      }
    }
    return fallbackId;
  }, [answers, showSummary, visibleMessages]);

  const handleSend = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    await sendMessage({ text: trimmed });
  };

  const handleClarifyContinue = async (
    toolCallId: string,
    payload: ClarifyPayload,
    answer: string,
  ) => {
    if (answeredIds.has(toolCallId) || isStreaming) return;
    setAnswers((prev) => [
      ...prev.filter((item) => item.toolCallId !== toolCallId),
      {
        toolCallId,
        topic: payload.topic,
        question: payload.question,
        answer,
      },
    ]);
    if (payload.topic === "role") {
      await persistTargeting({ targetRole: answer });
    } else {
      await persistTargeting({ targetIndustry: answer });
    }
    await sendMessage({
      text:
        payload.topic === "role"
          ? t("optimizeClarifyAnswerRole", { answer })
          : t("optimizeClarifyAnswerIndustry", { answer }),
    });
  };

  const handleClarifySkip = async (toolCallId: string, payload: ClarifyPayload) => {
    if (answeredIds.has(toolCallId) || isStreaming) return;
    setAnswers((prev) => [
      ...prev.filter((item) => item.toolCallId !== toolCallId),
      {
        toolCallId,
        topic: payload.topic,
        question: payload.question,
        answer: skippedLabel,
      },
    ]);
    if (payload.topic === "role") {
      await persistTargeting({ targetRole: "" });
    } else {
      await persistTargeting({ targetIndustry: "" });
    }
    await sendMessage({
      text:
        payload.topic === "role"
          ? t("optimizeClarifySkipRole")
          : t("optimizeClarifySkipIndustry"),
    });
  };

  const waitingForCritique =
    status !== "error" &&
    !messages.some((message) => message.role === "assistant") &&
    (isStreaming ||
      messages.length === 0 ||
      (messages.length === 1 &&
        messages[0]?.role === "user" &&
        messageText(messages[0]) === seedText));

  return (
    <div className={styles.chat}>
      <div className={styles.chipBar}>
        <DocumentChip
          name={resume.fileName}
          fileType={chipType(resume.fileType)}
          meta={fileTypeMeta(resume.fileType, t)}
        />
      </div>

      <Conversation
        className={`chat-ai-thread ${styles.thread}`}
        aria-label={t("optimizeThreadLabel")}
      >
        <ConversationContent>
          {waitingForCritique && (
            <div className={styles.status}>
              <AgentStatus state="working" label={t("optimizeAnalyzing")} />
            </div>
          )}

          {visibleMessages.map((message, index) => {
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

            const parts = message.parts;
            const text = messageText(message);
            const pending =
              index === visibleMessages.length - 1 && isStreaming && text.length === 0;

            const nodes: ReactNode[] = [];
            const shouldLeadWithSummary = summaryHostMessageId === message.id;

            if (shouldLeadWithSummary) {
              nodes.push(
                <div key="targeting-summary" className={styles.toolBlock}>
                  <TargetingSummary items={summaryItems} />
                </div>,
              );
            }

            if (text.length > 0) {
              nodes.push(
                <MessageResponse key={`${message.id}-text`}>{text}</MessageResponse>,
              );
            }

            for (const [partIndex, part] of parts.entries()) {
              const name = toolPartName(part as { type: string; toolName?: string });
              const toolCallId =
                "toolCallId" in part && typeof part.toolCallId === "string"
                  ? part.toolCallId
                  : `${message.id}-${partIndex}`;
              const state = "state" in part ? String(part.state) : "";

              if (name === "analyze-resume") {
                if (state === "input-streaming" || state === "input-available") {
                  nodes.push(
                    <div key={`${toolCallId}-status`} className={styles.toolStatus}>
                      <AgentStatus state="working" label={t("optimizeAnalyzing")} />
                    </div>,
                  );
                }
                continue;
              }

              if (name === "clarify") {
                const inputPart =
                  "input" in part ? asClarifyPayload(part.input) : null;
                const output =
                  "output" in part ? asClarifyPayload(part.output) : null;
                const payload = output ?? inputPart;
                if (!payload) continue;
                if (answeredIds.has(toolCallId)) continue;

                const topicLabel =
                  payload.topic === "industry"
                    ? t("optimizeClarifyTopicIndustry")
                    : t("optimizeClarifyTopicRole");

                nodes.push(
                  <div key={toolCallId} className={styles.toolBlock}>
                    <ClarifyCard
                      step={payload.step}
                      total={payload.total}
                      topicLabel={topicLabel}
                      question={payload.question}
                      options={payload.options}
                      disabled={isStreaming}
                      onContinue={(answer) =>
                        void handleClarifyContinue(toolCallId, payload, answer)
                      }
                      onSkip={() => void handleClarifySkip(toolCallId, payload)}
                    />
                  </div>,
                );
                continue;
              }

              if (name === "rewrite-resume") {
                if (state === "input-streaming" || state === "input-available") {
                  nodes.push(
                    <div key={`${toolCallId}-drafting`} className={styles.toolStatus}>
                      <AgentStatus state="working" label={t("optimizeDrafting")} />
                    </div>,
                  );
                }
                const output =
                  "output" in part && state === "output-available"
                    ? asRewritePayload(part.output)
                    : null;
                const inputFallback =
                  "input" in part &&
                  (state === "input-available" || state === "output-available")
                    ? asRewritePayload(part.input)
                    : null;
                const artifact = output ?? inputFallback;
                if (artifact && state === "output-available") {
                  nodes.push(
                    <div key={toolCallId} className={styles.toolBlock}>
                      <ResumeArtifact
                        title={artifact.title}
                        subtitle={artifact.subtitle}
                        markdown={artifact.markdown}
                      />
                    </div>,
                  );
                }
              }
            }

            if (pending && nodes.length === 0) {
              return null;
            }

            if (nodes.length === 0) {
              return null;
            }

            return (
              <Message key={message.id} from="assistant">
                <MessageContent className={`w-full max-w-full ${styles.assistantContent}`}>
                  <div className={styles.messageStack}>{nodes}</div>
                </MessageContent>
              </Message>
            );
          })}

          {status === "error" && error && (
            <div className={styles.chatError}>
              <Alert
                variant="error"
                title={t("optimizeErrorTitle")}
                description={error.message}
                dismissible
                onDismiss={() => clearError()}
              />
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <ChatPromptInput
        status={status}
        stop={stop}
        placeholder={t("optimizeComposerPlaceholder")}
        sendLabel={t("optimizeComposerSendLabel")}
        stopLabel={t("optimizeComposerStopLabel")}
        onSend={handleSend}
      />
    </div>
  );
}

export function OptimizeChat({ resume }: Props) {
  return (
    <ToastProvider position="bottom-center">
      <OptimizeChatInner resume={resume} />
    </ToastProvider>
  );
}
