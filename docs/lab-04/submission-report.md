# รายงานผลการทดลอง Lab 4: TokTickIT Actions Taken, Ticket Workflow, Dashboards and Final Hardening
**วิชา**: CPE 334 Introduction to Software Engineering in the Age of AI Agents | **ผู้จัดทำ**: Anapat Banjerdsilp | **รหัสนักศึกษา**: 67070501049 | **GitHub**: @PpAnpt
**Repository**: https://github.com/PpAnpt/toktickit | **Staging Branch**: `lab4-staging` | **Release Branch**: `main` | **Kanban**: https://github.com/users/PpAnpt/projects/3
**Reviewer**: ศิวรักษ์ ฉัตรวิชัย (Siwarak Chatvichai), 67070501086, @BBINGOAL

Repository และ branch `main` เป็นแหล่งอ้างอิงหลัก เอกสารที่ render ในรายงานนี้คือไฟล์ใน `docs/lab-04/` ณ commit ที่ระบุในแต่ละ Part

# Answer Part 1: Git Use with Engineering Workflow

## 1.1 Branch flow
```text
main
  └── lab4-staging
        ├── feature/lab4-1-contract        PR #37  Issue #30  merged 2026-10-31
        ├── feature/lab4-2-actions-taken   PR #38  Issue #31  merged 2026-10-31
        ├── feature/lab4-3-workflow        PR #39  Issue #32  merged 2026-11-01
        ├── feature/lab4-4-dashboards      PR #40  Issue #33  merged 2026-11-01
        ├── feature/lab4-5-hardening       PR #41  Issue #34  merged 2026-11-01
        └── feature/lab4-6-release         release documents  Issue #35
```
แต่ละ feature branch เปิด Pull Request เข้า `lab4-staging`, ผ่านการ review ของ @BBINGOAL และถูก merge โดยผู้ review ก่อน release PR `lab4-staging` → `main`

## 1.2 Merge history on `lab4-staging` (`git log --first-parent`)
| Commit | Date | Merge |
|---|---|---|
| `75bf978` | 2026-10-31 10:31 | PR #37 contract and test plan |
| `3233633` | 2026-10-31 22:41 | PR #38 Actions Taken |
| `6a4771a` | 2026-11-01 14:53 | PR #39 Ticket workflow |
| `2ddd20e` | 2026-11-01 16:03 | PR #40 Dashboards |
| `b4d34e6` | 2026-11-01 17:30 | PR #41 Hardening |

## 1.3 GitHub Project / Kanban (all Lab 4 issues)
| Issue | Title | Status |
|---|---|---|
| #30 | Engineering Contract & Test Plan | Done |
| #31 | Actions Taken: Data, API & Ticket Detail UI | Done |
| #32 | Ticket Workflow, Resolution Gate & Conflict Handling | Done |
| #33 | Role Dashboards: Requester & IT Staff | Done |
| #34 | Final Regression, Hardening & Polish | Done |
| #35 | Release Documentation & Submission Evidence | Done when the release PR is merged |

## 1.4 Peer review record
{{include docs/lab-04/reviewer.md}}

## 1.5 README and .gitignore
README (setup, migration, seed, tests, demonstration): https://github.com/PpAnpt/toktickit/blob/main/README.md. `.gitignore` excludes `node_modules/`, `.env`, `uploads/`, `test-results/`, `playwright-report/`, generated report PDFs and `.claude/settings.local.json`; no secret or generated file is committed.

## 1.6 Repository structure (Lab 4 parts)
```text
docs/lab-04/        specification.md  api-spec.md  ui-spec.md  tests.md  reviewer.md  ai-use.md  submission-report.md
server/tests/lab-04/   actions-taken, ticket-workflow, requester-dashboard, staff-dashboard, history, migration, seed,
                       safe-errors, performance-smoke, scratch-db, transition-matrix, dashboard-window, ... (15 files)
client/src/tests/lab-04/  ActionsTaken, TicketWorkflow, StaffDashboard, RequesterDashboard, Navigation, Accessibility
e2e/lab-04/         actions-taken-flow, ticket-resolution, dashboards, responsive-accessibility
artifacts/lab-04/   screenshots/{staff-dashboard,requester-dashboard,actions-taken,ticket-workflow}  performance/  test-output/
```

# Answer Part 2: Spec DD

Link: https://github.com/PpAnpt/toktickit/blob/main/docs/lab-04/specification.md (also `api-spec.md` and `ui-spec.md`).

**Evidence that the specification existed before the implementation PRs:** the file was first committed on 2026-10-29 and merged with PR #37 on **2026-10-31 10:31**; the first implementation PR (#38) was merged on 2026-10-31 22:41, after it.

{{include docs/lab-04/specification.md}}

# Answer Part 3: Test DD and Traceability

Link: https://github.com/PpAnpt/toktickit/blob/main/docs/lab-04/tests.md. Planned rows 158, Final **Pass** 158 (section 5 of the document explains how each row was matched to the passing output).

| Suite | Command | Result |
|---|---|---|
| Server | `npm --prefix server test` | 258 passed, 0 failed (26 files) |
| Client | `npm --prefix client test` | 128 passed, 0 failed (17 files) |
| Playwright E2E | `npm run test:e2e` | 33 passed, 0 failed |

Complete output: `artifacts/lab-04/test-output/server.txt`, `client.txt`, `e2e.txt` (commit `b4d34e6`, the code that the release PR brings to `main`). Run on `main` after the release merge: see the last paragraph of this Part.

{{include docs/lab-04/tests.md}}

**Run on `main` after the release merge:** *(filled in after the merge: commit, and the three results above)*

# Answer Part 4: AI Use with Reflection

{{include docs/lab-04/ai-use.md}}

# Answer Part 5: Working IT Staff Dashboard UI

Metrics: Unassigned, My Active Tickets, Urgent, Reopened, Resolved - Awaiting Closure, By status, By priority, Recent Tickets, My Recent Actions (and an Accounts strip for the Administrator). Every card is a link that opens the Ticket Queue with the filter in the **Owner / Priority / Status** controls (`ui-spec.md` 4.2a).

**Counts match database queries.** `server/tests/lab-04/staff-dashboard.api.test.ts` compares each number with SQL that is independent of the application code, for IT Staff and the Administrator (SDASH-02, 03, 04, 05, 08 pass). Example of the SQL used (Urgent, effective priority and Active statuses):
```sql
SELECT count(*) FROM "Ticket"
WHERE COALESCE("itPriority","requestedPriority")::text = 'URGENT'
  AND "status"::text IN ('New','Open','In Progress','Waiting for Requester','Reopened');
```
Drill-down parity (SDASH-08 and E2E-10): for every card and breakdown row the queue "Total in Queue" equals the number shown. Empty database: every metric is 0 and every list is empty (SDASH-06). Forbidden (403), loading, empty and error states: UI-17..20. Responsive: no horizontal scroll at 1280, 768 and 375 px (RSP-01).

:::pair
![IT Staff dashboard, desktop](../../artifacts/lab-04/screenshots/staff-dashboard/desktop-dashboard.png)
![Administrator dashboard with the Accounts strip, desktop](../../artifacts/lab-04/screenshots/staff-dashboard/desktop-dashboard-administrator.png)
:::

:::pair
![Staff dashboard, tablet 768 px](../../artifacts/lab-04/screenshots/staff-dashboard/tablet-dashboard.png)
![Staff dashboard, mobile 375 px](../../artifacts/lab-04/screenshots/staff-dashboard/mobile-dashboard.png)
:::

![Drill-down: Unassigned card opens the queue with Owner = Unassigned and Status = Active](../../artifacts/lab-04/screenshots/staff-dashboard/desktop-drill-down-unassigned.png)

# Answer Part 6: Working Actions Taken UI

Demonstrated by `E2E-01..05, 13..15` and `UI-01..09, 26..29, 33..39`: list (newest first, paginated), create, assign (active IT Staff and Administrators only), edit, start, complete and cancel (Result required), validation under each field, rejection of the inactive assignee in the UI and by a direct API call (`400` naming `assigneeId`), double-click protection, stale-conflict banner with kept text, read-only view for Requesters, and a per-action history. Different actions with different assignees and statuses on one Ticket are in the seed (Ticket TKT-2026-000001) and in E2E-13.

:::pair
![Actions Taken list on a Ticket with several actions, assignees and statuses (desktop)](../../artifacts/lab-04/screenshots/actions-taken/desktop-staff-list.png)
![Add action form with validation messages under the fields (desktop)](../../artifacts/lab-04/screenshots/actions-taken/desktop-staff-create-validation.png)
:::

:::pair
![Action history (Before / After), staff only (desktop)](../../artifacts/lab-04/screenshots/actions-taken/desktop-staff-history.png)
![Requester sees the list read-only, no controls (desktop)](../../artifacts/lab-04/screenshots/actions-taken/desktop-requester-readonly.png)
:::

:::pair
![Actions Taken, tablet](../../artifacts/lab-04/screenshots/actions-taken/tablet-staff-list.png)
![Actions Taken, mobile](../../artifacts/lab-04/screenshots/actions-taken/mobile-staff-list.png)
:::

# Answer Part 7: Working Ticket Workflow

Permitted transitions follow the final matrix (`specification.md`, tested for all 8 x 8 pairs in `transition-matrix.unit.test.ts` and `WF-01..14`): only allowed buttons are shown; the server refuses everything else with `400`. The resolution gate requires at least one Completed action and none Planned or In Progress (`RESOLUTION_GATE_FAILED`, with the reasons). Cancelling a Ticket cancels its open actions with `AUTO_CANCELLED` revisions. The Requester's "appears resolved" never changes the status. History (status, owner, priority events and action revisions) is append-only: a database trigger rejects `UPDATE` and `DELETE` (HIST-07), the order is stable (HIST-05), and Requesters get `403` on the history endpoints (HIST-08).

:::pair
![Status controls (desktop)](../../artifacts/lab-04/screenshots/ticket-workflow/desktop-status-controls.png)
![Resolution gate refusal (desktop)](../../artifacts/lab-04/screenshots/ticket-workflow/desktop-resolution-gate.png)
:::

:::pair
![Cancel confirmation (desktop)](../../artifacts/lab-04/screenshots/ticket-workflow/desktop-cancel-confirm.png)
![Conflict message with Reload (desktop)](../../artifacts/lab-04/screenshots/ticket-workflow/desktop-conflict.png)
:::

![Resolved Ticket with its history timeline (desktop)](../../artifacts/lab-04/screenshots/ticket-workflow/desktop-resolved-with-history.png)

:::pair
![Resolution gate, tablet](../../artifacts/lab-04/screenshots/ticket-workflow/tablet-resolution-gate.png)
![Resolution gate, mobile](../../artifacts/lab-04/screenshots/ticket-workflow/mobile-resolution-gate.png)
:::

# Answer Part 8: Working Requester Dashboard and Final Regression UI

**Requester dashboard.** Open Tickets, Waiting for You, Recently Updated and Recently Resolved (last 7 days, Asia/Bangkok), "Needs your attention" and "Recent Tickets" lists with at most 5 rows, quick actions. Only the signed-in Requester's Tickets are used (DASH-04, AC-02); staff get `403` (DASH-01). Each card opens My Tickets with a filter whose total equals the card (DASH-09, DASH-10, E2E-09), including a Ticket that was resolved and then closed inside the window and excluding one resolved before it.

:::pair
![Requester dashboard (desktop)](../../artifacts/lab-04/screenshots/requester-dashboard/desktop-dashboard.png)
![Recently Resolved opens My Tickets with the same number (desktop)](../../artifacts/lab-04/screenshots/requester-dashboard/desktop-drill-down-recently-resolved.png)
:::

:::pair
![Requester with zero cards and explanations (desktop)](../../artifacts/lab-04/screenshots/requester-dashboard/desktop-zero-cards.png)
![Forbidden state when a Requester opens the staff dashboard URL (desktop)](../../artifacts/lab-04/screenshots/requester-dashboard/desktop-forbidden.png)
:::

:::pair
![Requester dashboard, tablet](../../artifacts/lab-04/screenshots/requester-dashboard/tablet-dashboard.png)
![Requester dashboard, mobile](../../artifacts/lab-04/screenshots/requester-dashboard/mobile-dashboard.png)
:::

**Final regression.** The complete Lab 1 to Lab 3 suites run unchanged inside the three runs of Part 3 (REG-01..03): authentication and first-login password change (E2E-01), the Requester ticket lifecycle with attachments, comments and the resolved indication (Lab 2 E2E), IT Staff queue, detail, Public Comments and Internal Notes (E2E-02), and Administrator user management (E2E-03). A console sweep signs in as each role and fails on any console error, page error or HTTP error (`responsive-accessibility.spec.ts`). The only change to those older tests is that they open Create Ticket / Ticket Queue from the menu, because every role now lands on its Dashboard (AC-29).

# Answer Part 9: Zen Green UI, Responsive, Accessibility and Final Polish

**Evidence:** `ui-spec.md` (rendered below, with the completed checklist in its last section), the screenshots of Parts 5 to 8 at 1280, 768 and 375 px, and these tests: `RSP-01..03` (no horizontal scroll, form and status buttons inside the viewport at the three widths), `A11Y-01` (add and edit an action with the keyboard only, fields reached by their labels; My Tickets cards open with Enter), `A11Y-02` (2px #0B7A46 focus ring, Escape closes the editor and returns the focus), `STY-01..03` (the follow-up badge says "Follow-up needed", messages are alerts with words, editable and read-only fields differ), `ERR-01` (safe generic 500 errors), `PERF-01/02` (p95 21 to 32 ms for six endpoints against a 1,000 ms limit on 5,000 Tickets and 20,000 actions; `artifacts/lab-04/performance/summary.json`).

Defects found while writing these tests and fixed in PR #41: the follow-up badge said only "Follow-up"; Bootstrap hid the focus outline on buttons; Escape did not close the editor and focus was lost; My Tickets cards could not be opened from the keyboard. **Not measured:** colour contrast was checked by design tokens and screenshots, not with an automated contrast tool.

{{include docs/lab-04/ui-spec.md}}
