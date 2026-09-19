# Lab 3: AI Use Reflection

## 1. AI Assistant Used
- **LLM / Tool**: Google Gemini (via Antigravity IDE)

## 2. Key Prompts Used
| Prompt Name | Example Prompt | Purpose |
|---|---|---|
| Sprint Specification & Architecture Planning | "ช่วยวิเคราะห์ Lab_03_labsheet.md และจัดทำ Sprint Specification, API Contract, UI Wireframe Design, และ Test Plan ละเอียดให้หน่อย" | กำหนดขอบเขต Architecture, Data Models, Role-Based Access Control (RBAC), และแผนงาน 6 GitHub Issues |
| Authentication & First-Login Security | "ช่วยออกแบบระบบ Authentication ด้วย bcrypt และ JWT พร้อมกลไกบังคับเปลี่ยนรหัสผ่านครั้งแรก (mustChangePassword)" | สร้าง REST APIs และ UI modal ที่ปลอดภัยตามข้อกำหนดความปลอดภัยของระบบ |
| Staff Ticket Queue & Lifecycle State Machine | "ช่วยแนะนำการ implement IT Staff Queue พร้อม Search, Filter, Pagination และ Status Transition Machine" | ควบคุมสถานะตั๋ว (New, Open, In Progress, Waiting for Input, Resolved, Closed) ไม่ให้ข้ามขั้นตอนผิดกฎ |
| Internal Notes vs Public Comments Boundary | "ช่วยออกแบบระบบ Two-Tier Discussion ระหว่าง Public Comments กับ Internal Notes ให้มีสิทธิ์เข้าถึงแยกจากกันอย่างเข้มงวด" | ป้องกันข้อมูลลับของ IT Staff ไม่ให้ Requester มองเห็นทั้งในระดับ API และ Frontend Tab |
| Administrator User Management & Safety Guards | "ช่วยเขียนระบบ Admin User Management พร้อมป้องกัน Self-Deactivation และ Last Active Admin Protection" | สร้างความปลอดภัยในการจัดการผู้ใช้งาน ป้องกันระบบล็อกตัวเองจากการปิดบัญชีแอดมินคนสุดท้าย |
| End-to-End Testing with Playwright | "ช่วยเขียน Playwright E2E Tests ทดสอบ User Journey ครบทั้ง Auth, Staff Triage, และ Admin Lifecycle ให้เป็นแบบ Idempotent" | สร้าง Automated E2E Regression ที่รันซ้ำได้อย่างน่าเชื่อถือ ตรวจสอบการทำงานของระบบแบบครบวงจร |

## 3. My Reflection
การใช้ Gemini และ Antigravity ใน Lab 3 ช่วยให้การพัฒนาฟีเจอร์ระดับองค์กรที่มีความซับซ้อน (Authentication, RBAC 3 บทบาท, State Machine, และ Admin Safety Rules) เป็นไปอย่างรัดกุมและเป็นระเบียบมากครับ

สิ่งที่เห็นผลชัดเจนที่สุดคือ:
1. **การวาง Test Plan และ TDD ที่ครอบคลุม**: AI ช่วยแนะนำโครงสร้างเทสทั้งระดับ Unit, API Integration, UI Component และ Playwright E2E รวมกันกว่า 110 การทดสอบ ทำให้ทุกครั้งที่มีการเปลี่ยนโค้ด มั่นใจได้ทันทีว่าไม่มีฟีเจอร์เดิมของ Lab 1 และ Lab 2 พังลง (Zero Regression)
2. **การปฏิบัติตาม Security Best Practices**: AI ช่วยแนะนำการใช้ Password Hashing, Safe User DTO (ไม่ส่ง Password Hash กลับไปที่ Client), Session Invalidation และ Authorization Middleware แยกตามบทบาทอย่างชัดเจน
3. **การพัฒนาแบบ Agile และทีละขั้นตอน**: การแตกงานออกเป็น 6 Issues ย่อยและทำทีละสเต็ป พร้อมการตรวจสอบ Verification ก่อน Merge ทุกครั้ง ทำให้งานเสร็จสิ้นอย่างมีคุณภาพ โค้ดสะอาด และเข้าใจสถาปัตยกรรมของระบบทั้งหมดอย่างลึกซึ้งครับ
