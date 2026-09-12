import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { readWorkingMemory } from "@/lib/working-memory/store";

export const analyzeResumeInputSchema = z.object({
  reason: z
    .string()
    .optional()
    .describe("Optional note about why analysis is starting."),
});

export const analyzeResumeOutputSchema = z.object({
  hasResume: z.boolean(),
  fileName: z.string(),
  name: z.string(),
  titles: z.array(z.string()),
  skills: z.array(z.string()),
  seniority: z.array(z.string()),
  targetRoleSuggestions: z.array(z.string()),
  sourceCharCount: z.number().int().nonnegative(),
});

export const analyzeResume = createTool({
  id: "analyze-resume",
  description:
    "Load the uploaded resume from working memory before critiquing. Call this first on Optimize. Returns titles and skills for role options; never invents content.",
  inputSchema: analyzeResumeInputSchema,
  outputSchema: analyzeResumeOutputSchema,
  execute: async () => {
    const memory = await readWorkingMemory();
    const sourceText = memory.resume?.sourceText?.trim() ?? "";
    const titles = memory.profile.titles.slice(0, 8);
    const suggestions =
      memory.profile.targetRoles.length > 0
        ? memory.profile.targetRoles.slice(0, 4)
        : titles.slice(0, 4);

    return {
      hasResume: Boolean(sourceText),
      fileName: memory.resume?.fileName ?? "",
      name: memory.profile.name,
      titles,
      skills: memory.profile.skills.slice(0, 24),
      seniority: memory.profile.seniority.slice(0, 6),
      targetRoleSuggestions: suggestions,
      sourceCharCount: sourceText.length,
    };
  },
});
