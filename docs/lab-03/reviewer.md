# Lab 3: Peer Review

## 1. Reviewer Identity
- **Name**: Siwarak Chatvichai
- **Student ID**: 67070501086

## 2. Pull Request Links
- **PR 1**: https://github.com/PpAnpt/toktickit/pull/18
- **PR 2**: https://github.com/PpAnpt/toktickit/pull/19
- **PR 3**: https://github.com/PpAnpt/toktickit/pull/20
- **PR 4**: https://github.com/PpAnpt/toktickit/pull/21
- **PR 5**: https://github.com/PpAnpt/toktickit/pull/22
- **PR 6**: https://github.com/PpAnpt/toktickit/pull/23

## 3. Comments and Responses
| PR / Context | Reviewer Comment | Author Response | Action Taken |
|---|---|---|---|
| **PR #18** (Lab 3 Specs & Plan) | แผนงานและเอกสารข้อกำหนดละเอียด ชัดเจนมากครับ | ขอบคุณครับ จัดทำ Engineering Spec, API Contract, UI Spec, และ Test Plan ครบทั้ง 24 Acceptance Criteria ครับ | ตรวจสอบความถูกต้องและ Merge เข้าสู่ `lab3-staging` |
| **PR #19** (Auth Foundation & Password Change) | ระบบ Auth และบังคับเปลี่ยนรหัสผ่านปลอดภัยดีมากครับ | ขอบคุณครับ ใช้ bcryptjs แฮชรหัสผ่าน, JWT สำหรับ Session และบังคับเปลี่ยนรหัสผ่านเมื่อ `mustChangePassword=true` | รันเทสผ่านและ Merge เข้าสู่ `lab3-staging` |
| **PR #20** (Staff Queue API & UI) | หน้า Queue สวย ค้นหาและกรองสถานะได้ดีครับ | ขอบคุณครับ รองรับ Search, Multi-Filter (Status, Priority, Owner), Pagination และป้องกันสิทธิ์ RBAC เรียบร้อยครับ | รันเทสผ่านและ Merge เข้าสู่ `lab3-staging` |
| **PR #21** (Staff Operations, Lifecycle & Comments) | การเปลี่ยนสถานะและแยก Notes/Comments ทำได้ถูกต้องตามโจทย์ครับ | ขอบคุณครับ ควบคุม State Machine ห้ามข้ามขั้นตอน และแยกระหว่าง Public Comments กับ Internal Notes อย่างปลอดภัยครับ | รันเทสผ่านและ Merge เข้าสู่ `lab3-staging` |
| **PR #22** (Admin User Management) | มี Safety Rules ป้องกันปิดบัญชีตัวเอง ครบถ้วนครับ | ขอบคุณครับ มีระบบ Self-deactivation guard และ Sole Admin guard พร้อมระบบรีเซ็ตรหัสผ่านเริ่มต้นเรียบร้อยครับ | รันเทสผ่านและ Merge เข้าสู่ `lab3-staging` |
| **PR #23** (E2E Regression & Release Integration) | เทสครอบคลุมทั้ง Unit, API, UI และ Playwright E2E ยอดเยี่ยมมากครับ | ขอบคุณครับ ครอบคลุมการรันเทส 110 ข้อ และ E2E 7 ข้อ รันผ่าน 100% Zero Regression ครับ | ตรวจสอบผลการรันเทสต์และ Merge เข้าสู่ `lab3-staging` |

## 4. Final Approval
- [x] Approved by Reviewer
