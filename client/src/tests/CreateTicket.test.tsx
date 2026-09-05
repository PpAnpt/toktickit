import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

// จำลอง (Mock) การทำงานของ fetch API ไม่ให้ยิงไป Backend จริงๆ
global.fetch = vi.fn(async (url) => {
    if (url.toString().includes('/api/requesters')) {
        return { json: async () => [{ id: 1, name: 'Test User', email: 'test@user.com' }] };
    }
    if (url.toString().includes('/api/categories')) {
        return { json: async () => [{ id: 1, name: 'Hardware' }] };
    }
    if (url.toString().includes('/api/related-systems')) {
        return { json: async () => [{ id: 1, name: 'Laptop' }] };
    }
    return { json: async () => ([]), ok: true };
}) as any;

describe('UI-01: CreateTicket UI', () => {
    it('should show validation message when submitting without a summary', async () => {
        render(<App />);

        // 1. เข้าสู่ระบบ (Simulate Login)
        const select = await screen.findByLabelText(/Simulate Login As/i);
        fireEvent.change(select, { target: { value: '1' } });
        const loginBtn = screen.getByRole('button', { name: /Continue to Portal/i });
        fireEvent.click(loginBtn);

        // 2. รอให้อยู่หน้า Create Ticket
        await screen.findByText(/Create New Support Ticket/i);

        // 3. กดปุ่ม Submit โดยยังไม่ได้กรอกอะไรเลย
        const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
        fireEvent.click(submitBtn);

        // 4. ตรวจสอบว่ามีข้อความ Error (Validation Message) แจ้งเตือนขึ้นมา
        await waitFor(() => {
            expect(screen.getByText(/Summary is required/i)).toBeInTheDocument();
            expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
        });
    });
});
