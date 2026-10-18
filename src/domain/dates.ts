import type { WeekStart } from './types';

const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_KEY = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function dateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function timeKey(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function isValidDateKey(value: string): boolean {
  const match = DATE_KEY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function isValidTime(value: string): boolean {
  return TIME_KEY.test(value);
}

export function parseDateKey(key: string): Date {
  if (!isValidDateKey(key)) {
    throw new Error(`Invalid date: ${key}`);
  }
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(key: string, amount: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

export function startOfWeek(key: string, weekStartsOn: WeekStart): string {
  const date = parseDateKey(key);
  const diff = (date.getDay() - weekStartsOn + 7) % 7;
  return addDays(key, -diff);
}

export function weekDates(key: string, weekStartsOn: WeekStart): string[] {
  const start = startOfWeek(key, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function compareDateKeys(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
