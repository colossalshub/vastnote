import { describe, expect, it } from 'vitest';
import { tasksToNotify } from './notifications';
import type { Task } from './types';

const task: Task = {
  id: 'task-1',
  title: 'Call',
  description: '',
  dueDate: '2026-10-18',
  dueTime: '15:04',
  priority: 'none',
  projectId: null,
  parentId: null,
  completedAt: null,
  cancelledAt: null,
  deletedAt: null,
  createdAt: '2026-10-18T12:00:00.000Z',
  updatedAt: '2026-10-18T12:00:00.000Z',
};

describe('reminders', () => {
  it('selects a timed task only at its minute and only once', () => {
    const now = new Date(2026, 9, 18, 15, 4);
    expect(tasksToNotify([task], now, new Set())).toHaveLength(1);
    expect(tasksToNotify([task], new Date(2026, 9, 18, 15, 5), new Set())).toHaveLength(0);
    expect(tasksToNotify([{ ...task, completedAt: now.toISOString() }], now, new Set())).toHaveLength(0);
    expect(tasksToNotify([task], now, new Set(['task-1:2026-10-18:15:04']))).toHaveLength(0);
    expect(tasksToNotify([{ ...task, dueTime: null }], now, new Set())).toHaveLength(0);
  });
});
