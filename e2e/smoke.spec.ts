import {
  test,
  expect,
  expectNoOverflow,
  mockChat,
  navigate,
  resumePath,
} from "./support";

test("shared navigation renders all four routes without overflow", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/scout$/);
  await expect(
    page.getByText("Scout for roles", { exact: true }),
  ).toBeVisible();
  await expectNoOverflow(page);

  await navigate(page, "Optimize", "/optimize");
  await expect(
    page.getByRole("heading", {
      name: "Land more interviews with an ATS-ready resume",
    }),
  ).toBeVisible();
  await expectNoOverflow(page);
  await navigate(page, "Jobs", "/jobs");
  await expect(page.getByText("No jobs yet", { exact: true })).toBeVisible();
  await expectNoOverflow(page);
  await navigate(page, "Profile", "/profile");
  await expect(
    page.getByText("Upload your resume", { exact: true }),
  ).toBeVisible();
  await expectNoOverflow(page);
  await navigate(page, "Scout", "/scout");
  await expect(
    page.getByText("Scout for roles", { exact: true }),
  ).toBeVisible();
});

test("renders only approved light tokens before and after hydration", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));

  const response = await page.goto("/scout");
  expect(await response!.text()).toContain('data-theme="light"');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute(
    "content",
    "only light",
  );
  expect(
    await page.evaluate(() => ({
      attribute: document.documentElement.dataset.theme,
      background: getComputedStyle(document.body).backgroundColor,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      stored: localStorage.getItem("theme"),
      token: getComputedStyle(document.documentElement)
        .getPropertyValue("--js-bg-page")
        .trim(),
    })),
  ).toEqual({
    attribute: "light",
    background: "rgb(245, 251, 247)",
    colorScheme: "light only",
    stored: "dark",
    token: "#F5FBF7",
  });
  await expect(page.getByRole("switch", { name: /theme/i })).toHaveCount(0);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("Scout consumes a mocked chat stream and renders a source job card", async ({
  page,
}) => {
  const requests = await mockChat(page, { jobs: true });
  await page.goto("/scout");
  const composer = page.getByRole("textbox", { name: "Job search message" });
  await composer.fill("Find remote frontend roles");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByText("Here is one matching role from the fixture.", {
      exact: true,
    }),
  ).toBeVisible();
  const job = page.getByRole("article");
  await expect(
    job.getByRole("heading", { name: "Senior Frontend Engineer" }),
  ).toBeVisible();
  await expect(job.getByRole("link", { name: "Open listing" })).toHaveAttribute(
    "href",
    "https://example.com/jobs/frontend",
  );
  expect(requests).toHaveLength(1);
  expect(JSON.stringify(requests[0].messages)).toContain(
    "Find remote frontend roles",
  );
  await expectNoOverflow(page);
});

test("Scout shows a recoverable API error and preserves the draft", async ({
  page,
}) => {
  await mockChat(page, { error: true });
  await page.goto("/scout");
  const composer = page.getByRole("textbox", { name: "Job search message" });
  await composer.fill("Find frontend roles");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByText("Search unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Fixture service unavailable. Try again.", { exact: true }),
  ).toBeVisible();
  await expect(composer).toHaveValue("Find frontend roles");
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeEnabled();
});

test("resume upload, extracted profile, edits and Optimize handoff persist", async ({
  page,
}) => {
  const requests = await mockChat(page);
  await page.goto("/profile");
  const upload = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/profile/upload") &&
      response.request().method() === "POST",
  );
  await page.locator('input[type="file"]').setInputFiles(resumePath);
  expect((await upload).status()).toBe(201);
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Alex Example");
  await expectNoOverflow(page);
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Alex Updated");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Changes saved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Alex Updated");
  await navigate(page, "Optimize", "/optimize");
  await expect(
    page.getByText("Alex Updated", { exact: false }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Optimize my resume", exact: true })
    .click();
  await expect(page).toHaveURL(/\/optimize\?session=1$/);
  await expect(
    page.getByText("Your resume highlights React and TypeScript experience.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(requests.some((request) => request.entry === "optimize")).toBe(true);
  await expectNoOverflow(page);
});

test("Optimize can upload a resume before starting a mocked critique", async ({
  page,
}) => {
  await mockChat(page);
  await page.goto("/optimize");
  await page.locator('input[type="file"]').setInputFiles(resumePath);
  const optimize = page.getByRole("button", {
    name: "Optimize my resume",
    exact: true,
  });
  await expect(optimize).toBeEnabled();
  await optimize.click();
  await expect(
    page.getByText("Your resume highlights React and TypeScript experience.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("an unreadable upload returns a visible error without creating a profile", async ({
  page,
}) => {
  await page.goto("/profile");
  const upload = page.waitForResponse((response) =>
    response.url().endsWith("/api/profile/upload"),
  );
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "empty.txt",
      mimeType: "text/plain",
      buffer: Buffer.alloc(0),
    });
  expect((await upload).status()).toBe(422);
  await expect(
    page.getByText(
      "This file could not be read as text. It may be corrupt or password protected.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Upload your resume", { exact: true }),
  ).toBeVisible();
});
