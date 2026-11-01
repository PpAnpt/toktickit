import { Response } from 'express';
import { ApiError } from '../services/actions';

/** Sends an ApiError as `{ error, code?, ...extra }`; anything else is a safe 500 without internal detail. */
export function sendApiError(res: Response, error: unknown, fallback: string) {
    if (error instanceof ApiError) {
        res.status(error.status).json({ error: error.message, ...(error.code ? { code: error.code } : {}), ...error.extra });
        return;
    }
    // Never expose stack traces, SQL, or internal detail (L3-BR safe errors)
    console.error(fallback, error);
    res.status(500).json({ error: fallback });
}
