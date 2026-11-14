// Pure business rules without engine imports, so they can also run in Node for balance checks.
// This is the six-dimension skeleton: every work unit is judged by the person who did it, and the
// score of a dimension is the ability of its finished work times its progress, never capped.
import { MODULES, SLOTS, AXES, ORIGINS } from './Modules';
export { MODULES, SLOTS, AXES, ORIGINS };

// Build version: bumped on every code change so the running preview can be matched against source.
// Check the in-game top bar, the repo-root VERSION file, or a git tag to confirm which build is live.
export const VERSION = '0.4.8';

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

// Four settings of scale decide how much work there is, what it may sell for and how big its market is.
// Work is set by team and time: small is two people for a month, medium five for two months, large ten
// for four months, extra-large thirty for half a year. Price and reach grow so that a well-made title
// earns about the same multiple of its cost at every size, and a poor big one loses more.
export const SCALES = [
  { name: '小型', work: 1, price: 1, reach: 1 },
  { name: '中型', work: 5, price: 1.4, reach: 3.5 },
  { name: '大型', work: 20, price: 1.8, reach: 12 },
  { name: '超大型', work: 90, price: 2.4, reach: 45 }
];

// Pace trial: both the workload and the money a title brings in are two thirds of the old values.
// A game takes about a third less calendar time while the risk/reward ratio stays the same. Change
// this one constant to roll the whole trial back.
export const PACE = 2 / 3;

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
    name: '程序', home: ['fluidity', 'depth'], task: '负责流畅与深度',
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

// Ability tags only summarise what the numbers already say, and only for high values: purple from 80,
// gold from 90. Old keys stay so saves that stored them still load; the label comes from the number.
export const ABILITY_TAGS: any = {
  creativity: { ability: 'creativity', word: '创意' },
  depth: { ability: 'depth', word: '深度' },
  fluidity: { ability: 'fluidity', word: '流畅' },
  picture: { ability: 'picture', word: '画面' },
  sound: { ability: 'sound', word: '声音' },
  discover: { ability: 'discover', word: '查错' },
  music: { ability: 'sound' }, ear: { ability: 'sound' }, vision: { ability: 'picture' }, polish: { ability: 'depth' },
  inventor: { ability: 'creativity' }, engineer: { ability: 'fluidity' }, hunter: { ability: 'discover' }, steady: { ability: 'stability' }
};
function abilityTag(ability: string, value: number) {
  const rank = clamp(valueRank(value), 2, 3);
  const word = ABILITY_TAGS[ability].word;
  return { name: word + (rank >= 3 ? '顶尖' : '出众'), text: word + (rank >= 3 ? '能力 90 以上，行业顶尖。' : '能力 80 以上，明显高于同行。'), kind: '能力', rank, tone: RARITY_TONES[rank], rarity: RARITY_NAMES[rank] };
}
// Personality tags change what happens.
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
// Every random way of getting a tag draws by these weights, so the colour also says how often it turns up.
export const RARITY_WEIGHT = [1, 1, 0.35, 0.12];
function pickByRarity(state: any, options: any[]) {
  const total = options.reduce((sum: number, item: any) => sum + RARITY_WEIGHT[item.rank], 0);
  let roll = random(state) * total;
  return options.find((item: any) => (roll -= RARITY_WEIGHT[item.rank]) < 0) || options[options.length - 1];
}
// The same bands colour ability numbers; below the first band an ability earns no tag at all.
export function valueRank(value: number) {
  return value >= 90 ? 3 : value >= 80 ? 2 : value >= 70 ? 1 : value >= 60 ? 0 : -1;
}

export function tagInfo(tag: any, person: any = null) {
  const key = typeof tag === 'string' ? tag : tag?.key;
  const graded = (info: any, kind: string, rank: number) => ({ ...info, kind, rank, tone: RARITY_TONES[clamp(rank, 0, 3)], rarity: RARITY_NAMES[clamp(rank, 0, 3)] });
  if (has(STRESS_TAGS, key)) return { ...STRESS_TAGS[key], kind: '状态', rank: -1, tone: 'stress' };
  if (has(ABILITY_TAGS, key)) {
    const ability = ABILITY_TAGS[key].ability;
    return ABILITY_TAGS[ability] ? abilityTag(ability, person ? person.abilities[ability] : 80) : { name: '', text: '', kind: '', rank: 0, tone: 'green' };
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
// only abilities of 80 or more show (at most two), purple, then gold from 90.
export function personTags(person: any) {
  const out: any[] = [];
  if (person.boost) out.push(tagInfo(person.boost, person));
  for (const tag of person.tags || []) if (tag.kind !== 'ability' && !has(ABILITY_TAGS, tag.key)) out.push(tagInfo(tag, person));
  const notable = ABILITY_KEYS.filter(ability => valueRank(person.abilities[ability]) >= 2).sort((left, right) => person.abilities[right] - person.abilities[left]).slice(0, 2);
  for (const ability of notable) out.push(abilityTag(ability, person.abilities[ability]));
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
  friends: { name: '熟人介绍', fee: 0.1, text: '朋友和同学推荐，花费少，能力参差，工资较低。', skill: [25, 55], speed: [60, 95], wage: [0.4, 0.01, 0.005, 0.2] },
  web: { name: '招聘网站', fee: 0.8, text: '公开招聘，候选人更有经验，工资也更高。', skill: [45, 78], speed: [70, 105], wage: [1.6, 0.03, 0.015, 0.6], lock: '完成首作后开放' },
  headhunt: { name: '行业推荐', fee: 3, text: '同行推荐的成熟开发者，能力强、要价高，推荐费也贵。', skill: [68, 93], speed: [85, 120], wage: [2.5, 0.035, 0.02, 0.8], lock: '搬进正式办公室后开放' }
};
// The studio starts at the founder's home: one desk, no rent. Delivering the opening job rents the hut
// by itself; every move after that is the player's call.
export const OFFICES = [
  { name: '自家', seats: 1, rent: 0 },
  { name: '起步小屋', seats: 4, rent: 1.5 },
  { name: '正式办公室', seats: 10, rent: 3, cost: 8 },
  { name: '独立工作室', seats: 16, rent: 5, cost: 30 },
  { name: '写字楼整层', seats: 40, rent: 12, cost: 120 },
  { name: '园区大楼', seats: 100, rent: 30, cost: 500 }
];
// Promotion is one campaign per title, picked once after the trial build. Tiers differ by orders of
// magnitude and each yuan buys fewer followers as the budget grows, so the right tier depends on what
// one follower is worth for this title (price, trial reception) and how far its launch can reach.
export const PROMOTE_TIERS = [0.5, 3, 15, 60, 200];
const PROMOTE_SCALE = 400;
// Minimum discount a title may go to. The system decides when to run a sale and how deep within the floor.
export const DISCOUNTS = [0.75];

export const UNIT_MARKS = [1000, 5000, 10000, 50000];
export const MARKET_SIZE = 5000;
// One work unit is one person-day of a newcomer. A dimension never stops at a cap; rework replaces the
// weakest finished part, so pushing a score up costs full wages for what the new hand can reach.
// Defects left per person-day of content at ability 0; a full-ability hand leaves none.
const DEFECT_RATE = 0.5;
// Person-days to fix one defect at full ability.
const REPAIR_WORK = 0.4;
const START_CASH = 10;
// The founder's savings: offered once, only when the month closes in the red. They cover the hole and
// leave this much on top.
const BRIDGE = 3;
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
// All amounts are stored in 万. Beyond 1 亿 (10,000 万) the unit switches, so the top bar, the
// company page, event text and the ledger never disagree about how large a number is.
export function moneyText(value: number) {
  const amount = Number(value);
  return Math.abs(amount) >= 10000 ? (amount / 10000).toFixed(2) + ' 亿' : amount.toFixed(2) + ' 万';
}
const tier = (value: any) => Number.isInteger(value) && value >= 0 && value <= 2;
const scaleIndex = (value: any) => Number.isInteger(value) && value >= 0 && value < SCALES.length;
// Object.hasOwn is missing on older mini-game runtimes (iOS < 15.4).
const has = (object: any, key: string) => Object.prototype.hasOwnProperty.call(object, key);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function random(state: any) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

// The market leans by tags. Each tag has a demand around 1: every release carrying it (the player's or a
// rival's) crowds it a little, and on quiet days it drifts back. The genre's own tag reads as the trend.
export const TYPE_TAG: any = { action: '动作', story: '叙事', think: '策略' };
export const ALL_TAGS: string[] = Array.from(new Set(Object.values(MODULES).flatMap((module: any) => module.tags || [])));
// Which tags compete with each other: genres, gameplay variants, and each other slot on its own.
const TAG_GROUP: any = {};
for (const module of Object.values(MODULES) as any[]) for (const tag of module.tags || []) if (!TAG_GROUP[tag]) TAG_GROUP[tag] = module.slot === 'core' ? ((module.needs || []).length && tag !== TYPE_TAG[module.type] ? 'variant' : 'genre') : module.slot;
const TAG_RELEASE = 0.07;
// The category of each tag: genres and variants are gameplay, styles are art, and so on.
export const TAG_AXIS: any = {};
for (const module of Object.values(MODULES) as any[]) for (const tag of module.tags || []) if (!TAG_AXIS[tag]) TAG_AXIS[tag] = module.axis;

// The market speaks about one category at a time: news, charts and the swings in demand all lean on the
// category the studio is learning now, while the others stay near their defaults. That keeps one
// variable moving at a time, so a result can be traced back to a choice. `state.lens` is that category;
// null once every category has been learned.
export const LENS_ORDER = ['design', 'art', 'audio', 'tech'];
export const LENS_ABILITY: any = { design: 'creativity', art: 'picture', audio: 'sound', tech: 'fluidity' };
export const lensOf = (state: any) => state.lens === undefined ? LENS_ORDER[0] : state.lens;
// Measured on raw demand (about ±5% at the 90th percentile): the category being learned swings about
// ±20%, the others stay within about ±5%.
const LENS_SPREAD = 3.5;
const QUIET_SPREAD = 0.8;
const LEARNED_SPREAD = 1.5;
function spreadOf(state: any, tag: string) {
  const lens = lensOf(state);
  if (lens === null) return LEARNED_SPREAD;
  return TAG_AXIS[tag] === lens ? LENS_SPREAD : QUIET_SPREAD;
}
export function tagHeat(value: number) {
  return value >= 1.12 ? { label: '热门', tone: 'up' } : value <= 0.88 ? { label: '拥挤', tone: 'down' } : { label: '平稳', tone: 'flat' };
}
export function market(state: any, type: string) {
  const value = tagDemand(state, TYPE_TAG[type]);
  const heat = tagHeat(value);
  const text: any = {
    热门: { label: '关注上升', description: '近期同类作品少、话题多，但热度不一定持续到发售。' },
    平稳: { label: '需求平稳', description: '没有明显风口，作品本身更重要。' },
    拥挤: { label: '市场拥挤', description: '近期同类作品较多，需要更谨慎地控制投入。' }
  };
  return { multiplier: round(clamp(value, 0.7, 1.3)), ...text[heat.label] };
}
// Demand is relative to the tag's own group (genres against genres, styles against styles): a tag is hot
// when it is crowded less than its alternatives, so the market filling up never drags every title down.
export function tagDemand(state: any, tag: string) {
  const group = ALL_TAGS.filter(item => TAG_GROUP[item] === TAG_GROUP[tag]);
  const mean = sum(group.map(item => (state.tags || {})[item] ?? 1)) / Math.max(1, group.length);
  const raw = ((state.tags || {})[tag] ?? 1) / Math.max(0.1, mean);
  return round(clamp(1 + (raw - 1) * spreadOf(state, tag), 0.6, 1.4));
}
function seedTags(state: any) {
  state.tags = {};
  for (const tag of ALL_TAGS) state.tags[tag] = round(0.88 + random(state) * 0.24);
}
function tagRelease(state: any, tags: string[], weight = 1) {
  state.tags = state.tags || {};
  for (const tag of tags) if (has(state.tags, tag)) state.tags[tag] = round(clamp(state.tags[tag] - TAG_RELEASE * weight, 0.55, 1.45));
}
function tagDay(state: any) {
  state.tags = state.tags || {};
  for (const tag of ALL_TAGS) {
    const value = state.tags[tag] ?? 1;
    state.tags[tag] = Math.round(clamp(value + (1 - value) * 0.012 + (random(state) - 0.5) * 0.012, 0.55, 1.45) * 1000) / 1000;
  }
}
// How a title's tags meet the market: the average demand of its tags, felt more strongly the bigger the
// title is (a higher tier shows its style more), always within a modest band.
export function tagFactor(state: any, tags: string[], scale = 0) {
  if (!tags.length) return 1;
  const average = sum(tags.map(tag => tagDemand(state, tag))) / tags.length;
  return round(clamp(1 + (average - 1) * (0.8 + scale * 0.3), 0.7, 1.4));
}

// Testing is the whole game's work, not a module: a share of all the content, reused parts included.
export const TEST_SHARE = 0.18;
// A rented line arrives finished at a capped quality and never joins the library (so it cannot be
// upgraded or reworked). It is paid once at the start of the title: a quarter of what building it would
// cost in a newcomer's wages, so renting the same line four times costs about as much as building it.
export const RENT_QUALITY = 55;
export const RENT_DAY = 0.045;
export const RENT_SPLIT = 4;
// Gameplay is what the title is; it can never be rented. The first title may rent one line, later two.
export const rentLimit = (state: any) => releases(state) ? 2 : 1;
// Every line a title uses has to be fitted into it, whether built, reused or rented: this share of the
// line's work at the title's tier belongs to the title alone.
export const INTEGRATION = 0.15;
// A built line licensed to other studios pays every month by its tier, and spreads its tags a little.
// Licensing opens with the formal office.
export const LICENSE_INCOME = 0.15;
export const LICENSE_OFFICE = 2;

const tierWork = (level: number) => level > 0 ? SCALES[level - 1].work : 0;
export const lineTiers = (line: string) => MODULES[line]?.tiers || SCALES.length;
// A module is one tier of a line: `engine2d#2` is built on `engine2d#1` and only adds the difference.
export const partId = (line: string, level: number) => line + '#' + level;
export function partOf(id: string) {
  const [line, text] = String(id).split('#');
  const module = MODULES[line];
  const level = Number(text);
  if (!module || !Number.isInteger(level) || level < 1 || level > lineTiers(line)) return null;
  const work: any = {};
  for (const [key, base] of Object.entries(module.work) as any) work[key] = base * (tierWork(level) - tierWork(level - 1));
  const needs = [...(level > 1 ? [partId(line, level - 1)] : []), ...(module.needs || []).map((need: string) => partId(need, Math.min(level, lineTiers(need))))];
  return { id, line, level, work, needs };
}
// The tier a title needs from a line: its scale, or the line's top tier when the line stops lower.
export const tierFor = (line: string, scale: number) => Math.min((scale || 0) + 1, lineTiers(line));

// Every module a plan pulls in, shared ones once: each chosen line at the title's tier and all below it.
export function expandModules(lines: string[], scale: number) {
  const out: string[] = [];
  const add = (id: string) => {
    const part = partOf(id);
    if (!part || out.includes(id)) return;
    for (const need of part.needs) add(need);
    out.push(id);
  };
  for (const line of lines) if (MODULES[line]) add(partId(line, tierFor(line, scale)));
  return out;
}
export const planLines = (plan: any): string[] => plan.only ? [...plan.only] : SLOTS.flatMap(slot => (plan.slots && plan.slots[slot.key]) || []);

// A module's progress belongs to the company, not to a title: any project working on it moves the same
// record, and an unfinished one keeps what was done for the next.
function moduleRecord(state: any, id: string) {
  state.modules = state.modules || {};
  if (!state.modules[id]) state.modules[id] = { done: {}, value: {}, uses: 0, first: '', defects: [] };
  return state.modules[id];
}
export function partProgress(state: any, id: string) {
  const part = partOf(id);
  if (!part) return 0;
  const record = (state.modules || {})[id];
  const shares = Object.entries(part.work).map(([key, total]: any) => total > 0 ? clamp((record?.done?.[key] || 0) / total, 0, 1) : 1);
  return shares.length ? Math.min(...shares) : 1;
}
export const partBuilt = (state: any, id: string) => partProgress(state, id) >= 0.999;
function partsQuality(state: any, ids: string[]) {
  let done = 0;
  let value = 0;
  for (const id of ids) {
    const record = (state.modules || {})[id];
    if (!record) continue;
    for (const key of Object.keys(record.done || {})) { done += record.done[key] || 0; value += record.value[key] || 0; }
  }
  return done > 0 ? round(value / done) : 0;
}

// A line as the player sees it: the highest tier built all the way down, how far the next one is, its
// quality, how often titles used it and the defects still open in it.
export function lineInfo(state: any, line: string) {
  const top = lineTiers(line);
  let level = 0;
  while (level < top && partBuilt(state, partId(line, level + 1))) level += 1;
  const next = level < top ? partProgress(state, partId(line, level + 1)) : 0;
  const ids = Array.from({ length: top }, (_, index) => partId(line, index + 1));
  const records = ids.map(id => (state.modules || {})[id]).filter(Boolean);
  return {
    line, level, top, next,
    uses: Math.max(0, ...records.map((record: any) => record.uses || 0)),
    first: records.map((record: any) => record.first).find(Boolean) || '',
    quality: partsQuality(state, ids.slice(0, Math.max(1, level + (next > 0 ? 1 : 0)))),
    defects: sum(records.map((record: any) => (record.defects || []).filter((defect: any) => !defect.fixed).length)),
    licensed: !!(state.licenses || {})[line]
  };
}

// One module's own six-dimension card, so a module can be judged on its own before any title uses it.
// The solid line is the quality already reached per dimension; the dashed line is where today's crew
// would take this same tier by finishing the rest of it. A module carries no test workload of its own,
// so its stability comes from the defects still open on it — all fixed is a full score.
export function moduleMetrics(state: any, id: string) {
  const part = partOf(id);
  const record = (state.modules || {})[id] || {};
  const dimensions: any = {};
  const expected: any = {};
  let value = 0;
  let done = 0;
  for (const key of CONTENT_KEYS) {
    const total = part ? part.work[key] || 0 : 0;
    const made = Math.min(total, record.done?.[key] || 0);
    const points = record.value?.[key] || 0;
    value += points;
    done += made;
    dimensions[key] = made > 0 ? round(clamp(points / made, 0, 100)) : 0;
    const work = WORKS.find(item => item.dimension === key);
    const best = work ? Math.max(0, ...(state.staff || []).map((person: any) => able(person, work.ability))) : 0;
    expected[key] = total > 0 ? round(clamp((points + Math.max(0, total - made) * best) / total, 0, 100)) : 0;
  }
  const open = ((record.defects || []) as any[]).filter((defect: any) => !defect.fixed).length;
  dimensions.stability = expected.stability = round(clamp(100 - open * 8, 0, 100));
  return { dimensions, expected, quality: done > 0 ? round(value / done) : 0, progress: partProgress(state, id), open };
}

// Slots and lines open up with released titles, so the first game only shows a few choices.
export const releases = (state: any) => (state.catalog || []).filter((book: any) => !book.parentId).length;
export const slotOpen = (state: any, slot: any) => !!slot && releases(state) >= (slot.unlock || 0);
// The first title's gameplay is fixed by the founder, so the other basic gameplay is not a choice yet.
// Showing it in the library with no unlock ever shown to the player reads as a stray, unusable option;
// it becomes a proper unlock the moment the first title ships.
function firstTitleGate(state: any, line: string) {
  if (releases(state) > 0) return false;
  const first = ORIGINS[state.founder]?.firstCore;
  if (!first || MODULES[line]?.slot !== 'core' || line === first) return false;
  return !(state.unlocked || {})[line];
}
export const moduleOpen = (state: any, line: string) => !!MODULES[line]
  && (!MODULES[line].unlock || !!(state.unlocked || {})[line])
  && slotOpen(state, SLOTS.find(slot => slot.key === MODULES[line].slot))
  // The two lines the first title needs start gated and are learned one by one during the opening job.
  && !((state.openingGates || {})[line] && !(state.openingLearned || {})[line])
  && !firstTitleGate(state, line);
// A hard technical requirement across axes: the line cannot go into a title that lacks the other line.
export function lineBlocked(plan: any, line: string) {
  const missing = (MODULES[line]?.requires || []).filter((need: string) => !planLines(plan).includes(need));
  return missing.length ? `需要${missing.map((need: string) => MODULES[need].name).join('、')}` : '';
}

// The plan the form starts from: what the company has wherever it can, the first open line elsewhere.
// The first title's gameplay follows the founder's origin and is not up for choice.
export function recommendPlan(state: any) {
  const slots: any = {};
  for (const slot of SLOTS) {
    if (!slotOpen(state, slot) || slot.min < 1) continue;
    const options = Object.keys(MODULES).filter(id => MODULES[id].slot === slot.key && moduleOpen(state, id) && !(MODULES[id].requires || []).length);
    const score = (line: string) => { const info = lineInfo(state, line); return info.level + info.next; };
    slots[slot.key] = slot.key === 'core' && firstGameCore(state) ? [firstGameCore(state)] : [...options].sort((left, right) => score(right) - score(left)).slice(0, slot.min);
  }
  return { name: '', scale: 0, slots, rent: [] };
}
export function firstGameCore(state: any) {
  return !releases(state) && ORIGINS[state.founder] ? ORIGINS[state.founder].firstCore : '';
}

// The slots that open with the next release, for the one-line teaser under the form.
export function nextUnlocks(state: any) {
  const next = releases(state) + 1;
  return SLOTS.filter(slot => (slot.unlock || 0) === next).map(slot => slot.name);
}

// What a plan would build: each module, what the company already has of it (carried over at its own
// quality) and what is still to do. A rented line is finished at the rent quality and never linked.
export function planModules(state: any, plan: any) {
  const rented = new Set(plan.rent || []);
  return expandModules(planLines(plan), plan.scale).map(id => {
    const part = partOf(id);
    const record = (state.modules || {})[id];
    const built = partBuilt(state, id);
    const rent = !built && rented.has(part.line);
    const fresh: any = {};
    const kept: any = {};
    for (const [key, total] of Object.entries(part.work) as any) {
      const have = rent ? total : Math.min(total, record?.done?.[key] || 0);
      fresh[key] = rent ? 0 : total - have;
      if (have > 0) kept[key] = { amount: have, quality: rent ? RENT_QUALITY : (record?.value?.[key] || 0) / Math.max(0.0001, record?.done?.[key] || 0) };
    }
    return { id, line: part.line, level: part.level, built, rented: rent, fresh, kept };
  });
}

// The title's own work, never kept: levels, script and portraits. The gameplay decides it, the scale
// multiplies it. It is also why no title, however much it reuses, starts at its trial build.
export function contentWork(plan: any) {
  if (plan.only) return {};
  let line = (plan.slots?.core || [])[0];
  while (line && MODULES[line] && !MODULES[line].content && (MODULES[line].needs || []).length) line = MODULES[line].needs[0];
  const out: any = {};
  for (const [key, base] of Object.entries(MODULES[line]?.content || {}) as any) out[key] = base * SCALES[plan.scale || 0].work * (plan.port ? PORT_CONTENT : 1);
  for (const [key, amount] of Object.entries(integrationWork(plan)) as any) out[key] = (out[key] || 0) + amount;
  return out;
}

// The whole work of a line at a tier, every tier below included.
export function lineWork(line: string, level: number) {
  const out: any = {};
  for (const [key, base] of Object.entries(MODULES[line]?.work || {}) as any) out[key] = base * tierWork(level);
  return out;
}

// Fitting every line into this title: built, reused or rented alike.
export function integrationWork(plan: any) {
  const out: any = {};
  if (plan.only || plan.rebuild) return out;
  for (const line of planLines(plan)) for (const [key, amount] of Object.entries(lineWork(line, tierFor(line, plan.scale || 0))) as any) out[key] = (out[key] || 0) + amount * INTEGRATION;
  return out;
}

// One rent of a line at the tier this title needs, and what building it would cost instead.
export function rentPrice(line: string, scale: number) {
  const work = sum(Object.values(lineWork(line, tierFor(line, scale))) as number[]);
  return { price: round(work * RENT_DAY / RENT_SPLIT), build: round(work * RENT_DAY) };
}
export const rentable = (line: string) => !!MODULES[line] && MODULES[line].axis !== 'design';
export function rentRecord(state: any, line: string) {
  return (state.rentLog || {})[line] || { count: 0, paid: 0 };
}
export function planRentCost(state: any, plan: any) {
  return round(sum(planModules(state, plan).filter(item => item.rented && item.level === tierFor(item.line, plan.scale || 0)).map(item => rentPrice(item.line, plan.scale || 0).price)));
}
function payRent(state: any, plan: any, title: string) {
  const cost = planRentCost(state, plan);
  if (!cost) return 0;
  spend(state, cost, `《${title}》租用模块`);
  state.rentLog = state.rentLog || {};
  for (const item of planModules(state, plan).filter(entry => entry.rented && entry.level === tierFor(entry.line, plan.scale || 0))) {
    const record = rentRecord(state, item.line);
    state.rentLog[item.line] = { count: record.count + 1, paid: round(record.paid + rentPrice(item.line, plan.scale || 0).price) };
  }
  return cost;
}

// The main gameplay decides the genre the audience reads it as; a title without one cannot start.
export function planType(plan: any) {
  const core = (plan.slots?.core || [])[0];
  return MODULES[core]?.type || '';
}

export function planIssue(state: any, plan: any) {
  if (!plan || !plan.slots) return '请选择模块。';
  if (plan.rent !== undefined && !Array.isArray(plan.rent)) return '租用设置无效。';
  const first = firstGameCore(state);
  for (const slot of SLOTS) {
    const ids = plan.slots[slot.key] || [];
    if (!slotOpen(state, slot)) { if (ids.length) return `${slot.name}还没有开放。`; continue; }
    if (ids.some((id: string) => MODULES[id]?.slot !== slot.key || !moduleOpen(state, id))) return `${slot.name}里有还不能用的模块。`;
    if (ids.length < slot.min) return `请选择${slot.name}。`;
    if (ids.length > slot.max) return `${slot.name}最多选 ${slot.max} 个。`;
  }
  if (first && (plan.slots.core || [])[0] !== first) return '首作的玩法由出身决定。';
  // A title cannot ship with pixel characters over hand-drawn scenery (or the other way round).
  const artStyles = (plan.slots?.art || []).map((line: string) => MODULES[line]?.style).filter(Boolean);
  if (new Set(artStyles).size > 1) return '美术风格要一致。';
  for (const line of planLines(plan)) { const reason = lineBlocked(plan, line); if (reason) return `${MODULES[line].name}${reason}。`; }
  if ((plan.rent || []).some((line: string) => !planLines(plan).includes(line))) return '只能租用这一作用到的模块。';
  if ((plan.rent || []).some((line: string) => !rentable(line))) return '玩法不能租用，它就是作品本身。';
  const renting = planModules(state, plan).filter(item => item.rented).map(item => item.line);
  if (new Set(renting).size > rentLimit(state)) return `${releases(state) ? '每作' : '首作'}最多租 ${rentLimit(state)} 个模块。`;
  return planType(plan) ? '' : '请选择玩法。';
}

// New person-days per dimension, what reuse saves, the tags the lines add up to, and what renting costs.
export function planWork(state: any, plan: any) {
  const fresh: any = { ...contentWork(plan) };
  let saved = 0;
  for (const item of planModules(state, plan)) {
    for (const [key, amount] of Object.entries(item.fresh) as any) fresh[key] = (fresh[key] || 0) + amount;
    for (const part of Object.values(item.kept) as any) saved += part.amount;
  }
  return { fresh, total: sum(Object.values(fresh) as number[]), saved, tags: planTags(plan), rentCost: planRentCost(state, plan) };
}
export function planTags(plan: any) {
  const tags: string[] = [];
  for (const line of planLines(plan)) for (const tag of MODULES[line]?.tags || []) if (!tags.includes(tag)) tags.push(tag);
  for (const id of expandModules(planLines(plan), plan.scale || 0)) for (const tag of MODULES[partOf(id).line].tags || []) if (!tags.includes(tag)) tags.push(tag);
  return tags;
}

// A project links to the company's module records instead of copying them: `parts` are the modules it
// works on, `own` is its private work (the title's content, rented lines, or a rebuild in progress). The
// per-dimension `work` is a cache of both, refreshed every day; `base` is what was already done when it
// started, so progress and milestones count only this project's own work.
function blankProject(state: any, id: string, plan: any, day: number) {
  const items = plan.rebuild ? [] : planModules(state, plan);
  const own: any = { total: {}, done: {}, value: {} };
  const addOwn = (key: string, amount: number, done = 0, quality = 0) => {
    own.total[key] = (own.total[key] || 0) + amount;
    own.done[key] = (own.done[key] || 0) + done;
    own.value[key] = (own.value[key] || 0) + done * quality;
  };
  for (const [key, amount] of Object.entries(plan.rebuild ? partOf(plan.rebuild).work : contentWork(plan)) as any) addOwn(key, amount);
  for (const item of items) if (item.rented) for (const [key, part] of Object.entries(item.kept) as any) addOwn(key, part.amount, part.amount, part.quality);
  const work: any = {};
  for (const key of DIM_KEYS) work[key] = { total: 0, done: 0, value: 0, batches: [] };
  const kind = plan.only || plan.rebuild ? 'module' : 'game';
  const project: any = {
    id, kind, name: plan.name, type: plan.type || planType(plan), scale: plan.scale || 0, parentId: plan.parentId || null,
    slots: clone(plan.slots || {}), only: plan.only ? [...plan.only] : null, rent: [...(plan.rent || [])], rebuild: plan.rebuild || null,
    parts: items.filter(item => !item.rented).map(item => item.id), own, work, base: {}, progress: 0,
    levels: Object.fromEntries(planLines(plan).map(line => [line, lineInfo(state, line).level])),
    defects: [], found: 0, repairProgress: 0,
    followers: 0, promoted: 0, invested: 0, started: day, released: null,
    checkpoints: { prototype: false, demo: false, ready: false },
    test: null, tests: 0, testCount: 0,
    sequel: plan.sequel || null, expectation: plan.expectation || 0,
    contributions: {}, priority: 0
  };
  refreshWork(state, project);
  work.stability.total = kind === 'game' ? sum(CONTENT_KEYS.map(key => work[key].total)) * TEST_SHARE : 0;
  for (const key of CONTENT_KEYS) project.base[key] = work[key].done;
  // Reused modules bring the defects they still carry; whatever was found or fixed elsewhere stays so.
  for (const partKey of project.parts) for (const defect of (state.modules?.[partKey]?.defects || [])) {
    if (defect.fixed || project.defects.some((item: any) => item.id === defect.id)) continue;
    project.defects.push({ ...defect });
    if (defect.found) project.found += 1;
  }
  project.defectMass = project.defects.length;
  return project;
}

// The cache of a live project's work: its own part plus the modules it links to, as the company has them
// today. Another project finishing a shared module shows up here the next day.
function refreshWork(state: any, project: any) {
  if (project.released || !project.own) return;
  for (const key of CONTENT_KEYS) {
    let total = project.own.total[key] || 0;
    let done = project.own.done[key] || 0;
    let value = project.own.value[key] || 0;
    for (const id of project.parts || []) {
      const amount = partOf(id)?.work[key] || 0;
      if (!amount) continue;
      const record = (state.modules || {})[id];
      const have = Math.min(amount, record?.done?.[key] || 0);
      total += amount;
      done += have;
      value += have > 0 ? (record.value[key] || 0) * have / record.done[key] : 0;
    }
    const work = project.work[key];
    if (Math.abs(work.total - total) > 0.0001 || Math.abs(work.done - done) > 0.0001 || Math.abs(work.value - value) > 0.01) {
      work.total = total;
      work.done = done;
      work.value = value;
      work.batches = done > 0 ? [{ amount: done, quality: value / done }] : [];
    }
  }
}

// New work in a dimension goes to whatever still needs it there, in proportion to what each has left:
// the project's own part and every unfinished module it links to. Returns who got how much.
function creditWork(state: any, project: any, key: string, amount: number, quality: number) {
  if (project.released || !project.own) return [];
  const owners: any[] = [];
  const ownLeft = (project.own.total[key] || 0) - (project.own.done[key] || 0);
  if (ownLeft > 0.0001) owners.push({ id: null, left: ownLeft });
  for (const id of project.parts || []) {
    const total = partOf(id)?.work[key] || 0;
    const left = total - ((state.modules || {})[id]?.done?.[key] || 0);
    if (left > 0.0001) owners.push({ id, left });
  }
  const room = sum(owners.map(owner => owner.left));
  if (room <= 0) return [];
  const given: any[] = [];
  for (const owner of owners) {
    const share = Math.min(owner.left, amount * owner.left / room);
    if (share <= 0) continue;
    if (owner.id === null) {
      project.own.done[key] = (project.own.done[key] || 0) + share;
      project.own.value[key] = (project.own.value[key] || 0) + share * quality;
    } else {
      const record = moduleRecord(state, owner.id);
      record.done[key] = (record.done[key] || 0) + share;
      record.value[key] = (record.value[key] || 0) + share * quality;
    }
    given.push({ id: owner.id, amount: share });
  }
  project.lastOwners = { ...(project.lastOwners || {}), [key]: given };
  return given;
}

// Rework raises the score of finished work; the gain goes back to the module records in proportion to
// what each holds, so a better engine stays better for every later title.
function creditRework(state: any, project: any, key: string, gain: number) {
  if (project.released || !project.own || gain <= 0) return;
  const holders: any[] = [];
  if ((project.own.done[key] || 0) > 0) holders.push({ id: null, done: project.own.done[key] });
  for (const id of project.parts || []) {
    const done = Math.min(partOf(id)?.work[key] || 0, (state.modules || {})[id]?.done?.[key] || 0);
    if (done > 0) holders.push({ id, done });
  }
  const total = sum(holders.map(holder => holder.done));
  for (const holder of holders) {
    const share = gain * holder.done / total;
    if (holder.id === null) project.own.value[key] = Math.min(project.own.done[key] * 100, project.own.value[key] + share);
    else {
      const record = moduleRecord(state, holder.id);
      record.value[key] = Math.min(record.done[key] * 100, (record.value[key] || 0) + share);
    }
  }
}

// Defects of a module are the module's: found anywhere, they are known everywhere. A fix reaches the
// library and every title still in the making at once; a shipped title only takes it in with a patch.
function shareDefects(state: any) {
  const status = new Map<string, any>();
  const lists = [...state.projects.map((project: any) => project.defects), ...Object.values(state.modules || {}).map((record: any) => record.defects || [])];
  for (const list of lists) for (const defect of list) {
    if (!defect.module) continue;
    const seen = status.get(defect.id) || { found: false, fixed: false };
    seen.found = seen.found || defect.found;
    seen.fixed = seen.fixed || defect.fixed;
    status.set(defect.id, seen);
  }
  for (const project of state.projects) for (const defect of project.defects) {
    const seen = defect.module && status.get(defect.id);
    if (!seen) continue;
    if (seen.found && !defect.found) { defect.found = true; if (!defect.fixed) project.found += 1; }
    if (seen.fixed && !defect.fixed && !project.released) { defect.fixed = true; if (defect.found) project.found = Math.max(0, project.found - 1); }
  }
  for (const record of Object.values(state.modules || {}) as any[]) for (const defect of record.defects || []) {
    const seen = status.get(defect.id);
    if (seen) { defect.found = seen.found; defect.fixed = seen.fixed; }
  }
}

// How far a project is, counting only its own work: reused modules shorten it, they never fill it.
// Testing is one of the six work items, so 100% means all six are done — a title nobody tested stays
// short of the end of the bar until someone is put on testing.
function progressOf(project: any) {
  const base = project.base || {};
  const left = sum(DIM_KEYS.map(key => Math.max(0, workOf(project, key).total - Math.max(base[key] || 0, workOf(project, key).done))));
  const span = sum(DIM_KEYS.map(key => Math.max(0, workOf(project, key).total - (base[key] || 0))));
  return span <= 0.0001 ? 1 : clamp(1 - left / span, 0, 1);
}

export function createStudio(seed = Date.now()) {
  const state: any = {
    version: 9, rulesRevision: 10, seed: seed >>> 0, day: 1, company: '', cash: START_CASH, founder: 'code',
    staff: [], projects: [], catalog: [], candidates: {}, modules: {}, tags: {}, licenses: {}, unlocked: {}, rentLog: {},
    event: null, over: false, accrued: 0,
    ledger: { opening: START_CASH, income: 0, expense: 0, payroll: 0 },
    report: null, reports: [], history: [], tutorial: { skipped: false, seen: {} }, notices: {}, bridgeUsed: false, lastRelease: null,
    office: 0, goals: { firstRelease: null, breakEven: null, moved: null, topTen: null, award: null, expanded: null }, fans: 0, feed: [],
    overtime: {}, outing: { charges: 1, next: 1 + OUTING_RECHARGE, last: null, resume: null, paused: {}, pending: null, history: [] }, sound: true, exhibitions: [], awards: [], rankings: [], operation: null,
    eventNext: 60, eventSeen: {}, schedule: [], talents: [], flags: {}, achievements: {}, playSeconds: 0,
    rating: { score: 0, watch: false, promotedAt: 0, history: [] }
  };
  seedTags(state);
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
  studioLog(state, label, `支付 ${moneyText(amount)}。`);
}

// A person's default work is the item they are best at among their trade's work keys. Coders and
// designers have two home trades, so the old "first home key" rule made half of them default to the
// item they are weaker at — "do your trade" has to mean "do what you are good at".
// Ties keep the trade order so the pick is stable. Old saves may store a home that is not a work key
// (test used to store 'stability'); the trade list is always filtered through WORK_KEYS, so those
// saves still default to something real.
export function homeWork(person: any) {
  const trade = (ROLES[person.role]?.home || []).filter((key: string) => WORK_KEYS.includes(key));
  const pool = trade.length ? trade : WORK_KEYS;
  const abilityOf = (key: string) => person.abilities?.[WORKS.find(work => work.key === key)?.ability] ?? 0;
  let best = pool[0];
  for (const key of pool) if (abilityOf(key) > abilityOf(best)) best = key;
  return best;
}

export function nameCompany(state: any, name: string, founder?: string, look?: any) {
  const next = studioAction(state);
  const value = String(name || '').trim().slice(0, 24);
  if (!value) throw new Error('请输入公司名称。');
  if (founder && !has(ORIGINS, founder)) throw new Error('创始人出身无效。');
  next.company = value;
  if (founder) next.founder = founder;
  if (!next.staff.length) {
    // The founder masters one thing and is plain at the rest; depth is low for everyone and comes later.
    const focus = FOUNDER_FOCUS[next.founder];
    const abilities: any = {};
    for (const key of ABILITY_KEYS) {
      const [low, high] = key === focus ? [68, 76] : key === 'depth' ? [15, 22] : key === 'discover' ? [30, 40] : [25, 38];
      abilities[key] = Math.round(low + random(next) * (high - low));
    }
    next.staff.push(freshPerson(next, {
      id: `founder-${next.seed}`, name: '创始人', role: next.founder, abilities, speed: 95, wage: 0,
      hired: true, joined: next.day, home: homeWork({ role: next.founder, abilities, home: '' }), founder: true, snap: { ...abilities },
      potential: Math.round(Math.min(98, Math.max(...ABILITY_KEYS.map(key => abilities[key])) + 8 + random(next) * 10)),
      look: look && typeof look === 'object' ? { ...look } : null
    }));
    personNote(next, next.staff[0], `创办${value}`);
    startJob(next);
  }
  studioLog(next, '工作室成立', `${value}在自家起步，先接一份委托。`);
  return next;
}

const FOUNDER_FOCUS: any = { code: 'fluidity', design: 'creativity', art: 'picture' };

// The first title needs two more lines than the opening job leaves behind: its gameplay, its engine
// and one art library. Those two start gated and are learned one at a time while the first module is
// being built, at evenly spaced progress points, so the opening wait is never a blank stretch.
function openingLines(origin: any) {
  const out: string[] = [];
  for (const line of [origin.firstCore, 'engine2d', 'pixelCharacters']) {
    if (line && line !== origin.starter && !out.includes(line) && MODULES[line]) out.push(line);
  }
  return out.slice(0, 2);
}

function learnOpeningLine(state: any, line: string) {
  if (!line || !MODULES[line] || (state.openingLearned || {})[line]) return;
  state.openingLearned = { ...(state.openingLearned || {}), [line]: state.day };
  state.unlocked = { ...(state.unlocked || {}), [line]: state.day };
  const module = MODULES[line];
  const slot = SLOTS.find(item => item.key === module.slot);
  announce(state, { kind: 'unlock', title: '边做边学', text: `解锁${module.name}：立项时${slot?.name || ''}就能选它了。`, line, amount: 0 });
  studioLog(state, `解锁${module.name}`, '做第一份委托时摸索出来的，首作能用上。');
}

// The opening job: build the starter module for a client. It pays once and the module stays.
function startJob(state: any) {
  const origin = ORIGINS[state.founder];
  if (!origin) return;
  const module = MODULES[origin.starter];
  const project = blankProject(state, `job-${state.seed}`, { name: `委托：${module.name}`, scale: 0, only: [origin.starter], type: MODULES[origin.firstCore].type }, state.day);
  project.job = { pay: origin.pay, client: origin.job, module: origin.starter, opening: true };
  const lines = openingLines(origin);
  const gates: any = {};
  for (const line of lines) gates[line] = true;
  state.openingGates = gates;
  state.openingLearned = {};
  project.unlockLines = lines;
  project.unlockAt = lines.map((_, index) => Math.round((index + 1) * 100 / (lines.length + 1)));
  state.projects.push(project);
}

// The job board: a few clients who want one module each, at a fixed fee. It pays less per person-day
// than a decent game, so it is what a studio short of money turns to; the module stays in the library.
export const JOB_RATE = 0.08;
const JOB_CLIENTS = ['一家做教育软件的公司', '隔壁的独立团队', '一家广告公司', '一位做桌游的朋友', '一家外包大厂', '本地的文旅项目'];
export function jobBoard(state: any) {
  const batch = Math.floor((state.day - 1) / 30);
  if (state.board?.batch === batch) return state.board.offers.filter((offer: any) => !offer.taken);
  return [];
}
function refreshBoard(state: any) {
  const batch = Math.floor((state.day - 1) / 30);
  if (state.board?.batch === batch || !state.company || state.office < 1) return;
  const levelOf = (line: string) => Math.min(lineTiers(line), lineInfo(state, line).level + 1, scaleOpen(state, 1) ? 2 : 1);
  const lines = Object.keys(MODULES).filter(line => moduleOpen(state, line) && !partBuilt(state, partId(line, levelOf(line))));
  const offers: any[] = [];
  for (let index = 0; index < 3 && lines.length; index += 1) {
    const line = lines.splice(Math.floor(random(state) * lines.length), 1)[0];
    const level = levelOf(line);
    const work = sum(Array.from({ length: level }, (_, index) => partId(line, index + 1)).filter(id => !partBuilt(state, id)).map(id => sum(Object.values(partOf(id).work) as number[])));
    offers.push({ id: `offer-${batch}-${index}`, line, level, pay: round(work * JOB_RATE), client: pick(state, JOB_CLIENTS) });
  }
  state.board = { batch, offers };
}

export function takeJob(state: any, id: string) {
  const next = studioAction(state);
  const offer = jobBoard(next).find((item: any) => item.id === id);
  if (!offer) throw new Error('这份委托已经不在了。');
  if (next.projects.some((project: any) => project.job)) throw new Error('手上还有一份委托没做完。');
  const module = MODULES[offer.line];
  const project = blankProject(next, `job-${next.day}-${next.seed}`, { name: `委托：${module.name}${lineTiers(offer.line) > 1 ? ` ${offer.level} 档` : ''}`, scale: offer.level - 1, only: [offer.line], type: module.type || 'action' }, next.day);
  project.job = { pay: offer.pay, client: offer.client + '想要' + module.name, module: offer.line };
  project.priority = Math.max(-1, ...projectOrder(next).map((item: any) => item.priority ?? 0)) + 1;
  next.projects.push(project);
  offer.taken = true;
  studioLog(next, '接下委托', `${offer.client}：${module.name}，做完到账 ${moneyText(offer.pay)}。`);
  return next;
}

// A module project builds lines ahead of any title (up to a tier), or rebuilds one tier from scratch to
// replace weaker work. It has no milestones and ends by itself once its work is done.
export function startModuleProject(state: any, line: string, level: number, rebuild = false) {
  const next = studioAction(state);
  if (!next.company) throw new Error('请先命名公司。');
  const module = MODULES[line];
  if (!module || !moduleOpen(next, line)) throw new Error('这个模块还不能做。');
  if (!Number.isInteger(level) || level < 1 || level > lineTiers(line)) throw new Error('档位无效。');
  if (level - 1 > 0 && !scaleOpen(next, level - 1)) throw new Error(SCALE_LOCKS[level - 1] || '这个档位还没开放。');
  const id = partId(line, level);
  if (next.projects.some((project: any) => !project.released && project.kind === 'module' && (project.rebuild === id || (project.parts || []).includes(id) && (project.only || []).includes(line)))) throw new Error('这个模块已经在做了。');
  if (rebuild && !partBuilt(next, id)) throw new Error('还没做完的模块不能重做。');
  if (!rebuild && partBuilt(next, id)) throw new Error('这一档已经做好了。');
  const name = (rebuild ? '重做：' : '研发：') + module.name + (lineTiers(line) > 1 ? ` ${level} 档` : '');
  const project = blankProject(next, `module-${next.day}-${next.seed}-${next.projects.length}`, rebuild ? { name, scale: level - 1, rebuild: id, type: module.type || 'action' } : { name, scale: level - 1, only: [line], type: module.type || 'action' }, next.day);
  project.priority = Math.max(-1, ...projectOrder(next).map((item: any) => item.priority ?? 0)) + 1;
  next.projects.push(project);
  studioLog(next, rebuild ? '重做模块' : '研发模块', `${name}：安排人手后开始，做完自动收进模块库。`);
  return next;
}

// A finished module project: built tiers stay in the library; a rebuild replaces only what it beat.
function finishModuleProject(state: any, project: any) {
  let gained: any[] = [];
  let text = '';
  if (project.rebuild) {
    const record = moduleRecord(state, project.rebuild);
    const better: string[] = [];
    for (const key of Object.keys(project.own.total)) {
      const fresh = project.own.done[key] > 0 ? project.own.value[key] / project.own.done[key] : 0;
      const old = record.done[key] > 0 ? record.value[key] / record.done[key] : 0;
      if (fresh <= old) continue;
      record.value[key] = record.done[key] * fresh;
      better.push(`${DIMENSIONS.find(item => item.key === key)?.name} ${Math.round(old)} → ${Math.round(fresh)}`);
    }
    // The rebuilt module carries only the defects the rebuild itself left.
    if (better.length) record.defects = project.defects.filter((defect: any) => !defect.fixed).map((defect: any) => ({ ...defect, module: project.rebuild }));
    text = better.length ? `质量提高：${better.join('、')}。之后用它的作品都会受益，已发售的作品不变。` : '这次没有做得比原来好，原来的成果保留。';
  } else {
    gained = keepModules(state, project);
    text = '做好的模块已经收进模块库，之后立项会直接用上。';
  }
  state.projects = state.projects.filter((item: any) => item.id !== project.id);
  announce(state, { kind: 'notice', title: `${project.name}完成`, text, amount: 0 });
  studioLog(state, `${project.name}完成`, text);
  return gained;
}

// Licensing a built line to other studios: steady money each month, but rivals using it crowd its tags.
export function setLicense(state: any, line: string, on: boolean) {
  const next = studioAction(state);
  if (!MODULES[line]) throw new Error('模块不存在。');
  next.licenses = next.licenses || {};
  if (on) {
    if (next.office < LICENSE_OFFICE) throw new Error(`搬进${OFFICES[LICENSE_OFFICE].name}后才能授权。`);
    if (!lineInfo(next, line).level) throw new Error('做好的模块才能授权。');
    next.licenses[line] = next.day;
  } else delete next.licenses[line];
  studioLog(next, on ? '授权模块' : '收回授权', `${MODULES[line].name}${on ? `授权给其他工作室，每月按档位收 ${moneyText(LICENSE_INCOME)} 起` : '不再授权'}。`);
  return next;
}

// Delivering a job: the client pays and the module joins the library. The opening job also rents the
// hut, which is when the studio can hire and starts paying rent.
function finishJob(state: any, project: any) {
  const gained = keepModules(state, project);
  const pay = project.job.pay;
  state.cash = round(state.cash + pay);
  state.ledger.income = round(state.ledger.income + pay);
  state.projects = state.projects.filter((item: any) => item.id !== project.id);
  const name = MODULES[project.job.module].name;
  studioLog(state, '委托完成', `交付${name}，收入 ${moneyText(pay)}；${name}留在了模块库里。`);
  if (!project.job.opening) {
    announce(state, { kind: 'settle', title: '委托完成', text: `交付${name}，到账 ${moneyText(pay)}`, amount: pay });
    return;
  }
  // Whatever the opening job was going to teach and has not yet, it teaches now: the first title
  // must never start with one of its required lines still gated.
  while ((project.unlockLines || []).length) learnOpeningLine(state, project.unlockLines.shift());
  project.unlockAt = [];
  const moved = state.office < 1;
  if (moved) state.office = 1;
  if (moved) studioLog(state, `租下${OFFICES[1].name}`, `${OFFICES[1].seats} 个工位，月租 ${moneyText(OFFICES[1].rent)}。`);
  if (moved) announce(state, { kind: 'office', title: `搬进${OFFICES[1].name}，正式创业啦`, text: `${OFFICES[1].seats} 个工位，可以招人做自己的游戏了。`, amount: 0 });
  state.event = { id: 'job', title: '委托完成', text: `客户收下了${name}，付了 ${moneyText(pay)}。这块模块也留在了你手里：首作会直接用上它，不用再做一遍。${moved ? `搬进${OFFICES[1].name}，正式创业啦！${OFFICES[1].seats} 个工位，月租 ${moneyText(OFFICES[1].rent)}，可以招人了。` : ''}`, gained, choices: [{ id: 'continue', title: '开始做自己的游戏', detail: '立项时会自动用上已有的模块。' }] };
}

export function channelOpen(state: any, channel: string) {
  if (channel === 'web') return state.goals.firstRelease !== null;
  if (channel === 'headhunt') return state.office >= 2;
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
// Programmers and designers have two trade abilities. A third of them lead with depth, so with an even
// mix of the two the leading creativity, depth and fluidity come up about equally often.
const LEAD_SPLIT: any = { code: ['fluidity', 'depth'], design: ['creativity', 'depth'] };

function leadAbility(state: any, role: string) {
  const split = LEAD_SPLIT[role];
  if (split) return random(state) < 2 / 3 ? split[0] : split[1];
  const prior = ROLES[role].prior;
  return [...ABILITY_KEYS].sort((left, right) => prior[right][1] - prior[left][1])[0];
}

function pickAbilities(state: any, role: string, channel: any) {
  const prior = ROLES[role].prior;
  const [low, high] = CHANNEL_PEAK[channel];
  const abilities: any = {};
  for (const key of ABILITY_KEYS) abilities[key] = Math.round(clamp(prior[key][0] * 0.55 + random(state) * 14, 5, 45));
  const ranked = [...ABILITY_KEYS].sort((left, right) => prior[right][1] - prior[left][1]);
  // A trade ability is always the strongest. A few also have a decent side skill outside the trade,
  // like a programmer with an ear for music — useful as a stand-in, never better than the day job.
  const primary = leadAbility(state, role);
  const peak = Math.round(low + random(state) * (high - low));
  abilities[primary] = peak;
  for (const key of ABILITY_KEYS) if (key !== primary) abilities[key] = Math.min(abilities[key], peak - 2);
  const trade = ranked.slice(0, 2).find(key => key !== primary);
  const second = random(state) < 0.12 ? pick(state, ranked.slice(2)) : random(state) < 0.4 ? trade : null;
  if (second) abilities[second] = Math.max(abilities[second], Math.round(peak - 8 - random(state) * 10));
  return abilities;
}

function potentialFor(state: any, abilities: any, channel: string) {
  const peak = Math.max(...ABILITY_KEYS.map(key => abilities[key]));
  return Math.round(clamp(peak + 4 + random(state) * (POTENTIAL_ROOM[channel] || 20), peak + 4, 98));
}

// Ability labels come from the numbers, so a new hire only rolls character: rarer traits less often.
function rollTags(state: any, channel = 'friends') {
  const count = random(state) < 0.25 ? 0 : random(state) < 0.67 ? 1 : 2;
  const tags: any[] = [];
  if (random(state) < (RARE_CHANCE[channel] || 0.02)) tags.push({ kind: 'rare', key: pickByRarity(state, Object.keys(RARE_TAGS).map(key => ({ key, rank: RARE_TAGS[key].rarity }))).key });
  const personality = Object.keys(PERSONALITY_TAGS).map(key => ({ key, rank: PERSONALITY_TAGS[key].warn ? 1 : PERSONALITY_TAGS[key].rarity }));
  for (let index = 0; index < count; index += 1) {
    const options = personality.filter(item => !tags.some(tag => tag.key === item.key));
    tags.push({ kind: 'personality', key: pickByRarity(state, options).key });
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

// What this channel's shortlist typically asks per month. It is the same formula publishRecruitment
// uses, read at the bottom and the top of the channel's ability and speed bands, so the quote under
// the channel tabs never drifts from the wages on the cards.
export function channelWageRange(channel: string) {
  const source = CHANNELS[channel];
  if (!source) return { low: 0, high: 0 };
  const [lowPeak, highPeak] = CHANNEL_PEAK[channel] || CHANNEL_PEAK.friends;
  const [lowSpeed, highSpeed] = source.speed;
  const wage = (peak: number, speed: number) => source.wage[0] + peak * source.wage[1] + (speed - lowSpeed) * source.wage[2];
  return { low: round(wage(lowPeak, lowSpeed)), high: round(wage(highPeak, highSpeed) + source.wage[3]) };
}

// A star is a specialist at the top of one trade, not good at everything.
function starFrom(state: any, role: string, talent: any = null) {
  const prior = ROLES[role].prior;
  const abilities: any = {};
  for (const key of ABILITY_KEYS) abilities[key] = Math.round(clamp(prior[key][0] * 0.6 + random(state) * 16, 5, 55));
  const primary = talent?.primary || leadAbility(state, role);
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
    const tags = rollTags(next, channel);
    const speed = Math.round(source.speed[0] + random(next) * (source.speed[1] - source.speed[0]));
    const strongest = ABILITY_KEYS.reduce((best, item) => abilities[item] > abilities[best] ? item : best, ABILITY_KEYS[0]);
    const name = FAMILY_NAMES[Math.floor(random(next) * FAMILY_NAMES.length)] + GIVEN_NAMES[Math.floor(random(next) * GIVEN_NAMES.length)];
    const wage = round(source.wage[0] + abilities[strongest] * source.wage[1] + (speed - source.speed[0]) * source.wage[2] + random(next) * source.wage[3]);
    return freshPerson(next, { id: `${role}-${channel}-${batch}-${index}-${next.seed}`, name, role, abilities, speed, tags, wage, hired: false, potential: potentialFor(next, abilities, channel) });
  });
  // Three candidates, three independent rolls. Odds are per person and scale with star level and
  // channel: at five stars an industry referral gives each candidate a 1-in-10 chance. A shortlist
  // can therefore contain more than one famous name.
  if (next.notices.fameRoll) delete next.notices.fameRoll; // leftover per-period flag from old saves
  const chance = fameChance(next, channel);
  const promised = !!next.notices.fameNext && channel === 'headhunt';
  const stars = people.filter(() => chance > 0 && random(next) < chance);
  // An event promising a name is spent on the next industry-referral shortlist, and makes sure of it.
  if (promised) {
    if (!stars.length) stars.push(people[Math.floor(random(next) * people.length)]);
    delete next.notices.fameNext;
  }
  const freeTalents = (next.talents || []).filter((item: any) => item.status === 'free' && item.role === role);
  stars.forEach((star: any, index: number) => {
    // They want their own people and take a while to settle in. A free agent the player has read
    // about in the news takes one of the slots when there is one available.
    const talent = freeTalents[index] || null;
    star.abilities = starFrom(next, role, talent);
    if (talent) { star.name = talent.name; star.talent = talent.id; star.story = `${dateText(talent.since)}新闻：${talent.title}`; }
    star.potential = Math.max(...ABILITY_KEYS.map(item => star.abilities[item])) + 2;
    star.speed = Math.min(140, star.speed + 12);
    star.wage = round(star.wage * 1.6);
    star.fame = true;
    star.rampup = 30;
    star.tags = [...star.tags.filter((tag: any) => tag.kind !== 'ability').slice(0, 2), { kind: 'personality', key: 'eager' }];
    // A name comes with terms: half of them insist on bringing an old crewmate, the rest only take
    // the genre they are known for.
    star.condition = random(next) < 0.5 ? 'crew' : 'type:' + Object.keys(TYPES)[Math.floor(random(next) * Object.keys(TYPES).length)];
  });
  next.candidates[key] = { batch, people };
  studioLog(next, '发布招聘', `${source.name}送来 ${people.length} 份${ROLES[role].name}简历，名单保持 ${Math.max(1, (batch + 1) * 14 - next.day)} 天。`);
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
  if (talent && talent.status !== 'free') reasons.push(talent.status === 'hired' ? `${person.name}已经加入了本社。` : `${person.name}已经加入了${talent.studioName}。`);
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
      role, abilities, speed: 95, wage: round(1.4 + random(next)), hired: true, joined: next.day, home: homeWork({ role, abilities, home: '' }),
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

// A raise is the player's own gesture: the wage goes up for good and the person may grow a new side of
// themselves. Nobody asks for one, and not giving it costs nothing.
export const RAISE_STEP = 0.1;
export const RAISE_MAX = 3;
export const RAISE_AWAKEN = 0.3;
export function raiseOffer(state: any, id: string) {
  const person = state.staff.find((item: any) => item.id === id);
  if (!person) return null;
  const count = person.raises || 0;
  const traits = Object.keys(PERSONALITY_TAGS).filter(key => !PERSONALITY_TAGS[key].warn && !person.tags.some((tag: any) => tag.key === key));
  const reason = person.founder ? '创始人不领工资。' : count >= RAISE_MAX ? `已经涨过 ${RAISE_MAX} 次了。` : '';
  return { count, wage: round(person.wage * (1 + RAISE_STEP)), chance: traits.length ? RAISE_AWAKEN : 0, reason, available: !reason };
}

export function raiseWage(state: any, id: string) {
  const offer = raiseOffer(state, id);
  if (!offer) throw new Error('员工不存在。');
  if (!offer.available) throw new Error(offer.reason);
  const next = studioAction(state);
  const person = next.staff.find((item: any) => item.id === id);
  const before = person.wage;
  person.wage = offer.wage;
  person.raises = offer.count + 1;
  personNote(next, person, `涨薪：月薪 ${moneyText(before)} → ${moneyText(offer.wage)}`);
  studioLog(next, `给${person.name}涨薪`, `月薪 ${moneyText(before)} → ${moneyText(offer.wage)}。`);
  if (random(next) < offer.chance) {
    const options = Object.keys(PERSONALITY_TAGS).filter(key => !PERSONALITY_TAGS[key].warn && !person.tags.some((tag: any) => tag.key === key)).map(key => ({ key, rank: PERSONALITY_TAGS[key].rarity }));
    const key = pickByRarity(next, options).key;
    applyGain(next, person, { kind: 'trait', key }, '涨薪后');
    announce(next, { kind: 'record', title: `${person.name}觉醒「${PERSONALITY_TAGS[key].name}」`, text: PERSONALITY_TAGS[key].text, amount: 0 });
  } else announce(next, { kind: 'notice', title: `给${person.name}涨了薪`, text: `月薪 ${moneyText(offer.wage)}`, amount: 0 });
  return next;
}

function able(person: any, ability: string) {
  // Stress labels lower ability: that is the only form stress takes.
  const penalty = person.stressTags.includes('leaving') ? 0.75 : person.stressTags.includes('tired') ? 0.85 : 1;
  return person.abilities[ability] * penalty;
}

// Whoever leaves takes their mentoring and overtime with them.
function departed(state: any, person: any) {
  delete state.overtime[person.id];
  for (const other of state.staff) if (other.mentor?.by === person.id) endMentoring(state, other, `${person.name}离开了公司`);
}

// Every mentoring stint ends with a line on both records saying how far the ability moved during it.
function endMentoring(state: any, person: any, reason: string) {
  const pair = person.mentor;
  if (!pair) return;
  const mentor = state.staff.find((item: any) => item.id === pair.by);
  const name = ABILITIES.find(item => item.key === pair.ability)?.name;
  const now = Math.round(person.abilities[pair.ability]);
  const change = typeof pair.start === 'number' ? `${name} ${Math.round(pair.start)} → ${now}（+${Math.max(0, now - Math.round(pair.start))}）` : `${name}现在 ${now}`;
  const days = Math.max(0, state.day - (pair.since || state.day));
  personNote(state, person, `带教结束（${reason}）：${days} 天，${change}`);
  if (mentor) personNote(state, mentor, `带${person.name}的${name}结束：${days} 天，${change}`);
  announce(state, { kind: 'record', title: `${person.name} 带教结束`, text: `${reason}。${days} 天里${change}`, amount: 0 });
  studioLog(state, `${person.name} 带教结束`, `${reason}。${days} 天，${change}。`);
  person.mentor = null;
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

// Daily mentoring gain: proportional to the gap, so a big gap closes fast and the last points come slowly;
// half speed above the mentee's own potential. Within half a point counts as caught up.
export const mentorDaily = (gap: number) => clamp(gap * 0.03, 0.01, 0.6);

export function mentorGain(state: any, person: any) {
  const pair = mentorActive(state, person);
  if (!pair) return 0;
  const target = pair.mentor.abilities[pair.ability];
  const value = person.abilities[pair.ability];
  if (value >= target - 0.5) return 0;
  const coach = boostFactor(state, pair.project, 'coach');
  return round(mentorDaily(target - value) * (value >= (person.potential ?? 100) ? 0.5 : 1) * coach * 1000) / 1000;
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
    // An empty list is a real choice (that person idles here), so it still pins them to this project.
    if (assignmentGiven(other, person)) return other.id === project.id;
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
// person does their home work; an explicit list replaces that default instead of adding to it — and
// an explicit empty list means the player told this person to do nothing at all.
// Assignment lists live in saves, so tolerate values written by older builds. In particular, Cocos
// used to transpile `[...new Set(list)]` into `[].concat(new Set(list))`, which stored a Set object
// instead of strings; after JSON serialisation it became `{}`. Ignore anything that is not a work key
// and never let a malformed list hide the person's default home work.
export function chosenWorks(project: any, person: any) {
  const explicit = project?.assignments?.[person.id];
  if (!Array.isArray(explicit)) return [];
  return Array.from(new Set(explicit.filter((key: string) => WORK_KEYS.includes(key))));
}

// Did the player ever set this person's work in this project? An empty array counts: idle is a choice,
// not "no choice yet". A malformed legacy value (`{}` from the old Set bug) does not count.
export function assignmentGiven(project: any, person: any) {
  return Array.isArray(project?.assignments?.[person.id]);
}

export function assignedWorks(project: any, person: any) {
  return assignmentGiven(project, person) ? chosenWorks(project, person) : [homeWork(person)];
}

export function personWorks(state: any, project: any, person: any) {
  return belongsTo(state, project, person) ? assignedWorks(project, person) : [];
}

export function personActivity(state: any, project: any, person: any) {
  if (!belongsTo(state, project, person)) return '未参与本项目';
  if (person.leaveUntil > state.day) return '外出中（团建或活动）';
  // Idle people are still part of the project — they just produce nothing.
  if (!assignedWorks(project, person).length) return '空闲（不做工作，工资照付）';
  if (project.patch) return patchProgress(project).fixed < project.patch.targets.length ? '补丁：修复已报告缺陷' : '补丁：返工' + (DIMENSIONS.find(item => item.key === project.patch.rework)?.name || '');
  if (project.fixFirst && fixTargets(project, person).length) return '先修复自己那一项的缺陷';
  const split = assignDay(state, project, person);
  if (split.repair) return '自动修复待修缺陷（消耗工时）';
  const busy = Object.keys(split);
  if (!busy.length) return '空闲（不做工作，工资照付）';
  // Finished items drop out of the split; with everything done `split` is empty and the branch above
  // has already reported the person as idle, so whatever is left here is always real work.
  const label = (key: string) => key === 'discover' ? '测试' : `${DIMENSIONS.find(item => item.key === key)?.name}制作`;
  return busy.map(label).join('、');
}

function assignDay(state: any, project: any, person: any) {
  const usable = assignedWorks(project, person);
  // Nothing assigned: no output at all. Without this guard an idle person still picked up defect repair.
  if (!usable.length) return {};
  const pending = usable.some(key => remainingOf(project, key) > 0.0001);
  if (!pending && project.defects.some((defect: any) => defect.found && !defect.fixed)) return { repair: 1 };
  const remaining: any = {};
  const open: string[] = [];
  // One threshold both here and in `pending`: the box that counts as finished must be the box that
  // stops taking time, otherwise a sliver of work keeps soaking up a share of the day.
  for (const key of usable) {
    const left = remainingOf(project, key);
    if (left > 0.0001) { remaining[key] = left; open.push(key); }
  }
  // Finished items stop taking time. When every assigned item is done and no defect is waiting, the
  // person idles instead of quietly reworking a finished dimension.
  const list = open;
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

// How much of one work item is still to do. A finished item keeps its place in the assignment list,
// but it no longer takes any of the day: `assignDay` only splits time across items still open.
export function workLeft(project: any, workKey: string) {
  return remainingOf(project, workKey);
}

// A finished item's share is not wasted: the leftover hours go to this person's other open items
// first, and only when nothing is left open do they turn into repairs or rework. Without this the
// overflow of a nearly-finished item was spent reworking that same item while a teammate's item
// sat unfinished — the exact "still working on something already done" the player sees.
function spreadSpare(state: any, project: any, person: any, budget: number, skipKey: string, factor: number, growth: number, defects: number) {
  let left = budget;
  for (const key of assignedWorks(project, person)) {
    if (left <= 0.0001) break;
    if (key === skipKey || key === 'repair') continue;
    const work = WORKS.find(item => item.key === key);
    if (!work) continue;
    const room = remainingOf(project, key);
    if (room <= 0.0001) continue;
    const amount = Math.min(left, room);
    const quality = Math.min(100, able(person, work.ability) + rareBonus(state, project, work.dimension));
    recordWork(project, person, work.dimension, amount, quality, state);
    if (work.dimension !== 'stability') addDefect(project, person, work.dimension, amount * (100 - quality) / 100 * DEFECT_RATE * defects, state);
    practice(person, work.ability, amount, growth);
    left -= amount;
  }
  return budget - left;
}

// Six scores: the finished work's average ability times the progress of its dimension. Progress is
// never capped, and rework replaces the weakest finished part, so a score creeps toward the reworker.
function dimensionScore(work: any) {
  if (work.done <= 0 || work.total <= 0) return 0;
  return work.value / work.total;
}

// Test coverage: the testing workload scored like any other work, plus what playtests added, read as a
// share from 0 to 0.95. Nothing is ever fully covered.
export const COVERAGE_CAP = 0.95;
function coverage(project: any) {
  return clamp(dimensionScore(workOf(project, 'stability')) / 100 + (project.playCover || 0), 0, COVERAGE_CAP);
}

// Stability starts at zero and follows coverage. The covered part is expected to hold coverage × density
// of the defects (density = defects made over the most the content could hold, counted smoothly), and
// each fixed defect wins back its share. Finding a defect never lowers it, so with no fixes it only rises
// with coverage, every fix raises it, and with every found defect fixed it reaches coverage.
function stabilityFrom(project: any) {
  const room = CONTENT_KEYS.reduce((total, key) => total + workOf(project, key).done, 0) * DEFECT_RATE * OVERTIME_DEFECT;
  const cover = coverage(project) * 100;
  if (room <= 0) return round(cover);
  const density = Math.min(1, (project.defectMass ?? project.defects.length) / room);
  const fixed = project.defects.filter((defect: any) => defect.found && defect.fixed).length;
  return round(clamp(cover * (1 - density) + fixed / room * 100, 0, cover));
}

function overallOf(type: string, dimensions: any) {
  const weights = TYPES[type].weights;
  return round(DIM_KEYS.reduce((total, key) => total + dimensions[key] * weights[key], 0));
}

export function projectMetrics(project: any) {
  const dimensions: any = {};
  for (const key of CONTENT_KEYS) dimensions[key] = round(clamp(dimensionScore(workOf(project, key)), 0, 100));
  const open = project.defects.filter((defect: any) => !defect.fixed).length;
  const known = project.defects.filter((defect: any) => defect.found && !defect.fixed).length;
  dimensions.stability = stabilityFrom(project);
  const progress = progressOf(project);
  return {
    progress: round(progress * 100),
    dimensions, overall: overallOf(project.type, dimensions),
    defects: open, known, found: project.found, coverage: round(coverage(project) * 100),
    unfinished: DIM_KEYS.filter(key => workOf(project, key).done < workOf(project, key).total - 0.001)
  };
}

// The player's view is the scored view: stability only counts what testing found. Hidden defects still
// exist and surface after launch, when players report them.
export function visibleMetrics(project: any) {
  const metrics = projectMetrics(project);
  return { ...metrics, untested: coverage(project) <= 0, defects: metrics.known };
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
  let testHands = 0;
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
    if (key === 'stability') testHands = hands;
    if (!hands || remaining <= 0.0001) { out[key] = dimensionScore(work); continue; }
    out[key] = round(clamp((work.value + remaining * (weighted / hands)) / work.total, 0, 100));
  }
  // The dashed stability line is where today's team would land by finishing the remaining test work
  // and clearing what it finds: the coverage the projected test score reaches, with no open defects.
  // While the game is in production it sits above the solid line — that gap is what more testing and
  // repairs can still buy. The completion bar counts all six work items, so 100% means testing is
  // done too: while any work is left there is still something to project. Only a finished, released
  // or fully tested title has nothing left, and then the dashed line meets the solid one exactly.
  const testWork = workOf(project, 'stability');
  const testLeft = Math.max(0, testWork.total - testWork.done);
  const testingLeft = testLeft > 0.0001 && testHands > 0;
  const finished = !!project.released || (progressOf(project) >= 1 - 0.000001 && !testingLeft);
  out.stability = finished
    ? stabilityFrom(project)
    : round(clamp(out.stability / 100 + (project.playCover || 0), 0, COVERAGE_CAP) * 100);
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
  // Testing is a real work item with its own person-days, so it competes for the slowest date too.
  // Reporting a bottleneck over only five rows while the sixth quietly stretched the schedule by a
  // fortnight was ambiguous: the player saw a date and a label that did not describe the same plan.
  const pending = rows.filter((row: any) => row.remaining > 0.0001);
  // Testing counts toward the 100% bar, so an unstaffed test row blocks the date just like any
  // other unstaffed dimension: the title cannot be finished until someone is put on it.
  const idle = pending.filter((row: any) => row.days === null).map((row: any) => row.key);
  const scheduled = pending.filter((row: any) => row.days !== null);
  // A bottleneck is a dimension that finishes latest. A narrow tie of two or three rows is still a
  // real bottleneck — the player has to speed all of them up — but when every row lands together the
  // day split is balanced, and naming them all would just mean "nothing stands out".
  const slowestDays = scheduled.length ? Math.max(...scheduled.map((row: any) => row.days)) : 0;
  const slowest = scheduled.filter((row: any) => row.days === slowestDays);
  const bottlenecks = scheduled.length > 1 && slowestDays > 0 && slowest.length <= 3 ? slowest.map((row: any) => row.key) : [];
  const bottleneck = bottlenecks.length ? slowest[0] : null;
  return { rows, discover: round(discover), repair: round(repair), bottleneck, bottlenecks, idle, blocked: idle.length > 0 };
}

// "稳定" as a bottleneck means the testing workload is the slowest, not that the score is low.
export function bottleneckName(key: string) {
  return key === 'stability' ? '稳定（测试）' : DIMENSIONS.find(item => item.key === key)?.name || key || '—';
}

export function projectForecast(state: any, project: any) {
  if (!project) return null;
  const pipeline = dimensionPipeline(state, project);
  const metrics = visibleMetrics(project);
  const totalRemaining = DIM_KEYS.reduce((total, key) => total + Math.max(0, workOf(project, key).total - workOf(project, key).done), 0);
  const aggregate = sum(CONTENT_KEYS.map(key => pipeline.rows.find((row: any) => row.key === key)?.rate || 0));
  // The date covers every staffed row; any unstaffed unfinished row (testing included) makes the
  // finish date unknown, because the bar cannot reach 100% until someone works on it.
  const scheduled = pipeline.rows.filter((row: any) => row.days !== null);
  const days = pipeline.idle.length ? null : scheduled.length ? Math.max(0, ...scheduled.map((row: any) => row.days || 0)) : 0;
  const done = progressOf(project);
  return { ...pipeline, days, aggregate: round(aggregate), remaining: round(totalRemaining), progress: round(done * 100), metrics, eta: days === null ? null : state.day + days };
}

export const SCALE_LOCKS = ['', '首作发售后开放中型作品。', '搬进正式办公室后开放大型作品。', '搬进写字楼整层后开放超大型作品。'];
export function scaleOpen(state: any, scale: number) {
  return scale === 0 || scale === 1 && state.goals.firstRelease !== null || scale === 2 && state.office >= 2 || scale === 3 && state.office >= 4;
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

// One press for the whole crew. Someone who promised never to work overtime again is left alone, and
// turning it off also clears the overtime an outing had paused for that person.
export function setAllOvertime(state: any, enabled: boolean) {
  const next = studioAction(state);
  if (typeof enabled !== 'boolean') throw new Error('加班安排无效。');
  const crew = next.staff.filter((person: any) => !person.noOvertime);
  for (const person of crew) {
    if (enabled) next.overtime[person.id] = true;
    else { delete next.overtime[person.id]; delete next.outing.paused[person.id]; }
  }
  studioLog(next, enabled ? '全员加班' : '全员结束加班', enabled ? '产出 +45%，缺陷更多，并会累积负面标签。' : '恢复正常工作。');
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
    mentors: state.staff.filter((other: any) => other.id !== person.id && other.abilities[ability] > person.abilities[ability] + 0.5 && project && projectOf(state, other)?.id === project.id)
      .sort((left: any, right: any) => right.abilities[ability] - left.abilities[ability])
  }));
}

export function setMentor(state: any, personId: string, mentorId: string | null, ability?: string) {
  const next = studioAction(state);
  const person = next.staff.find((item: any) => item.id === personId);
  if (!person) throw new Error('员工不存在。');
  if (!mentorId) {
    endMentoring(next, person, '手动结束');
    return next;
  }
  const mentor = next.staff.find((item: any) => item.id === mentorId);
  if (!mentor || !ability || !ABILITY_KEYS.includes(ability)) throw new Error('带教安排无效。');
  if (mentor.abilities[ability] <= person.abilities[ability] + 0.5) throw new Error('带人的一方这一项要比他高。');
  const project = projectOf(next, person);
  if (!project || projectOf(next, mentor)?.id !== project.id) throw new Error('两人需要在同一个项目里。');
  endMentoring(next, person, '换了带教');
  person.mentor = { by: mentor.id, ability, since: next.day, start: person.abilities[ability] };
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
      state.flags = { ...(state.flags || {}), mentored: state.day };
      endMentoring(state, person, `出师：${name}追上了${mentor.name}`);
    }
    if (state.day % 30 === 0) {
      person.trace = [...(person.trace || []), { day: state.day, a: { ...person.abilities } }].slice(-48);
      const tenure = state.day - (person.joined || 0);
      if (!person.boost && tenure >= 90 && random(state) < clamp((tenure - 90) / 360 * 0.06, 0, 0.1)) gainBoost(state, person, '');
      // Each grade up is drawn at its rarity weight, so gold comes up about a third as often as purple.
      else if (person.boost && (person.boostLevel || 1) < 3 && tenure >= 270 && random(state) < clamp((tenure - 270) / 360 * 0.04, 0, 0.06) * RARITY_WEIGHT[(person.boostLevel || 1) + 1] / RARITY_WEIGHT[2]) gainBoost(state, person, '');
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
  else if (outing.charges < 1) reason = `团建次数已用完，${Math.max(0, outing.next - state.day)} 天后恢复 1 次。`;
  else if (state.day < earliest) reason = `距上次团建不足 ${OUTING_GAP} 天，还要等 ${earliest - state.day} 天。`;
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
  studioLog(next, `团建 ${days} 天`, `全队停工 ${days} 天，${days} 天后回来公布结果；加班安排回来后恢复。`);
  return next;
}

// What an outing can bring someone, drawn by rarity: an unowned positive trait, a first team boost, or
// the next grade of the boost they hold. Rarer outcomes come up less often.
function outingGain(state: any, person: any) {
  const options: any[] = Object.keys(PERSONALITY_TAGS)
    .filter(key => !PERSONALITY_TAGS[key].warn && !person.tags.some((tag: any) => tag.key === key))
    .map(key => ({ key, rank: PERSONALITY_TAGS[key].rarity }));
  if (!person.boost) options.push({ boost: true, rank: 1 });
  else if ((person.boostLevel || 1) < 3) options.push({ boost: true, rank: (person.boostLevel || 1) + 1 });
  if (!options.length) return null;
  const choice = pickByRarity(state, options);
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
  if (!plan || !scaleIndex(plan.scale)) throw new Error('请选择作品体量。');
  if (!scaleOpen(next, plan.scale)) throw new Error(SCALE_LOCKS[plan.scale] || '这个体量还没开放。');
  const original = plan.sequel ? next.catalog.find((book: any) => book.id === plan.sequel) : null;
  if (plan.sequel && (!original || original.reviewScore < 70)) throw new Error('好评达到 70 分的作品才能开发续作。');
  const issue = planIssue(next, plan);
  if (issue) throw new Error(issue);
  const name = String(plan.name || '').trim().slice(0, 24);
  if (!name) throw new Error('请为作品取个名字。');
  if (next.projects.some((project: any) => !project.released && project.name === name)) throw new Error('已有同名作品在开发。');
  const project = blankProject(next, `${next.day}-${next.seed}-${next.projects.length}`, { ...plan, name, expectation: original ? (original.expectation || 0) + 4 : 0 }, next.day);
  // A title nobody has heard of opens with no audience. Only the company's existing fans carry over,
  // and only once the studio has some: a first game cannot start at a few hundred followers.
  project.followers = Math.round(next.fans * 0.2);
  // Known names bring their own audience to whatever they work on.
  const stars = next.staff.filter((person: any) => person.fame).length;
  if (stars) project.followers += stars * 260;
  project.followers += next.staff.filter((person: any) => person.tags.some((tag: any) => tag.key === 'following')).length * 200;
  if (original) project.followers += Math.round(original.followers * 0.3 + original.units * 0.1);
  const rent = planRentCost(next, plan);
  if (rent > next.cash) throw new Error(`租用需要 ${moneyText(rent)}，资金不足。`);
  project.invested = payRent(next, plan, name);
  // Something new may come up while the title is being made: one or two moments between 30% and 70%.
  const moments = random(next) < 0.5 ? 1 : 2;
  project.unlockAt = Array.from({ length: moments }, (_, index) => Math.round(30 + (index + random(next)) * 40 / moments));
  project.priority = Math.max(-1, ...projectOrder(next).map((item: any) => item.priority ?? 0)) + 1;
  next.projects.push(project);
  if (priority >= 0) return setPriority(next, project.id, priority);
  studioLog(next, '新作立项', `《${name}》面向${TYPES[project.type].audience}，${SCALES[plan.scale].name}作品。`);
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
  studioLog(next, '调整分工', `${person.name} 参与《${project.name}》：${list.length ? list.map(key => WORKS.find(work => work.key === key)?.name).join('、') : '空闲（不做任何工作）'}。`);
  return next;
}

// 分工开关只有一个入口：按当前存档里的分工取反。
// 关掉最后一项就是「空闲」——空表会原样存下来，不再自动回落到本行，这是玩家明确的选择。
// 界面只传“谁、哪个项目、点了哪项”，不要再自己拼一份名单——拼错就会写成空表，
// 表现就是点了不亮、本职也不亮、后面怎么点都不亮。
export const ASSIGN_REVISION = 'assign-v3';

export function toggleAssign(state: any, projectId: string, personId: string, workKey: string) {
  if (!WORK_KEYS.includes(workKey)) throw new Error('工作类型无效。');
  const project = state.projects.find((item: any) => item.id === projectId);
  const person = state.staff.find((item: any) => item.id === personId);
  if (!project) throw new Error('项目不存在，请返回重进。');
  if (!person) throw new Error('员工不存在，请返回重进。');
  const current: string[] = assignedWorks(project, person);
  const next = current.includes(workKey) ? current.filter((key: string) => key !== workKey) : [...current, workKey];
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
// Bringing a shipped title up to date with the library is a small fixed job of its own.
export const SYNC_WORK = 2;

// Defects fixed anywhere: in the library or in any title.
function fixedIds(state: any) {
  const out = new Set<string>();
  for (const record of Object.values(state.modules || {}) as any[]) for (const defect of record.defects || []) if (defect.fixed) out.add(defect.id);
  for (const project of state.projects) for (const defect of project.defects) if (defect.fixed && defect.module) out.add(defect.id);
  return out;
}

// The quality of each module a title links to, as the library has it today.
function moduleQuality(state: any, project: any) {
  const out: any = {};
  for (const id of project.parts || []) {
    const record = (state.modules || {})[id];
    if (!record) continue;
    out[id] = {};
    for (const key of Object.keys(record.done || {})) if (record.done[key] > 0) out[id][key] = record.value[key] / record.done[key];
  }
  return out;
}

// What a shipped title would take in from the library at its next patch: modules that got better since it
// shipped and defects already fixed in other titles. Until then the title keeps what it shipped with;
// rented lines never change.
export function syncPreview(state: any, project: any) {
  const now = moduleQuality(state, project);
  const gains: any = {};
  const better: string[] = [];
  for (const id of project.parts || []) {
    const part = partOf(id);
    if (!part || !now[id]) continue;
    let improved = false;
    for (const [key, amount] of Object.entries(part.work) as any) {
      const then = project.synced?.[id]?.[key];
      const today = now[id][key];
      if (!amount || then === undefined || today === undefined || today < then + 0.5) continue;
      gains[key] = (gains[key] || 0) + amount * (today - then);
      improved = true;
    }
    if (improved && !better.includes(MODULES[part.line].name)) better.push(MODULES[part.line].name);
  }
  const done = fixedIds(state);
  const fixed = project.defects.filter((defect: any) => defect.module && !defect.fixed && done.has(defect.id)).map((defect: any) => defect.id);
  const trial = clone(project);
  applySync(trial, { gains, fixed });
  const before = projectMetrics(project).overall;
  return { gains, fixed, better, before, after: projectMetrics(trial).overall, any: better.length > 0 || fixed.length > 0 };
}

function applySync(project: any, sync: any) {
  for (const [key, gain] of Object.entries(sync.gains) as any) {
    const work = workOf(project, key);
    if (work.done <= 0) continue;
    work.value = Math.min(work.done * 100, work.value + gain);
    work.batches = [{ amount: work.done, quality: work.value / work.done }];
  }
  for (const defect of project.defects) {
    if (!sync.fixed.includes(defect.id) || defect.fixed) continue;
    defect.fixed = true;
    if (defect.found) project.found = Math.max(0, project.found - 1);
  }
}

export function patchPlan(state: any, project: any, rework: string | null, sync = false) {
  const targets = project.defects.filter((defect: any) => defect.found && !defect.fixed);
  const reworkTotal = rework ? round(workOf(project, rework).total * PATCH_REWORK) : 0;
  const repairWork = sum(targets.map((defect: any) => (REPAIR_WORK - (defect.repairWork || 0)) / 0.75));
  return { targets: targets.length, reworkTotal, work: round(repairWork + reworkTotal + (sync ? SYNC_WORK : 0)) };
}

export function startPatch(state: any, projectId: string, rework: string | null = null, sync = false) {
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && item.released);
  if (!project) throw new Error('作品不存在。');
  if (project.patch) throw new Error('这部作品已有补丁在制作。');
  if (rework && !CONTENT_KEYS.includes(rework)) throw new Error('返工项目无效。');
  if (sync && !syncPreview(next, project).any) throw new Error('现在没有可同步的更新。');
  const targets = project.defects.filter((defect: any) => defect.found && !defect.fixed).map((defect: any) => defect.id);
  if (!targets.length && !rework && !sync) throw new Error('目前没有玩家报告的缺陷；选一项返工或同步更新才能开补丁。');
  const book = next.catalog.find((item: any) => item.id === projectId);
  const metrics = projectMetrics(project);
  project.patch = {
    started: next.day, rework, targets, reworkTotal: rework ? round(workOf(project, rework).total * PATCH_REWORK) : 0, reworkDone: 0,
    sync, syncDone: 0,
    before: { overall: metrics.overall, review: book ? book.reviewScore : null, daily: book ? book.lastDayUnits : 0 }
  };
  project.assignments = {};
  project.priority = Math.max(-1, ...projectOrder(next).map((item: any) => item.priority ?? 0)) + 1;
  const scope = [targets.length ? `修复 ${targets.length} 项已报告缺陷` : '', rework ? `返工${DIMENSIONS.find(item => item.key === rework)?.name}` : '', sync ? '同步更新' : ''].filter(Boolean).join('，');
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
  const syncTotal = patch.sync ? SYNC_WORK : 0;
  const syncLeft = Math.max(0, syncTotal - (patch.syncDone || 0));
  const total = sum(targets.map(() => REPAIR_WORK / 0.75)) + patch.reworkTotal + syncTotal;
  const left = repairLeft + reworkLeft + syncLeft;
  return { fixed, targets: targets.length, reworkDone: round(patch.reworkDone), reworkTotal: patch.reworkTotal, sync: !!patch.sync, synced: patch.sync && syncLeft <= 0.0001, left: round(left), share: total > 0 ? clamp(1 - left / total, 0, 1) : 1, done: left <= 0.0001 };
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
  // The library's improvements reach a shipped title only through a patch that brought them in.
  const sync = progress.synced ? syncPreview(state, project) : null;
  if (sync) {
    applySync(project, sync);
    project.synced = moduleQuality(state, project);
  }
  const metrics = projectMetrics(project);
  const rework = patch.rework ? DIMENSIONS.find(item => item.key === patch.rework)?.name : '';
  const record = {
    day: state.day, started: patch.started, fixed: progress.fixed, targets: progress.targets, rework: patch.rework, synced: sync ? { better: sync.better, fixed: sync.fixed.length } : null,
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
  const syncText = sync ? `，同步更新${sync.better.length ? '（' + sync.better.join('、') + '）' : ''}${sync.fixed.length ? `、带上别处修好的 ${sync.fixed.length} 项缺陷` : ''}` : '';
  const text = `修复 ${progress.fixed}/${progress.targets} 项${rework ? `，返工${rework}` : ''}${syncText}，综合 ${record.overallBefore.toFixed(0)} → ${metrics.overall.toFixed(0)}`;
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

function recordWork(project: any, person: any, key: string, amount: number, quality: number, state: any = null) {
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
    if (state && key !== 'stability') creditWork(state, project, key, used, quality);
  }
  project.contributions[person.id] = (project.contributions[person.id] || 0) + used;
  person.work = round(person.work + used);
}

// Rework: once a dimension is full, further work replaces the weakest finished part, so the score
// creeps toward whoever is redoing it.
function rework(project: any, key: string, amount: number, quality: number, state: any = null) {
  const work = workOf(project, key);
  if (work.done <= 0) return 0;
  if (!Array.isArray(work.batches)) work.batches = [{ amount: work.done, quality: work.value / work.done }];
  work.batches.sort((left: any, right: any) => left.quality - right.quality);
  let remaining = amount;
  let replaced = 0;
  let gain = 0;
  for (const batch of work.batches) {
    if (remaining <= 0 || batch.quality >= quality) break;
    const used = Math.min(remaining, batch.amount);
    work.value += used * (quality - batch.quality);
    gain += used * (quality - batch.quality);
    batch.amount -= used;
    remaining -= used;
    replaced += used;
  }
  if (state && key !== 'stability') creditRework(state, project, key, gain);
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
  project.defectMass = (project.defectMass ?? project.defects.length) + debt;
  project.defectDebt = (project.defectDebt || 0) + debt;
  while (project.defectDebt >= 1) {
    project.defectDebt -= 1;
    // The defect belongs to whatever the work went into: a module (shared by every title using it) or
    // the title's own content.
    const owners = (project.lastOwners || {})[dimension] || [];
    let roll = random(state) * sum(owners.map((owner: any) => owner.amount));
    const owner = owners.find((item: any) => (roll -= item.amount) < 0) || owners[owners.length - 1];
    project.defects.push({ id: `${project.id}-${project.defects.length}`, dimension, found: false, fixed: false, roll: random(state), module: owner?.id || null });
  }
}

// Priority is the player's ordering of parallel projects. A person belongs to one project at a time, so
// it only decides where people without an explicit assignment go; running several projects costs no
// extra efficiency beyond splitting the people.
export function projectOrder(state: any) {
  return state.projects.filter((project: any) => !project.released || project.patch).sort((left: any, right: any) => (left.priority || 0) - (right.priority || 0));
}

// Carries the 凝聚人心 boost, so every forecast and every day use the same project speed.
function priorityFactor(state: any, project: any) {
  return boostFactor(state, project, 'unity');
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
    if (amount > 0 && patch.sync && (patch.syncDone || 0) < SYNC_WORK) {
      const used = Math.min(amount, SYNC_WORK - (patch.syncDone || 0));
      patch.syncDone = round((patch.syncDone || 0) + used);
      amount -= used;
    }
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

// Found, unfixed defects in the dimensions this person is assigned to.
function fixTargets(project: any, person: any) {
  const dims = assignedWorks(project, person).map(key => WORKS.find(item => item.key === key)?.dimension);
  return project.defects.filter((defect: any) => defect.found && !defect.fixed && dims.includes(defect.dimension)).map((defect: any) => defect.id);
}

// How long 「先修复缺陷」 would take with today's assignment, and which dimensions have nobody to fix them.
export function fixForecast(state: any, project: any) {
  const open = project.defects.filter((defect: any) => defect.found && !defect.fixed);
  let days = 0;
  const unstaffed: string[] = [];
  for (const key of CONTENT_KEYS) {
    const count = open.filter((defect: any) => defect.dimension === key).length;
    if (!count) continue;
    const crew = state.staff.filter((person: any) => belongsTo(state, project, person) && fixTargets(project, person).length && assignedWorks(project, person).some(work => WORKS.find(item => item.key === work)?.dimension === key));
    const rate = sum(crew.map((person: any) => speedOf(state, person, 'repair') * (0.5 + able(person, key) / 200)));
    if (rate <= 0) { unstaffed.push(`${DIMENSIONS.find(item => item.key === key)?.name} ${count} 项`); continue; }
    days = Math.max(days, Math.ceil(count * REPAIR_WORK / rate));
  }
  return { known: open.length, days, unstaffed };
}

export function setFixFirst(state: any, projectId: string, on: boolean) {
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && !item.released);
  if (!project) throw new Error('项目不存在。');
  if (on && !project.defects.some((defect: any) => defect.found && !defect.fixed)) throw new Error('现在没有已发现的缺陷。');
  project.fixFirst = on;
  studioLog(next, on ? '先修复缺陷' : '继续做内容', `《${project.name}》${on ? '各项负责人暂停做内容，先修自己那一项的缺陷。' : '恢复做内容，做满后再修。'}`);
  return next;
}

function produceProject(state: any, project: any) {
  if (project.released) { if (project.patch) producePatch(state, project); return; }
  refreshWork(state, project);
  const crew = state.staff.filter((person: any) => belongsTo(state, project, person));
  const dailyCost = sum(crew.map((person: any) => (person.wage + OFFICES[state.office].rent / Math.max(1, state.staff.length)) / 30));
  project.invested += dailyCost;
  const factor = priorityFactor(state, project);
  const growth = boostFactor(state, project, 'coach');
  const defects = boostFactor(state, project, 'gate');
  for (const person of crew) {
    // 「先修复缺陷」: whoever is on a dimension fixes that dimension's found defects before making more of it.
    if (project.fixFirst) {
      const targets = fixTargets(project, person);
      if (targets.length) {
        const amount = speedOf(state, person, 'repair') * factor * conditionFactor(person, project);
        repair(state, project, amount, person, targets);
        project.contributions[person.id] = (project.contributions[person.id] || 0) + amount;
        person.work = round(person.work + amount);
        continue;
      }
    }
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
          recordWork(project, person, work.dimension, used, quality, state);
          if (work.dimension !== 'stability') addDefect(project, person, work.dimension, used * (100 - quality) / 100 * DEFECT_RATE * defects, state);
          practice(person, work.ability, used, growth);
        }
        const spare = amount - used;
        if (spare > 0) {
          // Finished items give their hours back to whatever this person still has open today.
          const given = spreadSpare(state, project, person, spare, key, factor, growth, defects);
          const left = spare - given;
          if (left > 0.0001) {
            if (project.defects.some((defect: any) => defect.found && !defect.fixed)) repair(state, project, left, person);
            else { rework(project, work.dimension, left, quality, state); practice(person, work.ability, left, growth); }
          }
          project.contributions[person.id] = (project.contributions[person.id] || 0) + spare;
          person.work = round(person.work + spare);
        }
      }
    }
  }
  syncFound(project);
  if (project.fixFirst && !project.defects.some((defect: any) => defect.found && !defect.fixed)) {
    project.fixFirst = false;
    announce(state, { kind: 'notice', title: `《${project.name}》缺陷修完了`, text: '已发现的缺陷都修好了，大家回到各自的内容。', amount: 0 });
  }
  project.progress = projectMetrics(project).progress;
  if (!project.released && project.kind === 'game') {
    // Checkpoints are read by menu locks and the tutorial; they only ever switch on.
    // Followers arrive when something is actually shown, not on every idle day: a milestone pays once.
    const mult = market(state, project.type).multiplier;
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
  // A commission can teach things too: the opening job unlocks the first title's remaining lines
  // one at a time, while ordinary titles (and later jobs) learn random new lines from the lens.
  if (!project.released && (project.kind === 'game' || project.job)) {
    while ((project.unlockAt || []).length && project.progress >= project.unlockAt[0]) {
      project.unlockAt.shift();
      const opening = (project.unlockLines || []).shift();
      if (opening) learnOpeningLine(state, opening);
      else learnLine(state, project);
    }
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
  const price = TYPES[project.type].price * SCALES[project.scale].price * PACE * (project.parentId ? 0.35 : 1);
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
  studioLog(next, '推广结果', `《${project.name}》投放 ${moneyText(value)}，新增 ${buyers} 位关注者；关注不等于购买。`);
  return next;
}

// One playtest round per press, sized and priced by scale. The less is still uncovered, the smaller each
// round's chance to meet a hidden defect, so extra rounds find less; testers stay the main source of coverage.
export const PLAYTESTS = [{ players: 30, cost: 0.8 }, { players: 100, cost: 2.5 }, { players: 300, cost: 7 }, { players: 1000, cost: 20 }];
export const playtestOf = (project: any) => PLAYTESTS[project?.scale || 0] || PLAYTESTS[0];

export function playtestOffer(state: any, project: any) {
  const reason = !project ? '先立项开发' : project.kind === 'module' ? '模块项目不需要试玩' : project.progress < TRIAL * 100 ? '完成度达到 55% 后才有体验版，才能试玩' : project.test && state.day - project.test.day < 3 ? '距上次试玩至少间隔 3 天' : state.cash < playtestOf(project).cost ? '资金不足' : '';
  return { available: !reason && !state.over && !state.event, reason, ...playtestOf(project) };
}

export function testDemo(state: any, projectId: string) {
  const project = state.projects.find((item: any) => item.id === projectId && !item.released);
  const offer = playtestOffer(state, project);
  if (!offer.available) throw new Error(offer.reason || '先处理当前决策。');
  const next = studioAction(state);
  const { players: count, cost } = offer;
  spend(next, cost, '招募试玩玩家');
  const target = next.projects.find((item: any) => item.id === projectId);
  const before = target.found;
  // Each still-hidden defect is met with a chance that shrinks as coverage grows; coverage rises by the same share.
  const left = 1 - coverage(target);
  const chance = left * (0.1 + random(next) * 0.1);
  target.playCover = Math.round(((target.playCover || 0) + left * chance) * 10000) / 10000;
  syncFound(target);
  const newlyFound = target.found - before;
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
      ? '声音分偏低：安排声音能力更强的人制作或返工，评分才会提高。'
      : metrics.dimensions.sound < 70 ? '声音够用但不出彩，音频能再提高沉浸感。' : '声音得到认可。',
    stability: (newlyFound
      ? `试玩玩家碰到 ${newlyFound} 项测试漏掉的缺陷，待修 ${metrics.known} 项。`
      : metrics.known ? `没有碰到新缺陷，还有 ${metrics.known} 项待修。` : '本轮没有碰到新问题。')
      + (metrics.untested ? '还没有测试覆盖，稳定是 0：安排人做测试工作。' : metrics.dimensions.stability < 60 ? '覆盖率还低或待修缺陷多：继续测试，并修掉已发现的缺陷；没测到的会在发售后被玩家碰到。' : '')
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
  const price = TYPES[project.type].price * SCALES[project.scale].price * PACE * (project.parentId ? 0.35 : 1);
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
    text: `玩家最在意${audienceFocus(project.type)}，《${project.name}》的${DIMENSIONS.find(item => item.key === key)?.name}只有 ${dimensions[key].toFixed(0)} 分。`
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
export const STAR_NAMES = ['一星', '二星', '三星', '四星', '五星'];
export const STAR_MARKS = ['★', '★★', '★★★', '★★★★', '★★★★★'];
// Which market range a star level watches: one and two stars the city, three and four the nation, five the world.
export const STAR_RANGE = [0, 0, 1, 1, 2];
export const RATING_PERIOD = 90;
export const RATING_UP = [0, 45, 52, 64, 80];
export const RATING_KEEP = [0, 38, 45, 56, 72];
const RATING_WATCH = 4;
const RATING_WEIGHTS = [0.5, 0.3, 0.2];
// Attention a star level's coverage adds when a release date is announced and at launch.
export const MEDIA_BONUS = [0, 0.05, 0.1, 0.15, 0.2];
// Every candidate in a three-person shortlist rolls on their own. These are the per-person odds at
// five stars: 2% through friends, 4% on a job site, 10% through an industry referral. Lower star
// levels scale the whole table down; one-star studios see none. A referral event still guarantees
// at least one name in the next industry-referral shortlist.
export const FAME_CHANNEL_CHANCE: any = { friends: 0.02, web: 0.04, headhunt: 0.1 };
export const FAME_STAR_SCALE = [0, 0.25, 0.5, 0.75, 1];
export function fameChance(state: any, channel: string) {
  const stars = Math.min(FAME_STAR_SCALE.length - 1, Math.max(0, state.stars || 0));
  return (FAME_CHANNEL_CHANCE[channel] || 0) * FAME_STAR_SCALE[stars];
}
// A first-week rank is worth most on the highest chart the title reaches.
const RANK_TOP = [40, 70, 100];

function rankPoints(ranks: any) {
  if (!Array.isArray(ranks)) return 0;
  return Math.max(0, ...ranks.map((rank: number, level: number) => RANK_TOP[level] * clamp(1.15 - 0.5 * Math.log10(Math.max(1, rank)), 0, 1)));
}

// Chart standing carries most of the score so higher stars need national and world charts; reviews
// still count, awards are honours only.
export function ratingOf(state: any) {
  const ranked = state.catalog.filter((book: any) => !book.parentId && book.firstRanks).slice(0, 3);
  const used = RATING_WEIGHTS.slice(0, ranked.length);
  const weightSum = sum(used) || 1;
  const books = ranked.map((book: any, index: number) => {
    const rank = round(rankPoints(book.firstRanks));
    const score = round(rank * 0.7 + book.reviewScore * 0.3);
    return { id: book.id, name: book.name, rank, review: round(book.reviewScore), award: 0, score, weight: round(used[index] / weightSum) };
  });
  const latest = Math.max(-Infinity, ...state.catalog.filter((book: any) => !book.parentId).map((book: any) => book.released));
  const idle = Number.isFinite(latest) ? state.day - latest : 0;
  const decay = idle >= 720 ? (Math.floor((idle - 720) / RATING_PERIOD) + 1) * 4 : 0;
  const score = round(Math.max(0, sum(books.map((book: any) => book.score * book.weight)) - decay));
  const tier = state.stars || 0;
  const rating = state.rating || {};
  const top = STAR_NAMES.length - 1;
  return {
    score, books, decay, tier, watch: !!rating.watch, published: rating.score ?? 0, history: rating.history || [],
    up: tier < top ? RATING_UP[tier + 1] : null, keep: tier > 0 ? RATING_KEEP[tier] : null,
    next: (Math.floor(state.day / RATING_PERIOD) + 1) * RATING_PERIOD, safe: tier > 0 && state.day - (rating.promotedAt || 0) < RATING_PERIOD
  };
}

function rateDay(state: any) {
  if (state.day % RATING_PERIOD !== 0 || !state.company) return;
  const view = ratingOf(state);
  const rating = state.rating;
  const before = state.stars || 0;
  const score = view.score;
  let tier = before;
  let note = '';
  const settled = tier > 0 && state.day - (rating.promotedAt || 0) > RATING_PERIOD;
  if (tier < STAR_NAMES.length - 1 && score >= RATING_UP[tier + 1]) {
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
  state.stars = tier;
  state.focus = STAR_RANGE[tier];
  const line = tier !== before ? note : note ? `${note}，下一期低于保级线 ${RATING_KEEP[tier]} 分将降级` : `维持${STAR_NAMES[tier]}工作室`;
  news(state, state.focus, true, `${RATING_MEDIA}季度评级：${state.company} ${score.toFixed(0)} 分`, line + '。', null, true);
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
    { label: '全部做完', ok: metrics.unfinished.length === 0, required: false, text: metrics.unfinished.length ? `还差 ${metrics.unfinished.length} 项，提前发售评分会偏低` : `完成度 ${metrics.progress.toFixed(0)}%` },
    { label: '做过试玩', ok: !!project.test, text: project.test ? `${project.test.count} 人 · ${project.test.score.toFixed(1)} 分` : '没有试玩，问题会在发售后才暴露' },
    { label: '待修缺陷', ok: metrics.known === 0, text: metrics.known ? `还有 ${metrics.known} 项` : metrics.untested ? '暂无；还没测试，不知道漏了多少' : `暂无；稳定 ${metrics.dimensions.stability.toFixed(0)} 分，没测到的留给玩家` },
    { label: '六维估计', ok: metrics.overall >= 60, text: `${metrics.overall.toFixed(0)} 分` },
    { label: '关注人数', ok: project.followers >= 1500, text: `${Math.round(project.followers)} 人${project.followers >= 1500 ? '' : '，推广能扩大首发'}` }
  ];
}

export function launchProject(state: any, projectId: string) {
  const next = studioAction(state);
  const project = next.projects.find((item: any) => item.id === projectId && !item.released);
  if (!project) throw new Error('项目不存在。');
  if (project.kind === 'module') throw new Error('模块项目做完会自动收进模块库，不用发售。');
  const metrics = projectMetrics(project);
  // Releasing early means shipping with unfinished dimensions — but it still requires the trial build.
  if (metrics.progress < TRIAL * 100) throw new Error('体验版完成后才能发售；提前发售指带着未完成的维度上市。');
  const trend = market(next, project.type);
  // The genre's own tag is the trend above; the other tags (style, music, variant) add their own lean.
  const tags = planTags(project);
  const lean = tagFactor(next, tags.filter(tag => tag !== TYPE_TAG[project.type]), project.scale);
  const score = round(clamp(projectScore(project) + (random(next) - 0.5) * 3, 0, 100));
  // Creativity breaks out through a tail jump, not a linear bonus: a high-creativity title has a better
  // chance of catching on, but there is no guarantee and it cannot be bought. A breakout multiplies the
  // opening audience once; it is not a permanent multiplier on the whole tail.
  const breakoutChance = clamp((metrics.dimensions.creativity - 55) / 100 * 0.45, 0, 0.32);
  const breakout = breakoutChance > 0 && random(next) < breakoutChance;
  if (breakout) project.followers = Math.round(project.followers * (1.6 + random(next) * 0.9));
  const exposure = MEDIA_BONUS[next.stars || 0];
  if (exposure) project.followers = Math.round(project.followers * (1 + exposure));
  const clash = clashOf(next, next.day, project.followers);
  const { units, price, receipt } = openingSales(project, trend.multiplier * lean * clash.factor, score);
  // The campaign's share of the launch, counted in its share of the launch audience.
  const promo = project.promoted > 0 ? { cost: project.promoted, followers: project.promoFollowers || 0, receipt: round(receipt * clamp((project.promoFollowers || 0) / Math.max(1, project.followers), 0, 1)) } : null;
  const best = Math.max(0, ...next.catalog.map((book: any) => book.openingReceipt));
  const capacity = Math.round(MARKET_SIZE * SCALES[project.scale].reach * (project.parentId ? 0.4 : 1) * (1 + Math.max(0, score - 70) / 25 * 4) * 0.5 * lean);
  // At launch the players see the real game, so the review reads the true stability, not the estimate.
  const review = reviewOf(next, project, metrics);
  const book = {
    id: project.id, name: project.name, type: project.type, scale: project.scale, slots: project.slots,
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
    capacity, left: capacity, sale: false, saleFloor: 0, saleStart: null, saleUntil: 0, saleEnded: 0, saleDepth: 1, saleRuns: 0, saleWeeks: 0,
    tags, lean, royalty: 0, rent: [...(project.rent || [])]
  };
  next.cash = round(next.cash + receipt);
  next.ledger.income = round(next.ledger.income + receipt);
  next.catalog.unshift(book);
  tagRelease(next, tags);
  const gained = keepModules(next, project);
  // Whatever this title was going to learn and has not yet, it learns now.
  while ((project.unlockAt || []).length) { project.unlockAt.shift(); learnLine(next, project); }
  project.synced = moduleQuality(next, project);
  noteClash(book, clash, Math.round(units / clash.factor) - units);
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
  // The first title's gameplay was the founder's and nothing else could be picked. Shipping it is the
  // moment that changes: the other basic gameplay unlocks with an explicit message, so it never just
  // appears in the library out of nowhere.
  if (book.tutorial) {
    const first = ORIGINS[next.founder]?.firstCore;
    const extra = Object.keys(MODULES).filter(line => MODULES[line].slot === 'core' && !MODULES[line].unlock && line !== first && !(next.unlocked || {})[line]);
    for (const line of extra) {
      next.unlocked = { ...(next.unlocked || {}), [line]: next.day };
      announce(next, { kind: 'unlock', title: '做完第一款游戏', text: `解锁${MODULES[line].name}：从下一作起，玩法可以自由选了。`, line, amount: 0 });
      studioLog(next, `解锁${MODULES[line].name}`, '做完第一款游戏后摸出的新玩法，下一作可以选。');
    }
  }
  if (next.goals.firstRelease === null) next.goals.firstRelease = next.day;
  announce(next, { kind: 'release', title: `《${book.name}》发售`, text: `首发售出 ${units} 份`, amount: receipt, book: book.id });
  if (book.record) announce(next, { kind: 'record', title: '新纪录', text: `首发到账超过此前最好成绩 ${moneyText(best)}`, amount: receipt });
  checkMarks(next, book);
  const clashText = clash.works.length ? `${clash.works.map((work: any) => `《${work.name}》`).join('、')}刚发售不久，首发被分流约 ${Math.round((1 - clash.factor) * 100)}%。` : '';
  const shortBoard = metrics.unfinished.length ? `仍有 ${metrics.unfinished.length} 个维度未完成，带着短板上市换回了款，之后可以继续更新。` : '';
  const lesson = book.tutorial ? '首作是练习，小亏也很正常；看看复盘，下一作照着改。' : '首发到账不等于最终利润，后续销量取决于玩家口碑。';
  const burst = breakout ? `《${book.name}》出圈了：创意打动了原本不关注这类游戏的人，首发关注翻了数倍。` : '';
  const media = exposure ? `${STAR_NAMES[next.stars || 0]}工作室的媒体曝光带来约 ${Math.round(exposure * 100)}% 额外关注。` : '';
  const promoText = promo ? `推广 ${moneyText(promo.cost)}带来 ${promo.followers} 位关注，按本作转化约折合首发 ${moneyText(promo.receipt)}。` : '';
  next.event = { id: 'release', gained, unlocked: SLOTS.filter(slot => (slot.unlock || 0) === releases(next)).map(slot => slot.name), title: `《${book.name}》正式发售`, text: `首发售出 ${units} 份，到账 ${moneyText(receipt)}。发售时市场：${trend.label}，首发需求 ×${trend.multiplier.toFixed(2)}；其余标签（${tags.filter(tag => tag !== TYPE_TAG[project.type]).join('、') || '无'}）反响 ×${lean.toFixed(2)}。${clashText}${media}${promoText}${shortBoard ? shortBoard + ' ' : ''}${lesson}${burst ? ' ' + burst : ''}`, choices: [{ id: 'continue', title: '收下成绩，继续经营', detail: book.tutorial ? '招聘网站已经开放，可以为下一作找更有经验的同事。' : '后续销量与评价继续变化，可以筹备下一款作品。' }] };
  studioLog(next, next.event.title, next.event.text);
  return next;
}

function checkMarks(state: any, book: any) {
  if (!book.paidBack && book.received >= book.invested) book.paidBack = true;
  if (book.paidBack && !book.paidBackAnnounced) {
    book.paidBackAnnounced = true;
    announce(state, { kind: 'breakeven', title: `《${book.name}》回本了`, text: `累计回款超过投入 ${moneyText(book.invested)}`, amount: book.received });
    if (state.goals.breakEven === null) state.goals.breakEven = state.day;
  }
  while (book.marks < UNIT_MARKS.length && book.units >= UNIT_MARKS[book.marks]) {
    announce(state, { kind: 'units', title: `销量突破 ${UNIT_MARKS[book.marks].toLocaleString('zh-CN')} 份`, text: `《${book.name}》`, amount: book.received });
    book.marks += 1;
  }
}

// Moving is the company's own call: any time, for the price. The hut is rented with the opening job.
export function moveCost(state: any) {
  const office = state.office >= 1 ? OFFICES[state.office + 1] : null;
  return office ? office.cost : null;
}

export function moveOffice(state: any) {
  const next = studioAction(state);
  if (next.office < 1) throw new Error('交付委托后会先租下小屋。');
  if (next.office >= OFFICES.length - 1) throw new Error('已经是最大的办公室了。');
  const office = OFFICES[next.office + 1];
  const cost = moveCost(next);
  spend(next, cost, (next.office > 1 ? '扩建为' : '搬进') + office.name);
  next.office += 1;
  next.goals[next.office === 2 ? 'moved' : 'expanded'] = next.goals[next.office === 2 ? 'moved' : 'expanded'] ?? next.day;
  announce(next, { kind: 'office', title: (next.office === 2 ? '搬进' : '扩建为') + office.name, text: `${office.seats} 个工位，月租 ${office.rent} 万`, amount: 0 });
  return next;
}

export function goalsOf(state: any) {
  const goals = state.goals;
  const steps = [
    { key: 'firstRelease', title: '完成首作', text: '把第一款游戏做完并发售。首作是练习，小亏也没关系。', reward: '开放招聘网站与音频、测试岗位', done: goals.firstRelease !== null },
    { key: 'breakEven', title: '第一次回本', text: '让一款作品的回款超过投入。', reward: '证明作品能赚钱', done: goals.breakEven !== null },
    { key: 'moved', title: '搬进正式办公室', text: `在「公司」页搬家，一次性 ${OFFICES[2].cost} 万。`, reward: `${OFFICES[2].seats} 个工位，开放行业推荐`, done: goals.moved !== null }
  ];
  steps.push(
    { key: 'topTen', title: '进入全国首周榜前十', text: '作品发售第一周的销量，在近一年全国新作里排进前十。', reward: '获得 200 位粉丝', done: goals.topTen !== null },
    { key: 'award', title: '获得全国年度奖项', text: '每年年底评选全国年度作品、创意与表现奖（国际奖项也算）。', reward: '获奖增加粉丝', done: goals.award !== null },
    { key: 'expanded', title: '再次扩建工作室', text: `在「公司」页花 ${OFFICES[3].cost} 万扩建。`, reward: `${OFFICES[3].seats} 个工位，可组建成熟团队`, done: goals.expanded !== null }
  );
  const current = steps.find(step => !step.done);
  const best = Math.max(0, ...state.catalog.map((book: any) => book.received));
  return { steps, current: current || { key: 'record', title: '打破纪录', text: `让一款作品的累计回款超过 ${best.toFixed(2)} 万。`, reward: '证明工作室越做越好', done: false } };
}

// ---- Achievements ----
// The six growth goals are milestones (they still unlock things); everything else is for show only.
const ownBooks = (state: any) => state.catalog;
const flag = (state: any, key: string) => !!(state.flags && state.flags[key]);
// A side skill beating the day job: the best ability outside someone's trade has grown past the best
// ability inside it. New hires always have a trade ability on top (pickAbilities caps the rest two
// points lower), so this only happens after deliberate off-trade work, mentoring or training. The
// hire-time snapshot keeps a lucky founder roll from unlocking it on day one.
function sideSkillWins(state: any) {
  return (state.staff || []).some((person: any) => {
    const home = (ROLES[person.role]?.home || []).filter((key: string) => ABILITY_KEYS.includes(key));
    const outside = ABILITY_KEYS.filter((key: string) => !home.includes(key));
    if (!home.length || !outside.length) return false;
    const abilities = person.abilities || {};
    const num = (key: string) => Number(abilities[key]) || 0;
    const main = Math.max(...home.map(num));
    const best = outside.reduce((top: string, key: string) => num(key) > num(top) ? key : top, outside[0]);
    const side = num(best);
    const baseline = Number(person.snap?.[best] ?? 0);
    return side > main && side >= baseline + 2;
  });
}
export const ACHIEVEMENT_GROUPS = [['milestone', '里程碑'], ['business', '经营'], ['works', '作品'], ['team', '团队'], ['industry', '行业'], ['hidden', '隐藏']];
export const ACHIEVEMENTS: any[] = [
  { key: 'firstModule', group: 'milestone', title: '第一块模块', text: '做完一块模块，收进自己的模块库。', reward: '这块模块以后立项直接复用', check: (s: any) => Object.keys(MODULES).some(line => lineInfo(s, line).level >= 1) },
  { key: 'firstRelease', group: 'milestone', title: '完成首作', text: '把第一款游戏做完并发售。', reward: '开放招聘网站与音频、测试岗位', check: (s: any) => s.goals.firstRelease !== null },
  { key: 'breakEven', group: 'milestone', title: '第一次回本', text: '让一款作品的回款超过投入。', reward: '证明作品能赚钱', check: (s: any) => s.goals.breakEven !== null },
  { key: 'moved', group: 'milestone', title: '搬进正式办公室', text: `在「公司」页搬家，一次性 ${OFFICES[2].cost} 万。`, reward: `${OFFICES[2].seats} 个工位，开放行业推荐、猎头与模块授权`, check: (s: any) => s.goals.moved !== null },
  { key: 'topTen', group: 'milestone', title: '全国首周榜前十', text: '作品首周销量在近一年全国新作里排进前十。', reward: '获得 200 位粉丝', check: (s: any) => s.goals.topTen !== null },
  { key: 'award', group: 'milestone', title: '全国年度奖项', text: '获得全国或国际年度评选的任一奖项。', reward: '获奖增加粉丝', check: (s: any) => s.goals.award !== null },
  { key: 'expanded', group: 'milestone', title: '再次扩建', text: `在「公司」页花 ${OFFICES[3].cost} 万扩建。`, reward: `${OFFICES[3].seats} 个工位`, check: (s: any) => s.goals.expanded !== null },
  { key: 'cash100', group: 'business', title: '百万现金', text: '公司现金达到 100 万。', check: (s: any) => s.cash >= 100, progress: (s: any) => [s.cash, 100, 'money'] },
  { key: 'cash1000', group: 'business', title: '千万现金', text: '公司现金达到 1000 万。', check: (s: any) => s.cash >= 1000, progress: (s: any) => [s.cash, 1000, 'money'] },
  { key: 'cash10000', group: 'business', title: '资产过亿', text: '公司现金达到 1 亿。', check: (s: any) => s.cash >= 10000, progress: (s: any) => [s.cash, 10000, 'money'] },
  { key: 'team8', group: 'business', title: '八人小队', text: '同时有 8 名员工。', check: (s: any) => s.staff.length >= 8, progress: (s: any) => [s.staff.length, 8] },
  { key: 'team16', group: 'business', title: '座无虚席', text: '16 个工位全部坐满。', check: (s: any) => s.staff.length >= 16, progress: (s: any) => [s.staff.length, 16] },
  { key: 'team40', group: 'business', title: '四十人团队', text: '同时有 40 名员工。', check: (s: any) => s.staff.length >= 40, progress: (s: any) => [s.staff.length, 40] },
  { key: 'year3', group: 'business', title: '三周年', text: '公司经营满三年。', check: (s: any) => s.day >= 1080, progress: (s: any) => [s.day, 1080] },
  { key: 'books10', group: 'works', title: '十部作品', text: '发售 10 部作品。', check: (s: any) => ownBooks(s).length >= 10, progress: (s: any) => [ownBooks(s).length, 10] },
  { key: 'units10k', group: 'works', title: '万份销量', text: '单部作品累计售出 1 万份。', check: (s: any) => ownBooks(s).some((book: any) => book.units >= 10000) },
  { key: 'units100k', group: 'works', title: '十万份销量', text: '单部作品累计售出 10 万份。', check: (s: any) => ownBooks(s).some((book: any) => book.units >= 100000) },
  { key: 'review85', group: 'works', title: '口碑之作', text: '一部作品的玩家口碑达到 85 分。', check: (s: any) => ownBooks(s).some((book: any) => book.reviewScore >= 85) },
  { key: 'sequel', group: 'works', title: '系列开端', text: '发售一部续作。', check: (s: any) => ownBooks(s).some((book: any) => book.sequel) },
  { key: 'dlc', group: 'works', title: '还有后续', text: '发售一部资料片。', check: (s: any) => ownBooks(s).some((book: any) => book.parentId) },
  { key: 'breakout', group: 'works', title: '出圈', text: '一部作品凭创意出圈。', check: (s: any) => ownBooks(s).some((book: any) => book.breakout) },
  { key: 'patched', group: 'works', title: '负责到底', text: '为已发售作品上线一个补丁。', check: (s: any) => flag(s, 'patched') },
  { key: 'tried3', group: 'works', title: '换着花样做', text: '发售过三种不同玩法的作品。', check: (s: any) => new Set(ownBooks(s).map((book: any) => (book.slots?.core || [])[0]).filter(Boolean)).size >= 3, progress: (s: any) => [new Set(ownBooks(s).map((book: any) => (book.slots?.core || [])[0]).filter(Boolean)).size, 3] },
  { key: 'styles', group: 'works', title: '两种画风', text: '像素和手绘的作品都发售过。', check: (s: any) => ['像素', '手绘'].every(tag => ownBooks(s).some((book: any) => (book.tags || []).includes(tag))) },
  { key: 'mentored', group: 'team', title: '出师', text: '一次带教让徒弟追上师傅。', check: (s: any) => flag(s, 'mentored') },
  { key: 'boost', group: 'team', title: '主心骨', text: '有员工获得团队增益标签。', check: (s: any) => s.staff.some((person: any) => person.boost) },
  { key: 'star', group: 'team', title: '名人加盟', text: '录用一位行业名人。', check: (s: any) => s.staff.some((person: any) => person.fame) },
  { key: 'poached', group: 'team', title: '挖角成功', text: '从对手那里挖来一位名人。', check: (s: any) => flag(s, 'poached') },
  { key: 'rare', group: 'team', title: '可遇不可求', text: '招到带稀有标签的员工。', check: (s: any) => s.staff.some((person: any) => person.tags.some((tag: any) => tag.kind === 'rare')) },
  { key: 'grown90', group: 'team', title: '自己培养的高手', text: '一位非名人员工的某项能力达到 90。', check: (s: any) => s.staff.some((person: any) => !person.fame && ABILITY_KEYS.some(key => person.abilities[key] >= 90)) },
  { key: 'star2', group: 'industry', title: '二星工作室', text: `${RATING_MEDIA}评为二星。`, check: (s: any) => (s.stars || 0) >= 1 },
  { key: 'star3', group: 'industry', title: '三星工作室', text: `${RATING_MEDIA}评为三星。`, check: (s: any) => (s.stars || 0) >= 2 },
  { key: 'star4', group: 'industry', title: '四星工作室', text: `${RATING_MEDIA}评为四星。`, check: (s: any) => (s.stars || 0) >= 3 },
  { key: 'star5', group: 'industry', title: '五星工作室', text: `${RATING_MEDIA}评为五星。`, check: (s: any) => (s.stars || 0) >= 4 },
  { key: 'globalTop10', group: 'industry', title: '走向世界', text: '一部作品进入国际首周榜前十。', check: (s: any) => ownBooks(s).some((book: any) => book.firstRanks && book.firstRanks[2] <= 10) },
  { key: 'expoWin', group: 'industry', title: '展会第一', text: '在任一展会拿到第一名。', check: (s: any) => s.exhibitions.some((entry: any) => entry.result?.rank === 1) },
  { key: 'awardGlobal', group: 'industry', title: '国际年度作品', text: '获得国际年度作品。', check: (s: any) => s.awards.some((award: any) => award.own && award.tier === 2 && !award.half) },
  { key: 'dream', group: 'hidden', title: '屏幕外的人', text: '创始人过劳后被托梦救回。', check: (s: any) => flag(s, 'dream') },
  { key: 'flawless', group: 'hidden', title: '零缺陷', text: '一部作品发售时没有任何未修缺陷。', check: (s: any) => ownBooks(s).some((book: any) => book.flawless) },
  { key: 'clashWin', group: 'hidden', title: '硬碰硬', text: '和两部以上对手作品同周发售，仍拿到全国首周第一。', check: (s: any) => ownBooks(s).some((book: any) => (book.clash || 0) >= 2 && book.firstRanks && book.firstRanks[1] === 1) },
  { key: 'smallPromo', group: 'hidden', title: '小钱办大事', text: '只投最小一档推广的作品进入全国首周榜前十。', check: (s: any) => ownBooks(s).some((book: any) => book.promo && book.promo.cost === PROMOTE_TIERS[0] && book.firstRanks && book.firstRanks[1] <= 10) },
  { key: 'familiar', group: 'hidden', title: '新闻里的那个人', text: '录用一位曾在新闻里出现过的名人。', check: (s: any) => s.staff.some((person: any) => person.story) },
  { key: 'sideHustle', group: 'hidden', title: '不务正业', text: '把一位员工的非本职能力练到超过他本职的最强一项。', check: (s: any) => sideSkillWins(s) },
  // Three ladders: scale of a shipped title, how many abilities one employee has at 90+, and how
  // many quality dimensions of one released title reached 90+.
  ...SCALES.slice(1).map((scale, index) => {
    const level = index + 1;
    return {
      key: 'scale' + level, group: 'works', title: '完成' + scale.name + '作品',
      text: '发售一部' + scale.name + '作品。',
      check: (s: any) => ownBooks(s).some((book: any) => book.scale === level)
    };
  }),
  ...['双料高手', '三栖高手', '四项全能', '五维全才', '六边形战士'].map((title, index) => {
    const count = index + 2;
    return {
      key: 'staff90x' + count, group: 'team', title,
      text: `一名员工有 ${count} 项属性达到 90 分以上。`,
      check: (s: any) => (s.staff || []).some((person: any) => ABILITY_KEYS.filter(key => ((person.abilities || {})[key] || 0) >= 90).length >= count)
    };
  }),
  ...['双维高分', '三维高分', '四维高分', '五维高分', '六维全优'].map((title, index) => {
    const count = index + 2;
    return {
      key: 'dims90x' + count, group: 'works', title,
      text: `发售一部有 ${count} 个维度达到 90 分以上的作品。`,
      check: (s: any) => ownBooks(s).some((book: any) => DIM_KEYS.filter(key => ((book.metrics?.dimensions || {})[key] || 0) >= 90).length >= count)
    };
  })
];

function checkAchievements(state: any, quiet = false) {
  state.achievements = state.achievements || {};
  for (const item of ACHIEVEMENTS) {
    if (state.achievements[item.key] !== undefined || !item.check(state)) continue;
    state.achievements[item.key] = state.day;
    if (!quiet) announce(state, { kind: 'record', title: (item.group === 'hidden' ? '隐藏成就：' : '成就：') + item.title, text: item.text, amount: 0 });
  }
}

// Count only achievements that still exist. An old save can carry a key for one that was removed;
// counting raw keys would overstate the total and keep the new-achievement badge from clearing.
function unlockedCount(state: any) {
  const unlocked = state.achievements || {};
  return ACHIEVEMENTS.filter(item => unlocked[item.key] !== undefined).length;
}

export function achievementsOf(state: any) {
  const unlocked = state.achievements || {};
  const count = unlockedCount(state);
  return {
    count, total: ACHIEVEMENTS.length,
    fresh: Math.max(0, count - (state.notices?.achSeen || 0)),
    items: ACHIEVEMENTS.map(item => ({ ...item, day: unlocked[item.key] ?? null, progress: item.progress ? item.progress(state) : null }))
  };
}

export function markAchievementsSeen(state: any) {
  return { ...state, notices: { ...state.notices, achSeen: unlockedCount(state) } };
}

export function resolveStudioEvent(state: any, choice: string) {
  if (!state.event || !state.event.choices.some((item: any) => item.id === choice)) throw new Error('当前选择无效。');
  let next = studioAction(state);
  const event = next.event;
  next.event = null;
  studioLog(next, event.title, event.choices.find((item: any) => item.id === choice).title);
  if (choice === 'bridge') {
    if (next.bridgeUsed) throw new Error('创始人积蓄已经用过了。');
    const amount = round(Math.max(0, -next.cash) + BRIDGE);
    next.bridgeUsed = true;
    next.flags = { ...(next.flags || {}), bridge: next.day };
    next.cash = round(next.cash + amount);
    next.ledger.income = round(next.ledger.income + amount);
    return next;
  }
  if (event.id === 'bankrupt') {
    next.over = true;
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
  const job = next.projects.find((project: any) => project.job && project.progress >= 100);
  if (job && !next.event) finishJob(next, job);
  for (const project of next.projects.filter((item: any) => item.kind === 'module' && !item.job && item.progress >= 100)) finishModuleProject(next, project);
  shareDefects(next);
  tagDay(next);
  salesDay(next);
  playerReports(next);
  stressDay(next);
  staffDay(next);
  resignOrContinue(next);
  calendarDay(next);
  industryDay(next);
  scheduledCash(next);
  refreshBoard(next);
  checkLens(next);
  if (!next.event) rollRandomEvent(next);
  checkAchievements(next);
  if (next.day % 30 === 0) {
    // Licensed lines pay by their tier every month, and other studios using them crowd their tags.
    for (const line of Object.keys(next.licenses || {})) {
      const level = lineInfo(next, line).level;
      if (!level) { delete next.licenses[line]; continue; }
      const income = round(LICENSE_INCOME * level);
      next.cash = round(next.cash + income);
      next.ledger.income = round(next.ledger.income + income);
      tagRelease(next, MODULES[line].tags || [], 0.4);
    }
    const payroll = round(next.accrued);
    next.cash = round(next.cash - payroll);
    next.ledger.payroll = payroll;
    next.ledger.expense = round(next.ledger.expense + payroll);
    const report = { month: next.day / 30, ...next.ledger, closing: next.cash, net: round(next.ledger.income - next.ledger.expense) };
    next.report = report;
    next.reports = [...next.reports, report].slice(-600);
    next.ledger = { opening: next.cash, income: 0, expense: 0, payroll: 0 };
    next.accrued = 0;
    // Ending the month in the red is the end, unless the founder's savings are still there: offered once,
    // they cover the hole and leave a little on top.
    if (next.cash < 0 && !next.bridgeUsed) {
      next.event = { id: 'bankrupt', title: '账上没钱了', text: `月底结算后现金 ${moneyText(next.cash)}，公司付不出钱了。创始人还有一笔积蓄，整局只能用这一次。`, choices: [{ id: 'bridge', title: `投入创始人积蓄 · ${moneyText(round(BRIDGE - next.cash))}`, detail: `补上亏空，再留 ${moneyText(BRIDGE)} 开销。整局只有这一次。` }, { id: 'close', title: '关闭公司', detail: '经营到此为止。' }] };
    } else next.over = next.cash < 0;
    // Nothing is left to decide once the company is gone; a same-day random event would otherwise
    // sit behind the failure screen and trap the player in closeMenu().
    if (next.over) next.event = null;
    studioLog(next, `${monthText(report.month)}账单`, `收入 ${moneyText(report.income)}，支出 ${moneyText(report.expense)}，净变化 ${moneyText(report.net)}。`);
  }
  next.day += 1;
  return next;
}

function cashWarning(state: any) {
  const key = Math.floor((state.day - 1) / 30);
  if (!state.company || state.cash - state.accrued >= monthlyCost(state) * 0.6 || state.notices[`cash-${key}`]) return null;
  state.notices[`cash-${key}`] = true;
  return { id: 'cash', title: '近期工资需要准备', text: `现金 ${state.cash.toFixed(2)} 万，已累计应付 ${state.accrued.toFixed(2)} 万。可以先看看团队和账单再继续；「项目」里还能接委托应急。`, choices: [{ id: 'continue', title: '自行调整后继续', detail: '月底仍需支付已产生的费用。' }] };
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
    const full = Math.max(0, Math.round(Math.min(book.dailyUnits * (discounted ? 1 + saleReach(state, book, depth) : 1), book.left)));
    const clash = clashOf(state, state.day, book.followers, book.released);
    const units = Math.round(full * clash.factor);
    if (age <= 6) noteClash(book, clash, full - units);
    if (discounted) {
      const remaining = Math.max(0, Math.min(1, book.left / Math.max(1, book.capacity)));
      book.dailyUnits *= 1 - (1 - depth) * 0.02;
      book.left = Math.max(0, book.left - units * remaining * (1 - depth) * 0.9);
    }
    const income = round(units * book.price * depth * (1 - (book.royalty || 0)));
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
  const plan = { name: `${book.name} · 资料片 ${siblings.length + 1}`, scale: book.scale, slots: book.slots, rent: book.rent || [] };
  const project = blankProject(next, `${next.day}-${next.seed}-${next.projects.length}`, plan, next.day);
  project.parentId = id;
  project.followers = Math.round(book.units * 0.3 + book.followers * 0.2);
  project.priority = Math.max(-1, ...projectOrder(next).map((item: any) => item.priority ?? 0)) + 1;
  const cost = 4 + book.scale * 2;
  if (cost + planRentCost(next, plan) > next.cash) throw new Error('当前资金不足。');
  spend(next, cost, `《${book.name}》资料片立项`);
  project.invested = round(cost + payRent(next, plan, project.name));
  next.projects.push(project);
  studioLog(next, `《${project.name}》立项`, '作为关联原作的新项目独立安排人手、排期、核算和发售，未发售前不产生销售收益。');
  return next;
}

// A title ships on one platform. Bringing it to another is a related project, like a DLC: the same
// modules, the new platform's adaptation, and only a small share of the title's own content to redo.
export const PORT_CONTENT = 0.25;
export function makePort(state: any, id: string, platform: string) {
  const next = studioAction(state);
  const book = next.catalog.find((item: any) => item.id === id);
  if (!book || next.day - book.released > 540) throw new Error('该作品已结束销售。');
  if (book.parentId) throw new Error('请从原作移植。');
  if (MODULES[platform]?.slot !== 'platform' || !moduleOpen(next, platform)) throw new Error('这个平台还不能用。');
  if ((book.slots?.platform || []).includes(platform)) throw new Error('原作已经在这个平台上。');
  if (next.projects.some((item: any) => item.parentId === id && item.port === platform)) throw new Error('这个平台的移植已经在做或做完了。');
  const plan = { name: `${book.name} · ${MODULES[platform].name.replace('适配', '')}版`, scale: book.scale, slots: { ...book.slots, platform: [platform] }, rent: book.rent || [], port: true };
  if (planRentCost(next, plan) > next.cash) throw new Error('当前资金不足以支付租金。');
  const project = blankProject(next, `${next.day}-${next.seed}-${next.projects.length}`, plan, next.day);
  project.parentId = id;
  project.port = platform;
  project.followers = Math.round(book.units * 0.2 + book.followers * 0.2);
  project.invested = payRent(next, plan, project.name);
  project.priority = Math.max(-1, ...projectOrder(next).map((item: any) => item.priority ?? 0)) + 1;
  next.projects.push(project);
  studioLog(next, `《${project.name}》立项`, '移植作为关联原作的新项目：沿用原作的模块，只做新平台的适配和少量本作内容，独立发售与核算。');
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
const scaleSales = [0.6, 1, 1.8, 3.2];

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
  const scale = tier === 2 ? (roll < 0.15 ? 3 : roll < 0.6 ? 2 : 1) : tier === 1 ? (roll < 0.03 ? 3 : roll < 0.3 ? 2 : roll < 0.65 ? 1 : 0) : (roll < 0.2 ? 1 : 0);
  const power = studio ? studio.power : 0.7 + random(state) * 0.6;
  const quality = clamp(TIERS[tier].score + gauss(state) * 10 + (power - 1) * 20, 25, 97);
  const growth = 1 + Math.floor(released / 360) * 0.04;
  const firstWeek = Math.max(20, Math.round(TIERS[tier].sales * scaleSales[scale] * power * growth * Math.exp(gauss(state) * 0.25) * (0.6 + quality / 125)));
  state.workSeq = (state.workSeq || 0) + 1;
  const type = studio ? studio.type : pick(state, Object.keys(TYPES));
  return {
    id: `work-${state.workSeq}`, studio: studio ? studio.id : null, studioName: studio ? studio.name : pick(state, FILLER_HEAD) + pick(state, FILLER_TAIL),
    name: pick(state, TITLE_HEAD) + pick(state, TITLE_TAIL), tier, type, scale, released, announced: null,
    score: round(quality), creativity: round(clamp(quality + gauss(state) * 8, 20, 99)), presentation: round(clamp(quality + gauss(state) * 8, 20, 99)),
    firstWeek, life: round(0.8 + quality / 35), tags: rivalTags(state, type)
  };
}

// A rival title carries tags like the player's: its genre, a style, and sometimes music or a variant.
function rivalTags(state: any, type: string) {
  const lines = Object.values(MODULES) as any[];
  const from = (filter: (module: any) => boolean) => lines.filter(module => filter(module) && (module.tags || []).length);
  const tags = [TYPE_TAG[type]];
  const variant = from(module => module.slot === 'core' && module.type === type && (module.needs || []).length);
  if (variant.length && random(state) < 0.35) tags.push(...pick(state, variant).tags);
  tags.push(...pick(state, from(module => module.axis === 'art')).tags);
  if (random(state) < 0.6) tags.push(...pick(state, from(module => module.axis === 'audio')).tags);
  tags.push(...pick(state, from(module => module.slot === 'platform')).tags);
  return Array.from(new Set(tags));
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

// Announced rival releases, soonest first. The player no longer promises a release date in advance.
export function scheduleOf(state: any) {
  return (state.works || [])
    .filter((work: any) => work.announced !== null && work.released > state.day)
    .map((work: any) => ({ day: work.released, name: `《${work.name}》`, studio: work.studioName, studioId: work.studio, tier: work.tier, own: false }))
    .sort((left: any, right: any) => left.day - right.day);
}

// A rival takes a share of demand only once it is out and while it is in its own launch week, so the
// title that ships first gets a few days to itself.
export function clashOf(state: any, day: number, followers: number, released = day) {
  const works = (state.works || []).filter((work: any) => work.released <= day && day - work.released <= 6 && Math.abs(work.released - released) <= 7);
  if (!works.length) return { factor: 1, works: [] };
  const pressure = sum(works.map((work: any) => work.firstWeek));
  const mine = Math.max(100, followers) * 0.6;
  return { factor: round(clamp(1 - 0.4 * pressure / (pressure + mine * 3), 0.55, 1)), works };
}

// Units lost to each rival during the first week, split by how big each rival's launch is.
function noteClash(book: any, clash: any, lost: number) {
  if (lost <= 0 || !clash.works.length) return;
  const total = sum(clash.works.map((work: any) => work.firstWeek));
  book.clashLost = book.clashLost || {};
  for (const work of clash.works) book.clashLost[work.id] = round((book.clashLost[work.id] || 0) + lost * work.firstWeek / total);
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

// The market page: every title released in the last year as a point, its reception against its first-week
// sales. Looking back only; it shows no demand figures and no trend.
export function marketPoints(state: any) {
  const day = state.day;
  const rivals = (state.works || []).filter((work: any) => work.released <= day - 7 && work.released > day - 367)
    .map((work: any) => ({ id: work.id, name: `《${work.name}》`, studio: work.studioName, scale: work.scale, x: work.score, y: work.firstWeek, tags: work.tags || [], own: false }));
  const own = state.catalog.filter((book: any) => !book.parentId && book.firstRanks && book.released > day - 367)
    .map((book: any) => ({ id: book.id, name: `《${book.name}》`, studio: state.company, scale: book.scale, x: book.reviewScore, y: book.firstWeek || 0, tags: book.tags || [], own: true }));
  return [...rivals, ...own];
}
// The categories the page may sort points by: the ones learned so far and the one being learned.
export function marketAxes(state: any) {
  const lens = lensOf(state);
  return lens === null ? [...LENS_ORDER] : LENS_ORDER.slice(0, LENS_ORDER.indexOf(lens) + 1);
}
// The options of a category a point can carry; gameplay is read by genre.
export function axisOptions(axis: string) {
  return ALL_TAGS.filter(tag => TAG_AXIS[tag] === axis && (axis !== 'design' || TAG_GROUP[tag] === 'genre'));
}
// The scale the page opens on: the studio's latest or current title.
export function currentScale(state: any) {
  const live = projectOpen(state).find((project: any) => project.kind === 'game');
  return live ? live.scale : state.catalog.find((book: any) => !book.parentId)?.scale || 0;
}

// The tags worth mentioning right now: those of the category the market is about (all once learned).
export function lensTags(state: any, tags: string[]) {
  const lens = lensOf(state);
  return lens === null ? tags : tags.filter(tag => TAG_AXIS[tag] === lens);
}

// One chart for the industry menu: first-week sales over the last year, or lifetime sales.
export function chartOf(state: any, kind: string, level: number) {
  const day = state.day;
  const rivals = state.works.filter((work: any) => work.tier <= level && work.released <= day && (kind === 'total' || work.released <= day - 7 && work.released > day - 367))
    .map((work: any) => ({ name: `《${work.name}》`, studio: work.studioName, studioId: work.studio, units: kind === 'total' ? workUnits(work, day) : work.firstWeek, own: false, tags: lensTags(state, work.tags || []) }));
  const own = state.catalog.filter((book: any) => kind === 'total' || book.firstRanks && book.released > day - 367)
    .map((book: any) => ({ name: `《${book.name}》`, studio: state.company, studioId: null, units: kind === 'total' ? book.units : book.firstWeek, own: true, book: book.id, tags: lensTags(state, book.tags || []) }));
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
  if (!quiet && (studio || work.tier >= state.focus)) { const shown = lensTags(state, work.tags || []); news(state, work.tier, work.tier === 2 && work.scale >= 2, `《${work.name}》首周售出 ${work.firstWeek.toLocaleString('zh-CN')} 份`, `${work.studioName}出品，${TYPES[work.type].name}·${SCALES[work.scale].name}${shown.length ? `，${shown.join('、')}` : ''}。`, work.studio); }
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
      news(state, studio.tier, studio.tier === 2, `${studio.name}公布新作《${work.name}》`, `定档${dateText(work.released)}，${TYPES[work.type].name}·${SCALES[work.scale].name}。`, studio.id);
    }
  }
  TIERS.forEach((_, tier) => { if (random(state) < FILLER_PER_YEAR[tier] / 360) state.works.push(rivalWork(state, tier, null, day)); });
  if (!quiet && day % 30 === 15) talentMonth(state);
  // A rival's first week meets the market the way the player's does: its tags' demand on release day.
  for (const work of state.works) if (work.released === day && !work.leaned) {
    work.leaned = tagFactor(state, work.tags || [], work.scale);
    work.firstWeek = Math.max(20, Math.round(work.firstWeek * work.leaned));
  }
  for (const work of state.works) if (work.released === day) tagRelease(state, work.tags || [], 0.15 + work.tier * 0.1);
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
  const primary = leadAbility(state, role);
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
  // A free agent has no employer to counter the offer: easier to sign than a poach, and their odds
  // do not depend on how their former studio is doing.
  const freeAgent = talent.status === 'free';
  const studio = freeAgent ? null : state.rivals.find((item: any) => item.id === talent.studio);
  const base = marketWage({ abilities: talent.abilities, speed: talent.speed });
  const wage = round(base * POACH_BIDS[bid]);
  const trend = studio ? rivalProfile(state, studio.id)?.trend : '平稳';
  const chance = freeAgent
    ? round(0.55 + [0, 0.15, 0.3][bid])
    : round(clamp(0.2 + [0, 0.15, 0.3][bid] + ((state.focus || 0) - (studio?.tier ?? 1)) * 0.15 + (trend === '下滑' ? 0.1 : trend === '上升' ? -0.1 : 0), 0.05, 0.85));
  const eligible = freeAgent || talent.status === 'employed';
  const reason = !eligible ? (talent.status === 'hired' ? '已经加入本社' : '此人现在不在对手那里')
    : state.office < 2 ? '搬进正式办公室后才能找猎头'
    : (talent.cooldown || 0) > state.day ? `被拒后还有 ${Math.max(0, talent.cooldown - state.day)} 天才能再谈`
    : state.staff.length >= seats(state) ? '工位已满'
    : state.cash < POACH_FEE ? `猎头费需要 ${moneyText(POACH_FEE)}` : '';
  return { talent, studio, wage, chance, fee: POACH_FEE, freeAgent, reason, available: !reason };
}

export function poach(state: any, talentId: string, bid: number) {
  if (![0, 1, 2].includes(bid)) throw new Error('出价无效。');
  const offer = poachOffer(state, talentId, bid);
  if (!offer) throw new Error('这个人不存在。');
  if (!offer.available) throw new Error(offer.reason);
  const next = studioAction(state);
  const talent = next.talents.find((item: any) => item.id === talentId);
  const studio = next.rivals.find((item: any) => item.id === talent.studio);
  const freeAgent = offer.freeAgent;
  spend(next, POACH_FEE, `猎头接触${talent.name}`);
  if (random(next) >= offer.chance) {
    // No employer to lose them to: a free agent can be approached again much sooner.
    const cooldown = freeAgent ? 30 : 180;
    talent.cooldown = next.day + cooldown;
    studioLog(next, `${talent.name} 拒绝了邀请`, freeAgent ? `他还在考虑别家，${cooldown} 天内不会再谈。` : `${talent.studioName}留住了人，180 天内不会再谈。`);
    announce(next, { kind: 'notice', title: `${talent.name} 拒绝了邀请`, text: `猎头费不退，${cooldown} 天内不会再谈`, amount: 0 });
    return next;
  }
  const person = freshPerson(next, {
    id: `star-${talent.id}`, name: talent.name, role: talent.role, abilities: { ...talent.abilities }, speed: talent.speed, wage: offer.wage,
    hired: true, fame: true, rampup: 30, joined: next.day, home: homeWork({ role: talent.role, abilities: talent.abilities, home: '' }), snap: { ...talent.abilities },
    potential: Math.min(100, talent.abilities[talent.primary] + 2), tags: [{ kind: 'personality', key: 'eager' }],
    story: freeAgent ? '离职后以自由身加盟' : `从${talent.studioName}挖来`
  });
  next.staff.push(person);
  personNote(next, person, (freeAgent ? '自由身加盟' : `从${talent.studioName}挖来`) + `，月薪 ${moneyText(offer.wage)}`);
  talent.status = 'hired';
  talent.since = next.day;
  // Signing a free agent does not weaken a rival and does not count as a successful poach.
  if (!freeAgent) {
    if (studio) studio.power = round(Math.max(0.3, studio.power - 0.15));
    next.flags = { ...(next.flags || {}), poached: next.day };
  }
  news(next, studio ? studio.tier : 1, true,
    freeAgent ? `${talent.name}加盟${next.company}` : `${talent.name}离开${talent.studioName}，加盟${next.company}`,
    `月薪 ${moneyText(offer.wage)}。`, freeAgent ? null : talent.studio, true);
  announce(next, { kind: 'record', title: `${freeAgent ? '签下了' : '挖来了'}${talent.name}`, text: `${ROLES[talent.role].name}名人，月薪 ${moneyText(offer.wage)}`, amount: 0 });
  return next;
}

// What the home-screen bulletin plays: the company's own news first, then the current tier, then the
// headlines above it. Reading it is optional; important moments still get a banner.
export function bulletinOf(state: any) {
  // From three stars on, nameless small releases are noise; only news about named studios and headlines stay.
  const list = newsFor(state).filter((item: any) => state.day - item.day <= 60 && (item.own || item.headline || (state.stars || 0) < 2 || item.studio));
  const own = list.filter((item: any) => item.own);
  const rest = list.filter((item: any) => !item.own);
  return [...own.slice(0, 3), ...rest].slice(0, 6);
}

// A year is 12 months of 30 days; day 1 is year 1, month 1, day 1.
export function dateText(day: number) {
  const index = Math.max(0, day - 1);
  return `第 ${Math.floor(index / 360) + 1} 年 ${Math.floor(index % 360 / 30) + 1} 月 ${index % 30 + 1} 日`;
}

// Month-end reports count months from the start of play.
export function monthText(month: number) {
  return `第 ${Math.floor((month - 1) / 12) + 1} 年 ${(month - 1) % 12 + 1} 月`;
}

// Future events are read as days left. Showing both a calendar date and "还有 N 天" said the same
// thing twice; the date still belongs in the archive, where it describes something that happened.
export function dueText(state: any, day: number) {
  const left = day - state.day;
  return left > 0 ? `还有 ${left} 天` : left === 0 ? '今天' : '已过期';
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
    // Talk in days left, not in absolute day numbers: the player reads the calendar, not a day counter.
    const left = day - 7 - state.day;
    const detail = entry ? `已报名《${entry.name}》`
      : left > 0 ? `报名截止还有 ${left} 天 · 报名费 ${tier.fee} 万`
      : left === 0 ? `今天报名截止 · 报名费 ${tier.fee} 万`
      : '报名已截止';
    items.push({ day, kind: 'expo', title: tier.expo, detail, tier: level, own: !!entry, route: { menu: 'market' } });
  })));
  for (let day = (Math.floor(state.day / 180) + 1) * 180; day <= end; day += 180) items.push({ day, kind: 'awards', title: day % 360 ? '上半年评选' : '年度评选', detail: '城市、全国、国际三级' + (day % 360 ? '，只作荣誉' : '，成就以年度评选为准'), own: false, route: { menu: 'industry', id: 'awards:first:' + (state.focus || 0) } });
  for (let day = (Math.floor(state.day / RATING_PERIOD) + 1) * RATING_PERIOD; day <= end; day += RATING_PERIOD) items.push({ day, kind: 'rating', title: `${RATING_MEDIA}季度评级`, detail: '决定公司星级', own: true, route: { menu: 'rating' } });
  for (const item of scheduleOf(state)) {
    if (item.day > end) continue;
    items.push({ day: item.day, kind: 'release', title: item.name + ' 发售', detail: item.studio + ' · ' + TIERS[item.tier].name, own: false, route: item.studioId ? { menu: 'rival', id: item.studioId } : null });
  }
  return items.sort((left, right) => left.day - right.day);
}

function seedIndustry(state: any) {
  state.rivals = [];
  state.works = [];
  state.news = [];
  state.focus = 0;
  state.stars = 0;
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
    if (!book.parentId) book.relative = relativeOf(state, book);
    const [local, national, global] = book.firstRanks;
    const lost = Object.entries(book.clashLost || {}).map(([id, units]: any) => ({ name: state.works.find((work: any) => work.id === id)?.name || '对手作品', units: Math.round(units) })).filter((item: any) => item.units > 0).sort((left: any, right: any) => right.units - left.units);
    const firstWeek = Math.round(book.firstWeek || 0);
    book.clash = lost.length;
    book.weekOne = { units: firstWeek, lost, without: firstWeek + sum(lost.map((item: any) => item.units)) };
    const clashText = lost.length ? `被${lost.map((item: any) => `《${item.name}》分流约 ${item.units} 份`).join('、')}；不撞档大约能卖 ${book.weekOne.without} 份。` : '首周没有撞档。';
    news(state, state.focus, false, `《${book.name}》首周售出 ${firstWeek.toLocaleString('zh-CN')} 份`, `城市第 ${local} 名 · 全国第 ${national} 名 · 国际第 ${global} 名。`, null, true);
    // The first-week numbers live in the news, the archive and the ledger. A banner on top of all
    // three was the fourth copy of the same result, so it no longer pops up.
    studioLog(state, `《${book.name}》首周总结`, `首周售出 ${firstWeek} 份，全国首周榜第 ${national} 名。${clashText}`);
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
  studioLog(next, '展会报名成功', `《${project.name}》参加${dateText(offer.day)}的${offer.name}。`);
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

// Awards are honours only. June 30 judges the first half so players learn early where a title stands;
// December 30 judges the whole year and is the one achievements count.
function awardsDay(state: any) {
  if (state.day % 180 !== 0) return;
  const year = Math.ceil(state.day / 360);
  const half = state.day % 360 !== 0;
  if (state.awards.some((item: any) => item.year === year && !!item.half === half)) return;
  const inYear = (day: number) => day > (year - 1) * 360 && day <= state.day;
  const eligible = state.catalog.filter((book: any) => inYear(book.released));
  TIERS.forEach((tier, level) => tier.awards.forEach((category, index) => {
    const rivalScore = (work: any) => category === '年度作品' ? work.score : category === '创意奖' ? work.creativity : work.presentation;
    const ownScore = (book: any) => category === '年度作品' ? book.reviewScore : category === '创意奖' ? book.metrics.dimensions.creativity : (book.metrics.dimensions.picture + book.metrics.dimensions.sound) / 2;
    const rivals = state.works.filter((work: any) => work.tier <= level && inYear(work.released)).map((work: any) => ({ name: `《${work.name}》 · ${work.studioName}`, score: rivalScore(work), own: false }));
    const ranking = [...rivals, ...eligible.map((book: any) => ({ name: `《${book.name}》`, id: book.id, score: ownScore(book), own: true }))].sort((left, right) => right.score - left.score);
    const winner: any = ranking[0];
    if (!winner) return;
    const title = tier.name + (half ? (category === '年度作品' ? '上半年最佳作品' : '上半年' + category) : category);
    state.awards.push({ year, half, tier: level, category: title, winner: winner.name, book: winner.own ? winner.id : null, own: winner.own, ranking: ranking.slice(0, 8) });
    if (winner.own) {
      state.fans += half ? Math.round(tier.fans[index] / 2) : tier.fans[index];
      if (!half && level >= 1 && state.goals.award === null) state.goals.award = state.day;
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
  expoDay(state);
  awardsDay(state);
}

// ---- Random events ----
// Events are driven by the company's state and always offer a safe choice. Every outcome is rolled the
// moment the event appears, so the odds shown are honest and reloading never rerolls them.
const eventStage = (state: any) => state.office <= 1 ? 'early' : state.office === 2 ? 'mid' : 'late';
const shortOfCash = (state: any) => state.cash - state.accrued < monthlyCost(state) * 1.5;
const openProject = (state: any, test: (project: any) => boolean) => state.projects.find((project: any) => !project.released && project.kind === 'game' && test(project));
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
    return { title: '知名主播想直播体验版', text: `一位主播想在直播里玩《${project.name}》的体验版。${metrics.untested ? '还没测试，稳定是 0：被吐槽 50%。' : `稳定 ${metrics.dimensions.stability.toFixed(0)} 分：被吐槽 ${Math.round(bad * 100)}%。`}`, choices: [
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
    speed: 85, tags: [{ kind: 'personality', key: 'growth' }], wage: 0.8, hired: true, joined: state.day, home: homeWork({ role, abilities, home: '' }),
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
    // Only the title's own remaining work shrinks; modules keep their size for every title that uses them.
    if (effects.work && project.own) {
      for (const key of Object.keys(project.own.total)) project.own.total[key] = round(project.own.done[key] + (project.own.total[key] - project.own.done[key]) * (1 - effects.work));
      refreshWork(state, project);
    } else if (effects.work) for (const key of CONTENT_KEYS) { const work = project.work[key]; work.total = round(work.done + (work.total - work.done) * (1 - effects.work)); }
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
    studioLog(state, item.title, `${item.amount > 0 ? '到账' : '支付'} ${moneyText(Math.abs(item.amount))}。`);
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
  if (next && next.version === 8 && Array.isArray(next.catalog) && Array.isArray(next.projects)) {
    // 0.4.0: the studio starts at home, one office earlier than the hut; locked lines are learned in play.
    next.office = (next.office || 0) + 1;
    next.unlocked = {};
    for (const line of Object.keys(MODULES)) if (MODULES[line].unlock && releases(next) >= MODULES[line].unlock) next.unlocked[line] = next.day;
    next.rentLog = {};
    for (const project of next.projects) if (project.job) project.job.opening = true;
    next.version = 9;
  }
  // Lines learned during the opening job stay learned across saves.
  if (next && next.openingLearned) next.unlocked = { ...(next.unlocked || {}), ...next.openingLearned };
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
  if (next.rulesRevision < 8) {
    // Idle is a real choice from here on, so an empty work list means "do nothing". Old saves used the
    // empty list to mean "fall back to the home trade" (and an old UI bug could write one by accident),
    // so every empty list already on disk becomes the home trade once, on load.
    for (const project of next.projects) {
      if (!project.assignments) continue;
      for (const id of Object.keys(project.assignments)) {
        const list = project.assignments[id];
        if (!Array.isArray(list) || list.length) continue;
        const person = next.staff.find((item: any) => item.id === id);
        if (person) project.assignments[id] = [homeWork(person)];
      }
    }
    next.rulesRevision = 8;
  }
  if (next.rulesRevision < 9) {
    // Five stars instead of three, scored mostly on chart standing; the market range follows the stars.
    const score = ratingOf({ ...next, stars: 0 }).score;
    let stars = 0;
    while (stars < STAR_NAMES.length - 1 && score >= RATING_UP[stars + 1]) stars += 1;
    next.stars = stars;
    next.focus = STAR_RANGE[stars];
    next.rating = { score, watch: false, promotedAt: next.day - RATING_PERIOD - 1, history: [{ day: next.day, score, tier: stars }] };
    next.rulesRevision = 9;
  }
  // Announcing a release date and buying sound work are gone. Clear the leftovers on every load (not
  // just on a revision bump), so no save can resurrect a removed feature or its pending decision.
  for (const project of next.projects) {
    delete project.deadline;
    delete project.soundOut;
    // The bar counts testing now; old saves stored the five-dimension percentage in this field.
    if (!project.released && project.work && Array.isArray(project.defects)) project.progress = projectMetrics(project).progress;
  }
  if (next.event?.id === 'deadline') next.event = null;
  if (next.rulesRevision < 10) next.rulesRevision = 10;
  projectOrder(next).forEach((project: any, index: number) => { project.priority = index; });
  return next;
}

// The lines a project works on, each once, in the order the title uses them.
export function projectLines(project: any) {
  const lines: string[] = [];
  for (const id of project.parts || []) { const line = partOf(id)?.line; if (line && !lines.includes(line)) lines.push(line); }
  return lines;
}

// Shipping (or delivering a module project) settles the title's link to its modules. Progress already
// lives in the library, so this only counts the use, remembers the first title, files the defects each
// module still carries, and reports the lines that climbed a tier since the project started.
function keepModules(state: any, project: any) {
  const gained: any[] = [];
  for (const id of project.parts || []) {
    const record = moduleRecord(state, id);
    if (partBuilt(state, id)) record.uses += 1;
    if (!record.first && partBuilt(state, id)) record.first = project.name;
    for (const defect of project.defects) if (defect.module === id && !defect.fixed && !record.defects.some((item: any) => item.id === defect.id)) record.defects.push({ ...defect });
  }
  for (const line of projectLines(project)) {
    const level = lineInfo(state, line).level;
    const before = project.levels?.[line] || 0;
    if (level > before) gained.push({ id: line, level, from: before });
  }
  return gained;
}

// ---- Learning the market ----
// Locked lines are learned one at a time while titles are being made, mostly in the category the market
// is about right now; now and then one from another category slips in. Each one is a short moment with a
// person, a reason and what it opens.
const SIDE_EVERY = [4, 5];
// Rival releases in the studio's own range carrying the next category's tags the studio has to see
// before it reads that category by itself.
export const LENS_OBSERVE = 15;
export const LENS_EXPERT = 75;
export const LENS_FALLBACK = 6;

function lockedReady(state: any) {
  const open = (line: string) => !MODULES[line].unlock || !!(state.unlocked || {})[line];
  return Object.keys(MODULES).filter(line => !open(line) && (MODULES[line].needs || []).every(open));
}

function nextLesson(state: any) {
  const ready = lockedReady(state);
  if (!ready.length) return null;
  const lens = lensOf(state);
  const rank = (axis: string) => { const index = LENS_ORDER.indexOf(axis) - LENS_ORDER.indexOf(lens || LENS_ORDER[0]); return index < 0 ? index + LENS_ORDER.length : index; };
  const sorted = (list: string[]) => [...list].sort((left, right) => rank(MODULES[left].axis) - rank(MODULES[right].axis) || MODULES[left].unlock - MODULES[right].unlock);
  const main = sorted(ready.filter(line => MODULES[line].axis === lens));
  const side = sorted(ready.filter(line => MODULES[line].axis !== lens));
  const learn = state.learn || (state.learn = { main: 0, gap: SIDE_EVERY[0] });
  const takeSide = side.length && (!main.length || learn.main >= learn.gap);
  if (takeSide) {
    learn.main = 0;
    learn.gap = SIDE_EVERY[Math.floor(random(state) * SIDE_EVERY.length)];
    return side[0];
  }
  learn.main += 1;
  return main[0];
}

// Who on the team brings it up, and how they came by it.
function lessonSource(state: any, line: string, project: any) {
  const module = MODULES[line];
  const ability = LENS_ABILITY[module.axis];
  const expert = [...state.staff].sort((left: any, right: any) => right.abilities[ability] - left.abilities[ability])[0];
  if (expert && !expert.founder && expert.abilities[ability] >= 65) return { who: expert.name, how: `以前做过${module.name}，可以带大家上手` };
  const tags = module.tags || [];
  const seen = tags.length ? (state.works || []).filter((work: any) => work.released <= state.day && work.released > state.day - 180 && (work.tags || []).some((tag: string) => tags.includes(tag))).length : 0;
  const crew = project ? state.staff.filter((person: any) => belongsTo(state, project, person)) : [];
  const who = crew.length ? pick(state, crew).name : state.staff[0]?.name || '创始人';
  if (seen >= 3) return { who, how: `最近玩了好几款${tags[0]}作品，摸清了${module.name}的门道` };
  return { who, how: project ? `做《${project.name}》时琢磨出了${module.name}` : `琢磨出了${module.name}` };
}

function learnLine(state: any, project: any) {
  const line = nextLesson(state);
  if (!line) return null;
  state.unlocked = { ...(state.unlocked || {}), [line]: state.day };
  const module = MODULES[line];
  const source = lessonSource(state, line, project);
  const slot = SLOTS.find(item => item.key === module.slot);
  const text = `${source.how}。立项时${slot?.name || ''}可以选${module.name}了。`;
  announce(state, { kind: 'unlock', title: source.who, text, line, amount: 0 });
  studioLog(state, `学会${module.name}`, `${source.who}：${text}`);
  return line;
}

// How a title did against the same-scale titles of its market in the same year: 1 is the middle.
function relativeOf(state: any, book: any) {
  const tier = state.focus || 0;
  const peers = (state.works || []).filter((work: any) => work.tier === tier && work.scale === book.scale && work.released > book.released - 360 && work.released <= book.released + 6).map((work: any) => work.firstWeek).sort((left: number, right: number) => left - right);
  const middle = peers.length >= 3 ? peers[Math.floor(peers.length / 2)] : TIERS[tier].sales * scaleSales[book.scale];
  return round((book.firstWeek || 0) / Math.max(1, middle));
}

// The market moves on to the next category once the studio has a feel for this one: its last two titles
// held their own against the market, someone who knows the next category joined, the studio has watched
// enough titles of it, or six titles have passed regardless.
function checkLens(state: any) {
  const lens = lensOf(state);
  if (lens === null || !state.company) return;
  const from = state.lensFrom || 0;
  const books = state.catalog.filter((book: any) => !book.parentId && book.released >= from);
  if (!books.length) return;
  const axis = LENS_ORDER[LENS_ORDER.indexOf(lens) + 1] || null;
  const rated = books.filter((book: any) => book.relative !== undefined).slice(0, 2);
  let who = '';
  let how = '';
  if (rated.length >= 2 && sum(rated.map((book: any) => book.relative)) / 2 >= 1) {
    who = state.staff[0]?.name || '创始人';
    how = `最近两作在同体量里都站住了，${AXES[lens].name}算是摸清了`;
  } else if (books.length >= LENS_FALLBACK) {
    who = state.staff[0]?.name || '创始人';
    how = `做了这么多作，${AXES[lens].name}的门道也看得差不多了`;
  } else if (axis) {
    const expert = state.staff.find((person: any) => !person.founder && person.abilities[LENS_ABILITY[axis]] >= LENS_EXPERT);
    const seen = (state.works || []).filter((work: any) => work.tier <= (state.focus || 0) && work.released >= from && work.released <= state.day && (work.tags || []).some((tag: string) => TAG_AXIS[tag] === axis)).length;
    if (expert) { who = expert.name; how = `一眼就看出玩家开始在意${AXES[axis].name}了`; }
    else if (seen >= LENS_OBSERVE) { who = state.staff[0]?.name || '创始人'; how = `看了这么多新作，发现大家开始比拼${AXES[axis].name}了`; }
  }
  if (!how) return;
  state.lens = axis;
  state.lensFrom = state.day;
  const text = axis ? `${how}。接下来新闻、榜单和评价会多聊${AXES[axis].name}。` : `${how}。各类口味都心里有数了。`;
  announce(state, { kind: 'unlock', title: who, text, axis: axis || lens, amount: 0 });
  studioLog(state, axis ? `开始关注${AXES[axis].name}` : '摸清了市场', `${who}：${text}`);
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
  if (!state || state.version !== 9 || !Number.isInteger(state.day) || state.day < 1 || !text(state.company) || !number(state.cash) || !nonnegative(state.accrued) || typeof state.over !== 'boolean' || !object(state.modules) || !object(state.tags)) return false;
  if (!Array.isArray(state.staff) || !state.staff.every(person)) return false;
  if (!Array.isArray(state.projects) || !state.projects.every((project: any) => project && text(project.name) && has(TYPES, project.type) && scaleIndex(project.scale) && work(project.work) && Array.isArray(project.defects))) return false;
  if (!Array.isArray(state.catalog) || !state.catalog.every((book: any) => book && text(book.name) && has(TYPES, book.type) && scaleIndex(book.scale) && number(book.price) && book.price > 0 && object(book.metrics) && nonnegative(book.received) && Array.isArray(book.weekly))) return false;
  if (!object(state.goals) || !object(state.tutorial) || !object(state.overtime) || !Array.isArray(state.rankings) || !Array.isArray(state.exhibitions) || !Array.isArray(state.awards) || !Array.isArray(state.history) || !Array.isArray(state.reports)) return false;
  return true;
}

// ---- Save slots ----------------------------------------------------------------
// There used to be one save, and moving it between devices meant copying a huge JSON blob through a
// text box. Each playthrough now gets its own storage key; a small index remembers the active one.
export const SAVE_SLOT_LIMIT = 5;
export const SAVE_INDEX_KEY = 'sunlight-studio-slots';
export const SAVE_LEGACY_KEY = 'sunlight-studio-v2';
export const SAVE_LEGACY_BACKUP_KEY = 'sunlight-studio-v2-backup';
export const SAVE_RECOVERY_KEY = 'sunlight-studio-slot-recovery';
export const SAVE_SLOT_KEY = (id: number) => 'sunlight-studio-slot-' + id;

export function normalizeSaveIndex(value: any) {
  if (!value || !Array.isArray(value.slots)) return null;
  const slots = Array.from(new Set<number>(value.slots.map(Number).filter((id: number) => Number.isInteger(id) && id > 0))).slice(0, SAVE_SLOT_LIMIT);
  if (!slots.length) return null;
  const active = slots.includes(Number(value.active)) ? Number(value.active) : slots[0];
  return { active, nextId: Math.max(Math.max(...slots) + 1, Number(value.nextId) || 1), slots };
}

// Reading the raw save keeps the index tiny: a daily autosave never has to rewrite slot metadata.
export function slotSummary(raw: string | null, id: number, index: number, active: boolean) {
  const empty = { id, index, active, empty: true, error: false, company: '', day: 1, cash: 0, works: 0, staff: 0 };
  if (!raw) return empty;
  try {
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return { ...empty, error: true };
    return {
      id, index, active, error: false,
      empty: !saved.company,
      company: String(saved.company || ''),
      day: Number(saved.day) || 1,
      cash: Number(saved.cash) || 0,
      works: Array.isArray(saved.catalog) ? saved.catalog.length : 0,
      staff: Array.isArray(saved.staff) ? saved.staff.length : 0
    };
  } catch { return { ...empty, error: true }; }
}
