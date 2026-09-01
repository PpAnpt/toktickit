# Lab 2 API Specification

## 1. General Principles
- **Base Path**: All endpoints are prefixed with `/api`.
- **Authentication context**: Since real login is excluded from Lab 2, we simulate ownership by passing the selected Requester's ID via the request header (`X-Requester-Id`). The backend uses this to enforce ownership constraints.
- **Format**: JSON payloads for general requests and responses. File uploads use `multipart/form-data`.

## 2. Reference Data APIs

### 2.1 Get Active Development Requesters
- **Endpoint**: `GET /api/requesters`
- **Description**: Returns all active Requesters for the simulated login screen. Inactive requesters are excluded.
- **Success (200 OK)**:
  ```json
  [ { "id": 1, "name": "Jennifer Anderson", "email": "jen@example.com" }, ... ]
  ```

### 2.2 Get Active Categories
- **Endpoint**: `GET /api/categories`
- **Description**: Retrieves Categories for the Create Ticket form dropdown.
- **Success (200 OK)**:
  ```json
  [ { "id": 1, "name": "Hardware" }, { "id": 2, "name": "Software" } ]
  ```

### 2.3 Get Active Related Systems
- **Endpoint**: `GET /api/related-systems`
- **Description**: Retrieves Related Systems for the Create Ticket form dropdown.
- **Success (200 OK)**:
  ```json
  [ { "id": 1, "name": "Corporate Laptop" }, { "id": 2, "name": "Email" } ]
  ```

## 3. Ticket APIs

### 3.1 Create a Ticket
- **Endpoint**: `POST /api/tickets`
- **Headers**: `X-Requester-Id: <id>`
- **Request Body (JSON)**:
  ```json
  {
    "summary": "Laptop battery drains quickly",
    "description": "Drains even when idle.",
    "categoryId": 1,
    "relatedSystemId": 1,
    "requestedPriority": "MEDIUM"
  }
  ```
- **Success (201 Created)**: Returns the generated official Ticket Number.
  ```json
  { "id": 10, "ticketNumber": "TKT-2026-000001", "status": "New" }
  ```
- **Failure (400 Bad Request)**: Invalid input (e.g., missing summary, empty strings).

### 3.2 Retrieve Requester's Tickets (List)
- **Endpoint**: `GET /api/tickets`
- **Headers**: `X-Requester-Id: <id>` (Ownership constraint applied here)
- **Query Parameters**:
  - `page` (default: 1), `limit` (default: 10, max: 50)
  - `search` (String: searches Summary and Description)
  - `categoryId`, `status` (For filtering)
  - `sortBy` (default: `createdAt`), `sortOrder` (default: `desc`)
- **Success (200 OK)**: Includes data and pagination metadata.
  ```json
  {
    "data": [ { "ticketNumber": "TKT-2026-000001", "summary": "...", "status": "New", ... } ],
    "meta": { "totalItems": 15, "totalPages": 2, "currentPage": 1 }
  }
  ```
- **Failure (400 Bad Request)**: Invalid pagination or sort parameters.

### 3.3 Retrieve One Owned Ticket
- **Endpoint**: `GET /api/tickets/:id`
- **Headers**: `X-Requester-Id: <id>`
- **Success (200 OK)**: Full ticket object including attachment metadata array.
- **Failure (404 Not Found)**: Ticket doesn't exist.
- **Failure (403 Forbidden)**: Ticket exists but belongs to a different Requester.

## 4. Attachment APIs

### 4.1 Upload an Attachment
- **Endpoint**: `POST /api/tickets/:id/attachments`
- **Headers**: `X-Requester-Id: <id>`
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (binary data)
- **Success (201 Created)**:
  ```json
  { "id": 5, "originalFileName": "screenshot.png", "size": 102400 }
  ```
- **Failure (400 Bad Request)**: File exceeds 5MB, unsupported type, or max 5 files limit reached.
- **Failure (403 Forbidden)**: Not the owner of the ticket.

### 4.2 Download an Attachment
- **Endpoint**: `GET /api/tickets/:id/attachments/:attachmentId/download`
- **Headers**: `X-Requester-Id: <id>`
- **Success (200 OK)**: Returns binary file stream for download/preview.
- **Failure (404 Not Found)**: File not found or has been soft-removed.
- **Failure (403 Forbidden)**: Unauthorized ownership.

### 4.3 Soft-remove an Attachment
- **Endpoint**: `DELETE /api/tickets/:id/attachments/:attachmentId`
- **Headers**: `X-Requester-Id: <id>`
- **Success (204 No Content)**: Soft-removal successful.
- **Failure (404 Not Found)** / **(403 Forbidden)**: Same as above.

## 5. Global Error Handling Structure
- **400 Bad Request**: `{ "error": "Validation Error", "details": ["Summary is required."] }`
- **500 Internal Server Error**: `{ "error": "An unexpected error occurred." }` (Safe message, hides server stack trace).
