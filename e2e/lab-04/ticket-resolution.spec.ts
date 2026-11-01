/**
 * End-to-End Tests (Lab 4, Issue #32): Ticket workflow, resolution gate and conflicts.
 * Traceable to AC-11, AC-12, AC-13, AC-15, AC-33.
 * Test IDs: E2E-06, E2E-07, E2E-08, E2E-16 (docs/lab-04/tests.md).
 *
 * Run against an isolated database (see the README): the servers started by Playwright inherit
 * DATABASE_URL from the environment.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:3000';
const PASSWORD = 'Password123!';
const ACCOUNTS = {
  david: 'david.lee@example.com',
  sarah: 'sarah.connor@example.com',
  james: 'james.gordon@example.com',
} as const;

async function apiLogin(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return { token: body.token as string, user: body.user as { id: number; name: string } };
}

const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

async function newTicket(request: APIRequestContext) {
  const { token } = await apiLogin(request, ACCOUNTS.david);
  const summary = `E2E Lab 4 workflow ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const res = await request.post(`${API}/api/tickets`, {
    headers: authHeader(token),
    data: { summary, description: 'Created by the Lab 4 workflow E2E tests.', categoryId: 1, relatedSystemId: 1, requestedPriority: 'LOW' },
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: number; ticketNumber: string; summary: string };
}

/** Claims the Ticket as the given staff member through the API, so it starts as Open */
async function openByApi(request: APIRequestContext, ticketId: number, email: string) {
  const { token, user } = await apiLogin(request, email);
  const detail = await (await request.get(`${API}/api/staff/tickets/${ticketId}`, { headers: authHeader(token) })).json();
  const res = await request.patch(`${API}/api/staff/tickets/${ticketId}/owner`, {
    headers: authHeader(token), data: { ownerId: user.id, expectedUpdatedAt: detail.updatedAt },
  });
  expect(res.status(), await res.text()).toBe(200);
  return token;
}

async function createAction(request: APIRequestContext, token: string, ticketId: number, body: Record<string, unknown>) {
  const res = await request.post(`${API}/api/staff/tickets/${ticketId}/actions`, { headers: authHeader(token), data: body });
  expect(res.status(), await res.text()).toBe(201);
}

async function ticketOf(request: APIRequestContext, token: string, ticketId: number) {
  return (await (await request.get(`${API}/api/staff/tickets/${ticketId}`, { headers: authHeader(token) })).json()) as
    { status: string; updatedAt: string; resolvedAt: string | null; indicatedResolvedAt: string | null };
}

async function signIn(page: Page, email: string) {
  await page.goto('/');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign In")');
}

async function openAsStaff(page: Page, email: string, ticketNumber: string) {
  await signIn(page, email);
  await page.getByRole('button', { name: /^Ticket Queue/ }).click();
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.fill('input[placeholder*="Search ticket #, summary, requester"]', ticketNumber);
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  await page.locator(`tr:has-text("${ticketNumber}")`).locator('button:has-text("View")').click();
  await expect(page.getByRole('heading', { name: /Actions Taken/ })).toBeVisible();
}

const move = (page: Page, status: string) => page.getByRole('button', { name: new RegExp(`Move to ${status}`) });
const statusMessage = (page: Page, status: string) => page.getByText(`Status changed to ${status}.`);

test.describe('Lab 4: Ticket workflow (Issue #32)', () => {
  test('E2E-06: Resolved is blocked without an action, then succeeds once a completed action exists', async ({ page, request }) => {
    const ticket = await newTicket(request);
    await openByApi(request, ticket.id, ACCOUNTS.sarah);
    await openAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);

    await expect(page.getByText('Resolving requires one completed action and no open actions.')).toBeVisible();
    await move(page, 'Resolved').click();
    const gate = page.getByTestId('resolution-gate-message');
    await expect(gate).toContainText('No completed action');
    await expect(gate.getByRole('link', { name: 'Go to Actions Taken' })).toBeVisible();
    await gate.getByRole('link', { name: 'Go to Actions Taken' }).click();
    await expect(page.getByRole('heading', { name: /Actions Taken/ })).toBeInViewport(); // the link really goes to the section
    await expect(page.getByRole('button', { name: '+ Add Action' })).toBeVisible(); // and the screen did not navigate away
    await expect(statusMessage(page, 'Resolved')).toHaveCount(0);
    await expect(move(page, 'Resolved')).toBeEnabled(); // the server stays the authority

    await page.getByRole('button', { name: '+ Add Action' }).click();
    await page.getByLabel('Action description').fill('Replaced the dock firmware');
    await page.getByLabel(/^Result/).fill('Display stable for an hour');
    await page.getByRole('button', { name: 'Save action' }).click();
    await expect(page.getByText('Action saved.')).toBeVisible();

    await move(page, 'Resolved').click();
    await expect(statusMessage(page, 'Resolved')).toBeVisible();
    await expect(page.getByRole('heading', { name: ticket.ticketNumber }).locator('..').getByText('Resolved')).toBeVisible();
    await expect(move(page, 'Closed')).toBeVisible();
    await expect(move(page, 'Reopened')).toBeVisible();
    await expect(page.getByTestId('resolution-gate-message')).toHaveCount(0);

    // The Ticket history lists the claim and the resolution, oldest first
    const history = page.getByRole('region', { name: 'Ticket history' });
    await expect(history.getByRole('listitem').first()).toContainText('Owner: Unassigned');
    await expect(history.getByRole('listitem').last()).toContainText('Status: Open → Resolved');
  });

  test('E2E-07: the Requester indication is advisory; only staff resolve and close', async ({ page, request }) => {
    const ticket = await newTicket(request);
    const staffToken = await openByApi(request, ticket.id, ACCOUNTS.sarah);
    await createAction(request, staffToken, ticket.id, { description: 'Checked the cable', result: 'Cable is fine' });

    // The Requester says it looks resolved
    await signIn(page, ACCOUNTS.david);
    await page.click('button:has-text("My Tickets")');
    await page.click(`.ticket-card:has-text("${ticket.summary}")`);
    await page.click('button:has-text("My Problem Appears Resolved")');
    await expect(page.locator('text=You indicated this appears resolved')).toBeVisible();
    await page.click('button:has-text("Logout")');

    const afterIndication = await ticketOf(request, staffToken, ticket.id);
    expect(afterIndication.status).toBe('Open');
    expect(afterIndication.indicatedResolvedAt).not.toBeNull();

    // Staff see the notice, review and decide
    await openAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);
    await expect(page.getByText(/Requester says the problem appears resolved\. Review the actions and update the Ticket\./)).toBeVisible();
    await expect(move(page, 'Resolved')).toBeVisible();
    await move(page, 'Resolved').click();
    await expect(statusMessage(page, 'Resolved')).toBeVisible();
    // once resolved the advisory notice is no longer shown, and the Resolved date is
    await expect(page.getByText(/Requester says the problem appears resolved/)).toHaveCount(0);
    await expect(page.getByText('Resolved:')).toBeVisible();
    await move(page, 'Closed').click();
    await expect(statusMessage(page, 'Closed')).toBeVisible();
    await expect(page.getByText(/No further status transitions are permitted/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^→ Move to/ })).toHaveCount(0);
    expect((await ticketOf(request, staffToken, ticket.id)).status).toBe('Closed');
  });

  test('E2E-08: reopening clears the indication; a change made elsewhere shows a conflict with Reload', async ({ page, request }) => {
    const ticket = await newTicket(request);
    const sarahToken = await openByApi(request, ticket.id, ACCOUNTS.sarah);
    await createAction(request, sarahToken, ticket.id, { description: 'Reseated the memory', result: 'Boots normally' });
    const david = await apiLogin(request, ACCOUNTS.david);
    expect((await request.post(`${API}/api/tickets/${ticket.id}/indicate-resolved`, { headers: authHeader(david.token) })).status()).toBe(200);

    await openAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);
    await move(page, 'Resolved').click();
    await expect(statusMessage(page, 'Resolved')).toBeVisible();
    await move(page, 'Reopened').click();
    await expect(statusMessage(page, 'Reopened')).toBeVisible();
    await expect(page.getByText(/Requester says the problem appears resolved/)).toHaveCount(0);
    const reopened = await ticketOf(request, sarahToken, ticket.id);
    expect(reopened.status).toBe('Reopened');
    expect(reopened.resolvedAt).toBeNull();
    expect(reopened.indicatedResolvedAt).toBeNull();

    // James changes the priority while Sarah still looks at the old version
    const james = await apiLogin(request, ACCOUNTS.james);
    const changed = await request.patch(`${API}/api/staff/tickets/${ticket.id}/priority`, {
      headers: authHeader(james.token), data: { itPriority: 'URGENT', expectedUpdatedAt: reopened.updatedAt },
    });
    expect(changed.status()).toBe(200);

    await move(page, 'In Progress').click();
    const conflict = page.getByTestId('conflict-message');
    await expect(conflict).toContainText('changed by someone else');
    await expect(statusMessage(page, 'In Progress')).toHaveCount(0);
    expect((await ticketOf(request, sarahToken, ticket.id)).status).toBe('Reopened');

    await conflict.getByRole('button', { name: 'Reload' }).click();
    await expect(page.getByTestId('conflict-message')).toHaveCount(0);
    await move(page, 'In Progress').click();
    await expect(statusMessage(page, 'In Progress')).toBeVisible();
    expect((await ticketOf(request, sarahToken, ticket.id)).status).toBe('In Progress');
  });

  test('E2E-16: cancelling with unsaved Action text asks first; declining keeps the Ticket and the text', async ({ page, request }) => {
    const ticket = await newTicket(request);
    const staffToken = await openByApi(request, ticket.id, ACCOUNTS.sarah);
    await createAction(request, staffToken, ticket.id, { description: 'Existing action', result: 'Done' });
    await openAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);

    await page.getByRole('button', { name: '+ Add Action' }).click();
    await page.getByLabel('Action description').fill('Half-written action that must not be lost');

    const dialogs: string[] = [];
    let accept = false;
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      if (accept) await dialog.accept(); else await dialog.dismiss();
    });

    await move(page, 'Cancelled').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel Ticket' }).click();
    await expect.poll(() => dialogs.length).toBe(1);
    expect(dialogs[0]).toContain('unsaved text');
    await expect(page.getByLabel('Action description')).toHaveValue('Half-written action that must not be lost');
    expect((await ticketOf(request, staffToken, ticket.id)).status).toBe('Open');

    accept = true;
    await move(page, 'Cancelled').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel Ticket' }).click();
    await expect(statusMessage(page, 'Cancelled')).toBeVisible();
    // the draft is still there, but it can no longer be saved
    await expect(page.getByLabel('Action description')).toHaveValue('Half-written action that must not be lost');
    await expect(page.getByText(/can no longer be saved/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save action' })).toBeDisabled();
    expect((await ticketOf(request, staffToken, ticket.id)).status).toBe('Cancelled');
  });

  test('E2E-16: cancelling a Ticket asks first and cancels its open actions automatically', async ({ page, request }) => {
    const ticket = await newTicket(request);
    const staffToken = await openByApi(request, ticket.id, ACCOUNTS.sarah);
    await createAction(request, staffToken, ticket.id, { description: 'Finished the data copy', result: 'All files copied' });
    await createAction(request, staffToken, ticket.id, { description: 'Plan the new laptop', status: 'Planned' });
    await createAction(request, staffToken, ticket.id, { description: 'Reinstall the OS', status: 'In Progress' });

    await openAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);
    await expect(page.getByRole('article')).toHaveCount(3);

    await move(page, 'Cancelled').click();
    const panel = page.getByRole('alertdialog', { name: 'Cancel this Ticket?' });
    await expect(panel).toContainText('open actions');
    await panel.getByRole('button', { name: 'Keep Ticket' }).click();
    await expect(panel).toHaveCount(0);
    expect((await ticketOf(request, staffToken, ticket.id)).status).toBe('Open');

    await move(page, 'Cancelled').click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel Ticket' }).click();
    await expect(statusMessage(page, 'Cancelled')).toBeVisible();

    const articles = page.getByRole('article');
    await expect(articles.filter({ hasText: 'Plan the new laptop' })).toContainText('Cancelled because the Ticket was cancelled.');
    await expect(articles.filter({ hasText: 'Reinstall the OS' })).toContainText('Cancelled because the Ticket was cancelled.');
    await expect(articles.filter({ hasText: 'Finished the data copy' })).toContainText('All files copied');
    await expect(articles.filter({ hasText: 'Finished the data copy' })).not.toContainText('Cancelled because');
    await expect(articles.filter({ hasText: 'Plan the new laptop' }).locator('.badge', { hasText: 'Cancelled' })).toBeVisible();
    await expect(page.getByText(/can no longer be added or changed/)).toBeVisible();
  });
});
