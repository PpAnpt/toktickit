import { Router, Response } from 'express';
import { getPrisma } from '../prisma';
import { requireAppAccess, AuthenticatedRequest } from '../middlewares/auth';
import { getRequesterDashboard, getStaffDashboard } from '../services/dashboard';

const router = Router();

// Same guard as the other application routes: authenticated and past any mandatory password change
router.use(requireAppAccess);

/** 403 body is the same for every refused role and carries no data (api-spec 4.3) */
const forbidden = (res: Response) => res.status(403).json({ error: 'Forbidden' });

router.get('/requester', async (req: AuthenticatedRequest, res: Response) => {
    if (req.user!.role !== 'REQUESTER') return forbidden(res);
    try {
        return res.status(200).json(await getRequesterDashboard(getPrisma(), req.user!.id));
    } catch (error) {
        console.error('Failed to load the Requester dashboard:', error);
        return res.status(500).json({ error: 'Failed to load the dashboard.' });
    }
});

router.get('/staff', async (req: AuthenticatedRequest, res: Response) => {
    if (req.user!.role !== 'IT_STAFF' && req.user!.role !== 'ADMINISTRATOR') return forbidden(res);
    try {
        return res.status(200).json(await getStaffDashboard(getPrisma(), { id: req.user!.id, role: req.user!.role }));
    } catch (error) {
        console.error('Failed to load the staff dashboard:', error);
        return res.status(500).json({ error: 'Failed to load the dashboard.' });
    }
});

export default router;
