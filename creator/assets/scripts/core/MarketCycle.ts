// The CLI and runtime use the same inputs AND calculation, rather than copied constants.
import { cycleSpan } from './Planning';

export function rotationSpan(scale: number) {
  return cycleSpan(scale);
}

// Only for migrating 0.4.13 saves; these are the old saved clock lengths, not tuning inputs.
export function legacyRotationSpan(scale: number) {
  const production = [30, 60, 135, 240][scale];
  const rise = Math.ceil(production / 2);
  const hold = production * 2;
  const fall = rise;
  return { production, rise, hold, fall, total: rise + hold + fall };
}

export function retimedAge(a: any, b: any, age: number) {
  if (age < a.rise) return age / a.rise * b.rise;
  if (age < a.rise + a.hold) return b.rise + (age - a.rise) / a.hold * b.hold;
  return b.rise + b.hold + (age - a.rise - a.hold) / a.fall * b.fall;
}
