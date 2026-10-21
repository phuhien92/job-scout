import { createClient } from "@libsql/client";
import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (!process.argv[2]) throw new Error("Usage: npm run db:backup -- /path/to/backup.db");
const directory = process.env.JOB_SCOUT_DATA_DIR || path.join(process.cwd(), ".data");
const source = path.join(directory, "job-scout.db");
const destination = path.resolve(process.argv[2]);
await fs.access(source);
const file = await fs.open(destination, "wx", 0o600); // Never overwrite an existing file.
await file.close();
let client;
try {
  client = createClient({ url: pathToFileURL(source).href });
  await client.execute("PRAGMA busy_timeout = 5000");
  await client.execute({ sql: "VACUUM INTO ?", args: [destination] });
  console.log(`Profile backup saved to ${destination}`);
} catch (error) {
  await fs.rm(destination, { force: true });
  throw error;
} finally {
  client?.close();
}
