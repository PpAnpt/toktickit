# Lab 2: AI Use Reflection

## 1. AI Assistant Used
- **LLM / Tool**: Google Gemini (via Antigravity IDE)

## 2. Key Prompts Used
| Prompt Name | Example Prompt | Purpose |
|---|---|---|
| Requirement Decomposition | "ช่วยวิเคราะห์ Lab_02_labsheet.md และแตก Requirement ออกเป็น GitHub Issues ย่อยๆ ให้หน่อยเพื่อการทำงานที่เป็นระบบ" | To decompose the lab requirements into actionable GitHub Issues and plan the project structure. |
| Validation & Constraint Checking | "ช่วยเช็คเทียบ Requirement กับโค้ดปัจจุบันที ว่าครอบคลุม Business Rules ครบถ้วนแล้วหรือยัง" | To ensure the generated specifications and constraints match the assignment rules exactly. |
| DB Schema Design | "ช่วยอธิบายการออกแบบ Database สำหรับ Issue 2 และขอคำแนะนำแบบ Step-by-step ในการสร้าง Prisma Models" | To understand Prisma schema relationships (1:M) and get step-by-step guidance on database setup. |
| API Implementation Strategy | "ช่วยแนะนำวิธีเขียน Create Ticket API และระบบ Upload File โดยแบ่งเป็นสเต็ปย่อยๆ ให้เขียนทีละส่วน" | To implement the Create Ticket API and file upload logic incrementally, ensuring clean architecture. |
| UI/UX Modernization | "ช่วยปรับปรุง UI ของหน้าเว็บให้ดูทันสมัยขึ้น (Modern Design) และจัด Layout ให้ตอบสนองต่อผู้ใช้งานให้ดีขึ้น" | To enhance the client application's appearance using a modern design system and improve user experience. |
| Step-by-Step TDD | "พร้อมเขียน Automated Test แล้ว ขอคำแนะนำทีละสเต็ปว่าต้องสร้างไฟล์ไหนและควรทดสอบเคสอะไรบ้าง" | To methodically write Vitest API and React UI tests while deeply understanding the testing logic. |

## 3. My Reflection
การใช้ Gemini ช่วยทำให้ทำงานได้เร็วและเป็นระบบขึ้นเยอะเลยครับ AI ช่วยแตกโจทย์ Lab ที่ยาวๆ ออกมาเป็น Issue ย่อยๆ ทำให้รู้ว่าควรเริ่มทำจากตรงไหนก่อน ช่วยแนะนำตั้งแต่การตั้งค่าฐานข้อมูล (Prisma), การตกแต่ง UI ของ React ให้ดูทันสมัยและน่าใช้งานมากขึ้น ไปจนถึงการเขียนโค้ด Test 

สิ่งที่ผมคิดว่ามีประโยชน์มากคือ การสั่งให้ AI ค่อยๆ สอนเขียนโค้ดและอธิบายไปทีละสเต็ป แทนที่จะให้เจเนอเรตโค้ดมาให้ทั้งหมดรวดเดียว วิธีนี้ทำให้ผมเข้าใจลอจิกการทำงานของระบบจริงๆ ไม่ใช่แค่ก็อปปี้โค้ดมาแปะให้รันผ่านเฉยๆ ครับ
