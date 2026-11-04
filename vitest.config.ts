import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: "./tests/global-setup.ts",
    env: {
      // Tests run on an isolated Postgres database (reset in global-setup).
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://nicfinder:nicfinder_dev@localhost:5432/nicfinder_test",
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
