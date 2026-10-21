import { defineConfig, devices } from "@playwright/test";

// Tests run against the cj-dev Supabase project.
process.loadEnvFile(".env.local");

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  // Every check waits up to 10 s: saves go to a remote Supabase project and can take over 5 s.
  expect: { timeout: 10_000 },
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    // Production build: matches the live site (prefetching, loading screens) and avoids dev-only UI.
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 240_000,
  },
});
