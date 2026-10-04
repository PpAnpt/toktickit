/**
 * Lab 3 evidence capture: desktop / tablet / mobile screenshots for Parts 5–9.
 * Run: npx playwright test --config scripts/screenshots.config.ts
 */
import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const API = 'http://localhost:3000';
const OUT = path.resolve(__dirname, '../artifacts/lab-03/screenshots');

const DESKTOP = { width: 1280, height: 800 };
const TABLET = { width: 768, height: 1024 };
const MOBILE = { width: 375, height: 812 };

async function shot(page: Page, folder: string, name: string) {
  fs.mkdirSync(path.join(OUT, folder), { recursive: true });
  // Start from the top so the sticky header is not captured mid-page
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250); // let transitions settle
  await page.screenshot({ path: path.join(OUT, folder, `${name}.png`), fullPage: true });
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]:has-text("Sign In")');
}

async function signOut(page: Page) {
  await page.click('button:has-text("Logout")');
  await expect(page.locator('#email')).toBeVisible();
}

async function apiToken(request: APIRequestContext, email: string, password: string) {
  const res = await request.post(`${API}/api/auth/login`, { data: { email, password } });
  return (await res.json()).token as string;
}

async function adminResetPassword(request: APIRequestContext, email: string, initialPassword: string) {
  const token = await apiToken(request, 'admin@example.com', 'Admin123!');
  const users = await (await request.get(`${API}/api/admin/users?search=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  await request.post(`${API}/api/admin/users/${users[0].id}/reset-password`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { initialPassword },
  });
}

test.describe.configure({ mode: 'serial' });

test('authentication screens', async ({ page, request }) => {
  const dir = 'authentication';
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  await expect(page.locator('#email')).toBeVisible();
  await shot(page, dir, '01-login-desktop');

  await page.fill('#email', 'david.lee@example.com');
  await page.fill('#password', 'WrongPassword1');
  await page.click('button[type="submit"]:has-text("Sign In")');
  await expect(page.locator('div[role="alert"]')).toBeVisible();
  await shot(page, dir, '02-login-invalid-credentials');

  await page.fill('#email', 'robert.taylor@example.com');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]:has-text("Sign In")');
  await expect(page.locator('div[role="alert"]')).toContainText(/deactivated/i);
  await shot(page, dir, '03-login-inactive-account');

  // Mandatory first-login change (Emily is reset to the documented initial password first)
  await adminResetPassword(request, 'emily.watson@example.com', 'Initial123!');
  await signIn(page, 'emily.watson@example.com', 'Initial123!');
  await expect(page.locator('h3:has-text("Change Your Password")')).toBeVisible();
  await shot(page, dir, '04-mandatory-password-change');

  await page.fill('#currentPassword', 'Initial123!');
  await page.fill('#newPassword', 'short');
  await page.fill('#confirmPassword', 'short');
  await page.click('button:has-text("Save New Password")');
  await expect(page.locator('div[role="alert"]')).toBeVisible();
  await shot(page, dir, '04b-password-validation-error');

  await page.fill('#newPassword', 'Welcome2026!');
  await page.fill('#confirmPassword', 'Welcome2026!');
  await page.click('button:has-text("Save New Password")');
  await expect(page.locator('h4:has-text("Create New Support Ticket")')).toBeVisible();
  await shot(page, dir, '05-after-password-change-logged-in');

  await page.click('button:has-text("Change Password")');
  await expect(page.getByRole('dialog')).toBeVisible();
  await shot(page, dir, '06-voluntary-change-password');
  await page.click('button:has-text("Cancel")');

  await signOut(page);
  await expect(page.locator('text=You have been signed out')).toBeVisible();
  await shot(page, dir, '07-after-logout');

  await adminResetPassword(request, 'emily.watson@example.com', 'Initial123!'); // restore seed state

  for (const [label, role, email, password] of [
    ['requester', 'Requester', 'david.lee@example.com', 'Password123!'],
    ['it-staff', 'IT Staff', 'sarah.connor@example.com', 'Password123!'],
    ['administrator', 'Administrator', 'admin@example.com', 'Admin123!'],
  ] as const) {
    await signIn(page, email, password);
    await expect(page.getByTestId('role-badge')).toHaveText(role);
    await shot(page, dir, `08-navigation-${label}`);
    await signOut(page);
  }

  await page.setViewportSize(TABLET);
  await shot(page, dir, '09-login-tablet');
  await page.setViewportSize(MOBILE);
  await shot(page, dir, '10-login-mobile');
  await signIn(page, 'david.lee@example.com', 'Password123!');
  await expect(page.getByTestId('role-badge')).toBeVisible();
  await shot(page, dir, '11-navbar-mobile');
  await signOut(page);
});

test('staff queue screens', async ({ page }) => {
  const dir = 'staff-queue';
  await page.setViewportSize(DESKTOP);
  await signIn(page, 'sarah.connor@example.com', 'Password123!');
  await expect(page.locator('table tbody tr').first()).toBeVisible();
  await shot(page, dir, '01-queue-desktop');

  await page.fill('#staff-search-input', 'VPN');
  await page.waitForTimeout(800);
  await shot(page, dir, '02-queue-search-results');
  await page.fill('#staff-search-input', '');

  await page.selectOption('#staff-status-filter', 'In Progress');
  await page.waitForTimeout(800);
  await shot(page, dir, '03-queue-filtered-by-status');
  await page.selectOption('#staff-status-filter', 'All');

  await page.selectOption('#staff-owner-filter', 'unassigned');
  await page.waitForTimeout(800);
  await shot(page, dir, '04-queue-unassigned-owner-filter');
  await page.selectOption('#staff-owner-filter', 'All');

  await page.selectOption('#staff-sort-filter', 'priority-desc');
  await page.waitForTimeout(800);
  await shot(page, dir, '05-queue-sorted-by-priority');
  await page.selectOption('#staff-sort-filter', 'createdAt-desc');

  // Seed data has 16+ tickets, so there are always at least 2 pages of 10
  const pagination = page.locator('nav[aria-label="Staff ticket pagination"]');
  await expect(pagination).toBeVisible();
  await pagination.getByRole('button', { name: 'Next' }).click();
  await expect(page.locator('text=Showing page')).toContainText('2');
  await shot(page, dir, '06-queue-page-2');
  await pagination.getByRole('button', { name: 'Previous' }).click();

  await page.fill('#staff-search-input', 'zzz-no-such-ticket');
  await page.waitForTimeout(800);
  await shot(page, dir, '07-queue-no-results');
  await page.fill('#staff-search-input', '');
  await page.waitForTimeout(800);

  await page.setViewportSize(TABLET);
  await shot(page, dir, '08-queue-tablet');
  await page.setViewportSize(MOBILE);
  await shot(page, dir, '09-queue-mobile');
});

test('staff ticket detail screens', async ({ page, request }) => {
  const dir = 'staff-ticket-detail';
  // Fresh unassigned ticket with an attachment so every control is visible
  const reqToken = await apiToken(request, 'jennifer.anderson@example.com', 'Password123!');
  const ticket = await (await request.post(`${API}/api/tickets`, {
    headers: { Authorization: `Bearer ${reqToken}` },
    data: { summary: 'Shared drive is not visible after password change', description: 'Mapped drive S: disappeared this morning.', categoryId: 1, relatedSystemId: 1, requestedPriority: 'MEDIUM' },
  })).json();
  await request.post(`${API}/api/tickets/${ticket.id}/attachments`, {
    headers: { Authorization: `Bearer ${reqToken}` },
    multipart: { file: { name: 'error-screenshot.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 evidence') } },
  });

  await page.setViewportSize(DESKTOP);
  await signIn(page, 'sarah.connor@example.com', 'Password123!');
  await page.fill('#staff-search-input', ticket.ticketNumber);
  await page.locator(`tr:has-text("${ticket.ticketNumber}") button:has-text("View")`).click();
  await expect(page.locator('button:has-text("Claim Ticket")')).toBeVisible();
  await shot(page, dir, '01-ticket-detail-before-claim');

  await page.click('button:has-text("Claim Ticket")');
  await expect(page.locator('button:has-text("Move to In Progress")')).toBeVisible();
  await shot(page, dir, '02-after-claim-status-open');

  await page.locator('#select-it-priority').selectOption('HIGH');
  await page.click('button:has-text("Save IT Priority")');
  await expect(page.locator('.alert-success')).toBeVisible();
  await shot(page, dir, '03-it-priority-updated');

  await page.fill('textarea[placeholder*="Write a public response"]', 'Hi Jennifer, we are re-mapping the drive now.');
  await page.click('button:has-text("Post Comment")');
  await page.waitForTimeout(500);
  await shot(page, dir, '04-public-comments');

  await page.locator('button[role="tab"]:has-text("Internal Notes")').click();
  await page.fill('textarea[placeholder*="Record internal troubleshooting"]', 'Group policy for drive mapping failed after the password change.');
  await page.click('button:has-text("Add Internal Note")');
  await page.waitForTimeout(500);
  await shot(page, dir, '05-internal-notes');

  await page.click('button:has-text("Move to In Progress")');
  await expect(page.locator('button:has-text("Move to Waiting for Requester")')).toBeVisible();
  await shot(page, dir, '06-status-transition-in-progress');

  await page.setViewportSize(TABLET);
  await shot(page, dir, '07-ticket-detail-tablet');
  await page.setViewportSize(MOBILE);
  await shot(page, dir, '08-ticket-detail-mobile');

  // Seed ticket where the Requester indicated the problem appears resolved
  await page.setViewportSize(DESKTOP);
  await page.click('button:has-text("Back to Queue")');
  await page.fill('#staff-search-input', 'TKT-2025-000104');
  await page.locator('tr:has-text("TKT-2025-000104") button:has-text("View")').click();
  await page.waitForTimeout(800);
  await shot(page, dir, '09-requester-resolution-indicated');
});

test('requester ticket detail screens', async ({ page }) => {
  const dir = 'requester-ticket-detail';
  await page.setViewportSize(DESKTOP);
  await signIn(page, 'david.lee@example.com', 'Password123!');
  await page.click('button:has-text("My Tickets")');
  await expect(page.locator('.ticket-card').first()).toBeVisible();
  await shot(page, dir, '01-my-tickets');

  await page.fill('input[placeholder*="Search summary"]', 'Laptop display');
  await page.locator('.ticket-card:has-text("Laptop display flickering")').first().click();
  await expect(page.locator('text=Public Comments')).toBeVisible();
  await shot(page, dir, '02-detail-with-public-comments');

  await page.getByLabel('Add a comment').fill('Thanks, I will try the updated driver tonight.');
  await page.click('button:has-text("Post Comment")');
  await expect(page.locator('text=Comment posted.')).toBeVisible();
  await shot(page, dir, '03-comment-posted');

  const indicate = page.locator('button:has-text("My Problem Appears Resolved")');
  if (await indicate.count()) {
    await indicate.click();
    await expect(page.locator('text=You indicated this appears resolved')).toBeVisible();
  }
  await shot(page, dir, '04-problem-appears-resolved');

  await page.setViewportSize(MOBILE);
  await shot(page, dir, '05-detail-mobile');

  // Another requester's ticket id opened directly: safe "Ticket Unavailable" state
  const url = page.url();
  await page.setViewportSize(DESKTOP);
  await signOut(page);
  await signIn(page, 'jennifer.anderson@example.com', 'Password123!');
  await expect(page.getByTestId('role-badge')).toBeVisible();
  await page.goto(url);
  await expect(page.locator('text=Ticket Unavailable')).toBeVisible();
  await shot(page, dir, '06-other-requesters-ticket-unavailable');
});

test('user management screens', async ({ page }) => {
  const dir = 'user-management';
  await page.setViewportSize(DESKTOP);
  await signIn(page, 'admin@example.com', 'Admin123!');
  await expect(page.locator('h3:has-text("User Management")')).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await shot(page, dir, '01-user-list-desktop');

  const search = page.locator('input[placeholder*="Search user by name or email"]');
  await search.fill('sarah');
  await page.waitForTimeout(800);
  await shot(page, dir, '02-user-search');
  await search.fill('');

  await page.getByLabel('Filter Role').selectOption('IT_STAFF');
  await page.waitForTimeout(800);
  await shot(page, dir, '03-filter-by-role');
  await page.getByLabel('Filter Role').selectOption('All');

  await page.click('button:has-text("+ Create New User")');
  await page.fill('input[placeholder*="Alex Mercer"]', 'Duplicate Person');
  await page.fill('input[placeholder*="alex.mercer@example.com"]', 'david.lee@example.com');
  await page.fill('input[placeholder*="8+ characters"]', 'Password123!');
  await shot(page, dir, '04-create-user-modal');
  await page.click('button[type="submit"]:has-text("Create Account")');
  await page.waitForTimeout(800);
  await shot(page, dir, '04b-duplicate-email-validation');
  await page.fill('input[placeholder*="alex.mercer@example.com"]', 'not-an-email');
  await page.fill('input[placeholder*="8+ characters"]', 'short');
  await page.click('button[type="submit"]:has-text("Create Account")');
  await page.waitForTimeout(400);
  await shot(page, dir, '04c-invalid-input-validation');
  await page.click('.modal button:has-text("Cancel")');

  await search.fill('admin@example.com');
  await page.waitForTimeout(800);
  await page.locator('tr:has-text("admin@example.com") button:has-text("Edit")').click();
  await expect(page.locator('#userActiveSwitch')).toBeDisabled();
  await shot(page, dir, '05-self-deactivation-guard');

  // Demoting the only active Administrator is rejected by the server
  await page.locator('.modal select').selectOption('IT_STAFF');
  await page.click('button:has-text("Save Changes")');
  await page.waitForTimeout(800);
  await shot(page, dir, '06-last-active-admin-guard');
  await page.click('.modal button:has-text("Cancel")');

  await search.fill('james.gordon');
  await page.waitForTimeout(800);
  await page.locator('tr:has-text("james.gordon") button:has-text("Edit")').click();
  await shot(page, dir, '07-edit-user-modal');
  await page.click('.modal button:has-text("Cancel")');

  await page.locator('tr:has-text("james.gordon") button:has-text("Reset Pass")').click();
  await shot(page, dir, '08-set-new-initial-password-modal');
  await page.click('.modal button:has-text("Cancel")');
  await search.fill('');
  await page.waitForTimeout(800);

  await page.setViewportSize(TABLET);
  await shot(page, dir, '09-user-management-tablet');
  await page.setViewportSize(MOBILE);
  await shot(page, dir, '10-user-management-mobile');

  await page.setViewportSize(DESKTOP);
  await signOut(page);
  await signIn(page, 'sarah.connor@example.com', 'Password123!');
  await expect(page.getByTestId('role-badge')).toHaveText('IT Staff');
  await shot(page, dir, '11-non-admin-has-no-user-management');
});
