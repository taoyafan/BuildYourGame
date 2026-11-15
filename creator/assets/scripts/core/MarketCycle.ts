// Runtime counterpart of balance.mjs P.rotation. Keep parity when tuning either side.
export const ROTATION = {
  work: [47, 235, 940, 4230], crew: [3, 6, 10, 24],
  utilization: 0.75, roundDays: 15,
  rise: 0.5, hold: 2, fall: 0.5,
  amplitude: 0.20, quiet: 0.05, crowd: 0.04, crowdWeight: 0.20,
  otherWeight: 0.20
};

export function rotationSpan(scale: number) {
  const r = ROTATION;
  const production = Math.ceil(r.work[scale] / (r.crew[scale] * r.utilization) / r.roundDays) * r.roundDays;
  const rise = Math.ceil(production * r.rise);
  const hold = Math.ceil(production * r.hold);
  const fall = Math.ceil(production * r.fall);
  return { production, rise, hold, fall, total: rise + hold + fall };
}

export function rotationPhase(scale: number, age: number) {
  const t = rotationSpan(scale);
  if (age < t.rise) return { phase: '升温', strength: Math.max(0, age / t.rise) };
  if (age < t.rise + t.hold) return { phase: '持续', strength: 1 };
  return { phase: '退潮', strength: Math.max(0, Math.min(1, (t.total - age) / t.fall)) };
}

// Preserve the fraction of the current phase when moving to a larger reference scale.
// Neither direction nor phase is reset, and the time remaining can only grow.
export function extendedAge(scale: number, nextScale: number, age: number) {
  const a = rotationSpan(scale);
  const b = rotationSpan(nextScale);
  if (age < a.rise) return age / a.rise * b.rise;
  if (age < a.rise + a.hold) return b.rise + (age - a.rise) / a.hold * b.hold;
  return b.rise + b.hold + (age - a.rise - a.hold) / a.fall * b.fall;
}
