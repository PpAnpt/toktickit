import { Request, Response, NextFunction } from 'express';
import { getPrisma } from '../prisma';
import { verifyToken, toSafeUser, TokenPayload } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
    user?: TokenPayload;
}

/**
 * Authentication Middleware:
 * Verifies the JWT bearer token, then loads the user from the database so that
 * deactivation, role changes, password changes, and logout take effect immediately.
 * There is no fallback identity: requests without a valid token receive 401.
 */
export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    let claims: { userId: number; tokenVersion: number };
    try {
        claims = verifyToken(authHeader.substring(7));
    } catch {
        res.status(401).json({ error: 'Invalid or expired authentication token' });
        return;
    }

    try {
        const user = await getPrisma().user.findUnique({ where: { id: claims.userId } });
        // Unknown user, deactivated account, or a token issued before logout / password change
        if (!user || !user.isActive || user.tokenVersion !== claims.tokenVersion) {
            res.status(401).json({ error: 'Invalid or expired authentication token' });
            return;
        }
        req.user = toSafeUser(user);
        next();
    } catch (err) {
        console.error('Authentication lookup failed:', err);
        res.status(500).json({ error: 'An unexpected error occurred' });
    }
}

/**
 * Role-Based Authorization Guard:
 * Ensures the authenticated user has at least one of the permitted roles.
 */
export function requireRole(...allowedRoles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({ error: 'Access denied: insufficient permissions' });
            return;
        }

        next();
    };
}

/**
 * Mandatory Password Change Guard:
 * Blocks access to application features if user must change their initial password.
 */
export function requirePasswordChanged(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    if (req.user && req.user.mustChangePassword) {
        res.status(403).json({
            error: 'Password change required before accessing the application',
            mustChangePassword: true,
        });
        return;
    }
    next();
}

/**
 * Standard guard chain for normal application routes.
 */
export const requireAppAccess = [authenticate, requirePasswordChanged];
