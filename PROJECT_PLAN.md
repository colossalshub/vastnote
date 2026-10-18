# Project plan

Vastnote’s first release is a local-first progressive web app for personal tasks, notes, and scheduling.

## Milestones

1. Foundation — tooling, tokens, logo, light/dark/system theme, app shell
2. Local data — models, IndexedDB, validation, import and export
3. Tasks — create, edit, complete, filter, remove, restore
4. Inbox — capture and convert
5. Calendar — day, agenda, week, scheduling
6. Notes and projects — writing, grouping, safe archive and delete
7. Today, focus, and search
8. Settings, reminders, and data safety
9. PWA — manifest, icons, service worker, offline shell
10. Release hardening — tests, accessibility, production build, documentation

## Acceptance

- A person can capture something in one step and find it after reload.
- Tasks can be scheduled, completed, reopened, and organized without a server.
- Day, agenda, and week views show the same stored tasks.
- Notes and projects persist and can be searched.
- Earlier tasks can be moved, finished, or released without a warning-colored backlog.
- Theme choice survives reload.
- Export and restore preserve relationships and reject bad files.
- The production build installs as a PWA and opens its shell offline after the first load.

## Risks

- Browser storage can be cleared by the user or the operating system. Export is the mitigation, not sync.
- iOS limits background notifications and website storage. The product copy says so.
- Service worker updates can serve an old shell until the user refreshes. The app shows a refresh prompt when a new version is waiting.

## Out of scope

Accounts, sync, collaboration, payments, AI features, and a native app.
