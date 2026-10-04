import { Router, Response } from 'express';
import { getPrisma } from '../prisma';
import { comparePassword, hashPassword, generateToken, toSafeUser, validatePasswordPolicy } from '../utils/auth';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

const INVALID_CREDENTIALS = 'Invalid email or password';

/**
 * POST /api/auth/login
 * Validates credentials and returns JWT token and user profile
 */
router.post('/login', async (req, res): Promise<void> => {
    try {
        const { email, password } = req.body ?? {};

        if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const prisma = getPrisma();
        const user = await prisma.user.findFirst({
            where: { email: { equals: email.trim(), mode: 'insensitive' } }
        });

        if (!user) {
            res.status(401).json({ error: INVALID_CREDENTIALS });
            return;
        }

        const isMatch = await comparePassword(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: INVALID_CREDENTIALS });
            return;
        }

        // Only revealed after a correct password, so account status is not disclosed to guessers
        if (!user.isActive) {
            res.status(401).json({ error: 'Account is deactivated. Please contact an administrator.' });
            return;
        }

        res.status(200).json({
            token: generateToken(user),
            user: toSafeUser(user),
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'An unexpected error occurred during login' });
    }
});

/**
 * POST /api/auth/logout
 * Revokes every token issued to the user by incrementing their token version
 */
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        await getPrisma().user.update({
            where: { id: req.user!.id },
            data: { tokenVersion: { increment: 1 } },
        });
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err);
        res.status(500).json({ error: 'Failed to log out' });
    }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
    res.status(200).json(req.user);
});

/**
 * POST /api/auth/change-password
 * Allows user to change their password (enforces first login change).
 * Older tokens are revoked and a fresh token is returned.
 */
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body ?? {};

        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
            res.status(400).json({ error: 'Both current password and new password are required' });
            return;
        }

        const policyError = validatePasswordPolicy(newPassword, 'New password');
        if (policyError) {
            res.status(400).json({ error: policyError });
            return;
        }

        if (currentPassword === newPassword) {
            res.status(400).json({ error: 'New password must be different from current password' });
            return;
        }

        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
            where: { id: req.user!.id }
        });

        if (!user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const isCurrentValid = await comparePassword(currentPassword, user.passwordHash);
        if (!isCurrentValid) {
            res.status(400).json({ error: 'Current password is incorrect' });
            return;
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: await hashPassword(newPassword),
                mustChangePassword: false,
                tokenVersion: { increment: 1 },
            }
        });

        res.status(200).json({
            message: 'Password changed successfully',
            mustChangePassword: false,
            token: generateToken(updated),
            user: toSafeUser(updated),
        });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

export default router;
