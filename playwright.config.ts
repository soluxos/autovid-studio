import { defineConfig } from "@playwright/test";

// Electron E2E. Tests launch the BUILT app (out/main/index.js), so run
// `npm run build` first — `npm test` does this for you. Single worker: the app
// writes to a JSON store and we keep runs deterministic.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
});
