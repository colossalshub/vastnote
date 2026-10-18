import { useState } from 'react';
import { APP_VERSION, type ImportMode, type ThemePreference, type TimeFormat, type WeekStart } from '../../domain/types';
import { storeTheme } from '../../domain/theme';
import { validateImport } from '../../domain/export';
import { useTheme } from '../../theme/ThemeProvider';
import { useWorkspace } from '../../state/DataProvider';
import { useUi } from '../../state/UiProvider';

export function SettingsPage() {
  const { snapshot, updateSettings, exportData, importData } = useWorkspace();
  const { preference, setPreference } = useTheme();
  const { announce } = useUi();
  const [importPreview, setImportPreview] = useState<string>('');
  const [importPayload, setImportPayload] = useState<unknown>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [confirmed, setConfirmed] = useState(false);
  const [importError, setImportError] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const notificationsAvailable = typeof Notification !== 'undefined';
  const permission = notificationsAvailable ? Notification.permission : 'denied';

  async function onTheme(next: ThemePreference) {
    setPreference(next);
    storeTheme(next);
    await updateSettings({ theme: next });
    announce(`Theme set to ${next}`);
  }

  async function onExport() {
    const file = await exportData();
    file.data.settings = { ...file.data.settings, theme: preference };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `vastnote-export-${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
    announce('Export downloaded');
  }

  async function onFile(file: File | undefined) {
    setImportError('');
    setImportMessage('');
    setImportPayload(null);
    setImportPreview('');
    setConfirmed(false);
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const result = validateImport(parsed);
      if (!result.ok) {
        setImportError(result.error);
        return;
      }
      setImportPayload(parsed);
      const { tasks, notes, projects, inbox } = result.file.data;
      setImportPreview(
        `This file contains ${tasks.length} tasks, ${notes.length} notes, ${projects.length} projects, and ${inbox.length} inbox items.`,
      );
    } catch {
      setImportError('That file could not be read as JSON.');
    }
  }

  async function onRestore() {
    if (!importPayload) return;
    if (importMode === 'replace' && !confirmed) {
      setImportError('Confirm that replacing data is what you want.');
      return;
    }
    try {
      await importData(importPayload, importMode);
      const result = validateImport(importPayload);
      if (result.ok) {
        setPreference(result.file.data.settings.theme);
        storeTheme(result.file.data.settings.theme);
      }
      setImportMessage(importMode === 'replace' ? 'Replaced the data on this device.' : 'Merged the file into this device.');
      setImportError('');
      announce('Data restored');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not restore that file.');
    }
  }

  async function onNotifications(enabled: boolean) {
    if (!enabled) {
      await updateSettings({ notificationsEnabled: false });
      announce('Reminders off');
      return;
    }
    if (!notificationsAvailable) return;
    const result = await Notification.requestPermission();
    if (result !== 'granted') {
      await updateSettings({ notificationsEnabled: false });
      setImportError('');
      announce('Notifications stay off because the browser did not allow them.');
      return;
    }
    await updateSettings({ notificationsEnabled: true });
    announce('Reminders on');
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="lede">Theme, reminders, and a copy of your data.</p>
        </div>
      </header>

      <section className="settings-section" aria-labelledby="theme-settings">
        <h2 id="theme-settings">Theme</h2>
        {(['system', 'light', 'dark'] as const).map((option) => (
          <label key={option} className="choice">
            <input type="radio" name="theme" checked={preference === option} onChange={() => void onTheme(option)} />
            <span>{option === 'system' ? 'Match system' : option === 'light' ? 'Light' : 'Dark'}</span>
          </label>
        ))}
      </section>

      <section className="settings-section" aria-labelledby="week-settings">
        <h2 id="week-settings">Week</h2>
        <p className="quiet">Used by the calendar week view.</p>
        {([1, 0] as WeekStart[]).map((option) => (
          <label key={option} className="choice">
            <input
              type="radio"
              name="week"
              checked={snapshot.settings.weekStartsOn === option}
              onChange={() => void updateSettings({ weekStartsOn: option })}
            />
            <span>{option === 1 ? 'Monday' : 'Sunday'}</span>
          </label>
        ))}
      </section>

      <section className="settings-section" aria-labelledby="time-settings">
        <h2 id="time-settings">Time</h2>
        {(['12', '24'] as TimeFormat[]).map((option) => (
          <label key={option} className="choice">
            <input
              type="radio"
              name="time"
              checked={snapshot.settings.timeFormat === option}
              onChange={() => void updateSettings({ timeFormat: option })}
            />
            <span>{option === '12' ? '12-hour' : '24-hour'}</span>
          </label>
        ))}
      </section>

      <section className="settings-section" aria-labelledby="notification-settings">
        <h2 id="notification-settings">Reminders</h2>
        {notificationsAvailable ? (
          <>
            <p className="quiet">
              Vastnote can notify you when a timed task is due, while this app is open or installed. Browsers cannot promise
              delivery if the app is closed, especially on iPhone.
            </p>
            <label className="choice">
              <input
                type="checkbox"
                checked={snapshot.settings.notificationsEnabled}
                onChange={(event) => void onNotifications(event.target.checked)}
              />
              <span>Notify me when a timed task is due</span>
            </label>
            {permission === 'denied' ? (
              <p>Notifications are blocked in this browser. You can allow them from the browser’s site settings. Vastnote will not keep asking.</p>
            ) : null}
          </>
        ) : (
          <p>This browser does not offer notifications.</p>
        )}
      </section>

      <section className="settings-section" aria-labelledby="data-settings">
        <h2 id="data-settings">Your data</h2>
        <p className="quiet">
          Vastnote stores tasks, notes, projects, inbox items, and settings in this browser. Nothing is uploaded. Clearing site
          data, removing the app, or losing the device can erase it. Export a copy when it matters.
        </p>
        <button type="button" className="button button--primary" onClick={() => void onExport()}>
          Export data
        </button>
        <label className="field">
          <span>Restore from an export</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>
        {importPreview ? <p>{importPreview}</p> : null}
        {importPayload ? (
          <>
            <label className="choice">
              <input type="radio" name="import-mode" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} />
              <span>Merge with what is already here. Matching items are updated.</span>
            </label>
            <label className="choice">
              <input type="radio" name="import-mode" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} />
              <span>Replace everything currently stored on this device.</span>
            </label>
            {importMode === 'replace' ? (
              <label className="choice">
                <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
                <span>I understand this replaces tasks, notes, projects, inbox items, and settings on this device.</span>
              </label>
            ) : null}
            <button type="button" className="button button--quiet" onClick={() => void onRestore()}>
              Restore
            </button>
          </>
        ) : null}
        {importError ? (
          <p className="form-error" role="alert">
            {importError}
          </p>
        ) : null}
        {importMessage ? <p role="status">{importMessage}</p> : null}
      </section>

      <section className="settings-section" aria-labelledby="install-settings">
        <h2 id="install-settings">Install on iPhone</h2>
        <ol>
          <li>Open Vastnote in Safari.</li>
          <li>Tap Share.</li>
          <li>Tap Add to Home Screen.</li>
          <li>Tap Add. The icon opens Vastnote without the Safari toolbar.</li>
        </ol>
        <p className="quiet">
          An installed web app is not a native iOS app. Background reminders are limited, and data still lives in Safari’s site
          storage. Export regularly.
        </p>
      </section>

      <section className="settings-section" aria-labelledby="shortcuts-settings">
        <h2 id="shortcuts-settings">Shortcuts</h2>
        <p>
          <span className="kbd">Ctrl</span> or <span className="kbd">⌘</span> K searches. Press C to capture when you are not typing.
        </p>
      </section>

      <section className="settings-section" aria-labelledby="about-settings">
        <h2 id="about-settings">About</h2>
        <p>Vastnote {APP_VERSION}</p>
        <p>Less chaos. More you.</p>
        <p className="quiet">A personal organizer that stays on this device. No account, no subscription, no analytics.</p>
      </section>
    </div>
  );
}
