# Lab 4 Test Plan and Traceability

This plan is written before implementation (Test DD) and is used for TDD: each test is written first (red), then the feature is built until it passes (green). IDs AC-01..AC-30 refer to `docs/lab-04/specification.md`. The **Final** column is `Planned` until the owning Pull Request is merged, then `Pass` with evidence; the last update happens in the release issue (#35) using output from `main`.

## 1. Test Types and Locations
| Prefix | Type | Tooling | Location |
| :--- | :--- | :--- | :--- |
| UNIT | Unit (pure functions) | Vitest (server) | `server/tests/lab-04/*.unit.test.ts` |
| API / WF / DASH / SDASH / AUTHZ / ERR | API / integration, workflow, authorization | Vitest + Supertest, real PostgreSQL | `server/tests/lab-04/*.api.test.ts` |
| PERF | Performance smoke | Vitest + Supertest | `server/tests/lab-04/performance-smoke.api.test.ts` |
| MIG / SEED | Migration, rollback, seed | Vitest + Prisma against a scratch database | `server/tests/lab-04/migration.test.ts`, `seed.test.ts` |
| UI | UI component | Vitest + React Testing Library | `client/src/tests/lab-04/*.test.tsx` |
| STY | UI style | Vitest + React Testing Library | `client/src/tests/lab-04/ZenGreenStyle.test.tsx` |
| RSP / A11Y | Responsive and accessibility | Playwright (1280px, 768px, 375px) | `e2e/lab-04/responsive-accessibility.spec.ts` |
| E2E | End to end | Playwright | `e2e/lab-04/*.spec.ts` |
| REG | Labs 1 to 3 regression | Existing suites | `server/tests/lab-01..03`, `client/src/tests`, `e2e/lab-02`, `e2e/lab-03` |

Run commands: `npm --prefix server test`, `npm --prefix client test`, `npm run test:e2e`.

## 2. Test Cases

### 2.1 Unit
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-01 | Unit | AC-04 | Action validation: required description/result, trimming, maximum lengths | Invalid fields reported by name; valid input trimmed | `server/tests/lab-04/action-validation.unit.test.ts` | Planned |
| UNIT-02 | Unit | AC-04 | Follow-up rule | Note required when `followUpRequired`; note discarded when not required | `server/tests/lab-04/action-validation.unit.test.ts` | Planned |
| UNIT-03 | Unit | AC-04 | `actionAt` bounds | More than 5 min in the future or before Ticket creation is rejected; defaults to now | `server/tests/lab-04/action-validation.unit.test.ts` | Planned |
| UNIT-04 | Unit | AC-10 | Transition matrix function for all 8x8 pairs | Exactly the permitted pairs are allowed | `server/tests/lab-04/transition-matrix.unit.test.ts` | Planned |
| UNIT-05 | Unit | AC-21 | Asia/Bangkok window start calculation, including around local midnight | `windowStart` is 00:00 Asia/Bangkok six days before today | `server/tests/lab-04/dashboard-window.unit.test.ts` | Planned |
| UNIT-06 | Unit | AC-18 | Active status set and effective priority helper | `itPriority ?? requestedPriority`; Active set equals BR-24 | `server/tests/lab-04/dashboard-window.unit.test.ts` | Planned |

### 2.2 Actions Taken API and Authorization
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | API | AC-09 | List actions of a legacy Ticket | `200 { actions: [] }` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-02 | API | AC-09 | List ordering with several actions and equal times | `actionAt` desc then `id` desc; repeatable | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-03 | API | AC-01 | Create a valid Action Taken | `201`; saved under the correct Ticket with the authenticated user as performer | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-04 | API | AC-01 | Create with a client `performedById` | Ignored; performer is the token user | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-05 | API | AC-05 | Non-owner staff creates an action | Saved with that staff as performer; Ticket owner unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-06 | API | AC-04 | Missing description/result, over-length text | `400` with `details` naming each field; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-07 | API | AC-04 | Follow-up required without a note | `400` naming `followUpNote` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-08 | API | AC-04 | `actionAt` in the future or before Ticket creation | `400` naming `actionAt` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-09 | API | AC-06 | Edit with current `expectedUpdatedAt` | `200`; fields changed; performer and `createdAt` unchanged; `updatedBy` set | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-10 | API | AC-06 | Edit with a stale `expectedUpdatedAt` | `409 STALE_UPDATE`; row unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-11 | API | AC-06 | Edit without `expectedUpdatedAt` | `400` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-12 | API | AC-06 | DELETE an action | `404` (no delete endpoint); row still exists | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-13 | API | AC-07 | Create and edit on `Closed` and `Cancelled` Tickets | `409 TICKET_TERMINAL` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-14 | API | AC-08 | Same `clientRequestId` sent twice | Second response `200 replayed`; exactly one row | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-15 | API | AC-08, AC-27 | Two parallel creates with the same `clientRequestId` | Exactly one row exists | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| API-16 | API | AC-01 | Create updates the Ticket `updatedAt` (BR-11) | Ticket `updatedAt` increases | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTHZ-01 | Authorization | AC-03 | Requester lists actions of own Ticket | `200`, all fields visible | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTHZ-02 | Authorization | AC-03 | Requester creates or edits an action | `403`; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTHZ-03 | Authorization | AC-03 | Requester lists another Requester's Ticket actions | `404`, same as missing Ticket | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTHZ-04 | Authorization | AC-03 | Action endpoints without a token | `401` | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |
| AUTHZ-05 | Authorization | AC-01 | Administrator creates and edits an action | Allowed | `server/tests/lab-04/actions-taken.api.test.ts` | Planned |

### 2.3 Ticket Workflow
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| WF-01 | Workflow | AC-10 | Every permitted transition as IT Staff and Administrator | `200` with the new status | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-02 | Workflow | AC-10 | Every non-permitted transition (including from `Closed` and `Cancelled`) | `400 Invalid status transition` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-03 | Authorization | AC-10 | Requester changes status | `403` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-04 | Workflow | AC-11 | Resolve a Ticket with no Actions Taken | `400 RESOLUTION_REQUIRES_ACTION`; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-05 | Workflow | AC-11 | Resolve after recording an action | `200`; `resolvedAt` set | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-06 | Workflow | AC-12 | Requester indicates resolved | Status unchanged; `indicatedResolvedAt` set | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-07 | Workflow | AC-12 | Reopen a Resolved Ticket | `resolvedAt` and `indicatedResolvedAt` cleared; Requester may indicate again | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-08 | Workflow | AC-13 | Stale `expectedUpdatedAt` on status, owner, and priority | `409 STALE_UPDATE`; Ticket unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-09 | Workflow | AC-13 | Two concurrent different status changes | One succeeds, the other `409` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-10 | Workflow | AC-14 | Assign an inactive user, a Requester, or an unknown user as owner | `400`; owner unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-11 | Workflow | AC-20 | `status=Active` on the staff queue and My Tickets | Returns exactly the 5 active statuses; invalid values still `400` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |
| WF-12 | Regression | AC-25 | Status, owner, priority without `expectedUpdatedAt` | Lab 3 behavior preserved | `server/tests/lab-04/ticket-workflow.api.test.ts` | Planned |

### 2.4 Requester Dashboard
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DASH-01 | Authorization | AC-16 | IT Staff and Administrator call the Requester dashboard | `403`, no data | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| DASH-02 | Authorization | AC-16 | No token or revoked token | `401` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| DASH-03 | API | AC-17 | Metrics equal independent database queries (open, waiting, recently updated) | Counts match | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| DASH-04 | API | AC-02, AC-22 | Two Requesters with different Tickets | Each response contains only that Requester's metrics and Tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| DASH-05 | API | AC-19 | Requester with no Tickets | All metrics `0`; `attention` and `recentTickets` empty | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| DASH-06 | API | AC-21 | Tickets just inside and just outside the 7-day Asia/Bangkok window | Only inside Tickets counted | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| DASH-07 | API | AC-22 | Response shape and size with more than 5 matching Tickets | At most 5 items per list; no full collection | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |
| DASH-08 | API | AC-17 | `recentlyResolved` uses `resolvedAt` (not `updatedAt`) | Later edits do not move a Ticket into or out of the window | `server/tests/lab-04/requester-dashboard.api.test.ts` | Planned |

### 2.5 IT Staff Dashboard
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| SDASH-01 | Authorization | AC-16 | Requester calls the staff dashboard | `403`, no data | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-02 | API | AC-18 | Unassigned, My Active, Urgent, Reopened, Resolved-awaiting-closure vs independent queries | Counts match | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-03 | API | AC-18 | `byStatus` (8 keys) and `byPriority` (4 keys) | All keys present; counts match; Closed/Cancelled excluded from `byPriority` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-04 | API | AC-18 | `myRecentActions` | Only the current user's actions, newest first, max 5, description truncated | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-05 | API | AC-18 | `userCounts` | Present for Administrator only | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-06 | API | AC-19 | Empty database state | Every metric `0`; lists `[]`; no error | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-07 | API | AC-22 | Shape and size | At most 5 items per list | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| SDASH-08 | API | AC-20 | Drill-down parity: queue with each card's filter | Queue `total` equals the metric | `server/tests/lab-04/staff-dashboard.api.test.ts` | Planned |
| ERR-01 | API | AC-26 | Forced database failure on dashboard, actions, and status endpoints | `500` with a generic message; no stack, SQL, or ids | `server/tests/lab-04/safe-errors.api.test.ts` | Planned |
| PERF-01 | Performance | AC-30 | Both dashboards with the seeded database | Respond in under 1 second | `server/tests/lab-04/performance-smoke.api.test.ts` | Planned |
| PERF-02 | Performance | AC-30 | Actions Taken list for a Ticket with many actions | Responds in under 1 second | `server/tests/lab-04/performance-smoke.api.test.ts` | Planned |

### 2.6 Migration and Seed
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MIG-01 | Migration | AC-23 | Apply Labs 1 to 3 migrations, insert Lab 3 data, apply the Lab 4 migration | All Users, Tickets, Attachments, Comments, Notes preserved; `prisma migrate diff` is empty | `server/tests/lab-04/migration.test.ts` | Planned |
| MIG-02 | Migration | AC-23 | Rehearse the documented rollback | Table and column removed; Lab 3 data intact | `server/tests/lab-04/migration.test.ts` | Planned |
| MIG-03 | Migration | AC-23 | Backfill of `resolvedAt`; legacy Tickets list zero actions | `resolvedAt = updatedAt` for Resolved/Closed; others `NULL` | `server/tests/lab-04/migration.test.ts` | Planned |
| SEED-01 | Seed | AC-24 | Run the seed twice | No duplicate users, Tickets, or actions | `server/tests/lab-04/seed.test.ts` | Planned |
| SEED-02 | Seed | AC-24 | Seed coverage | All statuses and priorities, owned and unowned Tickets, Tickets with 0/1/many actions, non-zero and zero dashboard metrics | `server/tests/lab-04/seed.test.ts` | Planned |

### 2.7 UI Component
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UI-01 | UI | AC-03, AC-09 | Actions list renders all fields, newest first | Order and fields as specified | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-02 | UI | AC-19 | Empty list | "No actions have been recorded yet." (staff also sees the resolve hint) | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-03 | UI | AC-03 | Controls by role | Staff see Add and Edit; Requester sees neither | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-04 | UI | AC-04 | Validation messages | Each message appears under its field; summary receives focus | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-05 | UI | AC-04 | Follow-up checkbox | Note field appears and is required only when checked | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-06 | UI | AC-27 | Double click on Save | One request with one `clientRequestId`; button disabled while busy | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-07 | UI | AC-26 | `409 STALE_UPDATE` on edit | Stale banner with Reload; entered text kept | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-08 | UI | AC-26 | Network/500 error on create | Alert shown; entered text kept | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-09 | UI | AC-07 | `Closed`/`Cancelled` Ticket | Add and Edit hidden with an explanation | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Planned |
| UI-10 | UI | AC-15 | Status buttons for each status | Only permitted "Move to ..." buttons; none for terminal statuses | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-11 | UI | AC-15 | `RESOLUTION_REQUIRES_ACTION` | Gate message with "Add an action" link; status unchanged | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-12 | UI | AC-15 | Successful transition | Summary status badge refreshes; status message announced | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-13 | UI | AC-27 | Transition in flight | All status buttons disabled; one request | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-14 | UI | AC-26 | `409` on a transition | Conflict message with Reload; no status change shown | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Planned |
| UI-15 | UI | AC-18 | Staff dashboard cards and lists | Labels, values, recent Tickets, and My Recent Actions render | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-16 | UI | AC-20 | Staff drill-down links | Each card/row links to the queue filter in `api-spec.md` | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-17 | UI | AC-28 | Loading state | Skeletons with `aria-busy`; no stale numbers | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-18 | UI | AC-19 | All-zero data | Zeros shown; explicit empty sentences in lists | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-19 | UI | AC-26 | `403` and `500` | Forbidden message without counts; error with Retry | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-20 | UI | AC-18 | Administrator accounts strip | Shown only for Administrators | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Planned |
| UI-21 | UI | AC-17 | Requester cards | Four labelled cards with values and "Last 7 days" sub-label | `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-22 | UI | AC-19 | Attention and recent lists | Rows link to Ticket Detail; empty sentences when none | `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-23 | UI | AC-20 | Requester drill-down links | Links match `api-spec.md`; quick actions present | `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-24 | UI | AC-26 | Loading, `403`, `500` | Same feedback pattern as the staff dashboard | `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Planned |
| UI-25 | UI | AC-29 | Navigation per role | Dashboard plus the role's entries; active entry has `aria-current`; landing is Dashboard | `client/src/tests/lab-04/Navigation.test.tsx` | Planned |

### 2.8 UI Style, Responsive, and Accessibility
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| STY-01 | UI style | AC-28 | Follow-up badge | Contains the text "Follow-up needed" in addition to color | `client/src/tests/lab-04/ZenGreenStyle.test.tsx` | Planned |
| STY-02 | UI style | AC-28 | Attention card and gate/conflict messages | Text cue present; `role="alert"` on messages | `client/src/tests/lab-04/ZenGreenStyle.test.tsx` | Planned |
| STY-03 | UI style | AC-28 | Editable vs read-only fields | Different classes/attributes; Performed by is not editable | `client/src/tests/lab-04/ZenGreenStyle.test.tsx` | Planned |
| RSP-01 | Responsive | AC-28 | Dashboards at 1280px, 768px, 375px | No horizontal overflow, clipping, or overlap | `e2e/lab-04/responsive-accessibility.spec.ts` | Planned |
| RSP-02 | Responsive | AC-28 | Actions Taken area and Add/Edit form at three widths | No overflow; the form fits the mobile viewport | `e2e/lab-04/responsive-accessibility.spec.ts` | Planned |
| RSP-03 | Responsive | AC-28 | Status controls and stale/gate messages at three widths | Fully visible, buttons reachable | `e2e/lab-04/responsive-accessibility.spec.ts` | Planned |
| A11Y-01 | Accessibility | AC-28 | Keyboard only: open Add Action, fill, submit, edit | Entire flow operable; labels linked to inputs | `e2e/lab-04/responsive-accessibility.spec.ts` | Planned |
| A11Y-02 | Accessibility | AC-28 | Focus visibility and dialog behavior | Visible focus ring; Escape closes; focus returns to opener | `e2e/lab-04/responsive-accessibility.spec.ts` | Planned |

### 2.9 End to End
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| E2E-01 | E2E | AC-01, AC-03 | Staff records an action; Requester opens the same Ticket | Action appears for the Requester read-only | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-02 | E2E | AC-06 | Staff A edits an action after staff B edited it | Conflict banner shown; A's text kept; reload shows B's version | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-03 | E2E | AC-04 | Submit follow-up without a note, then fix it | Error under the field; success after correction | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-04 | E2E | AC-05 | Two different staff members record actions on one Ticket | Both appear with their own performer; owner unchanged | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-05 | E2E | AC-27 | Double-click Add Action | Exactly one new action | `e2e/lab-04/actions-taken-flow.spec.ts` | Planned |
| E2E-06 | E2E | AC-11, AC-15 | Resolve a Ticket without an action, then add one and resolve | Blocked with gate message, then succeeds; summary updates | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-07 | E2E | AC-12 | Requester indicates resolved; staff reviews, resolves, closes | Status changes only by staff; indication is advisory | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-08 | E2E | AC-12, AC-13 | Staff reopens a Resolved Ticket; concurrent stale change | Reopen clears indication; stale change shows conflict | `e2e/lab-04/ticket-resolution.spec.ts` | Planned |
| E2E-09 | E2E | AC-17, AC-20 | Requester dashboard values, drill-down to My Tickets | Values match seed; list counts match for filtered cards | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-10 | E2E | AC-18, AC-20 | Staff dashboard values and drill-down to the queue | Values match seed; queue totals match | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-11 | E2E | AC-18 | Administrator dashboard | Accounts strip shown; staff user does not see it | `e2e/lab-04/dashboards.spec.ts` | Planned |
| E2E-12 | E2E | AC-16, AC-29 | Role navigation, landing page, and direct URL to the other role's dashboard | Correct entries and landing; forbidden message without data | `e2e/lab-04/dashboards.spec.ts` | Planned |

### 2.10 Labs 1 to 3 Regression
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| REG-01 | Regression | AC-25 | All Lab 1 to Lab 3 server suites (authentication, tickets, attachments, comments, notes, queue, user management) | All pass | `server/tests/lab-01`, `lab-02`, `lab-03` | Planned |
| REG-02 | Regression | AC-25 | All existing client component suites | All pass | `client/src/tests`, `client/src/tests/lab-03` | Planned |
| REG-03 | Regression | AC-25 | Existing Playwright suites (authentication, staff ticket flow, user administration, Requester flows) | All pass | `e2e/lab-02`, `e2e/lab-03` | Planned |

## 3. Acceptance Criterion Traceability
| AC | Tests |
| :--- | :--- |
| AC-01 | API-03, API-04, API-16, AUTHZ-05, E2E-01 |
| AC-02 | DASH-04 |
| AC-03 | AUTHZ-01, AUTHZ-02, AUTHZ-03, AUTHZ-04, UI-01, UI-03, E2E-01 |
| AC-04 | UNIT-01, UNIT-02, UNIT-03, API-06, API-07, API-08, UI-04, UI-05, E2E-03 |
| AC-05 | API-05, E2E-04 |
| AC-06 | API-09, API-10, API-11, API-12, E2E-02 |
| AC-07 | API-13, UI-09 |
| AC-08 | API-14, API-15 |
| AC-09 | API-01, API-02, UI-01 |
| AC-10 | UNIT-04, WF-01, WF-02, WF-03 |
| AC-11 | WF-04, WF-05, E2E-06 |
| AC-12 | WF-06, WF-07, E2E-07, E2E-08 |
| AC-13 | WF-08, WF-09, E2E-08 |
| AC-14 | WF-10 |
| AC-15 | UI-10, UI-11, UI-12, E2E-06 |
| AC-16 | DASH-01, DASH-02, SDASH-01, E2E-12 |
| AC-17 | DASH-03, DASH-08, UI-21, E2E-09 |
| AC-18 | UNIT-06, SDASH-02, SDASH-03, SDASH-04, SDASH-05, UI-15, UI-20, E2E-10, E2E-11 |
| AC-19 | DASH-05, SDASH-06, UI-02, UI-18, UI-22 |
| AC-20 | WF-11, SDASH-08, UI-16, UI-23, E2E-09, E2E-10 |
| AC-21 | UNIT-05, DASH-06 |
| AC-22 | DASH-04, DASH-07, SDASH-07 |
| AC-23 | MIG-01, MIG-02, MIG-03 |
| AC-24 | SEED-01, SEED-02 |
| AC-25 | WF-12, REG-01, REG-02, REG-03 |
| AC-26 | ERR-01, UI-07, UI-08, UI-14, UI-19, UI-24 |
| AC-27 | API-15, UI-06, UI-13, E2E-05 |
| AC-28 | UI-17, STY-01, STY-02, STY-03, RSP-01, RSP-02, RSP-03, A11Y-01, A11Y-02 |
| AC-29 | UI-25, E2E-12 |
| AC-30 | PERF-01, PERF-02 |

Every AC-01..AC-30 maps to at least one planned test. AC-28 is also verified by the visual and accessibility checklist in `ui-spec.md` and the screenshots in `artifacts/lab-04/screenshots/`.

## 4. Issue Ownership
| Issue | Tests it must turn green |
| :--- | :--- |
| #31 Actions Taken | UNIT-01..03, API-01..16, AUTHZ-01..05, MIG-01..03, SEED-01..02, UI-01..09, E2E-01..05 |
| #32 Ticket workflow | UNIT-04, WF-01..12, UI-10..14, E2E-06..08 |
| #33 Role dashboards | UNIT-05..06, DASH-01..08, SDASH-01..08, UI-15..25, E2E-09..12 |
| #34 Final hardening | ERR-01, PERF-01..02, STY-01..03, RSP-01..03, A11Y-01..02, REG-01..03 |
| #35 Release | Final column updated with output from `main` |

## 5. Final Status Evidence
Completed in issue #35: this table's **Final** column is changed to `Pass` using the complete passing output of `npm --prefix server test`, `npm --prefix client test`, and `npm run test:e2e` run on `main`.
