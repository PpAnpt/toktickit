# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal
Complete the core TokTickIT service-desk workflow: IT Staff and Administrators plan, assign, record, complete, and cancel Actions Taken under each Ticket with an append-only history, the Ticket lifecycle is enforced end to end (including a resolution gate and stale-update protection), Requesters and IT Staff get concise role-based dashboards that link to the detailed screens, and the whole application from Labs 1 to 3 is hardened, responsive, accessible, and consistent under the Zen Green design language.

## 2. Stakeholder Request Interpretation
The service desk can receive Tickets and communicate with Requesters, but cannot yet record the real work. Each Ticket needs a list of Actions Taken (what was done, when, by whom, with what result, and whether follow-up is needed). The primary Ticket Owner still coordinates the Ticket, but any IT Staff member may record an action. A Requester may say the problem looks fixed, yet only IT Staff formally resolve the Ticket. Dashboards must stay short: they summarize and send the user to the existing Ticket Queue or My Tickets screens. Finally, every earlier feature must keep working and look like one product.

## 3. Scope

### Included
- Actions Taken: data model, assignee, lifecycle status (planned, in progress, completed, cancelled), migration, seed, REST API, authorization, Ticket Detail UI (list, create, view/edit).
- Append-only history: Action Taken revisions and Ticket events (status, owner, priority), with a staff-only history view.
- Final Ticket workflow: transition matrix, resolution gate, `resolvedAt` tracking, atomic stale-update (conflict) handling.
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
- **FR-01**: IT Staff and Administrators can create an Action Taken on any Ticket that is not `Closed` or `Cancelled`; on a `Resolved` Ticket only as a `Completed` record (BR-41).
- **FR-02**: IT Staff and Administrators can edit an existing Action Taken on a Ticket that is not `Closed` or `Cancelled`.
- **FR-03**: Each Action Taken records Action Date/Time, Action Description, Result, Performed by (set by the system), Assignee, Status, Follow-Up Required?, Follow-up Note, and Attachment Notes.
- **FR-04**: Requesters can view all Actions Taken of their own Tickets, read-only. They cannot create or edit them.
- **FR-05**: The Ticket Detail screen for IT Staff shows an Actions Taken area with a list, a create mode, and a view/edit mode.
- **FR-06**: The system enforces the final Ticket status transition matrix on the server and rejects every other transition.
- **FR-07**: The system refuses to move a Ticket to `Resolved` unless it has at least one `Completed` Action Taken and no `Planned` or `In Progress` one (resolution gate, BR-16).
- **FR-08**: A Requester's "appears resolved" indication stays advisory and never changes the status.
- **FR-09**: Workflow writes (status, owner, priority, Action Taken edit) detect stale updates and return a conflict instead of silently overwriting; the `expectedUpdatedAt` token is required on every one of them.
- **FR-10**: The system provides a Requester Dashboard with metrics for the signed-in Requester's own Tickets only.
- **FR-11**: The system provides an IT Staff Dashboard (also for Administrators) with operational metrics, breakdowns, recent Tickets, and the current user's recent Actions Taken.
- **FR-12**: Every dashboard card has a backend-defined query, an empty state, and a drill-down link to an existing detailed screen.
- **FR-13**: Each role gets a Dashboard navigation entry and lands on it after login.
- **FR-14**: Repeated clicks or network retries must not create duplicate Actions Taken or duplicate transitions.
- **FR-15**: All Lab 1 to Lab 3 behavior (authentication, role navigation, ownership, comments, notes, attachments, user management) continues to work.
- **FR-16**: Loading, validation, success, empty, forbidden, conflict, not-found, and safe API-failure feedback is consistent across screens, and forms keep entered data after a recoverable failure.
- **FR-17**: IT Staff and Administrators can assign each Action Taken to an active IT Staff or Administrator, and the system rejects inactive or ineligible assignees.
- **FR-18**: Each Action Taken has a lifecycle status (`Planned`, `In Progress`, `Completed`, `Cancelled`); IT Staff and Administrators can start, complete, and cancel it according to the transition rules.
- **FR-19**: The system keeps an append-only, tamper-resistant history of every Action Taken change and every Ticket status, owner, and priority change, viewable by IT Staff and Administrators.

## 5. Business Rules
Lab 3 rules (authentication, ownership, password, non-disclosure 404, queue validation, administrator safety) stay in force and are cited as `L3-BR-nn` when referenced.

### Actions Taken Rules
- **BR-01**: An Action Taken belongs to exactly one Ticket; a Ticket may have zero, one, or many Actions Taken.
- **BR-02**: The Ticket Owner coordinates the Ticket, but an Action Taken may be recorded by any active IT Staff or Administrator, not only the owner. Recording an action never changes the owner.
- **BR-03**: *Performed by* is always the authenticated user who created the action. Any `performedById` sent by the client is ignored. Editing never changes *Performed by*; the editor is stored as `updatedById`.
- **BR-04**: *Action Date/Time* (`actionAt`) is supplied by the user and defaults to the current time. For a `Planned` action it is the scheduled time and may be in the future; for `In Progress` and `Completed` actions it must not be more than 5 minutes in the future. It must never be earlier than the Ticket's creation time. *Created at* is set by the server and cannot be changed.
- **BR-05**: *Action Description* is required, trimmed, non-empty plain text. *Result* is required when the status is `Completed` or `Cancelled` (for `Cancelled` it records the reason) and optional for `Planned` and `In Progress`. Maximum lengths: description 2,000, result 1,000, follow-up note 1,000, attachment notes 500 characters. Text is rendered as text, never as HTML.
- **BR-06**: *Follow-Up Required?* is a boolean (default `false`). *Follow-up Note* is required (non-empty after trim) when it is `true`; when it is `false` the note is stored as empty/null.
- **BR-07**: *Attachment Notes* is optional free text describing which file or image to look for. It does not upload files.
- **BR-08**: Actions Taken cannot be deleted. Editing is allowed for IT Staff and Administrators while the Ticket is not `Closed` or `Cancelled`; create and edit on those Tickets return 409.
- **BR-09**: Lists are ordered by `actionAt` descending, then `id` descending, so the order is stable.
- **BR-10**: Requesters see every field of every Action Taken on their own Tickets, so private details belong in Internal Notes, not in Actions Taken. A Requester asking for another Requester's Ticket gets the same 404 as a missing Ticket (L3-BR-25).
- **BR-11**: Creating or editing an Action Taken updates the Ticket's `updatedAt` in the same transaction so "recently updated" reflects real work.
- **BR-12**: Creating an Action Taken does not change the Ticket status; status changes remain explicit.
- **BR-13**: A create request may carry a `clientRequestId` (UUID). A repeated request with the same id for the same Ticket **and the same content and caller** returns the existing record with 200 instead of creating a second one. The server stores a SHA-256 `requestDigest` of the normalized create payload (trimmed text, fixed key order, `clientRequestId` excluded) plus the acting user; reusing the id with a different payload or by a different user returns `409 IDEMPOTENCY_KEY_REUSED` and creates nothing, so a retry can never silently return a record that does not match what was sent. Status changes and edits do not need a key: they are protected by the compare-and-set token (BR-19, BR-20).

### Status, Resolution, and Conflict Rules
- **BR-14**: The statuses are `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`. Only IT Staff and Administrators change status; Requesters get 403.
- **BR-15**: Permitted transitions are exactly those in the matrix below; anything else returns 400.
- **BR-16** (resolution gate): A transition to `Resolved` requires (a) at least one Action Taken with status `Completed` and (b) no Action Taken still `Planned` or `In Progress` (each must first be completed or cancelled). Otherwise 400 with code `RESOLUTION_GATE_FAILED` and `reasons` containing `NO_COMPLETED_ACTION` and/or `OPEN_ACTIONS`. The gate is enforced on the server whatever the client sends.
- **BR-17**: Entering `Resolved` sets `resolvedAt` to the current time. Moving to `Reopened` clears `resolvedAt` and `indicatedResolvedAt` so the Requester can indicate again. `Closed` keeps the existing `resolvedAt`.
- **BR-18**: The Requester's "appears resolved" indication (L3-BR-14) only sets `indicatedResolvedAt`; it never changes the status.
- **BR-19** (stale update): Workflow writes (Ticket status, owner, priority; Action Taken edit, status change, and assignee change) accept `expectedUpdatedAt` (the Ticket's `updatedAt` the client last saw, or the Action's `updatedAt` for action writes). If it differs from the stored value the server returns 409 with the current `updatedAt` and changes nothing. It is required for every workflow write, including Ticket status, owner, and priority; a request without it returns 400 naming `expectedUpdatedAt` and changes nothing, so a client that bypasses the screen cannot overwrite a newer change unknowingly.
- **BR-20** (atomic check and write): The stale check and the write are one atomic operation, not "read, compare, then write". Each workflow write runs in a single database transaction containing one `UPDATE ... WHERE id = ? AND "updatedAt" = <expected>` (for a Ticket status change also `AND status = <status the server validated>`), the new `updatedAt` being `GREATEST(now(), previous + 1 ms)` so two writes in the same millisecond still change the token, followed by the history rows (BR-34, BR-35). If no row is updated the transaction rolls back and the server returns 409. Of N parallel requests carrying the same token, exactly one succeeds and the others get 409; exactly one history row is added.
- **BR-21**: Only active IT Staff or Administrators can be assigned as owner; an inactive or non-staff assignee is rejected with 400 (L3-BR-09).

### Dashboard Rules
- **BR-22**: All dashboard numbers are computed by the backend from the database; the client never counts. Endpoints return counts and at most 5 recent Tickets or actions, never full collections.
- **BR-23**: Time windows use the Asia/Bangkok time zone (UTC+7, no DST). "Last 7 days" means from 00:00 Asia/Bangkok six days ago up to the request time (7 calendar days including today).
- **BR-24**: "Active" Tickets are `New`, `Open`, `In Progress`, `Waiting for Requester`, `Reopened`. `Resolved`, `Closed`, and `Cancelled` are not active.
- **BR-25**: The Requester Dashboard only uses Tickets whose `requesterId` is the authenticated user. IT Staff and Administrators are refused (403).
- **BR-26**: The Staff Dashboard is available to IT Staff and Administrators; Requesters get 403. Only the Administrator response includes `userCounts`.
- **BR-27**: Legacy Tickets (created before Lab 4) have zero Actions Taken and are counted like any other Ticket. For legacy `Resolved`/`Closed` Tickets `resolvedAt` is backfilled from `updatedAt` (best available evidence).
- **BR-28**: The staff queue and My Tickets accept `status=Active` so a dashboard card and its drill-down list show the same count.

### Assignment, Lifecycle, and History Rules
- **BR-29** (assignee): Each Action Taken has an assignee (`assigneeId`): the person responsible for doing, or having done, the action. It is separate from *Performed by* (who recorded it) and from the Ticket Owner. It defaults to the creator and may be any **active** IT Staff or Administrator; an inactive user, a Requester, or an unknown user is rejected with 400 naming `assigneeId` (L3-BR-09 applies). Only a change of assignee is validated: an existing assignee who later becomes inactive does not block other edits, but the action must be reassigned before it can be started or completed.
- **BR-30** (action status): Statuses are `Planned`, `In Progress`, `Completed`, `Cancelled`. A new action may start as `Planned`, `In Progress`, or `Completed` (default `Completed`, because most actions are recorded after the work). Permitted transitions: `Planned` -> `In Progress`, `Completed`, `Cancelled`; `In Progress` -> `Completed`, `Cancelled`. `Completed` and `Cancelled` are terminal for status; their content can still be corrected while the Ticket is not terminal, and every correction is recorded in history. Any other transition returns 400.
- **BR-31** (complete / cancel): Completing requires a non-empty Result describing the outcome; cancelling requires a non-empty Result giving the reason (BR-05).
- **BR-32** (Ticket cancellation): When a Ticket moves to `Cancelled`, every `Planned` or `In Progress` action of that Ticket becomes `Cancelled` in the same transaction with the Result "Cancelled because the Ticket was cancelled.", and a revision of type `AUTO_CANCELLED` is recorded with the acting user.
- **BR-33** (append-only scope): The following records are insert-only: Public Comments, Internal Notes (Lab 3), Action Taken revisions, and Ticket events. No API updates or deletes them. The Action Taken and the Ticket are *current-state* records that may change; every change to them is preserved in the history tables, which are the audit evidence.
- **BR-34** (Action Taken revisions): Every create, edit, status change, assignee change, and auto-cancel appends one revision in the same transaction as the change. A revision stores: `revisionNo` (1, 2, 3 ... per action), `type` (`CREATED`, `EDITED`, `STATUS_CHANGED`, `ASSIGNEE_CHANGED`, `AUTO_CANCELLED`), actor, time, the list of changed field names, and `before` and `after` snapshots of the action (`before` is null for `CREATED`).
- **BR-35** (Ticket events): Every Ticket status, owner, and priority change appends one event in the same transaction: `type` (`STATUS_CHANGED`, `OWNER_CHANGED`, `PRIORITY_CHANGED`), `from`, `to`, actor, and time. Reopen is a normal status event. Tickets changed before Lab 4 have no events; the UI says "No history recorded before Lab 4."
- **BR-36** (ordering and visibility): Revisions are ordered by `revisionNo` ascending and Ticket events by time ascending then `id` ascending, so the order is stable. Only IT Staff and Administrators may read history (Requesters get 403). History text is rendered as plain text.
- **BR-37** (immutability): The database rejects `UPDATE` and `DELETE` on the revision and event tables (trigger created by the migration), so history cannot be rewritten even by a faulty query. Tests prove it with direct SQL.
- **BR-38** (pagination): List endpoints are paginated with `page` and `limit` and return `total`. Actions list: default 20, maximum 50. History lists: default 50, maximum 100. Values outside the range are clamped like the Lab 3 queue.
- **BR-39** (recent filters): The Requester cards "Recently Updated" and "Recently Resolved" link to My Tickets with `recent=updated` and `recent=resolved`. These filters use the same shared predicate and window function as the metrics (BR-23), so the list contains exactly the Tickets the card counted for the same snapshot, including a Ticket that was resolved and then closed inside the window, and excluding a Ticket resolved before the window.
- **BR-40** (restrict, not cascade; test cleanup): Foreign keys from `ActionTaken`, `ActionTakenRevision`, and `TicketEvent` use `onDelete: Restrict`, so deleting a Ticket, Action Taken, or User that is referenced by them fails in the database instead of cascading into the immutable history (BR-37). Automated tests, which must clean up their fixtures, run only against the dedicated test database (name ending `_test`, checked before cleanup) and remove Lab 4 rows with `TRUNCATE "ActionTakenRevision", "TicketEvent", "ActionTaken"` (the row-level trigger of BR-37 does not fire for `TRUNCATE`) before deleting Tickets and Users with the Lab 3 helper. This cleanup is a test-only helper and is never exposed by the API.
- **BR-41** (no open work on a Resolved Ticket): The resolution gate (BR-16) is checked when a Ticket becomes `Resolved`, so the server also keeps it true afterwards: a `Resolved` Ticket never has a `Planned` or `In Progress` action. Creating an action with status `Planned` or `In Progress` on a `Resolved` Ticket returns `409 TICKET_RESOLVED` and saves nothing; the Ticket must be reopened first (BR-17). Recording a `Completed` action on a `Resolved` Ticket (a late record of finished work) and correcting existing actions stay allowed, because neither can leave open work behind (`Completed` and `Cancelled` are terminal for status, BR-30).

### Role Authorization Matrix (new and changed operations)
| Operation | Requester | IT Staff | Administrator | Notes |
| :--- | :---: | :---: | :---: | :--- |
| List Actions Taken of a Ticket | Allow (own only; others 404) | Allow | Allow | Read-only for Requester |
| Create Action Taken | **403** | Allow | Allow | Ticket not Closed/Cancelled |
| Edit Action Taken | **403** | Allow | Allow | Needs `expectedUpdatedAt` |
| Change Action status or assignee | **403** | Allow | Allow | Needs `expectedUpdatedAt`; assignee must be active staff/admin |
| View history (Action revisions, Ticket events) | **403** | Allow | Allow | Read-only |
| Delete Action Taken / edit or delete history | n/a | n/a | n/a | Not supported |
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
- **Actions Taken on Ticket Detail**: a paginated section listing actions (newest first) with performer, assignee, status badge (text as well as color), time, result, and a "Follow-up" badge. IT Staff get "Add Action" (create mode), "Edit" (edit mode), and Start / Complete / Cancel / Reassign controls in an accessible form with inline validation under each field, plus a "History" disclosure per action and a Ticket history timeline (status, owner, priority). Requesters see the list without controls and without history.
- **Status controls**: show only the transitions permitted for the current status; after a successful change the Ticket summary status refreshes. A blocked resolution shows the gate message next to the control; a conflict shows a "Ticket changed, reload" message that keeps the user's input.
- **States**: every dashboard card and list has loading, empty, error, and forbidden feedback.
- **Responsive and accessibility**: same rules as Labs 2 and 3 (Desktop >= 992px, Tablet 768-991px, Mobile < 768px; no horizontal scroll, visible focus, keyboard operation, semantic labels, non-color status cues).

## 7. Data Changes

### 7.1 New model `ActionTaken`
| Field | Type | Notes |
| :--- | :--- | :--- |
| `id` | Int PK | autoincrement |
| `ticketId` | Int FK -> `Ticket(id)` | `onDelete: Restrict` (BR-40) |
| `performedById` | Int FK -> `User(id)` | set from token, never changed |
| `assigneeId` | Int FK -> `User(id)` | active staff/admin when set (BR-29); defaults to creator |
| `status` | Enum `ActionStatus` | `Planned`, `In Progress` (`InProgress`), `Completed`, `Cancelled` (BR-30) |
| `updatedById` | Int? FK -> `User(id)` | last editor |
| `actionAt` | DateTime | user-supplied, BR-04 |
| `description` | String (Text) | required |
| `result` | String? (Text) | required when `Completed` or `Cancelled` (BR-05) |
| `followUpRequired` | Boolean | default `false` |
| `followUpNote` | String? | required when `followUpRequired` |
| `attachmentNotes` | String? | optional |
| `clientRequestId` | String? | unique per Ticket (`@@unique([ticketId, clientRequestId])`) |
| `requestDigest` | String? | SHA-256 of the normalized create payload and actor; set when `clientRequestId` is present (BR-13) |
| `createdAt` / `updatedAt` | DateTime | `updatedAt` doubles as the concurrency token |

Indexes: `(ticketId, actionAt)` for the list, `performedById` and `(assigneeId, status)` for "My Recent Actions" and open-action checks, `(ticketId, status)` for the resolution gate.

### 7.1a New history models (append-only, BR-33..37)
| Model | Fields | Notes |
| :--- | :--- | :--- |
| `ActionTakenRevision` | `id`, `actionId` FK, `ticketId` FK, `revisionNo` Int, `type` Enum (`CREATED`, `EDITED`, `STATUS_CHANGED`, `ASSIGNEE_CHANGED`, `AUTO_CANCELLED`), `actorId` FK -> `User`, `changedFields` String[], `before` Json?, `after` Json, `createdAt` | `@@unique([actionId, revisionNo])`; index `(ticketId, createdAt)`; no `updatedAt` because rows never change |
| `TicketEvent` | `id`, `ticketId` FK, `type` Enum (`STATUS_CHANGED`, `OWNER_CHANGED`, `PRIORITY_CHANGED`), `fromValue` String?, `toValue` String?, `actorId` FK -> `User`, `createdAt` | index `(ticketId, createdAt, id)` |

A migration trigger on both tables raises an error for any `UPDATE` or `DELETE` (BR-37). The current-state `ActionTaken` row is the editable projection; these tables are the evidence.

All foreign keys of the three new models (`ticketId`, `actionId`, `performedById`, `assigneeId`, `updatedById`, `actorId`) use `onDelete: Restrict` (BR-40). A cascading delete would be a `DELETE` on a history row and would either be rejected by the immutability trigger or erase the evidence, so the database refuses to delete a Ticket, Action Taken, or User that has actions or history. Because the application has no delete endpoint for these records (BR-08, BR-33), nothing in normal operation needs to delete them.

### 7.2 Changed model `Ticket`
- New nullable `resolvedAt DateTime?`; relation `actionsTaken ActionTaken[]`.
- New indexes `(status, updatedAt)` for dashboard recency queries and `(requesterId, status)` for the Requester Dashboard.
- `Ticket` also gains `events TicketEvent[]`.
- `User` gains the back-relations `actionsPerformed`, `actionsAssigned`, `actionsEdited`, and the history actor relations.

### 7.3 Design decisions (justification)
1. **Separate `ActionTaken` table instead of a JSON/text column on `Ticket`.** Actions are many per Ticket, are listed, edited, and aggregated by performer (My Recent Actions), and need per-row timestamps and concurrency control. A relational table keeps them queryable, indexable, and authorizable per row; a JSON column would block those queries and make partial updates racy.
2. **`updatedAt` as the optimistic-concurrency token instead of a separate version counter, compared atomically.** `updatedAt` is already returned to the client and needs no extra column. The check is part of the single `UPDATE ... WHERE updatedAt = expected` statement (BR-20) instead of a separate read, so concurrent writers cannot both pass; the new value is `GREATEST(now(), previous + 1 ms)` so that millisecond precision cannot let a second write reuse a token.
3. **Explicit `resolvedAt` instead of deriving "recently resolved" from `updatedAt`.** `updatedAt` also changes on later actions, owner changes, and priority changes, so it cannot say when a Ticket was resolved. A dedicated timestamp makes the "Recently Resolved" metric correct and cheap, and Reopen can clear it.
4. **`clientRequestId` idempotency key** instead of a time-window de-duplication heuristic: a retry of the exact same request returns the original row, while two genuinely identical actions entered separately are both kept.
5. **Separate insert-only history tables instead of overwriting the current row.** A single `updatedById` loses what was changed and by whom when two people edit in turn. Revision rows with `before`/`after` snapshots and Ticket events keep every change in order, can be read without touching the current record, and a database trigger makes them immutable, which is stronger evidence than application code alone.
6. **Assignee and status on the Action Taken itself** rather than reusing the Ticket Owner and Ticket status: one Ticket can carry several actions assigned to different people at different stages, which the Ticket-level fields cannot express.

### 7.4 Migration and backfill
- One additive migration `server/prisma/migrations/<timestamp>_lab4_actions_taken/migration.sql`: creates the enums, `ActionTaken`, `ActionTakenRevision`, `TicketEvent`, the immutability trigger on the two history tables, adds `Ticket.resolvedAt`, adds indexes. No existing column is dropped or altered, so every Lab 3 User, Ticket, Attachment, Public Comment, and Internal Note stays valid.
- **Backfill**: `UPDATE "Ticket" SET "resolvedAt" = "updatedAt" WHERE status IN ('Resolved','Closed')`. Tickets in other statuses keep `resolvedAt = NULL`.
- **Legacy Tickets** have no Actions Taken: the list is empty, dashboards count them normally, and a legacy Ticket in an active status needs one new action before it can be resolved (BR-16).
- **Verification**: apply Labs 1 to 3 migrations to an empty database, insert Lab 3 data, apply the Lab 4 migration, confirm row counts and ownership are unchanged and `prisma migrate diff` against `schema.prisma` is empty (test MIG-01).
- **Recovery (successful and failed migrations are handled differently)**:
  1. *Migration applied successfully but the release must be abandoned.* Prisma 7 does not undo a successful migration: `prisma migrate resolve --rolled-back` is only valid for a migration recorded as **failed**, and dropping objects by hand leaves the migration recorded as applied in `_prisma_migrations`. Recovery is therefore a **restore**, not a down migration. Before applying, take a custom-format dump of the pre-upgrade database: `pg_dump -Fc -d <db> -f pre-lab4.dump`. To recover, create a clean recovery database, run `pg_restore --exit-on-error -d <recovery_db> pre-lab4.dump`, and point `DATABASE_URL` at it. The dump carries both the Lab 3 data and the Lab 3 `_prisma_migrations` history, so the recovered database has exactly the baseline schema, data, and migration history, and the Lab 3 build runs against it unchanged. Data written after the dump is not in the restored database; that loss is the known cost of this option and the reason the dump is taken immediately before the upgrade.
  2. *Migration fails part-way.* The failed migration is recorded as failed; recover the database as in (1), or fix the cause on a copy, and only then mark the original with `prisma migrate resolve --rolled-back <name>` (valid because the migration failed) before re-running `prisma migrate deploy`.
  3. *Forward fix after release.* If only a defect in the new objects must be corrected, add a new compensating migration; never edit or delete an applied migration.
  The restore path (1) is rehearsed against a scratch database in MIG-02, which also verifies the migration history (section 9, AC-23).

### 7.5 Seed
Idempotent (`npx prisma db seed`, safe to re-run): users upserted by email (Lab 3 accounts unchanged), tickets created only if the ticket number is missing, actions created only if a seed `clientRequestId` is missing. It covers every status and priority, owned and unowned Tickets, Tickets with 0, 1, and several Actions Taken (by different staff members, in all four action statuses, with different assignees, one assigned to the inactive staff member Marcus Wright to demonstrate rejection when reassigning), edited actions with revisions, Ticket events for status/owner/priority changes, a Ticket with a follow-up action, a `Reopened` and a recently `Resolved` Ticket, and enough variety for both non-zero and zero dashboard metrics (for example the Requester Emily Watson and the Administrator keep zero in some cards).

## 8. API Contract Summary
Full shapes and status codes are in `docs/lab-04/api-spec.md`. Status codes: 200/201 success, 400 validation or invalid transition, 401 not authenticated, 403 role not permitted, 404 missing or not visible, 409 stale update or terminal Ticket, 500 safe generic message.
- `GET /api/tickets/:id/actions`: paginated list (owner Requester, IT Staff, Administrator).
- `POST /api/staff/tickets/:id/actions`: create, with assignee and initial status.
- `PATCH /api/staff/tickets/:id/actions/:actionId`: edit, reassign, and change status, with `expectedUpdatedAt`.
- `GET /api/staff/tickets/:id/actions/:actionId/revisions`: Action Taken revision history (IT Staff, Administrator).
- `GET /api/staff/tickets/:id/events`: Ticket status, owner, and priority history (IT Staff, Administrator).
- `PATCH /api/staff/tickets/:id/status|owner|priority`: now require `expectedUpdatedAt`; status adds the resolution gate and compare-and-set.
- `GET /api/dashboard/requester`: Requester only.
- `GET /api/dashboard/staff`: IT Staff and Administrator.
- `GET /api/staff/tickets` and `GET /api/tickets`: accept `status=Active`; `GET /api/tickets` also accepts `recent=updated|resolved` (BR-39).
- All Lab 2 and Lab 3 endpoints are unchanged otherwise; `GET /api/health` stays.

## 9. Acceptance Criteria

### Actions Taken
- **AC-01**: Given a permitted IT Staff user and valid data, when an Action Taken is created, then it is saved under the correct Ticket with the authenticated user as *Performed by* and the chosen active assignee (default: the creator), and a client-sent `performedById` is ignored.
- **AC-03**: Given a Requester, when they list Actions Taken of their own Ticket, then all actions are returned read-only; when they try to create or edit, then 403; for another Requester's Ticket, then 404.
- **AC-04**: Given invalid input (missing description, missing result on a `Completed` or `Cancelled` action, follow-up required without a note, over-length text, pre-creation `actionAt`, or a future `actionAt` on a non-`Planned` action), when creating or editing, then 400 names the invalid field and nothing is saved.
- **AC-05**: Given a Ticket owned by staff member A, when staff member B creates an action, then it is saved with B as performer and the owner stays A.
- **AC-06**: Given an existing action, when staff edits it with the current `expectedUpdatedAt`, then the changes are saved, *Performed by* and *Created at* are unchanged, and `updatedById` is the editor; with a stale `expectedUpdatedAt`, then 409 and no change; a DELETE request is not supported.
- **AC-07**: Given a `Closed` or `Cancelled` Ticket, when creating or editing an action, then 409.
- **AC-08**: Given two create requests with the same `clientRequestId` for one Ticket, then exactly one action exists and, when the content and caller are identical, the second response returns the original with 200; when the content or the caller differs, the second request returns `409 IDEMPOTENCY_KEY_REUSED` and nothing is created.
- **AC-09**: Given several actions on a Ticket, when listed, then they are ordered by `actionAt` descending then `id` descending, repeatably.

### Ticket Workflow
- **AC-10**: Given each status, when staff request each target status, then exactly the pairs in the transition matrix succeed and all others return 400; a Requester gets 403.
- **AC-11**: Given a Ticket with no `Completed` Action Taken, or with an action still `Planned` or `In Progress`, when staff move it to `Resolved`, then 400 `RESOLUTION_GATE_FAILED` listing the reasons and the status is unchanged; given at least one `Completed` action and no open actions, then 200 and `resolvedAt` is set.
- **AC-12**: Given a Requester who indicated "appears resolved", then the status is unchanged; when staff later reopen the Ticket, then `resolvedAt` and `indicatedResolvedAt` are cleared.
- **AC-13**: Given a stale `expectedUpdatedAt` or a concurrent status change, when status, owner, or priority is updated, then 409 (and 400 when `expectedUpdatedAt` is missing) and the stored Ticket is unchanged; given N parallel writes carrying the same token, then exactly one succeeds, the rest get 409, and exactly one history row exists.
- **AC-14**: Given an inactive or non-staff user as assignee, when assigning the owner, then 400.
- **AC-15**: Given the Ticket Detail screen, then only permitted transitions are offered, a blocked resolution shows the gate message, and the summary status refreshes after a successful change.

### Dashboards
- **AC-02**: Given an authenticated Requester, when dashboard data is retrieved, then only metrics and recent Tickets owned by that Requester are returned.
- **AC-16**: Given a Requester, when requesting the staff dashboard, or given staff, when requesting the Requester dashboard, then 403.
- **AC-17**: Given seeded data, when the Requester dashboard is retrieved, then Open, Waiting for You, Recently Updated, and Recently Resolved equal the counts from an independent database query (BR-23, BR-24).
- **AC-18**: Given seeded data, when the staff dashboard is retrieved, then Unassigned, My Active, Urgent, Reopened, Resolved-awaiting-closure, the status and priority breakdowns, and My Recent Actions equal independent database queries; only the Administrator response contains `userCounts`.
- **AC-19**: Given a user with no matching records, then every metric is `0`, every list is empty, and the UI shows an explicit empty message.
- **AC-20**: Given any dashboard card with count N, when the user follows its drill-down link, then the target list opens pre-filtered and shows exactly those N Tickets (using `status=Active`, `recent=updated`, or `recent=resolved` where defined). This includes a Ticket that was resolved and then closed inside the window (listed) and a Ticket resolved before the window (not listed).
- **AC-21**: Given Tickets updated just inside and just outside the 7-day Asia/Bangkok boundary, then only the inside Tickets are counted as recent.
- **AC-22**: Given any dashboard response, then it contains counts and at most 5 items per list and no data of other Requesters.

### Data, Hardening, UI
- **AC-23**: Given a Lab 3 database, when the Lab 4 migration runs, then all Users, Tickets, Attachments, Comments, and Notes are preserved, `resolvedAt` is backfilled, legacy Tickets show an empty action list, and the schema matches `schema.prisma`; the documented recovery (a `pg_dump` taken before the upgrade restored into a clean recovery database) also works and the recovered database has the Lab 3 schema, data, and `_prisma_migrations` history.
- **AC-24**: Given the seed is run twice, then no duplicate rows are created and all required demonstration states exist.
- **AC-25**: Given Lab 1 to Lab 3 behavior, when the full Lab 1 to Lab 3 test suites run, then they all pass (regression).
- **AC-26**: Given a server failure, a conflict, a forbidden access, or a missing record, then the UI shows a consistent message without stack traces, and form input is kept after a recoverable failure.
- **AC-27**: Given a double click or a retried submit on Add Action or a status change, then only one record or transition results.
- **AC-28**: Given Desktop, Tablet, and Mobile viewports, then the dashboards, Actions Taken area, and status controls render without clipping, overlap, or horizontal scrolling, with visible keyboard focus and labelled controls.
- **AC-29**: Given each role, then the navigation shows Dashboard plus that role's permitted entries, the active entry is marked, and the user lands on Dashboard after login.
- **AC-30**: Given the documented performance fixture (5,000 Tickets, 20,000 Actions Taken; see `tests.md`), when each dashboard and the Actions Taken list is requested 30 times after 3 warm-up requests, then the 95th-percentile response time is under 1 second (performance smoke).

### Assignment, Lifecycle, and History
- **AC-31**: Given an Action Taken being created or reassigned, when the assignee is an inactive user, a Requester, or unknown, then 400 names `assigneeId` and nothing changes; an active IT Staff or Administrator is accepted and differs from *Performed by* and the Ticket Owner where chosen.
- **AC-32**: Given actions in each status, when staff move them, then exactly the transitions of BR-30 succeed (start, complete, cancel), `Completed` and `Cancelled` cannot change status, and completing or cancelling without a Result returns 400.
- **AC-33**: Given a Ticket with `Planned` or `In Progress` actions, when the Ticket is moved to `Cancelled`, then those actions become `Cancelled` in the same transaction with an `AUTO_CANCELLED` revision, and completed actions are untouched.
- **AC-34**: Given an action that is created, edited by staff A, then edited by staff B, then completed, then each step appends one revision with number, type, actor, time, changed fields, and before/after snapshots, so A's and B's original values can be reconstructed.
- **AC-35**: Given the history tables, then no API can update or delete a revision or Ticket event (404/405), a direct SQL `UPDATE` or `DELETE` is rejected by the database, and deleting a Ticket, Action Taken, or User that has actions or history is also rejected (`onDelete: Restrict`, BR-40).
- **AC-36**: Given status, owner, and priority changes (including reopen), then each appends a Ticket event with from, to, actor, and time, listed in stable ascending order.
- **AC-37**: Given history endpoints, then IT Staff and Administrators receive 200 and a Requester receives 403 with no data; the Staff Ticket Detail shows the history and the Requester view does not.
- **AC-38**: Given more actions or history rows than the page size, then the endpoints return the requested page with `total`, `page`, and `limit`, clamp out-of-range values, and keep the order stable across pages.
- **AC-39**: Given the seeded database, then one Ticket shows several actions with different assignees and statuses (planned, in progress, completed, cancelled), supporting the Part 6 demonstration.
- **AC-40**: Given a `Resolved` Ticket, when staff create an action with status `Planned` or `In Progress`, then `409 TICKET_RESOLVED` and nothing is saved; when they create a `Completed` action, then it is saved and the Ticket stays `Resolved`; after the Ticket is reopened, a `Planned` action is accepted; and a Ticket can never be `Resolved` while it has a `Planned` or `In Progress` action (BR-41, BR-16).

## 10. Definition of Done
- All FR-01..19 and BR-01..41 are implemented; every AC-01..40 maps to at least one test in `tests.md`.
- Server (API/integration), client (component), and Playwright E2E suites for Labs 1 to 4 pass on `main`; AC-28 is also verified by the documented visual and accessibility checklist and screenshots.
- Migration preserves Lab 3 data and its restore-based recovery is rehearsed; the seed is idempotent and demonstrates non-zero and zero dashboard metrics.
- Every write is authorized on the server; no client-supplied identity is accepted; no secrets are committed.
- No console errors, broken links, placeholder text, or unfinished controls remain; README (setup, seed, migration, test, demo) is current.
- Screenshots for the Staff Dashboard, Requester Dashboard, and Actions Taken at Desktop, Tablet, and Mobile are in `artifacts/lab-04/screenshots/`.
- Peer review approvals are in `docs/lab-04/reviewer.md`; AI prompts and reflection are in `docs/lab-04/ai-use.md`.
- All GitHub Issues are in Done; the final PDF follows "Answer Part 1" to "Answer Part 9".

## 11. Assumptions and Decisions
- **"Assign", "complete", and "cancel" in the Part 6 grading evidence** are interpreted at the Action Taken level: each action has its own assignee and lifecycle status (BR-29..32), in addition to the Ticket Owner and Ticket status. The handout's field list for Actions Taken is the minimum; the assignee and status are the additional fields needed to demonstrate the Part 6 evidence. A reduction of this scope would need written confirmation from the instructor.
- **Append-only vs update**: Actions Taken are never deleted and may be edited by staff while the Ticket is not terminal, but the editable record is only the *current state*; the append-only evidence is the revision and event history (BR-33..37). The original performer and creation time are preserved (BR-03, BR-08).
- **History starts at Lab 4**: Tickets changed before the Lab 4 migration have no events; no synthetic history is invented for them (BR-35).
- **Requester status changes**: Requesters never change status; `Reopened` is set by IT Staff or Administrators (unchanged from Lab 3).
- **Resolution gate**: at least one `Completed` action and no `Planned`/`In Progress` action (BR-16). Open follow-up notes do not block resolution, because follow-up is recorded as information and can continue after resolution.
- **Comments and `updatedAt`**: Public Comments and Internal Notes keep their Lab 3 behavior and are not required to bump the Ticket's `updatedAt`; only workflow changes and Action Taken writes do (BR-11).
- **Concurrency**: `expectedUpdatedAt` is required on the Ticket status, owner, and priority PATCH endpoints. This is the one deliberate change to a Lab 3 request contract: an optional token would let a client that skips the screen overwrite another user's recent change unknowingly (labsheet section 6.1). The Lab 3 tests that call these endpoints are updated to send the token and must still pass (AC-25, WF-16); status changes always use compare-and-set (BR-19, BR-20).
- **Time zone**: Asia/Bangkok fixed offset UTC+7 is used for the dashboard windows (BR-23); timestamps are stored in UTC.
- **Dashboard size**: recent lists show 5 items; there is no pagination on the dashboard.

## 12. Revision History
- **v1.0** (Issue #30): Initial Sprint 4 contract, written before the implementation Pull Requests.
- **v1.1** (PR #37 review by @BBINGOAL): Added Action Taken assignee and lifecycle (FR-17/18, BR-29..32, AC-31..33, AC-39); append-only revision and Ticket event history with database immutability (FR-19, BR-33..37, AC-34..37); pagination (BR-38, AC-38); `recent` filters so Recently Updated/Resolved drill-down matches the metric (BR-39, AC-20); atomic compare-and-set (BR-20, AC-13); reproducible performance fixture (AC-30); gate changed to `RESOLUTION_GATE_FAILED` (BR-16, AC-11).
- **v1.2** (PR #37 second review by @BBINGOAL and a self-audit against Lab4_Labsheet.md): Recovery after a successful migration is now a restore of a pre-upgrade `pg_dump` instead of `migrate resolve --rolled-back` (section 7.4, AC-23, MIG-02); all new foreign keys use `onDelete: Restrict` (BR-40, AC-35, MIG-04); a `Resolved` Ticket cannot receive `Planned`/`In Progress` actions (BR-41, AC-40, API-25, UI-31); reuse of a `clientRequestId` with different content is `409 IDEMPOTENCY_KEY_REUSED` (BR-13, AC-08, API-26); `expectedUpdatedAt` is required on Ticket status, owner, and priority (BR-19, AC-13, WF-12, WF-16); AC-02 moved to the Dashboards group. Totals: 19 FR, 41 BR, 40 AC.
