# ClassFlow

A mobile web app for students: class timetable, live countdowns, deadline tracking, and
timetable sharing by link or QR code. It has no backend. Data lives in the browser's `localStorage`.

## Commands

```
npm install
npm run dev       # local development
npm test          # logic tests
npm run build     # production build, output in dist/
npm run preview   # serve the production build on port 4173
npm run screens   # with preview running: browser checks + screenshots in screens/
```

## Layout

- `src/lib/` holds the logic, with no React: `schedule.js`, `sync.js`, `alerts.js`, `storage.js`
- `src/components/` holds the UI, and `src/App.jsx` owns state
- Offline: at build time `vite.config.js` turns `src/sw-template.js` into `dist/sw.js`, which saves
  every app file on the phone. New versions download in the background and apply on the next
  launch. The service worker also opens the app when someone taps a class alert.
- `docs/original-build/` is the deployed v1 bundle this project was recovered from

## Compatibility rules

Breaking either of these affects real users:

- **`localStorage` keys** in `src/lib/storage.js` (`gctu_timetable`, `gctu_exams`,
  `classflow_profile`, `campusgrid_profile`, `processed_sync`) must not be renamed.
  Data is per-site, so existing users keep theirs only if this deploys to the same Netlify site.
- **The `?sync=` format** in `src/lib/sync.js` must keep reading old links, which are already
  shared around. `tests/logic.test.js` covers them using v1's exact encoder.

## Home-screen widget

`src/widget/core.js` is shared by the app and the service worker (the build inlines it into
`dist/sw.js`). On every change, the app saves a trimmed copy of the schedule to IndexedDB:
only day, times, code, name and venue, plus upcoming deadlines. The copy is capped well under
64 KB and is fully replaced on each save, so deleted items vanish at once. The service worker
serves it at `/widget/data.json` (offline) and draws the Windows 11 widget declared in
`manifest.webmanifest`. Phones can't host web-app widgets, so they get an icon badge and
long-press shortcuts instead. Regenerate the picker image with
`node scripts/make-widget-screenshot.mjs`.

## Known limitation

Alarms only fire while the app is open. Alerts with the app closed would need web push and a server.
