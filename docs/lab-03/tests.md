# Lab 3 Test Plan and Traceability

## 1. Test Strategy
The plan was written with the Sprint 3 contract (PR #18) and extended in v1.1 of the specification (see `specification.md` §12) when an audit found security gaps. Every Acceptance Criterion maps to at least one test.

| Level | Tool | Location | What it proves |
| :--- | :--- | :--- | :--- |
| API / integration / security | Vitest + Supertest | `server/tests/lab-0{1,2,3}/` | Endpoints, status codes, authorization, ownership, validation, business rules |
| Migration | Prisma migrate + SQL | `server/prisma/migrations/`, `server/tests/global-setup.ts` | Lab 2 data survives the Lab 3 migration; migrations build the schema from scratch |
| UI component | Vitest + React Testing Library | `client/src/tests/` | Rendering, validation messages, role navigation, safe text rendering |
| End-to-end | Playwright | `e2e/lab-02/`, `e2e/lab-03/` | Real browser journeys against the running app and database |
| Visual / responsive / accessibility | Playwright capture + checklist | `scripts/capture-screenshots.spec.ts`, `artifacts/lab-03/screenshots/` | Desktop 1280px, tablet 768px, mobile 375px evidence reviewed against §5 |

**Test data isolation:** API tests run against a separate database (`<DATABASE_URL name>_test`, or `TEST_DATABASE_URL`). `tests/global-setup.ts` creates it if needed, applies all migrations with `prisma migrate deploy`, and runs the idempotent seed, so the tests never write into development data.

---

## 2. Planned Tests Matrix

### 2.1 API, security, and regression tests (server)
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | AC-01, FR-01 | Valid login (email case-insensitive) | 200; token + safe user (no `passwordHash`, no `tokenVersion`) | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-02** | Security | AC-02, BR-24 | Wrong password and unknown email | 401 with the same generic message | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-03** | Security | AC-03, BR-01, BR-24 | Inactive account; inactive + wrong password | 401 "deactivated" only after correct password; otherwise generic | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04** | API | AC-04, BR-02 | First-login change: blocked before, fresh token after, old token revoked | 403 `mustChangePassword` → 200 with new token → old token 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04b** | API | AC-25, BR-23 | IT Staff opens queue right after first-login change | 403 before, 200 with new token | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04c** | Unit/API | BR-22 | Password boundaries: 7 chars, no digit, no letter, 73 chars, same as current → 400; exactly 8 → 200 | As stated | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-05** | Security | AC-05, BR-05 | Logout invalidates the same token; logout without token | `/me` and `/staff` → 401 after logout; 401 without token | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-05b** | Security | BR-26 | Malformed token; `X-Requester-Id` header alone | 401 | `server/tests/lab-03/auth.api.test.ts`, `authorization.api.test.ts` | Pass |
| **API-06** | Security | AC-06, BR-06 | Spoofed `X-Requester-Id` / body `requesterId` with a valid token | Ticket owned by the token's user | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-06b** | Security | AC-29, BR-27 | Direct API role matrix (Requester / IT Staff / Admin × 4 endpoints); staff cannot create tickets; Requester cannot change owner/priority/status or manage users | Expected 200/403 per role | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-06c** | Security | BR-26 | Removed `/api/requesters` endpoint | JSON 404 | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-07** | Security | AC-07 | Queue role guard, mustChangePassword guard | 200 Staff/Admin; 403 Requester; 403 pending change | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-08** | API | AC-08, AC-09 | Queue search, status/priority/owner filters, sorting, pagination metadata | Matching subsets and correct metadata | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-08b** | API | AC-30, BR-28 | Invalid `status`, `priority`, `owner`, `sortBy`, `sortOrder`; unauthenticated | 400 naming the parameter; 401 | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-09** | API | AC-10, BR-09 | Claim / reassign / unassign; ineligible owner | 200 and `ownerId` updated; New→Open on claim; 400 for inactive/requester owner | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-10** | API | AC-11, BR-10, BR-11 | Update IT Priority; invalid value | IT Priority changes, Requested Priority unchanged; 400 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-11** | API | AC-12, BR-13 | Permitted and invalid status transitions | 200 permitted; 400 invalid (e.g., New→Closed, Resolved→In Progress) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-12** | API | AC-13, BR-15, BR-17 | Public Comments by owner/Staff/Admin; empty; >2000 chars; HTML stored as text | 201/200; 400; content returned verbatim | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-12b** | Security | AC-26, BR-25 | Non-owner Requester reads/posts comments; unauthenticated | 404 (no data); 401 | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-13** | Security | AC-14, BR-16 | Internal Notes for Staff/Admin; Requester read/post | 200/201; 403 without note content | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-14** | API | AC-15, BR-14 | Requester indicates resolved; repeat; non-owner; IT Staff; status unchanged | 200; 409; 404; 403; status not Resolved | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-15** | Security | AC-16 | Admin API access guard | 200 Admin; 403 Staff and Requester | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-16** | API | AC-17, AC-18, BR-04, BR-29 | List/search/role filter; create; duplicate email (case-insensitive); invalid email; invalid role | 200/201; 409; 400; 400 | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-17** | API | AC-19, BR-18, BR-23 | Edit and deactivate; deactivated user's existing token | 200, record kept; old token 401 | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-18** | API | AC-20, BR-19 | Admin self-deactivation | 400 | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-19** | API | AC-21, BR-20 | Deactivate/demote the last active Administrator | 400 | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-20** | API | AC-22, AC-25, BR-21, BR-22 | Set new initial password; policy boundaries; old sessions revoked | 200 + `mustChangePassword=true`; 7 chars/no digit 400, 8 chars 200; old token 401 | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **REG-01** | Regression | AC-23, BR-07, BR-27 | Lab 2 create ticket (with token, IT Priority copy, invalid priority, 401 without token) | 201 / 400 / 401 | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| **REG-02** | Regression | AC-23, AC-26 | Lab 2 attachments: upload, size/type limits, 401 unauthenticated, 404 for other requester, Staff download, removal needs reason | As stated | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| **REG-03** | Regression | AC-23, AC-06 | Lab 2 My Tickets pagination, owner-only list, invalid sortBy | 200 / only own tickets / 400 | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| **REG-04** | Regression | AC-23, AC-26 | Lab 2 ticket detail: owner 200; other requester and missing ticket both 404 | As stated | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| **REG-05** | Regression | — | Lab 1 health and categories | 200 | `server/tests/lab-01/*.test.ts` | Pass |

### 2.2 Migration tests
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Evidence | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **MIG-01** | Migration | AC-27 | Apply Lab 1 + Lab 2 migrations to an empty DB, insert Lab 2 rows (2 requesters, tickets in `Pending`/`New`, 1 attachment), apply the Lab 3 migration | Users kept with same ids as `REQUESTER`, bcrypt hash, `mustChangePassword=true`; `Pending`→`In Progress`; `itPriority` = requested; attachment kept; `prisma migrate diff` vs `schema.prisma` is empty | §6.4 below | Pass |
| **MIG-02** | Migration | AC-27 | Every test run builds the test DB with `prisma migrate deploy` from the committed history | All 3 migrations apply; suites pass on the result | `server/tests/global-setup.ts` | Pass |
| **MIG-03** | Seed | §5.3 | Seed runs twice | Second run creates 0 new tickets; accounts reset to documented passwords | §6.4 below | Pass |

### 2.3 UI component tests (client)
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UI-01** | UI | AC-01, AC-02 | Login validation, busy state, error alert | Validation and safe error shown | `client/src/tests/lab-03/Login.test.tsx` | Pass |
| **UI-02** | UI | AC-04, BR-22 | Change Password: mismatch, short password, success callback | Inline alert; callback only on success | `client/src/tests/lab-03/ChangePassword.test.tsx` | Pass |
| **UI-03** | UI | AC-08, AC-09 | Staff Queue: badges (IT + requested priority), filters, empty state | Rendered and API called with filters | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| **UI-04** | UI | AC-10–AC-14 | Staff Ticket Detail: claim, priority, status buttons, comment/note tabs | Actions call the API; tabs switch | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| **UI-05** | UI | AC-17–AC-22 | User Management: list, create, self-deactivation disabled, reset password | As stated | `client/src/tests/lab-03/UserManagement.test.tsx` | Pass |
| **UI-06** | UI / Security | AC-04, AC-29, FR-13, FR-14 | Role navigation per role, role badge, forced password change hides the app and loads no data, voluntary change can be cancelled, session-expired returns to login | As stated | `client/src/tests/lab-03/AppShell.test.tsx` | Pass |
| **UI-07** | UI / Security | AC-28, BR-17 | Requester Public Comments: list, empty, post, error, disabled empty post, HTML rendered as text | As stated; no `<img>` injected | `client/src/tests/lab-03/PublicComments.test.tsx` | Pass |
| **UI-08** | Regression | AC-23, AC-28, BR-26 | Requester detail shows comments, no Internal Notes, "My Problem Appears Resolved"; requests send Bearer token and never `X-Requester-Id` | As stated | `client/src/tests/RequesterTicketDetail.test.tsx` | Pass |
| **UI-09** | Regression | AC-23 | Lab 2 Create Ticket, My Tickets empty state, attachment section | As in Lab 2 | `client/src/tests/{CreateTicket,MyTickets,AttachmentSection}.test.tsx` | Pass |

### 2.4 End-to-end tests (Playwright)
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **E2E-01a** | E2E | AC-01, AC-05, AC-29 | Login, role badge and navigation, logout notice, **old token rejected after logout**, reload stays logged out | As stated | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-01b** | E2E | AC-02, AC-03 | Invalid credentials; inactive account | Safe alerts | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-01c** | E2E | AC-04, AC-25 | Initial password → forced change (validation error shown) → IT Staff queue loads with new session | As stated | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-02** | E2E | AC-07, AC-08, AC-10–AC-14 | Staff: search queue, claim (New→Open), IT Priority, comment, internal note, Open→In Progress, invalid targets not offered; API check that Requester gets 403 on notes and Requested Priority unchanged | As stated | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| **E2E-03** | E2E | AC-16–AC-22 | Admin: create user, search, self-deactivation guard, set initial password, forced change at next login | As stated | `e2e/lab-03/user-administration.spec.ts` | Pass |
| **E2E-04** | E2E / Regression | AC-23, AC-26, AC-28, AC-15 | Requester (no selector): create with attachment, list, open, remove with reason, post comment, indicate resolved (status unchanged), another Requester sees "Ticket Unavailable" | As stated | `e2e/lab-02/requester-ticket-flow.spec.ts` | Pass |

### 2.5 Visual, responsive, and accessibility checks
| Test ID | Type | Requirement / AC | What It Tests | Evidence | Final |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VIS-01** | UI style | §7, AC-24 | Zen Green tokens, consistent role/status/priority badges, editable vs read-only fields | `artifacts/lab-03/screenshots/**` (desktop) | Pass (checklist §5) |
| **VIS-02** | Responsive | AC-24 | Login, queue, staff detail, requester detail, user management at 768px and 375px: no clipping or page-level horizontal scroll; phones use card lists | `*-tablet.png`, `*-mobile.png` | Pass (checklist §5) |
| **VIS-03** | Accessibility | §7 | Labels on inputs, `role="alert"` / `role="status"` feedback, dialog `aria-modal` + title, pagination `aria-label`, keyboard-reachable buttons | Component tests query by label/role (UI-01…UI-08) | Pass |

---

## 3. Acceptance-Criterion Traceability

| AC | Description | Covered By |
| :--- | :--- | :--- |
| AC-01 | Valid authentication & role | API-01, UI-01, E2E-01a |
| AC-02 | Invalid credentials rejection | API-02, UI-01, E2E-01b |
| AC-03 | Inactive account handling | API-03, E2E-01b |
| AC-04 | Mandatory first password change | API-04, UI-02, UI-06, E2E-01c |
| AC-05 | Logout invalidates session | API-05, E2E-01a |
| AC-06 | Requester identity from token | API-06, REG-03 |
| AC-07 | Queue role authorization | API-07, E2E-02 |
| AC-08 | Queue query & filtering | API-08, UI-03, E2E-02 |
| AC-09 | Queue pagination & sorting | API-08, UI-03 |
| AC-10 | Claim & reassign ownership | API-09, UI-04, E2E-02 |
| AC-11 | IT Priority separation | API-10, UI-04, E2E-02 |
| AC-12 | Permitted status transitions | API-11, UI-04, E2E-02 |
| AC-13 | Public Comments | API-12, UI-04, E2E-02 |
| AC-14 | Internal Notes boundary | API-13, UI-04, E2E-02 |
| AC-15 | Requester resolution indication | API-14, UI-08, E2E-04 |
| AC-16 | Admin access guard | API-15, E2E-03 |
| AC-17 | User listing & filtering | API-16, UI-05, E2E-03 |
| AC-18 | Create user & duplicate email | API-16, UI-05, E2E-03 |
| AC-19 | Edit & deactivation | API-17, UI-05 |
| AC-20 | Self-deactivation prevention | API-18, UI-05, E2E-03 |
| AC-21 | Last active admin protection | API-19 |
| AC-22 | Set new initial password | API-20, UI-05, E2E-03 |
| AC-23 | Lab 2 regression | REG-01…REG-04, UI-08, UI-09, E2E-04 |
| AC-24 | Responsive Zen Green layout | VIS-01, VIS-02 |
| AC-25 | Session revocation | API-04, API-04b, API-17, API-20, E2E-01c |
| AC-26 | No existence disclosure (404) | API-12b, REG-02, REG-04, E2E-04 |
| AC-27 | Migration preserves Lab 2 data | MIG-01, MIG-02 |
| AC-28 | Requester Public Comments | UI-07, UI-08, E2E-04 |
| AC-29 | Role navigation + API enforcement | API-06b, UI-06, E2E-01a |
| AC-30 | Queue invalid parameters | API-08b |

---

## 4. Test Execution Commands

```bash
# Database (Docker) must be running: docker compose up -d
# 1. Server API / security / regression tests (uses the separate *_test database)
npm --prefix server test

# 2. Client UI component tests
npm --prefix client test

# 3. End-to-end tests (starts server and client automatically)
npx playwright test

# 4. Regenerate responsive screenshots (after `npx prisma db seed` in server/)
npx playwright test --config scripts/screenshots.config.ts

# 5. Direct API authorization evidence with curl (API must be running: npm --prefix server run dev)
bash scripts/api-authorization-evidence.sh
```

**Direct API authorization evidence** (output of command 5, recorded 2026-10-01):
```text
# Ticket TKT-2026-000001 (id=1) belongs to David Lee (Requester)
GET   /api/tickets (no token)                                -> 401 {"error":"Authentication required"}
GET   /api/tickets (only header X-Requester-Id: 1)           -> 401 {"error":"Authentication required"}
GET   /api/tickets/1 (Jennifer, not the owner)               -> 404 {"error":"Ticket not found."}
GET   /api/tickets/1/comments (Jennifer, not the owner)      -> 404 {"error":"Ticket not found"}
GET   /api/tickets/1/internal-notes (David, Requester)       -> 403 {"error":"Access denied: insufficient permissions"}
GET   /api/staff/tickets (David, Requester)                  -> 403 {"error":"Access denied: insufficient permissions"}
PATCH /api/staff/tickets/1/status (David, Requester)         -> 403 {"error":"Access denied: insufficient permissions"}
GET   /api/admin/users (Sarah, IT Staff)                     -> 403 {"error":"Access denied: insufficient permissions"}
POST  /api/tickets/1/indicate-resolved (Sarah, IT Staff)     -> 403 {"error":"Access denied: insufficient permissions"}
GET   /api/tickets/1/internal-notes (Sarah, IT Staff)        -> 200 [{"id":1,"content":"Known GPU driver bug with Thunderbolt dock firmware. Need to
POST  /api/auth/logout (David)                               -> 200 {"message":"Logged out successfully"}
GET   /api/tickets (David's old token after logout)          -> 401 {"error":"Invalid or expired authentication token"}
```

---

## 5. Responsive and Visual Checklist
Reviewed on the screenshots in `artifacts/lab-03/screenshots/` (desktop 1280px, tablet 768px, mobile 375px).

- [x] Consistent Zen Green colour tokens across all new screens.
- [x] Navigation shows only the current role's destinations (`authentication/08-navigation-*.png`, `user-management/11-non-admin-has-no-user-management.png`).
- [x] Name and role badge visible in the header on every viewport, including mobile (`authentication/11-navbar-mobile.png`).
- [x] One shared role badge style (Requester / IT Staff / Administrator) everywhere; status and priority badges readable; queue shows both IT and Requested Priority.
- [x] Editable inputs vs read-only fields visually distinct (Requested Priority marked "Immutable" in Staff Detail).
- [x] Validation messages next to the field or at the top of the dialog (`authentication/04b-*`, `user-management/04b-*`, `04c-*`, `06-*`).
- [x] Public Comments and Internal Notes visually distinguished; Requesters never see Internal Notes.
- [x] Loading, empty, no-results, success, and safe error feedback present (`staff-queue/07-queue-no-results.png`, `requester-ticket-detail/03-*`, `06-*`).
- [x] No clipped columns or page-level horizontal scrolling: the queue and user list switch to card layouts under 768px; the desktop queue fits at 1280px.
- [x] Dialogs fit on mobile.

---

## 6. Automated Test Execution Results
Recorded on 2026-10-01 from branch `feature/lab3-7-security-hardening`. **Re-run on `main` after merging and paste that output into the PDF (Part 3).**

### 6.1 Server API, security, and regression tests — 12 files, 121 passed
```text
> server@1.0.0 test
> vitest run --no-file-parallelism

 ✓ tests/lab-01/categories.test.ts (1 test)
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-02/attachments.api.test.ts (7 tests)
 ✓ tests/lab-02/create-ticket.api.test.ts (4 tests)
 ✓ tests/lab-02/my-tickets.api.test.ts (3 tests)
 ✓ tests/lab-02/ticket-detail.api.test.ts (3 tests)
 ✓ tests/lab-03/auth.api.test.ts (22 tests)
 ✓ tests/lab-03/authorization.api.test.ts (11 tests)
 ✓ tests/lab-03/comments-notes.api.test.ts (11 tests)
 ✓ tests/lab-03/staff-queue.api.test.ts (20 tests)
 ✓ tests/lab-03/staff-ticket-detail.api.test.ts (18 tests)
 ✓ tests/lab-03/users-admin.api.test.ts (20 tests)

 Test Files  12 passed (12)
      Tests  121 passed (121)
```

### 6.2 Client UI component tests — 11 files, 40 passed
```text
> client@0.0.0 test
> vitest run

 ✓ src/tests/AttachmentSection.test.tsx (1 test)
 ✓ src/tests/CreateTicket.test.tsx (1 test)
 ✓ src/tests/MyTickets.test.tsx (1 test)
 ✓ src/tests/RequesterTicketDetail.test.tsx (1 test)
 ✓ src/tests/lab-03/AppShell.test.tsx (6 tests)
 ✓ src/tests/lab-03/ChangePassword.test.tsx (4 tests)
 ✓ src/tests/lab-03/Login.test.tsx (4 tests)
 ✓ src/tests/lab-03/PublicComments.test.tsx (5 tests)
 ✓ src/tests/lab-03/StaffTicketDetail.test.tsx (7 tests)
 ✓ src/tests/lab-03/StaffTicketQueue.test.tsx (5 tests)
 ✓ src/tests/lab-03/UserManagement.test.tsx (5 tests)

 Test Files  11 passed (11)
      Tests  40 passed (40)
```

### 6.3 End-to-end Playwright tests — 4 files, 7 passed
```text
Running 7 tests using 1 worker

  ok 1 [chromium] › e2e\lab-02\requester-ticket-flow.spec.ts › Lab 2 Requester regression with authenticated identity › create, list, open, attach, remove, comment, and indicate resolved as the signed-in Requester
  ok 2 [chromium] › e2e\lab-03\authentication.spec.ts › E2E-01 › AC-01 & AC-05: Authenticate with valid credentials and successfully logout
  ok 3 [chromium] › e2e\lab-03\authentication.spec.ts › E2E-01 › AC-02: Reject invalid login credentials with safe error alert
  ok 4 [chromium] › e2e\lab-03\authentication.spec.ts › E2E-01 › AC-03: Reject inactive user account authentication
  ok 5 [chromium] › e2e\lab-03\authentication.spec.ts › E2E-01 › AC-04: Mandatory password change on first login enforcement
  ok 6 [chromium] › e2e\lab-03\staff-ticket-flow.spec.ts › E2E-02 › Staff triage flow: Queue search, Claim, IT Priority, Comments & Notes, and Status Transition
  ok 7 [chromium] › e2e\lab-03\user-administration.spec.ts › E2E-03 › Admin user journey: User creation, Search/Filter, Self-deactivation guard, and Password Reset login flow

  7 passed
```

### 6.4 Migration and seed evidence (MIG-01, MIG-03)
```text
-- Lab 2 data inserted after migrations 1–2, then Lab 3 migration applied:
 id |        email        |   role    | mustChangePassword | passwordHash
  1 | legacy1@example.com | REQUESTER | t                  | $2b$10$...
  2 | legacy2@example.com | REQUESTER | t                  | $2b$10$...

 ticketNumber |   status    | requestedPriority | itPriority | requesterId
 TKT-L2-1     | In Progress | HIGH              | HIGH       |           2   (was Pending)
 TKT-L2-2     | New         | LOW               | LOW        |           1

 attachments: 1 (preserved)

$ npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
-- This is an empty migration.

$ npx tsx prisma/seed.ts   (second run)
✅ Seeded 0 new Tickets (16 defined) with Public Comments and Internal Notes.
```
