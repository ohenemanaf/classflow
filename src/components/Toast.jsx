export default function Toast({ toast, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto max-w-md px-3 pt-[calc(0.5rem+env(safe-area-inset-top))]"
    >
      {toast && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`${toast.title}. ${toast.message} Tap to dismiss.`}
          className="anim-drop glass-thick pointer-events-auto block w-full rounded-[1.5rem] px-4 py-3 text-left"
        >
          <p className="text-[0.9375rem] font-semibold">{toast.title}</p>
          <p className="text-[0.9375rem] text-secondary">{toast.message}</p>
        </button>
      )}
    </div>
  );
}
