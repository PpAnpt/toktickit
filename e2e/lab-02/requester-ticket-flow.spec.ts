/**
 * End-to-End Regression (REG-E2E): Lab 2 Requester ticket lifecycle with Lab 3 authentication
 * Traceable to AC-06, AC-13, AC-15, AC-23, BR-06, BR-07, BR-14, BR-15
 */

import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]:has-text("Sign In")');
}

test.describe('Lab 2 Requester regression with authenticated identity', () => {
  test('create, list, open, attach, remove, comment, and indicate resolved as the signed-in Requester', async ({ page }) => {
    // 1. Sign in as a Requester — no Development Requester selector exists any more
    await signIn(page, 'david.lee@example.com', 'Password123!');
    await expect(page.locator('#requesterSelect')).toHaveCount(0);
    await expect(page.locator('h4')).toContainText('Create New Support Ticket');

    // 2. Fill and submit the Create Ticket form with one attachment
    await page.selectOption('select >> nth=0', { index: 1 }); // Category
    await page.selectOption('select >> nth=1', { index: 1 }); // Related System
    const ticketSummary = `E2E Regression Ticket ${Date.now()}`;
    await page.fill('input[placeholder*="summary"]', ticketSummary);
    await page.fill('textarea[placeholder*="Detailed description"]', 'E2E ticket description to verify the full lifecycle.');
    await page.setInputFiles('input[type="file"] >> nth=0', {
      name: 'evidence.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 e2e evidence'),
    });
    await page.click('button:has-text("Submit Ticket")');

    const successAlert = page.locator('.alert-success');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('Ticket created successfully!');

    // 3. The ticket appears in My Tickets and opens in Ticket Detail
    await page.click('button:has-text("View in My Tickets")');
    await expect(page.locator(`h5:has-text("${ticketSummary}")`)).toBeVisible();
    await page.click(`.ticket-card:has-text("${ticketSummary}")`);
    await expect(page.locator('h5:has-text("Ticket Details")')).toBeVisible();
    await expect(page.locator('text=evidence.pdf')).toBeVisible();
    const ticketUrl = page.url();

    // 4. Soft-remove the attachment with a reason (Lab 2 continuity)
    await page.click('button:has-text("Remove")');
    await page.fill('#removalReasonInput', 'Uploaded the wrong file');
    await page.click('button:has-text("Confirm Remove")');
    await expect(page.locator('text=Removal Reason:')).toBeVisible();
    await expect(page.locator('text=Uploaded the wrong file')).toBeVisible();

    // 5. Post a Public Comment (no Internal Notes are visible to a Requester)
    const comment = `Requester follow-up ${Date.now()}`;
    await page.fill('#comment-input-' + ticketUrl.split('/').pop(), comment);
    await page.click('button:has-text("Post Comment")');
    await expect(page.locator(`text=${comment}`)).toBeVisible();
    await expect(page.locator('text=Internal Notes')).toHaveCount(0);

    // 6. Indicate the problem appears resolved — the status is not changed to Resolved
    await page.click('button:has-text("My Problem Appears Resolved")');
    await expect(page.locator('text=You indicated this appears resolved')).toBeVisible();
    await expect(page.locator('.card-header .badge.bg-success')).toHaveText('New');

    // 7. Another Requester opening the same ticket URL sees a safe "not available" message
    await page.click('button:has-text("Logout")');
    await signIn(page, 'jennifer.anderson@example.com', 'Password123!');
    await expect(page.locator('h4')).toContainText('Create New Support Ticket');
    await page.goto(ticketUrl);
    await expect(page.locator('text=Ticket Unavailable')).toBeVisible();
    await expect(page.locator(`text=${ticketSummary}`)).toHaveCount(0);
  });
});
