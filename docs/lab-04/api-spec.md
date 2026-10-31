# Lab 4 API Specification

This document adds to `docs/lab-03/api-spec.md` (authentication, token, base path, error format, and Lab 2/3 endpoints remain unchanged). Business rule and acceptance-criterion IDs refer to `docs/lab-04/specification.md`.

## 1. General Additions

### 1.1 Status Codes
| Code | Meaning in Lab 4 |
| :--- | :--- |
| `200` / `201` | Success / created |
| `400` | Validation error, invalid transition, or resolution gate |
| `401` | Missing, invalid, expired, or revoked token |
| `403` | Role not permitted (or `mustChangePassword=true`) |
| `404` | Ticket/Action does not exist, or the Ticket belongs to another Requester |
| `409` | Stale update, concurrent change, Ticket is `Closed`/`Cancelled`, new open work on a `Resolved` Ticket, or a reused idempotency key |
| `500` | Generic safe message; no stack trace, SQL, or internal detail |

### 1.2 Error Body
`{ "error": "Human-readable message" }`. Lab 4 adds an optional machine-readable `code` and, for validation errors, `details`:

```json
{ "error": "Validation failed", "details": { "followUpNote": "Follow-up note is required when follow-up is needed" } }
```

| `code` | Used when |
| :--- | :--- |
| `STALE_UPDATE` | `expectedUpdatedAt` differs from the stored value, or the status changed concurrently. Body also carries `currentUpdatedAt`. |
| `TICKET_TERMINAL` | Creating or editing an Action Taken on a `Closed`/`Cancelled` Ticket. |
| `IDEMPOTENCY_KEY_REUSED` | `clientRequestId` already used on this Ticket with a different payload or by a different user (BR-13). Nothing is created. |
| `TICKET_RESOLVED` | Creating a `Planned` or `In Progress` Action Taken on a `Resolved` Ticket (BR-41); reopen the Ticket first. |
| `RESOLUTION_GATE_FAILED` | Moving a Ticket to `Resolved` without a `Completed` action, or with `Planned`/`In Progress` actions. Body also carries `reasons`: `NO_COMPLETED_ACTION` and/or `OPEN_ACTIONS`. |
| `INVALID_ACTION_TRANSITION` | Action status change not allowed by BR-30 (400). |

### 1.3 Concurrency Convention
Workflow writes must carry `expectedUpdatedAt` (ISO 8601). It must equal the `updatedAt` the client last received for the same record (the Ticket for status/owner/priority, the Action Taken for action edits). A mismatch returns `409 STALE_UPDATE` and changes nothing; the client should reload and let the user re-apply the change. Required for every Action Taken write (edit, status change, reassignment) and for Ticket status/owner/priority; a missing or malformed value returns `400` with `details.expectedUpdatedAt` and changes nothing. This is the one deliberate change to a Lab 3 request contract: without the token a client could overwrite another user's recent change unknowingly, so the Lab 3 tests that call these endpoints are updated to send it.

**Atomicity (BR-20).** The check and the write are a single statement inside one transaction, never "read, compare, then write":
```sql
UPDATE "ActionTaken"
SET ..., "updatedAt" = GREATEST(now(), "updatedAt" + interval '1 millisecond')
WHERE id = $1 AND "updatedAt" = $expected;   -- Ticket status also: AND status = $validatedStatus
```
If zero rows are updated the transaction is rolled back (including any history rows) and the response is `409`. The history row (`ActionTakenRevision` or `TicketEvent`) is inserted in the same transaction, so a change and its history either both exist or neither does.

### 1.4 Pagination Convention
List endpoints accept `page` (>= 1) and `limit` and return `{ ..., "total": n, "page": p, "limit": l }`. Out-of-range values are clamped, not rejected. Actions list: default `limit` 20, maximum 50. History lists: default 50, maximum 100. Ordering is fixed and tie-broken by `id` so pages never overlap or skip rows.

---

## 2. Actions Taken

### 2.1 Action Taken Object
```json
{
  "id": 12,
  "ticketId": 7,
  "actionAt": "2026-10-29T03:15:00.000Z",
  "description": "Replaced the faulty network cable at desk 14B.",
  "result": "Link restored; ping stable for 10 minutes.",
  "performedBy": { "id": 3, "name": "Sarah Connor", "role": "IT_STAFF" },
  "assignee": { "id": 4, "name": "James Gordon", "role": "IT_STAFF" },
  "status": "Completed",
  "followUpRequired": true,
  "followUpNote": "Check the cable again on Friday.",
  "attachmentNotes": "Photo of the old cable is in the shared folder 'Tickets/7'.",
  "createdAt": "2026-10-29T03:20:11.000Z",
  "updatedAt": "2026-10-29T03:20:11.000Z",
  "updatedBy": null
}
```
`status` is one of `Planned`, `In Progress`, `Completed`, `Cancelled`. `updatedBy` is `{ "id", "name" }` once the action has been changed. `result`, `followUpNote`, and `attachmentNotes` are `null` when empty.

### 2.2 List Actions Taken
- **Endpoint**: `GET /api/tickets/:id/actions?page=&limit=` — **Access**: owning Requester, IT Staff, Administrator
- **Success (200)**: `{ "actions": [ <Action Taken>, ... ], "total": 3, "page": 1, "limit": 20 }` ordered by `actionAt` desc, then `id` desc (BR-09), paginated per section 1.4. A Ticket with no actions returns `{ "actions": [], "total": 0, ... }`.
- **Errors**: `400` invalid id; `401`; `404` Ticket missing or owned by another Requester.

### 2.3 Create Action Taken
- **Endpoint**: `POST /api/staff/tickets/:id/actions` — **Access**: IT Staff, Administrator
- **Request**:
  ```json
  {
    "actionAt": "2026-10-29T03:15:00.000Z",
    "description": "Replaced the faulty network cable at desk 14B.",
    "result": "Link restored; ping stable for 10 minutes.",
    "assigneeId": 4,
    "status": "Completed",
    "followUpRequired": true,
    "followUpNote": "Check the cable again on Friday.",
    "attachmentNotes": "Photo of the old cable is in the shared folder 'Tickets/7'.",
    "clientRequestId": "6f1c9d8e-4b0a-4f7e-9a3b-2d5e8c1a7f10"
  }
  ```
- **Field rules** (BR-04..07, BR-13, BR-29..31): `actionAt` optional (default now; not earlier than the Ticket's `createdAt`; not more than 5 minutes in the future unless `status` is `Planned`). `assigneeId` optional (default: the caller); must be an active IT Staff or Administrator (BR-29). `status` optional, one of `Planned`, `In Progress`, `Completed` (default `Completed`); `Cancelled` is not allowed on create. On a `Resolved` Ticket only `Completed` is accepted (BR-41). `description` required, <= 2,000 chars. `result` required when `status` is `Completed` (<= 1,000), optional otherwise. `followUpRequired` optional boolean, default `false`. `followUpNote` required when `followUpRequired=true`, <= 1,000, ignored (stored `null`) when `false`. `attachmentNotes` optional, <= 500. `clientRequestId` optional UUID. All text is trimmed plain text. `performedById`, `performedBy`, and `createdAt` in the body are ignored.
- **Success (201)**: `{ "action": <Action Taken> }`. The Ticket's `updatedAt` is also updated (BR-11) and a revision `CREATED` (`revisionNo` 1) is appended in the same transaction (BR-34).
- **Replay (200)**: same `clientRequestId` on the same Ticket with identical content from the same caller returns `{ "action": <existing>, "replayed": true }` without creating a second row (AC-08). The comparison uses the stored `requestDigest` of the normalized payload (whitespace-trimmed text, key order ignored, `clientRequestId` excluded), so a retry that differs only in whitespace or property order is still a replay.
- **Key reuse (409 `IDEMPOTENCY_KEY_REUSED`)**: the same `clientRequestId` with different content, or from a different user, creates nothing and returns the conflict; the response does not include the existing record (AC-08).
- **Errors**: `400` validation (`details` names each invalid field); `401`; `403` Requester; `404` Ticket missing; `409 TICKET_TERMINAL`; `409 TICKET_RESOLVED`; `409 IDEMPOTENCY_KEY_REUSED`.

### 2.4 Edit, Reassign, and Change Status of an Action Taken
- **Endpoint**: `PATCH /api/staff/tickets/:id/actions/:actionId` — **Access**: IT Staff, Administrator
- **Request**: any subset of `actionAt`, `description`, `result`, `assigneeId`, `status`, `followUpRequired`, `followUpNote`, `attachmentNotes`, plus required `expectedUpdatedAt`. Validation is applied to the merged result (for example, `followUpRequired=true` without any note, or `status: "Completed"` without a result, is rejected).
- **Status changes** follow BR-30 (`Planned` -> `In Progress`/`Completed`/`Cancelled`; `In Progress` -> `Completed`/`Cancelled`); anything else is `400 INVALID_ACTION_TRANSITION`. `Completed` and `Cancelled` require a non-empty `result` (BR-31).
- **Assignee changes**: the new assignee must be an active IT Staff or Administrator, otherwise `400` with `details.assigneeId` (BR-29). Resending the same assignee is not a change.
- **Success (200)**: `{ "action": <Action Taken> }` with new `updatedAt` and `updatedBy`. `performedBy` and `createdAt` never change (BR-03). One revision is appended in the same transaction with `type` `STATUS_CHANGED` (status changed), `ASSIGNEE_CHANGED` (assignee changed), or `EDITED` (anything else), listing `changedFields` and `before`/`after` snapshots (BR-34). A request that changes nothing returns `200` without a revision.
- **Errors**: `400` validation, invalid transition, ineligible assignee, or missing `expectedUpdatedAt`; `401`; `403` Requester; `404` Ticket or action missing, or action belongs to a different Ticket; `409 STALE_UPDATE` (body includes `currentUpdatedAt`); `409 TICKET_TERMINAL`.

### 2.5 Delete and History Immutability
No delete endpoint exists for Actions Taken, revisions, or Ticket events (BR-08, BR-33). `DELETE` or `PATCH` on `/api/staff/tickets/:id/actions/:actionId/revisions...` or `/api/staff/tickets/:id/events...` returns `404`. In addition the database rejects `UPDATE`/`DELETE` on the history tables (BR-37).

### 2.6 Action Taken Revision History
- **Endpoint**: `GET /api/staff/tickets/:id/actions/:actionId/revisions?page=&limit=` — **Access**: IT Staff, Administrator (Requester `403`)
- **Success (200)**:
  ```json
  {
    "revisions": [
      {
        "revisionNo": 2,
        "type": "EDITED",
        "actor": { "id": 4, "name": "James Gordon" },
        "createdAt": "2026-10-29T05:02:10.000Z",
        "changedFields": ["result"],
        "before": { "result": "Link restored." },
        "after":  { "result": "Link restored; ping stable for 10 minutes." }
      }
    ],
    "total": 2, "page": 1, "limit": 50
  }
  ```
  Ordered by `revisionNo` ascending (BR-36). For `CREATED`, `before` is `null` and `after` is the full snapshot. For the other types `before` and `after` contain the full action snapshot so any earlier state can be reconstructed.
- **Errors**: `401`; `403`; `404` Ticket or action missing.

### 2.7 Ticket Event History
- **Endpoint**: `GET /api/staff/tickets/:id/events?page=&limit=` — **Access**: IT Staff, Administrator (Requester `403`)
- **Success (200)**:
  ```json
  {
    "events": [
      { "id": 41, "type": "STATUS_CHANGED", "from": "Open", "to": "In Progress", "actor": { "id": 3, "name": "Sarah Connor" }, "createdAt": "2026-10-29T04:30:00.000Z" },
      { "id": 42, "type": "OWNER_CHANGED", "from": null, "to": "Sarah Connor", "actor": { "id": 3, "name": "Sarah Connor" }, "createdAt": "2026-10-29T04:31:00.000Z" }
    ],
    "total": 2, "page": 1, "limit": 50
  }
  ```
  Ordered by `createdAt` ascending then `id` ascending. Tickets changed before Lab 4 return only events from the migration onward (possibly `[]`).
- **Errors**: `401`; `403`; `404`.

---

## 3. Ticket Workflow Changes

### 3.1 Update Ticket Status
- **Endpoint**: `PATCH /api/staff/tickets/:id/status` — **Access**: IT Staff, Administrator (Requester `403`)
- **Request**: `{ "status": "Resolved", "expectedUpdatedAt": "2026-10-29T03:20:11.000Z" }` (`expectedUpdatedAt` required)
- **Processing order**: validate Ticket exists -> request shape (`400`) -> stale token against the locked row (`409`) -> transition matrix (specification section 5, `400`) -> resolution gate (BR-16, `400`) -> atomic compare-and-set write with its history rows (BR-20). The Ticket row is locked for the whole transaction, so the stale check cannot race another writer; the final `UPDATE ... WHERE updatedAt = expected` repeats it atomically. A client holding an outdated view therefore always gets `409` (reload) rather than a confusing `400` about a transition that was valid for the old status; this is what makes "N parallel requests with the same token: one `200`, the rest `409`" (BR-20) true even when they ask for the same status.
- **Side effects** (same transaction): entering `Resolved` sets `resolvedAt`; entering `Reopened` clears `resolvedAt` and `indicatedResolvedAt` (BR-17); entering `Cancelled` cancels every `Planned`/`In Progress` action with `AUTO_CANCELLED` revisions (BR-32); every change appends a `STATUS_CHANGED` Ticket event (BR-35).
- **Success (200)**: the updated Ticket as in Lab 3, plus `updatedAt`, `resolvedAt`, `indicatedResolvedAt`, and `status` as the display string (for example `"In Progress"`).
- **Errors**: `400` missing or malformed `expectedUpdatedAt`; `400 Invalid status transition from 'X' to 'Y'`; `400 RESOLUTION_GATE_FAILED` with `reasons` (for example "Complete or cancel all open actions, and record at least one completed action, before resolving this Ticket"); `401`; `403`; `404`; `409 STALE_UPDATE`.

### 3.2 Update Owner and Priority
- `PATCH /api/staff/tickets/:id/owner` and `PATCH /api/staff/tickets/:id/priority` keep their Lab 3 request/response and now also require `expectedUpdatedAt` (`400` when missing), return the new `updatedAt`, return `409 STALE_UPDATE` on mismatch (atomic, BR-20), and append an `OWNER_CHANGED` / `PRIORITY_CHANGED` Ticket event in the same transaction.
- Owner must be an active IT Staff or Administrator; otherwise `400` (BR-21).

### 3.3 Requester Indication
`POST /api/tickets/:id/indicate-resolved` is unchanged: it sets `indicatedResolvedAt` only and never changes the status (BR-18).

### 3.4 Queue and My Tickets Filter
`GET /api/staff/tickets` and `GET /api/tickets` accept `status=Active`, meaning `New`, `Open`, `In Progress`, `Waiting for Requester`, `Reopened` (BR-24, BR-28). `GET /api/tickets` (My Tickets, own Tickets only) also accepts `recent=updated` (`updatedAt >= windowStart`) and `recent=resolved` (status `Resolved` or `Closed` and `resolvedAt >= windowStart`); any other value is `400`. These filters call the same shared predicate and window function as the Requester dashboard metrics (BR-39), so list `total` equals the card value for the same snapshot. All other query validation from Lab 3 is unchanged.

---

## 4. Dashboards

Common rules (BR-22..27): counts are computed in the database; each list has at most 5 items; time windows use Asia/Bangkok. `windowStart` is `00:00` Asia/Bangkok six days before today, returned as ISO 8601 (UTC) so the client can display the window. Every metric returns `0` and every list `[]` when nothing matches.

### 4.1 Requester Dashboard
- **Endpoint**: `GET /api/dashboard/requester` — **Access**: Requester only (IT Staff/Administrator `403`; no token `401`)
- **Scope**: only Tickets with `requesterId` equal to the authenticated user.
- **Success (200)**:
  ```json
  {
    "generatedAt": "2026-10-29T04:00:00.000Z",
    "windowStart": "2026-10-22T17:00:00.000Z",
    "metrics": {
      "openTickets": 3,
      "waitingForRequester": 1,
      "recentlyUpdated": 4,
      "recentlyResolved": 2
    },
    "attention": [ { "id": 7, "ticketNumber": "TKT-0007", "summary": "VPN drops", "status": "Waiting for Requester", "updatedAt": "..." } ],
    "recentTickets": [ { "id": 9, "ticketNumber": "TKT-0009", "summary": "Printer jam", "status": "In Progress", "updatedAt": "..." } ]
  }
  ```

| Metric | Definition (own Tickets only) | Drill-down (client route) |
| :--- | :--- | :--- |
| `openTickets` | status in Active set | My Tickets with `status=Active` |
| `waitingForRequester` | status = `Waiting for Requester` | My Tickets with `status=Waiting for Requester` |
| `recentlyUpdated` | `updatedAt >= windowStart` (any status) | My Tickets with `recent=updated` |
| `recentlyResolved` | status in (`Resolved`, `Closed`) and `resolvedAt >= windowStart` | My Tickets with `recent=resolved` (includes a Ticket resolved and then closed in the window; excludes one resolved before it) |

Every Requester card therefore has an exact drill-down: the list `total` equals the card value for the same snapshot (AC-20). The window can move between loading the dashboard and clicking; the list is evaluated again at click time.

`attention` = Tickets with status `Waiting for Requester`, oldest `updatedAt` first, max 5. `recentTickets` = any status, `updatedAt` desc, max 5. Each item links to its Ticket Detail.

### 4.2 IT Staff Dashboard
- **Endpoint**: `GET /api/dashboard/staff` — **Access**: IT Staff, Administrator (Requester `403`)
- **Success (200)**:
  ```json
  {
    "generatedAt": "2026-10-29T04:00:00.000Z",
    "windowStart": "2026-10-22T17:00:00.000Z",
    "metrics": {
      "unassigned": 4,
      "myActive": 3,
      "urgent": 2,
      "reopened": 1,
      "resolvedAwaitingClosure": 5
    },
    "byStatus": { "New": 2, "Open": 3, "In Progress": 4, "Waiting for Requester": 1, "Resolved": 5, "Closed": 6, "Reopened": 1, "Cancelled": 1 },
    "byPriority": { "LOW": 1, "MEDIUM": 4, "HIGH": 3, "URGENT": 2 },
    "recentTickets": [ { "id": 9, "ticketNumber": "TKT-0009", "summary": "Printer jam", "status": "In Progress", "itPriority": "HIGH", "owner": { "id": 3, "name": "Sarah Connor" }, "updatedAt": "..." } ],
    "myRecentActions": [ { "id": 12, "ticketId": 7, "ticketNumber": "TKT-0007", "actionAt": "...", "description": "Replaced the faulty network cable...", "status": "Completed", "assignee": { "id": 4, "name": "James Gordon" }, "followUpRequired": true } ],
    "userCounts": { "requesters": 4, "itStaff": 3, "administrators": 1, "inactive": 2 }
  }
  ```
  `userCounts` is present only for Administrators. `owner` is `null` when unassigned.

| Metric | Definition | Drill-down (Ticket Queue filter) |
| :--- | :--- | :--- |
| `unassigned` | `ownerId` is null and status in Active set | `owner=unassigned&status=Active` |
| `myActive` | `ownerId` = current user and status in Active set | `owner=me&status=Active` |
| `urgent` | effective priority `URGENT` and status in Active set | `priority=URGENT&status=Active` |
| `reopened` | status = `Reopened` | `status=Reopened` |
| `resolvedAwaitingClosure` | status = `Resolved` | `status=Resolved` |
| `byStatus` | count of all Tickets per status (all 8 keys always present) | `status=<key>` |
| `byPriority` | Active Tickets per effective priority (all 4 keys always present) | `priority=<key>&status=Active` |

Effective priority = `itPriority` if set, otherwise `requestedPriority`. `recentTickets` = any status, `updatedAt` desc, max 5. `myRecentActions` = actions where the current user is the performer or the assignee, `actionAt` desc then `id` desc, max 5, `description` truncated to 120 characters; each item also carries `status` and the assignee name, so assigned and open work is visible. `userCounts.inactive` counts all users with `isActive=false`.

### 4.3 Dashboard Errors
`401` no/invalid token; `403` wrong role (body `{ "error": "Forbidden" }`, no data); `500` generic message. The UI shows retry for `500`.

---

## 5. Unchanged Endpoints
All Lab 2 and Lab 3 endpoints (authentication, Requester tickets and attachments, staff queue/detail, comments, internal notes, indicate-resolved, administrator user management) and `GET /api/health` keep their contract. `GET /api/staff/tickets/:id` additionally returns `resolvedAt` and `actionsTaken` is **not** embedded there; the client loads actions through section 2.2.

## 6. Endpoint Summary
| Method and path | Roles | Purpose |
| :--- | :--- | :--- |
| `GET /api/tickets/:id/actions` | Requester (own), IT Staff, Administrator | List Actions Taken (paginated) |
| `POST /api/staff/tickets/:id/actions` | IT Staff, Administrator | Create Action Taken with assignee and status |
| `PATCH /api/staff/tickets/:id/actions/:actionId` | IT Staff, Administrator | Edit, reassign, change status (atomic) |
| `GET /api/staff/tickets/:id/actions/:actionId/revisions` | IT Staff, Administrator | Action revision history |
| `GET /api/staff/tickets/:id/events` | IT Staff, Administrator | Ticket status/owner/priority history |
| `PATCH /api/staff/tickets/:id/status` | IT Staff, Administrator | Transition with matrix, gate, conflict |
| `PATCH /api/staff/tickets/:id/owner` / `priority` | IT Staff, Administrator | Now with `expectedUpdatedAt` |
| `GET /api/dashboard/requester` | Requester | Requester metrics |
| `GET /api/dashboard/staff` | IT Staff, Administrator | Staff metrics (+ `userCounts` for Administrator) |
