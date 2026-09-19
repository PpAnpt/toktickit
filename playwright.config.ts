import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm --prefix server run dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npm --prefix client run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
