import { Eye } from 'lucide-react';

/** Shown at the top while the sample timetable is on screen, with a one-tap way out. */
export default function PreviewBanner({ onExit }) {
  return (
    <div
      role="status"
      aria-label="Preview mode"
      className="mx-4 mt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-3 rounded-full bg-tint-soft py-1.5 pr-1.5 pl-4 text-tint backdrop-blur-xl"
    >
      <Eye size={17} className="shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">Previewing sample data</p>
      <button
        type="button"
        onClick={onExit}
        className="press min-h-9 shrink-0 rounded-full bg-white/80 px-3.5 text-[0.875rem] font-bold text-tint"
      >
        Exit preview
      </button>
    </div>
  );
}
