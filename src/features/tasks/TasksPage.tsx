import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/Dialog';
import { TaskList } from '../../components/TaskList';
import { filterTasks, parseTaskFilter, type TaskFilter } from '../../domain/tasks';
import { useWorkspace } from '../../state/DataProvider';
import { TaskCreateDialog } from './TaskCreateDialog';

const filters: { id: TaskFilter; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Earlier' },
  { id: 'unscheduled', label: 'Unscheduled' },
  { id: 'completed', label: 'Completed' },
];

export function TasksPage() {
  const { snapshot, setTaskCompleted, restoreTask, permanentDeleteTask } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const filter = parseTaskFilter(params.get('filter'));
  const [creating, setCreating] = useState(params.get('new') === '1');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const tasks = filterTasks(snapshot.tasks, filter);
  const removed = snapshot.tasks.filter((task) => task.deletedAt && !task.parentId);

  function selectFilter(next: TaskFilter) {
    const updated = new URLSearchParams(params);
    if (next === 'open') updated.delete('filter');
    else updated.set('filter', next);
    updated.delete('new');
    setParams(updated, { replace: true });
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="lede">What you intend to do, without the extra machinery.</p>
        </div>
        <button type="button" className="button button--primary" onClick={() => setCreating(true)}>
          New task
        </button>
      </header>
      <div className="tabs" role="tablist" aria-label="Task views">
        {filters.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => selectFilter(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <TaskList
        tasks={tasks}
        projects={snapshot.projects}
        timeFormat={snapshot.settings.timeFormat}
        onToggle={(task, completed) => void setTaskCompleted(task.id, completed)}
        empty={filter === 'open' ? 'No open tasks. Capture something, or add a task when you are ready.' : 'Nothing in this view.'}
      />
      {filter === 'overdue' && tasks.length > 0 ? (
        <p className="quiet">
          These dates have passed. You can reschedule them from the task, or review them in <a href="/recover">Catch up</a>.
        </p>
      ) : null}
      {removed.length > 0 ? (
        <details className="disclosure">
          <summary>Removed ({removed.length})</summary>
          <ul className="plain-list">
            {removed.map((task) => (
              <li key={task.id} className="inbox-card">
                <p>{task.title}</p>
                <div className="button-row">
                  <button type="button" className="button button--quiet" onClick={() => void restoreTask(task.id)}>
                    Restore
                  </button>
                  <button type="button" className="button button--ghost" onClick={() => setPendingDelete(task.id)}>
                    Delete forever
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <TaskCreateDialog open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete forever?"
        body="This removes the task from this device. Export first if you want a copy."
        confirmLabel="Delete forever"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) void permanentDeleteTask(pendingDelete);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
