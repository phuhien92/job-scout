import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applicationFactSchema, applicationProfileSchema } from "./application-profile";
import { EMPTY_WORKING_MEMORY } from "./types";

let directory: string;
let store: typeof import("./store");
const storeFile = () => path.join(directory, "working-memory.json");

beforeEach(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "job-scout-profile-"));
  vi.stubEnv("JOB_SCOUT_DATA_DIR", directory);
  vi.resetModules();
  store = await import("./store");
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await fs.rm(directory, { recursive: true, force: true });
});

describe("working-memory migration", () => {
  it("returns independent empty profiles only for a missing file", async () => {
    const first = await store.readWorkingMemory();
    first.profile.skills.push("changed");
    expect(await store.readWorkingMemory()).toEqual(EMPTY_WORKING_MEMORY);
  });

  it("migrates and reloads legacy data without claiming verification or evidence", async () => {
    const legacy = {
      resume: { fileName: "source.txt", fileType: "txt", size: 15,
        uploadedAt: "2026-10-20T00:00:00.000Z", sourceText: "Fictional Casey" },
      profile: { ...EMPTY_WORKING_MEMORY.profile, name: "Casey", skills: ["React"] },
      optimizedResume: { markdown: "Saved draft", title: "Resume", subtitle: "Draft",
        savedAt: "2026-10-20T00:00:00.000Z" },
    };
    const original = JSON.stringify(legacy);
    await fs.writeFile(storeFile(), original);
    const migrated = await store.readWorkingMemory();
    expect(migrated).toMatchObject(legacy);
    expect(migrated.applicationProfile.facts).toHaveLength(2);
    expect(migrated.applicationProfile.facts.every((fact) =>
      fact.verification === "unverified" && fact.provenance.kind === "legacy")).toBe(true);
    expect(await fs.readFile(storeFile(), "utf8")).toBe(original);
    await store.writeWorkingMemory(migrated);
    expect(await store.readWorkingMemory()).toEqual(migrated);
    expect((await fs.stat(storeFile())).mode & 0o777).toBe(0o600);
  });

  it.each(["{broken", "[]", '{"profile":[]}', '{"storeVersion":2}', '{"storeVersion":1}'])(
    "refuses to read or replace an invalid store: %s", async (raw) => {
      await fs.writeFile(storeFile(), raw);
      await expect(store.readWorkingMemory()).rejects.toThrow();
      await expect(store.writeWorkingMemory(structuredClone(EMPTY_WORKING_MEMORY))).rejects.toThrow();
      expect(await fs.readFile(storeFile(), "utf8")).toBe(raw);
    },
  );

  it("preserves the previous file and cleans up when replacement fails", async () => {
    await store.writeWorkingMemory(structuredClone(EMPTY_WORKING_MEMORY));
    const original = await fs.readFile(storeFile(), "utf8");
    const next = await store.readWorkingMemory();
    next.profile.name = "Changed";
    vi.spyOn(fs, "rename").mockRejectedValueOnce(new Error("Disk failure"));
    await expect(store.writeWorkingMemory(next)).rejects.toThrow("Disk failure");
    expect(await fs.readFile(storeFile(), "utf8")).toBe(original);
    expect(await fs.readdir(directory)).toEqual(["working-memory.json"]);
  });

  it("keeps user provenance while refreshing legacy edits and clears removed values", async () => {
    const memory = await store.readWorkingMemory();
    memory.profile.name = "Old name";
    memory.applicationProfile.facts.push({ id: "user_email", section: "contact", key: "email",
      value: "casey@example.com", verification: "verified",
      provenance: { kind: "user", recordedAt: "2026-10-20T00:00:00.000Z" } });
    await store.writeWorkingMemory(memory);
    const edited = await store.readWorkingMemory();
    edited.profile.name = "";
    await store.writeWorkingMemory(edited);
    expect((await store.readWorkingMemory()).applicationProfile.facts).toEqual(memory.applicationProfile.facts);
  });
});

describe("application profile validation", () => {
  const fact = { id: "fact1", section: "contact", key: "name", value: "Casey",
    verification: "unverified", provenance: { kind: "legacy" } };

  it("rejects duplicate IDs, oversized values, and claimed legacy verification", () => {
    expect(applicationProfileSchema.safeParse({ version: 1, facts: [fact, fact] }).success).toBe(false);
    expect(applicationFactSchema.safeParse({ ...fact, value: "x".repeat(4001) }).success).toBe(false);
    expect(applicationFactSchema.safeParse({ ...fact, verification: "verified" }).success).toBe(false);
  });

  it("requires explicit user provenance for personal declarations", () => {
    const declaration = { ...fact, section: "application", key: "sponsorship", value: "Yes" };
    expect(applicationFactSchema.safeParse(declaration).success).toBe(false);
    expect(applicationFactSchema.safeParse({ ...declaration, verification: "verified",
      provenance: { kind: "user", recordedAt: "2026-10-20T00:00:00.000Z" } }).success).toBe(true);
  });

  it("requires nonempty bounded resume offsets", () => {
    const source = { kind: "resume", resumeId: "resume1", start: 8, end: 3 };
    expect(applicationFactSchema.safeParse({ ...fact, provenance: source }).success).toBe(false);
    expect(applicationFactSchema.safeParse({ ...fact, provenance: { ...source, end: 12 } }).success).toBe(true);
  });

  it("rejects malformed persisted facts instead of silently dropping them", async () => {
    await fs.writeFile(storeFile(), JSON.stringify({ ...EMPTY_WORKING_MEMORY,
      applicationProfile: { version: 1, facts: [{ ...fact, verification: "verified" }] } }));
    await expect(store.readWorkingMemory()).rejects.toThrow();
  });
});
