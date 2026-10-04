# Lab 3: Peer Review

## 1. Reviewer Identity
- **Name**: Siwarak Chatvichai
- **Student ID**: 67070501086
- **GitHub Username**: @BBINGOAL

## 2. Pull Request Links
- **PR 1 (#18)**: https://github.com/PpAnpt/toktickit/pull/18
- **PR 2 (#19)**: https://github.com/PpAnpt/toktickit/pull/19
- **PR 3 (#20)**: https://github.com/PpAnpt/toktickit/pull/20
- **PR 4 (#21)**: https://github.com/PpAnpt/toktickit/pull/21
- **PR 5 (#22)**: https://github.com/PpAnpt/toktickit/pull/22
- **PR 6 (#23)**: https://github.com/PpAnpt/toktickit/pull/23
- **PR 7 (#24)**: https://github.com/PpAnpt/toktickit/pull/24 — Lab 3 hardening (`feature/lab3-7-security-hardening`)
- **PR 8 (#25)**: https://github.com/PpAnpt/toktickit/pull/25 — Release documentation (`feature/lab3-8-release-docs`)
- **PR 9 (#26)**: https://github.com/PpAnpt/toktickit/pull/26 — Release preparation (`feature/lab3-9-release-prep`)
- **Release PR (#27)**: https://github.com/PpAnpt/toktickit/pull/27 — `lab3-staging` → `main`
- **PR 10 (#28)**: https://github.com/PpAnpt/toktickit/pull/28 — Submission evidence & documentation sync (`feature/lab3-10-submission-evidence`)
- **PR (#29)**: https://github.com/PpAnpt/toktickit/pull/29 — `lab3-staging` → `main` (submission evidence)

## 3. Comments and Responses
| PR / Context | Reviewer Comment (@BBINGOAL) | Author Response (@PpAnpt) | Action Taken |
|---|---|---|---|
| **PR #18** (`docs: add Lab 3 specifications, test plan, UI guidelines...`) | ครบถ้วนครับ เรียบร้อยครับ | ขอบคุณครับ จัดทำ Engineering Spec, API Contract, UI Spec, และ Test Plan ครบทั้ง 24 Acceptance Criteria ครับ | ตรวจสอบความถูกต้องและ Merge เข้าสู่ `lab3-staging` |
| **PR #19** (`Feature/lab3 2 auth foundation`) | โอ้โห้ ครบถ้วนทุกส่วนเลยครับ เรียบร้อยมากครับ | ขอบคุณครับ ใช้ bcryptjs แฮชรหัสผ่าน, JWT สำหรับ Session และบังคับเปลี่ยนรหัสผ่านเมื่อ `mustChangePassword=true` | รันเทสผ่านและ Merge เข้าสู่ `lab3-staging` |
| **PR #20** (`Feature/lab3 3 staff queue`) | ตรวจสอบโค้ด Staff Queue API, UI และ Unit Tests แล้ว ผ่านครบถ้วนตาม spec ครับ | ขอบคุณครับ รองรับ Search, Multi-Filter (Status, Priority, Owner), Pagination และป้องกันสิทธิ์ RBAC เรียบร้อยครับ | รันเทสผ่านและ Merge เข้าสู่ `lab3-staging` |
| **PR #21** (`Feature/lab3 4 staff operation`) | Status transition matrix และ RBAC comments/notes ทำงานถูกต้องตาม spec ครับ | ขอบคุณครับ ควบคุม State Machine ห้ามข้ามขั้นตอน และแยกระหว่าง Public Comments กับ Internal Notes อย่างปลอดภัยครับ | รันเทสผ่านและ Merge เข้าสู่ `lab3-staging` |
| **PR #22** (`Feature/lab3 5 admin user management`) | ถูกต้องครบถ้วน เทสผ่านหมดครับ | ขอบคุณครับ มีระบบ Self-deactivation guard และ Sole Admin guard พร้อมระบบรีเซ็ตรหัสผ่านเริ่มต้นเรียบร้อยครับ | รันเทสผ่านและ Merge เข้าสู่ `lab3-staging` |
| **PR #23** (`Feature/lab3 6 e2e regression release`) | ครบถ้วนเรียบร้อยดีครับ | ขอบคุณครับ ครอบคลุมการรันเทส 110 ข้อ และ E2E 7 ข้อ รันผ่าน 100% Zero Regression ครับ | ตรวจสอบผลการรันเทสต์และ Merge เข้าสู่ `lab3-staging` |
| **PR #24** (`Feature/lab3 7 security hardening`) | เรียบร้อยครับ (Approved) | ขอบคุณครับ | Approved และ Merge เข้าสู่ `lab3-staging` โดย @BBINGOAL (2026-10-04) |
| **PR #25** (`Feature/lab3 8 release docs`) | เรียบร้อยดีครับ (Approved) | ขอบคุณครับ | Approved และ Merge เข้าสู่ `lab3-staging` โดย @BBINGOAL (2026-10-04) |
| **PR #26** (`Feature/lab3 9 release prep`) | — (ไม่มีความเห็น) | — | Merge เข้าสู่ `lab3-staging` โดย @PpAnpt (2026-10-04) ไม่มี review |
| **PR #27** (`Release: Lab 3 lab3-staging → main`) | — (ไม่มีความเห็น) | — | Merge เข้าสู่ `main` โดย @PpAnpt (2026-10-04, commit `13e94da`) ไม่มี review |

## 4. Final Approval
- [x] Approved by Reviewer (@BBINGOAL) — PR #18–#25 approved and merged into `lab3-staging`
- [ ] PR #26 (release preparation) และ PR #27 (`lab3-staging` → `main`) — merge โดยผู้จัดทำโดยไม่มี review

