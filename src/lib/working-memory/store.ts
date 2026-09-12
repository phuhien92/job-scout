import { promises as fs } from "node:fs";
import path from "node:path";

import {
  EMPTY_WORKING_MEMORY,
  type Profile,
  type WorkingMemory,
} from "@/lib/working-memory/types";

const STORE_FILE = path.join(process.cwd(), ".data", "working-memory.json");

/**
 * Working-memory store for the whole product (Scout and Optimize share one
 * resource-scoped profile, `resume` source text, and extracted facts).
 *
 * This is the single swap point for the persistence layer. Today it is a
 * small server-side JSON file; swapping to Mastra memory or LibSQL means
 * reimplementing only `readWorkingMemory`/`writeWorkingMemory` behind the
 * same `WorkingMemory` shape.
 */

function normList(value: unknown, max = 60): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase()) || trimmed.length > 80) {
      continue;
    }
    seen.add(trimmed.toLowerCase());
    out.push(trimmed);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

function normalizeProfile(value: unknown): Profile {
  const raw = (value ?? {}) as Partial<Profile>;
  const base = EMPTY_WORKING_MEMORY.profile;
  const remotePreference =
    raw.remotePreference === "remote" ||
    raw.remotePreference === "hybrid" ||
    raw.remotePreference === "onsite"
      ? raw.remotePreference
      : null;
  return {
    name: typeof raw.name === "string" ? raw.name.trim().slice(0, 120) : base.name,
    skills: normList(raw.skills),
    titles: normList(raw.titles),
    locations: normList(raw.locations),
    remotePreference,
    seniority: normList(raw.seniority),
    summary:
      typeof raw.summary === "string" ? raw.summary.trim().slice(0, 2000) : base.summary,
    targetRoles: normList(raw.targetRoles),
  };
}

function normalizeWorkingMemory(value: unknown): WorkingMemory {
  const raw = (value ?? {}) as Partial<WorkingMemory>;
  const resume = raw.resume;
  const resumeRecord =
    resume && typeof resume === "object" && typeof resume.fileName === "string"
      ? {
          fileName: String(resume.fileName).trim().slice(0, 200),
          fileType:
            resume.fileType === "pdf" || resume.fileType === "docx" || resume.fileType === "txt"
              ? resume.fileType
              : ("txt" as const),
          size: typeof resume.size === "number" && resume.size >= 0 ? resume.size : 0,
          uploadedAt:
            typeof resume.uploadedAt === "string" ? resume.uploadedAt : new Date(0).toISOString(),
          sourceText:
            typeof resume.sourceText === "string"
              ? resume.sourceText.slice(0, 100_000)
              : "",
        }
      : null;
  return { resume: resumeRecord, profile: normalizeProfile(raw.profile) };
}

export async function readWorkingMemory(): Promise<WorkingMemory> {
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return normalizeWorkingMemory(JSON.parse(raw) as unknown);
  } catch {
    return EMPTY_WORKING_MEMORY;
  }
}

export async function writeWorkingMemory(memory: WorkingMemory): Promise<void> {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, `${JSON.stringify(memory, null, 2)}\n`, "utf8");
}