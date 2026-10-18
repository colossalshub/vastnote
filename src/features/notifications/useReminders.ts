import { useEffect } from 'react';
import { notificationKey, tasksToNotify } from '../../domain/notifications';
import type { Task } from '../../domain/types';
import { useUi } from '../../state/UiProvider';

const STORAGE_KEY = 'vastnote-notified';

function readNotified(): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

function writeNotified(keys: Set<string>): void {
  const list = [...keys].slice(-200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function useReminders(tasks: Task[], enabled: boolean): void {
  const { notify } = useUi();

  useEffect(() => {
    if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const tick = () => {
      const already = readNotified();
      const due = tasksToNotify(tasks, new Date(), already);
      if (due.length === 0) return;
      for (const task of due) {
        const key = notificationKey(task);
        if (key) already.add(key);
        try {
          new Notification('Vastnote', { body: task.title, tag: key ?? task.id });
        } catch {
          /* The browser can reject a notification without failing the rest of the app. */
        }
        notify(`Due now: ${task.title}`);
      }
      writeNotified(already);
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [tasks, enabled, notify]);
}
