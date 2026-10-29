# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal
Complete the core TokTickIT service-desk workflow: IT Staff and Administrators record Actions Taken under each Ticket, the Ticket lifecycle is enforced end to end (including a resolution gate and stale-update protection), Requesters and IT Staff get concise role-based dashboards that link to the detailed screens, and the whole application from Labs 1 to 3 is hardened, responsive, accessible, and consistent under the Zen Green design language.

## 2. Stakeholder Request Interpretation
The service desk can receive Tickets and communicate with Requesters, but cannot yet record the real work. Each Ticket needs a list of Actions Taken (what was done, when, by whom, with what result, and whether follow-up is needed). The primary Ticket Owner still coordinates the Ticket, but any IT Staff member may record an action. A Requester may say the problem looks fixed, yet only IT Staff formally resolve the Ticket. Dashboards must stay short: they summarize and send the user to the existing Ticket Queue or My Tickets screens. Finally, every earlier feature must keep working and look like one product.

## 3. Scope

### Included
- Actions Taken: data model, migration, seed, REST API, authorization, Ticket Detail UI (list, create, view/edit).
- Final Ticket workflow: transition matrix, resolution gate, `resolvedAt` tracking, stale-update (conflict) handling.
- Requester Dashboard and IT Staff Dashboard (Administrators reuse the staff dashboard plus user-account counts) with backend-calculated metrics and drill-down links.
- Role navigation for Dashboard, `status=Active` queue filter used by drill-down.
- Regression, accessibility, responsive, error-handling, and double-submit hardening; README and release evidence.

### Explicitly Excluded
- SLA clocks, escalation, on-call scheduling, breach notifications.
- Email, SMS, LINE, push, or any external notification service.
- Inventory, spare parts, purchasing, cost accounting, time-sheets, payroll, labor cost.
- Multi-level approvals and electronic signatures.
- Advanced BI, custom report builders, export warehouses.
- Multi-tenant organizations and production-scale cloud operation.
- Deleting an Action Taken, file upload on Actions Taken (only free-text Attachment Notes), and any feature not listed above.

## 4. Functional Requirements
- **FR-01**: IT Staff and Administrators can create an Action Taken on any non-terminal Ticket.
- **FR-02**: IT Staff and Administrators can edit an existing Action Taken on a non-terminal Ticket.
- **FR-03**: Each Action Taken records Action Date/Time, Action Description, Result, Performed by (set by the system), Follow-Up Required?, Follow-up Note, and Attachment Notes.
- **FR-04**: Requesters can view all Actions Taken of their own Tickets, read-only. They cannot create or edit them.
- **FR-05**: The Ticket Detail screen for IT Staff shows an Actions Taken area with a list, a create mode, and a view/edit mode.
- **FR-06**: The system enforces the final Ticket status transition matrix on the server and rejects every other transition.
- **FR-07**: The system refuses to move a Ticket to `Resolved` unless it has at least one Action Taken (resolution gate).
- **FR-08**: A Requester's "appears resolved" indication stays advisory and never changes the status.
- **FR-09**: Workflow writes (status, owner, priority, Action Taken edit) detect stale updates and return a conflict instead of silently overwriting.
- **FR-10**: The system provides a Requester Dashboard with metrics for the signed-in Requester's own Tickets only.
- **FR-11**: The system provides an IT Staff Dashboard (also for Administrators) with operational metrics, breakdowns, recent Tickets, and the current user's recent Actions Taken.
- **FR-12**: Every dashboard card has a backend-defined query, an empty state, and a drill-down link to an existing detailed screen.
- **FR-13**: Each role gets a Dashboard navigation entry and lands on it after login.
- **FR-14**: Repeated clicks or network retries must not create duplicate Actions Taken or duplicate transitions.
- **FR-15**: All Lab 1 to Lab 3 behavior (authentication, role navigation, ownership, comments, notes, attachments, user management) continues to work.
- **FR-16**: Loading, validation, success, empty, forbidden, conflict, not-found, and safe API-failure feedback is consistent across screens, and forms keep entered data after a recoverable failure.

## 5. Business Rules
Lab 3 rules (authentication, ownership, password, non-disclosure 404, queue validation, administrator safety) stay in force and are cited as `L3-BR-nn` when referenced.

### Actions Taken Rules
- **BR-01**: An Action Taken belongs to exactly one Ticket; a Ticket may have zero, one, or many Actions Taken.
- **BR-02**: The Ticket Owner coordinates the Ticket, but an Action Taken may be recorded by any active IT Staff or Administrator, not only the owner. Recording an action never changes the owner.
- **BR-03**: *Performed by* is always the authenticated user who created the action. Any `performedById` sent by the client is ignored. Editing never changes *Performed by*; the editor is stored as `updatedById`.
- **BR-04**: *Action Date/Time* (`actionAt`) is supplied by the user and defaults to the current time. It must not be more than 5 minutes in the future and must not be earlier than the Ticket's creation time. *Created at* is set by the server and cannot be changed.
- **BR-05**: *Action Description* and *Result* are required, trimmed, non-empty plain text. Maximum lengths: description 2,000, result 1,000, follow-up note 1,000, attachment notes 500 characters. Text is rendered as text, never as HTML.
- **BR-06**: *Follow-Up Required?* is a boolean (default `false`). *Follow-up Note* is required (non-empty after trim) when it is `true`; when it is `false` the note is stored as empty/null.
- **BR-07**: *Attachment Notes* is optional free text describing which file or image to look for. It does not upload files.
- **BR-08**: Actions Taken cannot be deleted. Editing is allowed for IT Staff and Administrators while the Ticket is not `Closed` or `Cancelled`; create and edit on those Tickets return 409.
- **BR-09**: Lists are ordered by `actionAt` descending, then `id` descending, so the order is stable.
- **BR-10**: Requesters see every field of every Action Taken on their own Tickets, so private details belong in Internal Notes, not in Actions Taken. A Requester asking for another Requester's Ticket gets the same 404 as a missing Ticket (L3-BR-25).
- **BR-11**: Creating or editing an Action Taken updates the Ticket's `updatedAt` in the same transaction so "recently updated" reflects real work.
- **BR-12**: Creating an Action Taken does not change the Ticket status; status changes remain explicit.
- **BR-13**: A create request may carry a `clientRequestId` (UUID). A repeated request with the same id for the same Ticket returns the existing record with 200 instead of creating a second one.

### Status, Resolution, and Conflict Rules
- **BR-14**: The statuses are `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`. Only IT Staff and Administrators change status; Requesters get 403.
- **BR-15**: Permitted transitions are exactly those in the matrix below; anything else returns 400.
- **BR-16** (resolution gate): A transition to `Resolved` requires at least one Action Taken on the Ticket; otherwise 400 with code `RESOLUTION_REQUIRES_ACTION`. The gate is enforced on the server whatever the client sends.
- **BR-17**: Entering `Resolved` sets `resolvedAt` to the current time. Moving to `Reopened` clears `resolvedAt` and `indicatedResolvedAt` so the Requester can indicate again. `Closed` keeps the existing `resolvedAt`.
- **BR-18**: The Requester's "appears resolved" indication (L3-BR-14) only sets `indicatedResolvedAt`; it never changes the status.
- **BR-19** (stale update): Workflow writes accept `expectedUpdatedAt` (the Ticket's `updatedAt` the client last saw, or the Action's `updatedAt` for action edits). If it differs from the stored value the server returns 409 with the current `updatedAt` and changes nothing. It is required for Action Taken edits and optional for ticket status/owner/priority (omitted keeps the Lab 3 contract); the client always sends it.
- **BR-20**: Independently of `expectedUpdatedAt`, a status change is applied only if the stored status still equals the status the server validated against (compare-and-set), so two staff members racing on the same Ticket cannot both succeed; the loser gets 409.
- **BR-21**: Only active IT Staff or Administrators can be assigned as owner; an inactive or non-staff assignee is rejected with 400 (L3-BR-09).

### Dashboard Rules
- **BR-22**: All dashboard numbers are computed by the backend from the database; the client never counts. Endpoints return counts and at most 5 recent Tickets or actions, never full collections.
- **BR-23**: Time windows use the Asia/Bangkok time zone (UTC+7, no DST). "Last 7 days" means from 00:00 Asia/Bangkok six days ago up to the request time (7 calendar days including today).
- **BR-24**: "Active" Tickets are `New`, `Open`, `In Progress`, `Waiting for Requester`, `Reopened`. `Resolved`, `Closed`, and `Cancelled` are not active.
- **BR-25**: The Requester Dashboard only uses Tickets whose `requesterId` is the authenticated user. IT Staff and Administrators are refused (403).
- **BR-26**: The Staff Dashboard is available to IT Staff and Administrators; Requesters get 403. Only the Administrator response includes `userCounts`.
- **BR-27**: Legacy Tickets (created before Lab 4) have zero Actions Taken and are counted like any other Ticket. For legacy `Resolved`/`Closed` Tickets `resolvedAt` is backfilled from `updatedAt` (best available evidence).
- **BR-28**: The staff queue and My Tickets accept `status=Active` so a dashboard card and its drill-down list show the same count.

### Role Authorization Matrix (new and changed operations)
| Operation | Requester | IT Staff | Administrator | Notes |
| :--- | :---: | :---: | :---: | :--- |
| List Actions Taken of a Ticket | Allow (own only; others 404) | Allow | Allow | Read-only for Requester |
| Create Action Taken | **403** | Allow | Allow | Ticket not Closed/Cancelled |
| Edit Action Taken | **403** | Allow | Allow | Needs `expectedUpdatedAt` |
| Delete Action Taken | n/a | n/a | n/a | Not supported |
| Update Ticket status | **403** | Allow | Allow | Matrix + resolution gate |
| Requester Dashboard | Allow (own data) | **403** | **403** | |
| Staff Dashboard | **403** | Allow | Allow (+ `userCounts`) | |

### Ticket Status Transition Matrix (final)
| Current Status | Permitted Next Statuses | Roles | Extra rule |
| :--- | :--- | :--- | :--- |
| **New** | `Open`, `Cancelled` | IT Staff, Administrator | Claiming moves New to Open (Lab 3) |
| **Open** | `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled` | IT Staff, Administrator | `Resolved` needs the gate (BR-16) |
| **In Progress** | `Waiting for Requester`, `Resolved`, `Cancelled` | IT Staff, Administrator | Gate for `Resolved` |
| **Waiting for Requester** | `In Progress`, `Resolved`, `Cancelled` | IT Staff, Administrator | Gate for `Resolved` |
| **Resolved** | `Closed`, `Reopened` | IT Staff, Administrator | `Reopened` clears `resolvedAt` and `indicatedResolvedAt` |
| **Reopened** | `In Progress`, `Resolved`, `Cancelled` | IT Staff, Administrator | Gate for `Resolved` |
| **Closed** | none | n/a | Terminal |
| **Cancelled** | none | n/a | Terminal |

## 6. UI Specification Summary
Full detail is in `docs/lab-04/ui-spec.md`.
- **Design language**: Zen Green (unchanged from Labs 2 and 3). New screens reuse the existing cards, badges, buttons, tables, tabs, loading, empty, and error patterns.
- **Navigation**: Requester: Dashboard, Create Ticket, My Tickets. IT Staff: Dashboard, Ticket Queue. Administrator: Dashboard, Ticket Queue, User Management. The active page is clearly marked, and the user lands on Dashboard after login.
- **Requester Dashboard**: metric cards (Open Tickets, Waiting for You, Recently Updated, Recently Resolved), a short "needs your attention" list, recent Tickets, and quick actions Create Ticket and View My Tickets.
- **IT Staff Dashboard**: welcome line, metric cards (Unassigned, My Active Tickets, Urgent, Reopened, Resolved awaiting closure), status and priority breakdowns, recent Tickets, and My Recent Actions. Administrators also see a compact user-account count strip.
- **Actions Taken on Ticket Detail**: a section listing actions (newest first) with performer, time, result, and a "Follow-up" badge that uses text as well as color. IT Staff get "Add Action" (create mode) and "Edit" (edit mode) in an accessible form with inline validation under each field. Requesters see the same list without controls.
- **Status controls**: show only the transitions permitted for the current status; after a successful change the Ticket summary status refreshes. A blocked resolution shows the gate message next to the control; a conflict shows a "Ticket changed, reload" message that keeps the user's input.
- **States**: every dashboard card and list has loading, empty, error, and forbidden feedback.
- **Responsive and accessibility**: same rules as Labs 2 and 3 (Desktop >= 992px, Tablet 768-991px, Mobile < 768px; no horizontal scroll, visible focus, keyboard operation, semantic labels, non-color status cues).

## 7. Data Changes

### 7.1 New model `ActionTaken`
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | Int PK | autoincrement |
| `ticketId` | Int FK -> `Ticket(id)` | `onDelete: Cascade` |
| `performedById` | Int FK -> `User(id)` | set from token, never changed |
| `updatedById` | Int? FK -> `User(id)` | last editor |
| `actionAt` | DateTime | user-supplied, BR-04 |
| `description` | String (Text) | required |
| `result` | String (Text) | required |
| `followUpRequired` | Boolean | default `false` |
| `followUpNote` | String? | required when `followUpRequired` |
| `attachmentNotes` | String? | optional |
| `clientRequestId` | String? | unique per Ticket (`@@unique([ticketId, clientRequestId])`) |
| `createdAt` / `updatedAt` | DateTime | `updatedAt` doubles as the concurrency token |

Indexes: `(ticketId, actionAt)` for the list, `performedById` for "My Recent Actions".

### 7.2 Changed model `Ticket`
- New nullable `resolvedAt DateTime?`; relation `actionsTaken ActionTaken[]`.
- New indexes `(status, updatedAt)` for dashboard recency queries and `(requesterId, status)` for the Requester Dashboard.
- `User` gains the back-relations `actionsPerformed` and `actionsEdited`.

### 7.3 Design decisions (justification)
1. **Separate `ActionTaken` table instead of a JSON/text column on `Ticket`.** Actions are many per Ticket, are listed, edited, and aggregated by performer (My Recent Actions), and need per-row timestamps and concurrency control. A relational table keeps them queryable, indexable, and authorizable per row; a JSON column would block those queries and make partial updates racy.
2. **`updatedAt` as the optimistic-concurrency token instead of a separate version counter.** Prisma already maintains `@updatedAt` on every write, it is returned to the client for display, and comparing it needs no extra column or migration. The cost is millisecond precision, which is sufficient for human-driven edits.
3. **Explicit `resolvedAt` instead of deriving "recently resolved" from `updatedAt`.** `updatedAt` also changes on later actions, owner changes, and priority changes, so it cannot say when a Ticket was resolved. A dedicated timestamp makes the "Recently Resolved" metric correct and cheap, and Reopen can clear it.
4. **`clientRequestId` idempotency key** instead of a time-window de-duplication heuristic: a retry of the exact same request returns the original row, while two genuinely identical actions entered separately are both kept.

### 7.4 Migration and backfill
- One additive migration `server/prisma/migrations/<timestamp>_lab4_actions_taken/migration.sql`: creates `ActionTaken`, adds `Ticket.resolvedAt`, adds indexes. No existing column is dropped or altered, so every Lab 3 User, Ticket, Attachment, Public Comment, and Internal Note stays valid.
- **Backfill**: `UPDATE "Ticket" SET "resolvedAt" = "updatedAt" WHERE status IN ('Resolved','Closed')`. Tickets in other statuses keep `resolvedAt = NULL`.
- **Legacy Tickets** have no Actions Taken: the list is empty, dashboards count them normally, and a legacy Ticket in an active status needs one new action before it can be resolved (BR-16).
- **Verification**: apply Labs 1 to 3 migrations to an empty database, insert Lab 3 data, apply the Lab 4 migration, confirm row counts and ownership are unchanged and `prisma migrate diff` against `schema.prisma` is empty (test MIG-01).
- **Rollback / recovery**: the migration is additive, so recovery is `DROP TABLE "ActionTaken"` plus `ALTER TABLE "Ticket" DROP COLUMN "resolvedAt"` and `prisma migrate resolve --rolled-back <name>`; take a `pg_dump` before applying. The rollback script is rehearsed in MIG-02.

### 7.5 Seed
Idempotent (`npx prisma db seed`, safe to re-run): users upserted by email (Lab 3 accounts unchanged), tickets created only if the ticket number is missing, actions created only if a seed `clientRequestId` is missing. It covers every status and priority, owned and unowned Tickets, Tickets with 0, 1, and several Actions Taken (by different staff members), a Ticket with a follow-up action, a `Reopened` and a recently `Resolved` Ticket, and enough variety for both non-zero and zero dashboard metrics (for example the Requester Emily Watson and the Administrator keep zero in some cards).

## 8. API Contract Summary
Full shapes and status codes are in `docs/lab-04/api-spec.md`. Status codes: 200/201 success, 400 validation or invalid transition, 401 not authenticated, 403 role not permitted, 404 missing or not visible, 409 stale update or terminal Ticket, 500 safe generic message.
- `GET /api/tickets/:id/actions`: list (owner Requester, IT Staff, Administrator).
- `POST /api/staff/tickets/:id/actions`: create (IT Staff, Administrator).
- `PATCH /api/staff/tickets/:id/actions/:actionId`: edit with `expectedUpdatedAt`.
- `PATCH /api/staff/tickets/:id/status|owner|priority`: now accept optional `expectedUpdatedAt`; status adds the resolution gate and compare-and-set.
- `GET /api/dashboard/requester`: Requester only.
- `GET /api/dashboard/staff`: IT Staff and Administrator.
- `GET /api/staff/tickets` and `GET /api/tickets`: accept `status=Active`.
- All Lab 2 and Lab 3 endpoints are unchanged otherwise; `GET /api/health` stays.

## 9. Acceptance Criteria

### Actions Taken
- **AC-01**: Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated user as *Performed by*, and a client-sent `performedById` is ignored.
- **AC-02**: Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned.
- **AC-03**: Given a Requester, when they list Actions Taken of their own Ticket, then all actions are returned read-only; when they try to create or edit, then 403; for another Requester's Ticket, then 404.
- **AC-04**: Given invalid input (missing description or result, follow-up required without a note, over-length text, future or pre-creation `actionAt`), when creating or editing, then 400 names the invalid field and nothing is saved.
- **AC-05**: Given a Ticket owned by staff member A, when staff member B creates an action, then it is saved with B as performer and the owner stays A.
- **AC-06**: Given an existing action, when staff edits it with the current `expectedUpdatedAt`, then the changes are saved, *Performed by* and *Created at* are unchanged, and `updatedById` is the editor; with a stale `expectedUpdatedAt`, then 409 and no change; a DELETE request is not supported.
- **AC-07**: Given a `Closed` or `Cancelled` Ticket, when creating or editing an action, then 409.
- **AC-08**: Given two create requests with the same `clientRequestId` for one Ticket, then exactly one action exists and the second response returns the original with 200.
- **AC-09**: Given several actions on a Ticket, when listed, then they are ordered by `actionAt` descending then `id` descending, repeatably.

### Ticket Workflow
- **AC-10**: Given each status, when staff request each target status, then exactly the pairs in the transition matrix succeed and all others return 400; a Requester gets 403.
- **AC-11**: Given a Ticket with no Actions Taken, when staff move it to `Resolved`, then 400 `RESOLUTION_REQUIRES_ACTION`; given at least one action, then 200 and `resolvedAt` is set.
- **AC-12**: Given a Requester who indicated "appears resolved", then the status is unchanged; when staff later reopen the Ticket, then `resolvedAt` and `indicatedResolvedAt` are cleared.
- **AC-13**: Given a stale `expectedUpdatedAt` or a concurrent status change, when status, owner, or priority is updated, then 409 and the stored Ticket is unchanged.
- **AC-14**: Given an inactive or non-staff user as assignee, when assigning the owner, then 400.
- **AC-15**: Given the Ticket Detail screen, then only permitted transitions are offered, a blocked resolution shows the gate message, and the summary status refreshes after a successful change.

### Dashboards
- **AC-16**: Given a Requester, when requesting the staff dashboard, or given staff, when requesting the Requester dashboard, then 403.
- **AC-17**: Given seeded data, when the Requester dashboard is retrieved, then Open, Waiting for You, Recently Updated, and Recently Resolved equal the counts from an independent database query (BR-23, BR-24).
- **AC-18**: Given seeded data, when the staff dashboard is retrieved, then Unassigned, My Active, Urgent, Reopened, Resolved-awaiting-closure, the status and priority breakdowns, and My Recent Actions equal independent database queries; only the Administrator response contains `userCounts`.
- **AC-19**: Given a user with no matching records, then every metric is `0`, every list is empty, and the UI shows an explicit empty message.
- **AC-20**: Given a dashboard card with a count N, when the user follows its drill-down link, then the target list opens pre-filtered and shows N matching Tickets (using `status=Active` where defined).
- **AC-21**: Given Tickets updated just inside and just outside the 7-day Asia/Bangkok boundary, then only the inside Tickets are counted as recent.
- **AC-22**: Given any dashboard response, then it contains counts and at most 5 items per list and no data of other Requesters.

### Data, Hardening, UI
- **AC-23**: Given a Lab 3 database, when the Lab 4 migration runs, then all Users, Tickets, Attachments, Comments, and Notes are preserved, `resolvedAt` is backfilled, legacy Tickets show an empty action list, and the schema matches `schema.prisma`; the rollback procedure also works.
- **AC-24**: Given the seed is run twice, then no duplicate rows are created and all required demonstration states exist.
- **AC-25**: Given Lab 1 to Lab 3 behavior, when the full Lab 1 to Lab 3 test suites run, then they all pass (regression).
- **AC-26**: Given a server failure, a conflict, a forbidden access, or a missing record, then the UI shows a consistent message without stack traces, and form input is kept after a recoverable failure.
- **AC-27**: Given a double click or a retried submit on Add Action or a status change, then only one record or transition results.
- **AC-28**: Given Desktop, Tablet, and Mobile viewports, then the dashboards, Actions Taken area, and status controls render without clipping, overlap, or horizontal scrolling, with visible keyboard focus and labelled controls.
- **AC-29**: Given each role, then the navigation shows Dashboard plus that role's permitted entries, the active entry is marked, and the user lands on Dashboard after login.
- **AC-30**: Given the seeded database, then the dashboard and Actions Taken list endpoints respond within 1 second (performance smoke).

## 10. Definition of Done
- All FR-01..16 and BR-01..28 are implemented; every AC-01..30 maps to at least one test in `tests.md`.
- Server (API/integration), client (component), and Playwright E2E suites for Labs 1 to 4 pass on `main`; AC-28 is also verified by the documented visual and accessibility checklist and screenshots.
- Migration preserves Lab 3 data and its rollback is rehearsed; the seed is idempotent and demonstrates non-zero and zero dashboard metrics.
- Every write is authorized on the server; no client-supplied identity is accepted; no secrets are committed.
- No console errors, broken links, placeholder text, or unfinished controls remain; README (setup, seed, migration, test, demo) is current.
- Screenshots for the Staff Dashboard, Requester Dashboard, and Actions Taken at Desktop, Tablet, and Mobile are in `artifacts/lab-04/screenshots/`.
- Peer review approvals are in `docs/lab-04/reviewer.md`; AI prompts and reflection are in `docs/lab-04/ai-use.md`.
- All GitHub Issues are in Done; the final PDF follows "Answer Part 1" to "Answer Part 9".

## 11. Assumptions and Decisions
- **"Assign" in the lab handout** is interpreted as assigning the Ticket Owner (BR-21). Actions Taken have no separate assignee or status, because the handout's field list for Actions Taken does not include them.
- **Append-only vs update**: Actions Taken are never deleted but may be edited by staff while the Ticket is not terminal; the original performer and creation time are preserved (BR-03, BR-08).
- **Requester status changes**: Requesters never change status; `Reopened` is set by IT Staff or Administrators (unchanged from Lab 3).
- **Resolution gate**: "at least one Action Taken" is the minimum evidence of work. A stricter rule (for example, no open follow-ups) was left out to avoid blocking legitimate resolutions.
- **Comments and `updatedAt`**: Public Comments and Internal Notes keep their Lab 3 behavior and are not required to bump the Ticket's `updatedAt`; only workflow changes and Action Taken writes do (BR-11).
- **Concurrency**: `expectedUpdatedAt` is optional on Lab 3 ticket PATCH endpoints to preserve their contract; the Lab 4 client always sends it and status changes always use compare-and-set (BR-19, BR-20).
- **Time zone**: Asia/Bangkok fixed offset UTC+7 is used for the dashboard windows (BR-23); timestamps are stored in UTC.
- **Dashboard size**: recent lists show 5 items; there is no pagination on the dashboard.

## 12. Revision History
- **v1.0** (Issue #30): Initial Sprint 4 contract, written before the implementation Pull Requests.
