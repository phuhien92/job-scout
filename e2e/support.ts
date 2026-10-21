import { rm } from "node:fs/promises";
import path from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
import type { UIMessageChunk } from "ai";

export const test = base.extend<{ isolation: void }>({
  isolation: [
    async ({ context, page }, use, testInfo) => {
      const dataDir = process.env.JOB_SCOUT_DATA_DIR;
      if (!process.env.JOB_SCOUT_E2E || !dataDir)
        throw new Error("Missing isolated E2E storage");
      // Storage connections close after each request; tests run serially.
      for (const name of ["job-scout.db", "job-scout.db-journal", "job-scout.db-wal",
        "job-scout.db-shm", "working-memory.json"]) {
        await rm(path.join(dataDir, name), { force: true });
      }
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      // No browser request may reach a real listings/model service. Local Next
      // assets and real profile APIs still run normally; chat is mocked below.
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== "http://127.0.0.1:3100") return route.abort();
        if (url.pathname === "/api/chat") {
          errors.push("Unexpected unmocked chat request");
          return route.abort();
        }
        return route.continue();
      });
      await use();
      if (errors.length)
        await testInfo.attach("browser-errors", {
          body: JSON.stringify(errors),
          contentType: "application/json",
        });
      expect(
        errors,
        "No browser runtime errors or unmocked model requests",
      ).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
export const resumePath = path.join(import.meta.dirname, "fixtures/resume.txt");

export async function expectNoOverflow(page: Page) {
  try {
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        {
          message:
            "The page must fit the viewport without horizontal scrolling",
        },
      )
      .toBeLessThanOrEqual(1);
  } catch (error) {
    const details = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName,
            class: element.className,
            right: rect.right,
            left: rect.left,
            width: rect.width,
            position: style.position,
            visibility: style.visibility,
            overflow: style.overflow,
          };
        })
        .filter((element) => element.right > window.innerWidth + 1)
        .slice(0, 30),
    );
    await test.info().attach("overflow-details", {
      body: JSON.stringify(details, null, 2),
      contentType: "application/json",
    });
    throw error;
  }
}

export async function navigate(page: Page, name: string, url: string) {
  const mobile = page.viewportSize()!.width < 769;
  if (mobile) await page.getByRole("button", { name: /Menu$/ }).click();
  const navigation = mobile
    ? page.getByRole("dialog")
    : page.getByRole("navigation", { name: "App navigation" });
  await navigation
    .getByRole("link", { name: new RegExp(`\\b${name}$`) })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${url}$`));
  if (mobile) await expect(page.getByRole("dialog")).not.toBeVisible();
}

export async function mockChat(
  page: Page,
  { jobs = false, error = false } = {},
) {
  const requests: Record<string, unknown>[] = [];
  await page.route("**/api/chat", async (route) => {
    requests.push(route.request().postDataJSON());
    if (error)
      return route.fulfill({
        status: 503,
        contentType: "text/plain",
        body: "Fixture service unavailable. Try again.",
      });
    const chunks: UIMessageChunk[] = [
      { type: "start", messageId: "fixture-assistant" },
      { type: "start-step" },
    ];
    if (jobs)
      chunks.push(
        {
          type: "tool-input-available",
          toolCallId: "fixture-search",
          toolName: "search-jobs",
          input: { query: "frontend", remote: true },
        },
        {
          type: "tool-output-available",
          toolCallId: "fixture-search",
          output: {
            jobs: [
              {
                title: "Senior Frontend Engineer",
                company: "Example Company",
                location: "Seattle",
                remote: true,
                salary: "$150k–$180k",
                summary: "Build accessible React applications.",
                url: "https://example.com/jobs/frontend",
              },
            ],
          },
        },
      );
    chunks.push(
      { type: "text-start", id: "fixture-text" },
      {
        type: "text-delta",
        id: "fixture-text",
        delta: jobs
          ? "Here is one matching role from the fixture."
          : "Your resume highlights React and TypeScript experience.",
      },
      { type: "text-end", id: "fixture-text" },
      { type: "finish-step" },
      { type: "finish", finishReason: "stop" },
    );
    return route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
      body: `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`,
    });
  });
  return requests;
}
