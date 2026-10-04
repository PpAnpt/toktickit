/**
 * End-to-End Test Suite (E2E-01): Authentication & Mandatory Password Change
 * Traceable to AC-01, AC-02, AC-03, AC-04, AC-05, BR-01, BR-02, BR-03, BR-05
 */

import { test, expect } from '@playwright/test';

test.describe('E2E-01: Authentication & First-Login Password Change Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('AC-01 & AC-05: Authenticate with valid credentials and successfully logout', async ({ page, request }) => {
    // 1. Verify Login page loaded
    await expect(page.locator('h2')).toContainText('TokTickIT');
    await expect(page.locator('text=Sign in to your account')).toBeVisible();

    // 2. Fill valid active requester credentials (David Lee)
    await page.fill('#email', 'david.lee@example.com');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // 3. Verify user enters main application shell
    await expect(page.locator('text=David Lee')).toBeVisible();
    await expect(page.getByTestId('role-badge')).toHaveText('Requester');
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();

    // Role navigation: a Requester is never offered staff or admin destinations
    await expect(page.locator('button:has-text("Ticket Queue")')).toHaveCount(0);
    await expect(page.locator('button:has-text("User Management")')).toHaveCount(0);

    const token = await page.evaluate(() => localStorage.getItem('toktickit_auth_token'));
    expect(token).toBeTruthy();

    // 4. Logout
    await page.click('button:has-text("Logout")');

    // 5. Verify returned to login screen
    await expect(page.locator('h2')).toContainText('TokTickIT');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('text=You have been signed out')).toBeVisible();

    // 6. Direct API access with the old token is blocked after logout (session invalidated)
    const direct = await request.get('http://localhost:3000/api/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(direct.status()).toBe(401);

    // 7. Reloading the page does not restore the session
    await page.reload();
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

  test('AC-04: Mandatory password change on first login enforcement', async ({ page, request }) => {
    // 1. Ensure user has mustChangePassword=true idempotently via admin reset-password API
    const adminLogin = await request.post('http://localhost:3000/api/auth/login', {
      data: { email: 'admin@example.com', password: 'Admin123!' },
    });
    const { token } = await adminLogin.json();

    const usersRes = await request.get('http://localhost:3000/api/admin/users?search=elena.rostova@example.com', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = await usersRes.json();
    const elena = users[0];

    await request.post(`http://localhost:3000/api/admin/users/${elena.id}/reset-password`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { initialPassword: 'Initial123!' },
    });

    // 2. Log in with initial password
    await page.fill('#email', 'elena.rostova@example.com');
    await page.fill('#password', 'Initial123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // Verify the password change screen is enforced and no application navigation is available
    await expect(page.locator('h3:has-text("Change Your Password")')).toBeVisible();
    await expect(page.locator('text=You are signing in with an initial password')).toBeVisible();
    await expect(page.locator('button:has-text("Ticket Queue")')).toHaveCount(0);

    // Invalid new password is rejected with visible validation feedback
    await page.fill('#currentPassword', 'Initial123!');
    await page.fill('#newPassword', 'short');
    await page.fill('#confirmPassword', 'short');
    await page.click('button[type="submit"]:has-text("Save New Password")');
    await expect(page.locator('div[role="alert"]')).toContainText(/at least 8 characters/i);

    // Fill new password matching confirmation
    const newPass = `NewPass_${Date.now()}!`;
    await page.fill('#currentPassword', 'Initial123!');
    await page.fill('#newPassword', newPass);
    await page.fill('#confirmPassword', newPass);
    await page.click('button[type="submit"]:has-text("Save New Password")');

    // Verify the user reaches the portal and the IT Staff queue loads with the new session
    await expect(page.locator('.navbar').getByText('Elena Rostova')).toBeVisible();
    await expect(page.getByTestId('role-badge')).toHaveText('IT Staff');
    await expect(page.locator('text=IT Staff Ticket Queue')).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    // Logout
    await page.click('button:has-text("Logout")');
    await expect(page.locator('#email')).toBeVisible();
  });
});
