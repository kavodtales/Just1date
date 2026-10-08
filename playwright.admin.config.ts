import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e-admin",
  workers: 1,
  use: {
    baseURL: process.env.E2E_ADMIN_URL ?? "http://localhost:3001",
    channel: process.env.E2E_BROWSER_CHANNEL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "admin-desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "admin-mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_ADMIN_URL
    ? undefined
    : {
        command:
          "npm run build -w @just1date/admin && npm run start -w @just1date/admin",
        url: "http://localhost:3001",
        timeout: 180000,
        reuseExistingServer: false,
      },
});
