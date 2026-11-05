import { describe, expect, it } from 'vitest';
import { buildSampleData } from '../src/lib/sample.js';
import { findConflict, getCountdown, getDayStatus, toMinutes } from '../src/lib/schedule.js';

const at = (iso) => new Date(iso);
// Thursday morning, Thursday mid-afternoon, Saturday, and very early / very late on a weekday.
const MOMENTS = ['2026-11-05T10:47:12', '2026-11-05T15:05:00', '2026-11-07T11:00:00', '2026-11-09T03:00:00', '2026-11-10T23:30:00'];

describe('sample timetable', () => {
  it.each(MOMENTS)('has no clashing classes at %s', (moment) => {
    const { classes } = buildSampleData(at(moment));
    for (const cls of classes) {
      expect(findConflict(classes, cls)).toBeUndefined();
      expect(toMinutes(cls.endTime)).toBeGreaterThan(toMinutes(cls.startTime));
    }
  });

  it.each(MOMENTS)('gives every class and deadline a unique id at %s', (moment) => {
    const { classes, deadlines } = buildSampleData(at(moment));
    const ids = [...classes, ...deadlines].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('shows a class in progress during the day', () => {
    const now = at('2026-11-05T10:47:12');
    const { classes } = buildSampleData(now);
    expect(getDayStatus(classes, now)).toMatchObject({ type: 'ongoing' });
  });

  it('fills the rest of the working week', () => {
    const { classes } = buildSampleData(at('2026-11-05T10:47:12'));
    const days = new Set(classes.map((c) => c.day));
    expect([...days].sort()).toEqual(['Friday', 'Monday', 'Thursday', 'Tuesday', 'Wednesday']);
  });

  it.each(MOMENTS)('gives every day a different set of classes at %s', (moment) => {
    const { classes } = buildSampleData(at(moment));
    const byDay = {};
    for (const c of classes) (byDay[c.day] ??= []).push(c.courseCode);
    const sets = Object.values(byDay).map((codes) => codes.sort().join('+'));
    expect(new Set(sets).size).toBe(sets.length);
  });

  it('includes an urgent deadline, later ones, and one already completed', () => {
    const now = at('2026-11-05T10:47:12');
    const states = buildSampleData(now).deadlines.map((d) => getCountdown(d, now));
    expect(states.filter((s) => s.expired)).toHaveLength(1);
    expect(states.filter((s) => s.isUrgent)).toHaveLength(1);
    expect(states.filter((s) => !s.expired)).toHaveLength(4);
  });
});
