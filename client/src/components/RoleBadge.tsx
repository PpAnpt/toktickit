import React from 'react';

// Role labels and Zen Green role badge colours (docs/lab-03/ui-spec.md §1)
export const ROLE_LABELS: Record<string, string> = {
  REQUESTER: 'Requester',
  IT_STAFF: 'IT Staff',
  ADMINISTRATOR: 'Administrator',
};

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  REQUESTER: { bg: '#E6FFFA', fg: '#047481' },
  IT_STAFF: { bg: '#EAF6EF', fg: '#006B3C' },
  ADMINISTRATOR: { bg: '#F3E8FF', fg: '#6B21A8' },
};

interface RoleBadgeProps {
  role?: string;
  className?: string;
  'data-testid'?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = '', ...rest }) => {
  if (!role) return null;
  const colors = ROLE_COLORS[role] ?? { bg: '#F1F5F9', fg: '#475569' };
  return (
    <span
      className={`badge rounded-pill ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.fg, border: '1px solid currentColor', fontSize: '0.72rem' }}
      data-testid={rest['data-testid']}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
};
