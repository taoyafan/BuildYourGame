// Plain JavaScript syntax: the balance CLI loads this module without a TypeScript compiler.
// One source for the economic model's work, office staffing, salary speed and market reference time.
export const STANDARD_SPEED = 100;
export const PLANNING_OFFICES = [
  { name: '自家', seats: 1, rent: 0, cost: 0, crew: 1, peak: 45 },
  { name: '起步小屋', seats: 4, rent: 1.5, cost: 0, crew: 3, peak: 48 },
  { name: '正式办公室', seats: 10, rent: 3, cost: 8, crew: 6, peak: 60 },
  { name: '独立工作室', seats: 16, rent: 5, cost: 26, crew: 10, peak: 70 },
  { name: '写字楼整层', seats: 40, rent: 12, cost: 64, crew: 24, peak: 85 },
  { name: '园区大楼', seats: 100, rent: 30, cost: 160, crew: 60, peak: 93 }
];
export const PLANNING_SCALES = [
  { name: '小', w: 1, W: 47, pc: 1, S: 48, office: 1 },
  { name: '中', w: 5, W: 235, pc: 1.26, S: 60, office: 2 },
  { name: '大', w: 20, W: 940, pc: 2.05, S: 70, office: 3 },
  { name: '超大', w: 90, W: 4230, pc: 3.01, S: 78, office: 4 }
];

// The phase ratios are design choices; work and productivity above are model inputs.
export const ROTATION_PARAMETERS = {
  rise: 0.5, hold: 2, fall: 0.5,
  amplitude: 0.20, quiet: 0.05, crowd: 0.04, crowdWeight: 0.20,
  otherWeight: 0.20
};

export function referenceProduction(scale, crew, speed = STANDARD_SPEED) {
  const plan = PLANNING_SCALES[scale];
  const office = PLANNING_OFFICES[plan.office];
  const workers = crew === undefined ? office.crew : crew;
  if (!Number.isFinite(workers) || workers <= 0 || !Number.isFinite(speed) || speed <= 0) throw new Error('人数和速度必须为正数');
  return Math.ceil(plan.W / (workers * speed / STANDARD_SPEED));
}

export function cycleSpan(scale) {
  const production = referenceProduction(scale);
  const r = ROTATION_PARAMETERS;
  const rise = Math.ceil(production * r.rise);
  const hold = Math.ceil(production * r.hold);
  const fall = Math.ceil(production * r.fall);
  return { production, rise, hold, fall, total: rise + hold + fall };
}

export function cyclePhase(scale, age) {
  const t = cycleSpan(scale);
  if (age < t.rise) return { phase: '升温', strength: Math.max(0, age / t.rise) };
  if (age < t.rise + t.hold) return { phase: '持续', strength: 1 };
  return { phase: '退潮', strength: Math.max(0, Math.min(1, (t.total - age) / t.fall)) };
}
