// Pure business rules without engine imports, so they can also run in Node for balance checks.
// This is the six-dimension skeleton: every work unit is judged by the person who did it, and the
// score of a dimension is the ability of its finished work times its progress, never capped.

// Build version: bumped on every code change so the running preview can be matched against source.
// Check the in-game top bar, the repo-root VERSION file, or a git tag to confirm which build is live.
export const VERSION = '0.1.31';

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
  iron: { name: '抗压', text: '加班不太会积累负面标签。', rarity: 2 },
  eager: { name: '拼命', text: '产出更高，但更容易积累负面标签。', rarity: 1 },
  grumbler: { name: '爱抱怨', text: '一旦加班就很快不满。', warn: true },
  growth: { name: '好学', text: '参与作品时成长更快。', rarity: 1 },
  careful: { name: '细心', text: '做的工作留下的缺陷更少。', rarity: 1 },
  speedy: { name: '手快', text: '工作速度更高。', rarity: 1 },
  social: { name: '合群', text: '团建更容易出效果。', rarity: 1 }
};
// Negative labels are the only form stress takes. They lower ability and output, and only overtime
// produces them. No fallback: the more often someone works overtime, the likelier they appear.
export const STRESS_TAGS: any = {
  tired: { name: '疲惫', text: '能力与产出下降。', warn: true },
  leaving: { name: '想走', text: '每天可能提出离职，还在加班时概率翻倍。', warn: true }
};
// Very rare traits that help the people around them rather than the holder.
export const RARE_TAGS: any = {
  taste: { name: '审美极佳', dimension: 'picture', text: '同项目里做画面的人，作品质量 +8。', rarity: 3 },
  muse: { name: '灵感源泉', dimension: 'creativity', text: '同项目里做创意的人，作品质量 +8。', rarity: 3 },
  following: { name: '自带粉丝', text: '参与的新作立项时自带一批关注。', rarity: 2 }
};
// Team boosts come with time in the company and help everyone on the holder's project. Each has three
// grades (blue, purple, gold): the first is earned with tenure, later grades with more tenure or outings.
export const BOOST_TAGS: any = {
  unity: { name: '凝聚人心', from: 'social', effect: [1.04, 1.08, 1.12], text: (v: number) => `同项目全组速度 +${Math.round((v - 1) * 100)}%。` },
  gate: { name: '把关严格', from: 'careful', effect: [0.9, 0.85, 0.78], text: (v: number) => `同项目全组新增缺陷 -${Math.round((1 - v) * 100)}%。` },
  anchor: { name: '定海神针', from: 'iron', effect: [0.8, 0.7, 0.55], text: (v: number) => `同项目全组加班积累负面标签的概率 -${Math.round((1 - v) * 100)}%。` },
  coach: { name: '传帮带', from: 'growth', effect: [1.15, 1.3, 1.5], text: (v: number) => `同项目全组成长与带教 +${Math.round((v - 1) * 100)}%。` }
};
export const BOOST_GRADES = ['一档', '二档', '三档'];

// Colour means rarity only: green → blue → purple → gold. Harmful labels are dark grey with a "!".
export const RARITY_TONES = ['green', 'blue', 'purple', 'gold'];
export const RARITY_NAMES = ['普通', '优秀', '稀有', '传说'];
// The same bands colour ability numbers; below the first band an ability earns no tag at all.
export function valueRank(value: number) {
  return value >= 90 ? 3 : value >= 80 ? 2 : value >= 70 ? 1 : value >= 60 ? 0 : -1;
}

export function tagInfo(tag: any, person: any = null) {
  const key = typeof tag === 'string' ? tag : tag?.key;
  const graded = (info: any, kind: string, rank: number) => ({ ...info, kind, rank, tone: RARITY_TONES[clamp(rank, 0, 3)], rarity: RARITY_NAMES[clamp(rank, 0, 3)] });
  if (has(STRESS_TAGS, key)) return { ...STRESS_TAGS[key], kind: '状态', rank: -1, tone: 'stress' };
  if (has(ABILITY_TAGS, key)) {
    const value = person ? person.abilities[ABILITY_TAGS[key].ability] : null;
    return graded(ABILITY_TAGS[key], '能力', typeof value === 'number' ? valueRank(value) : 0);
  }
  if (has(PERSONALITY_TAGS, key)) {
    const info = PERSONALITY_TAGS[key];
    return info.warn ? { ...info, kind: '性格', rank: -1, tone: 'stress' } : graded(info, '性格', info.rarity);
  }
  if (has(BOOST_TAGS, key)) {
    const level = clamp(person?.boostLevel || 1, 1, 3);
    return graded({ ...BOOST_TAGS[key], text: BOOST_TAGS[key].text(BOOST_TAGS[key].effect[level - 1]) }, '团队增益 · ' + BOOST_GRADES[level - 1], level);
  }
  if (has(RARE_TAGS, key)) return graded(RARE_TAGS[key], '稀有特质', RARE_TAGS[key].rarity);
  return { name: String(key || ''), text: '', kind: '', rank: 0, tone: 'green' };
}

// Everything shown on a person: stress first, then the rest by rarity. Ability tags follow the numbers —
// only notable abilities show (at most two), and the colour climbs as the ability grows.
export function personTags(person: any) {
  const out: any[] = [];
  if (person.boost) out.push(tagInfo(person.boost, person));
  for (const tag of person.tags || []) if (tag.kind !== 'ability' && !has(ABILITY_TAGS, tag.key)) out.push(tagInfo(tag, person));
  const notable = ABILITY_KEYS.filter(ability => valueRank(person.abilities[ability]) >= 0).sort((left, right) => person.abilities[right] - person.abilities[left]).slice(0, 2);
  for (const ability of notable) {
    const stored = (person.tags || []).find((tag: any) => has(ABILITY_TAGS, tag.key) && ABILITY_TAGS[tag.key].ability === ability);
    const key = stored?.key || Object.keys(ABILITY_TAGS).find(item => ABILITY_TAGS[item].ability === ability);
    if (key) out.push(tagInfo(key, person));
  }
  const good = out.filter(item => item.tone !== 'stress').sort((left, right) => right.rank - left.rank);
  return [...(person.stressTags || []).map((key: string) => tagInfo(key, person)), ...out.filter(item => item.tone === 'stress'), ...good];
}
// Potential is the ceiling practice can reach; candidates only show a band, never the number.
export function potentialBand(person: any) {
  const value = person.potential ?? 80;
  return value >= 90 ? '高' : value >= 78 ? '中' : '低';
}
export function primaryAbility(person: any) {
  return ABILITY_KEYS.reduce((best, key) => person.abilities[key] > person.abilities[best] ? key : best, ABILITY_KEYS[0]);
}

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
// Sound can be bought instead of hired: a one-off purchase finishes part of the sound dimension at a
// modest quality, which is how a small team ships sound at all before it can afford an audio hire.
export const SOUND_OUTSOURCE = [
  { name: '廉价素材库', cost: 2, share: 0.6, quality: 40, text: '立刻完成六成声音工作，但这一维做不高；之后可由音频岗返工。' },
  { name: '委托音频制作', cost: 6, share: 1, quality: 65, text: '一次性做完声音工作，质量中规中矩。' }
];

// Promotion is one campaign per title, picked once after the trial build. Tiers differ by orders of
// magnitude and each yuan buys fewer followers as the budget grows, so the right tier depends on what
// one follower is worth for this title (price, trial reception) and how far its launch can reach.
export const PROMOTE_TIERS = [0.5, 3, 15, 60];
const PROMOTE_SCALE = 400;
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
const FAMILY_NAMES = ['林', '陈', '周', '许', '沈', '叶', '宋', '程', '顾', '苏', '陆', '江', '王', '李', '张', '刘', '赵', '吴', '郑', '孙', '马', '朱', '胡', '郭', '何', '高', '罗', '梁', '谢', '韩', '唐', '冯', '董', '萧', '曹', '袁', '邓', '傅', '彭', '曾', '温', '白', '秦', '姚', '崔', '段', '谭', '姜'];
const GIVEN_NAMES = ['知夏', '明远', '可宁', '星河', '亦舟', '思齐', '安然', '予墨', '嘉禾', '清和', '一帆', '若溪', '子谦', '雨桐', '景行', '晨曦', '沐白', '少庭', '书瑶', '云起', '桓宁', '绍光', '慕初', '敬之', '听澜', '尚文', '江来', '观潮', '嘉树', '知意', '青竹', '南乔', '一诺', '闻舒', '立夏', '山月', '昭宁', '启航', '书翼', '时雨', '远山', '顺之', '守一', '晴川', '彦庭', '念安', '海宁', '修远', '云舒', '霜降', '春和', '鸿门', '北辰', '小满', '黎明', '文欣', '晨阳', '仲庭', '雨生', '林溪'];

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
  const state: any = {
    version: 6, rulesRevision: 7, seed: seed >>> 0, day: 1, company: '', cash: START_CASH, founder: 'code',
    staff: [], projects: [], catalog: [], candidates: {},
    event: null, over: false, accrued: 0,
    ledger: { opening: START_CASH, income: 0, expense: 0, payroll: 0 },
    report: null, reports: [], history: [], tutorial: { skipped: false, seen: {} }, notices: {}, bridgeUsed: false, lastRelease: null,
    office: 0, goals: { firstRelease: null, breakEven: null, moved: null, topTen: null, award: null, expanded: null }, fans: 0, feed: [],
    overtime: {}, outing: { charges: 1, next: 1 + OUTING_RECHARGE, last: null, resume: null, paused: {}, pending: null, history: [] }, sound: true, exhibitions: [], awards: [], rankings: [], operation: null,
    eventNext: 60, eventSeen: {}, schedule: [], talents: [], flags: {}, achievements: {}, playSeconds: 0,
    rating: { score: 0, watch: false, promotedAt: 0, history: [] }
  };
  seedIndustry(state);
  return state;
}

export const tutorialActive = (state: any) => !!state.company && state.catalog.length === 0 && !state.tutorial.skipped;
export const seats = (state: any) => OFFICES[state.office].seats;
export const projectOpen = (state: any) => state.projects.filter((project: any) => !project.released);
export const activeProject = (state: any, id?: string) => id ? state.projects.find((project: any) => project.id === id) || null : projectOpen(state)[0] || null;
// Everything the team is working on: titles in development plus shipped titles with a patch running.
export const liveProjects = (state: any) => state.projects.filter((project: any) => !project.released || project.patch);

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
    next.staff.push(freshPerson(next, {
      id: `founder-${next.seed}`, name: '创始人', role: next.founder, abilities, speed: 95, wage: 0,
      hired: true, joined: next.day, home: homeWork({ role: next.founder, home: '' }), founder: true, snap: { ...abilities },
      potential: Math.round(Math.min(98, Math.max(...ABILITY_KEYS.map(key => abilities[key])) + 8 + random(next) * 10))
    }));
    personNote(next, next.staff[0], `创办${value}`);
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

// Candidates are specialists: one trade stands out (sometimes two), the rest stay low. Even the best
// channel tops out well short of 100 — about where practice, mentoring and training can take a hire.
const CHANNEL_PEAK: any = { friends: [42, 62], web: [54, 74], headhunt: [64, 82] };
const POTENTIAL_ROOM: any = { friends: 32, web: 24, headhunt: 16 };
const RARE_CHANCE: any = { friends: 0.02, web: 0.04, headhunt: 0.07 };

function pickAbilities(state: any, role: string, channel: any) {
  const prior = ROLES[role].prior;
  const [low, high] = CHANNEL_PEAK[channel];
  const abilities: any = {};
  for (const key of ABILITY_KEYS) abilities[key] = Math.round(clamp(prior[key][0] * 0.55 + random(state) * 14, 5, 45));
  const ranked = [...ABILITY_KEYS].sort((left, right) => prior[right][1] - prior[left][1]);
  // The trade is always the strongest ability. A few also have a decent side skill outside the trade,
  // like a programmer with an ear for music — useful as a stand-in, never better than the day job.
  const primary = ranked[0];
  const peak = Math.round(low + random(state) * (high - low));
  abilities[primary] = peak;
  for (const key of ABILITY_KEYS) if (key !== primary) abilities[key] = Math.min(abilities[key], peak - 2);
  const second = random(state) < 0.12 ? pick(state, ranked.slice(2)) : random(state) < 0.4 ? ranked[1] : null;
  if (second) abilities[second] = Math.max(abilities[second], Math.round(peak - 8 - random(state) * 10));
  return abilities;
}

function potentialFor(state: any, abilities: any, channel: string) {
  const peak = Math.max(...ABILITY_KEYS.map(key => abilities[key]));
  return Math.round(clamp(peak + 4 + random(state) * (POTENTIAL_ROOM[channel] || 20), peak + 4, 98));
}

function rollTags(state: any, abilities: any, channel = 'friends') {
  const count = random(state) < 0.45 ? 1 : random(state) < 0.7 ? 2 : 3;
  let abilityKeys = Object.keys(ABILITY_TAGS).filter(key => ABILITY_KEYS.includes(ABILITY_TAGS[key].ability) && abilities[ABILITY_TAGS[key].ability] >= 55);
  const personalityKeys = Object.keys(PERSONALITY_TAGS);
  const tags: any[] = [];
  if (random(state) < (RARE_CHANCE[channel] || 0.02)) tags.push({ kind: 'rare', key: pick(state, Object.keys(RARE_TAGS)) });
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

// The monthly wage the market would ask today for someone this good, priced on their best ability.
export function marketWage(person: any) {
  const peak = Math.max(...ABILITY_KEYS.map(key => person.abilities[key]));
  const source = CHANNELS[peak >= 64 ? 'headhunt' : peak >= 54 ? 'web' : 'friends'];
  return round(source.wage[0] + peak * source.wage[1] + Math.max(0, person.speed - source.speed[0]) * source.wage[2] + source.wage[3] / 2);
}

// Notes on a person's own record: joining, releases, mentoring, labels and the events they lived through.
function personNote(state: any, person: any, text: string) {
  person.history = [...(person.history || []), { day: state.day, text }].slice(-40);
}

function freshPerson(state: any, base: any) {
  return {
    work: 0, growth: 0, level: 0, stressTags: [], stressChance: 0, overtimeDays: 0, leaveUntil: 0, fame: false, rampup: 0,
    tags: [], boost: null, mentor: null, history: [], trace: [], ...base
  };
}

// Each layoff leaves a mark: recruiting gets pricier as word gets around, up to double.
export function recruitFee(state: any, channel: string) {
  const layoffs = state.notices.layout || 0;
  return round(CHANNELS[channel].fee * (1 + Math.min(1, layoffs * 0.25)));
}

// A star is a specialist at the top of one trade, not good at everything.
function starFrom(state: any, role: string, talent: any = null) {
  const prior = ROLES[role].prior;
  const abilities: any = {};
  for (const key of ABILITY_KEYS) abilities[key] = Math.round(clamp(prior[key][0] * 0.6 + random(state) * 16, 5, 55));
  const primary = talent?.primary || [...ABILITY_KEYS].sort((left, right) => prior[right][1] - prior[left][1])[0];
  abilities[primary] = Math.round(90 + random(state) * 7);
  return talent ? { ...talent.abilities } : abilities;
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
    const tags = rollTags(next, abilities, channel);
    const speed = Math.round(source.speed[0] + random(next) * (source.speed[1] - source.speed[0]));
    const strongest = ABILITY_KEYS.reduce((best, item) => abilities[item] > abilities[best] ? item : best, ABILITY_KEYS[0]);
    const name = FAMILY_NAMES[Math.floor(random(next) * FAMILY_NAMES.length)] + GIVEN_NAMES[Math.floor(random(next) * GIVEN_NAMES.length)];
    const wage = round(source.wage[0] + abilities[strongest] * source.wage[1] + (speed - source.speed[0]) * source.wage[2] + random(next) * source.wage[3]);
    return freshPerson(next, { id: `${role}-${channel}-${batch}-${index}-${next.seed}`, name, role, abilities, speed, tags, wage, hired: false, potential: potentialFor(next, abilities, channel) });
  });
  // A name in the industry shows up only where word of mouth is worth something: a strong record draws
  // them out, they want their own people and they take a while to settle in.
  const fameChance = [0, 0.15, 0.35][next.focus || 0];
  if (next.notices.fameNext && channel === 'headhunt' || fameChance > 0 && random(next) < fameChance) {
    if (channel === 'headhunt') delete next.notices.fameNext;
    const star = people[Math.floor(random(next) * people.length)];
    // A free agent the player has read about in the news is the one who turns up.
    const talent = (next.talents || []).find((item: any) => item.status === 'free' && item.role === role);
    star.abilities = starFrom(next, role, talent);
    if (talent) { star.name = talent.name; star.talent = talent.id; star.story = `第 ${talent.since} 天新闻：${talent.title}`; }
    star.potential = Math.max(...ABILITY_KEYS.map(item => star.abilities[item])) + 2;
    star.speed = Math.min(140, star.speed + 12);
    star.wage = round(star.wage * 1.6);
    star.fame = true;
    star.rampup = 30;
    star.tags = [...star.tags.filter((tag: any) => tag.kind !== 'ability').slice(0, 2), { kind: 'personality', key: 'eager' }];
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
  const talent = person.talent ? (state.talents || []).find((item: any) => item.id === person.talent) : null;
  if (talent && talent.status !== 'free') reasons.push(`${person.name}已经加入了${talent.studioName}。`);
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
  const joined = { ...person, joined: next.day, home: homeWork(person), snap: { ...person.abilities } };
  next.staff.push(joined);
  personNote(next, joined, `入职，月薪 ${person.wage.toFixed(2)} 万`);
  const talent = person.talent ? (next.talents || []).find((item: any) => item.id === person.talent) : null;
  if (talent) talent.status = 'hired';
  studioLog(next, `${person.name} 加入`, `${ROLES[person.role].name}，月薪 ${person.wage.toFixed(2)} 万。`);
  if (person.fame) news(next, next.focus || 0, true, `${person.name}加入${next.company}`, person.story ? `此前的动向：${person.story}` : '业内知名开发者换了新东家。', null, true);
  if (person.story) announce(next, { kind: 'record', title: `${person.name}加入了`, text: '曾在新闻里见过的名字，现在是你的同事', amount: 0 });
  // A star who insisted on bringing their old crew takes one along when a seat is free for them.
  if (person.fame && person.condition === 'crew' && next.staff.length < seats(next)) {
    const role = ['code', 'design', 'art'][Math.floor(random(next) * 3)];
    const abilities: any = {};
    for (const key of ABILITY_KEYS) {
      const [low, high] = ROLES[role].prior[key];
      abilities[key] = Math.round((low + high) / 2 + (random(next) - 0.5) * 20);
    }
    const mate = freshPerson(next, {
      id: `crew-${next.seed}-${next.staff.length}`,
      name: FAMILY_NAMES[Math.floor(random(next) * FAMILY_NAMES.length)] + GIVEN_NAMES[Math.floor(random(next) * GIVEN_NAMES.length)],
      role, abilities, speed: 95, wage: round(1.4 + random(next)), hired: true, joined: next.day, home: homeWork({ role, home: '' }),
      potential: Math.min(98, Math.max(...ABILITY_KEYS.map(key => abilities[key])) + 10)
    });
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
  // People who stay see it: the layoff lowers hiring appeal and leaves a mark on morale, more so when
  // the person held the team together.
  next.notices.layout = (next.notices.layout || 0) + 1;
  departed(next, person);
  for (const other of next.staff) {
    if (!other.stressTags.includes('tired') && random(next) < (person.boost ? 0.6 : 0.35)) other.stressTags.push('tired');
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

// Whoever leaves takes their mentoring and overtime with them.
function departed(state: any, person: any) {
  delete state.overtime[person.id];
  for (const other of state.staff) if (other.mentor?.by === person.id) other.mentor = null;
}

export function projectOf(state: any, person: any) {
  return state.projects.find((project: any) => (!project.released || project.patch) && belongsTo(state, project, person)) || null;
}

// A mentoring pair only counts while both sit on the same live project.
export function mentorActive(state: any, person: any) {
  if (!person?.mentor) return null;
  const mentor = state.staff.find((item: any) => item.id === person.mentor.by);
  if (!mentor) return null;
  const project = projectOf(state, person);
  if (!project || projectOf(state, mentor)?.id !== project.id) return null;
  return { mentor, project, ability: person.mentor.ability };
}

// The team boosts working on a project: the best grade per kind, at most two kinds, none from stressed holders.
export function projectBoostLevels(state: any, project: any) {
  const levels: any = {};
  for (const person of state.staff) {
    if (!person.boost || person.stressTags.length || !belongsTo(state, project, person)) continue;
    levels[person.boost] = Math.max(levels[person.boost] || 0, clamp(person.boostLevel || 1, 1, 3));
  }
  const kept = Object.keys(levels).sort((left, right) => levels[right] - levels[left]).slice(0, 2);
  return Object.fromEntries(kept.map(key => [key, levels[key]]));
}

export function projectBoosts(state: any, project: any) {
  return Object.keys(projectBoostLevels(state, project));
}

export function boostFactor(state: any, project: any, key: string) {
  const level = projectBoostLevels(state, project)[key];
  return level ? BOOST_TAGS[key].effect[level - 1] : 1;
}

export const MENTOR_SLOW = 0.7;
export const MENTEE_SLOW = 0.8;
const PRACTICE = 0.1;

// Practice raises only the ability the work used, slowing as it nears the person's potential.
function practice(person: any, ability: string, amount: number, bonus = 1) {
  const value = person.abilities[ability];
  const cap = person.potential ?? 100;
  if (amount <= 0 || value >= cap) return;
  const rate = PRACTICE * bonus * (person.tags.some((tag: any) => tag.key === 'growth') ? 1.5 : 1);
  person.abilities[ability] = round(Math.min(cap, value + amount * rate * clamp((cap - value) / 30, 0.1, 1)));
}

// Daily mentoring gain: towards the mentor's level, half speed above the mentee's own potential.
export function mentorGain(state: any, person: any) {
  const pair = mentorActive(state, person);
  if (!pair) return 0;
  const target = pair.mentor.abilities[pair.ability];
  const value = person.abilities[pair.ability];
  if (value >= target - 1) return 0;
  const coach = boostFactor(state, pair.project, 'coach');
  return round(clamp((target - value) * 0.01, 0.03, 0.4) * (value >= (person.potential ?? 100) ? 0.5 : 1) * coach * 1000) / 1000;
}

function speedOf(state: any, person: any, workKey: string) {
  if ((person.leaveUntil || 0) > state.day) return 0;
  let value = person.speed / 100;
  if (person.tags.some((tag: any) => tag.key === 'speedy')) value *= 1.12;
  const overtime = !!state.overtime[person.id];
  if (overtime) value *= OVERTIME_BOOST;
  if (person.stressTags.includes('tired')) value *= 0.8;
  if (person.stressTags.includes('leaving')) value *= 0.7;
  // An industry name needs time to fit in with the existing team.
  if (person.fame && state.day - (person.joined || 0) < 30) value *= 0.8;
  if (person.mentor && mentorActive(state, person)) value *= MENTEE_SLOW;
  if (state.staff.some((other: any) => other.mentor?.by === person.id && mentorActive(state, other))) value *= MENTOR_SLOW;
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
  if (person.leaveUntil > state.day) return '外出中（团建或活动）';
  if (project.patch) return patchProgress(project).fixed < project.patch.targets.length ? '补丁：修复已报告缺陷' : '补丁：返工' + (DIMENSIONS.find(item => item.key === project.patch.rework)?.name || '');
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
  if (enabled && person.noOvertime) throw new Error('他答应过你，不再加班了。');
  if (enabled) next.overtime[id] = true;
  else { delete next.overtime[id]; delete next.outing.paused[id]; }
  studioLog(next, `${person.name}${enabled ? '开始加班' : '结束加班'}`, enabled ? '产出 +45%，缺陷更多，并会累积负面标签。' : '恢复正常工作。');
  return next;
}

export function setSound(state: any, enabled: boolean) {
  if (typeof enabled !== 'boolean') throw new Error('音效设置无效。');
  return { ...state, sound: enabled };
}

// Mentoring: a stronger colleague on the same project brings one ability of a weaker one up towards
// their own level. Both work slower while it lasts; it ends by itself when the gap closes.
export function mentorOptions(state: any, person: any) {
  const project = projectOf(state, person);
  return ABILITY_KEYS.map(ability => ({
    ability,
    mentors: state.staff.filter((other: any) => other.id !== person.id && other.abilities[ability] >= person.abilities[ability] + 6 && project && projectOf(state, other)?.id === project.id)
      .sort((left: any, right: any) => right.abilities[ability] - left.abilities[ability])
  }));
}

export function setMentor(state: any, personId: string, mentorId: string | null, ability?: string) {
  const next = studioAction(state);
  const person = next.staff.find((item: any) => item.id === personId);
  if (!person) throw new Error('员工不存在。');
  if (!mentorId) {
    if (person.mentor) personNote(next, person, '结束带教');
    person.mentor = null;
    studioLog(next, `${person.name} 结束带教`, '两人恢复原来的产出。');
    return next;
  }
  const mentor = next.staff.find((item: any) => item.id === mentorId);
  if (!mentor || !ability || !ABILITY_KEYS.includes(ability)) throw new Error('带教安排无效。');
  if (mentor.abilities[ability] < person.abilities[ability] + 6) throw new Error('带人的一方需要在这一项明显更强。');
  const project = projectOf(next, person);
  if (!project || projectOf(next, mentor)?.id !== project.id) throw new Error('两人需要在同一个项目里。');
  person.mentor = { by: mentor.id, ability, since: next.day };
  const name = ABILITIES.find(item => item.key === ability)?.name;
  personNote(next, person, `由${mentor.name}带教${name}`);
  personNote(next, mentor, `开始带${person.name}的${name}`);
  studioLog(next, `${mentor.name} 带 ${person.name}`, `${name}：${Math.round(person.abilities[ability])} → 目标 ${Math.round(mentor.abilities[ability])}。带人一方产出 ×${MENTOR_SLOW}，被带一方 ×${MENTEE_SLOW}。`);
  return next;
}

// Daily people upkeep: mentoring gains, the monthly ability trace and team-boost rolls.
function staffDay(state: any) {
  for (const person of state.staff) {
    const gain = mentorGain(state, person);
    if (gain > 0) {
      const key = person.mentor.ability;
      person.abilities[key] = round(Math.min(100, person.abilities[key] + gain));
    } else if (person.mentor && mentorActive(state, person)) {
      const mentor = state.staff.find((item: any) => item.id === person.mentor.by);
      const name = ABILITIES.find(item => item.key === person.mentor.ability)?.name;
      personNote(state, person, `出师：${name}追上了${mentor.name}`);
      announce(state, { kind: 'record', title: `${person.name} 出师了`, text: `${name}追上了${mentor.name}`, amount: 0 });
      state.flags = { ...(state.flags || {}), mentored: state.day };
      person.mentor = null;
    }
    if (state.day % 30 === 0) {
      person.trace = [...(person.trace || []), { day: state.day, a: { ...person.abilities } }].slice(-48);
      const tenure = state.day - (person.joined || 0);
      if (!person.boost && tenure >= 90 && random(state) < clamp((tenure - 90) / 360 * 0.06, 0, 0.1)) gainBoost(state, person, '');
      else if (person.boost && (person.boostLevel || 1) < 3 && tenure >= 270 && random(state) < clamp((tenure - 270) / 360 * 0.04, 0, 0.06)) gainBoost(state, person, '');
    }
  }
}

// A first boost leans towards the person's character; holding one already means the next step is a grade up.
function boostChoice(state: any, person: any) {
  if (person.boost) return (person.boostLevel || 1) >= 3 ? null : { kind: 'boost', key: person.boost, level: (person.boostLevel || 1) + 1 };
  const leaning = Object.keys(BOOST_TAGS).find(key => person.tags.some((tag: any) => tag.key === BOOST_TAGS[key].from));
  return { kind: 'boost', key: leaning && random(state) < 0.6 ? leaning : pick(state, Object.keys(BOOST_TAGS)), level: 1 };
}

function applyGain(state: any, person: any, gain: any, source: string) {
  if (gain.kind === 'trait') {
    if (person.tags.some((tag: any) => tag.key === gain.key)) return false;
    person.tags.push({ kind: 'personality', key: gain.key });
    personNote(state, person, `${source}觉醒「${PERSONALITY_TAGS[gain.key].name}」`);
    return true;
  }
  if (person.boost && (person.boost !== gain.key || (person.boostLevel || 1) >= gain.level)) return false;
  person.boost = gain.key;
  person.boostLevel = gain.level;
  personNote(state, person, `${source}${gain.level > 1 ? '团队增益升到' + BOOST_GRADES[gain.level - 1] : '获得团队增益'}「${BOOST_TAGS[gain.key].name}」`);
  return true;
}

function gainBoost(state: any, person: any, source: string) {
  const gain = boostChoice(state, person);
  if (!gain || !applyGain(state, person, gain, source)) return false;
  const info = tagInfo(person.boost, person);
  announce(state, { kind: 'record', title: `${person.name}：「${info.name}」${person.boostLevel > 1 ? BOOST_GRADES[person.boostLevel - 1] : ''}`, text: info.text, amount: 0 });
  return true;
}

// Team building is the only way to clear stress labels, and it stops the whole team. Charges build up
// slowly and outings need a gap, so the player saves them for the right moment instead of spending them
// the day they unlock. Longer outings work better but never for sure.
export const OUTING_DAYS = [1, 3, 5];
const OUTING_CLEAR: any = { 1: 0.25, 3: 0.55, 5: 0.8 };
const OUTING_AWAKEN: any = { 1: 0.05, 3: 0.15, 5: 0.3 };
export const OUTING_RECHARGE = 180;
export const OUTING_MAX = 2;
export const OUTING_GAP = 90;

export const outingCost = (state: any, days: number) => round(state.staff.length * 0.4 * days);

export function outingChances(person: any, days: number) {
  const social = person.tags.some((tag: any) => tag.key === 'social') ? 0.1 : 0;
  return { clear: clamp((OUTING_CLEAR[days] || 0) + social, 0, 0.85), awaken: clamp((OUTING_AWAKEN[days] || 0) + social / 2, 0, 0.4) };
}

export function outingOffer(state: any, days = 3) {
  const outing = state.outing;
  const earliest = outing.last === null ? state.day : outing.last + OUTING_GAP;
  const cost = outingCost(state, days);
  let reason = '';
  if (!state.staff.length) reason = '还没有员工。';
  else if (outing.charges < 1) reason = `团建次数已用完，第 ${outing.next} 天恢复 1 次。`;
  else if (state.day < earliest) reason = `距上次团建不足 ${OUTING_GAP} 天，第 ${earliest} 天起可以再去。`;
  else if (state.cash < cost) reason = '资金不足。';
  return { available: !reason, reason, cost, charges: outing.charges, next: outing.next, earliest: Math.max(state.day, earliest) };
}

// Daily: recharge outings, and give back the overtime an outing paused once everyone is back.
function outingDay(state: any) {
  const outing = state.outing;
  while (outing.charges < OUTING_MAX && outing.next !== null && state.day >= outing.next) {
    outing.charges += 1;
    outing.next = outing.charges < OUTING_MAX ? outing.next + OUTING_RECHARGE : null;
  }
  if (outing.resume !== null && state.day >= outing.resume) {
    for (const id of Object.keys(outing.paused)) {
      const person = state.staff.find((item: any) => item.id === id);
      if (person && !person.noOvertime) state.overtime[id] = true;
    }
    outing.paused = {};
    outing.resume = null;
    if (outing.pending) settleOuting(state);
  }
}

// Results were drawn at departure; they land when the team is back, with a result page if anything changed.
function settleOuting(state: any) {
  const record = state.outing.pending;
  state.outing.pending = null;
  const results: any[] = [];
  for (const plan of record.plans) {
    const person = state.staff.find((item: any) => item.id === plan.id);
    if (!person) continue;
    const cleared = plan.clear.filter((key: string) => person.stressTags.includes(key));
    person.stressTags = person.stressTags.filter((key: string) => !cleared.includes(key));
    for (const key of cleared) personNote(state, person, `团建清掉了「${STRESS_TAGS[key].name}」`);
    const gain = plan.gain && applyGain(state, person, plan.gain, '团建中') ? plan.gain : null;
    results.push({ id: person.id, name: person.name, cleared, gain });
  }
  const entry = { day: record.day, back: state.day, days: record.days, cost: record.cost, results };
  state.outing.history = [entry, ...(state.outing.history || [])].slice(0, 20);
  const cleared = results.reduce((sum: number, item: any) => sum + item.cleared.length, 0);
  const gained = results.filter((item: any) => item.gain).length;
  studioLog(state, '团建结束', `清掉 ${cleared} 个负面标签，${gained} 人有收获。加班安排已恢复。`);
  if (cleared || gained) state.event = { id: 'outing', title: '团建回来了', text: '', choices: [{ id: 'ok', title: '知道了' }] };
  else announce(state, { kind: 'notice', title: '团建回来了', text: '这次没有人清掉标签或有新收获。', amount: 0 });
}

export function teamOuting(state: any, days = 3) {
  if (!OUTING_DAYS.includes(days)) throw new Error('团建天数无效。');
  const offer = outingOffer(state, days);
  if (!offer.available) throw new Error(offer.reason);
  const next = studioAction(state);
  spend(next, offer.cost, `团建 ${days} 天`);
  const outing = next.outing;
  outing.charges -= 1;
  if (outing.next === null) outing.next = next.day + OUTING_RECHARGE;
  outing.last = next.day;
  outing.paused = { ...outing.paused, ...next.overtime };
  outing.resume = next.day + days;
  next.overtime = {};
  const plans: any[] = [];
  for (const person of next.staff) {
    person.leaveUntil = Math.max(person.leaveUntil || 0, next.day + days);
    const chance = outingChances(person, days);
    // 「想走」 is the one that costs people, so it is tried first.
    const clear = ['leaving', 'tired'].filter(key => person.stressTags.includes(key) && random(next) < chance.clear);
    person.stressChance *= 0.5;
    person.overtimeDays = Math.floor(person.overtimeDays / 2);
    plans.push({ id: person.id, clear, gain: random(next) < chance.awaken ? outingGain(next, person) : null });
  }
  outing.pending = { day: next.day, days, cost: offer.cost, plans };
  studioLog(next, `团建 ${days} 天`, `全队停工 ${days} 天，第 ${next.day + days} 天回来公布结果；加班安排回来后恢复。`);
  return next;
}

// What an outing can bring someone, drawn by rarity: an unowned positive trait, a first team boost, or
// the next grade of the boost they hold. Rarer outcomes come up less often.
const RARITY_WEIGHT = [1, 1, 0.35, 0.12];
function outingGain(state: any, person: any) {
  const options: any[] = Object.keys(PERSONALITY_TAGS)
    .filter(key => !PERSONALITY_TAGS[key].warn && !person.tags.some((tag: any) => tag.key === key))
    .map(key => ({ key, rank: PERSONALITY_TAGS[key].rarity }));
  if (!person.boost) options.push({ boost: true, rank: 1 });
  else if ((person.boostLevel || 1) < 3) options.push({ boost: true, rank: (person.boostLevel || 1) + 1 });
  if (!options.length) return null;
  const total = options.reduce((sum: number, item: any) => sum + RARITY_WEIGHT[item.rank], 0);
  let roll = random(state) * total;
  const choice = options.find((item: any) => (roll -= RARITY_WEIGHT[item.rank]) < 0) || options[options.length - 1];
  return choice.boost ? boostChoice(state, person) : { kind: 'trait', key: choice.key };
}

// Talking someone out of leaving only means easing off: the label stays and so does the daily risk.
function keepPerson(state: any, id: string) {
  const person = state.staff.find((item: any) => item.id === id);
  if (!person) return state;
  delete state.overtime[id];
  delete state.outing.paused[id];
  personNote(state, person, '提过离职，被劝留下来，停掉了加班');
  return state;
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
  project.followers += next.staff.filter((person: any) => person.tags.some((tag: any) => tag.key === 'following')).length * 200;
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
  if (project.released) throw new Error('已发售作品请开补丁，再安排补丁人手。');
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

// A patch is its own small project on a shipped title: the scope is fixed when it starts (the defects
// players have reported so far, plus an optional rework of one dimension), it has its own crew and
// priority, and it ships by itself once the scope is done.
export const PATCH_REWORK = 0.3;

export function patchPlan(state: any, project: any, rework: string | null) {
  const targets = project.defects.filter((defect: any) => defect.found && !defect.fixed);
  const reworkTotal = rework ? round(workOf(project, rework).total * PATCH_REWORK) : 0;
  const repairWork = sum(targets.map((defect: any) => (REPAIR_WORK - (defect.repairWork || 0)) / 0.75));
  return { targets: targets.length, reworkTotal, work: round(repairWork + reworkTotal) };
}

export function startPatch(state: any, projectId: string, rework: string | null = null) {
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && item.released);
  if (!project) throw new Error('作品不存在。');
  if (project.patch) throw new Error('这部作品已有补丁在制作。');
  if (rework && !CONTENT_KEYS.includes(rework)) throw new Error('返工项目无效。');
  const targets = project.defects.filter((defect: any) => defect.found && !defect.fixed).map((defect: any) => defect.id);
  if (!targets.length && !rework) throw new Error('目前没有玩家报告的缺陷；选一项返工才能开更新。');
  const book = next.catalog.find((item: any) => item.id === projectId);
  const metrics = projectMetrics(project);
  project.patch = {
    started: next.day, rework, targets, reworkTotal: rework ? round(workOf(project, rework).total * PATCH_REWORK) : 0, reworkDone: 0,
    before: { overall: metrics.overall, review: book ? book.reviewScore : null, daily: book ? book.lastDayUnits : 0 }
  };
  project.assignments = {};
  project.priority = Math.max(-1, ...projectOrder(next).map((item: any) => item.priority ?? 0)) + 1;
  const scope = (targets.length ? `修复 ${targets.length} 项已报告缺陷` : '') + (rework ? `${targets.length ? '，' : ''}返工${DIMENSIONS.find(item => item.key === rework)?.name}` : '');
  studioLog(next, `《${project.name}》开补丁`, `${scope}。安排人手后开始制作，做完自动上线。`);
  return next;
}

export function patchProgress(project: any) {
  const patch = project.patch;
  if (!patch) return null;
  const targets = project.defects.filter((defect: any) => patch.targets.includes(defect.id));
  const fixed = targets.filter((defect: any) => defect.fixed).length;
  const repairLeft = sum(targets.filter((defect: any) => !defect.fixed).map((defect: any) => (REPAIR_WORK - (defect.repairWork || 0)) / 0.75));
  const reworkLeft = Math.max(0, patch.reworkTotal - patch.reworkDone);
  const total = sum(targets.map(() => REPAIR_WORK / 0.75)) + patch.reworkTotal;
  const left = repairLeft + reworkLeft;
  return { fixed, targets: targets.length, reworkDone: round(patch.reworkDone), reworkTotal: patch.reworkTotal, left: round(left), share: total > 0 ? clamp(1 - left / total, 0, 1) : 1, done: left <= 0.0001 };
}

export function patchForecast(state: any, project: any) {
  const progress = patchProgress(project);
  if (!progress) return null;
  const factor = priorityFactor(state, project);
  const rate = sum(state.staff.filter((person: any) => belongsTo(state, project, person)).map((person: any) => speedOf(state, person, 'repair') * factor * conditionFactor(person, project)));
  const days = progress.done ? 0 : rate > 0.0001 ? Math.ceil(progress.left / rate) : null;
  return { ...progress, rate: round(rate), days, eta: days === null ? null : state.day + days };
}

// The patch crew is a plain in or out: a patch has one job list, so there is nothing to split.
export function setPatchCrew(state: any, projectId: string, personId: string, on: boolean) {
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && item.patch);
  if (!project) throw new Error('补丁不存在。');
  const person = next.staff.find((item: any) => item.id === personId);
  if (!person) throw new Error('员工不存在。');
  if (!project.assignments) project.assignments = {};
  if (on) {
    for (const other of next.projects) if (other.assignments && other.id !== projectId) delete other.assignments[personId];
    project.assignments[personId] = [homeWork(person)];
  } else delete project.assignments[personId];
  studioLog(next, '调整补丁人手', `${person.name}${on ? '加入' : '离开'}《${project.name}》补丁。`);
  return next;
}

function finishPatch(state: any, project: any) {
  const patch = project.patch;
  const progress = patchProgress(project);
  const book = state.catalog.find((item: any) => item.id === project.id);
  const metrics = projectMetrics(project);
  const rework = patch.rework ? DIMENSIONS.find(item => item.key === patch.rework)?.name : '';
  const record = {
    day: state.day, started: patch.started, fixed: progress.fixed, targets: progress.targets, rework: patch.rework,
    reworkShare: patch.reworkTotal > 0 ? round(patch.reworkDone / patch.reworkTotal) : 0,
    overallBefore: patch.before.overall, overallAfter: metrics.overall, reviewBefore: patch.before.review, dailyBefore: patch.before.daily,
    reviewAt: book ? book.reviewScore : null, dailyAt: book ? book.lastDayUnits : 0
  };
  if (book) {
    book.patches = [...(book.patches || []), record].slice(-12);
    book.updates = (book.updates || 0) + 1;
    book.metrics = metrics;
  }
  project.patch = null;
  project.assignments = {};
  state.flags = { ...(state.flags || {}), patched: state.day };
  const text = `修复 ${progress.fixed}/${progress.targets} 项${rework ? `，返工${rework}` : ''}，综合 ${record.overallBefore.toFixed(0)} → ${metrics.overall.toFixed(0)}`;
  announce(state, { kind: 'record', title: `《${project.name}》补丁上线`, text, amount: 0 });
  news(state, state.focus || 0, false, `《${project.name}》发布补丁`, text + '。', null, true);
  studioLog(state, `《${project.name}》补丁上线`, text + '；口碑与销量会随后续玩家评价逐步变化。');
}

// Ship whatever the patch has done so far; untouched targets stay on the to-fix list.
export function releasePatch(state: any, projectId: string) {
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && item.patch);
  if (!project) throw new Error('补丁不存在。');
  finishPatch(next, project);
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
  return state.projects.filter((project: any) => !project.released || project.patch).sort((left: any, right: any) => (left.priority || 0) - (right.priority || 0));
}

// Also carries the 凝聚人心 boost, so every forecast and every day use the same project speed.
function priorityFactor(state: any, project: any) {
  const rank = projectOrder(state).findIndex((item: any) => item.id === project.id);
  const unity = boostFactor(state, project, 'unity');
  return (rank <= 0 ? 1 : Math.pow(0.85, rank)) * unity;
}

// Rare tags that lift everyone working on one dimension of the holder's project.
function rareBonus(state: any, project: any, dimension: string) {
  return state.staff.some((person: any) => person.tags.some((tag: any) => RARE_TAGS[tag.key]?.dimension === dimension) && belongsTo(state, project, person)) ? 8 : 0;
}

// A running patch: crew members fix its target defects first, then do its rework, then it ships.
function producePatch(state: any, project: any) {
  const patch = project.patch;
  const crew = state.staff.filter((person: any) => belongsTo(state, project, person));
  project.invested += sum(crew.map((person: any) => (person.wage + OFFICES[state.office].rent / Math.max(1, state.staff.length)) / 30));
  const factor = priorityFactor(state, project);
  for (const person of crew) {
    let amount = speedOf(state, person, 'repair') * factor * conditionFactor(person, project);
    if (amount <= 0) continue;
    const before = amount;
    amount = repair(state, project, amount, person, patch.targets);
    if (amount > 0 && patch.rework && patch.reworkDone < patch.reworkTotal) {
      const used = Math.min(amount, patch.reworkTotal - patch.reworkDone);
      const ability = WORKS.find(work => work.dimension === patch.rework).ability;
      rework(project, patch.rework, used, Math.min(100, able(person, ability) + rareBonus(state, project, patch.rework)));
      practice(person, ability, used);
      patch.reworkDone = round(patch.reworkDone + used);
      amount -= used;
    }
    project.contributions[person.id] = (project.contributions[person.id] || 0) + before - amount;
    person.work = round(person.work + before - amount);
  }
  if (patchProgress(project).done && crew.length) finishPatch(state, project);
}

function produceProject(state: any, project: any) {
  if (project.released) { if (project.patch) producePatch(state, project); return; }
  const crew = state.staff.filter((person: any) => belongsTo(state, project, person));
  const dailyCost = sum(crew.map((person: any) => (person.wage + OFFICES[state.office].rent / Math.max(1, state.staff.length)) / 30));
  project.invested += dailyCost;
  const factor = priorityFactor(state, project);
  const growth = boostFactor(state, project, 'coach');
  const defects = boostFactor(state, project, 'gate');
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
        const quality = Math.min(100, able(person, work.ability) + rareBonus(state, project, work.dimension));
        const remaining = workOf(project, work.dimension).total - workOf(project, work.dimension).done;
        const used = Math.min(amount, Math.max(0, remaining));
        if (remaining > 0) {
          recordWork(project, person, work.dimension, used, quality);
          if (work.dimension !== 'stability') addDefect(project, person, work.dimension, used * (100 - quality) / 100 * DEFECT_RATE * defects, state);
          practice(person, work.ability, used, growth);
        }
        const spare = amount - used;
        if (spare > 0) {
          if (project.defects.some((defect: any) => defect.found && !defect.fixed)) repair(state, project, spare, person);
          else { rework(project, work.dimension, spare, quality); practice(person, work.ability, spare, growth); }
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
// weaker hand still fixes it, just slower. No attempt is ever wasted. Returns the time left over.
function repair(state: any, project: any, amount: number, person: any, only?: string[]) {
  const known = project.defects.filter((defect: any) => defect.found && !defect.fixed && (!only || only.includes(defect.id)));
  if (!known.length) return amount;
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
  return Math.max(0, amount);
}

export function projectScore(project: any) {
  const metrics = projectMetrics(project);
  return round(clamp(metrics.overall - project.expectation, 0, 100));
}

export function promoteBuyers(cost: number) {
  return Math.round(PROMOTE_SCALE * Math.pow(Math.max(0, cost), 0.8));
}

export function promoteRange(state: any, project: any, cost: number) {
  if (!project) return null;
  const value = promoteBuyers(cost);
  return { low: Math.round(value * 0.88), high: Math.round(value * 1.12), cost };
}

// What one follower is worth at launch for this title, and how many followers its launch can absorb
// before the scale's market ceiling stops extra buyers. Uses the latest trial score when there is one.
export function followerValue(state: any, project: any) {
  const fit = project.test ? clamp(project.test.score / 100, 0.15, 0.95) : 0.5;
  const conversion = 0.2 + fit * 0.5;
  const price = TYPES[project.type].price * SCALES[project.scale].price * (project.parentId ? 0.35 : 1);
  const ceiling = MARKET_SIZE * SCALES[project.scale].reach * (project.parentId ? 0.4 : 1) * 0.6;
  const last = state.catalog.find((book: any) => !book.parentId && book.openingFollowers > 0);
  return {
    yuan: Math.round(price * conversion * 10000), tested: !!project.test, ceiling: Math.round(ceiling / conversion),
    last: last ? { name: last.name, yuan: Math.round(last.openingReceipt * 10000 / last.openingFollowers) } : null
  };
}

export function promote(state: any, projectId: string, cost: number) {
  const value = Number(cost);
  if (!PROMOTE_TIERS.includes(value)) throw new Error('推广档位无效。');
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && !item.released);
  if (!project) throw new Error('项目不存在。');
  if (project.progress < TRIAL * 100) throw new Error('体验版完成后才能推广。');
  if (project.promoted > 0) throw new Error('每部作品只能推广一次。');
  const range = promoteRange(next, project, value);
  spend(next, value, '推广预算');
  const buyers = Math.round((range.low + range.high) / 2 * (0.94 + random(next) * 0.12));
  project.followers += buyers;
  project.promoted = value;
  project.promoFollowers = buyers;
  project.invested = round(project.invested + value);
  studioLog(next, '推广结果', `《${project.name}》投放 ${value.toFixed(2)} 万，新增 ${buyers} 位关注者；关注不等于购买。`);
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
  creativity: ['这个 idea 真新鲜，一眼就能记住。', '玩法没见别人做过，越玩越有意思。', '脑洞大开，制作组是怎么想到的。', '终于有一款不一样的游戏了。', '设定很有个性，说不清在玩什么，但就是好玩。'],
  depth: ['系统有深度，一周了还在琢磨新套路。', '越挖越有东西，攻略写不完了。', '每局都有新的选择，耐玩。', '数值和机制很讲究，硬核玩家狂喜。', '以为通关了，结果才刚开始。'],
  fluidity: ['操作跟手，跑起来丝般顺滑。', '加载快不掉帧，玩着舒服。', '手感扎实，每一下都有反馈。', '老电脑也能流畅跑，良心优化。', '一上手就停不下来。'],
  picture: ['画面漂亮，截图直接当壁纸。', '美术风格太对味了。', '每一帧都像插画。', '场景细节多到看不过来。', '色彩很舒服，看着就开心。'],
  sound: ['原声带循环了一整天。', '音效细节满分。', '戴上耳机玩，沉浸感拉满。', 'BGM 一响就想哭。', '声音和画面配合得刚刚好。'],
  stability: ['这次游玩暂时没有遇到明显问题。', '目前玩着正常，再多观察一阵。', '通关全程没崩过，稳。', '完成度很高，看得出测试很用心。', '小团队能做这么稳不容易。']
};
const GENERIC_QUOTES: any = {
  good: ['意外之喜，已经安利给朋友了。', '通关了，后劲很大。', '这个价格很值。', '买了不亏，等续作。', '制作组很有诚意。', '周末一口气玩了十几个小时。', '比宣传的还好玩。', '这就是我想要的游戏。'],
  bad: ['遇到好几个 bug，先差评再观察。', '期望挺高，玩着一般。', '再等等优化吧。', '半成品就急着上架。', '玩了两小时就腻了。', '宣传和实际差太多。', '闪退了三次，存档还丢了。', '想法不错，可惜做得粗糙。']
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

// A released project keeps its catalogue entry live: a patch's fixes and rework move the review score
// and the daily sales the same way a fresh release would, but only by degrees.
function syncReleased(state: any, project: any) {
  const book = state.catalog.find((item: any) => item.id === project.id);
  if (!book) return;
  book.metrics = projectMetrics(project);
  book.invested = round(project.invested);
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

// ---- Media rating ----
// A fictional outlet rates the studio every quarter from its last three titles. The rating decides the
// company's tier, which can rise and fall: entering a tier asks more than keeping it, a fresh promotion
// is safe for one period, and a watch-list warning always comes before a demotion.
export const RATING_MEDIA = '《独立游戏观察》';
// The company's tier reads as a star rating, so it never gets confused with the city/national/global
// range of a chart, expo or award.
export const STAR_NAMES = ['一星', '二星', '三星'];
export const STAR_MARKS = ['★', '★★', '★★★'];
export const RATING_PERIOD = 90;
export const RATING_UP = [0, 46, 72];
export const RATING_KEEP = [0, 38, 63];
const RATING_WATCH = 4;
const RATING_WEIGHTS = [0.5, 0.3, 0.2];
// Attention a tier's coverage adds when a release date is announced and at launch.
export const MEDIA_BONUS = [0, 0.1, 0.2];
// A first-week rank is worth most on the highest chart the title reaches.
const RANK_TOP = [40, 70, 100];
const AWARD_POINTS = [3, 8, 15];

function rankPoints(ranks: any) {
  if (!Array.isArray(ranks)) return 0;
  return Math.max(0, ...ranks.map((rank: number, level: number) => RANK_TOP[level] * clamp(1.15 - 0.5 * Math.log10(Math.max(1, rank)), 0, 1)));
}

export function ratingOf(state: any) {
  const ranked = state.catalog.filter((book: any) => !book.parentId && book.firstRanks).slice(0, 3);
  const used = RATING_WEIGHTS.slice(0, ranked.length);
  const weightSum = sum(used) || 1;
  const books = ranked.map((book: any, index: number) => {
    const awards = state.awards.filter((award: any) => award.own && (award.book === book.id || award.winner === `《${book.name}》`));
    const rank = round(rankPoints(book.firstRanks));
    const award = Math.min(15, sum(awards.map((item: any) => AWARD_POINTS[item.tier ?? 1])));
    const score = round(rank * 0.55 + book.reviewScore * 0.45 + award);
    return { id: book.id, name: book.name, rank, review: round(book.reviewScore), award, score, weight: round(used[index] / weightSum) };
  });
  const latest = Math.max(-Infinity, ...state.catalog.filter((book: any) => !book.parentId).map((book: any) => book.released));
  const idle = Number.isFinite(latest) ? state.day - latest : 0;
  const decay = idle >= 720 ? (Math.floor((idle - 720) / RATING_PERIOD) + 1) * 4 : 0;
  const score = round(Math.max(0, sum(books.map((book: any) => book.score * book.weight)) - decay));
  const tier = state.focus || 0;
  const rating = state.rating || {};
  return {
    score, books, decay, tier, watch: !!rating.watch, published: rating.score ?? 0, history: rating.history || [],
    up: tier < 2 ? RATING_UP[tier + 1] : null, keep: tier > 0 ? RATING_KEEP[tier] : null,
    next: (Math.floor(state.day / RATING_PERIOD) + 1) * RATING_PERIOD, safe: tier > 0 && state.day - (rating.promotedAt || 0) < RATING_PERIOD
  };
}

function rateDay(state: any) {
  if (state.day % RATING_PERIOD !== 0 || !state.company) return;
  const view = ratingOf(state);
  const rating = state.rating;
  const before = state.focus || 0;
  const score = view.score;
  let tier = before;
  let note = '';
  const settled = tier > 0 && state.day - (rating.promotedAt || 0) > RATING_PERIOD;
  if (tier < 2 && score >= RATING_UP[tier + 1]) {
    tier += 1;
    rating.promotedAt = state.day;
    rating.watch = false;
    note = `升为${STAR_NAMES[tier]}工作室`;
  } else if (settled && score < RATING_KEEP[tier] && rating.watch) {
    tier -= 1;
    rating.watch = false;
    note = `降为${STAR_NAMES[tier]}工作室`;
  } else if (settled && score < RATING_KEEP[tier] + RATING_WATCH) {
    rating.watch = true;
    note = '列入观察名单';
  } else rating.watch = false;
  rating.score = score;
  rating.history = [...(rating.history || []), { day: state.day, score, tier }].slice(-12);
  state.focus = tier;
  const line = tier !== before ? note : note ? `${note}，下一期低于保级线 ${RATING_KEEP[tier]} 分将降级` : `维持${STAR_NAMES[tier]}工作室`;
  news(state, tier, true, `${RATING_MEDIA}季度评级：${state.company} ${score.toFixed(0)} 分`, line + '。', null, true);
  announce(state, { kind: tier > before ? 'record' : tier < before || note ? 'warning' : 'notice', title: `季度评级 ${score.toFixed(0)} 分`, text: `${RATING_MEDIA}：${line}`, amount: 0 });
  studioLog(state, '季度媒体评级', `${RATING_MEDIA}评分 ${score.toFixed(0)}，${line}。`);
}

export function companyArchive(state: any) {
  return {
    wins: state.awards.filter((award: any) => award.own).length,
    books: state.catalog.map((book: any) => {
      // Shares come from the recorded per-person contributions of the live project, falling back to
      // an even split for old saves whose team was stored without ids.
      const project = state.projects.find((item: any) => item.id === book.id);
      const shares: any = project ? project.contributions || {} : {};
      const total = sum(Object.values(shares));
      return {
        id: book.id, name: book.name,
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
  const exposure = MEDIA_BONUS[next.focus || 0];
  if (exposure) project.followers = Math.round(project.followers * (1 + exposure));
  const clash = clashOf(next, next.day, project.followers);
  const { units, price, receipt } = openingSales(project, trend.multiplier * clash.factor, score);
  // The campaign's share of the launch, counted in its share of the launch audience.
  const promo = project.promoted > 0 ? { cost: project.promoted, followers: project.promoFollowers || 0, receipt: round(receipt * clamp((project.promoFollowers || 0) / Math.max(1, project.followers), 0, 1)) } : null;
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
    sequel: project.sequel, parentId: project.parentId || null, expectation: project.expectation, firstWeek: units, firstRanks: null, totalRanks: null, updates: 0, breakout, promo, patches: [], flawless: metrics.defects === 0, clash: clash.works.length,
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
    // Growth already happened day by day through practice; the release just writes it down.
    const before = person.snap || {};
    const gains = ABILITY_KEYS.filter(key => person.abilities[key] - (before[key] ?? person.abilities[key]) >= 1)
      .map(key => `${ABILITIES.find(item => item.key === key)?.name} ${Math.round(before[key])}→${Math.round(person.abilities[key])}`);
    person.snap = { ...person.abilities };
    person.level = (person.level || 0) + 1;
    personNote(next, person, `参与《${project.name}》发售` + (gains.length ? `：${gains.join('、')}` : ''));
    if (gains.length) studioLog(next, `${person.name} 积累经验`, `参与《${project.name}》：${gains.join('、')}。工资在招聘时定下，不随成长上调。`);
  }
  if (next.goals.firstRelease === null) next.goals.firstRelease = next.day;
  announce(next, { kind: 'release', title: `《${book.name}》发售`, text: `首发售出 ${units} 份`, amount: receipt, book: book.id });
  if (book.record) announce(next, { kind: 'record', title: '新纪录', text: `首发到账超过此前最好成绩 ${best.toFixed(2)} 万`, amount: receipt });
  checkMarks(next, book);
  const clashText = clash.works.length ? `同周还有${clash.works.map((work: any) => `《${work.name}》`).join('、')}发售，首发被分流约 ${Math.round((1 - clash.factor) * 100)}%。` : '';
  const shortBoard = metrics.unfinished.length ? `仍有 ${metrics.unfinished.length} 个维度未完成，带着短板上市换回了款，之后可以继续更新。` : '';
  const lesson = book.tutorial ? '首作是练习，小亏也很正常；看看复盘，下一作照着改。' : '首发到账不等于最终利润，后续销量取决于玩家口碑。';
  const burst = breakout ? `《${book.name}》出圈了：创意打动了原本不关注这类游戏的人，首发关注翻了数倍。` : '';
  const media = exposure ? `${STAR_NAMES[next.focus]}工作室的媒体曝光带来约 ${Math.round(exposure * 100)}% 额外关注。` : '';
  const promoText = promo ? `推广 ${promo.cost} 万带来 ${promo.followers} 位关注，按本作转化约折合首发 ${promo.receipt.toFixed(2)} 万。` : '';
  next.event = { id: 'release', title: `《${book.name}》正式发售`, text: `首发售出 ${units} 份，到账 ${receipt.toFixed(2)} 万。发售时市场：${trend.label}，首发需求 ×${trend.multiplier.toFixed(2)}。${clashText}${media}${promoText}${shortBoard ? shortBoard + ' ' : ''}${lesson}${burst ? ' ' + burst : ''}`, choices: [{ id: 'continue', title: '收下成绩，继续经营', detail: book.tutorial ? '招聘网站已经开放，可以为下一作找更有经验的同事。' : '后续销量与评价继续变化，可以筹备下一款作品。' }] };
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
  if (next.office === 1 && (next.goals.topTen === null || next.goals.award === null)) throw new Error('进入全国首周榜前十并获得全国年度奖项后才能再次扩建。');
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
    { key: 'topTen', title: '进入全国首周榜前十', text: '作品发售第一周的销量，在近一年全国新作里排进前十。', reward: '获得 200 位粉丝，向扩建迈进一步', done: goals.topTen !== null },
    { key: 'award', title: '获得全国年度奖项', text: '每年年底评选全国年度作品、创意与表现奖（国际奖项也算）。', reward: '获奖增加粉丝，开放工作室扩建资格', done: goals.award !== null },
    { key: 'expanded', title: '再次扩建工作室', text: `完成前十与获奖目标后，花 ${OFFICES[2].cost} 万扩建。`, reward: `${OFFICES[2].seats} 个工位，可组建成熟团队`, done: goals.expanded !== null }
  );
  const current = steps.find(step => !step.done);
  const best = Math.max(0, ...state.catalog.map((book: any) => book.received));
  return { steps, current: current || { key: 'record', title: '打破纪录', text: `让一款作品的累计回款超过 ${best.toFixed(2)} 万。`, reward: '证明工作室越做越好', done: false } };
}

// ---- Achievements ----
// The six growth goals are milestones (they still unlock things); everything else is for show only.
const ownBooks = (state: any) => state.catalog;
const flag = (state: any, key: string) => !!(state.flags && state.flags[key]);
function cameBack(state: any) {
  const history = state.rating?.history || [];
  return history.some((entry: any, index: number) => index >= 2 && history[index - 1].tier < history[index - 2].tier && entry.tier >= history[index - 2].tier);
}
export const ACHIEVEMENT_GROUPS = [['milestone', '里程碑'], ['business', '经营'], ['works', '作品'], ['team', '团队'], ['industry', '行业'], ['hidden', '隐藏']];
export const ACHIEVEMENTS: any[] = [
  { key: 'firstRelease', group: 'milestone', title: '完成首作', text: '把第一款游戏做完并发售。', reward: '开放招聘网站与音频、测试岗位', check: (s: any) => s.goals.firstRelease !== null },
  { key: 'breakEven', group: 'milestone', title: '第一次回本', text: '让一款作品的回款超过投入。', reward: '可以搬进正式办公室', check: (s: any) => s.goals.breakEven !== null },
  { key: 'moved', group: 'milestone', title: '搬进正式办公室', text: `回本后在成就页搬家，一次性 ${OFFICES[1].cost} 万。`, reward: `${OFFICES[1].seats} 个工位，开放行业推荐与猎头`, check: (s: any) => s.goals.moved !== null },
  { key: 'topTen', group: 'milestone', title: '全国首周榜前十', text: '作品首周销量在近一年全国新作里排进前十。', reward: '获得 200 位粉丝', check: (s: any) => s.goals.topTen !== null },
  { key: 'award', group: 'milestone', title: '全国年度奖项', text: '获得全国或国际年度评选的任一奖项。', reward: '获奖增加粉丝，开放再次扩建', check: (s: any) => s.goals.award !== null },
  { key: 'expanded', group: 'milestone', title: '再次扩建', text: `完成前十与获奖后，花 ${OFFICES[2].cost} 万扩建。`, reward: `${OFFICES[2].seats} 个工位`, check: (s: any) => s.goals.expanded !== null },
  { key: 'cash100', group: 'business', title: '百万现金', text: '公司现金达到 100 万。', check: (s: any) => s.cash >= 100, progress: (s: any) => [s.cash, 100] },
  { key: 'cash1000', group: 'business', title: '千万现金', text: '公司现金达到 1000 万。', check: (s: any) => s.cash >= 1000, progress: (s: any) => [s.cash, 1000] },
  { key: 'team8', group: 'business', title: '八人小队', text: '同时有 8 名员工。', check: (s: any) => s.staff.length >= 8, progress: (s: any) => [s.staff.length, 8] },
  { key: 'team16', group: 'business', title: '座无虚席', text: '16 个工位全部坐满。', check: (s: any) => s.staff.length >= 16, progress: (s: any) => [s.staff.length, 16] },
  { key: 'year3', group: 'business', title: '三周年', text: '公司经营满三年。', check: (s: any) => s.day >= 1080, progress: (s: any) => [s.day, 1080] },
  { key: 'books10', group: 'works', title: '十部作品', text: '发售 10 部作品。', check: (s: any) => ownBooks(s).length >= 10, progress: (s: any) => [ownBooks(s).length, 10] },
  { key: 'units10k', group: 'works', title: '万份销量', text: '单部作品累计售出 1 万份。', check: (s: any) => ownBooks(s).some((book: any) => book.units >= 10000) },
  { key: 'units100k', group: 'works', title: '十万份销量', text: '单部作品累计售出 10 万份。', check: (s: any) => ownBooks(s).some((book: any) => book.units >= 100000) },
  { key: 'review85', group: 'works', title: '口碑之作', text: '一部作品的玩家口碑达到 85 分。', check: (s: any) => ownBooks(s).some((book: any) => book.reviewScore >= 85) },
  { key: 'sequel', group: 'works', title: '系列开端', text: '发售一部续作。', check: (s: any) => ownBooks(s).some((book: any) => book.sequel) },
  { key: 'dlc', group: 'works', title: '还有后续', text: '发售一部资料片。', check: (s: any) => ownBooks(s).some((book: any) => book.parentId) },
  { key: 'breakout', group: 'works', title: '出圈', text: '一部作品凭创意出圈。', check: (s: any) => ownBooks(s).some((book: any) => book.breakout) },
  { key: 'patched', group: 'works', title: '负责到底', text: '为已发售作品上线一个补丁。', check: (s: any) => flag(s, 'patched') },
  { key: 'mentored', group: 'team', title: '出师', text: '一次带教让徒弟追上师傅。', check: (s: any) => flag(s, 'mentored') },
  { key: 'boost', group: 'team', title: '主心骨', text: '有员工获得团队增益标签。', check: (s: any) => s.staff.some((person: any) => person.boost) },
  { key: 'star', group: 'team', title: '名人加盟', text: '录用一位行业名人。', check: (s: any) => s.staff.some((person: any) => person.fame) },
  { key: 'poached', group: 'team', title: '挖角成功', text: '从对手那里挖来一位名人。', check: (s: any) => flag(s, 'poached') },
  { key: 'rare', group: 'team', title: '可遇不可求', text: '招到带稀有标签的员工。', check: (s: any) => s.staff.some((person: any) => person.tags.some((tag: any) => tag.kind === 'rare')) },
  { key: 'grown90', group: 'team', title: '自己培养的高手', text: '一位非名人员工的某项能力达到 90。', check: (s: any) => s.staff.some((person: any) => !person.fame && ABILITY_KEYS.some(key => person.abilities[key] >= 90)) },
  { key: 'star2', group: 'industry', title: '二星工作室', text: `${RATING_MEDIA}评为二星。`, check: (s: any) => (s.focus || 0) >= 1 },
  { key: 'star3', group: 'industry', title: '三星工作室', text: `${RATING_MEDIA}评为三星。`, check: (s: any) => (s.focus || 0) >= 2 },
  { key: 'globalTop10', group: 'industry', title: '走向世界', text: '一部作品进入国际首周榜前十。', check: (s: any) => ownBooks(s).some((book: any) => book.firstRanks && book.firstRanks[2] <= 10) },
  { key: 'expoWin', group: 'industry', title: '展会第一', text: '在任一展会拿到第一名。', check: (s: any) => s.exhibitions.some((entry: any) => entry.result?.rank === 1) },
  { key: 'awardGlobal', group: 'industry', title: '国际年度作品', text: '获得国际年度作品。', check: (s: any) => s.awards.some((award: any) => award.own && award.tier === 2) },
  { key: 'dream', group: 'hidden', title: '屏幕外的人', text: '创始人过劳后被托梦救回。', check: (s: any) => flag(s, 'dream') },
  { key: 'flawless', group: 'hidden', title: '零缺陷', text: '一部作品发售时没有任何未修缺陷。', check: (s: any) => ownBooks(s).some((book: any) => book.flawless) },
  { key: 'clashWin', group: 'hidden', title: '硬碰硬', text: '和两部以上对手作品同周发售，仍拿到全国首周第一。', check: (s: any) => ownBooks(s).some((book: any) => (book.clash || 0) >= 2 && book.firstRanks && book.firstRanks[1] === 1) },
  { key: 'comeback', group: 'hidden', title: '卷土重来', text: '降级后的下一期评级立刻回到原来的星级。', check: (s: any) => cameBack(s) },
  { key: 'smallPromo', group: 'hidden', title: '小钱办大事', text: '只投最小一档推广的作品进入全国首周榜前十。', check: (s: any) => ownBooks(s).some((book: any) => book.promo && book.promo.cost === PROMOTE_TIERS[0] && book.firstRanks && book.firstRanks[1] <= 10) },
  { key: 'familiar', group: 'hidden', title: '新闻里的那个人', text: '录用一位曾在新闻里出现过的名人。', check: (s: any) => s.staff.some((person: any) => person.story) }
];

function checkAchievements(state: any, quiet = false) {
  state.achievements = state.achievements || {};
  for (const item of ACHIEVEMENTS) {
    if (state.achievements[item.key] !== undefined || !item.check(state)) continue;
    state.achievements[item.key] = state.day;
    if (!quiet) announce(state, { kind: 'record', title: (item.group === 'hidden' ? '隐藏成就：' : '成就：') + item.title, text: item.text, amount: 0 });
  }
}

export function achievementsOf(state: any) {
  const unlocked = state.achievements || {};
  return {
    count: Object.keys(unlocked).length, total: ACHIEVEMENTS.length,
    fresh: Math.max(0, Object.keys(unlocked).length - (state.notices?.achSeen || 0)),
    items: ACHIEVEMENTS.map(item => ({ ...item, day: unlocked[item.key] ?? null, progress: item.progress ? item.progress(state) : null }))
  };
}

export function markAchievementsSeen(state: any) {
  return { ...state, notices: { ...state.notices, achSeen: Object.keys(state.achievements || {}).length } };
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
    next.flags = { ...(next.flags || {}), bridge: next.day };
    next.cash = round(next.cash + BRIDGE);
    next.ledger.income = round(next.ledger.income + BRIDGE);
    return next;
  }
  if (choice === 'move') return moveOffice(next);
  if (event.id === 'random') return resolveRandomEvent(next, event, choice);
  if (event.id === 'dream') {
    const founder = next.staff.find((item: any) => item.id === event.person);
    if (founder) {
      founder.noOvertime = true;
      founder.stressTags = [];
      founder.stressChance = 0;
      founder.overtimeDays = 0;
      delete next.overtime[founder.id];
      personNote(next, founder, '托梦之后，答应了屏幕外的人：再也不加班');
    }
    next.flags = { ...(next.flags || {}), dream: next.day };
    studioLog(next, '一场梦', '创始人撕掉了解散公告。从今天起，他再也不加班。');
    return next;
  }
  if (event.id === 'resign') {
    if (choice.startsWith('outing-')) return teamOuting(next, Number(choice.slice(7)));
    if (choice === 'keep') return keepPerson(next, event.person);
    return dismiss(next, event.person);
  }
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

// A daily roll once someone wants to leave; still on overtime doubles it, so easing off is a visible choice.
export const RESIGN_CHANCE = 0.02;
export function resignChance(state: any, person: any) {
  if (!person.stressTags.includes('leaving')) return 0;
  return state.overtime[person.id] ? RESIGN_CHANCE * 2 : RESIGN_CHANCE;
}

function resignOrContinue(state: any) {
  for (const person of state.staff) {
    if (state.event) return;
    const chance = resignChance(state, person);
    if (!chance || (person.leaveUntil || 0) > state.day) continue;
    // The founder cannot resign from their own studio — he writes a farewell and dreams instead (once).
    if (person.founder) {
      if (!state.flags?.dream && random(state) < chance) {
        state.event = { id: 'dream', person: person.id, title: '解散公告', text: '', choices: [{ id: 'promise', title: '答应他：不再让他加班' }] };
        return;
      }
      continue;
    }
    if (random(state) < chance) {
      const years = Math.max(0, Math.floor((state.day - person.joined) / 360));
      const compensation = round(person.wage * (years + 1));
      const outings = OUTING_DAYS.map(days => {
        const offer = outingOffer(state, days);
        return { id: 'outing-' + days, title: `现在团建 ${days} 天 · ${offer.cost.toFixed(2)} 万`, detail: offer.available ? `全队停工 ${days} 天；每个负面标签约 ${Math.round(outingChances(person, days).clear * 100)}% 被清掉，不保证。` : offer.reason, disabled: !offer.available };
      });
      state.event = { id: 'resign', person: person.id, title: `${person.name} 提出离职`, text: '长期压力已让他想走。团建是唯一能清掉「想走」的办法，但要全队停工；只劝留的话，标签还在。接受离职按 N+1 补偿，并保留裁员记录与同事影响。已完成成果保留。', choices: [...outings, { id: 'keep', title: '劝留：停掉他的加班', detail: `「想走」还在，每天仍有 ${Math.round(RESIGN_CHANCE * 100)}% 的概率再提离职。` }, { id: 'dismiss', title: `接受离职 · 补偿 ${compensation.toFixed(2)} 万`, detail: '按 N+1 结算，保留应付工资、裁员记录与同事影响。' + (state.cash < compensation ? '当前资金不足支付补偿。' : ''), disabled: state.cash < compensation }] };
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
      const project = projectOf(state, person);
      const anchor = project ? boostFactor(state, project, 'anchor') : 1;
      person.stressChance = clamp(person.overtimeDays / 40 * resist * anchor, 0, 0.6);
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
  outingDay(next);
  // Released projects keep taking people: that is the patch/update loop, and its results show up in the
  // live sales figures through syncReleased.
  for (const project of next.projects) {
    produceProject(next, project);
    if (project.released) syncReleased(next, project);
  }
  salesDay(next);
  playerReports(next);
  stressDay(next);
  staffDay(next);
  resignOrContinue(next);
  calendarDay(next);
  industryDay(next);
  scheduledCash(next);
  if (!next.event) rollRandomEvent(next);
  checkAchievements(next);
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
    if (age <= 6) book.firstWeek = (book.firstWeek || 0) + units;
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
  const exposure = Math.round(project.followers * MEDIA_BONUS[next.focus || 0]);
  project.followers += 150 + exposure;
  const extra = exposure ? `（含${STAR_NAMES[next.focus]}工作室的媒体曝光 ${exposure} 人）` : '';
  studioLog(next, '公布发售日', `计划第 ${project.deadline} 天发售《${project.name}》，新增 ${150 + exposure} 人关注${extra}；延期会损失关注。`);
  const near = scheduleOf(next).filter((item: any) => !item.own && Math.abs(item.day - project.deadline) <= 3);
  if (near.length) announce(next, { kind: 'notice', title: '档期提醒', text: `同周已有${near.map((item: any) => item.name).join('、')}定档，首发可能被分流。`, amount: 0 });
  return next;
}

// ---- Industry: one market, three levels ----
// Local studios are the founder's neighbours, national ones the big domestic names, global ones the
// giants. Every title sells into the same market; the level only says which chart, expo and award a
// title belongs to, and how much of it the player is shown.
export const TIERS = [
  { key: 'local', name: '城市', expo: '城市独立游戏展', expoDays: [90, 270], fee: 1, entrants: 6, sales: 320, score: 50, media: '《城市游戏圈》', awards: ['年度作品'], fans: [150], weight: 3 },
  { key: 'national', name: '全国', expo: '全国游戏展', expoDays: [150], fee: 4, entrants: 10, sales: 1000, score: 62, media: '《独立游戏观察》', awards: ['年度作品', '创意奖', '表现奖'], fans: [800, 400, 400], weight: 10 },
  { key: 'global', name: '国际', expo: '国际游戏展', expoDays: [300], fee: 12, entrants: 12, sales: 6000, score: 74, media: '《Global Game Weekly》', awards: ['年度作品'], fans: [3000], weight: 30 }
];
// Followers an expo brings by rank: 1st, 2nd, 3rd, top ten, the rest. A small game at a big show drowns.
const EXPO_REWARD = [[600, 450, 350, 80, 80], [3000, 2200, 1600, 300, 30], [9000, 6500, 4500, 900, 20]];
// Titles per year from studios without a profile, so every chart has a field.
const FILLER_PER_YEAR = [8, 22, 14];
const STUDIO_CADENCE = [200, 150, 240];
const STUDIO_POOL = [
  ['学长的像素小屋', '阿杰游戏工房', '巷口独立组', '夜猫子工作室', '三人行游戏', '老城区像素社', '纸鹤工坊', '风铃社', '楼顶工作室', '咖啡馆开发组', '周末游戏实验室', '同桌的游戏'],
  ['雨燕游戏', '星屿制作', '月台互动', '白桦工作室', '远帆游戏', '像素溪流', '青石网络', '赤焰互娱', '云帆科技', '长河游戏', '北极星互动', '千帆数码'],
  ['Northlight Studios', 'Crimson Arc', 'Bluepeak Games', 'Ironvale Entertainment', 'Silverline Interactive', 'Mirai Works', 'Stellar Forge', 'Oakwood Games']
];
const FILLER_HEAD = ['光年', '青柠', '木马', '橘子', '岛屿', '方块', '猫爪', '银杏', '向日葵', '蓝鲸', '纸船', '松果', '月光', '小熊', '石榴', '海盐'];
const FILLER_TAIL = ['游戏', '工作室', '互动', '游戏社', '数字', '娱乐'];
const TITLE_HEAD = ['星海', '雾港', '回声', '余烬', '白夜', '潮汐', '灯塔', '赤月', '迷城', '风语', '深空', '纸飞机', '旧日', '霜华', '远航', '碎光', '浮岛', '无名', '琥珀', '钟楼', '萤火', '黑潮', '机械', '梦境', '沙海', '雪原', '铁轨', '花园'];
const TITLE_TAIL = ['物语', '远征', '之城', '计划', '纪元', '回廊', '猎人', '旅人', '编年史', '守望', '协奏曲', '之心', '迷宫', '序章', '战线', '日记', '小镇', '彼岸', '方舟', '秘境', '归途', '传说'];

const gauss = (state: any) => (random(state) + random(state) + random(state) - 1.5) * 1.15;
const pick = (state: any, list: any[]) => list[Math.floor(random(state) * list.length)];
const scaleSales = [0.6, 1, 1.8];

function newStudio(state: any, tier: number, day: number) {
  const used = new Set(state.rivals.map((studio: any) => studio.name));
  const free = STUDIO_POOL[tier].filter(name => !used.has(name));
  const name = free.length ? pick(state, free) : pick(state, FILLER_HEAD) + pick(state, FILLER_TAIL);
  const studio = { id: `studio-${state.rivals.length}-${day}`, name, tier, power: round(0.8 + random(state) * 0.4), type: pick(state, Object.keys(TYPES)), founded: day, closed: null, next: day + Math.round(STUDIO_CADENCE[tier] * random(state)), pending: null };
  state.rivals.push(studio);
  return studio;
}

function rivalWork(state: any, tier: number, studio: any, released: number) {
  const roll = random(state);
  const scale = tier === 2 ? (roll < 0.6 ? 2 : 1) : tier === 1 ? (roll < 0.3 ? 2 : roll < 0.65 ? 1 : 0) : (roll < 0.2 ? 1 : 0);
  const power = studio ? studio.power : 0.7 + random(state) * 0.6;
  const quality = clamp(TIERS[tier].score + gauss(state) * 10 + (power - 1) * 20, 25, 97);
  const growth = 1 + Math.floor(released / 360) * 0.04;
  const firstWeek = Math.max(20, Math.round(TIERS[tier].sales * scaleSales[scale] * power * growth * Math.exp(gauss(state) * 0.5) * (0.6 + quality / 125)));
  state.workSeq = (state.workSeq || 0) + 1;
  return {
    id: `work-${state.workSeq}`, studio: studio ? studio.id : null, studioName: studio ? studio.name : pick(state, FILLER_HEAD) + pick(state, FILLER_TAIL),
    name: pick(state, TITLE_HEAD) + pick(state, TITLE_TAIL), tier, type: studio ? studio.type : pick(state, Object.keys(TYPES)), scale, released, announced: null,
    score: round(quality), creativity: round(clamp(quality + gauss(state) * 8, 20, 99)), presentation: round(clamp(quality + gauss(state) * 8, 20, 99)),
    firstWeek, life: round(0.8 + quality / 35)
  };
}

// A rival title sells its first week, then a tail that a better title keeps longer.
export function workUnits(work: any, day: number) {
  const age = day - work.released;
  if (age < 0) return 0;
  return Math.round(work.firstWeek * (Math.min(1, (age + 1) / 7) + work.life * (1 - Math.pow(0.88, Math.max(0, age - 6) / 30))));
}

function news(state: any, tier: number, headline: boolean, title: string, text: string, studio: string | null = null, own = false) {
  state.news = [{ day: state.day, tier, headline, title, text, studio, own }, ...(state.news || [])].slice(0, 80);
}

// The player's view of the news: their own level in full, anything above only when it is a headline.
export function newsFor(state: any) {
  return (state.news || []).filter((item: any) => item.own || item.tier === state.focus || item.headline);
}

// Announced rival releases and the player's own promised dates, soonest first.
export function scheduleOf(state: any) {
  const rivals = (state.works || []).filter((work: any) => work.announced !== null && work.released > state.day).map((work: any) => ({ day: work.released, name: `《${work.name}》`, studio: work.studioName, studioId: work.studio, tier: work.tier, own: false }));
  const own = state.projects.filter((project: any) => !project.released && project.deadline).map((project: any) => ({ day: project.deadline, name: `《${project.name}》`, studio: state.company, studioId: null, projectId: project.id, tier: null, own: true }));
  return [...rivals, ...own].sort((left, right) => left.day - right.day);
}

// Titles out the same week split the launch audience in proportion to their pull.
export function clashOf(state: any, day: number, followers: number) {
  const works = (state.works || []).filter((work: any) => Math.abs(work.released - day) <= 3);
  if (!works.length) return { factor: 1, works: [] };
  const pressure = sum(works.map((work: any) => work.firstWeek));
  const mine = Math.max(100, followers) * 0.6;
  return { factor: round(clamp(1 - 0.4 * pressure / (pressure + mine * 3), 0.55, 1)), works };
}

function remindClash(state: any, work: any) {
  if (work.tier !== state.focus && work.tier !== 2) return;
  for (const project of state.projects) {
    if (project.released || !project.deadline || Math.abs(project.deadline - work.released) > 3) continue;
    announce(state, { kind: 'notice', title: '档期提醒', text: `${work.studioName}的《${work.name}》定档第 ${work.released} 天，和《${project.name}》同周。`, amount: 0 });
  }
}

function firstWeekRanks(state: any, value: number, released: number, selfId: string) {
  return TIERS.map((_, level) => {
    const rivals = state.works.filter((work: any) => work.tier <= level && work.released > released - 360 && work.released <= released + 6).map((work: any) => work.firstWeek);
    const own = state.catalog.filter((book: any) => book.id !== selfId && book.released > released - 360 && book.released <= released + 6 && book.firstRanks).map((book: any) => book.firstWeek);
    return 1 + [...rivals, ...own].filter((other: number) => other > value).length;
  });
}

function totalRanks(state: any, book: any) {
  return TIERS.map((_, level) => {
    const rivals = state.works.filter((work: any) => work.tier <= level && work.released <= state.day).map((work: any) => workUnits(work, state.day));
    const own = state.catalog.filter((other: any) => other.id !== book.id).map((other: any) => other.units);
    return 1 + [...rivals, ...own].filter((other: number) => other > book.units).length;
  });
}

// One chart for the industry menu: first-week sales over the last year, or lifetime sales.
export function chartOf(state: any, kind: string, level: number) {
  const day = state.day;
  const rivals = state.works.filter((work: any) => work.tier <= level && work.released <= day && (kind === 'total' || work.released <= day - 7 && work.released > day - 367))
    .map((work: any) => ({ name: `《${work.name}》`, studio: work.studioName, studioId: work.studio, units: kind === 'total' ? workUnits(work, day) : work.firstWeek, own: false }));
  const own = state.catalog.filter((book: any) => kind === 'total' || book.firstRanks && book.released > day - 367)
    .map((book: any) => ({ name: `《${book.name}》`, studio: state.company, studioId: null, units: kind === 'total' ? book.units : book.firstWeek, own: true, book: book.id }));
  const ranked = [...rivals, ...own].sort((left, right) => right.units - left.units).map((entry, index) => ({ ...entry, rank: index + 1 }));
  return [...ranked.slice(0, 20), ...ranked.slice(20).filter(entry => entry.own)];
}

export function rivalProfile(state: any, id: string) {
  const studio = state.rivals.find((item: any) => item.id === id);
  if (!studio) return null;
  const works = state.works.filter((work: any) => work.studio === id && (work.released <= state.day || work.announced !== null)).sort((left: any, right: any) => right.released - left.released);
  const ranks = works.filter((work: any) => work.released <= state.day - 7).map((work: any) => ({ work, rank: firstWeekRanks(state, work.firstWeek, work.released, '')[work.tier] }));
  const clashes = works.flatMap((work: any) => state.catalog.filter((book: any) => Math.abs(book.released - work.released) <= 7).map((book: any) => ({ work, book })));
  const recent = ranks.slice(0, 3).map((item: any) => item.work.firstWeek / (TIERS[item.work.tier].sales * scaleSales[item.work.scale]));
  const trend = recent.length < 2 ? '平稳' : recent[0] > recent[recent.length - 1] * 1.15 ? '上升' : recent[0] < recent[recent.length - 1] * 0.85 ? '下滑' : '平稳';
  return { studio, works, ranks, clashes, trend };
}

function finishRivalWork(state: any, work: any, quiet: boolean) {
  const studio = state.rivals.find((item: any) => item.id === work.studio);
  if (!quiet && (studio || work.tier >= state.focus)) news(state, work.tier, work.tier === 2 && work.scale === 2, `《${work.name}》首周售出 ${work.firstWeek.toLocaleString('zh-CN')} 份`, `${work.studioName}出品，${TYPES[work.type].name}·${SCALES[work.scale].name}。`, work.studio);
  if (!studio) return;
  studio.pending = null;
  studio.next = work.released + Math.round(STUDIO_CADENCE[studio.tier] * (0.7 + random(state) * 0.6));
  const expected = TIERS[studio.tier].sales * scaleSales[work.scale] * (1 + Math.floor(work.released / 360) * 0.04);
  studio.power = round(clamp(studio.power * (0.85 + 0.15 * work.firstWeek / expected), 0.3, 2.5));
  if (studio.tier < 2 && studio.power >= 1.6) {
    studio.tier += 1;
    studio.power = 1;
    if (!(state.talents || []).some((talent: any) => talent.studio === studio.id && talent.status === 'employed')) newTalent(state, studio);
    if (!quiet) news(state, studio.tier, true, `${studio.name}跻身${TIERS[studio.tier].name}一线`, `连续的好成绩让这家工作室进入${TIERS[studio.tier].name}层的竞争。`, studio.id);
  } else if (studio.tier < 2 && studio.power <= 0.5) {
    studio.closed = state.day;
    for (const talent of state.talents || []) {
      if (talent.studio !== studio.id || talent.status !== 'employed') continue;
      talent.work = talentWork(state, talent);
      talent.status = 'free';
      talent.since = state.day;
      talent.title = `${studio.name}解散，${talent.name}寻找新去处`;
    }
    if (!quiet) news(state, studio.tier, true, `${studio.name}宣布解散`, '几部作品成绩不佳，团队各奔东西。', studio.id);
    newStudio(state, 0, state.day);
  }
}

function industryTick(state: any, quiet: boolean) {
  const day = state.day;
  for (const studio of state.rivals) {
    if (studio.closed !== null || studio.pending || day < studio.next - 45) continue;
    const work = rivalWork(state, studio.tier, studio, Math.max(day + 1, studio.next));
    const big = studio.tier >= 1 || work.scale >= 1;
    if (big) work.announced = day;
    state.works.push(work);
    studio.pending = work.id;
    if (big && !quiet) {
      news(state, studio.tier, studio.tier === 2, `${studio.name}公布新作《${work.name}》`, `定档第 ${work.released} 天，${TYPES[work.type].name}·${SCALES[work.scale].name}。`, studio.id);
      remindClash(state, work);
    }
  }
  TIERS.forEach((_, tier) => { if (random(state) < FILLER_PER_YEAR[tier] / 360) state.works.push(rivalWork(state, tier, null, day)); });
  if (!quiet && day % 30 === 15) talentMonth(state);
  for (const work of state.works) if (work.released === day - 7) finishRivalWork(state, work, quiet);
}

// ---- Industry people ----
// National and global studios each have a named lead. They change jobs in the news: a free agent can
// turn up as a star candidate, signs with a rival if nobody hires them within two months, and a lead
// still at a rival can be poached at a price.
const TALENT_ROLES = ['code', 'design', 'art', 'audio'];
export const TALENT_FREE_DAYS = 60;
export const POACH_BIDS = [1.3, 1.6, 2];
export const POACH_FEE = 3;

function newTalent(state: any, studio: any) {
  const role = pick(state, TALENT_ROLES);
  const prior = ROLES[role].prior;
  const primary = [...ABILITY_KEYS].sort((left, right) => prior[right][1] - prior[left][1])[0];
  const abilities: any = {};
  for (const key of ABILITY_KEYS) abilities[key] = Math.round(clamp(prior[key][0] * 0.6 + random(state) * 16, 5, 55));
  abilities[primary] = Math.round(clamp(87 + random(state) * 8 + studio.tier * 2, 85, 99));
  state.talentSeq = (state.talentSeq || 0) + 1;
  const talent = { id: `talent-${state.talentSeq}`, name: pick(state, FAMILY_NAMES) + pick(state, GIVEN_NAMES), role, primary, abilities, speed: Math.round(100 + random(state) * 15), studio: studio.id, studioName: studio.name, status: 'employed', since: state.day, title: '', work: '', cooldown: 0 };
  state.talents = [...(state.talents || []), talent];
  return talent;
}

export function talentWork(state: any, talent: any) {
  const work = state.works.filter((item: any) => item.studio === talent.studio && item.released <= state.day).sort((left: any, right: any) => right.released - left.released)[0];
  return work ? work.name : talent.work;
}

function talentMonth(state: any) {
  const employed = (state.talents || []).filter((talent: any) => talent.status === 'employed');
  if (employed.length && random(state) < 0.4) {
    const talent = pick(state, employed);
    const studio = state.rivals.find((item: any) => item.id === talent.studio);
    talent.work = talentWork(state, talent);
    talent.status = 'free';
    talent.since = state.day;
    talent.title = `${talent.studioName}${ROLES[talent.role].name}${talent.name}离职`;
    news(state, studio ? studio.tier : 1, true, talent.title, talent.work ? `代表作《${talent.work}》，据说在考虑新的去处。` : '据说在考虑新的去处。', talent.studio);
    if (studio && studio.closed === null) { studio.power = round(Math.max(0.3, studio.power - 0.05)); newTalent(state, studio); }
  }
  for (const talent of state.talents || []) {
    if (talent.status !== 'free' || state.day - talent.since < TALENT_FREE_DAYS) continue;
    const homes = state.rivals.filter((studio: any) => studio.closed === null && studio.tier >= 1 && studio.id !== talent.studio);
    if (!homes.length) continue;
    const studio = pick(state, homes);
    talent.status = 'employed';
    talent.studio = studio.id;
    talent.studioName = studio.name;
    talent.since = state.day;
    studio.power = round(Math.min(2.5, studio.power + 0.1));
    news(state, studio.tier, true, `${talent.name}加入${studio.name}`, `${ROLES[talent.role].name}名人${talent.work ? `（代表作《${talent.work}》）` : ''}有了新东家。`, studio.id);
  }
  state.talents = (state.talents || []).filter((talent: any) => talent.status !== 'hired' || state.day - talent.since < 720).slice(-40);
}

export function poachOffer(state: any, talentId: string, bid: number) {
  const talent = (state.talents || []).find((item: any) => item.id === talentId);
  if (!talent) return null;
  const studio = state.rivals.find((item: any) => item.id === talent.studio);
  const base = marketWage({ abilities: talent.abilities, speed: talent.speed });
  const wage = round(base * POACH_BIDS[bid]);
  const trend = studio ? rivalProfile(state, studio.id)?.trend : '平稳';
  const chance = round(clamp(0.2 + [0, 0.15, 0.3][bid] + ((state.focus || 0) - (studio?.tier ?? 1)) * 0.15 + (trend === '下滑' ? 0.1 : trend === '上升' ? -0.1 : 0), 0.05, 0.85));
  const reason = talent.status !== 'employed' ? '此人现在不在对手那里' : state.office < 1 ? '搬进正式办公室后才能找猎头' : (talent.cooldown || 0) > state.day ? `被拒后要到第 ${talent.cooldown} 天才肯再谈` : state.staff.length >= seats(state) ? '工位已满' : state.cash < POACH_FEE ? `猎头费需要 ${POACH_FEE} 万` : '';
  return { talent, studio, wage, chance, fee: POACH_FEE, reason, available: !reason };
}

export function poach(state: any, talentId: string, bid: number) {
  if (![0, 1, 2].includes(bid)) throw new Error('出价无效。');
  const offer = poachOffer(state, talentId, bid);
  if (!offer) throw new Error('这个人不存在。');
  if (!offer.available) throw new Error(offer.reason);
  const next = studioAction(state);
  const talent = next.talents.find((item: any) => item.id === talentId);
  const studio = next.rivals.find((item: any) => item.id === talent.studio);
  spend(next, POACH_FEE, `猎头接触${talent.name}`);
  if (random(next) >= offer.chance) {
    talent.cooldown = next.day + 180;
    studioLog(next, `${talent.name} 拒绝了邀请`, `${talent.studioName}留住了人，180 天内不会再谈。`);
    announce(next, { kind: 'notice', title: `${talent.name} 拒绝了邀请`, text: '猎头费不退，半年内不会再谈', amount: 0 });
    return next;
  }
  const person = freshPerson(next, {
    id: `star-${talent.id}`, name: talent.name, role: talent.role, abilities: { ...talent.abilities }, speed: talent.speed, wage: offer.wage,
    hired: true, fame: true, rampup: 30, joined: next.day, home: homeWork({ role: talent.role, home: '' }), snap: { ...talent.abilities },
    potential: Math.min(100, talent.abilities[talent.primary] + 2), tags: [{ kind: 'personality', key: 'eager' }], story: `从${talent.studioName}挖来`
  });
  next.staff.push(person);
  personNote(next, person, `从${talent.studioName}挖来，月薪 ${offer.wage.toFixed(2)} 万`);
  talent.status = 'hired';
  talent.since = next.day;
  if (studio) studio.power = round(Math.max(0.3, studio.power - 0.15));
  next.flags = { ...(next.flags || {}), poached: next.day };
  news(next, studio ? studio.tier : 1, true, `${talent.name}离开${talent.studioName}，加盟${next.company}`, `月薪 ${offer.wage.toFixed(2)} 万。`, talent.studio, true);
  announce(next, { kind: 'record', title: `挖来了${talent.name}`, text: `${ROLES[talent.role].name}名人，月薪 ${offer.wage.toFixed(2)} 万`, amount: 0 });
  return next;
}

// What the home-screen bulletin plays: the company's own news first, then the current tier, then the
// headlines above it. Reading it is optional; important moments still get a banner.
export function bulletinOf(state: any) {
  const list = newsFor(state).filter((item: any) => state.day - item.day <= 60);
  const own = list.filter((item: any) => item.own);
  const rest = list.filter((item: any) => !item.own);
  return [...own.slice(0, 3), ...rest].slice(0, 6);
}

// Everything dated in the next half year: expos, the awards, the media rating, announced releases.
export function calendarOf(state: any, span = 180) {
  const end = state.day + span;
  const year = Math.floor((state.day - 1) / 360);
  const items: any[] = [];
  TIERS.forEach((tier, level) => [year, year + 1].forEach(index => tier.expoDays.forEach(at => {
    const day = index * 360 + at;
    if (day < state.day || day > end) return;
    const entry = state.exhibitions.find((item: any) => item.day === day && (item.tier ?? 0) === level);
    items.push({ day, kind: 'expo', title: tier.expo, detail: entry ? `已报名《${entry.name}》` : `报名截止第 ${day - 7} 天 · 报名费 ${tier.fee} 万`, tier: level, own: !!entry, route: { menu: 'market' } });
  })));
  for (let day = (year + 1) * 360; day <= end; day += 360) items.push({ day, kind: 'awards', title: '年度评选', detail: '城市、全国、国际三级', own: false, route: { menu: 'industry', id: 'awards:first:' + (state.focus || 0) } });
  for (let day = (Math.floor(state.day / RATING_PERIOD) + 1) * RATING_PERIOD; day <= end; day += RATING_PERIOD) items.push({ day, kind: 'rating', title: `${RATING_MEDIA}季度评级`, detail: '决定公司星级', own: true, route: { menu: 'rating' } });
  for (const item of scheduleOf(state)) {
    if (item.day > end) continue;
    items.push({ day: item.day, kind: 'release', title: item.name + ' 发售', detail: item.own ? '本社承诺的发售日' : item.studio + ' · ' + TIERS[item.tier].name, own: item.own, route: item.own ? { menu: 'project', id: item.projectId } : item.studioId ? { menu: 'rival', id: item.studioId } : null });
  }
  return items.sort((left, right) => left.day - right.day);
}

function seedIndustry(state: any) {
  state.rivals = [];
  state.works = [];
  state.news = [];
  state.focus = 0;
  const today = state.day;
  // Old saves need rival history as far back as their first release, or its chart would be empty.
  const start = Math.min(today, ...state.catalog.map((book: any) => book.released)) - 360;
  [3, 3, 2].forEach((count, tier) => { for (let index = 0; index < count; index += 1) newStudio(state, tier, start); });
  state.talents = [];
  for (const studio of state.rivals) if (studio.tier >= 1) newTalent(state, studio);
  for (let day = start; day < today; day += 1) {
    state.day = day;
    industryTick(state, true);
  }
  state.day = today;
}

function industryDay(state: any) {
  industryTick(state, false);
  for (const book of state.catalog) {
    if (book.firstRanks || state.day - book.released < 7) continue;
    book.firstRanks = firstWeekRanks(state, book.firstWeek || 0, book.released, book.id);
    const [local, national, global] = book.firstRanks;
    news(state, state.focus, false, `《${book.name}》首周售出 ${Math.round(book.firstWeek || 0).toLocaleString('zh-CN')} 份`, `城市第 ${local} 名 · 全国第 ${national} 名 · 国际第 ${global} 名。`, null, true);
    announce(state, { kind: 'record', title: `《${book.name}》首周成绩`, text: `全国首周榜第 ${national} 名`, amount: 0 });
    if (national <= 10 && state.goals.topTen === null) {
      state.goals.topTen = state.day;
      state.fans += 200;
      announce(state, { kind: 'record', title: `《${book.name}》进入全国前十`, text: `全国首周榜第 ${national} 名`, amount: 0 });
    }
  }
  if (state.day % 30 === 0) for (const book of state.catalog) book.totalRanks = totalRanks(state, book);
  rateDay(state);
  if (state.day % 360 === 0) {
    // Keep two years of titles plus the best-selling older ones, so lifetime charts stay meaningful.
    const recent = state.works.filter((work: any) => work.released > state.day - 720);
    const older = state.works.filter((work: any) => work.released <= state.day - 720).sort((left: any, right: any) => workUnits(right, state.day) - workUnits(left, state.day)).slice(0, 40);
    state.works = [...older, ...recent];
  }
}

export function exhibitionOffers(state: any) {
  const ready = state.projects.find((project: any) => !project.released && project.progress >= TRIAL * 100);
  const year = Math.floor((state.day - 1) / 360);
  return TIERS.map((tier, level) => {
    const days = [year, year + 1].flatMap(index => tier.expoDays.map(at => index * 360 + at));
    const day = days.find(at => at - 7 >= state.day) as number;
    const entry = state.exhibitions.find((item: any) => item.day === day && (item.tier ?? 0) === level);
    const reason = entry ? '已报名本届' : !ready ? '报名截止前须完成体验版' : state.cash < tier.fee ? `报名需要 ${tier.fee} 万` : '';
    return { tier: level, name: tier.expo, fee: tier.fee, day, deadline: day - 7, entry, reason, available: !reason, project: ready };
  });
}

export function enterExhibition(state: any, projectId?: string, tier = 0) {
  const offer = exhibitionOffers(state)[tier];
  if (!offer) throw new Error('展会无效。');
  if (!offer.available) throw new Error(offer.reason);
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === (projectId || offer.project?.id) && !item.released);
  if (!project) throw new Error('没有可以报名的项目。');
  if (project.progress < TRIAL * 100) throw new Error('当前项目完成体验版后才能报名展会。');
  spend(next, offer.fee, `${offer.name}报名`);
  project.invested = round(project.invested + offer.fee);
  next.exhibitions.push({ day: offer.day, tier, project: project.id, name: project.name, metrics: projectMetrics(project), result: null });
  next.exhibitions = next.exhibitions.slice(-30);
  studioLog(next, '展会报名成功', `《${project.name}》参加第 ${offer.day} 天${offer.name}。`);
  return next;
}

function expoDay(state: any) {
  for (const entry of state.exhibitions) {
    if (entry.day > state.day || entry.result) continue;
    const level = entry.tier ?? 0;
    const tier = TIERS[level];
    const project = state.projects.find((item: any) => item.id === entry.project);
    const book = state.catalog.find((item: any) => item.id === entry.project);
    const metrics = project ? projectMetrics(project) : book?.metrics || entry.metrics;
    const score = round(metrics.dimensions.creativity * 0.4 + metrics.dimensions.picture * 0.3 + metrics.dimensions.sound * 0.3);
    const field = state.works.filter((work: any) => work.tier === level && work.released >= entry.day - 30 && work.released <= entry.day + 180).slice(0, tier.entrants)
      .map((work: any) => ({ name: `《${work.name}》 · ${work.studioName}`, score: round(work.creativity * 0.4 + work.presentation * 0.6), own: false }));
    while (field.length < tier.entrants) field.push({ name: `《${pick(state, TITLE_HEAD) + pick(state, TITLE_TAIL)}》 · ${pick(state, FILLER_HEAD) + pick(state, FILLER_TAIL)}`, score: round(clamp(tier.score + gauss(state) * 10, 25, 97)), own: false });
    const ranking = [...field, { name: `《${entry.name}》`, score, own: true }].sort((left, right) => right.score - left.score);
    const rank = ranking.findIndex(item => item.own) + 1;
    const reward = EXPO_REWARD[level];
    const followers = rank <= 3 ? reward[rank - 1] : rank <= 10 ? reward[3] : reward[4];
    const lead = ranking[0];
    const gap = rank === 1 ? '没有明显差距，体验领先。' : `第一名 ${lead.name} 领先 ${(lead.score - score).toFixed(1)} 分，差距主要在创意与表现。`;
    entry.result = { rank, score, followers, media: tier.media, ranking, gap };
    if (project) project.followers += followers;
    if (book) { book.followers += followers; book.dailyUnits += followers / 40; }
    state.fans += Math.round(followers * 0.1);
    news(state, level, false, `${tier.expo}：《${entry.name}》第 ${rank} 名`, `获得 ${followers} 人关注。`, null, true);
    announce(state, { kind: 'record', title: `${tier.expo}第 ${rank} 名`, text: `《${entry.name}》获得 ${followers} 人关注`, amount: 0 });
    studioLog(state, '展会报道', `${tier.media}：《${entry.name}》在${tier.expo}排第 ${rank} 名，获得 ${followers} 人关注。${gap}`);
  }
}

function awardsDay(state: any) {
  if (state.day % 360 !== 0) return;
  const year = state.day / 360;
  if (state.awards.some((item: any) => item.year === year)) return;
  const inYear = (day: number) => day > (year - 1) * 360 && day <= year * 360;
  const eligible = state.catalog.filter((book: any) => inYear(book.released));
  TIERS.forEach((tier, level) => tier.awards.forEach((category, index) => {
    const rivalScore = (work: any) => category === '年度作品' ? work.score : category === '创意奖' ? work.creativity : work.presentation;
    const ownScore = (book: any) => category === '年度作品' ? book.reviewScore : category === '创意奖' ? book.metrics.dimensions.creativity : (book.metrics.dimensions.picture + book.metrics.dimensions.sound) / 2;
    const rivals = state.works.filter((work: any) => work.tier <= level && inYear(work.released)).map((work: any) => ({ name: `《${work.name}》 · ${work.studioName}`, score: rivalScore(work), own: false }));
    const ranking = [...rivals, ...eligible.map((book: any) => ({ name: `《${book.name}》`, id: book.id, score: ownScore(book), own: true }))].sort((left, right) => right.score - left.score);
    const winner: any = ranking[0];
    if (!winner) return;
    const title = `${tier.name}${category}`;
    state.awards.push({ year, tier: level, category: title, winner: winner.name, book: winner.own ? winner.id : null, own: winner.own, ranking: ranking.slice(0, 8) });
    if (winner.own) {
      state.fans += tier.fans[index];
      if (level >= 1 && state.goals.award === null) state.goals.award = state.day;
      announce(state, { kind: 'record', title: `获得${title}`, text: `第 ${year} 年 · ${winner.name} · 新增粉丝`, amount: 0 });
    }
    news(state, level, level === 2 || winner.own, `第 ${year} 年${title}：${winner.name}`, winner.own ? '本社获奖。' : '', null, winner.own);
    studioLog(state, `第 ${year} 年${title}`, `获奖作品：${winner.name}。`);
  }));
  state.awards = state.awards.slice(-80);
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
  expoDay(state);
  awardsDay(state);
}

// ---- Random events ----
// Events are driven by the company's state and always offer a safe choice. Every outcome is rolled the
// moment the event appears, so the odds shown are honest and reloading never rerolls them.
const eventStage = (state: any) => state.office === 0 ? 'early' : state.office === 1 ? 'mid' : 'late';
const shortOfCash = (state: any) => state.cash - state.accrued < monthlyCost(state) * 1.5;
const openProject = (state: any, test: (project: any) => boolean) => state.projects.find((project: any) => !project.released && test(project));
const recentBook = (state: any, days: number) => state.catalog.find((book: any) => state.day - book.released <= days);
const rivalName = (state: any, tier: number) => {
  const live = state.rivals.filter((studio: any) => studio.closed === null && studio.tier === tier);
  return live.length ? pick(state, live).name : pick(state, STUDIO_POOL[tier]);
};
const safe = (title: string, text: string, effects: any = {}) => ({ id: 'safe', title, outcomes: [{ p: 1, text, effects }] });

const RANDOM_EVENTS: any[] = [
  { key: 'rush-job', stage: 'early', when: (state: any) => shortOfCash(state) ? {} : null, make: (state: any) => {
    const pay = round(monthlyCost(state) * 1.2);
    return { title: '朋友介绍了一单急活', text: '一家公司急需做一个小活动页。接下来团队要分心几天。', choices: [
      { id: 'take', title: '接下急活', outcomes: [{ p: 1, text: `全员占用 5 天，到账 ${pay.toFixed(2)} 万`, effects: { busy: { who: 'all', days: 5 }, cash: pay } }] },
      { id: 'big', title: '接下加急大单', outcomes: [{ p: 0.7, text: `全员占用 8 天，到账 ${(pay * 2).toFixed(2)} 万`, effects: { busy: { who: 'all', days: 8 }, cash: round(pay * 2) } }, { p: 0.3, text: `全员占用 8 天，对方拖欠，只付 ${(pay * 0.8).toFixed(2)} 万`, effects: { busy: { who: 'all', days: 8 }, cash: round(pay * 0.8) } }] },
      safe('婉拒', '专心做自己的游戏')
    ] };
  } },
  { key: 'game-jam', stage: 'early', when: (state: any) => state.staff.length >= 2 ? {} : null, make: () => ({ title: '本地 Game Jam 邀请', text: '城里的开发者聚会办 48 小时 Game Jam，问你们要不要组队参加。', choices: [
    { id: 'founder', title: '创始人单人参加', outcomes: [{ p: 1, text: '创始人占用 3 天，粉丝 +100', effects: { busy: { who: 'founder', days: 3 }, fans: 100 } }] },
    { id: 'team', title: '全员组队参加', outcomes: [{ p: 0.5, text: '作品拿了第一，全员占用 3 天，粉丝 +450', effects: { busy: { who: 'all', days: 3 }, fans: 450 } }, { p: 0.5, text: '玩得开心但没获奖，全员占用 3 天，粉丝 +80', effects: { busy: { who: 'all', days: 3 }, fans: 80 } }] },
    safe('婉拒', '专心做自己的游戏')
  ] }) },
  { key: 'friend-loan', stage: 'early', when: (state: any) => shortOfCash(state) ? {} : null, make: () => ({ title: '老朋友想帮一把', text: '大学同学听说工作室缺钱，主动问要不要支持。', choices: [
    { id: 'loan', title: '借 8 万', outcomes: [{ p: 1, text: '马上到账 8 万，90 天后还 9 万', effects: { cash: 8, schedule: { days: 90, amount: -9, title: '归还朋友借款' } } }] },
    { id: 'invest', title: '请朋友入股', outcomes: [{ p: 0.5, text: '朋友很看好，投入 10 万，不用还', effects: { cash: 10 } }, { p: 0.5, text: '朋友手头也紧，只投了 3 万', effects: { cash: 3 } }] },
    safe('婉拒', '不欠人情')
  ] }) },
  { key: 'forum', stage: 'early', when: (state: any) => state.catalog.length ? {} : null, make: () => ({ title: '开发者论坛约稿', text: '本地开发者论坛想请你写一篇创业心得。', choices: [
    { id: 'diary', title: '写开发日志', outcomes: [{ p: 1, text: '创始人占用 2 天，粉丝 +120', effects: { busy: { who: 'founder', days: 2 }, fans: 120 } }] },
    { id: 'hot', title: '写一篇争议观点', outcomes: [{ p: 0.4, text: '引发热议，粉丝 +600', effects: { busy: { who: 'founder', days: 2 }, fans: 600 } }, { p: 0.6, text: '被围攻，粉丝 -80', effects: { busy: { who: 'founder', days: 2 }, fans: -80 } }] },
    safe('婉拒', '专心做游戏')
  ] }) },
  { key: 'poach', stage: 'mid', when: (state: any) => {
    const person = state.staff.find((item: any) => !item.founder && Math.max(...ABILITY_KEYS.map(key => item.abilities[key])) >= 75);
    return person && state.staff.length >= 3 ? { person: person.id, studio: rivalName(state, 1) } : null;
  }, make: (state: any, ctx: any) => {
    const person = state.staff.find((item: any) => item.id === ctx.person);
    const bonus = round(person.wage * 3);
    return { title: `${ctx.studio}想挖走${person.name}`, text: `对方开出更高的条件。${person.name}来问你的意见。`, choices: [
      { id: 'bonus', title: `发 ${bonus.toFixed(2)} 万奖金留人`, disabled: state.cash < bonus, outcomes: [{ p: 1, text: '留下来，工资不变', effects: { cash: -bonus } }] },
      { id: 'talk', title: '谈谈理想', outcomes: [{ p: 0.55, text: '被打动留下，六项能力 +2', effects: { ability: 2 } }, { p: 0.45, text: '还是走了，不付遣散费', effects: { leave: true } }] },
      { id: 'release', title: '祝福放人', outcomes: [{ p: 1, text: '离开，不付遣散费', effects: { leave: true } }] }
    ] };
  } },
  { key: 'referral', stage: 'mid', when: (state: any) => (state.focus || 0) >= 1 && !state.notices.fameNext ? {} : null, make: () => ({ title: '老前辈愿意引荐', text: '一位业内前辈说认识几位想换环境的名人，可以约出来聊聊。', choices: [
    { id: 'meet', title: '花 1 万请客见面', outcomes: [{ p: 0.6, text: '谈得投机，下一批行业推荐里必有名人', effects: { cash: -1, fame: true } }, { p: 0.4, text: '聊得愉快，但没有下文', effects: { cash: -1 } }] },
    safe('婉拒', '按现在的节奏招人')
  ] }) },
  { key: 'graduate', stage: 'mid', when: (state: any) => state.staff.length < seats(state) ? { role: pick(state, Object.keys(ROLES).filter(key => roleOpen(state, key))) } : null, make: (state: any, ctx: any) => ({ title: '应届生上门', text: `一位学${ROLES[ctx.role].name}的应届生带着作品集找上门，想来实习转正。`, choices: [
    { id: 'hire', title: '直接收下', outcomes: [{ p: 1, text: '月薪 0.8 万，本行能力约 40，带「好学」', effects: { junior: { role: ctx.role, skill: 40 } } }] },
    { id: 'trial', title: '先做三天试题', outcomes: [{ p: 0.6, text: '是个好苗子：本行能力约 58，带「好学」', effects: { junior: { role: ctx.role, skill: 58 } } }, { p: 0.4, text: '对方等不及，去了别家', effects: {} }] },
    safe('婉拒', '工位留给更合适的人')
  ] }) },
  { key: 'co-promo', stage: 'mid', when: (state: any) => { const project = openProject(state, item => item.checkpoints?.demo); return project ? { project: project.id, studio: rivalName(state, 1) } : null; }, make: (state: any, ctx: any) => ({ title: `${ctx.studio}邀请联合宣传`, text: '对方的新作和你的体验版受众相近，想一起做活动。', choices: [
    { id: 'joint', title: '花 1 万联合宣传', disabled: state.cash < 1, outcomes: [{ p: 1, text: '关注 +300', effects: { cash: -1, followers: 300 } }] },
    { id: 'collab', title: '花 2 万做联名活动', disabled: state.cash < 2, outcomes: [{ p: 0.5, text: '活动出圈，关注 +1200', effects: { cash: -2, followers: 1200 } }, { p: 0.5, text: '反响平平，关注 +150', effects: { cash: -2, followers: 150 } }] },
    safe('婉拒', '按自己的节奏宣传')
  ] }) },
  { key: 'interview', stage: 'late', when: (state: any) => ({ project: openProject(state, () => true)?.id || null }), make: (state: any, ctx: any) => ({ title: '媒体专访邀请', text: '一家行业媒体想做公司专访。', choices: [
    { id: 'talk', title: '接受专访', outcomes: [{ p: 1, text: '创始人占用 2 天，粉丝 +500', effects: { busy: { who: 'founder', days: 2 }, fans: 500 } }] },
    ...(ctx.project ? [{ id: 'reveal', title: '借机透露在研新作', outcomes: [{ p: 0.5, text: '话题火爆，关注 +2000', effects: { busy: { who: 'founder', days: 2 }, followers: 2000 } }, { p: 0.5, text: '期待被拉高：关注 +300，玩家期待 +5', effects: { busy: { who: 'founder', days: 2 }, followers: 300, expectation: 5 } }] }] : []),
    safe('婉拒', '低调做事')
  ] }) },
  { key: 'judge', stage: 'late', when: () => ({}), make: () => ({ title: '评奖委员会邀请', text: '今年的行业评选想请你担任评委。', choices: [
    { id: 'judge', title: '担任评委', outcomes: [{ p: 1, text: '创始人占用 5 天，粉丝 +300', effects: { busy: { who: 'founder', days: 5 }, fans: 300 } }] },
    { id: 'plug', title: '当评委，顺带推荐自家作品', outcomes: [{ p: 0.5, text: '传为美谈，粉丝 +900', effects: { busy: { who: 'founder', days: 5 }, fans: 900 } }, { p: 0.5, text: '被质疑公正，粉丝 -200', effects: { busy: { who: 'founder', days: 5 }, fans: -200 } }] },
    safe('婉拒', '专心做游戏')
  ] }) },
  { key: 'indie-fund', stage: 'late', when: (state: any) => state.cash >= 5 ? { studio: pick(state, FILLER_HEAD) + pick(state, FILLER_TAIL) } : null, make: (state: any, ctx: any) => ({ title: `${ctx.studio}求发行投资`, text: '一支三人小团队带着体验版来找你，希望你投资发行。', choices: [
    { id: 'invest', title: '投资 5 万', outcomes: [{ p: 0.55, text: '作品成功，270 天后回款 12 万', effects: { cash: -5, schedule: { days: 270, amount: 12, title: `${ctx.studio}发行分成` } } }, { p: 0.45, text: '项目夭折，投资打水漂', effects: { cash: -5 } }] },
    safe('婉拒', '只做自己的作品')
  ] }) },
  { key: 'overseas', stage: 'late', when: (state: any) => { const book = recentBook(state, 180); return book && state.cash >= 4 ? { book: book.id, name: book.name } : null; }, make: (state: any, ctx: any) => ({ title: '海外渠道找上门', text: `海外发行渠道想上架《${ctx.name}》，需要先做本地化。`, choices: [
    { id: 'localize', title: '花 4 万做本地化', outcomes: [{ p: 0.6, text: '海外反响不错，日销量 ×1.6', effects: { cash: -4, boost: 1.6 } }, { p: 0.4, text: '水土不服，日销量 ×1.1', effects: { cash: -4, boost: 1.1 } }] },
    safe('婉拒', '先专注国内')
  ] }) },
  { key: 'conference', stage: 'mid', when: (state: any) => {
    if (state.cash < 3 || state.staff.length < 2) return null;
    const person = [...state.staff].sort((left: any, right: any) => ((right.potential ?? 80) - Math.max(...ABILITY_KEYS.map(key => right.abilities[key]))) - ((left.potential ?? 80) - Math.max(...ABILITY_KEYS.map(key => left.abilities[key]))))[0];
    return { person: person.id };
  }, make: (state: any, ctx: any) => {
    const person = state.staff.find((item: any) => item.id === ctx.person);
    const name = ABILITIES.find(item => item.key === primaryAbility(person))?.name;
    return { title: '行业大会开幕', text: `全国开发者大会有一场${name}专场，${person.name}很想去听。`, choices: [
      { id: 'go', title: '花 3 万派他去', outcomes: [{ p: 1, text: `${person.name}离开 5 天，${name} +4`, effects: { cash: -3, busy: { who: 'person', days: 5 }, train: { who: 'person', amount: 4 } } }] },
      { id: 'stream', title: '只看线上直播', outcomes: [{ p: 0.6, text: `${person.name}占用 2 天，${name} +2`, effects: { busy: { who: 'person', days: 2 }, train: { who: 'person', amount: 2 } } }, { p: 0.4, text: '直播卡得厉害，白看了 2 天', effects: { busy: { who: 'person', days: 2 } } }] },
      safe('不去', '手头的工作更要紧')
    ] };
  } },
  { key: 'course', stage: 'any', when: (state: any) => {
    if (state.staff.length < 3 || state.cash < 1) return null;
    const pool = [...state.staff].sort(() => random(state) - 0.5);
    return { a: pool[0].id, b: pool[1].id };
  }, make: (state: any, ctx: any) => {
    const a = state.staff.find((item: any) => item.id === ctx.a);
    const b = state.staff.find((item: any) => item.id === ctx.b);
    const skill = (person: any) => ABILITIES.find(item => item.key === primaryAbility(person))?.name;
    return { title: '只有一个培训名额', text: `合作的大学开了一期进阶课，只给一个名额，学费 1 万，上课 7 天。${a.name}和${b.name}都想去。`, choices: [
      { id: 'a', title: `让${a.name}去`, outcomes: [{ p: 1, text: `${a.name}离开 7 天，${skill(a)} +5`, effects: { cash: -1, busy: { who: 'a', days: 7 }, train: { who: 'a', amount: 5 } } }] },
      { id: 'b', title: `让${b.name}去`, outcomes: [{ p: 1, text: `${b.name}离开 7 天，${skill(b)} +5`, effects: { cash: -1, busy: { who: 'b', days: 7 }, train: { who: 'b', amount: 5 } } }] },
      safe('名额让给别人', '这次不去')
    ] };
  } },
  { key: 'workshop', stage: 'early', when: (state: any) => state.staff.length ? { person: pick(state, state.staff).id } : null, make: (state: any, ctx: any) => {
    const person = state.staff.find((item: any) => item.id === ctx.person);
    return { title: '前辈的周末工作坊', text: `一位退休的老制作人开了个周末工作坊，免费，但要占 3 天。${person.name}想去。`, choices: [
      { id: 'go', title: `让${person.name}去`, outcomes: [{ p: 0.5, text: '和前辈聊得很投机，觉醒了新的性格', effects: { busy: { who: 'person', days: 3 }, awaken: 'person' } }, { p: 0.5, text: '学到不少，本行能力 +2', effects: { busy: { who: 'person', days: 3 }, train: { who: 'person', amount: 2 } } }] },
      safe('下次再说', '先把手上的活干完')
    ] };
  } },
  { key: 'streamer', stage: 'any', when: (state: any) => { const project = openProject(state, item => item.checkpoints?.demo); return project ? { project: project.id } : null; }, make: (state: any, ctx: any) => {
    const project = state.projects.find((item: any) => item.id === ctx.project);
    const metrics = visibleMetrics(project);
    const bad = metrics.untested ? 0.5 : round(clamp(0.1 + (100 - metrics.dimensions.stability) / 100 * 0.8, 0.1, 0.8));
    return { title: '知名主播想直播体验版', text: `一位主播想在直播里玩《${project.name}》的体验版。${metrics.untested ? '还没测试，稳定无从估计：被吐槽 50%。' : `估计稳定 ${metrics.dimensions.stability.toFixed(0)} 分：被吐槽 ${Math.round(bad * 100)}%。`}`, choices: [
      { id: 'live', title: '同意直播', outcomes: [{ p: round(1 - bad), text: '玩得很开心，关注 +800', effects: { followers: 800 } }, { p: bad, text: '直播中频频出错被吐槽，关注 -150', effects: { followers: -150 } }] },
      safe('只给剪辑版', '关注 +150', { followers: 150 }),
      { id: 'decline', title: '婉拒', outcomes: [{ p: 1, text: '没有变化', effects: {} }] }
    ] };
  } },
  { key: 'frontpage', stage: 'any', when: (state: any) => { const book = recentBook(state, 60); return book && state.cash >= 2 ? { book: book.id, name: book.name } : null; }, make: (state: any, ctx: any) => ({ title: '平台首页推荐位', text: `平台运营问《${ctx.name}》要不要买一周首页推荐位。`, choices: [
    { id: 'buy', title: '花 2 万买推荐位', outcomes: [{ p: 0.7, text: '曝光很好，日销量 ×1.8', effects: { cash: -2, boost: 1.8 } }, { p: 0.3, text: '同期大作太多，日销量 ×1.15', effects: { cash: -2, boost: 1.15 } }] },
    safe('婉拒', '靠口碑慢慢卖')
  ] }) },
  { key: 'engine', stage: 'any', when: (state: any) => { const project = openProject(state, item => item.progress < TRIAL * 100); return project ? { project: project.id } : null; }, make: (state: any, ctx: any) => {
    const project = state.projects.find((item: any) => item.id === ctx.project);
    const count = 5 + project.scale * 4;
    return { title: '引擎大版本更新', text: `《${project.name}》用的引擎发布了大版本，新工具能省不少工作量，但迁移有风险。`, choices: [
      { id: 'migrate', title: '立即迁移', outcomes: [{ p: 0.6, text: '迁移顺利，剩余内容工作量 -10%', effects: { work: 0.1 } }, { p: 0.4, text: `剩余内容工作量 -10%，但新增约 ${count} 个隐藏缺陷`, effects: { work: 0.1, defects: count } }] },
      safe('暂不迁移', '保持现状')
    ] };
  } }
];

function rollRandomEvent(state: any) {
  if (!state.company || state.over || tutorialActive(state) || state.day < (state.eventNext ?? 60) || random(state) >= 1 / 12) return;
  const stage = eventStage(state);
  const seen = state.eventSeen || {};
  const options = RANDOM_EVENTS
    .filter(item => (item.stage === stage || item.stage === 'any') && !(seen[item.key] !== undefined && state.day - seen[item.key] < 360))
    .map(item => ({ item, ctx: item.when(state) }))
    .filter(option => option.ctx);
  if (!options.length) return;
  const { item, ctx } = pick(state, options);
  const made = item.make(state, ctx);
  const choices = made.choices.map((choice: any) => {
    const roll = random(state);
    let total = 0;
    let outcome = choice.outcomes[choice.outcomes.length - 1];
    for (const option of choice.outcomes) { total += option.p; if (roll < total) { outcome = option; break; } }
    const detail = choice.outcomes.length === 1 ? choice.outcomes[0].text : choice.outcomes.map((option: any) => `${Math.round(option.p * 100)}%：${option.text}`).join('\n');
    return { id: choice.id, title: choice.title, detail, disabled: !!choice.disabled, outcome: { text: outcome.text, effects: outcome.effects } };
  });
  state.event = { id: 'random', key: item.key, ctx, title: made.title, text: made.text, choices };
  state.eventSeen = { ...seen, [item.key]: state.day };
  state.eventNext = state.day + 45 + Math.floor(random(state) * 16);
}

function makeJunior(state: any, role: string, skill: number) {
  const abilities: any = {};
  for (const key of ABILITY_KEYS) abilities[key] = Math.round(clamp((ROLES[role].home.includes(key) ? skill : skill * 0.6) + (random(state) - 0.5) * 10, 5, 95));
  if (role === 'test') abilities.discover = Math.round(clamp(skill + (random(state) - 0.5) * 10, 5, 95));
  return freshPerson(state, {
    id: `junior-${state.seed}-${state.day}-${state.staff.length}`, name: pick(state, FAMILY_NAMES) + pick(state, GIVEN_NAMES), role, abilities,
    speed: 85, tags: [{ kind: 'personality', key: 'growth' }], wage: 0.8, hired: true, joined: state.day, home: homeWork({ role, home: '' }),
    snap: { ...abilities }, potential: Math.round(clamp(skill + 30 + random(state) * 10, 70, 96)), history: [{ day: state.day, text: '应届生上门，入职' }]
  });
}

function applyEffects(state: any, effects: any, ctx: any) {
  if (effects.cash) {
    state.cash = round(state.cash + effects.cash);
    if (effects.cash > 0) state.ledger.income = round(state.ledger.income + effects.cash);
    else state.ledger.expense = round(state.ledger.expense - effects.cash);
  }
  if (effects.fans) state.fans = Math.max(0, round(state.fans + effects.fans));
  const project = ctx.project ? state.projects.find((item: any) => item.id === ctx.project) : null;
  if (project) {
    if (effects.followers) project.followers = Math.max(0, Math.round(project.followers + effects.followers));
    if (effects.expectation) project.expectation = (project.expectation || 0) + effects.expectation;
    if (effects.work) for (const key of CONTENT_KEYS) { const work = project.work[key]; work.total = round(work.done + (work.total - work.done) * (1 - effects.work)); }
    if (effects.defects) {
      for (let index = 0; index < effects.defects; index += 1) project.defects.push({ id: `${project.id}-${project.defects.length}`, dimension: pick(state, CONTENT_KEYS), found: false, fixed: false, roll: random(state) });
      syncFound(project);
    }
    project.progress = projectMetrics(project).progress;
  }
  if (effects.busy) {
    const people = effects.busy.who === 'all' ? state.staff : effects.busy.who === 'founder' ? state.staff.filter((person: any) => person.founder) : state.staff.filter((person: any) => person.id === ctx[effects.busy.who]);
    for (const person of people) person.leaveUntil = Math.max(person.leaveUntil || 0, state.day) + effects.busy.days;
  }
  if (effects.train) {
    const learner = state.staff.find((item: any) => item.id === ctx[effects.train.who]);
    if (learner) {
      const key = effects.train.ability || primaryAbility(learner);
      learner.abilities[key] = round(Math.min(100, learner.abilities[key] + effects.train.amount));
      personNote(state, learner, `培训：${ABILITIES.find(item => item.key === key)?.name} +${effects.train.amount}`);
    }
  }
  if (effects.awaken) {
    const learner = state.staff.find((item: any) => item.id === ctx[effects.awaken]);
    const available = learner ? Object.keys(PERSONALITY_TAGS).filter(tag => !learner.tags.some((item: any) => item.key === tag)) : [];
    if (available.length) {
      const tag = pick(state, available);
      learner.tags.push({ kind: 'personality', key: tag });
      personNote(state, learner, `工作坊里觉醒「${PERSONALITY_TAGS[tag].name}」`);
    }
  }
  const person = ctx.person ? state.staff.find((item: any) => item.id === ctx.person) : null;
  if (person && effects.ability) for (const key of ABILITY_KEYS) person.abilities[key] = Math.min(100, person.abilities[key] + effects.ability);
  if (person && effects.leave) {
    state.staff = state.staff.filter((item: any) => item.id !== person.id);
    departed(state, person);
    if (person.boost) for (const other of state.staff) if (!other.stressTags.includes('tired') && random(state) < 0.4) other.stressTags.push('tired');
    studioLog(state, `${person.name} 离职`, '已交付的成果保留。');
  }
  if (effects.junior && state.staff.length < seats(state)) {
    const junior = makeJunior(state, effects.junior.role, effects.junior.skill);
    state.staff.push(junior);
    studioLog(state, `${junior.name} 加入`, `${ROLES[junior.role].name}，月薪 ${junior.wage.toFixed(2)} 万。`);
  }
  if (effects.schedule) state.schedule = [...(state.schedule || []), { day: state.day + effects.schedule.days, amount: effects.schedule.amount, title: effects.schedule.title }];
  if (effects.fame) state.notices.fameNext = true;
  const book = ctx.book ? state.catalog.find((item: any) => item.id === ctx.book) : null;
  if (book && effects.boost) book.dailyUnits *= effects.boost;
}

function resolveRandomEvent(state: any, event: any, choice: string) {
  const picked = event.choices.find((item: any) => item.id === choice);
  if (picked.disabled) throw new Error('当前无法选择这一项。');
  applyEffects(state, picked.outcome.effects || {}, event.ctx || {});
  studioLog(state, picked.title, picked.outcome.text);
  announce(state, { kind: 'notice', title: picked.title, text: picked.outcome.text, amount: 0 });
  return state;
}

// Money promised or owed by an earlier choice arrives on its day.
function scheduledCash(state: any) {
  const due = (state.schedule || []).filter((item: any) => item.day <= state.day);
  if (!due.length) return;
  state.schedule = state.schedule.filter((item: any) => item.day > state.day);
  for (const item of due) {
    state.cash = round(state.cash + item.amount);
    if (item.amount > 0) state.ledger.income = round(state.ledger.income + item.amount);
    else state.ledger.expense = round(state.ledger.expense - item.amount);
    studioLog(state, item.title, `${item.amount > 0 ? '到账' : '支付'} ${Math.abs(item.amount).toFixed(2)} 万。`);
  }
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
  if (next.rulesRevision < 4) {
    // Charts became first-week and lifetime boards against real rival titles; the old weekly rank is gone.
    seedIndustry(next);
    next.eventNext = next.day + 30;
    next.eventSeen = {};
    next.schedule = [];
    next.rankings = [];
    for (const book of [...next.catalog].reverse()) {
      book.firstWeek = book.firstWeek || Math.round((book.openingUnits || 0) * 1.4);
      delete book.rank; delete book.previousRank; delete book.bestRank;
      if (next.day - book.released >= 7) book.firstRanks = firstWeekRanks(next, book.firstWeek, book.released, book.id);
      book.totalRanks = totalRanks(next, book);
    }
    next.rulesRevision = 4;
  }
  if (next.rulesRevision < 5) {
    // Tools are gone; promotion is one campaign per title; patches are their own projects; the tier now
    // comes from a quarterly media rating that can also fall.
    delete next.tools;
    next.celebs = next.celebs || [];
    for (const project of next.projects) {
      if (!project.released) continue;
      const crew = next.staff.filter((person: any) => chosenWorks(project, person).length);
      const targets = project.defects.filter((defect: any) => defect.found && !defect.fixed).map((defect: any) => defect.id);
      if (crew.length && targets.length && !project.patch) {
        const book = next.catalog.find((item: any) => item.id === project.id);
        project.patch = { started: next.day, rework: null, targets, reworkTotal: 0, reworkDone: 0, before: { overall: projectMetrics(project).overall, review: book ? book.reviewScore : null, daily: book ? book.lastDayUnits : 0 } };
      } else project.assignments = {};
    }
    next.rating = { score: 0, watch: false, promotedAt: 0, history: [] };
    const score = ratingOf({ ...next, focus: 0 }).score;
    next.focus = score >= RATING_UP[2] ? 2 : score >= RATING_UP[1] ? 1 : 0;
    next.rating = { score, watch: false, promotedAt: next.day - RATING_PERIOD - 1, history: [{ day: next.day, score, tier: next.focus }] };
    next.rulesRevision = 5;
  }
  if (next.rulesRevision < 6) {
    // People grow by practice towards a potential, can mentor each other and earn team boosts; rival
    // studios have named leads; the six goals became milestone achievements.
    delete next.celebs;
    for (const person of next.staff) {
      const peak = Math.max(...ABILITY_KEYS.map(key => person.abilities[key]));
      Object.assign(person, { potential: person.potential ?? Math.round(clamp(peak + 8, 60, 98)), snap: { ...person.abilities }, history: person.history || [{ day: person.joined || 1, text: '入职' }], trace: person.trace || [], boost: person.boost || null, mentor: person.mentor || null });
      delete person.outingPity;
    }
    for (const pool of Object.values(next.candidates) as any[]) for (const person of pool.people) person.potential = person.potential ?? Math.round(clamp(Math.max(...ABILITY_KEYS.map(key => person.abilities[key])) + 10, 60, 98));
    if (!Array.isArray(next.talents)) {
      next.talents = [];
      for (const studio of next.rivals) if (studio.closed === null && studio.tier >= 1) newTalent(next, studio);
    }
    next.flags = next.flags || {};
    next.playSeconds = next.playSeconds || 0;
    next.achievements = {};
    checkAchievements(next, true);
    next.notices.achSeen = Object.keys(next.achievements).length;
    next.rulesRevision = 6;
  }
  if (next.rulesRevision < 7) {
    // Paid leave is gone: outings are the only way to clear stress, with saved-up charges. Team boosts
    // now have grades; the ones already earned start at the first.
    delete next.lastOuting;
    next.outing = { charges: 1, next: next.day + OUTING_RECHARGE, last: null, resume: null, paused: {}, pending: null, history: [] };
    for (const person of next.staff) if (person.boost) person.boostLevel = person.boostLevel || 1;
    next.rulesRevision = 7;
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
  const tags = (value: any) => Array.isArray(value) && value.every((tag: any) => tag && (has(ABILITY_TAGS, tag.key) || has(PERSONALITY_TAGS, tag.key) || has(RARE_TAGS, tag.key)));
  const person = (value: any) => value && text(value.name) && has(ROLES, value.role) && abilities(value.abilities) && number(value.speed) && value.speed > 0 && value.speed <= 200 && number(value.wage) && value.wage >= 0 && Array.isArray(value.stressTags) && tags(value.tags);
  const work = (value: any) => object(value) && DIM_KEYS.every(key => value[key] && nonnegative(value[key].total) && nonnegative(value[key].done) && nonnegative(value[key].value));
  if (!state || state.version !== 6 || !Number.isInteger(state.day) || state.day < 1 || !text(state.company) || !number(state.cash) || !nonnegative(state.accrued) || typeof state.over !== 'boolean') return false;
  if (!Array.isArray(state.staff) || !state.staff.every(person)) return false;
  if (!Array.isArray(state.projects) || !state.projects.every((project: any) => project && text(project.name) && has(TYPES, project.type) && tier(project.scale) && work(project.work) && Array.isArray(project.defects))) return false;
  if (!Array.isArray(state.catalog) || !state.catalog.every((book: any) => book && text(book.name) && has(TYPES, book.type) && tier(book.scale) && number(book.price) && book.price > 0 && object(book.metrics) && nonnegative(book.received) && Array.isArray(book.weekly))) return false;
  if (!object(state.goals) || !object(state.tutorial) || !object(state.overtime) || !Array.isArray(state.rankings) || !Array.isArray(state.exhibitions) || !Array.isArray(state.awards) || !Array.isArray(state.history) || !Array.isArray(state.reports)) return false;
  return true;
}
