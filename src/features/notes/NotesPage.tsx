import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/Dialog';
import { formatShortDate } from '../../domain/format';
import { dateKey } from '../../domain/dates';
import { activeProjects } from '../../domain/tasks';
import { DomainError } from '../../domain/types';
import { useWorkspace } from '../../state/DataProvider';

export function NotesPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const { snapshot, createNote, updateNote, softDeleteNote, restoreNote, permanentDeleteNote } = useWorkspace();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [stored, setStored] = useState<{ id: string; title: string; content: string; projectId: string | null } | null>(null);
  const notes = snapshot.notes
    .filter((note) => !note.deletedAt)
    .filter((note) => {
      const haystack = `${note.title}\n${note.content}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const removed = snapshot.notes.filter((note) => note.deletedAt);
  const note = snapshot.notes.find((item) => item.id === noteId && !item.deletedAt);

  async function onCreate() {
    const id = await createNote({ title: '', content: '', projectId: null });
    navigate(`/notes/${id}`);
  }

  if (note && (!stored || stored.id !== note.id)) {
    setStored({ id: note.id, title: note.title, content: note.content, projectId: note.projectId });
  }
  const draft = note && stored?.id === note.id ? stored : null;

  async function save(next: { title: string; content: string; projectId: string | null }) {
    if (!note) return;
    setStatus('Saving…');
    try {
      await updateNote(note.id, next);
      setError('');
      setStatus('Saved');
    } catch (caught) {
      setStatus('');
      setError(caught instanceof DomainError ? caught.message : "Couldn't save that note.");
    }
  }

  return (
    <div className={note ? 'notes-layout is-editing' : 'notes-layout'}>
      <aside className="notes-list">
        <div className="page-header">
          <h1>Notes</h1>
          <button type="button" className="button button--primary" onClick={() => void onCreate()}>
            New note
          </button>
        </div>
        <label className="field">
          <span className="sr-only">Search notes</span>
          <input type="search" value={query} placeholder="Search notes" onChange={(event) => setQuery(event.target.value)} />
        </label>
        {notes.length === 0 ? <p className="quiet">{query ? 'No notes match that search.' : 'No notes yet.'}</p> : null}
        <ul className="plain-list">
          {notes.map((item) => (
            <li key={item.id}>
              <Link className="note-link" to={`/notes/${item.id}`} aria-current={item.id === noteId ? 'page' : undefined}>
                <strong>{item.title.trim() || 'Untitled'}</strong>
                <span className="excerpt">{item.content.replace(/\s+/g, ' ').trim().slice(0, 90) || 'Empty note'}</span>
              </Link>
            </li>
          ))}
        </ul>
        {removed.length > 0 ? (
          <details className="disclosure">
            <summary>Removed notes ({removed.length})</summary>
            <ul className="plain-list">
              {removed.map((item) => (
                <li key={item.id} className="inbox-card">
                  <p>{item.title.trim() || 'Untitled'}</p>
                  <div className="button-row">
                    <button type="button" className="button button--quiet" onClick={() => void restoreNote(item.id)}>
                      Restore
                    </button>
                    <button type="button" className="button button--ghost" onClick={() => void permanentDeleteNote(item.id)}>
                      Delete forever
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </aside>
      <section className="notes-editor">
        {!note || !draft ? (
          <div className="empty">
            <h2>Choose a note</h2>
            <p>Or start a new one. Writing stays on this device.</p>
          </div>
        ) : (
          <>
            <p className="notes-back">
              <Link to="/notes">All notes</Link>
            </p>
            <h1 className="mobile-only">Note</h1>
            <p className="status-line" role="status">
              {status}
              {status === 'Saved' ? ` · ${formatShortDate(dateKey(new Date(note.updatedAt)))}` : ''}
            </p>
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <label className="field">
              <span className="sr-only">Title</span>
              <input
                className="title-input"
                value={draft.title}
                placeholder="Title"
                onChange={(event) => {
                  const next = { ...draft, title: event.target.value };
                  setStored(next);
                  void save(next);
                }}
              />
            </label>
            <label className="field">
              <span>Project</span>
              <select
                value={draft.projectId ?? ''}
                onChange={(event) => {
                  const next = { ...draft, projectId: event.target.value || null };
                  setStored(next);
                  void save(next);
                }}
              >
                <option value="">No project</option>
                {activeProjects(snapshot.projects).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="sr-only">Note</span>
              <textarea
                className="writing"
                value={draft.content}
                placeholder="Start writing"
                onChange={(event) => {
                  const next = { ...draft, content: event.target.value };
                  setStored(next);
                  void save(next);
                }}
              />
            </label>
            <button type="button" className="button button--ghost" onClick={() => setConfirming(true)}>
              Remove note
            </button>
            <ConfirmDialog
              open={confirming}
              title="Remove this note?"
              body="You can restore it from Removed notes."
              confirmLabel="Remove"
              onClose={() => setConfirming(false)}
              onConfirm={() => {
                void softDeleteNote(note.id).then(() => navigate('/notes'));
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
