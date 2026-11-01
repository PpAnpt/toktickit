import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActionApiError, type UserProfile } from '../../api';

/**
 * Pieces shared by the Requester and IT Staff dashboards (ui-spec section 3): the loading,
 * forbidden and error states, the metric card, the status badge and relative times.
 */

/** Where a dashboard card, row or quick action leads (api-spec section 4 drill-down tables) */
export type DashboardTarget =
  | { view: 'my-tickets'; status?: string; recent?: 'updated' | 'resolved' }
  | { view: 'queue'; status?: string; priority?: string; owner?: string }
  | { view: 'create' }
  | { view: 'users' };

export interface DashboardProps {
  currentUser: UserProfile;
  onNavigate: (target: DashboardTarget) => void;
  onOpenTicket: (ticketId: number) => void;
  /** The forbidden state offers a way back to the user's own dashboard */
  onGoHome: () => void;
}

type LoadState<T> =
  | { kind: 'loading' }
  | { kind: 'ok'; data: T }
  | { kind: 'forbidden' }
  | { kind: 'error' };

/**
 * Loads a dashboard on mount and on `reload` (no polling). While reloading nothing from the previous
 * response stays on screen, so a number is never shown next to a spinner. Only the latest request counts.
 */
export function useDashboard<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ kind: 'loading' });
  const latest = useRef(0);

  const load = useCallback(() => {
    const request = ++latest.current;
    setState({ kind: 'loading' });
    fetcher().then(
      data => { if (request === latest.current) setState({ kind: 'ok', data }); },
      error => {
        if (request !== latest.current) return;
        setState(error instanceof ActionApiError && error.status === 403 ? { kind: 'forbidden' } : { kind: 'error' });
      },
    );
  }, [fetcher]);

  useEffect(() => {
    load();
    return () => { latest.current++; };
  }, [load]);

  return { state, reload: load };
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

/** "5 min ago", "3 h ago", "2 d ago"; older than a week falls back to the date */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days <= 7 ? `${days} d ago` : new Date(iso).toLocaleDateString();
}

const STATUS_STYLE: Record<string, { className: string; icon: string }> = {
  New: { className: 'bg-primary', icon: '✦' },
  Open: { className: 'bg-info text-dark', icon: '○' },
  'In Progress': { className: 'bg-warning text-dark', icon: '◐' },
  'Waiting for Requester': { className: 'bg-secondary', icon: '⏳' },
  Resolved: { className: 'bg-success', icon: '✔' },
  Closed: { className: 'bg-dark', icon: '■' },
  Reopened: { className: 'bg-danger', icon: '↺' },
  Cancelled: { className: 'bg-light text-dark border', icon: '✕' },
};

/** The status as text plus a symbol, so it never relies on colour alone */
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const style = Object.hasOwn(STATUS_STYLE, status) ? STATUS_STYLE[status] : { className: 'bg-light text-dark border', icon: '•' };
  return (
    <span className={`badge ${style.className}`}>
      <span aria-hidden="true">{style.icon} </span>{status}
    </span>
  );
};

/** A drill-down is a real link (keyboard and screen reader friendly); the click is handled in the app */
export const DrillLink: React.FC<{
  href: string; label?: string; className?: string; onGo: () => void; children: React.ReactNode;
}> = ({ href, label, className, onGo, children }) => (
  <a
    href={href}
    aria-label={label}
    className={className}
    onClick={event => { event.preventDefault(); onGo(); }}
  >
    {children}
  </a>
);

export const MetricCard: React.FC<{
  label: string; value: number; subLabel?: string; href: string; accent?: string; onGo: () => void;
}> = ({ label, value, subLabel, href, accent = '#006B3C', onGo }) => (
  <DrillLink
    href={href}
    label={`${label}: ${value}. Open list.`}
    onGo={onGo}
    className="dashboard-card card h-100 text-decoration-none shadow-sm border-0 p-3"
  >
    <div className="small fw-semibold text-secondary">{label}</div>
    <div className="display-6 fw-bold" style={{ color: accent }}>{value}</div>
    <div className="small text-muted">{subLabel ?? 'Open list →'}</div>
  </DrillLink>
);

/** Placeholder cards that take the final size, so nothing jumps when the numbers arrive */
export const SkeletonCards: React.FC<{ count: number }> = ({ count }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div className="col" key={i} aria-hidden="true">
        <div className="dashboard-card card h-100 shadow-sm border-0 p-3 dashboard-skeleton">
          <div className="small">&nbsp;</div>
          <div className="display-6">&nbsp;</div>
          <div className="small">&nbsp;</div>
        </div>
      </div>
    ))}
  </>
);

export const EmptyNote: React.FC<{ icon: string; children: React.ReactNode }> = ({ icon, children }) => (
  <p className="text-muted mb-0 py-3 text-center">
    <span aria-hidden="true" className="me-2">{icon}</span>{children}
  </p>
);

/** Welcome line, the "Last updated" line with Refresh, and the forbidden and error states around the content */
export const DashboardFrame: React.FC<{
  currentUser: UserProfile;
  loading: boolean;
  kind: LoadState<unknown>['kind'];
  generatedAt?: string;
  cardCount: number;
  onRefresh: () => void;
  onGoHome: () => void;
  cards: React.ReactNode;
  children: React.ReactNode;
}> = ({ currentUser, loading, kind, generatedAt, cardCount, onRefresh, onGoHome, cards, children }) => (
  <div>
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <h1 className="h3 fw-bold mb-0" style={{ color: '#006B3C' }}>Welcome back, {firstName(currentUser.name)}!</h1>
      {kind !== 'forbidden' && (
        <div className="d-flex align-items-center gap-2 small text-muted">
          {generatedAt && !loading && <span>Last updated {new Date(generatedAt).toLocaleTimeString()}</span>}
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onRefresh} disabled={loading}>Refresh</button>
        </div>
      )}
    </div>

    {kind === 'forbidden' && (
      <div className="card border-0 shadow-sm p-4 text-center">
        <p className="fw-semibold mb-3">You do not have access to this dashboard.</p>
        <div><button type="button" className="btn btn-success" onClick={onGoHome}>Go to my dashboard</button></div>
      </div>
    )}

    {kind === 'error' && (
      <div className="alert alert-danger d-flex justify-content-between align-items-center flex-wrap gap-2" role="alert">
        <span>The dashboard could not be loaded.</span>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRefresh}>Retry</button>
      </div>
    )}

    {(kind === 'loading' || kind === 'ok') && (
      <>
        {loading && <div role="status" className="visually-hidden">Loading dashboard</div>}
        <div className={`row row-cols-1 row-cols-sm-2 row-cols-lg-${cardCount} g-3 mb-4`} data-testid="metric-grid" aria-busy={loading}>
          {loading ? <SkeletonCards count={cardCount} /> : cards}
        </div>
        {!loading && children}
      </>
    )}
  </div>
);
