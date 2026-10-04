# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal
Deliver secure authentication, role-based authorization (Requester, IT Staff, Administrator), mandatory first-login password change, operational IT Staff ticket management (Queue, Detail, Ownership, IT Priority, Status Transitions, Public Comments, Internal Notes), and minimalist Administrator user management while maintaining full backward compatibility with Lab 2 Requester ticketing features.

## 2. Stakeholder Request Interpretation
The system must transition from the temporary Development Requester selector to a real authentication system with email and password credentials. Administrator users need a minimalist User Management screen to view accounts, search/filter, create accounts with one assigned role, edit basic information, toggle active status, and issue initial passwords that force a change upon first login. Requesters must continue using all Lab 2 ticket features with identity strictly resolved from the authenticated session. IT Staff require a shared Ticket Queue and Ticket Detail screen to claim or reassign tickets, adjust IT Priority, perform permitted status changes, communicate via Public Comments, and record private Internal Notes. All backend APIs must enforce role and ownership security independently of client UI controls, adhering strictly to the Zen Green design system.

## 3. Scope

### Included
- Real authentication with email/password, session/token management, current-user endpoint, and logout.
- Mandatory password change on first login or after administrator password reset.
- Role-based authorization for three distinct roles: Requester, IT Staff, Administrator.
- Data migration preserving existing Lab 2 tickets, categories, related systems, and attachments.
- IT Staff Ticket Queue with search, filtering (status, priority, owner), sorting, and pagination.
- IT Staff Ticket Detail: Claiming/reassigning tickets, setting IT Priority, workflow status transitions.
- Two-tier discussion thread: Public Comments (visible to all roles) and Internal Notes (restricted to IT Staff and Admin).
- Requester capability to indicate that a problem appears resolved.
- Minimalist Administrator User Management (list, search, role filter, create, edit, activate/deactivate, set initial password, safety rules).
- Automated test suites (Unit, API, UI Component, and Playwright E2E).

### Explicitly Excluded
- Email delivery for invitations, password resets, or notifications.
- Self-registration / public sign-up.
- Actions Taken by IT Staff (deferred to Lab 4).
- Formal SLA calculations, automated escalation, and KPI dashboards.
- Multi-tenancy, departments, and extended profile management (avatars, bio).
- Multiple roles assigned to a single user.
- Hard user deletion, bulk user operations, import/export, and account audit history.
- Multi-column sorting and complex multi-filter chaining for the user list.

## 4. Functional Requirements

- **FR-01**: The system shall authenticate users using email and password credentials.
- **FR-02**: The system shall require users with `mustChangePassword=true` to submit a new password before granting access to application features.
- **FR-03**: The system shall enforce role-based access control (RBAC) across navigation and backend endpoints for Requester, IT Staff, and Administrator.
- **FR-04**: The system shall automatically derive ticket ownership for Requester operations from the authenticated identity, ignoring client-supplied IDs.
- **FR-05**: The system shall provide an IT Staff Ticket Queue supporting keyword search, status/priority/owner filtering, sorting, and pagination.
- **FR-06**: The system shall allow IT Staff and Administrators to open Ticket Detail, claim ownership, or reassign the ticket to another active IT Staff/Admin.
- **FR-07**: The system shall allow IT Staff and Administrators to modify IT Priority independently of the Requester's original Requested Priority.
- **FR-08**: The system shall permit ticket status updates strictly according to the defined lifecycle state machine.
- **FR-09**: The system shall support append-only Public Comments visible to Requesters, IT Staff, and Administrators.
- **FR-10**: The system shall support append-only Internal Notes accessible solely by IT Staff and Administrators.
- **FR-11**: The system shall allow Requesters to indicate that their reported issue appears resolved without formally closing the ticket.
- **FR-12**: The system shall provide an Administrator User Management interface to list, search, filter, create, edit, activate/deactivate accounts, and issue new initial passwords.
- **FR-13**: The system shall let any signed-in user log out and change their own password voluntarily; logout invalidates the session on the server.
- **FR-14**: The system shall show each role only its permitted navigation: Requester → Create Ticket, My Tickets; IT Staff → Ticket Queue; Administrator → User Management, Ticket Queue.

## 5. Business Rules

### Authentication & Account Rules
- **BR-01**: Only active users (`isActive=true`) with valid credentials may authenticate.
- **BR-02**: Users flagged with `mustChangePassword=true` cannot access normal application screens or APIs until a valid new password is saved.
- **BR-03**: Passwords must be securely hashed using bcrypt prior to database persistence; plaintext passwords must never be stored or returned.
- **BR-04**: Email addresses must be unique across all user accounts (case-insensitive check).
- **BR-05**: Session tokens must be invalidated upon logout; subsequent requests with the old token must return 401 Unauthorized.
- **BR-22**: Passwords (self-chosen or set by an Administrator) must be 8–72 characters, contain at least one letter and one number, and not start or end with spaces. A new password must differ from the current one.
- **BR-23**: Changing a password, an Administrator setting a new initial password, or logging out revokes all previously issued tokens for that user. Deactivation and role changes take effect on the user's next request (the server re-reads the user on every request).
- **BR-24**: Invalid credentials and unknown emails return the same generic message. The "account deactivated" message is only shown after a correct password, so account status is not disclosed to guessers.

### Ownership & Authorization Rules
- **BR-06**: The authenticated user identity, not any client-supplied requester ID, determines ownership of Requester operations.
- **BR-07**: A Requester may only view and manage tickets and attachments that they own.
- **BR-08**: An IT Staff or Administrator user may view all tickets in the queue and view any ticket detail.
- **BR-09**: Only active IT Staff or Administrator users may be assigned as a ticket's primary owner.
- **BR-25**: When a Requester requests another Requester's ticket, attachment, or comments, the API returns the same 404 Not Found as for a missing record, so it never reveals that the record exists. Role-restricted endpoints (e.g., Internal Notes, staff queue) return 403 Forbidden without any data.
- **BR-26**: The client never supplies identity. `X-Requester-Id` headers and `requesterId` body fields are ignored; requests without a valid bearer token return 401.
- **BR-27**: Creating tickets and managing own attachments are Requester operations. IT Staff and Administrators work on tickets through the staff endpoints and may download (not upload or remove) ticket attachments.

### Role Authorization Matrix
| Operation / Resource | Requester | IT Staff | Administrator | Notes |
| :--- | :---: | :---: | :---: | :--- |
| **Authenticate (Login/Logout/Me)** | Allow | Allow | Allow | Must be active user |
| **Change Password (First Login/Self)** | Allow | Allow | Allow | Required if `mustChangePassword=true` |
| **Create Ticket** | Allow | **Deny (403)** | **Deny (403)** | Requester derived from authenticated session |
| **View Owned Tickets (My Tickets / Detail)** | Allow (Own only; others → 404) | **Deny (403)** | **Deny (403)** | Lab 2 Requester view |
| **Upload / Soft-remove Attachment** | Allow (Own only; others → 404) | **Deny (403)** | **Deny (403)** | Removal requires a reason |
| **Download Attachment** | Allow (Own only; others → 404) | Allow | Allow | Needed for Staff Ticket Detail |
| **View Staff Ticket Queue** | **Deny (403)** | Allow | Allow | Staff operational queue |
| **View Staff Ticket Detail** | **Deny (403)** | Allow | Allow | Full staff operational detail |
| **Claim / Reassign Ticket Owner** | **Deny (403)** | Allow | Allow | Owner must be active Staff or Admin |
| **Update IT Priority** | **Deny (403)** | Allow | Allow | Requested Priority remains unchanged |
| **Update Ticket Status** | **Deny (403)** | Allow | Allow | Follows permitted transition matrix |
| **Post / View Public Comments** | Allow (Own only; others → 404) | Allow | Allow | Visible to all authorized parties |
| **Post / View Internal Notes** | **Deny (403)** | Allow | Allow | Confidential operational notes |
| **Indicate Problem Resolved** | Allow (Own only) | **Deny (403)** | **Deny (403)** | Requester flag; does not change status |
| **Admin User Management (CRUD)** | **Deny (403)** | **Deny (403)** | Allow | User list, create, edit, deactivate |
| **Admin Reset User Password** | **Deny (403)** | **Deny (403)** | Allow | Sets `mustChangePassword=true` |

### Ticket Status Transition Matrix
| Current Status | Permitted Next Statuses | Permitted Roles | Confirmation / Rules |
| :--- | :--- | :--- | :--- |
| **New** | `Open`, `Cancelled` | IT Staff, Administrator | Auto-moves to Open when claimed |
| **Open** | `In Progress`, `Waiting for Requester`, `Resolved`, `Cancelled` | IT Staff, Administrator | Standard staff triage |
| **In Progress** | `Waiting for Requester`, `Resolved`, `Cancelled` | IT Staff, Administrator | Work actively being performed |
| **Waiting for Requester** | `In Progress`, `Resolved`, `Cancelled` | IT Staff, Administrator | Awaiting user clarification |
| **Resolved** | `Closed`, `Reopened` | IT Staff, Administrator | Formal resolution by staff |
| **Reopened** | `In Progress`, `Resolved`, `Cancelled` | IT Staff, Administrator | Issue recurred or unresolved |
| **Closed** | *(None - Terminal State)* | N/A | Ticket lifecycle complete |
| **Cancelled** | *(None - Terminal State)* | N/A | Ticket cancelled |

### Ticket Lifecycle, Priority & Workflow Rules
- **BR-10**: Requested Priority is submitted by the Requester at creation and remains immutable thereafter.
- **BR-11**: IT Priority initially defaults to the Requested Priority value and may subsequently be modified only by IT Staff or Administrator.
- **BR-12**: Valid ticket statuses are: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`.
- **BR-13**: Permitted status transitions strictly adhere to the Status Transition Matrix above. Invalid transitions must be rejected with 400 Bad Request.
- **BR-14**: A Requester may flag that an issue "appears resolved", but cannot directly transition a ticket to `Resolved` or `Closed`. Formal resolution is reserved for IT Staff or Admin. The flag can be set once (a repeat returns 409) and not on tickets already `Resolved`, `Closed`, or `Cancelled` (400).
- **BR-28**: Staff queue query parameters are validated. Unknown `status`, `priority`, `owner`, `sortBy`, or `sortOrder` values, or search text over 100 characters, return 400 with a message naming the parameter. `page` and `limit` are clamped (page ≥ 1, 1 ≤ limit ≤ 50).

### Comments & Internal Notes Rules
- **BR-15**: Public Comments are append-only and visible to Requesters (for owned tickets), IT Staff, and Administrators.
- **BR-16**: Internal Notes are append-only and visible exclusively to IT Staff and Administrators. Non-authorized access attempts must be rejected with 403 Forbidden.
- **BR-17**: Comments and notes must not be empty or whitespace-only, with a maximum length of 2,000 characters (trimmed). Content is stored as plain text and rendered as text by the client (never as HTML), so it cannot inject markup or scripts. Requesters cannot post on `Closed` or `Cancelled` tickets in the UI.

### Administrator Safety Rules
- **BR-18**: Administrators manage accounts through deactivation (`isActive=false`); hard deletion of user accounts is prohibited.
- **BR-19**: An Administrator cannot deactivate their own account.
- **BR-20**: The system must prevent deactivating or reassigning the role of the last remaining active Administrator.
- **BR-21**: Setting a new initial password by an Administrator immediately sets `mustChangePassword=true` on the target account and signs that user out of existing sessions.
- **BR-29**: User email addresses must be valid (`name@domain.tld`, max 254 characters); names are required and at most 100 characters. Role must be exactly one of `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.

## 6. UI Specification Summary
- **Design Language**: Zen Green Theme (Primary: `#006B3C`, Secondary: `#0B7A46`, Pale Green: `#EAF6EF`, Background: `#F5F7F6`, Text: `#1A2F25`).
- **Application Shell**: Displays TokTickIT branding, the authenticated user's name and role badge (on all viewports), a **Change Password** action, and a **Logout** button. Role-based navigation renders only destinations authorized for the active user (FR-14). When the server rejects the session (expired or revoked), the user returns to Login with a notice.
- **Login Screen**: Clean, centered Zen Green card with email and password inputs, busy state, validation feedback, and clear error alerts for invalid credentials or inactive accounts.
- **Change Password Screen**: On first login, a mandatory dialog replaces the whole application (no navigation or data loads) until a valid password is saved. The same dialog, with a Cancel button, is used for a voluntary change.
- **Requester Ticket Detail**: Lab 2 details and attachments plus a Public Comments thread and a "My Problem Appears Resolved" action. Internal Notes are never shown.
- **IT Staff Ticket Queue**: Responsive data table / card view featuring search input, status/priority/owner filter dropdowns, sortable headers, pagination controls, and status/priority badges.
- **IT Staff Ticket Detail**: Split-view layout displaying ticket metadata, requester details, ownership claim/reassign controls, IT priority picker, status transition actions, attachment list, and dual-tab discussion feed (Public Comments vs. Internal Notes).
- **User Management Screen**: Administrator table listing Name, Email, Role, Status badge, and Edit button. Includes Search, Role filter, "Create User" modal, "Edit User" modal, and "Set Initial Password" action with safety prompts.
- **Responsive Adaptability**: Fully responsive across Desktop (>=992px), Tablet (768px-991px), and Mobile (<768px).

## 7. Data Changes
- **Updated `User` Model**:
  - `id`: Int (Primary Key, autoincrement)
  - `email`: String (Unique, indexed)
  - `passwordHash`: String
  - `name`: String
  - `role`: Enum (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
  - `isActive`: Boolean (default: true)
  - `mustChangePassword`: Boolean (default: false)
  - `tokenVersion`: Int (default: 0) — incremented on logout, password change, and admin password reset to revoke issued tokens
  - `createdAt`, `updatedAt`: DateTime
- **Updated `Ticket` Model**:
  - `requesterId`: Foreign Key referencing `User(id)`
  - `ownerId`: Foreign Key referencing `User(id)`, nullable
  - `itPriority`: Enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), defaults to requestedPriority
  - `indicatedResolvedAt`: DateTime, nullable
- **New `PublicComment` Model**:
  - `id`: Int (PK), `ticketId`: Int (FK), `authorId`: Int (FK to `User`), `content`: Text, `createdAt`: DateTime
- **New `InternalNote` Model**:
  - `id`: Int (PK), `ticketId`: Int (FK), `authorId`: Int (FK to `User`), `content`: Text, `createdAt`: DateTime
- **Indexes**: `User.email` (unique), `Ticket.requesterId`, `Ticket.ownerId`, `Ticket.status`, `Attachment.ticketId`, `PublicComment.ticketId`, `InternalNote.ticketId`.
- **Data Migration** (`server/prisma/migrations/20260930120000_lab3_users_roles_workflow/migration.sql`):
  - The Lab 2 `RequesterUser` table is **renamed** to `User` (ids are kept), so every existing `Ticket.requesterId` still points at the same person.
  - Migrated Lab 2 requesters get role `REQUESTER`, the documented local-lab initial password `Welcome123!` (stored only as a bcrypt hash), and `mustChangePassword=true`, so they choose their own password at first login.
  - `TicketPriority` gains `URGENT`. `TicketStatus` becomes the 8 Lab 3 statuses; the Lab 2 value `Pending` maps to `In Progress`.
  - New ticket columns: `ownerId` (nullable, unassigned), `itPriority` (backfilled from `requestedPriority`), `indicatedResolvedAt`. `Attachment.removalReason` is added.
  - New `PublicComment` and `InternalNote` tables.
  - Verified by applying the Lab 1 and Lab 2 migrations to an empty database, inserting Lab 2 data, applying the Lab 3 migration, and confirming preserved rows plus an empty `prisma migrate diff` against `schema.prisma` (MIG-01 in tests.md).
- **Client-side migration**: The Development Requester selector, its `currentRequesterId` state, the `X-Requester-Id` header, and the `/api/requesters` endpoint are removed. The client sends only `Authorization: Bearer <token>`.
- **Idempotent Seed** (`npx prisma db seed`, safe to re-run: users are upserted by email, tickets are created only if their number does not exist):
  - 4 active Requesters, 1 inactive Requester; 3 active IT Staff, 1 inactive IT Staff; 1 active Administrator. Seeding resets these accounts to the documented passwords below.
  - 16 realistic tickets across 4 requesters, all 8 statuses, all 4 priorities, assigned (IT Staff and Administrator) and unassigned, with example Public Comments, Internal Notes, and one resolution indication.

#### Planned Seed User Accounts
| Name | Email | Role | Status | Must Change Password | Default Initial Password |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **David Lee** | `david.lee@example.com` | `REQUESTER` | Active | `false` | `Password123!` |
| **Jennifer Anderson** | `jennifer.anderson@example.com` | `REQUESTER` | Active | `false` | `Password123!` |
| **Michael Chang** | `michael.chang@example.com` | `REQUESTER` | Active | `false` | `Password123!` |
| **Emily Watson** | `emily.watson@example.com` | `REQUESTER` | Active | `true` (Test 1st login) | `Initial123!` |
| **Robert Taylor** | `robert.taylor@example.com` | `REQUESTER` | Inactive | `false` | `Password123!` |
| **Sarah Connor** | `sarah.connor@example.com` | `IT_STAFF` | Active | `false` | `Password123!` |
| **James Gordon** | `james.gordon@example.com` | `IT_STAFF` | Active | `false` | `Password123!` |
| **Elena Rostova** | `elena.rostova@example.com` | `IT_STAFF` | Active | `true` (Test 1st login) | `Initial123!` |
| **Marcus Wright** | `marcus.wright@example.com` | `IT_STAFF` | Inactive | `false` | `Password123!` |
| **Admin System** | `admin@example.com` | `ADMINISTRATOR` | Active | `false` | `Admin123!` |

## 8. API Contract Summary
Full request/response shapes and status codes are in `docs/lab-03/api-spec.md`. All protected endpoints use `Authorization: Bearer <JWT>` and distinguish 401 (not authenticated), 403 (role not permitted or password change required), 400 (invalid input), 404 (missing or not visible), 409 (conflict), and 500 (safe generic message).
- **Authentication**:
  - `POST /api/auth/login`: Authenticate with email and password.
  - `POST /api/auth/logout`: Revoke all of the user's tokens (requires auth).
  - `GET /api/auth/me`: Retrieve current authenticated user profile.
  - `POST /api/auth/change-password`: Set new password, clear `mustChangePassword`, revoke old tokens, and return a fresh token.
- **Requester Tickets (Lab 2 continuity, Requester only)**:
  - `POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id`
  - `POST /api/tickets/:id/attachments`, `DELETE /api/tickets/:id/attachments/:attachmentId`
  - `GET /api/tickets/:id/attachments/:attachmentId/download` (owner, IT Staff, Administrator)
- **IT Staff Queue & Operations**:
  - `GET /api/staff/tickets`: Paginated ticket query with search, filter, and sort params.
  - `GET /api/staff/tickets/:id`: Retrieve detailed ticket view for staff operations.
  - `PATCH /api/staff/tickets/:id/owner`: Claim or assign ticket owner.
  - `PATCH /api/staff/tickets/:id/priority`: Update IT Priority.
  - `PATCH /api/staff/tickets/:id/status`: Transition ticket status.
- **Comments & Notes**:
  - `GET /api/tickets/:id/comments`: Retrieve public comments.
  - `POST /api/tickets/:id/comments`: Post public comment.
  - `GET /api/tickets/:id/internal-notes`: Retrieve internal notes (IT Staff/Admin only; 403 for Requester).
  - `POST /api/tickets/:id/internal-notes`: Post internal note (IT Staff/Admin only).
  - `POST /api/tickets/:id/indicate-resolved`: Requester indicates resolution.
- **Administrator User Management**:
  - `GET /api/admin/users`: List users with search and role filter (Admin only).
  - `POST /api/admin/users`: Create user with single role and initial password.
  - `PATCH /api/admin/users/:id`: Edit user name, email, role, or active status.
  - `POST /api/admin/users/:id/reset-password`: Set initial password and require change.

## 9. Acceptance Criteria

- **AC-01 (Valid Authentication)**: Given an active user with valid email and password, when submitting login, then the system authenticates the user and returns their identity and role.
- **AC-02 (Invalid Credentials)**: Given incorrect password or non-existent email, when attempting login, then access is rejected with a safe error message without disclosing account existence.
- **AC-03 (Inactive Account Block)**: Given an inactive user account (`isActive=false`), when authenticating, then login fails with an inactive account notification.
- **AC-04 (Mandatory Password Change)**: Given a user with `mustChangePassword=true`, when login succeeds, then access to main application screens is blocked until a valid new password is submitted.
- **AC-05 (Session Termination)**: Given an authenticated session, when the user logs out, then session state is destroyed and subsequent protected requests return 401 Unauthorized.
- **AC-06 (Requester Context Resolution)**: Given an authenticated Requester, when performing ticket operations, then ticket ownership is strictly tied to the session identity, ignoring any client-provided `requesterId`.
- **AC-07 (Queue Role Authorization)**: Given an authenticated user, when opening the IT Staff Queue endpoint, then only IT Staff and Administrator users receive 200 OK; Requesters receive 403 Forbidden.
- **AC-08 (Queue Query & Filtering)**: Given tickets in the queue, when IT Staff filter by status, priority, or search keywords, then the returned list contains only matching tickets.
- **AC-09 (Queue Pagination & Sorting)**: Given more tickets than page limit, when navigating pages or toggling sort order, then the correct subset and metadata are returned.
- **AC-10 (Ticket Ownership Assignment)**: Given an open ticket, when an IT Staff member claims or reassigns the ticket, then the ticket's `ownerId` updates and reflects in the queue and detail views.
- **AC-11 (IT Priority Separation)**: Given a ticket with Requested Priority `LOW`, when IT Staff updates IT Priority to `HIGH`, then IT Priority becomes `HIGH` while Requested Priority remains `LOW`.
- **AC-12 (Permitted Status Transitions)**: Given a ticket in status `New`, when transitioning to `Open`, then the update succeeds; when transitioning to an invalid status like `Closed`, then 400 Bad Request is returned.
- **AC-13 (Public Comments)**: Given any authorized participant (Requester owner, Staff, Admin), when posting a public comment, then it appears in the ticket timeline for all roles.
- **AC-14 (Internal Notes Boundary)**: Given a Requester user, when requesting the internal notes endpoint, then access is denied with 403 Forbidden without leaking note content.
- **AC-15 (Requester Resolution Indication)**: Given a Requester viewing their ticket, when clicking "Indicate Problem Resolved", then the indication timestamp is recorded without moving the ticket to `Resolved` status.
- **AC-16 (Admin User Management Authorization)**: Given a non-Admin user, when accessing user management APIs or screens, then access is rejected with 403 Forbidden.
- **AC-17 (User Listing & Search)**: Given an Administrator, when viewing user management, then user accounts are listed and can be filtered by role or searched by keyword.
- **AC-18 (Create User & Duplicate Email Check)**: Given an Administrator creating a user with an already registered email, then creation is rejected with a duplicate email validation error.
- **AC-19 (Account Deactivation)**: Given an active user, when an Admin toggles active status to inactive, then the user cannot authenticate in future sessions; no user record is deleted.
- **AC-20 (Admin Self-Deactivation Prevention)**: Given an logged-in Administrator, when attempting to deactivate their own account, then the request is rejected with a validation error.
- **AC-21 (Last Active Admin Protection)**: Given only one active Administrator remaining in the system, when attempting to deactivate or reassign their role, then the operation is strictly prevented.
- **AC-22 (Admin Set Initial Password)**: Given an Administrator setting a new password for a user, then `mustChangePassword` is set to `true`, forcing the user to change password at next login.
- **AC-23 (Lab 2 Requester Regression)**: Given all Lab 3 changes, when executing Lab 2 ticket creation and attachment tests, then all previous capabilities work without regression.
- **AC-24 (Zen Green Responsive Compliance)**: Given Desktop, Tablet, and Mobile viewports, when loading all screens, then layouts render cleanly without horizontal scrolling, clipping, or visual overlapping.
- **AC-25 (Session Revocation)**: Given a user who changes their password, is given a new initial password, or is deactivated, when an older token is used, then the request returns 401; the fresh token returned by change-password works immediately (including for IT Staff opening the queue).
- **AC-26 (No Existence Disclosure)**: Given a Requester, when requesting another Requester's ticket, attachment, or comments, then the response is the same 404 as for a missing ticket and contains no ticket data.
- **AC-27 (Migration Preserves Lab 2 Data)**: Given a Lab 2 database, when the Lab 3 migration runs, then every Lab 2 requester, ticket, and attachment is preserved with correct ownership and the resulting schema matches `schema.prisma`.
- **AC-28 (Requester Public Comments)**: Given a Requester viewing their own ticket, when they post a Public Comment, then it appears in the thread with author, role, and time; Internal Notes are never shown.
- **AC-29 (Role Navigation)**: Given each role, when the application shell loads, then only that role's permitted navigation is shown (FR-14), and the matching APIs reject other roles (403).
- **AC-30 (Queue Invalid Parameters)**: Given an invalid staff queue parameter, when the queue is requested, then the API returns 400 naming the parameter instead of a server error.

## 10. Definition of Done
- Complete implementation of approved Functional Requirements (FR-01..14) and Business Rules (BR-01..29).
- Every Acceptance Criterion (AC-01..30) maps to at least one test in `tests.md`; automated tests pass. AC-24 (responsive layout) is verified by the documented visual checklist and screenshots.
- Database migration executes cleanly preserving all Lab 2 records, with idempotent seed script functioning reliably.
- No client-supplied identity is accepted anywhere; no secrets are committed (`JWT_SECRET` comes from `.env`).
- Unit, API integration, UI component, and Playwright E2E automated test suites pass 100% on the `main` branch.
- Conformance to Zen Green UI and responsive design verified across Desktop, Tablet, and Mobile devices with screenshots archived in `artifacts/lab-03/screenshots/`.
- Peer review completed with formal approvals documented in `docs/lab-03/reviewer.md`.
- AI collaboration prompts and reflections documented in `docs/lab-03/ai-use.md`.
- Final PDF submission compiled following strict "Answer Part 1" through "Answer Part 9" formatting.

## 11. Assumptions and Decisions
- **Session/Auth Mechanism**: Signed JWT (HS256) sent as `Authorization: Bearer <token>`, stored in `localStorage` for this local lab. The token only carries the user id and `tokenVersion`; role, active state, and `mustChangePassword` are re-read from the database on every request. Tokens expire after 8 hours.
- **Logout / Revocation**: Stateless JWTs cannot be deleted, so each user has a `tokenVersion`. Logout, password change, and admin password reset increment it, which invalidates every earlier token for that user (logout therefore signs the user out on all devices — acceptable for this lab).
- **CSRF**: No authentication cookies are used, so browsers never attach credentials automatically and CSRF does not apply. The trade-off is that a script injected into the page could read `localStorage`; this is mitigated by rendering all user content as text (React escaping, no `dangerouslySetInnerHTML`). A production system would prefer an HttpOnly, SameSite cookie with CSRF protection.
- **Secrets**: `JWT_SECRET` is read from `server/.env` (never committed; see `.env.example`). If it is missing, the server generates a random per-process secret, so no fallback secret exists in source control.
- **Password Hashing**: `bcryptjs` with salt rounds = 10. Passwords are limited to 72 characters because bcrypt ignores bytes beyond that.
- **Soft Deactivation**: Hard delete is disabled; `isActive` boolean flag controls authentication validity.
- **Indicate Resolved**: Stored as a timestamp field (`indicatedResolvedAt`) rather than a premature status change to preserve staff operational authority.
- **Role Separation**: IT Staff and Administrators do not use the Requester "Create Ticket" / "My Tickets" functions; Administrators may also work the Ticket Queue (FR-14).
- **Requested Priority options**: Requesters choose Low, Medium, or High in the form; `URGENT` is primarily an IT Priority value (the API accepts it for completeness).

## 12. Revision History
- **v1.0** (PR #18): Initial Sprint 3 contract, approved before implementation PRs #19–#23.
- **v1.1** (2026-09-30): Hardening revision after a requirements audit. Removed the leftover `X-Requester-Id` identity fallback; added server-side logout/revocation (BR-23), password policy (BR-22), non-disclosure 404s (BR-25), Requester-only ticket routes (BR-27), queue parameter validation (BR-28), the Lab 3 migration details, Requester Public Comments UI, role navigation (FR-13/14), and AC-25..30.
