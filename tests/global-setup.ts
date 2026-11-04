// Creates a fresh, throwaway SQLite database for the test run.
// We remove the old file ourselves and run a plain (non-destructive)
// `prisma db push` against the new empty file.
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default function setup() {
  const dbFile = path.join(process.cwd(), "prisma", "test.db");
  for (const f of [dbFile, `${dbFile}-journal`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });
}
