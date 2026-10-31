import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionApiError,
  createActionTaken,
  fetchActionRevisions,
  fetchActionsTaken,
  updateActionTaken,
  type ActionInput,
  type ActionRevisionItem,
  type ActionStatus,
  type ActionTakenItem,
  type StaffMember,
} from '../api';
import { RoleBadge } from './RoleBadge';

/**
 * Actions Taken area of the Ticket Detail screens (docs/lab-04/ui-spec.md section 4.3).
 *  - Requesters see every action of their own Ticket read-only (canEdit = false, no history).
 *  - IT Staff and Administrators can add, edit, start, complete, cancel and reassign actions and
 *    open the per-action history. The server enforces every rule; the controls only guide the user.
 */

interface ActionsTakenProps {
  ticketId: number;
  ticketStatus: string;
  canEdit: boolean;
  staffMembers?: StaffMember[];
  /** Called after an action was saved so the parent can refresh the Ticket summary */
  onChanged?: () => void;
}

type PanelKind = 'edit' | 'start' | 'complete' | 'cancel' | 'reassign';
type Panel = { kind: 'create' } | { kind: PanelKind; action: ActionTakenItem };

const PAGE_SIZE = 20;
const STATUS_CLASS: Record<ActionStatus, string> = {
  'Planned': 'bg-secondary',
  'In Progress': 'bg-info text-dark',
  'Completed': 'bg-success',
  'Cancelled': 'bg-dark',
};
const FIELD_LABELS: Record<string, string> = {
  description: 'Description', result: 'Result', status: 'Status', actionAt: 'Action time', assigneeId: 'Assignee',
  followUpRequired: 'Follow-up required', followUpNote: 'Follow-up note', attachmentNotes: 'Attachment notes',
};

const formatTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

/** ISO string -> value for <input type="datetime-local"> in the user's own time zone */
function toInputValue(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

interface FormValues {
  actionAt: string;
  description: string;
  status: ActionStatus;
  assigneeId: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

function initialValues(action: ActionTakenItem | undefined, resolvedTicket: boolean): FormValues {
  return {
    actionAt: toInputValue(action ? action.actionAt : new Date()),
    description: action?.description ?? '',
    status: action?.status ?? 'Completed',
    assigneeId: action ? String(action.assignee.id) : '',
    result: action?.result ?? '',
    followUpRequired: action?.followUpRequired ?? false,
    followUpNote: action?.followUpNote ?? '',
    attachmentNotes: action?.attachmentNotes ?? '',
    ...(resolvedTicket && !action ? { status: 'Completed' as ActionStatus } : {}),
  };
}

/**
 * The open editor. All of its state lives in the parent (ActionsTaken), not in the form: the form view can be
 * unmounted and mounted again (the list refreshes, or the edited action moves to another page) and the typed text,
 * the pending save, the conflict banner and the errors all carry on.
 */
interface Editor {
  panel: Panel;
  values: FormValues;
  /** JSON of the values when the editor opened: the editor is dirty when they differ */
  baseline: string;
  /** The time field has minute precision, so it is only sent when the user changed it */
  initialActionAt: string;
  /** One id per open editor, so a retry after a lost response cannot create a duplicate (BR-13) */
  requestId: string;
  errors: Record<string, string>;
  formError: string;
  stale: boolean;
  busy: boolean;
}

function newEditor(panel: Panel, resolvedTicket: boolean): Editor {
  const values = initialValues(panel.kind === 'create' ? undefined : panel.action, resolvedTicket);
  return {
    panel, values, baseline: JSON.stringify(values), initialActionAt: values.actionAt, requestId: crypto.randomUUID(),
    errors: {}, formError: '', stale: false, busy: false,
  };
}

const isDirty = (editor: Editor | null) => Boolean(editor) && JSON.stringify(editor!.values) !== editor!.baseline;

type ReloadOutcome = 'ok' | 'missing' | 'failed';

function fieldsFor(kind: Panel['kind']) {
  return {
    actionAt: kind === 'create' || kind === 'edit',
    description: kind === 'create' || kind === 'edit',
    status: kind === 'create',
    assignee: kind === 'create' || kind === 'edit' || kind === 'reassign',
    result: kind === 'create' || kind === 'edit' || kind === 'complete' || kind === 'cancel',
    followUp: kind === 'create' || kind === 'edit',
    attachmentNotes: kind === 'create' || kind === 'edit',
  };
}

// A result is required to complete or cancel, and to keep a Completed or Cancelled action valid (BR-05)
function resultIsRequired({ panel, values }: Editor): boolean {
  return panel.kind === 'complete' || panel.kind === 'cancel'
    || (panel.kind === 'create' && values.status === 'Completed')
    || (panel.kind === 'edit' && (panel.action.status === 'Completed' || panel.action.status === 'Cancelled'));
}

function validateEditor(editor: Editor): Record<string, string> {
  const { panel, values } = editor;
  const show = fieldsFor(panel.kind);
  const found: Record<string, string> = {};
  if (show.description && !values.description.trim()) found.description = 'Describe what was done.';
  if (show.actionAt && !values.actionAt) found.actionAt = 'Choose the action date and time.';
  if (show.result && resultIsRequired(editor) && !values.result.trim()) {
    found.result = panel.kind === 'cancel' ? 'Enter the reason for cancelling.' : 'Enter the result of this action.';
  }
  if (show.followUp && values.followUpRequired && !values.followUpNote.trim()) {
    found.followUpNote = 'Follow-up note is required when follow-up is needed.';
  }
  return found;
}

function buildInput(editor: Editor): ActionInput {
  const { panel, values } = editor;
  const kind = panel.kind;
  const action = panel.kind === 'create' ? undefined : panel.action;
  const show = fieldsFor(kind);
  const input: ActionInput = {};
  // An edit keeps the stored time (a rounded-down time could fall just before the Ticket's creation)
  if (show.actionAt && values.actionAt !== editor.initialActionAt) {
    input.actionAt = new Date(values.actionAt).toISOString();
  }
  if (show.description) input.description = values.description.trim();
  if (kind === 'create') input.status = values.status;
  if (show.assignee && values.assigneeId) input.assigneeId = Number(values.assigneeId);
  if (show.result) input.result = values.result.trim() || null;
  if (show.followUp) {
    input.followUpRequired = values.followUpRequired;
    input.followUpNote = values.followUpRequired ? values.followUpNote.trim() : null;
  }
  if (show.attachmentNotes) input.attachmentNotes = values.attachmentNotes.trim() || null;
  if (kind === 'start') input.status = 'In Progress';
  if (kind === 'complete') input.status = 'Completed';
  // Starting or completing a scheduled action means the work happens now (BR-04: not in the future)
  if ((kind === 'start' || kind === 'complete') && action && new Date(action.actionAt).getTime() > Date.now()) {
    input.actionAt = new Date().toISOString();
  }
  if (kind === 'cancel') input.status = 'Cancelled';
  if (kind === 'create') input.clientRequestId = editor.requestId;
  else if (action) input.expectedUpdatedAt = action.updatedAt;
  return input;
}

// ─── Form (view only) ────────────────────────────────────────

interface ActionFormProps {
  editor: Editor;
  staffMembers: StaffMember[];
  resolvedTicket: boolean;
  onChange: <K extends keyof FormValues>(key: K, value: FormValues[K]) => void;
  onSubmit: () => void;
  onClose: () => void;
  onReload: () => void;
}

const ActionForm: React.FC<ActionFormProps> = ({ editor, staffMembers, resolvedTicket, onChange, onSubmit, onClose, onReload }) => {
  const { panel, values, errors, formError, stale, busy } = editor;
  const action = panel.kind === 'create' ? undefined : panel.action;
  const kind = panel.kind;
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (formError) summaryRef.current?.focus(); }, [formError]);

  const assignees = staffMembers.some(m => action && m.id === action.assignee.id) || !action
    ? staffMembers
    : [...staffMembers, { id: action.assignee.id, name: `${action.assignee.name} (inactive)`, email: '', role: action.assignee.role }];

  const showFields = fieldsFor(kind);
  const resultRequired = resultIsRequired(editor);

  const idPrefix = `action-${panel.kind === 'create' ? 'new' : `${kind}-${panel.action.id}`}`;
  const fieldProps = (name: string) => ({
    id: `${idPrefix}-${name}`,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${idPrefix}-${name}-error` : undefined,
    disabled: busy,
  });
  const fieldError = (name: string) => errors[name]
    ? <div id={`${idPrefix}-${name}-error`} className="invalid-feedback d-block">{errors[name]}</div>
    : null;

  const titles: Record<Panel['kind'], string> = {
    create: 'Add Action Taken', edit: 'Edit action', start: 'Start this action?', complete: 'Complete this action', cancel: 'Cancel this action', reassign: 'Reassign this action',
  };
  const saveLabels: Record<Panel['kind'], string> = {
    create: 'Save action', edit: 'Save changes', start: 'Start action', complete: 'Mark as completed', cancel: 'Cancel action', reassign: 'Reassign',
  };

  return (
    <form onSubmit={event => { event.preventDefault(); onSubmit(); }} noValidate className="border rounded p-3 bg-light mb-3" aria-label={titles[kind]}>
      <h6 className="fw-bold mb-3">{titles[kind]}</h6>

      {formError && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="alert alert-danger py-2 small">
          {formError}
          {stale && (
            <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={onReload}>Reload latest</button>
          )}
        </div>
      )}

      {kind === 'create' && (
        <p className="small text-muted mb-3">Performed by is set automatically from your account.</p>
      )}

      <div className="row g-3">
        {showFields.actionAt && (
          <div className="col-12 col-md-6">
            <label htmlFor={`${idPrefix}-actionAt`} className="form-label fw-semibold small">Action date and time</label>
            <input type="datetime-local" className={`form-control ${errors.actionAt ? 'is-invalid' : ''}`} value={values.actionAt}
              onChange={e => onChange('actionAt', e.target.value)} {...fieldProps('actionAt')} />
            {fieldError('actionAt')}
          </div>
        )}
        {showFields.status && (
          <div className="col-12 col-md-6">
            <label htmlFor={`${idPrefix}-status`} className="form-label fw-semibold small">Status</label>
            <select className={`form-select ${errors.status ? 'is-invalid' : ''}`} value={values.status}
              onChange={e => onChange('status', e.target.value as ActionStatus)} {...fieldProps('status')}>
              {!resolvedTicket && <option value="Planned">Planned</option>}
              {!resolvedTicket && <option value="In Progress">In Progress</option>}
              <option value="Completed">Completed</option>
            </select>
            {resolvedTicket && <div className="form-text">Reopen the Ticket to plan new work.</div>}
            {fieldError('status')}
          </div>
        )}
        {showFields.assignee && (
          <div className="col-12 col-md-6">
            <label htmlFor={`${idPrefix}-assigneeId`} className="form-label fw-semibold small">Assignee</label>
            <select className={`form-select ${errors.assigneeId ? 'is-invalid' : ''}`} value={values.assigneeId}
              onChange={e => onChange('assigneeId', e.target.value)} {...fieldProps('assigneeId')}>
              {kind === 'create' && <option value="">Me (default)</option>}
              {assignees.map(m => (
                <option key={m.id} value={m.id} disabled={m.name.endsWith('(inactive)')}>{m.name}</option>
              ))}
            </select>
            {fieldError('assigneeId')}
          </div>
        )}
      </div>

      {showFields.description && (
        <div className="mt-3">
          <label htmlFor={`${idPrefix}-description`} className="form-label fw-semibold small">Action description</label>
          <textarea className={`form-control ${errors.description ? 'is-invalid' : ''}`} rows={3} maxLength={2000} value={values.description}
            onChange={e => onChange('description', e.target.value)} {...fieldProps('description')} />
          {fieldError('description')}
        </div>
      )}

      {showFields.result && (
        <div className="mt-3">
          <label htmlFor={`${idPrefix}-result`} className="form-label fw-semibold small">
            {kind === 'cancel' ? 'Reason for cancelling' : 'Result'}{resultRequired ? ' (required)' : ''}
          </label>
          <textarea className={`form-control ${errors.result ? 'is-invalid' : ''}`} rows={2} maxLength={1000} value={values.result}
            onChange={e => onChange('result', e.target.value)} {...fieldProps('result')} />
          {fieldError('result')}
        </div>
      )}

      {showFields.followUp && (
        <div className="mt-3">
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id={`${idPrefix}-followUpRequired`} checked={values.followUpRequired}
              disabled={busy} onChange={e => onChange('followUpRequired', e.target.checked)} />
            <label className="form-check-label small fw-semibold" htmlFor={`${idPrefix}-followUpRequired`}>Follow-up required?</label>
          </div>
          {values.followUpRequired && (
            <div className="mt-2">
              <label htmlFor={`${idPrefix}-followUpNote`} className="form-label fw-semibold small">Follow-up note (required)</label>
              <textarea className={`form-control ${errors.followUpNote ? 'is-invalid' : ''}`} rows={2} maxLength={1000} value={values.followUpNote}
                onChange={e => onChange('followUpNote', e.target.value)} {...fieldProps('followUpNote')} />
              {fieldError('followUpNote')}
            </div>
          )}
        </div>
      )}

      {showFields.attachmentNotes && (
        <div className="mt-3">
          <label htmlFor={`${idPrefix}-attachmentNotes`} className="form-label fw-semibold small">Attachment notes</label>
          <textarea className={`form-control ${errors.attachmentNotes ? 'is-invalid' : ''}`} rows={2} maxLength={500} value={values.attachmentNotes}
            onChange={e => onChange('attachmentNotes', e.target.value)} {...fieldProps('attachmentNotes')} />
          <div className="form-text">Which file or image should the reader look for?</div>
          {fieldError('attachmentNotes')}
        </div>
      )}

      <div className="d-flex gap-2 mt-3">
        <button type="submit" className="btn btn-sm text-white" style={{ backgroundColor: '#006B3C' }} disabled={busy}>
          {busy ? 'Saving...' : saveLabels[kind]}
        </button>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose} disabled={busy}>Close</button>
      </div>
    </form>
  );
};

// ─── History (staff only, read-only) ─────────────────────────

const HISTORY_PAGE_SIZE = 10;

const History: React.FC<{ ticketId: number; actionId: number }> = ({ ticketId, actionId }) => {
  const [revisions, setRevisions] = useState<ActionRevisionItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchActionRevisions(ticketId, actionId, targetPage, HISTORY_PAGE_SIZE);
      setRevisions(result.revisions);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'History could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [ticketId, actionId]);

  useEffect(() => { if (opened) load(page); }, [opened, page, load]);

  const asText = (value: unknown) => (value === null || value === undefined || value === '' ? '(empty)' : String(value));
  const first = total === 0 ? 0 : (page - 1) * HISTORY_PAGE_SIZE + 1;
  const last = Math.min(page * HISTORY_PAGE_SIZE, total);

  return (
    <details className="mt-2" onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) setOpened(true); }}>
      <summary className="small fw-semibold text-secondary" style={{ cursor: 'pointer' }}>History</summary>
      {loading && <p role="status" className="small text-muted mt-2 mb-0">Loading history...</p>}
      {error && <p role="alert" className="small text-danger mt-2 mb-0">{error}</p>}
      {revisions && revisions.length === 0 && <p className="small text-muted mt-2 mb-0">No history recorded.</p>}
      {revisions && revisions.length > 0 && (
        <ol className="small mt-2 mb-0 ps-3" start={first}>
          {revisions.map(r => (
            <li key={r.revisionNo} className="mb-2">
              <strong>{r.type.replace('_', ' ').toLowerCase()}</strong> by {r.actor.name} · {formatTime(r.createdAt)}
              {r.changedFields.map(field => (
                <div key={field} className="text-muted">
                  {FIELD_LABELS[field] ?? field}: <span>Before: {asText(r.before?.[field])}</span> → <span>After: {asText(r.after[field])}</span>
                </div>
              ))}
            </li>
          ))}
        </ol>
      )}
      {total > HISTORY_PAGE_SIZE && (
        <nav className="d-flex justify-content-between align-items-center mt-2" aria-label="History pages">
          <span className="small text-muted" role="status">History {first}-{last} of {total}</span>
          <div className="btn-group">
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous history</button>
            <button type="button" className="btn btn-sm btn-outline-secondary" disabled={last >= total || loading} onClick={() => setPage(page + 1)}>Next history</button>
          </div>
        </nav>
      )}
    </details>
  );
};

// ─── Main component ──────────────────────────────────────────

export const ActionsTaken: React.FC<ActionsTakenProps> = ({ ticketId, ticketStatus, canEdit, staffMembers = [], onChanged }) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ actions: ActionTakenItem[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [editor, setEditor] = useState<Editor | null>(null);
  // Always the latest editor, for async handlers that finish after a render
  const editorRef = useRef<Editor | null>(null);
  editorRef.current = editor;
  // Guards a save in flight; it lives here so it survives the form view being unmounted (FR-14)
  const lock = useRef(false);

  const terminal = ticketStatus === 'Closed' || ticketStatus === 'Cancelled';
  const resolvedTicket = ticketStatus === 'Resolved';
  const editable = canEdit && !terminal;
  const busy = Boolean(editor?.busy);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await fetchActionsTaken(ticketId, targetPage, PAGE_SIZE);
      setData({ actions: result.actions, total: result.total });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Actions Taken could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(page); }, [load, page]);

  // Closing the editor, opening another one, or leaving the page must not silently throw away typed text (ui-spec 4.3)
  useEffect(() => {
    if (!editor) return;
    const warn = (event: BeforeUnloadEvent) => { if (isDirty(editorRef.current)) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editor === null]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Changes the editor identified by `key` only: a late answer never touches a newer editor */
  const patchEditor = (key: string, patch: Partial<Editor>) =>
    setEditor(prev => (prev && prev.requestId === key ? { ...prev, ...patch } : prev));

  /** Replaces the open editor (or closes it) after the user agreed to discard unsaved text */
  const switchPanel = (next: Panel | null) => {
    if (editorRef.current?.busy) return; // a save is in flight
    if (isDirty(editorRef.current) && !window.confirm('Discard your unsaved changes to this action?')) return;
    setNotice('');
    setEditor(next ? newEditor(next, resolvedTicket) : null);
  };

  const changeField = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setEditor(prev => (prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev));

  const submit = async () => {
    const current = editorRef.current;
    if (!current || lock.current) return; // double click / repeated submit (FR-14)
    const key = current.requestId;
    const found = validateEditor(current);
    if (Object.keys(found).length > 0) {
      patchEditor(key, { stale: false, formError: 'Please correct the highlighted fields.', errors: found });
      return;
    }
    lock.current = true;
    patchEditor(key, { busy: true, stale: false, formError: '', errors: {} });
    try {
      if (current.panel.kind === 'create') await createActionTaken(ticketId, buildInput(current));
      else await updateActionTaken(ticketId, current.panel.action.id, buildInput(current));
      if (editorRef.current?.requestId === key) {
        setEditor(null);
        setNotice('Action saved.');
      }
      load(page);
      onChanged?.();
    } catch (err) {
      const apiError = err instanceof ActionApiError ? err : null;
      if (apiError?.code === 'STALE_UPDATE') {
        patchEditor(key, { stale: true, formError: 'This action was changed by someone else while you were editing.' });
      } else {
        // The entered text stays in the form after any recoverable failure (FR-16)
        patchEditor(key, { formError: apiError?.message || 'The action could not be saved. Please try again.', errors: apiError?.details ?? {} });
      }
    } finally {
      lock.current = false;
      patchEditor(key, { busy: false });
    }
  };

  /**
   * Loads the saved version of the edited action into the editor after a conflict. The action can have moved to
   * another page (its time changed), so the other pages are searched too. The typed text is never touched.
   */
  const reload = async () => {
    const current = editorRef.current;
    if (!current || current.panel.kind === 'create') return;
    const key = current.requestId;
    const id = current.panel.action.id;
    let outcome: ReloadOutcome = 'ok';
    let latest: ActionTakenItem | undefined;
    try {
      const first = await fetchActionsTaken(ticketId, page, PAGE_SIZE);
      setData({ actions: first.actions, total: first.total });
      latest = first.actions.find(a => a.id === id);
      for (let p = 1; !latest && p <= Math.ceil(first.total / PAGE_SIZE); p++) {
        if (p === page) continue;
        latest = (await fetchActionsTaken(ticketId, p, PAGE_SIZE)).actions.find(a => a.id === id);
      }
      if (!latest) outcome = 'missing';
    } catch {
      outcome = 'failed';
    }
    if (outcome === 'ok' && latest) {
      const fresh = latest;
      setEditor(prev => (prev && prev.requestId === key && prev.panel.kind !== 'create'
        ? { ...prev, panel: { kind: prev.panel.kind, action: fresh }, stale: false, errors: {}, formError: 'Latest version loaded. Your text was kept: review it and save again.' }
        : prev));
      return;
    }
    patchEditor(key, {
      stale: true,
      formError: outcome === 'missing'
        ? 'This action could not be found any more. Your text is kept here: copy it before you close the editor.'
        : 'The latest version could not be loaded. Your text is kept: try Reload latest again.',
    });
  };

  const total = data?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const open = (kind: PanelKind, action: ActionTakenItem) => switchPanel({ kind, action });
  const editorOn = (id: number) => editor && editor.panel.kind !== 'create' && editor.panel.action.id === id ? editor : null;
  // The edited action is not on the page being shown (it moved, or the user changed page): the editor stays on screen
  const detached = editor && editor.panel.kind !== 'create' && data
    && !data.actions.some(a => a.id === (editor.panel as { action: ActionTakenItem }).action.id) ? editor : null;

  const renderForm = (shown: Editor) => (
    <ActionForm editor={shown} staffMembers={staffMembers} resolvedTicket={resolvedTicket}
      onChange={changeField} onSubmit={submit} onClose={() => switchPanel(null)} onReload={reload} />
  );

  return (
    <section className="card shadow-sm border-0 mb-4" aria-labelledby={`actions-title-${ticketId}`}>
      <div className="card-header py-3 d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ backgroundColor: '#EAF6EF', borderLeft: '4px solid #006B3C' }}>
        <h5 id={`actions-title-${ticketId}`} className="mb-0 fw-bold text-dark">Actions Taken ({total})</h5>
        {editable && (
          <button type="button" className="btn btn-sm text-white" style={{ backgroundColor: '#006B3C' }}
            disabled={editor?.panel.kind === 'create' || busy} onClick={() => switchPanel({ kind: 'create' })}>
            + Add Action
          </button>
        )}
      </div>
      <div className="card-body p-4">
        {notice && <div role="status" className="alert alert-success py-2 small">{notice}</div>}
        {canEdit && terminal && (
          <p className="small text-muted">This Ticket is {ticketStatus.toLowerCase()}, so Actions Taken can no longer be added or changed.</p>
        )}

        {editor?.panel.kind === 'create' && editable && renderForm(editor)}
        {detached && editable && (
          <div>
            <div className="alert alert-warning py-2 small" role="status">
              Action {(detached.panel as { action: ActionTakenItem }).action.id} is not on this page of the list (it moved, or you changed page). Your editor and text are kept.
            </div>
            {renderForm(detached)}
          </div>
        )}

        {loading && !data && <p role="status" className="text-muted mb-0">Loading actions...</p>}
        {loadError && (
          <div role="alert" className="alert alert-danger py-2 small">
            {loadError} <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={() => load(page)}>Retry</button>
          </div>
        )}
        {data && data.actions.length === 0 && !loadError && (
          <p className="text-muted mb-0">
            No actions have been recorded yet.
            {editable && ' Complete at least one action before resolving this Ticket.'}
          </p>
        )}

        {data && data.actions.map(a => {
          const active = editorOn(a.id);
          const isOpenAction = a.status === 'Planned' || a.status === 'In Progress';
          return (
            <article key={a.id} className="border rounded p-3 mb-3" aria-label={`Action ${a.id}`}>
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <strong>{formatTime(a.actionAt)}</strong>{' '}
                  <span className={`badge ${STATUS_CLASS[a.status]}`}>{a.status}</span>
                </div>
                <div className="small text-muted">
                  Performed by {a.performedBy.name} <RoleBadge role={a.performedBy.role} />
                </div>
              </div>
              <div className="small text-muted mt-1">
                Assigned to {a.assignee.name} <RoleBadge role={a.assignee.role} />
              </div>
              <p className="mt-2 mb-1" style={{ whiteSpace: 'pre-wrap' }}>{a.description}</p>
              <p className="mb-1 small"><strong>Result:</strong> {a.result ? <span style={{ whiteSpace: 'pre-wrap' }}>{a.result}</span> : <span className="text-muted">Not recorded</span>}</p>
              {a.followUpRequired && (
                <p className="mb-1 small">
                  <span className="badge bg-warning text-dark me-2">Follow-up</span>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{a.followUpNote}</span>
                </p>
              )}
              {a.attachmentNotes && <p className="mb-1 small"><strong>Look for:</strong> {a.attachmentNotes}</p>}
              <div className="small text-muted">
                Recorded {formatTime(a.createdAt)}
                {a.updatedBy && <> · Edited by {a.updatedBy.name} on {formatTime(a.updatedAt)}</>}
              </div>

              {editable && !active && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => open('edit', a)}>Edit</button>
                  {a.status === 'Planned' && <button type="button" className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => open('start', a)}>Start</button>}
                  {isOpenAction && <button type="button" className="btn btn-sm btn-outline-success" disabled={busy} onClick={() => open('complete', a)}>Complete</button>}
                  {isOpenAction && <button type="button" className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => open('cancel', a)}>Cancel</button>}
                  <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => open('reassign', a)}>Reassign</button>
                </div>
              )}
              {editable && active && <div className="mt-3">{renderForm(active)}</div>}
              {canEdit && <History ticketId={ticketId} actionId={a.id} />}
            </article>
          );
        })}

        {data && total > PAGE_SIZE && (
          <nav className="d-flex justify-content-between align-items-center" aria-label="Actions Taken pages">
            <span className="small text-muted">Showing {first}-{last} of {total}</span>
            <div className="btn-group">
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={last >= total || loading} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </nav>
        )}
      </div>
    </section>
  );
};

export default ActionsTaken;
