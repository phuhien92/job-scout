import type { UIMessage } from "ai";

export type ClarifyPayload = {
  step: number;
  total: number;
  topic: "role" | "industry";
  question: string;
  options: string[];
};

export type RewritePayload = {
  title: string;
  subtitle: string;
  markdown: string;
};

export type JobListing = {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary: string | null;
  summary: string;
  url: string;
};

export function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("\n")
    .trim();
}

export function toolPartName(part: { type: string; toolName?: string }): string | null {
  if (part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length);
  }
  if (part.type === "dynamic-tool" && typeof part.toolName === "string") {
    return part.toolName;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function asClarifyPayload(value: unknown): ClarifyPayload | null {
  if (!isRecord(value)) return null;
  const question = typeof value.question === "string" ? value.question.trim() : "";
  const options = Array.isArray(value.options)
    ? value.options.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  if (!question || options.length < 2) return null;
  const topic = value.topic === "industry" ? "industry" : "role";
  const step =
    typeof value.step === "number" && Number.isFinite(value.step)
      ? Math.max(1, Math.min(2, Math.trunc(value.step)))
      : topic === "industry"
        ? 2
        : 1;
  const total =
    typeof value.total === "number" && Number.isFinite(value.total)
      ? Math.max(1, Math.min(2, Math.trunc(value.total)))
      : 2;
  return { step, total, topic, question, options: options.slice(0, 6) };
}

export function asRewritePayload(value: unknown): RewritePayload | null {
  if (!isRecord(value)) return null;
  const markdown = typeof value.markdown === "string" ? value.markdown.trim() : "";
  if (!markdown) return null;
  return {
    title:
      typeof value.title === "string" && value.title.trim()
        ? value.title.trim()
        : "Resume",
    subtitle: typeof value.subtitle === "string" ? value.subtitle.trim() : "",
    markdown,
  };
}

export function asJobListings(value: unknown): JobListing[] {
  if (!isRecord(value) || !Array.isArray(value.jobs)) return [];
  const jobs: JobListing[] = [];
  for (const item of value.jobs) {
    if (!isRecord(item)) continue;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const company = typeof item.company === "string" ? item.company.trim() : "";
    const location = typeof item.location === "string" ? item.location.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const summary = typeof item.summary === "string" ? item.summary.trim() : "";
    if (!title || !company || !url) continue;
    jobs.push({
      title,
      company,
      location,
      remote: item.remote === true,
      salary: typeof item.salary === "string" && item.salary.trim() ? item.salary.trim() : null,
      summary,
      url,
    });
  }
  return jobs;
}
