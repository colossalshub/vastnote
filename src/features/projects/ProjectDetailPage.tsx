import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/Dialog';
import { TaskList } from '../../components/TaskList';
import { isOpenTask, projectSummary } from '../../domain/tasks';
import { DomainError } from '../../domain/types';
import { useWorkspace } from '../../state/DataProvider';

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { snapshot, updateProject, setProjectArchived, deleteProject, setTaskCompleted } = useWorkspace();
  const project = snapshot.projects.find((item) => item.id === projectId);
  const [stored, setStored] = useState<{ id: string; name: string; description: string } | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);
  const [deleteAssociated, setDeleteAssociated] = useState(false);

  if (!project) {
    return (
      <div className="page">
        <h1>Project not available</h1>
        <Link to="/projects">Back to projects</Link>
      </div>
    );
  }

  if (!stored || stored.id !== project.id) {
    setStored({ id: project.id, name: project.name, description: project.description });
  }
  const draft = stored && stored.id === project.id ? stored : { id: project.id, name: project.name, description: project.description };
  const summary = projectSummary(snapshot.tasks, snapshot.notes, project.id);
  const tasks = snapshot.tasks.filter((task) => task.projectId === project.id && isOpenTask(task));
  const notes = snapshot.notes.filter((note) => note.projectId === project.id && !note.deletedAt);

  async function save(next: { name: string; description: string }) {
    if (!next.name.trim()) {
      setError('Name the project before saving.');
      setStatus('');
      return;
    }
    setStatus('Saving…');
    try {
      await updateProject(project!.id, next);
      setError('');
      setStatus('Saved');
    } catch (caught) {
      setStatus('');
      setError(caught instanceof DomainError ? caught.message : "Couldn't save that project.");
    }
  }

  return (
    <div className="page">
      <p>
        <Link to="/projects">Projects</Link>
      </p>
      <p className="status-line" role="status">
        {status}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <h1 className="sr-only">{draft.name || 'Project'}</h1>
      <label className="field">
        <span className="sr-only">Project name</span>
        <input
          className="title-input"
          aria-label="Project name"
          value={draft.name}
          onChange={(event) => {
            const next = { ...draft, name: event.target.value };
            setStored(next);
            void save(next);
          }}
        />
      </label>
      <label className="field">
        <span>Description</span>
        <textarea
          rows={3}
          value={draft.description}
          onChange={(event) => {
            const next = { ...draft, description: event.target.value };
            setStored(next);
            void save(next);
          }}
        />
      </label>
      <p className="meta">
        {summary.open} open · {summary.complete} complete · {summary.notes} notes
        {project.archivedAt ? ' · Archived' : ''}
      </p>
      <section className="section">
        <h2>Tasks</h2>
        <TaskList
          tasks={tasks}
          projects={snapshot.projects}
          timeFormat={snapshot.settings.timeFormat}
          onToggle={(task, completed) => void setTaskCompleted(task.id, completed)}
          empty="No open tasks in this project."
        />
      </section>
      <section className="section">
        <h2>Notes</h2>
        {notes.length === 0 ? <p className="quiet">No notes in this project.</p> : null}
        <ul className="plain-list">
          {notes.map((note) => (
            <li key={note.id}>
              <Link to={`/notes/${note.id}`}>{note.title.trim() || 'Untitled'}</Link>
            </li>
          ))}
        </ul>
      </section>
      <div className="button-row">
        <button type="button" className="button button--quiet" onClick={() => void setProjectArchived(project.id, !project.archivedAt)}>
          {project.archivedAt ? 'Restore project' : 'Archive project'}
        </button>
        <button type="button" className="button button--ghost" onClick={() => setRemoveOpen(true)}>
          Delete project
        </button>
      </div>
      <ConfirmDialog
        open={removeOpen}
        title={`Delete ${project.name}?`}
        body="Tasks and notes stay on this device unless you choose to remove them too."
        confirmLabel="Delete project"
        onClose={() => setRemoveOpen(false)}
        onConfirm={() => {
          void deleteProject(project.id, deleteAssociated ? 'delete-associated' : 'unlink').then(() => navigate('/projects'));
        }}
      >
        <label className="choice">
          <input type="checkbox" checked={deleteAssociated} onChange={(event) => setDeleteAssociated(event.target.checked)} />
          <span>Also remove tasks and notes in this project</span>
        </label>
      </ConfirmDialog>
    </div>
  );
}
