import { DAYS, getCountdown } from './schedule.js';

// Builds an iCalendar (.ics) file, the format every phone calendar can import.
// Times are "floating" (no timezone), so 09:00 means 09:00 wherever the phone is,
// exactly as it does inside ClassFlow.

const pad = (n) => String(n).padStart(2, '0');

const localStamp = (date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;

const utcStamp = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Text values must escape backslashes, semicolons, commas and newlines (RFC 5545 §3.3.11). */
const escapeText = (value = '') =>
  String(value).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 bytes must be folded, without splitting a multi-byte character. */
function fold(line) {
  const encoder = new TextEncoder();
  const parts = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** The first date on or after `from` that falls on `day`, at the given HH:MM. */
export function nextOccurrence(day, time, from) {
  const [hours, minutes] = time.split(':').map(Number);
  const targetJsDay = (DAYS.indexOf(day) + 1) % 7; // DAYS starts on Monday; getDay() on Sunday
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate(), hours, minutes);
  date.setDate(date.getDate() + ((targetJsDay - from.getDay() + 7) % 7));
  return date;
}

const alarm = (trigger, description) => [
  'BEGIN:VALARM',
  'ACTION:DISPLAY',
  `DESCRIPTION:${escapeText(description)}`,
  `TRIGGER:${trigger}`,
  'END:VALARM',
];

/**
 * Returns the .ics text and how many events it holds. Classes repeat weekly; deadlines
 * that have already passed are left out. UIDs are stable, so a calendar that supports
 * updates can recognise an event it has seen before.
 */
export function buildCalendar({ classes, deadlines, now, semester }) {
  const stamp = utcStamp(now);
  // With a semester, classes start no earlier than its first day and stop repeating after
  // its last day. UNTIL is a local time because DTSTART is (RFC 5545 §3.3.10).
  const semesterStart = semester && new Date(`${semester.start}T00:00:00`);
  const semesterEnd = semester && new Date(`${semester.end}T23:59:59`);
  const from = semesterStart && semesterStart > now ? semesterStart : now;
  const repeat = semester ? `RRULE:FREQ=WEEKLY;UNTIL=${semester.end.replaceAll('-', '')}T235959` : 'RRULE:FREQ=WEEKLY';
  let classCount = 0;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ClassFlow//Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:ClassFlow',
  ];

  for (const cls of classes) {
    const start = nextOccurrence(cls.day, cls.startTime, from);
    const end = nextOccurrence(cls.day, cls.endTime, start);
    if (semesterEnd && start > semesterEnd) continue; // never meets before the semester ends
    classCount += 1;
    lines.push(
      'BEGIN:VEVENT',
      `UID:classflow-class-${cls.id}@classflow.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${localStamp(start)}`,
      `DTEND:${localStamp(end)}`,
      repeat,
      `SUMMARY:${escapeText(`${cls.courseName} (${cls.courseCode})`)}`,
      `LOCATION:${escapeText(cls.venue)}`,
      `DESCRIPTION:${escapeText(cls.lecturer ? `Lecturer: ${cls.lecturer}` : '')}`,
      ...alarm('-PT15M', `${cls.courseCode} starts in 15 minutes at ${cls.venue}`),
      ...alarm('PT0S', `${cls.courseCode} is starting at ${cls.venue}`),
      'END:VEVENT',
    );
  }

  const upcoming = deadlines.filter((d) => !getCountdown(d, now).expired);
  for (const deadline of upcoming) {
    const due = new Date(`${deadline.date}T${deadline.time}`);
    lines.push(
      'BEGIN:VEVENT',
      `UID:classflow-deadline-${deadline.id}@classflow.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${localStamp(due)}`,
      'DURATION:PT1H',
      `SUMMARY:${escapeText(`${deadline.type}: ${deadline.title} (${deadline.courseCode})`)}`,
      ...(deadline.venue ? [`LOCATION:${escapeText(deadline.venue)}`] : []),
      ...alarm('-P1D', `${deadline.title} is due tomorrow`),
      ...alarm('-PT1H', `${deadline.title} is due in 1 hour`),
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return {
    text: `${lines.map(fold).join('\r\n')}\r\n`,
    count: classCount + upcoming.length,
    classCount,
    deadlineCount: upcoming.length,
  };
}
