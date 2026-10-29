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
| `409` | Stale update, concurrent change, or Ticket is `Closed`/`Cancelled` |
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
| `RESOLUTION_REQUIRES_ACTION` | Moving a Ticket with no Actions Taken to `Resolved`. |

### 1.3 Concurrency Convention
Workflow writes may carry `expectedUpdatedAt` (ISO 8601). It must equal the `updatedAt` the client last received for the same record (the Ticket for status/owner/priority, the Action Taken for action edits). A mismatch returns `409 STALE_UPDATE` and changes nothing; the client should reload and let the user re-apply the change. Required for Action Taken edits; optional for Ticket status/owner/priority (omitting it keeps the Lab 3 behavior; the Lab 4 client always sends it).

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
  "followUpRequired": true,
  "followUpNote": "Check the cable again on Friday.",
  "attachmentNotes": "Photo of the old cable is in the shared folder 'Tickets/7'.",
  "createdAt": "2026-10-29T03:20:11.000Z",
  "updatedAt": "2026-10-29T03:20:11.000Z",
  "updatedBy": null
}
```
`updatedBy` is `{ "id", "name" }` once the action has been edited. `followUpNote` and `attachmentNotes` are `null` when empty.

### 2.2 List Actions Taken
- **Endpoint**: `GET /api/tickets/:id/actions` — **Access**: owning Requester, IT Staff, Administrator
- **Success (200)**: `{ "actions": [ <Action Taken>, ... ] }` ordered by `actionAt` desc, then `id` desc (BR-09). A Ticket with no actions returns `{ "actions": [] }`.
- **Errors**: `400` invalid id; `401`; `404` Ticket missing or owned by another Requester.

### 2.3 Create Action Taken
- **Endpoint**: `POST /api/staff/tickets/:id/actions` — **Access**: IT Staff, Administrator
- **Request**:
  ```json
  {
    "actionAt": "2026-10-29T03:15:00.000Z",
    "description": "Replaced the faulty network cable at desk 14B.",
    "result": "Link restored; ping stable for 10 minutes.",
    "followUpRequired": true,
    "followUpNote": "Check the cable again on Friday.",
    "attachmentNotes": "Photo of the old cable is in the shared folder 'Tickets/7'.",
    "clientRequestId": "6f1c9d8e-4b0a-4f7e-9a3b-2d5e8c1a7f10"
  }
  ```
- **Field rules** (BR-04..07, BR-13): `actionAt` optional (default now; not more than 5 minutes in the future; not earlier than the Ticket's `createdAt`). `description` required, <= 2,000 chars. `result` required, <= 1,000. `followUpRequired` optional boolean, default `false`. `followUpNote` required when `followUpRequired=true`, <= 1,000, ignored (stored `null`) when `false`. `attachmentNotes` optional, <= 500. `clientRequestId` optional UUID. All text is trimmed plain text. `performedById`, `performedBy`, and `createdAt` in the body are ignored.
- **Success (201)**: `{ "action": <Action Taken> }`. The Ticket's `updatedAt` is also updated (BR-11).
- **Replay (200)**: same `clientRequestId` on the same Ticket returns `{ "action": <existing>, "replayed": true }` without creating a second row (AC-08).
- **Errors**: `400` validation (`details` names each invalid field); `401`; `403` Requester; `404` Ticket missing; `409 TICKET_TERMINAL`.

### 2.4 Edit Action Taken
- **Endpoint**: `PATCH /api/staff/tickets/:id/actions/:actionId` — **Access**: IT Staff, Administrator
- **Request**: any subset of `actionAt`, `description`, `result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, plus required `expectedUpdatedAt`. Validation is applied to the merged result (for example, setting `followUpRequired=true` without any note is rejected).
- **Success (200)**: `{ "action": <Action Taken> }` with new `updatedAt` and `updatedBy`. `performedBy` and `createdAt` never change (BR-03).
- **Errors**: `400` validation or missing `expectedUpdatedAt`; `401`; `403` Requester; `404` Ticket or action missing, or action belongs to a different Ticket; `409 STALE_UPDATE` (body includes `currentUpdatedAt`); `409 TICKET_TERMINAL`.

### 2.5 Delete
No delete endpoint exists (BR-08). `DELETE /api/staff/tickets/:id/actions/:actionId` returns `404`.

---

## 3. Ticket Workflow Changes

### 3.1 Update Ticket Status
- **Endpoint**: `PATCH /api/staff/tickets/:id/status` — **Access**: IT Staff, Administrator (Requester `403`)
- **Request**: `{ "status": "Resolved", "expectedUpdatedAt": "2026-10-29T03:20:11.000Z" }` (`expectedUpdatedAt` optional)
- **Processing order**: validate Ticket exists -> stale check -> transition matrix (specification section 5) -> resolution gate (BR-16) -> compare-and-set write (BR-20).
- **Side effects**: entering `Resolved` sets `resolvedAt`; entering `Reopened` clears `resolvedAt` and `indicatedResolvedAt` (BR-17).
- **Success (200)**: the updated Ticket as in Lab 3, plus `updatedAt`, `resolvedAt`, `indicatedResolvedAt`, and `status` as the display string (for example `"In Progress"`).
- **Errors**: `400 Invalid status transition from 'X' to 'Y'`; `400 RESOLUTION_REQUIRES_ACTION` ("Record at least one Action Taken before resolving this Ticket"); `401`; `403`; `404`; `409 STALE_UPDATE`.

### 3.2 Update Owner and Priority
- `PATCH /api/staff/tickets/:id/owner` and `PATCH /api/staff/tickets/:id/priority` keep their Lab 3 request/response and now also accept optional `expectedUpdatedAt`, return the new `updatedAt`, and return `409 STALE_UPDATE` on mismatch.
- Owner must be an active IT Staff or Administrator; otherwise `400` (BR-21).

### 3.3 Requester Indication
`POST /api/tickets/:id/indicate-resolved` is unchanged: it sets `indicatedResolvedAt` only and never changes the status (BR-18).

### 3.4 Queue and My Tickets Filter
`GET /api/staff/tickets` and `GET /api/tickets` accept `status=Active`, meaning `New`, `Open`, `In Progress`, `Waiting for Requester`, `Reopened` (BR-24, BR-28). All other query validation from Lab 3 (BR-28 of Lab 3) is unchanged.

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
| `recentlyUpdated` | `updatedAt >= windowStart` (any status) | My Tickets sorted by `updatedAt` desc (list is not filtered by date) |
| `recentlyResolved` | status in (`Resolved`, `Closed`) and `resolvedAt >= windowStart` | My Tickets with `status=Resolved` (list is not filtered by date) |

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
    "myRecentActions": [ { "id": 12, "ticketId": 7, "ticketNumber": "TKT-0007", "actionAt": "...", "description": "Replaced the faulty network cable...", "followUpRequired": true } ],
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

Effective priority = `itPriority` if set, otherwise `requestedPriority`. `recentTickets` = any status, `updatedAt` desc, max 5. `myRecentActions` = actions with `performedById` = current user, `actionAt` desc then `id` desc, max 5, `description` truncated to 120 characters. `userCounts.inactive` counts all users with `isActive=false`.

### 4.3 Dashboard Errors
`401` no/invalid token; `403` wrong role (body `{ "error": "Forbidden" }`, no data); `500` generic message. The UI shows retry for `500`.

---

## 5. Unchanged Endpoints
All Lab 2 and Lab 3 endpoints (authentication, Requester tickets and attachments, staff queue/detail, comments, internal notes, indicate-resolved, administrator user management) and `GET /api/health` keep their contract. `GET /api/staff/tickets/:id` additionally returns `resolvedAt` and `actionsTaken` is **not** embedded there; the client loads actions through section 2.2.

## 6. Endpoint Summary
| Method and path | Roles | Purpose |
| :--- | :--- | :--- |
| `GET /api/tickets/:id/actions` | Requester (own), IT Staff, Administrator | List Actions Taken |
| `POST /api/staff/tickets/:id/actions` | IT Staff, Administrator | Create Action Taken |
| `PATCH /api/staff/tickets/:id/actions/:actionId` | IT Staff, Administrator | Edit Action Taken |
| `PATCH /api/staff/tickets/:id/status` | IT Staff, Administrator | Transition with matrix, gate, conflict |
| `PATCH /api/staff/tickets/:id/owner` / `priority` | IT Staff, Administrator | Now with `expectedUpdatedAt` |
| `GET /api/dashboard/requester` | Requester | Requester metrics |
| `GET /api/dashboard/staff` | IT Staff, Administrator | Staff metrics (+ `userCounts` for Administrator) |
