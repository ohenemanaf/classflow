import RollingNumber from './RollingNumber.jsx';

/** One box of a countdown (days, hours, min or sec), shared by the class and deadline banners. */
export default function CountdownUnit({ value, label, large = false }) {
  return (
    <div className="flex-1 rounded-2xl bg-white/55 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
      <div className={`tabular leading-none font-semibold tracking-[-0.04em] ${large ? 'text-[2.75rem]' : 'text-[2rem]'}`}>
        <RollingNumber value={value} />
      </div>
      <div className="mt-1 text-[0.75rem] text-secondary">{label}</div>
    </div>
  );
}
