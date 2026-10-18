import type { Priority, Project, TaskInput } from '../domain/types';

const priorities: { value: Priority; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function TaskFields({
  value,
  projects,
  onChange,
  idPrefix,
}: {
  value: TaskInput;
  projects: Project[];
  onChange: (value: TaskInput) => void;
  idPrefix: string;
}) {
  const choices = projects.filter((project) => !project.archivedAt || project.id === value.projectId);

  return (
    <>
      <label className="field">
        <span>Title</span>
        <input
          type="text"
          value={value.title}
          maxLength={500}
          autoComplete="off"
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
      </label>
      <label className="field">
        <span>Details</span>
        <textarea
          value={value.description}
          rows={4}
          maxLength={20000}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
        />
      </label>
      <div className="capture-row">
        <label className="field grow">
          <span>Date</span>
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={value.dueDate ?? ''}
            onChange={(event) =>
              onChange({
                ...value,
                dueDate: event.target.value || null,
                dueTime: event.target.value ? value.dueTime : null,
              })
            }
          />
        </label>
        <label className="field grow">
          <span>Time</span>
          <input
            type="time"
            value={value.dueTime ?? ''}
            disabled={!value.dueDate}
            onChange={(event) => onChange({ ...value, dueTime: event.target.value || null })}
          />
        </label>
      </div>
      <fieldset className="fieldset">
        <legend>Priority</legend>
        <div className="segmented" role="radiogroup" aria-label="Priority">
          {priorities.map((priority) => (
            <label key={priority.value}>
              <input
                type="radio"
                name={`${idPrefix}-priority`}
                value={priority.value}
                checked={value.priority === priority.value}
                onChange={() => onChange({ ...value, priority: priority.value })}
              />
              <span>{priority.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Project</span>
        <select
          value={value.projectId ?? ''}
          onChange={(event) => onChange({ ...value, projectId: event.target.value || null })}
        >
          <option value="">No project</option>
          {choices.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
              {project.archivedAt ? ' (archived)' : ''}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export function ScheduleDialogFields({
  date,
  time,
  onDate,
  onTime,
}: {
  date: string;
  time: string;
  onDate: (value: string) => void;
  onTime: (value: string) => void;
}) {
  return (
    <div className="capture-row">
      <label className="field grow">
        <span>Date</span>
        <input type="date" value={date} onChange={(event) => onDate(event.target.value)} />
      </label>
      <label className="field grow">
        <span>Time</span>
        <input type="time" value={time} disabled={!date} onChange={(event) => onTime(event.target.value)} />
      </label>
    </div>
  );
}
