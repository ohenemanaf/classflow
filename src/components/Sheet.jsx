import { useEffect, useId, useRef } from 'react';

const FOCUSABLE = 'button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

// Sheets can stack (an alert over an edit form); only the top one reacts to keys.
const stack = [];

function useModal(onClose) {
  const panel = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const node = panel.current;
    const previouslyFocused = document.activeElement;
    stack.push(node);
    node.focus();
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (stack[stack.length - 1] !== node) return;
      if (event.key === 'Escape') {
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === node)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(node), 1);
      if (stack.length === 0) document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, []);

  return panel;
}

const barButton = 'min-h-11 min-w-11 px-1 text-[1.0625rem] text-tint transition active:opacity-50 disabled:opacity-40';

/**
 * iOS-style sheet: Cancel on the left, title in the middle, the action on the right.
 * `action` is { label, form } for a submit button, or { label, onClick }.
 * Forms are `persistent` so a stray tap on the dimmed area can't discard typing.
 */
export default function Sheet({ title, onClose, action, cancelLabel = 'Cancel', persistent = false, children }) {
  const panel = useModal(onClose);
  const titleId = useId();

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-black/20 sm:items-center sm:p-4"
      onClick={(event) => {
        if (!persistent && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="anim-sheet glass-thick max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-[2.25rem] outline-none sm:rounded-[2.25rem]"
      >
        <div className="sticky top-0 z-10 glass-thick rounded-t-[2.25rem] border-0 shadow-none">
          <div className="mx-auto mt-2 h-1.25 w-9 rounded-full bg-black/15" aria-hidden="true" />
          <div className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pt-1 pb-2">
            <button type="button" onClick={onClose} className={`${barButton} justify-self-start`}>
              {cancelLabel}
            </button>
            <h2 id={titleId} className="truncate text-[1.0625rem] font-semibold">
              {title}
            </h2>
            {action ? (
              <button
                type={action.form ? 'submit' : 'button'}
                form={action.form}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`${barButton} justify-self-end font-semibold`}
              >
                {action.label}
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
        <div className="px-4 pt-2 pb-[calc(1.75rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

/** iOS alert: centred glass card with stacked text and side-by-side buttons. */
export function Alert({ title, message, children, actions, onClose }) {
  const panel = useModal(onClose);
  const titleId = useId();
  return (
    <div className="anim-fade fixed inset-0 z-[55] grid place-items-center bg-black/20 p-10">
      <div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="anim-alert glass-thick w-full max-w-[17.5rem] overflow-hidden rounded-[1.75rem] text-center outline-none"
      >
        <div className="px-5 pt-5 pb-4">
          <h2 id={titleId} className="text-[1.0625rem] font-semibold">
            {title}
          </h2>
          {message && <p className="mt-1 text-[0.8125rem] leading-snug">{message}</p>}
          {children}
        </div>
        <div className="grid grid-cols-2 divide-x divide-separator border-t border-separator">
          {actions.map(({ label, onClick, destructive, primary }) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`min-h-11 px-2 text-[1.0625rem] transition active:bg-fill ${
                destructive ? 'text-destructive' : 'text-tint'
              } ${primary || destructive ? 'font-semibold' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
