import { DAYS, localDateString, weekdayName } from './schedule.js';

// A realistic sample timetable, built around the current moment so the preview is live:
// today has a finished class, one in progress, and one still to come.

const COURSES = [
  ['CSSD 218', 'Fundamental Software Engineering', 'Mr. Adam Shaibu', 'C5'],
  ['CSNS 242', 'Network Security Fundamentals', 'Dr. Efua Owusu', 'Lab 2'],
  ['MATH 201', 'Discrete Mathematics', 'Prof. Kwame Boateng', 'A12'],
  ['CSIT 204', 'Database Systems', 'Mrs. Abena Asante', 'C15'],
  ['CSCD 216', 'Web Technologies', 'Mr. Yaw Darko', 'Lab 4'],
  ['AFST 201', 'African Studies', 'Dr. Nana Yaa Mensah', 'Main Hall'],
];

const pad = (n) => String(n).padStart(2, '0');
const time = (h, m = 0) => `${pad(h)}:${pad(m)}`;

// Each weekday's two classes: [course, start h, start m, end h, end m]. Every day differs.
const WEEK = {
  Monday: [[3, 8, 0, 10, 0], [4, 10, 30, 12, 30]],
  Tuesday: [[5, 10, 30, 12, 30], [0, 13, 30, 15, 30]],
  Wednesday: [[2, 8, 0, 10, 0], [1, 13, 30, 15, 30]],
  Thursday: [[0, 8, 0, 10, 0], [3, 10, 30, 12, 30]],
  Friday: [[4, 8, 0, 10, 0], [5, 13, 30, 15, 30]],
};

export function buildSampleData(now) {
  const today = weekdayName(now);
  // Keep today's three classes inside sensible hours even late at night or early morning.
  const base = Math.min(Math.max(now.getHours(), 9), 19);
  let id = now.getTime();
  const make = (course, day, start, end) => {
    const [courseCode, courseName, lecturer, venue] = COURSES[course];
    id += 1;
    return { id, day, startTime: start, endTime: end, courseCode, courseName, lecturer, venue };
  };

  const classes = [
    make(0, today, time(base - 3), time(base - 1, 30)),
    make(1, today, time(base), time(base + 2)),
    make(2, today, time(base + 2, 30), time(base + 4)),
  ];

  // Two classes on each other weekday (today gets the three above instead).
  for (const day of DAYS.slice(0, 5)) {
    if (day === today) continue;
    for (const [course, sh, sm, eh, em] of WEEK[day]) {
      classes.push(make(course, day, time(sh, sm), time(eh, em)));
    }
  }

  const inDays = (days, h, m = 0) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m);
    return { date: localDateString(date), time: time(h, m) };
  };
  const deadlines = [
    { title: 'Chapter 1-4 Test', courseCode: 'CSNS 242', type: 'Midterm', venue: 'C15', ...inDays(1, 9) },
    { title: 'Group Project Report', courseCode: 'CSSD 218', type: 'Project', venue: '', ...inDays(6, 23, 59) },
    { title: 'Web Portfolio', courseCode: 'CSCD 216', type: 'Assignment', venue: 'Online', ...inDays(11, 17) },
    { title: 'Final Exam', courseCode: 'MATH 201', type: 'Final Exam', venue: 'Main Hall', ...inDays(24, 8, 30) },
    { title: 'Lab Sheet 3', courseCode: 'CSIT 204', type: 'Assignment', venue: '', ...inDays(-3, 17) },
  ].map((deadline, i) => ({ id: now.getTime() + 100 + i, ...deadline }));

  return { classes, deadlines };
}
