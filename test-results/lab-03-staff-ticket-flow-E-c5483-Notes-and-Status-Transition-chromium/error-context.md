# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lab-03\staff-ticket-flow.spec.ts >> E2E-02: IT Staff Ticket Lifecycle, Operations & Discussion Flow >> Staff triage flow: Queue inspection, Claim ticket, Priority adjustment, Comments & Notes, and Status Transition
- Location: e2e\lab-03\staff-ticket-flow.spec.ts:13:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h3:has-text("IT Staff Ticket Queue")')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h3:has-text("IT Staff Ticket Queue")') with timeout 5000ms
  - waiting for locator('h3:has-text("IT Staff Ticket Queue")')

```

```yaml
- navigation:
  - text: TokTickIT Sarah Connor IT_STAFF sarah.connor@example.com
  - button "Logout"
- button "Ticket Queue"
- button "Create Ticket"
- button "My Tickets"
- heading "IT Staff Ticket Queue" [level=2]
- paragraph: Triage, claim, and resolve service desk tickets
- text: "Total in Queue:"
- strong: "146"
- button "Refresh"
- text: Search
- textbox "Search":
  - /placeholder: "Search ticket #, summary, requester..."
- text: Status
- combobox "Status":
  - option "All Statuses" [selected]
  - option "New"
  - option "Open"
  - option "In Progress"
  - option "Waiting for Requester"
  - option "Resolved"
  - option "Closed"
  - option "Reopened"
- text: Priority
- combobox "Priority":
  - option "All Priorities" [selected]
  - option "URGENT"
  - option "HIGH"
  - option "MEDIUM"
  - option "LOW"
- text: Owner
- combobox "Owner":
  - option "All Owners" [selected]
  - option "Unassigned"
  - option "Assigned to Me"
  - option "Admin System"
  - option "Elena Rostova"
  - option "James Gordon"
  - option "Sarah Connor (You)"
  - option "Second Admin"
  - option "Second Admin"
  - option "Second Admin"
  - option "Second Admin"
  - option "Test New User"
  - option "Test New User"
  - option "Test New User"
  - option "Test New User"
- text: Sort By
- combobox "Sort By":
  - option "Newest First" [selected]
  - option "Oldest First"
  - 'option "Ticket # (Asc)"'
  - 'option "Ticket # (Desc)"'
  - option "Priority"
- table:
  - rowgroup:
    - 'row "Ticket # Summary Requester Status IT Priority Owner Created Action"':
      - 'columnheader "Ticket #"'
      - columnheader "Summary"
      - columnheader "Requester"
      - columnheader "Status"
      - columnheader "IT Priority"
      - columnheader "Owner"
      - columnheader "Created"
      - columnheader "Action"
  - rowgroup:
    - row "TKT-2026-000146 Test ticket summary Account and Access David Lee david.lee@example.com New MEDIUM Unassigned Sep 19, 12:03 PM View":
      - cell "TKT-2026-000146"
      - cell "Test ticket summary Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "New"
      - cell "MEDIUM"
      - cell "Unassigned"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
    - row "TKT-2026-000145 Cross-requester test Account and Access David Lee david.lee@example.com New MEDIUM Unassigned Sep 19, 12:03 PM View":
      - cell "TKT-2026-000145"
      - cell "Cross-requester test Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "New"
      - cell "MEDIUM"
      - cell "Unassigned"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
    - row "TKT-2026-000144 Test for attachments Account and Access David Lee david.lee@example.com New MEDIUM Unassigned Sep 19, 12:03 PM View":
      - cell "TKT-2026-000144"
      - cell "Test for attachments Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "New"
      - cell "MEDIUM"
      - cell "Unassigned"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
    - row "TKT-2026-000143 Pagination Test Ticket 3 Account and Access David Lee david.lee@example.com New MEDIUM Unassigned Sep 19, 12:03 PM View":
      - cell "TKT-2026-000143"
      - cell "Pagination Test Ticket 3 Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "New"
      - cell "MEDIUM"
      - cell "Unassigned"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
    - row "TKT-2026-000142 Pagination Test Ticket 2 Account and Access David Lee david.lee@example.com New MEDIUM Unassigned Sep 19, 12:03 PM View":
      - cell "TKT-2026-000142"
      - cell "Pagination Test Ticket 2 Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "New"
      - cell "MEDIUM"
      - cell "Unassigned"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
    - row "TKT-2026-000141 Pagination Test Ticket 1 Account and Access David Lee david.lee@example.com New MEDIUM Unassigned Sep 19, 12:03 PM View":
      - cell "TKT-2026-000141"
      - cell "Pagination Test Ticket 1 Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "New"
      - cell "MEDIUM"
      - cell "Unassigned"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
    - row "TKT-2026-000140 Identity isolation verification ticket Account and Access David Lee david.lee@example.com New MEDIUM Unassigned Sep 19, 12:03 PM View":
      - cell "TKT-2026-000140"
      - cell "Identity isolation verification ticket Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "New"
      - cell "MEDIUM"
      - cell "Unassigned"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
    - row "TKT-2026-000139 Comments and Notes Ticket Account and Access David Lee david.lee@example.com New MEDIUM Unassigned Sep 19, 12:03 PM View":
      - cell "TKT-2026-000139"
      - cell "Comments and Notes Ticket Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "New"
      - cell "MEDIUM"
      - cell "Unassigned"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
    - row "TKT-2026-000138 New Unclaimed Ticket Account and Access David Lee david.lee@example.com Open HIGH 👤 Sarah Connor Sep 19, 12:03 PM View":
      - cell "TKT-2026-000138"
      - cell "New Unclaimed Ticket Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "Open"
      - cell "HIGH"
      - cell "👤 Sarah Connor"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
    - row "TKT-2026-000137 Staff Operations Test Ticket Account and Access David Lee david.lee@example.com Reopened URGENT Unassigned Sep 19, 12:03 PM View":
      - cell "TKT-2026-000137"
      - cell "Staff Operations Test Ticket Account and Access"
      - cell "David Lee david.lee@example.com"
      - cell "Reopened"
      - cell "URGENT"
      - cell "Unassigned"
      - cell "Sep 19, 12:03 PM"
      - cell "View":
        - button "View"
- text: Showing page
- strong: "1"
- text: of
- strong: "15"
- text: (146 tickets)
- navigation "Staff ticket pagination":
  - list:
    - listitem:
      - button "Previous" [disabled]
    - listitem:
      - button "1"
    - listitem:
      - button "2"
    - listitem:
      - button "3"
    - listitem:
      - button "4"
    - listitem:
      - button "5"
    - listitem:
      - button "6"
    - listitem:
      - button "7"
    - listitem:
      - button "8"
    - listitem:
      - button "9"
    - listitem:
      - button "10"
    - listitem:
      - button "11"
    - listitem:
      - button "12"
    - listitem:
      - button "13"
    - listitem:
      - button "14"
    - listitem:
      - button "15"
    - listitem:
      - button "Next"
```

# Test source

```ts
  1  | /**
  2  |  * End-to-End Test Suite (E2E-02): IT Staff Ticket Operations, Queue, and Discussions
  3  |  * Traceable to AC-07, AC-08, AC-09, AC-10, AC-11, AC-12, AC-13, AC-14, BR-08, BR-09, BR-10, BR-11, BR-12, BR-13, BR-15, BR-16
  4  |  */
  5  | 
  6  | import { test, expect } from '@playwright/test';
  7  | 
  8  | test.describe('E2E-02: IT Staff Ticket Lifecycle, Operations & Discussion Flow', () => {
  9  |   test.beforeEach(async ({ page }) => {
  10 |     await page.goto('/');
  11 |   });
  12 | 
  13 |   test('Staff triage flow: Queue inspection, Claim ticket, Priority adjustment, Comments & Notes, and Status Transition', async ({ page }) => {
  14 |     // 1. Log in as IT Staff (Sarah Connor)
  15 |     await page.fill('#email', 'sarah.connor@example.com');
  16 |     await page.fill('#password', 'Password123!');
  17 |     await page.click('button[type="submit"]:has-text("Sign In")');
  18 | 
  19 |     // 2. Verify IT Staff role and Ticket Queue tab
  20 |     await expect(page.locator('.badge:has-text("IT_STAFF")')).toBeVisible();
  21 |     await expect(page.locator('button:has-text("Ticket Queue")')).toBeVisible();
  22 | 
  23 |     // 3. Navigate to Ticket Queue
  24 |     await page.click('button:has-text("Ticket Queue")');
> 25 |     await expect(page.locator('h3:has-text("IT Staff Ticket Queue")')).toBeVisible();
     |                                                                        ^ Error: expect(locator).toBeVisible() failed
  26 | 
  27 |     // 4. Verify search and filter in Queue
  28 |     const searchInput = page.locator('input[placeholder*="Search ticket #, summary, requester"]');
  29 |     await expect(searchInput).toBeVisible();
  30 | 
  31 |     // 5. Open first ticket from the queue table
  32 |     const viewButton = page.locator('button:has-text("View"):not([disabled])').first();
  33 |     await expect(viewButton).toBeVisible();
  34 |     await viewButton.click();
  35 | 
  36 |     // 6. Verify Staff Ticket Detail view loaded
  37 |     await expect(page.locator('button:has-text("Back to Queue")')).toBeVisible();
  38 |     await expect(page.locator('h6:has-text("Ticket Ownership")')).toBeVisible();
  39 |     await expect(page.locator('h6:has-text("Priority Management")')).toBeVisible();
  40 | 
  41 |     // 7. Test IT Priority Adjustment (AC-11)
  42 |     const prioritySelect = page.locator('#select-it-priority');
  43 |     await prioritySelect.selectOption('URGENT');
  44 |     await page.click('button:has-text("Save IT Priority")');
  45 |     await expect(page.locator('.alert-success')).toBeVisible();
  46 | 
  47 |     // 8. Test Public Comment Submission (AC-13)
  48 |     const commentText = `Staff public update via E2E test at ${Date.now()}`;
  49 |     await page.fill('textarea[placeholder*="Write a public response"]', commentText);
  50 |     await page.click('button:has-text("Post Comment")');
  51 |     await expect(page.locator(`text=${commentText}`)).toBeVisible();
  52 | 
  53 |     // 9. Test Confidential Internal Note Submission (AC-14)
  54 |     const internalNotesTab = page.locator('button[role="tab"]:has-text("Internal Notes")');
  55 |     await internalNotesTab.click();
  56 |     await expect(page.locator('text=Staff Operational Notes')).toBeVisible();
  57 | 
  58 |     const noteText = `Staff confidential internal diagnostics via E2E test at ${Date.now()}`;
  59 |     await page.fill('textarea[placeholder*="Record internal troubleshooting"]', noteText);
  60 |     await page.click('button:has-text("Add Internal Note")');
  61 |     await expect(page.locator(`text=${noteText}`)).toBeVisible();
  62 | 
  63 |     // 10. Return to Queue
  64 |     await page.click('button:has-text("Back to Queue")');
  65 |     await expect(page.locator('h3:has-text("IT Staff Ticket Queue")')).toBeVisible();
  66 |   });
  67 | });
  68 | 
```