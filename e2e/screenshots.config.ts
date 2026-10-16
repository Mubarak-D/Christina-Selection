import base from "../playwright.config";
import { defineConfig } from "@playwright/test";

// Runs the manual screenshot script after the normal login setup.
export default defineConfig({
  ...base,
  testDir: ".", // this file lives in e2e/
  webServer: { ...(base.webServer as object), cwd: ".." } as typeof base.webServer,
  projects: [
    base.projects![0],
    { name: "shots", testMatch: /\.manual\.ts/, dependencies: ["setup"] },
  ],
});
