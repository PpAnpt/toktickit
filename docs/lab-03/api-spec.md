# Lab 3 API Specification

## 1. General Principles
- **Base Path**: All endpoints are prefixed with `/api`. Unknown `/api` routes return `404 { "error": "Not found" }`.
- **Payload Format**: JSON (`application/json`). Attachment uploads use `multipart/form-data` with field `file`.
- **Error Format**: `{ "error": "Human-readable message" }`. Create-ticket validation errors also include `details: { field: message }`. Error messages never include stack traces, SQL, or internal ids of records the caller may not see.

### 1.1 Authentication and Session Decisions
| Topic | Decision |
| :--- | :--- |
| Credential check | Email (case-insensitive, trimmed) + password compared with a bcrypt hash (`bcryptjs`, 10 salt rounds). Plaintext passwords are never stored or returned. |
| Token | JWT (HS256) returned by login/change-password. Sent as `Authorization: Bearer <token>`. Payload contains only `sub` (user id) and `tv` (token version). |
| Storage | Client keeps the token in `localStorage` (local lab). No auth cookies are used, so CSRF does not apply; XSS risk is mitigated by rendering all user text as plain text. |
| Expiry | 8 hours. |
| Per-request check | The server loads the user on every request. Unknown user, `isActive=false`, or a token version that no longer matches → `401`. Role and `mustChangePassword` always come from the database. |
| Logout / revocation | `tokenVersion` is incremented on logout, password change, and admin password reset, which invalidates all earlier tokens for that user. |
| Secret | `JWT_SECRET` from `server/.env` (never committed). If unset, a random per-process secret is generated. |
| Password policy | 8–72 characters, at least one letter and one number, no leading/trailing spaces; applies to change-password and admin-set initial passwords. |

### 1.2 Status Codes
| Code | Meaning |
| :--- | :--- |
| `200` / `201` / `204` | Success / created / success with no body |
| `400` | Invalid input or invalid state transition |
| `401` | Missing, invalid, expired, or revoked token; wrong credentials; deactivated account at login |
| `403` | Authenticated but the role is not permitted, or `mustChangePassword=true` (body includes `"mustChangePassword": true`) |
| `404` | Record does not exist **or** belongs to another Requester (same response, so existence is not revealed) |
| `409` | Conflict (duplicate email, resolution already indicated) |
| `500` | Unexpected error with a generic message |

---

## 2. Authentication APIs

### 2.1 User Login
- **Endpoint**: `POST /api/auth/login` — **Access**: Public
- **Request**: `{ "email": "sarah.connor@example.com", "password": "Password123!" }`
- **Success (200)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": { "id": 5, "email": "sarah.connor@example.com", "name": "Sarah Connor", "role": "IT_STAFF", "mustChangePassword": false }
  }
  ```
- **Failures**: `400` email/password missing or not strings · `401 "Invalid email or password"` (wrong password or unknown email — identical) · `401 "Account is deactivated. Please contact an administrator."` (only after a correct password).

### 2.2 User Logout
- **Endpoint**: `POST /api/auth/logout` — **Access**: Authenticated
- **Success (200)**: `{ "message": "Logged out successfully" }`. All of the user's previously issued tokens now return `401`.
- **Failure**: `401` without a valid token.

### 2.3 Current User
- **Endpoint**: `GET /api/auth/me` — **Access**: Authenticated (allowed while `mustChangePassword=true`)
- **Success (200)**: `{ "id": 5, "email": "...", "name": "Sarah Connor", "role": "IT_STAFF", "mustChangePassword": false }`
- **Failure**: `401`.

### 2.4 Change Password (mandatory first login or voluntary)
- **Endpoint**: `POST /api/auth/change-password` — **Access**: Authenticated (allowed while `mustChangePassword=true`)
- **Request**: `{ "currentPassword": "Initial123!", "newPassword": "NewSecurePassword456!" }`
- **Success (200)**:
  ```json
  { "message": "Password changed successfully", "mustChangePassword": false, "token": "<fresh JWT>", "user": { "...": "safe user" } }
  ```
  The old token is revoked; the client must store the returned token.
- **Failures**: `400` missing fields, policy violation, same as current password, or current password incorrect · `401`.

---

## 3. IT Staff Ticket Queue & Operations APIs
All `/api/staff/*` endpoints require an active `IT_STAFF` or `ADMINISTRATOR` who has completed any mandatory password change (`401` / `403` otherwise).

### 3.1 Ticket Queue
- **Endpoint**: `GET /api/staff/tickets`
- **Query Parameters**:
  | Parameter | Allowed values | Default | Invalid value |
  | :--- | :--- | :--- | :--- |
  | `page` | integer ≥ 1 | 1 | clamped to 1 |
  | `limit` | integer 1–50 | 10 | clamped |
  | `search` | text ≤ 100 chars; matches ticket number, summary, requester name (case-insensitive) | — | `400` if longer |
  | `status` | `All`, `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled` | All | `400` |
  | `priority` | `All`, `LOW`, `MEDIUM`, `HIGH`, `URGENT` (matches effective IT Priority) | All | `400` |
  | `owner` | `All`, `unassigned`, `me`, or a numeric user id | All | `400` |
  | `sortBy` | `createdAt`, `updatedAt`, `ticketNumber`, `status`, `priority` | `createdAt` | `400` |
  | `sortOrder` | `asc`, `desc` | `desc` | `400` |
  Filters combine with AND. Ties are broken by id for stable pagination.
- **Success (200)**:
  ```json
  {
    "tickets": [
      {
        "id": 12, "ticketNumber": "TKT-2026-000012", "summary": "VPN connection dropping repeatedly",
        "status": "In Progress", "requestedPriority": "HIGH", "itPriority": "URGENT",
        "requester": { "id": 1, "name": "David Lee", "email": "david.lee@example.com" },
        "owner": { "id": 5, "name": "Sarah Connor", "email": "sarah.connor@example.com" },
        "category": { "id": 1, "name": "Network" }, "relatedSystem": { "id": 3, "name": "VPN" },
        "createdAt": "2026-09-12T10:30:00.000Z", "updatedAt": "2026-09-13T08:00:00.000Z"
      }
    ],
    "pagination": { "total": 45, "page": 1, "limit": 10, "totalPages": 5 }
  }
  ```

### 3.2 Staff Members (for owner filter and assignment)
- **Endpoint**: `GET /api/staff/members` → `200 [{ "id", "name", "email", "role" }]` (active IT Staff and Administrators).

### 3.3 Staff Ticket Detail
- **Endpoint**: `GET /api/staff/tickets/:id`
- **Success (200)**: Ticket with requester, owner, category, related system, active attachments, public comments, internal notes, and `indicatedResolvedAt`.
- **Failures**: `400` non-numeric id · `404` not found.

### 3.4 Claim / Assign / Unassign Owner
- **Endpoint**: `PATCH /api/staff/tickets/:id/owner` — **Request**: `{ "ownerId": 5 }` (`null` to unassign)
- **Rules**: Owner must be an active IT Staff or Administrator. Assigning an owner to a `New` ticket moves it to `Open`.
- **Failures**: `400` invalid or ineligible owner · `404`.

### 3.5 Update IT Priority
- **Endpoint**: `PATCH /api/staff/tickets/:id/priority` — **Request**: `{ "itPriority": "URGENT" }`
- **Success (200)**: Updated ticket; `requestedPriority` is unchanged. **Failures**: `400` invalid value · `404`.

### 3.6 Update Status (workflow transition)
- **Endpoint**: `PATCH /api/staff/tickets/:id/status` — **Request**: `{ "status": "In Progress" }`
- **Rules**: Only transitions in the specification's Status Transition Matrix (BR-13) are allowed. `Closed` and `Cancelled` are terminal.
- **Failures**: `400 "Invalid status transition from 'New' to 'Closed'"` · `404`.

---

## 4. Comments, Internal Notes & Resolution Indication
Requires authentication and a completed password change. For Requesters, tickets they do not own return `404` (BR-25).

### 4.1 Public Comments
- `GET /api/tickets/:id/comments` → `200 [ { "id", "ticketId", "content", "createdAt", "author": { "id", "name", "role" } } ]` (oldest first)
- `POST /api/tickets/:id/comments` with `{ "content": "The issue is still occurring." }` → `201` created comment
- **Access**: owning Requester, IT Staff, Administrator.
- **Failures**: `400` empty/whitespace or over 2,000 characters · `404` missing or not the Requester's ticket.
- Author and time are set by the server. Comments are append-only (no edit or delete). Content is stored as plain text.

### 4.2 Internal Notes
- `GET /api/tickets/:id/internal-notes` → `200` list · `POST /api/tickets/:id/internal-notes` with `{ "content": "..." }` → `201`
- **Access**: IT Staff and Administrator only. Requesters receive `403` with no note data.
- Same validation and append-only rules as comments.

### 4.3 Requester Indicates Problem Resolved
- **Endpoint**: `POST /api/tickets/:id/indicate-resolved` — **Access**: owning Requester only (`403` for IT Staff/Administrator)
- **Success (200)**: `{ "message": "Indicated problem appears resolved", "indicatedResolvedAt": "2026-09-13T08:45:00.000Z" }`. The ticket status does not change.
- **Failures**: `400` ticket already Resolved/Closed/Cancelled · `404` not the Requester's ticket · `409` already indicated.

---

## 5. Administrator User Management APIs
All `/api/admin/*` endpoints require an active `ADMINISTRATOR` (`403` for other roles).

### 5.1 List Users
- `GET /api/admin/users?search=<name or email>&role=<REQUESTER|IT_STAFF|ADMINISTRATOR|All>`
- **Success (200)**: `[ { "id", "name", "email", "role", "isActive", "mustChangePassword", "createdAt", "updatedAt" } ]` ordered by id. No pagination (not required in Lab 3).

### 5.2 Create User
- `POST /api/admin/users` with `{ "name": "Alex Mercer", "email": "alex.mercer@example.com", "role": "IT_STAFF", "initialPassword": "InitialPass123!" }`
- **Success (201)**: created user (no password data); `isActive=true`, `mustChangePassword=true`.
- **Failures**: `400` missing name, name > 100 chars, invalid email, invalid role, or password policy violation · `409` email already exists (case-insensitive).

### 5.3 Edit User
- `PATCH /api/admin/users/:id` with any of `{ "name", "email", "role", "isActive" }`
- **Failures**: `400` validation error, deactivating own account (BR-19), or deactivating/demoting the last active Administrator (BR-20) · `404` · `409` duplicate email.
- Deactivation and role changes apply to the user's next request.

### 5.4 Set New Initial Password
- `POST /api/admin/users/:id/reset-password` with `{ "initialPassword": "NewTempPassword123!" }`
- **Success (200)**: `{ "message": "Initial password set. User must change password at next login." }`. Sets `mustChangePassword=true` and revokes the user's existing tokens.
- **Failures**: `400` password policy violation · `404`.

---

## 6. Requester Ticket APIs (Lab 2 continuation)
All require an authenticated `REQUESTER` with a completed password change, unless noted. The requester is always taken from the token; `X-Requester-Id` headers and `requesterId` body fields are ignored.

| Endpoint | Purpose | Notes |
| :--- | :--- | :--- |
| `GET /api/categories`, `GET /api/related-systems` | Reference data for the form | Public, read-only |
| `POST /api/tickets` | Create ticket | `400` with `details` for missing/invalid summary (≤200), description (≤5000), category, related system, or priority. `itPriority` starts equal to `requestedPriority`. |
| `GET /api/tickets` | My Tickets (search, `categoryId`, `status`, `sortBy`, `sortOrder`, `page`, `limit`) | Only the caller's tickets. `400` for invalid `status`, `categoryId`, or `sortBy`. |
| `GET /api/tickets/:id` | Ticket detail | `404` if missing or owned by someone else |
| `POST /api/tickets/:id/attachments` | Upload (JPG, PNG, WEBP, PDF; ≤ 5 MB; ≤ 5 active per ticket) | Owner only; `404` otherwise |
| `DELETE /api/tickets/:id/attachments/:attachmentId` | Soft-remove with `{ "reason": "..." }` (required, ≤ 500 chars) | Owner only → `204` |
| `GET /api/tickets/:id/attachments/:attachmentId/download` | Download | Owner, IT Staff, or Administrator; removed files → `404` |
