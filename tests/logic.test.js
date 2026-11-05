import { describe, expect, it } from 'vitest';
import {
  findConflict,
  findNextDayClass,
  formatDuration,
  getCountdown,
  getDayStatus,
  getDueAlerts,
  toneFor,
} from '../src/lib/schedule.js';
import { buildShareUrl, decodeSchedule, encodeSchedule } from '../src/lib/sync.js';

const cls = (over = {}) => ({
  id: 1,
  day: 'Thursday',
  startTime: '10:00',
  endTime: '12:00',
  courseCode: 'CSSD 218',
  courseName: 'Software Engineering',
  lecturer: 'Mr. Shaibu',
  venue: 'C5',
  ...over,
});

// 2026-11-05 is a Thursday.
const at = (time) => new Date(`2026-11-05T${time}`);

// The exact encoder from the deployed v1 bundle, so real links in the wild are covered.
const v1Encode = (name, classes) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const t = classes.map((e) => [
    days.indexOf(e.day), e.startTime, e.endTime, e.courseCode, e.venue, e.courseName, e.lecturer,
  ]);
  return btoa(unescape(encodeURIComponent(JSON.stringify({ n: name, t }))));
};

describe('day status', () => {
  it('reports a free day', () => {
    expect(getDayStatus([cls({ day: 'Monday' })], at('09:00')).type).toBe('free');
  });
  it('counts down to the next class', () => {
    const status = getDayStatus([cls()], at('09:59:30'));
    expect(status).toMatchObject({ type: 'upcoming', secondsLeft: 30 });
  });
  it('reports progress through an ongoing class', () => {
    const status = getDayStatus([cls()], at('11:00:00'));
    expect(status.type).toBe('ongoing');
    expect(status.progress).toBe(50);
    expect(status.secondsLeft).toBe(3600);
  });
  it('treats the end time as finished', () => {
    expect(getDayStatus([cls()], at('12:00:00')).type).toBe('done');
  });
  it('picks the earliest class regardless of insertion order', () => {
    const status = getDayStatus(
      [cls({ id: 2, startTime: '14:00', endTime: '15:00' }), cls()],
      at('08:00'),
    );
    expect(status.class.id).toBe(1);
  });
});

describe('next-day lookup', () => {
  it('wraps around the week', () => {
    const next = findNextDayClass([cls({ day: 'Monday' })], at('09:00'));
    expect(next).toMatchObject({ day: 'Monday', offset: 4 });
  });
  it('finds the same weekday next week when it is the only one', () => {
    expect(findNextDayClass([cls()], at('13:00'))).toMatchObject({ day: 'Thursday', offset: 7 });
  });
  it('returns null for an empty timetable', () => {
    expect(findNextDayClass([], at('09:00'))).toBeNull();
  });
});

describe('conflicts', () => {
  const existing = [cls()];
  it('catches an overlap', () => {
    expect(findConflict(existing, cls({ id: 2, startTime: '11:00', endTime: '13:00' }))).toBeTruthy();
  });
  it('allows back-to-back classes', () => {
    expect(findConflict(existing, cls({ id: 2, startTime: '12:00', endTime: '13:00' }))).toBeUndefined();
  });
  it('ignores other days', () => {
    expect(findConflict(existing, cls({ id: 2, day: 'Friday' }))).toBeUndefined();
  });
  it('does not conflict with itself when editing', () => {
    expect(findConflict(existing, cls())).toBeUndefined();
  });
});

describe('alerts', () => {
  it('stays quiet more than 15 minutes out', () => {
    expect(getDueAlerts([cls()], at('09:44'))).toEqual([]);
  });
  it('alerts inside the 15 minute window', () => {
    expect(getDueAlerts([cls()], at('09:45'))[0]).toMatchObject({ minutes: 15 });
  });
  it('uses one key across the window so it only fires once', () => {
    const [a] = getDueAlerts([cls()], at('09:45'));
    const [b] = getDueAlerts([cls()], at('09:50'));
    expect(a.key).toBe(b.key);
  });
  it('alerts again at the start, then stops', () => {
    expect(getDueAlerts([cls()], at('10:00'))[0].key).toMatch(/_start$/);
    expect(getDueAlerts([cls()], at('10:01'))).toEqual([]);
  });
});

describe('countdown', () => {
  const deadline = { date: '2026-11-06', time: '09:00' };
  it('marks under a day as urgent', () => {
    expect(getCountdown(deadline, at('18:00:00'))).toMatchObject({ isUrgent: true, days: 0, hours: 15 });
  });
  it('marks past deadlines as expired', () => {
    expect(getCountdown({ date: '2026-11-05', time: '09:00' }, at('10:00')).expired).toBe(true);
  });
  it('formats durations without leading zero units', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(3605)).toBe('1h 0m 5s');
    expect(formatDuration(90061)).toBe('1d 1h 1m 1s');
  });
});

describe('course colours', () => {
  it('match regardless of case or spacing', () => {
    expect(toneFor(' cssd 218')).toBe(toneFor('CSSD 218'));
  });
});

describe('share links', () => {
  const read = (url) => new URL(url).searchParams.get('sync');

  it('round-trips a timetable', () => {
    const url = buildShareUrl('https://x.test/', 'Ama Mensah', [cls()]);
    const { name, timetable } = decodeSchedule(read(url));
    expect(name).toBe('Ama');
    expect(timetable[0]).toMatchObject({ day: 'Thursday', courseCode: 'CSSD 218', venue: 'C5' });
  });

  it('survives non-ASCII text such as Ghanaian names', () => {
    const url = buildShareUrl('https://x.test/', 'Ɛfua', [cls({ lecturer: 'Dr. Ɔwusu — ~>>' })]);
    const { name, timetable } = decodeSchedule(read(url));
    expect(name).toBe('Ɛfua');
    expect(timetable[0].lecturer).toBe('Dr. Ɔwusu — ~>>');
  });

  it('reads links generated by the deployed v1 app', () => {
    const raw = v1Encode('Kofi', [cls()]);
    expect(decodeSchedule(raw).timetable[0].courseName).toBe('Software Engineering');
  });

  it('repairs v1 links whose "+" was turned into a space', () => {
    const raw = v1Encode('Kofi', [cls({ lecturer: 'Dr. Ɔwusu ~>~>~>' })]);
    expect(raw).toContain('+');
    const asReceived = new URLSearchParams(`sync=${raw}`).get('sync');
    expect(asReceived).toContain(' ');
    expect(decodeSchedule(asReceived).timetable[0].lecturer).toBe('Dr. Ɔwusu ~>~>~>');
  });

  it('reads the older { name, timetable } format', () => {
    const raw = btoa(JSON.stringify({ name: 'Yaw', timetable: [cls()] }));
    expect(decodeSchedule(raw).name).toBe('Yaw');
  });

  it('rejects malformed links rather than importing broken data', () => {
    expect(() => decodeSchedule('not base64!')).toThrow();
    expect(() => decodeSchedule(btoa('{"n":"x"}'))).toThrow();
    expect(() => decodeSchedule(btoa(JSON.stringify({ n: 'x', t: [[9, '08:00', '09:00']] })))).toThrow();
    expect(() => decodeSchedule(btoa(JSON.stringify({ n: 'x', t: [[0, 5, null]] })))).toThrow();
  });

  it('encodes to the v1 wire format so older copies can still read it', () => {
    expect(encodeSchedule('Kofi', [cls()])).toBe(v1Encode('Kofi', [cls()]));
  });
});
