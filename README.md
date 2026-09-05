# TokTickIT - IT Service Desk (Lab 2: Requester Ticketing MVP)

TokTickIT is a full-stack IT Service Desk application designed to streamline internal technical support and incident management. This repository contains the **Lab 2: Requester Ticketing MVP**, featuring a responsive **Zen Green** interface, an Express REST API backend, and a PostgreSQL database managed with Prisma ORM.

---

## Key Features (Lab 2)

- **Ticket Creation (Requester)**:
  - Dynamic category selection (`Hardware`, `Software`, `Network`, `Access Request`, `Other`).
  - Title, description, and priority level (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - File attachment support (up to 5MB; JPEG, PNG, PDF, TXT) with client- and server-side validation.
  - Client-side validation and immediate feedback with link to the created ticket.
- **Ticket Tracking & Detail View**:
  - Direct URL access via Ticket ID (`/tickets/:id`).
  - Clean metadata overview: Status badge (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), Priority, Category, Timestamps.
  - Interactive activity timeline showing ticket lifecycle events.
  - Downloadable and previewable file attachment cards.
- **Zen Green Design System**:
  - Calming, professional green palette tailored for IT service workflows.
  - Responsive layout optimized for desktop, tablet, and mobile viewports.
- **Robust Automated Testing**:
  - Comprehensive API integration test suites (Express + Supertest + Vitest).
  - UI component and interaction test suites (React + Testing Library + Vitest).

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Custom CSS (Zen Green Theme tokens), Bootstrap utility base |
| **Backend** | Node.js, Express 5, TypeScript, Multer (file handling) |
| **Database & ORM** | PostgreSQL, Prisma ORM 7 (`@prisma/client`, `@prisma/adapter-pg`) |
| **Testing** | Vitest, Supertest, React Testing Library, jsdom |
| **Containerization** | Docker, Docker Compose (PostgreSQL 18) |

---

## Project Structure

```text
toktickit/
├── client/                     # Frontend application (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/         # UI components (CreateTicketForm, TicketDetail, etc.)
│   │   ├── styles/             # Zen Green theme tokens and styling
│   │   └── App.tsx             # Root component and view router
│   └── tests/                  # Frontend component tests (Vitest + RTL)
├── server/                     # Backend application (Express + TypeScript)
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema definition
│   │   └── seed.ts             # Initial database seed script
│   ├── src/
│   │   ├── routes/             # API routes (tickets, categories, health)
│   │   └── app.ts              # Express application configuration
│   ├── uploads/                # Uploaded ticket attachments directory
│   └── tests/                  # Backend API integration tests (Supertest)
├── docs/                       # Project and lab documentation
│   └── lab-02/                 # Lab 2 Deliverables & Specifications
│       ├── specification.md    # Requirement specification & DoD
│       ├── ui-spec.md          # UI wireframes, flow, & design system
│       ├── api-spec.md         # REST API contract & payload schemas
│       ├── tests.md            # Comprehensive test matrix & results
│       ├── reviewer.md         # Peer review report & sign-off
│       ├── ai-use.md           # AI collaboration logs & reflection
│       └── SUBMISSION_REPORT_TEMPLATE.md # Report template for PDF export
├── docker-compose.yml          # Local PostgreSQL container service
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

#### Option B: Use an Existing PostgreSQL Server
Ensure PostgreSQL is running locally and create a database named `toktickit` (or your preferred name).

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
3. Configure environment variables:
   Copy `.env.example` to `.env` (or create `.env`):
   ```env
   # Example for Docker Compose setup:
   DATABASE_URL="postgresql://postgres:password@localhost:5434/localdb?schema=public"
   PORT=3000
   ```
4. Push Prisma schema & seed database categories:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   The backend API will run at **http://localhost:3000**.

---

### 3. Frontend Setup (`client/`)

1. In a new terminal, navigate to the `client/` directory:
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
   The frontend application will run at **http://localhost:5173**.

---

## Running Automated Tests

Both backend and frontend include automated test suites powered by **Vitest**:

### Backend API Tests (Vitest + Supertest)
Verifies ticket creation, retrieval, validation, and attachment handling against the database:
```bash
cd server
npm test
```

### Frontend UI Tests (Vitest + React Testing Library)
Verifies form rendering, client-side validation, ticket detail rendering, and responsive interactions:
```bash
cd client
npm test
```

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service health status check |
| `GET` | `/api/categories` | Retrieve active request categories |
| `GET` | `/api/tickets` | List tickets (with optional query filters) |
| `POST` | `/api/tickets` | Create a new ticket (supports `multipart/form-data`) |
| `GET` | `/api/tickets/:id` | Get ticket details, timeline history, and attachments |
| `GET` | `/uploads/:filename`| Serve uploaded attachment files |

Detailed API schemas, parameters, and error status codes are documented in [docs/lab-02/api-spec.md](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-02/api-spec.md).

---

## Documentation Links

- [Lab 2 Requirements & Specification](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-02/specification.md)
- [UI Specification & Design Tokens](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-02/ui-spec.md)
- [REST API Specification](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-02/api-spec.md)
- [Test Plan & Verification Matrix](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-02/tests.md)
- [Peer Reviewer Record](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-02/reviewer.md)
- [AI Collaboration & Prompt Reflection](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-02/ai-use.md)
- [PDF Submission Report Structure](file:///c:/Users/Anapat/Downloads/Lab1_Starter_Scaffold/toktickit/docs/lab-02/SUBMISSION_REPORT_TEMPLATE.md)