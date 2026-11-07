import { BookOpen, CircleCheck, Clock, Coffee, Hash, MapPin, UserRound } from 'lucide-react';
import {
  classesOn,
  DAYS,
  findNextDayClass,
  getDayStatus,
  toMinutes,
  toneFor,
  weekdayName,
} from '../lib/schedule.js';
import RollingNumber from './RollingNumber.jsx';
import { Button } from './ui.jsx';

/** Timer-style countdown, like the iOS Clock app: 1:12:48, or 4:05 under an hour. */
function clock(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const two = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

function Hero({ classes, now, onCelebrate }) {
  const status = getDayStatus(classes, now);

  if (status.class) {
    const ongoing = status.type === 'ongoing';
    return (
      <section aria-label="Current class" data-tour="countdown" className="glass lift relative overflow-hidden rounded-[2rem] p-5">
        <BookOpen
          aria-hidden="true"
          size={150}
          strokeWidth={1}
          className="book-mark pointer-events-none absolute -right-6 -bottom-8 text-tint opacity-[0.07]"
        />
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold ${
            ongoing ? 'bg-live-soft text-live' : 'bg-tint-soft text-tint'
          }`}
        >
          <span className={`size-1.5 rounded-full bg-current ${ongoing ? 'animate-pulse' : ''}`} />
          {ongoing ? 'Now' : 'Next'}
        </span>
        <p
          className="tabular mt-3 text-[3.75rem] leading-none font-bold tracking-[-0.04em]"
          role="timer"
          aria-label={`${ongoing ? 'Time remaining' : 'Starts in'} ${clock(status.secondsLeft)}`}
        >
          <RollingNumber value={clock(status.secondsLeft)} />
        </p>
        {ongoing && (
          <div
            role="progressbar"
            aria-label="Class progress"
            aria-valuenow={Math.round(status.progress)}
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-live-soft"
          >
            <div
              className="h-full rounded-full bg-live/70 transition-[width] duration-1000 ease-linear"
              style={{ width: `${status.progress}%` }}
            />
          </div>
        )}
        <h2 className="relative mt-4 line-clamp-2 text-[1.25rem] leading-snug font-bold tracking-[-0.02em]">
          {status.class.courseName}
        </h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.9375rem] text-secondary">
          <span className="tabular flex items-center gap-1.5">
            <Clock size={15} />
            {status.class.startTime}–{status.class.endTime}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin size={15} className="shrink-0" />
            <span className="truncate">{status.class.venue}</span>
          </span>
        </div>
      </section>
    );
  }

  const next = findNextDayClass(classes, now);
  const nextLabel = next && (next.offset === 1 ? 'Tomorrow' : next.day);
  const done = status.type === 'done';
  const Icon = done ? CircleCheck : Coffee;
  return (
    <section
      aria-label="Today"
      data-tour="countdown"
      className="glass lift relative overflow-hidden rounded-[2rem] px-6 py-8 text-center"
    >
      <BookOpen
        aria-hidden="true"
        size={170}
        strokeWidth={1}
        className="book-mark pointer-events-none absolute -right-8 -bottom-10 text-tint opacity-[0.07]"
      />
      {done ? (
        <button
          type="button"
          onClick={onCelebrate}
          aria-label="Celebrate"
          className="press relative mx-auto grid size-16 place-items-center rounded-full bg-live-soft text-live"
        >
          <Icon size={30} strokeWidth={1.75} />
        </button>
      ) : (
        <div className="relative mx-auto grid size-16 place-items-center rounded-full bg-tint-soft text-tint">
          <Icon size={30} strokeWidth={1.75} />
        </div>
      )}
      <h2 className="relative mt-4 text-[2rem] leading-tight font-bold tracking-[-0.03em]">
        {done ? 'Done for today' : 'Free day'}
      </h2>
      {next && (
        <p className="relative mt-1.5 text-[0.9375rem] text-secondary">
          Next: {nextLabel} at <span className="tabular font-semibold text-label">{next.class.startTime}</span>,{' '}
          {next.class.courseName}
        </p>
      )}
    </section>
  );
}

/** Start over end time, laid out like a deadline's month over its day. */
function TimeBox({ start, end, ongoing }) {
  return (
    <div
      className={`flex w-14 shrink-0 flex-col items-center self-start rounded-xl py-1.5 ${
        ongoing ? 'bg-live-soft text-live' : 'bg-tone-chip text-tone-ink'
      }`}
    >
      <span className="sr-only">
        {start} to {end}
      </span>
      <span aria-hidden="true" className="tabular text-[1.0625rem] leading-tight font-bold">
        {start}
      </span>
      <span aria-hidden="true" className="tabular text-[0.75rem] font-semibold opacity-75">
        {end}
      </span>
    </div>
  );
}

function ClassCard({ cls, state, tourTarget, onEdit }) {
  const ongoing = state === 'ongoing';
  return (
    <li className={`transition-opacity duration-500 ${state === 'past' ? 'opacity-45' : ''}`}>
      <button
        type="button"
        onClick={() => onEdit(cls)}
        aria-label={`Edit ${cls.courseName}`}
        aria-current={ongoing ? 'time' : undefined}
        data-tour={tourTarget ? 'class' : undefined}
        className={`${toneFor(cls.courseCode)} lift relative mb-2.5 w-full min-w-0 overflow-hidden rounded-[1.375rem] border p-4 text-left backdrop-blur-xl ${
          ongoing
            ? 'border-white bg-white/85 shadow-[0_0_0_2px_rgba(52,199,89,0.4),0_14px_34px_rgba(52,199,89,0.16)]'
            : 'border-white/70 bg-tone-bg shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
        }`}
      >
        <BookOpen
          aria-hidden="true"
          size={110}
          strokeWidth={1.25}
          className="book-mark pointer-events-none absolute -right-5 -bottom-8 text-tone-ink opacity-[0.08]"
        />
        <div className="relative flex gap-3">
          <TimeBox start={cls.startTime} end={cls.endTime} ongoing={ongoing} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 text-[1.0625rem] leading-snug font-bold tracking-[-0.015em] hyphens-auto">
                {cls.courseName}
              </h3>
              {ongoing && <span className="shrink-0 pt-0.5 text-[0.8125rem] font-bold text-live">Now</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-1 text-[0.875rem]">
              <span className="flex shrink-0 items-center gap-1 font-semibold text-tone-ink">
                <Hash size={14} className="shrink-0" aria-hidden="true" />
                <span className="sr-only">Course code </span>
                {cls.courseCode}
              </span>
              <span className="flex min-w-0 items-center gap-1 text-secondary">
                <MapPin size={14} className="shrink-0" aria-hidden="true" />
                <span className="sr-only">Venue </span>
                <span className="truncate">{cls.venue}</span>
              </span>
              {cls.lecturer && (
                <span className="flex min-w-0 items-center gap-1 text-secondary">
                  <UserRound size={14} className="shrink-0" aria-hidden="true" />
                  <span className="sr-only">Lecturer </span>
                  <span className="truncate">{cls.lecturer}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

function EmptySchedule({ onAdd, onSample }) {
  return (
    <section className="glass lift relative mx-4 overflow-hidden rounded-[2rem] px-6 py-9 text-center">
      <BookOpen
        aria-hidden="true"
        size={170}
        strokeWidth={1}
        className="book-mark pointer-events-none absolute -right-8 -bottom-10 text-tint opacity-[0.07]"
      />
      <BookOpen size={48} strokeWidth={1.5} className="relative mx-auto text-tint" />
      <h2 className="mt-4 text-[1.5rem] font-bold tracking-[-0.025em]">No classes yet</h2>
      <p className="mt-1 text-[0.9375rem] text-secondary">Add each class once. ClassFlow counts down to it every week.</p>
      <div className="relative mt-5 flex flex-col items-center gap-2">
        <Button onClick={onAdd}>Add your first class</Button>
        <Button variant="plain" onClick={onSample} data-tour="example">
          See an example
        </Button>
      </div>
    </section>
  );
}

export default function ClassesView({ classes, now, onAdd, onSample, onEdit, onCelebrate }) {
  if (classes.length === 0) return <EmptySchedule onAdd={onAdd} onSample={onSample} />;

  // The week starts from today, so what matters soonest is always at the top.
  const todayIndex = DAYS.indexOf(weekdayName(now));
  const week = DAYS.map((_, offset) => {
    const day = DAYS[(todayIndex + offset) % DAYS.length];
    return { day, offset, list: classesOn(classes, day) };
  }).filter(({ list }) => list.length > 0);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const stateOf = (cls, offset) => {
    if (offset !== 0) return 'later';
    if (nowMinutes >= toMinutes(cls.endTime)) return 'past';
    if (nowMinutes >= toMinutes(cls.startTime)) return 'ongoing';
    return 'later';
  };
  const title = (day, offset) => (offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : day);

  return (
    <main className="px-4">
      <Hero classes={classes} now={now} onCelebrate={onCelebrate} />
      {week.map(({ day, offset, list }, weekIndex) => (
        <section key={day} aria-label={day} className="mt-7">
          <h2 className="mb-3 px-1 text-[1.25rem] font-bold tracking-[-0.02em]">{title(day, offset)}</h2>
          <ol>
            {list.map((cls, index) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                state={stateOf(cls, offset)}
                tourTarget={weekIndex === 0 && index === 0}
                onEdit={onEdit}
              />
            ))}
          </ol>
        </section>
      ))}
    </main>
  );
}
