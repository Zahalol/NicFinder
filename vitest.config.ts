import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./tests/global-setup.ts",
    env: {
      // Relative to prisma/schema.prisma — tests run on an isolated DB.
      DATABASE_URL: "file:./test.db",
      SESSION_SECRET: "test-secret",
      NOMINATIM_ENABLED: "false",
    },
    // DB-backed tests share one SQLite file: run serially.
    fileParallelism: false,
    testTimeout: 30_000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
