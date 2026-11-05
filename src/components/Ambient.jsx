import {
  Backpack,
  BookOpen,
  Calculator,
  Clock,
  FlaskConical,
  GraduationCap,
  Lightbulb,
  Pencil,
} from 'lucide-react';

// One tile of the wallpaper: [icon, x, y, rotation]. It repeats across the whole screen.
const TILE = 240;
const ICONS = [
  [BookOpen, 22, 20, -12],
  [GraduationCap, 132, 8, 10],
  [Pencil, 192, 92, 28],
  [Clock, 76, 96, -6],
  [Calculator, 14, 160, 8],
  [Lightbulb, 128, 150, -14],
  [Backpack, 196, 196, 6],
  [FlaskConical, 70, 206, 14],
];
const SIZE = 26;

/**
 * The app background: sky blue blending into mint, under a faint study-icon pattern.
 * Purely decorative, so it is hidden from screen readers.
 */
export default function Ambient() {
  return (
    <div
      aria-hidden="true"
      data-ambient
      className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(165deg,#dce6ff_0%,#e1f5eb_100%)]"
    >
      <svg className="size-full text-[#2f4f8f] opacity-[0.085]">
        <defs>
          <pattern id="classflow-icons" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
            {ICONS.map(([Icon, x, y, rotate]) => (
              <g key={`${x}-${y}`} transform={`rotate(${rotate} ${x + SIZE / 2} ${y + SIZE / 2})`}>
                <Icon x={x} y={y} size={SIZE} strokeWidth={1.6} />
              </g>
            ))}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#classflow-icons)" />
      </svg>
    </div>
  );
}
