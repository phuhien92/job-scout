import { z } from "zod";

export const APPLICATION_PLAN_VERSION = 1 as const;
export const MAX_REQUEST_BYTES = 64 * 1024;
export const MAX_RESPONSE_BYTES = 128 * 1024;
export const MAX_FIELDS = 100;

// IDs are opaque references owned by the scanner/backend, never DOM selectors.
const id = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/);
const text = (max: number) => z.string().min(1).max(max);
const webUrl = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    } catch {
      return false;
    }
  }, "Expected an HTTP(S) URL without credentials");
const unique = (items: string[]) => new Set(items).size === items.length;

export const applicationFieldSchema = z
  .strictObject({
    fieldId: id,
    label: text(300),
    type: z.enum([
      "text",
      "email",
      "tel",
      "url",
      "textarea",
      "select",
      "radio",
      "file",
      "unsupported",
    ]),
    required: z.boolean(),
    sensitivity: z.enum(["ordinary", "personal-declaration"]),
    options: z.array(text(300)).max(100),
    context: z.string().max(1000),
  })
  .superRefine((field, ctx) => {
    const choice = field.type === "select" || field.type === "radio";
    if (
      (choice && field.options.length === 0) ||
      (!choice && field.options.length > 0) ||
      !unique(field.options)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Invalid field options",
        path: ["options"],
      });
    }
  });

export const applicationPlanRequestSchema = z
  .strictObject({
    version: z.literal(APPLICATION_PLAN_VERSION),
    requestId: id,
    scanId: id,
    jobUrl: webUrl,
    ats: z.enum(["rippling", "generic"]),
    fields: z.array(applicationFieldSchema).min(1).max(MAX_FIELDS),
  })
  .refine(
    (request) => unique(request.fields.map((field) => field.fieldId)),
    "Duplicate field IDs",
  );

const candidateSchema = z.strictObject({
  fieldId: id,
  value: text(4000),
  evidenceIds: z
    .array(id)
    .min(1)
    .max(10)
    .refine(unique, "Duplicate evidence IDs"),
  confidence: z.number().min(0).max(1),
  requiresReview: z.literal(true),
});

export const applicationPlanResponseSchema = z.strictObject({
  version: z.literal(APPLICATION_PLAN_VERSION),
  requestId: id,
  scanId: id,
  jobUrl: webUrl,
  profileVersion: id,
  candidates: z.array(candidateSchema).max(MAX_FIELDS),
  unanswered: z
    .array(
      z.strictObject({
        fieldId: id,
        reason: z.enum([
          "missing-evidence",
          "uncertain",
          "personal-declaration",
          "manual-upload",
          "unsupported",
        ]),
      }),
    )
    .max(MAX_FIELDS),
  warnings: z.array(text(500)).max(20),
});

export type ApplicationField = z.infer<typeof applicationFieldSchema>;
export type ApplicationPlanRequest = z.infer<
  typeof applicationPlanRequestSchema
>;
export type ApplicationPlanResponse = z.infer<
  typeof applicationPlanResponseSchema
>;

/** Trusted backend metadata, not a model-authored evidence registry or a wire payload. */
export interface ApplicationEvidenceContext {
  profileVersion: string;
  evidence: ReadonlyArray<{ id: string; verified: boolean }>;
}

type ErrorCode =
  | "payload-too-large"
  | "invalid-json"
  | "invalid-request"
  | "invalid-response"
  | "stale-scan"
  | "invalid-plan";

export class ApplicationPlanError extends Error {
  constructor(public readonly code: ErrorCode) {
    // Do not include resume text, proposed answers, or URLs in boundary errors.
    super(code);
    this.name = "ApplicationPlanError";
  }
}

function parseJson<S extends z.ZodType>(
  raw: string,
  limit: number,
  schema: S,
  code: ErrorCode,
): z.output<S> {
  if (new TextEncoder().encode(raw).byteLength > limit) {
    throw new ApplicationPlanError("payload-too-large");
  }
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ApplicationPlanError("invalid-json");
  }
  const result = schema.safeParse(data);
  if (!result.success) throw new ApplicationPlanError(code);
  return result.data;
}

/** Call at the transport boundary, before a planner sees untrusted page data. */
export function parseApplicationPlanRequest(
  raw: string,
): ApplicationPlanRequest {
  return parseJson(
    raw,
    MAX_REQUEST_BYTES,
    applicationPlanRequestSchema,
    "invalid-request",
  );
}

function sameScan(
  original: ApplicationPlanRequest,
  current: ApplicationPlanRequest,
): boolean {
  if (
    original.scanId !== current.scanId ||
    original.jobUrl !== current.jobUrl ||
    original.ats !== current.ats ||
    original.fields.length !== current.fields.length
  )
    return false;
  const currentFields = new Map(
    current.fields.map((field) => [field.fieldId, field]),
  );
  return original.fields.every((field) => {
    const now = currentFields.get(field.fieldId);
    return (
      now &&
      field.label === now.label &&
      field.type === now.type &&
      field.required === now.required &&
      field.sensitivity === now.sensitivity &&
      field.context === now.context &&
      JSON.stringify(field.options) === JSON.stringify(now.options)
    );
  });
}

/**
 * Validate against the original scan, a fresh adapter scan, and trusted profile
 * evidence. Returns review data only; this function grants no permission to fill.
 */
export function validateApplicationPlan(
  raw: string,
  request: ApplicationPlanRequest,
  currentScan: ApplicationPlanRequest,
  evidenceContext: ApplicationEvidenceContext,
): ApplicationPlanResponse {
  // Revalidate callers' objects too: TypeScript types are not a trust boundary.
  const original = applicationPlanRequestSchema.safeParse(request);
  const current = applicationPlanRequestSchema.safeParse(currentScan);
  if (!original.success || !current.success)
    throw new ApplicationPlanError("invalid-request");
  if (!sameScan(original.data, current.data))
    throw new ApplicationPlanError("stale-scan");
  const plan = parseJson(
    raw,
    MAX_RESPONSE_BYTES,
    applicationPlanResponseSchema,
    "invalid-response",
  );
  const fail = (): never => {
    throw new ApplicationPlanError("invalid-plan");
  };
  if (
    plan.requestId !== request.requestId ||
    plan.scanId !== request.scanId ||
    plan.jobUrl !== request.jobUrl ||
    plan.profileVersion !== evidenceContext.profileVersion
  )
    fail();

  const fields = new Map(
    original.data.fields.map((field) => [field.fieldId, field]),
  );
  const evidence = new Map(
    evidenceContext.evidence.map((fact) => [fact.id, fact]),
  );
  // Ambiguous evidence must not be resolved by array order.
  if (evidence.size !== evidenceContext.evidence.length) fail();
  const covered = new Set<string>();
  for (const candidate of plan.candidates) {
    const field = fields.get(candidate.fieldId);
    if (!field) throw new ApplicationPlanError("invalid-plan");
    if (covered.has(candidate.fieldId)) fail();
    // V1 deliberately leaves declarations and attachments for manual entry.
    if (
      field.sensitivity !== "ordinary" ||
      field.type === "file" ||
      field.type === "unsupported"
    )
      fail();
    if (
      !candidate.value.trim() ||
      candidate.evidenceIds.some((ref) => !evidence.get(ref)?.verified)
    )
      fail();
    if (
      (field.type === "select" || field.type === "radio") &&
      !field.options.includes(candidate.value)
    )
      fail();
    if (field.type === "email" && !z.email().safeParse(candidate.value).success)
      fail();
    if (field.type === "url" && !webUrl.safeParse(candidate.value).success)
      fail();
    // No executable markup or script URLs, even as a proposed text answer.
    if (/<script\b|javascript\s*:|<[^>]+\bon\w+\s*=/i.test(candidate.value))
      fail();
    covered.add(candidate.fieldId);
  }
  for (const unanswered of plan.unanswered) {
    const field = fields.get(unanswered.fieldId);
    if (!field) throw new ApplicationPlanError("invalid-plan");
    if (covered.has(unanswered.fieldId)) fail();
    if (
      field.sensitivity === "personal-declaration" &&
      unanswered.reason !== "personal-declaration"
    )
      fail();
    if (
      field.sensitivity === "ordinary" &&
      field.type === "file" &&
      unanswered.reason !== "manual-upload"
    )
      fail();
    if (
      field.sensitivity === "ordinary" &&
      field.type === "unsupported" &&
      unanswered.reason !== "unsupported"
    )
      fail();
    covered.add(unanswered.fieldId);
  }
  if (covered.size !== fields.size) fail();
  return plan;
}
