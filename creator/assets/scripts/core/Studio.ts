// Pure business rules without engine imports, so they can also run in Node for balance checks.

export const TYPES: any = {
  story: { name: '叙事解谜', audience: '叙事玩家', weights: [0.45, 0.4, 0.15], work: 38, price: 0.006, special: { name: '打磨剧情演出', text: '重排关键剧情的节奏与演出，玩家更容易被故事带进去。' } },
  sim: { name: '模拟经营', audience: '经营玩家', weights: [0.6, 0.15, 0.25], work: 50, price: 0.008, special: { name: '调整经营节奏', text: '让收益反馈更快、目标更清楚，经营的成就感更强。' } },
  action: { name: '动作冒险', audience: '动作玩家', weights: [0.4, 0.25, 0.35], work: 62, price: 0.01, special: { name: '优化操作手感', text: '调整打击反馈与难度曲线，操作更顺手。' } }
};
export const SCALES = [
  { name: '小型', work: 1, price: 1, reach: 1, assets: 4 },
  { name: '中型', work: 1.65, price: 1.25, reach: 2, assets: 6 },
  { name: '大型', work: 2.4, price: 1.6, reach: 4, assets: 8 }
];
export const DIMENSIONS = ['玩法', '视觉', '稳定性'];
export const OFFICES = [
  { name: '起步小屋', seats: 4, rent: 1.5 },
  { name: '正式办公室', seats: 10, rent: 3, cost: 8 }
];
export const CHANNELS: any = {
  friends: { name: '熟人介绍', text: '朋友和同学推荐，能力参差，工资较低。', skill: [30, 58], pace: [60, 95], wage: [1, 0.02, 0.01, 0.4] },
  web: { name: '招聘网站', text: '公开招聘，候选人更有经验，工资也更高。', skill: [50, 80], pace: [70, 105], wage: [1.6, 0.03, 0.015, 0.6], lock: '完成首作后开放' },
  headhunt: { name: '行业推荐', text: '同行推荐的成熟开发者，能力强、要价高。', skill: [72, 95], pace: [85, 120], wage: [2.5, 0.035, 0.02, 0.8], lock: '搬进正式办公室后开放' }
};
export const ROLES: any = {
  code: { name: '程序员', task: '负责内容开发、玩法打磨与缺陷修复', traits: ['prototype', 'careful', 'systems'] },
  art: { name: '美术', task: '负责画面制作，让作品更好看', traits: ['efficient', 'detail', 'versatile'] }
};
export const TRAITS: any = {
  prototype: { name: '原型能手', text: '原型阶段开发速度提高 35%。' },
  careful: { name: '测试习惯', text: '新增缺陷减少 45%，修复速度提高 35%。' },
  systems: { name: '系统经验', text: '玩法打磨与专项改进速度提高 35%。' },
  efficient: { name: '交付熟练', text: '画面制作速度提高 25%。' },
  detail: { name: '细节打磨', text: '画面表现更好，制作速度降低 10%。' },
  versatile: { name: '风格适配', text: '画面制作速度提高 10%，表现略有提升。' }
};
export const STUDIO_TOOLS: any = {
  code: { name: '开发工具链', cost: 6, multiplier: 1.3, text: '程序员的开发、打磨与修复速度提高 30%。' },
  art: { name: '美术制作工具', cost: 5, multiplier: 1.25, text: '美术制作速度提高 25%，不直接提高画面表现。' }
};
export const PROMOTIONS = [
  { name: '核心圈层', cost: 2, reach: 350, text: '在同好社群发布 Demo，花费少。' },
  { name: '试玩展示', cost: 6, reach: 1100, text: '参加线上展会，让更多人上手 Demo。' },
  { name: '集中推广', cost: 12, reach: 2300, text: '投放媒体与主播，曝光最大。' }
];
export const UNIT_MARKS = [1000, 5000, 10000, 50000];
export const POLISH_CAP = 14;
const MARKET_SIZE = 5000;
export const SPECIAL_CAP = 10;
const START_CASH = 50;
const BRIDGE = 20;
const FAMILY_NAMES = ['林', '陈', '周', '许', '沈', '叶', '宋', '程', '顾', '苏', '陆', '江'];
const GIVEN_NAMES = ['知夏', '明远', '可宁', '星河', '亦舟', '思齐', '安然', '予墨', '嘉禾', '清和', '一帆', '若溪'];

const clone = (value: any) => JSON.parse(JSON.stringify(value));
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const round = (value: number) => Math.round(value * 100) / 100;
const tier = (value: any) => Number.isInteger(value) && value >= 0 && value <= 2;

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

export function createStudio(seed = Date.now()) {
  return {
    version: 3, seed: seed >>> 0, day: 1, company: '', cash: START_CASH,
    staff: [], project: null, catalog: [], tools: [], candidates: {},
    event: null, over: false, accrued: 0,
    ledger: { opening: START_CASH, income: 0, expense: 0, payroll: 0 },
    report: null, reports: [], history: [], tutorial: { skipped: false, seen: {} }, notices: {}, bridgeUsed: false, lastRelease: null,
    office: 0, goals: { firstRelease: null, breakEven: null, moved: null }, fans: 0, insights: {}, feed: []
  };
}

export const tutorialActive = (state: any) => !!state.company && state.catalog.length === 0 && !state.tutorial.skipped;
export const seats = (state: any) => OFFICES[state.office].seats;

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

export function nameCompany(state: any, name: string) {
  const next = studioAction(state);
  const value = String(name || '').trim().slice(0, 24);
  if (!value) throw new Error('请输入公司名称。');
  next.company = value;
  studioLog(next, '工作室成立', `${value}在一间小屋里起步，先做出第一款游戏。`);
  return next;
}

export function channelOpen(state: any, channel: string) {
  if (channel === 'web') return state.goals.firstRelease !== null;
  if (channel === 'headhunt') return state.office >= 1;
  return channel === 'friends';
}

export function publishRecruitment(state: any, role: string, channel = 'friends') {
  if (!Object.hasOwn(ROLES, role) || !Object.hasOwn(CHANNELS, channel)) throw new Error('招聘岗位无效。');
  if (!channelOpen(state, channel)) throw new Error(`${CHANNELS[channel].name}${CHANNELS[channel].lock}。`);
  const next = studioAction(state);
  const batch = Math.floor((next.day - 1) / 14);
  const key = `${role}:${channel}`;
  if (next.candidates[key] && next.candidates[key].batch === batch) return next;
  const source = CHANNELS[channel];
  const people = Array.from({ length: 3 }, (_, index) => {
    const skill = Math.round(source.skill[0] + random(next) * (source.skill[1] - source.skill[0]));
    const pace = Math.round(source.pace[0] + random(next) * (source.pace[1] - source.pace[0]));
    const trait = ROLES[role].traits[Math.floor(random(next) * ROLES[role].traits.length)];
    const name = FAMILY_NAMES[Math.floor(random(next) * FAMILY_NAMES.length)] + GIVEN_NAMES[Math.floor(random(next) * GIVEN_NAMES.length)];
    const wage = round(source.wage[0] + skill * source.wage[1] + (pace - source.pace[0]) * source.wage[2] + random(next) * source.wage[3]);
    return { id: `${role}-${channel}-${batch}-${index}-${next.seed}`, name, role, skill, pace, trait, wage, hired: false, work: 0 };
  });
  next.candidates[key] = { batch, people };
  studioLog(next, '发布招聘', `${source.name}送来 ${people.length} 份${ROLES[role].name}简历，名单保持到第 ${(batch + 1) * 14} 天。`);
  return next;
}

export function hire(state: any, id: string) {
  const next = studioAction(state);
  const person: any = Object.values(next.candidates).flatMap((pool: any) => pool.people).find((item: any) => item.id === id);
  if (!person || person.hired) throw new Error('候选人已不可录用。');
  if (next.staff.length >= seats(next)) throw new Error(`${OFFICES[next.office].name}只有 ${seats(next)} 个工位。`);
  if (next.cash - next.accrued < monthlyCost(next) + person.wage) throw new Error('资金不够支付录用后的近期工资，请先控制开支。');
  person.hired = true;
  next.staff.push({ ...person, joined: next.day });
  studioLog(next, `${person.name} 加入`, `${ROLES[person.role].name}，月薪 ${person.wage.toFixed(2)} 万；${TRAITS[person.trait].text}`);
  return next;
}

export function dismiss(state: any, id: string) {
  const next = studioAction(state);
  const person = next.staff.find((item: any) => item.id === id);
  if (!person) throw new Error('员工不存在。');
  next.staff = next.staff.filter((item: any) => item.id !== id);
  studioLog(next, `${person.name} 离职`, '此前的工作与已产生的工资保留，之后不再计薪。');
  return next;
}

function personRate(state: any, person: any) {
  let value = person.pace / 100;
  if (state.tools.includes(person.role)) value *= STUDIO_TOOLS[person.role].multiplier;
  return value;
}

export function rates(state: any) {
  const project = state.project;
  let code = 0;
  let art = 0;
  for (const person of state.staff) {
    let value = personRate(state, person);
    if (person.role === 'code' && person.trait === 'prototype' && project && project.done < project.total * 0.25) value *= 1.35;
    if (person.role === 'art') value *= person.trait === 'efficient' ? 1.25 : person.trait === 'detail' ? 0.9 : 1.1;
    if (person.role === 'code') code += value;
    else art += value;
  }
  return { code, art };
}

export function startProject(state: any, plan: any) {
  const next = studioAction(state);
  if (!next.company) throw new Error('请先命名公司。');
  if (next.project) throw new Error('请先完成当前项目。');
  if (!plan || !Object.hasOwn(TYPES, plan.type) || !tier(plan.scale)) throw new Error('请选择作品类型与体量。');
  const name = String(plan.name || '').trim().slice(0, 24);
  if (!name) throw new Error('请为作品取个名字。');
  const total = TYPES[plan.type].work * SCALES[plan.scale].work;
  next.project = {
    id: `${next.day}-${next.seed}-${next.catalog.length}`, name, type: plan.type, scale: plan.scale,
    total, done: 0, artTotal: total * 0.7, artDone: 0, codeValue: 0, artValue: 0,
    defects: 0, defectDebt: 0, found: 0, fixWork: 0, polish: 0, special: 0, focus: 'develop', invested: 0,
    followers: Math.round(80 * market(plan.type, Math.ceil(next.day / 30)).multiplier + next.fans * 0.5), promoted: 0,
    checkpoints: {}, test: null, tests: 0, testCount: 0, assets: false, plain: false, started: next.day
  };
  studioLog(next, '新作立项', `《${name}》面向${TYPES[plan.type].audience}，${SCALES[plan.scale].name}作品。`);
  return next;
}

export function projectMetrics(project: any) {
  const progress = project.done / project.total;
  const ability = project.done > 0 ? project.codeValue / project.done : 0;
  const artAbility = project.artDone > 0 ? project.artValue / project.artDone : 0;
  const craft = ability * 0.4 + project.polish + project.special;
  return {
    progress: round(progress * 100),
    gameplay: round(clamp(progress * 45 + craft, 0, 98)),
    craft: round(clamp(craft / 0.53, 0, 100)),
    visual: round(clamp(Math.max(15, project.artDone / project.artTotal * (18 + artAbility * 0.75)), 0, 98)),
    stability: round(clamp(98 - project.defects * 4, 18, 98)),
    defects: project.defects
  };
}

export function projectForecast(state: any) {
  if (!state.project) return null;
  const project = state.project;
  const capacity = rates(state);
  const remaining = Math.max(0, project.total - project.done);
  const protoTarget = project.total * 0.25;
  const demoTarget = project.total * 0.55;
  let days: number | null = remaining <= 0 ? 0 : null;
  let protoDays: number | null = project.done >= protoTarget ? 0 : null;
  let demoDays: number | null = project.done >= demoTarget ? 0 : null;
  if (remaining > 0 && capacity.code && project.focus === 'develop') {
    const probe = clone(state);
    days = 0;
    while (probe.project.done < probe.project.total - 0.001 && days < 10000) {
      produceDay(probe);
      days += 1;
      if (protoDays === null && probe.project.done >= protoTarget - 0.001) protoDays = days;
      if (demoDays === null && probe.project.done >= demoTarget - 0.001) demoDays = days;
    }
  }
  return { ...capacity, days, protoDays, demoDays, metrics: projectMetrics(project) };
}

export function buyTool(state: any, role: string) {
  if (!Object.hasOwn(STUDIO_TOOLS, role)) throw new Error('工具不存在。');
  const next = studioAction(state);
  if (next.tools.includes(role)) throw new Error('该工具已购置。');
  spend(next, STUDIO_TOOLS[role].cost, `购置${STUDIO_TOOLS[role].name}`);
  next.tools.push(role);
  return next;
}

export const assetsCost = (project: any) => SCALES[project.scale].assets;

export function buyAssets(state: any) {
  const next = studioAction(state);
  if (!next.project || next.project.assets) throw new Error('当前无法采购素材。');
  const project = next.project;
  spend(next, assetsCost(project), '采购画面素材');
  const amount = Math.min(project.artTotal - project.artDone, project.artTotal * 0.55);
  project.artDone += amount;
  project.artValue += amount * 64;
  project.assets = true;
  project.invested = round(project.invested + assetsCost(project));
  return next;
}

export function keepPlain(state: any) {
  const next = studioAction(state);
  if (!next.project) throw new Error('当前没有项目。');
  next.project.plain = true;
  studioLog(next, '保持朴素画面', '不额外投入画面，发售后观察玩家是否接受。');
  return next;
}

export const FOCUS: any = {
  develop: { name: '内容开发', text: '继续实现计划内容。' },
  polish: { name: '玩法打磨', text: '暂停新内容，提升已有玩法的手感。' },
  special: { name: '专项改进', text: '暂停新内容，针对试玩反馈做类型专属改进。' },
  bugs: { name: '修复缺陷', text: '暂停新内容，修复试玩发现的缺陷。' }
};

export function focusBlock(state: any, focus: string) {
  const project = state.project;
  if (!project) return '当前没有项目。';
  if (focus === 'polish' && project.polish >= POLISH_CAP) return '玩法已打磨到当前上限。';
  if (focus === 'special' && !project.test) return '先做一次试玩，才知道该改进什么。';
  if (focus === 'special' && project.special >= SPECIAL_CAP) return '专项改进已经完成。';
  if (focus === 'bugs' && !project.found) return project.test ? '目前没有已知缺陷。' : '还没有试玩，缺陷尚未被发现。';
  return '';
}

export function setFocus(state: any, focus: string) {
  if (!Object.hasOwn(FOCUS, focus)) throw new Error('工作安排无效。');
  const reason = focusBlock(state, focus);
  if (reason) throw new Error(reason);
  const next = studioAction(state);
  next.project.focus = focus;
  studioLog(next, '调整开发重点', FOCUS[focus].text);
  return next;
}

function audienceScore(metrics: any, type: string) {
  const weights = TYPES[type].weights;
  return metrics.gameplay * weights[0] + metrics.visual * weights[1] + metrics.stability * weights[2];
}

export function audienceFocus(type: string) {
  const weights = TYPES[type].weights;
  return [0, 1, 2].sort((left, right) => weights[right] - weights[left]).map(index => DIMENSIONS[index]).join(' > ');
}

function hasArt(state: any) {
  return state.staff.some((person: any) => person.role === 'art') || state.project.assets;
}

function findings(state: any, metrics: any, newlyFound: number) {
  const project = state.project;
  const weights = TYPES[project.type].weights;
  const incomplete = metrics.progress < 99.9;
  const gameplay = incomplete
    ? `内容完成 ${metrics.progress.toFixed(0)}%，玩家觉得还不够玩，这是开发未完成，继续内容开发即可。${metrics.craft < 45 ? '已完成部分手感一般，内容做完后值得打磨。' : '已完成部分的手感得到认可。'}`
    : metrics.gameplay < 70 ? '内容完整，但玩起来还不够有趣，可以打磨玩法或做专项改进。' : '玩法得到认可，继续打磨仍可能提高评价。';
  const visual = metrics.visual < 35
    ? (hasArt(state) ? '画面还在制作中，美术完成后会继续改善。' : '画面以占位图为主，玩家明显在意。可以招聘美术或采购素材。')
    : metrics.visual < 60 ? '画面能看，但不够出彩；美术越早加入，越有时间做精致。' : '画面清楚好看，已有的美术投入得到认可。';
  const stability = newlyFound ? `本轮发现 ${newlyFound} 项缺陷，目前已知 ${project.found} 项；修复后体验会更好。` : project.found ? `没有发现新缺陷，仍有 ${project.found} 项已知缺陷待修复。` : '本轮没有发现明显缺陷。';
  const items = [
    { key: 'gameplay', title: '玩法', value: metrics.gameplay, text: gameplay },
    { key: 'visual', title: '视觉', value: metrics.visual, text: visual },
    { key: 'stability', title: '稳定性', value: metrics.stability, text: stability }
  ];
  const gap = (item: any) => (100 - (item.key === 'gameplay' && incomplete ? metrics.craft : item.value)) * weights[['gameplay', 'visual', 'stability'].indexOf(item.key)];
  return items.sort((left, right) => gap(right) - gap(left));
}

export function playtestOffer(state: any) {
  const project = state.project;
  const reason = !project ? '先立项开发' : project.done < project.total * 0.55 ? '完成度达到 55% 后 Demo 才能试玩' : project.test && state.day - project.test.day < 3 ? '距上次试玩至少间隔 3 天' : '';
  return { available: !reason && !state.over && !state.event, reason };
}

export function feedbackChoices(state: any) {
  const project = state.project;
  const metrics = projectMetrics(project);
  const weights = TYPES[project.type].weights;
  const incomplete = project.done < project.total - 0.001;
  const visualWeak = metrics.visual < 35 && !hasArt(state);
  const special = TYPES[project.type].special;
  let recommended = incomplete ? 'develop' : project.found && metrics.stability < 80 ? 'bugs' : project.special < SPECIAL_CAP ? 'special' : 'polish';
  if (visualWeak && (tutorialActive(state) || (100 - metrics.visual) * weights[1] >= (100 - metrics.craft) * weights[0])) recommended = 'visual';
  const choices = [
    incomplete ? { id: 'develop', title: '继续内容开发', detail: '先把计划内容做完，完整的作品才是评价的基础。', reason: '内容还没做完，玩家觉得不够玩主要是因为这个，先继续开发。' } : { id: 'launch', title: '正式发售', detail: '内容已经完成，带着当前表现发售。', reason: '' },
    metrics.visual < 60 ? { id: 'visual', title: '补充画面：招聘美术或采购素材', detail: '打开画面方案，比较费用与效果，不会自动付费。', reason: '画面还是占位图，而且不会随开发自动变好，越早安排越好。' } : null,
    project.special < SPECIAL_CAP ? { id: 'special', title: special.name, detail: `${special.text}暂停新内容，完成后自动回到开发。`, reason: `玩家希望这一点做得更好：${special.text}` } : null,
    project.polish < POLISH_CAP ? { id: 'polish', title: '集中打磨玩法', detail: '暂停新内容，提升已有玩法，到上限后自动回到开发。', reason: '内容完整，但玩起来还不够有趣。' } : null,
    project.found ? { id: 'bugs', title: `修复已知缺陷（${project.found} 项）`, detail: '暂停新内容，修完后自动回到开发。', reason: '已知缺陷会明显拉低评价，先修复。' } : null
  ].filter(Boolean).map((choice: any) => ({ ...choice, recommended: choice.id === recommended }));
  return choices.sort((left: any, right: any) => Number(right.recommended) - Number(left.recommended));
}

export function testDemo(state: any, count = 30) {
  if (![30, 100].includes(count)) throw new Error('测试批次无效。');
  const offer = playtestOffer(state);
  if (!offer.available) throw new Error(offer.reason || '先处理当前决策。');
  const next = studioAction(state);
  const cost = count === 30 ? 0.8 : 2;
  spend(next, cost, '招募试玩玩家');
  const project = next.project;
  const newlyFound = Math.round((project.defects - project.found) * (count === 30 ? 0.6 : 0.9));
  project.found += newlyFound;
  const metrics = projectMetrics(project);
  const feedback = findings(next, metrics, newlyFound);
  const score = round(clamp(audienceScore(metrics, project.type) + (random(next) - 0.5) * 6 * Math.sqrt(30 / count), 0, 100));
  project.invested = round(project.invested + cost);
  project.tests += 1;
  project.testCount += count;
  project.followers += Math.round(count * score / 100 * 2);
  project.test = { day: next.day, count, score, findings: feedback, found: newlyFound, source: '试玩玩家' };
  next.insights[project.type] = true;
  const choices = feedbackChoices(next);
  const advice = choices.find((choice: any) => choice.recommended)?.reason;
  next.event = {
    id: 'feedback', title: '试玩反馈送达',
    text: `${count} 位${TYPES[project.type].audience}给出 ${score.toFixed(1)} 分，发现 ${newlyFound} 项缺陷。他们最看重：${audienceFocus(project.type)}。${advice ? '\n建议：' + advice : ''}`,
    choices: choices.map(({ reason, ...choice }: any) => choice)
  };
  studioLog(next, 'Demo 试玩', `${count} 人参与，评分 ${score.toFixed(1)}，发现 ${newlyFound} 项缺陷。`);
  return next;
}

export function promote(state: any, tierIndex: number) {
  if (![0, 1, 2].includes(tierIndex)) throw new Error('推广方案无效。');
  const next = studioAction(state);
  if (!next.project || next.project.done < next.project.total * 0.55) throw new Error('Demo 完成后才能推广。');
  const plan = PROMOTIONS[tierIndex];
  const gain = Math.round(plan.reach * market(next.project.type, Math.ceil(next.day / 30)).multiplier);
  spend(next, plan.cost, `推广：${plan.name}`);
  next.project.followers += gain;
  next.project.promoted += 1;
  next.project.invested = round(next.project.invested + plan.cost);
  studioLog(next, '推广结果', `新增 ${gain} 位关注者；关注不等于购买。`);
  return next;
}

export function launchChecklist(state: any) {
  const project = state.project;
  const metrics = projectMetrics(project);
  return [
    { label: '计划内容完成', ok: project.done >= project.total - 0.001, required: true, text: `完成度 ${metrics.progress.toFixed(0)}%` },
    { label: '做过试玩', ok: !!project.test, text: project.test ? `${project.test.count} 人 · ${project.test.score.toFixed(1)} 分` : '没有试玩，问题会在发售后才暴露' },
    { label: '已知缺陷已修复', ok: !!project.test && !project.found, text: project.test ? (project.found ? `还有 ${project.found} 项` : '已知缺陷修完，再试玩可能发现剩余缺陷') : '尚未发现' },
    { label: '画面', ok: metrics.visual >= 35, text: metrics.visual >= 35 ? `视觉 ${metrics.visual.toFixed(0)}` : '以占位图为主，评价会受影响' },
    { label: '关注人数', ok: project.followers >= 1500, text: `${Math.round(project.followers)} 人${project.followers >= 1500 ? '' : '，推广能扩大首发'}` }
  ];
}

function reviewOf(state: any, project: any, metrics: any, followers: number) {
  const coders = state.staff.filter((person: any) => person.role === 'code');
  const skill = coders.length ? coders.reduce((sum: number, person: any) => sum + person.skill, 0) / coders.length : 0;
  const reasons = [
    !project.tests && { title: '发售前没有试玩', text: '缺陷和玩家意见都在发售后才暴露。下一作在 Demo 阶段先招募试玩。' },
    followers < 1500 && { title: '关注人数偏少', text: `首发时只有 ${Math.round(followers)} 人关注。Demo 完成后在市场菜单推广，首发会更稳。` },
    metrics.visual < 35 && { title: '画面是占位图', text: '下一作在立项后就招聘美术，或在原型后采购素材。' },
    metrics.visual >= 35 && metrics.visual < 50 && { title: '画面不够出彩', text: '素材只能解决一部分。下一作立项就招聘美术，让画面有时间做完。' },
    metrics.stability < 70 && { title: '缺陷较多', text: '试玩发现缺陷后，留几天集中修复再发售。' },
    metrics.gameplay < 72 && !project.polish && !project.special && { title: '玩法缺少打磨', text: '内容完成后留出时间打磨，或按试玩反馈做专项改进。' },
    coders.length && skill < 55 && { title: '团队经验不足', text: '起步阶段的同事能力有限。招聘网站开放后，可以找到更有经验的程序员。' }
  ].filter(Boolean).slice(0, 4);
  if (!reasons.length) reasons.push({ title: '各方面都比较扎实', text: '保持这套做法，下一作可以尝试更大的体量。' });
  const values = [metrics.gameplay, metrics.visual, metrics.stability];
  const lines = [
    ['停不下来，又玩到了半夜。', '玩法还行，就是少了点惊喜。', '玩法有点单薄，几个小时就腻了。'],
    ['画面很舒服，截图都能当壁纸。', '画面干净，但有点普通。', '画面太简陋了，像还没做完。'],
    ['很稳定，一次都没崩过。', '偶尔有小问题，不影响游玩。', '闪退了好几次，希望尽快修复。']
  ];
  const level = (value: number) => value >= 70 ? 0 : value >= 45 ? 1 : 2;
  const quotes = [0, 1, 2].sort((left, right) => Math.abs(values[right] - 58) - Math.abs(values[left] - 58))
    .map(index => ({ text: lines[index][level(values[index])], positive: level(values[index]) === 0, negative: level(values[index]) === 2 }));
  return { reasons, quotes };
}

export function launchProject(state: any) {
  const next = studioAction(state);
  const project = next.project;
  if (!project || project.done < project.total - 0.001) throw new Error('计划内容尚未完成。');
  const metrics = projectMetrics(project);
  const trend = market(project.type, Math.ceil(next.day / 30));
  const score = round(clamp(audienceScore(metrics, project.type) + (random(next) - 0.5) * 3, 0, 100));
  const fit = project.test ? clamp(project.test.score / 100, 0.15, 0.95) : clamp(score / 100 * 0.85, 0.15, 0.95);
  const ceiling = MARKET_SIZE * SCALES[project.scale].reach;
  const units = Math.max(1, Math.round(Math.min(ceiling * 0.6, project.followers * (0.2 + fit * 0.5) * trend.multiplier)));
  const price = TYPES[project.type].price * SCALES[project.scale].price;
  const receipt = round(units * price);
  const best = Math.max(0, ...next.catalog.map((book: any) => book.openingReceipt));
  const book = {
    id: project.id, name: project.name, type: project.type, scale: project.scale,
    released: next.day, metrics, invested: round(project.invested), received: receipt,
    price, units, openingUnits: units, openingReceipt: receipt, openingFollowers: Math.round(project.followers),
    followers: Math.round(project.followers), dailyUnits: units / 15, reviewScore: score,
    reviewCount: Math.max(1, Math.round(units * 0.12)), tested: project.tests > 0,
    testScore: project.test ? project.test.score : null, testCount: project.testCount, trend: trend.label,
    lastGrowth: 0, lastDayUnits: units, team: next.staff.map((person: any) => ({ name: person.name, role: person.role, trait: person.trait })),
    weekly: [receipt], paidBack: receipt >= project.invested, marks: 0, record: next.catalog.length > 0 && receipt > best,
    tutorial: next.catalog.length === 0, review: reviewOf(next, project, metrics, project.followers)
  };
  next.cash = round(next.cash + receipt);
  next.ledger.income = round(next.ledger.income + receipt);
  next.catalog.unshift(book);
  next.lastRelease = book.id;
  next.project = null;
  if (next.goals.firstRelease === null) next.goals.firstRelease = next.day;
  announce(next, { kind: 'release', title: `《${book.name}》发售`, text: `首发售出 ${units} 份`, amount: receipt, book: book.id });
  if (book.record) announce(next, { kind: 'record', title: '新纪录', text: `首发到账超过此前最好成绩 ${best.toFixed(2)} 万`, amount: receipt });
  checkMarks(next, book);
  const lesson = book.tutorial ? '首作是练习，小亏很正常；看看复盘，下一作照着改。' : '首发到账不等于最终利润，后续销量取决于玩家口碑。';
  next.event = { id: 'release', title: `《${book.name}》正式发售`, text: `首发售出 ${units} 份，到账 ${receipt.toFixed(2)} 万。${lesson}`, choices: [{ id: 'continue', title: '收下成绩，继续经营', detail: book.tutorial ? '招聘网站已经开放，可以为下一作找更有经验的同事。' : '后续销量与评价继续变化，可以筹备下一款作品。' }] };
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
  if (next.office >= 1) throw new Error('已经在正式办公室了。');
  if (next.goals.breakEven === null) throw new Error('第一次回本后才能搬进正式办公室。');
  spend(next, OFFICES[1].cost, '搬进正式办公室');
  next.office = 1;
  next.goals.moved = next.day;
  announce(next, { kind: 'office', title: '搬进正式办公室', text: `${OFFICES[1].seats} 个工位，行业推荐渠道已开放`, amount: 0 });
  return next;
}

export function goalsOf(state: any) {
  const goals = state.goals;
  const steps = [
    { key: 'firstRelease', title: '完成首作', text: '把第一款游戏做完并发售。首作是练习，小亏也没关系。', reward: '开放招聘网站', done: goals.firstRelease !== null },
    { key: 'breakEven', title: '第一次回本', text: '让一款作品的回款超过投入。', reward: '可以搬进正式办公室', done: goals.breakEven !== null },
    { key: 'moved', title: '搬进正式办公室', text: `在公司菜单搬家，一次性 ${OFFICES[1].cost} 万。`, reward: `${OFFICES[1].seats} 个工位，开放行业推荐`, done: goals.moved !== null }
  ];
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
  }
  if (choice === 'move') return moveOffice(next);
  if (!next.project) return next;
  if (choice === 'assets') return buyAssets(next);
  if (choice === 'plain') return keepPlain(next);
  if (choice === 'launch') return launchProject(next);
  if (['develop', 'polish', 'special', 'bugs'].includes(choice) && !focusBlock(next, choice)) next.project.focus = choice;
  if (event.id === 'demo' && choice === 'skip' && !hasArt(next) && !next.project.plain) next.event = visualHint(next, false);
  return next;
}

function visualHint(state: any, tested: boolean) {
  const cost = assetsCost(state.project);
  return {
    id: 'visual', title: '画面还是占位图',
    text: `${tested ? '试玩玩家' : '工作室自查发现'}：作品目前没有美术，画面以占位图为主。画面不会随开发自动变好，越早安排，美术越有时间做完。`,
    choices: [
      { id: 'recruit', title: '查看美术招聘', detail: '比较候选人与月薪，美术会持续制作画面。' },
      { id: 'assets', title: `采购现成素材 · ${cost} 万`, detail: '一次性付费，立刻完成部分画面。首作省时省钱的做法。', recommended: true },
      { id: 'plain', title: '保持朴素画面', detail: '不额外投入，发售后看玩家是否接受。' }
    ]
  };
}

function produceDay(state: any) {
  const project = state.project;
  if (!project) return;
  project.invested += monthlyCost(state) / 30;
  for (const person of state.staff) {
    let amount = personRate(state, person);
    if (person.role === 'code') {
      if (project.focus === 'bugs') {
        project.fixWork += amount * (person.trait === 'careful' ? 1.35 : 1);
        while (project.fixWork >= 1 && project.found > 0) { project.defects -= 1; project.found -= 1; project.fixWork -= 1; }
      } else if (project.focus === 'polish') {
        project.polish = Math.min(POLISH_CAP, project.polish + amount * (person.trait === 'systems' ? 0.81 : 0.6));
      } else if (project.focus === 'special') {
        project.special = Math.min(SPECIAL_CAP, project.special + amount * (person.trait === 'systems' ? 1.08 : 0.8));
      } else {
        if (person.trait === 'prototype' && project.done < project.total * 0.25) amount *= 1.35;
        amount = Math.min(amount, project.total - project.done);
        project.done += amount;
        project.codeValue += amount * person.skill;
        project.defectDebt += amount * (100 - person.skill) / 100 * 0.35 * (person.trait === 'careful' ? 0.55 : 1);
        while (project.defectDebt >= 1) { project.defects += 1; project.defectDebt -= 1; }
      }
    } else {
      amount *= person.trait === 'efficient' ? 1.25 : person.trait === 'detail' ? 0.9 : 1.1;
      amount = Math.min(amount, project.artTotal - project.artDone);
      project.artDone += amount;
      project.artValue += amount * Math.min(100, person.skill + (person.trait === 'detail' ? 16 : person.trait === 'versatile' ? 7 : 0));
    }
    person.work = round(person.work + amount);
  }
  const progress = project.done / project.total;
  if (progress >= 0.25) project.followers += (progress >= 0.55 ? 8 : 3) * market(project.type, Math.ceil(state.day / 30)).multiplier;
}

function finishFocus(state: any) {
  const project = state.project;
  if (!project || project.focus === 'develop') return;
  const done = project.focus === 'polish' ? project.polish >= POLISH_CAP : project.focus === 'special' ? project.special >= SPECIAL_CAP : project.found === 0;
  if (!done) return;
  const name = FOCUS[project.focus].name;
  project.focus = 'develop';
  project.fixWork = 0;
  const complete = project.done >= project.total - 0.001;
  if (complete) project.checkpoints.ready = false;
  announce(state, { kind: 'notice', title: `${name}完成`, text: complete ? '计划内容已完成，可以准备发售。' : '团队已自动回到内容开发。', amount: 0 });
  studioLog(state, `${name}完成`, complete ? '计划内容已完成。' : '团队回到内容开发。');
}

function salesDay(state: any) {
  for (const book of state.catalog) {
    const age = state.day - book.released;
    if (age <= 0 || age > 360) continue;
    const growth = clamp(0.955 + (book.reviewScore - 55) * 0.0025, 0.9, 1.03);
    const saturation = Math.max(0.05, 1 - book.units / (MARKET_SIZE * SCALES[book.scale].reach));
    book.dailyUnits = Math.max(0, book.dailyUnits * growth * (0.97 + saturation * 0.03) * Math.min(1, saturation * 4));
    const units = Math.max(0, Math.round(book.dailyUnits));
    const income = round(units * book.price);
    book.lastDayUnits = units;
    book.lastGrowth = round((growth - 1) * 100);
    book.units += units;
    const reviews = Math.round(units * 0.12);
    if (reviews) {
      const score = clamp(audienceScore(book.metrics, book.type) + (random(state) - 0.5) * 6 / Math.sqrt(reviews), 0, 100);
      book.reviewScore = round((book.reviewScore * book.reviewCount + score * reviews) / (book.reviewCount + reviews));
      book.reviewCount += reviews;
    }
    const fans = Math.max(0, units * (book.reviewScore - 50) / 100 * 0.3);
    book.followers += Math.round(fans);
    state.fans = round(state.fans + fans);
    book.received = round(book.received + income);
    const week = Math.min(51, Math.floor(age / 7));
    while (book.weekly.length <= week) book.weekly.push(0);
    book.weekly[week] = round(book.weekly[week] + income);
    state.cash = round(state.cash + income);
    state.ledger.income = round(state.ledger.income + income);
    checkMarks(state, book);
  }
}

function cashWarning(state: any) {
  const key = Math.floor((state.day - 1) / 30);
  if (!state.company || state.cash - state.accrued >= monthlyCost(state) * 0.6 || state.notices[`cash-${key}`]) return null;
  state.notices[`cash-${key}`] = true;
  return { id: 'cash', title: '近期工资需要准备', text: `现金 ${state.cash.toFixed(2)} 万，已累计应付 ${state.accrued.toFixed(2)} 万。可以先看看团队和账单再继续。`, choices: [...(!state.bridgeUsed ? [{ id: 'bridge', title: '投入创始人积蓄', detail: `补充 ${BRIDGE} 万，整局只能用一次，不代表经营问题已经解决。` }] : []), { id: 'continue', title: '自行调整后继续', detail: '不获得额外资金，月底仍需支付已产生的费用。' }] };
}

function studioCheckpoint(state: any) {
  const warning = cashWarning(state);
  if (warning) return warning;
  const project = state.project;
  const tutorial = tutorialActive(state);
  if (project) {
    const ratio = project.done / project.total;
    if (ratio >= 0.25 && !project.checkpoints.prototype) {
      project.checkpoints.prototype = true;
      studioLog(state, '可玩原型完成', '核心玩法已经能跑起来了。');
      if (tutorial) return { id: 'prototype', title: '第一个可玩原型', text: '核心玩法已经能跑起来了！工具菜单已开放：开发工具能让程序员更快，但要一次性付费。', choices: [{ id: 'continue', title: '继续开发', detail: '不额外花钱，按现在的安排推进。', recommended: true }, { id: 'tools', title: '看看开发工具', detail: '比较费用与提速效果，不会自动购买。' }] };
    }
    if (ratio >= 0.55 && !project.checkpoints.demo) {
      project.checkpoints.demo = true;
      studioLog(state, 'Demo 可试玩', '可以招募试玩玩家，也可以开始推广。');
      if (tutorial) return { id: 'demo', title: 'Demo 能玩了', text: '试玩和市场菜单已开放。招募玩家试玩，才能发现隐藏的缺陷，知道玩家最在意什么。', choices: [{ id: 'test', title: '招募首批试玩玩家', detail: '30 人只要 0.8 万。', recommended: true }, { id: 'skip', title: '先不试玩，继续开发', detail: '省下费用，但缺陷和玩家意见要到发售后才知道。' }] };
    }
    if (ratio >= 1 && !project.checkpoints.ready) {
      project.checkpoints.ready = true;
      const missing = launchChecklist(state).filter(item => !item.ok).map(item => item.label);
      return { id: 'ready', title: '计划内容完成', text: `《${project.name}》可以发售了。${missing.length ? `发售前还可以完善：${missing.join('、')}。` : '各项准备都已就绪。'}`, choices: [{ id: 'launch', title: '正式发售', detail: '首发销量取决于关注人数和玩家评价。', recommended: !missing.length }, { id: 'prepare', title: '先完善再发售', detail: '可以试玩、修复、打磨或推广，之后在项目菜单发售。', recommended: !!missing.length }] };
    }
  }
  if (state.goals.breakEven !== null && state.office === 0 && !state.notices.moveOffer) {
    state.notices.moveOffer = true;
    return { id: 'move', title: '第一次回本！', text: `公司终于赚到钱了。现在可以搬进正式办公室：${OFFICES[1].seats} 个工位，并开放行业推荐渠道。基础月开支从 ${OFFICES[0].rent} 万变为 ${OFFICES[1].rent} 万。`, choices: [{ id: 'move', title: `搬进正式办公室 · ${OFFICES[1].cost} 万`, detail: '一次性费用，之后可以招更多、更强的同事。', recommended: true }, { id: 'later', title: '暂时不搬', detail: '随时可以在公司菜单搬家。' }] };
  }
  return null;
}

export function monthlyCost(state: any) {
  return round(OFFICES[state.office].rent + state.staff.reduce((sum: number, person: any) => sum + person.wage, 0));
}

export function stepDay(state: any) {
  if (state.over) throw new Error('公司已停止经营。');
  if (state.event) throw new Error('请先处理关键决策。');
  const next = clone(state);
  const warning = cashWarning(next);
  if (warning) { next.event = warning; return next; }
  next.accrued += monthlyCost(next) / 30;
  produceDay(next);
  finishFocus(next);
  salesDay(next);
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
  if (!next.over) next.event = studioCheckpoint(next);
  return next;
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

function validStudio(state: any) {
  const number = (value: any) => typeof value === 'number' && Number.isFinite(value);
  const nonnegative = (value: any) => number(value) && value >= 0;
  const text = (value: any) => typeof value === 'string' && value.length <= 5000;
  const identifier = (value: any) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
  const object = (value: any) => value && typeof value === 'object' && !Array.isArray(value);
  const day = (value: any) => value === null || Number.isInteger(value);
  const person = (value: any) => value && identifier(value.id) && text(value.name) && Object.hasOwn(ROLES, value.role) && ROLES[value.role].traits.includes(value.trait) && number(value.skill) && value.skill >= 0 && value.skill <= 100 && number(value.pace) && value.pace > 0 && value.pace <= 200 && number(value.wage) && value.wage > 0 && nonnegative(value.work) && typeof value.hired === 'boolean';
  const metrics = (value: any) => value && ['progress', 'gameplay', 'visual', 'stability', 'defects'].every(key => nonnegative(value[key]));
  const feedback = (value: any) => value && Number.isInteger(value.day) && nonnegative(value.count) && number(value.score) && value.score >= 0 && value.score <= 100 && Array.isArray(value.findings) && value.findings.every((item: any) => item && text(item.key) && text(item.title) && number(item.value) && text(item.text));
  const choice = (value: any) => value && identifier(value.id) && text(value.title) && text(value.detail);
  if (!state || state.version !== 3 || !Number.isInteger(state.day) || state.day < 1 || !Number.isInteger(state.seed) || !text(state.company) || !number(state.cash) || !nonnegative(state.accrued) || typeof state.over !== 'boolean' || typeof state.bridgeUsed !== 'boolean') return false;
  if (!Number.isInteger(state.office) || !OFFICES[state.office] || !object(state.goals) || !['firstRelease', 'breakEven', 'moved'].every(key => day(state.goals[key])) || !nonnegative(state.fans) || !object(state.insights) || !Array.isArray(state.feed) || state.feed.length > 10) return false;
  if (!Array.isArray(state.staff) || state.staff.length > 16 || !state.staff.every(person) || new Set(state.staff.map((item: any) => item.id)).size !== state.staff.length) return false;
  if (!Array.isArray(state.tools) || !state.tools.every((key: any) => Object.hasOwn(STUDIO_TOOLS, key)) || new Set(state.tools).size !== state.tools.length) return false;
  if (!object(state.candidates) || !Object.entries(state.candidates).every(([key, pool]: any) => { const [role, channel] = key.split(':'); return Object.hasOwn(ROLES, role) && Object.hasOwn(CHANNELS, channel) && pool && Number.isInteger(pool.batch) && Array.isArray(pool.people) && pool.people.length <= 3 && pool.people.every((item: any) => person(item) && item.role === role); })) return false;
  if (!state.ledger || !number(state.ledger.opening) || !['income', 'expense', 'payroll'].every(key => nonnegative(state.ledger[key]))) return false;
  if (!object(state.notices) || !object(state.tutorial) || typeof state.tutorial.skipped !== 'boolean' || !object(state.tutorial.seen)) return false;
  if (!Array.isArray(state.history) || !state.history.every((item: any) => item && Number.isInteger(item.day) && text(item.title) && text(item.text))) return false;
  if (state.event && (!identifier(state.event.id) || !text(state.event.title) || !text(state.event.text) || !Array.isArray(state.event.choices) || !state.event.choices.length || !state.event.choices.every(choice))) return false;
  if (state.report && (!Number.isInteger(state.report.month) || !['opening', 'income', 'expense', 'payroll', 'closing', 'net'].every(key => number(state.report[key])))) return false;
  if (!Array.isArray(state.reports) || state.reports.length > 600 || !state.reports.every((item: any) => item && Number.isInteger(item.month) && item.month >= 1 && ['opening', 'income', 'expense', 'payroll', 'closing', 'net'].every(key => number(item[key])))) return false;
  if (state.project) {
    const project = state.project;
    if (!identifier(project.id) || !text(project.name) || !Object.hasOwn(TYPES, project.type) || !tier(project.scale) || !['total', 'done', 'artTotal', 'artDone', 'codeValue', 'artValue', 'defects', 'defectDebt', 'found', 'fixWork', 'polish', 'special', 'invested', 'followers', 'promoted', 'tests', 'testCount', 'started'].every(key => nonnegative(project[key])) || project.total <= 0 || project.artTotal <= 0 || project.done > project.total + 0.001 || project.artDone > project.artTotal + 0.001 || project.found > project.defects || !Object.hasOwn(FOCUS, project.focus) || !object(project.checkpoints) || typeof project.assets !== 'boolean' || typeof project.plain !== 'boolean' || project.test && !feedback(project.test)) return false;
  }
  const review = (value: any) => object(value) && Array.isArray(value.reasons) && value.reasons.every((item: any) => item && text(item.title) && text(item.text)) && Array.isArray(value.quotes) && value.quotes.every((item: any) => item && text(item.text));
  if (!Array.isArray(state.catalog) || !state.catalog.every((book: any) => book && identifier(book.id) && text(book.name) && Object.hasOwn(TYPES, book.type) && tier(book.scale) && metrics(book.metrics) && ['released', 'invested', 'received', 'price', 'units', 'openingUnits', 'openingReceipt', 'openingFollowers', 'followers', 'dailyUnits', 'reviewScore', 'reviewCount', 'testCount', 'lastDayUnits', 'marks'].every(key => nonnegative(book[key])) && book.price > 0 && number(book.lastGrowth) && (book.testScore === null || number(book.testScore)) && typeof book.tested === 'boolean' && text(book.trend) && Array.isArray(book.team) && book.team.every((item: any) => item && text(item.name) && Object.hasOwn(ROLES, item.role) && Object.hasOwn(TRAITS, item.trait)) && Array.isArray(book.weekly) && book.weekly.length <= 52 && book.weekly.every(nonnegative) && review(book.review))) return false;
  return state.lastRelease === null || typeof state.lastRelease === 'string';
}

function migrateV2(saved: any) {
  const next = clone(saved);
  next.version = 3;
  next.office = next.staff.length > OFFICES[0].seats ? 1 : 0;
  next.goals = {
    firstRelease: next.catalog.length ? Math.min(...next.catalog.map((book: any) => book.released)) : null,
    breakEven: next.catalog.some((book: any) => book.received >= book.invested) ? next.day : null,
    moved: next.office ? next.day : null
  };
  next.fans = 0;
  next.insights = {};
  next.feed = [];
  next.candidates = {};
  next.tutorial = { skipped: next.catalog.length > 0, seen: {} };
  next.notices = { ...next.notices, moveOffer: next.office === 1 };
  next.reports = Array.isArray(next.reports) ? next.reports : [];
  if (next.event && !['cash', 'ready', 'release'].includes(next.event.id)) next.event = null;
  if (next.project) {
    Object.assign(next.project, { found: next.project.test ? next.project.defects : 0, fixWork: 0, special: 0, promoted: 0 });
    if (next.project.focus === 'bugs' && !next.project.found) next.project.focus = 'develop';
  }
  for (const book of next.catalog) {
    book.weekly = [book.received];
    book.paidBack = book.received >= book.invested;
    book.paidBackAnnounced = book.paidBack;
    book.marks = UNIT_MARKS.filter(mark => book.units >= mark).length;
    book.record = false;
    book.tutorial = false;
    book.review = { reasons: [], quotes: [] };
    delete book.legacyRemaining;
    delete book.legacyDaily;
  }
  return next;
}

export function restoreStudio(saved: any) {
  const next = saved && saved.version === 2 ? migrateV2(saved) : clone(saved);
  if (!validStudio(next)) throw new Error('这不是有效的工作室存档，当前进度没有改变。');
  return next;
}
