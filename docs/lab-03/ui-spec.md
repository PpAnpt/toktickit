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
  - Right-aligned Profile Area: User full name, Role badge, and `Logout` button.
  - Development Requester Selector: **Completely removed**.

---

## 4. Screen Specifications

### 4.1 Login Screen
- Centered card layout on `#F5F7F6` background.
- Form inputs: Email address, Password.
- "Sign In" button with busy indicator.
- Error alerts: Invalid credentials, inactive account warning banner.

### 4.2 Mandatory Change Password Screen
- Modal or dedicated view intercepting entry if `mustChangePassword === true`.
- Explanatory prompt notifying that the initial password must be updated.
- Inputs: Current Password, New Password, Confirm New Password.
- Password criteria checklist (minimum length, confirmation matching).
- Normal application navigation is hidden until completed.

### 4.3 IT Staff Ticket Queue Screen
- **Header & Stats Bar**: Shows active queue count.
- **Search & Filter Bar**:
  - Keyword search input (ticket number, summary, requester name).
  - Status filter dropdown (`All`, `New`, `Open`, `In Progress`, etc.).
  - Priority filter dropdown (`All`, `LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - Owner filter dropdown (`All`, `Unassigned`, `Assigned to Me`, `Specific Staff`).
- **Data Table / Card List**:
  - Columns: Ticket Number, Summary, Requester, Status, Requested Priority, IT Priority, Owner, Last Updated.
  - Row click opens IT Staff Ticket Detail.
- **States**: Loading skeleton, Empty queue illustration, No-search-results prompt with clear filters button.
- **Pagination**: Previous/Next buttons, current page indicator, page size selector.

### 4.4 IT Staff Ticket Detail Screen
- **Top Navigation Bar**: "Back to Queue" button, Ticket Number heading, and current Status badge.
- **Action Control Bar**:
  - Ownership: "Claim Ticket" button or dropdown to assign/reassign to staff member.
  - IT Priority: Select dropdown to adjust IT Priority independently.
  - Status Workflow: Dropdown / Action buttons showing only valid next statuses.
- **Main Section (2-Column Layout on Desktop)**:
  - Left Column: Issue details (Summary, Category, Related System, Full Description, Attachments download list).
  - Right Column: Requester info card, Resolution indication notice (if flagged by requester), and Activity / Discussion feed (Public Comments and Internal Notes tabs).

### 4.5 Administrator User Management Screen
- **Header**: Title "User Management", total active users counter, and "+ Create User" primary action button.
- **Filter Bar**: Search input (Name or Email), Role filter (`All`, `Requester`, `IT Staff`, `Administrator`).
- **User Table**:
  - Columns: Full Name, Email Address, Role (with badge), Status (`Active` / `Inactive` badge), Actions.
  - Actions: "Edit" button and "Reset Password" button.
- **Create User Modal**: Name, Email, Role dropdown (single role), Initial Password input.
- **Edit User Modal**: Name, Email, Role, and Active/Inactive toggle switch (deactivation alert).
- **Safety Safeguards**:
  - Deactivate button disabled for current logged-in Administrator account.
  - Warning alert if trying to deactivate the sole active Administrator.

---

## 5. Responsive Layout Breakdown

| Viewport | Target Width | Layout Strategy |
| :--- | :--- | :--- |
| **Desktop** | `>= 992px` | Multi-column layouts; full data tables with sortable columns; side-by-side Ticket Detail panels. |
| **Tablet** | `768px - 991px` | Condensed tables or responsive card rows; stacked filter bars; responsive drawer navigation if needed. |
| **Mobile** | `< 768px` | Single-column vertical stacking; ticket cards instead of wide tables; sticky bottom action bars; full-width modal dialogs. |

### Visual Checklist (for Lab 3 Part 9 Evidence)
- [x] Consistent Zen Green color tokens applied across all screens.
- [x] Clear visual distinction between editable fields and read-only elements.
- [x] Required field indicators (`*`) paired with descriptive error messages.
- [x] Status and Priority badges render with distinct color schemes and readable text.
- [x] Dual discussion tabs (Public Comments vs. Internal Notes) visually differentiated.
- [x] Zero horizontal scrolling on Mobile (<768px) and Tablet viewports.
- [x] All modals and dropdowns fit comfortably within mobile viewports without clipping.
