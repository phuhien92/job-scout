/**
 * Enforces the change-size rule in AGENTS.md: a PR changes about 500 lines at most,
 * not counting generated files. A PR over the limit passes only if its description
 * explains why it can't be split, under a "## Why this can't be split" heading.
 *
 *   node scripts/check-change-size.mts <base-ref> [head-ref]
 *
 * Reads the PR description from the PR_BODY environment variable.
 */
import { execFileSync } from "node:child_process";

export const LIMIT = 500;

/** Generated or machine-written files: nobody reviews them line by line. */
const EXCLUDED = [
  /^\.claude\/skills\/job-scout-ui\/references\/components\.md$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)package-lock\.json$/,
  /\.pen$/,
  /(^|\/)__snapshots__\//,
  /(^|\/)__screenshots__\//,
  /\.snap$/,
];

export type FileCount = { path: string; lines: number };

/** Parses `git diff --numstat` output; binary files (`-\t-`) count as zero. */
export function countChanges(numstat: string): { counted: FileCount[]; excluded: string[] } {
  const counted: FileCount[] = [];
  const excluded: string[] = [];
  for (const line of numstat.split("\n")) {
    if (!line.trim()) continue;
    const [added, deleted, ...rest] = line.split("\t");
    const path = rest.join("\t");
    if (EXCLUDED.some((pattern) => pattern.test(path))) {
      excluded.push(path);
      continue;
    }
    const lines = (Number(added) || 0) + (Number(deleted) || 0);
    counted.push({ path, lines });
  }
  return { counted, excluded };
}

/** True when the description has the heading and some explanation under it. */
export function hasSplitException(body: string): boolean {
  const match = /^#{2,3}\s*why this can['’]t be split\s*$([\s\S]*?)(?=^#{1,3}\s|$(?![\s\S]))/im.exec(body);
  return match !== null && match[1].trim().length > 0;
}

function main() {
  const [base, head = "HEAD"] = process.argv.slice(2);
  if (!base) {
    console.error("usage: node scripts/check-change-size.mts <base-ref> [head-ref]");
    process.exit(2);
  }
  const numstat = execFileSync("git", ["diff", "--numstat", `${base}...${head}`], { encoding: "utf8" });
  const { counted, excluded } = countChanges(numstat);
  const total = counted.reduce((sum, f) => sum + f.lines, 0);

  console.log(`Changed lines: ${total} (limit ${LIMIT}), across ${counted.length} files.`);
  for (const f of [...counted].sort((a, b) => b.lines - a.lines)) console.log(`  ${String(f.lines).padStart(5)}  ${f.path}`);
  if (excluded.length > 0) console.log(`Not counted (generated): ${excluded.join(", ")}`);

  if (total <= LIMIT) return;
  if (hasSplitException(process.env.PR_BODY ?? "")) {
    console.log(`Over the limit, with a "Why this can't be split" explanation in the description.`);
    return;
  }
  console.error(
    `\nThis PR changes ${total} lines, over the ${LIMIT}-line limit in AGENTS.md ("Change size").` +
      `\nSplit it into smaller PRs, or explain under a "## Why this can't be split" heading in the PR description.`,
  );
  process.exit(1);
}

// Run only as a script, so the test can import the pure functions.
if (process.argv[1]?.endsWith("check-change-size.mts")) main();
