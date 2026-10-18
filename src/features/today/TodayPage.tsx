import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TaskList } from '../../components/TaskList';
import { dateKey } from '../../domain/dates';
import { formatFullDate, formatSchedule } from '../../domain/format';
import { filterTasks, isOpenTask, selectNextAction, unscheduledPriorities, upcomingTasks } from '../../domain/tasks';
import { DomainError } from '../../domain/types';
import { useWorkspace } from '../../state/DataProvider';
import { useUi } from '../../state/UiProvider';
import { TaskCreateDialog } from '../tasks/TaskCreateDialog';

export function TodayPage() {
  const { snapshot, addInbox, setTaskCompleted } = useWorkspace();
  const { announce } = useUi();
  const [capture, setCapture] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [creating, setCreating] = useState(false);
  const now = new Date();
  const today = dateKey(now);
  const todayTasks = filterTasks(snapshot.tasks, 'today', now);
  const later = upcomingTasks(snapshot.tasks, now);
  const loose = unscheduledPriorities(snapshot.tasks);
  const overdue = filterTasks(snapshot.tasks, 'overdue', now);
  const next = selectNextAction(snapshot.tasks, now, snapshot.settings.focusTaskId);
  const hasAnything =
    snapshot.tasks.some((task) => !task.deletedAt) ||
    snapshot.notes.some((note) => !note.deletedAt) ||
    snapshot.projects.length > 0 ||
    snapshot.inbox.some((item) => item.status === 'open');

  async function onCapture(event: React.FormEvent) {
    event.preventDefault();
    if (!capture.trim()) {
      setCaptureError('Write something to capture.');
      return;
    }
    try {
      await addInbox(capture);
      setCapture('');
      setCaptureError('');
      announce('Captured');
    } catch (error) {
      setCaptureError(error instanceof DomainError ? error.message : "Couldn't save that capture.");
    }
  }

  const openCount = snapshot.tasks.filter(isOpenTask).length;
  const lede = hasAnything
    ? `${todayTasks.length} due today · ${openCount} open`
    : 'A quiet place for what you need to remember.';

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{formatFullDate(today, now)}</h1>
          <p className="lede">{lede}</p>
        </div>
        <button type="button" className="button button--quiet" onClick={() => setCreating(true)}>
          Add a task
        </button>
      </header>
      <form className="capture-row" aria-label="Quick capture" onSubmit={onCapture}>
        <label className="sr-only" htmlFor="quick-capture">
          Capture a thought
        </label>
        <input
          id="quick-capture"
          type="text"
          value={capture}
          placeholder="Capture a thought"
          autoComplete="off"
          onChange={(event) => setCapture(event.target.value)}
        />
        <button type="submit" className="button button--primary">
          Add
        </button>
      </form>
      {captureError ? (
        <p className="form-error" role="alert">
          {captureError}
        </p>
      ) : null}
      {!hasAnything ? (
        <div className="welcome">
          <p className="tagline">Less chaos. More you.</p>
          <p className="quiet">Capture a thought or add one task. You can organize it later.</p>
        </div>
      ) : (
        <>
          {overdue.length > 0 ? (
            <p className="quiet-link">
              <Link to="/recover">
                {overdue.length === 1
                  ? '1 task from an earlier day is waiting.'
                  : `${overdue.length} tasks from earlier days are waiting.`}
              </Link>
            </p>
          ) : null}
          {next ? (
            <section className="section" aria-labelledby="next-heading">
              <h2 id="next-heading">Next</h2>
              <p>
                <Link to={`/focus/${next.id}`}>{next.title}</Link>
              </p>
              <p className="meta">
                {formatSchedule(next.dueDate, next.dueTime, snapshot.settings.timeFormat, now) || 'Whenever you have a moment'}
              </p>
            </section>
          ) : null}
          <section className="section" aria-labelledby="today-heading">
            <h2 id="today-heading">Today</h2>
            <TaskList
              tasks={todayTasks}
              projects={snapshot.projects}
              timeFormat={snapshot.settings.timeFormat}
              onToggle={(task, completed) => void setTaskCompleted(task.id, completed)}
              empty="Nothing due today."
            />
          </section>
          {later.length > 0 ? (
            <section className="section" aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading">Coming up</h2>
              <TaskList
                tasks={later}
                projects={snapshot.projects}
                timeFormat={snapshot.settings.timeFormat}
                onToggle={(task, completed) => void setTaskCompleted(task.id, completed)}
              />
            </section>
          ) : null}
          {loose.length > 0 ? (
            <section className="section" aria-labelledby="loose-heading">
              <h2 id="loose-heading">When you have time</h2>
              <TaskList
                tasks={loose}
                projects={snapshot.projects}
                timeFormat={snapshot.settings.timeFormat}
                onToggle={(task, completed) => void setTaskCompleted(task.id, completed)}
              />
            </section>
          ) : null}
        </>
      )}
      <TaskCreateDialog open={creating} onClose={() => setCreating(false)} initialDate={today} />
    </div>
  );
}
