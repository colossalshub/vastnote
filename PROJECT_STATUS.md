# Project status

First release is implemented in this workspace as a client-only progressive web app.

## Complete

- Today, inbox, tasks, calendar (day, agenda, week), notes, projects, focus, catch up, and search
- Light, dark, and system themes with persisted preference
- IndexedDB persistence, schema version 1, and tested upgrade path
- Versioned export and validated merge or replace restore
- Optional timed reminders through the browser Notification API
- Manifest, icons, service worker, and offline app shell after first load
- Responsive layout, including a phone tab bar
- Unit tests, accessibility checks, and Playwright coverage of the production build

## Not done

- No hosted deployment. The environment has no hosting credentials. `npm run build` produces the static site.
- Not installed on a physical iPhone. Installation steps are in the README and Settings.
- No cloud backup. Users must export.

## Checks last run in this workspace

- `npm test` — passing
- `npm run lint` — passing
- `npm run build` and `npm run verify:build` — passing
- `npm run test:e2e` — passing on desktop and mobile Chromium, including offline reload

Re-run those commands after further changes. Do not treat this file as a substitute for a fresh test run.
