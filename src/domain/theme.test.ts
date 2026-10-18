import { describe, expect, it } from 'vitest';
import css from '../styles/global.css?raw';
import { resolveTheme } from './theme';

function channel(hex: string): number[] {
  const value = hex.replace('#', '');
  return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16) / 255);
}

function luminance(hex: string): number {
  const linear = channel(hex).map((part) => (part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((left, right) => right - left);
  return (hi + 0.05) / (lo + 0.05);
}

function token(css: string, block: string, name: string): string {
  const section = css.match(new RegExp(`${block}\\s*\\{([^}]+)\\}`))?.[1] ?? '';
  const value = section.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  if (!value) throw new Error(`Missing ${name} in ${block}`);
  return value;
}

describe('theme', () => {
  it('resolves system preference without losing an explicit choice', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('keeps text and controls above WCAG AA contrast', () => {
    const light = (name: string) => token(css, ':root', name);
    const dark = (name: string) => token(css, ":root\\[data-theme='dark'\\]", name);
    expect(contrast(light('--text'), light('--bg'))).toBeGreaterThanOrEqual(7);
    expect(contrast(light('--text-secondary'), light('--bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light('--text-secondary'), light('--bg-subtle'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light('--on-blue'), light('--blue'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light('--blue-text'), light('--bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark('--text'), dark('--bg'))).toBeGreaterThanOrEqual(7);
    expect(contrast(dark('--text-secondary'), dark('--bg'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark('--on-blue'), dark('--blue'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark('--blue-text'), dark('--bg'))).toBeGreaterThanOrEqual(4.5);
  });
});
