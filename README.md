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
  Data is per-site (per domain), so existing users keep theirs only if the app stays on the same domain.
- **The `?sync=` format** in `src/lib/sync.js` must keep reading old links, which are already
  shared around. `tests/logic.test.js` covers them using v1's exact encoder.

## App icon

Installed copies show a badge on the app icon with the number of classes in progress or still
to come today (where the device supports badges), and offer "Add a class" and "Deadlines"
shortcuts on a long press or right-click. The badge updates while the app is open.

## Known limitation

Alarms only fire while the app is open. Alerts with the app closed would need web push and a server.

## Deploying

Hosted on Vercel; `vercel.json` holds the build settings and cache headers. Import the repo at
vercel.com/new (it picks up the settings), or run `npx vercel --prod` from this folder.
Hashed files in `/assets/` are cached for a year; `sw.js` is never cached, so updates reach phones.
