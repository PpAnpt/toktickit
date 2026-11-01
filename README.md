# TokTickIT - IT Service Desk (Lab 4: Actions Taken, Ticket Workflow & Dashboards)

TokTickIT is a full-stack IT Service Desk application for internal technical support. This repository contains the **Lab 4 milestone**: IT Staff record **Actions Taken** on each Ticket with an append-only history, the Ticket lifecycle is enforced end to end (transition matrix, resolution gate, stale-update protection), every role lands on a concise **Dashboard** whose cards open the filtered list behind them, and the whole application was hardened (keyboard access, visible focus, safe errors, responsive layouts, performance smoke). It builds on Lab 3 (authentication, roles, IT Staff Ticket Queue, Public Comments and Internal Notes, Administrator user management) and Lab 2 (Requester ticketing).

---

## Key Features

### Lab 4: Actions Taken, Workflow, Dashboards & Hardening
- **Actions Taken** (IT Staff / Administrator): add, edit, reassign, start, complete and cancel actions with an assignee, a status (Planned, In Progress, Completed, Cancelled), a required Result when completing or cancelling, follow-up notes, idempotent create (no duplicate on double click or retry), pagination, and a read-only per-action revision history. Requesters see the list without controls.
- **Ticket workflow**: final transition matrix, a **resolution gate** (at least one Completed action and none Planned or In Progress), `resolvedAt` handling, cancelling a Ticket cancels its open actions, a Requester's "appears resolved" indication that never changes the status, and an append-only Ticket history (status, owner, priority).
- **Conflict safety**: status, owner, priority and action writes carry `expectedUpdatedAt`; the check and the write are one transaction, so parallel requests give one success and the rest `409`.
- **Dashboards**: Requester (Open, Waiting for You, Recently Updated, Recently Resolved) and IT Staff / Administrator (Unassigned, My Active, Urgent, Reopened, Resolved - Awaiting Closure, By status, By priority, Recent Tickets, My Recent Actions; Administrators also see account counts). All numbers are calculated by the database (Asia/Bangkok, last 7 days) and every card opens the same list with the same filter.
- **Hardening**: every role lands on its Dashboard, keyboard-operable cards and editors (Escape closes, focus returns), visible focus ring, safe generic 500 errors, no console errors, responsive at 1280 / 768 / 375 px.

### Lab 3: Authentication, Staff Operations & Administration
- **Authentication & sessions**
  - Email + password login (bcrypt hashes, JWT bearer tokens, 8-hour expiry).
  - Logout, password change, and administrator password resets revoke earlier tokens on the server. Deactivation and role changes apply on the user's next request.
  - Mandatory password change on first login or after an administrator sets a new initial password. Voluntary "Change Password" for every user.
  - Password policy: 8–72 characters, at least one letter and one number.
- **Role-based authorization** (enforced by the API, not just hidden in the UI)
  - Requester: Create Ticket, My Tickets, own attachments, Public Comments, "My Problem Appears Resolved".
  - IT Staff: Ticket Queue and Ticket Detail.
  - Administrator: User Management and Ticket Queue.
  - Other requesters' tickets return 404, so their existence is never revealed.
- **IT Staff Ticket Queue & workflow**
  - Search, filters (status, priority, owner), sorting, and pagination, with validated query parameters.
  - Claim / reassign / unassign, independent IT Priority (`LOW`–`URGENT`), and the status transition matrix: New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled.
- **Public Comments & Internal Notes**: append-only, 2,000-character limit, rendered as plain text. Internal Notes are visible only to IT Staff and Administrators.
- **Administrator User Management**: list, search by name/email, role filter, create with one role and an initial password, edit name/email/role/active state, set a new initial password, self-deactivation and last-active-administrator protection.

### Lab 2: Requester Ticketing Core
- Ticket submission with category, related system, requested priority, and up to 5 attachments (JPG, PNG, WEBP, PDF; 5 MB each).
- My Tickets with search, filters, sorting, and pagination; ticket detail with attachment download, upload, and soft-removal with a required reason.
- Zen Green design system, responsive on desktop, tablet, and mobile (card layouts on phones).

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Bootstrap 5, Zen Green theme tokens |
| **Backend** | Node.js, Express 5, TypeScript, Multer, bcryptjs, jsonwebtoken |
| **Database & ORM** | PostgreSQL 18, Prisma ORM 7 (`@prisma/adapter-pg`) |
| **Testing** | Vitest + Supertest (API), Vitest + React Testing Library (UI), Playwright (E2E and screenshots) |
| **Containerization** | Docker Compose (PostgreSQL) |

---

## Project Structure

```text
toktickit/
├── client/                         # React + Vite + TypeScript frontend
│   └── src/
│       ├── App.tsx                 # Application shell, role navigation, Requester screens
│       ├── api.ts                  # Authenticated API client (Bearer token)
│       ├── validation.ts           # Client-side mirrors of server validation rules
│       ├── components/             # Login, ChangePassword, StaffTicketQueue, StaffTicketDetail,
│       │                           # UserManagement, PublicComments, RoleBadge
│       └── tests/                  # Component tests (lab-03/ for Lab 3 screens)
├── server/                         # Express + TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma           # Data model
│   │   ├── migrations/             # Lab 1, Lab 2, and Lab 3 migrations
│   │   └── seed.ts                 # Idempotent local-development seed
│   ├── src/
│   │   ├── app.ts                  # Express app (routes mounted here)
│   │   ├── index.ts                # Starts the HTTP server
│   │   ├── middlewares/auth.ts     # Authentication, role, and password-change guards
│   │   ├── routes/                 # auth, tickets (Requester), ticket-interactions, staff, admin
│   │   └── utils/auth.ts           # Hashing, tokens, password policy
│   └── tests/                      # API tests (lab-01/, lab-02/, lab-03/) + test DB setup
├── e2e/                            # Playwright journeys (lab-02 regression, lab-03)
├── scripts/                        # Screenshot capture (Playwright)
├── artifacts/lab-03/screenshots/   # Desktop / tablet / mobile evidence
├── docs/lab-0{1,2,3}/              # Lab deliverables (specification, ui-spec, api-spec, tests, reviewer, ai-use)
├── docker-compose.yml              # Local PostgreSQL
└── playwright.config.ts            # E2E configuration (starts server and client)
```

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- Docker (for PostgreSQL) or a local PostgreSQL instance

### 1. Database
```bash
docker compose up -d
```
Starts PostgreSQL 18 on port `5434` (`postgres` / `password`, database `localdb`).

### 2. Backend (`server/`)
```bash
cd server
npm install
cp .env.example .env        # then set a long random JWT_SECRET
npx prisma migrate deploy   # applies the Lab 1 → Lab 2 → Lab 3 → Lab 4 migrations
npx prisma db seed          # idempotent; safe to run again (adds the Lab 4 Tickets and Actions Taken)
npm run dev                 # http://localhost:3000
```
`.env` is never committed. `JWT_SECRET` can be generated with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

**Upgrading an existing Lab 2 database:** `npx prisma migrate deploy` renames the Lab 2 `RequesterUser` table to `User` (keeping ids and ticket ownership), gives existing requesters the initial password `Welcome123!` with a forced change at first login, maps the Lab 2 status `Pending` to `In Progress`, and copies Requested Priority into IT Priority. See `docs/lab-03/specification.md` §7.

**Upgrading an existing Lab 3 database (Lab 4 migration):** `npx prisma migrate deploy` adds `ActionTaken`, `ActionTakenRevision`, `TicketEvent`, `Ticket.resolvedAt` (backfilled from `updatedAt` for Resolved/Closed Tickets), the dashboard indexes, and a database trigger that makes the two history tables insert-only. All foreign keys are `ON DELETE RESTRICT`. **Take a backup first**; the documented recovery is a restore of a `pg_dump -Fc` taken before the upgrade (`docs/lab-04/specification.md` §7, rehearsed by `server/tests/lab-04/migration.test.ts`).

### 3. Frontend (`client/`)
```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

---

## Running Automated Tests

```bash
npm --prefix server test    # unit, API, migration, seed, safe-error and performance-smoke tests (258)
npm --prefix client test    # UI component tests (128)
npm run test:e2e            # Playwright end-to-end tests (33); starts server and client
npm run screenshots         # Regenerates artifacts/lab-03/screenshots
npx playwright test --config scripts/screenshots-lab4.config.ts   # Regenerates artifacts/lab-04/screenshots
bash scripts/api-authorization-evidence.sh   # curl evidence of 401/403/404 rules (API must be running)
```
The API tests use a separate database (`localdb_test` by default, or `TEST_DATABASE_URL`), so they never add data to your development database. **Never run the Lab 4 tests or E2E against your development database**: they truncate the Actions Taken tables and create Tickets. The Playwright servers inherit `DATABASE_URL`, so run the E2E and screenshot scripts like this (after the server tests, which leave the test database without the seed):

```bash
export DATABASE_URL='postgresql://postgres:password@localhost:5434/localdb_test?schema=public'
(cd server && npx tsx prisma/seed.ts)
npm run test:e2e
```

The performance smoke test (`server/tests/lab-04/performance-smoke.api.test.ts`) generates 5,000 Tickets and 20,000 actions in a scratch database with a unique name, only while `DATABASE_URL` names a `_test` database, and drops only the database it created. Results are written to `artifacts/lab-04/performance/summary.json`.

## Demonstration (about 5 minutes)

1. Sign in as `david.lee@example.com`: the Requester Dashboard; open the **Recently Resolved** card and compare its number with the list.
2. Sign in as `sarah.connor@example.com`: the IT Staff Dashboard; open **Unassigned**, open a Ticket, add an action, try **Move to Resolved** (the gate explains why it is refused), complete the action, resolve, then reopen.
3. Open the same Ticket in a second browser as `james.gordon@example.com` and change the priority, then change the status in the first browser: the conflict message appears with **Reload**.
4. Sign in as `admin@example.com`: the same dashboard with the **Accounts** strip.

---

## Default Seed Accounts (local development only)

These credentials exist only in the local seed data. Do not reuse real passwords.

| Name | Email | Password | Role | Status / Note |
| :--- | :--- | :--- | :--- | :--- |
| David Lee | `david.lee@example.com` | `Password123!` | Requester | Active |
| Jennifer Anderson | `jennifer.anderson@example.com` | `Password123!` | Requester | Active |
| Michael Chang | `michael.chang@example.com` | `Password123!` | Requester | Active |
| Emily Watson | `emily.watson@example.com` | `Initial123!` | Requester | Active, must change password at first login |
| Robert Taylor | `robert.taylor@example.com` | `Password123!` | Requester | **Inactive** |
| Sarah Connor | `sarah.connor@example.com` | `Password123!` | IT Staff | Active |
| James Gordon | `james.gordon@example.com` | `Password123!` | IT Staff | Active |
| Elena Rostova | `elena.rostova@example.com` | `Initial123!` | IT Staff | Active, must change password at first login |
| Marcus Wright | `marcus.wright@example.com` | `Password123!` | IT Staff | **Inactive** |
| Admin System | `admin@example.com` | `Admin123!` | Administrator | Active |

Running the seed again resets these accounts to the passwords above. The seed also creates 18 sample tickets across all statuses and priorities, assigned and unassigned, with example Public Comments and Internal Notes.

---

## Documentation

- [Lab 4 Engineering Specification](docs/lab-04/specification.md)
- [Lab 4 UI Specification](docs/lab-04/ui-spec.md)
- [Lab 4 REST API Contract](docs/lab-04/api-spec.md)
- [Lab 4 Test Plan & Traceability](docs/lab-04/tests.md)
- [Lab 4 Peer Review](docs/lab-04/reviewer.md)
- [Lab 4 AI Use Reflection](docs/lab-04/ai-use.md)
- [Lab 4 Submission Report (Answer Part 1-9)](docs/lab-04/submission-report.md)
- [Lab 3 Engineering Specification](docs/lab-03/specification.md)
- [Lab 3 UI Specification](docs/lab-03/ui-spec.md)
- [Lab 3 REST API Contract](docs/lab-03/api-spec.md)
- [Lab 3 Test Plan & Traceability](docs/lab-03/tests.md)
- [Lab 3 Peer Review](docs/lab-03/reviewer.md)
- [Lab 3 AI Use Reflection](docs/lab-03/ai-use.md)
