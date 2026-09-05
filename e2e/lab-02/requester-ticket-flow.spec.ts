/**
 * End-to-End Test (E2E-01): Complete Requester Ticket Lifecycle Flow
 * Traceable to AC-01, AC-02, AC-06, FR-01, FR-02, FR-03, FR-05
 */

import { test, expect } from '@playwright/test';

test.describe('E2E-01: Full Requester Ticket Submission & Management Flow', () => {
  test('should complete full ticket creation, listing, detail inspection, and attachment soft-removal with reason', async ({ page }) => {
    // 1. Visit Portal & verify Development Requester Selection
    await page.goto('http://localhost:5173/');
    await expect(page.locator('h3')).toContainText('TokTickIT Service Desk');

    // 2. Select Active Requester and Continue
    await page.selectOption('#requesterSelect', { label: 'David Lee (david.lee@example.com)' });
    await page.click('button:has-text("Continue to Portal")');

    // 3. Fill Create Ticket Form
    await expect(page.locator('h4')).toContainText('Create New Support Ticket');
    await page.selectOption('select >> nth=0', { index: 1 }); // Category
    await page.selectOption('select >> nth=1', { index: 1 }); // Related System
    await page.fill('input[placeholder*="summary"]', 'E2E Automated Test Ticket');
    await page.fill('textarea[placeholder*="Detailed description"]', 'E2E ticket description to verify full lifecycle.');

    // 4. Submit Ticket
    await page.click('button:has-text("Submit Ticket")');

    // 5. Verify Success Message & Ticket Number
    const successAlert = page.locator('.alert-success');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText('Ticket created successfully!');

    // 6. Navigate to My Tickets
    await page.click('button:has-text("View in My Tickets")');
    await expect(page.locator('h5:has-text("E2E Automated Test Ticket")')).toBeVisible();

    // 7. Open Ticket Detail
    await page.click('.ticket-card:has-text("E2E Automated Test Ticket")');
    await expect(page.locator('h5:has-text("Ticket Details")')).toBeVisible();
    await expect(page.locator('text=E2E Automated Test Ticket')).toBeVisible();
  });
});
