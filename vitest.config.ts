import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: {
    // DB tests hit the cj-dev Supabase project from .env.local.
    env: loadEnv("test", process.cwd(), ""),
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    fileParallelism: false,
  },
});
