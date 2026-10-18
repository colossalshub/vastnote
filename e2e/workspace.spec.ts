import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function clearWorkspace(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const databases = (await indexedDB.databases?.()) ?? [];
    await Promise.all(databases.map((database) => database.name && indexedDB.deleteDatabase(database.name)));
    localStorage.clear();
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await clearWorkspace(page);
});

test('captures, schedules, completes, and reloads a task', async ({ page }) => {
  await page.getByLabel('Capture a thought').fill('Buy filters');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('link', { name: /^Inbox/ }).click();
  await expect(page.getByText('Buy filters')).toBeVisible();
  await page.getByRole('button', { name: 'Make task' }).click();
  await expect(page.getByText('Buy filters')).toHaveCount(0);
  await page.goto('/tasks');
  await expect(page.getByRole('link', { name: 'Buy filters' })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Complete Buy filters' }).click();
  await page.getByRole('tab', { name: 'Completed' }).click();
  await expect(page.getByRole('link', { name: 'Buy filters' })).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Completed' }).click();
  await expect(page.getByRole('link', { name: 'Buy filters' })).toBeVisible();
});

test('searches a note and switches theme persistently', async ({ page }) => {
  await page.goto('/notes');
  await page.getByRole('button', { name: 'New note' }).click();
  await page.getByPlaceholder('Title').fill('Clinic questions');
  await page.getByPlaceholder('Start writing').fill('Ask about the morning appointment');
  await expect(page.locator('.status-line')).toContainText('Saved');
  await page.goto('/search');
  await page.getByRole('combobox', { name: 'Search Vastnote' }).fill('Clinic');
  await page.getByRole('option', { name: /Clinic questions/ }).click();
  await expect(page.getByPlaceholder('Title')).toHaveValue('Clinic questions');

  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Dark' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('radio', { name: 'Light' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('shows a scheduled task on the calendar', async ({ page }) => {
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'New task' }).click();
  await page.getByRole('dialog', { name: 'New task' }).getByLabel('Title').fill('Renew registration');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  await page.getByRole('dialog', { name: 'New task' }).getByLabel('Date').fill(due);
  await expect(page.getByRole('dialog', { name: 'New task' }).getByLabel('Date')).toHaveValue(due);
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('link', { name: 'Renew registration' })).toBeVisible();
  await page.goto(`/calendar?view=agenda&date=${due}`);
  await expect(page.getByRole('link', { name: /Renew registration/ })).toBeVisible();
});

test('rejects a malformed import and round-trips an export', async ({ page }) => {
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'New task' }).click();
  await page.getByRole('dialog', { name: 'New task' }).getByLabel('Title').fill('Keep this task');
  await page.getByRole('button', { name: 'Add task' }).click();
  await expect(page.getByRole('link', { name: 'Keep this task' })).toBeVisible();

  await page.goto('/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export data' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('Export download was not saved');
  const exported = JSON.parse(await readFile(path, 'utf8')) as {
    data: { tasks: { title: string }[] };
  };
  expect(exported.data.tasks.some((task) => task.title === 'Keep this task')).toBe(true);

  await page.getByLabel('Restore from an export').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"nope"}'),
  });
  await expect(page.getByRole('alert')).toContainText(/not a Vastnote export/i);
  await page.goto('/tasks');
  await expect(page.getByRole('link', { name: 'Keep this task' })).toBeVisible();
});

test('loads the app shell while offline', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Vastnote, home/ })).toBeVisible();
});

test('has no serious accessibility violations on primary screens', async ({ page }) => {
  for (const path of ['/', '/inbox', '/tasks', '/calendar', '/settings']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);
  }
});
