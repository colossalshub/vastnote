# Architecture

Vastnote is a client-only React application. The browser is the runtime. Domain rules do not import React, IndexedDB, or the DOM, so a future React Native app can reuse them.

## Stack

- React 19 and TypeScript, built with Vite
- React Router for screens
- Dexie for IndexedDB
- IBM Plex Sans, self-hosted through Fontsource
- Lucide icons
- A hand-written CSS design system with semantic tokens
- vite-plugin-pwa and Workbox for the manifest and service worker
- Vitest and Testing Library for unit and UI tests
- Playwright and axe-core for end-to-end and accessibility checks

## Layout

- `src/domain` — types, dates, task selection, search, import validation, theme resolution
- `src/db` — Dexie schema and the repository
- `src/state` — React bindings over the repository and small UI status
- `src/features` — screens
- `src/shell` — navigation, capture, and search entry points
- `src/styles/global.css` — tokens and layout

## Data

Database name: `vastnote`. Schema version: `1`.

Stores:

- `tasks` — indexed by `id`, `projectId`, `parentId`, `dueDate`, `updatedAt`
- `notes` — indexed by `id`, `projectId`, `updatedAt`
- `projects` — indexed by `id`, `updatedAt`
- `inbox` — indexed by `id`, `status`, `updatedAt`
- `settings` — single record, `id: "app"`

Calendar dates are `YYYY-MM-DD` in the local calendar. Times are `HH:mm` in local time. Instants such as `createdAt` are ISO timestamps. The app does not derive a calendar day from `toISOString()`, which would shift dates around midnight and UTC offsets.

Writes go through one queue per repository so a save cannot overlap another save on the same database connection. The UI reloads the snapshot after a successful write. Completing a task updates the checkbox immediately, then confirms it from the database.

Tasks and notes use soft deletion (`deletedAt`) and can be restored. Letting a task go sets `cancelledAt` and keeps it recoverable from Catch up. Deleting a project asks whether to unlink its tasks and notes or remove those associated records too. It never deletes unrelated data.

The personal dataset is loaded into memory. That is intentional for a single-user workspace and keeps filtering and search easy to test.

## Theme

`index.html` applies the saved theme before React paints. The preference lives in `localStorage` under `vastnote-theme` and is copied into settings so exports include it. Light, dark, and system are all supported. System mode follows `prefers-color-scheme`.

## Search and reminders

Search is a pure function over the current snapshot. It does not invent results.

Reminders use the browser Notification API only after the user turns them on. The scheduler runs while the app is open and notifies timed tasks at the matching local minute. All-day tasks have no notification. Delivery is not guaranteed when the app is closed.

## PWA

The production build precaches the app shell, fonts, and icons. IndexedDB is not placed in the Cache Storage. Navigation requests fall back to `index.html` so client routes work offline after the service worker controls the page. A refresh prompt appears when a new version is waiting.

## Web APIs a native port would replace

| Behavior | Web API |
| --- | --- |
| Durable data | IndexedDB via Dexie |
| Theme flash prevention | `localStorage`, `matchMedia` |
| Install and offline shell | Web App Manifest, service worker |
| Reminders | Notification API |
| Export file | Blob download and file input |

Domain functions in `src/domain` and the repository’s input validation do not depend on those APIs. The repository itself is the IndexedDB adapter and would be reimplemented for native storage.

## Future React Native notes

- Keep `src/domain` free of browser imports.
- Replace Dexie with a native SQLite or similar store behind the same repository methods.
- Replace the router shell and CSS with native screens. Do not share the DOM components.
- Notifications, files, and secure storage will be platform modules, not the service worker.
- Preserve the export format so a later migration can read version 1 files.
