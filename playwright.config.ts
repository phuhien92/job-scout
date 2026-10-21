import { defineConfig } from "@playwright/test";

// The runner owns the temporary directory and removes it after the server exits.
if (!process.env.JOB_SCOUT_E2E || !process.env.JOB_SCOUT_DATA_DIR) {
  throw new Error(
    "Run Playwright through npm run test:e2e for isolated storage.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // The current app has one shared local profile; tests must not race its writes.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    locale: "en-US",
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: "chromium-mobile",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --webpack --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    // Reusing a developer's server could write test data to their real profile.
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      JOB_SCOUT_DATA_DIR: process.env.JOB_SCOUT_DATA_DIR,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
