import { describe, expect, it } from "vitest";

import { asJobListings, toolPartName } from "./tool-parts";

describe("job-search tool parts", () => {
  it("accepts complete source listings and drops malformed entries", () => {
    expect(
      asJobListings({
        jobs: [
          {
            title: "Frontend Engineer",
            company: "Acme",
            location: "Remote",
            remote: true,
            salary: " $90k ",
            summary: " Build products. ",
            url: " https://jobs.example.com/1 ",
          },
          { title: "Missing source", company: "Acme" },
        ],
      }),
    ).toEqual([
      {
        title: "Frontend Engineer",
        company: "Acme",
        location: "Remote",
        remote: true,
        salary: "$90k",
        summary: "Build products.",
        url: "https://jobs.example.com/1",
      },
    ]);
  });

  it("recognizes static and dynamic search tool parts", () => {
    expect(toolPartName({ type: "tool-search-jobs" })).toBe("search-jobs");
    expect(
      toolPartName({ type: "dynamic-tool", toolName: "search-jobs" }),
    ).toBe("search-jobs");
    expect(toolPartName({ type: "text" })).toBeNull();
  });
});
