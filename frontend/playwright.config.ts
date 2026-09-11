import { defineConfig } from "@playwright/test";

// Requires the backend API (and its Postgres) already running on :4000 — this
// config only manages the frontend dev server. See backend/README-less setup:
// `docker compose up -d postgres && npm run dev` in backend/ before running these.
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
