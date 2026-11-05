export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DEADLINE_TYPES = ['Midterm', 'Final Exam', 'Assignment', 'Project', 'Quiz'];

export const weekdayName = (date) => date.toLocaleDateString('en-US', { weekday: 'long' });

export const toMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const byStartTime = (a, b) => a.startTime.localeCompare(b.startTime);

export const classesOn = (classes, day) => classes.filter((c) => c.day === day).sort(byStartTime);

/** Returns the existing class that overlaps `draft`, ignoring `draft` itself. */
export function findConflict(classes, draft) {
  const start = toMinutes(draft.startTime);
  const end = toMinutes(draft.endTime);
  return classes.find((c) => {
    if ((draft.id && c.id === draft.id) || c.day !== draft.day) return false;
    return start < toMinutes(c.endTime) && end > toMinutes(c.startTime);
  });
}

/** Formats a duration the way the countdowns read: "1d 2h 3m 4s", dropping leading zeros. */
export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  let out = '';
  if (days > 0) out += `${days}d `;
  if (hours > 0 || days > 0) out += `${hours}h `;
  if (minutes > 0 || hours > 0 || days > 0) out += `${minutes}m `;
  return `${out}${seconds}s`;
}

/** What is happening today right now: free | ongoing | upcoming | done. */
export function getDayStatus(classes, now) {
  const today = classesOn(classes, weekdayName(now));
  if (today.length === 0) return { type: 'free' };
  const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  for (const cls of today) {
    const start = toMinutes(cls.startTime) * 60;
    const end = toMinutes(cls.endTime) * 60;
    if (nowSeconds >= start && nowSeconds < end) {
      return {
        type: 'ongoing',
        class: cls,
        secondsLeft: end - nowSeconds,
        progress: Math.min(100, ((nowSeconds - start) / (end - start)) * 100),
      };
    }
    if (nowSeconds < start) return { type: 'upcoming', class: cls, secondsLeft: start - nowSeconds };
  }
  return { type: 'done' };
}

/** The first class on a later day of the week, for when today has nothing left. */
export function findNextDayClass(classes, now) {
  const todayIndex = DAYS.indexOf(weekdayName(now));
  for (let offset = 1; offset <= 7; offset += 1) {
    const day = DAYS[(todayIndex + offset) % DAYS.length];
    const [first] = classesOn(classes, day);
    if (first) return { day, offset, class: first };
  }
  return null;
}

/** Alerts due at `now`: one when a class first comes within 15 minutes, one when it starts. */
export function getDueAlerts(classes, now) {
  const today = weekdayName(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const alerts = [];
  for (const cls of classes) {
    if (cls.day !== today) continue;
    const minutes = toMinutes(cls.startTime) - nowMinutes;
    if (minutes > 0 && minutes <= 15) {
      alerts.push({ key: `${cls.id}_${now.toDateString()}_15min`, class: cls, minutes });
    } else if (minutes === 0) {
      alerts.push({ key: `${cls.id}_${now.toDateString()}_start`, class: cls, minutes });
    }
  }
  return alerts;
}

export const deadlineDate = (deadline) => new Date(`${deadline.date}T${deadline.time}`);

export function getCountdown(deadline, now) {
  const ms = deadlineDate(deadline) - now;
  if (ms < 0) return { expired: true, text: 'Completed' };
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  return {
    expired: false,
    days,
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    text: formatDuration(total),
    isUrgent: days === 0,
  };
}

export const sortDeadlines = (deadlines) =>
  [...deadlines].sort((a, b) => deadlineDate(a) - deadlineDate(b));

/** YYYY-MM-DD in the device's own timezone. */
export function localDateString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A stable colour for a course, so it looks the same on every day it appears. */
export function toneFor(courseCode = '') {
  const code = courseCode.trim().toUpperCase();
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return `tone-${hash % 6}`;
}
