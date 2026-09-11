import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { mastra } from "@/mastra";

export const maxDuration = 60;

export async function POST(req: Request) {
  const params = await req.json();

  try {
    const stream = await handleChatStream({
      mastra,
      agentId: "jobScout",
      version: "v7",
      params,
      onError: (error) =>
        error instanceof Error
          ? error.message
          : "The job search could not be completed. Try again shortly.",
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The job search could not be completed. Try again shortly.";
    const stream = createUIMessageStream({
      originalMessages: params.messages,
      onError: () => message,
      execute: async ({ writer }) => {
        writer.write({
          type: "error",
          errorText: message,
        } as Parameters<typeof writer.write>[0]);
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
}