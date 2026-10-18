# Decisions

## Local-first and no backend

The first release has no account, sync, or subscription. IndexedDB is the source of truth. Export and restore are the backup mechanism. Automatic backup is not claimed.

## Dexie

Dexie is a small, maintained wrapper over IndexedDB. A hand-rolled wrapper would mostly reimplement schema versions, transactions, and indexes. The repository is still the only module that talks to Dexie.

## Dates as local calendar keys

Scheduling uses local `YYYY-MM-DD` and `HH:mm` strings. That avoids the off-by-one errors that come from slicing a UTC ISO string. Daylight-saving transitions are covered by tests that add calendar days across US DST boundaries in 2026.

Earlier today stays on Today. Catch up is for dates before today, so a task that slipped past its time this afternoon is still in front of you instead of being filed as a miss.

## Monday week start

The default week starts on Monday because that matches a planning week. Sunday is a setting. The default is not inferred from the locale, so the calendar does not change shape unexpectedly after travel. The time format does follow the browser’s hour cycle until the user chooses 12-hour or 24-hour.

## Priority

Priority is none, low, medium, or high. It is a label, not a scoring system. There are no streaks, points, or shame counters.

## Inbox versus tasks

Capture does not require a project, date, or priority. Converting an inbox item creates a task or note and marks the capture converted. Sending a scheduled task back to the inbox copies its words into a new capture and lets the task go, so the active list and the inbox are not the same object pretending to be two things.

## Soft deletion

Removing a task or note sets `deletedAt`. Permanent deletion is a second, explicit action. Cancelled tasks remain restorable. Project deletion defaults to unlinking associated tasks and notes.

## Import safety

The whole file is validated before any write. Unknown format or version, bad dates, and duplicate ids are rejected. A failed import does not modify the database. Orphaned subtasks have their parent cleared so they do not vanish from every list. Replace mode requires a confirmation checkbox. Merge updates records with the same id.

## Theme storage

`localStorage` is read before first paint. IndexedDB settings are the exportable copy. Changing the theme writes both. Importing an export applies its theme.

## Notifications are optional and honest

They are off until the user opts in. Permission is requested only from that control. A denial is not asked again by the app. Only timed tasks notify, and only while the app can run the scheduler. The UI does not fake a delivered system notification.

## No drag-and-drop calendar

Rescheduling uses date and time fields, which work with the keyboard, a screen reader, and a phone. A drag interaction would be extra surface area without improving the basic job.

## Visual system

The interface is monochrome with blue reserved for primary actions, selection, links, and focus. IBM Plex Sans is bundled so the app does not call a font host. Overdue work is not colored red. Destructive actions are named plainly and confirmed.

## Logo

The mark is an original geometric peak: a thick V whose notch reads as both a mountain and the letter V. The app icon is a light mark on a near-black tile so it stays visible on light and dark home screens. The in-app mark uses `currentColor`.

## Testing tools

Vitest covers domain rules and the repository with `fake-indexeddb`. Playwright covers the production build in desktop and mobile Chromium, including persistence, theme, export rejection, axe checks, and an offline reload after the service worker takes control.
