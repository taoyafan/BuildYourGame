// Pure business rules without engine imports, so they can also run in Node for balance checks.
// This is the six-dimension skeleton: every work unit is judged by the person who did it, and the
// score of a dimension is the ability of its finished work times its progress, never capped.

// Build version: bumped on every code change so the running preview can be matched against source.
// Check the in-game top bar, the repo-root VERSION file, or a git tag to confirm which build is live.
export const VERSION = '0.1.27';

// Six quality dimensions. Creativity and stability carry extra mechanics: stability is scored from the
// defects still open, and testing only decides how many of them are found in time to be fixed.
export const DIMENSIONS: any[] = [
  { key: 'creativity', name: '创意', short: '创', desc: '作品的新意与辨识度，影响能否出圈。' },
  { key: 'depth', name: '深度', short: '深', desc: '系统与策略的掌握空间，影响长尾与后续扩展。' },
  { key: 'fluidity', name: '流畅', short: '流', desc: '操作响应、帧率与加载，操作型最看重。' },
  { key: 'picture', name: '画面', short: '画', desc: '美术与场景的呈现水准。' },
  { key: 'sound', name: '声音', short: '声', desc: '音乐与音效的呈现水准。' },
  { key: 'stability', name: '稳定', short: '稳', desc: '未修缺陷越多越低。测试把缺陷找出来，修好才加分；没测到的会在发售后被玩家碰到。' }
];
export const DIM_KEYS = DIMENSIONS.map(dimension => dimension.key);
export const CONTENT_KEYS = DIM_KEYS.filter(key => key !== 'stability');

// Seven kinds of work. Anyone may do any of them; repair is settled with the ability of the dimension
// that left the defect.
export const WORKS: any[] = [
  { key: 'creativity', name: '创意', ability: 'creativity', dimension: 'creativity' },
  { key: 'depth', name: '深度', ability: 'depth', dimension: 'depth' },
  { key: 'fluidity', name: '流畅', ability: 'fluidity', dimension: 'fluidity' },
  { key: 'picture', name: '画面', ability: 'picture', dimension: 'picture' },
  { key: 'sound', name: '声音', ability: 'sound', dimension: 'sound' },
  { key: 'discover', name: '发现缺陷', ability: 'discover', dimension: 'stability' }
];
export const WORK_KEYS = WORKS.map(work => work.key);
// A safe dimension read: a malformed or legacy project that is somehow missing a dimension must never
// crash the home screen. Missing dimensions behave as untouched (total 0) rather than throwing.
function workOf(project: any, key: string) {
  return (project.work && project.work[key]) || { total: 0, done: 0, value: 0 };
}
// The five abilities a person has, plus one speed. Repair has no ability of its own.
export const ABILITIES: any[] = [
  { key: 'creativity', name: '创意' },
  { key: 'depth', name: '深度' },
  { key: 'fluidity', name: '流畅' },
  { key: 'picture', name: '画面' },
  { key: 'sound', name: '声音' },
  { key: 'discover', name: '发现' }
];
export const ABILITY_KEYS = ABILITIES.map(ability => ability.key);

// Three settings of scale decide how much work there is, what it may sell for and how big its market is.
export const SCALES = [
  { name: '小型', work: 1, price: 1, reach: 1 },
  { name: '中型', work: 1.7, price: 1.3, reach: 2 },
  { name: '大型', work: 2.6, price: 1.65, reach: 4 }
];

// Three genre templates. The share is the slice of the workload each dimension takes; the weights are
// how much the audience cares about each dimension. Genres never cap a dimension.
// Workloads are tuned for the first title's pacing: a small game with two people takes about a month,
// so the opening tutorial (project → prototype → trial build → promotion → release) fits in one sit.
// One person alone still needs roughly twice that, which is what makes the first hire feel worthwhile.
export const TYPES: any = {
  action: {
    name: '操作型', audience: '动作玩家', work: 60, price: 0.01,
    share: { creativity: 0.1, depth: 0.12, fluidity: 0.3, picture: 0.22, sound: 0.1, stability: 0.16 },
    weights: { creativity: 0.1, depth: 0.15, fluidity: 0.35, picture: 0.2, sound: 0.08, stability: 0.12 }
  },
  think: {
    name: '思考型', audience: '策略玩家', work: 70, price: 0.008,
    share: { creativity: 0.2, depth: 0.34, fluidity: 0.06, picture: 0.16, sound: 0.1, stability: 0.14 },
    weights: { creativity: 0.15, depth: 0.4, fluidity: 0.05, picture: 0.15, sound: 0.1, stability: 0.15 }
  },
  story: {
    name: '叙事型', audience: '叙事玩家', work: 55, price: 0.007,
    share: { creativity: 0.2, depth: 0.16, fluidity: 0.08, picture: 0.24, sound: 0.2, stability: 0.12 },
    weights: { creativity: 0.28, depth: 0.12, fluidity: 0.05, picture: 0.2, sound: 0.25, stability: 0.1 }
  }
};

// Five role priors. A role says what someone is likely good at, not how fast they work: doing another
// trade's work still moves the date, it only lowers the score and leaves more defects.
export const ROLES: any = {
  code: {
    name: '程序', home: ['fluidity', 'depth', 'stability'], task: '负责流畅、深度与稳定',
    prior: { creativity: [25, 55], depth: [60, 90], fluidity: [65, 92], picture: [20, 45], sound: [15, 40], discover: [40, 70] }
  },
  design: {
    name: '策划', home: ['creativity', 'depth'], task: '负责创意与深度',
    prior: { creativity: [62, 92], depth: [58, 88], fluidity: [30, 60], picture: [25, 50], sound: [25, 50], discover: [35, 65] }
  },
  art: {
    name: '美术', home: ['picture'], task: '负责画面',
    prior: { creativity: [45, 70], depth: [20, 45], fluidity: [25, 50], picture: [65, 95], sound: [20, 45], discover: [25, 50] }
  },
  audio: {
    name: '音频', home: ['sound'], task: '负责声音',
    prior: { creativity: [40, 65], depth: [20, 45], fluidity: [30, 55], picture: [20, 45], sound: [68, 95], discover: [25, 50] }
  },
  test: {
    name: '测试', home: ['discover', 'stability'], task: '负责发现缺陷',
    prior: { creativity: [25, 50], depth: [30, 55], fluidity: [40, 65], picture: [20, 45], sound: [20, 45], discover: [70, 95] }
  }
};
// Audio and test unlock after the first release; operations and publishing have no standing post.
export const LOCKED_ROLES = ['audio', 'test'];

// Ability tags only summarise what the numbers already say. Personality tags change what happens.
export const ABILITY_TAGS: any = {
  music: { name: '音乐突出', ability: 'sound', text: '声音能力在同行中偏高。' },
  ear: { name: '听感敏锐', ability: 'sound', text: '对声音细节很挑剔。' },
  vision: { name: '画面感好', ability: 'picture', text: '画面能力偏高。' },
  polish: { name: '精益求精', ability: 'depth', text: '深度能力偏高，耐得住打磨。' },
  inventor: { name: '点子很多', ability: 'creativity', text: '创意能力偏高。' },
  engineer: { name: '工程扎实', ability: 'fluidity', text: '流畅能力偏高。' },
  hunter: { name: '毒辣眼光', ability: 'discover', text: '发现缺陷的能力偏高。' },
  steady: { name: '稳扎稳打', ability: 'stability', text: '稳扎稳打，做出来的东西很少出问题。' }
};
export const PERSONALITY_TAGS: any = {
  iron: { name: '抗压', text: '加班不太会积累负面标签。' },
  eager: { name: '拼命', text: '产出更高，但更容易积累负面标签。' },
  grumbler: { name: '爱抱怨', text: '一旦加班就很快不满。' },
  growth: { name: '好学', text: '参与作品时成长更快。' },
  careful: { name: '细心', text: '做的工作留下的缺陷更少。' },
  speedy: { name: '手快', text: '工作速度更高。' },
  social: { name: '合群', text: '团建更容易出效果。' }
};
// Negative labels are the only form stress takes. They lower ability and output, and only overtime
// produces them. No fallback: the more often someone works overtime, the likelier they appear.
export const STRESS_TAGS: any = {
  tired: { name: '疲惫', text: '能力与产出下降。' },
  leaving: { name: '想走', text: '继续施压就可能离开。' }
};

export const CHANNELS: any = {
  friends: { name: '熟人介绍', fee: 0.2, text: '朋友和同学推荐，花费少，能力参差，工资较低。', skill: [25, 55], speed: [60, 95], wage: [1, 0.02, 0.01, 0.4] },
  web: { name: '招聘网站', fee: 0.8, text: '公开招聘，候选人更有经验，工资也更高。', skill: [45, 78], speed: [70, 105], wage: [1.6, 0.03, 0.015, 0.6], lock: '完成首作后开放' },
  headhunt: { name: '行业推荐', fee: 3, text: '同行推荐的成熟开发者，能力强、要价高，推荐费也贵。', skill: [68, 93], speed: [85, 120], wage: [2.5, 0.035, 0.02, 0.8], lock: '搬进正式办公室后开放' }
};
export const OFFICES = [
  { name: '起步小屋', seats: 4, rent: 1.5 },
  { name: '正式办公室', seats: 10, rent: 3, cost: 8 },
  { name: '独立工作室', seats: 16, rent: 5, cost: 30 }
];
export const STUDIO_TOOLS: any = {
  creativity: { name: '创意工作台', cost: 5, text: '做创意工作时速度 +20%。' },
  depth: { name: '设计工具', cost: 6, text: '做深度工作时速度 +20%。' },
  fluidity: { name: '性能分析器', cost: 6, text: '做流畅工作时速度 +20%。' },
  picture: { name: '绘画软件', cost: 5, text: '做画面工作时速度 +20%。' },
  sound: { name: '音频工作站', cost: 4, text: '做声音工作时速度 +20%。' },
  discover: { name: '自动化测试', cost: 6, text: '发现与修复缺陷的速度 +20%。' }
};
// Do not open the whole tool shop on day one: three core development tools are enough while the
// first project is still taking shape. Visual, audio and defect tooling appears once a prototype
// exists, when the player can actually see which dimension is lagging.
const EARLY_TOOLS = ['creativity', 'depth', 'fluidity'];
export function toolOpen(state: any, key: string) {
  if (!has(STUDIO_TOOLS, key)) return false;
  if (EARLY_TOOLS.includes(key)) return true;
  return state.catalog.length > 0 || state.projects.some((project: any) => project.checkpoints?.prototype || project.released);
}

// Sound can be bought instead of hired: a one-off purchase finishes part of the sound dimension at a
// modest quality, which is how a small team ships sound at all before it can afford an audio hire.
export const SOUND_OUTSOURCE = [
  { name: '廉价素材库', cost: 2, share: 0.6, quality: 40, text: '立刻完成六成声音工作，但这一维做不高；之后可由音频岗返工。' },
  { name: '委托音频制作', cost: 6, share: 1, quality: 65, text: '一次性做完声音工作，质量中规中矩。' }
];

// Promotion is one budget control, not a channel pick. It costs money and buyers only: no time is lost.
// The budget is counted in buyers (budget / price), which asks the real question: what is one more buyer worth?
export const PROMOTE_HALF = 2.8;
export const PROMOTE_BUYERS = 420;
export const PROMOTE_CAP = 8;
export const PROMOTE_TIERS = [2, 4, 6];
// Minimum discount a title may go to. The system decides when to run a sale and how deep within the floor.
export const DISCOUNTS = [0.75];
export const RELEASE_LEAD_DAYS = 30;

export const UNIT_MARKS = [1000, 5000, 10000, 50000];
export const MARKET_SIZE = 5000;
// One work unit is one person-day of a newcomer. A dimension never stops at a cap; rework replaces the
// weakest finished part, so pushing a score up costs full wages for what the new hand can reach.
// Defects left per person-day of content at ability 0; a full-ability hand leaves none.
const DEFECT_RATE = 0.5;
// Person-days to fix one defect at full ability.
const REPAIR_WORK = 0.4;
const START_CASH = 50;
const BRIDGE = 20;
const PROTO = 0.25;
const TRIAL = 0.55;
// Months of wage a layoff costs per year of service, plus one (N+1).
const OVERTIME_BOOST = 1.45;
const OVERTIME_DEFECT = 1.45;
const GROWTH_PER_WORK = 0.02;
const FAMILY_NAMES = ['林', '陈', '周', '许', '沈', '叶', '宋', '程', '顾', '苏', '陆', '江'];
const GIVEN_NAMES = ['知夏', '明远', '可宁', '星河', '亦舟', '思齐', '安然', '予墨', '嘉禾', '清和', '一帆', '若溪'];

const clone = (value: any) => JSON.parse(JSON.stringify(value));
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const round = (value: number) => Math.round(value * 100) / 100;
const tier = (value: any) => Number.isInteger(value) && value >= 0 && value <= 2;
// Object.hasOwn is missing on older mini-game runtimes (iOS < 15.4).
const has = (object: any, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function random(state: any) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

export function market(type: string, month: number) {
  const position = (Math.floor((month - 1) / 4) + Object.keys(TYPES).indexOf(type)) % 3;
  return [
    { multiplier: 1.22, label: '关注上升', description: '近期同类话题较热，但热度不一定持续到发售。' },
    { multiplier: 1, label: '需求平稳', description: '没有明显风口，作品本身更重要。' },
    { multiplier: 0.8, label: '市场拥挤', description: '近期同类作品较多，需要更谨慎地控制投入。' }
  ][position];
}

function blankProject(id: string, plan: any, day: number) {
  const type = TYPES[plan.type];
  const scale = SCALES[plan.scale];
  const work: any = {};
  const contentShare = sum(CONTENT_KEYS.map(key => type.share[key]));
  for (const key of DIM_KEYS) work[key] = { total: type.work * scale.work * type.share[key] / contentShare, done: 0, value: 0, batches: [] };
  return {
    id, name: plan.name, type: plan.type, scale: plan.scale, parentId: plan.parentId || null,
    work, progress: 0,
    defects: [], found: 0, repairProgress: 0,
    followers: 0, promoted: 0, invested: 0, started: day, released: null,
    checkpoints: { prototype: false, demo: false, ready: false },
    test: null, tests: 0, testCount: 0,
    sequel: plan.sequel || null, expectation: plan.expectation || 0, deadline: null,
    contributions: {}, priority: 0
  };
}

export function createStudio(seed = Date.now()) {
  return {
    version: 6, rulesRevision: 3, seed: seed >>> 0, day: 1, company: '', cash: START_CASH, founder: 'code',
    staff: [], projects: [], catalog: [], tools: [], candidates: {},
    event: null, over: false, accrued: 0,
    ledger: { opening: START_CASH, income: 0, expense: 0, payroll: 0 },
    report: null, reports: [], history: [], tutorial: { skipped: false, seen: {} }, notices: {}, bridgeUsed: false, lastRelease: null,
    office: 0, goals: { firstRelease: null, breakEven: null, moved: null, topTen: null, award: null, expanded: null }, fans: 0, feed: [],
    overtime: {}, lastOuting: null, sound: true, exhibitions: [], awards: [], rankings: [], operation: null
  };
}

export const tutorialActive = (state: any) => !!state.company && state.catalog.length === 0 && !state.tutorial.skipped;
export const seats = (state: any) => OFFICES[state.office].seats;
export const projectOpen = (state: any) => state.projects.filter((project: any) => !project.released);
export const activeProject = (state: any, id?: string) => id ? state.projects.find((project: any) => project.id === id) || null : projectOpen(state)[0] || null;
// Projects that have shipped but still take people: patches, reworks and DLC all happen here.
export const afterSaleProjects = (state: any) => state.projects.filter((project: any) => project.released);

function studioLog(state: any, title: string, text: string) {
  state.history.unshift({ day: state.day, title, text });
  state.history = state.history.slice(0, 120);
}

function announce(state: any, item: any) {
  state.feed = [...state.feed, { day: state.day, ...item }].slice(-10);
}

function studioAction(state: any) {
  if (state.over) throw new Error('公司已停止经营。');
  return clone(state);
}

function spend(state: any, amount: number, label: string) {
  if (amount > state.cash) throw new Error('当前资金不足。');
  state.cash = round(state.cash - amount);
  state.ledger.expense = round(state.ledger.expense + amount);
  studioLog(state, label, `支付 ${amount.toFixed(2)} 万。`);
}

// A person's default work is their trade's first home key that is a real work key, so an old save
// whose stored home is not a work (test used to store 'stability') still defaults to something real.
function homeWork(person: any) {
  if (WORK_KEYS.includes(person.home)) return person.home;
  return (ROLES[person.role].home || []).find((key: string) => WORK_KEYS.includes(key)) || 'discover';
}

export function nameCompany(state: any, name: string, founder?: string) {
  const next = studioAction(state);
  const value = String(name || '').trim().slice(0, 24);
  if (!value) throw new Error('请输入公司名称。');
  if (founder && !has(ROLES, founder)) throw new Error('创始人出身无效。');
  next.company = value;
  if (founder) next.founder = founder;
  if (!next.staff.length) {
    // The founder is the first worker: one person can carry the first title alone, short boards and
    // all. No wage — the company's money is the founder's money.
    const abilities: any = {};
    for (const key of ABILITY_KEYS) {
      const [low, high] = ROLES[next.founder].prior[key];
      abilities[key] = Math.round(low + random(next) * (high - low));
    }
    next.staff.push({
      id: `founder-${next.seed}`, name: '创始人', role: next.founder, abilities, speed: 95, tags: [], wage: 0,
      hired: true, work: 0, growth: 0, level: 0, stressTags: [], stressChance: 0, overtimeDays: 0,
      leaveUntil: 0, outingPity: 0, fame: false, rampup: 0, joined: next.day, home: homeWork({ role: next.founder, home: '' }), founder: true
    });
  }
  studioLog(next, '工作室成立', `${value}在一间小屋里起步，先做出第一款游戏。`);
  return next;
}

export function channelOpen(state: any, channel: string) {
  if (channel === 'web') return state.goals.firstRelease !== null;
  if (channel === 'headhunt') return state.office >= 1;
  return channel === 'friends';
}

export function roleOpen(state: any, role: string) {
  if (!LOCKED_ROLES.includes(role)) return true;
  return state.goals.firstRelease !== null;
}

function pickAbilities(state: any, role: string, channel: any) {
  const prior = ROLES[role].prior;
  const source = CHANNELS[channel];
  const abilities: any = {};
  for (const key of ABILITY_KEYS) {
    const [low, high] = prior[key];
    const experience = (source.skill[0] + random(state) * (source.skill[1] - source.skill[0])) / 100;
    abilities[key] = Math.round(clamp(low * 0.35 + high * experience * 0.75, 5, 95));
  }
  if (random(state) < 0.15) {
    const outside = ABILITY_KEYS.filter(key => !ROLES[role].home.includes(key));
    const key = outside[Math.floor(random(state) * outside.length)];
    abilities[key] = Math.round(clamp(40 + source.skill[0] * 0.35 + random(state) * source.skill[1] * 0.45, 5, 95));
  }
  return abilities;
}

function rollTags(state: any, abilities: any) {
  const count = random(state) < 0.45 ? 1 : random(state) < 0.7 ? 2 : 3;
  let abilityKeys = Object.keys(ABILITY_TAGS).filter(key => ABILITY_KEYS.includes(ABILITY_TAGS[key].ability) && abilities[ABILITY_TAGS[key].ability] >= 60);
  const personalityKeys = Object.keys(PERSONALITY_TAGS);
  const tags: any[] = [];
  while (abilityKeys.length && tags.length < count && random(state) < 0.65) {
    const key = abilityKeys[Math.floor(random(state) * abilityKeys.length)];
    const ability = ABILITY_TAGS[key].ability;
    tags.push({ kind: 'ability', key });
    abilityKeys = abilityKeys.filter(item => ABILITY_TAGS[item].ability !== ability);
  }
  while (tags.length < count) {
    const key = personalityKeys[Math.floor(random(state) * personalityKeys.length)];
    if (!tags.some(tag => tag.key === key)) tags.push({ kind: 'personality', key });
  }
  return tags;
}

// Each layoff leaves a mark: recruiting gets pricier as word gets around, up to double.
export function recruitFee(state: any, channel: string) {
  const layoffs = state.notices.layout || 0;
  return round(CHANNELS[channel].fee * (1 + Math.min(1, layoffs * 0.25)));
}

export function publishRecruitment(state: any, role: string, channel = 'friends') {
  if (!has(ROLES, role) || !has(CHANNELS, channel)) throw new Error('招聘岗位无效。');
  if (!roleOpen(state, role)) throw new Error(`${ROLES[role].name}岗位首作发售后才开放。`);
  if (!channelOpen(state, channel)) throw new Error(`${CHANNELS[channel].name}${CHANNELS[channel].lock}。`);
  const next = studioAction(state);
  const batch = Math.floor((next.day - 1) / 14);
  const key = `${role}:${channel}`;
  if (next.candidates[key] && next.candidates[key].batch === batch) return next;
  const source = CHANNELS[channel];
  spend(next, recruitFee(next, channel), `${source.name}招聘${ROLES[role].name}`);
  const people = Array.from({ length: 3 }, (_, index) => {
    const abilities = pickAbilities(next, role, channel);
    const tags = rollTags(next, abilities);
    const speed = Math.round(source.speed[0] + random(next) * (source.speed[1] - source.speed[0]));
    const strongest = ABILITY_KEYS.reduce((best, item) => abilities[item] > abilities[best] ? item : best, ABILITY_KEYS[0]);
    const name = FAMILY_NAMES[Math.floor(random(next) * FAMILY_NAMES.length)] + GIVEN_NAMES[Math.floor(random(next) * GIVEN_NAMES.length)];
    const wage = round(source.wage[0] + abilities[strongest] * source.wage[1] + (speed - source.speed[0]) * source.wage[2] + random(next) * source.wage[3]);
    return { id: `${role}-${channel}-${batch}-${index}-${next.seed}`, name, role, abilities, speed, tags, wage, hired: false, work: 0, growth: 0, level: 0, stressTags: [], stressChance: 0, overtimeDays: 0, leaveUntil: 0, outingPity: 0, fame: false, rampup: 0 };
  });
  // A name in the industry shows up only where word of mouth is worth something: a strong record draws
  // them out, they want their own people and they take a while to settle in.
  const fameChance = next.goals.award !== null ? 0.35 : reputationOf(next) >= 45 ? 0.18 : 0;
  if (fameChance > 0 && random(next) < fameChance) {
    const star = people[Math.floor(random(next) * people.length)];
    for (const key of ABILITY_KEYS) star.abilities[key] = Math.min(100, star.abilities[key] + 14 + Math.round(random(next) * 10));
    star.speed = Math.min(140, star.speed + 16);
    star.wage = round(star.wage * 1.6);
    star.fame = true;
    star.rampup = 30;
    star.tags = [...star.tags.slice(0, 2), { kind: 'personality', key: 'eager' }];
    // A name comes with terms: half of them insist on bringing an old crewmate, the rest only take
    // the genre they are known for.
    star.condition = random(next) < 0.5 ? 'crew' : 'type:' + Object.keys(TYPES)[Math.floor(random(next) * Object.keys(TYPES).length)];
  }
  next.candidates[key] = { batch, people };
  studioLog(next, '发布招聘', `${source.name}送来 ${people.length} 份${ROLES[role].name}简历，名单保持到第 ${(batch + 1) * 14} 天。`);
  return next;
}

// What a star's terms mean, in one line for the card and the person page.
export function conditionText(person: any) {
  if (!person || !person.condition) return '';
  if (person.condition === 'crew') return '要求带一位旧部一同入职（录用时需要有空余工位）';
  if (person.condition.startsWith('type:')) {
    const type = TYPES[person.condition.slice(5)];
    return type ? `只接${type.name}项目，参与其他类型时产出下降三成` : '';
  }
  return '';
}

export function hireReasons(state: any, id: string): string[] {
  const person: any = Object.values(state.candidates).flatMap((pool: any) => pool.people).find((item: any) => item.id === id);
  if (!person || person.hired) return [person?.hired ? '这位候选人已录用。' : '候选人已不可录用。'];
  const reasons: string[] = [];
  if (state.staff.length >= seats(state)) reasons.push(`${OFFICES[state.office].name}只有 ${seats(state)} 个工位，当前已满。`);
  if (state.cash - state.accrued < monthlyCost(state) + person.wage) reasons.push('扣除应付工资后，资金不够支付录用后的近期工资。');
  return reasons;
}

export function hire(state: any, id: string) {
  const reasons = hireReasons(state, id);
  if (reasons.length) throw new Error(reasons.join('\n'));
  const next = studioAction(state);
  const person: any = Object.values(next.candidates).flatMap((pool: any) => pool.people).find((item: any) => item.id === id);
  person.hired = true;
  next.staff.push({ ...person, joined: next.day, home: homeWork(person) });
  studioLog(next, `${person.name} 加入`, `${ROLES[person.role].name}，月薪 ${person.wage.toFixed(2)} 万。`);
  // A star who insisted on bringing their old crew takes one along when a seat is free for them.
  if (person.fame && person.condition === 'crew' && next.staff.length < seats(next)) {
    const role = ['code', 'design', 'art'][Math.floor(random(next) * 3)];
    const abilities: any = {};
    for (const key of ABILITY_KEYS) {
      const [low, high] = ROLES[role].prior[key];
      abilities[key] = Math.round((low + high) / 2 + (random(next) - 0.5) * 20);
    }
    const mate = {
      id: `crew-${next.seed}-${next.staff.length}`,
      name: FAMILY_NAMES[Math.floor(random(next) * FAMILY_NAMES.length)] + GIVEN_NAMES[Math.floor(random(next) * GIVEN_NAMES.length)],
      role, abilities, speed: 95, tags: [], wage: round(1.4 + random(next)), hired: true,
      work: 0, growth: 0, level: 0, stressTags: [], stressChance: 0, overtimeDays: 0,
      leaveUntil: 0, outingPity: 0, fame: false, rampup: 0, joined: next.day, home: homeWork({ role, home: '' })
    };
    next.staff.push(mate);
    studioLog(next, `${mate.name} 一同入职`, `${person.name}的旧部，${ROLES[role].name}，月薪 ${mate.wage.toFixed(2)} 万。`);
  }
  return next;
}

// Layoffs cost N+1 months of wage, and leave a mark on the people who stay.
export function dismiss(state: any, id: string) {
  const next = studioAction(state);
  const person = next.staff.find((item: any) => item.id === id);
  if (!person) throw new Error('员工不存在。');
  if (person.founder) throw new Error('创始人不能被裁员。');
  const years = Math.max(0, Math.floor((next.day - person.joined) / 360));
  const severance = round(person.wage * (years + 1));
  if (severance > next.cash) throw new Error(`遣散费需要 ${severance.toFixed(2)} 万，资金不足。`);
  next.cash = round(next.cash - severance);
  next.ledger.expense = round(next.ledger.expense + severance);
  next.staff = next.staff.filter((item: any) => item.id !== id);
  // People who stay see it: the layoff lowers hiring appeal and leaves a mark on morale.
  next.notices.layout = (next.notices.layout || 0) + 1;
  for (const other of next.staff) {
    if (!other.stressTags.includes('tired') && random(next) < 0.35) other.stressTags.push('tired');
  }
  if (next.event?.person === id) next.event = null;
  studioLog(next, `${person.name} 被裁`, `支付 N+1 遣散费 ${severance.toFixed(2)} 万，在职同事仍留有心结。`);
  return next;
}

export const monthlyCost = (state: any) => round(OFFICES[state.office].rent + state.staff.reduce((total: number, person: any) => total + person.wage, 0));

function able(person: any, ability: string) {
  // Stress labels lower ability: that is the only form stress takes.
  const penalty = person.stressTags.includes('leaving') ? 0.75 : person.stressTags.includes('tired') ? 0.85 : 1;
  return person.abilities[ability] * penalty;
}

function speedOf(state: any, person: any, workKey: string) {
  if ((person.leaveUntil || 0) > state.day) return 0;
  let value = person.speed / 100;
  if (person.tags.some((tag: any) => tag.key === 'speedy')) value *= 1.12;
  if (state.tools.includes(workKey === 'repair' ? 'discover' : WORKS.find(work => work.key === workKey)?.ability || workKey)) value *= 1.2;
  const overtime = !!state.overtime[person.id];
  if (overtime) value *= OVERTIME_BOOST;
  if (person.stressTags.includes('tired')) value *= 0.8;
  if (person.stressTags.includes('leaving')) value *= 0.7;
  // An industry name needs time to fit in with the existing team.
  if (person.fame && state.day - (person.joined || 0) < 30) value *= 0.8;
  return value;
}

// One person's output for one day, spread across the works they are assigned to in proportion to the
// remaining work of each, so several works finish roughly together. Nobody assigned means no progress.
// A person belongs to exactly one project: the one they are explicitly assigned to, or — with no
// assignment — the first open project of the highest priority. Shipped titles only get people the
// player explicitly sends there, so patching and reworking a back title is always a deliberate
// trade. A project that is not in the list (a hypothetical plan) counts everyone.
function belongsTo(state: any, project: any, person: any) {
  const known = state.projects.some((item: any) => item.id === project.id);
  if (!known) return true;
  for (const other of state.projects) {
    if (chosenWorks(other, person).length) return other.id === project.id;
  }
  if (project.released) return false;
  const live = state.projects.filter((item: any) => !item.released);
  if (!live.length) return false;
  const best = Math.min(...live.map((item: any) => item.priority ?? 0));
  return live.indexOf(project) === live.findIndex((item: any) => (item.priority ?? 0) === best);
}

// One person's output for one day. Explicit assignments win; with none, the person works their trade
// (their first home work). Time is split in proportion to what is left, so several works finish
// roughly together. Nobody assigned and no trade left means no progress.
// The assignment shown by the UI is the same one used for production. With no explicit choice a
// person does their home work; an explicit list replaces that default instead of adding to it.
// Assignment lists live in saves, so tolerate values written by older builds. In particular, Cocos
// used to transpile `[...new Set(list)]` into `[].concat(new Set(list))`, which stored a Set object
// instead of strings; after JSON serialisation it became `{}`. Ignore anything that is not a work key
// and never let a malformed list hide the person's default home work.
export function chosenWorks(project: any, person: any) {
  const explicit = project?.assignments?.[person.id];
  if (!Array.isArray(explicit)) return [];
  return Array.from(new Set(explicit.filter((key: string) => WORK_KEYS.includes(key))));
}

export function assignedWorks(project: any, person: any) {
  const explicit = chosenWorks(project, person);
  return explicit.length ? explicit : [homeWork(person)];
}

export function personWorks(state: any, project: any, person: any) {
  return belongsTo(state, project, person) ? assignedWorks(project, person) : [];
}

export function personActivity(state: any, project: any, person: any) {
  if (!belongsTo(state, project, person)) return '未参与本项目';
  if (person.leaveUntil > state.day) return '带薪休假中';
  const split = assignDay(state, project, person);
  if (split.repair) return '自动修复待修缺陷（消耗工时）';
  return Object.keys(split).map(key => key === 'discover' ? (remainingOf(project, key) > 0.0001 ? '测试' : '复测') : `${DIMENSIONS.find(item => item.key === key)?.name}${remainingOf(project, key) > 0.0001 ? '制作' : '返工'}`).join('、');
}

function assignDay(state: any, project: any, person: any) {
  const usable = assignedWorks(project, person);
  const pending = usable.some(key => remainingOf(project, key) > 0.0001);
  if (!pending && project.defects.some((defect: any) => defect.found && !defect.fixed)) return { repair: 1 };
  const remaining: any = {};
  const open: string[] = [];
  for (const key of usable) {
    const left = remainingOf(project, key);
    if (left > 0) { remaining[key] = left; open.push(key); }
  }
  // A finished dimension still gets time when it is the only thing assigned, so rework can happen.
  const list = open.length ? open : usable.slice(0, 1);
  const total = sum(list.map((key: string) => remaining[key] ?? 1));
  if (!list.length) return {};
  const out: any = {};
  for (const key of list) out[key] = total > 0 ? (remaining[key] ?? 1) / total : 1 / list.length;
  return out;
}

function remainingOf(project: any, workKey: string) {
  const work = workOf(project, WORKS.find(item => item.key === workKey)?.dimension || workKey);
  return Math.max(0, work.total - work.done);
}

// Six scores: the finished work's average ability times the progress of its dimension. Progress is
// never capped, and rework replaces the weakest finished part, so a score creeps toward the reworker.
function dimensionScore(work: any) {
  if (work.done <= 0 || work.total <= 0) return 0;
  return work.value / work.total;
}

// Test coverage: the testing workload scored like any other work, read as a share from 0 to 1.
function coverage(project: any) {
  return clamp(dimensionScore(workOf(project, 'stability')), 0, 100) / 100;
}

// Stability is measured against the most defects the finished content could have left.
function stabilityFrom(project: any, unfixed: number) {
  const room = CONTENT_KEYS.reduce((total, key) => total + workOf(project, key).done, 0) * DEFECT_RATE;
  return room > 0 ? round(clamp(100 * (1 - unfixed / room), 0, 100)) : 0;
}

function overallOf(type: string, dimensions: any) {
  const weights = TYPES[type].weights;
  return round(DIM_KEYS.reduce((total, key) => total + dimensions[key] * weights[key], 0));
}

// What the player can infer: defects testing caught divided by coverage estimates the total, so the
// hidden part is a guess that can be off either way. Below 10% coverage there is nothing to go on.
function estimatedUnfixed(project: any) {
  const share = coverage(project);
  if (share < 0.1) return null;
  const caught = project.defects.filter((defect: any) => (defect.roll ?? 1) < share).length;
  const found = project.defects.filter((defect: any) => defect.found).length;
  const known = project.defects.filter((defect: any) => defect.found && !defect.fixed).length;
  return known + Math.max(0, caught / share - found);
}

export function projectMetrics(project: any) {
  const dimensions: any = {};
  for (const key of CONTENT_KEYS) dimensions[key] = round(clamp(dimensionScore(workOf(project, key)), 0, 100));
  const open = project.defects.filter((defect: any) => !defect.fixed).length;
  const known = project.defects.filter((defect: any) => defect.found && !defect.fixed).length;
  dimensions.stability = stabilityFrom(project, open);
  const progress = clamp(CONTENT_KEYS.reduce((total, key) => total + workOf(project, key).done, 0) / Math.max(0.001, CONTENT_KEYS.reduce((total, key) => total + workOf(project, key).total, 0)), 0, 1);
  return {
    progress: round(progress * 100),
    dimensions, overall: overallOf(project.type, dimensions),
    defects: open, known, found: project.found, coverage: round(coverage(project) * 100),
    unfinished: CONTENT_KEYS.filter(key => workOf(project, key).done < workOf(project, key).total - 0.001)
  };
}

// The player's view: stability is estimated from what testing found, never read from the true count.
export function visibleMetrics(project: any) {
  const metrics = projectMetrics(project);
  const estimate = estimatedUnfixed(project);
  const dimensions = { ...metrics.dimensions, stability: estimate === null ? 0 : stabilityFrom(project, estimate) };
  return { ...metrics, dimensions, overall: overallOf(project.type, dimensions), untested: estimate === null, defects: metrics.known };
}

// Each defect is caught by testing once coverage passes its own roll, so on average testing finds its
// coverage share, sometimes more and sometimes fewer. The roll is fixed at birth: reloading never rerolls.
function syncFound(project: any) {
  const share = coverage(project);
  for (const defect of project.defects) {
    if (defect.found || (defect.roll ?? 1) >= share) continue;
    defect.found = true;
    project.found += 1;
  }
}

// Where today's team would land if it finished the work: the finished part keeps its score, the
// remaining part is judged by whoever is on that dimension now. Dimensions nobody works on keep their
// current score — time cannot buy them, only a stronger hand can.
export function expectedDimensions(state: any, project: any) {
  const out: any = {};
  for (const key of DIM_KEYS) {
    const job = WORKS.find(item => item.dimension === key);
    const work = workOf(project, key);
    if (work.total <= 0) { out[key] = 0; continue; }
    const remaining = Math.max(0, work.total - work.done);
    let weighted = 0;
    let hands = 0;
    for (const person of state.staff) {
      if (!belongsTo(state, project, person)) continue;
      const split = assignDay(state, project, person);
      const on = split[job.key] || 0;
      if (!on) continue;
      const output = on * speedOf(state, person, job.key) * conditionFactor(person, project);
      weighted += able(person, job.ability) * output;
      hands += output;
    }
    if (!hands || remaining <= 0.0001) { out[key] = dimensionScore(work); continue; }
    out[key] = round(clamp((work.value + remaining * (weighted / hands)) / work.total, 0, 100));
  }
  // The stability loop above produced the expected coverage; turn it into stability assuming every
  // found defect gets fixed and the defect density seen so far holds for the rest of the content.
  const estimate = estimatedUnfixed(project);
  if (estimate === null) out.stability = 0;
  else {
    const share = coverage(project);
    const caught = project.defects.filter((defect: any) => (defect.roll ?? 1) < share).length;
    const room = CONTENT_KEYS.reduce((total, key) => total + workOf(project, key).done, 0) * DEFECT_RATE;
    const density = room > 0 ? caught / share / room : 0;
    out.stability = round(clamp(100 * (1 - density * (1 - out.stability / 100)), 0, 100));
  }
  return out;
}

// Per-dimension output is the number of people assigned times their speed, so the slowest dimension is
// the bottleneck. Days to finish are estimated from today's assignment.
// A star who only takes their own genre works reluctantly anywhere else.
function conditionFactor(person: any, project: any) {
  if (typeof person.condition === 'string' && person.condition.startsWith('type:') && person.condition !== 'type:' + project.type) return 0.7;
  return 1;
}

export function dimensionPipeline(state: any, project: any) {
  const rate: any = {};
  for (const key of DIM_KEYS) rate[key] = 0;
  let discover = 0;
  let repair = 0;
  // The projection uses the same priority factor the day applies, so the date it shows is the date it keeps.
  const factor = priorityFactor(state, project);
  for (const person of state.staff) {
    if (!belongsTo(state, project, person)) continue;
    const split = assignDay(state, project, person);
    const mood = conditionFactor(person, project);
    for (const [key, share] of Object.entries(split)) {
      const speed = speedOf(state, person, key) * factor * mood;
      if (key === 'repair') { repair += speed * (share as number); continue; }
      if (key === 'discover') discover += speed * (share as number);
      rate[WORKS.find(work => work.key === key).dimension] += speed * (share as number);
    }
  }
  const rows = DIM_KEYS.map(key => {
    const remaining = Math.max(0, workOf(project, key).total - workOf(project, key).done);
    const daily = rate[key];
    // A finished dimension is done whether or not anyone is still on it; only unfinished ones can block.
    const days = remaining <= 0.0001 ? 0 : daily > 0.0001 ? Math.ceil(remaining / daily) : null;
    return { key, remaining: round(remaining), rate: round(daily), days };
  });
  const pending = rows.filter((row: any) => row.key !== 'stability' && row.remaining > 0.0001);
  const idle = pending.filter((row: any) => row.days === null).map((row: any) => row.key);
  // The bottleneck is the furthest date the whole team can actually reach. Dimensions nobody works on
  // are not a date at all: they are reported separately so the player can see what to staff, and the
  // rest of the estimate stays useful instead of collapsing to "unknown".
  const scheduled = pending.filter((row: any) => row.days !== null);
  // A bottleneck is a dimension that finishes strictly later than every other one. When the day is
  // split in proportion to what is left, all dimensions land together — that is not a bottleneck,
  // it is a balanced plan; reporting the arbitrary slowest row as one was simply wrong.
  const slowestDays = scheduled.length ? Math.max(...scheduled.map((row: any) => row.days)) : 0;
  const slowest = scheduled.filter((row: any) => row.days === slowestDays);
  const bottleneck = scheduled.length > 1 && slowest.length === 1 && slowestDays > 0 ? slowest[0] : null;
  return { rows, discover: round(discover), repair: round(repair), bottleneck, idle, blocked: idle.length > 0 };
}

export function projectForecast(state: any, project: any) {
  if (!project) return null;
  const pipeline = dimensionPipeline(state, project);
  const metrics = visibleMetrics(project);
  const totalRemaining = CONTENT_KEYS.reduce((total, key) => total + Math.max(0, workOf(project, key).total - workOf(project, key).done), 0);
  const aggregate = sum(CONTENT_KEYS.map(key => pipeline.rows.find((row: any) => row.key === key)?.rate || 0));
  const days = totalRemaining <= 0.0001 ? 0 : pipeline.idle.length ? null : Math.max(...pipeline.rows.filter((row: any) => row.key !== 'stability').map((row: any) => row.days || 0));
  const done = CONTENT_KEYS.reduce((total, key) => total + workOf(project, key).done, 0) / Math.max(0.001, CONTENT_KEYS.reduce((total, key) => total + workOf(project, key).total, 0));
  return { ...pipeline, days, aggregate: round(aggregate), remaining: round(totalRemaining), progress: round(done * 100), metrics, eta: days === null ? null : state.day + days };
}

export function scaleOpen(state: any, scale: number) {
  return scale === 0 || scale === 1 && state.goals.firstRelease !== null || scale === 2 && state.office >= 1;
}

export function setOvertime(state: any, id: string, enabled: boolean) {
  const next = studioAction(state);
  if (typeof enabled !== 'boolean') throw new Error('加班安排无效。');
  const person = next.staff.find((item: any) => item.id === id);
  if (!person) throw new Error('员工不存在。');
  if (enabled) next.overtime[id] = true;
  else delete next.overtime[id];
  studioLog(next, `${person.name}${enabled ? '开始加班' : '结束加班'}`, enabled ? '产出 +45%，缺陷更多，并会累积负面标签。' : '恢复正常工作。');
  return next;
}

export function setSound(state: any, enabled: boolean) {
  if (typeof enabled !== 'boolean') throw new Error('音效设置无效。');
  return { ...state, sound: enabled };
}

export function takeLeave(state: any, id: string) {
  const next = studioAction(state);
  const person = next.staff.find((item: any) => item.id === id);
  if (!person) throw new Error('员工不存在。');
  // Leave either starts now or extends a leave already running: a resignation talk must never fail
  // just because the person happens to be resting this week.
  person.leaveUntil = Math.max(person.leaveUntil || 0, next.day + 5);
  person.overtimeDays = 0;
  delete next.overtime[id];
  if (next.event?.person === id) next.event = null;
  studioLog(next, `${person.name} 带薪休假`, '未来五天不参与研发，工资照付。');
  return next;
}

// Team building takes working days and pays wages anyway, and trades that for clearing a stress label.
// No cap on how often it runs, but each run in quick succession helps less: the chance falls with recent
// use and recovers when it has been a while. A pity counter guarantees a result within a few runs, and
// both the chance and the counter are shown so the player can plan without knowing this run's outcome.
export const OUTING_PITY = 4;

export function outingChance(state: any, person: any, days = 2) {
  const length = [1, 2, 3].includes(days) ? days : 2;
  const since = state.lastOuting === null || state.lastOuting === undefined ? 99 : state.day - state.lastOuting;
  // Back-to-back runs decay to a floor; a gap restores the base chance.
  const decay = clamp(since / 30, 0, 1);
  const social = person.tags.some((tag: any) => tag.key === 'social') ? 0.12 : 0;
  return clamp(0.2 + (length - 1) * 0.18 + social + decay * 0.25, 0.08, 0.85);
}

export function outingPity(state: any, person: any) {
  return person.outingPity || 0;
}

export function teamOuting(state: any, days = 2) {
  const next = studioAction(state);
  if (!next.staff.length) throw new Error('还没有员工。');
  const length = [1, 2, 3].includes(days) ? days : 2;
  spend(next, round(next.staff.length * 0.4 * length), '团队团建');
  let cleared = 0;
  let gained = 0;
  const pity = OUTING_PITY;
  for (const person of next.staff) {
    person.leaveUntil = Math.max(person.leaveUntil, next.day + length);
    delete next.overtime[person.id];
    const chance = outingChance(next, person, length);
    person.outingPity = (person.outingPity || 0) + 1;
    // The counter guarantees a result by the last run: planning is possible, this run still is not.
    if (person.outingPity >= pity || random(next) < chance) {
      if (person.stressTags.length) { person.stressTags = person.stressTags.slice(1); cleared += 1; }
      const key = ABILITY_KEYS[Math.floor(random(next) * ABILITY_KEYS.length)];
      const before = person.abilities[key];
      person.abilities[key] = round(Math.min(100, person.abilities[key] + length * 0.5));
      studioLog(next, `${person.name} 团建成长`, `${ABILITIES.find(item => item.key === key)?.name} ${before} → ${person.abilities[key]}，永久保留。`);
      const available = Object.keys(PERSONALITY_TAGS).filter(tag => !person.tags.some((item: any) => item.key === tag));
      if (available.length && random(next) < 0.2 * length) {
        const tag = available[Math.floor(random(next) * available.length)];
        person.tags.push({ kind: 'personality', key: tag });
        studioLog(next, `${person.name} 觉醒「${PERSONALITY_TAGS[tag].name}」`, PERSONALITY_TAGS[tag].text);
      }
      person.stressChance *= 0.5;
      person.overtimeDays = Math.floor(person.overtimeDays / 2);
      person.outingPity = 0;
      gained += 1;
    }
  }
  next.lastOuting = next.day;
  studioLog(next, '团队团建', `占用 ${length} 天，${gained} 人获得长期能力成长，清除 ${cleared} 个负面标签；性格觉醒会单独记录。`);
  return next;
}

export function startProject(state: any, plan: any, priority = -1) {
  const next = studioAction(state);
  if (!next.company) throw new Error('请先命名公司。');
  if (!plan || !has(TYPES, plan.type) || !tier(plan.scale)) throw new Error('请选择作品类型与体量。');
  if (!scaleOpen(next, plan.scale)) throw new Error(plan.scale === 1 ? '首作发售后开放中型作品。' : '搬进正式办公室后开放大型作品。');
  const original = plan.sequel ? next.catalog.find((book: any) => book.id === plan.sequel) : null;
  if (plan.sequel && (!original || original.reviewScore < 70)) throw new Error('好评达到 70 分的作品才能开发续作。');
  const name = String(plan.name || '').trim().slice(0, 24);
  if (!name) throw new Error('请为作品取个名字。');
  if (next.projects.some((project: any) => !project.released && project.name === name)) throw new Error('已有同名作品在开发。');
  const project = blankProject(`${next.day}-${next.seed}-${next.projects.length}`, { ...plan, name, expectation: original ? (original.expectation || 0) + 4 : 0 }, next.day);
  // A title nobody has heard of opens with no audience. Only the company's existing fans carry over,
  // and only once the studio has some: a first game cannot start at a few hundred followers.
  project.followers = Math.round(next.fans * 0.2);
  // Known names bring their own audience to whatever they work on.
  const stars = next.staff.filter((person: any) => person.fame).length;
  if (stars) project.followers += stars * 260;
  if (original) project.followers += Math.round(original.followers * 0.3 + original.units * 0.1);
  project.priority = Math.max(-1, ...projectOrder(next).map((item: any) => item.priority ?? 0)) + 1;
  next.projects.push(project);
  if (priority >= 0) return setPriority(next, project.id, priority);
  studioLog(next, '新作立项', `《${name}》面向${TYPES[plan.type].audience}，${SCALES[plan.scale].name}作品。`);
  return next;
}

// People belong to one project at a time; inside it they may take on several works.
export function assign(state: any, projectId: string, personId: string, works: string[]) {
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId);
  if (!project) throw new Error('项目不存在。');
  const person = next.staff.find((item: any) => item.id === personId);
  if (!person) throw new Error('员工不存在。');
  // Array.from, not [...new Set(...)]: Cocos' build transpiler turns the latter into
  // `[].concat(new Set(...))`, which saves an opaque Set object and breaks every later assignment.
  const list = Array.from(new Set((works || []).filter((key: string) => WORK_KEYS.includes(key))));
  for (const other of next.projects) {
    if (!other.assignments) other.assignments = {};
    if (other.id !== projectId) delete other.assignments[personId];
  }
  if (!project.assignments) project.assignments = {};
  project.assignments[personId] = list;
  studioLog(next, '调整分工', `${person.name} 参与《${project.name}》：${list.length ? list.map(key => WORKS.find(work => work.key === key)?.name).join('、') : '仅做本行'}。`);
  return next;
}

// 分工开关只有一个入口：按当前存档里的分工取反，永不留空（空了就回到本行）。
// 界面只传“谁、哪个项目、点了哪项”，不要再自己拼一份名单——拼错就会写成空表，
// 表现就是点了不亮、本职也不亮、后面怎么点都不亮。
export const ASSIGN_REVISION = 'assign-v2';

export function toggleAssign(state: any, projectId: string, personId: string, workKey: string) {
  if (!WORK_KEYS.includes(workKey)) throw new Error('工作类型无效。');
  const project = state.projects.find((item: any) => item.id === projectId);
  const person = state.staff.find((item: any) => item.id === personId);
  if (!project) throw new Error('项目不存在，请返回重进。');
  if (!person) throw new Error('员工不存在，请返回重进。');
  const current: string[] = assignedWorks(project, person);
  const next = current.includes(workKey) ? current.filter((key: string) => key !== workKey) : [...current, workKey];
  if (!next.length) {
    const home = homeWork(person);
    return assign(state, projectId, personId, [home]);
  }
  return assign(state, projectId, personId, next);
}

export function setPriority(state: any, projectId: string, priority: number) {
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId);
  if (!project) throw new Error('项目不存在。');
  const ordered = projectOrder(next).filter((item: any) => item.id !== projectId);
  const rank = clamp(Math.round(Number(priority) || 0), 0, ordered.length);
  ordered.splice(rank, 0, project);
  ordered.forEach((item: any, index: number) => { item.priority = index; });
  studioLog(next, '调整项目优先级', `《${project.name}》优先级第 ${rank + 1}。`);
  return next;
}

export function buyTool(state: any, key: string) {
  if (!has(STUDIO_TOOLS, key)) throw new Error('工具不存在。');
  if (!toolOpen(state, key)) throw new Error('这类工具要等首个作品完成原型后开放。');
  const next = studioAction(state);
  if (next.tools.includes(key)) throw new Error('该工具已购置。');
  spend(next, STUDIO_TOOLS[key].cost, `购置${STUDIO_TOOLS[key].name}`);
  next.tools.push(key);
  return next;
}

function recordWork(project: any, person: any, key: string, amount: number, quality: number) {
  if (amount <= 0) return;
  const work = workOf(project, key);
  if (work.total <= 0) return;
  const space = work.total - work.done;
  const used = Math.min(amount, Math.max(0, space));
  if (used > 0) {
    if (!Array.isArray(work.batches)) work.batches = work.done > 0 ? [{ amount: work.done, quality: work.value / work.done }] : [];
    const batch = work.batches.find((item: any) => Math.abs(item.quality - quality) < 0.0001);
    if (batch) batch.amount += used;
    else work.batches.push({ amount: used, quality });
    work.done += used;
    work.value += used * quality;
  }
  project.contributions[person.id] = (project.contributions[person.id] || 0) + used;
  person.work = round(person.work + used);
}

// Rework: once a dimension is full, further work replaces the weakest finished part, so the score
// creeps toward whoever is redoing it.
function rework(project: any, key: string, amount: number, quality: number) {
  const work = workOf(project, key);
  if (work.done <= 0) return 0;
  if (!Array.isArray(work.batches)) work.batches = [{ amount: work.done, quality: work.value / work.done }];
  work.batches.sort((left: any, right: any) => left.quality - right.quality);
  let remaining = amount;
  let replaced = 0;
  for (const batch of work.batches) {
    if (remaining <= 0 || batch.quality >= quality) break;
    const used = Math.min(remaining, batch.amount);
    work.value += used * (quality - batch.quality);
    batch.amount -= used;
    remaining -= used;
    replaced += used;
  }
  work.batches = work.batches.filter((batch: any) => batch.amount > 0.000001);
  const target = work.batches.find((batch: any) => Math.abs(batch.quality - quality) < 0.0001);
  if (target) target.amount += replaced;
  else if (replaced > 0) work.batches.push({ amount: replaced, quality });
  return replaced;
}

function addDefect(project: any, person: any, dimension: string, chance: number, state: any) {
  const careful = person.tags.some((tag: any) => tag.key === 'careful') ? 0.75 : 1;
  const overtime = state.overtime[person.id] ? OVERTIME_DEFECT : 1;
  const debt = chance * careful * overtime;
  project.defectDebt = (project.defectDebt || 0) + debt;
  while (project.defectDebt >= 1) {
    project.defectDebt -= 1;
    project.defects.push({ id: `${project.id}-${project.defects.length}`, dimension, found: false, fixed: false, roll: random(state) });
  }
}

// Priority is the player's ordering of parallel projects. A person belongs to one project at a time,
// so it takes effect where the same calendar is shared: with several projects running, only the
// top-ranked one keeps full output and the rest lose a slice to coordination. One project alone is
// never penalised, so a solo run and a parallel run differ only when the player chooses to split.
export const PRIORITY_EFFICIENCY = [1, 0.85, 0.72];

export function projectOrder(state: any) {
  return state.projects.filter((project: any) => !project.released || state.staff.some((person: any) => chosenWorks(project, person).length)).sort((left: any, right: any) => (left.priority || 0) - (right.priority || 0));
}

function priorityFactor(state: any, project: any) {
  const rank = projectOrder(state).findIndex((item: any) => item.id === project.id);
  return rank <= 0 ? 1 : Math.pow(0.85, rank);
}

function produceProject(state: any, project: any) {
  const crew = state.staff.filter((person: any) => belongsTo(state, project, person));
  const dailyCost = sum(crew.map((person: any) => (person.wage + OFFICES[state.office].rent / Math.max(1, state.staff.length)) / 30));
  project.invested += dailyCost;
  const factor = priorityFactor(state, project);
  for (const person of crew) {
    const split = assignDay(state, project, person);
    const keys = Object.keys(split);
    if (!keys.length) continue;
    const mood = conditionFactor(person, project);
    for (const key of keys) {
      const share = split[key];
      const work = WORKS.find(item => item.key === key);
      const amount = speedOf(state, person, key) * share * factor * mood;
      if (amount <= 0) continue;
      if (key === 'repair') {
        repair(state, project, amount, person);
        project.contributions[person.id] = (project.contributions[person.id] || 0) + amount;
        person.work = round(person.work + amount);
      } else {
        const quality = able(person, work.ability);
        const remaining = workOf(project, work.dimension).total - workOf(project, work.dimension).done;
        const used = Math.min(amount, Math.max(0, remaining));
        if (remaining > 0) {
          recordWork(project, person, work.dimension, used, quality);
          if (work.dimension !== 'stability') addDefect(project, person, work.dimension, used * (100 - quality) / 100 * DEFECT_RATE, state);
        }
        const spare = amount - used;
        if (spare > 0) {
          if (project.defects.some((defect: any) => defect.found && !defect.fixed)) repair(state, project, spare, person);
          else rework(project, work.dimension, spare, quality);
          project.contributions[person.id] = (project.contributions[person.id] || 0) + spare;
          person.work = round(person.work + spare);
        }
      }
    }
  }
  syncFound(project);
  project.progress = projectMetrics(project).progress;
  if (!project.released) {
    // Checkpoints are read by menu locks and the tutorial; they only ever switch on.
    // Followers arrive when something is actually shown, not on every idle day: a milestone pays once.
    const mult = market(project.type, Math.ceil(state.day / 30)).multiplier;
    if (!project.checkpoints.prototype && project.progress >= PROTO * 100) {
      project.checkpoints.prototype = true;
      project.followers += Math.round(30 * mult);
    }
    if (!project.checkpoints.demo && project.progress >= TRIAL * 100) {
      project.checkpoints.demo = true;
      project.followers += Math.round(70 * mult);
    }
    if (project.progress >= 100) project.checkpoints.ready = true;
  }
}

// Repair only touches found defects, and is settled by the ability of the dimension that left it: a
// weaker hand still fixes it, just slower. No attempt is ever wasted.
function repair(state: any, project: any, amount: number, person: any) {
  const known = project.defects.filter((defect: any) => defect.found && !defect.fixed);
  if (!known.length) return;
  for (const target of known) {
    if (amount <= 0) break;
    const skill = 0.5 + able(person, target.dimension) / 200;
    const progress = target.repairWork || 0;
    const used = Math.min(amount, (REPAIR_WORK - progress) / skill);
    target.repairWork = progress + used * skill;
    amount -= used;
    if (target.repairWork < REPAIR_WORK - 0.000001) continue;
    target.fixed = true;
    project.found = Math.max(0, project.found - 1);
  }
}

export function projectScore(project: any) {
  const metrics = projectMetrics(project);
  return round(clamp(metrics.overall - project.expectation, 0, 100));
}

export function promoteBuyers(cost: number, promoted: number) {
  const budget = clamp(cost, 0, PROMOTE_CAP);
  return Math.round(PROMOTE_BUYERS * budget / (1 + budget / PROMOTE_HALF) * (1 - clamp(promoted / PROMOTE_CAP, 0, 0.85)));
}

export function promoteRange(state: any, project: any, cost: number) {
  if (!project) return null;
  const value = promoteBuyers(cost, project.promoted);
  const spread = 0.1 + 0.12 * (1 - clamp(project.followers / 1500, 0, 1));
  return { low: Math.round(value * (1 - spread)), high: Math.round(value * (1 + spread)), cost: clamp(cost, 0, PROMOTE_CAP) };
}

export function promote(state: any, projectId: string, cost: number) {
  const value = Number(cost);
  if (!Number.isFinite(value) || value <= 0) throw new Error('推广预算无效。');
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && !item.released);
  if (!project) throw new Error('项目不存在。');
  if (project.progress < TRIAL * 100) throw new Error('体验版完成后才能推广。');
  const budget = round(clamp(value, 0, PROMOTE_CAP));
  const range = promoteRange(next, project, budget);
  spend(next, budget, '推广预算');
  const buyers = Math.round((range.low + range.high) / 2 * (0.94 + random(next) * 0.12));
  project.followers += buyers;
  project.promoted = round(project.promoted + budget);
  project.invested = round(project.invested + budget);
  studioLog(next, '推广结果', `《${project.name}》投放 ${budget.toFixed(2)} 万，新增 ${buyers} 位关注者；关注不等于购买。`);
  return next;
}

export function playtestOffer(state: any, project: any) {
  const reason = !project ? '先立项开发' : project.progress < TRIAL * 100 ? '完成度达到 55% 后才有体验版，才能试玩' : project.test && state.day - project.test.day < 3 ? '距上次试玩至少间隔 3 天' : '';
  return { available: !reason && !state.over && !state.event, reason };
}

export function testDemo(state: any, projectId: string, count = 30) {
  if (![30, 100].includes(count)) throw new Error('测试批次无效。');
  const project = state.projects.find((item: any) => item.id === projectId && !item.released);
  const offer = playtestOffer(state, project);
  if (!offer.available) throw new Error(offer.reason || '先处理当前决策。');
  const next = studioAction(state);
  const cost = count === 30 ? 0.8 : 2;
  spend(next, cost, '招募试玩玩家');
  const target = next.projects.find((item: any) => item.id === projectId);
  const open = target.defects.filter((defect: any) => !defect.found);
  let newlyFound = 0;
  for (const defect of open) {
    if (random(next) >= (count === 30 ? 0.6 : 0.9)) continue;
    defect.found = true;
    target.found += 1;
    newlyFound += 1;
  }
  const score = round(clamp(projectScore(target) + (random(next) - 0.5) * 6 * Math.sqrt(30 / count), 0, 100));
  target.invested = round(target.invested + cost);
  target.tests += 1;
  target.testCount += count;
  // Every run is kept (last five) so a retest can be compared against what changed in between.
  target.testLog = [...(target.testLog || []), { day: next.day, count, score }].slice(-5);
  target.followers += Math.round(count * score / 100 * 2);
  const metrics = visibleMetrics(target);
  // A score alone tells the player nothing actionable, so every dimension explains its own cause:
  // unfinished work, a missing trade, or the defects that are still open.
  const diagnosis: any = {
    creativity: metrics.dimensions.creativity < 45
      ? '创意分偏低：安排创意能力更强的人完成这一项；做满后继续返工，才能逐步改善已有成果。'
      : metrics.dimensions.creativity < 70 ? '创意还有提升空间，继续交付或用更高能力的人返工。' : '创意得到认可，玩家觉得这一作有辨识度。',
    depth: target.work.depth.done < target.work.depth.total && metrics.dimensions.depth < 70
      ? `深度 ${metrics.dimensions.depth} 分，这一项内容还没完成；继续安排深度工作，质量也取决于执行者能力。`
      : metrics.dimensions.depth < 60 ? '深度内容已做完，但已有成果能力偏低；让深度能力更强的人返工，不会因体量变大自动加分。' : '深度得到认可。',
    fluidity: metrics.dimensions.fluidity < 45
      ? '流畅分偏低：安排流畅能力更强的人完成内容，已做满则需要返工，单纯招聘不会重算旧成果。'
      : metrics.dimensions.fluidity < 70 ? '流畅能玩，但还不算顺滑；更高流畅能力的人返工可逐步改善。' : '流畅得到认可，操作型玩家不会抱怨手感。',
    picture: metrics.dimensions.picture < 45
      ? '画面分偏低：任何人都能做画面，评分取决于画面能力与进度；安排更合适的人制作或返工。'
      : metrics.dimensions.picture < 70 ? '画面能看但不够出彩，美术越早加入，越有时间做细节。' : '画面得到认可。',
    sound: metrics.dimensions.sound < 45
      ? '声音分偏低：可以安排员工制作，也可以外包声音；交付后才改变评分，并非没有音频岗位就只能留空。'
      : metrics.dimensions.sound < 70 ? '声音够用但不出彩，音频能再提高沉浸感。' : '声音得到认可。',
    stability: (newlyFound
      ? `试玩玩家碰到 ${newlyFound} 项测试漏掉的缺陷，待修 ${metrics.known} 项。`
      : metrics.known ? `没有碰到新缺陷，还有 ${metrics.known} 项待修。` : '本轮没有碰到新问题。')
      + (metrics.untested ? '还没测试，稳定无从估计：安排人测试，找出的缺陷修好才加分。' : metrics.dimensions.stability < 60 ? '估计还有不少缺陷没修：继续测试找出更多，并给修复留出工时；没测到的会在发售后被玩家碰到。' : '')
  };
  const findings = DIM_KEYS.map(key => {
    const dimension = DIMENSIONS.find(item => item.key === key);
    const weight = TYPES[target.type].weights[key];
    return { key, title: dimension.name, value: metrics.dimensions[key], weight, text: diagnosis[key] };
  }).sort((left, right) => (100 - left.value) * left.weight < (100 - right.value) * right.weight ? 1 : -1);
  target.test = { day: next.day, count, score, findings, found: newlyFound, source: '试玩玩家' };
  next.event = { id: 'feedback', project: projectId, title: '试玩反馈送达', text: `${count} 位${TYPES[target.type].audience}给出 ${score.toFixed(1)} 分，发现 ${newlyFound} 项缺陷。他们最看重：${audienceFocus(target.type)}。`, choices: [{ id: 'continue', title: '收下反馈，继续调整分工', detail: '短板维度可以在项目里调整人手。' }] };
  studioLog(next, '体验版试玩', `${count} 人参与，评分 ${score.toFixed(1)}，发现 ${newlyFound} 项缺陷。`);
  return next;
}

export function audienceFocus(type: string) {
  const weights = TYPES[type].weights;
  return [...DIM_KEYS].sort((left, right) => weights[right] - weights[left]).map(key => DIMENSIONS.find(item => item.key === key)?.name).join(' > ');
}

function openingSales(project: any, multiplier: number, score: number) {
  const fit = project.test ? clamp(project.test.score / 100, 0.15, 0.95) : clamp(score / 100 * 0.85, 0.15, 0.95);
  const ceiling = MARKET_SIZE * SCALES[project.scale].reach * (project.parentId ? 0.4 : 1);
  const units = Math.max(1, Math.round(Math.min(ceiling * 0.6, project.followers * (0.2 + fit * 0.5) * multiplier)));
  const price = TYPES[project.type].price * SCALES[project.scale].price * (project.parentId ? 0.35 : 1);
  return { units, price, receipt: round(units * price) };
}

// Player quotes live in the book's archive only — no inbox, no customer service. Launch quotes point
// at the strongest and weakest dimensions; later ones are generic sentiment from ongoing reviews.
const DIMENSION_QUOTES: any = {
  creativity: ['这个 idea 真新鲜，一眼就能记住。', '玩法没见别人做过，越玩越有意思。'],
  depth: ['系统有深度，一周了还在琢磨新套路。', '越挖越有东西，攻略写不完了。'],
  fluidity: ['操作跟手，跑起来丝般顺滑。', '加载快不掉帧，玩着舒服。'],
  picture: ['画面漂亮，截图直接当壁纸。', '美术风格太对味了。'],
  sound: ['原声带循环了一整天。', '音效细节满分。'],
  stability: ['这次游玩暂时没有遇到明显问题。', '目前玩着正常，再多观察一阵。']
};
const GENERIC_QUOTES: any = {
  good: ['意外之喜，已经安利给朋友了。', '通关了，后劲很大。', '这个价格很值。'],
  bad: ['遇到好几个 bug，先差评再观察。', '期望挺高，玩着一般。', '再等等优化吧。']
};

function reviewOf(state: any, project: any, metrics: any) {
  const dimensions = metrics.dimensions;
  const weights = TYPES[project.type].weights;
  const weakest = [...DIM_KEYS].sort((left, right) => (100 - dimensions[left]) * weights[left] - (100 - dimensions[right]) * weights[right]).reverse().slice(0, 2);
  const reasons = weakest.map(key => ({
    title: `${DIMENSIONS.find(item => item.key === key)?.name}不足`,
    text: `玩家最在意${audienceFocus(project.type)}，《${project.name}》的${DIMENSIONS.find(item => item.key === key)?.name}只有 ${dimensions[key].toFixed(0)} 分，这是接下来最值得补的短板。`
  }));
  if (metrics.known > 0) reasons.push({ title: '还有已知缺陷', text: `还有 ${metrics.known} 项已知缺陷，完成所负责内容的人会用实际工时自动修复。` });
  if (!reasons.length) reasons.push({ title: '各方面都比较扎实', text: '保持这套做法，下一作可以尝试更大的体量。' });
  const quotes: any[] = [];
  const pick = (key: string, positive: boolean) => {
    const pool = DIMENSION_QUOTES[key] || [];
    if (!pool.length) return;
    quotes.push({ text: pool[Math.floor(random(state) * pool.length)], positive });
  };
  const strongest = [...DIM_KEYS].sort((left, right) => dimensions[right] - dimensions[left])[0];
  if (dimensions[strongest] >= 55) pick(strongest, true);
  if (dimensions[weakest[0]] < 55) pick(weakest[0], dimensions[weakest[0]] >= 45);
  if (metrics.known > 5) quotes.push({ text: '又碰到一个恶性 bug，心态有点崩。', positive: false });
  return { reasons, quotes };
}

// A released project keeps its catalogue entry live: patching defects and reworking dimensions slowly
// move the review score and the daily sales the same way a fresh release would, but only by degrees.
function syncReleased(state: any, project: any) {
  const book = state.catalog.find((item: any) => item.id === project.id);
  if (!book) return;
  const metrics = projectMetrics(project);
  const previous = book.metrics.overall;
  const previousKnown = book.metrics.known || 0;
  book.metrics = metrics;
  book.invested = round(project.invested);
  if (metrics.overall > previous + 0.001 || metrics.known < previousKnown) {
    if (state.day - (book.patchedAt || 0) >= 7) {
      book.updates = (book.updates || 0) + 1;
      studioLog(state, `《${project.name}》补丁 / 更新`, `实际修复与返工已交付，当前已知问题 ${metrics.known} 项，后续玩家评价将逐步反映变化。`);
      book.patchedAt = state.day;
    }
  }
}

// Each stage of the company is limited by a different scarce thing. The stage is read from company
// state, not from the calendar: it changes when the goal behind it is actually passed.
export function companyPhase(state: any) {
  if (state.goals.breakEven === null) {
    return { key: 'early', name: '前期', scarce: '缺钱', text: '现金决定能撑多久。选择集中在体量、发售时机和花在推广上的钱。' };
  }
  if (state.goals.topTen === null || state.goals.award === null) {
    return { key: 'mid', name: '中期', scarce: '缺人', text: '工位与简历成为上限：钱能买工位，买不到更合适的人。目标是做出能进榜、能拿奖的作品。' };
  }
  return { key: 'late', name: '后期', scarce: '缺资格', text: '现金不再是约束。限制你的是日历窗口、由作品挣来的资格，以及公司名望。' };
}

// Reputation is the company's record: what it shipped, how it reviewed and what it won. It is not a
// separate score board; it is the archive itself, and it gates the bigger stages.
export function reputationOf(state: any) {
  const wins = state.awards.filter((award: any) => award.own).length;
  const best = state.catalog.reduce((top: number, book: any) => Math.max(top, book.reviewScore), 0);
  const shipped = state.catalog.length;
  return round(best * 0.5 + wins * 12 + shipped * 4);
}

export function companyArchive(state: any) {
  return {
    reputation: reputationOf(state),
    wins: state.awards.filter((award: any) => award.own).length,
    books: state.catalog.map((book: any) => {
      // Shares come from the recorded per-person contributions of the live project, falling back to
      // an even split for old saves whose team was stored without ids.
      const project = state.projects.find((item: any) => item.id === book.id);
      const shares: any = project ? project.contributions || {} : {};
      const total = sum(Object.values(shares));
      return {
        id: book.id, name: book.name, type: book.type, scale: book.scale, released: book.released,
        review: book.reviewScore, units: book.units, received: book.received, bestRank: book.bestRank,
        breakout: !!book.breakout, team: book.team || [],
        contributions: (book.team || []).map((person: any) => ({ name: person.name, role: person.role, share: total > 0 && shares[person.id] ? round(shares[person.id] / total) : round(1 / Math.max(1, (book.team || []).length)) }))
      };
    })
  };
}

export function launchChecklist(state: any, project: any) {
  const metrics = visibleMetrics(project);
  return [
    { label: '计划内容完成', ok: metrics.unfinished.length === 0, required: false, text: metrics.unfinished.length ? `还差 ${metrics.unfinished.length} 维，提前发售评分会偏低` : `完成度 ${metrics.progress.toFixed(0)}%` },
    { label: '做过试玩', ok: !!project.test, text: project.test ? `${project.test.count} 人 · ${project.test.score.toFixed(1)} 分` : '没有试玩，问题会在发售后才暴露' },
    { label: '待修缺陷', ok: metrics.known === 0, text: metrics.known ? `还有 ${metrics.known} 项` : metrics.untested ? '暂无；还没测试，不知道漏了多少' : `暂无；估计稳定 ${metrics.dimensions.stability.toFixed(0)} 分，没测到的留给玩家` },
    { label: '六维估计', ok: metrics.overall >= 60, text: `${metrics.overall.toFixed(0)} 分` },
    { label: '关注人数', ok: project.followers >= 1500, text: `${Math.round(project.followers)} 人${project.followers >= 1500 ? '' : '，推广能扩大首发'}` }
  ];
}

export function launchProject(state: any, projectId: string) {
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && !item.released);
  if (!project) throw new Error('项目不存在。');
  const metrics = projectMetrics(project);
  // Releasing early means shipping with unfinished dimensions — but it still requires the trial build.
  if (metrics.progress < TRIAL * 100) throw new Error('体验版完成后才能发售；提前发售指带着未完成的维度上市。');
  const trend = market(project.type, Math.ceil(next.day / 30));
  const score = round(clamp(projectScore(project) + (random(next) - 0.5) * 3, 0, 100));
  // Creativity breaks out through a tail jump, not a linear bonus: a high-creativity title has a better
  // chance of catching on, but there is no guarantee and it cannot be bought. A breakout multiplies the
  // opening audience once; it is not a permanent multiplier on the whole tail.
  const breakoutChance = clamp((metrics.dimensions.creativity - 55) / 100 * 0.45, 0, 0.32);
  const breakout = breakoutChance > 0 && random(next) < breakoutChance;
  if (breakout) project.followers = Math.round(project.followers * (1.6 + random(next) * 0.9));
  const { units, price, receipt } = openingSales(project, trend.multiplier, score);
  const best = Math.max(0, ...next.catalog.map((book: any) => book.openingReceipt));
  const capacity = Math.round(MARKET_SIZE * SCALES[project.scale].reach * (project.parentId ? 0.4 : 1) * (1 + Math.max(0, score - 70) / 25 * 4) * 0.5);
  // At launch the players see the real game, so the review reads the true stability, not the estimate.
  const review = reviewOf(next, project, metrics);
  const book = {
    id: project.id, name: project.name, type: project.type, scale: project.scale,
    released: next.day, metrics, invested: round(project.invested), received: receipt,
    price, units, openingUnits: units, openingReceipt: receipt, openingFollowers: Math.round(project.followers),
    followers: Math.round(project.followers), dailyUnits: units / 15, reviewScore: score,
    reviewCount: Math.max(1, Math.round(units * 0.12)), tested: project.tests > 0,
    testScore: project.test ? project.test.score : null, testCount: project.testCount, trend: trend.label,
    lastGrowth: 0, lastDayUnits: units, team: next.staff.filter((person: any) => (project.contributions[person.id] || 0) > 0).map((person: any) => ({ id: person.id, name: person.name, role: person.role })),
    quotes: review.quotes,
    weekly: [receipt], paidBack: receipt >= project.invested, marks: 0, record: next.catalog.length > 0 && receipt > best,
    tutorial: next.catalog.length === 0, review,
    sequel: project.sequel, parentId: project.parentId || null, expectation: project.expectation, rank: null, previousRank: null, bestRank: null, updates: 0, breakout,
    capacity, left: capacity, sale: false, saleFloor: 0, saleStart: null, saleUntil: 0, saleEnded: 0, saleDepth: 1, saleRuns: 0, saleWeeks: 0
  };
  next.cash = round(next.cash + receipt);
  next.ledger.income = round(next.ledger.income + receipt);
  next.catalog.unshift(book);
  next.lastRelease = book.id;
  // The project stays on the books after launch: the same people can keep fixing defects and reworking
  // dimensions, which is the patch and update loop. It just cannot be launched a second time.
  project.released = next.day;
  project.launched = true;
  project.assignments = {};
  for (const person of next.staff) {
    const contribution = project.contributions[person.id] || 0;
    if (contribution <= 0) continue;
    const growth = (person.tags.some((tag: any) => tag.key === 'growth') ? GROWTH_PER_WORK * 1.5 : GROWTH_PER_WORK) * contribution;
    let gained = 0;
    for (const key of ABILITY_KEYS) {
      const before = person.abilities[key];
      person.abilities[key] = Math.min(100, round(before + growth));
      if (person.abilities[key] > before) gained += 1;
    }
    person.speed = Math.min(140, round(person.speed + growth));
    if (gained) { person.level = (person.level || 0) + 1; studioLog(next, `${person.name} 积累经验`, `参与《${project.name}》后多项能力小幅提高；工资在招聘时定下，不随成长上调。`); }
  }
  if (next.goals.firstRelease === null) next.goals.firstRelease = next.day;
  announce(next, { kind: 'release', title: `《${book.name}》发售`, text: `首发售出 ${units} 份`, amount: receipt, book: book.id });
  if (book.record) announce(next, { kind: 'record', title: '新纪录', text: `首发到账超过此前最好成绩 ${best.toFixed(2)} 万`, amount: receipt });
  checkMarks(next, book);
  updateRankings(next);
  const shortBoard = metrics.unfinished.length ? `仍有 ${metrics.unfinished.length} 个维度未完成，带着短板上市换回了款，之后可以继续更新。` : '';
  const lesson = book.tutorial ? '首作是练习，小亏也很正常；看看复盘，下一作照着改。' : '首发到账不等于最终利润，后续销量取决于玩家口碑。';
  const burst = breakout ? `《${book.name}》出圈了：创意打动了原本不关注这类游戏的人，首发关注翻了数倍。` : '';
  next.event = { id: 'release', title: `《${book.name}》正式发售`, text: `首发售出 ${units} 份，到账 ${receipt.toFixed(2)} 万。发售时市场：${trend.label}，首发需求 ×${trend.multiplier.toFixed(2)}。${shortBoard ? shortBoard + ' ' : ''}${lesson}${burst ? ' ' + burst : ''}`, choices: [{ id: 'continue', title: '收下成绩，继续经营', detail: book.tutorial ? '招聘网站已经开放，可以为下一作找更有经验的同事。' : '后续销量与评价继续变化，可以筹备下一款作品。' }] };
  studioLog(next, next.event.title, next.event.text);
  return next;
}

function checkMarks(state: any, book: any) {
  if (!book.paidBack && book.received >= book.invested) book.paidBack = true;
  if (book.paidBack && !book.paidBackAnnounced) {
    book.paidBackAnnounced = true;
    announce(state, { kind: 'breakeven', title: `《${book.name}》回本了`, text: `累计回款超过投入 ${book.invested.toFixed(2)} 万`, amount: book.received });
    if (state.goals.breakEven === null) state.goals.breakEven = state.day;
  }
  while (book.marks < UNIT_MARKS.length && book.units >= UNIT_MARKS[book.marks]) {
    announce(state, { kind: 'units', title: `销量突破 ${UNIT_MARKS[book.marks].toLocaleString('zh-CN')} 份`, text: `《${book.name}》`, amount: book.received });
    book.marks += 1;
  }
}

export function moveOffice(state: any) {
  const next = studioAction(state);
  if (next.office >= 2) throw new Error('已经完成工作室扩建。');
  if (next.goals.breakEven === null) throw new Error('第一次回本后才能搬进正式办公室。');
  if (next.office === 1 && (next.goals.topTen === null || next.goals.award === null)) throw new Error('进入榜单前十并获得年度奖项后才能再次扩建。');
  const office = OFFICES[next.office + 1];
  spend(next, office.cost, next.office ? '扩建独立工作室' : '搬进正式办公室');
  next.office += 1;
  next.goals[next.office === 1 ? 'moved' : 'expanded'] = next.day;
  announce(next, { kind: 'office', title: next.office === 1 ? '搬进正式办公室' : '扩建独立工作室', text: `${office.seats} 个工位，月租 ${office.rent} 万`, amount: 0 });
  return next;
}

export function goalsOf(state: any) {
  const goals = state.goals;
  const steps = [
    { key: 'firstRelease', title: '完成首作', text: '把第一款游戏做完并发售。首作是练习，小亏也没关系。', reward: '开放招聘网站与音频、测试岗位', done: goals.firstRelease !== null },
    { key: 'breakEven', title: '第一次回本', text: '让一款作品的回款超过投入。', reward: '可以搬进正式办公室', done: goals.breakEven !== null },
    { key: 'moved', title: '搬进正式办公室', text: `在公司菜单搬家，一次性 ${OFFICES[1].cost} 万。`, reward: `${OFFICES[1].seats} 个工位，开放行业推荐`, done: goals.moved !== null }
  ];
  steps.push(
    { key: 'topTen', title: '进入销量榜前十', text: '用作品销量与虚构工作室竞争。', reward: '获得 200 位粉丝，向扩建迈进一步', done: goals.topTen !== null },
    { key: 'award', title: '获得年度奖项', text: '每年年底评选作品、创意与表现奖。', reward: '获奖增加粉丝，开放工作室扩建资格', done: goals.award !== null },
    { key: 'expanded', title: '再次扩建工作室', text: `完成前十与获奖目标后，花 ${OFFICES[2].cost} 万扩建。`, reward: `${OFFICES[2].seats} 个工位，可组建成熟团队`, done: goals.expanded !== null }
  );
  const current = steps.find(step => !step.done);
  const best = Math.max(0, ...state.catalog.map((book: any) => book.received));
  return { steps, current: current || { key: 'record', title: '打破纪录', text: `让一款作品的累计回款超过 ${best.toFixed(2)} 万。`, reward: '证明工作室越做越好', done: false } };
}

export function resolveStudioEvent(state: any, choice: string) {
  if (!state.event || !state.event.choices.some((item: any) => item.id === choice)) throw new Error('当前选择无效。');
  let next = studioAction(state);
  const event = next.event;
  next.event = null;
  studioLog(next, event.title, event.choices.find((item: any) => item.id === choice).title);
  if (choice === 'bridge') {
    if (next.bridgeUsed) throw new Error('创始人积蓄已经用过了。');
    next.bridgeUsed = true;
    next.cash = round(next.cash + BRIDGE);
    next.ledger.income = round(next.ledger.income + BRIDGE);
    return next;
  }
  if (choice === 'move') return moveOffice(next);
  if (event.id === 'resign') return choice === 'leave' ? takeLeave(next, event.person) : dismiss(next, event.person);
  if (event.id === 'deadline') {
    const project = next.projects.find((item: any) => item.id === event.project);
    if (project) {
      if (choice === 'launch') return launchProject(next, project.id);
      project.followers = Math.round(project.followers * 0.9);
      if (choice === 'delay') project.deadline = next.day + 14;
      studioLog(next, '发售承诺未兑现', `《${project.name}》${choice === 'delay' ? '延期' : '取消排期'}，关注减少 10%。`);
    }
    return next;
  }
  if (event.id === 'release' && choice === 'continue') return next;
  return next;
}

function resignOrContinue(state: any) {
  for (const person of state.staff) {
    if (state.event) return;
    // The founder cannot resign from their own studio; stress still slows them, leave and outings
    // still clear it.
    if (person.founder) continue;
    if (person.stressTags.includes('leaving') && random(state) < 0.02) {
      const years = Math.max(0, Math.floor((state.day - person.joined) / 360));
      const compensation = round(person.wage * (years + 1));
      state.event = { id: 'resign', person: person.id, title: `${person.name} 提出离职`, text: '长期加班压力已让员工想走。可以安排带薪休假；接受离职仍按 N+1 补偿，并保留裁员记录与同事影响，不能靠施压来免除遣散成本。已完成成果保留。', choices: [{ id: 'leave', title: '安排五天带薪休假', detail: '暂停该员工的工作，工资照付。' }, { id: 'dismiss', title: `接受离职 · 补偿 ${compensation.toFixed(2)} 万`, detail: '按 N+1 结算，保留应付工资、裁员记录与同事影响。' + (state.cash < compensation ? '当前资金不足支付补偿。' : ''), disabled: state.cash < compensation }] };
    }
  }
}

// Overtime accumulates stress labels: the chance rises with how many separate days were worked, but
// there is no guarantee. Clear labels and it falls back, never all the way to zero for the same run.
function stressDay(state: any) {
  for (const person of state.staff) {
    const overtime = !!state.overtime[person.id];
    if (overtime) {
      person.overtimeDays += 1;
      const resist = person.tags.some((tag: any) => tag.key === 'iron') ? 0.35 : person.tags.some((tag: any) => tag.key === 'eager') ? 1.5 : person.tags.some((tag: any) => tag.key === 'grumbler') ? 1.6 : 1;
      person.stressChance = clamp(person.overtimeDays / 40 * resist, 0, 0.6);
      if (person.stressTags.length < 2 && random(state) < person.stressChance) {
        const label = person.stressTags.includes('tired') ? 'leaving' : 'tired';
        person.stressTags.push(label);
        announce(state, { kind: 'notice', title: `${person.name} 挂上了「${STRESS_TAGS[label].name}」`, text: STRESS_TAGS[label].text, amount: 0 });
      }
    } else {
      person.stressChance = clamp(person.stressChance * 0.93, 0, 0.6);
      person.overtimeDays = Math.max(0, person.overtimeDays - 1);
      if (person.stressTags.includes('tired') && random(state) < 0.05) person.stressTags = person.stressTags.filter((key: string) => key !== 'tired');
    }
  }
}

export function stepDay(state: any) {
  if (state.over) throw new Error('公司已停止经营。');
  if (state.event) throw new Error('请先处理关键决策。');
  const next = clone(state);
  const warning = cashWarning(next);
  if (warning) { next.event = warning; return next; }
  next.accrued += monthlyCost(next) / 30;
  // Released projects keep taking people: that is the patch/update loop, and its results show up in the
  // live sales figures through syncReleased.
  for (const project of next.projects) {
    produceProject(next, project);
    if (project.released) syncReleased(next, project);
  }
  salesDay(next);
  playerReports(next);
  stressDay(next);
  resignOrContinue(next);
  calendarDay(next);
  if (next.day % 30 === 0) {
    const payroll = round(next.accrued);
    next.cash = round(next.cash - payroll);
    next.ledger.payroll = payroll;
    next.ledger.expense = round(next.ledger.expense + payroll);
    const report = { month: next.day / 30, ...next.ledger, closing: next.cash, net: round(next.ledger.income - next.ledger.expense) };
    next.report = report;
    next.reports = [...next.reports, report].slice(-600);
    next.ledger = { opening: next.cash, income: 0, expense: 0, payroll: 0 };
    next.accrued = 0;
    next.over = next.cash < 0;
    studioLog(next, `第 ${report.month} 月账单`, `收入 ${report.income.toFixed(2)} 万，支出 ${report.expense.toFixed(2)} 万，净变化 ${report.net.toFixed(2)} 万。`);
  }
  next.day += 1;
  return next;
}

function cashWarning(state: any) {
  const key = Math.floor((state.day - 1) / 30);
  if (!state.company || state.cash - state.accrued >= monthlyCost(state) * 0.6 || state.notices[`cash-${key}`]) return null;
  state.notices[`cash-${key}`] = true;
  return { id: 'cash', title: '近期工资需要准备', text: `现金 ${state.cash.toFixed(2)} 万，已累计应付 ${state.accrued.toFixed(2)} 万。可以先看看团队和账单再继续。`, choices: [...(!state.bridgeUsed ? [{ id: 'bridge', title: '投入创始人积蓄', detail: `补充 ${BRIDGE} 万，整局只能用一次，不代表经营问题已经解决。` }] : []), { id: 'continue', title: '自行调整后继续', detail: '不获得额外资金，月底仍需支付已产生的费用。' }] };
}

// A deeper cut sells more, with diminishing extra buyers per lost yuan.
function salePull(depth: number) {
  return 1 + (1 - depth) * 2.2 - (1 - depth) * (1 - depth) * 2.4;
}

// A cut only reaches buyers the tail can still convert, and the sharper it is the more it fritters
// the title's standing, which grows with how much full-price demand is left.
function saleReach(state: any, book: any, depth: number) {
  const remaining = Math.max(0, Math.min(1, book.left / Math.max(1, book.capacity)));
  return salePull(depth) - 1 + remaining * (1 - depth) * 1.6;
}

function openSale(state: any, book: any) {
  const age = state.day - book.released;
  const since = state.day - (book.saleEnded > 0 ? book.saleEnded : (book.saleStart ?? book.released));
  if (age <= 21 || since <= 10) return;
  const depth = DISCOUNTS[0];
  if (book.left < book.dailyUnits * 2 * (salePull(depth) - 1)) return;
  book.saleUntil = state.day + 6;
  book.saleEnded = state.day + 6;
  book.saleDepth = round(depth);
  book.saleRuns = (book.saleRuns || 0) + 1;
  studioLog(state, `《${book.name}》开始促销`, `${depth * 10} 折，持续一周。`);
  announce(state, { kind: 'notice', title: `《${book.name}》开始促销`, text: `系统按剩余需求打折：${depth * 10} 折，持续一周。`, amount: 0 });
}

function salesDay(state: any) {
  for (const book of state.catalog) {
    const age = state.day - book.released;
    if (age <= 0 || age > 540) { book.lastDayUnits = 0; continue; }
    if (book.sale) openSale(state, book);
    const discounted = book.sale && book.saleUntil > state.day;
    const depth = discounted ? DISCOUNTS[0] : 1;
    const growth = clamp(0.955 + (book.reviewScore - 55) * 0.0025, 0.9, 1.03);
    const reputationReach = 1 + Math.max(0, book.reviewScore - 70) / 25 * 4;
    const saturation = Math.max(0.05, 1 - book.units / (MARKET_SIZE * SCALES[book.scale].reach * reputationReach));
    book.dailyUnits = Math.max(0, book.dailyUnits * growth * (0.97 + saturation * 0.03) * Math.min(1, saturation * 4));
    const units = Math.max(0, Math.round(Math.min(book.dailyUnits * (discounted ? 1 + saleReach(state, book, depth) : 1), book.left)));
    if (discounted) {
      const remaining = Math.max(0, Math.min(1, book.left / Math.max(1, book.capacity)));
      book.dailyUnits *= 1 - (1 - depth) * 0.02;
      book.left = Math.max(0, book.left - units * remaining * (1 - depth) * 0.9);
    }
    const income = round(units * book.price * depth);
    book.left = Math.max(0, book.left - units);
    book.lastDayUnits = units;
    book.lastGrowth = round((growth - 1) * 100);
    book.units += units;
    const reviews = Math.round(units * 0.12);
    if (reviews) {
      const project = state.projects.find((item: any) => item.id === book.id);
      const score = clamp((project ? projectScore(project) : book.metrics.overall - book.expectation) + (random(state) - 0.5) * 6 / Math.sqrt(reviews), 0, 100);
      book.reviewScore = round((book.reviewScore * book.reviewCount + score * reviews) / (book.reviewCount + reviews));
      book.reviewCount += reviews;
      // Player comments pile up in the archive only, a few at a time.
      if (Array.isArray(book.quotes) && book.quotes.length < 8 && random(state) < 0.08) {
        const pool = book.reviewScore >= 55 ? GENERIC_QUOTES.good : GENERIC_QUOTES.bad;
        book.quotes.push({ text: pool[Math.floor(random(state) * pool.length)], positive: book.reviewScore >= 55 });
      }
    }
    const fans = Math.max(0, units * (book.reviewScore - 50) / 100 * 0.3);
    book.followers += Math.round(fans);
    state.fans = round(state.fans + fans);
    book.received = round(book.received + income);
    const week = Math.floor(age / 7);
    while (book.weekly.length <= week) book.weekly.push(0);
    book.weekly[week] = round(book.weekly[week] + income);
    // Remember which weeks ran a sale, so the archive chart can show the difference against full price.
    if (!Array.isArray(book.saleFlags)) book.saleFlags = [];
    book.saleFlags[week] = book.saleFlags[week] || (discounted ? 1 : 0);
    if (discounted) book.saleWeeks = (book.saleWeeks || 0) + 1;
    state.cash = round(state.cash + income);
    state.ledger.income = round(state.ledger.income + income);
    checkMarks(state, book);
  }
}

export function operateBook(state: any, id: string, kind: string) {
  throw new Error('补丁与更新由作品分工中的实际修复和返工交付，不再单独购买。');
}

export function makeDLC(state: any, id: string) {
  const next = studioAction(state);
  const book = next.catalog.find((item: any) => item.id === id);
  if (!book || next.day - book.released > 540) throw new Error('该作品已结束销售。');
  if (book.parentId) throw new Error('请从原作立项资料片。');
  const siblings = next.projects.filter((item: any) => item.parentId === id);
  if (siblings.length >= 2) throw new Error('每部原作最多立项两部资料片。');
  const project = blankProject(`${next.day}-${next.seed}-${next.projects.length}`, { name: `${book.name} · 资料片 ${siblings.length + 1}`, type: book.type, scale: book.scale }, next.day);
  project.parentId = id;
  for (const key of CONTENT_KEYS) project.work[key].total *= 0.25;
  project.followers = Math.round(book.units * 0.3 + book.followers * 0.2);
  project.priority = Math.max(-1, ...projectOrder(next).map((item: any) => item.priority ?? 0)) + 1;
  const cost = 4 + book.scale * 2;
  spend(next, cost, `《${book.name}》资料片立项`);
  project.invested = cost;
  next.projects.push(project);
  studioLog(next, `《${project.name}》立项`, '作为关联原作的新项目独立安排人手、排期、核算和发售，未发售前不产生销售收益。');
  return next;
}

// Sound can be bought instead of hired: one payment finishes part of the sound dimension at a modest
// quality, and an audio hire can rework it upward later.
export function outsourceSound(state: any, projectId: string, tier: number) {
  if (![0, 1].includes(tier)) throw new Error('外包方案无效。');
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && !item.released);
  if (!project) throw new Error('项目不存在。');
  if (project.soundOut !== null && project.soundOut !== undefined) throw new Error('每部作品只能外包一次声音。');
  const work = project.work.sound;
  if (work.done >= work.total - 0.001) throw new Error('声音工作已经完成。');
  const plan = SOUND_OUTSOURCE[tier];
  spend(next, plan.cost, `《${project.name}》${plan.name}`);
  const add = Math.min(work.total - work.done, work.total * plan.share);
  if (!Array.isArray(work.batches)) work.batches = work.done > 0 ? [{ amount: work.done, quality: work.value / work.done }] : [];
  work.batches.push({ amount: add, quality: plan.quality });
  work.done = round(work.done + add);
  work.value = round(work.value + add * plan.quality);
  project.soundOut = tier;
  project.invested = round(project.invested + plan.cost);
  studioLog(next, `外包声音（${plan.name}）`, `《${project.name}》的声音工作完成 ${Math.round(add / work.total * 100)}%，按 ${plan.quality} 分质量计。`);
  return next;
}

export function setSale(state: any, id: string, enabled: boolean, floor?: number) {
  const next = studioAction(state);
  const book = next.catalog.find((item: any) => item.id === id);
  if (!book || next.day - book.released > 540) throw new Error('该作品已结束销售。');
  if (!enabled) {
    book.sale = false;
    studioLog(next, `《${book.name}》停止促销`, '恢复原价销售。');
    return next;
  }
  book.sale = true;
  book.saleFloor = 0;
  book.saleStart = Math.min(book.saleStart ?? next.day, next.day);
  studioLog(next, `《${book.name}》开启促销`, `统一 ${DISCOUNTS[0] * 10} 折，系统按剩余需求决定何时开始促销。`);
  return next;
}

export function setDeadline(state: any, projectId: string, days: number) {
  if (days !== RELEASE_LEAD_DAYS) throw new Error('发售排期无效。');
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && !item.released);
  if (!project || project.deadline) throw new Error('当前无法公布发售日。');
  if (project.progress < TRIAL * 100) throw new Error('体验版完成后再公布发售日。');
  project.deadline = next.day + days;
  project.followers += 150;
  studioLog(next, '公布发售日', `计划第 ${project.deadline} 天发售《${project.name}》，新增 150 人关注；延期会损失关注。`);
  return next;
}

export function exhibitionOffer(state: any) {
  let day = 90 + Math.max(0, Math.ceil((state.day - 83) / 180)) * 180;
  if (day - 7 < state.day) day += 180;
  const entry = state.exhibitions.find((item: any) => item.day === day);
  const ready = state.projects.find((project: any) => !project.released && project.progress >= TRIAL * 100);
  const reason = entry ? '已报名本届展会' : !ready ? '报名截止前须完成体验版' : state.cash < 1 ? '报名需要 1 万' : '';
  return { day, deadline: day - 7, entry, reason, available: !reason, project: ready };
}

export function enterExhibition(state: any, projectId?: string) {
  const offer = exhibitionOffer(state);
  if (!offer.available) throw new Error(offer.reason);
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === (projectId || offer.project?.id) && !item.released);
  if (!project) throw new Error('没有可以报名的项目。');
  if (project.progress < TRIAL * 100) throw new Error('当前项目完成体验版 后才能报名展会。');
  spend(next, 1, '展会报名');
  project.invested = round(project.invested + 1);
  next.exhibitions.push({ day: offer.day, project: project.id, name: project.name, metrics: projectMetrics(project), result: null });
  next.exhibitions = next.exhibitions.slice(-30);
  studioLog(next, '展会报名成功', `《${project.name}》参加第 ${offer.day} 天展会。`);
  return next;
}

const RIVAL_NAMES = ['纸鹤工坊', '雨燕游戏', '星屿制作', '风铃社', '月台互动', '白桦工作室', '远帆游戏', '像素溪流'];

function updateRankings(state: any) {
  const week = Math.floor((state.day - 1) / 7);
  const rivals = Array.from({ length: 20 }, (_, index) => ({ id: `rival-${index}`, name: `${RIVAL_NAMES[index % RIVAL_NAMES.length]} · ${Math.floor(index / 8) + 1}`, studio: true, units: Math.round(1200 / Math.pow(index + 1, 1.3) * (0.85 + ((week + index * 3) % 7) * 0.05)) }));
  const entries = state.catalog.filter((book: any) => state.day - book.released <= 540).map((book: any) => ({ id: book.id, name: book.name, studio: false, units: state.day === book.released ? Math.round(book.openingUnits / 7) : book.lastDayUnits }));
  const ranked = [...rivals, ...entries].sort((left, right) => right.units - left.units);
  state.rankings = ranked.slice(0, 30).map((entry, index) => ({ ...entry, rank: index + 1 }));
  for (const book of state.catalog) {
    const entry = state.rankings.find((item: any) => item.id === book.id);
    book.previousRank = book.rank;
    book.rank = entry ? entry.rank : null;
    if (book.rank && (!book.bestRank || book.rank < book.bestRank)) book.bestRank = book.rank;
    if (book.rank && book.rank <= 10 && state.goals.topTen === null) {
      state.goals.topTen = state.day;
      state.fans += 200;
      announce(state, { kind: 'record', title: `《${book.name}》进入前十`, text: `销量榜第 ${book.rank} 名`, amount: 0 });
    }
  }
}

// Players only ever report the defects they actually run into, and reports trickle in rather than
// arriving as one list: the player patches under incomplete information by design.
function playerReports(state: any) {
  for (const project of state.projects) {
    if (!project.released) continue;
    const hidden = project.defects.filter((defect: any) => !defect.found);
    if (!hidden.length) continue;
    const book = state.catalog.find((item: any) => item.id === project.id);
    const traffic = book ? Math.min(1, (book.lastDayUnits || 0) / 40) : 0;
    if (random(state) > 0.25 + traffic * 0.5) continue;
    const defect = hidden[Math.floor(random(state) * hidden.length)];
    defect.found = true;
    defect.reported = true;
    project.found += 1;
    studioLog(state, `《${project.name}》收到玩家报告`, `${DIMENSIONS.find(item => item.key === defect.dimension)?.name}相关问题，已加入待修复。`);
  }
}

function calendarDay(state: any) {
  if (state.day % 7 === 0) updateRankings(state);
  // A promised release date comes due: ship now, push it back and lose attention, or drop the promise.
  for (const project of state.projects) {
    if (state.event || project.released || project.deadline === null || state.day < project.deadline) continue;
    project.deadline = null;
    const unfinished = projectMetrics(project).unfinished.length;
    state.event = {
      id: 'deadline', project: project.id, title: `公布的发售日到了`,
      text: `《${project.name}》的发售日到了。现在发售不会损失关注；选择延期或取消日期会损失 10% 的关注。`,
      choices: [
        { id: 'launch', title: '现在发售', detail: unfinished ? `还有 ${unfinished} 维未完成，带着短板上市。` : '内容已经完整，带着当前表现上市。' },
        { id: 'delay', title: '延期十四天', detail: '本次损失 10% 关注，新的期限到了再决定是否发售。' },
        { id: 'continue', title: '取消日期，继续完善', detail: '损失 10% 关注，不再承诺时间，准备好后手动发售。' }
      ]
    };
    return;
  }
  for (const entry of state.exhibitions) {
    if (entry.day > state.day || entry.result) continue;
    const project = state.projects.find((item: any) => item.id === entry.project);
    const book = state.catalog.find((item: any) => item.id === entry.project);
    const metrics = project ? projectMetrics(project) : book?.metrics || entry.metrics;
    const score = round(metrics.dimensions.creativity * 0.4 + metrics.dimensions.picture * 0.3 + metrics.dimensions.sound * 0.3);
    const rivals = RIVAL_NAMES.map((name, index) => ({ name, score: 48 + ((entry.day + index * 17) % 43), own: false }));
    const ranking = [...rivals, { name: entry.name, score, own: true }].sort((left, right) => right.score - left.score);
    const rank = ranking.findIndex(item => item.own) + 1;
    const followers = rank <= 3 ? 1400 - rank * 200 : 250;
    const media = rank <= 3 ? '《独立游戏观察》专题报道' : '《新作周刊》展会速递';
    const lead = ranking[0];
    const gap = rank === 1 ? '没有明显差距，体验领先。' : `主要差距在${lead.own ? '整体体验' : `${DIMENSIONS.find(item => item.key === 'creativity')?.name}与表现`}：第一名 ${lead.name} 领先 ${(lead.score - score).toFixed(1)} 分。`;
    entry.result = { rank, score, followers, media, ranking, gap };
    if (project) project.followers += followers;
    if (book) { book.followers += followers; book.dailyUnits += followers / 40; }
    state.fans += Math.round(followers * 0.1);
    announce(state, { kind: 'record', title: `展会第 ${rank} 名`, text: `《${entry.name}》获得 ${followers} 人关注与媒体报道`, amount: 0 });
    studioLog(state, '展会报道', `${media}：《${entry.name}》第 ${rank} 名。${gap}`);
  }
  if (state.day % 360 !== 0) return;
  const year = state.day / 360;
  if (state.awards.some((item: any) => item.year === year)) return;
  const eligible = state.catalog.filter((book: any) => book.released > (year - 1) * 360 && book.released <= year * 360);
  const categories = ['年度作品', '创意奖', '表现奖'];
  categories.forEach((category, categoryIndex) => {
    const scoreOf = (book: any) => categoryIndex === 0 ? book.reviewScore : categoryIndex === 1 ? book.metrics.dimensions.creativity : (book.metrics.dimensions.picture + book.metrics.dimensions.sound) / 2;
    const rivals = RIVAL_NAMES.slice(0, 5).map((name, index) => ({ name, score: 65 + ((year * 7 + index * 11 + categoryIndex * 3) % 26), own: false }));
    const ranking = [...rivals, ...eligible.map((book: any) => ({ name: book.name, id: book.id, score: scoreOf(book), own: true }))].sort((left, right) => right.score - left.score);
    const winner: any = ranking[0];
    state.awards.push({ year, category, winner: winner.name, own: winner.own, ranking: ranking.slice(0, 8) });
    if (winner.own) {
      state.fans += categoryIndex === 0 ? 800 : 400;
      if (state.goals.award === null) state.goals.award = state.day;
      announce(state, { kind: 'record', title: `获得${category}`, text: `第 ${year} 年 · 《${winner.name}》 · 新增粉丝`, amount: 0 });
    }
    studioLog(state, `第 ${year} 年${category}`, `获奖作品：《${winner.name}》。`);
  });
  state.awards = state.awards.slice(-60);
  state.catalog.forEach((book: any) => { if (!book.team) book.team = []; });
}

export function consumeFeed(state: any) {
  return { ...state, feed: [] };
}

export function skipTutorial(state: any) {
  return { ...state, tutorial: { ...state.tutorial, skipped: true } };
}

export function markSeen(state: any, id: string) {
  return { ...state, tutorial: { ...state.tutorial, seen: { ...state.tutorial.seen, [id]: true } } };
}

export function restoreStudio(saved: any) {
  const next = clone(saved);
  if (!validStudio(next)) throw new Error('这不是有效的工作室存档，当前进度没有改变。');
  if ((next.rulesRevision || 0) < 1) {
    for (const project of next.projects) {
      const share = sum(CONTENT_KEYS.map(key => TYPES[project.type].share[key]));
      for (const key of CONTENT_KEYS) {
        const work = project.work[key];
        work.total /= share;
        work.done /= share;
        work.value /= share;
        work.batches = work.done > 0 ? [{ amount: work.done, quality: work.value / work.done }] : [];
      }
      project.work.stability = { total: 0, done: 0, value: 0, batches: [] };
      project.progress = projectMetrics(project).progress;
      if (project.released) project.assignments = {};
      for (const finding of project.test?.findings || []) {
        if (finding.key !== 'stability') continue;
        finding.text = '只统计已报告问题；没有新报告不代表已经找全。';
        finding.value = visibleMetrics(project).dimensions.stability;
      }
      const book = next.catalog.find((item: any) => item.id === project.id);
      if (book) {
        book.metrics = projectMetrics(project);
        project.invested = book.invested;
        book.review = reviewOf(next, project, visibleMetrics(project));
      }
    }
    if (next.operation) {
      const book = next.catalog.find((item: any) => item.id === next.operation.book);
      if (book) {
        const cost = 2 + book.scale;
        next.cash = round(next.cash + cost);
        next.ledger.income = round(next.ledger.income + cost);
        book.invested = Math.max(0, book.invested - cost);
        const project = next.projects.find((item: any) => item.id === book.id);
        if (project) project.invested = book.invested;
        studioLog(next, '旧更新安排已转换', `退回《${book.name}》未完成的独立更新费用，之后直接分工修复与返工。`);
      }
      next.operation = null;
    }
    next.rulesRevision = 1;
  }
  if (next.rulesRevision < 2) {
    // Stability became a testing workload. Shipped titles keep the score they were judged by; work in
    // progress starts its testing from zero.
    for (const project of next.projects) {
      const type = TYPES[project.type];
      const total = type.work * SCALES[project.scale].work * type.share.stability / sum(CONTENT_KEYS.map(key => type.share[key]));
      const open = project.defects.filter((defect: any) => !defect.fixed).length;
      const kept = project.released ? clamp(100 - open * 3 / SCALES[project.scale].work, 0, 100) : 0;
      project.work.stability = { total, done: kept > 0 ? total : 0, value: total * kept, batches: kept > 0 ? [{ amount: total, quality: kept }] : [] };
      syncFound(project);
      const book = next.catalog.find((item: any) => item.id === project.id);
      if (book) book.metrics = projectMetrics(project);
    }
    next.rulesRevision = 2;
  }
  if (next.rulesRevision < 3) {
    // Stability now counts open defects, so defects became five times finer and five times cheaper to
    // fix. Each old defect splits into five, and testing finds are kept by giving them rolls below coverage.
    for (const project of next.projects) {
      const share = coverage(project);
      const old = project.defects;
      project.defects = [];
      for (const defect of old) {
        for (let copy = 0; copy < 5; copy += 1) {
          const roll = defect.found ? random(next) * share : share + random(next) * (1 - share);
          project.defects.push({ ...defect, id: `${project.id}-${project.defects.length}`, roll, repairWork: (defect.repairWork || 0) * REPAIR_WORK / 2 });
        }
      }
      project.defectDebt = (project.defectDebt || 0) * 5 % 1;
      project.found = project.defects.filter((defect: any) => defect.found && !defect.fixed).length;
      const book = next.catalog.find((item: any) => item.id === project.id);
      if (book) book.metrics = projectMetrics(project);
    }
    next.rulesRevision = 3;
  }
  projectOrder(next).forEach((project: any, index: number) => { project.priority = index; });
  return next;
}

function validStudio(state: any) {
  const number = (value: any) => typeof value === 'number' && Number.isFinite(value);
  const nonnegative = (value: any) => number(value) && value >= 0;
  const text = (value: any) => typeof value === 'string' && value.length <= 5000;
  const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
  const abilities = (value: any) => object(value) && ABILITY_KEYS.every(key => nonnegative(value[key]) && value[key] <= 100);
  const tags = (value: any) => Array.isArray(value) && value.every((tag: any) => tag && has(ABILITY_TAGS, tag.key) || has(PERSONALITY_TAGS, tag.key));
  const person = (value: any) => value && text(value.name) && has(ROLES, value.role) && abilities(value.abilities) && number(value.speed) && value.speed > 0 && value.speed <= 200 && number(value.wage) && value.wage >= 0 && Array.isArray(value.stressTags) && tags(value.tags);
  const work = (value: any) => object(value) && DIM_KEYS.every(key => value[key] && nonnegative(value[key].total) && nonnegative(value[key].done) && nonnegative(value[key].value));
  if (!state || state.version !== 6 || !Number.isInteger(state.day) || state.day < 1 || !text(state.company) || !number(state.cash) || !nonnegative(state.accrued) || typeof state.over !== 'boolean') return false;
  if (!Array.isArray(state.staff) || !state.staff.every(person)) return false;
  if (!Array.isArray(state.projects) || !state.projects.every((project: any) => project && text(project.name) && has(TYPES, project.type) && tier(project.scale) && work(project.work) && Array.isArray(project.defects))) return false;
  if (!Array.isArray(state.catalog) || !state.catalog.every((book: any) => book && text(book.name) && has(TYPES, book.type) && tier(book.scale) && number(book.price) && book.price > 0 && object(book.metrics) && nonnegative(book.received) && Array.isArray(book.weekly))) return false;
  if (!Array.isArray(state.tools) || !state.tools.every((key: any) => has(STUDIO_TOOLS, key))) return false;
  if (!object(state.goals) || !object(state.tutorial) || !object(state.overtime) || !Array.isArray(state.rankings) || !Array.isArray(state.exhibitions) || !Array.isArray(state.awards) || !Array.isArray(state.history) || !Array.isArray(state.reports)) return false;
  return true;
}
