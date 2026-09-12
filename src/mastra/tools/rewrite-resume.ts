import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { factGateDraft } from "@/lib/resume/fact-gate";
import { readWorkingMemory } from "@/lib/working-memory/store";

export const rewriteResumeInputSchema = z.object({
  title: z
    .string()
    .min(1)
    .describe('Artifact title, typically "{Name} Resume".'),
  subtitle: z
    .string()
    .min(1)
    .describe("Target role used as the artifact subtitle."),
  markdown: z
    .string()
    .min(1)
    .describe(
      "Full ATS-safe markdown resume. Evidence-only: same facts as source, reordered and reframed for the chosen role/industry. Never invent employers, jobs, dates, or metrics.",
    ),
});

export const rewriteResumeOutputSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  markdown: z.string(),
  unsupported: z
    .array(z.string())
    .describe("Draft lines whose numeric claims are not found in the source resume."),
});

export const rewriteResume = createTool({
  id: "rewrite-resume",
  description:
    "Produce the targeted resume draft after both clarify answers (or skips). Pass evidence-only markdown. Returns a ResumeArtifact payload; optional fact-gate flags unsupported numeric claims.",
  inputSchema: rewriteResumeInputSchema,
  outputSchema: rewriteResumeOutputSchema,
  execute: async ({ title, subtitle, markdown }) => {
    const memory = await readWorkingMemory();
    const sourceText = memory.resume?.sourceText ?? "";
    const gated = factGateDraft(markdown, sourceText);
    const name = memory.profile.name.trim();
    const resolvedTitle =
      title.trim() || (name ? `${name} Resume` : "Resume");
    const resolvedSubtitle =
      subtitle.trim() ||
      memory.profile.targetRole.trim() ||
      memory.profile.titles[0] ||
      "Target role";

    return {
      title: resolvedTitle.slice(0, 160),
      subtitle: resolvedSubtitle.slice(0, 160),
      markdown: gated.markdown,
      unsupported: gated.unsupported,
    };
  },
});
