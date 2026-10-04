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
- **PR 8 (#[เลข PR])**: https://github.com/PpAnpt/toktickit/pull/[เลข PR] — Release documentation (`feature/lab3-8-release-docs`)
- **Release PR (#[เลข PR])**: https://github.com/PpAnpt/toktickit/pull/[เลข PR] — `lab3-staging` → `main`

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
| **PR #[เลข PR]** (`Feature/lab3 8 release docs`) | [คัดลอกความเห็นจริงของ reviewer จาก PR] | [คัดลอกคำตอบจริงจาก PR] | Merge เข้าสู่ `lab3-staging` |
| **PR #[เลข PR]** (`lab3-staging` → `main`) | [คัดลอกความเห็นจริงของ reviewer จาก PR] | [คัดลอกคำตอบจริงจาก PR] | Merge เข้าสู่ `main` |

## 4. Final Approval
- [ ] Approved by Reviewer (@BBINGOAL) — PR #18–#24 approved; รออนุมัติ PR release docs และ release PR (`lab3-staging` → `main`)

