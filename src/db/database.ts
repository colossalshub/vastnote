import Dexie, { type EntityTable } from 'dexie';
import type { InboxItem, Note, Project, Settings, Task } from '../domain/types';

export const DATABASE_NAME = 'vastnote';
export const SCHEMA_VERSION = 1;

export class VastnoteDB extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  projects!: EntityTable<Project, 'id'>;
  inbox!: EntityTable<InboxItem, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = DATABASE_NAME) {
    super(name);
    this.version(SCHEMA_VERSION).stores({
      tasks: 'id, projectId, parentId, dueDate, updatedAt',
      notes: 'id, projectId, updatedAt',
      projects: 'id, updatedAt',
      inbox: 'id, status, updatedAt',
      settings: 'id',
    });
  }
}

export function createDatabase(name = DATABASE_NAME): VastnoteDB {
  return new VastnoteDB(name);
}
