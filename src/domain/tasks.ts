import { dateKey } from './dates';
import type { Priority, Project, Task, TaskInput } from './types';

const priorityRank: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

export type TaskFilter = 'open' | 'today' | 'upcoming' | 'overdue' | 'unscheduled' | 'completed';

export function isTopLevel(task: Task): boolean {
  return task.parentId === null;
}

export function isDiscarded(task: Task): boolean {
  return Boolean(task.deletedAt || task.cancelledAt);
}

export function isOpenTask(task: Task): boolean {
  return isTopLevel(task) && !task.completedAt && !isDiscarded(task);
}

export function isOverdue(task: Task, now = new Date()): boolean {
  if (!isOpenTask(task) || !task.dueDate) return false;
  return task.dueDate < dateKey(now);
}

export function emptyTaskInput(dueDate: string | null = null): TaskInput {
  return {
    title: '',
    description: '',
    dueDate,
    dueTime: null,
    priority: 'none',
    projectId: null,
    parentId: null,
  };
}

export function toTaskInput(task: Task): TaskInput {
  return {
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    priority: task.priority,
    projectId: task.projectId,
    parentId: task.parentId,
  };
}

export function compareTasks(a: Task, b: Task): number {
  const doneDelta = Number(Boolean(a.completedAt)) - Number(Boolean(b.completedAt));
  if (doneDelta !== 0) return doneDelta;
  const aDate = a.dueDate ?? '9999-99-99';
  const bDate = b.dueDate ?? '9999-99-99';
  if (aDate !== bDate) return aDate < bDate ? -1 : 1;
  const aTime = a.dueTime ?? '99:99';
  const bTime = b.dueTime ?? '99:99';
  if (aTime !== bTime) return aTime < bTime ? -1 : 1;
  const priorityDelta = priorityRank[a.priority] - priorityRank[b.priority];
  if (priorityDelta !== 0) return priorityDelta;
  return a.title.localeCompare(b.title);
}

export function visibleTasks(tasks: Task[]): Task[] {
  return tasks.filter((task) => isTopLevel(task) && !task.deletedAt && !task.cancelledAt);
}

export function filterTasks(tasks: Task[], filter: TaskFilter, now = new Date()): Task[] {
  const today = dateKey(now);
  const visible = visibleTasks(tasks);
  switch (filter) {
    case 'open':
      return visible.filter((task) => !task.completedAt).sort(compareTasks);
    case 'today':
      return visible.filter((task) => !task.completedAt && task.dueDate === today).sort(compareTasks);
    case 'upcoming':
      return visible.filter((task) => !task.completedAt && task.dueDate !== null && task.dueDate > today).sort(compareTasks);
    case 'overdue':
      return visible.filter((task) => isOverdue(task, now)).sort(compareTasks);
    case 'unscheduled':
      return visible.filter((task) => !task.completedAt && !task.dueDate).sort(compareTasks);
    case 'completed':
      return visible
        .filter((task) => task.completedAt)
        .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
  }
}

export function subtasksOf(tasks: Task[], parentId: string): Task[] {
  return tasks
    .filter((task) => task.parentId === parentId && !task.deletedAt && !task.cancelledAt)
    .sort(compareTasks);
}

export function selectNextAction(tasks: Task[], now = new Date(), pinnedId: string | null = null): Task | null {
  if (pinnedId) {
    const pinned = tasks.find((task) => task.id === pinnedId && isOpenTask(task));
    if (pinned) return pinned;
  }
  const open = tasks.filter(isOpenTask);
  const today = dateKey(now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dueToday = open.filter((task) => task.dueDate === today);
  const laterToday = dueToday
    .filter((task) => task.dueTime && task.dueTime >= currentTime)
    .sort(compareTasks);
  if (laterToday[0]) return laterToday[0];
  const anytimeToday = dueToday.filter((task) => !task.dueTime).sort(compareTasks);
  if (anytimeToday[0]) return anytimeToday[0];
  const earlierToday = dueToday.filter((task) => task.dueTime && task.dueTime < currentTime).sort(compareTasks);
  if (earlierToday[0]) return earlierToday[0];
  const future = open.filter((task) => task.dueDate && task.dueDate > today).sort(compareTasks);
  if (future[0]) return future[0];
  const unscheduled = open.filter((task) => !task.dueDate).sort(compareTasks);
  return unscheduled[0] ?? null;
}

export function upcomingTasks(tasks: Task[], now = new Date(), limit = 5): Task[] {
  const today = dateKey(now);
  return tasks
    .filter((task) => isOpenTask(task) && task.dueDate !== null && task.dueDate > today)
    .sort(compareTasks)
    .slice(0, limit);
}

export function unscheduledPriorities(tasks: Task[], limit = 4): Task[] {
  return tasks
    .filter((task) => isOpenTask(task) && !task.dueDate && (task.priority === 'high' || task.priority === 'medium'))
    .sort(compareTasks)
    .slice(0, limit);
}

export function activeProjects(projects: Project[]): Project[] {
  return projects.filter((project) => !project.archivedAt).sort((a, b) => a.name.localeCompare(b.name));
}

export function projectName(projects: Project[], projectId: string | null): string | null {
  if (!projectId) return null;
  return projects.find((project) => project.id === projectId)?.name ?? null;
}

export function projectSummary(tasks: Task[], notes: { projectId: string | null; deletedAt: string | null }[], projectId: string): {
  open: number;
  complete: number;
  notes: number;
} {
  const related = tasks.filter((task) => task.projectId === projectId && isTopLevel(task) && !task.deletedAt && !task.cancelledAt);
  return {
    open: related.filter((task) => !task.completedAt).length,
    complete: related.filter((task) => task.completedAt).length,
    notes: notes.filter((note) => note.projectId === projectId && !note.deletedAt).length,
  };
}

export function parseTaskFilter(value: string | null): TaskFilter {
  if (
    value === 'open' ||
    value === 'today' ||
    value === 'upcoming' ||
    value === 'overdue' ||
    value === 'unscheduled' ||
    value === 'completed'
  ) {
    return value;
  }
  return 'open';
}
