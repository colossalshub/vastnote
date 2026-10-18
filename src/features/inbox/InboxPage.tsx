import { useState } from 'react';
import { Dialog } from '../../components/Dialog';
import { ScheduleDialogFields } from '../../components/TaskFields';
import { dateKey } from '../../domain/dates';
import { formatRelative } from '../../domain/format';
import { DomainError } from '../../domain/types';
import { useWorkspace } from '../../state/DataProvider';
import { useUi } from '../../state/UiProvider';

export function InboxPage() {
  const { snapshot, addInbox, updateInbox, setInboxStatus, createTask, createNote } = useWorkspace();
  const { announce } = useUi();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [date, setDate] = useState(dateKey());
  const [time, setTime] = useState('');
  const openItems = snapshot.inbox.filter((item) => item.status === 'open').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const archived = snapshot.inbox.filter((item) => item.status === 'archived');

  async function onCapture(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) {
      setError('Write something to capture.');
      return;
    }
    try {
      await addInbox(text);
      setText('');
      setError('');
      announce('Captured');
    } catch (caught) {
      setError(caught instanceof DomainError ? caught.message : "Couldn't save that capture.");
    }
  }

  async function makeTask(id: string, itemText: string, dueDate: string | null = null, dueTime: string | null = null) {
    await createTask({
      title: itemText.split('\n')[0]?.slice(0, 500) || 'Untitled',
      description: itemText.includes('\n') ? itemText.split('\n').slice(1).join('\n').trim() : '',
      dueDate,
      dueTime,
      priority: 'none',
      projectId: null,
    });
    await setInboxStatus(id, 'converted');
    announce(dueDate ? 'Scheduled' : 'Turned into a task');
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Inbox</h1>
          <p className="lede">Capture now. Organize when you have the energy.</p>
        </div>
      </header>
      <form className="capture-row" aria-label="Inbox capture" onSubmit={onCapture}>
        <label className="sr-only" htmlFor="inbox-capture">
          Capture a thought
        </label>
        <input
          id="inbox-capture"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Add something to the inbox"
          autoComplete="off"
        />
        <button type="submit" className="button button--primary">
          Capture
        </button>
      </form>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {openItems.length === 0 ? (
        <div className="empty">
          <h2>Inbox is clear</h2>
          <p>New thoughts can land here before they become tasks or notes.</p>
        </div>
      ) : (
        <ul className="plain-list">
          {openItems.map((item) => (
            <li key={item.id} className="inbox-card">
              {editing === item.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void updateInbox(item.id, draft).then(() => {
                      setEditing(null);
                      announce('Capture updated');
                    });
                  }}
                >
                  <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={4} />
                  <div className="button-row">
                    <button type="submit" className="button button--primary">
                      Save
                    </button>
                    <button type="button" className="button button--quiet" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p>{item.text}</p>
                  <p className="meta">{formatRelative(item.createdAt)}</p>
                  <div className="decision-row">
                    <button type="button" className="button button--quiet" onClick={() => void makeTask(item.id, item.text)}>
                      Make task
                    </button>
                    <button
                      type="button"
                      className="button button--quiet"
                      onClick={() => {
                        const title = item.text.split('\n')[0]?.slice(0, 500) || 'Untitled';
                        const content = item.text.includes('\n') ? item.text.split('\n').slice(1).join('\n').trim() : item.text;
                        void createNote({ title, content, projectId: null }).then(async () => {
                          await setInboxStatus(item.id, 'converted');
                          announce('Turned into a note');
                        });
                      }}
                    >
                      Make note
                    </button>
                    <button
                      type="button"
                      className="button button--quiet"
                      onClick={() => {
                        setScheduling(item.id);
                        setDate(dateKey());
                        setTime('');
                      }}
                    >
                      Schedule
                    </button>
                    <button type="button" className="button button--ghost" onClick={() => void setInboxStatus(item.id, 'archived')}>
                      Archive
                    </button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => {
                        setEditing(item.id);
                        setDraft(item.text);
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {archived.length > 0 ? (
        <details className="disclosure">
          <summary>Archived captures ({archived.length})</summary>
          <ul className="plain-list">
            {archived.map((item) => (
              <li key={item.id} className="inbox-card">
                <p>{item.text}</p>
                <button type="button" className="button button--quiet" onClick={() => void setInboxStatus(item.id, 'open')}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <Dialog
        open={scheduling !== null}
        title="Schedule"
        onClose={() => setScheduling(null)}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const item = openItems.find((entry) => entry.id === scheduling);
            if (!item || !date) return;
            void makeTask(item.id, item.text, date, time || null).then(() => setScheduling(null));
          }}
        >
          <ScheduleDialogFields date={date} time={time} onDate={setDate} onTime={setTime} />
          <div className="button-row">
            <button type="submit" className="button button--primary" disabled={!date}>
              Schedule
            </button>
            <button type="button" className="button button--quiet" onClick={() => setScheduling(null)}>
              Cancel
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
