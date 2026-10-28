import * as core from './Studio';

export const money = (value: number) => Number(value).toFixed(2) + ' 万';
export const number = (value: number) => Math.round(value).toLocaleString('zh-CN');
// Spent this month: purchases already paid plus wages and rent accrued until month-end settlement.
export const monthSpent = (state: any) => state.ledger.expense + state.accrued;

export function stage(project: any) {
  const progress = project.done / project.total;
  return progress >= 1 ? '准备发售' : progress >= 0.55 ? 'Demo 与完善' : progress >= 0.25 ? '内容制作' : '原型开发';
}

export function guideOn(state: any) {
  return !!state.company && !state.tutorial.skipped && (state.catalog.length === 0 || state.catalog.length === 1 && !state.tutorial.seen.review);
}

export function menuLock(state: any, menu: string) {
  if (!core.tutorialActive(state)) return '';
  const checkpoints = state.project?.checkpoints || {};
  if (menu === 'tools' && !checkpoints.prototype) return '可玩原型完成后开放';
  if ((menu === 'testing' || menu === 'market') && !checkpoints.demo) return 'Demo 完成后开放';
  return '';
}

export function bestChannel(state: any) {
  return ['headhunt', 'web', 'friends'].find(channel => core.channelOpen(state, channel));
}

export function advice(state: any) {
  const project = state.project;
  if (state.over) return { title: '公司未能支付月底开支', text: '可在公司菜单导出或重新创业。', menu: 'finance' };
  if (state.event) return { title: state.event.title, text: '需要你做个决定，时间已暂停。', menu: 'event' };
  if (!state.staff.some((person: any) => person.role === 'code')) return { title: '招一位程序员', text: '程序员负责把想法做成游戏。', menu: 'recruit', id: 'code:' + bestChannel(state) };
  if (!project) {
    if (!state.catalog.length) return { title: '为第一款游戏立项', text: '首作是练习，建议选小型作品。', menu: 'new-project' };
    return { title: '为下一款作品立项', text: core.channelOpen(state, 'web') && state.staff.every((person: any) => person.skill < 60) ? '招聘网站已开放，可换更有经验的同事。' : '参考上一作复盘，弥补短板。', menu: 'new-project' };
  }
  if (project.focus !== 'develop') return { title: (project.focus === 'special' ? core.TYPES[project.type].special.name : core.FOCUS[project.focus].name) + '中', text: '新内容暂停，完成后自动回到开发。', menu: 'project' };
  if (project.done >= project.total - 0.001) {
    const missing = core.launchChecklist(state).filter(item => !item.ok).length;
    return { title: '内容完成，准备发售', text: missing ? '还可完善 ' + missing + ' 项，见项目菜单。' : '各项准备就绪，可以发售。', menu: 'project' };
  }
  const forecast = core.projectForecast(state);
  const progress = project.done / project.total;
  if (!forecast.code) return { title: '没有程序员在开发', text: '招聘程序员后才能继续开发。', menu: 'recruit', id: 'code:' + bestChannel(state) };
  if (progress >= 0.55 && !project.test && core.playtestOffer(state).available) return { title: '招募玩家试玩 Demo', text: '试玩能发现缺陷，了解玩家偏好。', menu: 'testing' };
  if (progress >= 0.55 && !project.promoted && project.followers < 1500) return { title: '推广 Demo', text: '关注 ' + number(project.followers) + ' 人，推广能扩大首发。', menu: 'market' };
  if (progress < 0.25) return { title: '开发可玩原型', text: forecast.protoDays === null ? '团队正在准备。' : '约 ' + forecast.protoDays + ' 天做出原型。', menu: 'project' };
  if (progress < 0.55) return { title: '制作 Demo', text: '约 ' + forecast.demoDays + ' 天后 Demo 可以试玩。', menu: 'project' };
  return { title: '完成剩余内容', text: '约 ' + forecast.days + ' 天后内容完成。', menu: 'project' };
}

function recruitMenu(state: any, id: string) {
  const [role, channel] = id.split(':');
  const pool = state.candidates[id];
  const blocks: any[] = [
    { type: 'tabs', items: Object.keys(core.CHANNELS).map(key => ({ text: core.CHANNELS[key].name, route: { menu: 'recruit', id: role + ':' + key }, active: key === channel, locked: !core.channelOpen(state, key) })) },
    { type: 'text', text: core.CHANNELS[channel].text + core.ROLES[role].task + '。', muted: true }
  ];
  if (!core.channelOpen(state, channel)) return { title: '招聘' + core.ROLES[role].name, blocks: [...blocks, { type: 'note', icon: 'Lock', text: core.CHANNELS[channel].name + core.CHANNELS[channel].lock + '。' }] };
  if (pool) {
    blocks.push({ type: 'candidates', people: pool.people });
    blocks.push({ type: 'text', text: '这批名单保持到第 ' + (pool.batch + 1) * 14 + ' 天，之后可以查看新一批。', muted: true });
  }
  const fresh = !pool || pool.batch !== Math.floor((state.day - 1) / 14);
  if (fresh) blocks.push({ type: 'buttons', items: [{ text: (pool ? '查看新一批简历' : '发布招聘') + ' · ' + money(core.CHANNELS[channel].fee), action: 'recruit', data: { role, channel }, primary: true, disabled: state.cash < core.CHANNELS[channel].fee, anchor: 'recruit' }] });
  blocks.push({ type: 'text', text: '工位 ' + state.staff.length + ' / ' + core.seats(state) + '；工资按在职天数累计，月底结算。', muted: true });
  return { title: '招聘' + core.ROLES[role].name, blocks };
}

function candidateMenu(state: any, id: string) {
  const person: any = Object.values(state.candidates).flatMap((pool: any) => pool.people).find((item: any) => item.id === id);
  if (!person) return { title: '简历已更新', blocks: [{ type: 'text', text: '请返回查看当前候选人。' }] };
  const projected = { ...state, staff: [...state.staff, person] };
  const before = core.rates(state);
  const after = core.rates(projected);
  const forecast = core.projectForecast(projected);
  const current = core.projectForecast(state);
  return {
    title: person.name + ' · ' + core.ROLES[person.role].name,
    blocks: [
      { type: 'lines', items: [['能力（影响作品质量）', String(person.skill)], ['速度（影响开发进度）', String(person.pace)], ['月薪', money(person.wage)]] },
      { type: 'note', icon: 'Star', text: core.TRAITS[person.trait].name + '：' + core.TRAITS[person.trait].text },
      { type: 'section', title: '录用后' },
      { type: 'lines', items: [
        ['月开支', money(core.monthlyCost(state)) + ' → ' + money(core.monthlyCost(projected))],
        [person.role === 'code' ? '开发速度' : '画面制作速度', before[person.role].toFixed(2) + ' → ' + after[person.role].toFixed(2) + ' /天'],
        ...(forecast && current && forecast.days !== null ? [['内容预计剩余', (current.days === null ? '—' : current.days + ' 天') + ' → ' + forecast.days + ' 天']] : [])
      ] },
      { type: 'buttons', items: [{ text: person.hired ? '已录用' : '录用 · 月薪 ' + money(person.wage), action: 'hire', data: { id: person.id }, primary: true, disabled: !!person.hired, anchor: 'hire' }] }
    ]
  };
}

function projectMenu(state: any) {
  const project = state.project;
  const forecast = core.projectForecast(state);
  const complete = project.done >= project.total - 0.001;
  const known = state.insights[project.type];
  const focus = Object.keys(core.FOCUS).map(key => {
    const reason = key === 'develop' ? (complete ? '计划内容已经完成' : '') : core.focusBlock(state, key);
    const name = key === 'special' ? core.TYPES[project.type].special.name : core.FOCUS[key].name;
    return { key, text: name + (key === 'bugs' && project.found ? '（' + project.found + ' 项）' : ''), detail: reason || core.FOCUS[key].text, active: project.focus === key, disabled: !!reason && project.focus !== key, anchor: 'focus-' + key };
  });
  return {
    title: '《' + project.name + '》',
    blocks: [
      { type: 'lines', items: [
        ['阶段', stage(project)],
        ['内容预计剩余', complete ? '已完成' : forecast.days === null ? '暂停中' : forecast.days + ' 天'],
        ['已投入', money(project.invested)],
        ['目标受众', core.TYPES[project.type].audience],
        ['受众最看重', known ? core.audienceFocus(project.type) : '试玩后可知']
      ] },
      { type: 'section', title: '程序员工作重点' },
      { type: 'focus', items: focus },
      { type: 'section', title: '发售准备' },
      { type: 'checklist', items: core.launchChecklist(state) },
      { type: 'buttons', anchor: 'launch-actions', items: [
        { text: '正式发售', action: 'launch', primary: true, disabled: !complete, anchor: 'launch' },
        { text: '画面方案', action: 'menu', data: { menu: 'visual' } },
        { text: '试玩', action: 'menu', data: { menu: 'testing' }, disabled: !!menuLock(state, 'testing'), anchor: 'menu-testing' },
        { text: '推广', action: 'menu', data: { menu: 'market' }, disabled: !!menuLock(state, 'market'), anchor: 'menu-market' }
      ] },
      { type: 'text', text: '只有“计划内容完成”是发售的必要条件，其余各项会影响评价和销量。', muted: true }
    ]
  };
}

function teamMenu(state: any) {
  const channel = bestChannel(state);
  return {
    title: '团队',
    blocks: [
      { type: 'lines', items: [['工位', state.staff.length + ' / ' + core.seats(state) + '（' + core.OFFICES[state.office].name + '）'], ['月开支（含房租）', money(core.monthlyCost(state))]] },
      { type: 'buttons', items: [
        { text: '招聘程序员', action: 'menu', data: { menu: 'recruit', id: 'code:' + channel }, anchor: 'recruit-code' },
        { text: '招聘美术', action: 'menu', data: { menu: 'recruit', id: 'art:' + channel } }
      ] },
      { type: 'staff' }
    ]
  };
}

function personMenu(state: any, id: string) {
  const person = state.staff.find((item: any) => item.id === id);
  if (!person) return { title: '员工已离职', blocks: [{ type: 'text', text: '可以返回团队查看其他同事。' }] };
  return {
    title: person.name,
    blocks: [
      { type: 'lines', items: [['岗位', core.ROLES[person.role].name], ['月薪', money(person.wage)], ['能力 / 速度', person.skill + ' / ' + person.pace], ['累计工作量', person.work.toFixed(1)]] },
      { type: 'note', icon: 'Star', text: core.TRAITS[person.trait].name + '：' + core.TRAITS[person.trait].text },
      { type: 'buttons', items: [{ text: '结束雇佣', action: 'menu', data: { menu: 'dismiss', id: person.id } }] },
      { type: 'text', text: '离职后不再计薪，已产生的工资仍需支付。', muted: true }
    ]
  };
}

function toolsMenu(state: any) {
  return {
    title: '工具',
    blocks: [
      { type: 'text', text: '工具属于公司，以后的作品都能用；没有对应岗位的同事时不起作用。', muted: true },
      ...Object.keys(core.STUDIO_TOOLS).map(role => {
        const tool = core.STUDIO_TOOLS[role];
        const before = core.rates({ ...state, tools: state.tools.filter((item: string) => item !== role) });
        const after = core.rates({ ...state, tools: state.tools.includes(role) ? state.tools : [...state.tools, role] });
        return { type: 'card', title: tool.name, text: tool.text + '\n当前团队：' + before[role].toFixed(2) + ' → ' + after[role].toFixed(2) + ' /天', button: { text: state.tools.includes(role) ? '已购置' : '购置 · ' + money(tool.cost), action: 'buy-tool', data: { role }, disabled: state.tools.includes(role) || state.cash < tool.cost, anchor: 'tool-' + role } };
      })
    ]
  };
}

function visualMenu(state: any) {
  const project = state.project;
  if (!project) return { title: '画面方案', blocks: [{ type: 'text', text: '先立项。' }] };
  const metrics = core.projectMetrics(project);
  const artists = state.staff.filter((person: any) => person.role === 'art').length;
  const cost = core.assetsCost(project);
  return {
    title: '画面方案',
    blocks: [
      { type: 'lines', items: [['视觉表现', metrics.visual.toFixed(1)], ['美术人数', String(artists)], ['画面完成', (project.artDone / project.artTotal * 100).toFixed(0) + '%']] },
      { type: 'text', text: '画面不会随开发自动变好。美术持续制作，越早加入越有时间做完；素材能立刻完成一部分；也可以保持朴素，交给玩家评判。' },
      { type: 'buttons', anchor: 'visual-options', items: [
        { text: project.assets ? '素材已采购' : '采购现成素材 · ' + money(cost), action: 'assets', disabled: !!project.assets || state.cash < cost, anchor: 'assets' },
        { text: '招聘美术', action: 'menu', data: { menu: 'recruit', id: 'art:' + bestChannel(state) } },
        { text: project.plain ? '已选择朴素画面' : '保持朴素画面', action: 'plain', disabled: !!project.plain }
      ] }
    ]
  };
}

function testingMenu(state: any) {
  const project = state.project;
  if (!project) return { title: '试玩', blocks: [{ type: 'text', text: '先立项，并把 Demo 做出来。' }] };
  const offer = core.playtestOffer(state);
  const blocks: any[] = [];
  if (project.test) {
    blocks.push({ type: 'result', label: '最近一次试玩评分', value: project.test.score.toFixed(1), note: project.test.count + ' 人 · 第 ' + project.test.day + ' 天 · 发现 ' + project.test.found + ' 项缺陷' });
    blocks.push({ type: 'note', icon: 'Target', text: core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type) });
    blocks.push({ type: 'feedback', items: project.test.findings });
    blocks.push({ type: 'text', text: '评分对应试玩时的版本。改进后再试玩，才能看到玩家是否认可。', muted: true });
  } else {
    blocks.push({ type: 'text', text: '缺陷藏在作品里，只有让玩家试玩才能发现；试玩还会告诉你这类玩家最看重什么。' });
  }
  blocks.push({ type: 'buttons', anchor: 'tests', items: [
    { text: '招募 30 人 · 0.80 万（发现约六成缺陷）', action: 'test', data: { count: 30 }, disabled: !offer.available || state.cash < 0.8, anchor: 'test-30' },
    { text: '招募 100 人 · 2.00 万（发现约九成缺陷）', action: 'test', data: { count: 100 }, disabled: !offer.available || state.cash < 2 }
  ] });
  if (!offer.available) blocks.push({ type: 'text', text: offer.reason || '先处理当前决策。', muted: true });
  return { title: '试玩', blocks };
}

function marketMenu(state: any) {
  const project = state.project;
  const blocks: any[] = [];
  if (project) {
    const trend = core.market(project.type, Math.ceil(state.day / 30));
    blocks.push({ type: 'lines', items: [['关注人数', number(project.followers)], ['当前市场', trend.label]] });
    blocks.push({ type: 'text', text: '首发销量主要来自关注者。Demo 完成后会自然积累关注，推广能大幅加快。' + trend.description, muted: true });
    core.PROMOTIONS.forEach((plan, index) => blocks.push({ type: 'card', group: 'promotions', title: plan.name, text: plan.text + ' 约新增 ' + number(plan.reach * trend.multiplier) + ' 人关注。', button: { text: '推广 · ' + money(plan.cost), action: 'promote', data: { tier: index }, disabled: project.done < project.total * 0.55 || state.cash < plan.cost, anchor: 'promote-' + index } }));
  }
  blocks.push({ type: 'section', title: '已发售作品' });
  if (state.catalog.length) blocks.push({ type: 'catalog' });
  else blocks.push({ type: 'text', text: '作品发售后，在这里查看销量、回款和复盘。', muted: true });
  return { title: '市场', blocks };
}

function bookMenu(state: any, id: string) {
  const book = state.catalog.find((item: any) => item.id === id);
  if (!book) return { title: '作品档案', blocks: [{ type: 'text', text: '没有找到该作品。' }] };
  const balance = book.received - book.invested;
  return {
    title: '《' + book.name + '》',
    blocks: [
      { type: 'cover', book },
      { type: 'stats', items: [['累计回款', money(book.received)], ['项目投入', money(book.invested)], [balance >= 0 ? '已盈利' : '尚差回本', money(Math.abs(balance))]], tone: balance >= 0 ? 'up' : 'down' },
      ...(book.review.reasons.length ? [{ type: 'section', title: book.tutorial ? '首作复盘：下一作怎么改' : '复盘' }, { type: 'reasons', items: book.review.reasons }] : []),
      { type: 'chart', book },
      ...(book.review.quotes.length ? [{ type: 'quotes', items: book.review.quotes }] : []),
      { type: 'lines', items: [
        ['玩家评价', book.reviewScore.toFixed(1) + ' · ' + number(book.reviewCount) + ' 人'],
        ['首发', number(book.openingUnits) + ' 份 · ' + money(book.openingReceipt)],
        ['累计销量', number(book.units) + ' 份'],
        ['最近一日', book.lastDayUnits + ' 份'],
        ['首发关注', number(book.openingFollowers) + ' 人'],
        ['发售时市场', book.trend]
      ] },
      { type: 'lines', items: [['玩法 / 视觉 / 稳定性', book.metrics.gameplay.toFixed(0) + ' / ' + book.metrics.visual.toFixed(0) + ' / ' + book.metrics.stability.toFixed(0)]] },
      { type: 'text', text: '团队：' + (book.team.length ? book.team.map((person: any) => person.name + '（' + core.ROLES[person.role].name + '）').join('、') : '—'), muted: true }
    ]
  };
}

function goalsMenu(state: any) {
  const goals = core.goalsOf(state);
  const canMove = state.goals.breakEven !== null && state.office === 0;
  return {
    title: '公司目标',
    blocks: [
      { type: 'goals', items: goals.steps, current: goals.current.key },
      ...(goals.current.key === 'record' ? [{ type: 'note', icon: 'Trophy', text: goals.current.title + '：' + goals.current.text }] : []),
      ...(canMove ? [{ type: 'buttons', items: [{ text: '搬进正式办公室 · ' + money(core.OFFICES[1].cost), action: 'move', primary: true, disabled: state.cash < core.OFFICES[1].cost }] }] : [])
    ]
  };
}

function financeMenu(state: any) {
  const blocks: any[] = [
    { type: 'lines', items: [['资金', money(state.cash)], ['本月已开支', money(monthSpent(state))], ['其中工资房租（月底扣除）', money(state.accrued)], ['预计月开支', money(core.monthlyCost(state))], ['办公室', core.OFFICES[state.office].name + ' · 房租 ' + money(core.OFFICES[state.office].rent) + '/月']] }
  ];
  if (state.office === 0) blocks.push({ type: 'buttons', items: [{ text: state.goals.breakEven === null ? '搬进正式办公室（第一次回本后开放）' : '搬进正式办公室 · ' + money(core.OFFICES[1].cost), action: 'move', disabled: state.goals.breakEven === null || state.cash < core.OFFICES[1].cost }] });
  if (state.report) {
    const report = state.report;
    blocks.push({ type: 'section', title: '第 ' + report.month + ' 月账单' });
    blocks.push({ type: 'lines', items: [['收入', money(report.income)], ['支出', money(report.expense)], ['其中工资与房租', money(report.payroll)], ['净变化', (report.net >= 0 ? '+' : '') + money(report.net)], ['月末资金', money(report.closing)]] });
  } else blocks.push({ type: 'text', text: '月底生成账单；采购、试玩等支出当场扣除。', muted: true });
  blocks.push({ type: 'buttons', items: [
    { text: '经营记录', action: 'menu', data: { menu: 'history' } },
    { text: '导出存档', action: 'export' },
    { text: '导入存档', action: 'import' },
    { text: '重新创业', action: 'menu', data: { menu: 'restart' } }
  ] });
  return { title: state.company || '公司', blocks };
}

function eventMenu(state: any) {
  const event = state.event;
  if (!event) return { title: '决策已处理', blocks: [{ type: 'text', text: '可以返回工作室继续经营。' }] };
  const released = event.id === 'release' ? state.catalog.find((book: any) => book.id === state.lastRelease) : null;
  const blocks: any[] = [];
  if (released) {
    blocks.push({ type: 'cover', book: released });
    blocks.push({ type: 'payout', amount: released.openingReceipt, label: '首发到账', note: '首发售出 ' + number(released.openingUnits) + ' 份 · 玩家评价 ' + released.reviewScore.toFixed(1) });
    if (released.review.quotes.length) blocks.push({ type: 'quotes', items: released.review.quotes });
    blocks.push({ type: 'text', text: event.text, muted: true });
    blocks.push({ type: 'buttons', items: [{ text: released.tutorial ? '查看首作复盘' : '查看发售复盘', action: 'review', data: { id: released.id }, primary: true, anchor: 'review' }] });
  } else blocks.push({ type: 'text', text: event.text });
  blocks.push({ type: 'choices', anchor: 'choices', items: event.choices.map((choice: any) => ({ text: choice.title, detail: choice.detail, action: 'decision', data: { choice: choice.id }, recommended: !!choice.recommended, anchor: choice.recommended || event.choices.length === 1 ? 'choice-main' : undefined, disabled: choice.id === 'assets' && state.project && state.cash < core.assetsCost(state.project) || choice.id === 'move' && state.cash < core.OFFICES[1].cost })) });
  return { title: event.title, blocks };
}

export function menu(state: any, route: any) {
  switch (route.menu) {
    case 'project': return state.project ? projectMenu(state) : { title: '项目', blocks: [{ type: 'text', text: '还没有进行中的项目。' }, { type: 'buttons', items: [{ text: '立项', action: 'menu', data: { menu: 'new-project' }, primary: true }] }] };
    case 'team': return teamMenu(state);
    case 'recruit': return recruitMenu(state, route.id);
    case 'candidate': return candidateMenu(state, route.id);
    case 'person': return personMenu(state, route.id);
    case 'dismiss': return { title: '确认结束雇佣', blocks: [{ type: 'text', text: '离职后停止工作和计薪；此前的工作和已累计的工资保留。' }, { type: 'buttons', items: [{ text: '确认离职', action: 'dismiss', data: { id: route.id }, primary: true }] }] };
    case 'tools': return toolsMenu(state);
    case 'visual': return visualMenu(state);
    case 'testing': return testingMenu(state);
    case 'market': return marketMenu(state);
    case 'book': return bookMenu(state, route.id);
    case 'goals': return goalsMenu(state);
    case 'finance': return financeMenu(state);
    case 'restart': return { title: '重新创业？', blocks: [{ type: 'text', text: '当前进度会被新公司覆盖。想保留这次经历，可以先导出存档。' }, { type: 'buttons', items: [{ text: '导出当前存档', action: 'export' }, { text: '确认重新创业', action: 'restart', primary: true }] }] };
    case 'event': return eventMenu(state);
    default: return { title: '工作室', blocks: [] };
  }
}

export function planPreview(state: any, draft: any) {
  if (state.project) return '';
  if (!core.TYPES[draft.type]) return '选择类型后，查看工作量与预计时间。';
  const type = core.TYPES[draft.type];
  const workload = type.work * core.SCALES[draft.scale].work;
  const forecast = core.projectForecast(core.startProject(state, { name: '预估', type: draft.type, scale: draft.scale }));
  const focus = state.insights[draft.type] ? type.audience + '最看重：' + core.audienceFocus(draft.type) + '。' : type.audience + '的偏好要试玩后才知道。';
  const time = forecast.days === null ? '还没有程序员，招聘后才能开发。' : '当前团队约 ' + forecast.days + ' 天完成，期间工资与房租约 ' + money(core.monthlyCost(state) * forecast.days / 30) + '。';
  return '工作量 ' + workload.toFixed(0) + '，' + time + focus;
}

// Tutorial step for the current screen. `ack` explains an area and waits for "知道了"; `tap` introduces a
// control and counts as seen once the player presses it; neither means "press the highlighted control".
export type GuideStep = { anchor: string; text: string; ack?: string; tap?: string };

export function guide(state: any, route: any, playing: boolean): GuideStep | null {
  if (!guideOn(state)) return null;
  const seen = state.tutorial.seen;
  const project = state.project;
  const hasCoder = state.staff.some((person: any) => person.role === 'code');
  const hasArt = state.staff.some((person: any) => person.role === 'art');
  const complete = !!project && project.done >= project.total - 0.001;
  const explain = (key: string, anchor: string, text: string): GuideStep | null => seen[key] ? null : { anchor, text, ack: key };
  const introduce = (key: string, anchor: string, text: string): GuideStep | null => seen[key] ? null : { anchor, text, tap: key };
  if (!route) {
    if (state.event) return { anchor: 'next', text: '有一个决定在等你，点这里查看。' };
    const steps: Array<() => GuideStep | null> = [
      () => introduce('goal', 'goal', '欢迎！你是工作室的创始人。点这里看看公司目标：完成后会解锁新能力。'),
      () => hasCoder ? null : { anchor: 'nav-team', text: '「团队」负责招聘和管理同事。点这里，招一位程序员把游戏做出来。' },
      () => explain('money', 'finance', '资金是你的全部家当。月开支 = 工资 + 房租，按天累计、月底统一从资金扣除；本月已开支是这个月到目前为止的花费。资金 ÷ 月开支 ≈ 还能撑几个月。'),
      () => project || state.catalog.length ? null : { anchor: 'nav-project', text: '「项目」负责立项、查看进度和发售。点这里，为第一款游戏立项。' },
      () => project ? explain('scene', 'scene', '上面是你的工作室，下面是作品雏形：开发越多内容越丰富，画面越好越精致。') : null,
      () => project ? explain('track', 'track', '阶段进度：完成度 55% 可以试玩，100% 可以发售。线上方是到下一阶段的天数。') : null,
      () => project && !playing && !seen.clock ? { anchor: 'clock', text: '点这里开始时间，团队每天推进开发。右边可以切换速度。' } : null,
      () => state.reports.length ? introduce('navFinance', 'nav-finance', '第一个月结算了：工资和房租已从资金扣除。点「公司」看看上个月的账单，目标、搬家和存档也在这里。') : null,
      () => project?.checkpoints.prototype ? introduce('navTools', 'nav-tools', '「工具」已开放：一次性付费，让对应岗位的同事干活更快。点开看看。') : null,
      () => project?.checkpoints.prototype ? explain('stats', 'stats', '这四项是作品表现：玩法和视觉越高评价越好（玩法随开发和打磨提高，视觉需要美术或素材）；已知缺陷要试玩后才能发现；关注人数决定首发能卖多少。不同类型的玩家看重的不一样。') : null,
      () => project?.checkpoints.demo ? introduce('navTesting', 'nav-testing', '「试玩」已开放：招募玩家试玩 Demo，发现缺陷、了解玩家偏好。点开看看。') : null,
      () => project?.checkpoints.demo ? introduce('navMarket', 'nav-market', '「市场」已开放：推广 Demo 增加关注人数，也在这里查看已发售作品。点开看看。') : null,
      () => project?.checkpoints.demo && !hasArt && !project.assets && !project.plain ? explain('plainArt', 'work', '作品画面还是灰色方块：没有美术，画面不会自己变好。可在「项目」→ 画面方案里处理。') : null,
      () => project?.assets ? explain('visualStat', 'stat-visual', '素材到位：视觉分提高了，上面的作品画面也从灰色方块变成了彩色。') : null,
      () => project?.test ? explain('defects', 'stat-defects', '已知缺陷：试玩发现的缺陷数。在「项目」里选择修复缺陷；再次试玩可能发现更多。') : null,
      () => project?.test ? explain('insight', 'insight', '受众偏好和试玩分：这类玩家最看重的排在前面，改进时优先照顾；分数是最近一次试玩的评价。') : null,
      () => complete && project.focus === 'develop' && !seen.checklist ? { anchor: 'nav-project', text: '内容完成了！点「项目」检查发售准备。' } : null,
      () => !project && state.catalog.length === 1 ? { anchor: 'nav-market', text: '点「市场」打开首作，看看复盘：哪里亏了，下一作怎么改。' } : null
    ];
    for (const step of steps) { const result = step(); if (result) return result; }
    return null;
  }
  switch (route.menu) {
    case 'team': return hasCoder ? null : { anchor: 'recruit-code', text: '点「招聘程序员」。' };
    case 'recruit': return state.candidates[route.id] ? (hasCoder ? null : { anchor: 'candidates', text: '能力影响作品质量，速度影响开发进度，月薪越高开支越大。比较一下，点开一位看看。' }) : { anchor: 'recruit', text: '发布招聘要花一点钱，熟人会推荐几位候选人。不同渠道费用和人才水平不同。' };
    case 'candidate': return hasCoder ? null : { anchor: 'hire', text: '工资按在职天数累计，月底结算。满意就录用。' };
    case 'new-project': return seen.form ? null : { anchor: 'project-form', text: '起个名字，再选一个类型。下方体量首作建议选小型：周期短、花费少。', ack: 'form' };
    case 'event':
      if (state.event?.id === 'release') {
        if (!seen.releaseResult) return { anchor: 'payout', text: '这是首发成绩：到账金额、售出份数和玩家评分。之后还会持续卖出，回款会继续增加。', ack: 'releaseResult' };
        return { anchor: 'review', text: '首作是练习，小亏也正常。看看复盘：哪里亏了，下一作怎么改。' };
      }
      return state.event?.choices.some((choice: any) => choice.recommended) ? { anchor: 'choices', text: '几种做法都可以，标「推荐」的适合新手。' } : null;
    case 'testing': return project && !project.test ? { anchor: 'tests', text: '30 人便宜，能发现约六成缺陷；100 人更贵，能发现约九成。' } : null;
    case 'market':
      if (project && !project.promoted) return { anchor: 'promotions', text: '推广能增加关注人数，首发销量主要来自关注者。首作预算有限，可以先从小的开始。' };
      return !project && state.catalog.length === 1 ? { anchor: 'book-0', text: '打开首作，看看复盘。' } : null;
    case 'project': {
      if (!complete || project.focus !== 'develop') return null;
      if (!seen.checklist) return { anchor: 'checklist', text: (project.found ? '还有 ' + project.found + ' 项已知缺陷。' : '') + '只有内容完成是发售的必需条件，其余各项影响评价和销量。想补哪项就补哪项：修复缺陷在上方「工作重点」，试玩和推广在下方按钮；准备好再发售。', ack: 'checklist' };
      return null;
    }
    case 'visual': return project && !project.assets && !project.plain && !hasArt ? { anchor: 'visual-options', text: '采购素材立刻见效、不增加月开支；招聘美术持续提升画面，但每月要发工资；也可以保持朴素。' } : null;
    default: return null;
  }
}
