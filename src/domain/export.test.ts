import { describe, expect, it } from 'vitest';
import { buildExport, validateImport } from './export';
import { createDefaultSettings } from './settings';
import type { Snapshot, Task } from './types';

function task(id = 'task-1'): Task {
  return {
    id,
    title: 'Write',
    description: 'Notes',
    dueDate: '2026-10-18',
    dueTime: '15:00',
    priority: 'high',
    projectId: null,
    parentId: null,
    completedAt: null,
    cancelledAt: null,
    deletedAt: null,
    createdAt: '2026-10-18T12:00:00.000Z',
    updatedAt: '2026-10-18T12:00:00.000Z',
  };
}

function snapshot(): Snapshot {
  return {
    tasks: [task()],
    notes: [],
    projects: [],
    inbox: [],
    settings: createDefaultSettings(new Date('2026-10-18T12:00:00.000Z')),
  };
}

describe('export validation', () => {
  it('round-trips a snapshot', () => {
    const file = buildExport(snapshot(), '2026-10-18T12:00:00.000Z');
    const parsed = validateImport(JSON.parse(JSON.stringify(file)));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.file.data.tasks[0]?.title).toBe('Write');
  });

  it('rejects malformed or incompatible files without accepting partial data', () => {
    expect(validateImport(null).ok).toBe(false);
    expect(validateImport({ format: 'other', version: 1 }).ok).toBe(false);
    expect(validateImport({ format: 'vastnote', version: 2, exportedAt: '2026-10-18T12:00:00.000Z', data: {} }).ok).toBe(false);
    const file = buildExport(snapshot());
    const broken = structuredClone(file) as { data: { tasks: { dueDate: string }[] } };
    broken.data.tasks[0].dueDate = '2026-02-31';
    const result = validateImport(broken);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/date/i);
  });

  it('clears a step whose parent is missing', () => {
    const file = buildExport(snapshot());
    file.data.tasks[0].parentId = 'missing-parent';
    const result = validateImport(file);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.file.data.tasks[0]?.parentId).toBeNull();
  });
});
