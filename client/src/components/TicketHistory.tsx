import React, { useCallback, useEffect, useState } from 'react';
import { fetchTicketEvents, type TicketEventItem } from '../api';

/**
 * Ticket history (docs/lab-04/ui-spec.md section 4.3, UI-32): the status, owner and priority changes of a Ticket,
 * oldest first. Staff only, read-only, plain text. `refreshKey` changes whenever the Ticket was changed, so the list
 * follows what the screen just did.
 */

const PAGE_SIZE = 50;
const TYPE_LABEL: Record<TicketEventItem['type'], string> = {
  STATUS_CHANGED: 'Status',
  OWNER_CHANGED: 'Owner',
  PRIORITY_CHANGED: 'Priority',
};

const formatTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const valueText = (event: TicketEventItem, value: string | null) => (value === null || value === '' ? (event.type === 'OWNER_CHANGED' ? 'Unassigned' : '(none)') : value);

export const TicketHistory: React.FC<{ ticketId: number; refreshKey?: string }> = ({ ticketId, refreshKey }) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ events: TicketEventItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchTicketEvents(ticketId, targetPage, PAGE_SIZE);
      setData({ events: result.events, total: result.total });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'History could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(page); }, [load, page, refreshKey]);

  const total = data?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <section className="card shadow-sm border-0 mb-4" aria-labelledby={`ticket-history-title-${ticketId}`}>
      <div className="card-header py-3" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
        <h5 id={`ticket-history-title-${ticketId}`} className="mb-0 fw-bold text-dark">Ticket history</h5>
      </div>
      <div className="card-body p-4">
        {loading && !data && <p role="status" className="text-muted mb-0">Loading history...</p>}
        {error && (
          <div role="alert" className="alert alert-danger py-2 small mb-0">
            {error} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => load(page)}>Retry</button>
          </div>
        )}
        {data && data.events.length === 0 && !error && (
          <p className="text-muted mb-0">No history recorded before Lab 4.</p>
        )}
        {data && data.events.length > 0 && (
          <ol className="small mb-0 ps-3" start={first}>
            {data.events.map(event => (
              <li key={event.id} className="mb-2">
                <strong>{TYPE_LABEL[event.type]}</strong>: {valueText(event, event.from)} → {valueText(event, event.to)}
                <div className="text-muted">by {event.actor.name} · {formatTime(event.createdAt)}</div>
              </li>
            ))}
          </ol>
        )}
        {total > PAGE_SIZE && (
          <nav className="d-flex justify-content-between align-items-center mt-3" aria-label="Ticket history pages">
            <span className="small text-muted" role="status">History {first}-{last} of {total}</span>
            <div className="btn-group">
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous history</button>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={last >= total || loading} onClick={() => setPage(page + 1)}>Next history</button>
            </div>
          </nav>
        )}
      </div>
    </section>
  );
};

export default TicketHistory;
