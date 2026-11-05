// Home-screen widget core. Shared by the app and the service worker: the build inlines this
// file into dist/sw.js, so it must stay plain JavaScript with no imports.
//
// The app's real data stays in localStorage (older versions depend on those keys). A service
// worker can't read localStorage, so the app also keeps a tiny copy in IndexedDB holding only
// what a widget shows. Every save replaces the whole copy, so deleted items vanish at once.

export const WIDGET_TAG = 'classflow-next';
export const WIDGET_BUDGET_BYTES = 64 * 1024;

const DB_NAME = 'classflow-widget';
const STORE = 'snapshot';
const KEY = 'current';
const MAX_CLASSES = 100;
const MAX_DEADLINES = 30;
const MAX_TEXT = 80;
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME = /^\d{1,2}:\d{2}$/;

const trimText = (value) => String(value ?? '').slice(0, MAX_TEXT);

/**
 * Reduces the schedule to what a widget needs, as compact arrays:
 * classes [dayIndex, start, end, code, name, venue] and deadlines [dueMs, title, code].
 * Lecturers, deadline venues and past deadlines are left out.
 */
export function toSnapshot({ name, classes, deadlines, now }) {
  const c = classes
    .filter((x) => WEEK.includes(x.day) && TIME.test(x.startTime) && TIME.test(x.endTime))
    .slice(0, MAX_CLASSES)
    .map((x) => [WEEK.indexOf(x.day), x.startTime, x.endTime, trimText(x.courseCode), trimText(x.courseName), trimText(x.venue)]);
  const d = deadlines
    .map((x) => [new Date(`${x.date}T${x.time}`).getTime(), trimText(x.title), trimText(x.courseCode)])
    .filter(([due]) => Number.isFinite(due) && due > now.getTime())
    .sort((a, b) => a[0] - b[0])
    .slice(0, MAX_DEADLINES);
  return { v: 1, n: trimText(String(name ?? '').trim().split(' ')[0]), c, d, u: now.getTime() };
}

export const snapshotBytes = (snapshot) => new TextEncoder().encode(JSON.stringify(snapshot)).length;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run(mode, work) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const result = work(transaction.objectStore(STORE));
        transaction.oncomplete = () => {
          db.close();
          resolve(result && 'result' in result ? result.result : undefined);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      }),
  );
}

/** Replaces the stored copy in one transaction: nothing stale can survive a save. */
export function saveSnapshot(snapshot) {
  if (snapshotBytes(snapshot) > WIDGET_BUDGET_BYTES) {
    return Promise.reject(new Error('Widget snapshot is over its size budget'));
  }
  return run('readwrite', (store) => {
    store.clear();
    store.put(snapshot, KEY);
  });
}

export const loadSnapshot = () => run('readonly', (store) => store.get(KEY));

export const countRecords = () => run('readonly', (store) => store.count());

const two = (n) => String(n).padStart(2, '0');
const at = (base, time) => {
  const [h, m] = time.split(':').map(Number);
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m);
};

/** The next class occurrences from `now`, across the coming week, including one in progress. */
export function upcomingClasses(snapshot, now, limit = 4) {
  if (!snapshot) return [];
  const todayIndex = (now.getDay() + 6) % 7; // Monday = 0
  const found = [];
  for (let offset = 0; offset <= 7 && found.length < limit; offset += 1) {
    const dayIndex = (todayIndex + offset) % 7;
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const day = snapshot.c.filter((x) => x[0] === dayIndex).sort((a, b) => a[1].localeCompare(b[1]));
    for (const [, start, end, code, name, venue] of day) {
      const startAt = at(base, start);
      const endAt = at(base, end);
      if (endAt <= now) continue;
      found.push({ offset, day: WEEK[dayIndex], start, end, code, name, venue, ongoing: startAt <= now });
      if (found.length === limit) break;
    }
  }
  return found;
}

const whenLabel = (item) => {
  if (item.ongoing) return 'Now';
  if (item.offset === 0) return item.start;
  if (item.offset === 1) return `Tmrw ${item.start}`;
  return `${item.day.slice(0, 3)} ${item.start}`;
};

/** Everything a widget card shows, as plain strings, ready for the Adaptive Card template. */
export function widgetData(snapshot, now) {
  const empty = { headline: 'ClassFlow', title: 'No classes yet', detail: 'Open ClassFlow to add your timetable.', later: [], deadline: '' };
  if (!snapshot || snapshot.c.length === 0) return { ...empty, deadline: deadlineLine(snapshot, now) };

  const [first, ...rest] = upcomingClasses(snapshot, now, 4);
  let headline = 'Next';
  if (first.ongoing) headline = `Now, until ${first.end}`;
  else if (first.offset === 0) headline = `Next at ${first.start}`;
  else if (first.offset === 1) headline = `Tomorrow at ${first.start}`;
  else headline = `${first.day} at ${first.start}`;

  return {
    headline,
    title: first.name,
    detail: first.venue ? `${first.code} in ${first.venue}` : first.code,
    later: rest.map((item) => ({ when: whenLabel(item), name: item.name })),
    deadline: deadlineLine(snapshot, now),
  };
}

function deadlineLine(snapshot, now) {
  const next = snapshot?.d.find(([due]) => due > now.getTime());
  if (!next) return '';
  const due = new Date(next[0]);
  const date = `${due.getDate()} ${due.toLocaleDateString('en-GB', { month: 'short' })}, ${two(due.getHours())}:${two(due.getMinutes())}`;
  return `Due ${date}: ${next[1]}`;
}

/** Classes still to come or in progress today, for the app icon badge. */
export const classesLeftToday = (snapshot, now) =>
  upcomingClasses(snapshot, now, MAX_CLASSES).filter((item) => item.offset === 0).length;

/** Adaptive Card template for the Windows 11 Widgets board. */
export const WIDGET_TEMPLATE = {
  type: 'AdaptiveCard',
  $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
  version: '1.5',
  body: [
    { type: 'TextBlock', text: '${headline}', size: 'Small', weight: 'Bolder', color: 'Accent' },
    { type: 'TextBlock', text: '${title}', size: 'Large', weight: 'Bolder', wrap: true, spacing: 'Small' },
    { type: 'TextBlock', text: '${detail}', isSubtle: true, wrap: true, spacing: 'None' },
    {
      type: 'Container',
      $when: '${count(later) > 0}',
      separator: true,
      spacing: 'Medium',
      items: [
        {
          type: 'ColumnSet',
          $data: '${later}',
          columns: [
            { type: 'Column', width: 'auto', items: [{ type: 'TextBlock', text: '${when}', size: 'Small', weight: 'Bolder' }] },
            { type: 'Column', width: 'stretch', items: [{ type: 'TextBlock', text: '${name}', size: 'Small' }] },
          ],
        },
      ],
    },
    { type: 'TextBlock', $when: "${deadline != ''}", text: '${deadline}', size: 'Small', color: 'Attention', wrap: true, spacing: 'Medium' },
  ],
  actions: [{ type: 'Action.Execute', title: 'Open ClassFlow', verb: 'open' }],
};
