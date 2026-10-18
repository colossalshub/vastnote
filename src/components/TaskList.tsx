import { Link } from 'react-router-dom';
import { taskMetaLine } from '../domain/format';
import { projectName } from '../domain/tasks';
import type { Project, Task, TimeFormat } from '../domain/types';

export function TaskList({
  tasks,
  projects,
  timeFormat,
  onToggle,
  empty,
}: {
  tasks: Task[];
  projects: Project[];
  timeFormat: TimeFormat;
  onToggle: (task: Task, completed: boolean) => void;
  empty?: string;
}) {
  if (tasks.length === 0) {
    return empty ? <p className="quiet">{empty}</p> : null;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => {
        const meta = taskMetaLine({
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          priority: task.priority,
          projectName: projectName(projects, task.projectId),
          timeFormat,
        });
        const done = Boolean(task.completedAt);
        return (
          <li key={task.id} className={done ? 'task-row is-done' : 'task-row'}>
            <label className="task-check">
              <input
                type="checkbox"
                checked={done}
                aria-label={`${done ? 'Reopen' : 'Complete'} ${task.title}`}
                onChange={(event) => onToggle(task, event.target.checked)}
              />
            </label>
            <div className="task-body">
              <Link className="task-title" to={`/tasks/${task.id}`}>
                {task.title}
              </Link>
              {meta ? <span className="task-meta">{meta}</span> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
