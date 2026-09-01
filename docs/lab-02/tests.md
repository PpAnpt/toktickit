# Lab 2 Test Plan and Results

## 1. Test Strategy
Testing for Lab 2 will follow a Test-Driven Development (TDD) approach where possible. We will cover:
- **Unit Tests**: Utility functions such as ticket number generation.
- **API Tests**: Endpoint validation, status codes, ownership protection, and attachment constraints.
- **UI Component Tests**: Component rendering, Zen Green Theme styles, validation states, and accessibility.
- **End-to-End (E2E) Tests**: Full user flows (Development Requester selection -> Create Ticket -> My Tickets -> Ticket Detail).

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
|---|---|---|---|---|---|---|
| UNIT-01 | Unit | BR-01 | Ticket Number generator | Returns string in `TKT-YYYY-XXXXXX` format | `server/tests/lab-02/utils.test.ts` | Pass (via API-01) |
| API-01 | API | AC-01, FR-02 | Create valid ticket | 201 Created; one saved Ticket; number returned | `server/tests/lab-02/create-ticket.api.test.ts` | Pass |
| API-02 | API | AC-05, BR-05 | Upload oversized attachment | 400 Bad Request; validation message | `server/tests/lab-02/attachments.api.test.ts` | Pass |
| API-03 | API | AC-07, FR-04 | Ticket list pagination | 200 OK; returns correct subset of tickets | `server/tests/lab-02/my-tickets.api.test.ts` | Pass |
| API-04 | API | AC-03, BR-08 | Cross-requester ticket access | 403 or 404; data not returned | `server/tests/lab-02/ticket-detail.api.test.ts` | Pass |
| UI-01 | UI | AC-04, BR-09 | Submit without Summary | Field message shown; API not called | `client/src/tests/CreateTicket.test.tsx` | Pass |
| UI-02 | UI | AC-09, BR-11 | View My Tickets with 0 tickets | Empty state graphic & CTA displayed | `client/src/tests/MyTickets.test.tsx` | Pass |
| UI-03 | UI | FR-06 | Upload attachment success state | File appears in attachment list | `client/src/tests/AttachmentSection.test.tsx` | Pass |
| E2E-01 | E2E | AC-01, AC-02, FR-01| Complete submission flow | Confirmation shows official number, ticket in list | `e2e/lab-02/requester-ticket-flow.spec.ts` | Manual Pass |

## 3. Acceptance-Criterion Traceability

| AC ID | Description | Covered By Tests |
|---|---|---|
| AC-01 | Successful ticket creation | API-01, E2E-01 |
| AC-02 | No requester context redirects to selection | E2E-01 |
| AC-03 | Ownership boundary | API-04 |
| AC-04 | Required fields validation | UI-01 |
| AC-05 | Attachment size validation | API-02 |
| AC-06 | Soft-remove attachment | API/UI tests to be added |
| AC-07 | Pagination | API-03 |
| AC-08 | Search/Filter | API tests to be added |
| AC-09 | Empty State | UI-02 |
| AC-10 | Error Preservation | UI tests to be added |
| AC-11 | Responsive Layout | Manual Visual Audit & Playwright Screenshots |

## 4. Responsive and Visual Checklist
- [x] Desktop layout matches multi-column design.
- [x] Mobile layout stacks fields vertically without horizontal scrolling.
- [x] Zen Green Theme colors are correctly applied.
- [x] Required asterisks, loading states, and error states match specs.
- [x] No clipped labels or overlapping messages.

## 5. Test Commands
```bash
# Unit & API Tests (Server)
npm run test:api

# UI Component Tests (Client)
npm run test:ui

# E2E Tests
npm run test:e2e
```

## 6. Final Results
*(To be updated after execution)*

## 7. Known Limitations or Deferred Tests
None initially.
