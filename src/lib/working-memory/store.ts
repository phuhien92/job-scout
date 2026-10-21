import { accessDatabase } from "./database";
import { applicationProfileSchema, migrateLegacyProfile, refreshLegacyFacts } from "./application-profile";

import {
  EMPTY_WORKING_MEMORY,
  type OptimizedResume,
  type Profile,
  type WorkingMemory,
} from "@/lib/working-memory/types";

/** Shared Scout/Optimize boundary; SQLite storage and migration live in database.ts. */

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
    targetRole:
      typeof raw.targetRole === "string" ? raw.targetRole.trim().slice(0, 120) : base.targetRole,
    targetIndustry:
      typeof raw.targetIndustry === "string"
        ? raw.targetIndustry.trim().slice(0, 120)
        : base.targetIndustry,
  };
}

function normalizeOptimizedResume(value: unknown): OptimizedResume | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Partial<OptimizedResume>;
  if (typeof raw.markdown !== "string" || !raw.markdown.trim()) {
    return null;
  }
  return {
    markdown: raw.markdown.slice(0, 100_000),
    title:
      typeof raw.title === "string" && raw.title.trim()
        ? raw.title.trim().slice(0, 160)
        : "Resume",
    subtitle:
      typeof raw.subtitle === "string" ? raw.subtitle.trim().slice(0, 160) : "",
    savedAt:
      typeof raw.savedAt === "string" && raw.savedAt
        ? raw.savedAt
        : new Date(0).toISOString(),
  };
}

function normalizeWorkingMemory(value: unknown): WorkingMemory {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid working-memory store");
  }
  const version = (value as { storeVersion?: unknown }).storeVersion;
  if (version !== undefined && version !== 1) {
    throw new Error("Unsupported working-memory store version");
  }
  const raw = (value ?? {}) as Partial<WorkingMemory>;
  if (raw.profile !== undefined && (!raw.profile || typeof raw.profile !== "object" || Array.isArray(raw.profile))) {
    throw new Error("Invalid stored profile");
  }
  if (version === 1 && raw.applicationProfile === undefined) {
    throw new Error("Missing application profile in versioned store");
  }
  const profile = normalizeProfile(raw.profile);
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
  return {
    storeVersion: 1,
    applicationProfile: raw.applicationProfile === undefined
      ? migrateLegacyProfile(profile)
      : applicationProfileSchema.parse(raw.applicationProfile),
    resume: resumeRecord,
    profile,
    optimizedResume: normalizeOptimizedResume(raw.optimizedResume),
  };
}

export async function readWorkingMemory(): Promise<WorkingMemory> {
  return accessDatabase(normalizeWorkingMemory);
}

export async function writeWorkingMemory(memory: WorkingMemory): Promise<void> {
  const normalized = normalizeWorkingMemory(memory);
  normalized.applicationProfile = refreshLegacyFacts(normalized.applicationProfile, normalized.profile);
  await accessDatabase(normalizeWorkingMemory, normalized);
}
