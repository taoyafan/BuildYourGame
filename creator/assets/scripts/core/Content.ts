import * as core from './Studio';

// One formatter for every figure in the UI; the rule lives in core so log text matches the cards.
export const money = core.moneyText;
export const number = (value: number) => Math.round(value).toLocaleString('zh-CN');
export const price = (value: number) => (value * 10000).toFixed(0) + ' 元/份';
export function salesHistory(book: any) {
  const weekly: number[] = Array.isArray(book.weekly) && book.weekly.length ? book.weekly.map((value: number) => Number.isFinite(value) ? Math.max(0, value) : 0) : [0];
  let total = 0;
  const cumulative = weekly.map(value => { total = Number((total + value).toFixed(2)); return total; });
  return { weekly, cumulative, cost: Math.max(0, Number(book.invested) || 0) };
}
// Spent this month: purchases already paid plus wages and rent accrued until month-end settlement.
export const monthSpent = (state: any) => state.ledger.expense + state.accrued;

export function stage(project: any) {
  const progress = project.progress || 0;
  if (project.job) return progress >= 100 ? '交付' : '委托制作';
  return progress >= 100 ? '准备发售' : progress >= 55 ? '体验版与完善' : progress >= 25 ? '内容制作' : '原型开发';
}

export function guideOn(state: any) {
  return !!state.company && !state.tutorial.skipped && (state.catalog.length === 0 || state.catalog.length === 1 && !state.tutorial.seen.review);
}

export function menuLock(state: any, menu: string) {
  // The market is about a build that exists. Opening it at day one let a player walk into an empty
  // page before the prototype was even done.
  const shown = core.projectOpen(state).some((project: any) => project.checkpoints.demo) || state.catalog.length > 0;
  if (menu === 'market' && !shown) return '任一项目 体验版完成后开放';
  return '';
}

export function bestChannel(state: any) {
  return ['headhunt', 'web', 'friends'].find(channel => core.channelOpen(state, channel));
}

// The main screen can look at any running title, so the bottom card speaks only for the one on
// screen. Global alerts (a pending event, a full office) stay global; every project-specific line
// resolves against `shown` rather than the first title in the list.
export function advice(state: any, projectId?: string) {
  const shown = projectId ? state.projects.find((item: any) => item.id === projectId) || null : null;
  const project = shown || core.liveProjects(state)[0] || core.projectOpen(state)[0] || null;
  if (state.over) return { title: '公司没能支付月底开支', text: '点这里到「公司」页底部，加载别的存档或重新创业。', menu: 'finance' };
  if (state.event) return { title: state.event.title, text: '需要你做个决定，时间已暂停。', menu: 'event' };
  if (project?.job) return { title: '完成委托', text: '做完' + core.MODULES[project.job.module].name + '可得 ' + money(project.job.pay) + '，模块留给你。完成度 ' + project.progress.toFixed(0) + '%。', menu: 'project', id: project.id };
  const worker = state.staff[0];
  if (!worker) return { title: '招一位同事', text: '先从熟人推荐里招一位同事，一起把第一款游戏做出来。', menu: 'recruit', id: 'code:' + bestChannel(state) };
  // `chosenWorks` only reads explicit assignments and is empty for someone on their default home
  // work, yet production uses `personWorks`. Counting explicit assignments alone said "nobody is
  // fixing the bugs" while the whole crew was busy. Use the same rule the day simulation uses.
  const staffed = (item: any) => !!item && state.staff.some((person: any) => core.personWorks(state, item, person).length);
  if (project?.patch && !staffed(project)) return { title: '《' + project.name + '》的补丁还没有人做', text: '需要安排人手，做完自动上线。', menu: 'assign', id: project.id };
  // Known defects are repaired by whoever still works on this title: once a person's own items are
  // finished, their hours go to repairs. Only a completely unstaffed title leaves them open.
  if (project && !project.released && defectsByDimension(project) && !staffed(project)) return { title: '《' + project.name + '》的缺陷没人修', text: '待修：' + defectsByDimension(project) + '。给它留一个人，做完自己的部分就会去修。', menu: 'assign', id: project.id };
  // A finished, clean build has exactly one thing left to do. Give it priority over optional advice
  // (playtest, promotion, a bigger office) and land the player on the release button itself.
  if (project && !project.released && project.progress >= 100 && !defectsByDimension(project)) {
    return { title: '发售《' + project.name + '》', text: '内容做满、缺陷修完。点这里到项目页最下方正式发售。', menu: 'project', id: project.id, bottom: true, emphasis: true };
  }
  const bigger = core.OFFICES[state.office + 1];
  if (bigger && state.staff.length >= core.seats(state) && state.cash >= bigger.cost + core.monthlyCost(state) * 2) return { title: '工位坐满了：可以考虑搬到更大的办公室', text: bigger.name + ' ' + bigger.seats + ' 个工位，搬家 ' + money(bigger.cost) + '，月租 ' + money(bigger.rent) + '。点这里去「公司」看看。', menu: 'finance' };
  // A shipped title has no six-dimension pipeline left; only its patch is actionable.
  if (project?.released) {
    if (!project.patch) return { title: '《' + project.name + '》已发售', text: '看看成绩单，或者再开一部新作品。', menu: 'project', id: project.id };
    const patch = core.patchForecast(state, project);
    const left = patch ? Number(patch.left) : NaN;
    const days = patch ? patch.days : null;
    const text = !Number.isFinite(left) ? '点开可看补丁进度与人手。' : days === null ? '还没有人做这个补丁，安排人手后才会开始修。' : days === 0 ? '即将上线。' : `还剩 ${left.toFixed(1)} 人日，约 ${days} 天上线。`;
    return { title: '推进《' + project.name + '》补丁', text, menu: 'project', id: project.id };
  }
  if (!project) {
    if (!state.catalog.length) return { title: '为第一款游戏立项', text: '首作是练习，建议选小型作品。', menu: 'new-project' };
    return { title: '为下一款作品立项', text: '参考上一作复盘，先补最被在意的短板。', menu: 'new-project' };
  }
  if (!staffed(project) && !state.staff.some((person: any) => person.role === 'code' || person.role === 'design' || person.role === 'art')) {
    return { title: '还没有人做《' + project.name + '》', text: '在「项目」里给同事分配要做的工作。', menu: 'project', id: project.id };
  }
  const pipeline = core.dimensionPipeline(state, project);
  // Testing can be skipped on purpose, but an unstaffed test is still called out like any other row.
  const idle = pipeline.rows.filter((row: any) => row.days === null && row.remaining > 0);
  if (idle.length) return { title: '《' + project.name + '》有评分项没人做', text: `${idle.map((row: any) => core.DIMENSIONS.find(d => d.key === row.key)?.name).join('、')}还没有人负责。`, menu: 'project', id: project.id };
  if (state.staff.some((person: any) => person.stressTags.length)) return { title: '有人状态不对', text: '负面标签正在拉低产出，团建能清掉它们，但要全队停工。', menu: 'team' };
  if (project.progress >= 55 && !project.test && core.playtestOffer(state, project).available) return { title: '《' + project.name + '》招募玩家试玩体验版', text: '试玩能发现缺陷，了解玩家偏好。', menu: 'testing', id: project.id };
  if (project.progress >= 55 && !project.promoted && project.followers < 1500) return { title: '《' + project.name + '》推广体验版', text: '关注 ' + number(project.followers) + ' 人；每部作品只推广一次，先看看每位关注值多少。', menu: 'market', id: project.id };
  if (pipeline.bottleneck) return { title: '推进《' + project.name + '》', text: `最慢的是${core.bottleneckName(pipeline.bottleneck.key)}，约 ${pipeline.bottleneck.days} 天。`, menu: 'project', id: project.id };
  return { title: '推进《' + project.name + '》', text: '查看各评分项的剩余人日与预计完成日，点开可给对应的人分工。', menu: 'project', id: project.id };
}

function recruitMenu(state: any, id: string) {
  // 没有指定岗位或渠道时不报错：退回第一个已开放的组合，界面上仍有可点的入口。
  const openRole = Object.keys(core.ROLES).find((key: string) => core.roleOpen(state, key)) || 'code';
  const openChannel = bestChannel(state) || 'friends';
  let [role, channel] = String(id || openRole + ':' + openChannel).split(':');
  // Old links and stale routes may point at a job or channel that is still locked. Fall back to an
  // open combination instead of rendering a dead page.
  if (!core.ROLES[role] || !core.roleOpen(state, role)) role = openRole;
  if (!core.CHANNELS[channel] || !core.channelOpen(state, channel)) channel = openChannel;
  const pool = state.candidates[role + ':' + channel];
  const fee = core.recruitFee(state, channel);
  const roles = Object.keys(core.ROLES).filter((key: string) => core.roleOpen(state, key));
  const channels = Object.keys(core.CHANNELS);
  const blocks: any[] = [
    { type: 'tabs', items: roles.map(key => ({ text: core.ROLES[key].name, route: { menu: 'recruit', id: key + ':' + channel }, active: key === role })) },
    { type: 'tabs', items: channels.map(key => ({ text: core.CHANNELS[key].name + (core.channelOpen(state, key) ? '' : ' · 待解锁'), route: { menu: 'recruit', id: role + ':' + key }, active: key === channel, locked: !core.channelOpen(state, key) })) },
    { type: 'text', text: core.ROLES[role].task + '。' + core.CHANNELS[channel].text, muted: true }
  ];
  if ((state.notices.layout || 0) > 0) blocks.push({ type: 'note', icon: 'Users', text: '近期裁员影响了公司的招聘吸引力，招聘费用已上浮。' });
  const lockedRoles = Object.keys(core.ROLES).filter((key: string) => !core.roleOpen(state, key));
  const lockedChannels = Object.keys(core.CHANNELS).filter((key: string) => !core.channelOpen(state, key));
  if (lockedRoles.length) blocks.push({ type: 'text', text: lockedRoles.map((key: string) => core.ROLES[key].name).join('、') + '岗位在首作发售后开放。', muted: true });
  if (lockedChannels.length) blocks.push({ type: 'text', text: lockedChannels.map((key: string) => core.CHANNELS[key].name + core.CHANNELS[key].lock).join('；') + '。', muted: true });
  if (pool) {
    blocks.push({ type: 'candidates', people: pool.people });
    blocks.push({ type: 'text', text: '这批名单保持到第 ' + (pool.batch + 1) * 14 + ' 天，之后可以查看新一批。', muted: true });
  }
  const fresh = !pool || pool.batch !== Math.floor((state.day - 1) / 14);
  if (fresh) blocks.push({ type: 'buttons', items: [{ text: (pool ? '查看新一批简历' : '发布招聘') + ' · ' + money(fee), action: 'recruit', data: { role, channel }, disabled: state.cash < fee, anchor: 'recruit' }] });
  blocks.push({ type: 'text', text: '工位 ' + state.staff.length + ' / ' + core.seats(state) + '；工资按在职天数累计，月底结算。', muted: true });
  return { title: '招聘' + core.ROLES[role].name, blocks };
}

export function menu(state: any, route: any, slots: any[] = []) {
  if (!route) return null;
  switch (route.menu) {
    case 'setup': return { title: '成立工作室', blocks: [] };
    case 'slots': return slotsMenu(slots);
    case 'new-slot-confirm': return newSlotConfirmMenu(slots);
    case 'slot': return slotMenu(slots, route.id);
    case 'slot-delete': return slotDeleteMenu(slots, route.id);
    case 'new-project': return newProjectMenu(state);
    case 'project': return projectMenu(state, route.id);
    case 'launch-confirm': return launchConfirmMenu(state, route.id);
    case 'dimension': return dimensionMenu(state, route.id, route.dim);
    case 'assign': return assignMenu(state, route.id);
    case 'testing': return testingMenu(state, route.id);
    case 'library': return libraryMenu(state, route.id);
    case 'compose': return composeMenu(state, route.id);
    case 'market': return marketMenu(state, route.id);
    case 'book': return bookMenu(state, route.id);
    case 'rankings':
    case 'industry': return industryMenu(state, route.id);
    case 'rival': return rivalMenu(state, route.id);
    case 'exhibitions': return exhibitionsMenu(state);
    case 'team': return teamMenu(state, route.id);
    case 'recruit': return recruitMenu(state, route.id);
    case 'candidate': return candidateMenu(state, route.id);
    case 'person': return personMenu(state, route.id);
    case 'dismiss': return dismissMenu(state, route.id);
    case 'patch': return patchMenu(state, route.id);
    case 'rating': return ratingMenu(state);
    case 'archive':
    case 'finance': return financeMenu(state);
    case 'gameover': return { title: '经营失败', blocks: [
      { type: 'note', icon: 'Lock', text: '公司没能支付月底开支，时间已经停下。这份存档会保留，也可以换一份接着玩。' },
      { type: 'lines', items: [['现金', money(state.cash)], ['月开支（工资 + 房租）', money(core.monthlyCost(state))], ['经营天数', state.day + ' 天']] },
      { type: 'buttons', columns: 2, items: [
        { text: '重新创业', action: 'menu', icon: 'RotateCcw', data: { menu: 'restart' } },
        { text: '存档管理', action: 'menu', icon: 'ScrollText', data: { menu: 'slots' } }
      ] },
      { type: 'actions', items: [
        { text: '公司页底部', detail: '存档、新游戏与重新创业都在那里。', icon: 'Building2', action: 'menu', data: { menu: 'finance' } }
      ] }
    ] };
    case 'restart': return { title: '确认重新创业？', blocks: [
      { type: 'note', icon: 'Target', text: '重新创业会清空当前存档的公司、员工、作品和经营记录，且无法撤销；其它存档不受影响。' },
      { type: 'text', text: '想保留当前进度，可以先到「存档管理」新建一个存档，把这份留着。' },
      { type: 'buttons', items: [
        { text: '取消，返回公司', action: 'menu', data: { menu: 'finance' } },
        { text: '确认清空并重新创业', action: 'restart-confirm' }
      ] }
    ] };
    case 'history': return historyMenu(state);
    case 'goals':
    case 'achievements': return achievementsMenu(state);
    case 'mentor': return mentorMenu(state, route.id);
    case 'talents': return talentsMenu(state);
    case 'talent': return talentMenu(state, route.id);
    case 'outings': return outingsMenu(state);
    case 'outing': return { title: '团建结果', blocks: outingReport(state, (state.outing.history || [])[Number(route.id) || 0]) };
    case 'event': {
      if (!state.event) return { title: '没有待决事项', blocks: [{ type: 'text', text: '继续经营即可。' }] };
      const event = state.event;
      const choices = { type: 'choices', items: event.choices.map((choice: any) => ({ ...choice, action: 'decision' })) };
      // The feedback that arrives right after a playtest is the same report the 试玩 page shows later.
      const tested = event.id === 'feedback' ? core.activeProject(state, event.project) : null;
      if (tested?.test) return { title: event.title, blocks: [...testReport(state, tested), choices] };
      if (event.id === 'dream') return { title: '那天夜里', blocks: [{ type: 'dream', lines: dreamLines(state) }, choices] };
      if (event.id === 'outing') return { title: event.title, blocks: [...outingReport(state, (state.outing.history || [])[0]), choices] };
      if (event.id === 'job') return { title: event.title, blocks: [{ type: 'text', text: event.text }, ...gainedBlocks(state, event), choices] };
      // 发售瞬间既是决策页，也是这一作的成绩单：封面、首发到账、玩家评价和复盘入口。
      // 重构时这几块被删到只剩一行文字，发售就变成了一个没有仪式感的确认框。
      const released = event.id === 'release' ? state.catalog.find((book: any) => book.id === state.lastRelease) : null;
      if (!released) return { title: event.title, blocks: [{ type: 'text', text: event.text }, choices] };
      const blocks: any[] = [
        { type: 'cover', book: released },
        { type: 'payout', amount: released.openingReceipt, label: '首发到账', note: '首发售出 ' + number(released.openingUnits) + ' 份 · 玩家评价 ' + released.reviewScore.toFixed(1) },
        ...(released.review?.quotes?.length ? [{ type: 'quotes', items: released.review.quotes }] : []),
        { type: 'text', text: event.text },
        ...gainedBlocks(state, event),
        { type: 'buttons', items: [{ text: released.tutorial ? '查看首作复盘' : '查看发售复盘', action: 'review', data: { id: released.id }, anchor: 'review' }] },
        choices
      ];
      return { title: event.title, blocks };
    }
    default: return { title: '菜单', blocks: [{ type: 'text', text: '没有找到该页面。' }] };
  }
}

// Preview under the project form: workload, price, market size and which dimension this genre leans on.
// Deliberately no market trend here: the trend is only read from news, the charts and past releases, so
// picking a genre is never a case of reading today's weather report.
export function planPreview(state: any, draft: any) {
  const issue = core.planIssue(state, draft);
  if (issue) return issue;
  const plan = core.planWork(state, draft);
  const items = core.planModules(state.modules, draft);
  const fresh = items.filter((item: any) => item.from < item.level).length;
  const workload = plan.total * (1 + core.TEST_SHARE);
  // Output per day is the team's combined speed, so the estimate is total work over total hands.
  const capacity = state.staff.reduce((total: number, person: any) => total + (person.leaveUntil > state.day ? 0 : person.speed / 100), 0);
  const days = capacity > 0.0001 ? Math.ceil(workload / capacity) : null;
  // Wages buy person-days, so the cost follows the workload; a lone unpaid founder would make every plan look free.
  const paid = state.staff.filter((person: any) => !person.founder);
  const wage = paid.length ? paid.reduce((total: number, person: any) => total + person.wage, 0) / paid.length : 3;
  const cost = workload / 30 * wage + core.OFFICES[state.office].rent * (days || 30) / 30;
  return (days === null ? '还没有能推进的人。' : '现有 ' + state.staff.length + ' 人约 ' + days + ' 天做完') + ' · 成本约 ' + money(cost) + '\n新做 ' + fresh + ' 个模块，复用 ' + (items.length - fresh) + ' 个' + (draft.sequel ? '\n续作继承部分关注，但玩家期待更高。' : '');
}

// The moment the library grows: the bricks this job or title added or levelled up, and what opened up.
function gainedBlocks(state: any, event: any) {
  const blocks: any[] = [];
  if (event.gained?.length) {
    blocks.push({ type: 'section', title: '模块库新增' });
    blocks.push({ type: 'bricks', items: event.gained.map((item: any) => brickOf(state, item.id, { level: item.level, status: 'have', detail: item.from ? '升到 ' + item.level + ' 级' : '新获得 · ' + item.level + ' 级' })) });
  }
  if (event.unlocked?.length) blocks.push({ type: 'note', icon: 'Sparkles', text: '立项新开放：' + event.unlocked.join('、') });
  return blocks;
}

// Ready-made names: the form shows one, and leaving the field empty keeps it.
const STUDIO_NAMES = ['日光工作室', '小灯塔工作室', '纸飞机游戏', '橙子味工作室', '晚风游戏', '星屑工作室', '慢火车游戏', '白鸽工作室', '半盏茶游戏', '山海工作室', '萤火虫游戏', '北窗工作室'];
const TITLE_FIRST = ['星落', '雾港', '回声', '白夜', '潮汐', '灯塔', '风语', '深空', '纸鸢', '霜华', '远航', '浮岛', '琥珀', '钟楼', '萤火', '沙海', '雪原', '花园', '月台', '海盐'];
const TITLE_LAST = ['物语', '旅人', '回廊', '序章', '日记', '小镇', '彼岸', '方舟', '秘境', '归途', '来信', '之歌'];
const pickOne = (list: string[]) => list[Math.floor(Math.random() * list.length)];
export const randomStudioName = () => pickOne(STUDIO_NAMES);
export function randomTitle(state: any) {
  const taken = new Set([...state.projects, ...state.catalog].map((item: any) => item.name));
  for (let tries = 0; tries < 20; tries++) {
    const name = pickOne(TITLE_FIRST) + pickOne(TITLE_LAST);
    if (!taken.has(name)) return name;
  }
  return pickOne(TITLE_FIRST) + pickOne(TITLE_LAST) + ' ' + (state.catalog.length + 1);
}

// Known, unfixed defects grouped by the dimension that left them, e.g. "流畅 3 · 画面 1"; '' when none.
function defectsByDimension(project: any) {
  const counts: any = {};
  for (const defect of project.defects || []) if (defect.found && !defect.fixed) counts[defect.dimension] = (counts[defect.dimension] || 0) + 1;
  return Object.keys(counts).sort((left, right) => counts[right] - counts[left]).map(key => core.DIMENSIONS.find((item: any) => item.key === key)?.name + ' ' + counts[key]).join(' · ');
}

function newProjectMenu(state: any) {  return {
    title: '立项',
    blocks: [
      { type: 'text', text: '选一个类型与体量。体量决定工作量和售价空间，不是质量分；类型决定各项要做多少工作、玩家多看重哪一项。' },
      { type: 'lines', items: Object.keys(core.TYPES).map(key => [core.TYPES[key].name + ' · ' + core.TYPES[key].audience, '主要看 ' + core.audienceFocus(key)]) }
    ]
  };
}

function projectMenu(state: any, id?: string) {
  const project = core.activeProject(state, id) || core.projectOpen(state)[0];
  if (!project) return { title: '项目', blocks: [{ type: 'actions', items: [{ text: '新作立项', detail: '选类型与体量，开始下一部作品。', icon: 'Rocket', action: 'menu', data: { menu: 'new-project' } }] }] };
  if (project.released) return patchProjectMenu(state, project);
  if (project.job) return {
    title: '委托',
    blocks: [
      { type: 'text', text: project.job.client + '。做完就能拿到 ' + money(project.job.pay) + '，这块模块也会留在你手里。' },
      { type: 'bricks', items: [brickOf(state, project.job.module, { status: project.progress >= 100 ? 'have' : project.progress > 0 ? 'partial' : 'missing', level: 1, detail: '完成度 ' + project.progress.toFixed(0) + '%' })] },
      { type: 'actions', items: [{ text: '调整分工', detail: '默认做你最拿手的那一项。', icon: 'Users', action: 'menu', data: { menu: 'assign', id: project.id }, anchor: 'assign' }] }
    ]
  };
  const metrics = core.visibleMetrics(project);
  const forecast = core.projectForecast(state, project);
  const live = core.liveProjects(state);
  const idle = (forecast.idle || []).map((key: string) => core.DIMENSIONS.find(dimension => dimension.key === key)?.name);
  // A finished title has no remaining work, so its date is not "nobody can push it" but "done".
  // Testing still in progress counts as work left; testing nobody was assigned to does not block a release.
  const contentDone = forecast.rows.filter((row: any) => row.key !== 'stability').every((row: any) => row.remaining <= 0.0001);
  const testing = forecast.rows.some((row: any) => row.key === 'stability' && row.remaining > 0.0001 && row.days !== null);
  const finished = contentDone && !testing;
  const idleRows = forecast.rows.filter((row: any) => row.remaining > 0.0001 && row.days === null);
  const etaText = finished ? '已完成' : idleRows.length ? '还有无人负责的评分项' : core.dueText(state, forecast.eta);
  const order = core.projectOrder(state);
  const rank = order.findIndex((item: any) => item.id === project.id);
  const demo = project.checkpoints.demo;
  const fix = core.fixForecast(state, project);
  const blocks: any[] = [
    { type: 'lines', items: [['《' + project.name + '》', core.TYPES[project.type].name + ' · ' + core.SCALES[project.scale].name], ['阶段', stage(project)], ['完成度', metrics.progress.toFixed(0) + '%']] },
    ...(live.length > 1 ? [{ type: 'tabs', items: live.map((item: any) => ({ text: item.released ? item.name + ' · 补丁' : item.name, route: { menu: 'project', id: item.id }, active: item.id === project.id })) }] : []),
    ...(project.checkpoints.prototype ? [{ type: 'radar', metrics, genre: project.type, projectId: project.id }] : []),
    { type: 'section', title: '六项评分（点开可看详情并分工）' },
    { type: 'dimensions', items: forecast.rows, bottleneck: forecast.bottleneck ? forecast.bottleneck.key : null, projectId: project.id },
    { type: 'lines', items: [['预计做完', etaText], ['待修缺陷', metrics.known ? metrics.known + ' 项：' + defectsByDimension(project) : '0 项'], ['关注', number(project.followers) + ' 人']] },
    ...(idle.length ? [{ type: 'note', icon: 'Users', text: idle.join('、') + '还没有人做。在「调整分工」里把人分过去，否则作品永远做不完。' }] : []),
    ...(order.length > 1 ? [
      { type: 'text', text: '当前第 ' + (rank + 1) + ' 优先。' },
      { type: 'buttons', columns: 2, items: [
        { text: '提高优先级', action: 'priority', data: { id: project.id, priority: rank - 1 }, disabled: rank <= 0 },
        { text: '降低优先级', action: 'priority', data: { id: project.id, priority: rank + 1 }, disabled: rank === order.length - 1 }
      ] }
    ] : []),
    { type: 'note', icon: 'Users', text: core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type) },
    { type: 'actions', items: [
      { text: '调整分工', detail: '谁做哪几项工作；做满后自动修复已发现的缺陷。', icon: 'Users', action: 'menu', data: { menu: 'assign', id: project.id }, anchor: 'assign' },
      { text: '合成图', detail: '这一作由哪些模块组成，哪些已有、哪些还在做。', icon: 'Wrench', action: 'menu', data: { menu: 'compose', id: 'project:' + project.id } },
      { text: '试玩', detail: demo ? (project.test ? '最近一次 ' + project.test.score.toFixed(1) + ' 分 · 查看反馈或再招一批' : '花一点钱招玩家，找缺陷、听评价') : '体验版完成后开放', icon: 'FlaskConical', action: 'menu', data: { menu: 'testing', id: project.id }, disabled: !demo, anchor: 'testing' },
      { text: '市场与推广', detail: demo ? (project.promoted ? '已推广 ' + money(project.promoted) + ' · 报名展会' : '每作推广一次 · 报名展会') : '体验版完成后开放', icon: 'Megaphone', action: 'menu', data: { menu: 'market', id: project.id }, disabled: !demo },
      { text: '再开一个项目', detail: '多项目并行时，排在后面的项目有协调成本。', icon: 'FolderKanban', action: 'menu', data: { menu: 'new-project' }, anchor: 'new-project' }
    ] },
    { type: 'checklist', items: core.launchChecklist(state, project) },
    // Shipping is irreversible. Keep the button below the five self-check rows so the player reads
    // them first and cannot hit it while scrolling through the action cards.
    { type: 'section', title: '发售（不可撤销）' },
    { type: 'actions', items: [
      ...(fix.known || project.fixFirst ? [{ text: project.fixFirst ? '正在先修复缺陷 · 点击恢复做内容' : '先修复缺陷', detail: '待修 ' + fix.known + ' 项' + (fix.days ? '，约 ' + fix.days + ' 天修完' : '') + (fix.unstaffed.length ? '；' + fix.unstaffed.join('、') + '没人修' : '') + '。各项负责人暂停做内容，修完自动恢复。', icon: 'Hammer', action: 'fix-first', data: { id: project.id, on: !project.fixFirst } }] : []),
      { text: project.progress >= 100 ? '正式发售' : project.progress >= 55 ? (metrics.unfinished.length ? '提前发售' : '正式发售') : '发售', detail: project.progress >= 55 ? (metrics.unfinished.length ? '内容还没做满，带着短板上市换回款。' : '内容已做满，带着当前表现上市。') : '体验版完成后才能发售', icon: 'Rocket', action: 'launch', data: { id: project.id }, disabled: metrics.progress < 55, anchor: 'launch', tag: project.progress >= 100 ? '可发售' : '', emphasis: project.progress >= 100 && !defectsByDimension(project) }
    ] }
  ];
  return { title: '项目', blocks };
}

// A second step before an irreversible release: name the work, show what is unfinished, and make the
// confirming press a different action from the one that opened this page.
function launchConfirmMenu(state: any, id?: string) {
  const project = core.activeProject(state, id);
  // The project page already disables the launch button before the trial build; do not add a second
  // progress gate here, since two different metrics would let the button open a page that refuses it.
  if (!project || project.released) return { title: '确认发售', blocks: [{ type: 'text', text: '这部作品现在不能发售。' }] };
  const metrics = core.visibleMetrics(project);
  const early = metrics.unfinished.length > 0;
  const blocks: any[] = [
    { type: 'note', icon: 'Rocket', text: '《' + project.name + '》发售后立即结算首发成绩，转入作品履历，不能再继续制作、返工或推广。' },
    { type: 'text', text: early ? '还有 ' + metrics.unfinished.length + ' 维没做满（完成度 ' + metrics.progress.toFixed(0) + '%），提前发售会带着这些短板上架，评分与首发收入都会受影响。' : '内容已做满（完成度 ' + metrics.progress.toFixed(0) + '%）。', muted: true },
    { type: 'buttons', items: [
      { text: '再想想', action: 'launch-cancel' },
      { text: early ? '确认提前发售' : '确认发售', action: 'launch-final', data: { id: project.id }, icon: 'Rocket' }
    ] }
  ];
  return { title: early ? '确认提前发售？' : '确认发售？', blocks };
}

// A running patch is a small project of its own: its scope, crew, progress and launch date.
function patchProjectMenu(state: any, project: any) {
  const book = state.catalog.find((item: any) => item.id === project.id);
  const live = core.liveProjects(state);
  if (!project.patch) return { title: '《' + project.name + '》', blocks: [{ type: 'text', text: '这部作品已发售，没有进行中的补丁。' }, { type: 'actions', items: [{ text: '作品档案', detail: '销量、口碑与补丁记录。', icon: 'ChartNoAxesCombined', action: 'menu', data: { menu: 'book', id: project.id } }, { text: '再开一个项目', detail: '多项目并行时，排在后面的项目有协调成本。', icon: 'FolderKanban', action: 'menu', data: { menu: 'new-project' }, anchor: 'new-project' }] }] };
  const forecast = core.patchForecast(state, project);
  const crew = state.staff.filter((person: any) => core.personWorks(state, project, person).length);
  const rework = project.patch.rework ? core.DIMENSIONS.find(item => item.key === project.patch.rework)?.name : '';
  const order = core.projectOrder(state);
  const rank = order.findIndex((item: any) => item.id === project.id);
  return {
    title: '补丁',
    blocks: [
      ...(live.length > 1 ? [{ type: 'tabs', items: live.map((item: any) => ({ text: item.released ? item.name + ' · 补丁' : item.name, route: { menu: 'project', id: item.id }, active: item.id === project.id })) }] : []),
      { type: 'lines', items: [
        ['《' + project.name + '》补丁', core.dateText(project.patch.started) + '开始'],
        ['修复', forecast.fixed + ' / ' + forecast.targets + ' 项已报告缺陷'],
        ...(rework ? [['返工' + rework, Math.round(forecast.reworkDone / Math.max(0.001, forecast.reworkTotal) * 100) + '%']] : []),
        ['剩余', forecast.left.toFixed(1) + ' 人日'],
        ['预计上线', forecast.days === null ? '还没有人做' : forecast.days === 0 ? '即将上线' : core.dueText(state, forecast.eta)],
        ['人手', crew.length ? crew.map((person: any) => person.name).join('、') : '无']
      ] },
      { type: 'radar', metrics: core.projectMetrics(project), genre: project.type, projectId: project.id },
      ...(book ? [{ type: 'lines', items: [['当前口碑', book.reviewScore.toFixed(1)], ['最近一日销量', book.lastDayUnits + ' 份']] }] : []),
      { type: 'text', text: '补丁的范围在开工时定下：只修开工时已报告的缺陷' + (rework ? '，再返工' + rework : '') + '。之后新报告的问题留给下一个补丁。做完自动上线。', muted: true },
      ...(order.length > 1 ? [{ type: 'buttons', columns: 2, items: [
        { text: '提高优先级', action: 'priority', data: { id: project.id, priority: rank - 1 }, disabled: rank <= 0 },
        { text: '降低优先级', action: 'priority', data: { id: project.id, priority: rank + 1 }, disabled: rank === order.length - 1 }
      ] }] : []),
      { type: 'actions', items: [
        { text: '安排补丁人手', detail: '补丁只有一份工作清单，人员只分参与或不参与。', icon: 'Users', action: 'menu', data: { menu: 'assign', id: project.id }, anchor: 'assign' },
        { text: '立即上线', detail: '把已完成的部分先发出去，没修完的问题留在待修列表。', icon: 'Rocket', action: 'patch-release', data: { id: project.id } },
        { text: '作品档案', detail: '销量、口碑与补丁记录。', icon: 'ChartNoAxesCombined', action: 'menu', data: { menu: 'book', id: project.id } },
        { text: '再开一个项目', detail: '多项目并行时，排在后面的项目有协调成本。', icon: 'FolderKanban', action: 'menu', data: { menu: 'new-project' }, anchor: 'new-project' }
      ] }
    ]
  };
}

// Opening a patch: fix what players have reported, optionally rework one dimension as well.
function patchMenu(state: any, id: string) {
  const project = state.projects.find((item: any) => item.id === id && item.released);
  if (!project) return { title: '开补丁', blocks: [{ type: 'text', text: '作品不存在。' }] };
  if (project.patch) return patchProjectMenu(state, project);
  const metrics = core.projectMetrics(project);
  const fix = core.patchPlan(state, project, null);
  const items: any[] = [];
  if (fix.targets) items.push({ text: '只修缺陷', detail: '修复已报告的 ' + fix.targets + ' 项缺陷 · 约 ' + fix.work.toFixed(1) + ' 人日', icon: 'Bug', action: 'patch-start', data: { id, rework: null } });
  for (const key of core.CONTENT_KEYS) {
    const plan = core.patchPlan(state, project, key);
    const name = core.DIMENSIONS.find(item => item.key === key)?.name;
    items.push({ text: (fix.targets ? '修缺陷 + 返工' : '返工') + name, detail: '当前 ' + Math.round(metrics.dimensions[key]) + ' 分 · 约 ' + plan.work.toFixed(1) + ' 人日；返工只替换比返工者能力低的成果', icon: 'Hammer', action: 'patch-start', data: { id, rework: key } });
  }
  return {
    title: '开补丁',
    blocks: [
      { type: 'text', text: '补丁像一个小项目：开工时定下范围，单独安排人手和优先级，做完自动上线。玩家报告的只是他们碰到的问题，开工后新报告的留给下一个补丁。', muted: true },
      { type: 'lines', items: [['已报告待修', fix.targets + ' 项'], ['综合评分', metrics.overall.toFixed(0)]] },
      { type: 'actions', items }
    ]
  };
}

function dimensionMenu(state: any, projectId: string, dimKey: string) {
  const project = core.activeProject(state, projectId);
  if (!project) return { title: '评分项', blocks: [{ type: 'text', text: '项目不存在。' }] };
  const dimension = core.DIMENSIONS.find(entry => entry.key === dimKey);
  if (!dimension) return { title: '评分项', blocks: [{ type: 'text', text: '没有这一项。' }] };
  const metrics = core.visibleMetrics(project);
  const forecast = core.projectForecast(state, project);
  const row = forecast.rows.find((entry: any) => entry.key === dimKey);
  // The works whose dimension maps to this one (stability is fed by testing).
  const works = core.WORKS.filter(work => work.dimension === dimKey);
  const workKeys = works.map(work => work.key);
  // A finished dimension is not "staffed" or "unstaffed" any more: whoever is on it is already
  // spending their day elsewhere, so the page says so instead of listing people who look idle here.
  const finished = !!row && row.remaining <= 0.0001;
  const assignedPeople = finished ? [] : state.staff.filter((person: any) => core.personWorks(state, project, person).some((key: string) => workKeys.includes(key)));
  const weight = core.TYPES[project.type].weights[dimKey];
  const score = metrics.dimensions[dimKey] || 0;
  const finish = !row ? '—' : row.remaining <= 0.0001 ? '已完成' : row.days === null ? '无人负责' : '约 ' + row.days + ' 天';
  const head: any[] = [{ type: 'stats', tone: 'plain', items: [['当前评分', dimKey === 'stability' && metrics.untested ? '未测' : score.toFixed(0) + ' 分'], ['剩余', row && row.remaining > 0.0001 ? row.remaining.toFixed(0) + ' 人日' : '已做满'], ['预计完成', finish]] }];
  if (dimKey === 'stability') {
    const found = project.defects.filter((defect: any) => defect.found).length;
    const fixed = project.defects.filter((defect: any) => defect.fixed).length;
    head.push({ type: 'lines', items: [['测试覆盖', metrics.coverage.toFixed(0) + '%'], ['缺陷', '已发现 ' + found + ' · 已修 ' + fixed + ' · 待修 ' + metrics.known + (metrics.known ? '（' + defectsByDimension(project) + '）' : '')], ['修复投入', forecast.repair + ' 人日/天']] });
  }
  const blocks: any[] = [
    ...head,
    { type: 'text', text: dimension.desc + (weight >= 0.3 ? ' ' + core.TYPES[project.type].audience + '玩家很看重这一项。' : ' 这类玩家相对不挑剔这一项。'), muted: true },
    { type: 'section', title: finished ? '这一项已做满：负责人会把这部分时间让给还没做完的项' : assignedPeople.length ? '负责这一项的人（点工作块直接调整）' : '还没有人做，点工作块安排人手' },
    // Best at this dimension first: the page is for picking who should do it.
    ...state.staff.map((person: any, index: number) => ({ person, index }))
      .sort((left: any, right: any) => (right.person.abilities[works[0]?.ability] || 0) - (left.person.abilities[works[0]?.ability] || 0))
      .map(({ person, index }: any) => {
      const assigned = core.personWorks(state, project, person);
      const elsewhere = state.projects.find((item: any) => item.id !== projectId && core.personWorks(state, item, person).length);
      return {
        type: 'person-assign', title: person.name + ' · ' + core.ROLES[person.role].name,
        detail: core.personActivity(state, project, person),
        personId: person.id, projectId, index, assigned,
        status: elsewhere ? '在《' + elsewhere.name + '》' : '',
        stress: person.stressTags.map((key: string) => core.STRESS_TAGS[key].name),
        fame: !!person.fame && state.day - (person.joined || 0) < 30,
        works: works.map(work => ({ key: work.key, name: work.name, ability: person.abilities[work.ability], on: assigned.includes(work.key), done: finished }))
      };
    }),
    { type: 'buttons', items: [{ text: '查看整部作品的分工', action: 'menu', data: { menu: 'assign', id: projectId }, anchor: 'to-assign' }] },
    { type: 'text', text: dimKey === 'stability' ? '评分按未修缺陷估计：测试覆盖越高，找出的缺陷越多，估计也越准；找出的缺陷由做完自己工作的人自动修复，修好就加分。覆盖不到 10% 时无从估计；没测到的缺陷会在发售后被玩家碰到。' : '评分 = 完成部分的质量 × 进度。做满后继续返工，优先替换最低能力的成果。', muted: true }
  ];
  return { title: dimension.name, blocks };
}

function assignMenu(state: any, projectId: string) {
  const project = core.activeProject(state, projectId);
  if (!project) return { title: '分工', blocks: [{ type: 'text', text: '项目不存在。' }] };
  if (!state.staff.length) return { title: '分工', blocks: [{ type: 'text', text: '还没有同事，先去招聘。' }] };
  if (project.released) {
    if (!project.patch) return { title: '分工', blocks: [{ type: 'text', text: '这部作品没有进行中的补丁。先在作品档案里开补丁。' }] };
    return { title: '补丁人手', blocks: [
      { type: 'text', text: '参与的人先修开工时已报告的缺陷，再做返工；修复按缺陷所属那一项的能力计算速度。每人同时只属于一个项目，加入补丁会离开原来的项目。', muted: true },
      { type: 'choices', anchor: 'patch-crew', items: state.staff.map((person: any) => {
        const on = core.personWorks(state, project, person).length > 0;
        const elsewhere = core.projectOf(state, person);
        const away = elsewhere && elsewhere.id !== project.id ? '现在在《' + elsewhere.name + '》' + (core.personWorks(state, elsewhere, person).length ? '' : '（空闲）') : '';
        return { text: person.name + ' · ' + core.ROLES[person.role].name, detail: (on ? '参与中：' + core.personActivity(state, project, person) : away || '现在做默认项目') + '\n速度 ' + person.speed + (person.leaveUntil > state.day ? ' · 外出中' : ''), action: 'patch-crew', data: { id: project.id, person: person.id, on: !on }, tag: on ? '参与' : '' };
      }) }
    ] };
  }
  const blocks: any[] = [
    { type: 'text', text: '每人只属于一个项目，可同时做多项。哪一项做满，他那部分时间就自动让给还没做完的项；全部做满后才会去修测试抓到的缺陷，没有待修问题才继续返工。', muted: false },
    { type: 'text', text: '六项全部关掉就是让他空闲：不出任何产出，工资照付。', muted: true }
  ];
  // Read the remaining work once for the whole page instead of per card, so every box agrees with the
  // production numbers it sits next to.
  const pipeline = core.dimensionPipeline(state, project);
  const leftOf = (key: string) => pipeline.rows.find((row: any) => row.key === (key === 'discover' ? 'stability' : key))?.remaining ?? 0;
  state.staff.forEach((person: any, index: number) => {
    // Show what the person actually does in this project (explicit assignment, else their default
    // home work) rather than the belongsTo-gated personWorks. personWorks hides every box when a
    // founder/employee is "locked out" by an old assignment on a shipped title, which made the whole
    // assign page read as unassigned and every click report "已退出".
    const assigned: string[] = core.personWorks(state, project, person);
    const home = core.projectOf(state, person);
    const elsewhere = home && home.id !== projectId ? home : null;
    blocks.push({
      type: 'person-assign',
      title: person.name + ' · ' + core.ROLES[person.role].name,
      detail: core.personActivity(state, project, person),
      personId: person.id,
      projectId: project.id,
      index,
      assigned,
      status: elsewhere ? '在《' + elsewhere.name + '》' + (core.personWorks(state, elsewhere, person).length ? '' : ' · 空闲') : '',
      // Anyone running at reduced output is flagged here, so a slow-down is never a mystery later.
      stress: person.stressTags.map((key: string) => core.STRESS_TAGS[key].name),
      fame: !!person.fame && state.day - (person.joined || 0) < 30,
      works: core.WORKS.map(work => ({ key: work.key, name: work.name, ability: person.abilities[work.ability], on: assigned.includes(work.key), done: leftOf(work.key) <= 0.0001 }))
    });
  });
  return { title: '分工', blocks };
}

// The playtest report: score, comparison with the previous run, per-dimension findings and history.
// Shared by the 试玩 page and the feedback popup so the two never drift apart.
function testReport(state: any, project: any) {
  const known = core.visibleMetrics(project).known;
  const blocks: any[] = [
    { type: 'stats', tone: 'plain', items: [['已知待修', known + ' 项'], ['累计试玩', (project.testCount || 0) + ' 人次'], ['试玩轮数', (project.tests || 0) + ' 轮']] }
  ];
  if (!project.test) {
    blocks.push({ type: 'text', text: '试玩玩家给出体验评价，并会碰到一部分测试漏掉的缺陷；这些缺陷修好后稳定就会提高。' });
    return blocks;
  }
  blocks.push({ type: 'result', label: '最近一次试玩评分', value: project.test.score.toFixed(1), note: project.test.count + ' 人 · ' + core.dateText(project.test.day) + ' · 新发现 ' + project.test.found + ' 项缺陷' });
  // Comparing with the previous run is the whole point of a retest: a bare score cannot tell you
  // whether the last round of work helped.
  const history = project.testLog || [];
  if (history.length > 1) {
    const last = history[history.length - 1];
    const previous = history[history.length - 2];
    const delta = last.score - previous.score;
    const base = '（' + core.dateText(previous.day) + ' ' + previous.score.toFixed(1) + ' 分）';
    blocks.push({ type: 'text', text: Math.abs(delta) < 0.05 ? '与上次' + base + '持平。' : '比上次' + base + (delta > 0 ? '高 ' : '低 ') + Math.abs(delta).toFixed(1) + ' 分。' });
  }
  blocks.push({ type: 'note', icon: 'Target', text: core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type) });
  blocks.push({ type: 'section', title: '逐项评价' });
  blocks.push({ type: 'feedback', items: project.test.findings });
  blocks.push({ type: 'text', text: '评分对应试玩时的版本。改进后再试玩，才能看到玩家是否认可。', muted: true });
  if (history.length > 1) {
    blocks.push({ type: 'section', title: '试玩历史' });
    blocks.push({ type: 'lines', items: [...history].reverse().map((entry: any) => [core.dateText(entry.day) + ' · ' + entry.count + ' 人', entry.score.toFixed(1) + ' 分']) });
  }
  return blocks;
}

// What one outing did, person by person. The same page pops up on return and stays in the outing log.
function outingReport(state: any, record: any) {
  if (!record) return [{ type: 'text', text: '还没有团建记录。', muted: true }];
  const cleared = record.results.reduce((sum: number, item: any) => sum + item.cleared.length, 0);
  const gained = record.results.filter((item: any) => item.gain).length;
  const gainText = (gain: any) => gain.kind === 'trait' ? '觉醒「' + core.PERSONALITY_TAGS[gain.key].name + '」' : (gain.level > 1 ? '「' + core.BOOST_TAGS[gain.key].name + '」升到' + core.BOOST_GRADES[gain.level - 1] : '获得团队增益「' + core.BOOST_TAGS[gain.key].name + '」');
  const gainTone = (gain: any) => core.RARITY_TONES[gain.kind === 'trait' ? core.PERSONALITY_TAGS[gain.key].rarity : gain.level];
  const rows = [...record.results].sort((left: any, right: any) => (right.cleared.length + (right.gain ? 1 : 0)) - (left.cleared.length + (left.gain ? 1 : 0)));
  return [
    { type: 'stats', tone: 'plain', items: [['团建', record.days + ' 天 · ' + money(record.cost)], ['清掉标签', cleared + ' 个'], ['有收获', gained + ' 人']] },
    { type: 'text', text: core.dateText(record.day) + '出发，' + core.dateText(record.back) + '回来。', muted: true },
    { type: 'lines', items: rows.map((item: any) => {
      const parts = [...item.cleared.map((key: string) => '清掉「' + core.STRESS_TAGS[key].name + '」'), ...(item.gain ? [gainText(item.gain)] : [])];
      return [item.name, parts.length ? parts.join(' · ') : '没有变化', item.gain ? gainTone(item.gain) : parts.length ? 'green' : 'muted'];
    }) }
  ];
}

function outingsMenu(state: any) {
  const history = state.outing.history || [];
  if (!history.length) return { title: '团建记录', blocks: [{ type: 'text', text: '还没有团建过。', muted: true }] };
  return { title: '团建记录', blocks: [{ type: 'choices', items: history.map((record: any, index: number) => {
    const cleared = record.results.reduce((sum: number, item: any) => sum + item.cleared.length, 0);
    const gained = record.results.filter((item: any) => item.gain).length;
    return { text: core.dateText(record.day) + ' · 团建 ' + record.days + ' 天', detail: '花费 ' + money(record.cost) + ' · 清掉 ' + cleared + ' 个标签 · ' + gained + ' 人有收获', action: 'menu', data: { menu: 'outing', id: String(index) } };
  }) }] };
}

// The founder's dream speaks to the person holding the phone, using the real clock and real play time.
function dreamLines(state: any) {
  const now = new Date();
  const hour = now.getHours();
  const clock = hour + ' 点 ' + ('0' + now.getMinutes()).slice(-2) + ' 分';
  const played = Math.max(1, Math.round((state.playSeconds || 0) / 60));
  const span = played >= 120 ? Math.floor(played / 60) + ' 个多小时' : played + ' 分钟';
  const late = hour >= 23 || hour < 5;
  return [
    '创始人在工位上写好了解散公告：「' + state.company + '到此为止。」',
    '他趴在键盘上睡着了，梦见一块发光的屏幕。屏幕那头，有一个看不见的人。',
    '「是你吧？一直替我按着加班键的那个人。」',
    '「我们一起熬了 ' + state.day + ' 天。你那边，大概陪了我 ' + span + '。」',
    late ? '「你那边现在是 ' + clock + '，这么晚了，你也该睡了。」' : '「你那边现在是 ' + clock + '。记得起来走走，喝口水。」',
    '「答应我一件事，好吗？」'
  ];
}

function testingMenu(state: any, id?: string) {
  const project = core.activeProject(state, id) || core.projectOpen(state)[0];
  if (!project || project.released) return { title: '试玩', blocks: [{ type: 'text', text: '先立项，并把体验版做出来。' }] };
  const offer = core.playtestOffer(state, project);
  const blocks: any[] = testReport(state, project);
  blocks.push({ type: 'section', title: '招募试玩' });
  blocks.push({ type: 'buttons', anchor: 'tests', items: [
    { text: '试玩一轮 · ' + offer.players + ' 人 · ' + money(offer.cost), action: 'test', data: { id: project.id }, disabled: !offer.available, anchor: 'test-30' }
  ] });
  blocks.push({ type: 'text', text: offer.available ? '每轮补上一部分测试没覆盖到的地方，覆盖率越高，这一轮能碰到的新缺陷越少。可以多试几轮。' : offer.reason || '先处理当前决策。', muted: true });
  return { title: '试玩', blocks };
}

function marketMenu(state: any, id?: string) {
  // Follow the project the player is actually looking at, not whichever one sorts first.
  const picked = core.activeProject(state, id);
  const project = picked && !picked.released ? picked : core.projectOpen(state)[0];
  const blocks: any[] = [];
  const offers = core.exhibitionOffers(state);
  const currentNotReady = !!project && project.progress < 55;
  blocks.push({ type: 'lines', items: [...offers.map((offer: any) => {
    const left = offer.deadline - state.day;
    const cutoff = left > 0 ? '报名截止还有 ' + left + ' 天' : left === 0 ? '今天报名截止' : '报名已截止';
    return [offer.name + ' · 报名 ' + money(offer.fee), cutoff];
  }), ['评选', core.dueText(state, Math.ceil(state.day / 180) * 180)]] });
  blocks.push({ type: 'buttons', anchor: 'exhibitions', columns: 3, items: offers.map((offer: any) => ({ text: offer.entry ? core.TIERS[offer.tier].name + '展已报名' : '报名' + core.TIERS[offer.tier].name + '展', action: 'exhibition', data: { id: project?.id, tier: offer.tier }, disabled: !offer.available || currentNotReady })) });
  blocks.push({ type: 'actions', items: [
    { text: '日历', detail: '展会、评选、媒体评级与对手发售日。', icon: 'CalendarDays', action: 'menu', data: { menu: 'industry', id: 'schedule' } },
    { text: '行业', detail: '榜单、对手、新闻与评选。', icon: 'Newspaper', action: 'menu', data: { menu: 'industry' } },
    { text: '展会与媒体', detail: '历届参展名次与报道。', icon: 'Award', action: 'menu', data: { menu: 'exhibitions' } }
  ] });
  if (currentNotReady) blocks.push({ type: 'text', text: '当前项目完成体验版后才能报名展会。', muted: true });
  else blocks.push({ type: 'text', text: '三级展会都可以报名：级别越高报名费越贵、对手越强，作品不够突出时几乎换不来关注。', muted: true });
  if (project && !project.released) {
    blocks.push({ type: 'section', title: '推广《' + project.name + '》' });
    blocks.push({ type: 'lines', items: [['关注人数', number(project.followers)]] });
    if (project.promoted > 0) {
      blocks.push({ type: 'note', icon: 'Megaphone', text: '已推广 ' + money(project.promoted) + (project.promoFollowers ? '，带来 ' + number(project.promoFollowers) + ' 位关注' : '') + '。每部作品只推广一次，发售复盘会写明这笔推广折合多少首发收入。' });
    } else {
      const value = core.followerValue(state, project);
      blocks.push({ type: 'text', text: '每部作品只推广一次，投后不能追加。档位之间差几个数量级：每多花一万元换来的关注会变少，值不值取决于一位关注能为这部作品带来多少钱。', muted: true });
      blocks.push({ type: 'lines', items: [
        ['每位关注约带来', value.yuan + ' 元首发收入'],
        ...(value.last ? [['上一作《' + value.last.name + '》', '实际 ' + value.last.yuan + ' 元/人']] : []),
        ['首发能吃下的关注', '约 ' + number(value.ceiling) + ' 人']
      ] });
      blocks.push({ type: 'text', text: (value.tested ? '按最近一次试玩评分估计。' : '还没试玩，按一般水平估计；试玩后会更准。') + core.SCALES[project.scale].name + '作品首发有上限，关注超过上面的人数后多投也卖不出更多。', muted: true });
      core.PROMOTE_TIERS.forEach((budget, index) => {
        const range = core.promoteRange(state, project, budget);
        const worth = Math.round((range.low + range.high) / 2 * value.yuan / 10000 * 100) / 100;
        blocks.push({ type: 'card', group: 'promotions', title: ['小范围投放', '常规推广', '大规模宣发', '全面营销', '全网铺量'][index] + ' · ' + money(budget), text: '预计新增关注 ' + number(range.low) + '～' + number(range.high) + ' 人，按上面的估计约折合首发 ' + money(worth) + '。', button: { text: '投放 · ' + money(budget), action: 'promote', data: { id: project.id, cost: budget }, disabled: project.progress < 55 || state.cash < budget, anchor: 'promote-' + index } });
      });
    }
  }
  return { title: '市场', blocks };
}

function bookMenu(state: any, id: string) {
  const book = state.catalog.find((item: any) => item.id === id);
  if (!book) return { title: '作品档案', blocks: [{ type: 'text', text: '没有找到该作品。' }] };
  const balance = book.received - book.invested;
  const project = state.projects.find((item: any) => item.id === id);
  const dims = project ? core.visibleMetrics(project).dimensions : book.metrics.dimensions;
  const dlcs = state.projects.filter((item: any) => item.parentId === id);
  const contributions = core.companyArchive(state).books.find((item: any) => item.id === id)?.contributions || [];
  return {
    title: '《' + book.name + '》',
    blocks: [
      { type: 'cover', book },
      { type: 'stats', items: [['累计回款', money(book.received)], ['项目投入', money(book.invested)], [balance >= 0 ? '已盈利' : '尚差回本', money(Math.abs(balance))]], tone: balance >= 0 ? 'up' : 'down' },
      ...(book.review.reasons.length ? [{ type: 'section', title: book.tutorial ? '首作复盘：下一作怎么改' : '复盘' }, { type: 'reasons', items: book.review.reasons }] : []),
      { type: 'chart', book },
      ...(book.parentId ? [{ type: 'text', text: '原作：《' + (state.catalog.find((item: any) => item.id === book.parentId)?.name || '原作') + '》；本资料片独立核算。', muted: true }] : []),
      ...dlcs.map((item: any) => ({ type: 'buttons', items: [{ text: item.name + (item.released ? ' · 已发售' : ' · 开发中'), action: 'menu', data: { menu: item.released ? 'book' : 'project', id: item.id } }] })),
      { type: 'lines', items: [
        ['玩家评价', book.reviewScore.toFixed(1) + ' · ' + number(book.reviewCount) + ' 人'],
        ['首发', number(book.openingUnits) + ' 份 · ' + money(book.openingReceipt)],
        ['累计销量', number(book.units) + ' 份'],
        ['最近一日', book.lastDayUnits + ' 份'],
        ['首发关注', number(book.openingFollowers) + ' 人'],
        ['发售售价', price(book.price)],
        ['发售时市场', book.trend]
      ] },
      { type: 'lines', items: core.DIMENSIONS.map(dimension => [dimension.name, String(Math.round(dims[dimension.key] || 0))]) },
      { type: 'lines', items: [['首周销量', book.firstRanks ? number(book.firstWeek) + ' 份' : '首周统计中'], ['首周名次', rankText(book.firstRanks)], ['累计名次', rankText(book.totalRanks)], ['系列期待', book.expectation + ' 分评价压力'], ['补丁', (book.updates || 0) + ' 次']] },
      ...(book.weekOne?.lost.length ? [{ type: 'lines', title: '首周撞档', items: [...book.weekOne.lost.map((item: any) => ['被《' + item.name + '》分流', '约 ' + number(item.units) + ' 份']), ['不撞档大约能卖', number(book.weekOne.without) + ' 份']] }] : []),
      ...(book.promo ? [{ type: 'lines', title: '推广复盘', items: [['投放', money(book.promo.cost)], ['带来关注', number(book.promo.followers) + ' 人'], ['按本作转化约折合首发', money(book.promo.receipt)]] }] : []),
      ...((book.patches || []).length ? [{ type: 'section', title: '补丁记录' }, { type: 'lines', items: [...book.patches].reverse().map((patch: any) => [core.dateText(patch.day) + (patch.rework ? ' · 返工' + core.DIMENSIONS.find(item => item.key === patch.rework)?.name : ''), '修复 ' + patch.fixed + '/' + patch.targets + ' · 综合 ' + Math.round(patch.overallBefore) + '→' + Math.round(patch.overallAfter)]) }, { type: 'text', text: (() => { const last = book.patches[book.patches.length - 1]; return '最近一次补丁上线时：口碑 ' + (last.reviewBefore ?? book.reviewScore).toFixed(1) + ' → ' + (last.reviewAt ?? book.reviewScore).toFixed(1) + '，日销 ' + last.dailyBefore + ' → ' + last.dailyAt + ' 份；现在口碑 ' + book.reviewScore.toFixed(1) + '，日销 ' + book.lastDayUnits + ' 份。'; })(), muted: true }] : []),
      { type: 'section', title: '作品运营' },
      { type: 'actions', anchor: 'book-ops', items: [
        project?.patch
          ? { text: '查看进行中的补丁', detail: '修复与返工进度、人手和预计上线日。', icon: 'Hammer', action: 'menu', data: { menu: 'project', id }, anchor: 'patch-book' }
          : { text: '开补丁', detail: (project ? project.defects.filter((defect: any) => defect.found && !defect.fixed).length : 0) + ' 项玩家报告的缺陷待修；也可以返工某一项做更新。', icon: 'Hammer', action: 'menu', data: { menu: 'patch', id }, disabled: !project, anchor: 'patch-book' },
        { text: book.sale ? '关闭促销' : '开启促销', detail: '统一 ' + (core.DISCOUNTS[0] * 10) + ' 折；开启后系统按剩余需求决定何时开始，关闭立即恢复原价。', icon: 'Coins', action: 'sale', data: { id, enabled: !book.sale }, disabled: state.day - book.released > 540, anchor: 'sale-toggle', tag: book.sale ? '促销中' : '' },
        ...(!book.parentId ? [{ text: '资料片（DLC）· ' + money(4 + book.scale * 2), detail: '作为新项目立项，独立开发、核算与发售。', icon: 'Gift', action: 'dlc', data: { id }, disabled: dlcs.length >= 2 || state.cash < 4 + book.scale * 2 || state.day - book.released > 540 }] : []),
        { text: '开发续作', detail: book.reviewScore >= 70 ? '继承部分关注，玩家期待更高。' : '好评达到 70 分才能开发续作。', icon: 'Sparkles', action: 'sequel', data: { id }, disabled: book.reviewScore < 70 }
      ] },
      ...(contributions.length ? [{ type: 'lines', title: '参与的人', items: contributions.map((item: any) => [item.name, core.ROLES[item.role].name + ' · 贡献约 ' + Math.round(item.share * 100) + '%']) }] : [])
    ]
  };
}

// Value tones follow the shared rarity ramp: green → blue → purple → gold.
export function valueTone(value: number) {
  const rank = core.valueRank(value);
  return rank < 0 ? 'muted' : core.RARITY_TONES[rank];
}
const potentialTone = (band: string) => band === '高' ? 'gold' : band === '中' ? 'blue' : 'muted';
// The radar already shows all six abilities; a second list of the same six numbers was noise.

// Milestones first (they unlock things), then the rest; hidden ones stay "???" until earned.
function achievementsMenu(state: any) {
  const view = core.achievementsOf(state);
  const blocks: any[] = [
    { type: 'stats', tone: 'plain', items: [['已解锁', view.count + ' / ' + view.total], ['当前办公室', core.OFFICES[state.office].name], ['已发售作品', state.catalog.length + ' 部']] }
  ];
  for (const [group, title] of core.ACHIEVEMENT_GROUPS) {
    blocks.push({ type: 'section', title });
    blocks.push({ type: 'achievements', items: view.items.filter((item: any) => item.group === group) });
  }
  return { title: '成就', blocks };
}

// The media rating behind the star plaque: score, the lines that matter, what each recent title adds.
function ratingMenu(state: any) {
  const rating = core.ratingOf(state);
  const star = (tier: number) => core.STAR_MARKS[tier] + ' ' + core.STAR_NAMES[tier];
  const blocks: any[] = [
    { type: 'stats', tone: 'plain', items: [['星级', star(rating.tier)], ['最近一期评级', Math.round(rating.published) + ' 分'], ['按现在估算', Math.round(rating.score) + ' 分']] },
    { type: 'lines', items: [
      ['升星线', rating.up === null ? '已是最高星级' : star(rating.tier + 1) + ' ' + rating.up + ' 分'],
      ['保星线', rating.keep === null ? '一星不会再降' : star(rating.tier) + ' ' + rating.keep + ' 分'],
      ['状态', rating.watch ? '观察名单：下一期低于保星线就降级' : rating.safe ? '刚升星，本期不评降级' : '正常'],
      ['下次评级', core.dueText(state, rating.next)]
    ] },
    ...(rating.watch ? [{ type: 'note', icon: 'Target', text: core.RATING_MEDIA + '把公司列入了观察名单。下一期评级前发售一部成绩好的作品，可以把分数拉回保星线以上。' }] : []),
    { type: 'help', key: 'rating-help', title: '评级怎么算', text: core.RATING_MEDIA + '每 ' + core.RATING_PERIOD + ' 天发布一次工作室评级，只看最近三部作品（资料片不算），越新的作品权重越高：每部主要看首周名次（按够得着的最高一级榜单，全国、国际榜分数更高），其次是玩家口碑；获奖只是荣誉，不计分。最新一部发售满两年后，评级每季度下滑一点。名人按每位候选人单独判定，上表给的是单人概率。' },
    { type: 'section', title: '近三部作品的贡献' }
  ];
  if (!rating.books.length) blocks.push({ type: 'text', text: '还没有首周名次已定的作品。作品发售满一周后计入评级。', muted: true });
  else blocks.push({ type: 'lines', items: rating.books.map((book: any) => ['《' + book.name + '》 · 权重 ' + Math.round(book.weight * 100) + '%', '名次 ' + Math.round(book.rank) + ' · 口碑 ' + Math.round(book.review) + ' → ' + Math.round(book.score) + ' 分']) });
  if (rating.decay) blocks.push({ type: 'text', text: '已经两年多没有新作，评级下滑 ' + rating.decay + ' 分。', muted: true });
  blocks.push({ type: 'section', title: '星级的作用' });
  const fameText = (index: number) => {
    const odds = (channel: string) => Math.round(core.fameChance({ stars: index }, channel) * 1000) / 10;
    return odds('headhunt') ? ` · 单人概率 熟人${odds('friends')}%/网站${odds('web')}%/推荐${odds('headhunt')}%` : '';
  };
  blocks.push({ type: 'lines', items: core.STAR_NAMES.map((_name: string, index: number) => [star(index) + (index === rating.tier ? ' · 当前' : ''), (index ? '升星线 ' + core.RATING_UP[index] + ' 分 · ' : '') + '关注' + core.TIERS[core.STAR_RANGE[index]].name + '范围' + (core.MEDIA_BONUS[index] ? ' · 媒体曝光 +' + Math.round(core.MEDIA_BONUS[index] * 100) + '%' : '') + fameText(index)]) });
  if (rating.history.length) {
    blocks.push({ type: 'section', title: '历次评级' });
    blocks.push({ type: 'lines', items: [...rating.history].reverse().map((entry: any) => [core.dateText(entry.day), Math.round(entry.score) + ' 分 · ' + star(entry.tier)]) });
  }
  return { title: '媒体评级', blocks };
}

// The team list can be read by seniority, strength, pay, trouble or any one ability (highest first).
const STAFF_SORTS = [['joined', '入职先后'], ['best', '最强能力'], ['wage', '月薪'], ['stress', '状态']];
const sortOptions = () => [
  ...STAFF_SORTS.map(([key, text]) => ({ value: key, text })),
  ...core.ABILITIES.map((ability: any) => ({ value: ability.key, text: ability.name }))
];
const sortLabel = (key: string) => sortOptions().find(item => item.value === key)?.text || '入职先后';
function staffOrder(state: any, sort: string) {
  const best = (person: any) => Math.max(...core.ABILITY_KEYS.map((key: string) => person.abilities[key]));
  const trouble = (person: any) => (person.stressTags.includes('leaving') ? 2 : 0) + (person.stressTags.includes('tired') ? 1 : 0);
  const rank: any = {
    joined: (person: any) => -(person.joined || 0),
    best,
    wage: (person: any) => person.wage,
    stress: trouble
  };
  const score = rank[sort] || ((person: any) => person.abilities[sort] ?? -(person.joined || 0));
  return [...state.staff].sort((left: any, right: any) => score(right) - score(left) || (left.joined || 0) - (right.joined || 0)).map((person: any) => person.id);
}

function teamMenu(state: any, sort = 'joined') {
  const channel = bestChannel(state);
  const hasTeammate = state.staff.some((person: any) => !person.founder);
  const openRoles = Object.keys(core.ROLES).filter((role: string) => core.roleOpen(state, role));
  const lockedRoles = Object.keys(core.ROLES).filter((role: string) => !core.roleOpen(state, role));
  const sample = state.staff.find((person: any) => !person.tags.some((tag: any) => tag.key === 'social')) || state.staff[0];
  const offers = core.OUTING_DAYS.map((days: number) => ({ days, offer: core.outingOffer(state, days), chance: sample ? core.outingChances(sample, days) : { clear: 0, awaken: 0 } }));
  const outing = state.outing;
  const stressed = state.staff.filter((person: any) => person.stressTags.length).length;
  const overtimeCrew = state.staff.filter((person: any) => !person.noOvertime);
  const allOvertime = overtimeCrew.length > 0 && overtimeCrew.every((person: any) => !!state.overtime[person.id]);
  return {
    title: '团队',
    blocks: [
      { type: 'lines', items: [['工位', state.staff.length + ' / ' + core.seats(state) + '（' + core.OFFICES[state.office].name + '）'], ['月开支（含房租）', money(core.monthlyCost(state))]] },
      { type: 'buttons', columns: 3, items: openRoles.map(role => ({ text: '招聘' + core.ROLES[role].name, action: 'menu', icon: 'UserPlus', data: { menu: 'recruit', id: role + ':' + channel }, anchor: 'recruit-' + role })) },
      ...(lockedRoles.length ? [{ type: 'text', text: lockedRoles.map((role: string) => core.ROLES[role].name).join('、') + '岗位在首作发售后开放。', muted: true }] : []),
      ...(state.office >= 1 ? [{ type: 'actions', items: [{ text: '猎头', detail: '向对手的名人开高薪挖人。', icon: 'Briefcase', action: 'menu', data: { menu: 'talents' } }] }] : []),
      ...(state.staff.length > 1 ? [
        { type: 'dropdown', key: 'team-sort', label: '成员排序', text: sortLabel(sort), value: sort, items: sortOptions(), anchor: 'team-sort' }
      ] : []),
      { type: 'buttons', anchor: 'overtime-all', items: [
        { text: allOvertime ? '取消全部加班' : '全部加班', action: 'overtime-all', icon: 'Moon', data: { enabled: !allOvertime } }
      ] },
      { type: 'staff', order: staffOrder(state, sort) },
      ...(hasTeammate ? [] : [{ type: 'text', text: '首作一个人就能做完，招人是为了补上自己干不了的那一头。', muted: true }]),
      { type: 'section', title: '团建' },
      { type: 'help', key: 'outing-help', title: '团建怎么算', text: '团建是清掉「疲惫」「想走」的唯一办法：全队停工、工资照付，另付费用。天数越长，每个标签越可能被清掉（先清「想走」），但不保证；每人还可能觉醒正面性格或团队增益。团建期间暂停加班，回来后恢复。次数要攒，两次之间有间隔；「合群」的人更容易出效果。加班在员工页按人设置：产出更高，但缺陷更多，也会累积负面标签。' },
      { type: 'lines', items: [
        ['可用次数', outing.charges + ' 次' + (outing.next !== null ? ' · ' + Math.max(0, outing.next - state.day) + ' 天后恢复 1 次' : '')],
        ['最早可去', offers[0].offer.earliest > state.day ? '还要 ' + (offers[0].offer.earliest - state.day) + ' 天' : '现在'],
        ['有负面标签的人', stressed + ' 人']
      ] },
      { type: 'lines', items: offers.map((item: any) => [item.days + ' 天 · ' + money(item.offer.cost), '清标签约 ' + Math.round(item.chance.clear * 100) + '% · 收获约 ' + Math.round(item.chance.awaken * 100) + '%']) },
      { type: 'buttons', anchor: 'outing-group', columns: 3, items: offers.map((item: any) => ({ text: '团建 ' + item.days + ' 天', action: 'outing', icon: 'Plane', data: { days: item.days }, disabled: !item.offer.available })) },
      ...(outing.pending ? [{ type: 'note', icon: 'Plane', text: '团队正在团建，' + core.dueText(state, outing.resume) + '回来。' }] : []),
      ...((outing.history || []).length ? [{ type: 'actions', items: [{ text: '团建记录', detail: '历次团建每个人清掉了什么、有什么收获。', icon: 'ScrollText', action: 'menu', data: { menu: 'outings' } }] }] : []),
      ...(offers[0].offer.available ? [] : [{ type: 'note', icon: 'Lock', text: offers[0].offer.reason }])
    ]
  };
}

function personMenu(state: any, id: string) {
  const person = state.staff.find((item: any) => item.id === id);
  if (!person) return { title: '员工已离职', blocks: [{ type: 'text', text: '可以返回团队查看其他同事。' }] };
  const market = core.marketWage(person);
  const pair = core.mentorActive(state, person);
  const pupils = state.staff.filter((other: any) => other.mentor?.by === person.id);
  const project = core.projectOf(state, person);
  const boost = person.boost ? core.tagInfo(person.boost, person) : null;
  const boostLive = boost && project && core.projectBoosts(state, project).includes(person.boost);
  const crew = project ? state.staff.filter((other: any) => core.projectOf(state, other)?.id === project.id).length : 0;
  const books = state.catalog.filter((book: any) => (book.team || []).some((member: any) => member.id === person.id));
  return {
    title: person.name + (person.founder ? ' · 创始人' : ''),
    blocks: [
      { type: 'avatar', id: person.id, look: person.look, text: (person.founder ? '创始人 · ' : '') + core.ROLES[person.role].name },
      { type: 'ability-radar', abilities: person.abilities },
      { type: 'lines', items: [
        ['岗位', core.ROLES[person.role].name],
        ['潜力', core.potentialBand(person) + '（练到接近上限后成长变慢）', potentialTone(core.potentialBand(person))],
        ['月薪', money(person.wage)],
        ['市场身价', '约 ' + money(market) + (market > person.wage ? '，比他的工资高 ' + money(market - person.wage) : ''), market > person.wage ? 'green' : 'muted'],
        ['入职', core.dateText(person.joined || 1) + ' · 在职 ' + Math.max(0, state.day - (person.joined || 1)) + ' 天'],
        ['工作速度', String(person.speed)],
        ['在岗', person.leaveUntil > state.day ? '外出中，' + core.dueText(state, person.leaveUntil) + '回来' : '正常在岗']
      ] },
      ...(core.personTags(person).length ? [{ type: 'tags', items: core.personTags(person) }] : []),
      ...(boost ? [{ type: 'note', icon: 'Users', text: '团队增益「' + boost.name + '」' + core.BOOST_GRADES[(person.boostLevel || 1) - 1] + '：' + boost.text + (boostLive ? '当前项目 ' + crew + ' 人受益。' : person.stressTags.length ? '他现在状态不好，增益暂时失效。' : '同一项目已有更高档的同类增益或不在项目中，暂未生效。') + (person.boostLevel < 3 ? '在职越久或团建，可能升档。' : '') }] : []),
      ...(person.fame ? [{ type: 'note', icon: 'Star', text: '行业名人。' + (state.day - (person.joined || 0) < 30 ? '仍在磨合期，产出打八折。' : '已融入团队。') + (core.conditionText(person) ? ' 附带条件：' + core.conditionText(person) : '') + (person.story ? ' ' + person.story : '') }] : []),
      ...(person.noOvertime ? [{ type: 'note', icon: 'Star', text: '他答应过屏幕外的你：再也不加班。' }] : []),
      { type: 'section', title: '带教' },
      { type: 'text', text: pair ? '正在由' + pair.mentor.name + '带' + core.ABILITIES.find(item => item.key === pair.ability)?.name + '。' : person.mentor ? '带教暂停：两人不在同一个项目。' : pupils.length ? '正在带' + pupils.map((other: any) => other.name).join('、') + '。' : '可以找能力更强的同事带他。', muted: !pair },
      { type: 'help', key: 'mentor-help', title: '带教怎么算', text: '带人的一方产出 ×' + core.MENTOR_SLOW + '，被带的一方 ×' + core.MENTEE_SLOW + '；被带的那一项每天向带人一方靠拢，差得越多涨得越快，追上后自动出师，超过潜力后速度减半。两人需在同一个项目。' },
      { type: 'buttons', anchor: 'mentor', columns: person.mentor ? 2 : 1, items: [{ text: person.mentor ? '换一位带教' : '找人带他', action: 'menu', icon: 'GraduationCap', data: { menu: 'mentor', id: person.id } }, ...(person.mentor ? [{ text: '结束带教', action: 'mentor', icon: 'X', data: { id: person.id, mentor: null } }] : [])] },
      ...(person.stressTags.includes('leaving') && !person.founder ? [{ type: 'lines', title: '离职风险', items: [['每天提出离职的概率', Math.round(core.resignChance(state, person) * 100) + '%' + (state.overtime[person.id] ? '（加班中翻倍）' : ''), 'red'], ['说明', '停止加班可降到 ' + Math.round(core.RESIGN_CHANCE * 100) + '%。']] }] : []),
      ...(state.overtime[person.id] ? [{ type: 'lines', title: '当前加班状态', items: [['负面标签概率', Math.round((person.stressChance || 0) * 100) + '%'], ['说明', '继续加班会累积「疲惫」「想走」标签，拉低产出。']] }] : []),
      { type: 'toggle', anchor: 'overtime', text: '让 ' + person.name + ' 加班', value: !!state.overtime[id], action: 'overtime', data: { id } },
      ...(person.founder ? [] : [{ type: 'buttons', items: [{ text: '裁员（N+1）', action: 'menu', icon: 'UserMinus', data: { menu: 'dismiss', id: person.id } }] }]),
      { type: 'section', title: '员工档案' },
      ...((person.trace || []).length > 1 ? [{ type: 'trace', trace: person.trace, history: person.history || [] }] : [{ type: 'text', text: '每月记录一次六项能力，满两个月后在这里画出成长曲线。', muted: true }]),
      ...(books.length ? [{ type: 'lines', title: '参与的作品', items: books.map((book: any) => ['《' + book.name + '》', core.dateText(book.released) + '发售 · 口碑 ' + book.reviewScore.toFixed(0)]) }] : []),
      ...((person.history || []).length ? [{ type: 'lines', title: '经历', items: [...person.history].reverse().slice(0, 12).map((item: any) => [core.dateText(item.day), item.text]) }] : []),
    ]
  };
}

// Pick an ability, then a stronger colleague on the same project to bring it up.
function mentorMenu(state: any, id: string) {
  const person = state.staff.find((item: any) => item.id === id);
  if (!person) return { title: '带教', blocks: [{ type: 'text', text: '员工不存在。' }] };
  // Every ability is listed, strongest first, so the player sees why an ability has nobody to learn from.
  const options = core.mentorOptions(state, person).sort((left: any, right: any) => person.abilities[right.ability] - person.abilities[left.ability]);
  const blocks: any[] = [{ type: 'help', key: 'mentor-pick-help', title: '带教怎么算', text: '带人的一方产出 ×' + core.MENTOR_SLOW + '，被带的一方 ×' + core.MENTEE_SLOW + '。被带的那一项每天向带人一方靠拢，差得越多涨得越快、差得越少越慢，追上后自动出师；超过自己潜力后速度减半。带人的一方这一项只要比他高就行，两人需在同一个项目。' }];
  for (const option of options) {
    const name = core.ABILITIES.find(item => item.key === option.ability)?.name;
    blocks.push({ type: 'section', title: name + ' · 现在 ' + Math.round(person.abilities[option.ability]) });
    if (!option.mentors.length) {
      blocks.push({ type: 'text', text: '同一项目里没有这一项比' + person.name + '高的人。可以招一位更强的人，或把更强的同事调到同一项目。', muted: true });
      continue;
    }
    blocks.push({ type: 'choices', items: option.mentors.slice(0, 3).map((mentor: any) => {
      const gap = mentor.abilities[option.ability] - person.abilities[option.ability];
      const monthly = Math.min(gap, 30 * core.mentorDaily(gap));
      return { text: mentor.name + ' · ' + name + ' ' + Math.round(mentor.abilities[option.ability]), detail: '预计第一个月 +' + monthly.toFixed(1) + '，两人这段时间都变慢', action: 'mentor', data: { id: person.id, mentor: mentor.id, ability: option.ability } };
    }) });
  }
  return { title: '找人带' + person.name, blocks };
}

// Named leads at rival studios, and what it would take to bring one over.
function talentsMenu(state: any) {
  const list = (state.talents || []).filter((talent: any) => talent.status === 'employed' || talent.status === 'free');
  return {
    title: '猎头',
    blocks: [
      { type: 'help', key: 'talents-help', title: '猎头怎么谈', text: '对手工作室的核心人物，以及正在找新东家的离职名人。猎头费 ' + money(core.POACH_FEE) + ' 不退；出价越高、你的星级比对方越高、对方势头越差，成功率越高。自由身没有东家挽留，三档出价成功率 55% / 70% / 85%，失败后 30 天就能再谈；在职的被拒后半年内不会再谈。离职约 ' + core.TALENT_FREE_DAYS + ' 天没人签就会被别家签走。' },
      { type: 'choices', items: list.map((talent: any) => {
        const offer = core.poachOffer(state, talent.id, 1);
        const ability = core.ABILITIES.find(item => item.key === talent.primary)?.name;
        const work = core.talentWork(state, talent);
        const free = talent.status === 'free';
        return {
          text: talent.name + ' · ' + core.ROLES[talent.role].name + (free ? ' · 自由身' : ''),
          detail: (free ? '正在找新东家 · 离职 ' + (state.day - talent.since) + ' 天' : talent.studioName) + (work ? ' · 代表作《' + work + '》' : '') + '\n' + ability + ' ' + talent.abilities[talent.primary] + ' · 中档出价成功率 ' + Math.round(offer.chance * 100) + '%',
          action: 'menu', data: { menu: 'talent', id: talent.id }, tag: offer.available ? '' : '暂不可谈'
        };
      }) }
    ]
  };
}

function talentMenu(state: any, id: string) {
  const talent = (state.talents || []).find((item: any) => item.id === id);
  if (!talent) return { title: '名人', blocks: [{ type: 'text', text: '没有找到这个人。' }] };
  const offers = core.POACH_BIDS.map((_: number, index: number) => core.poachOffer(state, id, index));
  const work = core.talentWork(state, talent);
  return {
    title: talent.name,
    blocks: [
      { type: 'ability-radar', abilities: talent.abilities },
      { type: 'lines', items: [['岗位', core.ROLES[talent.role].name], ['现在', talent.status === 'employed' ? talent.studioName : talent.status === 'free' ? '正在找新东家' : '已加入本社'], ['代表作', work ? '《' + work + '》' : '—']] },
      ...(offers[0].reason ? [{ type: 'note', icon: 'Lock', text: offers[0].reason + '。' }] : []),
      { type: 'choices', items: offers.map((offer: any, index: number) => ({ text: '出价 ' + core.POACH_BIDS[index] + ' 倍 · 月薪 ' + money(offer.wage), detail: '成功率 ' + Math.round(offer.chance * 100) + '% · 猎头费 ' + money(offer.fee) + '（失败不退）', action: 'poach', data: { id, bid: index }, disabled: !offer.available })) },
      { type: 'text', text: '月薪一旦谈定就不会再变，是长期成本。入职 30 天内需要磨合。', muted: true }
    ]
  };
}

function candidateMenu(state: any, id: string) {
  const person: any = Object.values(state.candidates).flatMap((pool: any) => pool.people).find((item: any) => item.id === id);
  if (!person) return { title: '候选人', blocks: [{ type: 'text', text: '这份简历已经过期。' }] };
  const reasons = core.hireReasons(state, id);
  return {
    title: person.name,
    blocks: [
      { type: 'avatar', id: person.id, text: core.ROLES[person.role].name + '候选人' + (person.fame ? ' · 名人' : '') },
      { type: 'ability-radar', abilities: person.abilities },
      { type: 'lines', items: [['岗位', core.ROLES[person.role].name], ['潜力', core.potentialBand(person), potentialTone(core.potentialBand(person))], ['月薪', money(person.wage)], ['工作速度', String(person.speed)]] },
      ...(person.fame ? [{ type: 'note', icon: 'Star', text: '行业名人，入职前 30 天需要磨合。' + (core.conditionText(person) ? ' 附带条件：' + core.conditionText(person) : '') + (person.story ? ' 还记得吗？' + person.story : '') }] : []),
      ...(core.personTags(person).length ? [{ type: 'tags', items: core.personTags(person) }] : []),
      { type: 'buttons', anchor: 'hire', items: [{ text: person.hired ? '已录用' : '录用 · 月薪 ' + money(person.wage), action: 'hire', icon: 'UserPlus', data: { id: person.id }, disabled: reasons.length > 0, help: reasons.join('\n'), helpKey: 'hire:' + person.id }] }
    ]
  };
}

function dismissMenu(state: any, id: string) {
  const person = state.staff.find((item: any) => item.id === id);
  if (!person) return { title: '裁员', blocks: [{ type: 'text', text: '员工不存在。' }] };
  const years = Math.max(0, Math.floor((state.day - person.joined) / 360));
  return {
    title: '裁掉 ' + person.name,
    blocks: [
      { type: 'lines', items: [['月薪', money(person.wage)], ['服务年数', String(years)], ['遣散费（N+1）', money(person.wage * (years + 1))]] },
      { type: 'text', text: '被裁的人不会回来，在职同事也会受到影响。' },
      { type: 'buttons', items: [{ text: '确认裁员 · ' + money(person.wage * (years + 1)), action: 'dismiss', data: { id }, disabled: state.cash < person.wage * (years + 1) }] }
    ]
  };
}

// A brick for the board: family colour, the module's own glyph, studs for its level, and how far along it is.
function brickOf(state: any, key: string, extra: any = {}) {
  const module = core.MODULES[key];
  const have = (state.modules || {})[key];
  const locked = !core.moduleOpen(state, key);
  return {
    module: key, name: module.name, family: module.family, glyph: module.glyph, oneOff: !!module.oneOff,
    level: have?.level || 0, status: have ? 'have' : 'missing',
    detail: locked ? '第 ' + (module.unlock || 0) + ' 作发售后开放' : have ? have.level + ' 级 · 用过 ' + have.uses + ' 次' : module.oneOff ? '一次性内容，每作新做' : '还没有',
    note: module.desc, route: { menu: 'compose', id: 'module:' + key }, ...extra
  };
}

// The module library: what the company has built, with outlines for what it does not have yet.
function libraryMenu(state: any, id?: string) {
  const owned = state.modules || {};
  const [tab, shelf] = String(id || 'system').split(':');
  const tabs = { type: 'tabs', items: [['system', '玩法'], ['asset', '素材'], ['tool', '底座与平台']].map(([key, text]) => ({ text, route: { menu: 'library', id: key }, active: key === tab })) };
  const inTab = (key: string) => core.FAMILIES[core.MODULES[key].family].tab === tab;
  const byLevel = (left: string, right: string) => (owned[right]?.level || 0) - (owned[left]?.level || 0);
  if (tab === 'asset') {
    const shelves: string[] = [];
    for (const key of Object.keys(core.MODULES)) if (inTab(key) && !shelves.includes(core.MODULES[key].shelf)) shelves.push(core.MODULES[key].shelf);
    const items = shelves.map(name => {
      const styles = Object.keys(core.MODULES).filter(key => core.MODULES[key].shelf === name);
      const best = styles.sort(byLevel)[0];
      const have = styles.filter(key => owned[key]);
      return { ...brickOf(state, best), name: (name === shelf ? '▾ ' : '') + name, detail: have.length ? have.map(key => core.MODULES[key].style + ' ' + owned[key].level + ' 级').join(' · ') : '还没有', open: name === shelf ? 'asset' : 'asset:' + name };
    });
    const blocks: any[] = [tabs, { type: 'bricks', items }];
    // The tapped shelf opens right under the shelves, so the page never seems to stay the same.
    if (shelf) {
      const styles = Object.keys(core.MODULES).filter(key => core.MODULES[key].shelf === shelf).sort(byLevel);
      blocks.push({ type: 'section', title: shelf + '的风格' }, { type: 'text', text: '每种风格是一块独立的素材库，换风格就要从头做。', muted: true }, { type: 'bricks', items: styles.map(key => brickOf(state, key)) });
    } else blocks.push({ type: 'text', text: '点一个货架，在下方展开它的各种风格。', muted: true });
    return { title: '模块库', blocks };
  }
  const list = Object.keys(core.MODULES).filter(inTab).sort(byLevel);
  return { title: '模块库', blocks: [tabs, { type: 'bricks', items: list.map(key => brickOf(state, key)) }] };
}

// One layer of a recipe: the title or module on top, what it is made of underneath. Tapping a brick shows
// its card; from there the next layer opens. A module's own work is part of the module, never listed.
function composeMenu(state: any, id = '') {
  const [kind, rest] = String(id).split(':');
  const [moduleId, projectId] = String(rest || '').split('@');
  const project = state.projects.find((item: any) => item.id === (kind === 'project' ? rest : projectId)) || null;
  const owned = state.modules || {};
  const statusOf = (item: any) => {
    const progress = core.moduleProgress(project, item);
    return progress >= 0.999 ? 'have' : progress > 0.001 ? 'partial' : 'missing';
  };
  const inProject = (key: string, extra: any = {}) => {
    const item = (project?.modules || []).find((entry: any) => entry.id === key);
    if (!item) return brickOf(state, key, extra);
    const level = item.oneOff ? '一次性' : item.level + ' 级' + (item.from >= item.level ? ' · 已有' : item.from > 0 ? ' · 从 ' + item.from + ' 级升' : ' · 新做');
    return brickOf(state, key, { level: item.level, status: statusOf(item), detail: level, route: { menu: 'compose', id: 'module:' + key + '@' + project.id }, ...extra });
  };
  if (kind === 'project' && project) {
    const picked = project.job ? project.modules.map((item: any) => item.id) : core.SLOTS.flatMap((slot: any) => (project.slots?.[slot.key] || []));
    const root = { name: '《' + project.name + '》', family: 'gameplay', glyph: 'star', level: project.scale + 1, status: project.progress >= 100 ? 'have' : project.progress > 0 ? 'partial' : 'missing', detail: (project.job ? '委托' : core.SCALES[project.scale].name + ' · ' + core.TYPES[project.type].name) + ' · 完成度 ' + project.progress.toFixed(0) + '%', note: '', game: true };
    return { title: '合成图', blocks: [{ type: 'compose', root, children: picked.map((key: string) => inProject(key)) }] };
  }
  const module = core.MODULES[moduleId];
  if (!module) return { title: '合成图', blocks: [{ type: 'text', text: '没有找到这个模块。' }] };
  const root = project ? inProject(moduleId, { route: null }) : brickOf(state, moduleId, { route: null });
  const children = (module.needs || []).map((key: string) => project ? inProject(key) : brickOf(state, key));
  const blocks: any[] = [{ type: 'compose', root, children }];
  if (!children.length) blocks.push({ type: 'text', text: '这是最底层的模块。', muted: true });
  if (owned[moduleId]) blocks.push({ type: 'lines', items: [['等级', owned[moduleId].level + ' 级'], ['质量', String(Math.round(Object.values(owned[moduleId].quality || {}).reduce((total: number, value: any) => total + value, 0) / Math.max(1, Object.keys(owned[moduleId].quality || {}).length)))], ['首次来自', '《' + owned[moduleId].first + '》'], ['用过', owned[moduleId].uses + ' 次']] });
  return { title: '合成图', blocks };
}

function financeMenu(state: any) {
  const ledger = state.ledger;
  const rating = core.ratingOf(state);
  const wins = state.awards.filter((award: any) => award.own).length;
  const nextOffice = core.OFFICES[state.office + 1];
  const moveCost = core.moveCost(state);
  return {
    title: '公司',
    blocks: [
      { type: 'lines', items: [['现金', money(state.cash)], ['本月收入', money(ledger.income)], ['本月已开支', money(monthSpent(state))], ['已累计应付', money(state.accrued)], ['月开支（工资 + 房租）', money(core.monthlyCost(state))]] },
      { type: 'section', title: '办公室' },
      { type: 'lines', items: [['现在', core.OFFICES[state.office].name + ' · ' + core.seats(state) + ' 个工位 · 月租 ' + money(core.OFFICES[state.office].rent)], ...(nextOffice ? [['下一档', nextOffice.name + ' · ' + nextOffice.seats + ' 个工位 · 月租 ' + money(nextOffice.rent)]] : [])] },
      ...(nextOffice ? [{ type: 'buttons', anchor: 'move', items: [{ text: (state.office === 0 ? '搬进' : '扩建为') + nextOffice.name + ' · ' + money(moveCost), action: 'move', icon: 'Building2', disabled: state.cash < moveCost }] }, { type: 'text', text: '搬家费 ' + money(moveCost) + '，之后月开支约 ' + money(core.monthlyCost(state) - core.OFFICES[state.office].rent + nextOffice.rent) + '。', muted: true }] : [{ type: 'text', text: '已经是最大的办公室了。', muted: true }]),
      { type: 'actions', items: [
        { text: core.STAR_MARKS[rating.tier] + ' ' + core.STAR_NAMES[rating.tier] + '工作室 · 评级 ' + Math.round(rating.published) + ' 分', detail: core.RATING_MEDIA + (rating.watch ? '已列入观察名单' : '每季度评级') + ' · ' + core.dueText(state, rating.next), icon: 'Award', action: 'menu', data: { menu: 'rating' }, tag: rating.watch ? '观察' : '' },
        { text: '模块库', detail: Object.keys(state.modules || {}).length + ' 个已有模块 · 系统库与工具库', icon: 'Wrench', action: 'menu', data: { menu: 'library' } },
        { text: '成就', detail: core.achievementsOf(state).count + ' / ' + core.ACHIEVEMENTS.length + ' · 里程碑与荣誉', icon: 'Trophy', action: 'menu', data: { menu: 'achievements' } },
        { text: '行业与日历', detail: '榜单、对手、日历、新闻与评选。', icon: 'Newspaper', action: 'menu', data: { menu: 'industry' } },
        { text: '经营记录', detail: '月度账单与大事记。', icon: 'ScrollText', action: 'menu', data: { menu: 'history' } }
      ] },
      { type: 'section', title: '作品履历' },
      { type: 'lines', items: [['已发售作品', state.catalog.length + ' 部'], ['年度获奖', wins + ' 次']] },
      ...(state.catalog.length ? [{ type: 'catalog' }] : [{ type: 'text', text: '作品发售后，在这里查看销量、回款、复盘与参与的人。', muted: true }]),
      { type: 'section', title: '存档与设置' },
      { type: 'buttons', columns: 3, items: [
        { text: '存档管理', action: 'menu', data: { menu: 'slots' } },
        { text: '新游戏', action: 'menu', data: { menu: 'new-slot-confirm' } },
        { text: '重新创业', action: 'menu', data: { menu: 'restart' } }
      ] },
      { type: 'toggle', text: '音效', value: state.sound, action: 'sound' },
      // The build number lives here instead of on the studio header: it is a "which build am I on"
      // question you ask once, not something worth a line of the main screen every session.
      { type: 'foot', text: '版本 v' + core.VERSION }
    ]
  };
}

function historyMenu(state: any) {
  return { title: '经营记录', blocks: [] };
}

// Save slots are read by the UI layer (they live in device storage), so the menu only receives their
// summaries. Keeping the page here means it renders exactly like every other menu.
function slotOf(slots: any[], id: any) {
  return slots.find((slot: any) => String(slot.id) === String(id)) || null;
}

function slotsMenu(slots: any[]) {
  const full = slots.length >= core.SAVE_SLOT_LIMIT;
  return {
    title: '存档',
    blocks: [
      { type: 'text', text: '最多保留 ' + core.SAVE_SLOT_LIMIT + ' 个存档；切换、删除或新建前会先保存当前进度。', muted: true },
      { type: 'actions', items: slots.map(slot => ({
        text: '存档 ' + slot.index + ' · ' + (slot.error ? '读取失败' : slot.empty ? '空白存档' : slot.company),
        detail: slot.error ? '这份存档读不出来，可以删掉腾出位置' : slot.empty ? '还没有成立工作室' : core.dateText(slot.day) + ' · ' + money(slot.cash) + ' · 发售 ' + slot.works + ' 部 · ' + slot.staff + ' 名员工',
        icon: slot.active ? 'Play' : 'ScrollText',
        tag: slot.active ? '当前' : '',
        action: 'menu', data: { menu: 'slot', id: String(slot.id) }
      })) },
      { type: 'buttons', columns: 2, items: [
        { text: '新游戏', action: 'menu', data: { menu: 'new-slot-confirm' }, disabled: full },
        { text: '返回公司', action: 'menu', data: { menu: 'finance' } }
      ] },
      { type: 'text', text: full ? '存档已满，先删除一个才能开新游戏。' : '还能新建 ' + (core.SAVE_SLOT_LIMIT - slots.length) + ' 个存档。', muted: true }
    ]
  };
}

function newSlotConfirmMenu(slots: any[]) {
  const full = slots.length >= core.SAVE_SLOT_LIMIT;
  return {
    title: '开一局新游戏？',
    blocks: [
      { type: 'note', icon: 'Sparkles', text: full ? '存档已满，先到「存档管理」删除一个存档，才能开新游戏。' : '会新建一个存档，当前进度先自动保存、不会被覆盖。新游戏从给工作室起名字开始。' },
      { type: 'buttons', items: [
        { text: '开始新游戏', action: 'new-slot', disabled: full },
        { text: '取消，返回公司', action: 'menu', data: { menu: 'finance' } },
        { text: '看看所有存档', action: 'menu', data: { menu: 'slots' } }
      ] }
    ]
  };
}

function slotMenu(slots: any[], id: any) {
  const slot = slotOf(slots, id);
  if (!slot) return { title: '存档不存在', blocks: [
    { type: 'text', text: '这份存档已经不在列表里了。', muted: true },
    { type: 'buttons', items: [{ text: '返回存档列表', action: 'menu', data: { menu: 'slots' } }] }
  ] };
  return {
    title: '存档 ' + slot.index,
    blocks: [
      ...(slot.empty || slot.error ? [] : [{ type: 'lines', title: slot.company, items: [
        ['游戏内日期', core.dateText(slot.day)],
        ['现金', money(slot.cash)],
        ['已发售作品', slot.works + ' 部'],
        ['团队', slot.staff + ' 人']
      ] }]),
      { type: 'note', icon: 'Star', text: slot.error ? '这份存档无法读取，删除后可以腾出位置。' : slot.empty ? '这份存档还没成立工作室，加载后从起名开始。' : '加载前会先保存当前进度，然后切到这份存档，时间保持暂停。' },
      { type: 'buttons', items: [
        { text: slot.active ? '正在游玩' : '加载此存档', action: 'load-slot', data: { id: String(slot.id) }, disabled: slot.active || slot.error },
        { text: slot.active ? '当前存档不能删除' : '删除此存档', action: 'menu', data: { menu: 'slot-delete', id: String(slot.id) }, disabled: slot.active },
        { text: '返回存档列表', action: 'menu', data: { menu: 'slots' } }
      ] }
    ]
  };
}

function slotDeleteMenu(slots: any[], id: any) {
  const slot = slotOf(slots, id);
  return { title: '删除存档？', blocks: [
    { type: 'note', icon: 'Lock', text: '存档 ' + (slot ? slot.index : '?') + '（' + (slot && slot.company ? slot.company : '空白存档') + '）的公司、员工、作品和经营记录都会清空，无法撤销。' },
    { type: 'buttons', items: [
      { text: '确认删除', action: 'delete-slot', data: { id: String(id) } },
      { text: '取消，返回', action: 'menu', data: { menu: 'slot', id: String(id) } }
    ] }
  ] };
}

function rankText(ranks: any) {
  if (!ranks) return '首周结束后公布';
  return core.TIERS.map((tier: any, level: number) => tier.name + ' ' + ranks[level]).join(' · ');
}

function exhibitionsMenu(state: any) {
  const blocks: any[] = [{ type: 'text', text: '城市独立游戏展每年 3 月 30 日与 9 月 30 日，全国游戏展 5 月 30 日，国际游戏展 10 月 30 日，都提前七天截止报名。完成体验版才能报名，名次决定换来的关注。', muted: true }];
  for (const entry of [...state.exhibitions].reverse()) {
    blocks.push({ type: 'section', title: core.dateText(entry.day) + ' · ' + core.TIERS[entry.tier ?? 0].expo + ' · 《' + entry.name + '》' });
    if (!entry.result) blocks.push({ type: 'text', text: '已报名，等待展会。期间继续完善会影响名次。' });
    else {
      blocks.push({ type: 'note', icon: 'Megaphone', text: entry.result.media + '：第 ' + entry.result.rank + ' 名，获得 ' + number(entry.result.followers) + ' 人关注。' });
      blocks.push({ type: 'text', text: entry.result.gap });
      blocks.push({ type: 'lines', items: entry.result.ranking.map((item: any, index: number) => [(index + 1) + '. ' + item.name, item.score.toFixed(1)]) });
    }
  }
  if (!state.exhibitions.length) blocks.push({ type: 'text', text: '尚未参加展会。' });
  return { title: '展会与媒体', blocks };
}

// The industry page: charts, rival studios, announced release dates, news and awards. It opens on the
// level the company currently pays attention to; every level stays one tap away.
function industryMenu(state: any, id?: string) {
  const focus = state.focus || 0;
  const [tab = 'board', kind = 'first', levelText] = String(id || '').split(':');
  const level = levelText === undefined || levelText === '' ? focus : Number(levelText) || 0;
  const route = (nextTab: string, nextKind = kind, nextLevel = level) => ({ menu: 'industry', id: nextTab + ':' + nextKind + ':' + nextLevel });
  const blocks: any[] = [
    { type: 'tabs', items: [['board', '榜单'], ['rivals', '对手'], ['schedule', '日历'], ['news', '新闻'], ['awards', '评选']].map(([key, text]) => ({ text, route: route(key), active: key === tab })) }
  ];
  const levelTabs = { type: 'tabs', items: core.TIERS.map((tier: any, index: number) => ({ text: tier.name + (index === focus ? ' · 关注' : ''), route: route(tab, kind, index), active: index === level })) };
  const rivalChoice = (name: string, detail: string, studioId: string | null, own = false) => ({ text: name, detail, action: studioId ? 'menu' : 'none', data: studioId ? { menu: 'rival', id: studioId } : {}, tag: own ? '本社' : '' });
  if (tab === 'board') {
    blocks.push({ type: 'tabs', items: [['first', '首周榜'], ['total', '累计榜']].map(([key, text]) => ({ text, route: route('board', key), active: key === kind })) }, levelTabs);
    blocks.push({ type: 'text', text: kind === 'first' ? '近一年发售作品的首周销量，名次在首周结束时定下。' : '历年作品的累计销量，每月结算。', muted: true });
    const chart = core.chartOf(state, kind, level);
    if (!chart.length) blocks.push({ type: 'text', text: '暂无作品。' });
    else blocks.push({ type: 'choices', items: chart.map((entry: any) => rivalChoice(entry.rank + '. ' + entry.name, entry.studio + ' · ' + number(entry.units) + ' 份', entry.studioId, entry.own)) });
  } else if (tab === 'rivals') {
    const live = state.rivals.filter((studio: any) => studio.closed === null);
    const order = [...live.filter((studio: any) => studio.tier === focus), ...live.filter((studio: any) => studio.tier !== focus)];
    blocks.push({ type: 'text', text: '有档案的对手工作室，当前关注的范围在前。点开查看历年作品与交锋记录。', muted: true });
    blocks.push({ type: 'choices', items: order.map((studio: any) => {
      const profile = core.rivalProfile(state, studio.id);
      const latest = profile?.works.find((work: any) => work.released <= state.day);
      return rivalChoice(studio.name, core.TIERS[studio.tier].name + ' · 擅长' + core.TYPES[studio.type].name + ' · 势头' + profile?.trend + (latest ? '\n近作《' + latest.name + '》' : ''), studio.id);
    }) });
    const closed = state.rivals.filter((studio: any) => studio.closed !== null);
    if (closed.length) blocks.push({ type: 'text', text: '已解散：' + closed.map((studio: any) => studio.name).join('、'), muted: true });
  } else if (tab === 'schedule') {
    const calendar = core.calendarOf(state);
    blocks.push({ type: 'text', text: '同一周发售的作品会分流首发关注。', muted: true });
    if (!calendar.length) blocks.push({ type: 'text', text: '近期没有安排。' });
    else blocks.push({ type: 'choices', items: calendar.map((item: any) => ({
      text: (item.day === state.day ? '今天' : '还有 ' + (item.day - state.day) + ' 天') + ' · ' + item.title,
      detail: item.detail,
      action: item.route ? 'menu' : 'none', data: item.route || {},
      tag: item.own ? '本社' : { expo: '展会', awards: '评选', rating: '', release: '' }[item.kind as string] || ''
    })) });
  } else if (tab === 'news') {
    const list = core.newsFor(state).slice(0, 30);
    blocks.push({ type: 'text', text: '主要报道' + core.TIERS[focus].name + '范围的动态（由公司星级决定），更高范围只报头条。', muted: true });
    if (!list.length) blocks.push({ type: 'text', text: '暂时没有新闻。' });
    else blocks.push({ type: 'choices', items: list.map((item: any) => rivalChoice(item.title, core.dateText(item.day) + (item.text ? ' · ' + item.text : ''), item.studio, item.own)) });
  } else {
    blocks.push(levelTabs);
    const awards = [...state.awards].reverse().filter((award: any) => (award.tier ?? 1) === level).slice(0, 9);
    if (!awards.length) blocks.push({ type: 'text', text: '评选每年两次：6 月 30 日评上半年，12 月 30 日评全年。获奖增加粉丝并上新闻，不计入媒体评级；成就以年度评选为准。' });
    for (const award of awards) {
      blocks.push({ type: 'section', title: '第 ' + award.year + ' 年 · ' + award.category });
      blocks.push({ type: 'note', icon: 'Trophy', text: award.winner + (award.own ? ' · 本社获奖，粉丝增加' : ' 获奖') });
      blocks.push({ type: 'lines', items: award.ranking.slice(0, 5).map((entry: any, index: number) => [(index + 1) + '. ' + entry.name, Number(entry.score).toFixed(1)]) });
    }
  }
  return { title: '行业', blocks };
}

function rivalMenu(state: any, id: string) {
  const profile = core.rivalProfile(state, id);
  if (!profile) return { title: '对手', blocks: [{ type: 'text', text: '没有找到这家工作室。' }] };
  const { studio, works, ranks, clashes, trend } = profile;
  const rankOf = (work: any) => ranks.find((item: any) => item.work.id === work.id)?.rank;
  return {
    title: studio.name,
    blocks: [
      { type: 'lines', items: [['层级', core.TIERS[studio.tier].name], ['擅长', core.TYPES[studio.type].name], ['势头', trend], ['状态', studio.closed !== null ? core.dateText(studio.closed) + '解散' : '经营中'], ['作品数', String(works.filter((work: any) => work.released <= state.day).length)]] },
      { type: 'section', title: '作品' },
      ...(works.length ? [{ type: 'lines', items: works.slice(0, 12).map((work: any) => ['《' + work.name + '》', work.released > state.day ? '定档 · ' + core.dueText(state, work.released) : core.dateText(work.released) + ' · 首周 ' + number(work.firstWeek) + ' 份' + (rankOf(work) ? ' · ' + core.TIERS[work.tier].name + '第 ' + rankOf(work) + ' 名' : '')]) }] : [{ type: 'text', text: '还没有作品。' }]),
      { type: 'section', title: '和本社的交锋' },
      ...(clashes.length ? [{ type: 'lines', items: clashes.map((item: any) => ['《' + item.work.name + '》 vs 《' + item.book.name + '》', '首周 ' + number(item.work.firstWeek) + ' : ' + number(item.book.firstWeek || 0)]) }] : [{ type: 'text', text: '还没有同周发售过。', muted: true }])
    ]
  };
}

// Tutorial step for the current screen. `ack` explains an area and waits for "知道了"; `tap` introduces a
// control and counts as seen once the player presses it; neither means "press the highlighted control".
export type GuideStep = { anchor: string; text: string; ack?: string; tap?: string; tapGroup?: string };

// One founder covers one trade and leaves the other blind. A programmer and a designer both ship
// games nobody wants to look at, so both pair with an artist; an artist pairs with a programmer.
// Reading the raw ability numbers instead kept answering "design" for a programmer, because design
// is the stat they score lowest on — but design is work they can still carry, visuals are not.
const PARTNER: any = { code: 'art', design: 'art', art: 'code' };

export function weakestRole(state: any) {
  const founder = state.staff[0];
  const open = Object.keys(core.ROLES).filter((role: string) => core.roleOpen(state, role));
  if (!founder) return open[0] || 'code';
  const partner = PARTNER[founder.role];
  if (partner && open.includes(partner)) return partner;
  let worst = open[0] || 'code';
  let low = 999;
  for (const role of open) {
    const keys = (core.ROLES[role].home || []).filter((key: string) => typeof founder.abilities?.[key] === 'number');
    if (!keys.length) continue;
    const value = Math.min(...keys.map((key: string) => founder.abilities[key]));
    if (value < low) { low = value; worst = role; }
  }
  return worst;
}

export function guide(state: any, route: any, playing: boolean): GuideStep | null {
  if (!state.company || state.tutorial.skipped) return null;
  return (guideOn(state) ? tutorialStep(state, route, playing) : null) || unlockStep(state, route);
}

// Once-only notes for features the tutorial does not reach or that open later. Overtime is taught in
// order: the all-hands switch (including its cost), a forced tap into one person's card, that person's
// own switch, then the outing that clears the labels overtime caused. Later steps wait for earlier ones.
function unlockStep(state: any, route: any): GuideStep | null {
  const seen = state.tutorial.seen;
  const once = (key: string, anchor: string, text: string): GuideStep | null => seen[key] ? null : { anchor, text, ack: key };
  // Explain the project actually on screen. Sorting-first made a tip point at a button that belongs
  // to another project (or one that is not on this page at all) once several games run at once.
  const project = core.activeProject(state, route?.id) || core.projectOpen(state)[0];
  const demo = !!project?.checkpoints?.demo;
  if (!route) {
    if (state.event) return null;
    const steps: Array<() => GuideStep | null> = [
      () => state.staff.some((person: any) => person.stressTags.length) ? once('stressIntro', 'nav-team', '有人挂上了负面标签：「疲惫」拉低产出，「想走」每天可能提离职。先停掉加班，团队页还有别的办法。') : null,
      () => state.catalog.length ? once('unlockWeb', 'nav-team', '首作发售后解锁：招聘网站、音频与测试岗位，以及中型作品。') : null,
      () => state.office === 0 && (state.catalog.length || state.staff.length >= core.seats(state)) ? once('unlockMove', 'nav-finance', '办公室随时可以搬：点「公司」，在办公室一栏能看到搬家费和搬家后的月租。') : null,
      () => state.office >= 1 ? once('unlockOffice', 'nav-team', '搬进正式办公室了：多了「行业推荐」和「猎头」，立项也能选大型作品。') : null,
      () => state.office >= 3 ? once('unlockHuge', 'nav-team', '搬进写字楼整层了：立项可以选超大型作品，做好回报最大，做砸也亏得最多。') : null
    ];
    for (const step of steps) { const result = step(); if (result) return result; }
    return null;
  }
  switch (route.menu) {
    case 'team': {
      if (!state.staff.some((person: any) => !person.founder)) return null;
      if (!seen.overtimeAllIntro) return once('overtimeAllIntro', 'overtime-all', '全员加班：一键让所有人加班，产出 +45%。代价是缺陷更多，还会累积「疲惫」「想走」负面标签，加班越久越容易。');
      // Saves that already learned the personal switch skip the new forced tap, so the next thing
      // they see is still the outing note rather than a lesson they have clearly outgrown.
      if (!seen.overtimePersonTap && !seen.overtimeIntro) return { anchor: 'staff-0', text: '点一位成员看看：每个人也能单独设置加班。', tap: 'overtimePersonTap', tapGroup: 'staff' };
      if (seen.overtimeIntro) return once('outingIntro', 'outing-group', '负面标签只能靠团建清掉：1 / 3 / 5 天三档，天数越长越可能清掉；全队停工，次数要攒。');
      return null;
    }
    case 'person': {
      const person = state.staff.find((item: any) => item.id === route.id);
      if (!person || !seen.overtimeAllIntro) return null;
      return once('overtimeIntro', 'overtime', '这里可以只让这个人加班，开关就在下面，随时能关掉。')
        || (state.staff.length > 1 ? once('mentorIntro', 'mentor', '带教：能力强的同事能带他提高某一项，两人在同一项目才生效，产出都会变慢。') : null);
    }
    case 'market': return demo ? once('expoIntro', 'exhibitions', '展会按日历举办，报名需要体验版：级别越高报名费越贵、对手越强，名次靠前能换来关注。') : null;
    case 'book': {
      const book = state.catalog.find((item: any) => item.id === route.id);
      return book ? once('bookOpsAll', 'book-ops', '已发售的作品还能继续经营：开补丁、促销、做资料片；口碑达到 70 分还能开发续作。') : null;
    }
    case 'rating': return once('ratingIntro', 'rating', '媒体每季度评一次星级（最高五星），主要看最近三部作品的首周名次，其次是口碑；成绩下滑也会降星。');
    default: return null;
  }
}

function tutorialStep(state: any, route: any, playing: boolean): GuideStep | null {
  const seen = state.tutorial.seen;
  const project = core.activeProject(state, route?.id) || core.projectOpen(state)[0];
  const hasTeammate = state.staff.some((person: any) => !person.founder);
  const complete = !!project && project.progress >= 100;
  const explain = (key: string, anchor: string, text: string): GuideStep | null => seen[key] ? null : { anchor, text, ack: key };
  const introduce = (key: string, anchor: string, text: string): GuideStep | null => seen[key] ? null : { anchor, text, tap: key };
  if (!route) {
    if (state.event) return { anchor: 'next', text: '有一个决定在等你，点这里查看。' };
    const steps: Array<() => GuideStep | null> = [
      // Where you are comes before what you do: the goal card carries both the ambition and the current
      // state, so the opening sequence starts there, then reads the money, and only then asks for a title.
      () => introduce('goal', 'shelf', '欢迎！你是工作室的创始人。办公室里的奖杯架是成就墙：点开看看公司要走的里程碑。'),
      () => explain('money', 'finance', '资金是你的全部家当。月开支 = 工资 + 房租，按天累计、月底统一扣除；资金 ÷ 月开支 ≈ 还能撑几个月。'),
      () => project?.job && !seen.jobIntro ? explain('jobIntro', 'track', '你一个人在小屋里接了第一份委托：' + core.MODULES[project.job.module].name + '。做完有一笔报酬，这块模块也会留在你手里，之后做自己的游戏时直接用上。') : null,
      () => project?.job && !playing && !seen.clock ? { anchor: 'clock', text: '点这里开始时间，把委托做完。右边可以切换速度。', tap: 'clock' } : null,
      () => project?.job ? null : !project && !state.catalog.length && !seen.firstGame ? explain('firstGame', 'nav-project', '委托做完了。接下来做自己的第一款游戏：立项时会自动用上你手里的模块，缺的部分要自己做，也可以招人帮忙。') : null,
      () => !project && !state.catalog.length ? { anchor: 'nav-project', text: '「项目」负责立项、查看进度和发售。点这里为第一款游戏立项。', tap: 'navProject' } : null,
      () => project?.job ? null : project && !seen.trackIntro ? explain('trackIntro', 'track', '这条进度条显示作品做了多少，团队每天的工作都会推着它往前走。立项是开工；25% 出原型，作品有了雏形，也第一次看得到成绩；55% 完成体验版，能请玩家试玩、做推广，从这时起就能发售；100% 是全部做满，发售不必等到这一步。') : null,
      () => project && !playing && !seen.clock ? { anchor: 'clock', text: '点这里开始时间，团队每天推进开发。右边可以切换速度。', tap: 'clock' } : null,
      () => project && !project.job && !seen.assign ? { anchor: 'nav-project', text: '作品需要有人去做：点「项目」，找到「调整分工」，把人分到各项工作上。', tap: 'navProject' } : null,
      // A hire is only useful against a short board, so the tip names the trade that covers the
      // founder's weakest ability instead of always saying "programmer". Tapping the tab is enough:
      // the condition must be satisfied by the very tap it asks for, or the tip can never be cleared.
      () => project && !project.job && project.progress >= 10 && !hasTeammate && !seen.navTeam ? { anchor: 'nav-team', text: '一个人也能做完首作，但一个人只能顾一头。点「团队」招一位' + core.ROLES[weakestRole(state)].name + '，' + core.ROLES[weakestRole(state)].task + '，进度会快很多。', tap: 'navTeam' } : null,
      // A new hire only covers their own trade by default. Teaching the habit of re-splitting the
      // work right after the first hire is the difference between a second pair of hands and a salary.
      () => project && seen.assign && hasTeammate && !seen.reassign && !project.released ? { anchor: 'nav-project', text: '新同事到岗了。他默认只做自己最擅长的一项，点「项目」→「调整分工」，可以让他多担几项。', tap: 'navReassign' } : null,
      // The radar only appears once a prototype exists, so its explanation has to wait for that moment
      // too — teaching six axes before they are on screen is a wall of words with nothing to point at.
      () => project?.checkpoints.prototype && !seen.dimensions ? { anchor: 'radar', text: '原型出来了，六维评分也解锁：创意、深度、流畅、画面、声音、稳定。实线是现在的分数，虚线是按当前团队的水平能到哪；综合评分是六项按玩家口味加权。', ack: 'dimensions' } : null,
      // "知道了" notes are optional everywhere, the main screen included: the highlighted control stays
      // live, so acting on it and dismissing the tip are both valid. Only the steps below are forced taps —
      // there, opening the page is the lesson itself.
      () => project?.checkpoints.prototype && !seen.scene ? explain('scene', 'scene', '办公室也是入口：墙上的大屏幕是当前作品，点开进项目；星级铭牌是媒体评级；白板是日历；奖杯架是成就；下方公告栏是行业新闻；点工位打开团队。') : null,
      () => project?.checkpoints.demo && !seen.testing && !seen.navTesting ? { anchor: 'nav-project', text: '体验版完成：点「项目」，在里面打开「试玩」，先招一批玩家来找缺陷。', tap: 'navTesting' } : null,
      // Optional tip: 市场 stays live under the highlight, 知道了 dismisses it. Keep this an ack step —
      // a forced tap removes the 知道了 button and makes promoting feel compulsory.
      () => project?.test && !seen.promote && !project.promoted ? explain('promote', 'nav-market', '试玩之后可以去「市场」投放推广。每部作品只推广一次，只换关注、不保证销量；首作可以投最小一档，也可以不投。') : null,
      () => project?.test && !seen.defects ? explain('defects', 'stat-defects', '待修缺陷是测试和玩家发现、还没修的问题。员工负责的工作做满后自动消耗工时修复；没测到的缺陷会在发售后被玩家发现。') : null,
      () => complete && !project.released ? explain('launchBook', 'nav-project', '各评分项都做满了。想发售时在「项目」里正式发售，也可以继续返工提高评分。') : null,
      () => !project && state.catalog.length === 1 && !seen.navReview ? { anchor: 'nav-finance', text: '首作已发售。点「公司」，在作品履历里打开它看看复盘：哪里亏了，下一作怎么改。', tap: 'navReview' } : null
    ];
    for (const step of steps) { const result = step(); if (result) return result; }
    return null;
  }
  switch (route.menu) {
    case 'team': return hasTeammate ? null : { anchor: 'recruit-' + weakestRole(state), text: '招一位' + core.ROLES[weakestRole(state)].name + '，' + core.ROLES[weakestRole(state)].task + '。' };
    case 'finance': return !project && state.catalog.length === 1 ? { anchor: 'book-0', text: '打开首作，看看复盘。', tap: 'reviewBook' } : null;
    case 'recruit':
      return state.candidates[route.id] ? (hasTeammate ? null : { anchor: 'candidates', text: '六项能力决定作品各项能做多好，速度决定开发进度，月薪越高开支越大。' }) : { anchor: 'recruit', text: '发布招聘要花一点钱，熟人会推荐几位候选人。' };
    case 'candidate': return hasTeammate ? null : { anchor: 'hire', text: '工资按在职天数累计，月底结算。满意就录用。' };
    case 'project':
      if (!project || project.job) return null;
      // Before sending the player to the assignment page, show what the six rows are for. Stay with
      // what is on screen — work left and the estimated day — instead of systems taught later.
      if (!seen.dimensionsEta && !core.activeProject(state, route.id)?.released) return { anchor: 'project-dimensions', text: '这里是作品的六项评分：每一行都写着还剩多少工作、预计几天做完。点开某一项还能看详情，并直接调整谁来做。', ack: 'dimensionsEta' };
      if (!seen.assign) return { anchor: 'assign', text: '点「调整分工」，把人分到各项工作上；没有人做的工作会一直停在原地。', tap: 'assignPage' };
      if (hasTeammate && !seen.reassign && !project.released) return { anchor: 'assign', text: '新同事还没安排上：点「调整分工」，看看他现在做什么。', tap: 'assignPage' };
      if (project.checkpoints.demo && !seen.testing && !seen.testingEntry) return { anchor: 'testing', text: '点「试玩」，招一批玩家来找缺陷、听评价。', tap: 'testingEntry' };
      // Several buttons live on this page; once the trial build exists the useful one is the release.
      if (project.checkpoints.demo && !project.released && !seen.launchBook) return { anchor: 'launch', text: '体验版已经能卖了：做好准备后点这里发售，也可以继续制作、返工提高评分。', ack: 'launchBook' };
      return null;
    case 'assign': {
      if (!seen.assign) return { anchor: 'person-assign-0', text: '给每人挑工作，可以多选。一个人同时做几项，每天的时间会分摊到各项上，每项都慢一些；做不擅长的工作，评分也会低一些。', ack: 'assign' };
      if (hasTeammate && !seen.reassign) {
        const mate = state.staff.findIndex((person: any) => !person.founder);
        return { anchor: 'person-assign-' + Math.max(0, mate), text: '新同事默认只做他最擅长的一项。也可以点其它工作让他多担几项，做完会自动空出手。', ack: 'reassign' };
      }
      return null;
    }
    case 'testing': return seen.testing ? null : { anchor: 'tests', text: '花一点钱招玩家试玩：会碰到一些测试漏掉的缺陷，也会指出这类玩家最在意的评分项。可以试多轮，覆盖越高碰到的越少。', ack: 'testing' };
    case 'market':
      if (project && !project.promoted && !seen.promotions) return { anchor: 'promotions', text: '每部作品只推广一次，档位差几个数量级。先看上面每位关注约值多少钱、这部作品首发能吃下多少关注，再决定投哪一档；首作预算有限，可以投最小一档，也可以不投。', ack: 'promotions' };
      return null;
    default: return null;
  }
}
