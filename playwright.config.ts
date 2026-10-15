import { defineConfig, devices } from "@playwright/test"

// Its own port so tests never hit another app or the dev server; runs against a production build.
const port = 3210

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    // Uses the installed Google Chrome, so no browser download is needed (`npx playwright install chrome` in CI).
    channel: "chrome",
  },
  projects: [
    { name: "unit", testMatch: "unit/**/*.spec.ts" },
    { name: "desktop", testMatch: "e2e/**/*.spec.ts", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "mobile", testMatch: "e2e/**/*.spec.ts", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
})
