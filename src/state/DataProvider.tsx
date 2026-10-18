import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createDatabase } from '../db/database';
import { createRepository, type Repository } from '../db/repository';
import { DomainError, type ImportMode, type InboxItem, type Settings, type Snapshot, type TaskInput } from '../domain/types';
import type { VastnoteFile } from '../domain/export';

interface DataContextValue {
  ready: boolean;
  loadError: string | null;
  actionError: string | null;
  dismissActionError: () => void;
  snapshot: Snapshot | null;
  createTask: (input: TaskInput) => Promise<string>;
  updateTask: (id: string, input: TaskInput) => Promise<void>;
  setTaskCompleted: (id: string, completed: boolean) => Promise<void>;
  cancelTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  softDeleteTask: (id: string) => Promise<void>;
  permanentDeleteTask: (id: string) => Promise<void>;
  addInbox: (text: string) => Promise<void>;
  updateInbox: (id: string, text: string) => Promise<void>;
  setInboxStatus: (id: string, status: InboxItem['status']) => Promise<void>;
  createNote: (input: { title: string; content: string; projectId: string | null }) => Promise<string>;
  updateNote: (id: string, input: { title: string; content: string; projectId: string | null }) => Promise<void>;
  softDeleteNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  permanentDeleteNote: (id: string) => Promise<void>;
  createProject: (input: { name: string; description: string }) => Promise<string>;
  updateProject: (id: string, input: { name: string; description: string }) => Promise<void>;
  setProjectArchived: (id: string, archived: boolean) => Promise<void>;
  deleteProject: (id: string, mode: 'unlink' | 'delete-associated') => Promise<void>;
  updateSettings: (patch: Partial<Omit<Settings, 'id'>>) => Promise<void>;
  exportData: () => Promise<VastnoteFile>;
  importData: (input: unknown, mode: ImportMode) => Promise<void>;
  sendTaskToInbox: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function toMessage(error: unknown): string {
  if (error instanceof DomainError) return error.message;
  return "Couldn't save that change. Everything else is still on this device.";
}

export function DataProvider({ children, databaseName }: { children: ReactNode; databaseName?: string }) {
  const repositoryRef = useRef<Repository | null>(null);
  if (!repositoryRef.current) {
    repositoryRef.current = createRepository(createDatabase(databaseName));
  }
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const next = await repositoryRef.current!.loadAll();
    setSnapshot(next);
    return next;
  }, []);

  useEffect(() => {
    let cancelled = false;
    repositoryRef.current!.loadAll().then(
      (next) => {
        if (!cancelled) setSnapshot(next);
      },
      (error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : 'Vastnote could not open local storage on this device.');
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback(
    async (work: () => Promise<void>) => {
      try {
        await work();
        setActionError(null);
        await reload();
      } catch (error) {
        setActionError(toMessage(error));
        throw error;
      }
    },
    [reload],
  );

  const api = useMemo<Omit<DataContextValue, 'ready' | 'loadError' | 'actionError' | 'snapshot' | 'dismissActionError'>>(
    () => ({
      createTask: async (input) => {
        const task = await repositoryRef.current!.createTask(input);
        await reload();
        return task.id;
      },
      updateTask: (id, input) => commit(() => repositoryRef.current!.updateTask(id, input).then(() => undefined)),
      setTaskCompleted: async (id, completed) => {
        setSnapshot((current) =>
          current
            ? {
                ...current,
                tasks: current.tasks.map((task) =>
                  task.id === id
                    ? { ...task, completedAt: completed ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }
                    : task,
                ),
              }
            : current,
        );
        try {
          await repositoryRef.current!.setTaskCompleted(id, completed);
          setActionError(null);
          await reload();
        } catch (error) {
          await reload().catch(() => undefined);
          setActionError(toMessage(error));
          throw error;
        }
      },
      cancelTask: (id) => commit(() => repositoryRef.current!.cancelTask(id)),
      restoreTask: (id) => commit(() => repositoryRef.current!.restoreTask(id)),
      softDeleteTask: (id) => commit(() => repositoryRef.current!.softDeleteTask(id)),
      permanentDeleteTask: (id) => commit(() => repositoryRef.current!.permanentDeleteTask(id)),
      addInbox: (text) => commit(() => repositoryRef.current!.addInbox(text).then(() => undefined)),
      updateInbox: (id, text) => commit(() => repositoryRef.current!.updateInbox(id, text)),
      setInboxStatus: (id, status) => commit(() => repositoryRef.current!.setInboxStatus(id, status)),
      createNote: async (input) => {
        const note = await repositoryRef.current!.createNote(input);
        await reload();
        return note.id;
      },
      updateNote: (id, input) => commit(() => repositoryRef.current!.updateNote(id, input)),
      softDeleteNote: (id) => commit(() => repositoryRef.current!.softDeleteNote(id)),
      restoreNote: (id) => commit(() => repositoryRef.current!.restoreNote(id)),
      permanentDeleteNote: (id) => commit(() => repositoryRef.current!.permanentDeleteNote(id)),
      createProject: async (input) => {
        const project = await repositoryRef.current!.createProject(input);
        await reload();
        return project.id;
      },
      updateProject: (id, input) => commit(() => repositoryRef.current!.updateProject(id, input)),
      setProjectArchived: (id, archived) => commit(() => repositoryRef.current!.setProjectArchived(id, archived)),
      deleteProject: (id, mode) => commit(() => repositoryRef.current!.deleteProject(id, mode)),
      updateSettings: (patch) => commit(() => repositoryRef.current!.updateSettings(patch).then(() => undefined)),
      exportData: () => repositoryRef.current!.exportData(),
      importData: (input, mode) => commit(() => repositoryRef.current!.importData(input, mode)),
      sendTaskToInbox: (id) =>
        commit(async () => {
          const current = await repositoryRef.current!.loadAll();
          const task = current.tasks.find((item) => item.id === id && !item.deletedAt);
          if (!task) throw new DomainError('That task is no longer available.');
          const text = task.description.trim() ? `${task.title}\n\n${task.description.trim()}` : task.title;
          await repositoryRef.current!.addInbox(text, task.id);
          await repositoryRef.current!.cancelTask(id);
        }),
    }),
    [commit, reload],
  );

  const dismissActionError = useCallback(() => setActionError(null), []);

  const value = useMemo<DataContextValue>(
    () => ({
      ready: snapshot !== null,
      loadError,
      actionError,
      dismissActionError,
      snapshot,
      ...api,
    }),
    [snapshot, loadError, actionError, dismissActionError, api],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useVastnote(): DataContextValue {
  const value = useContext(DataContext);
  if (!value) throw new Error('useVastnote must be used within DataProvider');
  return value;
}

export function useWorkspace() {
  const value = useVastnote();
  if (!value.snapshot) throw new Error('Workspace is not ready');
  return { ...value, snapshot: value.snapshot };
}
