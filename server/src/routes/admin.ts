import { Router, Response } from 'express';
import { getPrisma } from '../prisma';
import { authenticate, requireRole, requirePasswordChanged, AuthenticatedRequest } from '../middlewares/auth';
import { hashPassword } from '../utils/auth';
import { UserRole } from '../../generated/prisma/client';

const router = Router();

// Protect all admin endpoints with authentication, password check, and ADMINISTRATOR role guard
router.use(authenticate);
router.use(requirePasswordChanged);
router.use(requireRole('ADMINISTRATOR'));

/**
 * 5.1 GET /api/admin/users
 * List users with optional search (name/email) and role filter
 */
router.get('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { search, role } = req.query;
        const prisma = getPrisma();
        const whereClause: any = {};

        if (role && typeof role === 'string' && role !== 'All') {
            if (Object.values(UserRole).includes(role as UserRole)) {
                whereClause.role = role as UserRole;
            }
        }

        if (search && typeof search === 'string' && search.trim() !== '') {
            const trimmed = search.trim();
            whereClause.OR = [
                { name: { contains: trimmed, mode: 'insensitive' } },
                { email: { contains: trimmed, mode: 'insensitive' } },
            ];
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            orderBy: { id: 'asc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        res.json(users);
    } catch (err: any) {
        console.error('Failed to list users:', err);
        res.status(500).json({ error: 'Failed to retrieve users' });
    }
});

/**
 * 5.2 POST /api/admin/users
 * Create user account with assigned single role and initial password
 */
router.post('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { name, email, role, initialPassword } = req.body;

        if (!name || typeof name !== 'string' || !name.trim()) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }

        if (!email || typeof email !== 'string' || !email.trim()) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        if (!role || !Object.values(UserRole).includes(role as UserRole)) {
            res.status(400).json({ error: 'Valid role is required (REQUESTER, IT_STAFF, ADMINISTRATOR)' });
            return;
        }

        if (!initialPassword || typeof initialPassword !== 'string' || initialPassword.trim().length < 6) {
            res.status(400).json({ error: 'Initial password must be at least 6 characters' });
            return;
        }

        const normalizedEmail = email.trim().toLowerCase();
        const prisma = getPrisma();

        const existing = await prisma.user.findFirst({
            where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
        });

        if (existing) {
            res.status(409).json({ error: 'Email is already registered' });
            return;
        }

        const passwordHash = await hashPassword(initialPassword);
        const newUser = await prisma.user.create({
            data: {
                name: name.trim(),
                email: normalizedEmail,
                passwordHash,
                role: role as UserRole,
                isActive: true,
                mustChangePassword: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        res.status(201).json(newUser);
    } catch (err: any) {
        console.error('Failed to create user:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * 5.3 PATCH /api/admin/users/:id
 * Edit user information, role, or active status (Enforces BR-18, BR-19, BR-20)
 */
router.patch('/users/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const targetId = Number(req.params.id);
        if (isNaN(targetId)) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }

        const prisma = getPrisma();
        const targetUser = await prisma.user.findUnique({
            where: { id: targetId },
        });

        if (!targetUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const { name, email, role, isActive } = req.body;

        // BR-19: Admin cannot deactivate their own account
        if (req.user?.id === targetId && isActive === false) {
            res.status(400).json({ error: 'Administrators cannot deactivate their own account' });
            return;
        }

        // BR-20: Last active admin protection
        const isDemotingOrDeactivating =
            (isActive === false) ||
            (role !== undefined && role !== UserRole.ADMINISTRATOR);

        if (targetUser.role === UserRole.ADMINISTRATOR && targetUser.isActive && isDemotingOrDeactivating) {
            const remainingActiveAdminCount = await prisma.user.count({
                where: {
                    role: UserRole.ADMINISTRATOR,
                    isActive: true,
                    id: { not: targetId },
                },
            });

            if (remainingActiveAdminCount === 0) {
                res.status(400).json({ error: 'Cannot deactivate or reassign the last remaining active Administrator' });
                return;
            }
        }

        const updateData: any = {};

        if (name !== undefined) {
            if (typeof name !== 'string' || !name.trim()) {
                res.status(400).json({ error: 'Name cannot be empty' });
                return;
            }
            updateData.name = name.trim();
        }

        if (email !== undefined) {
            if (typeof email !== 'string' || !email.trim()) {
                res.status(400).json({ error: 'Email cannot be empty' });
                return;
            }
            const normalizedEmail = email.trim().toLowerCase();
            if (normalizedEmail !== targetUser.email.toLowerCase()) {
                const existing = await prisma.user.findFirst({
                    where: {
                        email: { equals: normalizedEmail, mode: 'insensitive' },
                        id: { not: targetId },
                    },
                });
                if (existing) {
                    res.status(409).json({ error: 'Email is already registered to another account' });
                    return;
                }
            }
            updateData.email = normalizedEmail;
        }

        if (role !== undefined) {
            if (!Object.values(UserRole).includes(role as UserRole)) {
                res.status(400).json({ error: 'Valid role is required (REQUESTER, IT_STAFF, ADMINISTRATOR)' });
                return;
            }
            updateData.role = role as UserRole;
        }

        if (isActive !== undefined) {
            if (typeof isActive !== 'boolean') {
                res.status(400).json({ error: 'isActive must be a boolean' });
                return;
            }
            updateData.isActive = isActive;
        }

        const updated = await prisma.user.update({
            where: { id: targetId },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                mustChangePassword: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        res.json(updated);
    } catch (err: any) {
        console.error('Failed to update user:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * 5.4 POST /api/admin/users/:id/reset-password
 * Set initial password and enforce mustChangePassword=true (BR-21)
 */
router.post('/users/:id/reset-password', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const targetId = Number(req.params.id);
        if (isNaN(targetId)) {
            res.status(400).json({ error: 'Invalid user ID' });
            return;
        }

        const { initialPassword } = req.body;
        if (!initialPassword || typeof initialPassword !== 'string' || initialPassword.trim().length < 6) {
            res.status(400).json({ error: 'Initial password must be at least 6 characters' });
            return;
        }

        const prisma = getPrisma();
        const targetUser = await prisma.user.findUnique({
            where: { id: targetId },
        });

        if (!targetUser) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const passwordHash = await hashPassword(initialPassword);
        await prisma.user.update({
            where: { id: targetId },
            data: {
                passwordHash,
                mustChangePassword: true,
            },
        });

        res.json({ message: 'Initial password set. User must change password at next login.' });
    } catch (err: any) {
        console.error('Failed to reset user password:', err);
        res.status(500).json({ error: 'Failed to reset user password' });
    }
});

export default router;
