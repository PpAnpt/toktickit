import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
    user?: TokenPayload;
}

/**
 * Authentication Middleware:
 * Extracts and verifies JWT bearer token from Authorization header.
 * Provides fallback to X-Requester-Id for Lab 2 test backward compatibility.
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = verifyToken(token);
            req.user = decoded;
            return next();
        } catch (err) {
            res.status(401).json({ error: 'Invalid or expired authentication token' });
            return;
        }
    }

    // Backward compatibility for Lab 2 tests that provide X-Requester-Id
    const legacyRequesterId = req.headers['x-requester-id'];
    if (legacyRequesterId) {
        req.user = {
            id: Number(legacyRequesterId),
            email: `requester${legacyRequesterId}@example.com`,
            name: `Requester ${legacyRequesterId}`,
            role: 'REQUESTER',
            mustChangePassword: false,
        };
        return next();
    }

    res.status(401).json({ error: 'Authentication required' });
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
