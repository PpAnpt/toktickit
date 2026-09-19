/**
 * End-to-End Test Suite (E2E-01): Authentication & Mandatory Password Change
 * Traceable to AC-01, AC-02, AC-03, AC-04, AC-05, BR-01, BR-02, BR-03, BR-05
 */

import { test, expect } from '@playwright/test';

test.describe('E2E-01: Authentication & First-Login Password Change Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('AC-01 & AC-05: Authenticate with valid credentials and successfully logout', async ({ page }) => {
    // 1. Verify Login page loaded
    await expect(page.locator('h2')).toContainText('TokTickIT');
    await expect(page.locator('text=Sign in to your account')).toBeVisible();

    // 2. Fill valid active requester credentials (David Lee)
    await page.fill('#email', 'david.lee@example.com');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // 3. Verify user enters main application shell
    await expect(page.locator('span.fw-semibold:has-text("David Lee")')).toBeVisible();
    await expect(page.locator('.badge:has-text("REQUESTER")')).toBeVisible();
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();

    // 4. Logout
    await page.click('button:has-text("Logout")');

    // 5. Verify returned to login screen
    await expect(page.locator('h2')).toContainText('TokTickIT');
    await expect(page.locator('#email')).toBeVisible();
  });

  test('AC-02: Reject invalid login credentials with safe error alert', async ({ page }) => {
    await page.fill('#email', 'david.lee@example.com');
    await page.fill('#password', 'WrongPassword999!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/invalid email or password/i);
  });

  test('AC-03: Reject inactive user account authentication', async ({ page }) => {
    // Robert Taylor is seeded with isActive=false
    await page.fill('#email', 'robert.taylor@example.com');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    const alert = page.locator('div[role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/deactivated|inactive/i);
  });

  test('AC-04: Mandatory password change on first login enforcement', async ({ page }) => {
    // Emily Watson is seeded with mustChangePassword=true
    await page.fill('#email', 'emily.watson@example.com');
    await page.fill('#password', 'Initial123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Verify modal overlay forces password change
    await expect(page.locator('h3:has-text("Change Your Password")')).toBeVisible();
    await expect(page.locator('text=You are signing in with an initial password')).toBeVisible();

    // Fill new password matching confirmation
    const newPass = `NewPass_${Date.now()}!`;
    await page.fill('#currentPassword', 'Initial123!');
    await page.fill('#newPassword', newPass);
    await page.fill('#confirmPassword', newPass);
    await page.click('button[type="submit"]:has-text("Set New Password & Continue")');

    // Verify modal closes and user reaches portal
    await expect(page.locator('span.fw-semibold:has-text("Emily Watson")')).toBeVisible();
    await expect(page.locator('.badge:has-text("REQUESTER")')).toBeVisible();

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page.locator('#email')).toBeVisible();
  });
});
