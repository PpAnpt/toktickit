import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../components/Modal';
import { ChangePassword } from '../../components/ChangePassword';

/** Labsheet section 7: no inaccessible modal dialogs. Role, name, Escape, focus on open, focus kept inside, focus restored. */
function Harness({ busy = false, onClose = () => undefined }: { busy?: boolean; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open dialog</button>
      {open && (
        <Modal titleId="t" onClose={() => { onClose(); setOpen(false); }} busy={busy}>
          <h5 id="t">Dialog title</h5>
          <input aria-label="First field" />
          <button>Middle</button>
          <button>Last</button>
        </Modal>
      )}
    </>
  );
}

describe('Lab 4: accessible modal dialog (Issue #34, review of the whole work)', () => {
  it('MOD-01: is a modal dialog named by its title, and the first control gets the focus', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    const dialog = screen.getByRole('dialog', { name: 'Dialog title' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('First field')).toHaveFocus();
  });

  it('MOD-02: Escape closes it and the focus returns to the button that opened it', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const opener = screen.getByRole('button', { name: 'Open dialog' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(screen.getByLabelText('First field'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('MOD-02: Escape is ignored while a request is in flight', () => {
    const onClose = vi.fn();
    render(<Harness busy onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    fireEvent.keyDown(screen.getByLabelText('First field'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('MOD-03: Tab and Shift+Tab stay inside the dialog', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    const last = screen.getByRole('button', { name: 'Last' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(screen.getByLabelText('First field')).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText('First field'), { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('MOD-04: the voluntary Change Password dialog closes with Escape; the mandatory one cannot be dismissed', () => {
    const onCancel = vi.fn();
    const view = render(<ChangePassword onPasswordChanged={() => undefined} userEmail="a@example.com" onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    view.unmount();
    render(<ChangePassword onPasswordChanged={() => undefined} userEmail="a@example.com" />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
