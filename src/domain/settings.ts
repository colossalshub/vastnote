import { readStoredTheme } from './theme';
import type { Settings, TimeFormat } from './types';

export function detectTimeFormat(now = new Date()): TimeFormat {
  try {
    const hourCycle = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hourCycle;
    if (hourCycle === 'h23' || hourCycle === 'h24') return '24';
    const hour12 = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12;
    return hour12 === false ? '24' : '12';
  } catch {
    void now;
    return '12';
  }
}

export function createDefaultSettings(now = new Date()): Settings {
  return {
    id: 'app',
    theme: readStoredTheme(),
    weekStartsOn: 1,
    timeFormat: detectTimeFormat(now),
    notificationsEnabled: false,
    focusTaskId: null,
    updatedAt: now.toISOString(),
  };
}
