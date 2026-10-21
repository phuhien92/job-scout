import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const dataDir = await mkdtemp(path.join(tmpdir(), "job-scout-e2e-"));
const child = spawn(
  process.execPath,
  [require.resolve("@playwright/test/cli"), "test", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: { ...process.env, JOB_SCOUT_E2E: "1", JOB_SCOUT_DATA_DIR: dataDir },
  },
);
const interrupt = () => child.kill("SIGINT");
const terminate = () => child.kill("SIGTERM");
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);

try {
  process.exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", terminate);
  await rm(dataDir, { recursive: true, force: true });
}
