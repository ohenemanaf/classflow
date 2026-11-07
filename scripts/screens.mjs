// End-to-end check of the built app in real Chrome at phone size, saving screenshots to
// ./screens. Run `npm run build && npm run preview` first, then `npm run screens`.
// Third-party calls are stubbed or cut off, so this never sends real feedback.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const OUT = process.env.OUT_DIR || 'screens';
mkdirSync(OUT, { recursive: true });

const NOW = new Date('2026-11-05T10:47:12'); // A Thursday, in the middle of a class.
const profile = { name: 'Ama Mensah', program: 'Computer Science L200' };
const classes = [
  ['Thursday', '08:00', '09:30', 'CSSD 218', 'Fundamental Software Engineering', 'Mr. Adam Shaibu', 'C5'],
  ['Thursday', '10:00', '12:00', 'CSNS 242', 'Network Security Fundamentals', 'Dr. Efua Owusu', 'Lab 2'],
  ['Thursday', '13:00', '15:00', 'MATH 201', 'Discrete Mathematics', 'Prof. Kwame Boateng', 'A12'],
  ['Thursday', '15:30', '17:00', 'CSIT 204', 'Database Systems', 'Mrs. Abena Asante', 'C15'],
  ['Monday', '09:00', '11:00', 'CSSD 218', 'Fundamental Software Engineering', 'Mr. Adam Shaibu', 'C5'],
  ['Tuesday', '11:00', '13:00', 'MATH 201', 'Discrete Mathematics', 'Prof. Kwame Boateng', 'A12'],
].map(([day, startTime, endTime, courseCode, courseName, lecturer, venue], i) => ({
  id: i + 1, day, startTime, endTime, courseCode, courseName, lecturer, venue,
}));
const deadlines = [
  { id: 1, title: 'Chapter 1-4 Test', courseCode: 'CSNS 242', type: 'Midterm', date: '2026-11-06', time: '09:00', venue: 'C15' },
  { id: 2, title: 'Group Project Report', courseCode: 'CSSD 218', type: 'Project', date: '2026-11-19', time: '23:59', venue: '' },
  { id: 3, title: 'Final Exam', courseCode: 'MATH 201', type: 'Final Exam', date: '2026-12-08', time: '08:30', venue: 'Main Hall' },
  { id: 4, title: 'Lab Sheet 3', courseCode: 'CSIT 204', type: 'Assignment', date: '2026-10-28', time: '17:00', venue: '' },
];

const failures = [];
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures.push(name);
};

const seedScript = ([p, c, d]) => {
  if (!localStorage.getItem('classflow_profile')) {
    localStorage.setItem('classflow_profile', JSON.stringify(p));
    localStorage.setItem('gctu_timetable', JSON.stringify(c));
    localStorage.setItem('gctu_exams', JSON.stringify(d));
    localStorage.setItem('classflow_tour_done', '1');
  }
};

const browser = await chromium.launch({ channel: 'chrome' });

async function open({ colorScheme = 'light', seed = true, url = BASE, permissions, reducedMotion } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme,
    permissions,
    reducedMotion,
    // Requests a service worker handles can skip the stubs below, and the stub is what stops
    // this script sending real feedback. The offline check further down uses its own context.
    serviceWorkers: 'block',
  });
  await context.route(/api\.dicebear\.com/, (r) => r.abort());
  await context.route(/api\.web3forms\.com/, (r) => r.fulfill({ json: { success: true } }));
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  await page.clock.install({ time: NOW });
  if (seed) await page.addInitScript(seedScript, [profile, classes, deadlines]);
  await page.goto(url);
  await page.waitForLoadState('networkidle').catch(() => {});
  return page;
}

const shot = (page, name, fullPage = false) =>
  page.screenshot({ path: `${OUT}/${name}.png`, fullPage, animations: 'disabled' });

const visible = async (locator, timeout = 3000) => {
  await locator.first().waitFor({ timeout }).catch(() => {});
  return locator.first().isVisible();
};

{
  const page = await open();
  await shot(page, 'home-classes');
  await shot(page, 'home-classes-full', true);
  await page.getByRole('tab', { name: 'Deadlines' }).click();
  await shot(page, 'home-deadlines', true);
  await page.getByRole('button', { name: 'Add deadline' }).click();
  await shot(page, 'deadline-form');
  await page.context().close();
}

// Look: light canvas even in dark mode, frosted glass on the main surfaces.
{
  const page = await open({ colorScheme: 'dark' });
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('light background even when the phone is in dark mode', background === 'rgb(242, 242, 247)');
  const blur = (selector) =>
    page.evaluate((s) => getComputedStyle(document.querySelector(s)).backdropFilter, selector);
  check('profile card is frosted glass', (await blur('[aria-label="Profile"]')).includes('blur'));
  check('segmented control is frosted glass', (await blur('[role="tablist"]')).includes('blur'));
  check('hero card is frosted glass', (await blur('[aria-label="Current class"]')).includes('blur'));
  await page.context().close();
}

// Core flows.
{
  const page = await open();
  check('profile shows name and program', await visible(page.getByRole('heading', { name: 'Ama Mensah' })) && (await page.getByText('Computer Science L200').isVisible()));
  check('Classes tab is selected first', (await page.getByRole('tab', { name: 'Classes' }).getAttribute('aria-selected')) === 'true');
  const hero = page.getByRole('region', { name: 'Current class' });
  check('hero shows the class in progress', await hero.getByText('Now', { exact: true }).isVisible());
  check('hero counts down timer-style', /^Time remaining 1:12:4[0-8]$/.test(await hero.getByRole('timer').getAttribute('aria-label'))); // the test clock runs while the page loads
  check('week list starts with today', await page.getByRole('heading', { name: 'Today', exact: true }).isVisible());
  const current = page.getByRole('button', { name: 'Edit Network Security Fundamentals' });
  check('current session is highlighted', (await current.getAttribute('aria-current')) === 'time');
  check('only one session is highlighted', (await page.locator('[aria-current="time"]').count()) === 1);
  check('class cards show the lecturer', await current.getByText('Dr. Efua Owusu').isVisible());
  check('class cards show the course code with an icon', (await current.locator('svg.lucide-hash').count()) === 1 && (await current.locator('svg.lucide-user-round').count()) === 1);
  check('progress bar sits on the countdown card', (await hero.getByRole('progressbar').count()) === 1);
  check('class cards have no progress bar', (await current.getByRole('progressbar').count()) === 0 && (await page.getByRole('progressbar').count()) === 1);
  check('class cards carry the open-book mark', (await current.locator('svg.lucide-book-open').count()) === 1);
  const backdrop = await page.locator('[data-ambient]').evaluate((el) => getComputedStyle(el).backgroundImage);
  check('background blends two colours', backdrop.includes('linear-gradient') && (backdrop.match(/rgb\(/g) || []).length === 2);
  check('study icons are patterned over the background', (await page.locator('[data-ambient] pattern svg').count()) === 8);
  const discrete = page.getByRole('button', { name: 'Edit Discrete Mathematics' }).first();
  check('touch screens get no hover lift', !(await page.evaluate(() => matchMedia('(hover: hover)').matches)));
  check(
    'Manrope is the font everywhere',
    await page.evaluate(() =>
      [document.body, document.querySelector('h1'), document.querySelector('button')].every((el) =>
        getComputedStyle(el).fontFamily.startsWith('"Manrope Variable"'),
      ),
    ),
  );

  check('later days are listed', await page.getByRole('heading', { name: 'Monday', exact: true }).isVisible());
  check('day selector is gone', (await page.getByRole('group', { name: 'Choose a day' }).count()) === 0);

  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  const form = page.getByRole('dialog');
  await shot(page, 'class-form');
  check('new class defaults to today', (await form.getByRole('radio', { name: 'Thursday' }).getAttribute('aria-checked')) === 'true');
  await form.getByRole('radio', { name: 'Monday' }).click();
  await form.getByLabel('Course code').fill('hist 101');
  await form.getByLabel('Venue').fill('B1');
  await form.getByLabel('Course name').fill('African Studies');
  await form.getByLabel('Lecturer').fill('Dr. Nana');
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  check('overlap is blocked with a reason', await visible(form.getByText(/overlaps Fundamental Software Engineering/)));
  await shot(page, 'class-conflict');
  await form.getByLabel('Starts').fill('14:00');
  await form.getByLabel('Ends').fill('13:00');
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  check('end before start is blocked', await visible(form.getByText('The class has to end after it starts.')));
  await form.getByLabel('Ends').fill('16:00');
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  check('class is added', await visible(page.getByRole('heading', { name: 'African Studies' })));

  await page.reload();
  check('class survives reload', await visible(page.getByRole('heading', { name: 'African Studies' })));

  await page.getByRole('button', { name: 'Edit African Studies' }).click();
  await page.getByRole('dialog').getByLabel('Lecturer').fill('Dr. Nana Yaa');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Edit African Studies' }).click();
  check('class can be edited', (await page.getByRole('dialog').getByLabel('Lecturer').inputValue()) === 'Dr. Nana Yaa');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.getByRole('button', { name: 'Edit African Studies' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete class' }).click();
  const alert = page.getByRole('alertdialog');
  await shot(page, 'confirm');
  await alert.getByRole('button', { name: 'Cancel' }).click();
  check('cancel keeps the edit sheet open', await page.getByRole('heading', { name: 'Edit Class' }).isVisible());
  await page.getByRole('dialog').getByRole('button', { name: 'Delete class' }).click();
  await alert.getByRole('button', { name: 'Delete class' }).click();
  check('class can be deleted', (await page.getByRole('heading', { name: 'African Studies' }).count()) === 0);
  check('all sheets closed after delete', (await page.getByRole('dialog').count()) === 0);

  await page.getByRole('tab', { name: 'Deadlines' }).click();
  check('segmented control switches to deadlines', (await page.getByRole('tab', { name: 'Deadlines' }).getAttribute('aria-selected')) === 'true');
  check('next deadline leads', await page.getByRole('region', { name: 'Next deadline' }).getByText('Chapter 1-4 Test').isVisible());
  check('next deadline is not repeated in the list', (await page.getByText('Chapter 1-4 Test').count()) === 1);
  check('deadline venue is shown', await page.getByText('Main Hall').isVisible());
  await page.locator('summary').click();
  check('completed deadlines expand', await visible(page.getByText('Lab Sheet 3')));
  await shot(page, 'deadlines-open', true);

  await page.getByRole('button', { name: 'More' }).click();
  await shot(page, 'settings');
  await page.getByRole('button', { name: 'Suggest a feature' }).click();
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Your suggestion').fill('Test message');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  check('feedback submits (stubbed)', await visible(page.getByRole('heading', { name: 'Thank you!' }), 5000));
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Share schedule' }).click();
  const qr = page.getByAltText('QR code linking to your schedule');
  check('QR is generated on-device', await visible(qr) && (await qr.getAttribute('src')).startsWith('data:image/png'));
  await shot(page, 'share');
  await page.keyboard.press('Escape');

  check('no uncaught errors', page.errors.length === 0);
  if (page.errors.length) console.log(page.errors);
  await page.context().close();
}

// Hover lift, on a device that can actually hover (a laptop with a mouse).
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  await context.route(/api\.dicebear\.com/, (r) => r.abort());
  const page = await context.newPage();
  await page.clock.install({ time: NOW });
  await page.addInitScript(seedScript, [profile, classes, deadlines]);
  await page.goto(BASE);
  const card = page.getByRole('button', { name: 'Edit Discrete Mathematics' }).first();
  const transformOf = () => card.evaluate((el) => getComputedStyle(el).transform);
  const before = await transformOf();
  await card.hover();
  await page.waitForTimeout(450);
  const during = await transformOf();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(900); // the book takes 0.65s to settle back
  check('cards lift on hover with a mouse', before === 'none' && during !== 'none');
  check('cards settle back after hover', (await transformOf()) === 'none');
  const book = card.locator('.book-mark');
  const bookBefore = await book.evaluate((el) => getComputedStyle(el).transform);
  await card.hover();
  await page.waitForTimeout(750);
  const bookDuring = await book.evaluate((el) => getComputedStyle(el).transform);
  check('open book slides and tilts on hover', bookBefore === 'none' && bookDuring !== 'none');
  const share = page.getByRole('button', { name: 'More' });
  await share.hover();
  await page.waitForTimeout(350);
  check('header buttons rise on hover', (await share.evaluate((el) => getComputedStyle(el).transform)) !== 'none');
  const fabIcon = page.locator('.fab-icon');
  await page.locator('.fab').hover();
  await page.waitForTimeout(450);
  check('+ icon turns on hover', (await fabIcon.evaluate((el) => getComputedStyle(el).transform)) !== 'none');
  await context.close();
}

// Add to calendar: downloads a real .ics file with every class and upcoming deadline.
{
  const page = await open();
  await page.getByRole('button', { name: 'More' }).click();
  await shot(page, 'settings-calendar');
  await page.getByRole('button', { name: 'Add to calendar' }).click();
  const sheet = page.getByRole('dialog');
  check('calendar asks for the semester first', await visible(sheet.getByLabel('Semester ends')));
  check('semester defaults to today', (await sheet.getByLabel('Semester starts').inputValue()) === '2026-11-05');
  check('removal steps are explained', await sheet.getByRole('heading', { name: 'Removing it later' }).isVisible());
  await sheet.getByLabel('Semester ends').fill('2026-11-01');
  check('an end before the start is refused', await sheet.getByRole('button', { name: 'Save calendar file' }).isDisabled());
  await sheet.getByLabel('Semester ends').fill('2027-02-04');
  check('semester length is spelled out', await sheet.getByText(/repeat every week for 13 weeks and stop after Thu, 4 February 2027/).isVisible());
  await shot(page, 'calendar-sheet');
  const downloading = page.waitForEvent('download');
  await sheet.getByRole('button', { name: 'Save calendar file' }).click();
  const download = await downloading;
  const { readFileSync } = await import('node:fs');
  const ics = readFileSync(await download.path(), 'utf8');
  check('calendar file has the right name', download.suggestedFilename() === 'classflow-schedule.ics');
  check('calendar file holds 6 classes and 3 upcoming deadlines', (ics.match(/BEGIN:VEVENT/g) || []).length === 9);
  check('calendar classes repeat weekly with reminders', ics.includes('RRULE:FREQ=WEEKLY') && ics.includes('TRIGGER:-PT15M'));
  check('calendar classes stop at the end of the semester', (ics.match(/RRULE:FREQ=WEEKLY;UNTIL=20270204T235959/g) || []).length === 6);
  check('semester is remembered', (await page.evaluate(() => JSON.parse(localStorage.getItem('classflow_semester')).end)) === '2027-02-04');
  check('calendar export confirms with a count', await visible(page.getByText(/add 9 events with reminders/)));
  check('settings closes after export', (await page.getByRole('dialog').count()) === 0);
  await page.context().close();
}

// First-launch walkthrough.
{
  const page = await open();
  await page.evaluate(() => localStorage.removeItem('classflow_tour_done'));
  await page.reload();
  const tip = page.locator('[data-coach] [role="dialog"]');
  const spot = page.locator('[data-coach-spotlight]');
  const titles = [];
  const aligned = [];
  for (let i = 0; i < 6; i += 1) {
    await tip.waitFor();
    await page.waitForTimeout(700); // let the spotlight glide and any scroll settle
    titles.push(await tip.getByRole('heading').textContent());
    const target = await page.evaluate((n) => {
      const el = document.querySelectorAll('[data-tour]');
      const name = ['countdown', 'class', 'tabs', 'add', 'alarms', 'more'][n];
      return document.querySelector(`[data-tour="${name}"]`).getBoundingClientRect().toJSON();
    }, i);
    const box = await spot.boundingBox();
    aligned.push(Math.abs(box.x + 6 - target.x) < 2 && Math.abs(box.y + 6 - target.y) < 2 && Math.abs(box.width - 12 - target.width) < 2);
    await shot(page, `tour-${i + 1}`);
    if (i === 0) check('tour counts its steps', await tip.getByText('1 of 6').isVisible());
    if (i === 0) check('Next has keyboard focus', await page.getByRole('button', { name: 'Next' }).evaluate((el) => el === document.activeElement));
    if (i === 1) {
      await tip.getByRole('button', { name: 'Back' }).click();
      check('Back returns to the previous step', await visible(tip.getByText('1 of 6')));
      await tip.getByRole('button', { name: 'Next' }).click();
      await page.waitForTimeout(500);
    }
    await tip.getByRole('button', { name: i === 5 ? 'Done' : 'Next' }).click();
  }
  check(
    'tour walks through all six features in order',
    JSON.stringify(titles) ===
      JSON.stringify(['Your next class', 'Tap to edit', 'Classes and deadlines', 'Add something', 'Class alarms', 'Calendar, sharing and more']),
  );
  check('spotlight lines up with each feature', aligned.every(Boolean));
  check('tour closes after Done', (await page.locator('[data-coach]').count()) === 0);
  await page.reload();
  await page.waitForTimeout(400);
  check('tour does not come back after finishing', (await page.locator('[data-coach]').count()) === 0);

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Replay tour' }).click();
  check('tour can be replayed from settings', await visible(tip.getByText('1 of 6')));
  await page.keyboard.press('Escape');
  check('Escape skips the tour', (await page.locator('[data-coach]').count()) === 0);

  await page.evaluate(() => localStorage.setItem('gctu_timetable', '[]'));
  await page.evaluate(() => localStorage.removeItem('classflow_tour_done'));
  await page.reload();
  check('tour skips steps that are not on screen', await visible(page.getByText('1 of 5')));
  await page.getByRole('button', { name: 'Next' }).click();
  check('new students are pointed to the example', await visible(page.getByRole('heading', { name: 'Not sure where to start?' })));
  await shot(page, 'tour-example');
  await page.context().close();
}

// Home-screen shortcuts and the free-day card.
{
  const page = await open({ url: `${BASE}?action=add-class` });
  check('"Add a class" shortcut opens the new class form', await visible(page.getByRole('heading', { name: 'New Class' })));
  check('shortcut is removed from the address', !page.url().includes('action='));
  await page.context().close();
}
{
  const page = await open({ url: `${BASE}?tab=deadlines` });
  check('"Deadlines" shortcut opens the deadlines tab', (await page.getByRole('tab', { name: 'Deadlines' }).getAttribute('aria-selected')) === 'true');
  await page.context().close();
}
{
  const page = await open();
  await page.clock.setFixedTime(new Date('2026-11-05T18:30:00'));
  await page.reload();
  const card = page.getByRole('region', { name: 'Today' });
  check('done-for-today card is shown after the last class', await visible(card.getByRole('heading', { name: 'Done for today' })));
  check('done-for-today card points to the next class', await card.getByText(/Next: Monday at/).isVisible());
  check('done-for-today card lifts on hover', (await card.evaluate((el) => getComputedStyle(el).transition)).includes('transform'));
  await shot(page, 'done-for-today');
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00')); // Saturday
  await page.reload();
  check('free-day card is shown on a day without classes', await visible(page.getByRole('heading', { name: 'Free day' })));
  await shot(page, 'free-day');
  await page.context().close();
}

// Preview mode: sample data in memory only. Real data is never touched.
{
  // A new student with nothing yet.
  const page = await open({ seed: false });
  await page.evaluate(() => {
    localStorage.setItem('classflow_profile', JSON.stringify({ name: 'Ama Mensah', program: 'Computer Science L200' }));
    localStorage.setItem('classflow_tour_done', '1');
  });
  await page.reload();
  await page.getByRole('button', { name: 'See an example' }).click();
  check('preview opens from the empty screen', await visible(page.getByRole('region', { name: 'Current class' })));
  check('preview banner is shown', await page.getByRole('status', { name: 'Preview mode' }).isVisible());
  check('preview fills the week', (await page.getByRole('heading', { name: 'Tomorrow', exact: true }).isVisible()) && (await page.getByRole('heading', { name: 'Monday', exact: true }).isVisible()));
  await shot(page, 'preview-classes', true);
  const stored = () => page.evaluate(() => ({ c: localStorage.getItem('gctu_timetable'), d: localStorage.getItem('gctu_exams') }));
  let saved = await stored();
  check('preview saves nothing', (saved.c === null || saved.c === '[]') && (saved.d === null || saved.d === '[]'));
  await page.getByRole('button', { name: 'Exit preview' }).click();
  check('exiting returns to the empty screen', await visible(page.getByRole('button', { name: 'See an example' })));
  await page.context().close();
}
{
  // A student with a real timetable.
  const page = await open();
  const real = await page.evaluate(() => localStorage.getItem('gctu_timetable'));
  await page.getByRole('button', { name: 'More' }).click();
  const toggle = page.getByRole('switch', { name: 'Preview with sample data' });
  check('preview switch starts off', (await toggle.getAttribute('aria-checked')) === 'false');
  await shot(page, 'settings-preview-switch');
  await toggle.click();
  check('switch turns the preview on', await visible(page.getByRole('status', { name: 'Preview mode' })));

  // Edit something in the preview; it must not reach storage.
  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Course code').fill('TRY 100');
  await form.getByLabel('Venue').fill('X1');
  await form.getByLabel('Course name').fill('Preview Only Class');
  await form.getByLabel('Lecturer').fill('Dr. Test');
  await form.getByRole('radio', { name: 'Saturday' }).click();
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  check('preview can be played with', await visible(page.getByRole('heading', { name: 'Preview Only Class' })));
  check('real timetable is untouched during preview', (await page.evaluate(() => localStorage.getItem('gctu_timetable'))) === real);

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Share schedule' }).click();
  check('sharing is paused during preview', await visible(page.getByText('Exit the preview first')));
  check('settings stay open after the warning', await page.getByRole('switch', { name: 'Preview with sample data' }).isVisible());
  await page.getByRole('button', { name: /^Exit the preview first/ }).click(); // tap the message to dismiss it
  await page.getByRole('switch', { name: 'Preview with sample data' }).click();
  check('switching off brings the real timetable back', await visible(page.getByRole('button', { name: 'Edit Network Security Fundamentals' })));
  check('preview edits are gone afterwards', (await page.getByRole('heading', { name: 'Preview Only Class' }).count()) === 0);
  check('real timetable is still identical', (await page.evaluate(() => localStorage.getItem('gctu_timetable'))) === real);
  check('banner is gone', (await page.getByRole('status', { name: 'Preview mode' }).count()) === 0);
  await page.context().close();
}

// App icon badge, and cleanup of the old widget storage.
{
  const page = await open();
  await page.addInitScript(() => {
    window.__badges = [];
    navigator.setAppBadge = (n) => (window.__badges.push(n), Promise.resolve());
    navigator.clearAppBadge = () => (window.__badges.push(0), Promise.resolve());
  });
  // Simulate a device that ran the version with the widget.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open('classflow-widget', 1);
        open.onupgradeneeded = () => open.result.createObjectStore('snapshot');
        open.onsuccess = () => {
          open.result.close();
          resolve();
        };
      }),
  );
  await page.reload();
  await page.waitForTimeout(400);
  const lastBadge = () => page.evaluate(() => window.__badges.at(-1));
  check('app icon badge shows the 3 classes left today', (await lastBadge()) === 3);
  const databases = await page.evaluate(() => indexedDB.databases().then((list) => list.map((d) => d.name)));
  check('old widget storage is deleted', !databases.includes('classflow-widget'));

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('switch', { name: 'Preview with sample data' }).click();
  await page.waitForTimeout(300);
  check('badge ignores the preview', (await lastBadge()) === 3);
  await page.getByRole('button', { name: 'Exit preview' }).click();

  await page.clock.setFixedTime(new Date('2026-11-05T18:00:00'));
  await page.waitForTimeout(1200);
  await page.clock.runFor(1500);
  check('badge clears once the day’s classes are over', (await lastBadge()) === 0);
  await page.context().close();
}

// Rolling digits, tab title, and the end-of-day celebration.
{
  const page = await open();
  const hero = page.getByRole('region', { name: 'Current class' });
  const lastStrip = hero.locator('.roll-strip').last();
  const before = await lastStrip.evaluate((el) => el.style.transform);
  await page.clock.runFor(1000);
  await page.waitForTimeout(100);
  const after = await lastStrip.evaluate((el) => el.style.transform);
  check('countdown digits roll to the next value', before === 'translateY(-80%)' && after === 'translateY(-70%)');
  check('countdown keeps its readable value', (await hero.getByRole('timer').getAttribute('aria-label')) === 'Time remaining 1:12:47');
  check('tab title shows the time left in class', (await page.title()) === '1h 12m left: Network Security Fundamentals');

  await page.getByRole('tab', { name: 'Deadlines' }).click();
  check('deadline countdown uses rolling digits', (await page.getByRole('region', { name: 'Next deadline' }).locator('.roll-strip').count()) >= 6);
  await page.getByRole('tab', { name: 'Classes' }).click();

  // The last class ends at 17:00.
  await page.clock.setFixedTime(new Date('2026-11-05T16:59:58'));
  await page.reload();
  check('tab title counts down to the next class', /^Database Systems in|left: Database Systems$/.test(await page.title()));
  check('no celebration before the day is done', (await page.locator('[data-confetti]').count()) === 0);
  await page.clock.setFixedTime(new Date('2026-11-05T17:00:02'));
  await page.waitForTimeout(1200);
  await page.clock.runFor(1500);
  check('confetti bursts when the last class ends', await visible(page.locator('[data-confetti]')));
  check('a message marks the end of the day', await page.getByText('That was your last class. Nice work.').isVisible());
  check('tab title returns to the app name', (await page.title()) === 'ClassFlow | Smart Schedule');
  await shot(page, 'celebration');

  await page.reload();
  await page.waitForTimeout(500);
  check('celebration happens only once a day', (await page.locator('[data-confetti]').count()) === 0);
  await page.getByRole('button', { name: 'Celebrate' }).click();
  check('tapping the tick replays the confetti', await visible(page.locator('[data-confetti]')));
  await page.context().close();
}
{
  const page = await open({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-11-05T18:00:00'));
  await page.reload();
  check('reduced motion: still says the day is done', await visible(page.getByText('That was your last class. Nice work.')));
  check('reduced motion: no confetti', (await page.locator('[data-confetti]').count()) === 0);
  await page.context().close();
}

// The next deadline can be opened, moved and deleted.
{
  const page = await open();
  await page.getByRole('tab', { name: 'Deadlines' }).click();
  await page.getByRole('button', { name: /^Edit Chapter 1-4 Test/ }).click();
  const form = page.getByRole('dialog');
  check('next deadline card opens for editing', await visible(page.getByRole('heading', { name: 'Edit Deadline' })));
  await form.getByRole('button', { name: '1 week later' }).click();
  check('"1 week later" moves the date', (await form.getByLabel('Date').inputValue()) === '2026-11-13');
  await form.getByRole('button', { name: '1 day earlier' }).click();
  check('"1 day earlier" moves the date', (await form.getByLabel('Date').inputValue()) === '2026-11-12');
  check('the new due date is spelled out', await form.getByText(/Due Thursday 12 November/).isVisible());
  await shot(page, 'deadline-move');
  await form.getByRole('button', { name: 'Save', exact: true }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('gctu_exams')).find((d) => d.id === 1).date);
  check('moved deadline is saved', stored === '2026-11-12');
  check('countdowns re-sort after the move', await visible(page.getByRole('region', { name: 'Next deadline' }).getByText('Chapter 1-4 Test')) && (await page.getByText('Due within a day').count()) === 0);

  await page.getByRole('button', { name: /^Edit Chapter 1-4 Test/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete deadline' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete deadline' }).click();
  check('next deadline can be deleted', (await page.getByText('Chapter 1-4 Test').count()) === 0);
  check('the following deadline moves up', await visible(page.getByRole('region', { name: 'Next deadline' }).getByText('Group Project Report')));
  await page.context().close();
}

// Alarms toggle on and off, and the choice survives a reload.
{
  const page = await open({ permissions: ['notifications'] });
  const off = page.getByRole('button', { name: 'Turn class alarms off' });
  check('alarms default on when permission is already granted', await off.isVisible());
  await off.click();
  const on = page.getByRole('button', { name: 'Turn class alarms on' });
  check('alarms can be switched off', await visible(on));
  await page.reload();
  check('alarms stay off after reload', await visible(on));
  await on.click();
  check('alarms can be switched back on', await visible(off));
  await page.context().close();
}

// A 15-minute warning fires once as the clock reaches the window.
{
  const page = await open();
  await page.clock.setFixedTime(new Date('2026-11-05T12:46:00'));
  await page.waitForTimeout(1200);
  await page.clock.runFor(1500);
  check('15 minute warning appears', await visible(page.getByText(/MATH 201 starts in about 14 minutes at A12/)));
  await shot(page, 'alert');
  await page.context().close();
}

// First run, then importing a link made by the live v1 app (raw, unescaped base64).
{
  const v1 = btoa(unescape(encodeURIComponent(JSON.stringify({
    n: 'Kofi',
    t: [[3, '10:00', '12:00', 'CSSD 218', 'C5', 'Software Engineering', 'Dr. Ɔwusu ~>~>~>']],
  }))));
  check('test link contains a "+"', v1.includes('+'));
  const page = await open({ seed: false, url: `${BASE}?sync=${v1}` });
  await shot(page, 'onboarding');
  await page.getByLabel('Your name').fill('Ama Mensah');
  await page.getByLabel('Course / program').fill('Computer Science L200');
  await page.getByRole('button', { name: 'Continue' }).click();
  check('import dialog follows onboarding', await visible(page.getByRole('heading', { name: 'Import Schedule?' })));
  await shot(page, 'import');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  check('tour starts for a new user once the import is done', await visible(page.getByRole('button', { name: 'Skip tour' })));
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.getByRole('button', { name: 'Edit Software Engineering' }).click();
  check('v1 link with "+" imports correctly', (await page.getByRole('dialog').getByLabel('Lecturer').inputValue()) === 'Dr. Ɔwusu ~>~>~>');
  await page.getByRole('button', { name: 'Cancel' }).click();
  check('sync param is removed from the URL', !page.url().includes('sync='));
  await page.goto(`${BASE}?sync=${v1}`);
  check('the same link is not offered twice', (await page.getByRole('alertdialog').count()) === 0);
  await page.context().close();
}

// Existing v1 users: legacy keys load, and a corrupt link fails politely.
{
  const page = await open({ seed: false, url: `${BASE}?sync=%%%not-valid` });
  check('no crash on onboarding with a bad link', await page.getByRole('button', { name: 'Continue' }).isVisible());
  await page.evaluate(() => {
    localStorage.setItem('campusgrid_profile', JSON.stringify({ name: 'Old User', program: 'L100' }));
    localStorage.setItem('gctu_timetable', JSON.stringify([]));
  });
  await page.goto(BASE);
  check('legacy campusgrid profile is honoured', await visible(page.getByRole('heading', { name: 'Old User' })));
  await shot(page, 'empty');
  await page.context().close();
}

// No sideways scrolling and no cut-off header text on small phones.
{
  const page = await open();
  const clipped = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('header h1, header p')]
        .filter((el) => el.scrollWidth > el.clientWidth)
        .map((el) => el.textContent),
    );
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`no horizontal overflow at ${width}px`, overflow <= 0);
    const cut = await clipped();
    check(`header text is not cut off at ${width}px${cut.length ? ` (${cut.join(', ')})` : ''}`, cut.length === 0);
  }
  await page.setViewportSize({ width: 320, height: 568 });
  await shot(page, 'small-320', true);
  await page.context().close();
}

// Offline: one online visit, then everything must work with the network gone.
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await context.route(/api\.dicebear\.com|api\.web3forms\.com/, (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(seedScript, [profile, classes, deadlines]);
  await page.goto(BASE);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);

  const manifest = await page.evaluate(() => fetch('/manifest.webmanifest').then((r) => r.json()));
  check('install manifest has a 512px icon', manifest.icons.some((i) => i.sizes === '512x512'));
  check('manifest declares home-screen shortcuts', manifest.shortcuts?.length === 2);
  check('manifest no longer declares a widget', !manifest.widgets);

  await context.setOffline(true);
  await page.reload();
  check('offline: app loads after a reload', await visible(page.getByRole('heading', { name: 'Ama Mensah' })));
  await page.evaluate(() => document.fonts.ready);
  check(
    'offline: Manrope font loads',
    await page.evaluate(() => [...document.fonts].some((f) => f.family.includes('Manrope') && f.status === 'loaded')),
  );

  const cold = await context.newPage();
  await cold.goto(BASE);
  check('offline: opens from scratch in a new tab', await visible(cold.getByRole('button', { name: 'Add class', exact: true })));
  await cold.close();

  await page.getByRole('button', { name: 'Add class', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Course code').fill('OFF 101');
  await form.getByLabel('Venue').fill('B1');
  await form.getByLabel('Course name').fill('Offline Studies');
  await form.getByLabel('Lecturer').fill('Dr. Nana');
  await form.getByRole('radio', { name: 'Saturday' }).click();
  await form.getByRole('button', { name: 'Add', exact: true }).click();
  await page.reload();
  check('offline: added class survives a reload', await visible(page.getByRole('heading', { name: 'Offline Studies' })));


  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Share schedule' }).click();
  check('offline: QR code still generates', await visible(page.getByAltText('QR code linking to your schedule')));
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'Suggest a feature' }).click();
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Your suggestion').fill('Test message');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  check('offline: feedback explains it needs internet', await visible(page.getByText('Network error'), 5000));
  await shot(page, 'offline-feedback');

  const link = btoa(JSON.stringify({ n: 'Kofi', t: [[0, '09:00', '10:00', 'LINK 1', 'C5', 'Link Course', 'Dr. A']] }));
  await page.goto(`${BASE}?sync=${link}`);
  check('offline: a share link still opens', await visible(page.getByRole('heading', { name: 'Import Schedule?' })));

  check('offline: no uncaught errors', errors.length === 0);
  if (errors.length) console.log(errors);
  await context.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} FAILED` : '\nAll checks passed');
process.exit(failures.length ? 1 : 0);
