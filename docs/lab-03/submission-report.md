# รายงานผลการทดลอง Lab 3: TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens
**วิชา**: CPE 334 Introduction to Software Engineering in the Age of AI Agents  
**ภาคการศึกษา**: 1/2026 &nbsp;|&nbsp; **คะแนนเต็ม**: 60 คะแนน  
**ผู้จัดทำ**: นายอนภัทร พึ่งเทียน (Anapat Phungtian) &nbsp;|&nbsp; **รหัสนักศึกษา**: [ใส่รหัสนักศึกษาของคุณที่นี่] &nbsp;|&nbsp; **Section**: [ใส่ Section เช่น 1, 2, HS]  
**GitHub Repository**: https://github.com/PpAnpt/toktickit  
**Staging Branch**: `lab3-staging` &nbsp;|&nbsp; **Release Branch**: `main`

---

# Answer Part 1: Git Use with Engineering Workflow (10 Points)

### 1.1 ลำดับการทำงานและการแตกกิ่ง Feature Branches
การพัฒนาใน Lab 3 ยึดตามกระบวนการวิศวกรรมซอฟต์แวร์มาตรฐาน โดยแบ่งงานเป็น Feature Branch แยกตามงานแต่ละส่วน พัฒนาและทดสอบอย่างเป็นระบบ ก่อนรวมเข้าสู่ `lab3-staging` และปล่อยขึ้น `main` หลังตรวจทานงานเทียบกับ Labsheet พบช่องโหว่และข้อกำหนดที่ยังขาด จึงเพิ่ม Feature Branch ที่ 7 สำหรับแก้ไขก่อนปล่อยขึ้น `main`:

```text
main
  └── lab3-staging
        ├── feature/lab3-1-specs-contract           (PR #18 - Merged)
        ├── feature/lab3-2-auth-foundation          (PR #19 - Merged)
        ├── feature/lab3-3-staff-queue              (PR #20 - Merged)
        ├── feature/lab3-4-staff-operation          (PR #21 - Merged)
        ├── feature/lab3-5-admin-user-management    (PR #22 - Merged)
        ├── feature/lab3-6-e2e-regression-release   (PR #23 - Merged)
        ├── feature/lab3-7-security-hardening       (PR #24 - Merged)
        └── feature/lab3-8-release-docs             (PR #[เลข PR] - [สถานะ])
```

**หลักฐาน Git Commit History (`git log --oneline lab3-staging`):**
```text
ae201be Merge pull request #24 from PpAnpt/feature/lab3-7-security-hardening
7fdc9cb docs(lab-03): update submission report, reviewer log, and UI spec for hardening work
542cf4c docs(lab-03): specification v1.1, API/UI specs, traceability, and README
6be2b0e test(e2e): rewrite requester regression, harden flows, add screenshot capture
f324e09 feat(client): authenticated requester flow, public comments, and responsive fixes
215969d fix(server): enforce authenticated identity, real logout, and Lab 3 migration
c0f6fff fix(client): remove legacy dev requester selector from login page
7f49cf4 Merge pull request #23 from PpAnpt/feature/lab3-6-e2e-regression-release
6af3169 docs(lab-03): add peer review template and pull request tracking matrix
32e1073 docs(lab-03): add AI reflection documentation and update README with Lab 3 milestone
b4d20f9 Merge pull request #22 from PpAnpt/feature/lab3-5-admin-user-management
5b23c4c Merge pull request #21 from PpAnpt/feature/lab3-4-staff-operation
28f2653 Merge pull request #20 from PpAnpt/feature/lab3-3-staff-queue
83d7a92 Merge pull request #19 from PpAnpt/feature/lab3-2-auth-foundation
2d35451 Merge pull request #18 from PpAnpt/feature/1-specs-contract
```
> ⚠️ หลัง merge `lab3-staging` → `main` แล้ว ให้รัน `git log --oneline --graph -20 main` แล้วแคปหน้าจอใส่รูปที่ 1.1 เพื่อแสดงว่างานขึ้น `main` แล้ว

---

> 📷 **[แทรกรูปภาพที่ 1.1: ภาพหน้าจอ GitHub Network Graph หรือ Commit History]**  
> * **สิ่งที่ต้องแคป/ใส่รูป**: หน้าจอแสดงประวัติ Git Commits / Network Graph บน GitHub หรือจาก Terminal ที่แสดงการแตกกิ่งและการผสานโค้ดเข้า staging และ main  
> * **คำบรรยายภาพ**: แสดงประวัติการคอมมิตและการผสานสาขา (Merge) จาก 7 Feature Branches เข้าสู่ `lab3-staging` และ `main` อย่างเป็นลำดับขั้นตอน  

---

### 1.2 กระดานติดตามงาน GitHub Projects (Kanban Board)
ทุก Issue ถูกติดตามสถานะผ่าน GitHub Projects Kanban Board โดยมีสถานะครบถ้วนจาก Backlog, In Progress สู่ **Done**:
- **Issue #1**: Sprint 3 Engineering Contract & Specifications (`Done`)
- **Issue #2**: Authentication Foundation, Bcrypt Hashing & MustChangePassword (`Done`)
- **Issue #3**: IT Staff Ticket Queue API & Responsive UI (`Done`)
- **Issue #4**: Staff Operations, State Machine Transitions & Two-Tier Notes (`Done`)
- **Issue #5**: Minimalist Administrator User Management & Safety Guards (`Done`)
- **Issue #6**: E2E Test Automation, Zero Regression & Release Packaging (`Done`)
- **Issue #[เลข]**: Security Hardening, Lab 3 Migration & Requester Public Comments (`Done`)

> ⚠️ ตรวจเลข Issue ให้ตรงกับบน GitHub ก่อนส่ง: บน GitHub เลข #1–#23 เป็น Pull Request ทั้งหมด หาก Kanban ใช้ draft item ให้กด "Convert to issue" ก่อน แล้วแก้เลขในรายการด้านบนให้ตรง

---

> 📷 **[แทรกรูปภาพที่ 1.2: ภาพหน้าจอ GitHub Projects Kanban Board]**  
> * **สิ่งที่ต้องแคป/ใส่รูป**: หน้าจอ GitHub Projects แสดงคอลัมน์ Done ที่มี Issue ทั้ง 7 รายการอยู่ครบทั้งหมด  
> * **คำบรรยายภาพ**: กระดานติดตามงาน GitHub Project แสดง Issue ทั้งหมดอยู่ในสถานะ Done สำเร็จครบ 100%  

---

### 1.3 หลักฐานการตรวจทานโค้ด (Peer Review Sign-Off: `docs/lab-03/reviewer.md`)
- **ผู้ตรวจทาน (Reviewer)**: ศิวรักษ์ ฉัตรวิชัย (Siwarak Chatvichai) &nbsp;|&nbsp; **GitHub**: @BBINGOAL
- **รหัสนักศึกษา**: 67070501086
- **สถานะการอนุมัติ**: PR #18–#24 Approved by Reviewer (@BBINGOAL) — [อัปเดตเมื่อ PR release docs และ release PR ขึ้น `main` ได้รับ Approve]

| Pull Request / บริบท | ความเห็นผู้ตรวจทาน (Reviewer Comment: @BBINGOAL) | คำตอบและการชี้แจง (Author Response: @PpAnpt) | การดำเนินการ (Action Taken) |
|---|---|---|---|
| **PR #18** (`docs: add Lab 3 specifications...`) | ครบถ้วนครับ เรียบร้อยครับ | ขอบคุณครับ จัดทำ Engineering Spec, API Contract, UI Spec และ Test Plan ครบ 24 ACs | Merge เข้าสู่ `lab3-staging` |
| **PR #19** (`Feature/lab3 2 auth foundation`) | โอ้โห้ ครบถ้วนทุกส่วนเลยครับ เรียบร้อยมากครับ | ขอบคุณครับ ใช้ bcryptjs แฮชรหัสผ่าน, JWT สำหรับ Session และระบบ first-login change | Merge เข้าสู่ `lab3-staging` |
| **PR #20** (`Feature/lab3 3 staff queue`) | ตรวจสอบโค้ด Staff Queue API, UI และ Unit Tests แล้ว ผ่านครบถ้วนตาม spec ครับ | ขอบคุณครับ รองรับ Search, Multi-Filter (Status, Priority, Owner) และ Pagination | Merge เข้าสู่ `lab3-staging` |
| **PR #21** (`Feature/lab3 4 staff operation`) | Status transition matrix และ RBAC comments/notes ทำงานถูกต้องตาม spec ครับ | ขอบคุณครับ ควบคุม State Machine ห้ามข้ามขั้นตอน และแยก Internal Notes อย่างปลอดภัย | Merge เข้าสู่ `lab3-staging` |
| **PR #22** (`Feature/lab3 5 admin user management`) | ถูกต้องครบถ้วน เทสผ่านหมดครับ | ขอบคุณครับ มีระบบ Self-deactivation guard และ Sole Admin guard ครบถ้วน | Merge เข้าสู่ `lab3-staging` |
| **PR #23** (`Feature/lab3 6 e2e regression release`) | ครบถ้วนเรียบร้อยดีครับ | ขอบคุณครับ 110 automated tests + 7 E2E tests ผ่าน 100% Zero Regression | Merge เข้าสู่ `lab3-staging` |
| **PR #24** (`Feature/lab3 7 security hardening`) | เรียบร้อยครับ (Approved) | ขอบคุณครับ | Approved และ Merge เข้าสู่ `lab3-staging` โดย @BBINGOAL |
| **PR #[เลข PR]** (`Feature/lab3 8 release docs`) | [คัดลอกความเห็นจริงของ reviewer] | [คัดลอกคำตอบจริง] | Merge เข้าสู่ `lab3-staging` |
| **PR #[เลข PR]** (`lab3-staging` → `main`) | [คัดลอกความเห็นจริงของ reviewer] | [คัดลอกคำตอบจริง] | Merge เข้าสู่ `main` |


### 1.4 โครงสร้างโปรเจกต์และสุขอนามัยของ Repository
- `.gitignore` ป้องกันไม่ให้ไฟล์สภาวะแวดล้อม (`.env`), dependencies (`node_modules/`), ไฟล์แนบที่อัปโหลด (`uploads/`) และผลการทดสอบ (`coverage/`, `test-results/`, `playwright-report/`) หลุดขึ้น Repository
- ไม่มี secret ในโค้ด: `JWT_SECRET` อ่านจาก `server/.env` และ `server/.env.example` มีเพียงค่าตัวอย่างพร้อมวิธีสร้าง
- `README.md` อัปเดตครอบคลุมภาพรวมของ Lab 3, โครงสร้างโปรเจกต์, การตั้งค่าด้วย `prisma migrate deploy` + seed, บัญชีทดสอบที่ถูกต้อง และคำสั่งทดสอบครบถ้วน
- โครงสร้าง Repository ตาม Labsheet §12: `docs/lab-03/` (6 ไฟล์), `server/tests/lab-03/` (6 ไฟล์), `client/src/tests/lab-03/` (Login, ChangePassword, StaffTicketQueue, StaffTicketDetail, UserManagement + AppShell, PublicComments), `e2e/lab-03/` (3 ไฟล์), `artifacts/lab-03/screenshots/` (authentication, staff-queue, staff-ticket-detail, user-management + requester-ticket-detail)

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

> ผลด้านล่างรันเมื่อ 2026-10-04 บน `lab3-staging` commit `ae201be` (หลัง merge PR #24) ซึ่งเป็นโค้ดชุดเดียวกับที่ปล่อยขึ้น `main`  
> ⚠️ หลัง merge ขึ้น `main` ให้รันคำสั่งเดียวกันบน `main` แล้วแคปหน้าจอ Terminal แนบเพิ่ม (Part 3 ต้องการผลจาก main)

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

แสดงการเข้าสู่ระบบที่ถูกต้องและไม่ถูกต้อง, การปฏิเสธบัญชีที่ถูกปิด, สถานะกำลังทำงาน (busy) และข้อความผิดพลาดที่ปลอดภัย, การบังคับเปลี่ยนรหัสผ่านครั้งแรก, การแสดงชื่อและบทบาทของผู้ใช้, การออกจากระบบ และการบล็อกการเข้าถึงหลังออกจากระบบ

### สรุปการทำงาน
- **ข้อความผิดพลาดที่ปลอดภัย**: รหัสผ่านผิดและอีเมลที่ไม่มีในระบบได้ข้อความเดียวกัน ("Invalid email or password") ข้อความ "Account is deactivated" จะแสดงก็ต่อเมื่อรหัสผ่านถูกเท่านั้น จึงไม่เปิดเผยสถานะบัญชีให้ผู้เดารหัส (BR-24)
- **บังคับเปลี่ยนรหัสผ่านครั้งแรก**: หน้าเปลี่ยนรหัสผ่านแทนที่แอปทั้งหมด ไม่แสดงเมนูและไม่โหลดข้อมูลใดๆ จนกว่าจะบันทึกรหัสผ่านใหม่สำเร็จ ฝั่ง server ก็ปฏิเสธ API อื่นด้วย 403 (BR-02)
- **นโยบายรหัสผ่าน**: 8–72 ตัวอักษร ต้องมีตัวอักษรและตัวเลข แสดงข้อความแนะนำใต้ช่องกรอกและแจ้งข้อผิดพลาดทันที (BR-22)
- **Session จริง**: หลังเปลี่ยนรหัสผ่านจะได้ token ใหม่ทันที ส่วน Logout จะยกเลิก token เดิมที่ฝั่ง server (BR-05, BR-23) ทุกบทบาทมีปุ่ม **Change Password** สำหรับเปลี่ยนรหัสผ่านเองได้

---

> 📷 **[แทรกรูปภาพ 5.1: หน้าจอเข้าสู่ระบบ (Login Desktop)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/01-login-desktop.png`  
> * **คำบรรยายภาพ**: หน้าจอ Login ธีม Zen Green มีช่อง Email, Password และปุ่ม Sign In (ไม่มี Development Requester Selector แล้ว)  

---

> 📷 **[แทรกรูปภาพ 5.2: รหัสผ่านไม่ถูกต้อง (Invalid Credentials)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/02-login-invalid-credentials.png`  
> * **คำบรรยายภาพ**: แจ้งเตือนสีแดงด้วยข้อความที่ปลอดภัย "Invalid email or password"  

---

> 📷 **[แทรกรูปภาพ 5.3: บัญชีที่ถูกปิดการใช้งาน (Inactive Account)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/03-login-inactive-account.png`  
> * **คำบรรยายภาพ**: Robert Taylor (บัญชี Inactive) ถูกปฏิเสธการเข้าสู่ระบบพร้อมข้อความให้ติดต่อผู้ดูแลระบบ  

---

> 📷 **[แทรกรูปภาพ 5.4: บังคับเปลี่ยนรหัสผ่านครั้งแรก (Mandatory Password Change)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/04-mandatory-password-change.png`  
> * **คำบรรยายภาพ**: เมื่อ `mustChangePassword=true` ระบบแสดงเฉพาะหน้าเปลี่ยนรหัสผ่าน ไม่มีเมนูหรือข้อมูลของแอปอยู่ด้านหลัง  

---

> 📷 **[แทรกรูปภาพ 5.5: ตรวจสอบรหัสผ่านใหม่ (Password Validation)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/04b-password-validation-error.png`  
> * **คำบรรยายภาพ**: รหัสผ่านใหม่ที่สั้นเกินไปถูกปฏิเสธพร้อมข้อความอธิบายกฎ 8–72 ตัวอักษร มีตัวอักษรและตัวเลข  

---

> 📷 **[แทรกรูปภาพ 5.6: เข้าสู่ระบบสำเร็จหลังเปลี่ยนรหัสผ่าน (After Password Change)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/05-after-password-change-logged-in.png`  
> * **คำบรรยายภาพ**: หลังบันทึกรหัสผ่านใหม่ ผู้ใช้เข้าสู่หน้า Create Ticket ได้ทันทีด้วย token ใหม่  

---

> 📷 **[แทรกรูปภาพ 5.7: เปลี่ยนรหัสผ่านด้วยตนเอง (Voluntary Change Password)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/06-voluntary-change-password.png`  
> * **คำบรรยายภาพ**: ปุ่ม Change Password ที่แถบด้านบนเปิดหน้าต่างเดียวกัน แต่มีปุ่ม Cancel ให้ยกเลิกได้  

---

> 📷 **[แทรกรูปภาพ 5.8: ชื่อผู้ใช้และบทบาทบนแถบนำทาง (Authenticated User & Role)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/08-navigation-requester.png`, `08-navigation-it-staff.png`, `08-navigation-administrator.png`  
> * **คำบรรยายภาพ**: แต่ละบทบาทเห็นชื่อ, Role Badge, ปุ่ม Change Password, Logout และเมนูเฉพาะของตน — Requester: Create Ticket / My Tickets, IT Staff: Ticket Queue, Administrator: User Management / Ticket Queue  

---

> 📷 **[แทรกรูปภาพ 5.9: ออกจากระบบสำเร็จ (After Logout)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/07-after-logout.png`  
> * **คำบรรยายภาพ**: กลับสู่หน้า Login พร้อมข้อความ "You have been signed out."  

### หลักฐานการบล็อกการเข้าถึงหลัง Logout
token เดิมถูกยกเลิกที่ฝั่ง server จึงใช้เรียก API ตรงไม่ได้อีก (ผลจริงจาก `scripts/api-authorization-evidence.sh`):
```text
POST  /api/auth/logout (David)                               -> 200 {"message":"Logged out successfully"}
GET   /api/tickets (David's old token after logout)          -> 401 {"error":"Invalid or expired authentication token"}
```
ทดสอบอัตโนมัติด้วย API-05 (`server/tests/lab-03/auth.api.test.ts`) และ E2E-01a (`e2e/lab-03/authentication.spec.ts`) ซึ่ง reload หน้าแล้วยังอยู่ที่หน้า Login

---

# Answer Part 6: Working IT Staff Ticket Queue UI (5 Points)

แสดงคิวงานของ IT Staff ด้วยข้อมูลตัวอย่างที่สมจริง (seed 16 ตั๋ว ครบทุกสถานะและระดับความสำคัญ ทั้งที่มีและไม่มีผู้รับผิดชอบ) พร้อมการค้นหา ตัวกรอง การเรียงลำดับ การแบ่งหน้า ป้ายสถานะและความสำคัญ การเปิดดูรายละเอียด และการรองรับหน้าจอทุกขนาด

### สรุปฟังก์ชันการทำงาน
1. **ค้นหาและกรอง**: ค้นหาด้วยเลขตั๋ว หัวข้อ หรือชื่อผู้แจ้ง กรองสถานะครบ 8 สถานะ (`New`, `Open`, `In Progress`, `Waiting for Requester`, `Resolved`, `Closed`, `Reopened`, `Cancelled`), ระดับความสำคัญ (`LOW`–`URGENT`) และผู้รับผิดชอบ (`Unassigned`, `Assigned to Me`, หรือระบุเจ้าหน้าที่)
2. **เรียงลำดับและแบ่งหน้า**: เรียงตามวันที่สร้าง เลขตั๋ว หรือความสำคัญ แสดงหน้าละ 10 ตั๋ว พร้อมปุ่ม Previous / Next และเลขหน้า
3. **ป้าย (Badges)**: แสดงทั้ง IT Priority และ Requested Priority ("Req:") ในทุกแถว
4. **สถานะพิเศษ**: แสดง Loading, คิวว่าง, ไม่พบผลลัพธ์ (พร้อมปุ่ม Clear Filters) และข้อความผิดพลาดที่ปลอดภัย
5. **ความปลอดภัย**: server ตรวจ query parameter ทุกตัว ค่าที่ไม่ถูกต้องได้ 400 พร้อมระบุชื่อ parameter แทนที่จะเกิด error 500 (BR-28) และ Requester ที่เรียก API คิวโดยตรงได้ 403
6. **Responsive**: Desktop แสดงตารางครบทุกคอลัมน์รวมปุ่ม View ส่วนมือถือเปลี่ยนเป็นการ์ดทีละตั๋ว จึงไม่มีข้อมูลถูกตัดหรือต้องเลื่อนแนวนอน

---

> 📷 **[แทรกรูปภาพ 6.1: ภาพรวมคิวงาน (Queue Desktop)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/01-queue-desktop.png`  
> * **คำบรรยายภาพ**: ตารางคิวพร้อมเลขตั๋ว, หัวข้อ/ผู้แจ้ง, ป้ายสถานะ, IT/Requested Priority, ผู้รับผิดชอบ (Assigned / Unassigned) และปุ่ม View  

---

> 📷 **[แทรกรูปภาพ 6.2: การค้นหา (Search Results)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/02-queue-search-results.png`  
> * **คำบรรยายภาพ**: ค้นหาคำว่า "VPN" แสดงเฉพาะตั๋วที่ตรงกับคำค้น  

---

> 📷 **[แทรกรูปภาพ 6.3: กรองตามสถานะ (Filter by Status)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/03-queue-filtered-by-status.png`  
> * **คำบรรยายภาพ**: แสดงเฉพาะตั๋วสถานะ `In Progress`  

---

> 📷 **[แทรกรูปภาพ 6.4: กรองตั๋วที่ยังไม่มีผู้รับผิดชอบ (Unassigned)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/04-queue-unassigned-owner-filter.png`  
> * **คำบรรยายภาพ**: ตัวกรอง Owner = Unassigned แสดงตั๋วที่รอเจ้าหน้าที่รับงาน  

---

> 📷 **[แทรกรูปภาพ 6.5: เรียงตามความสำคัญ (Sorted by Priority)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/05-queue-sorted-by-priority.png`  
> * **คำบรรยายภาพ**: ตั๋ว `URGENT` และ `HIGH` ขึ้นมาก่อน  

---

> 📷 **[แทรกรูปภาพ 6.6: การแบ่งหน้า (Pagination)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/06-queue-page-2.png`  
> * **คำบรรยายภาพ**: หน้าที่ 2 ของคิว พร้อมข้อความ "Showing page 2 of 2"  

---

> 📷 **[แทรกรูปภาพ 6.7: ไม่พบผลลัพธ์ (No Results)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/07-queue-no-results.png`  
> * **คำบรรยายภาพ**: เมื่อไม่มีตั๋วตรงเงื่อนไข แสดงข้อความ "No tickets found" พร้อมปุ่ม Clear Filters  

---

> 📷 **[แทรกรูปภาพ 6.8: Tablet และ Mobile]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/08-queue-tablet.png`, `09-queue-mobile.png`  
> * **คำบรรยายภาพ**: Tablet ซ่อนคอลัมน์รองแต่ยังเห็นปุ่ม View ส่วนมือถือแสดงตั๋วเป็นการ์ดพร้อมสถานะ ความสำคัญ ผู้รับผิดชอบ และปุ่ม View ครบ  

---

# Answer Part 7: Working IT Staff Ticket Detail UI (10 Points)

แสดงการ Claim / Reassign, การตั้ง IT Priority, การเปลี่ยนสถานะตามที่อนุญาต, Public Comments, Internal Notes, ไฟล์แนบที่ยังใช้งานได้ต่อเนื่อง, การที่ Requester ระบุว่าปัญหาน่าจะแก้แล้ว, การจำกัดสิทธิ์ตามบทบาท, การตรวจสอบข้อมูล และหลักฐานการตรวจสิทธิ์ที่ API โดยตรง

### สรุปการทำงาน
- **Claim / Reassign**: ปุ่ม Claim Ticket ตั้งตัวเองเป็นผู้รับผิดชอบ และตั๋ว `New` เปลี่ยนเป็น `Open` อัตโนมัติ ส่วน Reassign เลือกได้เฉพาะ IT Staff / Administrator ที่ Active (BR-09)
- **IT Priority**: ปรับได้อิสระ Requested Priority ของผู้แจ้งแสดงเป็น "Immutable" และไม่เปลี่ยน (BR-10, BR-11)
- **Status Workflow**: ปุ่มแสดงเฉพาะสถานะถัดไปที่อนุญาตตาม Transition Matrix ส่วน server ปฏิเสธการเปลี่ยนที่ไม่อนุญาตด้วย 400 (BR-13)
- **Public Comments / Internal Notes**: แยกแท็บชัดเจน Internal Notes เป็นการ์ดสีเหลืองพร้อมไอคอนแม่กุญแจ จำกัด 2,000 ตัวอักษร และแสดงเป็นข้อความธรรมดา ป้องกันการฝังโค้ด HTML (BR-15–BR-17)
- **ไฟล์แนบ**: IT Staff ดาวน์โหลดไฟล์แนบของผู้แจ้งได้ผ่าน token ที่ยืนยันตัวตนแล้ว
- **Requester ระบุว่าปัญหาแก้แล้ว**: Requester กดปุ่ม "My Problem Appears Resolved" ในหน้าตั๋วของตน เจ้าหน้าที่จะเห็นสถานะนี้ แต่สถานะตั๋วไม่เปลี่ยนเป็น Resolved เอง (BR-14)
- **Requester Public Comments**: Requester เห็นและตอบ Public Comments ในหน้าตั๋วของตนได้ แต่จะไม่เห็น Internal Notes

---

> 📷 **[แทรกรูปภาพ 7.1: รายละเอียดตั๋วก่อน Claim (Ticket Detail)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/01-ticket-detail-before-claim.png`  
> * **คำบรรยายภาพ**: ข้อมูลตั๋ว, ไฟล์แนบ, ข้อมูลผู้แจ้ง, ปุ่ม Claim Ticket, การ์ด Ownership / Priority / Status Workflow  

---

> 📷 **[แทรกรูปภาพ 7.2: หลัง Claim (After Claim)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/02-after-claim-status-open.png`  
> * **คำบรรยายภาพ**: ผู้รับผิดชอบเป็นเจ้าหน้าที่ที่กด Claim และสถานะเปลี่ยนจาก New เป็น Open  

---

> 📷 **[แทรกรูปภาพ 7.3: ปรับ IT Priority]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/03-it-priority-updated.png`  
> * **คำบรรยายภาพ**: IT Priority เปลี่ยนเป็น HIGH ขณะที่ Requested Priority ยังเป็น MEDIUM  

---

> 📷 **[แทรกรูปภาพ 7.4: Public Comments]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/04-public-comments.png`  
> * **คำบรรยายภาพ**: ข้อความสาธารณะถึงผู้แจ้ง แสดงชื่อ บทบาท และเวลาโพสต์  

---

> 📷 **[แทรกรูปภาพ 7.5: Internal Notes]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/05-internal-notes.png`  
> * **คำบรรยายภาพ**: บันทึกภายในพื้นหลังสีเหลืองพร้อมไอคอนแม่กุญแจ มองเห็นเฉพาะ IT Staff และ Administrator  

---

> 📷 **[แทรกรูปภาพ 7.6: การเปลี่ยนสถานะ (Status Transition)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/06-status-transition-in-progress.png`  
> * **คำบรรยายภาพ**: หลังย้ายเป็น In Progress ปุ่มที่เหลือมีเฉพาะสถานะที่อนุญาต (Waiting for Requester, Resolved, Cancelled)  

---

> 📷 **[แทรกรูปภาพ 7.7: ผู้แจ้งระบุว่าปัญหาแก้แล้ว (Requester Resolution Indication)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/09-requester-resolution-indicated.png` และ `artifacts/lab-03/screenshots/requester-ticket-detail/04-problem-appears-resolved.png`  
> * **คำบรรยายภาพ**: มุมมองเจ้าหน้าที่เห็นว่าผู้แจ้งยืนยันแล้ว และมุมมองผู้แจ้งเห็นป้าย "You indicated this appears resolved" ขณะที่สถานะยังเป็น In Progress  

---

> 📷 **[แทรกรูปภาพ 7.8: Requester ใช้ Public Comments]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/requester-ticket-detail/02-detail-with-public-comments.png`, `03-comment-posted.png`  
> * **คำบรรยายภาพ**: ผู้แจ้งเห็นและตอบความคิดเห็นของเจ้าหน้าที่ได้ แต่ไม่มีแท็บ Internal Notes  

---

> 📷 **[แทรกรูปภาพ 7.9: ไม่เปิดเผยตั๋วของผู้อื่น (Role Restriction)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/requester-ticket-detail/06-other-requesters-ticket-unavailable.png`  
> * **คำบรรยายภาพ**: Requester อีกคนเปิด URL ตั๋วของ David ได้หน้า "Ticket Unavailable" โดยไม่มีข้อมูลตั๋วรั่วไหล  

---

### 7.10 หลักฐานการตรวจสิทธิ์ที่ API โดยตรง (Direct API Authorization)
ผลจริงจากการเรียก API โดยตรงด้วย curl ซึ่งไม่ผ่าน UI (`bash scripts/api-authorization-evidence.sh`):
```text
# Ticket TKT-2026-000001 (id=1) belongs to David Lee (Requester)
GET   /api/tickets (no token)                                -> 401 {"error":"Authentication required"}
GET   /api/tickets (only header X-Requester-Id: 1)           -> 401 {"error":"Authentication required"}
GET   /api/tickets/1 (Jennifer, not the owner)               -> 404 {"error":"Ticket not found."}
GET   /api/tickets/1/comments (Jennifer, not the owner)      -> 404 {"error":"Ticket not found"}
GET   /api/tickets/1/internal-notes (David, Requester)       -> 403 {"error":"Access denied: insufficient permissions"}
GET   /api/staff/tickets (David, Requester)                  -> 403 {"error":"Access denied: insufficient permissions"}
PATCH /api/staff/tickets/1/status (David, Requester)         -> 403 {"error":"Access denied: insufficient permissions"}
GET   /api/admin/users (Sarah, IT Staff)                     -> 403 {"error":"Access denied: insufficient permissions"}
POST  /api/tickets/1/indicate-resolved (Sarah, IT Staff)     -> 403 {"error":"Access denied: insufficient permissions"}
GET   /api/tickets/1/internal-notes (Sarah, IT Staff)        -> 200 [{"id":1,"content":"Known GPU driver bug with Thunderbolt dock firmware. Need to
POST  /api/auth/logout (David)                               -> 200 {"message":"Logged out successfully"}
GET   /api/tickets (David's old token after logout)          -> 401 {"error":"Invalid or expired authentication token"}
```
- **401**: ไม่มี token หรือ token ถูกยกเลิก — header `X-Requester-Id` ไม่ถูกใช้เป็นตัวตนอีกต่อไป
- **403**: มี token แต่บทบาทไม่มีสิทธิ์ และไม่ส่งข้อมูลใดกลับมา
- **404**: Requester เปิดตั๋วของผู้อื่น ได้ผลเหมือนตั๋วที่ไม่มีอยู่ จึงไม่รู้ว่าตั๋วนั้นมีจริง
- ทดสอบอัตโนมัติแบบตารางสิทธิ์ทุกบทบาทใน `server/tests/lab-03/authorization.api.test.ts` (API-06b)

---

# Answer Part 8: Working Administrator User Management UI (5 Points)

แสดงหน้าจอจัดการผู้ใช้แบบเรียบง่าย: รายชื่อพร้อม Name, Email, Role, Status และปุ่ม Edit, การค้นหาด้วยชื่อหรืออีเมล, การกรองตามบทบาท, การสร้างผู้ใช้ 1 บทบาทพร้อมรหัสผ่านเริ่มต้น, การตรวจอีเมลซ้ำและข้อมูลไม่ถูกต้อง, การแก้ไขข้อมูล, การตั้งรหัสผ่านเริ่มต้นใหม่, กฎความปลอดภัย และการป้องกันผู้ที่ไม่ใช่ Admin

### กฎความปลอดภัย (Safety Safeguards)
1. **Self-Deactivation Guard (BR-19)**: Admin ปิดบัญชีตัวเองไม่ได้ สวิตช์ถูก Disabled พร้อมข้อความเตือน และ server ก็ปฏิเสธด้วย 400
2. **Last Active Administrator Protection (BR-20)**: ปิดบัญชีหรือเปลี่ยนบทบาทของ Admin คนสุดท้ายที่ยัง Active ไม่ได้
3. **Set New Initial Password (BR-21)**: ผู้ใช้ต้องเปลี่ยนรหัสผ่านเมื่อเข้าสู่ระบบครั้งถัดไป และ session เดิมของผู้ใช้นั้นถูกยกเลิกทันที
4. **Validation (BR-04, BR-22, BR-29)**: ป้องกันอีเมลซ้ำ (409), ตรวจรูปแบบอีเมลและบทบาท, รหัสผ่านเริ่มต้นใช้กฎเดียวกับการเปลี่ยนรหัสผ่าน
5. **Deactivation มีผลทันที**: token ของผู้ใช้ที่ถูกปิดบัญชีใช้ไม่ได้ตั้งแต่ request ถัดไป
6. **RBAC**: ผู้ที่ไม่ใช่ Admin ไม่เห็นเมนู และเรียก API `/api/admin/*` ได้ 403 (ดูหลักฐานใน Part 7.10)

---

> 📷 **[แทรกรูปภาพ 8.1: รายชื่อผู้ใช้ (User List)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/01-user-list-desktop.png`  
> * **คำบรรยายภาพ**: ตารางผู้ใช้พร้อม Name, Email, Role badge, Status badge, สถานะบังคับเปลี่ยนรหัสผ่าน และปุ่ม Edit / Reset Pass  

---

> 📷 **[แทรกรูปภาพ 8.2: ค้นหาผู้ใช้ (User Search)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/02-user-search.png`  
> * **คำบรรยายภาพ**: ค้นหาด้วยชื่อหรืออีเมล  

---

> 📷 **[แทรกรูปภาพ 8.3: กรองตามบทบาท (Filter by Role)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/03-filter-by-role.png`  
> * **คำบรรยายภาพ**: แสดงเฉพาะผู้ใช้บทบาท IT Staff  

---

> 📷 **[แทรกรูปภาพ 8.4: สร้างผู้ใช้ใหม่ (Create User)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/04-create-user-modal.png`  
> * **คำบรรยายภาพ**: กรอกชื่อ อีเมล เลือก 1 บทบาท และรหัสผ่านเริ่มต้น  

---

> 📷 **[แทรกรูปภาพ 8.5: อีเมลซ้ำ (Duplicate Email)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/04b-duplicate-email-validation.png`  
> * **คำบรรยายภาพ**: อีเมลที่มีอยู่แล้วถูกปฏิเสธด้วยข้อความในหน้าต่าง (HTTP 409)  

---

> 📷 **[แทรกรูปภาพ 8.6: ข้อมูลไม่ถูกต้อง (Invalid Input)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/04c-invalid-input-validation.png`  
> * **คำบรรยายภาพ**: อีเมลผิดรูปแบบหรือรหัสผ่านสั้นเกินไปถูกแจ้งเตือนก่อนส่ง  

---

> 📷 **[แทรกรูปภาพ 8.7: แก้ไขผู้ใช้ (Edit User)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/07-edit-user-modal.png`  
> * **คำบรรยายภาพ**: แก้ไขชื่อ อีเมล บทบาท และสวิตช์ Active / Inactive  

---

> 📷 **[แทรกรูปภาพ 8.8: ห้ามปิดบัญชีตัวเอง (Self-Deactivation Guard)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/05-self-deactivation-guard.png`  
> * **คำบรรยายภาพ**: สวิตช์ของบัญชีตัวเองถูก Disabled พร้อมข้อความ BR-19  

---

> 📷 **[แทรกรูปภาพ 8.9: ป้องกัน Admin คนสุดท้าย (Last Active Admin Guard)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/06-last-active-admin-guard.png`  
> * **คำบรรยายภาพ**: พยายามเปลี่ยนบทบาทของ Admin คนเดียวที่เหลือเป็น IT Staff แล้ว server ปฏิเสธพร้อมข้อความ "Cannot deactivate or reassign the last remaining active Administrator"  

---

> 📷 **[แทรกรูปภาพ 8.10: ตั้งรหัสผ่านเริ่มต้นใหม่ (Set New Initial Password)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/08-set-new-initial-password-modal.png`  
> * **คำบรรยายภาพ**: Admin ตั้งรหัสผ่านเริ่มต้นใหม่ ผู้ใช้จะถูกบังคับเปลี่ยนเมื่อเข้าสู่ระบบครั้งถัดไป (ทดสอบครบลูปใน E2E-03)  

---

> 📷 **[แทรกรูปภาพ 8.11: ผู้ที่ไม่ใช่ Admin (Non-Admin)]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/11-non-admin-has-no-user-management.png`  
> * **คำบรรยายภาพ**: IT Staff ไม่มีเมนู User Management และการเรียก API โดยตรงได้ 403  

---

> 📷 **[แทรกรูปภาพ 8.12: Tablet และ Mobile]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/09-user-management-tablet.png`, `10-user-management-mobile.png`  
> * **คำบรรยายภาพ**: บนมือถือแสดงผู้ใช้เป็นการ์ด เห็นชื่อ อีเมล บทบาท สถานะ และปุ่ม Edit / Reset Pass ครบโดยไม่ถูกตัด  

---

# Answer Part 9: Zen Green UI and Responsive Evidence (5 Points)

**ลิงก์เอกสารข้อกำหนดด้าน UI**: [`docs/lab-03/ui-spec.md`](./ui-spec.md)

ภาพทั้งหมดสร้างใหม่จาก UI ปัจจุบันด้วย `npm run screenshots` ที่ขนาด Desktop 1280px, Tablet 768px และ Mobile 375px

### 9.1 หลักฐาน Desktop / Tablet / Mobile

| หน้าจอ | Desktop | Tablet (768px) | Mobile (375px) |
|---|---|---|---|
| Login | `authentication/01-login-desktop.png` | `authentication/09-login-tablet.png` | `authentication/10-login-mobile.png` |
| Application shell / navbar | `authentication/08-navigation-*.png` | — | `authentication/11-navbar-mobile.png` |
| IT Staff Ticket Queue | `staff-queue/01-queue-desktop.png` | `staff-queue/08-queue-tablet.png` | `staff-queue/09-queue-mobile.png` |
| IT Staff Ticket Detail | `staff-ticket-detail/01-ticket-detail-before-claim.png` | `staff-ticket-detail/07-ticket-detail-tablet.png` | `staff-ticket-detail/08-ticket-detail-mobile.png` |
| Requester Ticket Detail | `requester-ticket-detail/02-detail-with-public-comments.png` | — | `requester-ticket-detail/05-detail-mobile.png` |
| User Management | `user-management/01-user-list-desktop.png` | `user-management/09-user-management-tablet.png` | `user-management/10-user-management-mobile.png` |

(ทุก path อยู่ใต้ `artifacts/lab-03/screenshots/`)

---

> 📷 **[แทรกรูปภาพ 9.1: Login บน Tablet และ Mobile]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/09-login-tablet.png`, `10-login-mobile.png`  
> * **คำบรรยายภาพ**: การ์ด Login อยู่กึ่งกลาง ปุ่มและช่องกรอกขนาดพอดีมือถือ  

> 📷 **[แทรกรูปภาพ 9.2: แถบนำทางบนมือถือ]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/authentication/11-navbar-mobile.png`  
> * **คำบรรยายภาพ**: ชื่อผู้ใช้และ Role Badge ยังมองเห็นบนมือถือ พร้อมปุ่ม Change Password และ Logout  

> 📷 **[แทรกรูปภาพ 9.3: IT Staff Queue บน Tablet และ Mobile]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-queue/08-queue-tablet.png`, `09-queue-mobile.png`  
> * **คำบรรยายภาพ**: Tablet เป็นตารางกระชับ ส่วน Mobile เป็นการ์ดต่อตั๋ว ไม่มีคอลัมน์ถูกตัดหรือต้องเลื่อนแนวนอน  

> 📷 **[แทรกรูปภาพ 9.4: IT Staff Ticket Detail บน Tablet และ Mobile]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/staff-ticket-detail/07-ticket-detail-tablet.png`, `08-ticket-detail-mobile.png`  
> * **คำบรรยายภาพ**: เลย์เอาต์ 2 คอลัมน์เรียงเป็นคอลัมน์เดียวบนมือถือ การ์ด Status / Ownership / Priority ใช้งานได้ครบ  

> 📷 **[แทรกรูปภาพ 9.5: Requester Ticket Detail บนมือถือ]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/requester-ticket-detail/05-detail-mobile.png`  
> * **คำบรรยายภาพ**: รายละเอียดตั๋ว ไฟล์แนบ และ Public Comments อ่านและตอบได้บนมือถือ  

> 📷 **[แทรกรูปภาพ 9.6: User Management บน Tablet และ Mobile]**  
> * **ไฟล์ภาพ**: `artifacts/lab-03/screenshots/user-management/09-user-management-tablet.png`, `10-user-management-mobile.png`  
> * **คำบรรยายภาพ**: Mobile แสดงผู้ใช้เป็นการ์ดพร้อม Role / Status / Edit ครบ  

---

### 9.2 แบบตรวจสอบความสอดคล้องด้านการออกแบบ (Visual & Responsive Checklist)
- [x] **Zen Green**: ใช้สีหลัก `#006B3C`, สีรอง `#0B7A46`, พื้นหลัง `#EAF6EF` / `#F5F7F6` สม่ำเสมอทุกหน้า
- [x] **Role navigation**: แต่ละบทบาทเห็นเฉพาะเมนูของตน (`authentication/08-navigation-*.png`)
- [x] **Badges**: Role Badge แบบเดียวกันทุกหน้า (Requester / IT Staff / Administrator), ป้ายสถานะและความสำคัญอ่านง่าย คิวแสดงทั้ง IT และ Requested Priority
- [x] **Editable vs read-only**: ช่องที่แก้ไขได้มีกรอบชัดเจน ส่วน Requested Priority แสดงเป็น "Immutable" ในหน้า Staff Detail
- [x] **Validation placement**: ข้อความผิดพลาดอยู่ใต้ช่องกรอกหรือด้านบนของหน้าต่าง (`authentication/04b-*`, `user-management/04b-*`, `04c-*`, `06-*`)
- [x] **Focus**: ช่องกรอกที่กำลังใช้งานมีกรอบสีเขียว (เช่นช่องค้นหาใน `staff-queue/09-queue-mobile.png`) ปุ่มทั้งหมดเข้าถึงได้ด้วยคีย์บอร์ด
- [x] **Clipping / overlap**: ไม่มีคอลัมน์หรือปุ่มถูกตัด คิวและรายชื่อผู้ใช้เปลี่ยนเป็นการ์ดเมื่อกว้างน้อยกว่า 768px
- [x] **Horizontal overflow**: ไม่มีการเลื่อนแนวนอนระดับหน้าเว็บที่ 1280px, 768px และ 375px
- [x] **Modal dialogs**: หน้าต่างสร้าง/แก้ไขผู้ใช้, ตั้งรหัสผ่าน, เปลี่ยนรหัสผ่าน และยืนยันลบไฟล์แนบ พอดีกับมือถือ
- [x] **Comments vs Notes**: Public Comments เป็นการ์ดสีเทาอ่อน ส่วน Internal Notes เป็นการ์ดสีเหลืองพร้อมไอคอนแม่กุญแจ
