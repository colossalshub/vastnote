import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TaskList } from '../../components/TaskList';
import { addDays, dateKey, isValidDateKey, weekDates } from '../../domain/dates';
import { formatFullDate, formatShortDate, formatTime, formatWeekday } from '../../domain/format';
import { isOpenTask } from '../../domain/tasks';
import type { Task } from '../../domain/types';
import { useWorkspace } from '../../state/DataProvider';
import { TaskCreateDialog } from '../tasks/TaskCreateDialog';

type CalendarView = 'day' | 'agenda' | 'week';

function parseView(value: string | null): CalendarView {
  if (value === 'day' || value === 'agenda' || value === 'week') return value;
  return 'week';
}

export function CalendarPage() {
  const { snapshot, setTaskCompleted } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const today = dateKey();
  const requestedDate = params.get('date');
  const selected = requestedDate && isValidDateKey(requestedDate) ? requestedDate : today;
  const view = parseView(params.get('view'));
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const step = view === 'week' ? 7 : view === 'agenda' ? 14 : 1;

  function setDate(next: string, nextView = view) {
    const updated = new URLSearchParams(params);
    updated.set('date', next);
    updated.set('view', nextView);
    setParams(updated, { replace: true });
  }

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of snapshot.tasks) {
      if (!isOpenTask(task) || !task.dueDate) continue;
      const list = map.get(task.dueDate) ?? [];
      list.push(task);
      map.set(task.dueDate, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99') || a.title.localeCompare(b.title));
    }
    return map;
  }, [snapshot.tasks]);

  const heading =
    view === 'week'
      ? `${formatShortDate(weekDates(selected, snapshot.settings.weekStartsOn)[0])} – ${formatShortDate(weekDates(selected, snapshot.settings.weekStartsOn)[6])}`
      : view === 'agenda'
        ? `From ${formatShortDate(selected)}`
        : formatFullDate(selected);

  const days = view === 'week' ? weekDates(selected, snapshot.settings.weekStartsOn) : [selected];

  return (
    <div className="page page--wide">
      <header className="page-header">
        <div>
          <h1>Calendar</h1>
          <p className="lede">A practical view of what is scheduled.</p>
        </div>
        <button type="button" className="button button--primary" onClick={() => setCreatingFor(selected)}>
          Add to this day
        </button>
      </header>
      <div className="calendar-toolbar">
        <div className="tabs" role="tablist" aria-label="Calendar view">
          {(['day', 'agenda', 'week'] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={view === item} onClick={() => setDate(selected, item)}>
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <div className="button-row">
          <button type="button" className="button button--quiet" aria-label="Previous" onClick={() => setDate(addDays(selected, -step))}>
            Previous
          </button>
          <button type="button" className="button button--quiet" onClick={() => setDate(today)}>
            Today
          </button>
          <button type="button" className="button button--quiet" aria-label="Next" onClick={() => setDate(addDays(selected, step))}>
            Next
          </button>
        </div>
      </div>
      <h2 className="date-heading">{heading}</h2>
      {view === 'agenda' ? (
        <Agenda start={selected} tasksByDate={tasksByDate} timeFormat={snapshot.settings.timeFormat} />
      ) : view === 'day' ? (
        <DaySchedule
          date={selected}
          tasks={tasksByDate.get(selected) ?? []}
          timeFormat={snapshot.settings.timeFormat}
          onToggle={(task, completed) => void setTaskCompleted(task.id, completed)}
          projects={snapshot.projects}
          onAdd={() => setCreatingFor(selected)}
        />
      ) : (
        <div className="week-grid">
          {days.map((day) => {
            const items = tasksByDate.get(day) ?? [];
            return (
              <section key={day} className={day === today ? 'week-day is-today' : 'week-day'} aria-label={formatFullDate(day)}>
                <header>
                  <div>
                    <span className="meta">{formatWeekday(day)}</span>
                    <strong> {day.slice(-2).replace(/^0/, '')}</strong>
                  </div>
                  <button type="button" className="button button--ghost" aria-label={`Add task on ${formatShortDate(day)}`} onClick={() => setCreatingFor(day)}>
                    Add
                  </button>
                </header>
                {items.length === 0 ? <p className="quiet">Clear</p> : null}
                {items.map((task) => (
                  <Link key={task.id} className="mini-task" to={`/tasks/${task.id}`}>
                    {task.dueTime ? <span className="meta">{formatTime(task.dueTime, snapshot.settings.timeFormat)}</span> : null}
                    <span>{task.title}</span>
                  </Link>
                ))}
              </section>
            );
          })}
        </div>
      )}
      <TaskCreateDialog open={creatingFor !== null} initialDate={creatingFor} onClose={() => setCreatingFor(null)} />
    </div>
  );
}

function Agenda({
  start,
  tasksByDate,
  timeFormat,
}: {
  start: string;
  tasksByDate: Map<string, Task[]>;
  timeFormat: '12' | '24';
}) {
  const groups = Array.from({ length: 21 }, (_, index) => addDays(start, index))
    .map((day) => ({ day, tasks: tasksByDate.get(day) ?? [] }))
    .filter((group) => group.tasks.length > 0);

  if (groups.length === 0) {
    return (
      <div className="empty">
        <h2>Nothing scheduled ahead</h2>
        <p>Add a date to a task and it will show up here.</p>
      </div>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <section key={group.day} className="agenda-group" aria-label={formatFullDate(group.day)}>
          <h2>{formatFullDate(group.day)}</h2>
          <ul className="plain-list">
            {group.tasks.map((task) => (
              <li key={task.id}>
                <Link to={`/tasks/${task.id}`}>
                  {task.dueTime ? `${formatTime(task.dueTime, timeFormat)} · ` : 'All day · '}
                  {task.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DaySchedule({
  date,
  tasks,
  timeFormat,
  projects,
  onToggle,
  onAdd,
}: {
  date: string;
  tasks: Task[];
  timeFormat: '12' | '24';
  projects: ReturnType<typeof useWorkspace>['snapshot']['projects'];
  onToggle: (task: Task, completed: boolean) => void;
  onAdd: () => void;
}) {
  const allDay = tasks.filter((task) => !task.dueTime);
  const timed = tasks.filter((task) => task.dueTime);
  if (tasks.length === 0) {
    return (
      <div className="empty">
        <h2>Nothing on this day</h2>
        <p>You can leave it open, or add one thing.</p>
        <button type="button" className="button button--primary" onClick={onAdd}>
          Add to {formatShortDate(date)}
        </button>
      </div>
    );
  }
  return (
    <div>
      {allDay.length > 0 ? (
        <section className="day-block">
          <h2>All day</h2>
          <TaskList tasks={allDay} projects={projects} timeFormat={timeFormat} onToggle={onToggle} />
        </section>
      ) : null}
      {timed.length > 0 ? (
        <section className="day-block">
          <h2>Timed</h2>
          <TaskList tasks={timed} projects={projects} timeFormat={timeFormat} onToggle={onToggle} />
        </section>
      ) : null}
    </div>
  );
}
