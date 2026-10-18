import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

const names: string[] = [];

function databaseName(): string {
  const name = `vastnote-ui-${crypto.randomUUID()}`;
  names.push(name);
  return name;
}

afterEach(async () => {
  cleanup();
  await Promise.all(names.splice(0).map((name) => Dexie.delete(name)));
});

describe('workspace UI', () => {
  it('captures a thought and keeps it after the inbox is opened', async () => {
    const user = userEvent.setup();
    render(<App databaseName={databaseName()} />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Capture a thought'), 'Buy filters');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(await screen.findByRole('link', { name: /Inbox\s*1/ })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Inbox\s*1/ }));
    expect(await screen.findByText('Buy filters')).toBeInTheDocument();
  });

  it('renders note text instead of interpreting markup', async () => {
    const user = userEvent.setup();
    render(<App databaseName={databaseName()} />);
    await screen.findByRole('heading', { level: 1 });
    await user.click(screen.getByRole('link', { name: 'Notes' }));
    await user.click(await screen.findByRole('button', { name: 'New note' }));
    const editor = await screen.findByPlaceholderText('Start writing');
    await user.type(editor, '<img src=x onerror=alert(1)>');
    expect(screen.getByDisplayValue('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});
