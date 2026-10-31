/**
 * Lab 4 evidence capture: Actions Taken at desktop / tablet / mobile (Part 6 and Part 9).
 * Run (isolated database, from the repo root):
 *   DATABASE_URL=<.../localdb_test> npx playwright test --config scripts/screenshots-lab4.config.ts
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const API = 'http://localhost:3000';
const OUT = path.resolve(__dirname, '../artifacts/lab-04/screenshots/actions-taken');
const PASSWORD = 'Password123!';

const VIEWPORTS = [
  { name: 'desktop', size: { width: 1280, height: 800 } },
  { name: 'tablet', size: { width: 768, height: 1024 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

async function shot(page: Page, name: string) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function login(request: APIRequestContext, email: string, password = PASSWORD) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  const body = await res.json();
  return { token: body.token as string, user: body.user as { id: number } };
}

async function signIn(page: Page, email: string) {
  await page.goto('/');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign In")');
}

test('Lab 4 Actions Taken screenshots (desktop, tablet, mobile)', async ({ page, request }) => {
  test.setTimeout(240_000);

  // Arrange one Ticket with different assignees and all four action statuses, plus an edited action
  const david = await login(request, 'david.lee@example.com');
  const sarah = await login(request, 'sarah.connor@example.com');
  const james = await login(request, 'james.gordon@example.com');
  const summary = `Lab 4 evidence: flickering display ${Date.now()}`;
  const created = await request.post(`${API}/api/tickets`, {
    headers: { Authorization: `Bearer ${david.token}` },
    data: { summary, description: 'The external monitor flickers when the dock is connected.', categoryId: 1, relatedSystemId: 1, requestedPriority: 'HIGH' },
  });
  const ticket = (await created.json()) as { id: number; ticketNumber: string };
  const post = async (token: string, body: Record<string, unknown>) =>
    (await (await request.post(`${API}/api/staff/tickets/${ticket.id}/actions`, { headers: { Authorization: `Bearer ${token}` }, data: body })).json()).action;
  const patch = async (token: string, id: number, body: Record<string, unknown>) =>
    (await (await request.patch(`${API}/api/staff/tickets/${ticket.id}/actions/${id}`, { headers: { Authorization: `Bearer ${token}` }, data: body })).json()).action;

  const completed = await post(sarah.token, {
    description: 'Checked the HDMI cable and the monitor port.', result: 'Port works; the flicker only appears with the dock.',
    followUpRequired: true, followUpNote: 'Re-test after the firmware update.', attachmentNotes: 'Photo of the dock label is in Tickets/1',
  });
  await patch(james.token, completed.id, { result: 'Port and cable work; the flicker only appears when the dock is connected.', expectedUpdatedAt: completed.updatedAt });
  await post(sarah.token, { description: 'Update the dock firmware.', status: 'In Progress', assigneeId: james.user.id });
  await post(james.token, { description: 'Replace the dock if the firmware does not help.', status: 'Planned', actionAt: new Date(Date.now() + 2 * 86_400_000).toISOString() });
  const cancelled = await post(sarah.token, { description: 'Swap in a loan monitor.', status: 'Planned' });
  await patch(sarah.token, cancelled.id, { status: 'Cancelled', result: 'Cancelled: the monitor was ruled out.', expectedUpdatedAt: cancelled.updatedAt });

  for (const { name, size } of VIEWPORTS) {
    await page.setViewportSize(size);

    // IT Staff: list, create form, validation, history
    await signIn(page, 'sarah.connor@example.com');
    await expect(page.getByRole('button', { name: /View/ }).first()).toBeVisible(); // table row or mobile card
    await page.fill('input[placeholder*="Search ticket #, summary, requester"]', ticket.ticketNumber);
    await page.waitForTimeout(800);
    await page.getByRole('button', { name: /View/ }).first().click();
    await expect(page.getByRole('heading', { name: /Actions Taken/ })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(4);
    await shot(page, `${name}-staff-list`);

    await page.getByRole('button', { name: '+ Add Action' }).click();
    await page.getByRole('button', { name: 'Save action' }).click();
    await expect(page.getByText('Describe what was done.')).toBeVisible();
    await shot(page, `${name}-staff-create-validation`);
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('article').filter({ hasText: 'Checked the HDMI cable' }).locator('summary').click();
    await expect(page.getByText(/Before:/).first()).toBeVisible();
    await shot(page, `${name}-staff-history`);
    await page.click('button:has-text("Logout")');

    // Requester: the same Actions Taken, read-only
    await signIn(page, 'david.lee@example.com');
    await page.click('button:has-text("My Tickets")');
    await page.click(`.ticket-card:has-text("${summary}")`);
    await expect(page.getByRole('article')).toHaveCount(4);
    await expect(page.getByRole('button', { name: '+ Add Action' })).toHaveCount(0);
    await shot(page, `${name}-requester-readonly`);
    await page.click('button:has-text("Logout")');
  }
});
