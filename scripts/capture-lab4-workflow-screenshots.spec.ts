/**
 * Lab 4 evidence capture: Ticket workflow at desktop / tablet / mobile (Part 7 and Part 9).
 * Run (isolated database, from the repo root):
 *   DATABASE_URL=<.../localdb_test> npx playwright test --config scripts/screenshots-lab4.config.ts capture-lab4-workflow-screenshots
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const API = 'http://localhost:3000';
const OUT = path.resolve(__dirname, '../artifacts/lab-04/screenshots/ticket-workflow');
const PASSWORD = 'Password123!';

const VIEWPORTS = [
  { name: 'desktop', size: { width: 1280, height: 800 } },
  { name: 'tablet', size: { width: 768, height: 1024 } },
  { name: 'mobile', size: { width: 375, height: 812 } },
];

async function shot(page: Page, name: string) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function login(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD } });
  const body = await res.json();
  return { token: body.token as string, user: body.user as { id: number } };
}

async function signIn(page: Page, email: string) {
  await page.goto('/');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign In")');
}

test('Lab 4 Ticket workflow screenshots (desktop, tablet, mobile)', async ({ page, request }) => {
  test.setTimeout(300_000);
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const move = (status: string) => page.getByRole('button', { name: new RegExp(`Move to ${status}`) });

  for (const { name, size } of VIEWPORTS) {
    await page.setViewportSize(size);
    // Logging out in the browser revokes that session's token, so every pass signs in again for its API calls
    const david = await login(request, 'david.lee@example.com');
    const sarah = await login(request, 'sarah.connor@example.com');
    const james = await login(request, 'james.gordon@example.com');

    // A Ticket owned by Sarah with one planned action and an unrelated owner change in its history
    const summary = `Lab 4 workflow evidence ${name} ${Date.now()}`;
    const ticket = await (await request.post(`${API}/api/tickets`, {
      headers: auth(david.token),
      data: { summary, description: 'The VPN client disconnects every few minutes.', categoryId: 1, relatedSystemId: 1, requestedPriority: 'HIGH' },
    })).json() as { id: number; ticketNumber: string };
    const first = await (await request.get(`${API}/api/staff/tickets/${ticket.id}`, { headers: auth(sarah.token) })).json();
    await request.patch(`${API}/api/staff/tickets/${ticket.id}/owner`, { headers: auth(sarah.token), data: { ownerId: sarah.user.id, expectedUpdatedAt: first.updatedAt } });
    const planned = await (await request.post(`${API}/api/staff/tickets/${ticket.id}/actions`, {
      headers: auth(sarah.token), data: { description: 'Update the VPN client to the latest build', status: 'Planned' },
    })).json();
    await request.post(`${API}/api/tickets/${ticket.id}/indicate-resolved`, { headers: auth(david.token) });

    await signIn(page, 'sarah.connor@example.com');
    await expect(page.getByRole('button', { name: /View/ }).first()).toBeVisible();
    await page.fill('input[placeholder*="Search ticket #, summary, requester"]', ticket.ticketNumber);
    await expect(page.getByRole('button', { name: /View/ })).toHaveCount(1);
    await page.getByRole('button', { name: /View/ }).click();
    await expect(page.getByRole('heading', { name: /Actions Taken/ })).toBeVisible();
    await shot(page, `${name}-status-controls`);

    // Resolution gate: no completed action and one still planned
    await move('Resolved').click();
    await expect(page.getByTestId('resolution-gate-message')).toContainText('No completed action');
    await expect(page.getByTestId('resolution-gate-message')).toContainText('still planned or in progress');
    await shot(page, `${name}-resolution-gate`);

    // Cancel confirmation
    await move('Cancelled').click();
    await expect(page.getByRole('alertdialog', { name: 'Cancel this Ticket?' })).toBeVisible();
    await shot(page, `${name}-cancel-confirm`);
    await page.getByRole('button', { name: 'Keep Ticket' }).click();

    // Conflict: James changes the priority while this screen shows the old version
    const current = await (await request.get(`${API}/api/staff/tickets/${ticket.id}`, { headers: auth(james.token) })).json();
    await request.patch(`${API}/api/staff/tickets/${ticket.id}/priority`, { headers: auth(james.token), data: { itPriority: 'URGENT', expectedUpdatedAt: current.updatedAt } });
    await move('In Progress').click();
    await expect(page.getByTestId('conflict-message')).toBeVisible();
    await shot(page, `${name}-conflict`);
    await page.getByTestId('conflict-message').getByRole('button', { name: 'Reload' }).click();
    await expect(page.getByTestId('conflict-message')).toHaveCount(0);

    // Complete the planned action elsewhere, reload the screen, resolve, and show the history
    const latest = await (await request.get(`${API}/api/tickets/${ticket.id}/actions`, { headers: auth(sarah.token) })).json();
    const action = latest.actions.find((a: { id: number }) => a.id === planned.action.id);
    await request.patch(`${API}/api/staff/tickets/${ticket.id}/actions/${action.id}`, {
      headers: auth(sarah.token), data: { status: 'Completed', result: 'Client updated; the VPN stayed connected for an hour.', expectedUpdatedAt: action.updatedAt },
    });
    await page.reload();
    await page.fill('input[placeholder*="Search ticket #, summary, requester"]', ticket.ticketNumber);
    await expect(page.getByRole('button', { name: /View/ })).toHaveCount(1);
    await page.getByRole('button', { name: /View/ }).click();
    await expect(page.getByRole('heading', { name: /Actions Taken/ })).toBeVisible();
    await move('Resolved').click();
    await expect(page.getByText('Status changed to Resolved.')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Ticket history' }).getByRole('listitem').last()).toContainText('Status: Open → Resolved');
    await shot(page, `${name}-resolved-with-history`);
    await page.click('button:has-text("Logout")');
  }
});
