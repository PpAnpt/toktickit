import { Router, Response } from 'express';
import { getPrisma } from '../prisma';
import { comparePassword, hashPassword, generateToken } from '../utils/auth';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

/**
 * POST /api/auth/login
 * Validates credentials and returns JWT token and user profile
 */
router.post('/login', async (req, res): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ error: 'Email and password are required' });
            return;
        }

        const prisma = getPrisma();
        const user = await prisma.user.findFirst({
            where: { email: { equals: email.trim(), mode: 'insensitive' } }
        });

        if (!user) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        const isMatch = await comparePassword(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid email or password' });
            return;
        }

        if (!user.isActive) {
            res.status(401).json({ error: 'Account is deactivated. Please contact an administrator.' });
            return;
        }

        const payload = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            mustChangePassword: user.mustChangePassword,
        };

        const token = generateToken(payload);

        res.status(200).json({
            token,
            user: payload
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'An unexpected error occurred during login' });
    }
});

/**
 * POST /api/auth/logout
 * Terminates session
 */
router.post('/logout', (_req, res): void => {
    res.status(200).json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile
 */
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                mustChangePassword: true,
            }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.status(200).json(user);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve user profile' });
    }
});

/**
 * POST /api/auth/change-password
 * Allows user to change their password (enforces first login change)
 */
router.post('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({ error: 'Both current password and new password are required' });
            return;
        }

        if (newPassword.length < 8) {
            res.status(400).json({ error: 'New password must be at least 8 characters long' });
            return;
        }

        if (currentPassword === newPassword) {
            res.status(400).json({ error: 'New password must be different from current password' });
            return;
        }

        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const isCurrentValid = await comparePassword(currentPassword, user.passwordHash);
        if (!isCurrentValid) {
            res.status(400).json({ error: 'Current password is incorrect' });
            return;
        }

        const newHash = await hashPassword(newPassword);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash: newHash,
                mustChangePassword: false,
            }
        });

        res.status(200).json({
            message: 'Password changed successfully',
            mustChangePassword: false
        });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

export default router;
