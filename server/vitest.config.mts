import "dotenv/config";
import { defineConfig } from "vitest/config";

// API tests run against a separate database so they never add test tickets to the
// development data. Default: the DATABASE_URL database name with a "_test" suffix.
function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set in server/.env");
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `${url.pathname.replace(/^\//, "")}_test`;
  return url.toString();
}

const TEST_DATABASE_URL = testDatabaseUrl();
process.env.TEST_DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    env: { DATABASE_URL: TEST_DATABASE_URL, NODE_ENV: "test" },
    // Test files share one database, so run them one at a time
    fileParallelism: false,
  },
});
