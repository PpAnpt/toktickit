import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'toktickit-super-secret-jwt-key-lab3';
const JWT_EXPIRES_IN = '24h';

export interface TokenPayload {
    id: number;
    email: string;
    name: string;
    role: string;
    mustChangePassword: boolean;
}

/**
 * Hash plaintext password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
}

/**
 * Compare plaintext password with stored hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a signed JWT token containing user identity and role
 */
export function generateToken(payload: TokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
