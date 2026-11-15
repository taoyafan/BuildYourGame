// The CLI and runtime use the same inputs AND calculation, rather than copied constants.
import { cycleSpan, cyclePhase } from './Planning';
export { ROTATION_PARAMETERS as ROTATION } from './Planning';

export function rotationSpan(scale: number) {
  return cycleSpan(scale);
}

export function rotationPhase(scale: number, age: number) {
  return cyclePhase(scale, age);
}

// Only for migrating 0.4.13 saves; these are the old saved clock lengths, not tuning inputs.
export function legacyRotationSpan(scale: number) {
  const production = [30, 60, 135, 240][scale];
  const rise = Math.ceil(production / 2);
  const hold = production * 2;
  const fall = rise;
  return { production, rise, hold, fall, total: rise + hold + fall };
}

// Preserve the fraction of the current phase when moving to a larger reference scale.
// Neither direction nor phase is reset, and the time remaining can only grow.
export function extendedAge(scale: number, nextScale: number, age: number) {
  return retimedAge(rotationSpan(scale), rotationSpan(nextScale), age);
}

export function retimedAge(a: any, b: any, age: number) {
  if (age < a.rise) return age / a.rise * b.rise;
  if (age < a.rise + a.hold) return b.rise + (age - a.rise) / a.hold * b.hold;
  return b.rise + b.hold + (age - a.rise - a.hold) / a.fall * b.fall;
}
