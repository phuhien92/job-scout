const FINDWORK_BASE_URL = "https://findwork.dev/api/jobs/";
const FINDWORK_TIMEOUT_MS = 15000;
const SUMMARY_MAX_LENGTH = 260;

export interface FindworkSearchParams {
  query: string;
  location?: string;
  remote?: boolean;
}

export interface FindworkListItem {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary: string | null;
  summary: string;
  url: string;
}

interface RawFindworkJob {
  id?: string;
  role?: string;
  title?: string;
  company_name?: string;
  company?: string;
  location?: string;
  remote?: boolean | string;
  salary_min?: number | string | null;
  salary_max?: number | string | null;
  currency?: string | null;
  text?: string;
  description?: string;
  url?: string;
}

interface RawFindworkResponse {
  count?: number;
  results?: RawFindworkJob[];
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

const REMOTE_MARKERS = ["remote", "anywhere", "worldwide"];

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  const cut = value.slice(0, maxLength);
  const lastBreak = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf("\n"));
  const end = lastBreak > maxLength * 0.6 ? lastBreak : maxLength;
  return `${cut.slice(0, end).replace(/\s+$/, "")}…`;
}

export function summarize(rawText: string): string {
  const stripped = stripHtml(rawText).replace(/\n+/g, " ");
  return truncate(stripped, SUMMARY_MAX_LENGTH);
}

export function formatSalary(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
  currency: string | null | undefined,
): string | null {
  const minValue = toNumber(min);
  const maxValue = toNumber(max);
  if (minValue === null && maxValue === null) return null;

  const symbol =
    CURRENCY_SYMBOLS[(currency ?? "").toUpperCase()] ?? (currency ?? "").toUpperCase();
  const format = (value: number) => `${symbol}${value.toLocaleString("en-US")}`;

  if (minValue !== null && maxValue !== null && minValue !== maxValue) {
    return `${format(minValue)}-${format(maxValue)}`;
  }
  if (minValue !== null) return `From ${format(minValue)}`;
  return `Up to ${format(maxValue as number)}`;
}

function isRemote(remote: boolean | string | undefined, location: string): boolean {
  if (remote === true || remote === "true" || remote === "True") return true;
  return REMOTE_MARKERS.some((marker) => location.toLowerCase().includes(marker));
}

function mapRawJob(job: RawFindworkJob): FindworkListItem | null {
  const url = job.url?.trim();
  if (!url) return null;

  const title = (job.role ?? job.title ?? "").trim();
  const company = (job.company_name ?? job.company ?? "").trim();
  if (!title || !company) return null;
  const location = (job.location ?? "").trim() || "Unknown location";

  return {
    title,
    company,
    location,
    remote: isRemote(job.remote, location),
    salary: formatSalary(job.salary_min, job.salary_max, job.currency),
    summary: summarize(job.text ?? job.description ?? ""),
    url,
  };
}

function parsePayload(payload: unknown): RawFindworkJob[] {
  if (!payload || typeof payload !== "object") {
    throw new Error("Findwork returned an unreadable response.");
  }
  const results = (payload as RawFindworkResponse).results;
  if (!Array.isArray(results)) {
    throw new Error("Findwork response did not include a results list.");
  }
  return results;
}

export async function searchFindworkJobs(params: FindworkSearchParams): Promise<FindworkListItem[]> {
  const apiKey = process.env.FINDWORK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "FINDWORK_API_KEY is not set. Add it to your environment (see .env.example) to search live jobs.",
    );
  }

  const query = params.query.trim();
  if (!query) {
    throw new Error("A search query is required.");
  }

  const searchParams = new URLSearchParams();
  searchParams.set("search", query);
  if (params.location?.trim()) searchParams.set("location", params.location.trim());
  if (params.remote === true) searchParams.set("remote", "true");

  const response = await fetch(`${FINDWORK_BASE_URL}?${searchParams.toString()}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(FINDWORK_TIMEOUT_MS),
    cache: "no-store",
  });

  if (response.status === 401) {
    throw new Error("The Findwork API key is invalid or unauthorized.");
  }
  if (response.status === 403) {
    throw new Error("Findwork rejected this request. Check your API key.");
  }
  if (response.status === 429) {
    throw new Error("Findwork rate limit reached. Try again shortly.");
  }
  if (!response.ok) {
    throw new Error(`Findwork job search failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  return parsePayload(payload)
    .map(mapRawJob)
    .filter((job): job is FindworkListItem => job !== null);
}