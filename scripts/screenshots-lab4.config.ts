import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import baseConfig from '../playwright.config';

const repoRoot = path.resolve(__dirname, '..');
const baseServers = Array.isArray(baseConfig.webServer) ? baseConfig.webServer : [];

// Regenerates artifacts/lab-04/screenshots from the running app.
// Use an isolated database: DATABASE_URL=<.../localdb_test> npx playwright test --config scripts/screenshots-lab4.config.ts
export default defineConfig({
  ...baseConfig,
  testDir: '.',
  testMatch: /capture-lab4(-workflow)?-screenshots.spec.ts/,
  timeout: 240_000,
  webServer: baseServers.map((server) => ({ ...server, cwd: repoRoot })),
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
