import { DAYS } from './schedule.js';

const TIME = /^\d{1,2}:\d{2}$/;

const toBase64 = (text) => {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (encoded) =>
  new TextDecoder().decode(Uint8Array.from(atob(encoded), (ch) => ch.charCodeAt(0)));

/** Packs a timetable into the compact `?sync=` payload used since v1. */
export function encodeSchedule(name, classes) {
  const t = classes.map((c) => [
    DAYS.indexOf(c.day),
    c.startTime,
    c.endTime,
    c.courseCode,
    c.venue,
    c.courseName,
    c.lecturer,
  ]);
  return toBase64(JSON.stringify({ n: name?.split(' ')[0] || 'A student', t }));
}

export const buildShareUrl = (base, name, classes) =>
  `${base}?sync=${encodeURIComponent(encodeSchedule(name, classes))}`;

const clean = (value) => (value === null || value === undefined ? '' : String(value));

/**
 * Reads a `?sync=` value from either generation of link. Throws on anything malformed:
 * these links come from other people, so nothing about their contents is assumed.
 */
export function decodeSchedule(raw) {
  // v1 links left the base64 unescaped, so URLSearchParams turned each "+" into a space.
  const data = JSON.parse(fromBase64(raw.replace(/ /g, '+')));
  const rows = data.t
    ? data.t.map((row) => ({
        day: DAYS[row[0]],
        startTime: row[1],
        endTime: row[2],
        courseCode: row[3],
        venue: row[4],
        courseName: row[5],
        lecturer: row[6],
      }))
    : data.timetable;

  if (!Array.isArray(rows)) throw new Error('No timetable in link');
  const timetable = rows.map((row) => {
    if (!DAYS.includes(row.day) || !TIME.test(row.startTime) || !TIME.test(row.endTime)) {
      throw new Error('Malformed class in link');
    }
    return {
      day: row.day,
      startTime: row.startTime,
      endTime: row.endTime,
      courseCode: clean(row.courseCode),
      venue: clean(row.venue),
      courseName: clean(row.courseName),
      lecturer: clean(row.lecturer),
    };
  });
  return { name: clean(data.n || data.name) || 'A friend', timetable };
}
