import Dexie, { type Table } from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { buildExport } from '../domain/export';
import { createDatabase } from './database';
import { createRepository } from './repository';

const names: string[] = [];

function repo() {
  const name = `vastnote-test-${crypto.randomUUID()}`;
  names.push(name);
  return createRepository(createDatabase(name));
}

afterEach(async () => {
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)));
});

describe('repository', () => {
  it('persists tasks, notes, inbox, and projects', async () => {
    const db = repo();
    const project = await db.createProject({ name: 'Home', description: 'House' });
    const task = await db.createTask({
      title: 'Replace filters',
      description: 'Under the sink',
      dueDate: '2026-10-18',
      dueTime: '09:30',
      priority: 'high',
      projectId: project.id,
    });
    await db.setTaskCompleted(task.id, true);
    await db.setTaskCompleted(task.id, false);
    const note = await db.createNote({ title: 'Ideas', content: 'Keep it short', projectId: project.id });
    const captured = await db.addInbox('Call the clinic');
    await db.addInbox('Call the clinic');
    const loaded = await db.loadAll();
    expect(loaded.tasks.find((item) => item.id === task.id)?.completedAt).toBeNull();
    expect(loaded.notes).toHaveLength(1);
    expect(loaded.inbox).toHaveLength(1);
    expect(loaded.inbox[0]?.id).toBe(captured.id);
    expect(loaded.projects[0]?.name).toBe('Home');
    expect(note.title).toBe('Ideas');
  });

  it('unlinks related work when a project is deleted', async () => {
    const db = repo();
    const project = await db.createProject({ name: 'Home', description: '' });
    const task = await db.createTask({
      title: 'Paint',
      description: '',
      dueDate: null,
      dueTime: null,
      priority: 'none',
      projectId: project.id,
    });
    const note = await db.createNote({ title: 'Colors', content: 'White', projectId: project.id });
    await db.deleteProject(project.id, 'unlink');
    const loaded = await db.loadAll();
    expect(loaded.projects).toHaveLength(0);
    expect(loaded.tasks.find((item) => item.id === task.id)?.projectId).toBeNull();
    expect(loaded.notes.find((item) => item.id === note.id)?.deletedAt).toBeNull();
  });

  it('replaces and merges imports, and leaves data untouched when validation fails', async () => {
    const db = repo();
    await db.createTask({
      title: 'Keep me',
      description: '',
      dueDate: null,
      dueTime: null,
      priority: 'none',
      projectId: null,
    });
    const before = await db.loadAll();
    await expect(db.importData({ format: 'nope' }, 'replace')).rejects.toThrow(/not a Vastnote export/i);
    expect((await db.loadAll()).tasks.map((task) => task.title)).toEqual(['Keep me']);

    const exported = buildExport(before);
    exported.data.tasks[0].title = 'Updated';
    await db.importData(exported, 'merge');
    expect((await db.loadAll()).tasks.map((task) => task.title)).toEqual(['Updated']);

    const replacement = buildExport(before);
    replacement.data.tasks = [];
    replacement.data.notes = [];
    replacement.data.projects = [];
    replacement.data.inbox = [];
    await db.importData(replacement, 'replace');
    expect(await db.loadAll()).toMatchObject({ tasks: [], notes: [], projects: [], inbox: [] });
  });
});

describe('indexedDB migration', () => {
  it('keeps records written in version 1 when the schema gains an index', async () => {
    const name = `vastnote-migration-${crypto.randomUUID()}`;
    names.push(name);
    class VersionOne extends Dexie {
      tasks!: Table<{ id: string; title: string }, string>;
      constructor() {
        super(name);
        this.version(1).stores({ tasks: 'id' });
      }
    }
    const first = new VersionOne();
    await first.tasks.add({ id: 'task-1', title: 'Still here' });
    first.close();

    class VersionTwo extends Dexie {
      tasks!: Table<{ id: string; title: string; dueDate?: string }, string>;
      constructor() {
        super(name);
        this.version(1).stores({ tasks: 'id' });
        this.version(2)
          .stores({ tasks: 'id, dueDate' })
          .upgrade(() => undefined);
      }
    }
    const second = new VersionTwo();
    await expect(second.tasks.get('task-1')).resolves.toMatchObject({ title: 'Still here' });
    second.close();
  });
});
