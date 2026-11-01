/**
 * End-to-End Tests (Lab 4, Issue #33): role dashboards, drill-down and navigation.
 * Traceable to AC-02, AC-16, AC-17, AC-18, AC-20, AC-29.
 * Test IDs: E2E-09, E2E-10, E2E-11, E2E-12 (docs/lab-04/tests.md).
 *
 * Run against an isolated database (see the README): the servers started by Playwright inherit
 * DATABASE_URL from the environment. Expected numbers are derived here from the public list APIs,
 * never from the dashboard endpoints, so a wrong card cannot confirm itself.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:3000';
const PASSWORD = 'Password123!';
const ADMIN = { email: 'admin@example.com', password: 'Admin123!' };
const DAY = 24 * 60 * 60 * 1000;
const ACTIVE = ['New', 'Open', 'In Progress', 'Waiting for Requester', 'Reopened'];

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]:has-text("Sign In")');
}

async function apiToken(request: APIRequestContext, email: string, password = PASSWORD) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  expect(res.status()).toBe(200);
  return (await res.json()).token as string;
}

/** 00:00 Asia/Bangkok six days before today, worked out here without the application code (BR-23) */
function windowStart(now = Date.now()) {
  const bangkok = now + 7 * 60 * 60 * 1000;
  return Math.floor(bangkok / DAY) * DAY - 6 * DAY - 7 * 60 * 60 * 1000;
}

/** Every page of a Ticket list (the API caps a page at 50) */
async function allTickets(request: APIRequestContext, token: string, query = '') {
  const tickets: { ticketNumber: string; status: string; updatedAt: string }[] = [];
  for (let page = 1; page < 100; page++) {
    const res = await request.get(`${API}/api/tickets?limit=50&page=${page}${query}`, { headers: { Authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    tickets.push(...body.data);
    if (page >= body.meta.totalPages) break;
  }
  return tickets;
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' });

/** The number on a card, read from its accessible name "{label}: {value}. Open list." */
async function cardValue(page: Page, label: string) {
  const link = page.getByRole('link', { name: new RegExp(`^${label}: \\d+\\. Open list\\.$`) });
  const name = (await link.getAttribute('aria-label')) ?? '';
  return Number(/: (\d+)\./.exec(name)![1]);
}

test.describe('E2E-09: Requester dashboard values and drill-down (AC-02, AC-17, AC-20)', () => {
  test('every card equals the Ticket list behind it, and the seeded Tickets are counted as the rules say', async ({ page, request }) => {
    await signIn(page, 'david.lee@example.com');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back, David!' })).toBeVisible();
    await expect(nav(page).getByRole('button', { name: /^Dashboard/ })).toHaveAttribute('aria-current', 'page');

    // Independent expectations from David's own Ticket list
    const token = await apiToken(request, 'david.lee@example.com');
    const mine = await allTickets(request, token);
    const ws = windowStart();

    const open = await cardValue(page, 'Open Tickets');
    const waiting = await cardValue(page, 'Waiting for You');
    const updated = await cardValue(page, 'Recently Updated');
    const resolved = await cardValue(page, 'Recently Resolved');
    expect(open).toBe(mine.filter(t => ACTIVE.includes(t.status)).length);
    expect(waiting).toBe(mine.filter(t => t.status === 'Waiting for Requester').length);
    expect(updated).toBe(mine.filter(t => Date.parse(t.updatedAt) >= ws).length);
    expect(open).toBeGreaterThan(0);
    expect(resolved).toBeGreaterThan(0); // the seed resolved and closed a Ticket inside the window

    // Drill-down: the list opened by each card holds exactly the number on the card
    const cards: [string, number][] = [
      ['Open Tickets', open],
      ['Waiting for You', waiting],
      ['Recently Updated', updated],
      ['Recently Resolved', resolved],
    ];
    for (const [label, value] of cards) {
      await nav(page).getByRole('button', { name: /^Dashboard/ }).click();
      await page.getByRole('link', { name: new RegExp(`^${label}: ${value}\\. Open list\\.$`) }).click();
      await expect(nav(page).getByRole('button', { name: /^My Tickets/ })).toHaveAttribute('aria-current', 'page');
      await expect(page.getByTestId('my-tickets-total')).toHaveText(`${value} ${value === 1 ? 'Ticket' : 'Tickets'}`);
    }

    // Recently Resolved: a Ticket resolved and then closed inside the window is listed, an old one is not
    const numbers = (await allTickets(request, token, '&recent=resolved')).map(t => t.ticketNumber);
    expect(numbers).toContain('TKT-2025-000115'); // Resolved 1 day ago
    expect(numbers).toContain('TKT-2025-000116'); // Closed after being resolved 2 days ago
    expect(numbers).not.toContain('TKT-2025-000106'); // Closed, but resolved 18 days ago
    expect(numbers.length).toBe(resolved);
  });

  test('a Requester with nothing waiting or recently resolved sees zeros and explanations, not blanks (AC-19)', async ({ page }) => {
    // Jennifer Anderson has open Tickets, but none waiting for her and none resolved inside the window
    await signIn(page, 'jennifer.anderson@example.com');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back, Jennifer!' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Waiting for You: 0. Open list.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Recently Resolved: 0. Open list.' })).toBeVisible();
    await expect(page.getByText('No Tickets are waiting for you.')).toBeVisible();

    // The empty card still leads to a list that agrees with it
    await page.getByRole('link', { name: 'Recently Resolved: 0. Open list.' }).click();
    await expect(page.getByTestId('my-tickets-total')).toHaveText('0 Tickets');
    await expect(page.getByText(/No tickets found/i)).toBeVisible();
  });
});

test.describe('E2E-10: IT Staff dashboard values and drill-down (AC-18, AC-20)', () => {
  test('cards and breakdown rows open the queue with the same total as the number shown', async ({ page }) => {
    await signIn(page, 'sarah.connor@example.com');
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back, Sarah!' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Accounts' })).toHaveCount(0);

    const queueTotal = (value: number) => expect(page.locator('text=Total in Queue').locator('strong')).toHaveText(String(value));
    const cards: [string, Record<string, string>][] = [
      ['Unassigned', { Owner: 'unassigned', Status: 'Active' }],
      ['My Active Tickets', { Owner: 'me', Status: 'Active' }],
      ['Urgent', { Priority: 'URGENT', Status: 'Active' }],
      ['Reopened', { Status: 'Reopened' }],
      ['Resolved - Awaiting Closure', { Status: 'Resolved' }],
    ];
    for (const [label, filters] of cards) {
      await nav(page).getByRole('button', { name: /^Dashboard/ }).click();
      const value = await cardValue(page, label);
      await page.getByRole('link', { name: new RegExp(`^${label}: ${value}\\. Open list\\.$`) }).click();
      await expect(nav(page).getByRole('button', { name: /^Ticket Queue/ })).toHaveAttribute('aria-current', 'page');
      for (const [field, expected] of Object.entries(filters)) await expect(page.getByLabel(field, { exact: true })).toHaveValue(expected);
      await queueTotal(value);
    }

    // Breakdown rows: By status uses the status, By priority the priority among Active Tickets
    await nav(page).getByRole('button', { name: /^Dashboard/ }).click();
    const byStatus = page.getByRole('region', { name: 'By status' });
    const progress = (await byStatus.getByRole('link', { name: /^In Progress: \d+$/ }).getAttribute('aria-label'))!;
    await byStatus.getByRole('link', { name: /^In Progress: \d+$/ }).click();
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('In Progress');
    await queueTotal(Number(progress.split(': ')[1]));

    await nav(page).getByRole('button', { name: /^Dashboard/ }).click();
    const byPriority = page.getByRole('region', { name: 'By priority' });
    const high = (await byPriority.getByRole('link', { name: /^HIGH: \d+$/ }).getAttribute('aria-label'))!;
    await byPriority.getByRole('link', { name: /^HIGH: \d+$/ }).click();
    await expect(page.getByLabel('Priority', { exact: true })).toHaveValue('HIGH');
    await expect(page.getByLabel('Status', { exact: true })).toHaveValue('Active');
    await queueTotal(Number(high.split(': ')[1]));
  });

  test('a Ticket row on the dashboard opens its detail and Back to Dashboard returns', async ({ page }) => {
    await signIn(page, 'sarah.connor@example.com');
    const recent = page.getByRole('region', { name: 'Recent Tickets' });
    await recent.getByRole('listitem').first().getByRole('link').click();
    await expect(page.getByRole('heading', { name: /Actions Taken/ })).toBeVisible();
    await page.getByRole('button', { name: /Back to Dashboard/ }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back, Sarah!' })).toBeVisible();
  });
});

test.describe('E2E-11: Administrator dashboard (AC-18)', () => {
  test('the Accounts strip matches the user list and is shown to the Administrator only', async ({ page, request }) => {
    const token = await apiToken(request, ADMIN.email, ADMIN.password);
    const users = (await (await request.get(`${API}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })).json()) as { role: string; isActive: boolean }[];
    const expected = {
      Requesters: users.filter(u => u.role === 'REQUESTER').length,
      'IT Staff': users.filter(u => u.role === 'IT_STAFF').length,
      Administrators: users.filter(u => u.role === 'ADMINISTRATOR').length,
      Inactive: users.filter(u => !u.isActive).length,
    };

    await signIn(page, ADMIN.email, ADMIN.password);
    await expect(page.getByRole('heading', { level: 1, name: 'Welcome back, Admin!' })).toBeVisible();
    const accounts = page.getByRole('region', { name: 'Accounts' });
    for (const [label, value] of Object.entries(expected)) {
      await expect(accounts.getByRole('link', { name: `${label}: ${value}` })).toBeVisible();
    }
    expect(expected.Inactive).toBeGreaterThan(0);
    await accounts.getByRole('link', { name: /^Inactive/ }).click();
    await expect(page.locator('h3:has-text("User Management")')).toBeVisible();

    // The same dashboard for IT Staff has no such strip, and the API does not send the counts
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.locator('#email')).toBeVisible();
    await signIn(page, 'sarah.connor@example.com');
    await expect(page.getByRole('link', { name: /^Unassigned:/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Accounts' })).toHaveCount(0);
    const staffToken = await apiToken(request, 'sarah.connor@example.com');
    const staffBody = await (await request.get(`${API}/api/dashboard/staff`, { headers: { Authorization: `Bearer ${staffToken}` } })).json();
    expect(staffBody).not.toHaveProperty('userCounts');
  });
});

test.describe('E2E-12: role navigation, landing page and the other role\'s dashboard (AC-16, AC-29)', () => {
  const menu = async (page: Page) =>
    (await nav(page).getByRole('button').allTextContents()).map(text => text.replace(/\s+\d+$/, '').trim());

  test('each role lands on its Dashboard with the right menu and the current page marked', async ({ page }) => {
    await signIn(page, 'david.lee@example.com');
    await expect(page.getByRole('link', { name: /^Open Tickets:/ })).toBeVisible();
    expect(await menu(page)).toEqual(['Dashboard', 'Create Ticket', 'My Tickets']);
    await expect(nav(page).locator('[aria-current="page"]')).toHaveText('Dashboard');
    await nav(page).getByRole('button', { name: /^My Tickets/ }).click();
    await expect(nav(page).locator('[aria-current="page"]')).toContainText('My Tickets');
    await page.getByRole('link', { name: 'TokTickIT' }).click();
    await expect(page.getByRole('link', { name: /^Open Tickets:/ })).toBeVisible();
    await page.getByRole('button', { name: 'Logout' }).click();

    await signIn(page, 'sarah.connor@example.com');
    await expect(page.getByRole('link', { name: /^Unassigned:/ })).toBeVisible();
    expect(await menu(page)).toEqual(['Dashboard', 'Ticket Queue']);
    await page.getByRole('button', { name: 'Logout' }).click();

    await signIn(page, ADMIN.email, ADMIN.password);
    await expect(page.getByRole('link', { name: /^Unassigned:/ })).toBeVisible();
    expect(await menu(page)).toEqual(['Dashboard', 'Ticket Queue', 'User Management']);
  });

  test('opening the other role\'s dashboard URL shows the forbidden message without any numbers', async ({ page }) => {
    // A Requester asks for the staff dashboard
    await page.goto('/dashboard/staff');
    await page.fill('#email', 'david.lee@example.com');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page.getByText('You do not have access to this dashboard.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Open list/ })).toHaveCount(0);
    await page.getByRole('button', { name: 'Go to my dashboard' }).click();
    await expect(page.getByRole('link', { name: /^Open Tickets:/ })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole('button', { name: 'Logout' }).click();

    // IT Staff ask for the Requester dashboard
    await page.goto('/dashboard/requester');
    await page.fill('#email', 'sarah.connor@example.com');
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]:has-text("Sign In")');
    await expect(page.getByText('You do not have access to this dashboard.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Open list/ })).toHaveCount(0);
  });
});
