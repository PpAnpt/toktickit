/**
 * End-to-End Tests (Lab 4, Issue #34): responsive layout and keyboard accessibility.
 * Traceable to AC-28. Test IDs: RSP-01, RSP-02, RSP-03, A11Y-01, A11Y-02 (docs/lab-04/tests.md).
 *
 * Run against an isolated database (see the README): the servers started by Playwright inherit DATABASE_URL.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

const API = 'http://localhost:3000';
const PASSWORD = 'Password123!';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

async function apiLogin(request: APIRequestContext, email: string) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return { token: body.token as string, id: body.user.id as number };
}
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** A new Ticket owned by Sarah, so staff can open it and add actions */
async function ticketForSarah(request: APIRequestContext) {
  const david = await apiLogin(request, 'david.lee@example.com');
  const created = await request.post(`${API}/api/tickets`, {
    headers: auth(david.token),
    data: { summary: `A11Y Lab 4 ${Date.now()}`, description: 'Created by the accessibility E2E.', categoryId: 1, relatedSystemId: 1, requestedPriority: 'LOW' },
  });
  const ticket = (await created.json()) as { id: number; ticketNumber: string };
  const sarah = await apiLogin(request, 'sarah.connor@example.com');
  const detail = await (await request.get(`${API}/api/staff/tickets/${ticket.id}`, { headers: auth(sarah.token) })).json();
  await request.patch(`${API}/api/staff/tickets/${ticket.id}/owner`, { headers: auth(sarah.token), data: { ownerId: sarah.id, expectedUpdatedAt: detail.updatedAt } });
  return ticket;
}

async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]:has-text("Sign In")');
}
async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.locator('#email')).toBeVisible();
}
async function openAsStaff(page: Page, ticketNumber: string) {
  await signIn(page, 'sarah.connor@example.com');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: /^Ticket Queue/ }).click();
  await expect(page.locator('table tbody tr, ul[aria-label="Ticket queue"] li').first()).toBeVisible();
  await page.fill('input[placeholder*="Search ticket #, summary, requester"]', ticketNumber);
  await page.locator(`tr:has-text("${ticketNumber}"), li:has-text("${ticketNumber}")`).getByRole('button', { name: /View/ }).click();
  await expect(page.getByRole('heading', { name: /Actions Taken/ })).toBeVisible();
}
const fitsViewport = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test.describe('RSP: no horizontal scrolling, clipping or overlap at three widths (AC-28)', () => {
  test('RSP-01: both dashboards', async ({ page }) => {
    for (const { width, height } of VIEWPORTS) {
      await page.setViewportSize({ width, height });
      await signIn(page, 'david.lee@example.com');
      await expect(page.getByRole('link', { name: /^Open Tickets:/ })).toBeVisible();
      expect(await fitsViewport(page), `requester ${width}`).toBe(true);
      await signOut(page);
      await signIn(page, 'sarah.connor@example.com');
      await expect(page.getByRole('link', { name: /^Unassigned:/ })).toBeVisible();
      expect(await fitsViewport(page), `staff ${width}`).toBe(true);
      await signOut(page);
    }
  });

  test('RSP-02 and RSP-03: Actions Taken, the Add form, status controls and the gate message', async ({ page, request }) => {
    test.setTimeout(120_000);
    const ticket = await ticketForSarah(request);
    for (const { width, height } of VIEWPORTS) {
      await page.setViewportSize({ width, height });
      await openAsStaff(page, ticket.ticketNumber);
      expect(await fitsViewport(page), `detail ${width}`).toBe(true);

      await page.getByRole('button', { name: '+ Add Action' }).click();
      const form = page.getByRole('form', { name: /action/i });
      await expect(form).toBeVisible();
      expect(await fitsViewport(page), `add form ${width}`).toBe(true);
      const box = await form.boundingBox();
      expect(box!.x + box!.width, `form inside ${width}`).toBeLessThanOrEqual(width + 1);
      await page.getByRole('button', { name: 'Close' }).click();

      // The gate message: no completed action yet
      await page.getByRole('button', { name: /Move to Resolved/ }).click();
      await expect(page.getByTestId('resolution-gate-message')).toBeVisible();
      expect(await fitsViewport(page), `gate ${width}`).toBe(true);
      for (const button of await page.getByRole('button', { name: /^Move to / }).all()) {
        const b = await button.boundingBox();
        expect(b!.x + b!.width, 'status button inside the viewport').toBeLessThanOrEqual(width + 1);
      }
      await signOut(page);
    }
  });
});

test.describe('A11Y: keyboard and focus (AC-28)', () => {
  test('A11Y-01: add and then edit an action using only the keyboard, with labelled fields', async ({ page, request }) => {
    const ticket = await ticketForSarah(request);
    await openAsStaff(page, ticket.ticketNumber);

    const add = page.getByRole('button', { name: '+ Add Action' });
    await add.focus();
    await page.keyboard.press('Enter');
    // Every field is reachable by its label, which proves the label is linked to the input
    await page.getByLabel('Action description').focus();
    await page.keyboard.type('Keyboard only action');
    await page.getByLabel(/^Result/).focus();
    await page.keyboard.type('Worked without a mouse');
    await page.getByRole('button', { name: 'Save action' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Keyboard only action')).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).first().focus();
    await page.keyboard.press('Enter');
    await page.getByLabel(/^Result/).fill('');
    await page.getByLabel(/^Result/).focus();
    await page.keyboard.type('Edited with the keyboard');
    await page.getByRole('button', { name: 'Save changes' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Edited with the keyboard')).toBeVisible();
  });

  test('A11Y-02: the focus ring is visible and Escape closes the editor and returns the focus', async ({ page, request }) => {
    const ticket = await ticketForSarah(request);
    await openAsStaff(page, ticket.ticketNumber);

    const add = page.getByRole('button', { name: '+ Add Action' });
    await page.keyboard.press('Tab'); // the page now counts as keyboard-driven, so :focus-visible applies
    await add.focus();
    // Buttons animate their properties (transition: all), so wait until the ring has settled
    await expect.poll(() => add.evaluate(el => { const s = getComputedStyle(el); return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`; })).toBe('solid 2px rgb(11, 122, 70)');

    await page.keyboard.press('Enter');
    await page.getByLabel('Action description').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('form', { name: /action/i })).toHaveCount(0);
    await expect(add).toBeFocused();
  });

  test('A11Y-01: a Requester opens a Ticket from My Tickets with the keyboard', async ({ page }) => {
    await signIn(page, 'david.lee@example.com');
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: /^My Tickets/ }).click();
    const card = page.getByRole('button', { name: /^Open TKT-/ }).first();
    await expect(card).toBeVisible();
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Back to My Tickets/ })).toBeVisible();
  });
});

test.describe('Clean console (Issue #34)', () => {
  test('Requester, IT Staff and Administrator pages log no console errors or failed requests', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
    page.on('pageerror', error => problems.push(`page error: ${error.message}`));
    page.on('response', response => {
      if (response.url().startsWith(API) && response.status() >= 400 && response.status() !== 401) problems.push(`${response.status()} ${response.url()}`);
    });

    const menu = (name: RegExp) => page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name });
    await signIn(page, 'david.lee@example.com');
    await expect(page.getByRole('link', { name: /^Open Tickets:/ })).toBeVisible();
    await menu(/^Create Ticket/).click();
    await expect(page.getByText(/Create New Support Ticket/)).toBeVisible();
    await menu(/^My Tickets/).click();
    await expect(page.getByTestId('my-tickets-total')).toBeVisible();
    await signOut(page);

    await signIn(page, 'sarah.connor@example.com');
    await expect(page.getByRole('link', { name: /^Unassigned:/ })).toBeVisible();
    await menu(/^Ticket Queue/).click();
    await expect(page.locator('text=Total in Queue')).toBeVisible();
    await signOut(page);

    await signIn(page, 'admin@example.com', 'Admin123!');
    await expect(page.getByRole('region', { name: 'Accounts' })).toBeVisible();
    await menu(/^User Management/).click();
    await expect(page.locator('h3:has-text("User Management")')).toBeVisible();
    expect(problems).toEqual([]);
  });
});

test.describe('RSP-04: every other screen of the application fits the three widths (AC-28)', () => {
  test('Create Ticket, My Tickets, Ticket Queue, User Management and the Change Password dialog have no horizontal scroll', async ({ page }) => {
    test.setTimeout(150_000);
    const menu = (name: RegExp) => page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name });
    for (const { width, height } of VIEWPORTS) {
      await page.setViewportSize({ width, height });
      await signIn(page, 'david.lee@example.com');
      await menu(/^Create Ticket/).click();
      await expect(page.getByText(/Create New Support Ticket/)).toBeVisible();
      expect(await fitsViewport(page), `Create Ticket ${width}`).toBe(true);
      await menu(/^My Tickets/).click();
      await expect(page.getByTestId('my-tickets-total')).toBeVisible();
      expect(await fitsViewport(page), `My Tickets ${width}`).toBe(true);
      await page.getByRole('button', { name: 'Change Password' }).click();
      await expect(page.getByRole('dialog', { name: /Change Your Password/ })).toBeVisible();
      expect(await fitsViewport(page), `Change Password ${width}`).toBe(true);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await signOut(page);

      await signIn(page, 'sarah.connor@example.com');
      await menu(/^Ticket Queue/).click();
      await expect(page.locator('text=Total in Queue')).toBeVisible();
      expect(await fitsViewport(page), `Ticket Queue ${width}`).toBe(true);
      await signOut(page);

      await signIn(page, 'admin@example.com', 'Admin123!');
      await menu(/^User Management/).click();
      await expect(page.locator('h3:has-text("User Management")')).toBeVisible();
      expect(await fitsViewport(page), `User Management ${width}`).toBe(true);
      await page.getByRole('button', { name: /Create New User/ }).click();
      const dialog = page.getByRole('dialog', { name: 'Create New User' });
      await expect(dialog).toBeVisible();
      expect(await fitsViewport(page), `Create user dialog ${width}`).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await signOut(page);
    }
  });
});
