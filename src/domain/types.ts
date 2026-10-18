export const APP_VERSION = '1.0.0';

export const LIMITS = {
  title: 500,
  description: 20_000,
  note: 100_000,
  inbox: 10_000,
  projectName: 200,
  projectDescription: 10_000,
  collection: 20_000,
} as const;

export type Priority = 'none' | 'low' | 'medium' | 'high';

export type ThemePreference = 'light' | 'dark' | 'system';

export type TimeFormat = '12' | '24';

export type WeekStart = 0 | 1;

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  projectId: string | null;
  parentId: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  projectId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type InboxStatus = 'open' | 'converted' | 'archived';

export interface InboxItem {
  id: string;
  text: string;
  status: InboxStatus;
  sourceTaskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: 'app';
  theme: ThemePreference;
  weekStartsOn: WeekStart;
  timeFormat: TimeFormat;
  notificationsEnabled: boolean;
  focusTaskId: string | null;
  updatedAt: string;
}

export interface Snapshot {
  tasks: Task[];
  notes: Note[];
  projects: Project[];
  inbox: InboxItem[];
  settings: Settings;
}

export interface TaskInput {
  title: string;
  description: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  projectId: string | null;
  parentId?: string | null;
}

export type ImportMode = 'replace' | 'merge';

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
