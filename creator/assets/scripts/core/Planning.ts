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
// `price` is the unit price that makes a title scored at the break-even line pay back exactly.
export const PLANNING_SCALES = [
  { name: '小', w: 1, W: 47, price: 66.5, office: 1 },
  { name: '中', w: 5, W: 235, price: 70.2, office: 2 },
  { name: '大', w: 20, W: 940, price: 78.2, office: 3 },
  { name: '超大', w: 90, W: 4230, price: 86.0, office: 4 }
];
// A title's scale is read from its nominal person-days: the geometric middles between the W above.
export const SCALE_BOUNDS = [105, 470, 2000];
export function scaleOfWork(work) {
  const index = SCALE_BOUNDS.findIndex(bound => work < bound);
  return index < 0 ? SCALE_BOUNDS.length : index;
}

// The phase ratios are design choices; work and productivity above are model inputs.
export const ROTATION_PARAMETERS = {
  rise: 0.5, hold: 2, fall: 0.5,
  amplitude: 0.20, quiet: 0.05, crowd: 0.04, crowdWeight: 0.20,
  // The most a title's combined demand may move the market, by scale: big bets ride bigger waves.
  scaleAmplitude: [0.15, 0.25, 0.40, 0.50],
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
// Fitted so the best campaign moves none → full → none at scores 50 / 70 / 85 / 95 for every scale.
export const ECONOMY = {
  pool: 6000, poolExp: 0.93, scoreExp: 1.1474,
  breakEven: 48, receptFrom: 36.207,
  convBase: 0.0799, convGain: 0.343, convExp: 1.2124, forget: 0.1441,
  kSlope: 4.5803, kOffset: 2.3364, kMax: 1.9676,
  half: 21, natural: 0.002, platform: 0.30,
  fanCarry: 0.7, valuationDays: 540,
  unitBase: 0.289, unitSlope: 0.4387,
  drift: 1, driftCap: 10
};
// Total launch attention as a share of the market, and what each paid step buys. The first row is no
// campaign at all: only the platform's own recommendation.
export const PROMOTION_TIERS = [['不投', 0.30], ['试水', 0.409], ['常规', 0.517], ['力推', 0.626], ['全力', 0.735]];

const bound = (v, a, b) => Math.min(b, Math.max(a, v));
export function monthlyWage(quality, speed = STANDARD_SPEED) {
  return LABOR_PARAMETERS.wageDay * 30 / 10000 * salaryFactor(quality) * (speed / STANDARD_SPEED);
}
// The industry bar rises a point a year (capped): every curve reads the score minus this shift.
export function industryShift(day) {
  return Math.min(ECONOMY.driftCap, Math.floor(Math.max(0, day - 1) / 360) * ECONOMY.drift);
}
export function marketScore(q, day) { return bound(q - industryShift(day), 0, 100); }
export function receptionOf(q) { return bound((q - ECONOMY.receptFrom) / (100 - ECONOMY.receptFrom), 0, 1); }
export function marketCapacity(scale, q) {
  return ECONOMY.pool * Math.pow(PLANNING_SCALES[scale].w, ECONOMY.poolExp) * Math.pow(q / 100, ECONOMY.scoreExp);
}
export function unitPriceOf(scale) { return PLANNING_SCALES[scale].price; }
export function conversionRate(q) {
  return ECONOMY.convBase + ECONOMY.convGain * Math.pow(receptionOf(q), ECONOMY.convExp);
}
export function spreadRate(q) {
  return bound(ECONOMY.kSlope * receptionOf(q) - ECONOMY.kOffset, -1, ECONOMY.kMax);
}
export function attentionPrice(scale, cover) {
  return unitPriceOf(scale) * (ECONOMY.unitBase + ECONOMY.unitSlope * Math.max(0, cover - ECONOMY.platform));
}
export function promotionCost(scale, qe, cover, demand = 1, share = 1) {
  const paid = Math.max(0, cover - ECONOMY.platform);
  return paid * marketCapacity(scale, qe) * share * demand * attentionPrice(scale, cover) / 10000;
}
// The inverse of promotionCost: the launch cover a total spend (in 万) reaches, never past the whole market.
export function promotionReach(scale, qe, spend, demand = 1, share = 1) {
  const k = marketCapacity(scale, qe) * share * demand * unitPriceOf(scale) / 10000;
  const b = ECONOMY.unitBase;
  const s = ECONOMY.unitSlope;
  const paid = k > 0 && spend > 0 ? (-b + Math.sqrt(b * b + 4 * s * spend / k)) / (2 * s) : 0;
  return Math.min(1, ECONOMY.platform + paid);
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
// Units sold in the first week; rivals use it too, so their charts and the player's share one model.
export function firstWeekOf(scale, q, cover, demand = 1) {
  const market = marketCapacity(scale, q) * demand;
  const conv = conversionRate(q);
  const spread = spreadRate(q);
  let attention = launchAttention(market, cover);
  let sold = 0;
  for (let day = 1; day <= 7; day++) {
    const step = salesStep(attention, sold, market, conv, spread, day);
    attention = step.attention;
    sold += step.units;
  }
  return sold;
}
