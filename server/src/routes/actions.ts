import { Router, Response } from 'express';
import { requireAppAccess, requireRole, AuthenticatedRequest } from '../middlewares/auth';
import {
    createAction, findVisibleTicket, listActions, listRevisions, parsePage, updateAction,
} from '../services/actions';
import { listEvents } from '../services/workflow';
import { sendApiError } from './send-error';

/**
 * Actions Taken API (docs/lab-04/api-spec.md section 2).
 *  - readRouter  is mounted at /api/tickets (owning Requester, IT Staff, Administrator: read only)
 *  - staffRouter is mounted at /api/staff   (IT Staff and Administrator: create, edit, history)
 * Every write is enforced here on the server; hiding controls in the UI is not authorization.
 */
export const readRouter = Router();
export const staffRouter = Router();

const ticketIdOf = (req: AuthenticatedRequest) => Number(req.params.id);
const actionIdOf = (req: AuthenticatedRequest) => Number(req.params.actionId);
const positive = (n: number) => Number.isInteger(n) && n > 0;

const sendError = sendApiError;

function bodyObject(req: AuthenticatedRequest): Record<string, unknown> {
    return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
}

// GET /api/tickets/:id/actions
readRouter.get('/:id/actions', requireAppAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ticket = await findVisibleTicket(ticketIdOf(req), req.user!);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
        const { page, limit } = parsePage(req.query.page, req.query.limit, 20, 50);
        res.status(200).json(await listActions(ticket.id, page, limit));
    } catch (error) {
        sendError(res, error, 'Failed to fetch Actions Taken');
    }
});

const staffOnly = [...requireAppAccess, requireRole('IT_STAFF', 'ADMINISTRATOR')];

// POST /api/staff/tickets/:id/actions
staffRouter.post('/tickets/:id/actions', staffOnly, async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!positive(ticketIdOf(req))) return res.status(404).json({ error: 'Ticket not found' });
        const result = await createAction(ticketIdOf(req), req.user!, bodyObject(req));
        res.status(result.replayed ? 200 : 201).json(result.replayed ? { action: result.action, replayed: true } : { action: result.action });
    } catch (error) {
        sendError(res, error, 'Failed to create Action Taken');
    }
});

// PATCH /api/staff/tickets/:id/actions/:actionId
staffRouter.patch('/tickets/:id/actions/:actionId', staffOnly, async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!positive(ticketIdOf(req)) || !positive(actionIdOf(req))) return res.status(404).json({ error: 'Action Taken not found' });
        const action = await updateAction(ticketIdOf(req), actionIdOf(req), req.user!, bodyObject(req));
        res.status(200).json({ action });
    } catch (error) {
        sendError(res, error, 'Failed to update Action Taken');
    }
});

// GET /api/staff/tickets/:id/actions/:actionId/revisions
staffRouter.get('/tickets/:id/actions/:actionId/revisions', staffOnly, async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!positive(ticketIdOf(req)) || !positive(actionIdOf(req))) return res.status(404).json({ error: 'Action Taken not found' });
        const { page, limit } = parsePage(req.query.page, req.query.limit, 50, 100);
        res.status(200).json(await listRevisions(ticketIdOf(req), actionIdOf(req), page, limit));
    } catch (error) {
        sendError(res, error, 'Failed to fetch Action Taken history');
    }
});

// History is insert-only: no route updates or deletes revisions or the action itself (BR-08, BR-33)

// GET /api/staff/tickets/:id/events
staffRouter.get('/tickets/:id/events', staffOnly, async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!positive(ticketIdOf(req))) return res.status(404).json({ error: 'Ticket not found' });
        const { page, limit } = parsePage(req.query.page, req.query.limit, 50, 100);
        res.status(200).json(await listEvents(ticketIdOf(req), page, limit));
    } catch (error) {
        sendError(res, error, 'Failed to fetch Ticket history');
    }
});
