import { useState } from 'react';
import { Bell, BellOff, Ellipsis } from 'lucide-react';
import { GlassIconButton } from './ui.jsx';

function Avatar({ name }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-tint-soft text-xl font-semibold text-tint uppercase ring-1 ring-white">
      {name.trim().substring(0, 2)}
      {!failed && (
        <img
          src={`https://api.dicebear.com/9.x/micah/svg?seed=${encodeURIComponent(name)}&backgroundColor=transparent`}
          alt=""
          onError={() => setFailed(true)}
          className="absolute inset-0 mt-1 size-full scale-110 object-cover"
        />
      )}
    </div>
  );
}

export default function Header({ profile, now, alarmsOn, onToggleAlarms, onMore }) {
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <header className="px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-2">
        <p className="flex-1 truncate text-[0.9375rem] font-medium text-secondary">{date}</p>
        <GlassIconButton
          onClick={onToggleAlarms}
          data-tour="alarms"
          active={alarmsOn}
          aria-pressed={alarmsOn}
          aria-label={alarmsOn ? 'Turn class alarms off' : 'Turn class alarms on'}
        >
          {alarmsOn ? <Bell size={19} /> : <BellOff size={19} />}
        </GlassIconButton>
        <GlassIconButton onClick={onMore} aria-label="More" data-tour="more">
          <Ellipsis size={20} />
        </GlassIconButton>
      </div>

      <section aria-label="Profile" className="glass mt-3 flex items-center gap-3.5 rounded-[1.75rem] p-4">
        <Avatar name={profile.name} />
        <div className="min-w-0">
          <h1 className="truncate text-[1.75rem] leading-tight font-bold tracking-[-0.025em]">{profile.name}</h1>
          <p className="truncate text-[0.9375rem] text-secondary">{profile.program}</p>
        </div>
      </section>
    </header>
  );
}
