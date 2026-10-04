/**
 * End-to-End Test Suite (E2E-02): IT Staff Ticket Operations, Queue, and Discussions
 * Traceable to AC-07, AC-08, AC-10, AC-11, AC-12, AC-13, AC-14, BR-08, BR-09, BR-11, BR-13, BR-15, BR-16
 */

import { test, expect } from '@playwright/test';

const API = 'http://localhost:3000';

test.describe('E2E-02: IT Staff Ticket Lifecycle, Operations & Discussion Flow', () => {
  test('Staff triage flow: Queue search, Claim, IT Priority, Comments & Notes, and Status Transition', async ({ page, request }) => {
    // 0. Arrange: a Requester submits a fresh, unassigned ticket through the API
    const requesterLogin = await request.post(`${API}/api/auth/login`, {
      data: { email: 'michael.chang@example.com', password: 'Password123!' },
    });
    const requesterToken = (await requesterLogin.json()).token;
    const summary = `E2E staff triage ${Date.now()}`;
    const created = await request.post(`${API}/api/tickets`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
      data: { summary, description: 'Laptop battery drains within one hour.', categoryId: 1, relatedSystemId: 1, requestedPriority: 'LOW' },
    });
    expect(created.status()).toBe(201);
    const ticket = await created.json();

    // 1. Log in as IT Staff (Sarah Connor)
    await page.goto('/');
    await page.fill('#email', 'sarah.connor@example.com');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // 2. IT Staff lands on the Ticket Queue and has no Requester or Admin navigation
    await expect(page.getByTestId('role-badge')).toHaveText('IT Staff');
    await expect(page.locator('text=IT Staff Ticket Queue')).toBeVisible();
    await expect(page.locator('button:has-text("User Management")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Create Ticket")')).toHaveCount(0);

    // 3. Search the queue for the new ticket (AC-08)
    await page.fill('input[placeholder*="Search ticket #, summary, requester"]', ticket.ticketNumber);
    // Wait for the debounced search to finish so the table is not re-rendered mid-click
    await expect(page.locator('table tbody tr')).toHaveCount(1);
    const row = page.locator(`tr:has-text("${ticket.ticketNumber}")`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Unassigned');

    // 4. Open the ticket
    await row.locator('button:has-text("View")').click();
    await expect(page.locator('button:has-text("Back to Queue")')).toBeVisible();
    await expect(page.locator(`text=${summary}`).first()).toBeVisible();

    // 5. Claim the ticket: owner becomes Sarah and New auto-moves to Open (AC-10)
    await page.click('button:has-text("Claim Ticket")');
    await expect(page.locator('button:has-text("Claim Ticket")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Move to In Progress")')).toBeVisible();

    // 6. IT Priority changes independently of Requested Priority (AC-11)
    await page.locator('#select-it-priority').selectOption('URGENT');
    await page.click('button:has-text("Save IT Priority")');
    await expect(page.locator('.alert-success')).toBeVisible();

    // 7. Public Comment (AC-13)
    const commentText = `Staff public update via E2E test at ${Date.now()}`;
    await page.fill('textarea[placeholder*="Write a public response"]', commentText);
    await page.click('button:has-text("Post Comment")');
    await expect(page.locator(`text=${commentText}`)).toBeVisible();

    // 8. Internal Note (AC-14)
    await page.locator('button[role="tab"]:has-text("Internal Notes")').click();
    await expect(page.locator('text=Staff Operational Notes')).toBeVisible();
    const noteText = `Staff confidential diagnostics via E2E test at ${Date.now()}`;
    await page.fill('textarea[placeholder*="Record internal troubleshooting"]', noteText);
    await page.click('button:has-text("Add Internal Note")');
    await expect(page.locator(`text=${noteText}`)).toBeVisible();

    // 9. Permitted status transition Open -> In Progress; invalid targets are not offered (AC-12)
    await page.click('button:has-text("Move to In Progress")');
    await expect(page.locator('button:has-text("Move to Resolved")')).toBeVisible();
    await expect(page.locator('button:has-text("Move to Closed")')).toHaveCount(0);

    // 10. Server-side checks: requested priority unchanged; the Requester cannot read the Internal Note
    const staffToken = await page.evaluate(() => localStorage.getItem('toktickit_auth_token'));
    const detail = await (await request.get(`${API}/api/staff/tickets/${ticket.id}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    })).json();
    expect(detail.requestedPriority).toBe('LOW');
    expect(detail.itPriority).toBe('URGENT');
    expect(detail.status).toBe('In Progress');

    const requesterNotes = await request.get(`${API}/api/tickets/${ticket.id}/internal-notes`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
    });
    expect(requesterNotes.status()).toBe(403);
    expect(await requesterNotes.text()).not.toContain(noteText);

    // 11. Return to Queue
    await page.click('button:has-text("Back to Queue")');
    await expect(page.locator('text=IT Staff Ticket Queue')).toBeVisible();
  });
});
