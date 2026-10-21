import { describe, expect, it } from "vitest";

import { countChanges, hasSplitException } from "./check-change-size.mjs";

describe("countChanges", () => {
  it("counts added plus deleted lines and skips generated files", () => {
    const numstat = [
      "120\t30\tsrc/components/JobCard.tsx",
      "255\t0\t.claude/skills/job-scout-ui/references/components.md",
      "900\t400\tpnpm-lock.yaml",
      "5000\t10\tdesign/job-scout.pen",
      "-\t-\tdesign/profile-overview.png",
    ].join("\n");
    const { counted, excluded } = countChanges(numstat);
    expect(counted).toEqual([
      { path: "src/components/JobCard.tsx", lines: 150 },
      { path: "design/profile-overview.png", lines: 0 },
    ]);
    expect(excluded).toEqual([
      ".claude/skills/job-scout-ui/references/components.md",
      "pnpm-lock.yaml",
      "design/job-scout.pen",
    ]);
  });
});

describe("hasSplitException", () => {
  it("accepts the heading with an explanation under it", () => {
    expect(hasSplitException("## Why\nx\n\n## Why this can't be split\nThe migration is atomic.\n")).toBe(true);
    expect(hasSplitException("### Why this can’t be split\n\nOne schema change.")).toBe(true);
  });

  it("rejects an empty section, a missing heading, or an empty body", () => {
    expect(hasSplitException("## Why this can't be split\n\n## Testing\nok")).toBe(false);
    expect(hasSplitException("## Why this can't be split\n")).toBe(false);
    expect(hasSplitException("It is big, sorry.")).toBe(false);
    expect(hasSplitException("")).toBe(false);
  });
});
