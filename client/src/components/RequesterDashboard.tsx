import React from 'react';
import { fetchRequesterDashboard, type DashboardTicketItem } from '../api';
import {
  DashboardFrame, DrillLink, EmptyNote, MetricCard, StatusBadge, relativeTime, useDashboard,
  type DashboardProps,
} from './dashboard/shared';

const TicketRow: React.FC<{ ticket: DashboardTicketItem; onOpen: (id: number) => void }> = ({ ticket, onOpen }) => (
  <li className="list-group-item px-0">
    <div className="d-flex justify-content-between align-items-start gap-2 flex-wrap">
      <DrillLink
        href={`/tickets/${ticket.id}`}
        onGo={() => onOpen(ticket.id)}
        className="fw-semibold text-decoration-none text-body d-block text-truncate"
      >
        <span style={{ color: '#006B3C' }}>{ticket.ticketNumber}</span> {ticket.summary}
      </DrillLink>
      <StatusBadge status={ticket.status} />
    </div>
    <div className="small text-muted">Updated {relativeTime(ticket.updatedAt)}</div>
  </li>
);

const TicketList: React.FC<{
  title: string; tickets: DashboardTicketItem[]; empty: string; icon: string; onOpen: (id: number) => void;
}> = ({ title, tickets, empty, icon, onOpen }) => (
  <section aria-label={title} className="card border-0 shadow-sm p-3 h-100">
    <h2 className="h5 fw-bold mb-2">{title}</h2>
    {tickets.length === 0 ? (
      <EmptyNote icon={icon}>{empty}</EmptyNote>
    ) : (
      <ul className="list-group list-group-flush">
        {tickets.map(ticket => <TicketRow key={ticket.id} ticket={ticket} onOpen={onOpen} />)}
      </ul>
    )}
  </section>
);

export const RequesterDashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate, onOpenTicket, onGoHome }) => {
  const { state, reload } = useDashboard(fetchRequesterDashboard);
  const data = state.kind === 'ok' ? state.data : undefined;
  const m = data?.metrics;

  const card = (label: string, value: number, href: string, go: () => void, subLabel?: string) => (
    <div className="col" key={label}>
      <MetricCard label={label} value={value} subLabel={subLabel} href={href} onGo={go} />
    </div>
  );

  return (
    <DashboardFrame
      currentUser={currentUser}
      kind={state.kind}
      loading={state.kind === 'loading'}
      generatedAt={data?.generatedAt}
      cardCount={4}
      onRefresh={reload}
      onGoHome={onGoHome}
      cards={m && (
        <>
          {card('Open Tickets', m.openTickets, '#my-tickets?status=Active', () => onNavigate({ view: 'my-tickets', status: 'Active' }))}
          {card('Waiting for You', m.waitingForRequester, '#my-tickets?status=Waiting%20for%20Requester',
            () => onNavigate({ view: 'my-tickets', status: 'Waiting for Requester' }))}
          {card('Recently Updated', m.recentlyUpdated, '#my-tickets?recent=updated',
            () => onNavigate({ view: 'my-tickets', recent: 'updated' }), 'Last 7 days')}
          {card('Recently Resolved', m.recentlyResolved, '#my-tickets?recent=resolved',
            () => onNavigate({ view: 'my-tickets', recent: 'resolved' }), 'Last 7 days')}
        </>
      )}
    >
      {data && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-12 col-lg-6">
              <TicketList title="Needs your attention" tickets={data.attention} icon="✔" onOpen={onOpenTicket}
                empty="No Tickets are waiting for you." />
            </div>
            <div className="col-12 col-lg-6">
              <TicketList title="Recent Tickets" tickets={data.recentTickets} icon="🎫" onOpen={onOpenTicket}
                empty="You have not created any Tickets yet." />
            </div>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn text-white fw-semibold" style={{ backgroundColor: '#006B3C' }}
              onClick={() => onNavigate({ view: 'create' })}>Create Ticket</button>
            <button type="button" className="btn btn-outline-success fw-semibold"
              onClick={() => onNavigate({ view: 'my-tickets' })}>View My Tickets</button>
          </div>
        </>
      )}
    </DashboardFrame>
  );
};
