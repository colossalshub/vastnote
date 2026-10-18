# Vastnote

Less chaos. More you.

Vastnote is a private, local-first workspace for tasks, notes, and what matters today. It runs in the browser as an installable progressive web app. There is no account, subscription, or required server.

## Run it locally

```bash
npm install
npm run dev
```

Open the URL Vite prints, usually `http://127.0.0.1:5173`.

Other commands:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npm run test:e2e
```

End-to-end tests expect a production build first: `npm run build && npm run test:e2e`.

## What you can do

- Capture a thought without filing it first.
- Turn inbox items into tasks or notes, or schedule them.
- Create, edit, complete, reopen, reschedule, and remove tasks.
- See the day, a forward agenda, and the week.
- Write notes and group work into lightweight projects.
- Focus on one task, with an optional timer.
- Review earlier tasks and move, finish, or release them.
- Search tasks, notes, projects, and inbox items.
- Switch light, dark, and system themes.
- Export your data and restore it later.

## Your data stays on this device

Vastnote stores tasks, notes, projects, inbox items, and settings in IndexedDB in this browser. Nothing is uploaded. There is no automatic backup.

Export a copy from Settings when the information matters. Clearing site data, removing the app, or losing the device can erase the local database.

An export is a versioned JSON file (`format: "vastnote"`, `version: 1`). Restore can merge into the current workspace or replace it. Replacement asks you to confirm first. Malformed files are rejected and do not change what is already stored.

## Install on iPhone

1. Open Vastnote in Safari.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Tap Add.

The icon then opens Vastnote without Safari’s address bar. This is still a web app, not a native iOS app.

- Data stays in Safari’s site storage for this origin.
- Background reminders are limited. Timed reminders work while the app is open, and only if you allow notifications.
- iOS may delete website data that has not been used for a while. Export regularly.
- Offline use starts after the app has loaded once and the service worker is active.

## Privacy

Vastnote does not include analytics, accounts, or a required network service. Fonts and icons are bundled with the app. User content is rendered as text.

## Deployment

`npm run build` writes a static site to `dist/`. Host that folder on any static host that serves `index.html` for client-side routes and allows the service worker at the site root. This repository does not deploy itself; no live URL is configured here.

## Limitations

- No cloud sync, accounts, or collaboration.
- No native iOS or Android app in this release.
- Reminders are real browser notifications for timed tasks only. All-day tasks do not notify. Closed tabs and iOS background limits can prevent delivery.
- Subtasks stay on their parent task. They are not a separate project system.
- Calendar rescheduling uses date and time fields, not drag and drop.
- The first offline launch requires one successful online load so the app shell can be cached.
