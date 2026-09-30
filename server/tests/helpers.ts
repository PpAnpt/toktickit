import request from 'supertest';
import app from '../src/index';

// Seeded local-development accounts (see prisma/seed.ts)
export const ACCOUNTS = {
    david: { email: 'david.lee@example.com', password: 'Password123!' },
    jennifer: { email: 'jennifer.anderson@example.com', password: 'Password123!' },
    sarah: { email: 'sarah.connor@example.com', password: 'Password123!' },
    james: { email: 'james.gordon@example.com', password: 'Password123!' },
    admin: { email: 'admin@example.com', password: 'Admin123!' },
};

/**
 * Logs in through the real API and returns the bearer token and user profile.
 */
export async function loginAs(account: { email: string; password: string }) {
    const res = await request(app).post('/api/auth/login').send(account);
    if (res.status !== 200) {
        throw new Error(`Login failed for ${account.email}: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return { token: res.body.token as string, user: res.body.user as { id: number; role: string } };
}

export function bearer(token: string) {
    return { Authorization: `Bearer ${token}` };
}
