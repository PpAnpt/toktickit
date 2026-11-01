# Lab 4 Test Plan and Traceability

This plan is written before implementation (Test DD) and is used for TDD: each test is written first (red), then the feature is built until it passes (green). IDs AC-01..AC-39 refer to `docs/lab-04/specification.md`. The **Final** column was `Planned` until the owning Pull Request was merged and is `Pass` now, with the evidence of section 5 (closed in the release issue #35).

## 1. Test Types and Locations
| Prefix | Type | Tooling | Location |
| :--- | :--- | :--- | :--- |
| UNIT | Unit (pure functions) | Vitest (server) | `server/tests/lab-04/*.unit.test.ts` |
| API / WF / DASH / SDASH / AUTHZ / ERR | API / integration, workflow, authorization | Vitest + Supertest, real PostgreSQL | `server/tests/lab-04/*.api.test.ts` |
| PERF | Performance smoke | Vitest + Supertest | `server/tests/lab-04/performance-smoke.api.test.ts` |
| MIG / SEED | Migration, restore-based recovery, seed | Vitest + Prisma against a scratch database | `server/tests/lab-04/migration.test.ts`, `seed.test.ts` |
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
| UNIT-01 | Unit | AC-04 | Action validation: required description/result, trimming, maximum lengths | Invalid fields reported by name; valid input trimmed | `server/tests/lab-04/action-validation.unit.test.ts` | Pass |
| UNIT-02 | Unit | AC-04 | Follow-up rule | Note required when `followUpRequired`; note discarded when not required | `server/tests/lab-04/action-validation.unit.test.ts` | Pass |
| UNIT-03 | Unit | AC-04 | `actionAt` bounds | More than 5 min in the future or before Ticket creation is rejected; defaults to now | `server/tests/lab-04/action-validation.unit.test.ts` | Pass |
| UNIT-04 | Unit | AC-10 | Transition matrix function for all 8x8 pairs | Exactly the permitted pairs are allowed | `server/tests/lab-04/transition-matrix.unit.test.ts` | Pass |
| UNIT-05 | Unit | AC-21 | Asia/Bangkok window start calculation, including around local midnight | `windowStart` is 00:00 Asia/Bangkok six days before today | `server/tests/lab-04/dashboard-window.unit.test.ts` | Pass |
| UNIT-06 | Unit | AC-18 | Active status set and effective priority helper | `itPriority ?? requestedPriority`; Active set equals BR-24 | `server/tests/lab-04/dashboard-window.unit.test.ts` | Pass |

### 2.2 Actions Taken API and Authorization
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| API-01 | API | AC-09 | List actions of a legacy Ticket | `200 { actions: [] }` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-02 | API | AC-09 | List ordering with several actions and equal times | `actionAt` desc then `id` desc; repeatable | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-03 | API | AC-01 | Create a valid Action Taken | `201`; saved under the correct Ticket with the authenticated user as performer | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-04 | API | AC-01 | Create with a client `performedById` | Ignored; performer is the token user | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-05 | API | AC-05 | Non-owner staff creates an action | Saved with that staff as performer; Ticket owner unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-06 | API | AC-04 | Missing description, missing result on a `Completed`/`Cancelled` action, over-length text | `400` with `details` naming each field; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-07 | API | AC-04 | Follow-up required without a note | `400` naming `followUpNote` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-08 | API | AC-04 | `actionAt` before Ticket creation, or in the future for a non-`Planned` action | `400` naming `actionAt`; a future `Planned` action is accepted | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-09 | API | AC-06 | Edit with current `expectedUpdatedAt` | `200`; fields changed; performer and `createdAt` unchanged; `updatedBy` set | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-10 | API | AC-06 | Edit with a stale `expectedUpdatedAt` | `409 STALE_UPDATE`; row unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-11 | API | AC-06 | Edit without `expectedUpdatedAt` | `400` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-12 | API | AC-06 | DELETE an action | `404` (no delete endpoint); row still exists | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-13 | API | AC-07 | Create and edit on `Closed` and `Cancelled` Tickets | `409 TICKET_TERMINAL` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-14 | API | AC-08 | Same `clientRequestId` sent twice with identical content, and once more with different whitespace and key order | Second and third responses `200 replayed` with the original record; exactly one row | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-15 | API | AC-08, AC-27 | Two parallel creates with the same `clientRequestId` | Exactly one row exists | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-16 | API | AC-01 | Create updates the Ticket `updatedAt` (BR-11) | Ticket `updatedAt` increases | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-17 | API | AC-01, AC-31 | Create without `assigneeId` | Assignee defaults to the creator; stored separately from the performer | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-18 | API | AC-31 | Create and reassign with an inactive user, a Requester, or an unknown id | `400` naming `assigneeId`; nothing changes | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-19 | API | AC-31 | An existing assignee becomes inactive, then an unrelated field is edited | Edit succeeds; starting or completing it before reassigning is rejected | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-20 | API | AC-32 | Valid action transitions (Planned to In Progress/Completed/Cancelled; In Progress to Completed/Cancelled) | `200`; new status stored | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-21 | API | AC-32 | Invalid action transitions (from `Completed`/`Cancelled`, create as `Cancelled`) | `400 INVALID_ACTION_TRANSITION`; unchanged | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-22 | API | AC-32 | Complete or cancel without a Result | `400` naming `result` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-23 | API | AC-33 | Cancel a Ticket that has `Planned`, `In Progress`, and `Completed` actions | Open actions become `Cancelled` with `AUTO_CANCELLED` revisions in the same transaction; the completed action is untouched | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-24 | API | AC-38 | Actions list with 45 actions, `page`/`limit`, `limit=500`, `page=0` | Correct slices, `total`, clamping (max 50), stable order, no overlap or gap across pages | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-25 | API | AC-40 | On a `Resolved` Ticket create `Planned`, `In Progress`, and `Completed` actions; then reopen the Ticket and create `Planned`; then try to resolve a Ticket that has an open action | `Planned`/`In Progress` on `Resolved` return `409 TICKET_RESOLVED` and save nothing; `Completed` is saved and the Ticket stays `Resolved`; `Planned` after reopen is accepted; the gate still blocks resolving with an open action | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-26 | API | AC-08 | Reuse a `clientRequestId` with a different description, then with a different staff user | `409 IDEMPOTENCY_KEY_REUSED` both times; no new row; the existing record is not returned | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| API-27 | API | AC-04 | POST and PATCH an Action with status `constructor`, `__proto__`, and `toString` | `400` with `details.status`; no Action and no revision written | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| AUTHZ-01 | Authorization | AC-03 | Requester lists actions of own Ticket | `200`, all fields visible | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| AUTHZ-02 | Authorization | AC-03 | Requester creates or edits an action | `403`; nothing saved | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| AUTHZ-03 | Authorization | AC-03 | Requester lists another Requester's Ticket actions | `404`, same as missing Ticket | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| AUTHZ-04 | Authorization | AC-03 | Action endpoints without a token | `401` | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |
| AUTHZ-05 | Authorization | AC-01 | Administrator creates and edits an action | Allowed | `server/tests/lab-04/actions-taken.api.test.ts` | Pass |

### 2.3 Ticket Workflow
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| WF-01 | Workflow | AC-10 | Every permitted transition as IT Staff and Administrator | `200` with the new status | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-02 | Workflow | AC-10 | Every non-permitted transition (including from `Closed` and `Cancelled`) | `400 Invalid status transition` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-03 | Authorization | AC-10 | Requester changes status | `403` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-04 | Workflow | AC-11 | Resolve a Ticket with no `Completed` action, and one that still has a `Planned`/`In Progress` action | `400 RESOLUTION_GATE_FAILED` with `reasons` `NO_COMPLETED_ACTION` / `OPEN_ACTIONS`; status unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-05 | Workflow | AC-11 | Resolve after completing an action and completing or cancelling all open ones | `200`; `resolvedAt` set | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-06 | Workflow | AC-12 | Requester indicates resolved | Status unchanged; `indicatedResolvedAt` set; two simultaneous indications give one `200` and the rest `409`; an indication waiting behind a staff write re-checks the locked Ticket (`400` once `Resolved`); the token comes from the locked row | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-07 | Workflow | AC-12 | Reopen a Resolved Ticket | `resolvedAt` and `indicatedResolvedAt` cleared; Requester may indicate again | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-08 | Workflow | AC-13 | Stale `expectedUpdatedAt` on status, owner, and priority | `409 STALE_UPDATE`; Ticket unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-09 | Workflow | AC-13 | Two concurrent different status changes | One succeeds, the other `409` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-10 | Workflow | AC-14 | Assign an inactive user, a Requester, or an unknown user as owner | `400`; owner unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-11 | Workflow | AC-20 | `status=Active` on the staff queue and My Tickets | Returns exactly the 5 active statuses; invalid values still `400` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-12 | Workflow | AC-13 | Status, owner, and priority PATCH without `expectedUpdatedAt`, and with a malformed value | `400` naming `expectedUpdatedAt`; Ticket unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-13 | Workflow | AC-13 | 10 parallel Action Taken edits (and 10 parallel status changes) carrying the same `expectedUpdatedAt` | Exactly one `200`, nine `409`; exactly one revision/event added; final row equals the winner's data | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-14 | Workflow | AC-13 | A write that fails the stale check inside the transaction | Rolled back: no change and no history row (atomic check and write) | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-16 | Regression | AC-25 | The Lab 3 status, owner, and priority tests, updated to send `expectedUpdatedAt` | All still pass with the same expected statuses and bodies apart from the new `updatedAt` | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |
| WF-15 | Workflow | AC-20 | `GET /api/tickets?recent=` with `updated`, `resolved`, an empty value, and invalid values (including `constructor`, `__proto__`, a repeated parameter) | Valid values filter and combine with `status`; empty means no filter; invalid value `400`; Lab 3 query validation and the Requester-only rule unchanged | `server/tests/lab-04/ticket-workflow.api.test.ts` | Pass |

### 2.4 Requester Dashboard
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| DASH-01 | Authorization | AC-16 | IT Staff and Administrator call the Requester dashboard | `403` with body `{ "error": "Forbidden" }`, no data | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-02 | Authorization | AC-16 | No token or revoked token | `401` | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-03 | API | AC-17 | Metrics equal independent database queries (open, waiting, recently updated) | Counts match | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-04 | API | AC-02, AC-22 | Two Requesters with different Tickets | Each response contains only that Requester's metrics and Tickets | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-05 | API | AC-19 | Requester with no Tickets | All metrics `0`; `attention` and `recentTickets` empty | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-06 | API | AC-21 | Tickets just inside and just outside the 7-day Asia/Bangkok window | Only inside Tickets counted | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-07 | API | AC-22 | Response shape and size with more than 5 matching Tickets | At most 5 items per list; no full collection | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-08 | API | AC-17 | `recentlyResolved` uses `resolvedAt` (not `updatedAt`) | Later edits do not move a Ticket into or out of the window | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-09 | API | AC-20 | Drill-down parity for `recentlyUpdated`: `GET /api/tickets?recent=updated` | List `total` and ids equal the card count and the Tickets counted | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |
| DASH-10 | API | AC-20 | Drill-down parity for `recentlyResolved` with a Ticket resolved then closed inside the window, one `Resolved` before the window, and one reopened | `recent=resolved` lists the closed-in-window Ticket and excludes the old and reopened ones; count equals the card | `server/tests/lab-04/requester-dashboard.api.test.ts` | Pass |

### 2.5 IT Staff Dashboard
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| SDASH-01 | Authorization | AC-16 | Requester calls the staff dashboard | `403`, no data | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| SDASH-02 | API | AC-18 | Unassigned, My Active, Urgent, Reopened, Resolved-awaiting-closure vs independent queries | Counts match | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| SDASH-03 | API | AC-18 | `byStatus` (8 keys) and `byPriority` (4 keys) | All keys present; counts match; Closed/Cancelled excluded from `byPriority` | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| SDASH-04 | API | AC-18 | `myRecentActions` | Only actions the current user performed or is assigned to, with status and assignee, newest first, max 5, description truncated | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| SDASH-05 | API | AC-18 | `userCounts` | Present for Administrator only | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| SDASH-06 | API | AC-19 | Empty database state | Every metric `0`; lists `[]`; no error | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| SDASH-07 | API | AC-22 | Shape and size | At most 5 items per list | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| SDASH-08 | API | AC-20 | Drill-down parity: queue with each card's filter | Queue `total` equals the metric | `server/tests/lab-04/staff-dashboard.api.test.ts` | Pass |
| ERR-01 | API | AC-26 | Forced database failure on dashboard, actions, and status endpoints | `500` with only a generic `error` message; no stack, SQL, table names, hosts or ids (database failure simulated on dashboards, Actions Taken list/create, history, status/owner/priority) | `server/tests/lab-04/safe-errors.api.test.ts` | Pass |
| PERF-01 | Performance | AC-30 | Requester and staff dashboards against the performance fixture (section 6) | p95 of 30 timed requests under 1 second; the fixture is generated in a scratch database `toktickit_perf` by SQL `generate_series` (seed `setseed(0.4242)`) inside the test and the results are written to `artifacts/lab-04/performance/summary.json` | `server/tests/lab-04/performance-smoke.api.test.ts` | Pass |
| PERF-02 | Performance | AC-30 | Actions Taken list (first page, `limit=20`) for the Ticket with 2,000 actions in the performance fixture | p95 of 30 timed requests under 1 second | `server/tests/lab-04/performance-smoke.api.test.ts` | Pass |

### 2.6 Migration and Seed
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| MIG-01 | Migration | AC-23 | Apply Labs 1 to 3 migrations, insert Lab 3 data, apply the Lab 4 migration | All Users, Tickets, Attachments, Comments, Notes preserved; the new tables, enums, and immutability trigger exist; `prisma migrate diff` is empty | `server/tests/lab-04/migration.test.ts` | Pass |
| MIG-02 | Migration | AC-23 | Rehearse the documented recovery: on a scratch database apply Labs 1 to 3 migrations and insert Lab 3 data, take `pg_dump -Fc`, apply the Lab 4 migration, then `pg_restore --exit-on-error` the dump into a separate clean recovery database | Recovery database has the Lab 3 data (row counts and ownership equal the pre-upgrade snapshot), none of the Lab 4 tables, enums, trigger, or `resolvedAt`, a `_prisma_migrations` history equal to the Lab 3 baseline, and `prisma migrate deploy` applies the Lab 4 migration to it cleanly again | `server/tests/lab-04/migration.test.ts` | Pass |
| MIG-03 | Migration | AC-23 | Backfill of `resolvedAt`; legacy Tickets list zero actions | `resolvedAt = updatedAt` for Resolved/Closed; others `NULL` | `server/tests/lab-04/migration.test.ts` | Pass |
| MIG-04 | Migration | AC-35 | On the test database, delete a Ticket that has an action, an Action Taken that has revisions, and a User referenced by an action; then run the documented `TRUNCATE` test cleanup; then run the same cleanup against a database whose name does not end `_test` | The three deletes fail with a foreign-key error and nothing changes (`onDelete: Restrict`, BR-40); the `TRUNCATE` cleanup empties the three Lab 4 tables on the `_test` database so fixtures can then be removed; the cleanup helper refuses to run on any other database | `server/tests/lab-04/migration.test.ts` | Pass |
| SEED-01 | Seed | AC-24 | Run the seed twice | No duplicate users, Tickets, or actions | `server/tests/lab-04/seed.test.ts` | Pass |
| SEED-02 | Seed | AC-24, AC-39 | Seed coverage | All Ticket statuses and priorities, owned and unowned Tickets, Tickets with 0/1/many actions, one Ticket whose actions have different assignees and all four action statuses, an action assigned to the inactive staff member, edited actions with revisions, Ticket events, non-zero and zero dashboard metrics | `server/tests/lab-04/seed.test.ts` | Pass |

### 2.7 UI Component
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UI-01 | UI | AC-03, AC-09 | Actions list renders all fields, newest first | Order and fields as specified | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-02 | UI | AC-19 | Empty list | "No actions have been recorded yet." (staff also sees the resolve hint) | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-03 | UI | AC-03 | Controls by role | Staff see Add and Edit; Requester sees neither | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-04 | UI | AC-04 | Validation messages | Each message appears under its field; summary receives focus | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-05 | UI | AC-04 | Follow-up checkbox | Note field appears and is required only when checked | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-06 | UI | AC-27 | Double click on Save | One request with one `clientRequestId`; button disabled while busy | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-07 | UI | AC-26 | `409 STALE_UPDATE` on edit | Stale banner with Reload; entered text kept | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-08 | UI | AC-26 | Network/500 error on create | Alert shown; entered text kept | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-09 | UI | AC-07 | `Closed`/`Cancelled` Ticket | Add and Edit hidden with an explanation | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-10 | UI | AC-15 | Status buttons for each status | Only permitted "Move to ..." buttons; none for terminal statuses | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-11 | UI | AC-15 | `RESOLUTION_GATE_FAILED` | Gate message names the reasons with a link to Actions Taken; status unchanged; the message clears once an action is recorded | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-12 | UI | AC-15 | Successful transition | Summary status badge refreshes; status message announced; the Resolved date appears once `resolvedAt` is set and disappears after a reopen; the Requester notice is hidden once the Ticket is Resolved, Closed, or Cancelled | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-13 | UI | AC-27 | Transition in flight | All status buttons disabled; one request | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-14 | UI | AC-26 | `409` on a transition | Conflict message with Reload; no status change shown; Reload keeps the screen mounted, so an unsaved Action draft survives, and a failed Reload keeps the message and says why | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-15 | UI | AC-18 | Staff dashboard cards and lists | Labels, values, recent Tickets, and My Recent Actions render | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-16 | UI | AC-20 | Staff drill-down links | Each card/row links to the queue filter in `api-spec.md` | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-17 | UI | AC-28 | Loading state | Skeletons with `aria-busy` and a "Loading dashboard" status; no numbers while loading, and Refresh hides the old numbers until the new ones arrive | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-18 | UI | AC-19 | All-zero data | Zeros shown; explicit empty sentences in lists | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-19 | UI | AC-26 | `403` and `500` | Forbidden message without counts; error with Retry | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-20 | UI | AC-18 | Administrator accounts strip | Shown only for Administrators | `client/src/tests/lab-04/StaffDashboard.test.tsx` | Pass |
| UI-21 | UI | AC-17 | Requester cards | Four labelled cards with values and "Last 7 days" sub-label | `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| UI-22 | UI | AC-19 | Attention and recent lists | Rows link to Ticket Detail; empty sentences when none | `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| UI-23 | UI | AC-20 | Requester drill-down links | Links match `api-spec.md`; quick actions present | `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| UI-24 | UI | AC-26 | Loading, `403`, `500` | Same feedback pattern as the staff dashboard | `client/src/tests/lab-04/RequesterDashboard.test.tsx` | Pass |
| UI-25 | UI | AC-29 | Navigation per role | Dashboard plus the role's entries in order; active entry has `aria-current`; landing is Dashboard; the brand returns home; a card opens My Tickets / the queue with its filters (request and controls); the menu opens them unfiltered; the other role's dashboard URL shows the forbidden state; a Ticket opened from the dashboard returns with Back to Dashboard; clicking Ticket Queue or My Tickets again while already on that page clears Dashboard filters, Search and Category; a /tickets/:id deep link opened before sign-in marks My Tickets / Ticket Queue and says Back to My Tickets / Back to Queue | `client/src/tests/lab-04/Navigation.test.tsx` | Pass |

### 2.8 UI Style, Responsive, and Accessibility
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| STY-01 | UI style | AC-28 | Follow-up badge | Contains the text "Follow-up needed" (with a flag symbol) in addition to colour | `client/src/tests/lab-04/ZenGreenStyle.test.tsx` | Pass |
| STY-02 | UI style | AC-28 | Attention card and gate/conflict messages | Text cue present; `role="alert"` on messages | `client/src/tests/lab-04/ZenGreenStyle.test.tsx` | Pass |
| STY-03 | UI style | AC-28 | Editable vs read-only fields | Different classes/attributes; Performed by is not editable | `client/src/tests/lab-04/ZenGreenStyle.test.tsx` | Pass |
| RSP-01 | Responsive | AC-28 | Dashboards at 1280px, 768px, 375px | No horizontal overflow, clipping, or overlap | `e2e/lab-04/responsive-accessibility.spec.ts` | Pass |
| RSP-02 | Responsive | AC-28 | Actions Taken area and Add/Edit form at three widths | No overflow; the form fits the mobile viewport | `e2e/lab-04/responsive-accessibility.spec.ts` | Pass |
| RSP-03 | Responsive | AC-28 | Status controls and stale/gate messages at three widths | Fully visible, buttons reachable | `e2e/lab-04/responsive-accessibility.spec.ts` | Pass |
| A11Y-01 | Accessibility | AC-28 | Keyboard only: open Add Action, fill, submit, edit | Entire flow operable; labels linked to inputs | `e2e/lab-04/responsive-accessibility.spec.ts` | Pass |
| A11Y-02 | Accessibility | AC-28 | Focus visibility and dialog behavior | Visible 2px #0B7A46 focus ring on Bootstrap buttons too; Escape closes the editor (asking first when text is unsaved) and focus returns to the opener; My Tickets cards open with Enter or Space | `e2e/lab-04/responsive-accessibility.spec.ts` | Pass |

### 2.9 End to End
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| E2E-01 | E2E | AC-01, AC-03 | Staff records an action; Requester opens the same Ticket | Action appears for the Requester read-only | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-02 | E2E | AC-06 | Staff A edits an action after staff B edited it | Conflict banner shown; A's text kept; reload shows B's version | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-03 | E2E | AC-04 | Submit follow-up without a note, then fix it | Error under the field; success after correction | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-04 | E2E | AC-05 | Two different staff members record actions on one Ticket | Both appear with their own performer; owner unchanged | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-05 | E2E | AC-27 | Double-click Add Action | Exactly one new action | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-06 | E2E | AC-11, AC-15 | Resolve a Ticket without an action, then add one and resolve | Blocked with gate message, then succeeds; summary updates | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| E2E-07 | E2E | AC-12 | Requester indicates resolved; staff reviews, resolves, closes | Status changes only by staff; indication is advisory | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| E2E-08 | E2E | AC-12, AC-13 | Staff reopens a Resolved Ticket; concurrent stale change | Reopen clears indication; stale change shows conflict | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |
| E2E-09 | E2E | AC-17, AC-20 | Requester dashboard values, drill-down to My Tickets for every card (including Recently Resolved with a resolved-then-closed Ticket) | Values match the Ticket list API and the seed (a Ticket resolved then closed inside the window is counted, an old one is not); every list total equals its card; a Requester with zero cards (Jennifer Anderson) sees zeros and explanations | `e2e/lab-04/dashboards.spec.ts` | Pass |
| E2E-10 | E2E | AC-18, AC-20 | Staff dashboard values and drill-down to the queue | Values match seed; queue totals match | `e2e/lab-04/dashboards.spec.ts` | Pass |
| E2E-11 | E2E | AC-18 | Administrator dashboard | Accounts strip shown; staff user does not see it | `e2e/lab-04/dashboards.spec.ts` | Pass |
| E2E-12 | E2E | AC-16, AC-29 | Role navigation, landing page, and direct URL to the other role's dashboard | Correct entries and landing; forbidden message without data | `e2e/lab-04/dashboards.spec.ts` | Pass |

### 2.10 Labs 1 to 3 Regression
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| REG-01 | Regression | AC-25 | All Lab 1 to Lab 3 server suites (authentication, tickets, attachments, comments, notes, queue, user management) | All pass | `server/tests/lab-01`, `lab-02`, `lab-03` | Pass |
| REG-02 | Regression | AC-25 | All existing client component suites | All pass | `client/src/tests`, `client/src/tests/lab-03` | Pass |
| REG-03 | Regression | AC-25 | Existing Playwright suites (authentication, staff ticket flow, user administration, Requester flows) | All pass | `e2e/lab-02`, `e2e/lab-03` | Pass |

### 2.11 Append-only History (server)
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UNIT-07 | Unit | AC-13 | Next concurrency token helper | `GREATEST(now, previous + 1 ms)`: two writes in the same millisecond still get different tokens | `server/tests/lab-04/concurrency-token.unit.test.ts` | Pass |
| HIST-01 | API | AC-34 | Create an action | One revision `CREATED`, `revisionNo` 1, `before` null, full `after` snapshot, correct actor | `server/tests/lab-04/history.api.test.ts` | Pass |
| HIST-02 | API | AC-34 | Staff A edits `result`, staff B edits it again, then the action is completed | Revisions 2, 3, 4 with actor, time, `changedFields`, before/after; the original and A's values can be reconstructed from the history | `server/tests/lab-04/history.api.test.ts` | Pass |
| HIST-03 | API | AC-34 | PATCH that changes nothing | `200`, no new revision, `updatedAt` unchanged | `server/tests/lab-04/history.api.test.ts` | Pass |
| HIST-04 | API | AC-36 | Status, owner, priority changes and a reopen | One Ticket event each with from, to, actor, and time | `server/tests/lab-04/history.api.test.ts` | Pass |
| HIST-05 | API | AC-36 | Events and revisions created in the same millisecond | Stable ascending order (time, then id / revisionNo), identical on repeated reads | `server/tests/lab-04/history.api.test.ts` | Pass |
| HIST-06 | Authorization | AC-35 | `PATCH`/`DELETE`/`POST` on the revisions and events routes | `404`/`405`; history unchanged | `server/tests/lab-04/history.api.test.ts` | Pass |
| HIST-07 | Migration | AC-35 | Direct SQL `UPDATE` and `DELETE` on `ActionTakenRevision` and `TicketEvent` | Database raises an error; rows unchanged | `server/tests/lab-04/history.api.test.ts` | Pass |
| HIST-08 | Authorization | AC-37 | Requester, IT Staff, Administrator, and no token call the history endpoints | Requester `403` with no data, staff/admin `200`, no token `401` | `server/tests/lab-04/history.api.test.ts` | Pass |
| HIST-09 | API | AC-34 | A stale or failing action write | No revision is left behind (change and history are in one transaction) | `server/tests/lab-04/history.api.test.ts` | Pass |
| HIST-10 | API | AC-38 | History lists (revisions and the Ticket events list) with more than one page | `total`, `page`, `limit`, clamping, no overlap or gap across pages | `server/tests/lab-04/history.api.test.ts` | Pass |

### 2.12 Assignment, Lifecycle, and History in the UI and E2E
| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| UI-26 | UI | AC-31 | Assignee select | Lists active IT Staff and Administrators only; an inactive current assignee is labelled "(inactive)" and not selectable; server rejection shows under the field | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-27 | UI | AC-32 | Lifecycle buttons and confirm panels | Buttons match the action status; Complete and Cancel require a Result; terminal actions show none | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-28 | UI | AC-37 | History views | Staff open a per-action history (read-only, Before/After labels, no edit/delete controls, paginated); Requester sees none | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-29 | UI | AC-38 | Pagination controls on the actions list and history | Previous/Next and "Showing x-y of N" work; state is announced | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-30 | UI | AC-33 | Cancelling a Ticket | Confirm panel warns that open actions will be cancelled; with unsaved Action text, `Cancel Ticket` and `Move to Closed` ask first (declining keeps the Ticket and the text) | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-31 | UI | AC-40 | Add Action on a `Resolved` Ticket | Status select offers Completed only with the hint "Reopen the Ticket to plan new work."; a server `409 TICKET_RESOLVED` is shown as a clear alert and the entered text is kept | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-32 | UI | AC-36, AC-37 | Ticket history timeline on the Staff Ticket Detail | Status, owner, and priority events oldest first, read-only, with "No history recorded before Lab 4." for older Tickets; a Requester sees none | `client/src/tests/lab-04/TicketWorkflow.test.tsx` | Pass |
| UI-38 | UI | AC-06, AC-15 | The Ticket becomes `Closed`/`Cancelled` (by this user or another) while an Action editor holds unsaved text | The editor and text stay visible with the notice "can no longer be saved"; Save is disabled; Close asks before discarding; with nothing typed the editor just goes away | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-39 | UI | AC-40 | A new-action draft set to `Planned` while the Ticket becomes `Resolved` | Status switches to `Completed` and the typed text is kept | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-33 | UI | AC-06 | Close, Edit/Reassign of another Action, or Add Action while the editor holds unsaved text | A confirm prompt appears; cancelling keeps the editor and text, confirming closes or switches; no prompt when nothing was changed | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-34 | UI | AC-06 | Conflict (`STALE_UPDATE`) on an Action that then moved to another page (21 Actions), and a failed reload | Reload latest keeps the editor and text, shows that the Action is on another page, and the next save uses the latest token; a failed reload keeps the text and the Reload button | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-35 | UI | AC-06, AC-38 | Change page of the Actions list while an editor is open | The editor and typed text stay; returning to the page shows the editor inline again | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-36 | UI | AC-06 | Conflict, Reload latest, current page answers without the Action while another page is still pending, then that request fails | The editor in the detached block keeps the conflict banner, the Reload latest button, a failure message and the typed text (asynchronous, deferred responses) | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| UI-37 | UI | AC-06, FR-14 | Save still pending while the page changes so the editor moves to the detached block | Save stays disabled ("Saving..."), a second submit sends nothing, and the original request finishes with "Action saved." | `client/src/tests/lab-04/ActionsTaken.test.tsx` | Pass |
| E2E-13 | E2E | AC-31, AC-32, AC-39 | Two staff members on one Ticket: plan an action for the other, start, complete, and cancel different actions | Different assignees and statuses all visible on one Ticket | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-14 | E2E | AC-34, AC-37 | Edit an action twice as two users, then open History as staff and as the Requester | Staff see ordered Before/After revisions; Requester sees no history | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-15 | E2E | AC-31 | Try to assign an action to the inactive staff member (via the UI and a direct API call) | Not selectable in the UI; API returns `400`; message shown | `e2e/lab-04/actions-taken-flow.spec.ts` | Pass |
| E2E-16 | E2E | AC-33 | Cancel a Ticket that has open actions | Open actions show as `Cancelled` with the automatic reason; completed ones unchanged | `e2e/lab-04/ticket-resolution.spec.ts` | Pass |

## 3. Acceptance Criterion Traceability
| AC | Tests |
| :--- | :--- |
| AC-01 | API-03, API-04, API-16, API-17, AUTHZ-05, E2E-01 |
| AC-02 | DASH-04 |
| AC-03 | AUTHZ-01, AUTHZ-02, AUTHZ-03, AUTHZ-04, UI-01, UI-03, E2E-01 |
| AC-04 | UNIT-01, UNIT-02, UNIT-03, API-06, API-07, API-08, API-27, UI-04, UI-05, E2E-03 |
| AC-05 | API-05, E2E-04 |
| AC-06 | API-09, API-10, API-11, API-12, UI-33, UI-34, UI-35, UI-36, UI-37, UI-38, E2E-02 |
| AC-07 | API-13, UI-09 |
| AC-08 | API-14, API-15, API-26 |
| AC-09 | API-01, API-02, UI-01 |
| AC-10 | UNIT-04, WF-01, WF-02, WF-03 |
| AC-11 | WF-04, WF-05, E2E-06 |
| AC-12 | WF-06, WF-07, E2E-07, E2E-08 |
| AC-13 | UNIT-07, WF-08, WF-09, WF-12, WF-13, WF-14, E2E-08 |
| AC-14 | WF-10 |
| AC-15 | UI-10, UI-11, UI-12, UI-38, E2E-06 |
| AC-16 | DASH-01, DASH-02, SDASH-01, E2E-12 |
| AC-17 | DASH-03, DASH-08, UI-21, E2E-09 |
| AC-18 | UNIT-06, SDASH-02, SDASH-03, SDASH-04, SDASH-05, UI-15, UI-20, E2E-10, E2E-11 |
| AC-19 | DASH-05, SDASH-06, UI-02, UI-18, UI-22 |
| AC-20 | WF-11, WF-15, DASH-09, DASH-10, SDASH-08, UI-16, UI-23, E2E-09, E2E-10 |
| AC-21 | UNIT-05, DASH-06 |
| AC-22 | DASH-04, DASH-07, SDASH-07 |
| AC-23 | MIG-01, MIG-02, MIG-03 |
| AC-24 | SEED-01, SEED-02 |
| AC-25 | WF-16, REG-01, REG-02, REG-03 |
| AC-26 | ERR-01, UI-07, UI-08, UI-14, UI-19, UI-24 |
| AC-27 | API-15, UI-06, UI-13, E2E-05 |
| AC-28 | UI-17, STY-01, STY-02, STY-03, RSP-01, RSP-02, RSP-03, A11Y-01, A11Y-02 |
| AC-29 | UI-25, E2E-12 |
| AC-30 | PERF-01, PERF-02 |
| AC-31 | API-17, API-18, API-19, UI-26, E2E-13, E2E-15 |
| AC-32 | API-20, API-21, API-22, UI-27, E2E-13 |
| AC-33 | API-23, UI-30, E2E-16 |
| AC-34 | HIST-01, HIST-02, HIST-03, HIST-09, E2E-14 |
| AC-35 | HIST-06, HIST-07, MIG-04 |
| AC-36 | HIST-04, HIST-05, UI-32 |
| AC-37 | HIST-08, UI-28, UI-32, E2E-14 |
| AC-38 | API-24, HIST-10, UI-29, UI-35 |
| AC-39 | SEED-02, E2E-13 |
| AC-40 | API-25, UI-31, UI-39, WF-04 |

Every AC-01..AC-40 maps to at least one planned test. AC-28 is also verified by the visual and accessibility checklist in `ui-spec.md` and the screenshots in `artifacts/lab-04/screenshots/`.

## 4. Issue Ownership
| Issue | Tests it must turn green |
| :--- | :--- |
| #31 Actions Taken | UNIT-01..03, UNIT-07, API-01..22, API-24..27, AUTHZ-01..05, HIST-01..03, HIST-06..10, MIG-01..04, SEED-01..02, UI-01..09, UI-26..29, UI-33..39, UI-31, E2E-01..05, E2E-13..15 |
| #32 Ticket workflow | UNIT-04, API-23, WF-01..14, WF-16, HIST-04..05, UI-10..14, UI-30, UI-32, E2E-06..08, E2E-16 |
| #33 Role dashboards | UNIT-05..06, WF-15, DASH-01..10, SDASH-01..08, UI-15..25, E2E-09..12 |
| #34 Final hardening | ERR-01, PERF-01..02, STY-01..03, RSP-01..03, A11Y-01..02, REG-01..03 |
| #35 Release | Final column updated with output from `main` |

API-23 (cancelling a Ticket cancels its open Actions Taken, BR-32, AC-33) is owned by #32: the behaviour is part of the Ticket status endpoint, so it is implemented and tested together with the other status transitions. The Actions Taken API in #31 already provides the `AUTO_CANCELLED` revision type and the `Cancelled` status it relies on.

## 5. Final Status Evidence
All three suites were run in full, with verbose output saved in `artifacts/lab-04/test-output/`, on the code of `lab4-staging` at merge commit `b4d34e6` (all five feature Pull Requests merged). The release Pull Request `lab4-staging` to `main` brings exactly this code to `main`; the same three commands are repeated on `main` after that merge (result recorded in the submission report).

| Suite | Command | Result | Full output |
| :--- | :--- | :--- | :--- |
| Server (unit, API/integration, authorization, workflow, migration, seed, safe errors, performance smoke, and the Lab 1 to 3 regression suites) | `npm --prefix server test` | **258 passed, 0 failed** (26 files) | `artifacts/lab-04/test-output/server.txt` |
| Client (UI component tests) | `npm --prefix client test` | **128 passed, 0 failed** (17 files) | `artifacts/lab-04/test-output/client.txt` |
| End to end (Playwright, Labs 2 to 4) | `npm run test:e2e` | **33 passed, 0 failed** | `artifacts/lab-04/test-output/e2e.txt` |

All runs used the isolated database `localdb_test` (the development database was never touched); the E2E run followed `npx tsx prisma/seed.ts` on that database. Type checks `tsc --noEmit` (server) and `tsc -b` (client) pass.

How the **Final** column was set: every Test ID of the plan was matched by name against the passing output, so a row is `Pass` only because a test carrying that ID ran and passed. 155 of the 158 IDs appear by name in the output; the other three, REG-01 to REG-03, are suite-level rows (the existing Lab 1 to 3 server, client and Playwright suites), which are `Pass` because those suites ran inside the three runs above without a failure. Performance numbers (PERF-01, PERF-02) are in `artifacts/lab-04/performance/summary.json`.

## 6. Performance Smoke Protocol (PERF-01, PERF-02, AC-30)
The measurement is defined so that anyone can repeat it and get comparable numbers.

- **Environment**: local machine with the project's `docker-compose.yml` PostgreSQL, the server started in test mode, nothing else heavy running. The test prints a header with OS, CPU model, RAM, Node version, and PostgreSQL version and saves it with the results.
- **Fixture**: generated by `server/tests/lab-04/helpers/perf-fixture.ts` into a separate database (`toktickit_perf`, never the development database) with a fixed random seed (`4242`) so every run has the same shape: 100 users (80 Requesters, 18 IT Staff, 2 Administrators); 5,000 Tickets across all statuses and priorities; 20,000 Actions Taken in all four statuses (one Ticket has 2,000); about 20,000 revisions and 10,000 Ticket events; the Requester used for measurement owns 60 Tickets.
- **Procedure**: log in once per role; for each measured endpoint send 3 warm-up requests, then 30 sequential timed requests (in-process Supertest, wall-clock with `performance.now()`); no caching layer is added.
- **Measured endpoints**: `GET /api/dashboard/requester`, `GET /api/dashboard/staff` (as IT Staff and as Administrator), `GET /api/tickets/:id/actions?limit=20` for the 2,000-action Ticket, and page 1 of the events and revisions history.
- **Summary and pass rule**: min, median, p95, and max are printed and written to `artifacts/lab-04/performance/summary.json`. A measurement passes when **p95 is under 1,000 ms**; the median is reported for context. A failure prints the fixture sizes and the slowest request so it can be diagnosed.
- **Re-run**: `npm --prefix server exec vitest run tests/lab-04/performance-smoke.api.test.ts` (the fixture is generated on demand and cleaned up afterwards).
