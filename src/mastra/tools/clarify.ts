import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const clarifyInputSchema = z.object({
  step: z
    .number()
    .int()
    .min(1)
    .max(2)
    .describe("1 for target role, 2 for target industry."),
  total: z
    .number()
    .int()
    .min(1)
    .max(2)
    .default(2)
    .describe("Total clarifying questions in this Optimize pass. Always 2."),
  topic: z
    .enum(["role", "industry"])
    .describe("role = target role; industry = company or industry."),
  question: z
    .string()
    .min(1)
    .describe("The targeting question shown on the ClarifyCard."),
  options: z
    .array(z.string().min(1))
    .min(2)
    .max(6)
    .describe(
      "Radio options. For role, derive from resume titles/seniority. For industry, use grounded company-type options plus Open to any.",
    ),
});

export const clarifyOutputSchema = clarifyInputSchema;

export const clarify = createTool({
  id: "clarify",
  description:
    "Ask one targeting question via ClarifyCard (role, then industry). Call once per question after the critique. Do not rewrite until both answers or skips arrive as the next user turns.",
  inputSchema: clarifyInputSchema,
  outputSchema: clarifyOutputSchema,
  execute: async (input) => ({
    step: input.step,
    total: input.total ?? 2,
    topic: input.topic,
    question: input.question,
    options: input.options,
  }),
});
