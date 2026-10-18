# Testing

## Unit and component tests

```bash
npm test
```

These run in Vitest with jsdom and `fake-indexeddb`. They cover:

- Local calendar dates, week starts, and daylight-saving day boundaries
- Overdue selection, next action, and task filters
- Search across tasks, notes, and inbox items
- Export round trip and rejection of malformed files
- Reminder selection for timed tasks
- Theme resolution and WCAG AA contrast of the design tokens
- Repository create, complete, project unlink, merge, replace, and rejected import
- IndexedDB opening a version 1 database and upgrading it
- Capture in the UI, and notes rendering text instead of HTML

## Typecheck and lint

```bash
npm run typecheck
npm run lint
```

## Production build

```bash
npm run build
npm run verify:build
npm run preview
```

`verify:build` checks that `dist` contains the manifest, service worker, registration bundle, and icons.

## End to end

```bash
npm run build
npm run test:e2e
```

Playwright runs the production preview in desktop Chromium and a Pixel-sized mobile project. The suite:

- Captures an inbox item, turns it into a task, completes it, and reloads
- Writes a note, finds it in search, and persists light and dark themes
- Schedules a task and finds it on the agenda
- Downloads an export and rejects a file that is not a Vastnote export
- Reloads the app shell while offline after the service worker controls the page
- Runs axe against Today, Inbox, Tasks, Calendar, and Settings

Axe failures of serious or critical impact fail the test.

## What is not automated

- A physical iPhone install. The Safari steps are documented and the mobile layout is tested in Chromium’s mobile viewport.
- Real notification delivery from a closed installed PWA. The selector is unit tested. The browser permission prompt is not scripted.
- Drag interactions, because the product does not use them.
- A hosted deployment. No hosting credentials are configured in this environment.
