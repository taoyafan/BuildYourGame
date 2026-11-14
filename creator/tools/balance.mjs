// 数值验算脚本。node creator/tools/balance.mjs [体量]
// 公式与参数与 数值设计.md 一一对应：改参数先改这里，再同步文档。

export const P = {
  // 体量：w 市场系数，W 总人日（含测试与修复），pc 单价系数，S 水准线（= 保本线）
  // rent = 该档常用办公室的房租摊销（元/人日）= 月租 / (工位数 × 30)，按满员工位摊
  scales: {
    小:   { w: 1,  W: 47,   pc: 1,    S: 48, off: '起步小屋' },
    中:   { w: 5,  W: 235,  pc: 1.26, S: 60, off: '正式办公室' },
    大:   { w: 20, W: 940,  pc: 2.05, S: 70, off: '独立工作室' },
    超大: { w: 90, W: 4230, pc: 3.01, S: 78, off: '写字楼整层' }
  },
  // 市场与口碑
  pool: 6000, poolExp: 0.93, scoreExp: 1.3,
  target: 72.5,            // 相对分基准：Q = S 时 Qe = 72.5，即保本点
  priceBase: 66.7,
  convBase: 0.05, convGain: 0.55, convExp: 2, forget: 0.15,
  kSlope: 3.6, kOffset: 1.9,
  half: 21, natural: 0.0004, platform: 0.10,
  fanCarry: 0.7, valuationDays: 540,
  // 宣发：关注单价 = 单价 × (基础 + 斜率 × 付费覆盖)，越买越贵
  unitBase: 0.47, unitSlope: 0.35,
  // 成本（元/人日）：工资 = 标准日薪 × (能力/60)^溢价比，人日成本与工资同口径
  wageDay: 400, standardQ: 60, wageExp: 3,
  // 宣发五档：首发总关注占市场的比例
  tiers: [['不投', 0.10], ['试水', 0.25], ['常规', 0.45], ['力推', 0.65], ['全力', 0.85]]
};

// peak = 该阶段建议编制的平均能力，用来算月固定工资
export const offices = [
  { name: '自家', seats: 1, rent: 0, cost: 0, crew: 1, peak: 45 },
  { name: '起步小屋', seats: 4, rent: 1.5, cost: 0, crew: 3, peak: 48 },
  { name: '正式办公室', seats: 10, rent: 3, cost: 8, crew: 6, peak: 60 },
  { name: '独立工作室', seats: 16, rent: 5, cost: 26, crew: 10, peak: 70 },
  { name: '写字楼整层', seats: 40, rent: 12, cost: 64, crew: 24, peak: 85 },
  { name: '园区大楼', seats: 100, rent: 30, cost: 160, crew: 60, peak: 93 }
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export const relativeScore = (s, q) => clamp(P.target + q - P.scales[s].S, 0, 100);
export const quality = qe => clamp((qe - 40) / 60, 0, 1);
export const marketOf = (s, qe) =>
  P.pool * Math.pow(P.scales[s].w, P.poolExp) * Math.pow(qe / 100, P.scoreExp);
export const priceOf = s => P.priceBase * P.scales[s].pc;
export const conversion = qe => P.convBase + P.convGain * Math.pow(quality(qe), P.convExp);
export const spread = qe => clamp(P.kSlope * quality(qe) - P.kOffset, -1, 2);
export const monthlyWage = (peak, speed = 100) =>
  1.2 * (peak <= P.standardQ ? peak / P.standardQ : Math.pow(peak / P.standardQ, P.wageExp)) * (speed / 100);  // 万元 / 月
// 60 分以下线性（新人便宜但要能活），60 分以上按指数涨价（高手稀缺）
const wageFactor = q => {
  const r = q / P.standardQ;
  return r <= 1 ? r : Math.pow(r, P.wageExp);
};
// 房租摊销：月租 / (满员工位 × 30 天)，元/人日
export const rentDay = s => {
  const o = offices.find(x => x.name === P.scales[s].off) || offices[0];
  return o.rent * 10000 / (o.seats * 30);
};
export const dayCost = (q, s) => (P.wageDay * wageFactor(q) + rentDay(s)) / 10000;   // 万 / 人日
export const unitPrice = (s, cover) =>
  priceOf(s) * (P.unitBase + P.unitSlope * Math.max(0, cover - P.platform));
export const promoCost = (s, qe, cover) => {
  const x = Math.max(0, cover - P.platform);
  return x * marketOf(s, qe) * unitPrice(s, cover) / 10000;
};

// 单作结算。q 绝对评分，cover 首发总覆盖，fansStock 上作粉丝存量。
export function title(s, q, cover, fansStock = 0) {
  const price = priceOf(s);
  const qe = relativeScore(s, q);
  const market = marketOf(s, qe);
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
  const promo = promoCost(s, qe, cover);
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
