import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { vi } from 'vitest';

describe('App Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the TokTickIT heading', () => {
    render(<App />);
    expect(screen.getByText('TokTickIT IT Service Desk')).toBeInTheDocument();
  });

  it('shows online status and categories when API is reachable', async () => {
    // สอนให้ระบบทดสอบรู้จักการตอบกลับของ API ทั้ง 2 แบบ
    (global.fetch as any).mockImplementation(async (url: string) => {
      if (url.includes('/api/health')) {
        return { ok: true, json: async () => ({ status: 'ok' }) };
      }
      if (url.includes('/api/categories')) {
        return {
          ok: true, json: async () => [
            { id: 1, name: 'Account and Access' },
            { id: 2, name: 'Hardware' }
          ]
        };
      }
    });

    render(<App />);

    // จำลองการกดปุ่ม
    const checkBtn = screen.getByRole('button', { name: /\[ Check System \]/i });
    fireEvent.click(checkBtn);

    // ตอนกำลังโหลด ต้องขึ้นคำว่า Loading...
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();

    // รอจนกว่าจะดึงข้อมูลเสร็จ แล้วเช็คว่ามีข้อความเหล่านี้ขึ้นมาไหม
    await waitFor(() => {
      expect(screen.getByText(/Online/i)).toBeInTheDocument();
      // เช็คว่ามีหมวดหมู่โผล่มาบนหน้าจอจริงๆ
      expect(screen.getByText('Account and Access')).toBeInTheDocument();
      expect(screen.getByText('Hardware')).toBeInTheDocument();
    });
  });

  it('shows useful error message when API fails', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<App />);

    const checkBtn = screen.getByRole('button', { name: /\[ Check System \]/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText(/Offline/i)).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });
});
