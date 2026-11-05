import ICAL from 'ical.js';
import { describe, expect, it } from 'vitest';
import { buildCalendar, nextOccurrence } from '../src/lib/calendar.js';

// 2026-11-05 is a Thursday.
const NOW = new Date('2026-11-05T10:47:12');

const cls = (over = {}) => ({
  id: 1,
  day: 'Monday',
  startTime: '09:00',
  endTime: '11:00',
  courseCode: 'CSSD 218',
  courseName: 'Software Engineering',
  lecturer: 'Mr. Shaibu',
  venue: 'C5',
  ...over,
});

const deadline = (over = {}) => ({
  id: 7,
  title: 'Chapter 1-4 Test',
  courseCode: 'CSNS 242',
  type: 'Midterm',
  date: '2026-11-06',
  time: '09:00',
  venue: 'C15',
  ...over,
});

/** Parses with a real iCalendar library, so malformed output fails loudly. */
const parse = (text) => new ICAL.Component(ICAL.parse(text)).getAllSubcomponents('vevent');

describe('next occurrence', () => {
  it('finds the coming Monday from a Thursday', () => {
    expect(nextOccurrence('Monday', '09:00', NOW)).toEqual(new Date('2026-11-09T09:00:00'));
  });
  it('uses today when the class is on today’s weekday', () => {
    expect(nextOccurrence('Thursday', '08:00', NOW)).toEqual(new Date('2026-11-05T08:00:00'));
  });
  it('handles Sunday, which JavaScript numbers as 0', () => {
    expect(nextOccurrence('Sunday', '14:30', NOW)).toEqual(new Date('2026-11-08T14:30:00'));
  });
});

describe('calendar file', () => {
  it('is valid iCalendar that a real parser accepts', () => {
    const { text, count } = buildCalendar({ classes: [cls()], deadlines: [deadline()], now: NOW });
    expect(parse(text)).toHaveLength(2);
    expect(count).toBe(2);
  });

  it('uses CRLF line endings and keeps every line within 75 bytes', () => {
    const longName = 'Ɔdeɛ Ɛkuo '.repeat(20);
    const { text } = buildCalendar({ classes: [cls({ courseName: longName })], deadlines: [], now: NOW });
    expect(text.endsWith('\r\n')).toBe(true);
    expect(text.replace(/\r\n/g, '')).not.toMatch(/\n/);
    for (const line of text.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    const [event] = parse(text);
    expect(event.getFirstPropertyValue('summary')).toBe(`${longName} (CSSD 218)`);
  });

  it('makes each class a weekly event on the right day with two reminders', () => {
    const [event] = parse(buildCalendar({ classes: [cls()], deadlines: [], now: NOW }).text);
    expect(event.getFirstPropertyValue('dtstart').toString()).toBe('2026-11-09T09:00:00');
    expect(event.getFirstPropertyValue('dtend').toString()).toBe('2026-11-09T11:00:00');
    expect(event.getFirstPropertyValue('rrule').toString()).toBe('FREQ=WEEKLY');
    expect(event.getFirstPropertyValue('location')).toBe('C5');
    const triggers = event.getAllSubcomponents('valarm').map((a) => a.getFirstPropertyValue('trigger').toString());
    expect(triggers).toEqual(['-PT15M', 'PT0S']);
  });

  it('uses floating local times so 09:00 stays 09:00 on the phone', () => {
    const { text } = buildCalendar({ classes: [cls()], deadlines: [], now: NOW });
    expect(text).toContain('DTSTART:20261109T090000\r\n');
    expect(text).not.toMatch(/DTSTART:[^\r]*Z/);
  });

  it('escapes commas, semicolons and line breaks in names', () => {
    const tricky = 'Maths; Stats, and\nLogic \\ Proofs';
    const [event] = parse(buildCalendar({ classes: [cls({ venue: tricky })], deadlines: [], now: NOW }).text);
    expect(event.getFirstPropertyValue('location')).toBe(tricky);
  });

  it('adds upcoming deadlines with day-before and hour-before reminders', () => {
    const [event] = parse(buildCalendar({ classes: [], deadlines: [deadline()], now: NOW }).text);
    expect(event.getFirstPropertyValue('summary')).toBe('Midterm: Chapter 1-4 Test (CSNS 242)');
    expect(event.getFirstPropertyValue('dtstart').toString()).toBe('2026-11-06T09:00:00');
    const triggers = event.getAllSubcomponents('valarm').map((a) => a.getFirstPropertyValue('trigger').toString());
    expect(triggers).toEqual(['-P1D', '-PT1H']);
  });

  it('leaves out deadlines that have already passed', () => {
    const past = deadline({ id: 8, date: '2026-10-28' });
    const { text, count } = buildCalendar({ classes: [], deadlines: [past, deadline()], now: NOW });
    expect(parse(text)).toHaveLength(1);
    expect(count).toBe(1);
  });

  it('keeps the same event IDs on every export', () => {
    const a = buildCalendar({ classes: [cls()], deadlines: [deadline()], now: NOW }).text;
    const b = buildCalendar({ classes: [cls()], deadlines: [deadline()], now: new Date('2026-11-05T20:00') }).text;
    const uids = (t) => parse(t).map((e) => e.getFirstPropertyValue('uid'));
    expect(uids(a)).toEqual(uids(b));
    expect(new Set(uids(a)).size).toBe(2);
  });
});
