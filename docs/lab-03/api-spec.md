# Lab 3 API Specification

## 1. General Principles
- **Base Path**: All endpoints are prefixed with `/api`.
- **Authentication**: JWT token issued upon login, transmitted via `Authorization: Bearer <token>` header or `token` cookie.
- **Role-Based Access Control (RBAC)**: Enforced server-side via middleware. Unauthorized requests return `401 Unauthorized`. Authorized users lacking necessary role privileges return `403 Forbidden`.
- **Safe Error Responses**: Error messages must not disclose system internals or leak existence of confidential records (e.g., internal notes). Format: `{ "error": "Descriptive message" }`.
- **Payload Format**: Standard requests/responses use `application/json`. File attachments continue using `multipart/form-data`.

---

## 2. Authentication APIs

### 2.1 User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "sarah.connor@example.com",
    "password": "Password123!"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 5,
      "email": "sarah.connor@example.com",
      "name": "Sarah Connor",
      "role": "IT_STAFF",
      "mustChangePassword": false
    }
  }
  ```
- **Failure Responses**:
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid credentials or inactive account (`Account is inactive or credentials invalid`).

### 2.2 User Logout
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Authenticated users
- **Success (200 OK)**:
  ```json
  {
    "message": "Logged out successfully"
  }
  ```

### 2.3 Get Current Authenticated User Profile
- **Endpoint**: `GET /api/auth/me`
- **Access**: Authenticated users
- **Success (200 OK)**:
  ```json
  {
    "id": 5,
    "email": "sarah.connor@example.com",
    "name": "Sarah Connor",
    "role": "IT_STAFF",
    "mustChangePassword": false
  }
  ```
- **Failure (401 Unauthorized)**: Invalid or expired token.

### 2.4 Mandatory Password Change
- **Endpoint**: `POST /api/auth/change-password`
- **Access**: Authenticated users
- **Request Body**:
  ```json
  {
    "currentPassword": "InitialPassword123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "message": "Password changed successfully",
    "mustChangePassword": false
  }
  ```
- **Failure (400 Bad Request)**: New password does not meet requirements or equals current password.

---

## 3. IT Staff Ticket Queue & Operations APIs

### 3.1 Get Ticket Queue (List)
- **Endpoint**: `GET /api/staff/tickets`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `limit` (integer, default: 10, max: 50)
  - `search` (string: matches ticketNumber, summary, requester name)
  - `status` (string: `New`, `Open`, `In Progress`, etc.)
  - `priority` (string: `LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - `owner` (string/integer: `unassigned`, or specific staff user ID)
  - `sortBy` (string: `createdAt`, `updatedAt`, `priority`, default: `createdAt`)
  - `sortOrder` (string: `asc`, `desc`, default: `desc`)
- **Success (200 OK)**:
  ```json
  {
    "tickets": [
      {
        "id": 12,
        "ticketNumber": "TKT-2026-000012",
        "summary": "VPN connection dropping repeatedly",
        "status": "In Progress",
        "requestedPriority": "HIGH",
        "itPriority": "URGENT",
        "requester": { "id": 1, "name": "David Lee", "email": "david@example.com" },
        "owner": { "id": 5, "name": "Sarah Connor" },
        "createdAt": "2026-09-12T10:30:00.000Z",
        "updatedAt": "2026-09-13T08:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
  ```
- **Failure (403 Forbidden)**: User role is `REQUESTER`.

### 3.2 Get Staff Ticket Detail
- **Endpoint**: `GET /api/staff/tickets/:id`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Success (200 OK)**: Full ticket object including category, related system, owner, attachments, and resolution indication status.
- **Failure**: `403 Forbidden` (Requester access), `404 Not Found`.

### 3.3 Claim / Assign Ticket Owner
- **Endpoint**: `PATCH /api/staff/tickets/:id/owner`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
  ```json
  {
    "ownerId": 5
  }
  ```
  *(Pass `ownerId: null` to unassign)*
- **Success (200 OK)**: Returns updated ticket with new owner metadata.
- **Failure**: `400 Bad Request` (Owner is not an active staff/admin), `404 Not Found`.

### 3.4 Update IT Priority
- **Endpoint**: `PATCH /api/staff/tickets/:id/priority`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
  ```json
  {
    "itPriority": "URGENT"
  }
  ```
- **Success (200 OK)**: Updated ticket reflecting `itPriority`. Requested Priority is left unchanged.

### 3.5 Update Ticket Status (Workflow Transition)
- **Endpoint**: `PATCH /api/staff/tickets/:id/status`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
  ```json
  {
    "status": "In Progress"
  }
  ```
- **Success (200 OK)**: Returns ticket with updated status.
- **Failure (400 Bad Request)**: Invalid status transition according to BR-13 transition matrix.

---

## 4. Comments & Internal Notes APIs

### 4.1 Get Public Comments
- **Endpoint**: `GET /api/tickets/:id/comments`
- **Access**: Requester (owner only), `IT_STAFF`, `ADMINISTRATOR`
- **Success (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "ticketId": 12,
      "author": { "id": 5, "name": "Sarah Connor", "role": "IT_STAFF" },
      "content": "We are looking into the VPN gateway logs now.",
      "createdAt": "2026-09-13T08:15:00.000Z"
    }
  ]
  ```

### 4.2 Post Public Comment
- **Endpoint**: `POST /api/tickets/:id/comments`
- **Access**: Requester (owner only), `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
  ```json
  {
    "content": "The issue is still occurring after restarting router."
  }
  ```
- **Success (201 Created)**: Returns created comment object.
- **Failure**: `400 Bad Request` (Empty or whitespace content), `403 Forbidden` (Requester doesn't own ticket).

### 4.3 Get Internal Notes
- **Endpoint**: `GET /api/tickets/:id/internal-notes`
- **Access**: `IT_STAFF`, `ADMINISTRATOR` only
- **Success (200 OK)**: Returns list of internal operational notes.
- **Failure (403 Forbidden)**: Requester access strictly rejected without disclosing note existence.

### 4.4 Post Internal Note
- **Endpoint**: `POST /api/tickets/:id/internal-notes`
- **Access**: `IT_STAFF`, `ADMINISTRATOR` only
- **Request Body**:
  ```json
  {
    "content": "Switch port 12 on Rack 3 had 15% packet loss. Resetting port."
  }
  ```
- **Success (201 Created)**: Returns created internal note object.

### 4.5 Requester Indicate Problem Resolved
- **Endpoint**: `POST /api/tickets/:id/indicate-resolved`
- **Access**: Requester (ticket owner only)
- **Success (200 OK)**:
  ```json
  {
    "message": "Indicated problem appears resolved",
    "indicatedResolvedAt": "2026-09-13T08:45:00.000Z"
  }
  ```

---

## 5. Administrator User Management APIs

### 5.1 List Users
- **Endpoint**: `GET /api/admin/users`
- **Access**: `ADMINISTRATOR` only
- **Query Parameters**:
  - `search` (string: matches name or email)
  - `role` (string: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
- **Success (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "name": "David Lee",
      "email": "david.lee@example.com",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-01T00:00:00.000Z"
    }
  ]
  ```
- **Failure (403 Forbidden)**: Non-admin users.

### 5.2 Create User
- **Endpoint**: `POST /api/admin/users`
- **Access**: `ADMINISTRATOR` only
- **Request Body**:
  ```json
  {
    "name": "Alex Mercer",
    "email": "alex.mercer@example.com",
    "role": "IT_STAFF",
    "initialPassword": "InitialPass123!"
  }
  ```
- **Success (201 Created)**: Returns created user object (password excluded).
- **Failure**:
  - `400 Bad Request`: Missing fields or invalid role.
  - `409 Conflict`: Email already exists.

### 5.3 Edit User Information
- **Endpoint**: `PATCH /api/admin/users/:id`
- **Access**: `ADMINISTRATOR` only
- **Request Body**:
  ```json
  {
    "name": "Alex Mercer Updated",
    "email": "alex.new@example.com",
    "role": "IT_STAFF",
    "isActive": false
  }
  ```
- **Success (200 OK)**: Returns updated user record.
- **Failure**:
  - `400 Bad Request`: Validation error, admin deactivating own account (BR-19), or removing last active admin (BR-20).
  - `404 Not Found`: User not found.

### 5.4 Reset User Initial Password
- **Endpoint**: `POST /api/admin/users/:id/reset-password`
- **Access**: `ADMINISTRATOR` only
- **Request Body**:
  ```json
  {
    "initialPassword": "NewTempPassword123!"
  }
  ```
- **Success (200 OK)**:
  ```json
  {
    "message": "Initial password set. User must change password at next login."
  }
  ```

---

## 6. Backward Compatible Requester APIs (Lab 2 Continuation)
All Lab 2 endpoints continue to function with authentication identity enforced server-side:
- `GET /api/categories`: Returns categories.
- `GET /api/related-systems`: Returns related systems.
- `POST /api/tickets`: Creates ticket; sets `requesterId = req.user.id`.
- `GET /api/tickets`: Retrieves owned tickets for `req.user.id`.
- `GET /api/tickets/:id`: Retrieves ticket if `ticket.requesterId === req.user.id`.
- `POST /api/tickets/:id/attachments`: Upload attachment (ownership enforced).
- `DELETE /api/tickets/:id/attachments/:attachmentId`: Soft-remove attachment with reason.
