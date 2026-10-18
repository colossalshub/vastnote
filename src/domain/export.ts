import { isValidDateKey, isValidTime } from './dates';
import { LIMITS } from './types';
import type { InboxItem, Note, Priority, Project, Settings, Snapshot, Task, ThemePreference, TimeFormat } from './types';

export const EXPORT_FORMAT = 'vastnote';
export const EXPORT_VERSION = 1;

export interface VastnoteFile {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  data: {
    tasks: Task[];
    notes: Note[];
    projects: Project[];
    inbox: InboxItem[];
    settings: Settings;
  };
}

export type ImportResult = { ok: true; file: VastnoteFile } | { ok: false; error: string };

const priorities = new Set<Priority>(['none', 'low', 'medium', 'high']);
const themes = new Set<ThemePreference>(['light', 'dark', 'system']);
const times = new Set<TimeFormat>(['12', '24']);
const inboxStatuses = new Set<InboxItem['status']>(['open', 'converted', 'archived']);

function hasDisallowedControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31)) return true;
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(error: string): ImportResult {
  return { ok: false, error };
}

function readString(value: unknown, max: number, field: string): string | ImportResult {
  if (typeof value !== 'string') return fail(`${field} must be text.`);
  if (value.length > max) return fail(`${field} is too long.`);
  if (hasDisallowedControl(value)) return fail(`${field} contains unsupported characters.`);
  return value;
}

function readId(value: unknown, field: string): string | ImportResult {
  const text = readString(value, 80, field);
  if (typeof text !== 'string') return text;
  if (!text || !/^[\w.-]+$/.test(text)) return fail(`${field} is not a valid id.`);
  return text;
}

function readNullableId(value: unknown, field: string): string | null | ImportResult {
  if (value === null) return null;
  return readId(value, field);
}

function readTimestamp(value: unknown, field: string): string | ImportResult {
  const text = readString(value, 40, field);
  if (typeof text !== 'string') return text;
  if (!Number.isFinite(Date.parse(text))) return fail(`${field} is not a valid time.`);
  return text;
}

function readNullableTimestamp(value: unknown, field: string): string | null | ImportResult {
  if (value === null) return null;
  return readTimestamp(value, field);
}

function readDate(value: unknown, field: string): string | null | ImportResult {
  if (value === null) return null;
  const text = readString(value, 10, field);
  if (typeof text !== 'string') return text;
  if (!isValidDateKey(text)) return fail(`${field} must be a real calendar date.`);
  return text;
}

function readTime(value: unknown, field: string): string | null | ImportResult {
  if (value === null) return null;
  const text = readString(value, 5, field);
  if (typeof text !== 'string') return text;
  if (!isValidTime(text)) return fail(`${field} must be a time like 09:30.`);
  return text;
}

function uniqueIds(ids: string[], label: string): ImportResult | null {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return fail(`The file contains two ${label} with the same id.`);
    seen.add(id);
  }
  return null;
}

function readTask(value: unknown, index: number): Task | ImportResult {
  if (!isRecord(value)) return fail(`Task ${index + 1} is not an object.`);
  const field = (name: string) => `Task ${index + 1} ${name}`;
  const id = readId(value.id, field('id'));
  const title = readString(value.title, LIMITS.title, field('title'));
  const description = readString(value.description, LIMITS.description, field('description'));
  const dueDate = readDate(value.dueDate, field('due date'));
  const dueTime = readTime(value.dueTime, field('due time'));
  const projectId = readNullableId(value.projectId, field('project'));
  const parentId = readNullableId(value.parentId, field('parent'));
  const completedAt = readNullableTimestamp(value.completedAt, field('completed time'));
  const cancelledAt = readNullableTimestamp(value.cancelledAt, field('cancelled time'));
  const deletedAt = readNullableTimestamp(value.deletedAt, field('removed time'));
  const createdAt = readTimestamp(value.createdAt, field('created time'));
  const updatedAt = readTimestamp(value.updatedAt, field('updated time'));
  const parts = [id, title, description, dueDate, dueTime, projectId, parentId, completedAt, cancelledAt, deletedAt, createdAt, updatedAt];
  const problem = parts.find((part) => typeof part !== 'string' && part !== null);
  if (problem && typeof problem !== 'string') return problem;
  if (!priorities.has(value.priority as Priority)) return fail(`${field('priority')} is not recognized.`);
  if (dueTime && !dueDate) return fail(`${field('time')} needs a date.`);
  if (!(title as string).trim()) return fail(`${field('title')} is empty.`);
  return {
    id: id as string,
    title: (title as string).trim(),
    description: description as string,
    dueDate: dueDate as string | null,
    dueTime: dueTime as string | null,
    priority: value.priority as Priority,
    projectId: projectId as string | null,
    parentId: parentId as string | null,
    completedAt: completedAt as string | null,
    cancelledAt: cancelledAt as string | null,
    deletedAt: deletedAt as string | null,
    createdAt: createdAt as string,
    updatedAt: updatedAt as string,
  };
}

function readNote(value: unknown, index: number): Note | ImportResult {
  if (!isRecord(value)) return fail(`Note ${index + 1} is not an object.`);
  const field = (name: string) => `Note ${index + 1} ${name}`;
  const id = readId(value.id, field('id'));
  const title = readString(value.title, LIMITS.title, field('title'));
  const content = readString(value.content, LIMITS.note, field('content'));
  const projectId = readNullableId(value.projectId, field('project'));
  const deletedAt = readNullableTimestamp(value.deletedAt, field('removed time'));
  const createdAt = readTimestamp(value.createdAt, field('created time'));
  const updatedAt = readTimestamp(value.updatedAt, field('updated time'));
  const parts = [id, title, content, projectId, deletedAt, createdAt, updatedAt];
  const problem = parts.find((part): part is ImportResult => typeof part !== 'string' && part !== null);
  if (problem) return problem;
  return {
    id: id as string,
    title: title as string,
    content: content as string,
    projectId: projectId as string | null,
    deletedAt: deletedAt as string | null,
    createdAt: createdAt as string,
    updatedAt: updatedAt as string,
  };
}

function readProject(value: unknown, index: number): Project | ImportResult {
  if (!isRecord(value)) return fail(`Project ${index + 1} is not an object.`);
  const field = (name: string) => `Project ${index + 1} ${name}`;
  const id = readId(value.id, field('id'));
  const name = readString(value.name, LIMITS.projectName, field('name'));
  const description = readString(value.description, LIMITS.projectDescription, field('description'));
  const archivedAt = readNullableTimestamp(value.archivedAt, field('archived time'));
  const createdAt = readTimestamp(value.createdAt, field('created time'));
  const updatedAt = readTimestamp(value.updatedAt, field('updated time'));
  const parts = [id, name, description, archivedAt, createdAt, updatedAt];
  const problem = parts.find((part): part is ImportResult => typeof part !== 'string' && part !== null);
  if (problem) return problem;
  if (!(name as string).trim()) return fail(`${field('name')} is empty.`);
  return {
    id: id as string,
    name: (name as string).trim(),
    description: description as string,
    archivedAt: archivedAt as string | null,
    createdAt: createdAt as string,
    updatedAt: updatedAt as string,
  };
}

function readInbox(value: unknown, index: number): InboxItem | ImportResult {
  if (!isRecord(value)) return fail(`Inbox item ${index + 1} is not an object.`);
  const field = (name: string) => `Inbox item ${index + 1} ${name}`;
  const id = readId(value.id, field('id'));
  const text = readString(value.text, LIMITS.inbox, field('text'));
  const sourceTaskId = readNullableId(value.sourceTaskId, field('source'));
  const createdAt = readTimestamp(value.createdAt, field('created time'));
  const updatedAt = readTimestamp(value.updatedAt, field('updated time'));
  const parts = [id, text, sourceTaskId, createdAt, updatedAt];
  const problem = parts.find((part): part is ImportResult => typeof part !== 'string' && part !== null);
  if (problem) return problem;
  if (!inboxStatuses.has(value.status as InboxItem['status'])) return fail(`${field('status')} is not recognized.`);
  if (!(text as string).trim()) return fail(`${field('text')} is empty.`);
  return {
    id: id as string,
    text: (text as string).trim(),
    status: value.status as InboxItem['status'],
    sourceTaskId: sourceTaskId as string | null,
    createdAt: createdAt as string,
    updatedAt: updatedAt as string,
  };
}

function readSettings(value: unknown): Settings | ImportResult {
  if (!isRecord(value)) return fail('Settings are missing.');
  const updatedAt = readTimestamp(value.updatedAt, 'Settings updated time');
  const focusTaskId = readNullableId(value.focusTaskId, 'Focus task');
  if (typeof updatedAt !== 'string') return updatedAt;
  if (typeof focusTaskId !== 'string' && focusTaskId !== null) return focusTaskId;
  if (!themes.has(value.theme as ThemePreference)) return fail('Theme setting is not recognized.');
  if (value.weekStartsOn !== 0 && value.weekStartsOn !== 1) return fail('Week start must be Sunday or Monday.');
  if (!times.has(value.timeFormat as TimeFormat)) return fail('Time format is not recognized.');
  if (typeof value.notificationsEnabled !== 'boolean') return fail('Notification setting must be true or false.');
  return {
    id: 'app',
    theme: value.theme as ThemePreference,
    weekStartsOn: value.weekStartsOn,
    timeFormat: value.timeFormat as TimeFormat,
    notificationsEnabled: value.notificationsEnabled,
    focusTaskId,
    updatedAt,
  };
}

function readCollection<T>(value: unknown, label: string, read: (item: unknown, index: number) => T | ImportResult): T[] | ImportResult {
  if (!Array.isArray(value)) return fail(`${label} must be a list.`);
  if (value.length > LIMITS.collection) return fail(`The file has too many ${label.toLowerCase()}.`);
  const items: T[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = read(value[index], index);
    if (isRecord(item) && 'ok' in item && item.ok === false) return item as ImportResult;
    items.push(item as T);
  }
  return items;
}

export function buildExport(snapshot: Snapshot, exportedAt = new Date().toISOString()): VastnoteFile {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt,
    data: {
      tasks: snapshot.tasks,
      notes: snapshot.notes,
      projects: snapshot.projects,
      inbox: snapshot.inbox,
      settings: snapshot.settings,
    },
  };
}

export function validateImport(input: unknown): ImportResult {
  if (!isRecord(input)) return fail('That file is not a Vastnote export.');
  if (input.format !== EXPORT_FORMAT) return fail('That file is not a Vastnote export.');
  if (input.version !== EXPORT_VERSION) return fail('This version of Vastnote cannot read that export yet.');
  const exportedAt = readTimestamp(input.exportedAt, 'Export time');
  if (typeof exportedAt !== 'string') return exportedAt;
  if (!isRecord(input.data)) return fail('The export is missing its data.');

  const tasks = readCollection(input.data.tasks, 'Tasks', readTask);
  if (!Array.isArray(tasks)) return tasks;
  const notes = readCollection(input.data.notes, 'Notes', readNote);
  if (!Array.isArray(notes)) return notes;
  const projects = readCollection(input.data.projects, 'Projects', readProject);
  if (!Array.isArray(projects)) return projects;
  const inbox = readCollection(input.data.inbox, 'Inbox items', readInbox);
  if (!Array.isArray(inbox)) return inbox;
  const settings = readSettings(input.data.settings);
  if (!('theme' in settings)) return settings;

  const duplicate =
    uniqueIds(tasks.map((task) => task.id), 'tasks') ||
    uniqueIds(notes.map((note) => note.id), 'notes') ||
    uniqueIds(projects.map((project) => project.id), 'projects') ||
    uniqueIds(inbox.map((item) => item.id), 'inbox items');
  if (duplicate) return duplicate;

  const taskIds = new Set(tasks.map((task) => task.id));
  for (const task of tasks) {
    if (task.parentId && !taskIds.has(task.parentId)) {
      task.parentId = null;
    }
    if (task.parentId === task.id) return fail('A task cannot be its own step.');
  }
  if (settings.focusTaskId && !taskIds.has(settings.focusTaskId)) settings.focusTaskId = null;

  return {
    ok: true,
    file: {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt,
      data: { tasks, notes, projects, inbox, settings },
    },
  };
}

export function repairMergedParents(tasks: Task[]): Task[] {
  const ids = new Set(tasks.map((task) => task.id));
  return tasks.map((task) => (task.parentId && !ids.has(task.parentId) ? { ...task, parentId: null } : task));
}
