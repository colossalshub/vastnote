import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog } from '../../components/Dialog';
import { ScheduleDialogFields } from '../../components/TaskFields';
import { dateKey } from '../../domain/dates';
import { formatShortDate } from '../../domain/format';
import { filterTasks, toTaskInput } from '../../domain/tasks';
import { useWorkspace } from '../../state/DataProvider';
import { useUi } from '../../state/UiProvider';

export function RecoverPage() {
  const { snapshot, updateTask, setTaskCompleted, cancelTask, restoreTask, sendTaskToInbox } = useWorkspace();
  const { announce } = useUi();
  const overdue = filterTasks(snapshot.tasks, 'overdue');
  const released = snapshot.tasks.filter((task) => task.cancelledAt && !task.deletedAt && !task.parentId);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [date, setDate] = useState(dateKey());
  const [time, setTime] = useState('');

  async function moveTo(id: string, dueDate: string, dueTime: string | null) {
    const task = snapshot.tasks.find((item) => item.id === id);
    if (!task) return;
    await updateTask(id, { ...toTaskInput(task), dueDate, dueTime });
    announce('Rescheduled');
    setScheduling(null);
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Catch up</h1>
          <p className="lede">These did not happen yet. Move them, finish them, or let them go.</p>
        </div>
      </header>
      {overdue.length === 0 ? (
        <div className="empty">
          <h2>You’re current</h2>
          <p>Nothing from earlier days is waiting. New work can go on today or in the inbox.</p>
          <Link to="/">Back to today</Link>
        </div>
      ) : (
        <ul className="plain-list">
          {overdue.map((task) => (
            <li key={task.id} className="inbox-card">
              <p>
                <Link to={`/tasks/${task.id}`}>{task.title}</Link>
              </p>
              <p className="meta">Was due {task.dueDate ? formatShortDate(task.dueDate) : 'earlier'}</p>
              <div className="decision-row">
                <button type="button" className="button button--quiet" onClick={() => void moveTo(task.id, dateKey(), task.dueTime)}>
                  Do today
                </button>
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => {
                    setScheduling(task.id);
                    setDate(dateKey());
                    setTime(task.dueTime ?? '');
                  }}
                >
                  Pick a date
                </button>
                <button type="button" className="button button--quiet" onClick={() => void setTaskCompleted(task.id, true)}>
                  Done
                </button>
                <button type="button" className="button button--ghost" onClick={() => void sendTaskToInbox(task.id)}>
                  To inbox
                </button>
                <button type="button" className="button button--ghost" onClick={() => void cancelTask(task.id)}>
                  Let it go
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {released.length > 0 ? (
        <details className="disclosure">
          <summary>Let go ({released.length})</summary>
          <ul className="plain-list">
            {released.map((task) => (
              <li key={task.id} className="inbox-card">
                <p>{task.title}</p>
                <button type="button" className="button button--quiet" onClick={() => void restoreTask(task.id)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <Dialog open={scheduling !== null} title="Pick a date" onClose={() => setScheduling(null)}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (scheduling && date) void moveTo(scheduling, date, time || null);
          }}
        >
          <ScheduleDialogFields date={date} time={time} onDate={setDate} onTime={setTime} />
          <div className="button-row">
            <button type="submit" className="button button--primary">
              Reschedule
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
