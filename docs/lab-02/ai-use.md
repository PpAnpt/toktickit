# Lab 2: AI Use Reflection

## 1. AI Assistant Used
- **LLM / Tool**: Google Gemini (via Antigravity IDE)

## 2. Key Prompts Used
| Prompt Name | Example Prompt | Purpose |
|---|---|---|
| Requirement Decomposition | "ช่วยวิเคราะห์ Lab_02_labsheet.md และแตก Requirement ออกเป็น GitHub Issues ย่อยๆ ให้หน่อยเพื่อการทำงานที่เป็นระบบ" | แตกความต้องการของแล็บออกเป็น GitHub Issues ย่อยๆ ที่จัดการได้ง่ายและเป็นระบบ |
| Validation & Constraint Checking | "ช่วยเช็คเทียบ Requirement กับโค้ดปัจจุบันที ว่าครอบคลุม Business Rules ครบถ้วนแล้วหรือยัง" | ตรวจสอบความถูกต้องของข้อกำหนดและ Business Rules ให้ตรงตามเกณฑ์ของแล็บอย่างครบถ้วน |
| DB Schema Design | "ช่วยอธิบายการออกแบบ Database สำหรับ Issue 2 และขอคำแนะนำแบบ Step-by-step ในการสร้าง Prisma Models" | ทำความเข้าใจความสัมพันธ์ของ Database Schema แบบ 1:N และขอคำแนะนำในการสร้าง Prisma Models และ Seed Data |
| API Implementation Strategy | "ช่วยแนะนำวิธีเขียน Create Ticket API และระบบ Upload File โดยแบ่งเป็นสเต็ปย่อยๆ ให้เขียนทีละส่วน" | พัฒนา REST API Endpoints และระบบอัปโหลดไฟล์แนบแบบเป็นขั้นเป็นตอน เพื่อโครงสร้างโค้ดที่สะอาด |
| UI/UX Modernization | "ช่วยปรับปรุง UI ของหน้าเว็บให้ดูทันสมัยขึ้น (Modern Design) และจัด Layout ให้ตอบสนองต่อผู้ใช้งานให้ดีขึ้น" | พัฒนาหน้าตาเว็บด้วยระบบ Zen Green Design System และจัด Layout ให้เป็น Responsive ใช้งานง่าย |
| Step-by-Step TDD | "พร้อมเขียน Automated Test แล้ว ขอคำแนะนำทีละสเต็ปว่าต้องสร้างไฟล์ไหนและควรทดสอบเคสอะไรบ้าง" | เขียน Automated Tests (ทั้ง Backend API และ Frontend UI) ด้วย Vitest อย่างเป็นระบบและเข้าใจลอจิก |

## 3. My Reflection
การใช้ Gemini ช่วยทำให้ทำงานได้เร็วและเป็นระบบขึ้นเยอะเลยครับ AI ช่วยแตกโจทย์ Lab ที่ยาวๆ ออกมาเป็น Issue ย่อยๆ ทำให้รู้ว่าควรเริ่มทำจากตรงไหนก่อน ช่วยแนะนำตั้งแต่การตั้งค่าฐานข้อมูล (Prisma), การตกแต่ง UI ของ React ให้ดูทันสมัยและน่าใช้งานมากขึ้น ไปจนถึงการเขียนโค้ด Test 

สิ่งที่ผมคิดว่ามีประโยชน์มากคือ การสั่งให้ AI ค่อยๆ สอนเขียนโค้ดและอธิบายไปทีละสเต็ป แทนที่จะให้เจเนอเรตโค้ดมาให้ทั้งหมดรวดเดียว วิธีนี้ทำให้ผมเข้าใจลอจิกการทำงานของระบบจริงๆ ไม่ใช่แค่ก็อปปี้โค้ดมาแปะให้รันผ่านเฉยๆ ครับ
