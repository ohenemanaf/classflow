import { ChevronDown, Flag, MapPin, Timer, Trash2 } from 'lucide-react';
import { deadlineDate, getCountdown, sortDeadlines } from '../lib/schedule.js';
import RollingNumber from './RollingNumber.jsx';
import { Button } from './ui.jsx';

const two = (n) => String(n).padStart(2, '0');

function Unit({ value, label }) {
  return (
    <div className="flex-1 rounded-2xl bg-white/55 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className="tabular text-[2rem] leading-none font-semibold tracking-[-0.04em]">
        <RollingNumber value={value} />
      </div>
      <div className="mt-1 text-[0.75rem] text-secondary">{label}</div>
    </div>
  );
}

function NextDeadline({ deadline, now }) {
  const left = getCountdown(deadline, now);
  const when = deadlineDate(deadline).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <section aria-label="Next deadline" className="glass lift rounded-[2rem] p-5">
      <span
        className={`inline-block rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold ${
          left.isUrgent ? 'bg-destructive-soft text-destructive' : 'bg-tint-soft text-tint'
        }`}
      >
        {left.isUrgent ? 'Due within a day' : 'Next'}
      </span>
      <h2 className="mt-3 line-clamp-2 text-[1.5rem] leading-tight font-bold tracking-[-0.025em]">
        {deadline.title}
      </h2>
      <p className="mt-1 truncate text-[0.9375rem] text-secondary">
        {deadline.courseCode}, {when}
      </p>
      <div className="mt-4 flex gap-1.5" role="timer" aria-label={`${left.text} remaining`}>
        <Unit value={left.days} label={left.days === 1 ? 'day' : 'days'} />
        <Unit value={two(left.hours)} label="hours" />
        <Unit value={two(left.minutes)} label="min" />
        <Unit value={two(left.seconds)} label="sec" />
      </div>
    </section>
  );
}

function DeadlineRow({ deadline, now, onEdit }) {
  const left = getCountdown(deadline, now);
  const date = deadlineDate(deadline);
  return (
    <li>
      <button
        type="button"
        onClick={() => onEdit(deadline)}
        aria-label={`Edit ${deadline.title}`}
        className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors duration-300 active:bg-fill [@media(hover:hover)]:hover:bg-white/60"
      >
        <div
          className={`flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 ${
            left.isUrgent ? 'bg-destructive-soft text-destructive' : 'bg-fill'
          }`}
        >
          <span className="text-[0.6875rem] font-semibold">
            {date.toLocaleDateString('en-GB', { month: 'short' })}
          </span>
          <span className="tabular text-[1.25rem] leading-tight font-semibold">{date.getDate()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[1.0625rem] font-semibold tracking-[-0.015em]">{deadline.title}</h3>
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-[0.875rem]">
            <span className={`tabular flex items-center gap-1 ${left.isUrgent ? 'text-destructive' : 'text-secondary'}`}>
              <Timer size={14} />
              {left.text}
            </span>
            {deadline.venue && (
              <span className="flex min-w-0 items-center gap-1 text-secondary">
                <MapPin size={14} className="shrink-0" />
                <span className="truncate">{deadline.venue}</span>
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

export default function DeadlinesView({ deadlines, now, onAdd, onEdit, onDelete }) {
  if (deadlines.length === 0) {
    return (
      <section className="glass mx-4 rounded-[2rem] px-6 py-9 text-center">
        <Flag size={44} strokeWidth={1.5} className="mx-auto text-tint" />
        <h2 className="mt-4 text-[1.5rem] font-bold tracking-[-0.025em]">No deadlines</h2>
        <p className="mt-1 text-[0.9375rem] text-secondary">Track exams and projects with a live countdown.</p>
        <Button onClick={onAdd} className="mx-auto mt-5">
          Track a deadline
        </Button>
      </section>
    );
  }

  const sorted = sortDeadlines(deadlines);
  const active = sorted.filter((d) => !getCountdown(d, now).expired);
  const completed = sorted.filter((d) => getCountdown(d, now).expired);

  return (
    <main className="space-y-6 px-4">
      {active[0] ? (
        <NextDeadline deadline={active[0]} now={now} />
      ) : (
        <section className="glass rounded-[2rem] p-5">
          <h2 className="text-[1.75rem] font-bold tracking-[-0.025em]">All caught up</h2>
          <p className="mt-1 text-[0.9375rem] text-secondary">Every deadline you tracked has passed.</p>
        </section>
      )}

      {active.length > 1 && (
        <section>
          <h2 className="mb-2 px-4 text-[1.25rem] font-bold tracking-[-0.02em]">Later</h2>
          <ul className="glass divide-y divide-separator overflow-hidden rounded-[1.25rem]">
            {active.slice(1).map((deadline) => (
              <DeadlineRow key={deadline.id} deadline={deadline} now={now} onEdit={onEdit} />
            ))}
          </ul>
        </section>
      )}

      {completed.length > 0 && (
        <details className="group glass overflow-hidden rounded-[1.25rem]">
          <summary className="flex min-h-12 list-none items-center justify-between px-4 text-[1.0625rem] [&::-webkit-details-marker]:hidden">
            <span>
              Completed <span className="text-secondary">({completed.length})</span>
            </span>
            <ChevronDown size={18} className="text-secondary transition group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-separator border-t border-separator">
            {completed.map((deadline) => (
              <li key={deadline.id} className="flex items-center justify-between gap-3 py-1 pr-1 pl-4">
                <div className="min-w-0">
                  <p className="truncate text-[0.9375rem] text-secondary line-through">{deadline.title}</p>
                  <p className="truncate text-[0.8125rem] text-secondary">{deadline.courseCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onDelete(deadline.id)}
                  aria-label={`Delete ${deadline.title}`}
                  className="grid size-11 shrink-0 place-items-center rounded-full text-destructive transition active:bg-fill"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
