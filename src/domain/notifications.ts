import { dateKey, timeKey } from './dates';
import type { Task } from './types';

export function notificationKey(task: Pick<Task, 'id' | 'dueDate' | 'dueTime'>): string | null {
  if (!task.dueDate || !task.dueTime) return null;
  return `${task.id}:${task.dueDate}:${task.dueTime}`;
}

export function tasksToNotify(tasks: Task[], now: Date, already: ReadonlySet<string>): Task[] {
  const today = dateKey(now);
  const time = timeKey(now);
  return tasks.filter((task) => {
    if (task.deletedAt || task.cancelledAt || task.completedAt) return false;
    if (task.dueDate !== today || task.dueTime !== time) return false;
    const key = notificationKey(task);
    return Boolean(key && !already.has(key));
  });
}
