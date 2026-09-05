# Lab 2 UI Specification: Zen Green Theme

## 1. Color Tokens & Typography
### Colors
- **Primary Green**: `#006B3C` (App header, primary actions, strong emphasis)
- **Secondary Green**: `#0B7A46` (Active tabs, focus accents, links, hover states)
- **Pale Green**: `#EAF6EF` (Selected, success, subtle section emphasis)
- **Page Background**: `#F5F7F6` (Quiet near-white)
- **Surface / Cards**: `#FFFFFF` (White with subtle border and restrained shadow)
- **Text**: `#1A2F25` (Dark charcoal-green, not pure black, for comfortable reading)
- **Error**: `#B30000` (Dark red text and border for errors)
- **Warning**: `#D97706` (Amber callout or badge)
- **Success**: `#006B3C` or similar green confirmation (must have readable text, not rely on color alone)

### Typography & Spacing
- **Font**: System fonts or modern sans-serif (e.g., Inter, Roboto).
- **Labels**: Appear above controls with consistent font weight (e.g., medium/semibold) and spacing.
- **Spacing**: Use a consistent multiple (e.g., 4px/8px grid) for margins and padding.

## 2. Component States & Rules
### Form Controls
- **Editable Field**: White background with clear neutral border. Consistent height across inputs.
- **Read-only Field**: Soft gray-green or warm ivory shading; clearly distinct from editable but still readable.
- **Required Fields**: Indicated by a red asterisk `*`. The asterisk does not replace validation messages.
- **Multiline Description**: Taller and resizable only if it does not break layout.
- **Focus**: Focus indicators must remain visible for keyboard users.
- **Disabled**: Visually distinct (e.g., reduced opacity, gray background) and cannot be activated.

### Buttons & Actions
- **Primary Action**: Primary Green background, white text.
- **Secondary Action**: White background, Primary/Secondary Green border and text.
- **Busy State**: Submit button shows a busy indicator (e.g., spinner, "Submitting...") and is disabled during processing.
- **Icons**: Icons may support but must not replace unclear text. Icon-only controls require accessible labels/tooltips.

### Validation & Feedback
- **Validation Messages**: Appear immediately below the associated field, using Error color.
- **Success State**: Clearly displays the generated Ticket Number and next action.

## 3. Screen Layouts

### Application Shell & Navigation
- **Header**: TokTickIT application identity, Development Requester identity display.
- **Navigation**: Links for "My Tickets" and "Create Ticket". Clear active-page indication. Responsive mobile navigation (e.g., hamburger menu on small screens).

### Development Requester Selection Screen
- **Elements**: TokTickIT title, explanatory text (testing only, no auth), Dropdown for active Requesters, "Continue" button.
- **States**: Loading state, empty state (if no active requesters), safe API-failure state. Keyboard-accessible controls.

### Create Ticket Screen (Create Mode)
- **Layout**: System-generated fields (near top), classification fields grouped, Summary and Description given sufficient width, Attachments below main fields, actions at bottom.
- **Attachments**: Display selected files, upload progress, invalid states (oversized/wrong type), and soft-remove option for pending uploads.

### My Tickets Screen
- **Layout**: Ticket list showing Ticket Number, Summary, Category, Current Status, Last Updated.
- **Controls**: Search bar, filters (e.g., by status or category), sorting options, pagination controls.
- **States**: Meaningful loading, empty (no tickets), no-results (search found nothing), and failure states.

### Requester Ticket Detail Screen (View Mode)
- **Layout**: Read-only presentation of ticket data.
- **Attachments**: Show active attachments with download links. Show soft-removed attachments with metadata but without download/preview ability.
- **Exclusions**: No Public Comments, Internal Notes, or Actions Taken features in Lab 2.

## 4. Responsive Rules
- **Desktop (>= 992px)**: Multi-column layout as specified; content centered with a sensible maximum width. Table view for My Tickets is acceptable.
- **Tablet (768-991px)**: Two-column layout where practical; Summary and Description receive enough width.
- **Mobile (< 768px)**: Fields stack vertically; buttons remain touch-friendly; no horizontal page scrolling. Use Card view for My Tickets instead of a wide table.
- **All Sizes**: No clipped labels, overlapping messages, hidden buttons, or unreadable attachment names.

## 5. Visual Inspection Checklist
- [ ] Colors match Zen Green Theme tokens.
- [ ] Form states (error, focus, disabled, read-only) match spec.
- [ ] Mobile view doesn't scroll horizontally.
- [ ] Required field asterisks and error messages are placed correctly.
- [ ] Badges for Priority/Status are styled consistently.
- [ ] All buttons have visible text or accessible labels.
- [ ] Responsive UI verified via screenshots (`artifacts/lab-02/screenshots/`).
