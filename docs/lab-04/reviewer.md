# Lab 4: Peer Review

## 1. Reviewer Identity
- **Name**: Siwarak Chatvichai
- **Student ID**: 67070501086
- **GitHub Username**: @BBINGOAL

Every Lab 4 Pull Request went into `lab4-staging` and was **merged by the reviewer** after approving it. One review on PR #39 was an automated Codex review (see the table); all other reviews are by @BBINGOAL.

## 2. Pull Request Links
- **PR 1 (#37)**: https://github.com/PpAnpt/toktickit/pull/37 — Sprint 4 contract and test plan (`feature/lab4-1-contract`, Issue #30)
- **PR 2 (#38)**: https://github.com/PpAnpt/toktickit/pull/38 — Actions Taken data, API and Ticket Detail UI (`feature/lab4-2-actions-taken`, Issue #31)
- **PR 3 (#39)**: https://github.com/PpAnpt/toktickit/pull/39 — Ticket workflow, resolution gate and conflict handling (`feature/lab4-3-workflow`, Issue #32)
- **PR 4 (#40)**: https://github.com/PpAnpt/toktickit/pull/40 — Requester and IT Staff dashboards (`feature/lab4-4-dashboards`, Issue #33)
- **PR 5 (#41)**: https://github.com/PpAnpt/toktickit/pull/41 — Final hardening and regression (`feature/lab4-5-hardening`, Issue #34)
- **PR 6 (#42)**: https://github.com/PpAnpt/toktickit/pull/42 — release documentation (`feature/lab4-6-release`, Issue #35)
- **Release PR**: `lab4-staging` → `main` — see section 5

## 3. Review Rounds and Responses
Each round lists what the reviewer found, what the author answered and what was changed. Every finding below was valid and was fixed before the approval.

| PR / Round | Reviewer Comment (@BBINGOAL) | Author Response (@PpAnpt) | Action Taken |
|---|---|---|---|
| **#37**, round 1 (Changes requested) | [P1] The contract treated "Assign" as the Ticket Owner and gave an Action no status; [P2] no way to audit an edited action afterwards; [P2] the Recently Resolved drill-down could not find the Closed Tickets the card counts; [P2] failed-migration recovery was mixed up with undoing a successful migration | Agreed on all four. The author had assumed the Ticket Owner is the assignee and that PATCH overwrites are enough | Added a per-action assignee and a status lifecycle, append-only revisions and Ticket events with a database trigger, `recent=resolved`, and a restore-of-a-dump recovery |
| **#37**, round 2 (Changes requested) | The three earlier points are fixed (assignee and lifecycle, history with immutability, `recent=resolved`). One point left: section 7.4 and MIG-02 still used `migrate resolve --rolled-back` after a migration that had succeeded, which Prisma 7 does not support | Agreed; recovery after a successful upgrade is a restore of a dump, and `--rolled-back` only applies to a failed migration | Recovery rewritten as a restore of a pre-upgrade `pg_dump`, MIG-02 checks schema, data and `_prisma_migrations`; the author also ran a self-audit against the labsheet and reported what it found |
| **#37**, round 3 (Approved) | Section 7.4 now separates the two cases. The reviewer also checked the self-audit additions: foreign keys `ON DELETE RESTRICT` (BR-40), only Completed actions on a Resolved Ticket (BR-41), `IDEMPOTENCY_KEY_REUSED` for a reused key with different content, `expectedUpdatedAt` required on every Ticket write | — | Contract version 1.2; merged into `lab4-staging` by @BBINGOAL |
| **#38**, round 1 (Changes requested) | [P2] Close discarded an unsaved Action draft without asking; [P2] a conflict draft was lost when its Action moved to another page; [P2] a status such as `constructor` caused a `500`; [P2] pending/conflict state was lost when the form moved to the detached editor | The author's tests covered the intended path only; each case was reproduced with a failing test first | Discard prompt, editor state lifted into the parent component, own-key status lookup, deferred-response regression tests (UI-33..39, API-27) |
| **#38**, round 2 (Changes requested) | Confirmed the status fix; two cases of the draft/lock state still reset on remount | Reproduced both; the lock and busy state moved to the same parent | Editor values, errors, stale/conflict, busy and the in-flight lock survive page moves |
| **#38**, round 3 (Approved) | Confirmed with the deferred-promise tests | — | Merged by @BBINGOAL |
| **#39**, automated Codex review (Commented) | [P2] Reload after a conflict unmounted Actions Taken and lost the draft | Valid; the author reproduced it | Reload refreshes silently and keeps the screen mounted (UI-14) |
| **#39**, round 1 (Changes requested) | [P2] "Appears resolved" was not atomic with the Ticket workflow (a Requester could indicate after Staff had resolved); [P2] an Action draft was hidden when the Ticket became Closed or Cancelled | The first fix (a larger token step) only looked atomic; the real fix locks the Ticket row | `indicateResolved` runs in the same locked transaction; the draft stays visible but locked, and Close / Cancel ask first |
| **#39**, round 2 (Approved) | Confirmed against commit `50b0a4b`, including the Resolved date and the hidden stale notice | — | Merged by @BBINGOAL |
| **#40**, round 1 (Changes requested) | [P2] Clicking Ticket Queue again while on the queue kept the dashboard filters; [P2] My Tickets from the menu kept Search and Category; [P2] a `/tickets/:id` link opened before sign-in marked the Dashboard as current | All three valid: the author tested the menu only after leaving the page and deep links only after a restored session | Queue remount key, full clear of My Tickets filters, one `tabForLocation` rule for sign-in and restore; four UI-25 tests that fail on the old code |
| **#40**, round 2 (Approved) | Confirmed against commit `1613e24` | — | Merged by @BBINGOAL |
| **#41**, round 1 (Changes requested) | [P1] The performance test dropped a database with a fixed name without proving it had created it; note: the PR text said p95 under 16 ms, the summary showed 18-19 ms | Both valid | Unique scratch database per run, plain `CREATE DATABASE`, test-environment guard, ownership handle; the PR text was corrected |
| **#41**, round 2 (Changes requested) | [P2] The guard test's own teardown could drop a database it had not created | Same mistake in the test helper; the author had fixed only the main test | The decoy database got the same handle and guard; two more regression tests |
| **#41**, round 3 (Approved) | Confirmed against commit `1f59059` | — | Merged by @BBINGOAL |

## 4. What the Reviews Changed
- 16 inline findings plus the review-level points in 5 Pull Requests (14 review rounds, 5 approvals), none rejected. Most were cases that the author's tests did not cover: unsaved text lost on a status change or a remount, parallel requests, inherited property names, menu clicks repeated on the same page, and cleanup code that could delete something the test did not create.
- After PR #38 the author added a pre-submit checklist: every write that touches a Ticket goes through the row lock; every status change asks which unsaved text it hides; every message has a place where it is cleared; async tests use deferred responses; destructive test helpers prove they created what they delete.

## 5. Release Pull Requests
PR #42 (documentation, into `lab4-staging`) is listed above and is reviewed like the others. The release PR `lab4-staging` → `main` is opened after #42 is merged; its link and result are added to the submission report.
