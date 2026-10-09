import { config } from "dotenv";
import { defineConfig } from "vitest/config";

const parsed = config({ path: ".env.test", override: true }).parsed ?? {};

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    testTimeout: 15000,
    hookTimeout: 20000,
    // Integration tests share one real Postgres connection pool per worker and
    // mutate common tables — run test files serially to avoid cross-file races.
    fileParallelism: false,
    globalSetup: ["./tests/global-setup.ts"],
    // Explicitly forward .env.test values to the worker that runs test files —
    // dotenv only mutates process.env in this (main) process, which workers
    // don't automatically inherit.
    // GEMINI_API_KEY is forced empty: env.ts also loads .env, where a real key
    // lives for local development, and tests must never spend real quota.
    // AI tests swap in a fake provider instead.
    env: { ...parsed, GEMINI_API_KEY: "" },
  },
});
