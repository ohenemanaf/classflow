import { BookOpen } from 'lucide-react';

/**
 * In-app rendering of the home-screen widget, from the same data the real widget gets.
 * `small` shows the headline class only; `medium` adds what comes next and the deadline.
 */
export default function WidgetCard({ data, size = 'medium' }) {
  const small = size === 'small';
  return (
    <figure
      aria-label={`${small ? 'Small' : 'Medium'} widget preview`}
      className={`glass lift relative overflow-hidden rounded-[1.5rem] p-4 ${small ? 'aspect-square w-40' : 'w-full'}`}
    >
      <BookOpen
        aria-hidden="true"
        size={small ? 80 : 110}
        strokeWidth={1.25}
        className="book-mark pointer-events-none absolute -right-4 -bottom-6 text-tint opacity-[0.07]"
      />
      <p className="relative flex items-center gap-1.5 text-[0.75rem] font-bold text-tint">
        <BookOpen size={13} aria-hidden="true" />
        {data.headline}
      </p>
      <p className={`relative mt-1.5 font-bold tracking-[-0.015em] ${small ? 'line-clamp-3 text-[1rem] leading-tight' : 'text-[1.125rem] leading-snug'}`}>
        {data.title}
      </p>
      <p className="relative mt-0.5 truncate text-[0.8125rem] text-secondary">{data.detail}</p>

      {!small && data.later.length > 0 && (
        <ul className="relative mt-3 space-y-1 border-t border-separator pt-3">
          {data.later.map((item) => (
            <li key={`${item.when}-${item.name}`} className="flex gap-3 text-[0.8125rem]">
              <span className="tabular w-17 shrink-0 font-bold">{item.when}</span>
              <span className="truncate">{item.name}</span>
            </li>
          ))}
        </ul>
      )}
      {!small && data.deadline && (
        <p className="relative mt-3 truncate text-[0.8125rem] font-semibold text-destructive">{data.deadline}</p>
      )}
    </figure>
  );
}
