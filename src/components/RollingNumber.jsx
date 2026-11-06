import { useEffect, useRef } from 'react';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** One digit on a vertical 0–9 strip that slides to the current value. */
function Digit({ value }) {
  const previous = useRef(value);
  // Jumps of more than one (9 → 0 when a countdown wraps) snap instead of spinning
  // through every digit, which looks frantic.
  const wraps = Math.abs(value - previous.current) > 1;
  useEffect(() => {
    previous.current = value;
  }, [value]);

  return (
    <span className="roll-digit">
      <span className="invisible">0</span>
      <span
        className="roll-strip"
        style={{ transform: `translateY(-${value * 10}%)`, transition: wraps ? 'none' : undefined }}
      >
        {DIGITS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </span>
    </span>
  );
}

/**
 * Shows a number or time ("1:12:48") with each digit rolling like a flip clock.
 * Hidden from screen readers: the surrounding element carries the readable value.
 */
export default function RollingNumber({ value }) {
  const chars = String(value).split('');
  return (
    <span aria-hidden="true" className="tabular inline-flex">
      {chars.map((ch, i) => {
        const key = chars.length - i; // keyed from the right so digits keep their place
        return /\d/.test(ch) ? <Digit key={key} value={Number(ch)} /> : <span key={key}>{ch}</span>;
      })}
    </span>
  );
}
