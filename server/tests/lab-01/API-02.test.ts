import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('GET /api/categories', () => {
    it('should return a list of categories with id and name', async () => {
        // จำลองการยิง GET request ไปที่ /api/categories
        const response = await request(app).get('/api/categories');

        // คาดหวังว่า Status ต้องเป็น 200 OK
        expect(response.status).toBe(200);
        // คาดหวังว่าข้อมูลที่ได้มาต้องเป็น Array
        expect(Array.isArray(response.body)).toBe(true);
        // คาดหวังว่าต้องมีข้อมูลอย่างน้อย 1 ตัว
        expect(response.body.length).toBeGreaterThan(0);

        // คาดหวังว่าตัวแรกใน Array จะต้องมี Property ที่ชื่อว่า id และ name
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('name');
    });
});
