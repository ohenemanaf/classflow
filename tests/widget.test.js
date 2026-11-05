import 'fake-indexeddb/auto';
import * as ACData from 'adaptivecards-templating';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  classesLeftToday,
  countRecords,
  loadSnapshot,
  saveSnapshot,
  snapshotBytes,
  toSnapshot,
  upcomingClasses,
  WIDGET_BUDGET_BYTES,
  WIDGET_TEMPLATE,
  widgetData,
} from '../src/widget/core.js';

// 2026-11-05 is a Thursday.
const NOW = new Date('2026-11-05T10:47:12');

const cls = (id, day, startTime, endTime, courseName, extra = {}) => ({
  id,
  day,
  startTime,
  endTime,
  courseCode: `C${id}`,
  courseName,
  lecturer: 'Dr. Secret Lecturer',
  venue: `Room ${id}`,
  ...extra,
});

const classes = [
  cls(1, 'Thursday', '08:00', '09:30', 'Software Engineering'),
  cls(2, 'Thursday', '10:00', '12:00', 'Network Security'),
  cls(3, 'Thursday', '13:00', '15:00', 'Discrete Mathematics'),
  cls(4, 'Thursday', '15:30', '17:00', 'Database Systems'),
  cls(5, 'Monday', '09:00', '11:00', 'Software Engineering'),
];
const deadlines = [
  { id: 1, title: 'Lab Sheet 3', courseCode: 'C4', type: 'Assignment', date: '2026-10-28', time: '17:00', venue: '' },
  { id: 2, title: 'Chapter 1-4 Test', courseCode: 'C2', type: 'Midterm', date: '2026-11-06', time: '09:00', venue: 'Hall' },
];

const snapshot = () => toSnapshot({ name: 'Ama Mensah', classes, deadlines, now: NOW });

describe('snapshot pruning', () => {
  it('keeps only what the widget shows', () => {
    const json = JSON.stringify(snapshot());
    expect(json).not.toContain('Secret Lecturer');
    expect(json).not.toContain('Hall');
    expect(json).not.toContain('Lab Sheet 3'); // already past
    expect(json).toContain('Chapter 1-4 Test');
    expect(snapshot().n).toBe('Ama');
  });

  it('stays far under its budget even at the size caps', () => {
    const long = 'Ɛ'.repeat(500);
    const many = Array.from({ length: 400 }, (_, i) => cls(i, 'Friday', '08:00', '09:00', long, { venue: long, courseCode: long }));
    const lots = Array.from({ length: 400 }, (_, i) => ({ id: i, title: long, courseCode: long, date: '2027-01-01', time: '09:00' }));
    const big = toSnapshot({ name: long, classes: many, deadlines: lots, now: NOW });
    expect(big.c).toHaveLength(100);
    expect(big.d).toHaveLength(30);
    expect(snapshotBytes(big)).toBeLessThan(WIDGET_BUDGET_BYTES);
    expect(WIDGET_BUDGET_BYTES).toBeLessThan(1024 * 1024);
  });

  it('drops malformed classes instead of breaking the widget', () => {
    const bad = toSnapshot({ name: 'x', classes: [cls(9, 'Funday', '08:00', '09:00', 'X'), cls(8, 'Monday', 'soon', '09:00', 'Y')], deadlines: [], now: NOW });
    expect(bad.c).toEqual([]);
  });
});

describe('IndexedDB storage', () => {
  beforeEach(async () => {
    await saveSnapshot(toSnapshot({ name: '', classes: [], deadlines: [], now: NOW }));
  });

  it('round-trips the snapshot', async () => {
    await saveSnapshot(snapshot());
    expect(await loadSnapshot()).toEqual(snapshot());
  });

  it('purges deleted classes on the next save and keeps a single record', async () => {
    await saveSnapshot(snapshot());
    const withoutNetwork = classes.filter((c) => c.id !== 2);
    await saveSnapshot(toSnapshot({ name: 'Ama', classes: withoutNetwork, deadlines, now: NOW }));
    const stored = await loadSnapshot();
    expect(JSON.stringify(stored)).not.toContain('Network Security');
    expect(await countRecords()).toBe(1);
  });

  it('clearing the schedule leaves nothing behind', async () => {
    await saveSnapshot(snapshot());
    await saveSnapshot(toSnapshot({ name: 'Ama', classes: [], deadlines: [], now: NOW }));
    const stored = await loadSnapshot();
    expect(stored.c).toEqual([]);
    expect(stored.d).toEqual([]);
  });

  it('refuses a snapshot over budget', async () => {
    const huge = { v: 1, n: 'x'.repeat(WIDGET_BUDGET_BYTES), c: [], d: [], u: 0 };
    await expect(saveSnapshot(huge)).rejects.toThrow(/budget/);
  });
});

describe('widget content', () => {
  it('lists the class in progress first, then the rest in order across the week', () => {
    const list = upcomingClasses(snapshot(), NOW, 4);
    expect(list.map((x) => x.name)).toEqual(['Network Security', 'Discrete Mathematics', 'Database Systems', 'Software Engineering']);
    expect(list[0].ongoing).toBe(true);
    expect(list[3]).toMatchObject({ day: 'Monday', offset: 4 });
  });

  it('describes the current class and what comes next', () => {
    const data = widgetData(snapshot(), NOW);
    expect(data.headline).toBe('Now, until 12:00');
    expect(data.title).toBe('Network Security');
    expect(data.detail).toBe('C2 in Room 2');
    expect(data.later).toEqual([
      { when: '13:00', name: 'Discrete Mathematics' },
      { when: '15:30', name: 'Database Systems' },
      { when: 'Mon 09:00', name: 'Software Engineering' },
    ]);
    expect(data.deadline).toBe('Due 6 Nov, 09:00: Chapter 1-4 Test');
  });

  it('looks ahead to tomorrow once today is over', () => {
    const late = new Date('2026-11-05T18:00');
    const tomorrow = toSnapshot({ name: 'A', classes: [...classes, cls(6, 'Friday', '08:00', '09:00', 'Ethics')], deadlines: [], now: late });
    expect(widgetData(tomorrow, late).headline).toBe('Tomorrow at 08:00');
  });

  it('invites the user in when there is no timetable', () => {
    expect(widgetData(null, NOW).title).toBe('No classes yet');
  });

  it('counts the classes left today for the icon badge', () => {
    expect(classesLeftToday(snapshot(), NOW)).toBe(3);
    expect(classesLeftToday(snapshot(), new Date('2026-11-05T18:00'))).toBe(0);
  });
});

describe('Windows widget template', () => {
  const expand = (data) => new ACData.Template(WIDGET_TEMPLATE).expand({ $root: data });

  it('binds the data into a valid Adaptive Card', () => {
    const card = expand(widgetData(snapshot(), NOW));
    expect(card.type).toBe('AdaptiveCard');
    expect(card.body[0].text).toBe('Now, until 12:00');
    expect(card.body[1].text).toBe('Network Security');
    expect(card.body[3].items).toHaveLength(3);
    expect(card.body[3].items[2].columns[1].items[0].text).toBe('Software Engineering');
    expect(card.body[4].text).toBe('Due 6 Nov, 09:00: Chapter 1-4 Test');
  });

  it('hides the list and deadline rows when they are empty', () => {
    const card = expand(widgetData(null, NOW));
    expect(card.body).toHaveLength(3);
    expect(card.body[1].text).toBe('No classes yet');
  });
});
