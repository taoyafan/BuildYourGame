// 数值验算脚本。node creator/tools/balance.mjs [体量]
// 公式与参数与 数值设计.md 一一对应：改参数先改这里，再同步文档。
import { readFileSync } from 'node:fs';
// Planning.ts intentionally contains plain JS and no imports; share the runtime source on Node 18+.
const planning = await import('data:text/javascript;base64,' + readFileSync(new URL('../assets/scripts/core/Planning.ts', import.meta.url)).toString('base64'));
const { PLANNING_SCALES, PLANNING_OFFICES, STANDARD_SPEED, ROTATION_PARAMETERS, LABOR_PARAMETERS } = planning;
export const { moduleUpdateWork, moduleUpdatedQuality, marketComplexity, combinedDemand } = planning;

export const P = {
  // 体量：w 市场系数，W 总人日（含测试与修复），pc 单价系数，S 水准线（= 保本线）
  // rent = 该档常用办公室的房租摊销（元/人日）= 月租 / (工位数 × 30)，按满员工位摊
  scales: Object.fromEntries(PLANNING_SCALES.map(({ name, office, ...values }) => [name, { ...values, off: PLANNING_OFFICES[office].name }])),
  // 市场与口碑
  pool: 6000, poolExp: 0.93, scoreExp: 1.3,
  target: 72.5,            // 相对分基准：Q = S 时 Qe = 72.5，即保本点
  priceBase: 66.7,
  convBase: 0.05, convGain: 0.55, convExp: 2, forget: 0.15,
  kSlope: 3.6, kOffset: 1.9,
  half: 21, natural: 0.0004, platform: 0.10,
  fanCarry: 0.7, valuationDays: 540,
  rotation: ROTATION_PARAMETERS,
  // 宣发：关注单价 = 单价 × (基础 + 斜率 × 付费覆盖)，越买越贵
  unitBase: 0.47, unitSlope: 0.35,
  // 成本（元/人日）：工资 = 标准日薪 × (能力/60)^溢价比，人日成本与工资同口径
  ...LABOR_PARAMETERS,
  // 宣发五档：首发总关注占市场的比例
  tiers: [['不投', 0.10], ['试水', 0.25], ['常规', 0.45], ['力推', 0.65], ['全力', 0.85]]
};

// peak = 该阶段建议编制的平均能力，用来算月固定工资
export const offices = PLANNING_OFFICES;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function rotationSpan(s) {
  return planning.cycleSpan(Object.keys(P.scales).indexOf(s));
}

// age 是本轮已过的游戏天数，边界连续，退潮回到中性。
export function rotationPhase(s, age) {
  return planning.cyclePhase(Object.keys(P.scales).indexOf(s), age);
}

function rotationBlock(s) {
  const t = rotationSpan(s);
  const launch = t.rise + t.production;
  const index = Object.keys(P.scales).indexOf(s);
  const office = offices.find(o => o.name === P.scales[s].off);
  console.log(`${s}  ${P.scales[s].W}人日 / ${office.crew}人 / 速度${STANDARD_SPEED} → ${t.production}天  升温/持续/退潮 ${t.rise}/${t.hold}/${t.fall}天  单类周期 ${t.total}天  升温结束开工→第${launch}天上市，持续期还剩 ${t.rise + t.hold - launch}天`);
  console.log(`  同参数敏感性：满员工位${office.seats}人→${planning.referenceProduction(index, office.seats)}天；标准人数速度80/120→${planning.referenceProduction(index, office.crew, 80)}/${planning.referenceProduction(index, office.crew, 120)}天。`);
  console.log('  后续扩员（同体量、速度100）：' + offices.slice(PLANNING_SCALES[index].office + 1).map(o => `${o.name}${o.crew}人→${planning.referenceProduction(index, o.crew)}天`).join('；'));
}

export const relativeScore = (s, q) => clamp(P.target + q - P.scales[s].S, 0, 100);
export const quality = qe => clamp((qe - 40) / 60, 0, 1);
export const marketOf = (s, qe) =>
  P.pool * Math.pow(P.scales[s].w, P.poolExp) * Math.pow(qe / 100, P.scoreExp);
export const priceOf = s => P.priceBase * P.scales[s].pc;
export const conversion = qe => P.convBase + P.convGain * Math.pow(quality(qe), P.convExp);
export const spread = qe => clamp(P.kSlope * quality(qe) - P.kOffset, -1, 2);
export const monthlyWage = (peak, speed = STANDARD_SPEED) =>
  1.2 * planning.salaryFactor(peak) * (speed / STANDARD_SPEED);  // 万元 / 月
// 60 分以下线性（新人便宜但要能活），60 分以上按指数涨价（高手稀缺）
const wageFactor = planning.salaryFactor;
// 房租摊销：月租 / (满员工位 × 30 天)，元/人日
export const rentDay = s => {
  const o = offices.find(x => x.name === P.scales[s].off) || offices[0];
  return o.rent * 10000 / (o.seats * 30);
};
export const dayCost = (q, s) => (P.wageDay * wageFactor(q) + rentDay(s)) / 10000;   // 万 / 人日
export const unitPrice = (s, cover) =>
  priceOf(s) * (P.unitBase + P.unitSlope * Math.max(0, cover - P.platform));
export const promoCost = (s, qe, cover, demand = 1) => {
  const x = Math.max(0, cover - P.platform);
  return x * marketOf(s, qe) * demand * unitPrice(s, cover) / 10000;
};

// 单作结算。q 绝对评分，cover 首发总覆盖，fansStock 上作粉丝存量。
export function title(s, q, cover, fansStock = 0, demand = 1) {
  if (!Number.isFinite(demand) || demand <= 0) throw new Error('需求系数必须为正数');
  const price = priceOf(s);
  const qe = relativeScore(s, q);
  const market = marketOf(s, qe) * demand;
  const conv = conversion(qe);
  const k = spread(qe);
  let fans = Math.min(market, cover * market + P.fanCarry * fansStock);
  let sold = 0;
  for (let day = 1; day <= P.valuationDays; day++) {
    if (market - sold <= 1e-4) break;
    const heat = Math.pow(0.5, (day - 1) / P.half);
    const units = Math.min(conv * fans, market - sold);
    const room = Math.max(0, 1 - sold / market);
    fans = Math.max(0, fans * (1 - P.forget) - units + units * k * room * heat + market * P.natural * heat);
    sold += units;
  }
  const promo = promoCost(s, qe, cover, demand);
  const labor = P.scales[s].W * dayCost(q, s);
  const total = labor + promo;
  const revenue = sold * price / 10000;
  return {
    qe, market, price, conv, k, sold, revenue, labor, promo, total,
    unit: unitPrice(s, cover),
    net: revenue - total, roi: (revenue - total) / total
  };
}

export const breakEven = (s, cover) => {
  let lo = 0, hi = 100;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (title(s, mid, cover).roi > 0) hi = mid; else lo = mid;
  }
  return hi;
};

const pct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(0) + '%';
const names = Object.keys(P.scales);

function block(s) {
  const S = P.scales[s].S;
  console.log(`\n【${s}】水准线 ${S}  人日 ${P.scales[s].W}`);
  console.log('Q  Qe  市场  售罄  五档 ROI  | 净利');
  for (const q of [S - 8, S - 4, S, S + 4, S + 8, S + 12, S + 16, S + 22, S + 30]) {
    const rows = P.tiers.map(([, c]) => title(s, q, c));
    const h = rows[0];
    console.log(`${q}  ${h.qe.toFixed(0)}  ${Math.round(h.market)}  ` +
      rows.map(r => (r.sold / r.market * 100).toFixed(0) + '%').join('/') + '  ' +
      rows.map(r => pct(r.roi).padStart(5)).join(' ') + ' | ' +
      rows.map(r => r.net.toFixed(1)).join(' '));
  }
  const rows = P.tiers.map(([, c]) => title(s, S, c));
  console.log('宣发金额 万: ' + P.tiers.map(([n], i) => `${n} ${rows[i].promo.toFixed(1)}`).join('  '));
  console.log('关注单价 元: ' + rows.map(r => r.unit.toFixed(0)).join('  ') +
    `   人工 ${rows[0].labor.toFixed(1)} 万   单价 ${rows[0].price.toFixed(0)} 元`);
}

function main() {
  const arg = process.argv[2];
  const one = arg && P.scales[arg] ? arg : null;
  console.log('【模块自动更新：原工作量10人日、目标80，使用同一工资曲线】');
  for (const old of [40, 60, 75, 79, 80, 90]) {
    const work = moduleUpdateWork(10, old, 80);
    console.log(`原质量${old} → ${Math.max(old, 80)}，更新 ${work.toFixed(3)}人日；更新前研发+本轮更新人工 ${(10 * P.wageDay * wageFactor(old) + work * P.wageDay * wageFactor(80)).toFixed(0)}元`);
  }
  console.log('【市场信息递进】四类分别有发售复盘→2类；双类行情下两次发售复盘→4类；各类错峰、需求加权平均，单类20%/双类20%/四类20%上限相同。');
  for (const n of [1, 2, 4]) console.log(`${n}类：全热门×${combinedDemand(Array(n).fill(.2), Array(n).fill(1)).toFixed(2)}，一类热门其余平稳×${combinedDemand([.2, ...Array(n - 1).fill(0)], Array(n).fill(1)).toFixed(2)}`);
  if (arg === '--modules') return;
  console.log('【市场轮换：固定参考工期，不跟随实时人数、加速或模块复用跳变】');
  for (const s of one ? [one] : names) rotationBlock(s);
  console.log('【行情对净利的影响：Q=S+4、常规宣发，已同时计入宣发涨价】');
  for (const s of one ? [one] : names) console.log(`${s}  ` + [0.8, 1, 1.2].map(d => `需求×${d.toFixed(1)} 净利${title(s, P.scales[s].S + 4, 0.45, 0, d).net.toFixed(2)}万`).join('  '));
  if (arg === '--market') return;
  if (one) { block(one); return; }

  for (const s of names) block(s);

  console.log('\n【保本绝对分（各档最优宣发）】');
  for (const s of names) {
    let be = 0, best = -Infinity;
    let lo = 20, hi = 100;
    for (let i = 0; i < 40; i++) {
      const m = (lo + hi) / 2;
      const nets = P.tiers.map(([, c]) => title(s, m, c).net);
      if (Math.max(...nets) > 0) hi = m; else lo = m;
    }
    console.log(`${s}  水准线 ${P.scales[s].S}  保本 Q≈${hi.toFixed(1)}`);
  }

  console.log('\n【办公室】');
  for (const o of offices) {
    const fixed = o.rent + o.crew * monthlyWage(o.peak);
    console.log(`${o.name}  工位 ${o.seats}  月租 ${o.rent}  搬家 ${o.cost}  月固定 ${fixed.toFixed(1)}  最低搬家现金 ${(o.cost + fixed).toFixed(1)}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('balance.mjs')) main();
