# รายงานผลการทดลอง Lab 3: TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens
**วิชา**: CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**ภาคการศึกษา**: 1/2026 &nbsp;|&nbsp; **คะแนนเต็ม**: 60 คะแนน  
**ผู้จัดทำ**: นายอนภัทร พึ่งเทียน (Anapat Phungtian) &nbsp;|&nbsp; **รหัสนักศึกษา**: [ใส่รหัสนักศึกษาของคุณที่นี่] &nbsp;|&nbsp; **Section**: [ใส่ Section เช่น 1, 2, HS]  
**GitHub Repository**: https://github.com/PpAnpt/toktickit  
**Staging Branch**: `lab3-staging` &nbsp;|&nbsp; **Release Branch**: `main`

---

# Answer Part 1: Git Use with Engineering Workflow (10 Points)

### 1.1 ลำดับการทำงานและการแตกกิ่ง Feature Branches
การพัฒนาใน Lab 3 ยึดตามกระบวนการวิศวกรรมซอฟต์แวร์มาตรฐาน โดยแบ่งงานออกเป็น 6 GitHub Issues ย่อย และสร้าง Feature Branch แยกตามแต่ละ Issue เพื่อพัฒนาและทดสอบอย่างเป็นระบบ ก่อนที่จะรวมเข้าสู่ `lab3-staging` และปล่อยขึ้น `main`:

```text
main
  └── lab3-staging
        ├── feature/lab3-1-specs-contract        (PR #18 - Merged)
        ├── feature/lab3-2-auth-foundation       (PR #19 - Merged)
        ├── feature/lab3-3-staff-queue           (PR #20 - Merged)
        ├── feature/lab3-4-staff-operation       (PR #21 - Merged)
        ├── feature/lab3-5-admin-user-management (PR #22 - Merged)
        └── feature/lab3-6-e2e-regression-release(PR #23 - Merged)
```

**หลักฐาน Git Commit History (`git log --oneline`):**
```text
6af3169 docs(lab-03): add peer review template and pull request tracking matrix
32e1073 docs(lab-03): add AI reflection documentation and update README with Lab 3 milestone
9098474 fix(e2e): enhance backwards compatibility and dynamic ticket summaries
a839c25 chore: add playwright test results to gitignore
66b1da8 feat: add e2e test suites for authentication and user administration flows
be48775 test: add E2E test and test results for lab-03 staff ticket flow
9f3f080 test: add last-run.json test results
b6e9c11 test: add E2E tests for authentication and password change flow
e844aa0 test: add Playwright configuration and end-to-end test suites for authentication, staff workflows, and user administration
b4d20f9 Merge pull request #22 from PpAnpt/feature/lab3-5-admin-user-management
5b23c4c Merge pull request #21 from PpAnpt/feature/lab3-4-staff-operation
77140e8 fix(client): add optional metadata fields to StaffTicket type interface
```

---

> 📷 **[แทรกรูปภาพที่ 1.1: ภาพหน้าจอ GitHub Network Graph หรือ Commit History]**  
> * **สิ่งที่ต้องแคป/ใส่รูป**: หน้าจอแสดงประวัติ Git Commits / Network Graph บน GitHub หรือจาก Terminal ที่แสดงการแตกกิ่งและการผสานโค้ดเข้า staging และ main  
> * **คำบรรยายภาพ**: แสดงประวัติการคอมมิตและการผสานสาขา (Merge) จาก 6 Feature Branches เข้าสู่ `lab3-staging` และ `main` อย่างเป็นลำดับขั้นตอน  

---

### 1.2 กระดานติดตามงาน GitHub Projects (Kanban Board)
ทุก Issue ถูกติดตามสถานะผ่าน GitHub Projects Kanban Board โดยมีสถานะครบถ้วนจาก Backlog, In Progress สู่ **Done**:
- **Issue #1**: Sprint 3 Engineering Contract & Specifications (`Done`)
- **Issue #2**: Authentication Foundation, Bcrypt Hashing & MustChangePassword (`Done`)
- **Issue #3**: IT Staff Ticket Queue API & Responsive UI (`Done`)
- **Issue #4**: Staff Operations, State Machine Transitions & Two-Tier Notes (`Done`)
- **Issue #5**: Minimalist Administrator User Management & Safety Guards (`Done`)
- **Issue #6**: E2E Test Automation, Zero Regression & Release Packaging (`Done`)

---

> 📷 **[แทรกรูปภาพที่ 1.2: ภาพหน้าจอ GitHub Projects Kanban Board]**  
> * **สิ่งที่ต้องแคป/ใส่รูป**: หน้าจอ GitHub Projects แสดงคอลัมน์ Done ที่มี Issue #1 ถึง Issue #6 อยู่ครบทั้งหมด  
> * **คำบรรยายภาพ**: กระดานติดตามงาน GitHub Project แสดง Issue ทั้งหมดอยู่ในสถานะ Done สำเร็จครบ 100%  

---

### 1.3 หลักฐานการตรวจทานโค้ด (Peer Review Sign-Off: `docs/lab-03/reviewer.md`)
- **ผู้ตรวจทาน (Reviewer)**: ศิวรักษ์ ฉัตรวิชัย (Siwarak Chatvichai) &nbsp;|&nbsp; **GitHub**: @BBINGOAL
- **รหัสนักศึกษา**: 67070501086
- **สถานะการอนุมัติ**: [x] Approved by Reviewer (@BBINGOAL) ครบถ้วนทุก PR

| Pull Request / บริบท | ความเห็นผู้ตรวจทาน (Reviewer Comment: @BBINGOAL) | คำตอบและการชี้แจง (Author Response: @PpAnpt) | การดำเนินการ (Action Taken) |
|---|---|---|---|
| **PR #18** (`docs: add Lab 3 specifications...`) | ครบถ้วนครับ เรียบร้อยครับ | ขอบคุณครับ จัดทำ Engineering Spec, API Contract, UI Spec และ Test Plan ครบ 24 ACs | Merge เข้าสู่ `lab3-staging` |
| **PR #19** (`Feature/lab3 2 auth foundation`) | โอ้โห้ ครบถ้วนทุกส่วนเลยครับ เรียบร้อยมากครับ | ขอบคุณครับ ใช้ bcryptjs แฮชรหัสผ่าน, JWT สำหรับ Session และระบบ first-login change | Merge เข้าสู่ `lab3-staging` |
| **PR #20** (`Feature/lab3 3 staff queue`) | ตรวจสอบโค้ด Staff Queue API, UI และ Unit Tests แล้ว ผ่านครบถ้วนตาม spec ครับ | ขอบคุณครับ รองรับ Search, Multi-Filter (Status, Priority, Owner) และ Pagination | Merge เข้าสู่ `lab3-staging` |
| **PR #21** (`Feature/lab3 4 staff operation`) | Status transition matrix และ RBAC comments/notes ทำงานถูกต้องตาม spec ครับ | ขอบคุณครับ ควบคุม State Machine ห้ามข้ามขั้นตอน และแยก Internal Notes อย่างปลอดภัย | Merge เข้าสู่ `lab3-staging` |
| **PR #22** (`Feature/lab3 5 admin user management`) | ถูกต้องครบถ้วน เทสผ่านหมดครับ | ขอบคุณครับ มีระบบ Self-deactivation guard และ Sole Admin guard ครบถ้วน | Merge เข้าสู่ `lab3-staging` |
| **PR #23** (`Feature/lab3 6 e2e regression release`) | ครบถ้วนเรียบร้อยดีครับ | ขอบคุณครับ 110 automated tests + 7 E2E tests ผ่าน 100% Zero Regression | Merge เข้าสู่ `lab3-staging` |


### 1.4 โครงสร้างโปรเจกต์และสุขอนามัยของ Repository
- `.gitignore` ป้องกันไม่ให้ไฟล์สภาวะแวดล้อม (.env), dependencies (`node_modules/`), และผลการทดสอบ (`coverage/`, `test-results/`) หลุดขึ้น Repository
- `README.md` อัปเดตครอบคลุมภาพรวมของ Lab 3, สถาปัตยกรรมระบบ, คู่มือการรัน Container และคำสั่งทดสอบครบถ้วน

---

# Answer Part 2: Spec DD (Sprint Specification) (5 Points)

**ลิงก์เอกสารข้อกำหนด**: [`docs/lab-03/specification.md`](./specification.md)

### 2.1 สรุปสาระสำคัญของเอกสารข้อกำหนด (Engineering Contract)
เอกสารข้อกำหนดจัดทำขึ้นและได้รับอนุมัติใน **PR #18** ก่อนเริ่มการ Implement โค้ดหลัก โดยครอบคลุม:

> หมายเหตุ: v1.0 อนุมัติใน PR #18 ก่อนเริ่ม Implement และปรับเป็น v1.1 (2026-09-30) หลังการตรวจทานเทียบ Labsheet — ดูหัวข้อ §12 Revision History ในเอกสาร (เพิ่ม FR-13..14, BR-22..29, AC-25..30)

1. **Functional Requirements (FR-01 ถึง FR-14)**:
   - `FR-01..04`: การยืนยันตัวตนด้วย Email/Password, การเพิกถอนเซสชัน (Logout), การดึงข้อมูลผู้ใช้ปัจจุบัน, และการบังคับเปลี่ยนรหัสผ่านในการเข้าสู่ระบบครั้งแรก
   - `FR-05..08`: หน้าคิวงาน IT Staff (Search, Filter, Sort, Paginate), การรับเป็นเจ้าของตั๋ว (Claim/Reassign), การปรับ IT Priority, และการเปลี่ยนสถานะตาม Lifecycle State Machine
   - `FR-09..10`: เธรดกระดานข้อความสาธารณะ (Public Comments) ระหว่าง Requester และ IT Staff, บันทึกข้อความภายในเฉพาะเจ้าหน้าที่ (Internal Notes - สีเหลืองทอง)
   - `FR-11..12`: ฟังก์ชันผู้แจ้งระบุว่าปัญหาได้รับการแก้ไขแล้ว (Indicate Problem Resolved), หน้าจอจัดการบัญชีผู้ใช้งานสำหรับผู้ดูแลระบบ (Administrator User Management)
   - `FR-13..14`: Logout ที่ยกเลิก session ฝั่งเซิร์ฟเวอร์จริง + ปุ่มเปลี่ยนรหัสผ่านเอง, และเมนูนำทางเฉพาะแต่ละบทบาท

2. **Business Rules & Safety Safeguards (BR-01 ถึง BR-29)**:
   - `BR-01..04`: การแฮชรหัสผ่านด้วย `bcryptjs` (salt rounds = 10) ห้ามส่ง Password Hash กลับไคลเอนต์, บัญชีที่ถูกตั้งรหัสผ่านใหม่จะมีแฟล็ก `mustChangePassword=true`
   - `BR-05..08`: การบังคับใช้สิทธิ์ระดับเซิร์ฟเวอร์ (Server-Side Authorization) ป้องกันการปลอมแปลง `requesterId` หรือเข้าถึงข้ามสิทธิ์
   - `BR-11..13`: สถานะและลำดับความสำคัญถูกควบคุมด้วย **Lifecycle State Machine** ตามข้อกำหนดของ Labsheet อย่างเคร่งครัด:
     - **ชื่อสถานะทั้ง 8 สถานะ**: `New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, และ `Cancelled`
     - **กฎการเปลี่ยนผ่านสถานะ (Permitted Transitions)**:
       - `New` $\rightarrow$ `Open`
       - `Open` $\rightarrow$ `In Progress`
       - `In Progress` $\leftrightarrow$ `Waiting for Requester`
       - `In Progress` / `Waiting for Requester` $\rightarrow$ `Resolved`
       - `Resolved` $\rightarrow$ `Closed` หรือ `Reopened`
       - `Reopened` $\rightarrow$ `In Progress`
       - การยกเลิกตั๋วที่ได้รับอนุญาต $\rightarrow$ `Cancelled` (Terminal State)
       - การเปลี่ยนสถานะที่ไม่อยู่ใน Flow ที่อนุญาต (เช่น `New` ข้ามไป `Resolved` หรือ `Closed` ย้อนมา `Open`) จะถูกเซิร์ฟเวอร์ปฏิเสธด้วย HTTP 400 Bad Request
   - `BR-15..17`: การแยกสิทธิ์เด็ดขาดระหว่าง Public Comments และ Internal Notes (Requester เข้าถึง Internal Notes จะได้รับ 403 Forbidden ทันที โดยไม่รั่วไหลเนื้อหา)
   - `BR-18..21`: ระบบ Soft-Deactivation (ไม่ลบข้อมูลจริงออกจากฐานข้อมูล), **Self-Deactivation Guard** ห้าม Admin ปิดบัญชีของตนเอง, **Last Active Administrator Protection** ห้ามปิดบัญชีหรือเปลี่ยนบทบาทของ Admin คนสุดท้ายที่ยัง Active อยู่ในระบบ
   - `BR-22..29`: นโยบายรหัสผ่าน (8–72 ตัว มีตัวอักษรและตัวเลข), การยกเลิก token เมื่อ logout/เปลี่ยนรหัส/แอดมินตั้งรหัสใหม่, ข้อความ error ที่ไม่เปิดเผยสถานะบัญชี, คืน 404 เมื่อเปิดตั๋วของผู้อื่น (ไม่เปิดเผยว่ามีอยู่), ไม่รับตัวตนจาก client (`X-Requester-Id`), สิทธิ์ route ของ Requester, ตรวจ query parameter ของคิว และตรวจรูปแบบอีเมล

3. **Migration**: ไฟล์ `server/prisma/migrations/20260930120000_lab3_users_roles_workflow` เปลี่ยนชื่อตาราง `RequesterUser` เป็น `User` (id เดิม ตั๋วยังเป็นของคนเดิม), ให้รหัสผ่านเริ่มต้น `Welcome123!` พร้อมบังคับเปลี่ยน, แปลงสถานะ `Pending` → `In Progress` — ทดสอบแล้วข้อมูล Lab 2 ครบและ schema ตรงกับ `schema.prisma`

4. **Product Definition of Done (DoD)**:
   ระบบต้องผ่านเกณฑ์ Acceptance Criteria ครบทั้ง 30 ข้อ (AC-01 ถึง AC-30) พร้อมหลักฐานการทดสอบอัตโนมัติผ่าน 100% บนสาขา `main` โดยไม่มีข้อบกพร่องถดถอย (Zero Regression) ต่อฟีเจอร์เดิมของ Lab 1 และ Lab 2

---

# Answer Part 3: Test DD and Traceability Matrix (10 Points)

**ลิงก์เอกสารแผนการทดสอบ**: [`docs/lab-03/tests.md`](./tests.md)

### 3.1 ตารางความเชื่อมโยงของ Acceptance Criteria กับชุดการทดสอบ (Traceability Matrix)
ตารางแจกแจงรายละเอียดการทดสอบตามรูปแบบที่ข้อกำหนด Labsheet กำหนด (`Test ID` $\rightarrow$ `Test Type` $\rightarrow$ `Requirement / AC` $\rightarrow$ `What It Tests` $\rightarrow$ `Expected Result` $\rightarrow$ `Automated Test File` $\rightarrow$ `Final Result`):

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final |
| :--- | :---: | :--- | :--- | :--- | :--- | :---: |
| **API-01** | API | AC-01, FR-01 | Valid user login | 200 OK; returns JWT token and safe user profile (no password) | `server/tests/lab-03/auth.api.test.ts` | **Pass** |
| **API-02** | API | AC-02, BR-01 | Invalid login credentials | 401 Unauthorized; safe generic error message | `server/tests/lab-03/auth.api.test.ts` | **Pass** |
| **API-03** | API | AC-03, BR-01 | Login with inactive account | 401 Unauthorized; account inactive alert banner | `server/tests/lab-03/auth.api.test.ts` | **Pass** |
| **API-04** | API | AC-04, BR-02 | Mandatory password change | 200 OK; clears `mustChangePassword` flag to false | `server/tests/lab-03/auth.api.test.ts` | **Pass** |
| **API-05** | API | AC-05, BR-05 | Logout session termination | 200 OK; subsequent token access returns 401 Unauthorized | `server/tests/lab-03/auth.api.test.ts` | **Pass** |
| **API-06** | API | AC-06, BR-06 | Requester identity isolation | Ticket created with session identity, ignoring spoofed requesterId | `server/tests/lab-03/authorization.api.test.ts` | **Pass** |
| **API-07** | API | AC-07, FR-05 | Staff Queue role access guard | 200 OK for IT Staff/Admin; 403 Forbidden for Requester | `server/tests/lab-03/staff-queue.api.test.ts` | **Pass** |
| **API-08** | API | AC-08, AC-09 | Queue search, filters & pagination | Correct filtered/sorted records and pagination metadata | `server/tests/lab-03/staff-queue.api.test.ts` | **Pass** |
| **API-09** | API | AC-10, FR-06 | Claim / Reassign ticket owner | 200 OK; `ownerId` updated and recorded in history | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Pass** |
| **API-10** | API | AC-11, BR-11 | Update IT Priority | 200 OK; IT Priority updated, Requested Priority untouched | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Pass** |
| **API-11** | API | AC-12, BR-13 | Permitted & invalid status transitions | Permitted transitions return 200; invalid transitions return 400 | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Pass** |
| **API-12** | API | AC-13, BR-15 | Public Comments creation & query | 201 Created; visible to Requester, Staff, and Admin | `server/tests/lab-03/comments-notes.api.test.ts` | **Pass** |
| **API-13** | API | AC-14, BR-16 | Internal Notes authorization boundary | Staff/Admin get 200/201; Requester gets 403 Forbidden | `server/tests/lab-03/comments-notes.api.test.ts` | **Pass** |
| **API-14** | API | AC-15, BR-14 | Requester indicates problem resolved | 200 OK; sets timestamp without closing ticket prematurely | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | **Pass** |
| **API-15** | API | AC-16, FR-12 | Admin user management access guard | 200 OK for Admin; 403 Forbidden for Staff and Requester | `server/tests/lab-03/users-admin.api.test.ts` | **Pass** |
| **API-16** | API | AC-17, AC-18 | Admin user creation & duplicate email | 201 Created; duplicate email returns 409 Conflict | `server/tests/lab-03/users-admin.api.test.ts` | **Pass** |
| **API-17** | API | AC-19, BR-18 | Admin user edit & deactivation | 200 OK; user soft-deactivated, record not deleted | `server/tests/lab-03/users-admin.api.test.ts` | **Pass** |
| **API-18** | API | AC-20, BR-19 | Admin self-deactivation prevention | 400 Bad Request; prevents Admin deactivating own account | `server/tests/lab-03/users-admin.api.test.ts` | **Pass** |
| **API-19** | API | AC-21, BR-20 | Last active Admin protection | 400 Bad Request; prevents deactivating sole active admin | `server/tests/lab-03/users-admin.api.test.ts` | **Pass** |
| **API-20** | API | AC-22, BR-21 | Admin reset initial password | 200 OK; sets `mustChangePassword=true` forcing first-login change | `server/tests/lab-03/users-admin.api.test.ts` | **Pass** |
| **UI-01** | UI | AC-01, AC-02 | Login component validation & error alert | Form validation triggers; invalid alert renders correctly | `client/src/tests/lab-03/Login.test.tsx` | **Pass** |
| **UI-02** | UI | AC-04, BR-02 | Change Password modal enforcement | Enforces matching passwords and hides main app until saved | `client/src/tests/lab-03/ChangePassword.test.tsx` | **Pass** |
| **UI-03** | UI | AC-08, AC-14 | Staff Ticket Queue rendering & filters | Table renders badges; filter triggers API call; empty state handles | `client/src/tests/lab-03/StaffTicketQueue.test.tsx` | **Pass** |
| **UI-04** | UI | AC-10, AC-13 | Staff Ticket Detail actions & discussion | Action buttons trigger updates; tabs switch comments and notes | `client/src/tests/lab-03/StaffTicketDetail.test.tsx` | **Pass** |
| **UI-05** | UI | AC-17, AC-20 | User Management table & safety checks | Displays users; self-deactivate toggle is locked/disabled | `client/src/tests/lab-03/UserManagement.test.tsx` | **Pass** |
| **E2E-01** | E2E | AC-01, AC-04 | Authentication & first login password change | Full flow: Login $\rightarrow$ Force Password Change $\rightarrow$ Enter App $\rightarrow$ Logout | `e2e/lab-03/authentication.spec.ts` | **Pass** |
| **E2E-02** | E2E | AC-07, AC-10 | Staff queue, claim ticket, comment & resolve | Staff logs in $\rightarrow$ finds ticket $\rightarrow$ claims $\rightarrow$ adds note $\rightarrow$ transitions | `e2e/lab-03/staff-ticket-flow.spec.ts` | **Pass** |
| **E2E-03** | E2E | AC-16, AC-22 | Admin user management & password reset flow | Admin creates user $\rightarrow$ resets pass $\rightarrow$ user logs in & changes pass | `e2e/lab-03/user-administration.spec.ts` | **Pass** |
| **REG-01** | Reg | AC-23 | Lab 2 Requester regression suite | All Lab 2 ticket creation, my-tickets, attachments tests pass 100% | `server/tests/lab-02/*.test.ts`<br>`client/src/tests/*.test.tsx` | **Pass** |

### 3.2 ผลลัพธ์การรันชุดทดสอบอัตโนมัติ (API 121 + UI 40 + E2E 7 = 168 Tests Passed)

> ⚠️ ผลด้านล่างรันบน branch `feature/lab3-7-security-hardening` เมื่อ 2026-10-01 — ให้รันใหม่บน `main` หลัง merge แล้ววางผลจริงแทน (Part 3 ต้องใช้ผลจาก main)

#### 1. ฝั่งเซิร์ฟเวอร์: API, Security & Regression Tests (12 Test Files, 121 Passed)
```text
> server@1.0.0 test
> vitest run --no-file-parallelism

 ✓ tests/lab-01/categories.test.ts (1 test)
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-02/attachments.api.test.ts (7 tests)
 ✓ tests/lab-02/create-ticket.api.test.ts (4 tests)
 ✓ tests/lab-02/my-tickets.api.test.ts (3 tests)
 ✓ tests/lab-02/ticket-detail.api.test.ts (3 tests)
 ✓ tests/lab-03/auth.api.test.ts (22 tests)
 ✓ tests/lab-03/authorization.api.test.ts (11 tests)
 ✓ tests/lab-03/comments-notes.api.test.ts (11 tests)
 ✓ tests/lab-03/staff-queue.api.test.ts (20 tests)
 ✓ tests/lab-03/staff-ticket-detail.api.test.ts (18 tests)
 ✓ tests/lab-03/users-admin.api.test.ts (20 tests)

 Test Files  12 passed (12)
      Tests  121 passed (121)
```

#### 2. ฝั่งไคลเอนต์: Frontend UI Component Tests (11 Test Files, 40 Passed)
```text
> client@0.0.0 test
> vitest run

 ✓ src/tests/AttachmentSection.test.tsx (1 test)
 ✓ src/tests/CreateTicket.test.tsx (1 test)
 ✓ src/tests/MyTickets.test.tsx (1 test)
 ✓ src/tests/RequesterTicketDetail.test.tsx (1 test)
 ✓ src/tests/lab-03/AppShell.test.tsx (6 tests)
 ✓ src/tests/lab-03/ChangePassword.test.tsx (4 tests)
 ✓ src/tests/lab-03/Login.test.tsx (4 tests)
 ✓ src/tests/lab-03/PublicComments.test.tsx (5 tests)
 ✓ src/tests/lab-03/StaffTicketDetail.test.tsx (7 tests)
 ✓ src/tests/lab-03/StaffTicketQueue.test.tsx (5 tests)
 ✓ src/tests/lab-03/UserManagement.test.tsx (5 tests)

 Test Files  11 passed (11)
      Tests  40 passed (40)
```

#### 3. การทดสอบแบบครบวงจร: Playwright End-to-End Tests (4 Test Files, 7 Passed)
```text
Running 7 tests using 1 worker

  ok 1 [chromium] › e2e\lab-02\requester-ticket-flow.spec.ts › Lab 2 Requester regression with authenticated identity
  ok 2 [chromium] › e2e\lab-03\authentication.spec.ts › AC-01 & AC-05: Authenticate with valid credentials and successfully logout
  ok 3 [chromium] › e2e\lab-03\authentication.spec.ts › AC-02: Reject invalid login credentials with safe error alert
  ok 4 [chromium] › e2e\lab-03\authentication.spec.ts › AC-03: Reject inactive user account authentication
  ok 5 [chromium] › e2e\lab-03\authentication.spec.ts › AC-04: Mandatory password change on first login enforcement
  ok 6 [chromium] › e2e\lab-03\staff-ticket-flow.spec.ts › Staff triage flow: Queue search, Claim, IT Priority, Comments & Notes, and Status Transition
  ok 7 [chromium] › e2e\lab-03\user-administration.spec.ts › Admin user journey: User creation, Search/Filter, Self-deactivation guard, and Password Reset login flow

  7 passed
```

---

# Answer Part 4: AI Use with Reflection (5 Points)

**ลิงก์เอกสารการใช้งาน AI**: [`docs/lab-03/ai-use.md`](./ai-use.md)

- **เครื่องมือ AI ที่ใช้**: Google Gemini (ผ่านสภาพแวดล้อม Antigravity IDE) สำหรับ Specification และ Implementation; Claude Opus 5.5 (ผ่าน Claude Code ใน VS Code) สำหรับตรวจทานเทียบ Labsheet และแก้ไขข้อบกพร่อง

### 4.1 ชุดคำสั่งหลักที่ใช้ (Selected Key Prompts)
1. **การวางแผนสถาปัตยกรรมและ Engineering Contract**:  
   *คำสั่ง*: *"ช่วยวิเคราะห์ Lab_3_sheet.md และจัดทำ Sprint Specification, API Contract, UI Wireframe Design, และ Test Plan ละเอียดให้หน่อย"*  
   *ประโยชน์*: ช่วยกำหนด Data Model, Role-Based Access Control (RBAC 3 บทบาท) และการแตกกิ่ง 6 GitHub Issues ย่อยได้อย่างมีแบบแผน
2. **ระบบความปลอดภัยและการยืนยันตัวตน**:  
   *คำสั่ง*: *"ช่วยออกแบบระบบ Authentication ด้วย bcrypt และ JWT พร้อมกลไกบังคับเปลี่ยนรหัสผ่านครั้งแรก (mustChangePassword)"*  
   *ประโยชน์*: ได้ระบบ REST APIs และโมดอล UI ที่ปลอดภัย ป้องกันไม่ให้แฮชรหัสผ่านหลุดกลับไปที่ Client
3. **การออกแบบ State Machine ของ IT Staff Queue**:  
   *คำสั่ง*: *"ช่วยแนะนำการ implement IT Staff Queue พร้อม Search, Filter, Pagination และ Status Transition Machine"*  
   *ประโยชน์*: ควบคุมสถานะตั๋วทั้ง 8 สถานะไม่ให้ข้ามขั้นตอนผิดกฎ พร้อม UI Badges ตาม Zen Green Theme
4. **การแบ่งแยกขอบเขตของ Two-Tier Discussion**:  
   *คำสั่ง*: *"ช่วยออกแบบระบบ Two-Tier Discussion ระหว่าง Public Comments กับ Internal Notes ให้มีสิทธิ์เข้าถึงแยกจากกันอย่างเข้มงวด"*  
   *ประโยชน์*: ปกป้องข้อมูลภายในของทีมช่างไม่ให้ Requester เข้าถึงได้ทั้งระดับ API (403 Forbidden) และระดับ UI
5. **ความปลอดภัยในการบริหารจัดการผู้ใช้งาน (Admin Safety Guards)**:  
   *คำสั่ง*: *"ช่วยเขียนระบบ Admin User Management พร้อมป้องกัน Self-Deactivation และ Last Active Admin Protection"*  
   *ประโยชน์*: เสริมสร้างความปลอดภัยระดับสูง ป้องกันไม่ให้แอดมินปิดบัญชีตัวเองหรือปิดบัญชีแอดมินคนสุดท้ายของระบบ
6. **การสร้างชุดทดสอบ Playwright E2E ให้เป็นแบบ Idempotent**:  
   *คำสั่ง*: *"ช่วยเขียน Playwright E2E Tests ทดสอบ User Journey ครบทั้ง Auth, Staff Triage, และ Admin Lifecycle ให้เป็นแบบ Idempotent"*  
   *ประโยชน์*: สามารถรันซ้ำเพื่อตรวจสอบความถูกต้องได้ทุกเมื่อโดยข้อมูลไม่ขัดแย้งกัน
7. **การตรวจทานงานเทียบ Labsheet (Claude)**:  
   *คำสั่ง*: *"can you check all of the work done compared to @Lab_3_sheet.md and make sure every task and requirement are done correctly and neatly"*  
   *ประโยชน์*: พบช่องโหว่สำคัญที่เทสต์เดิมไม่ได้ตรวจ เช่น header `X-Requester-Id` ปลอมตัวตนได้โดยไม่ต้องล็อกอิน, logout ไม่ได้ยกเลิก token, ไม่มี migration ของ Lab 3 และ Requester ยังไม่มีหน้า Public Comments
8. **การแก้ไขข้อบกพร่องที่พบ (Claude)**:  
   *คำสั่ง*: *"can you fixes the part that are still needed to fix"*  
   *ประโยชน์*: แก้ความปลอดภัยฝั่งเซิร์ฟเวอร์, เพิ่ม migration และฐานข้อมูลทดสอบแยก, เพิ่ม UI ที่ขาด, ปรับ layout มือถือ และเพิ่มเทสต์จาก 110 เป็น 168 ข้อ

### 4.2 บทสะท้อนความคิดเห็นส่วนตัว (My Reflection)
การใช้งานผู้ช่วย AI ใน Lab 3 แสดงให้เห็นถึงประโยชน์สูงสุดของการพัฒนาซอฟต์แวร์ด้วยแนวคิด Spec-Driven และ Test-Driven Development:
1. **คุณภาพโค้ดและความปลอดภัย**: AI ช่วยทวนสอบเรื่องความปลอดภัยตามหลักการ Security by Design เช่น การไม่เชื่อข้อมูลที่ส่งมาจากไคลเอนต์ (Client-side input) และการย้ำเตือนว่าการซ่อนปุ่มบน UI ไม่ใช่การป้องกันสิทธิ์ที่แท้จริง ต้องมีการตรวจ Authorization ที่ Endpoint เสมอ
2. **การป้องกัน Regression**: การมีชุดทดสอบครอบคลุม 168 ข้อทำให้กล้าที่จะปรับเปลี่ยนโครงสร้างขนาดใหญ่ (เช่น การลบ Dev Requester Selector ทิ้งและแทนที่ด้วยระบบ Auth จริง) โดยมั่นใจได้เต็มร้อยว่าฟังก์ชันการส่งตั๋วและแนบไฟล์ของ Lab 2 ยังคงทำงานได้อย่างสมบูรณ์

---

# Answer Part 5: Working Login and Password Change UI (5 Points)

แสดงผลการทำงานของระบบเข้าสู่ระบบ, การตรวจสอบความถูกต้องของข้อมูล, การแจ้งเตือนข้อผิดพลาดที่ปลอดภัย, และการบังคับเปลี่ยนรหัสผ่านในครั้งแรก

---

> 📷 **[แทรกรูปภาพ 5.1: หน้าจอเข้าสู่ระบบปกติ (Login Desktop)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/01-login-desktop.png`  
> * **คำบรรยายภาพ**: หน้าจอ Login ออกแบบด้วยธีม Zen Green เรียบง่าย สวยงาม แสดงฟิลด์ Email, Password และปุ่ม Sign In  

---

> 📷 **[แทรกรูปภาพ 5.2: การแจ้งเตือนกรณีรหัสผ่านไม่ถูกต้อง (Invalid Credentials)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/02-login-invalid-credentials.png`  
> * **คำบรรยายภาพ**: กล่องข้อความแจ้งเตือนสีแดงแสดงข้อความที่ปลอดภัย "Invalid email or password" เมื่อกรอกรหัสผ่านผิด  

---

> 📷 **[แทรกรูปภาพ 5.3: การปฏิเสธบัญชีที่ถูกปิดการใช้งาน (Inactive Account)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/03-login-inactive-account.png`  
> * **คำบรรยายภาพ**: ปฏิเสธการเข้าสู่ระบบทันทีหากบัญชีอยู่ในสถานะ Inactive / Soft-deactivated พร้อมข้อความเตือนชัดเจน  

---

> 📷 **[แทรกรูปภาพ 5.4: หน้าจอบังคับเปลี่ยนรหัสผ่านครั้งแรก (Mandatory Password Change)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/04-mandatory-password-change.png`  
> * **คำบรรยายภาพ**: ระบบตรวจพบแฟล็ก `mustChangePassword=true` และเปิดหน้าต่างบังคับเปลี่ยนรหัสผ่าน โดยยังไม่ให้เข้าสู่หน้าหลักของแอปพลิเคชัน  

---

> 📷 **[แทรกรูปภาพ 5.5: เข้าสู่ระบบสำเร็จหลังเปลี่ยนรหัสผ่าน (After Password Change)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/05-after-password-change-logged-in.png`  
> * **คำบรรยายภาพ**: ผู้ใช้เข้าสู่หน้า Dashboard หลังตั้งรหัสผ่านใหม่สำเร็จ และระบบเคลียร์แฟล็ก `mustChangePassword` เป็น `false`  

---

> 📷 **[แทรกรูปภาพ 5.6: แถบ Navbar แสดงข้อมูลผู้ใช้และบทบาท (Authenticated Navbar)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/08-navigation-requester.png`  
> * **คำบรรยายภาพ**: แสดงชื่อผู้ใช้งาน, ป้าย Role Badge แสดงสิทธิ์, และปุ่ม Logout โดยไม่มี Dev Selector หลงเหลืออยู่  

---

> 📷 **[แทรกรูปภาพ 5.7: ออกจากระบบสำเร็จ (After Logout)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/07-after-logout.png`  
> * **คำบรรยายภาพ**: เมื่อคลิก Logout เซสชันจะถูกทำลายและนำผู้ใช้กลับสู่หน้า Login โดยไม่สามารถกดย้อนกลับเพื่อเข้าถึงข้อมูลเดิมได้  

---

# Answer Part 6: Working IT Staff Ticket Queue UI (5 Points)

แสดงผลหน้าจอคิวงานของฝ่ายบริการไอที พร้อมข้อมูลตั๋วเสมือนจริง รองรับการค้นหา การกรองหลายมิติ (Status, Priority, Owner) การเรียงลำดับ (Sorting) การแบ่งหน้า (Pagination) การแสดงสถานะ Assigned/Unassigned การแสดง Status/Priority Badge การเปิด Ticket Detail รวมถึงการแสดง Empty/No Results และ Failure State อย่างเหมาะสม

### สรุปฟังก์ชันการทำงานในหน้า Staff Ticket Queue:
1. **การค้นหาและกรองหลายมิติ (Search & Multi-Filter)**: ค้นหาตั๋วด้วยคีย์เวิร์ด (เลขตั๋ว, สรุปปัญหา, หรือชื่อผู้แจ้ง) พร้อมตัวกรองสถานะ (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`), ตัวกรองระดับความสำคัญ (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), และตัวกรองผู้รับผิดชอบงาน (`All`, `Unassigned`, `Assigned to Me`, หรือระบุช่างเฉพาะบุคคล)
2. **การเรียงลำดับและการแบ่งหน้า (Sorting & Pagination)**: รองรับการจัดเรียงตามวันที่อัปเดตหรือระดับความสำคัญ พร้อมปุ่ม Previous / Next และตัวระบุหน้าปัจจุบัน
3. **การเปิดดูรายละเอียดตั๋ว (Open Ticket Detail)**: สามารถคลิกที่แถวของตั๋วในตารางเพื่อเปิดเข้าสู่หน้า IT Staff Ticket Detail ได้โดยตรง
4. **การจัดการสถานะพิเศษ (Empty, No Results & Failure States)**:
   - กรณีไม่มีตั๋วในระบบเลย จะแสดง Empty Queue Graphic
   - กรณีค้นหาหรือกรองแล้วไม่พบตั๋วตรงเงื่อนไข จะแสดง No Results State พร้อมปุ่ม Clear Filters เพื่อคืนค่าการค้นหาทันที
   - กรณีเกิดข้อผิดพลาดในการดึงข้อมูล จะแสดง Failure State แจ้งเตือนอย่างปลอดภัย

---

> 📷 **[แทรกรูปภาพ 6.1: ภาพรวมคิวงาน IT Staff (Queue Desktop)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/01-queue-desktop.png`  
> * **คำบรรยายภาพ**: ตารางคิวงาน IT Staff แสดงรายการตั๋ว, เลขตั๋ว, ผู้แจ้ง, ป้ายสถานะ, ป้ายระดับความสำคัญ, และสถานะการมอบหมายงาน (Assigned / Unassigned)  

---

> 📷 **[แทรกรูปภาพ 6.2: การค้นหาตั๋วงานด้วยคีย์เวิร์ด (Search Results)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/02-queue-search-results.png`  
> * **คำบรรยายภาพ**: ช่องค้นหาทำงานแบบ Real-time ดึงตั๋วที่มีคำค้นหาตรงกับหัวข้อปัญหา หรือชื่อผู้แจ้งได้อย่างแม่นยำ  

---

> 📷 **[แทรกรูปภาพ 6.3: การกรองตั๋วตามสถานะ (Filtered by Status)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/03-queue-filtered-by-status.png`  
> * **คำบรรยายภาพ**: ผลการกรองเฉพาะตั๋วที่มีสถานะ `In Progress` ช่วยให้เจ้าหน้าที่จัดการงานได้อย่างสะดวกรวดเร็ว  

---

# Answer Part 7: Working IT Staff Ticket Detail UI (10 Points)

แสดงรายละเอียดตั๋วงานแบบ 2 คอลัมน์, การรับมอบหมายงาน (Claim) และการมอบหมาย/เปลี่ยนผู้รับผิดชอบ (Reassign), การปรับลำดับความสำคัญของช่าง (IT Priority), การเปลี่ยนสถานะตาม Lifecycle State Machine, การแยกส่วน Public Comments กับ Internal Notes, และการแสดงสถานะ/การดำเนินการที่ผู้แจ้งสามารถระบุว่า “Problem Appears Resolved” เพื่อยืนยันว่าปัญหาได้รับการแก้ไขแล้ว

### กฎความปลอดภัยและการตรวจสอบสิทธิ์:
- **Validation & Safe Failure**: ระบบตรวจสอบข้อมูลก่อนดำเนินการทุก action และเมื่อเกิดข้อผิดพลาดจะแสดงข้อความแจ้งเตือนที่เหมาะสมโดยไม่เปิดเผยข้อมูลภายในหรือข้อมูลทางเทคนิคที่ไม่จำเป็น
- **Direct API Authorization**: การควบคุมสิทธิ์ทำทั้งฝั่ง UI และ Server/API โดยการเรียก API ที่ไม่ได้รับอนุญาต (เช่น Requester พยายามเรียกขอข้อมูล Internal Notes) จะถูกปฏิเสธด้วย HTTP 403 Forbidden เสมอ

---

> 📷 **[แทรกรูปภาพ 7.1: หน้ารายละเอียดตั๋วงาน (Ticket Detail Overview)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/01-ticket-detail-before-claim.png`  
> * **คำบรรยายภาพ**: แสดงข้อมูลตั๋วครบถ้วน: หัวข้อ, หมวดหมู่, ระบบที่เกี่ยวข้อง, คำอธิบายปัญหา, รายการไฟล์แนบ, บัตรข้อมูลผู้แจ้ง, และสถานะการระบุ Problem Resolved ของผู้แจ้ง  

---

> 📷 **[แทรกรูปภาพ 7.2: ปุ่มรับมอบหมายงานและการมอบหมายงาน (Claim / Reassign)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/01-ticket-detail-before-claim.png`  
> * **คำบรรยายภาพ**: แสดงปุ่ม "Claim Ticket" สำหรับตั๋วที่ยังไม่มีผู้รับผิดชอบ หรือตัวเลือก Reassign เพื่อเปลี่ยนเจ้าหน้าที่ผู้รับผิดชอบตั๋ว  

---

> 📷 **[แทรกรูปภาพ 7.3: ข้อมูลเจ้าหน้าที่หลังกด Claim (After Claim)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/02-after-claim-status-open.png`  
> * **คำบรรยายภาพ**: ชื่อผู้รับผิดชอบตั๋วถูกปรับเป็นเจ้าหน้าที่ที่กด Claim ทันที พร้อมบันทึกประวัติ  

---

> 📷 **[แทรกรูปภาพ 7.4: กระดานข้อความสาธารณะ (Public Comments)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/04-public-comments.png`  
> * **คำบรรยายภาพ**: เธรดการสื่อสารสาธารณะระหว่างเจ้าหน้าที่ไอทีและผู้แจ้งปัญหา แสดงการตอบรับและซักถาม  

---

> 📷 **[แทรกรูปภาพ 7.5: บันทึกภายในเฉพาะเจ้าหน้าที่ (Internal Notes - สีเหลืองทอง)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/05-internal-notes.png`  
> * **คำบรรยายภาพ**: บันทึกภายในแสดงด้วยพื้นหลังสีเหลืองทองและไอคอนล็อก ชี้ชัดว่าเป็นข้อมูลลับของทีมช่าง ซึ่ง Requester จะไม่เห็นและไม่สามารถเข้าถึงได้ (API บล็อกด้วย 403 Forbidden)  

---

> 📷 **[แทรกรูปภาพ 7.6: การเปลี่ยนสถานะตาม State Machine (Status Dropdown)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/06-status-transition-in-progress.png`  
> * **คำบรรยายภาพ**: Dropdown แสดงเฉพาะสถานะถัดไปที่ได้รับอนุญาตตามกฎ State Machine เท่านั้น ไม่สามารถข้ามขั้นตอนผิดกฎได้  

---

# Answer Part 8: Working Administrator User Management UI (5 Points)

แสดงหน้าจอการจัดการบัญชีผู้ใช้งานของผู้ดูแลระบบ, การสร้างผู้ใช้, การแก้ไขข้อมูล, การสลับสถานะ Active, กฎความปลอดภัย Safety Rules และการป้องกันสิทธิ์แบบ RBAC

### กฎความปลอดภัยระดับผู้ดูแลระบบ (Safety Safeguards):
1. **Self-Deactivation Guard (BR-19)**: ระบบป้องกันไม่ให้ Admin ปิดการใช้งานบัญชีของตนเอง โดยสวิตช์ปิดบัญชีจะถูกปิดกั้น (Disabled) ทันทีเมื่อเปิดบัญชีตนเอง พร้อมแสดงข้อความแจ้งเตือนสีแดง
2. **Last Active Administrator Protection (BR-20)**: ระบบป้องกันไม่ให้ Admin ปิดการใช้งานบัญชีหรือเปลี่ยน Role ของ Administrator คนสุดท้ายที่ยัง Active อยู่ เพื่อป้องกันระบบไม่เหลือผู้ดูแล (Sole Admin Guard)
3. **Initial Temporary Password (BR-21)**: แอดมินสามารถตั้งรหัสผ่านชั่วคราวใหม่ให้ผู้ใช้ได้ โดยระบบจะบังคับให้ผู้ใช้ต้องเปลี่ยนรหัสผ่าน (`mustChangePassword=true`) ทันทีที่ล็อกอินในครั้งถัดไป
4. **RBAC Endpoint Protection**: ป้องกันไม่ให้ผู้ใช้ที่ไม่ใช่ Admin เข้าถึงหน้าจอหรือเรียกใช้ API จัดการผู้ใช้ โดยคำขอจะถูกปฏิเสธด้วย HTTP 403 Forbidden

---

> 📷 **[แทรกรูปภาพ 8.1: ตารางรายชื่อผู้ใช้งานระบบ (User List Desktop)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/01-user-list-desktop.png`  
> * **คำบรรยายภาพ**: แสดงตารางผู้ใช้ทั้งหมดพร้อม Name, Email, Role badge, Status badge, แฟล็กบังคับเปลี่ยนรหัสผ่าน และปุ่ม Action (Edit / Reset Pass)  

---

> 📷 **[แทรกรูปภาพ 8.2: การค้นหาผู้ใช้ด้วยชื่อหรืออีเมล (User Search)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/02-user-search.png`  
> * **คำบรรยายภาพ**: การค้นหาผู้ใช้งานแบบไดนามิก รองรับทั้งค้นหาตามชื่อและค้นหาตามอีเมล  

---

> 📷 **[แทรกรูปภาพ 8.3: การกรองผู้ใช้งานตามบทบาท (Filter by Role)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/03-filter-by-role.png`  
> * **คำบรรยายภาพ**: คัดกรองรายชื่อเฉพาะกลุ่มผู้ใช้ เช่น IT_STAFF หรือ ADMINISTRATOR  

---

> 📷 **[แทรกรูปภาพ 8.4: หน้าต่างสร้างบัญชีผู้ใช้ใหม่ (Create User Modal)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/04-create-user-modal.png`  
> * **คำบรรยายภาพ**: Modal สร้างผู้ใช้ใหม่ กำหนดชื่อ, อีเมล, เลือก 1 บทบาทที่อนุญาต และตั้งรหัสผ่านเริ่มต้น (Temporary Password)  

---

> 📷 **[แทรกรูปภาพ 8.5: การแจ้งเตือนป้องกันการใช้อีเมลซ้ำ (Duplicate Email 409 Conflict)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/04b-duplicate-email-validation.png`  
> * **คำบรรยายภาพ**: เมื่อกรอกอีเมลที่มีในระบบแล้ว ระบบจะแสดงกล่องข้อความเตือนความผิดพลาดสีแดง ป้องกันอีเมลซ้ำซ้อนตามกฎความปลอดภัย (HTTP 409 Conflict)  

---

> 📷 **[แทรกรูปภาพ 8.6: หน้าต่างแก้ไขข้อมูลผู้ใช้และสวิตช์ Active (Edit User Modal)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/07-edit-user-modal.png`  
> * **คำบรรยายภาพ**: แก้ไขชื่อ, อีเมล, บทบาท และสวิตช์เปิด/ปิดการใช้งานบัญชี (Active/Inactive Toggle Switch)  

---

> 📷 **[แทรกรูปภาพ 8.7: กฎความปลอดภัยห้ามแอดมินปิดบัญชีตัวเอง (Self-Deactivation Guard)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/05-self-deactivation-guard.png`  
> * **คำบรรยายภาพ**: Safety Rule BR-19: สวิตช์ปิดบัญชีจะถูกปิดกั้น (Disabled) ทันทีเมื่อ Admin เปิดดูบัญชีของตัวเอง พร้อมข้อความเตือนสีแดง  

---

> 📷 **[แทรกรูปภาพ 8.8: การรีเซ็ตรหัสผ่านชั่วคราวโดยผู้ดูแลระบบ (Reset Password Modal)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/08-set-new-initial-password-modal.png`  
> * **คำบรรยายภาพ**: Admin สามารถตั้งรหัสผ่านชั่วคราวใหม่ให้ผู้ใช้ โดยระบบจะบังคับให้ผู้ใช้ต้องเปลี่ยนรหัสผ่านทันทีเมื่อเข้าสู่ระบบในครั้งถัดไป  

---

> 📷 **[แทรกรูปภาพ 8.9: การป้องกันการเข้าถึงของสิทธิ์อื่นที่ไม่ใช่แอดมิน (Non-Admin Navigation Guard)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/11-non-admin-has-no-user-management.png`  
> * **คำบรรยายภาพ**: การป้องกันสิทธิ์ RBAC: เมื่อล็อกอินด้วยผู้ใช้ทั่วไปหรือ IT Staff แท็บเมนู "User Management" จะถูกซ่อนอย่างสมบูรณ์ และการเรียก API ตรงจะถูกบล็อกด้วย 403 Forbidden  

---

# Answer Part 9: Zen Green UI and Responsive Evidence (5 Points)

**ลิงก์เอกสารข้อกำหนดด้าน UI**: [`docs/lab-03/ui-spec.md`](./ui-spec.md)

### 9.1 หลักฐานความเข้ากันได้บนอุปกรณ์พกพา (Tablet และ Mobile Viewports)

#### 1. หน้าจอ Authentication (Login)
---
> 📷 **[แทรกรูปภาพ 9.1A: หน้า Login บน Tablet (768×1024)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/09-login-tablet.png`  
> * **คำบรรยายภาพ**: การจัดวางการ์ด Login กึ่งกลางหน้าจออย่างสมดุลบน Tablet Viewport  

> 📷 **[แทรกรูปภาพ 9.1B: หน้า Login บน Mobile (375×812)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/10-login-mobile.png`  
> * **คำบรรยายภาพ**: การ์ด Login ปรับความกว้างเต็มหน้าจอมือถือ ปุ่มและอินพุตกดง่าย ไม่ล้นจอ  
---

#### 2. หน้าจอ IT Staff Ticket Queue
---
> 📷 **[แทรกรูปภาพ 9.2A: หน้า Queue บน Tablet (768×1024)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/08-queue-tablet.png`  
> * **คำบรรยายภาพ**: ตารางตั๋วและแถบค้นหา/ตัวกรองแสดงผลกระชับ พอดีกับหน้าจอ Tablet  

> 📷 **[แทรกรูปภาพ 9.2B: หน้า Queue บน Mobile (375×812)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/09-queue-mobile.png`  
> * **คำบรรยายภาพ**: แถบเครื่องมือและตารางจัดเรียงแนวตั้ง เลื่อนอ่านง่าย ไม่มี Horizontal Scroll  
---

#### 3. หน้าจอ IT Staff Ticket Detail
---
> 📷 **[แทรกรูปภาพ 9.3A: หน้า Ticket Detail บน Tablet (768×1024)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/07-ticket-detail-tablet.png`  
> * **คำบรรยายภาพ**: เลย์เอาต์ 2 คอลัมน์ปรับขนาดการ์ดแสดงผลรายละเอียดตั๋วและเธรดความคิดเห็นอย่างลงตัว  

> 📷 **[แทรกรูปภาพ 9.3B: หน้า Ticket Detail บน Mobile (375×812)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/08-ticket-detail-mobile.png`  
> * **คำบรรยายภาพ**: เลย์เอาต์เปลี่ยนเป็นการเรียงซ้อนแบบ Single-column แท็บความคิดเห็นสลับใช้งานได้คล่องตัว  
---

#### 4. หน้าจอ Administrator User Management
---
> 📷 **[แทรกรูปภาพ 9.4A: หน้า User Management บน Tablet (768×1024)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/09-user-management-tablet.png`  
> * **คำบรรยายภาพ**: ตารางแสดงข้อมูลผู้ใช้และการดำเนินการ Edit / Reset Pass อ่านง่าย ชัดเจนบน Tablet  

> 📷 **[แทรกรูปภาพ 9.4B: หน้า User Management บน Mobile (375×812)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/10-user-management-mobile.png`  
> * **คำบรรยายภาพ**: การแสดงผลบน Mobile รองรับการสัมผัส และ Modal หน้าต่างป๊อปอัปแสดงพอดีกับหน้าจอมือถือ ไม่ถูกตัดขอบ  
---

### 9.2 แบบตรวจสอบความสอดคล้องด้านการออกแบบและการตอบสนอง (Visual & Responsive Checklist)
- [x] **การเลือกใช้ชุดสี Zen Green**: ใช้งานสีหลัก `#006B3C` (เขียวเข้มสุภาพ), สีลำดับรอง `#0B7A46`, สีพื้นหลังโทนอ่อน `#EAF6EF` และ `#F5F7F6` อย่างกลมกลืนทั่วทั้งระบบ
- [x] **การไร้การเลื่อนหน้าจอในแนวนอน (Zero Horizontal Scrolling)**: ทุกหน้าจอทั้ง Desktop, Tablet (768px), และ Mobile (375px) ปรับขนาดอัตโนมัติ ไม่มีข้อความหรือตารางล้นออกนอกจอ
- [x] **หน้าต่างกล่องโต้ตอบ (Modal Dialogs)**: หน้าต่างสร้างบัญชี, แก้ไขบัญชี, รีเซ็ตรหัสผ่าน และเปลี่ยนรหัสผ่านครั้งแรก มีขนาดพอดีกับหน้าจอมือถือ ไม่ถูกบดบังหรือตกขอบ
- [x] **ความชัดเจนของตัวอักษรและป้ายสถานะ**: สีของตัวอักษรและป้ายสถานะมีความแตกต่างจากพื้นหลังอย่างชัดเจน เพื่อให้อ่านข้อมูลได้ง่าย
- [x] **การแยกแยะแถบการสนทนา**: แยกแยะระหว่าง Public Comments (การ์ดขาวขอบมาตรฐาน) และ Internal Notes (การ์ดสีเหลืองทอง `#FFFBEB` ขอบทอง พร้อมไอคอนแม่กุญแจ) อย่างชัดเจน
