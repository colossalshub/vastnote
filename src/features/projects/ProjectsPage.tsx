import { useState } from 'react';
import { Link } from 'react-router-dom';
import { projectSummary } from '../../domain/tasks';
import { DomainError } from '../../domain/types';
import { useWorkspace } from '../../state/DataProvider';

export function ProjectsPage() {
  const { snapshot, createProject } = useWorkspace();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const active = snapshot.projects.filter((project) => !project.archivedAt).sort((a, b) => a.name.localeCompare(b.name));
  const archived = snapshot.projects.filter((project) => project.archivedAt);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    try {
      await createProject({ name, description: '' });
      setName('');
      setError('');
    } catch (caught) {
      setError(caught instanceof DomainError ? caught.message : "Couldn't save that project.");
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="lede">Light grouping for related tasks and notes.</p>
        </div>
      </header>
      <form className="capture-row" aria-label="New project" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="project-name">
          Project name
        </label>
        <input id="project-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name a project" />
        <button type="submit" className="button button--primary">
          Create
        </button>
      </form>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {active.length === 0 ? (
        <div className="empty">
          <h2>No projects yet</h2>
          <p>Projects are optional. Use one when a few tasks belong together.</p>
        </div>
      ) : (
        <div className="project-grid">
          {active.map((project) => {
            const summary = projectSummary(snapshot.tasks, snapshot.notes, project.id);
            return (
              <Link key={project.id} className="project-link" to={`/projects/${project.id}`}>
                <strong>{project.name}</strong>
                <span className="meta">
                  {summary.open} open · {summary.complete} complete · {summary.notes} notes
                </span>
              </Link>
            );
          })}
        </div>
      )}
      {archived.length > 0 ? (
        <details className="disclosure" onToggle={(event) => setShowArchived((event.target as HTMLDetailsElement).open)}>
          <summary>Archived ({archived.length})</summary>
          {showArchived
            ? archived.map((project) => (
                <Link key={project.id} className="project-link" to={`/projects/${project.id}`}>
                  {project.name}
                </Link>
              ))
            : null}
        </details>
      ) : null}
    </div>
  );
}
