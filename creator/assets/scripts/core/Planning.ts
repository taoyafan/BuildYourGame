// Plain JavaScript syntax, so a throwaway Node script can load this module without a TypeScript compiler.
// One source for the economic model's work, office staffing, salary speed and market reference time.
export const STANDARD_SPEED = 100;
export const LABOR_PARAMETERS = { wageDay: 400, standardQ: 60, wageExp: 3 };
export const MARKET_LEARNING = { dualReviews: 2 };

export function salaryFactor(quality) {
  const ratio = Math.max(0, quality) / LABOR_PARAMETERS.standardQ;
  return ratio <= 1 ? ratio : Math.pow(ratio, LABOR_PARAMETERS.wageExp);
}
export function qualityFromFactor(value) {
  return Math.min(100, LABOR_PARAMETERS.standardQ * (value <= 1 ? Math.max(0, value) : Math.pow(value, 1 / LABOR_PARAMETERS.wageExp)));
}
export function moduleUpdateWork(work, oldQuality, target) {
  const value = salaryFactor(target);
  return value > 0 ? work * Math.max(0, 1 - salaryFactor(oldQuality) / value) : 0;
}
export function moduleUpdatedQuality(work, oldQuality, target, effort) {
  if (work <= 0 || target <= oldQuality) return oldQuality;
  return Math.max(oldQuality, Math.min(target, qualityFromFactor(salaryFactor(oldQuality) + Math.max(0, effort) / work * salaryFactor(target))));
}
export function marketComplexity(reviews, dualReviews) {
  return reviews >= 4 ? (dualReviews >= MARKET_LEARNING.dualReviews ? 4 : 2) : 1;
}
export function combinedDemand(changes, weights) {
  const total = weights.reduce((n, v) => n + v, 0);
  return total > 0 ? 1 + changes.reduce((n, v, i) => n + v * weights[i], 0) / total : 1;
}
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

// ---- Single-title economy ----
// The formulas of 数值设计.md §四–§六, used by the running game and by throwaway checks. Nothing here
// knows about save files; callers pass plain numbers.
export const ECONOMY = {
  pool: 6000, poolExp: 0.93, scoreExp: 1.3,
  target: 72.5,
  priceBase: 66.7,
  convBase: 0.05, convGain: 0.55, convExp: 2, forget: 0.15,
  kSlope: 3.6, kOffset: 1.9,
  half: 21, natural: 0.0004, platform: 0.10,
  fanCarry: 0.7, valuationDays: 540,
  unitBase: 0.47, unitSlope: 0.35
};
// Total launch attention as a share of the market, and what each paid step buys. The first row is no
// campaign at all: only the platform's own recommendation.
export const PROMOTION_TIERS = [['不投', 0.10], ['试水', 0.25], ['常规', 0.45], ['力推', 0.65], ['全力', 0.85]];

const bound = (v, a, b) => Math.min(b, Math.max(a, v));
export function monthlyWage(quality, speed = STANDARD_SPEED) {
  return LABOR_PARAMETERS.wageDay * 30 / 10000 * salaryFactor(quality) * (speed / STANDARD_SPEED);
}
export function relativeScore(scale, q) {
  return bound(ECONOMY.target + q - PLANNING_SCALES[scale].S, 0, 100);
}
export function receptionOf(qe) { return bound((qe - 40) / 60, 0, 1); }
export function marketCapacity(scale, qe) {
  return ECONOMY.pool * Math.pow(PLANNING_SCALES[scale].w, ECONOMY.poolExp) * Math.pow(qe / 100, ECONOMY.scoreExp);
}
export function unitPriceOf(scale) { return ECONOMY.priceBase * PLANNING_SCALES[scale].pc; }
export function conversionRate(qe) {
  return ECONOMY.convBase + ECONOMY.convGain * Math.pow(receptionOf(qe), ECONOMY.convExp);
}
export function spreadRate(qe) {
  return bound(ECONOMY.kSlope * receptionOf(qe) - ECONOMY.kOffset, -1, 2);
}
export function attentionPrice(scale, cover) {
  return unitPriceOf(scale) * (ECONOMY.unitBase + ECONOMY.unitSlope * Math.max(0, cover - ECONOMY.platform));
}
export function promotionCost(scale, qe, cover, demand = 1, share = 1) {
  const paid = Math.max(0, cover - ECONOMY.platform);
  return paid * marketCapacity(scale, qe) * share * demand * attentionPrice(scale, cover) / 10000;
}
export function launchAttention(market, cover, stock = 0, extra = 0) {
  return Math.min(market, cover * market + ECONOMY.fanCarry * stock + extra);
}
export function heatOf(day) { return Math.pow(0.5, (day - 1) / ECONOMY.half); }
// One day of sales. `push` scales the day's purchase rate (a sale lifts it, a clashing launch lowers it).
export function salesStep(attention, sold, market, conv, spread, day, push = 1) {
  const units = Math.min(conv * push * attention, Math.max(0, market - sold));
  const room = Math.max(0, 1 - sold / market);
  const heat = heatOf(day);
  return {
    units,
    attention: Math.max(0, attention * (1 - ECONOMY.forget) - units + units * spread * room * heat + market * ECONOMY.natural * heat)
  };
}
// Sales over the valuation window for a launch at this relative score and coverage.
export function simulateTitle(scale, qe, cover, stock = 0, demand = 1, share = 1) {
  const market = marketCapacity(scale, qe) * demand * share;
  const conv = conversionRate(qe);
  const spread = spreadRate(qe);
  let attention = launchAttention(market, cover, stock);
  let sold = 0;
  for (let day = 1; day <= ECONOMY.valuationDays; day++) {
    if (market - sold <= 1e-4) break;
    const step = salesStep(attention, sold, market, conv, spread, day);
    attention = step.attention;
    sold += step.units;
  }
  return { market, conv, spread, sold };
}
