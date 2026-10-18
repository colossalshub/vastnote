import { addDays, dateKey, isValidDateKey, parseDateKey } from './dates';
import type { Priority, TimeFormat } from './types';

export function formatFullDate(key: string, now = new Date()): string {
  const date = parseDateKey(key);
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  }).format(date);
}

export function formatShortDate(key: string, now = new Date()): string {
  const date = parseDateKey(key);
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  }).format(date);
}

export function formatWeekday(key: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(parseDateKey(key));
}

export function formatTime(time: string, timeFormat: TimeFormat): string {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: timeFormat === '24' ? 'h23' : 'h12',
  }).format(date);
}

export function formatSchedule(
  dueDate: string | null,
  dueTime: string | null,
  timeFormat: TimeFormat,
  now = new Date(),
): string {
  if (!dueDate || !isValidDateKey(dueDate)) return '';
  const today = dateKey(now);
  let day: string;
  if (dueDate === today) day = 'Today';
  else if (dueDate === addDays(today, 1)) day = 'Tomorrow';
  else if (dueDate === addDays(today, -1)) day = 'Yesterday';
  else day = formatShortDate(dueDate, now);
  if (!dueTime) return day;
  return `${day}, ${formatTime(dueTime, timeFormat)}`;
}

export function formatRelative(iso: string, now = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const deltaSeconds = Math.round((now.getTime() - then.getTime()) / 1000);
  if (deltaSeconds < 45) return 'Just now';
  if (deltaSeconds < 60 * 60) {
    const minutes = Math.max(1, Math.round(deltaSeconds / 60));
    return minutes === 1 ? '1 min ago' : `${minutes} min ago`;
  }
  if (deltaSeconds < 60 * 60 * 24) {
    const hours = Math.max(1, Math.round(deltaSeconds / 3600));
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  const key = dateKey(then);
  if (key === addDays(dateKey(now), -1)) return 'Yesterday';
  return formatShortDate(key, now);
}

export function priorityLabel(priority: Priority): string | null {
  if (priority === 'high') return 'High';
  if (priority === 'medium') return 'Medium';
  if (priority === 'low') return 'Low';
  return null;
}

export function formatTimer(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function taskMetaLine(options: {
  dueDate: string | null;
  dueTime: string | null;
  priority: Priority;
  projectName?: string | null;
  timeFormat: TimeFormat;
  now?: Date;
}): string {
  const parts: string[] = [];
  const schedule = formatSchedule(options.dueDate, options.dueTime, options.timeFormat, options.now);
  if (schedule) parts.push(schedule);
  const priority = priorityLabel(options.priority);
  if (priority) parts.push(priority);
  if (options.projectName) parts.push(options.projectName);
  return parts.join(' · ');
}
