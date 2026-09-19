/**
 * End-to-End Test Suite (E2E-03): Administrator User Management & Security Rules
 * Traceable to AC-16, AC-17, AC-18, AC-19, AC-20, AC-21, AC-22, BR-18, BR-19, BR-20, BR-21
 */

import { test, expect } from '@playwright/test';

test.describe('E2E-03: Administrator User Administration & Password Reset Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Admin user journey: User creation, Search/Filter, Self-deactivation guard, and Password Reset login flow', async ({ page }) => {
    // 1. Log in as Administrator
    await page.fill('#email', 'admin@example.com');
    await page.fill('#password', 'Admin123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // 2. Verify Administrator badge and User Management tab
    await expect(page.locator('.badge:has-text("ADMINISTRATOR")')).toBeVisible();
    await expect(page.locator('button:has-text("User Management")')).toBeVisible();

    // 3. Open User Management
    await page.click('button:has-text("User Management")');
    await expect(page.locator('h3:has-text("User Management")')).toBeVisible();

    // 4. Create New Staff User (AC-18)
    const newStaffEmail = `e2e.staff.${Date.now()}@example.com`;
    const newStaffName = 'E2E Test Staff';
    await page.click('button:has-text("+ Create New User")');

    await expect(page.locator('h5:has-text("Create New User")')).toBeVisible();
    await page.fill('input[placeholder*="Alex Mercer"]', newStaffName);
    await page.fill('input[placeholder*="alex.mercer@example.com"]', newStaffEmail);
    await page.locator('.modal select').selectOption('IT_STAFF');
    await page.fill('input[placeholder*="At least 6 characters"]', 'InitialPass123!');
    await page.click('button[type="submit"]:has-text("Create Account")');

    // 5. Verify creation success alert
    await expect(page.locator('.alert-success')).toBeVisible();

    // 6. Search and verify new user in the list (AC-17)
    const searchInput = page.locator('input[placeholder*="Search user by name or email"]');
    await searchInput.fill(newStaffEmail);
    await expect(page.locator(`text=${newStaffEmail}`)).toBeVisible();

    // 7. Verify Admin Self-Deactivation Guard (BR-19, AC-20)
    await searchInput.fill('admin@example.com');
    const adminRow = page.locator(`tr:has-text("admin@example.com")`);
    await adminRow.locator('button:has-text("Edit")').click();

    await expect(page.locator('h5:has-text("Edit User Account")')).toBeVisible();
    const switchInput = page.locator('#userActiveSwitch');
    await expect(switchInput).toBeDisabled();
    await expect(page.locator('text=Administrators cannot deactivate their own account')).toBeVisible();
    await page.click('button:has-text("Cancel")');

    // 8. Reset Password for the created user (AC-22, BR-21)
    await searchInput.fill(newStaffEmail);
    const staffRow = page.locator(`tr:has-text("${newStaffEmail}")`);
    await staffRow.locator('button:has-text("Reset Pass")').click();

    await expect(page.locator('h5:has-text("Reset User Password")')).toBeVisible();
    await page.fill('input[placeholder*="At least 6 characters"]', 'NewStaffResetPass123!');
    await page.click('button:has-text("Confirm Reset Password")');
    await expect(page.locator('.alert-success')).toBeVisible();

    // 9. Logout Admin
    await page.click('button:has-text("Logout")');

    // 10. Log in as the new Staff user with the reset password
    await page.fill('#email', newStaffEmail);
    await page.fill('#password', 'NewStaffResetPass123!');
    await page.click('button[type="submit"]:has-text("Sign In")');

    // 11. Verify forced mandatory password change modal is shown (BR-21, AC-04)
    await expect(page.locator('h3:has-text("Change Your Password")')).toBeVisible();
  });
});
