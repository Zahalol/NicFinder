// Prepares the throwaway test database (TEST_DATABASE_URL, default
// nicfinder_test on localhost). The schema is rebuilt from scratch each run:
// we drop/recreate the `public` schema of the *dedicated test database* via
// SQL, then apply the Prisma schema with a plain, non-destructive `db push`.
import { execSync } from "node:child_process";

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://nicfinder:nicfinder_dev@localhost:5432/nicfinder_test";

export default function setup() {
  const url = new URL(TEST_DB_URL);
  if (!/test/i.test(url.pathname)) {
    throw new Error(
      `Refusing to reset "${url.pathname}" — the test database name must contain "test".`
    );
  }
  execSync(
    `psql "${TEST_DB_URL}" -q -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"`,
    { stdio: "inherit" }
  );
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "inherit",
  });
}
