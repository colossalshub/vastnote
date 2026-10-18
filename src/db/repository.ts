import { isValidDateKey, isValidTime } from '../domain/dates';
import { buildExport, repairMergedParents, validateImport, type VastnoteFile } from '../domain/export';
import { createDefaultSettings } from '../domain/settings';
import { LIMITS, DomainError, type ImportMode, type InboxItem, type Note, type Project, type Settings, type Snapshot, type Task, type TaskInput } from '../domain/types';
import type { VastnoteDB } from './database';

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): string {
  return crypto.randomUUID();
}

function assertTitle(title: string, label = 'title'): string {
  const trimmed = title.trim();
  if (!trimmed) throw new DomainError(`Add a ${label} before saving.`);
  if (trimmed.length > LIMITS.title) throw new DomainError('That title is too long.');
  return trimmed;
}

function assertSchedule(dueDate: string | null, dueTime: string | null): void {
  if (dueDate && !isValidDateKey(dueDate)) throw new DomainError('Choose a real date.');
  if (dueTime && !isValidTime(dueTime)) throw new DomainError('Choose a real time.');
  if (dueTime && !dueDate) throw new DomainError('Add a date before setting a time.');
}

function assertText(value: string, max: number, emptyMessage: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new DomainError(emptyMessage);
  if (trimmed.length > max) throw new DomainError('That is too long to save.');
  return trimmed;
}

export function createRepository(db: VastnoteDB) {
  let queue: Promise<unknown> = Promise.resolve();

  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const next = queue.then(work, work);
    queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  async function readAll(): Promise<Snapshot> {
    let settings = await db.settings.get('app');
    if (!settings) {
      settings = createDefaultSettings();
      await db.settings.add(settings);
    }
    const [tasks, notes, projects, inbox] = await Promise.all([
      db.tasks.toArray(),
      db.notes.toArray(),
      db.projects.toArray(),
      db.inbox.toArray(),
    ]);
    return { tasks, notes, projects, inbox, settings };
  }

  async function requireTask(id: string): Promise<Task> {
    const task = await db.tasks.get(id);
    if (!task || task.deletedAt) throw new DomainError('That task is no longer available.');
    return task;
  }

  async function countCollection(table: { count: () => Promise<number> }, label: string): Promise<void> {
    const count = await table.count();
    if (count >= LIMITS.collection) throw new DomainError(`This workspace has too many ${label} to add another.`);
  }

  return {
    loadAll(): Promise<Snapshot> {
      return enqueue(readAll);
    },

    createTask(input: TaskInput): Promise<Task> {
      return enqueue(async () => {
        await countCollection(db.tasks, 'tasks');
        const title = assertTitle(input.title);
        const description = input.description ?? '';
        if (description.length > LIMITS.description) throw new DomainError('That description is too long.');
        assertSchedule(input.dueDate, input.dueTime);
        if (input.projectId) {
          const project = await db.projects.get(input.projectId);
          if (!project) throw new DomainError('That project is no longer available.');
        }
        if (input.parentId) {
          const parent = await db.tasks.get(input.parentId);
          if (!parent || parent.deletedAt || parent.parentId) throw new DomainError('That task cannot hold steps.');
        }
        const stamp = nowIso();
        const task: Task = {
          id: createId(),
          title,
          description,
          dueDate: input.dueDate,
          dueTime: input.dueDate ? input.dueTime : null,
          priority: input.priority,
          projectId: input.projectId,
          parentId: input.parentId ?? null,
          completedAt: null,
          cancelledAt: null,
          deletedAt: null,
          createdAt: stamp,
          updatedAt: stamp,
        };
        await db.tasks.add(task);
        return task;
      });
    },

    updateTask(id: string, input: TaskInput): Promise<Task> {
      return enqueue(async () => {
        const current = await requireTask(id);
        const title = assertTitle(input.title);
        if (input.description.length > LIMITS.description) throw new DomainError('That description is too long.');
        assertSchedule(input.dueDate, input.dueTime);
        if (input.projectId) {
          const project = await db.projects.get(input.projectId);
          if (!project) throw new DomainError('That project is no longer available.');
        }
        const next: Task = {
          ...current,
          title,
          description: input.description,
          dueDate: input.dueDate,
          dueTime: input.dueDate ? input.dueTime : null,
          priority: input.priority,
          projectId: input.projectId,
          updatedAt: nowIso(),
        };
        await db.tasks.put(next);
        return next;
      });
    },

    setTaskCompleted(id: string, completed: boolean): Promise<void> {
      return enqueue(async () => {
        const task = await requireTask(id);
        await db.tasks.update(id, {
          completedAt: completed ? nowIso() : null,
          updatedAt: nowIso(),
          cancelledAt: completed ? null : task.cancelledAt,
        });
      });
    },

    cancelTask(id: string): Promise<void> {
      return enqueue(async () => {
        await requireTask(id);
        await db.tasks.update(id, { cancelledAt: nowIso(), updatedAt: nowIso() });
      });
    },

    restoreTask(id: string): Promise<void> {
      return enqueue(async () => {
        const task = await db.tasks.get(id);
        if (!task) throw new DomainError('That task is no longer available.');
        await db.tasks.update(id, { cancelledAt: null, deletedAt: null, updatedAt: nowIso() });
      });
    },

    softDeleteTask(id: string): Promise<void> {
      return enqueue(async () => {
        const task = await db.tasks.get(id);
        if (!task) throw new DomainError('That task is no longer available.');
        const stamp = nowIso();
        await db.tasks.update(id, { deletedAt: stamp, updatedAt: stamp });
        const settings = await db.settings.get('app');
        if (settings?.focusTaskId === id) {
          await db.settings.update('app', { focusTaskId: null, updatedAt: stamp });
        }
      });
    },

    permanentDeleteTask(id: string): Promise<void> {
      return enqueue(async () => {
        const children = await db.tasks.where('parentId').equals(id).toArray();
        await db.transaction('rw', db.tasks, async () => {
          await db.tasks.delete(id);
          await Promise.all(children.map((child) => db.tasks.delete(child.id)));
        });
      });
    },

    addInbox(text: string, sourceTaskId: string | null = null): Promise<InboxItem> {
      return enqueue(async () => {
        const clean = assertText(text, LIMITS.inbox, 'Write something to capture.');
        const existing = await db.inbox.toArray();
        const latest = existing.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (
          latest &&
          latest.status === 'open' &&
          latest.text === clean &&
          Date.now() - Date.parse(latest.createdAt) < 5000
        ) {
          return latest;
        }
        await countCollection(db.inbox, 'inbox items');
        const stamp = nowIso();
        const item: InboxItem = {
          id: createId(),
          text: clean,
          status: 'open',
          sourceTaskId,
          createdAt: stamp,
          updatedAt: stamp,
        };
        await db.inbox.add(item);
        return item;
      });
    },

    updateInbox(id: string, text: string): Promise<void> {
      return enqueue(async () => {
        const item = await db.inbox.get(id);
        if (!item) throw new DomainError('That capture is no longer available.');
        const clean = assertText(text, LIMITS.inbox, 'Write something to capture.');
        await db.inbox.update(id, { text: clean, updatedAt: nowIso() });
      });
    },

    setInboxStatus(id: string, status: InboxItem['status']): Promise<void> {
      return enqueue(async () => {
        const item = await db.inbox.get(id);
        if (!item) throw new DomainError('That capture is no longer available.');
        await db.inbox.update(id, { status, updatedAt: nowIso() });
      });
    },

    createNote(input: { title: string; content: string; projectId: string | null }): Promise<Note> {
      return enqueue(async () => {
        await countCollection(db.notes, 'notes');
        if (input.title.length > LIMITS.title) throw new DomainError('That title is too long.');
        if (input.content.length > LIMITS.note) throw new DomainError('That note is too long.');
        if (input.projectId && !(await db.projects.get(input.projectId))) {
          throw new DomainError('That project is no longer available.');
        }
        const stamp = nowIso();
        const note: Note = {
          id: createId(),
          title: input.title.trim(),
          content: input.content,
          projectId: input.projectId,
          deletedAt: null,
          createdAt: stamp,
          updatedAt: stamp,
        };
        await db.notes.add(note);
        return note;
      });
    },

    updateNote(id: string, input: { title: string; content: string; projectId: string | null }): Promise<void> {
      return enqueue(async () => {
        const note = await db.notes.get(id);
        if (!note || note.deletedAt) throw new DomainError('That note is no longer available.');
        if (input.title.length > LIMITS.title) throw new DomainError('That title is too long.');
        if (input.content.length > LIMITS.note) throw new DomainError('That note is too long.');
        if (input.projectId && !(await db.projects.get(input.projectId))) {
          throw new DomainError('That project is no longer available.');
        }
        await db.notes.update(id, {
          title: input.title.trim(),
          content: input.content,
          projectId: input.projectId,
          updatedAt: nowIso(),
        });
      });
    },

    softDeleteNote(id: string): Promise<void> {
      return enqueue(async () => {
        const note = await db.notes.get(id);
        if (!note) throw new DomainError('That note is no longer available.');
        await db.notes.update(id, { deletedAt: nowIso(), updatedAt: nowIso() });
      });
    },

    restoreNote(id: string): Promise<void> {
      return enqueue(async () => {
        const note = await db.notes.get(id);
        if (!note) throw new DomainError('That note is no longer available.');
        await db.notes.update(id, { deletedAt: null, updatedAt: nowIso() });
      });
    },

    permanentDeleteNote(id: string): Promise<void> {
      return enqueue(async () => {
        await db.notes.delete(id);
      });
    },

    createProject(input: { name: string; description: string }): Promise<Project> {
      return enqueue(async () => {
        await countCollection(db.projects, 'projects');
        const name = assertText(input.name, LIMITS.projectName, 'Name the project before saving.');
        if (input.description.length > LIMITS.projectDescription) throw new DomainError('That description is too long.');
        const stamp = nowIso();
        const project: Project = {
          id: createId(),
          name,
          description: input.description.trim(),
          archivedAt: null,
          createdAt: stamp,
          updatedAt: stamp,
        };
        await db.projects.add(project);
        return project;
      });
    },

    updateProject(id: string, input: { name: string; description: string }): Promise<void> {
      return enqueue(async () => {
        const project = await db.projects.get(id);
        if (!project) throw new DomainError('That project is no longer available.');
        const name = assertText(input.name, LIMITS.projectName, 'Name the project before saving.');
        if (input.description.length > LIMITS.projectDescription) throw new DomainError('That description is too long.');
        await db.projects.update(id, { name, description: input.description.trim(), updatedAt: nowIso() });
      });
    },

    setProjectArchived(id: string, archived: boolean): Promise<void> {
      return enqueue(async () => {
        const project = await db.projects.get(id);
        if (!project) throw new DomainError('That project is no longer available.');
        await db.projects.update(id, { archivedAt: archived ? nowIso() : null, updatedAt: nowIso() });
      });
    },

    deleteProject(id: string, mode: 'unlink' | 'delete-associated'): Promise<void> {
      return enqueue(async () => {
        const project = await db.projects.get(id);
        if (!project) throw new DomainError('That project is no longer available.');
        const stamp = nowIso();
        await db.transaction('rw', [db.tasks, db.notes, db.projects, db.settings], async () => {
          const tasks = await db.tasks.where('projectId').equals(id).toArray();
          const notes = await db.notes.where('projectId').equals(id).toArray();
          if (mode === 'unlink') {
            await Promise.all(tasks.map((task) => db.tasks.update(task.id, { projectId: null, updatedAt: stamp })));
            await Promise.all(notes.map((note) => db.notes.update(note.id, { projectId: null, updatedAt: stamp })));
          } else {
            await Promise.all(tasks.map((task) => db.tasks.update(task.id, { deletedAt: stamp, updatedAt: stamp })));
            await Promise.all(notes.map((note) => db.notes.update(note.id, { deletedAt: stamp, updatedAt: stamp })));
          }
          await db.projects.delete(id);
        });
      });
    },

    updateSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
      return enqueue(async () => {
        const current = (await db.settings.get('app')) ?? createDefaultSettings();
        const next: Settings = {
          ...current,
          ...patch,
          id: 'app',
          updatedAt: nowIso(),
        };
        await db.settings.put(next);
        return next;
      });
    },

    exportData(): Promise<VastnoteFile> {
      return enqueue(async () => buildExport(await readAll()));
    },

    importData(input: unknown, mode: ImportMode): Promise<void> {
      return enqueue(async () => {
        const result = validateImport(input);
        if (!result.ok) throw new DomainError(result.error);
        const data = result.file.data;
        await db.transaction('rw', [db.tasks, db.notes, db.projects, db.inbox, db.settings], async () => {
          if (mode === 'replace') {
            await Promise.all([db.tasks.clear(), db.notes.clear(), db.projects.clear(), db.inbox.clear(), db.settings.clear()]);
            await db.tasks.bulkAdd(data.tasks);
            await db.notes.bulkAdd(data.notes);
            await db.projects.bulkAdd(data.projects);
            await db.inbox.bulkAdd(data.inbox);
            await db.settings.add(data.settings);
            return;
          }
          await db.tasks.bulkPut(data.tasks);
          await db.notes.bulkPut(data.notes);
          await db.projects.bulkPut(data.projects);
          await db.inbox.bulkPut(data.inbox);
          const stored = await db.tasks.toArray();
          const repaired = repairMergedParents(stored);
          await Promise.all(
            repaired
              .filter((task) => stored.find((item) => item.id === task.id)?.parentId !== task.parentId)
              .map((task) => db.tasks.update(task.id, { parentId: task.parentId })),
          );
          const focusExists = !data.settings.focusTaskId || (await db.tasks.get(data.settings.focusTaskId));
          await db.settings.put({
            ...data.settings,
            id: 'app',
            focusTaskId: focusExists ? data.settings.focusTaskId : null,
          });
        });
      });
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;
