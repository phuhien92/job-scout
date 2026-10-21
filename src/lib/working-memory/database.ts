import { createClient, type Transaction } from "@libsql/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { EMPTY_WORKING_MEMORY, type WorkingMemory } from "./types";

const directory = process.env.JOB_SCOUT_DATA_DIR || path.join(process.cwd(), ".data");
const databaseFile = path.join(directory, "job-scout.db");
const legacyFile = path.join(directory, "working-memory.json");
type Normalize = (value: unknown) => WorkingMemory;

async function save(tx: Transaction, memory: WorkingMemory) {
  const { resume, optimizedResume: draft, applicationProfile } = memory;
  await tx.batch([
    { sql: "INSERT OR REPLACE INTO profile VALUES (1, ?, ?)",
      args: [JSON.stringify(memory.profile), applicationProfile.version] },
    "DELETE FROM resume", "DELETE FROM optimized_resume", "DELETE FROM application_facts",
    ...(resume ? [{ sql: "INSERT INTO resume VALUES (1, ?, ?, ?, ?, ?)",
      args: [resume.fileName, resume.fileType, resume.size, resume.uploadedAt, resume.sourceText] }] : []),
    ...(draft ? [{ sql: "INSERT INTO optimized_resume VALUES (1, ?, ?, ?, ?)",
      args: [draft.markdown, draft.title, draft.subtitle, draft.savedAt] }] : []),
    ...applicationProfile.facts.map((fact, position) => ({
      sql: "INSERT INTO application_facts VALUES (?, ?, ?, ?)",
      args: [fact.id, position, fact.section, JSON.stringify(fact)],
    })),
  ]);
}

async function load(tx: Transaction, normalize: Normalize) {
  const [profile] = (await tx.execute("SELECT * FROM profile WHERE id = 1")).rows;
  if (!profile) throw new Error("Missing SQLite profile");
  const [resume] = (await tx.execute(`SELECT file_name AS fileName, file_type AS fileType,
    size, uploaded_at AS uploadedAt, source_text AS sourceText FROM resume WHERE id = 1`)).rows;
  const [draft] = (await tx.execute(`SELECT markdown, title, subtitle, saved_at AS savedAt
    FROM optimized_resume WHERE id = 1`)).rows;
  const facts = (await tx.execute("SELECT payload FROM application_facts ORDER BY position")).rows;
  return normalize({
    storeVersion: 1,
    profile: JSON.parse(String(profile.payload)),
    resume: resume ?? null,
    optimizedResume: draft ?? null,
    applicationProfile: { version: profile.application_version,
      facts: facts.map((row) => JSON.parse(String(row.payload))) },
  });
}

async function access(normalize: Normalize, replacement?: WorkingMemory): Promise<WorkingMemory> {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  // Pre-create privately: SQLite also uses these permissions for journal files.
  try {
    const file = await fs.open(databaseFile, "wx", 0o600);
    await file.close();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const client = createClient({ url: pathToFileURL(databaseFile).href });
  try {
    await client.execute("PRAGMA busy_timeout = 5000");
    const tx = await client.transaction("write");
    try {
      const version = Number((await tx.execute("PRAGMA user_version")).rows[0].user_version);
      if (version !== 0 && version !== 1) throw new Error("Unsupported SQLite schema version");
      let current: WorkingMemory;
      if (version === 0) {
        const existing = await tx.execute("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%'");
        if (existing.rows.length) throw new Error("Unrecognized SQLite schema");
        let legacy: unknown = structuredClone(EMPTY_WORKING_MEMORY);
        try {
          legacy = JSON.parse(await fs.readFile(legacyFile, "utf8"));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        current = normalize(legacy);
        await tx.batch([
          "CREATE TABLE profile (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL, application_version INTEGER NOT NULL)",
          `CREATE TABLE resume (id INTEGER PRIMARY KEY CHECK(id = 1), file_name TEXT NOT NULL,
            file_type TEXT NOT NULL, size INTEGER NOT NULL, uploaded_at TEXT NOT NULL, source_text TEXT NOT NULL)`,
          `CREATE TABLE optimized_resume (id INTEGER PRIMARY KEY CHECK(id = 1), markdown TEXT NOT NULL,
            title TEXT NOT NULL, subtitle TEXT NOT NULL, saved_at TEXT NOT NULL)`,
          `CREATE TABLE application_facts (id TEXT PRIMARY KEY, position INTEGER NOT NULL UNIQUE,
            section TEXT NOT NULL, payload TEXT NOT NULL)`,
          "CREATE INDEX facts_by_section ON application_facts(section)",
        ]);
        await save(tx, current);
        // Validate the actual imported rows before marking migration complete.
        if (JSON.stringify(await load(tx, normalize)) !== JSON.stringify(current)) {
          throw new Error("SQLite migration validation failed");
        }
        await tx.execute("PRAGMA user_version = 1");
      } else {
        current = await load(tx, normalize);
      }
      if (replacement) await save(tx, replacement);
      await tx.commit();
      return replacement ?? current;
    } finally {
      tx.close(); // Rolls back schema, data and migration marker on every failure.
    }
  } finally {
    client.close();
  }
}

// Avoid one local connection blocking the event loop while another awaits I/O.
let pending: Promise<unknown> = Promise.resolve();
export function accessDatabase(normalize: Normalize, replacement?: WorkingMemory) {
  const result = pending.then(() => access(normalize, replacement));
  pending = result.catch(() => undefined);
  return result;
}
