# AI Agent Usage Reflection

## LLM Used
- **Agent:** Antigravity IDE
- **LLM:** Gemini 3.1 Pro (High)

## Selected Key Prompts

| Prompt Name | Actual Prompt Text |
|-------------|--------------------|
| **1. Plan & Summarize Requirements** | `อ่านไฟล์ Lab1_Labsheet.md แล้วสรุปให้หน่อยว่าต้องทำ Issue อะไรบ้าง เรียงลำดับการทำงานยังไง และมีเงื่อนไขอะไรสำคัญๆ บ้าง`<br><br>💡 **My Reflection:** AI สรุปงานออกมาได้เป็นข้อๆ ชัดเจนมาก ทำให้เห็นภาพรวมก่อนเริ่มเขียนโค้ดว่าต้องทำอะไรก่อนหลัง |

| **2. Understand Scaffold** | `ช่วยอธิบายโครงสร้างโฟลเดอร์ client กับ server ให้หน่อยว่าคืออะไรบ้าง แล้วต้องรันคำสั่งอะไรเพื่อลงไลบรารีทั้งหมด`<br><br>💡 **My Reflection:** AI อธิบายได้เคลียร์มาก ช่วยให้เข้าใจ scaffold ที่อาจารย์เตรียมไว้ให้ และได้คำสั่ง npm install ที่ต้องรัน |

| **3. Setup Git & GitHub** | `ขอวิธี push โค้ดนี้ขึ้น GitHub repo ใหม่หน่อย แล้วต้องแตก branch 'feature/1-project-foundation' ยังไง`<br><br>💡 **My Reflection:** คำสั่ง Git ที่ได้มาใช้งานได้จริง ทำให้การเริ่มต้นทำ Issue 1 ไม่มีปัญหาและทำตาม Flow ได้ถูกต้อง |

| **4. Implement Health Check API** | `ช่วยเขียน API GET /api/health ในไฟล์ server/src/app.ts ให้ return HTTP 200 และ JSON { "status": "ok", "service": "TokTickIT API" } ให้หน่อย`<br><br>💡 **My Reflection:** โค้ดที่ได้ตรงสเปกเป๊ะ นำไปวางในโครงสร้างโค้ดเดิมที่มีอยู่แล้วรันทำงานได้ทันที |

| **5. Write Supertest for Health** | `ช่วยเขียนเทสต์ด้วย Supertest สำหรับ GET /api/health ลงในไฟล์ server/tests/lab-01/health.test.ts ให้หน่อย`<br><br>💡 **My Reflection:** AI เขียนเทสต์ได้ถูกต้องและรัน Vitest ผ่านในรอบเดียว ช่วยลดเวลาได้เยอะ |

| **6. Create Category Model** | `ช่วยสร้าง Model 'Category' ในไฟล์ schema.prisma ให้มี id (รันเลขอัตโนมัติ), name (ห้ามซ้ำ) และ createdAt ให้หน่อย`<br><br>💡 **My Reflection:** ได้ syntax ของ Prisma ที่ถูกต้อง แต่ลืมว่าต้องรัน migrate เลยต้องถาม AI เพิ่มถึงได้คำสั่ง npx prisma migrate dev มา |

| **7. Write Seed Script** | `ช่วยเขียนโค้ด seed ข้อมูลในไฟล์ seed.ts โดยใส่หมวดหมู่: "Account and Access", "Hardware", "Software", "Network" ทำให้รันซ้ำได้โดยข้อมูลไม่เบิ้ลนะ`<br><br>💡 **My Reflection:** AI แนะนำให้ใช้คำสั่ง upsert ใน Prisma ซึ่งตอบโจทย์เรื่องการรัน seed ซ้ำได้เป็นอย่างดี |

| **8. Implement Category API** | `ช่วยสร้าง API GET /api/categories ดึงข้อมูล categories ทั้งหมดจากฐานข้อมูลมาเรียงตาม ID แล้วส่งกลับเป็น JSON ให้หน่อย`<br><br>💡 **My Reflection:** โค้ดใช้งานได้ แต่มีปัญหาเรื่องการ import PrismaClient นิดหน่อย ต้องให้ AI ช่วยเช็ก path ไปที่ prisma.ts อีกรอบถึงจะผ่าน |

| **9. Build Check System UI** | `ฝั่ง client ช่วยทำหน้าเว็บมีปุ่ม "Check System" พอกดปุ่มให้ไปดึง API /api/health กับ /api/categories มาแสดงผลให้สวยๆ ด้วย Bootstrap หน่อย`<br><br>💡 **My Reflection:** AI ช่วยจัดการเรื่อง State ใน React (loading, data, error) ได้ดีมาก โค้ดอ่านง่ายและหน้าตาสวยงามตามสเปก |

## Overall Reflection

**ข้อดี (Pros):**
- **ประหยัดเวลาและทำงานได้เร็วขึ้น:** AI ช่วยลดเวลาในการเขียนโค้ดซ้ำซาก (Boilerplate) เช่น การเขียนฟังก์ชันพื้นฐาน หรือการเขียน Test Case (Vitest/Supertest) 
- **ตัวช่วยวิเคราะห์ข้อผิดพลาด (Debugging):** AI สามารถอธิบาย Error Logs ที่ซับซ้อน และเสนอวิธีแก้ปัญหาที่ช่วยให้เราหาต้นตอได้เร็วขึ้นมาก เช่น ปัญหาการตั้งค่าพาธของ Prisma Client

**ข้อจำกัดและข้อควรระวัง (Limitations & Constraints):**
- **ต้องมีความรู้พื้นฐานเพื่อตรวจสอบโค้ด:** ไม่สามารถ "คัดลอกแล้ววาง" โค้ดทั้งหมดได้ทันที เพราะบางครั้ง AI จะเสนอวิธีที่ถูกต้องทางทฤษฎี แต่ไม่เข้ากับโครงสร้างโปรเจกต์ (Scaffold) เดิมที่เราใช้อยู่ 
- **ความคลาดเคลื่อนเรื่องเวอร์ชัน:** AI อาจจะเสนอวิธีแก้ปัญหาโดยอ้างอิงจากไลบรารีเวอร์ชันเก่า ซึ่งอาจไม่รองรับในเวอร์ชันใหม่แล้ว (เช่น โครงสร้างคำสั่งที่เปลี่ยนไปใน Prisma 7)
- **คุณภาพคำตอบขึ้นอยู่กับคำถาม:** หากการเขียน Prompt ขาดความชัดเจนหรือไม่ระบุบริบทของโปรเจกต์ให้เพียงพอ โค้ดที่ได้มาจะใช้งานจริงได้ยากและต้องเสียเวลาปรับแก้อีกรอบ
