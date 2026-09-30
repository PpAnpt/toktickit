# TokTickIT - IT Service Desk (Lab 3: Authentication, IT Staff Operations & User Administration)

TokTickIT is a full-stack IT Service Desk application for internal technical support. This repository contains the **Lab 3 milestone**, which replaces the Lab 2 Development Requester selector with real authentication and adds role-based authorization (Requester, IT Staff, Administrator), mandatory first-login password changes, an IT Staff Ticket Queue and Ticket Detail workflow, Public Comments and Internal Notes, and minimalist Administrator user management.

---

## Key Features

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
npx prisma migrate deploy   # applies the Lab 1 → Lab 2 → Lab 3 migrations
npx prisma db seed          # idempotent; safe to run again
npm run dev                 # http://localhost:3000
```
`.env` is never committed. `JWT_SECRET` can be generated with
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

**Upgrading an existing Lab 2 database:** `npx prisma migrate deploy` renames the Lab 2 `RequesterUser` table to `User` (keeping ids and ticket ownership), gives existing requesters the initial password `Welcome123!` with a forced change at first login, maps the Lab 2 status `Pending` to `In Progress`, and copies Requested Priority into IT Priority. See `docs/lab-03/specification.md` §7.

### 3. Frontend (`client/`)
```bash
cd client
npm install
npm run dev                 # http://localhost:5173
```

---

## Running Automated Tests

```bash
npm --prefix server test    # API, security, and Lab 1/2 regression tests (121)
npm --prefix client test    # UI component tests (40)
npm run test:e2e            # Playwright end-to-end tests (7); starts server and client
npm run screenshots         # Regenerates artifacts/lab-03/screenshots
```
The API tests use a separate database (`localdb_test` by default, or `TEST_DATABASE_URL`) that they create, migrate, and seed automatically, so they never add data to your development database. The E2E tests and screenshot script use the development servers and database.

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

Running the seed again resets these accounts to the passwords above. The seed also creates 16 sample tickets across all statuses and priorities, assigned and unassigned, with example Public Comments and Internal Notes.

---

## Documentation

- [Lab 3 Engineering Specification](docs/lab-03/specification.md)
- [Lab 3 UI Specification](docs/lab-03/ui-spec.md)
- [Lab 3 REST API Contract](docs/lab-03/api-spec.md)
- [Lab 3 Test Plan & Traceability](docs/lab-03/tests.md)
- [Lab 3 Peer Review](docs/lab-03/reviewer.md)
- [Lab 3 AI Use Reflection](docs/lab-03/ai-use.md)
