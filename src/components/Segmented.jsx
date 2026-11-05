/** iOS segmented control in liquid glass. The white thumb slides to the chosen option. */
export default function Segmented({ options, value, onChange, label }) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <div className="sticky top-0 z-30 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2">
      <div role="tablist" aria-label={label} data-tour="tabs" className="glass relative grid rounded-full p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(0,0,0,0.04)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            transform: `translateX(${index * 100}%)`,
          }}
        />
        {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => {
          const selected = optionValue === value;
          return (
            <button
              key={optionValue}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(optionValue)}
              className={`relative z-10 flex min-h-10 items-center justify-center gap-1.5 rounded-full text-[0.9375rem] transition-[color,transform] duration-300 active:scale-95 ${
                selected ? 'font-semibold text-label' : 'font-medium text-secondary [@media(hover:hover)]:hover:text-label'
              }`}
            >
              <Icon size={17} />
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
