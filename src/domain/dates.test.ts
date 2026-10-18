import { describe, expect, it } from 'vitest';
import { addDays, dateKey, isValidDateKey, isValidTime, startOfWeek, weekDates } from './dates';

describe('dates', () => {
  it('formats local calendar dates without UTC conversion', () => {
    expect(dateKey(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01');
    expect(dateKey(new Date(2026, 10, 1, 1, 30))).toBe('2026-11-01');
  });

  it('rejects impossible dates and accepts leap day', () => {
    expect(isValidDateKey('2026-02-31')).toBe(false);
    expect(isValidDateKey('2024-02-29')).toBe(true);
    expect(isValidDateKey('2023-02-29')).toBe(false);
    expect(isValidTime('09:30')).toBe(true);
    expect(isValidTime('24:00')).toBe(false);
  });

  it('keeps calendar days stable across daylight-saving boundaries', () => {
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('builds weeks from the chosen start day', () => {
    expect(startOfWeek('2026-01-01', 1)).toBe('2025-12-29');
    expect(startOfWeek('2026-01-01', 0)).toBe('2025-12-28');
    expect(weekDates('2026-10-18', 1)).toEqual([
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
      '2026-10-17',
      '2026-10-18',
    ]);
  });
});
