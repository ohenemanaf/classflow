import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

/**
 * First-launch walkthrough. Each step points at an element marked `data-tour="<target>"`.
 * Steps whose element isn't on screen (no classes yet, for example) are skipped.
 */
export const TOUR_STEPS = [
  {
    target: 'countdown',
    title: 'Your next class',
    body: 'A live countdown to your next class. Once it starts, it shows how much time is left.',
  },
  { target: 'class', title: 'Tap to edit', body: 'Tap any class to change it or delete it.' },
  {
    target: 'tabs',
    title: 'Classes and deadlines',
    body: 'Switch to Deadlines to count down to exams, assignments and projects.',
  },
  { target: 'add', title: 'Add something', body: 'Tap + to add a class. On Deadlines, it adds a deadline.' },
  { target: 'alarms', title: 'Class alarms', body: 'Turn on a chime 15 minutes before each class.' },
  {
    target: 'more',
    title: 'Calendar, sharing and more',
    body: "Add your schedule to your phone's calendar for reminders even offline, share it, or edit your profile.",
  },
];

const PAD = 6; // breathing room between the element and the spotlight edge
const GAP = 14; // distance from the spotlight to the tip card
const MARGIN = 16; // keep the tip card this far from the screen edges

const findTarget = (target) => document.querySelector(`[data-tour="${target}"]`);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function CoachMarks({ steps = TOUR_STEPS, onClose }) {
  const [available, setAvailable] = useState(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const nextButton = useRef(null);
  const titleId = useId();
  const bodyId = useId();

  // Decide which steps apply once the page has rendered.
  useLayoutEffect(() => {
    const present = steps.filter((step) => findTarget(step.target));
    if (present.length === 0) onClose();
    else setAvailable(present);
  }, [steps, onClose]);

  const step = available?.[index];
  const isLast = available && index === available.length - 1;

  // Follow the highlighted element through scrolling, resizing and layout changes.
  useLayoutEffect(() => {
    if (!step) return undefined;
    const element = findTarget(step.target);
    if (!element) return undefined;

    const box = element.getBoundingClientRect();
    if (box.top < 0 || box.bottom > window.innerHeight) {
      element.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
    }

    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = element.getBoundingClientRect();
        const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius) || 16;
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height, radius });
      });
    };
    measure();
    const settle = setTimeout(measure, 450);
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [step]);

  // The tip card only renders once the spotlight is measured, so focus waits for that.
  const shown = Boolean(rect);
  useEffect(() => {
    if (shown) nextButton.current?.focus({ preventScroll: true });
  }, [index, shown]);

  const next = () => (isLast ? onClose() : setIndex(index + 1));
  const back = () => setIndex(Math.max(0, index - 1));

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') next();
      else if (event.key === 'ArrowLeft') back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!step || !rect) return null;

  // Place the tip under the spotlight when there's room, otherwise above it.
  const width = Math.min(320, window.innerWidth - MARGIN * 2);
  const centre = rect.left + rect.width / 2;
  const left = Math.min(Math.max(centre - width / 2, MARGIN), window.innerWidth - MARGIN - width);
  const below = window.innerHeight - (rect.top + rect.height + PAD) > 200;
  const top = below ? rect.top + rect.height + PAD + GAP : rect.top - PAD - GAP;
  const arrowLeft = Math.min(Math.max(centre - left, 24), width - 24);

  const spotlight = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    borderRadius: rect.radius + PAD,
  };

  return (
    <div className="anim-fade fixed inset-0 z-[70]" data-coach>
      <div
        aria-hidden="true"
        data-coach-spotlight
        className="coach-spotlight fixed shadow-[0_0_0_9999px_rgba(15,23,42,0.42)]"
        style={spotlight}
      />
      <div aria-hidden="true" className="coach-spotlight coach-ring fixed" style={spotlight} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="coach-tip glass-thick fixed rounded-[1.5rem] p-4"
        style={{ top, left, width, transform: below ? undefined : 'translateY(-100%)' }}
      >
        <span
          aria-hidden="true"
          className={`glass-thick absolute size-3.5 rotate-45 rounded-[3px] border-0 shadow-none ${
            below ? '-top-1.5' : '-bottom-1.5'
          }`}
          style={{ left: arrowLeft - 7 }}
        />
        <div className="relative flex items-center justify-between">
          <p className="tabular text-[0.8125rem] font-semibold text-secondary">
            {index + 1} of {available.length}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Skip tour"
            className="press -mr-1 min-h-9 rounded-full px-2 text-[0.875rem] font-semibold text-secondary"
          >
            Skip
          </button>
        </div>
        <h2 id={titleId} aria-live="polite" className="relative mt-1 text-[1.0625rem] font-bold tracking-[-0.015em]">
          {step.title}
        </h2>
        <p id={bodyId} className="relative mt-1 text-[0.9375rem] leading-snug text-secondary">
          {step.body}
        </p>
        <div className="relative mt-4 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden="true">
            {available.map((s, i) => (
              <span
                key={s.target}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === index ? 'w-4 bg-tint' : 'w-1.5 bg-black/15'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            {index > 0 && (
              <button
                type="button"
                onClick={back}
                className="press min-h-10 rounded-full px-3 text-[0.9375rem] font-semibold text-tint"
              >
                Back
              </button>
            )}
            <button
              ref={nextButton}
              type="button"
              onClick={next}
              className="press min-h-10 rounded-full bg-tint-soft px-5 text-[0.9375rem] font-semibold text-tint"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
