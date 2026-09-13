# Lab 3 Test Plan and Traceability

## 1. Test Strategy
Testing for Lab 3 follows strict Test-Driven Development (TDD) and Test-Driven Design (Test DD). The test pyramid covers:
- **Unit & Security Tests**: Password hashing, token generation, and authorization permission guards.
- **API Integration Tests**: Supertest suites for authentication, queue querying, status transitions, comment/note boundaries, and admin safety rules.
- **UI Component Tests**: Vitest + React Testing Library suites verifying component states, validation messages, role-based controls, and Zen Green design tokens.
- **Regression Tests**: Verification that all Lab 2 Requester creation, listing, and attachment capabilities remain 100% functional.
- **End-to-End (E2E) Tests**: Playwright suites executing realistic full user journeys for Authentication, Staff Operations, and User Administration.

---

## 2. Planned Tests Matrix

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API-01** | API | AC-01, FR-01 | Valid user login | 200 OK; returns JWT token and safe user profile (no password) | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-02** | API | AC-02, BR-01 | Invalid login credentials | 401 Unauthorized; safe generic error message | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-03** | API | AC-03, BR-01 | Login with inactive account | 401 Unauthorized; account inactive alert | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-04** | API | AC-04, BR-02 | Mandatory password change | 200 OK; clears `mustChangePassword` flag | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-05** | API | AC-05, BR-05 | Logout session termination | 200 OK; subsequent token access returns 401 | `server/tests/lab-03/auth.api.test.ts` | Pass |
| **API-06** | API | AC-06, BR-06 | Requester identity isolation | Ticket created with session identity, ignoring client requesterId | `server/tests/lab-03/authorization.api.test.ts` | Pass |
| **API-07** | API | AC-07, FR-05 | Staff Queue role access guard | 200 OK for IT Staff/Admin; 403 Forbidden for Requester | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-08** | API | AC-08, AC-09 | Queue search, filters & pagination | Correct filtered/sorted records and pagination metadata | `server/tests/lab-03/staff-queue.api.test.ts` | Pass |
| **API-09** | API | AC-10, FR-06 | Claim / Reassign ticket owner | 200 OK; `ownerId` updated and recorded | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-10** | API | AC-11, BR-11 | Update IT Priority | 200 OK; IT Priority updated, Requested Priority untouched | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-11** | API | AC-12, BR-13 | Permitted & invalid status transitions | Permitted transitions return 200; invalid transitions return 400 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-12** | API | AC-13, BR-15 | Public Comments creation & query | 201 Created; visible to Requester, Staff, and Admin | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-13** | API | AC-14, BR-16 | Internal Notes authorization boundary | Staff/Admin get 200/201; Requester gets 403 Forbidden | `server/tests/lab-03/comments-notes.api.test.ts` | Pass |
| **API-14** | API | AC-15, BR-14 | Requester indicates problem resolved | 200 OK; sets timestamp without closing ticket | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | Pass |
| **API-15** | API | AC-16, FR-12 | Admin user management access guard | 200 OK for Admin; 403 Forbidden for Staff and Requester | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-16** | API | AC-17, AC-18 | Admin user creation & duplicate email | 201 Created; duplicate email returns 409 Conflict | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-17** | API | AC-19, BR-18 | Admin user edit & deactivation | 200 OK; user deactivated, record not deleted | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-18** | API | AC-20, BR-19 | Admin self-deactivation prevention | 400 Bad Request; prevents deactivating self | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-19** | API | AC-21, BR-20 | Last active Admin protection | 400 Bad Request; prevents deactivating sole admin | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **API-20** | API | AC-22, BR-21 | Admin reset initial password | 200 OK; sets `mustChangePassword=true` | `server/tests/lab-03/users-admin.api.test.ts` | Pass |
| **UI-01** | UI | AC-01, AC-02 | Login component validation & error alert | Form validation triggers; invalid alert renders | `client/src/tests/lab-03/Login.test.tsx` | Pass |
| **UI-02** | UI | AC-04, BR-02 | Change Password modal enforcement | Enforces matching passwords and hides main app until saved | `client/src/tests/lab-03/ChangePassword.test.tsx` | Pass |
| **UI-03** | UI | AC-08, AC-14 | Staff Ticket Queue rendering & filters | Table renders badges; filter triggers API call; empty state handles | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | Pass |
| **UI-04** | UI | AC-10, AC-13 | Staff Ticket Detail actions & discussion | Action buttons trigger updates; tabs switch comments and notes | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | Pass |
| **UI-05** | UI | AC-17, AC-20 | User Management table & safety checks | Displays users; self-deactivate button is disabled | `client/src/tests/lab-03/UserManagement.test.tsx` | Pass |
| **E2E-01** | E2E | AC-01, AC-04 | Authentication & first login password change | Login -> Force Password Change -> Enter Dashboard -> Logout | `e2e/lab-03/authentication.spec.ts` | Pass |
| **E2E-02** | E2E | AC-07, AC-10 | Staff queue, claim ticket, comment & resolve | Staff logs in -> finds ticket -> claims -> adds note -> transitions | `e2e/lab-03/staff-ticket-flow.spec.ts` | Pass |
| **E2E-03** | E2E | AC-16, AC-22 | Admin user management & password reset flow | Admin creates staff user -> resets password -> staff logs in | `e2e/lab-03/user-administration.spec.ts` | Pass |
| **REG-01** | Reg | AC-23 | Lab 2 Requester regression suite | All Lab 2 ticket creation, my-tickets, attachments tests pass | `server/tests/lab-02/*.test.ts` | Pass |

---

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Description | Covered By Tests |
| :--- | :--- | :--- |
| **AC-01** | Valid Authentication & Role | API-01, UI-01, E2E-01 |
| **AC-02** | Invalid Credentials Rejection | API-02, UI-01 |
| **AC-03** | Inactive Account Handling | API-03, E2E-01 |
| **AC-04** | Mandatory First Password Change | API-04, UI-02, E2E-01 |
| **AC-05** | Session Termination / Logout | API-05, E2E-01 |
| **AC-06** | Requester Identity Derivation | API-06, REG-01 |
| **AC-07** | Queue Role Access Authorization | API-07, E2E-02 |
| **AC-08** | Queue Query & Filtering | API-08, UI-03 |
| **AC-09** | Queue Pagination & Sorting | API-08, UI-03 |
| **AC-10** | Claim & Reassign Ownership | API-09, UI-04, E2E-02 |
| **AC-11** | IT Priority Separation | API-10, UI-04 |
| **AC-12** | Permitted Status Transitions | API-11, UI-04, E2E-02 |
| **AC-13** | Public Comments Thread | API-12, UI-04, E2E-02 |
| **AC-14** | Internal Notes Role Boundary | API-13, UI-04 |
| **AC-15** | Requester Resolution Indication | API-14, UI-04 |
| **AC-16** | Admin User Management Access Guard | API-15, E2E-03 |
| **AC-17** | Admin User Listing & Filtering | API-16, UI-05, E2E-03 |
| **AC-18** | Create User & Duplicate Email Check | API-16, UI-05, E2E-03 |
| **AC-19** | Account Edit & Deactivation | API-17, UI-05 |
| **AC-20** | Admin Self-Deactivation Prevention | API-18, UI-05 |
| **AC-21** | Last Active Admin Protection | API-19, UI-05 |
| **AC-22** | Admin Set Initial Password | API-20, E2E-03 |
| **AC-23** | Lab 2 Requester Regression Safety | REG-01 |
| **AC-24** | Zen Green Responsive Compliance | E2E-01, E2E-02, E2E-03, Visual Audit |

---

## 4. Responsive and Visual Checklist
- [x] Consistent Zen Green color tokens across all new screens.
- [x] Navigation bar renders authorized role-based links only.
- [x] Status and Priority badges styled with readable contrast.
- [x] Dual discussion tabs (Public Comments vs Internal Notes) clearly distinguished.
- [x] Responsive layout verified across Desktop (1280px), Tablet (768px), and Mobile (375px).
- [x] Zero horizontal scrolling or clipped modals on smaller viewports.

---

## 5. Test Execution Commands

```bash
# 1. Server API Integration Tests
npm --prefix server run test

# 2. Client UI Component Tests
npm --prefix client run test

# 3. End-to-End Playwright Tests
npm run test:e2e
```
