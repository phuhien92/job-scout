import { handleChatStream } from "@mastra/ai-sdk";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { getTranslations } from "next-intl/server";
import { mastra } from "@/mastra";
import { OPTIMIZE_INSTRUCTIONS } from "@/lib/optimize-instructions";
import { readWorkingMemory } from "@/lib/working-memory/store";

export const maxDuration = 60;

type ChatBody = {
  messages?: unknown;
  entry?: unknown;
  [key: string]: unknown;
};

export async function POST(req: Request) {
  const t = await getTranslations();
  const genericError = t("chatErrorGeneric");
  const body = (await req.json()) as ChatBody;
  const { entry, ...rest } = body;
  const params = { ...rest } as Parameters<typeof handleChatStream>[0]["params"];

  if (entry === "optimize") {
    const memory = await readWorkingMemory();
    const sourceText = memory.resume?.sourceText?.trim() ?? "";
    const fileName = memory.resume?.fileName ?? "unknown";
    const targetRole = memory.profile.targetRole.trim() || "(not set yet)";
    const targetIndustry = memory.profile.targetIndustry.trim() || "(not set yet)";
    params.instructions = [
      OPTIMIZE_INSTRUCTIONS,
      "",
      `Resume file name: ${fileName}`,
      `Current target role in working memory: ${targetRole}`,
      `Current target industry in working memory: ${targetIndustry}`,
      "Resume source text (evidence only; do not invent beyond this):",
      sourceText || "(empty — ask the user to upload a readable resume)",
    ].join("\n");
  }

  try {
    const stream = await handleChatStream({
      mastra,
      agentId: "jobScout",
      version: "v7",
      params,
      onError: (error) =>
        error instanceof Error ? error.message : genericError,
    });
    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : genericError;
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
