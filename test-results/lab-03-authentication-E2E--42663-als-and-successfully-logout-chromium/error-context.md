# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lab-03\authentication.spec.ts >> E2E-01: Authentication & First-Login Password Change Flow >> AC-01 & AC-05: Authenticate with valid credentials and successfully logout
- Location: e2e\lab-03\authentication.spec.ts:13:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('span.fw-semibold:has-text("David Lee")')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('span.fw-semibold:has-text("David Lee")') with timeout 5000ms
  - waiting for locator('span.fw-semibold:has-text("David Lee")')

```

```yaml
- navigation:
  - text: TokTickIT David Lee REQUESTER david.lee@example.com
  - button "Logout"
- button "Create Ticket"
- button "My Tickets 145"
- heading "Create New Support Ticket" [level=4]
- text: Requester
- textbox [disabled]: David Lee (david.lee@example.com)
- text: Populated automatically from the active Development Requester session. Category *
- combobox:
  - option "-- Select Category --" [selected]
  - option "Account and Access"
  - option "Hardware"
  - option "Software"
  - option "Network"
- text: Related System *
- combobox:
  - option "-- Select Related System --" [selected]
  - option "Campus Wi-Fi"
  - option "Corporate Laptop"
  - option "Email"
  - option "Grade Submission App"
  - option "LEB2 App"
  - option "Printer"
  - option "VPN"
- text: Priority
- radio "low"
- text: low
- radio "medium" [checked]
- text: medium
- radio "high"
- text: high Summary *
- textbox "Brief summary of the issue"
- text: Description *
- textbox "Detailed description of what happened..."
- text: Attachments (Max 5 files, 5MB each. JPG, PNG, WEBP, PDF)
- button "Attachments (Max 5 files, 5MB each. JPG, PNG, WEBP, PDF)"
- button "Submit Ticket"
```

# Test source

```ts
  1  | /**
  2  |  * End-to-End Test Suite (E2E-01): Authentication & Mandatory Password Change
  3  |  * Traceable to AC-01, AC-02, AC-03, AC-04, AC-05, BR-01, BR-02, BR-03, BR-05
  4  |  */
  5  | 
  6  | import { test, expect } from '@playwright/test';
  7  | 
  8  | test.describe('E2E-01: Authentication & First-Login Password Change Flow', () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto('/');
  11 |   });
  12 | 
  13 |   test('AC-01 & AC-05: Authenticate with valid credentials and successfully logout', async ({ page }) => {
  14 |     // 1. Verify Login page loaded
  15 |     await expect(page.locator('h2')).toContainText('TokTickIT');
  16 |     await expect(page.locator('text=Sign in to your account')).toBeVisible();
  17 | 
  18 |     // 2. Fill valid active requester credentials (David Lee)
  19 |     await page.fill('#email', 'david.lee@example.com');
  20 |     await page.fill('#password', 'Password123!');
  21 |     await page.click('button[type="submit"]:has-text("Sign In")');
  22 | 
  23 |     // 3. Verify user enters main application shell
> 24 |     await expect(page.locator('span.fw-semibold:has-text("David Lee")')).toBeVisible();
     |                                                                          ^ Error: expect(locator).toBeVisible() failed
  25 |     await expect(page.locator('.badge:has-text("REQUESTER")')).toBeVisible();
  26 |     await expect(page.locator('button:has-text("Logout")')).toBeVisible();
  27 | 
  28 |     // 4. Logout
  29 |     await page.click('button:has-text("Logout")');
  30 | 
  31 |     // 5. Verify returned to login screen
  32 |     await expect(page.locator('h2')).toContainText('TokTickIT');
  33 |     await expect(page.locator('#email')).toBeVisible();
  34 |   });
  35 | 
  36 |   test('AC-02: Reject invalid login credentials with safe error alert', async ({ page }) => {
  37 |     await page.fill('#email', 'david.lee@example.com');
  38 |     await page.fill('#password', 'WrongPassword999!');
  39 |     await page.click('button[type="submit"]:has-text("Sign In")');
  40 | 
  41 |     const alert = page.locator('div[role="alert"]');
  42 |     await expect(alert).toBeVisible();
  43 |     await expect(alert).toContainText(/invalid email or password/i);
  44 |   });
  45 | 
  46 |   test('AC-03: Reject inactive user account authentication', async ({ page }) => {
  47 |     // Robert Taylor is seeded with isActive=false
  48 |     await page.fill('#email', 'robert.taylor@example.com');
  49 |     await page.fill('#password', 'Password123!');
  50 |     await page.click('button[type="submit"]:has-text("Sign In")');
  51 | 
  52 |     const alert = page.locator('div[role="alert"]');
  53 |     await expect(alert).toBeVisible();
  54 |     await expect(alert).toContainText(/deactivated|inactive/i);
  55 |   });
  56 | 
  57 |   test('AC-04: Mandatory password change on first login enforcement', async ({ page }) => {
  58 |     // Emily Watson is seeded with mustChangePassword=true
  59 |     await page.fill('#email', 'emily.watson@example.com');
  60 |     await page.fill('#password', 'Initial123!');
  61 |     await page.click('button[type="submit"]:has-text("Sign In")');
  62 | 
  63 |     // Verify modal overlay forces password change
  64 |     await expect(page.locator('h3:has-text("Change Your Password")')).toBeVisible();
  65 |     await expect(page.locator('text=You are signing in with an initial password')).toBeVisible();
  66 | 
  67 |     // Fill new password matching confirmation
  68 |     const newPass = `NewPass_${Date.now()}!`;
  69 |     await page.fill('#currentPassword', 'Initial123!');
  70 |     await page.fill('#newPassword', newPass);
  71 |     await page.fill('#confirmPassword', newPass);
  72 |     await page.click('button[type="submit"]:has-text("Set New Password & Continue")');
  73 | 
  74 |     // Verify modal closes and user reaches portal
  75 |     await expect(page.locator('span.fw-semibold:has-text("Emily Watson")')).toBeVisible();
  76 |     await expect(page.locator('.badge:has-text("REQUESTER")')).toBeVisible();
  77 | 
  78 |     // Logout
  79 |     await page.click('button:has-text("Logout")');
  80 |     await expect(page.locator('#email')).toBeVisible();
  81 |   });
  82 | });
  83 | 
```