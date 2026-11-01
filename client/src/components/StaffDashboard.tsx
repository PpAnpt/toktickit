import React from 'react';
import { fetchStaffDashboard, type StaffDashboardData } from '../api';
import {
  DashboardFrame, DrillLink, EmptyNote, MetricCard, StatusBadge, relativeTime, useDashboard,
  type DashboardProps, type DashboardTarget,
} from './dashboard/shared';

const STATUS_ORDER = ['New', 'Open', 'In Progress', 'Waiting for Requester', 'Resolved', 'Closed', 'Reopened', 'Cancelled'];
const PRIORITY_ORDER = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const style: Record<string, string> = {
    URGENT: 'bg-danger', HIGH: 'bg-warning text-dark', MEDIUM: 'bg-info text-dark', LOW: 'bg-secondary',
  };
  return <span className={`badge ${Object.hasOwn(style, priority) ? style[priority] : 'bg-light text-dark border'}`}>{priority}</span>;
};

const queueHref = (target: DashboardTarget) => `#queue?${new URLSearchParams(
  Object.entries(target).filter(([key, value]) => key !== 'view' && value) as [string, string][],
).toString()}`;

/** A breakdown: one row per key, a link to the matching queue filter; the bar is only decoration */
const Breakdown: React.FC<{
  title: string; keys: string[]; counts: Record<string, number>; target: (key: string) => DashboardTarget; onGo: (t: DashboardTarget) => void;
}> = ({ title, keys, counts, target, onGo }) => {
  const largest = Math.max(1, ...keys.map(key => counts[key] ?? 0));
  return (
    <section aria-label={title} className="card border-0 shadow-sm p-3 h-100">
      <h2 className="h5 fw-bold mb-2">{title}</h2>
      <ul className="list-unstyled mb-0">
        {keys.map(key => {
          const value = counts[key] ?? 0;
          return (
            <li key={key}>
              <DrillLink href={queueHref(target(key))} label={`${key}: ${value}`} onGo={() => onGo(target(key))}
                className="d-flex align-items-center gap-2 py-1 text-decoration-none text-body">
                <span style={{ minWidth: '9.5rem' }}>{key}</span>
                <span aria-hidden="true" className="flex-grow-1 rounded" style={{ background: '#E6F0EB', height: '0.6rem' }}>
                  <span className="d-block rounded h-100" style={{ background: '#0B7A46', width: `${(value / largest) * 100}%` }} />
                </span>
                <span className="fw-semibold text-end" style={{ minWidth: '2rem' }}>{value}</span>
              </DrillLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const RecentTickets: React.FC<{ tickets: StaffDashboardData['recentTickets']; onOpen: (id: number) => void }> = ({ tickets, onOpen }) => (
  <section aria-label="Recent Tickets" className="card border-0 shadow-sm p-3 h-100">
    <h2 className="h5 fw-bold mb-2">Recent Tickets</h2>
    {tickets.length === 0 ? (
      <EmptyNote icon="🎫">No Tickets have been updated yet.</EmptyNote>
    ) : (
      <ul className="list-group list-group-flush">
        {tickets.map(ticket => (
          <li key={ticket.id} className="list-group-item px-0">
            <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
              <DrillLink href={`/tickets/${ticket.id}`} onGo={() => onOpen(ticket.id)} className="fw-semibold text-decoration-none text-body d-block text-truncate">
                <span style={{ color: '#006B3C' }}>{ticket.ticketNumber}</span> {ticket.summary}
              </DrillLink>
              <span className="d-flex gap-1"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.itPriority} /></span>
            </div>
            <div className="small text-muted">
              {ticket.owner ? ticket.owner.name : 'Unassigned'} · Updated {relativeTime(ticket.updatedAt)}
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

const RecentActions: React.FC<{ actions: StaffDashboardData['myRecentActions']; onOpen: (id: number) => void }> = ({ actions, onOpen }) => (
  <section aria-label="My Recent Actions" className="card border-0 shadow-sm p-3 h-100">
    <h2 className="h5 fw-bold mb-2">My Recent Actions</h2>
    {actions.length === 0 ? (
      <EmptyNote icon="📝">You have no recent actions.</EmptyNote>
    ) : (
      <ul className="list-group list-group-flush">
        {actions.map(action => (
          <li key={action.id} className="list-group-item px-0">
            <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
              <DrillLink href={`/tickets/${action.ticketId}`} onGo={() => onOpen(action.ticketId)} className="fw-semibold text-decoration-none text-body d-block text-truncate">
                <span style={{ color: '#006B3C' }}>{action.ticketNumber}</span> {action.description}
              </DrillLink>
              <span className="d-flex gap-1 align-items-center">
                <span className="badge bg-light text-dark border">{action.status}</span>
                {action.followUpRequired && <span className="badge bg-warning text-dark">⚑ Follow-up needed</span>}
              </span>
            </div>
            <div className="small text-muted">
              {new Date(action.actionAt).toLocaleString()} · Assigned to {action.assignee.name}
            </div>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export const StaffDashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate, onOpenTicket, onGoHome }) => {
  const { state, reload } = useDashboard(fetchStaffDashboard);
  const data = state.kind === 'ok' ? state.data : undefined;
  const m = data?.metrics;
  // The Accounts strip is for Administrators only, whatever the response contained
  const accounts = currentUser.role === 'ADMINISTRATOR' ? data?.userCounts : undefined;

  const card = (label: string, value: number, target: DashboardTarget, accent?: string) => (
    <div className="col" key={label}>
      <MetricCard label={label} value={value} href={queueHref(target)} accent={accent} onGo={() => onNavigate(target)} />
    </div>
  );

  return (
    <DashboardFrame
      currentUser={currentUser}
      kind={state.kind}
      loading={state.kind === 'loading'}
      generatedAt={data?.generatedAt}
      cardCount={5}
      onRefresh={reload}
      onGoHome={onGoHome}
      cards={m && (
        <>
          {card('Unassigned', m.unassigned, { view: 'queue', owner: 'unassigned', status: 'Active' })}
          {card('My Active Tickets', m.myActive, { view: 'queue', owner: 'me', status: 'Active' })}
          {card('Urgent', m.urgent, { view: 'queue', priority: 'URGENT', status: 'Active' }, '#B30000')}
          {card('Reopened', m.reopened, { view: 'queue', status: 'Reopened' })}
          {card('Resolved - Awaiting Closure', m.resolvedAwaitingClosure, { view: 'queue', status: 'Resolved' })}
        </>
      )}
    >
      {data && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-lg-7">
              <Breakdown title="By status" keys={STATUS_ORDER} counts={data.byStatus} onGo={onNavigate}
                target={key => ({ view: 'queue', status: key })} />
            </div>
            <div className="col-12 col-lg-5">
              <Breakdown title="By priority" keys={PRIORITY_ORDER} counts={data.byPriority} onGo={onNavigate}
                target={key => ({ view: 'queue', priority: key, status: 'Active' })} />
            </div>
          </div>
          <div className="row g-3 mb-4">
            <div className="col-12 col-lg-6"><RecentTickets tickets={data.recentTickets} onOpen={onOpenTicket} /></div>
            <div className="col-12 col-lg-6"><RecentActions actions={data.myRecentActions} onOpen={onOpenTicket} /></div>
          </div>
          {accounts && (
            <section aria-label="Accounts" className="card border-0 shadow-sm p-3 mb-4">
              <h2 className="h5 fw-bold mb-2">Accounts</h2>
              <div className="d-flex flex-wrap gap-3">
                {([
                  ['Requesters', accounts.requesters], ['IT Staff', accounts.itStaff],
                  ['Administrators', accounts.administrators], ['Inactive', accounts.inactive],
                ] as const).map(([label, value]) => (
                  <DrillLink key={label} href="#users" label={`${label}: ${value}`} onGo={() => onNavigate({ view: 'users' })}
                    className="text-decoration-none text-body">
                    <span className="text-muted">{label}</span> <span className="fw-bold">{value}</span>
                  </DrillLink>
                ))}
              </div>
            </section>
          )}
          <button type="button" className="btn text-white fw-semibold" style={{ backgroundColor: '#006B3C' }}
            onClick={() => onNavigate({ view: 'queue' })}>Open Ticket Queue</button>
        </>
      )}
    </DashboardFrame>
  );
};
