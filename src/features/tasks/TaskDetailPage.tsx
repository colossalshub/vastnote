import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/Dialog';
import { TaskFields } from '../../components/TaskFields';
import { toTaskInput } from '../../domain/tasks';
import { DomainError, type TaskInput } from '../../domain/types';
import { useWorkspace } from '../../state/DataProvider';
import { useUi } from '../../state/UiProvider';

export function TaskDetailPage() {
  const { taskId = '' } = useParams();
  const navigate = useNavigate();
  const { snapshot, updateTask, setTaskCompleted, softDeleteTask, createTask, updateSettings } = useWorkspace();
  const { announce } = useUi();
  const task = snapshot.tasks.find((item) => item.id === taskId);
  const [stored, setStored] = useState<{ id: string; draft: TaskInput } | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState('');

  if (!task || task.deletedAt) {
    return (
      <div className="page">
        <h1>Task not available</h1>
        <p className="quiet">It may have been removed.</p>
        <Link to="/tasks">Back to tasks</Link>
      </div>
    );
  }

  if (!stored || stored.id !== task.id) {
    setStored({ id: task.id, draft: toTaskInput(task) });
  }
  const draft = stored && stored.id === task.id ? stored.draft : toTaskInput(task);
  const steps = snapshot.tasks.filter((item) => item.parentId === task.id && !item.deletedAt && !item.cancelledAt);

  async function save(next: TaskInput) {
    if (!next.title.trim()) {
      setError('Add a title to keep this task.');
      setStatus('');
      return;
    }
    setStatus('Saving…');
    try {
      await updateTask(task!.id, next);
      setError('');
      setStatus('Saved');
    } catch (caught) {
      setStatus('');
      setError(caught instanceof DomainError ? caught.message : "Couldn't save that change.");
    }
  }

  function updateDraft(next: TaskInput) {
    setStored({ id: task!.id, draft: next });
    void save(next);
  }

  return (
    <div className="page">
      <p>
        <Link to="/tasks">Tasks</Link>
      </p>
      <header className="page-header">
        <h1>{task.title}</h1>
        <div className="header-actions">
          <button type="button" className="button button--quiet" onClick={() => void setTaskCompleted(task.id, !task.completedAt)}>
            {task.completedAt ? 'Reopen' : 'Mark complete'}
          </button>
          <button
            type="button"
            className="button button--quiet"
            onClick={() => {
              void updateSettings({ focusTaskId: task.id });
              navigate(`/focus/${task.id}`);
            }}
          >
            Focus
          </button>
        </div>
      </header>
      <p className="status-line" role="status">
        {status}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <TaskFields idPrefix={task.id} value={draft} projects={snapshot.projects} onChange={updateDraft} />
      <section className="section" aria-labelledby="steps-heading">
        <h2 id="steps-heading">Steps</h2>
        {steps.length === 0 ? <p className="quiet">Break this into steps only if that helps.</p> : null}
        <ul className="task-list">
          {steps.map((item) => (
            <li key={item.id} className={item.completedAt ? 'task-row is-done' : 'task-row'}>
              <label className="task-check">
                <input
                  type="checkbox"
                  checked={Boolean(item.completedAt)}
                  aria-label={`${item.completedAt ? 'Reopen' : 'Complete'} ${item.title}`}
                  onChange={(event) => void setTaskCompleted(item.id, event.target.checked)}
                />
              </label>
              <div className="task-body">
                <span className="task-title">{item.title}</span>
              </div>
            </li>
          ))}
        </ul>
        <form
          className="capture-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!step.trim()) return;
            void createTask({
              title: step,
              description: '',
              dueDate: null,
              dueTime: null,
              priority: 'none',
              projectId: task.projectId,
              parentId: task.id,
            }).then(() => {
              setStep('');
              announce('Step added');
            });
          }}
        >
          <label className="sr-only" htmlFor="new-step">
            New step
          </label>
          <input id="new-step" value={step} onChange={(event) => setStep(event.target.value)} placeholder="Add a step" />
          <button type="submit" className="button button--quiet">
            Add step
          </button>
        </form>
      </section>
      <div className="button-row">
        <button type="button" className="button button--ghost" onClick={() => setConfirming(true)}>
          Remove task
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Remove this task?"
        body="You can restore it later from Removed on the Tasks page."
        confirmLabel="Remove"
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          void softDeleteTask(task.id).then(() => navigate('/tasks'));
        }}
      />
    </div>
  );
}
