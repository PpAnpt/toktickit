import React, { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The shell of a modal dialog (ui-spec section 6): `role="dialog"` named by its title, `aria-modal`, the focus moves
 * into it when it opens, Tab stays inside, Escape closes it (not while a request is in flight), and the focus goes back
 * to the control that opened it. The markup inside is the usual Bootstrap `modal-dialog` structure.
 */
export const Modal: React.FC<{
  titleId: string;
  onClose: () => void;
  /** A request is in flight: Escape must not close the dialog */
  busy?: boolean;
  children: React.ReactNode;
}> = ({ titleId, onClose, busy = false, children }) => {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = root.current?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
    (first ?? root.current)?.focus();
    return () => { if (opener?.isConnected) opener.focus(); };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!busy) onClose();
      return;
    }
    if (event.key !== 'Tab' || !root.current) return;
    const items = [...root.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (items.length === 0) return;
    const firstItem = items[0];
    const lastItem = items[items.length - 1];
    if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
    else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
  };

  return (
    <div
      ref={root}
      className="modal show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
};
