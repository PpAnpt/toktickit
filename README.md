# TokTickIT - IT Service Desk (Lab 3: Authentication, IT Staff Operations & User Administration)

TokTickIT is a full-stack IT Service Desk application designed to streamline internal technical support and incident management. This repository contains the **Lab 3 Milestone**, expanding upon the Requester ticketing MVP with robust authentication, role-based authorization (Requester, IT Staff, Administrator), mandatory first-login password changes, an operational IT Staff Ticket Queue with lifecycle state machine controls, dual-tier discussions (Public Comments vs. Internal Notes), and Administrator user management.

---

## Key Features

### Lab 3: Staff Operations, Security & Administration
- **Authentication & Authorization**:
  - Secure credential-based login (bcrypt hashing + JWT tokens).
  - Role-Based Access Control (RBAC) across navigation and backend endpoints (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`).
  - Mandatory password change on first login or after administrator password reset (`mustChangePassword=true`).
- **IT Staff Ticket Queue & Lifecycle State Machine**:
  - Shared IT Staff Queue with search, multi-filter (Status, Priority, Owner), sorting, and pagination.
  - Ticket claiming and reassignment among active IT Staff and Administrators.
  - Independent IT Priority adjustments (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - Strict lifecycle transition validation (`NEW` -> `OPEN` -> `IN_PROGRESS` -> `WAITING_FOR_INPUT` -> `RESOLVED` -> `CLOSED`).
- **Two-Tier Discussion Thread**:
  - **Public Comments**: Collaborative thread between Requester and IT Support.
  - **Internal Notes**: Restricted operational notes visible solely to IT Staff and Administrators.
  - Requester "Problem Resolved" indication capability.
- **Administrator User Management**:
  - Minimalist user listing, keyword search, role filters, account creation, and detail updates.
  - Initial password assignment forcing first-login changes.
  - Safety rules: Self-deactivation prevention and sole active Administrator protection.

### Lab 2: Requester Ticketing Core
- **Ticket Submission**:
  - Dynamic category selection (`Hardware`, `Software`, `Network`, `Access Request`, `Other`).
  - Title, description, and requested priority.
  - File attachments (up to 5MB; JPEG, PNG, PDF, TXT) with soft-deletion and reason tracking.
- **Requester Portal**:
  - Authenticated ticket listing ("My Tickets") with status filters.
  - Full ticket detail inspection, activity timeline, and attachment downloads.
- **Zen Green Design System**:
  - Calming, professional green palette tailored for IT service workflows.
  - Responsive layout optimized for desktop, tablet, and mobile viewports.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Custom CSS (Zen Green Theme tokens), Bootstrap 5 utility base |
| **Backend** | Node.js, Express 5, TypeScript, Multer (file uploads), bcryptjs, jsonwebtoken |
| **Database & ORM** | PostgreSQL, Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-pg`) |
| **Testing** | Playwright (E2E), Vitest (Unit & Component), Supertest (API Integration), React Testing Library |
| **Containerization** | Docker, Docker Compose (PostgreSQL 18) |

---

## Project Structure

```text
toktickit/
├── client/                     # Frontend application (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/         # UI components (StaffTicketQueue, UserManagement, Login, etc.)
│   │   ├── styles/             # Zen Green theme tokens and styling
│   │   └── App.tsx             # Main view router and auth provider
│   └── tests/                  # Frontend component tests (Vitest + RTL)
├── server/                     # Backend application (Express + TypeScript)
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema definition
│   │   └── seed.ts             # Initial database seed script (Users, Roles, Tickets)
│   ├── src/
│   │   ├── routes/             # API routes (auth, tickets, comments, admin users)
│   │   ├── middleware/         # Auth & RBAC guard middleware
│   │   └── app.ts              # Express application configuration
│   ├── uploads/                # Uploaded ticket attachments directory
│   └── tests/                  # Backend API integration tests (Supertest)
├── e2e/                        # Playwright End-to-End Test Suites
│   ├── lab-02/                 # Lab 2 Requester lifecycle regression E2E
│   └── lab-03/                 # Lab 3 Auth, Staff, and Admin user journeys
├── docs/                       # Project and lab documentation
│   ├── lab-01/                 # Lab 1 Deliverables
│   ├── lab-02/                 # Lab 2 Deliverables
│   └── lab-03/                 # Lab 3 Deliverables & Specifications
│       ├── specification.md    # Sprint specification, ACs, & DoD
│       ├── ui-spec.md          # UI wireframes, flow, & design system
│       ├── api-spec.md         # REST API contract & payload schemas
│       ├── tests.md            # Comprehensive test matrix & results
│       └── ai-use.md           # AI collaboration logs & reflection
├── docker-compose.yml          # Local PostgreSQL container service
├── playwright.config.ts        # Playwright E2E configuration
└── README.md                   # Project setup and documentation guide
```

---

## Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Docker & Docker Compose** (recommended for PostgreSQL) or a local PostgreSQL instance

---

### 1. Database Setup

#### Option A: Run PostgreSQL via Docker Compose (Recommended)
From the project root:
```bash
docker compose up -d
```
*This starts a PostgreSQL 18 container running on port `5434` with default credentials (`postgres` / `password`, database `localdb`).*

---

### 2. Backend Setup (`server/`)

1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5434/localdb?schema=public"
   PORT=3000
   JWT_SECRET="toktickit_super_secret_jwt_key_2026"
   ```
4. Push Prisma schema & seed database:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API runs at **http://localhost:3000**.

---

### 3. Frontend Setup (`client/`)

1. In a separate terminal, navigate to `client/`:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend application runs at **http://localhost:5173**.

---

## Running Automated Tests

TokTickIT features a complete test pyramid spanning API integration, UI components, and browser E2E tests:

### 1. Backend API Integration Tests (Vitest + Supertest)
Verifies authentication, RBAC, ticket queue, lifecycle state transitions, comments, and admin safety rules:
```bash
cd server
npm test
```

### 2. Frontend UI Component Tests (Vitest + React Testing Library)
Verifies form interactions, RBAC view guards, modals, and responsive layout components:
```bash
cd client
npm test
```

### 3. End-to-End Browser Tests (Playwright)
Executes full realistic user journeys across Chromium viewports with automatic test servers:
```bash
npm run test:e2e
```

---

## Default Seed Accounts

| Name | Email | Initial Password | Role | Note |
| :--- | :--- | :--- | :--- | :--- |
| **John Doe** | `john.doe@example.com` | `Password123!` | `REQUESTER` | Requester with existing tickets |
| **Sarah Conner** | `sarah.conner@example.com` | `Password123!` | `IT_STAFF` | IT Support Staff |
| **Alice Admin** | `alice.admin@example.com` | `Password123!` | `ADMINISTRATOR` | System Administrator |
| **Elena Rostova** | `elena.rostova@example.com` | `Password123!` | `REQUESTER` | Flagged `mustChangePassword=true` |

---

## Documentation Links

- [Lab 3 Engineering Specification](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-03/specification.md)
- [Lab 3 UI Wireframes & Layout Specification](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-03/ui-spec.md)
- [Lab 3 REST API Contract](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-03/api-spec.md)
- [Lab 3 Test Matrix & Traceability](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-03/tests.md)
- [Lab 3 AI Use Reflection](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-03/ai-use.md)