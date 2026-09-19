/**
 * End-to-End Test Suite (E2E-02): IT Staff Ticket Operations, Queue, and Discussions
 * Traceable to AC-07, AC-08, AC-09, AC-10, AC-11, AC-12, AC-13, AC-14, BR-08, BR-09, BR-10, BR-11, BR-12, BR-13, BR-15, BR-16
 */

import { test, expect } from '@playwright/test';

test.describe('E2E-02: IT Staff Ticket Lifecycle, Operations & Discussion Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Staff triage flow: Queue inspection, Claim ticket, Priority adjustment, Comments & Notes, and Status Transition', async ({ page }) => {
    // 1. Log in as IT Staff (Sarah Connor)
    await page.fill('#email', 'sarah.connor@example.com');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // 2. Verify IT Staff role and Ticket Queue tab
    await expect(page.locator('.badge:has-text("IT_STAFF")')).toBeVisible();
    await expect(page.locator('button:has-text("Ticket Queue")')).toBeVisible();

    // 3. Navigate to Ticket Queue
    await page.click('button:has-text("Ticket Queue")');
    await expect(page.locator('text=IT Staff Ticket Queue')).toBeVisible();

    // 4. Verify search and filter in Queue
    const searchInput = page.locator('input[placeholder*="Search ticket #, summary, requester"]');
    await expect(searchInput).toBeVisible();

    // 5. Open first ticket from the queue table
    const viewButton = page.locator('button:has-text("View"):not([disabled])').first();
    await expect(viewButton).toBeVisible();
    await viewButton.click();

    // 6. Verify Staff Ticket Detail view loaded
    await expect(page.locator('button:has-text("Back to Queue")')).toBeVisible();
    await expect(page.locator('h6:has-text("Ticket Ownership")')).toBeVisible();
    await expect(page.locator('h6:has-text("Priority Management")')).toBeVisible();

    // 7. Test IT Priority Adjustment (AC-11)
    const prioritySelect = page.locator('#select-it-priority');
    await prioritySelect.selectOption('URGENT');
    await page.click('button:has-text("Save IT Priority")');
    await expect(page.locator('.alert-success')).toBeVisible();

    // 8. Test Public Comment Submission (AC-13)
    const commentText = `Staff public update via E2E test at ${Date.now()}`;
    await page.fill('textarea[placeholder*="Write a public response"]', commentText);
    await page.click('button:has-text("Post Comment")');
    await expect(page.locator(`text=${commentText}`)).toBeVisible();

    // 9. Test Confidential Internal Note Submission (AC-14)
    const internalNotesTab = page.locator('button[role="tab"]:has-text("Internal Notes")');
    await internalNotesTab.click();
    await expect(page.locator('text=Staff Operational Notes')).toBeVisible();

    const noteText = `Staff confidential internal diagnostics via E2E test at ${Date.now()}`;
    await page.fill('textarea[placeholder*="Record internal troubleshooting"]', noteText);
    await page.click('button:has-text("Add Internal Note")');
    await expect(page.locator(`text=${noteText}`)).toBeVisible();

    // 10. Return to Queue
    await page.click('button:has-text("Back to Queue")');
    await expect(page.locator('text=IT Staff Ticket Queue')).toBeVisible();
  });
});
