import { describe, expect, it } from 'vitest';
import { searchContent } from './search';
import { createDefaultSettings } from './settings';
import type { Snapshot } from './types';

const snapshot: Snapshot = {
  tasks: [
    {
      id: 't1',
      title: 'Replace filters',
      description: 'Kitchen tap',
      dueDate: null,
      dueTime: null,
      priority: 'none',
      projectId: null,
      parentId: null,
      completedAt: null,
      cancelledAt: null,
      deletedAt: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  notes: [
    {
      id: 'n1',
      title: 'Ideas',
      content: 'A quiet filter for the morning list',
      projectId: null,
      deletedAt: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  projects: [],
  inbox: [
    {
      id: 'i1',
      text: 'Call the clinic',
      status: 'open',
      sourceTaskId: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
  ],
  settings: createDefaultSettings(new Date('2026-10-18T12:00:00.000Z')),
};

describe('search', () => {
  it('returns real matches across tasks, notes, and inbox', () => {
    expect(searchContent(snapshot, 'filter').map((result) => result.type)).toEqual(['task', 'note']);
    expect(searchContent(snapshot, 'clinic')[0]?.href).toBe('/inbox');
    expect(searchContent(snapshot, '   ')).toEqual([]);
  });
});
