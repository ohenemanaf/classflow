import { useId } from 'react';
import { ChevronRight } from 'lucide-react';

const BUTTON_VARIANTS = {
  tinted: 'bg-tint-soft text-tint',
  plain: 'bg-fill text-label',
  destructive: 'bg-destructive-soft text-destructive',
};

/** Apple's "tinted" button style: a see-through wash of colour, never a solid fill. */
export function Button({ variant = 'tinted', className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`press flex min-h-12.5 items-center justify-center gap-2 rounded-full px-6 text-[1.0625rem] font-semibold disabled:opacity-50 ${BUTTON_VARIANTS[variant]} ${className}`}
    />
  );
}

/** A grouped glass list, as in iOS Settings. Rows are separated by hairlines. */
export function Group({ children, footer, className = '' }) {
  return (
    <div className={className}>
      <div className="glass divide-y divide-separator overflow-hidden rounded-[1.25rem]">{children}</div>
      {footer && <p className="mt-2 px-4 text-[0.8125rem] text-secondary">{footer}</p>}
    </div>
  );
}

/** A text row where the placeholder is the label, the way iOS forms read. */
export function TextRow({ label, as: Tag = 'input', className = '', ...props }) {
  return (
    <div className="px-4">
      <Tag aria-label={label} placeholder={label} className={`row-input py-3 ${className}`} {...props} />
    </div>
  );
}

/** A row with a label on the left and its value on the right (times, dates). */
export function ValueRow({ label, ...props }) {
  const id = useId();
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 px-4">
      <label htmlFor={id} className="text-[1.0625rem]">
        {label}
      </label>
      <input
        id={id}
        className="row-input tabular min-h-9! w-auto max-w-44 shrink-0 rounded-lg bg-fill px-2.5 text-center"
        {...props}
      />
    </div>
  );
}

/** A tappable list row, optionally destructive. */
export function ActionRow({ icon: Icon, label, destructive = false, ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`group flex min-h-12 w-full items-center gap-3 px-4 text-left text-[1.0625rem] transition-colors duration-300 active:bg-fill [@media(hover:hover)]:hover:bg-white/60 ${
        destructive ? 'text-destructive' : 'text-label'
      }`}
    >
      {Icon && <Icon size={20} className={destructive ? '' : 'text-tint'} />}
      <span className="flex-1">{label}</span>
      {!destructive && (
        <ChevronRight
          size={18}
          className="text-secondary opacity-60 transition-transform duration-300 group-active:translate-x-1 [@media(hover:hover)]:group-hover:translate-x-1"
        />
      )}
    </button>
  );
}

/** A list row with an iOS-style on/off switch. */
export function SwitchRow({ icon: Icon, label, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[1.0625rem] transition-colors duration-300 active:bg-fill [@media(hover:hover)]:hover:bg-white/60"
    >
      {Icon && <Icon size={20} className="text-tint" />}
      <span className="flex-1">{label}</span>
      <span
        aria-hidden="true"
        className={`relative h-7.5 w-12.5 shrink-0 rounded-full transition-colors duration-300 ${
          checked ? 'bg-live/80' : 'bg-fill'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-6.5 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  );
}

/** Pick-one chips. `columns` lays them out as an even grid (days of the week). */
export function ChipGroup({ label, options, value, onChange, labelFor = (o) => o, columns }) {
  const id = useId();
  return (
    <div role="radiogroup" aria-labelledby={id}>
      <p id={id} className="sr-only">
        {label}
      </p>
      <div
        className={columns ? 'grid gap-1.5' : 'flex flex-wrap gap-1.5'}
        style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={columns ? option : undefined}
              onClick={() => onChange(option)}
              className={`press min-h-11 rounded-full text-[0.9375rem] font-medium ${
                columns ? '' : 'px-4'
              } ${selected ? 'bg-tint-soft font-semibold text-tint' : 'glass text-label'}`}
            >
              {labelFor(option)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Round glass icon button, used in the header and as the floating add button. */
export function GlassIconButton({ active = false, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      className={`press grid size-11 shrink-0 place-items-center rounded-full ${
        active ? 'bg-tint-soft text-tint' : 'glass text-label'
      } ${className}`}
    />
  );
}
