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
}

export interface WorkingMemory {
  resume: ResumeRecord | null;
  profile: Profile;
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
};

export const EMPTY_WORKING_MEMORY: WorkingMemory = {
  resume: null,
  profile: EMPTY_PROFILE,
};