import { describe, expect, it } from 'vitest';
import { filterTasks, isOverdue, selectNextAction } from './tasks';
import type { Task } from './types';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: overrides.id ?? 'task-1',
    title: overrides.title ?? 'Write',
    description: '',
    dueDate: overrides.dueDate ?? null,
    dueTime: overrides.dueTime ?? null,
    priority: overrides.priority ?? 'none',
    projectId: null,
    parentId: overrides.parentId ?? null,
    completedAt: overrides.completedAt ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
    deletedAt: overrides.deletedAt ?? null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };
}

const now = new Date(2026, 9, 18, 15, 0);

describe('task selection', () => {
  it('treats earlier days as waiting and keeps earlier today on today', () => {
    const earlierToday = task({ id: 'today', dueDate: '2026-10-18', dueTime: '09:00' });
    const yesterday = task({ id: 'yesterday', dueDate: '2026-10-17', dueTime: '09:00' });
    expect(isOverdue(earlierToday, now)).toBe(false);
    expect(isOverdue(yesterday, now)).toBe(true);
    expect(isOverdue(task({ completedAt: '2026-10-17T00:00:00.000Z', dueDate: '2026-10-17' }), now)).toBe(false);
    expect(filterTasks([earlierToday, yesterday], 'today', now).map((item) => item.id)).toEqual(['today']);
  });

  it('chooses the next timed task today before unscheduled work', () => {
    const later = task({ id: 'later', dueDate: '2026-10-18', dueTime: '16:00', priority: 'low' });
    const earlier = task({ id: 'earlier', dueDate: '2026-10-18', dueTime: '09:00', priority: 'high' });
    const loose = task({ id: 'loose', priority: 'high' });
    expect(selectNextAction([loose, earlier, later], now)?.id).toBe('later');
  });

  it('uses a pinned open task when one is chosen', () => {
    const pinned = task({ id: 'pinned', title: 'Pinned' });
    const today = task({ id: 'today', dueDate: '2026-10-18', dueTime: '16:00' });
    expect(selectNextAction([pinned, today], now, 'pinned')?.id).toBe('pinned');
  });
});
