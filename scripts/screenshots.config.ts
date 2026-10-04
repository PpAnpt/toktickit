import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import baseConfig from '../playwright.config';

const repoRoot = path.resolve(__dirname, '..');
const baseServers = Array.isArray(baseConfig.webServer) ? baseConfig.webServer : [];

// Regenerates artifacts/lab-03/screenshots from the running app.
// Usage (from the repo root, after `npx prisma db seed` in server/):
//   npx playwright test --config scripts/screenshots.config.ts
export default defineConfig({
  ...baseConfig,
  testDir: '.',
  testMatch: 'capture-screenshots.spec.ts',
  timeout: 120_000,
  // Run the dev servers from the repo root, like the main E2E config
  webServer: baseServers.map((server) => ({ ...server, cwd: repoRoot })),
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
