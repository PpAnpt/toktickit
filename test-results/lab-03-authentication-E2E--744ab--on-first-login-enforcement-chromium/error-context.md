# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lab-03\authentication.spec.ts >> E2E-01: Authentication & First-Login Password Change Flow >> AC-04: Mandatory password change on first login enforcement
- Location: e2e\lab-03\authentication.spec.ts:57:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button[type="submit"]:has-text("Set New Password & Continue")')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - generic [ref=e7]: 🔒
      - heading "Change Your Password" [level=3] [ref=e8]
      - paragraph [ref=e9]: Signed in as emily.watson@example.com. You are signing in with an initial password. You must set a new password before entering the application.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Current Initial Password *
        - textbox "Current Initial Password *" [ref=e13]:
          - /placeholder: Enter current password
          - text: Initial123!
      - generic [ref=e14]:
        - generic [ref=e15]: New Password (min 8 characters) *
        - textbox "New Password (min 8 characters) *" [ref=e16]:
          - /placeholder: Enter at least 8 characters
          - text: NewPass_1789797048156!
      - generic [ref=e17]:
        - generic [ref=e18]: Confirm New Password *
        - textbox "Confirm New Password *" [active] [ref=e19]:
          - /placeholder: Re-enter new password
          - text: NewPass_1789797048156!
      - button "Save New Password" [ref=e20] [cursor=pointer]
  - navigation [ref=e21]:
    - generic [ref=e22]:
      - generic [ref=e23]: TokTickIT
      - generic [ref=e24]:
        - generic [ref=e25]:
          - generic [ref=e26]:
            - text: Emily Watson
            - generic [ref=e27]: REQUESTER
          - text: emily.watson@example.com
        - button "Logout" [ref=e28] [cursor=pointer]
  - generic [ref=e29]:
    - generic [ref=e30]:
      - button "Create Ticket" [ref=e31] [cursor=pointer]
      - button "My Tickets" [ref=e32] [cursor=pointer]
    - generic [ref=e35]:
      - heading "Create New Support Ticket" [level=4] [ref=e37]
      - generic [ref=e39]:
        - generic [ref=e40]:
          - generic [ref=e41]: Requester
          - textbox [disabled] [ref=e42]: Emily Watson (emily.watson@example.com)
          - generic [ref=e43]: Populated automatically from the active Development Requester session.
        - generic [ref=e44]:
          - generic [ref=e45]:
            - generic [ref=e46]: Category *
            - combobox [ref=e47]:
              - option "-- Select Category --" [selected]
              - option "Account and Access"
              - option "Hardware"
              - option "Software"
              - option "Network"
          - generic [ref=e48]:
            - generic [ref=e49]: Related System *
            - combobox [ref=e50]:
              - option "-- Select Related System --" [selected]
              - option "Campus Wi-Fi"
              - option "Corporate Laptop"
              - option "Email"
              - option "Grade Submission App"
              - option "LEB2 App"
              - option "Printer"
              - option "VPN"
        - generic [ref=e51]:
          - generic [ref=e52]: Priority
          - generic [ref=e53]:
            - generic [ref=e54]:
              - radio "low" [ref=e55]
              - generic [ref=e56]: low
            - generic [ref=e57]:
              - radio "medium" [checked] [ref=e58]
              - generic [ref=e59]: medium
            - generic [ref=e60]:
              - radio "high" [ref=e61]
              - generic [ref=e62]: high
        - generic [ref=e63]:
          - generic [ref=e64]: Summary *
          - textbox "Brief summary of the issue" [ref=e65]
        - generic [ref=e66]:
          - generic [ref=e67]: Description *
          - textbox "Detailed description of what happened..." [ref=e68]
        - generic [ref=e69]:
          - generic [ref=e70]: Attachments (Max 5 files, 5MB each. JPG, PNG, WEBP, PDF)
          - button "Attachments (Max 5 files, 5MB each. JPG, PNG, WEBP, PDF)" [ref=e71] [cursor=pointer]
        - button "Submit Ticket" [ref=e72] [cursor=pointer]
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
  24 |     await expect(page.locator('span.fw-semibold:has-text("David Lee")')).toBeVisible();
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
> 72 |     await page.click('button[type="submit"]:has-text("Set New Password & Continue")');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
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