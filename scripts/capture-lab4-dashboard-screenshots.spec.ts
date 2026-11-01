/**
 * Lab 4 evidence capture: Requester and IT Staff dashboards at desktop / tablet / mobile (Part 7 and Part 9).
 * Run (isolated database, from the repo root, after `npx prisma db seed` on that database):
 *   DATABASE_URL=<.../localdb_test> npx playwright test --config scripts/screenshots-lab4.config.ts capture-lab4-dashboard-screenshots
 */
import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const OUT = path.resolve(__dirname, '../artifacts/lab-04/screenshots');
const PASSWORD = 'Password123!';

const VIEWPORTS = [
  { name: 'desktop', size: { width: 1280, height: 800 } },
  { name: 'tablet', size: { width: 768, height: 1024 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

async function shot(page: Page, folder: string, name: string) {
  const dir = path.join(OUT, folder);
  fs.mkdirSync(dir, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

async function signIn(page: Page, email: string, password = PASSWORD, startPath = '/') {
  await page.goto(startPath);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]:has-text("Sign In")');
}

const signOut = async (page: Page) => {
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.locator('#email')).toBeVisible();
};

test('Lab 4 dashboard screenshots (desktop, tablet, mobile)', async ({ page }) => {
  test.setTimeout(240_000);

  for (const { name, size } of VIEWPORTS) {
    await page.setViewportSize(size);
    const noHorizontalScroll = async () =>
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Requester with Tickets in every card
    await signIn(page, 'david.lee@example.com');
    await expect(page.getByRole('link', { name: /^Open Tickets: \d+/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Recent Tickets' })).toBeVisible();
    await noHorizontalScroll();
    await shot(page, 'requester-dashboard', `${name}-dashboard`);
    // Drill-down result of the Recently Resolved card
    await page.getByRole('link', { name: /^Recently Resolved: \d+/ }).click();
    await expect(page.getByTestId('my-tickets-total')).toBeVisible();
    await noHorizontalScroll();
    await shot(page, 'requester-dashboard', `${name}-drill-down-recently-resolved`);
    await signOut(page);

    // Requester whose cards are partly zero, and the forbidden state of the other role's URL
    await signIn(page, 'jennifer.anderson@example.com');
    await expect(page.getByText('No Tickets are waiting for you.')).toBeVisible();
    await noHorizontalScroll();
    await shot(page, 'requester-dashboard', `${name}-zero-cards`);
    await signOut(page);
    await signIn(page, 'david.lee@example.com', PASSWORD, '/dashboard/staff');
    await expect(page.getByText('You do not have access to this dashboard.')).toBeVisible();
    await shot(page, 'requester-dashboard', `${name}-forbidden`);
    await signOut(page);

    // IT Staff
    await signIn(page, 'sarah.connor@example.com');
    await expect(page.getByRole('link', { name: /^Unassigned: \d+/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'My Recent Actions' })).toBeVisible();
    await noHorizontalScroll();
    await shot(page, 'staff-dashboard', `${name}-dashboard`);
    await page.getByRole('link', { name: /^Unassigned: \d+/ }).click();
    await expect(page.getByLabel('Owner', { exact: true })).toHaveValue('unassigned');
    await noHorizontalScroll();
    await shot(page, 'staff-dashboard', `${name}-drill-down-unassigned`);
    await signOut(page);

    // Administrator: the same dashboard with the Accounts strip
    await signIn(page, 'admin@example.com', 'Admin123!');
    await expect(page.getByRole('region', { name: 'Accounts' })).toBeVisible();
    await noHorizontalScroll();
    await shot(page, 'staff-dashboard', `${name}-dashboard-administrator`);
    await signOut(page);
  }
});
