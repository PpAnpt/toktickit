/**
 * End-to-End Tests (Lab 4, Issue #31): Actions Taken on the Ticket Detail screens.
 * Traceable to AC-01, AC-03, AC-05, AC-06, AC-08, AC-27, AC-31, AC-32, AC-34, AC-37, AC-39
 * Test IDs: E2E-01..05, E2E-13..15 (docs/lab-04/tests.md).
 *
 * Run against an isolated database (see the README): the servers started by Playwright inherit
 * DATABASE_URL from the environment.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:3000';
const PASSWORD = 'Password123!';
const ACCOUNTS = {
  david: 'david.lee@example.com',      // Requester, owns the test Tickets
  sarah: 'sarah.connor@example.com',   // IT Staff
  james: 'james.gordon@example.com',   // IT Staff
  admin: 'admin@example.com',          // Administrator
} as const;

async function apiLogin(request: APIRequestContext, email: string, password = PASSWORD) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return { token: body.token as string, user: body.user as { id: number; name: string } };
}

async function newTicket(request: APIRequestContext) {
  const { token } = await apiLogin(request, ACCOUNTS.david);
  const summary = `E2E Lab 4 actions ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const res = await request.post(`${API}/api/tickets`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { summary, description: 'Created by the Lab 4 Actions Taken E2E tests.', categoryId: 1, relatedSystemId: 1, requestedPriority: 'LOW' },
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: number; ticketNumber: string; summary: string };
}

async function apiCreateAction(request: APIRequestContext, token: string, ticketId: number, body: Record<string, unknown>) {
  const res = await request.post(`${API}/api/staff/tickets/${ticketId}/actions`, { headers: { Authorization: `Bearer ${token}` }, data: body });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()).action as { id: number; updatedAt: string };
}

async function apiEditAction(request: APIRequestContext, token: string, ticketId: number, actionId: number, body: Record<string, unknown>) {
  const res = await request.patch(`${API}/api/staff/tickets/${ticketId}/actions/${actionId}`, { headers: { Authorization: `Bearer ${token}` }, data: body });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()).action as { id: number; updatedAt: string };
}

async function signIn(page: Page, email: string) {
  await page.goto('/');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign In")');
}

async function openTicketAsStaff(page: Page, email: string, ticketNumber: string) {
  await signIn(page, email);
  await page.getByRole('button', { name: /^Ticket Queue/ }).click();
  // Let the first page of the queue load before searching, so the initial load cannot overwrite the search
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await page.fill('input[placeholder*="Search ticket #, summary, requester"]', ticketNumber);
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  await page.locator(`tr:has-text("${ticketNumber}")`).locator('button:has-text("View")').click();
  await expect(page.getByRole('heading', { name: /Actions Taken/ })).toBeVisible();
}

async function openTicketAsRequester(page: Page, summary: string) {
  await signIn(page, ACCOUNTS.david);
  await page.click('button:has-text("My Tickets")');
  await page.click(`.ticket-card:has-text("${summary}")`);
  await expect(page.getByRole('heading', { name: /Actions Taken/ })).toBeVisible();
}

const cards = (page: Page) => page.getByRole('article');

async function fillAction(page: Page, description: string, result?: string) {
  await page.getByLabel('Action description').fill(description);
  if (result !== undefined) await page.getByLabel(/^Result/).fill(result);
}

test.describe('Lab 4: Actions Taken (Issue #31)', () => {
  test('E2E-01: staff records an action and the Requester sees it read-only', async ({ page, request }) => {
    const ticket = await newTicket(request);
    await openTicketAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);

    await page.getByRole('button', { name: '+ Add Action' }).click();
    await fillAction(page, 'Replaced the faulty network cable', 'Link restored');
    await page.getByRole('button', { name: 'Save action' }).click();
    await expect(page.getByText('Action saved.')).toBeVisible();
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('Performed by Sarah Connor');

    await page.click('button:has-text("Logout")');
    await openTicketAsRequester(page, ticket.summary);
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText('Replaced the faulty network cable');
    await expect(cards(page).first()).toContainText('Link restored');
    await expect(page.getByRole('button', { name: '+ Add Action' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
  });

  test('E2E-02: a stale edit shows the conflict banner, keeps the text, and succeeds after reloading', async ({ page, request }) => {
    const ticket = await newTicket(request);
    const sarah = await apiLogin(request, ACCOUNTS.sarah);
    const action = await apiCreateAction(request, sarah.token, ticket.id, { description: 'Original description', result: 'Original result' });

    await openTicketAsStaff(page, ACCOUNTS.james, ticket.ticketNumber);
    await cards(page).first().getByRole('button', { name: 'Edit', exact: true }).click();

    // Someone else changes the action while James has the form open
    await apiEditAction(request, sarah.token, ticket.id, action.id, { description: 'Edited by Sarah meanwhile', expectedUpdatedAt: action.updatedAt });

    await page.getByLabel('Action description').fill("James's careful edit");
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('alert')).toContainText('changed by someone else');
    await expect(page.getByLabel('Action description')).toHaveValue("James's careful edit");

    await page.getByRole('button', { name: 'Reload latest' }).click();
    await expect(page.getByText(/Latest version loaded/)).toBeVisible();
    await expect(page.getByLabel('Action description')).toHaveValue("James's careful edit");
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Action saved.')).toBeVisible();
    await expect(cards(page).first()).toContainText("James's careful edit");
  });

  test('E2E-03: a follow-up without a note is rejected under the field, then accepted once fixed', async ({ page, request }) => {
    const ticket = await newTicket(request);
    await openTicketAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);

    await page.getByRole('button', { name: '+ Add Action' }).click();
    await fillAction(page, 'Checked the router', 'Firmware is current');
    await page.getByLabel('Follow-up required?').check();
    await page.getByRole('button', { name: 'Save action' }).click();
    await expect(page.getByText('Follow-up note is required when follow-up is needed.')).toBeVisible();
    await expect(cards(page)).toHaveCount(0);

    await page.getByLabel(/Follow-up note/).fill('Check again on Friday');
    await page.getByRole('button', { name: 'Save action' }).click();
    await expect(page.getByText('Action saved.')).toBeVisible();
    await expect(cards(page).first()).toContainText('Check again on Friday');
  });

  test('E2E-04: two staff members record actions on one Ticket and the owner stays the same', async ({ page, request }) => {
    const ticket = await newTicket(request);
    const sarah = await apiLogin(request, ACCOUNTS.sarah);
    // Lab 4 (BR-19): the owner change carries the Ticket's current updatedAt
    const current = await (await request.get(`${API}/api/staff/tickets/${ticket.id}`, { headers: { Authorization: `Bearer ${sarah.token}` } })).json();
    const claim = await request.patch(`${API}/api/staff/tickets/${ticket.id}/owner`, { headers: { Authorization: `Bearer ${sarah.token}` }, data: { ownerId: sarah.user.id, expectedUpdatedAt: current.updatedAt } });
    expect(claim.status()).toBe(200);
    await apiCreateAction(request, sarah.token, ticket.id, { description: 'First action by the owner', result: 'Done' });

    await openTicketAsStaff(page, ACCOUNTS.james, ticket.ticketNumber);
    await page.getByRole('button', { name: '+ Add Action' }).click();
    await fillAction(page, 'Second action by another staff member', 'Also done');
    await page.getByRole('button', { name: 'Save action' }).click();
    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page).filter({ hasText: 'First action by the owner' })).toContainText('Performed by Sarah Connor');
    await expect(cards(page).filter({ hasText: 'Second action by another staff member' })).toContainText('Performed by James Gordon');

    const detail = await request.get(`${API}/api/staff/tickets/${ticket.id}`, { headers: { Authorization: `Bearer ${sarah.token}` } });
    expect((await detail.json()).owner.id).toBe(sarah.user.id);
  });

  test('E2E-05: a double click on Save creates exactly one action', async ({ page, request }) => {
    const ticket = await newTicket(request);
    await openTicketAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);

    await page.getByRole('button', { name: '+ Add Action' }).click();
    await fillAction(page, 'Double click target', 'Only once');
    await page.getByRole('button', { name: 'Save action' }).dblclick();
    await expect(page.getByText('Action saved.')).toBeVisible();
    await expect(cards(page)).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Actions Taken (1)' })).toBeVisible();
  });

  test('E2E-13: plan an action for another person, start and complete it, and cancel a different one on one Ticket', async ({ page, request }) => {
    const ticket = await newTicket(request);
    await openTicketAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);

    // Plan an action assigned to James
    await page.getByRole('button', { name: '+ Add Action' }).click();
    await fillAction(page, 'Swap the faulty cable');
    await page.getByLabel('Status').selectOption('Planned');
    await page.getByLabel('Assignee').selectOption({ label: 'James Gordon' });
    await page.getByRole('button', { name: 'Save action' }).click();
    const swap = cards(page).filter({ hasText: 'Swap the faulty cable' });
    await expect(swap).toContainText('Planned');
    await expect(swap).toContainText('Assigned to James Gordon');

    // Start, then complete with a result
    await swap.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByRole('button', { name: 'Start action' }).click();
    await expect(swap).toContainText('In Progress');
    await swap.getByRole('button', { name: 'Complete', exact: true }).click();
    await page.getByLabel(/^Result/).fill('Cable swapped and tested');
    await page.getByRole('button', { name: 'Mark as completed' }).click();
    await expect(swap).toContainText('Completed');
    await expect(swap).toContainText('Cable swapped and tested');
    await expect(swap.getByRole('button', { name: 'Complete', exact: true })).toHaveCount(0);

    // A second action is planned and cancelled with a reason
    await page.getByRole('button', { name: '+ Add Action' }).click();
    await fillAction(page, 'Visit the second floor');
    await page.getByLabel('Status').selectOption('Planned');
    await page.getByRole('button', { name: 'Save action' }).click();
    const visit = cards(page).filter({ hasText: 'Visit the second floor' });
    await visit.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel action' }).click();
    await expect(page.getByText('Enter the reason for cancelling.')).toBeVisible();
    await page.getByLabel(/Reason for cancelling/).fill('The user fixed it themselves');
    await page.getByRole('button', { name: 'Cancel action' }).click();
    await expect(visit).toContainText('Cancelled');

    // Different assignees and statuses are visible together
    await expect(cards(page)).toHaveCount(2);
    await expect(cards(page).filter({ hasText: 'Visit the second floor' })).toContainText('Assigned to Sarah Connor');
  });

  test('E2E-14: two users edit an action; staff see ordered Before/After history and the Requester sees none', async ({ page, request }) => {
    const ticket = await newTicket(request);
    const sarah = await apiLogin(request, ACCOUNTS.sarah);
    const james = await apiLogin(request, ACCOUNTS.james);
    const created = await apiCreateAction(request, sarah.token, ticket.id, { description: 'Check the switch', result: 'Looks fine' });
    const byJames = await apiEditAction(request, james.token, ticket.id, created.id, { result: 'Port 4 is flapping', expectedUpdatedAt: created.updatedAt });
    await apiEditAction(request, sarah.token, ticket.id, created.id, { result: 'Port 4 replaced', expectedUpdatedAt: byJames.updatedAt });

    await openTicketAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);
    await cards(page).first().locator('summary').click();
    const history = cards(page).first().locator('details');
    await expect(history.locator('li')).toHaveCount(3);
    await expect(history.locator('li').nth(1)).toContainText('James Gordon');
    await expect(history.locator('li').nth(1)).toContainText('Before: Looks fine');
    await expect(history.locator('li').nth(1)).toContainText('After: Port 4 is flapping');
    await expect(history.locator('li').nth(2)).toContainText('Sarah Connor');
    await expect(history.locator('li').nth(2)).toContainText('After: Port 4 replaced');
    await expect(history.getByRole('button')).toHaveCount(0);

    await page.click('button:has-text("Logout")');
    await openTicketAsRequester(page, ticket.summary);
    await expect(cards(page).first()).toContainText('Port 4 replaced');
    await expect(page.locator('summary:has-text("History")')).toHaveCount(0);
  });

  test('E2E-15: an inactive staff member cannot be chosen in the UI and the API rejects the assignment', async ({ page, request }) => {
    const ticket = await newTicket(request);
    const admin = await apiLogin(request, ACCOUNTS.admin, 'Admin123!');
    const users = await request.get(`${API}/api/admin/users`, { headers: { Authorization: `Bearer ${admin.token}` } });
    const body = await users.json();
    const list = (Array.isArray(body) ? body : body.users ?? body.data ?? []) as { id: number; email: string; isActive: boolean }[];
    const marcus = list.find(u => u.email === 'marcus.wright@example.com')!;
    expect(marcus.isActive).toBe(false);

    await openTicketAsStaff(page, ACCOUNTS.sarah, ticket.ticketNumber);
    await page.getByRole('button', { name: '+ Add Action' }).click();
    const options = await page.getByLabel('Assignee').locator('option').allTextContents();
    expect(options.join('|')).not.toContain('Marcus');
    expect(options).toEqual(expect.arrayContaining(['Sarah Connor', 'James Gordon']));

    const sarah = await apiLogin(request, ACCOUNTS.sarah);
    const direct = await request.post(`${API}/api/staff/tickets/${ticket.id}/actions`, {
      headers: { Authorization: `Bearer ${sarah.token}` },
      data: { description: 'Assign to the inactive member', result: 'n/a', assigneeId: marcus.id },
    });
    expect(direct.status()).toBe(400);
    expect((await direct.json()).details.assigneeId).toMatch(/active IT Staff or Administrator/);
  });
});
