import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = '8h';

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only uses the first 72 bytes of input, so longer passwords are rejected.
export const PASSWORD_MAX_LENGTH = 72;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The signing secret must come from the environment and is never committed.
// When JWT_SECRET is missing (local lab runs, tests) a random per-process secret is
// generated, so tokens simply stop working after a server restart.
let jwtSecret: string | null = null;
function getJwtSecret(): string {
    if (!jwtSecret) {
        if (process.env.JWT_SECRET) {
            jwtSecret = process.env.JWT_SECRET;
        } else {
            if (process.env.NODE_ENV !== 'test') {
                console.warn('JWT_SECRET is not set; using a random per-process secret (sessions reset on restart).');
            }
            jwtSecret = crypto.randomBytes(32).toString('hex');
        }
    }
    return jwtSecret;
}

export interface TokenPayload {
    id: number;
    email: string;
    name: string;
    role: string;
    mustChangePassword: boolean;
}

// The signed token only carries the user id and token version. Role, active state, and
// mustChangePassword are re-read from the database on every request.
interface SignedToken {
    sub: number;
    tv: number;
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
 * Returns an error message when the password violates the password policy, otherwise null.
 */
export function validatePasswordPolicy(password: unknown, label = 'Password'): string | null {
    if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
        return `${label} must be at least ${PASSWORD_MIN_LENGTH} characters long`;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
        return `${label} must be at most ${PASSWORD_MAX_LENGTH} characters long`;
    }
    if (password.trim() !== password) {
        return `${label} must not start or end with spaces`;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return `${label} must contain at least one letter and one number`;
    }
    return null;
}

/**
 * Generate a signed JWT token for a user and their current token version
 */
export function generateToken(user: { id: number; tokenVersion: number }): string {
    const payload: SignedToken = { sub: user.id, tv: user.tokenVersion };
    return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token. Throws when the signature is invalid or the token expired.
 */
export function verifyToken(token: string): { userId: number; tokenVersion: number } {
    const decoded = jwt.verify(token, getJwtSecret()) as unknown as SignedToken;
    if (typeof decoded.sub !== 'number' || typeof decoded.tv !== 'number') {
        throw new Error('Malformed token');
    }
    return { userId: decoded.sub, tokenVersion: decoded.tv };
}

/**
 * Safe user fields that may be returned to the client
 */
export function toSafeUser(user: { id: number; email: string; name: string; role: string; mustChangePassword: boolean }): TokenPayload {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
    };
}
