# Lab 4 UI Specification: Dashboards, Actions Taken, and Final Polish

Lab 4 keeps the Zen Green design language of `docs/lab-03/ui-spec.md` (colour tokens, role/priority/status badges, form controls, breakpoints). This document only defines what Lab 4 adds or changes. Requirement IDs refer to `docs/lab-04/specification.md`.

## 1. New and Changed Design Tokens

| Element | Style | Non-color cue |
| :--- | :--- | :--- |
| Metric card | White surface `#FFFFFF`, `1px solid #E2E8F0`, 12px radius, large value (2rem, `#006B3C`), muted label (`#5C7164`) | The label text always states the metric; the value is never the only information |
| Attention card (value > 0 for Waiting for You, Unassigned, Urgent, Reopened) | Left border 4px `#D97706`, pale amber background `#FFFBEB` | A text hint such as "Needs attention" under the value |
| Follow-up badge | Amber `#FEF3C7` / text `#B45309` | Text "Follow-up needed" with a flag icon; "No follow-up" is plain muted text |
| Action Taken card | White card, left border 3px `#0B7A46` | Performer name, role badge, and time are always shown |
| Action edited marker | Muted text "Edited by {name} on {time}" | Text, not color |
| Conflict / stale banner | Information blue `#2563EB` text on `#EFF6FF`, role `alert` | Text "This Ticket changed since you opened it" and a Reload button |
| Resolution gate message | Error red `#B30000`, role `alert`, shown next to the status buttons | Text "Record at least one Action Taken before resolving this Ticket" |

All new interactive elements keep the Lab 3 focus ring (2px `#0B7A46` outline, 2px offset) and a minimum 40px touch height.

## 2. Application Shell and Navigation (FR-13, AC-29)

| Role | Navigation (in order) | Landing page after login |
| :--- | :--- | :--- |
| Requester | Dashboard, Create Ticket, My Tickets | Requester Dashboard |
| IT Staff | Dashboard, Ticket Queue | IT Staff Dashboard |
| Administrator | Dashboard, Ticket Queue, User Management | IT Staff Dashboard with user counts |

- The current page link has an underline and `aria-current="page"`, not just a color change.
- The brand "TokTickIT" also links to the role's Dashboard.
- Header content (name, role badge, Change Password, Logout) is unchanged from Lab 3.
- Mandatory first-login Change Password still replaces the whole application (no dashboard data is loaded until it is saved).

## 3. Shared Dashboard Patterns

- **Welcome line**: "Welcome back, {first name}!" as the page `h1`.
- **Metric card grid**: 5 cards (staff) or 4 cards (Requester). Each card is a link (`<a>`) whose accessible name reads "{label}: {value}. Open list." The whole card is the drill-down target (see `api-spec.md` section 4 for destinations).
- **Loading**: skeleton cards with `aria-busy="true"` on the grid and a visually hidden "Loading dashboard" status. Skeletons occupy the final layout size so nothing jumps.
- **Empty (value 0)**: the card still shows `0`; a list with no items shows a short sentence (for example "No Tickets are waiting for you.") with an icon, not a blank box.
- **Forbidden (403)**: the page shows "You do not have access to this dashboard." with a button to the user's own dashboard; no counts are rendered.
- **Error (500 / network)**: an inline alert "The dashboard could not be loaded." with a Retry button; the rest of the shell stays usable.
- **Stale data**: a "Last updated {time}" line and a Refresh button; metrics are fetched on page load and on Refresh (no polling).
- **Truncation**: Ticket summaries truncate with an ellipsis at one line on mobile, and the full text is available via the Ticket Detail link (no clipped, unreachable content).

## 4. Screen Specifications

### 4.1 Requester Dashboard
- **Layout (Desktop)**: welcome line; row of 4 metric cards (Open Tickets, Waiting for You, Recently Updated, Recently Resolved); two columns below: "Needs your attention" (left) and "Recent Tickets" (right); quick-action buttons Create Ticket and View My Tickets pinned under the cards.
- **Lists**: up to 5 rows each, showing Ticket number, summary, status badge, and "Updated {relative time}"; every row links to the Requester Ticket Detail.
- **Windows**: "Recently" cards show "Last 7 days" as a sub-label (BR-23).
- **Privacy**: only the signed-in Requester's data is shown (BR-25).

### 4.2 IT Staff Dashboard
- **Layout (Desktop)**: welcome line; row of 5 metric cards (Unassigned, My Active Tickets, Urgent, Reopened, Resolved - Awaiting Closure); a "By status" breakdown (8 rows with counts and a proportional bar plus the number) next to a "By priority" breakdown (4 rows); below that "Recent Tickets" and "My Recent Actions" side by side.
- **Breakdown rows** are links to the queue with the matching filter; each row shows the label and the count as text (the bar is decorative, `aria-hidden`).
- **Recent Tickets**: up to 5 rows with number, summary, status badge, IT Priority badge, owner (or "Unassigned"), updated time; each links to the Staff Ticket Detail.
- **My Recent Actions**: up to 5 rows with Ticket number, action time, shortened description, and a follow-up badge when needed; each links to the Staff Ticket Detail of that Ticket.
- **Administrator extra**: a compact "Accounts" strip with counts of Requesters, IT Staff, Administrators, and Inactive users, each linking to User Management (filtered by role where supported).
- **Quick Actions**: "Open Ticket Queue" button.

### 4.3 Actions Taken Area on Ticket Detail

Placed on the **Staff Ticket Detail** as a section titled "Actions Taken ({count})" below the issue details and above the discussion tabs, and on the **Requester Ticket Detail** as the same section without controls.

- **List**: newest first (`actionAt` desc, then `id` desc). Each action card shows:
  - Heading row: Action Date/Time and the performer (name plus role badge).
  - "Action" (description), "Result", follow-up badge with the Follow-up Note when needed, and "Attachment Notes" when present (label "Look for:").
  - Footer: "Recorded {created time}"; if edited, "Edited by {name} on {time}".
  - IT Staff/Administrator only: an **Edit** button on each card (hidden on `Closed`/`Cancelled` Tickets, where a short note explains why).
- **Empty state**: "No actions have been recorded yet." For staff it adds the hint "Record an action before resolving this Ticket."
- **Create mode** (IT Staff/Administrator, non-terminal Ticket): an "Add Action" button opens an inline panel (a dialog on Mobile) with the fields below.
- **View/Edit mode**: the card is read-only text by default (tinted read-only style from Lab 3); **Edit** switches that card to the same form, prefilled, with Save and Cancel. Only one card is editable at a time. Unsaved edits are protected by a confirm prompt when leaving the editor.

| Field | Control | Required | Validation message (shown directly under the field) |
| :--- | :--- | :---: | :--- |
| Action Date/Time | `datetime-local`, default now | Yes | "Action time cannot be in the future." / "Action time cannot be before the Ticket was created." |
| Action Description | Textarea, 2,000-char counter | Yes | "Describe what was done." |
| Result | Textarea, 1,000-char counter | Yes | "Enter the result of this action." |
| Performed by | Read-only text (current user; not editable) | Auto | n/a |
| Follow-Up Required? | Checkbox | No | n/a |
| Follow-up Note | Textarea, shown and required only when the checkbox is checked | Conditional | "Follow-up note is required when follow-up is needed." |
| Attachment Notes | Textarea, 500-char counter, helper text "Which file or image should the reader look for?" | No | n/a |

- **Submission behavior**: the Save button shows a spinner and is disabled while the request is in flight (FR-14); a `clientRequestId` is generated once per open form so a retry cannot duplicate the action (AC-08, AC-27).
- **Failures**: validation errors (400) appear under each field and in a summary at the top that receives focus; a conflict (409 `STALE_UPDATE`) shows the stale banner with a Reload button and keeps the user's text in the form; a 403/404/500 shows a clear alert and also keeps the entered data (FR-16, AC-26).
- **Success**: a status message "Action saved." (`role="status"`), the list refreshes, and the new/edited card receives focus.
- **Requester view**: identical cards, no Add/Edit buttons, no form.

### 4.4 Ticket Workflow Controls and Summary (FR-06, FR-07, AC-15)
- The status area on the Staff Ticket Detail shows only **permitted** "Move to ..." buttons for the current status (specification section 5 matrix); terminal statuses show the existing explanation text and no buttons.
- "Move to Resolved" is always shown where the matrix allows it. If the Ticket has no Actions Taken, the button stays enabled (the server is the authority) and a hint above it reads "Resolving requires at least one Action Taken." When the server returns `RESOLUTION_REQUIRES_ACTION`, the gate message is shown next to the buttons with a link "Add an action".
- After a successful change the Ticket summary (status badge in the header, status field, `resolvedAt`) refreshes without a full page reload, and a status message announces "Status changed to {status}."
- While a transition is in flight, all status buttons are disabled to prevent double submission.
- A requester's resolution indication is shown as an informational notice "Requester says the problem appears resolved. Review the actions and update the Ticket." It does not alter the status controls.

### 4.5 Final Polish Items (FR-15, FR-16)
- Remove temporary, duplicate, or inconsistent UI elements left from earlier labs (for example duplicate headings and unused buttons) and replace placeholder text.
- Use one wording and layout for loading, empty, error, forbidden, conflict, and not-found messages on every screen.
- Dialogs use `role="dialog"`, `aria-modal="true"`, a labelled title, focus trapping, Escape to close, and return focus to the opener.
- Each page has a single `h1`; form inputs have visible labels; icons that carry meaning have text alternatives; status never relies on color alone.
- No console errors or warnings on any screen; no broken links.

## 5. Responsive Layout

| Viewport | Width | Dashboard | Actions Taken |
| :--- | :--- | :--- | :--- |
| **Desktop** | `>= 992px` | Metric cards in one row (4 or 5); two-column lists | Cards in the left column under the issue details; inline Add/Edit panel |
| **Tablet** | `768px - 991px` | Cards wrap to 2 or 3 per row; lists stack | Full-width cards; inline panel |
| **Mobile** | `< 768px` | One column; each card full width; breakdowns collapse to simple lists | Full-width cards; Add/Edit opens as a full-width dialog; buttons stack |

No page-level horizontal scrolling at 1280px, 768px, or 375px. Evidence is stored in `artifacts/lab-04/screenshots/{staff-dashboard,requester-dashboard,actions-taken}/` and regenerated with `npm run screenshots`.

## 6. Visual and Accessibility Checklist (completed for Lab 4 Part 9 evidence)
Items are checked off in the Pull Request that delivers the related screen; the final state is recorded here before release.

- [ ] **Design consistency**: Zen Green tokens, badges, buttons, and cards reused on all new screens.
- [ ] **Dashboards**: metric cards show label, value, and an accessible drill-down; empty, loading, forbidden, and error states are visible.
- [ ] **Actions Taken**: list, create, edit, and read-only (Requester) views are visually distinct; the follow-up badge uses text and an icon.
- [ ] **Editable vs read-only**: editable fields have white backgrounds and borders; Performed by and recorded times are plain or tinted read-only text.
- [ ] **Validation placement**: errors appear directly under the field and in a focused summary; the Follow-up Note error appears under its own field.
- [ ] **Keyboard focus**: visible ring everywhere; Add/Edit forms, dialogs, and metric cards are fully operable by keyboard; focus returns after closing a dialog.
- [ ] **Clipping and overlap**: no truncated unreachable text or overlapping controls at 1280px, 768px, and 375px.
- [ ] **Horizontal overflow**: none on any viewport.
- [ ] **Status cues**: statuses, priorities, follow-up, and conflict/gate messages have text, not only color.
- [ ] **Navigation**: active page marked with `aria-current`; each role sees only its entries.
- [ ] **Console and links**: no console errors, broken links, or placeholder text.
