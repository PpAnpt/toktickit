# Lab 3 UI Specification: Zen Green Theme & Operational Workflows

## 1. Color Tokens & Typography

### Color System
- **Primary Green**: `#006B3C` (App header, primary action buttons, key badge accents)
- **Secondary Green**: `#0B7A46` (Active tabs, focus indicators, interactive hover states)
- **Pale Green**: `#EAF6EF` (Selected table rows, badge backgrounds, subtle callout cards)
- **Page Background**: `#F5F7F6` (Calm neutral off-white surface)
- **Card Surface**: `#FFFFFF` (Pure white cards with `#E2E8F0` border and soft elevation)
- **Primary Text**: `#1A2F25` (Dark pine charcoal for readability, high contrast)
- **Muted Text**: `#5C7164` (Secondary labels, timestamps, metadata)
- **Error / Destructive**: `#B30000` (Validation errors, danger alerts, deactivation warnings)
- **Warning / Attention**: `#D97706` (High priority badges, pending password change prompts)
- **Information**: `#2563EB` (Public notes accent, informational banners)

### Role & Status Badges
- **Role Badges**:
  - `Requester`: Neutral light teal `#E6FFFA` with `#047481` text.
  - `IT Staff`: Pale green `#EAF6EF` with `#006B3C` text.
  - `Administrator`: Soft purple `#F3E8FF` with `#6B21A8` text.
- **Priority Badges**:
  - `LOW`: Light gray `#F1F5F9`, text `#475569`.
  - `MEDIUM`: Soft blue `#EFF6FF`, text `#1D4ED8`.
  - `HIGH`: Amber `#FEF3C7`, text `#B45309`.
  - `URGENT`: Red `#FEE2E2`, text `#B91C1C`.
- **Status Badges**:
  - `New`: Cyan `#E0F2FE`, text `#0369A1`.
  - `Open`: Blue `#DBEAFE`, text `#1D4ED8`.
  - `In Progress`: Amber `#FEF3C7`, text `#B45309`.
  - `Waiting for Requester`: Purple `#EDE9FE`, text `#6D28D9`.
  - `Resolved`: Green `#DCFCE7`, text `#15803D`.
  - `Closed`: Gray `#F3F4F6`, text `#4B5563`.
  - `Reopened`: Orange `#FFEDD5`, text `#C2410C`.
  - `Cancelled`: Red `#FEE2E2`, text `#991B1B`.

---

## 2. Component Conventions & States

### Form Controls
- **Editable Input**: `#FFFFFF` background, `1px solid #CBD5E1` border, 8px border-radius, 40px minimum touch height.
- **Read-Only Field**: Soft warm ivory / light gray background `#F8FAFC`, non-editable cursor, distinct border.
- **Validation Errors**: Red text `#B30000` placed directly below input with a clear descriptive message.
- **Busy / Loading State**: Action buttons display a loading spinner and disable further clicks.

### Dual Discussion Feed (Public Comments vs. Internal Notes)
- **Tab Navigation**: Clean pill or underline tab controls switching between "Public Comments" and "Internal Notes" (with a lock icon indicating internal restriction).
- **Public Comment Card**: White background, author name, role badge, timestamp, and standard border.
- **Internal Note Card**: Pale amber/yellow background `#FFFBEB` with `#FDE68A` border to clearly distinguish confidential notes from public messages.

---

## 3. Application Shell & Role-Based Navigation

- **Navbar Header**:
  - Brand Logo: "TokTickIT" in bold white against Primary Green (`#006B3C`).
  - Navigation Links (rendered based on authenticated role):
    - **Requester**: `My Tickets`, `Create Ticket`
    - **IT Staff**: `Ticket Queue`
    - **Administrator**: `User Management`, `Ticket Queue`
  - Right-aligned Profile Area: User full name and Role badge (visible on all viewports; email hidden on phones), `Change Password` button, and `Logout` button.
  - Development Requester Selector: **Completely removed** (no selector, no `X-Requester-Id`, no stored requester id).
  - Session feedback: after logout the login screen shows "You have been signed out."; if the server rejects the session (expired, revoked, deactivated) it shows "Your session has ended. Please sign in again."

---

## 4. Screen Specifications

### 4.1 Login Screen
- Centered card layout on `#F5F7F6` background.
- Form inputs: Email address, Password.
- "Sign In" button with busy indicator.
- Error alerts: Invalid credentials, inactive account warning banner.

### 4.2 Mandatory Change Password Screen
- Full-screen dialog that replaces the application if `mustChangePassword === true`; only a small "Sign out" button remains.
- Explanatory prompt notifying that the initial password must be updated.
- Inputs: Current Password, New Password, Confirm New Password.
- Password rule hint under the field: 8–72 characters, at least one letter and one number; confirmation must match.
- Normal application navigation is not rendered and no application data is loaded until completed.
- The same dialog opens from the `Change Password` button for a voluntary change, with a `Cancel` button and a success message afterwards.

### 4.3 IT Staff Ticket Queue Screen
- **Header & Stats Bar**: Shows active queue count.
- **Search & Filter Bar**:
  - Keyword search input (ticket number, summary, requester name).
  - Status filter dropdown (`All` plus all 8 statuses, including `Reopened` and `Cancelled`).
  - Priority filter dropdown (`All`, `LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - Owner filter dropdown (`All`, `Unassigned`, `Assigned to Me`, `Specific Staff`).
  - Sort dropdown (Newest / Oldest, Ticket # ascending / descending, Priority).
- **Table (≥ 768px)**:
  - Columns: Ticket #, Summary with Requester and Category underneath, Status, IT Priority badge with "Req:" Requested Priority underneath, Owner (≥ 992px; otherwise shown under the summary), Created (≥ 1400px), and a `View` button.
  - Row click or `View` opens IT Staff Ticket Detail.
- **Card list (< 768px)**: one card per ticket with number, status badge, summary, requester and category, priorities, owner, and a full-width `View` button.
- **States**: Loading spinner, empty queue message, no-results message with a Clear Filters button, safe error message.
- **Pagination**: Previous / Next buttons, numbered pages, and "Showing page X of Y (N tickets)"; 10 tickets per page.

### 4.4 IT Staff Ticket Detail Screen
- **Top Navigation Bar**: "Back to Queue" button, Ticket Number heading, and current Status badge.
- **Action Control Bar**:
  - Ownership: "Claim Ticket" button, plus an owner dropdown (active IT Staff and Administrators, or Unassign) with "Save Owner Assignment".
  - IT Priority: Select dropdown with "Save IT Priority"; Requested Priority is shown read-only and labelled "Immutable".
  - Status Workflow: one "Move to …" button per permitted next status; terminal statuses show an explanation instead of buttons.
- **Main Section (2-Column Layout on Desktop)**:
  - Left Column: Issue details (Summary, Category, Related System, Full Description, Attachments download list).
  - Right Column: Requester info card, Resolution indication notice (if flagged by requester), and Activity / Discussion feed (Public Comments and Internal Notes tabs).

### 4.5 Requester Ticket Detail Screen (Lab 2 view, extended)
- Header: ticket number, status badge, and `My Problem Appears Resolved` button (hidden once indicated or when Resolved/Closed/Cancelled; replaced by an "indicated" badge with the date).
- Read-only metadata row, description, and attachments (download, remove with required reason, upload more).
- **Public Comments** thread: author name, role badge, timestamp, plain-text content, empty state, loading and retry-on-error states, textarea with 2,000-character counter, and "Comment posted." confirmation. Hidden form on Closed/Cancelled tickets. Internal Notes are never shown.
- Inline success / error alerts instead of browser pop-ups.
- A ticket that is missing or belongs to another Requester shows "Ticket Unavailable" without revealing whether it exists.

### 4.6 Administrator User Management Screen
- **Header**: Title "User Management", total active users counter, and "+ Create User" primary action button.
- **Filter Bar**: Search input (Name or Email), Role filter (`All`, `Requester`, `IT Staff`, `Administrator`).
- **User Table (≥ 768px)**:
  - Columns: Name, Email, Role (shared role badge), Status (`Active` / `Inactive` badge), 1st Login Change, Actions.
  - Actions: "Edit" button and "Reset Pass" (set new initial password) button.
- **Card list (< 768px)**: one card per user with name, status, email, role badge, password-change flag, and Edit / Reset Pass buttons.
- **Create User Modal**: Name, Email, Role dropdown (single role), Initial Password input (same password rules as Change Password; invalid email and duplicate email shown inside the modal).
- **Edit User Modal**: Name, Email, Role, and Active/Inactive toggle switch (deactivation alert).
- **Safety Safeguards**:
  - Active switch disabled (with a BR-19 warning) when editing the current Administrator's own account.
  - Server error shown inside the modal when trying to deactivate or demote the last active Administrator (BR-20).

---

## 5. Responsive Layout Breakdown

| Viewport | Target Width | Layout Strategy |
| :--- | :--- | :--- |
| **Desktop** | `>= 992px` | Multi-column layouts; queue and user tables with all key columns visible without scrolling at 1280px; side-by-side Ticket Detail panels. |
| **Tablet** | `768px - 991px` | Condensed tables (secondary columns folded under the summary); filter bar wraps to two rows; Ticket Detail stacks. |
| **Mobile** | `< 768px` | Single-column stacking; queue and user list rendered as cards instead of tables; header keeps name and role badge visible; full-width modal dialogs. |

Evidence: `artifacts/lab-03/screenshots/` (desktop 1280px, tablet 768px, mobile 375px), regenerated with `npm run screenshots`.

### Visual Checklist (for Lab 3 Part 9 Evidence)
- [x] **Design consistency**: Zen Green colour tokens applied across all screens; new screens match the Lab 2 cards, buttons, and forms.
- [x] **Role navigation**: each role sees only its permitted destinations (`authentication/08-navigation-*.png`, `user-management/11-non-admin-has-no-user-management.png`).
- [x] **Badges**: one shared role badge style everywhere; status and priority badges use distinct colours with readable text; the queue shows both IT and Requested Priority.
- [x] **Editable vs read-only**: editable inputs have white backgrounds and borders; read-only values (e.g. Requested Priority "Immutable", ticket metadata) are plain text or tinted panels.
- [x] **Validation placement**: required fields marked `*`; errors appear directly under the field or at the top of the dialog (`authentication/04b-*`, `user-management/04b-*`, `04c-*`, `06-*`).
- [x] **Focus**: the active input shows a green focus ring; all actions are buttons reachable by keyboard; dialogs use `aria-modal` with a title.
- [x] **Clipping**: no truncated columns or cut-off buttons at 1280px, 768px, or 375px.
- [x] **Overlap**: header, tabs, and dialogs do not overlap content; full-page screenshots are captured from the top of the page.
- [x] **Horizontal overflow**: no page-level horizontal scrolling on any viewport; wide lists switch to cards under 768px.
- [x] **Discussion threads**: Public Comments (grey cards) and Internal Notes (amber cards with a lock icon) are clearly distinguished; Requesters never see Internal Notes.
- [x] **Modals**: create/edit user, set initial password, change password, and attachment removal dialogs fit within mobile viewports.
