import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { dateKey } from '../../domain/dates';
import { formatFullDate, formatSchedule, formatTimer } from '../../domain/format';
import { isOpenTask, selectNextAction } from '../../domain/tasks';
import { useWorkspace } from '../../state/DataProvider';

export function FocusPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { snapshot, setTaskCompleted, updateSettings } = useWorkspace();
  const openTasks = snapshot.tasks.filter(isOpenTask);
  const routed = taskId ? snapshot.tasks.find((task) => task.id === taskId && !task.deletedAt && !task.cancelledAt) : undefined;
  const pinned = snapshot.tasks.find((task) => task.id === snapshot.settings.focusTaskId && isOpenTask(task));
  const task = routed ?? pinned ?? selectNextAction(snapshot.tasks);
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const [ended, setEnded] = useState(false);
  const [showTimer, setShowTimer] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (running && seconds <= 0) {
      setRunning(false);
      setEnded(true);
      setSeconds(0);
    }
  }, [running, seconds]);

  if (!task) {
    return (
      <div className="focus-screen">
        <h1>Nothing to focus on</h1>
        <p className="quiet">Add a task when you know the next step.</p>
        <Link to="/tasks">Go to tasks</Link>
      </div>
    );
  }

  const schedule = formatSchedule(task.dueDate, task.dueTime, snapshot.settings.timeFormat);

  return (
    <div className="focus-screen">
      <p className="kicker">{formatFullDate(dateKey())}</p>
      <p>
        <Link to="/">Exit focus</Link>
      </p>
      <h1>{task.title}</h1>
      {schedule ? <p className="meta">{schedule}</p> : <p className="meta">No set time</p>}
      {task.description ? <p>{task.description}</p> : null}
      {task.completedAt ? <p>This one is done.</p> : null}
      <div className="button-row">
        <button type="button" className="button button--primary" onClick={() => void setTaskCompleted(task.id, !task.completedAt)}>
          {task.completedAt ? 'Reopen' : 'Mark complete'}
        </button>
      </div>
      <label className="field">
        <span>Choose another task</span>
        <select
          value={task.id}
          onChange={(event) => {
            const nextId = event.target.value;
            void updateSettings({ focusTaskId: nextId });
            navigate(`/focus/${nextId}`);
          }}
        >
          {openTasks.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
          {!openTasks.some((item) => item.id === task.id) ? <option value={task.id}>{task.title}</option> : null}
        </select>
      </label>
      {!showTimer ? (
        <button type="button" className="button button--ghost" onClick={() => setShowTimer(true)}>
          Start a timer
        </button>
      ) : (
        <div className="timer">
          <strong aria-live="polite">{formatTimer(seconds)}</strong>
          {ended ? <p>Time’s up. Take a breath, or keep going.</p> : null}
          <div className="button-row">
            <button type="button" className="button button--quiet" onClick={() => setRunning((value) => !value)}>
              {running ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => {
                setRunning(false);
                setEnded(false);
                setSeconds(25 * 60);
              }}
            >
              25 min
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => {
                setRunning(false);
                setEnded(false);
                setSeconds(50 * 60);
              }}
            >
              50 min
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
