export const REMOTE_PREFERENCE_VALUES = ["remote", "hybrid", "onsite"] as const;
export type RemotePreferenceValue = (typeof REMOTE_PREFERENCE_VALUES)[number];
export type RemotePreference = RemotePreferenceValue | null;

/** Public view of a stored resume — the client never sees sourceText. */
export type ResumeSummary = Omit<ResumeRecord, "sourceText">;

export const RESUME_FILE_TYPES = ["pdf", "docx", "txt"] as const;
export type ResumeFileType = (typeof RESUME_FILE_TYPES)[number];

export interface ResumeRecord {
  fileName: string;
  fileType: ResumeFileType;
  size: number;
  uploadedAt: string;
  /** Faithful extract of the source document, kept for evidence-only
   *  rewrite and fact-gating. Never a paraphrase. */
  sourceText: string;
}

export interface Profile {
  name: string;
  skills: string[];
  titles: string[];
  locations: string[];
  remotePreference: RemotePreference;
  seniority: string[];
  summary: string;
  targetRoles: string[];
  /** Active Optimize targeting choice (role). */
  targetRole: string;
  /** Active Optimize targeting choice (industry / company type). */
  targetIndustry: string;
}

/** Last saved evidence-only rewrite from Optimize. */
export interface OptimizedResume {
  markdown: string;
  title: string;
  subtitle: string;
  savedAt: string;
}

export interface WorkingMemory {
  resume: ResumeRecord | null;
  profile: Profile;
  optimizedResume: OptimizedResume | null;
}

export const EMPTY_PROFILE: Profile = {
  name: "",
  skills: [],
  titles: [],
  locations: [],
  remotePreference: null,
  seniority: [],
  summary: "",
  targetRoles: [],
  targetRole: "",
  targetIndustry: "",
};

export const EMPTY_WORKING_MEMORY: WorkingMemory = {
  resume: null,
  profile: EMPTY_PROFILE,
  optimizedResume: null,
};