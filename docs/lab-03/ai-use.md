# Lab 3: AI Use Reflection

## 1. AI Assistant Used
- **LLM / Tool (specification and implementation)**: Google Gemini (via Antigravity IDE)
- **LLM / Tool (requirements audit and hardening)**: Claude Opus 5.5 (via Claude Code in VS Code)

## 2. Key Prompts Used
| Prompt Name | Example Prompt | Purpose |
|---|---|---|
| Sprint Specification & Architecture Planning | "ช่วยวิเคราะห์ Lab_03_labsheet.md และจัดทำ Sprint Specification, API Contract, UI Wireframe Design, และ Test Plan ละเอียดให้หน่อย" | กำหนดขอบเขต Architecture, Data Models, Role-Based Access Control (RBAC), และแผนงาน 6 GitHub Issues |
| Authentication & First-Login Security | "ช่วยออกแบบระบบ Authentication ด้วย bcrypt และ JWT พร้อมกลไกบังคับเปลี่ยนรหัสผ่านครั้งแรก (mustChangePassword)" | สร้าง REST APIs และ UI modal ที่ปลอดภัยตามข้อกำหนดความปลอดภัยของระบบ |
| Staff Ticket Queue & Lifecycle State Machine | "ช่วยแนะนำการ implement IT Staff Queue พร้อม Search, Filter, Pagination และ Status Transition Machine" | ควบคุมสถานะตั๋ว (New, Open, In Progress, Waiting for Requester, Resolved, Closed, Reopened, Cancelled) ไม่ให้ข้ามขั้นตอนผิดกฎ |
| Internal Notes vs Public Comments Boundary | "ช่วยออกแบบระบบ Two-Tier Discussion ระหว่าง Public Comments กับ Internal Notes ให้มีสิทธิ์เข้าถึงแยกจากกันอย่างเข้มงวด" | ป้องกันข้อมูลลับของ IT Staff ไม่ให้ Requester มองเห็นทั้งในระดับ API และ Frontend Tab |
| Administrator User Management & Safety Guards | "ช่วยเขียนระบบ Admin User Management พร้อมป้องกัน Self-Deactivation และ Last Active Admin Protection" | สร้างความปลอดภัยในการจัดการผู้ใช้งาน ป้องกันระบบล็อกตัวเองจากการปิดบัญชีแอดมินคนสุดท้าย |
| Requirements Audit against the Lab Sheet (Claude) | "can you check all of the work done compared to @Lab_3_sheet.md and make sure every task and requirement are done correctly and neatly" | ตรวจงานทั้งหมดเทียบกับ Lab sheet พบช่องโหว่ เช่น header `X-Requester-Id` ที่ปลอมตัวตนได้, logout ที่ไม่ได้ยกเลิก token จริง, ไม่มี migration ของ Lab 3 และ Requester ยังไม่มีหน้า Public Comments |
| Fixing the Audit Findings (Claude) | "can you fixes the part that are still needed to fix" | แก้ไขความปลอดภัยฝั่ง server, เพิ่ม migration + test database แยก, เพิ่ม UI ที่ขาด, ปรับ layout มือถือ, เพิ่มเทสต์ และอัปเดตเอกสาร |
| End-to-End Testing with Playwright | "ช่วยเขียน Playwright E2E Tests ทดสอบ User Journey ครบทั้ง Auth, Staff Triage, และ Admin Lifecycle ให้เป็นแบบ Idempotent" | สร้าง Automated E2E Regression ที่รันซ้ำได้อย่างน่าเชื่อถือ ตรวจสอบการทำงานของระบบแบบครบวงจร |

## 3. My Reflection
การใช้ Gemini และ Antigravity ใน Lab 3 ช่วยให้การพัฒนาฟีเจอร์ระดับองค์กรที่มีความซับซ้อน (Authentication, RBAC 3 บทบาท, State Machine, และ Admin Safety Rules) เป็นไปอย่างรัดกุมและเป็นระเบียบมากครับ

สิ่งที่เห็นผลชัดเจนที่สุดคือ:
1. **การวาง Test Plan และ TDD ที่ครอบคลุม**: AI ช่วยแนะนำโครงสร้างเทสทั้งระดับ Unit, API Integration, UI Component และ Playwright E2E รวมกันกว่า 160 การทดสอบ (API 121, UI 40, E2E 7 หลังการตรวจทาน) ทำให้ทุกครั้งที่มีการเปลี่ยนโค้ด มั่นใจได้ทันทีว่าไม่มีฟีเจอร์เดิมของ Lab 1 และ Lab 2 พังลง (Zero Regression)
2. **การปฏิบัติตาม Security Best Practices**: AI ช่วยแนะนำการใช้ Password Hashing, Safe User DTO (ไม่ส่ง Password Hash กลับไปที่ Client), Session Invalidation และ Authorization Middleware แยกตามบทบาทอย่างชัดเจน
3. **การพัฒนาแบบ Agile และทีละขั้นตอน**: การแตกงานออกเป็น 6 Issues ย่อยและทำทีละสเต็ป พร้อมการตรวจสอบ Verification ก่อน Merge ทุกครั้ง ทำให้งานเสร็จสิ้นอย่างมีคุณภาพ โค้ดสะอาด และเข้าใจสถาปัตยกรรมของระบบทั้งหมดอย่างลึกซึ้งครับ
