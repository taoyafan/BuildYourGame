import * as core from './Studio';

export const money = (value: number) => Number(value).toFixed(2) + ' 万';
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
  return progress >= 100 ? '准备发售' : progress >= 55 ? '体验版与完善' : progress >= 25 ? '内容制作' : '原型开发';
}

export function guideOn(state: any) {
  return !!state.company && !state.tutorial.skipped && (state.catalog.length === 0 || state.catalog.length === 1 && !state.tutorial.seen.review);
}

export function menuLock(state: any, menu: string) {
  // A tool shop before the first project is just six prices with nothing to spend them on.
  if (menu === 'tools' && !state.projects.length) return '立项后开放';
  // Playtesting and promotion are about a build that exists. Opening them at day one let a player walk
  // into three empty pages before the prototype was even done.
  const shown = core.projectOpen(state).some((project: any) => project.checkpoints.demo) || state.catalog.length > 0;
  if ((menu === 'testing' || menu === 'market') && !shown) return '任一项目 体验版完成后开放';
  return '';
}

export function bestChannel(state: any) {
  return ['headhunt', 'web', 'friends'].find(channel => core.channelOpen(state, channel));
}

export function advice(state: any) {
  const project = core.projectOpen(state)[0];
  if (state.over) return { title: '公司未能支付月底开支', text: '可在公司菜单导出或重新创业。', menu: 'finance' };
  if (state.event) return { title: state.event.title, text: '需要你做个决定，时间已暂停。', menu: 'event' };
  const worker = state.staff[0];
  if (!worker) return { title: '招一位同事', text: '先从熟人推荐里招一位同事，一起把第一款游戏做出来。', menu: 'recruit', id: 'code:' + bestChannel(state) };
  if (!project) {
    if (!state.catalog.length) return { title: '为第一款游戏立项', text: '首作是练习，建议选小型作品。', menu: 'new-project' };
    return { title: '为下一款作品立项', text: '参考上一作复盘，先补最被在意的短板。', menu: 'new-project' };
  }
  if (!state.staff.some((person: any) => core.chosenWorks(project, person).length) && !state.staff.some((person: any) => person.role === 'code' || person.role === 'design' || person.role === 'art')) {
    return { title: '还没有人做这份工作', text: '在「项目」里给同事分配要做的工作。', menu: 'project', id: project.id };
  }
  const pipeline = core.dimensionPipeline(state, project);
  const idle = pipeline.rows.filter((row: any) => row.days === null && row.remaining > 0);
  if (idle.length) return { title: '有评分项没人做', text: `${idle.map((row: any) => core.DIMENSIONS.find(d => d.key === row.key)?.name).join('、')}还没有人负责。`, menu: 'project', id: project.id };
  if (state.staff.some((person: any) => person.stressTags.length)) return { title: '有人状态不对', text: '压力标签正在拉低产出，可以安排休假或团建。', menu: 'team' };
  if (project.progress >= 55 && !project.test && core.playtestOffer(state, project).available) return { title: '招募玩家试玩体验版', text: '试玩能发现缺陷，了解玩家偏好。', menu: 'testing' };
  if (project.progress >= 55 && !project.promoted && project.followers < 1500) return { title: '推广体验版', text: '关注 ' + number(project.followers) + ' 人，推广能扩大首发。', menu: 'market' };
  if (pipeline.bottleneck) return { title: '推进《' + project.name + '》', text: `最慢的是${core.DIMENSIONS.find(d => d.key === pipeline.bottleneck.key)?.name}，约 ${pipeline.bottleneck.days} 天。`, menu: 'project', id: project.id };
  return { title: '推进项目', text: '查看各评分项的剩余人日与预计完成日，点开可给对应的人分工。', menu: 'project', id: project.id };
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

export function menu(state: any, route: any) {
  if (!route) return null;
  switch (route.menu) {
    case 'setup': return { title: '成立工作室', blocks: [] };
    case 'new-project': return newProjectMenu(state);
    case 'project': return projectMenu(state, route.id);
    case 'dimension': return dimensionMenu(state, route.id, route.dim);
    case 'assign': return assignMenu(state, route.id);
    case 'testing': return testingMenu(state, route.id);
    case 'market': return marketMenu(state, route.id);
    case 'book': return bookMenu(state, route.id);
    case 'rankings':
    case 'industry': return industryMenu(state, route.id);
    case 'rival': return rivalMenu(state, route.id);
    case 'exhibitions': return exhibitionsMenu(state);
    case 'team': return teamMenu(state);
    case 'recruit': return recruitMenu(state, route.id);
    case 'candidate': return candidateMenu(state, route.id);
    case 'person': return personMenu(state, route.id);
    case 'dismiss': return dismissMenu(state, route.id);
    case 'tools': return toolsMenu(state);
    case 'finance': return financeMenu(state);
    case 'restart': return { title: '确认重新创业？', blocks: [
      { type: 'note', icon: 'Target', text: '重新创业会覆盖当前存档，公司、员工、作品和经营记录都会清空，且无法撤销。' },
      { type: 'text', text: '如果还想保留当前进度，请先导出存档。' },
      { type: 'buttons', items: [
        { text: '先导出存档', action: 'export' },
        { text: '取消，返回公司', action: 'menu', data: { menu: 'finance' } },
        { text: '确认清空并重新创业', action: 'restart-confirm' }
      ] }
    ] };
    case 'history': return historyMenu(state);
    case 'goals': return goalsMenu(state);
    case 'archive': return archiveMenu(state);
    case 'event': {
      if (!state.event) return { title: '没有待决事项', blocks: [{ type: 'text', text: '继续经营即可。' }] };
      const event = state.event;
      const choices = { type: 'choices', items: event.choices.map((choice: any) => ({ ...choice, action: 'decision' })) };
      // 发售瞬间既是决策页，也是这一作的成绩单：封面、首发到账、玩家评价和复盘入口。
      // 重构时这几块被删到只剩一行文字，发售就变成了一个没有仪式感的确认框。
      const released = event.id === 'release' ? state.catalog.find((book: any) => book.id === state.lastRelease) : null;
      if (!released) return { title: event.title, blocks: [{ type: 'text', text: event.text }, choices] };
      const blocks: any[] = [
        { type: 'cover', book: released },
        { type: 'payout', amount: released.openingReceipt, label: '首发到账', note: '首发售出 ' + number(released.openingUnits) + ' 份 · 玩家评价 ' + released.reviewScore.toFixed(1) },
        ...(released.review?.quotes?.length ? [{ type: 'quotes', items: released.review.quotes }] : []),
        { type: 'text', text: event.text },
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
  if (!draft.type || !core.TYPES[draft.type]) return '选一个类型开始。';
  const type = core.TYPES[draft.type];
  const scale = core.SCALES[draft.scale] || core.SCALES[0];
  const workload = type.work * scale.work;
  // The quote must be the whole job, not the single dimension a founder happens to default to. Output
  // per day is the team's combined speed, so the estimate is total work over total hands and stays
  // honest no matter how the work gets split later.
  const capacity = state.staff.reduce((total: number, person: any) => total + (person.leaveUntil > state.day ? 0 : person.speed / 100), 0);
  const days = capacity > 0.0001 ? Math.ceil(workload / capacity) : null;
  const time = days === null ? '还没有能推进的人，招聘后才能开始。' : '现有 ' + state.staff.length + ' 人、五项内容都有人做，做满约 ' + days + ' 天（约 ' + (days / 30).toFixed(1) + ' 个月），不含测试与修复。';
  return '工作量 ' + workload.toFixed(0) + '，' + time + '\n售价 ' + price(type.price * scale.price) + '；基础市场容量 ' + number(core.MARKET_SIZE * scale.reach) + ' 份，不是保底销量。\n' + type.audience + '最看重：' + core.audienceFocus(draft.type) + '。' + (draft.sequel ? '\n续作继承部分关注，但玩家期待更高。' : '');
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
  if (!project) return { title: '项目', blocks: [{ type: 'buttons', items: [{ text: '新作立项', action: 'menu', data: { menu: 'new-project' } }] }] };
  const metrics = core.visibleMetrics(project);
  const forecast = core.projectForecast(state, project);
  const open = core.projectOpen(state);
  const idle = (forecast.idle || []).map((key: string) => core.DIMENSIONS.find(dimension => dimension.key === key)?.name);
  // A finished title has no remaining work, so its date is not "nobody can push it" but "done".
  const finished = forecast.rows.filter((row: any) => row.key !== 'stability').every((row: any) => row.remaining <= 0.0001);
  const idleRows = forecast.rows.filter((row: any) => row.key !== 'stability' && row.remaining > 0.0001 && row.days === null);
  const etaText = finished ? '已完成' : idleRows.length ? '还有无人负责的评分项' : '第 ' + forecast.eta + ' 天（约 ' + forecast.days + ' 天）';
  const blocks: any[] = [
    { type: 'lines', items: [['《' + project.name + '》', core.TYPES[project.type].name + ' · ' + core.SCALES[project.scale].name], ['阶段', stage(project)], ['完成度', metrics.progress.toFixed(0) + '%']] },
    ...(open.length > 1 ? [{ type: 'tabs', items: open.map((item: any) => ({ text: item.name, route: { menu: 'project', id: item.id }, active: item.id === project.id })) }] : []),
    ...(project.checkpoints.prototype ? [{ type: 'radar', metrics, genre: project.type, projectId: project.id }] : []),
    { type: 'section', title: '六项评分（点开可看详情并分工）' },
    { type: 'dimensions', items: forecast.rows, bottleneck: forecast.bottleneck ? forecast.bottleneck.key : null, projectId: project.id },
    { type: 'lines', items: [['预计内容完成', etaText], ['待修缺陷', metrics.known + ' 项'], ['关注', number(project.followers) + ' 人']] },
    ...(idle.length ? [{ type: 'note', icon: 'Users', text: idle.join('、') + '还没有人做。在「调整分工」里把人分过去，否则作品永远做不完。' }] : []),
    ...(core.projectOrder(state).length > 1 ? [
      { type: 'text', text: '当前第 ' + (core.projectOrder(state).findIndex((item: any) => item.id === project.id) + 1) + ' 优先；其余项目按顺序承担协调成本。' },
      { type: 'buttons', columns: 2, items: [
        { text: '提高优先级', action: 'priority', data: { id: project.id, priority: core.projectOrder(state).findIndex((item: any) => item.id === project.id) - 1 }, disabled: core.projectOrder(state)[0]?.id === project.id },
        { text: '降低优先级', action: 'priority', data: { id: project.id, priority: core.projectOrder(state).findIndex((item: any) => item.id === project.id) + 1 }, disabled: core.projectOrder(state).slice(-1)[0]?.id === project.id }
      ] }
    ] : []),
    { type: 'note', icon: 'Users', text: core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type) },
    ...(project.progress >= 55 && project.deadline === null ? [{ type: 'buttons', items: [{ text: '公布 ' + core.RELEASE_LEAD_DAYS + ' 天后发售', action: 'deadline', data: { id: project.id, days: core.RELEASE_LEAD_DAYS }, anchor: 'deadline' }] }] : []),
    ...(project.deadline !== null ? [{ type: 'text', text: '已公布：第 ' + project.deadline + ' 天发售。到期未发会损失关注。', muted: true }] : []),
    { type: 'buttons', items: [
      { text: '调整分工', action: 'menu', data: { menu: 'assign', id: project.id }, anchor: 'assign' },
      { text: '招募试玩', action: 'menu', data: { menu: 'testing', id: project.id }, disabled: !project.checkpoints.demo },
      { text: '市场与推广', action: 'menu', data: { menu: 'market', id: project.id }, disabled: !project.checkpoints.demo },
      { text: project.progress >= 100 ? '正式发售' : project.progress >= 55 ? (metrics.unfinished.length ? '提前发售（内容未做满）' : '正式发售') : '体验版完成后才能发售', action: 'launch', data: { id: project.id }, disabled: metrics.progress < 55, anchor: 'launch' },
      { text: '再开一个项目', action: 'menu', data: { menu: 'new-project' }, anchor: 'new-project' }
    ] },
    ...(project.work.sound.done < project.work.sound.total - 0.001 && project.soundOut == null ? [
      { type: 'section', title: '声音外包（每作一次）' },
      { type: 'buttons', items: core.SOUND_OUTSOURCE.map((plan: any, index: number) => ({ text: plan.name + ' · ' + money(plan.cost), action: 'outsource', data: { id: project.id, tier: index }, disabled: state.cash < plan.cost, anchor: 'outsource-' + index })) },
      { type: 'text', text: '外包能立刻完成一部分声音工作，代价是这一维做不高；之后可由音频岗返工提高。' + core.SOUND_OUTSOURCE[0].text, muted: true }
    ] : []),
    { type: 'checklist', items: core.launchChecklist(state, project) }
  ];
  return { title: '项目', blocks };
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
  const assignedPeople = state.staff.filter((person: any) => core.personWorks(state, project, person).some((key: string) => workKeys.includes(key)));
  const weight = core.TYPES[project.type].weights[dimKey];
  const score = metrics.dimensions[dimKey] || 0;
  const finish = !row ? '—' : row.remaining <= 0.0001 ? '已完成' : row.days === null ? '无人负责' : '约 ' + row.days + ' 天';
  const head: any[] = [{ type: 'stats', tone: 'plain', items: [['当前评分', dimKey === 'stability' && metrics.untested ? '未测' : score.toFixed(0) + ' 分'], ['剩余', row && row.remaining > 0.0001 ? row.remaining.toFixed(0) + ' 人日' : '已做满'], ['预计完成', finish]] }];
  if (dimKey === 'stability') {
    const found = project.defects.filter((defect: any) => defect.found).length;
    const fixed = project.defects.filter((defect: any) => defect.fixed).length;
    head.push({ type: 'lines', items: [['测试覆盖', metrics.coverage.toFixed(0) + '%'], ['缺陷', '已发现 ' + found + ' · 已修 ' + fixed + ' · 待修 ' + metrics.known], ['修复投入', forecast.repair + ' 人日/天']] });
  }
  const blocks: any[] = [
    ...head,
    { type: 'text', text: dimension.desc + (weight >= 0.3 ? ' ' + core.TYPES[project.type].audience + '玩家很看重这一项。' : ' 这类玩家相对不挑剔这一项。'), muted: true },
    { type: 'section', title: assignedPeople.length ? '负责这一项的人（点工作块直接调整）' : '还没有人做，点工作块安排人手' },
    ...state.staff.map((person: any, index: number) => {
      const assigned = core.personWorks(state, project, person);
      const elsewhere = state.projects.find((item: any) => item.id !== projectId && core.personWorks(state, item, person).length);
      return {
        type: 'person-assign', title: person.name + ' · ' + core.ROLES[person.role].name,
        detail: core.personActivity(state, project, person),
        personId: person.id, projectId, index, assigned,
        status: elsewhere ? '在《' + elsewhere.name + '》' : '',
        stress: person.stressTags.map((key: string) => core.STRESS_TAGS[key].name),
        fame: !!person.fame && state.day - (person.joined || 0) < 30,
        works: works.map(work => ({ key: work.key, name: work.name, ability: person.abilities[work.ability], on: assigned.includes(work.key) }))
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
  const blocks: any[] = [
    { type: 'text', text: '每人只属于一个项目，可同时做多项。负责的工作做满后自动消耗工时修复测试抓到的缺陷；没有待修问题时才继续返工。', muted: false }
  ];
  state.staff.forEach((person: any, index: number) => {
    // Show what the person actually does in this project (explicit assignment, else their default
    // home work) rather than the belongsTo-gated personWorks. personWorks hides every box when a
    // founder/employee is "locked out" by an old assignment on a shipped title, which made the whole
    // assign page read as unassigned and every click report "已退出".
    const assigned: string[] = core.personWorks(state, project, person);
    const elsewhere = state.projects.find((item: any) => item.id !== projectId && core.personWorks(state, item, person).length);
    blocks.push({
      type: 'person-assign',
      title: person.name + ' · ' + core.ROLES[person.role].name,
      detail: core.personActivity(state, project, person),
      personId: person.id,
      projectId: project.id,
      index,
      assigned,
      status: elsewhere ? '在《' + elsewhere.name + '》' : '',
      // Anyone running at reduced output is flagged here, so a slow-down is never a mystery later.
      stress: person.stressTags.map((key: string) => core.STRESS_TAGS[key].name),
      fame: !!person.fame && state.day - (person.joined || 0) < 30,
      works: core.WORKS.map(work => ({ key: work.key, name: work.name, ability: person.abilities[work.ability], on: assigned.includes(work.key) }))
    });
  });
  return { title: '分工', blocks };
}

function testingMenu(state: any, id?: string) {
  const project = core.activeProject(state, id) || core.projectOpen(state)[0];
  if (!project) return { title: '试玩', blocks: [{ type: 'text', text: '先立项，并把体验版做出来。' }] };
  const offer = core.playtestOffer(state, project);
  const known = core.visibleMetrics(project).known;
  const blocks: any[] = [
    { type: 'stats', tone: 'plain', items: [['已知待修', known + ' 项'], ['累计试玩', (project.testCount || 0) + ' 人次'], ['试玩轮数', (project.tests || 0) + ' 轮']] }
  ];
  if (project.test) {
    blocks.push({ type: 'result', label: '最近一次试玩评分', value: project.test.score.toFixed(1), note: project.test.count + ' 人 · 第 ' + project.test.day + ' 天 · 新发现 ' + project.test.found + ' 项缺陷' });
    // Comparing with the previous run is the whole point of a retest: a bare score cannot tell you
    // whether the last round of work helped.
    const history = project.testLog || [];
    if (history.length > 1) {
      const last = history[history.length - 1];
      const previous = history[history.length - 2];
      const delta = last.score - previous.score;
      const base = '（第 ' + previous.day + ' 天 ' + previous.score.toFixed(1) + ' 分）';
      blocks.push({ type: 'text', text: Math.abs(delta) < 0.05 ? '与上次' + base + '持平。' : '比上次' + base + (delta > 0 ? '高 ' : '低 ') + Math.abs(delta).toFixed(1) + ' 分。' });
    }
    blocks.push({ type: 'note', icon: 'Target', text: core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type) });
    blocks.push({ type: 'section', title: '逐项评价' });
    blocks.push({ type: 'feedback', items: project.test.findings });
    blocks.push({ type: 'text', text: '评分对应试玩时的版本。改进后再试玩，才能看到玩家是否认可。', muted: true });
  } else {
    blocks.push({ type: 'text', text: '试玩玩家给出体验评价，并会碰到一部分测试漏掉的缺陷；这些缺陷修好后稳定就会提高。' });
  }
  if ((project.testLog || []).length > 1) {
    blocks.push({ type: 'section', title: '试玩历史' });
    blocks.push({ type: 'lines', items: [...(project.testLog || [])].reverse().map((entry: any) => ['第 ' + entry.day + ' 天 · ' + entry.count + ' 人', entry.score.toFixed(1) + ' 分']) });
  }
  blocks.push({ type: 'section', title: '招募试玩' });
  blocks.push({ type: 'buttons', anchor: 'tests', columns: 2, items: [
    { text: '30 人 · 0.80 万', action: 'test', data: { id: project.id, count: 30 }, disabled: !offer.available || state.cash < 0.8, anchor: 'test-30' },
    { text: '100 人 · 2.00 万', action: 'test', data: { id: project.id, count: 100 }, disabled: !offer.available || state.cash < 2 }
  ] });
  blocks.push({ type: 'text', text: offer.available ? '30 人约碰到六成漏测缺陷，100 人约九成；人数越多，评分波动越小。' : offer.reason || '先处理当前决策。', muted: true });
  return { title: '试玩', blocks };
}

function marketMenu(state: any, id?: string) {
  // Follow the project the player is actually looking at, not whichever one sorts first.
  const project = core.activeProject(state, id) || core.projectOpen(state)[0];
  const blocks: any[] = [];
  const offers = core.exhibitionOffers(state);
  const currentNotReady = !!project && project.progress < 55;
  blocks.push({ type: 'lines', items: [...offers.map((offer: any) => [offer.name + ' · 报名 ' + money(offer.fee), '第 ' + offer.day + ' 天（截止还剩 ' + (offer.deadline - state.day) + ' 天）']), ['年度评奖', '第 ' + Math.ceil(state.day / 360) * 360 + ' 天']] });
  blocks.push({ type: 'buttons', columns: 3, items: offers.map((offer: any) => ({ text: offer.entry ? core.TIERS[offer.tier].name + '展已报名' : '报名' + core.TIERS[offer.tier].name + '展', action: 'exhibition', data: { id: project?.id, tier: offer.tier }, disabled: !offer.available || currentNotReady })) });
  blocks.push({ type: 'buttons', items: [{ text: '展会与媒体', action: 'menu', data: { menu: 'exhibitions' } }, { text: '行业：榜单 · 对手 · 档期 · 新闻', action: 'menu', data: { menu: 'industry' } }] });
  if (currentNotReady) blocks.push({ type: 'text', text: '当前项目完成体验版后才能报名展会。', muted: true });
  else blocks.push({ type: 'text', text: '三级展会都可以报名：级别越高报名费越贵、对手越强，作品不够突出时几乎换不来关注。', muted: true });
  if (project) {
    blocks.push({ type: 'lines', items: [['关注人数', number(project.followers)]] });
    blocks.push({ type: 'text', text: '首发销量主要来自关注者。体验版完成后会自然积累关注，推广能扩大首发，但钱花出去就收不回。市场行情不预告，只能从新闻、榜单与既有作品的回款曲线里自己判断。', muted: true });
    blocks.push({ type: 'lines', items: [['同类型小型作品通常关注', '800～1,500 人'], ['已投放推广', money(project.promoted)]] });
    core.PROMOTE_TIERS.forEach((budget, index) => {
      const range = core.promoteRange(state, project, budget);
      blocks.push({ type: 'card', group: 'promotions', title: '推广预算 ' + money(budget), text: '预计新增关注 ' + number(range.low) + '～' + number(range.high) + ' 人；每多花一万元，新增的关注会变少，区间随作品当前关注收敛。', button: { text: '投放 · ' + money(budget), action: 'promote', data: { id: project.id, cost: budget }, disabled: project.progress < 55 || state.cash < budget, anchor: 'promote-' + index } });
    });
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
  const project = state.projects.find((item: any) => item.id === id);
  const dims = project ? core.visibleMetrics(project).dimensions : book.metrics.dimensions;
  const dlcs = state.projects.filter((item: any) => item.parentId === id);
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
      { type: 'lines', items: [['首周销量', book.firstRanks ? number(book.firstWeek) + ' 份' : '首周统计中'], ['首周名次', rankText(book.firstRanks)], ['累计名次', rankText(book.totalRanks)], ['系列期待', book.expectation + ' 分评价压力'], ['主要更新', book.updates + ' 次']] },
      { type: 'section', title: '作品运营' },
      { type: 'buttons', items: [
        { text: '派人做补丁 / 返工', action: 'menu', data: { menu: 'assign', id }, anchor: 'assign-book' },
        { text: book.sale ? '关闭促销' : '开启促销', action: 'sale', data: { id, enabled: !book.sale }, disabled: state.day - book.released > 540, anchor: 'sale-toggle' },
        ...(!book.parentId ? [{ text: '新项目：资料片（DLC）· ' + money(4 + book.scale * 2), action: 'dlc', data: { id }, disabled: dlcs.length >= 2 || state.cash < 4 + book.scale * 2 || state.day - book.released > 540 }] : []),
        { text: book.reviewScore >= 70 ? '开发续作' : '好评达到 70 分可开发续作', action: 'sequel', data: { id }, disabled: book.reviewScore < 70 }
      ] },
      { type: 'text', text: '促销统一 ' + (core.DISCOUNTS[0] * 10) + ' 折；开启后系统按剩余需求决定何时开始，关闭立即恢复原价。补丁与更新直接来自分工中的实际修复、返工，不再单独购买。', muted: true },
      { type: 'text', text: '团队：' + (book.team.length ? book.team.map((person: any) => person.name + '（' + core.ROLES[person.role].name + '）').join('、') : '—'), muted: true }
    ]
  };
}

function goalsMenu(state: any) {
  const goals = core.goalsOf(state);
  const phase = core.companyPhase(state);
  const canMove = state.goals.breakEven !== null && state.office === 0 || state.office === 1 && state.goals.topTen !== null && state.goals.award !== null;
  return {
    title: '公司目标',
    blocks: [
      { type: 'lines', items: [['当前阶段', phase.name + ' · ' + phase.scarce], ['已发售作品', state.catalog.length + ' 部']] },
      { type: 'text', text: phase.text },
      { type: 'goals', items: goals.steps, current: goals.current.key },
      ...(goals.current.key === 'record' ? [{ type: 'note', icon: 'Trophy', text: goals.current.title + '：' + goals.current.text }] : []),
      { type: 'buttons', items: [{ text: canMove ? (state.office === 0 ? '搬进正式办公室' : '再次扩建工作室') + ' · ' + money(core.OFFICES[state.office + 1].cost) : '当前还不满足扩建条件', action: 'move', disabled: !canMove || state.office >= 2 }] }
    ]
  };
}

// The archive is the company's record: shipped titles, their results and who worked on them. It is the
// only place reputation is shown, and it is not a score board with bars to fill.
function archiveMenu(state: any) {
  const archive = core.companyArchive(state);
  const blocks: any[] = [
    { type: 'lines', items: [['年度获奖', archive.wins + ' 次'], ['已发售作品', archive.books.length + ' 部']] }
  ];
  if (!archive.books.length) blocks.push({ type: 'text', text: '还没有作品。第一作发售后，这里会记下它的成绩与参与的人。' });
  for (const book of archive.books) {
    blocks.push({ type: 'section', title: '《' + book.name + '》' });
    blocks.push({ type: 'lines', items: [
      ['类型体量', core.TYPES[book.type].name + ' · ' + core.SCALES[book.scale].name],
      ['发售', '第 ' + book.released + ' 天'],
      ['口碑', book.review.toFixed(1) + ' 分'],
      ['销量 / 回款', number(book.units) + ' 份 · ' + money(book.received)],
      ['首周名次', rankText(book.firstRanks)],
      ...(book.breakout ? [['备注', '创意出圈']] : [])
    ] });
    if (book.contributions.length) blocks.push({ type: 'lines', title: '参与的人', items: book.contributions.map((item: any) => [item.name, core.ROLES[item.role].name + ' · 贡献约 ' + Math.round(item.share * 100) + '%']) });
  }
  const focus = state.focus || 0;
  const nextAt = core.FOCUS_AT[focus + 1];
  blocks.push({ type: 'section', title: '行业声量' });
  blocks.push({ type: 'lines', items: [['行业声量', String(archive.voice)], ['当前关注层级', core.TIERS[focus].name], ['距下一层', nextAt === undefined ? '已在最高层' : String(Math.max(0, Math.ceil(nextAt - archive.voice)))]] });
  blocks.push({ type: 'text', text: '声量由粉丝、近三作首周销量、获奖（按级别）与公司规模合成，不含现金。它决定新闻与榜单默认关注哪一层（只升不降），也影响行业名人出现的机会；所有展会与榜单始终开放。', muted: true });
  return { title: '公司档案', blocks };
}

function teamMenu(state: any) {
  const channel = bestChannel(state);
  const hasTeammate = state.staff.some((person: any) => !person.founder);
  const openRoles = Object.keys(core.ROLES).filter((role: string) => core.roleOpen(state, role));
  const lockedRoles = Object.keys(core.ROLES).filter((role: string) => !core.roleOpen(state, role));
  const stressed = state.staff.filter((person: any) => person.stressTags.length);
  const sample = stressed[0] || state.staff[0];
  const chance = sample ? Math.round(core.outingChance(state, sample, 2) * 100) : 0;
  const pity = sample ? core.outingPity(state, sample) : 0;
  return {
    title: '团队',
    blocks: [
      { type: 'lines', items: [['工位', state.staff.length + ' / ' + core.seats(state) + '（' + core.OFFICES[state.office].name + '）'], ['月开支（含房租）', money(core.monthlyCost(state))]] },
      { type: 'buttons', columns: 3, items: openRoles.map(role => ({ text: '招聘' + core.ROLES[role].name, action: 'menu', data: { menu: 'recruit', id: role + ':' + channel }, anchor: 'recruit-' + role })) },
      ...(lockedRoles.length ? [{ type: 'text', text: lockedRoles.map((role: string) => core.ROLES[role].name).join('、') + '岗位在首作发售后开放。', muted: true }] : []),
      { type: 'staff' },
      ...(hasTeammate ? [
        { type: 'section', title: '团队管理' },
        { type: 'text', text: '加班按人设置：产出更高，但缺陷更多，也会累积「疲惫」「想走」这类负面标签。', muted: true },
        { type: 'segments', title: '团建时长（占工作日，工资照付）', items: [1, 2, 3].map(value => ({ text: value + ' 天', action: 'outing', data: { days: value, value }, active: false, anchor: 'outing-' + value })) },
        ...(state.staff.length ? [{ type: 'lines', items: [['当前长期成长概率', chance + '%'], ['保底', `${pity} / ${core.OUTING_PITY} 次必出`], ['频率影响', '连着做概率低，隔一段时间恢复']] }, { type: 'text', text: '成功时获得永久能力成长，并清除一个负面标签；团建时间越长，越可能额外觉醒性格标签。每人的效果与觉醒记录在经营记录中。', muted: true }] : [])
      ] : [{ type: 'text', text: '创始人也在工作。首作一个人就能做完，招人是为了补上自己干不了的那一头：程序或策划请配美术，美术请配程序。', muted: true }])
    ]
  };
}

function personMenu(state: any, id: string) {
  const person = state.staff.find((item: any) => item.id === id);
  if (!person) return { title: '员工已离职', blocks: [{ type: 'text', text: '可以返回团队查看其他同事。' }] };
  return {
    title: person.name,
    blocks: [
      { type: 'lines', items: [['岗位', core.ROLES[person.role].name], ['月薪', money(person.wage)], ['工作速度', String(person.speed)], ['单位用人日产出', (person.speed / 100).toFixed(2) + ' 人日/天'], ['累计工作量', person.work.toFixed(1)], ['成长次数', String(person.level)], ['休假', person.leaveUntil > state.day ? '至第 ' + person.leaveUntil + ' 天，工资照付' : '正常在岗']] },
      ...(state.overtime[person.id] ? [{ type: 'lines', title: '当前加班状态', items: [['负面标签概率', Math.round((person.stressChance || 0) * 100) + '%'], ['说明', '继续加班会累积「疲惫」「想走」标签，拉低产出。']] }] : []),
      ...(person.fame ? [{ type: 'note', icon: 'Star', text: '行业名人：自带粉丝，新作首发关注更高。' + (state.day - (person.joined || 0) < 30 ? '仍在磨合期，产出打八折。' : '已融入团队。') + (core.conditionText(person) ? ' 附带条件：' + core.conditionText(person) : '') }] : []),
      { type: 'section', title: '六项能力' },
      { type: 'lines', items: core.ABILITIES.map(ability => [ability.name, String(person.abilities[ability.key])]) },
      ...(person.stressTags.length ? [{ type: 'lines', title: '负面标签', items: person.stressTags.map((key: string) => [core.STRESS_TAGS[key].name, core.STRESS_TAGS[key].text]) }] : []),
      ...(person.tags.length ? [{ type: 'lines', title: '标签', items: person.tags.map((tag: any) => [core.ABILITY_TAGS[tag.key]?.name || core.PERSONALITY_TAGS[tag.key]?.name, core.ABILITY_TAGS[tag.key]?.text || core.PERSONALITY_TAGS[tag.key]?.text]) }] : []),
      { type: 'toggle', text: '让 ' + person.name + ' 加班', value: !!state.overtime[id], action: 'overtime', data: { id } },
      { type: 'buttons', items: [{ text: '五天带薪休假', action: 'leave', data: { id: person.id }, disabled: person.leaveUntil > state.day }, { text: '裁员（N+1）', action: 'menu', data: { menu: 'dismiss', id: person.id } }] },
      { type: 'text', text: '裁员的遣散费 = 月薪 ×（服务年数 + 1），在职同事也会受到影响。工资在招聘时定下，不随成长上调。', muted: true }
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
      { type: 'lines', items: [['岗位', core.ROLES[person.role].name], ['月薪', money(person.wage)], ['工作速度', String(person.speed)]] },
      ...(person.fame ? [{ type: 'note', icon: 'Star', text: '行业名人：自带粉丝，新作首发关注更高；入职前 30 天需要磨合，产出打八折。要价也高。' + (core.conditionText(person) ? ' 附带条件：' + core.conditionText(person) : '') }] : []),
      { type: 'lines', title: '六项能力', items: core.ABILITIES.map(ability => [ability.name, String(person.abilities[ability.key])]) },
      ...(person.tags.length ? [{ type: 'lines', title: '能力标签为数值摘要；性格标签有独立效果', items: person.tags.map((tag: any) => [core.ABILITY_TAGS[tag.key]?.name || core.PERSONALITY_TAGS[tag.key]?.name, core.ABILITY_TAGS[tag.key]?.text || core.PERSONALITY_TAGS[tag.key]?.text]) }] : []),
      { type: 'buttons', anchor: 'hire', items: [{ text: person.hired ? '已录用' : '录用 · 月薪 ' + money(person.wage), action: 'hire', data: { id: person.id }, disabled: reasons.length > 0, help: reasons.join('\n'), helpKey: 'hire:' + person.id }] }
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

function toolsMenu(state: any) {
  const keys = Object.keys(core.STUDIO_TOOLS);
  const open = keys.filter((key: string) => core.toolOpen(state, key));
  const locked = keys.filter((key: string) => !core.toolOpen(state, key));
  return {
    title: '工具',
    blocks: [
      { type: 'text', text: '工具属于公司，以后的作品都能用；只加速对应那类工作，不提高质量。', muted: true },
      ...open.map((key: string) => {
        const tool = core.STUDIO_TOOLS[key];
        return { type: 'card', title: tool.name, text: tool.text, button: { text: state.tools.includes(key) ? '已购置' : '购置 · ' + money(tool.cost), action: 'buy-tool', data: { key }, disabled: state.tools.includes(key) || state.cash < tool.cost, anchor: 'tool-' + key } };
      }),
      ...(locked.length ? [{ type: 'text', text: locked.map((key: string) => core.STUDIO_TOOLS[key].name).join('、') + '在首个作品完成原型后开放。', muted: true }] : [])
    ]
  };
}

function financeMenu(state: any) {
  const ledger = state.ledger;
  return {
    title: '公司',
    blocks: [
      { type: 'lines', items: [['现金', money(state.cash)], ['本月收入', money(ledger.income)], ['本月已开支', money(monthSpent(state))], ['已累计应付', money(state.accrued)], ['月开支（工资 + 房租）', money(core.monthlyCost(state))]] },
      { type: 'section', title: '公司与记录' },
      { type: 'buttons', items: [
        { text: '成长目标与扩建', action: 'menu', data: { menu: 'goals' } },
        { text: '公司档案与作品履历', action: 'menu', data: { menu: 'archive' } },
        { text: '行业：榜单 · 对手 · 档期 · 新闻', action: 'menu', data: { menu: 'industry' } },
        { text: '经营记录', action: 'menu', data: { menu: 'history' } }
      ] },
      { type: 'section', title: '存档与设置' },
      { type: 'buttons', columns: 3, items: [
        { text: '导出存档', action: 'export' },
        { text: '导入存档', action: 'import' },
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

function rankText(ranks: any) {
  if (!ranks) return '首周结束后公布';
  return core.TIERS.map((tier: any, level: number) => tier.name + ' ' + ranks[level]).join(' · ');
}

function exhibitionsMenu(state: any) {
  const blocks: any[] = [{ type: 'text', text: '城市独立游戏展每年第 90、270 天，全国游戏展第 150 天，国际游戏展第 300 天，都提前七天截止报名。完成体验版才能报名，名次决定换来的关注。', muted: true }];
  for (const entry of [...state.exhibitions].reverse()) {
    blocks.push({ type: 'section', title: '第 ' + entry.day + ' 天 · ' + core.TIERS[entry.tier ?? 0].expo + ' · 《' + entry.name + '》' });
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
    { type: 'tabs', items: [['board', '榜单'], ['rivals', '对手'], ['schedule', '档期'], ['news', '新闻'], ['awards', '评选']].map(([key, text]) => ({ text, route: route(key), active: key === tab })) }
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
    blocks.push({ type: 'text', text: '有档案的对手工作室，按当前关注层级在前。点开查看历年作品与交锋记录。', muted: true });
    blocks.push({ type: 'choices', items: order.map((studio: any) => {
      const profile = core.rivalProfile(state, studio.id);
      const latest = profile?.works.find((work: any) => work.released <= state.day);
      return rivalChoice(studio.name, core.TIERS[studio.tier].name + ' · 擅长' + core.TYPES[studio.type].name + ' · 势头' + profile?.trend + (latest ? '\n近作《' + latest.name + '》' : ''), studio.id);
    }) });
    const closed = state.rivals.filter((studio: any) => studio.closed !== null);
    if (closed.length) blocks.push({ type: 'text', text: '已解散：' + closed.map((studio: any) => studio.name).join('、'), muted: true });
  } else if (tab === 'schedule') {
    const schedule = core.scheduleOf(state);
    blocks.push({ type: 'text', text: '已公布的发售日。小作品通常不提前公布；同一周发售的作品会分流首发关注。', muted: true });
    if (!schedule.length) blocks.push({ type: 'text', text: '近期没有公布的档期。' });
    else blocks.push({ type: 'choices', items: schedule.map((item: any) => rivalChoice('第 ' + item.day + ' 天 · ' + item.name, item.own ? '本社承诺的发售日' : item.studio + ' · ' + core.TIERS[item.tier].name, item.studioId, item.own)) });
  } else if (tab === 'news') {
    const list = core.newsFor(state).slice(0, 30);
    blocks.push({ type: 'text', text: '主要报道' + core.TIERS[focus].name + '层的动态，更高层只报头条。', muted: true });
    if (!list.length) blocks.push({ type: 'text', text: '暂时没有新闻。' });
    else blocks.push({ type: 'choices', items: list.map((item: any) => rivalChoice(item.title, '第 ' + item.day + ' 天' + (item.text ? ' · ' + item.text : ''), item.studio, item.own)) });
  } else {
    blocks.push(levelTabs);
    const awards = [...state.awards].reverse().filter((award: any) => (award.tier ?? 1) === level).slice(0, 9);
    if (!awards.length) blocks.push({ type: 'text', text: '年度评选在每年第 360 天举行。' });
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
      { type: 'lines', items: [['层级', core.TIERS[studio.tier].name], ['擅长', core.TYPES[studio.type].name], ['势头', trend], ['状态', studio.closed !== null ? '第 ' + studio.closed + ' 天解散' : '经营中'], ['作品数', String(works.filter((work: any) => work.released <= state.day).length)]] },
      { type: 'section', title: '作品' },
      ...(works.length ? [{ type: 'lines', items: works.slice(0, 12).map((work: any) => ['《' + work.name + '》', work.released > state.day ? '定档第 ' + work.released + ' 天' : '第 ' + work.released + ' 天 · 首周 ' + number(work.firstWeek) + ' 份' + (rankOf(work) ? ' · ' + core.TIERS[work.tier].name + '第 ' + rankOf(work) + ' 名' : '')]) }] : [{ type: 'text', text: '还没有作品。' }]),
      { type: 'section', title: '和本社的交锋' },
      ...(clashes.length ? [{ type: 'lines', items: clashes.map((item: any) => ['《' + item.work.name + '》 vs 《' + item.book.name + '》', '首周 ' + number(item.work.firstWeek) + ' : ' + number(item.book.firstWeek || 0)]) }] : [{ type: 'text', text: '还没有同周发售过。', muted: true }])
    ]
  };
}

// Tutorial step for the current screen. `ack` explains an area and waits for "知道了"; `tap` introduces a
// control and counts as seen once the player presses it; neither means "press the highlighted control".
export type GuideStep = { anchor: string; text: string; ack?: string; tap?: string };

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
  if (!guideOn(state)) return null;
  const seen = state.tutorial.seen;
  const project = core.projectOpen(state)[0];
  const hasTeammate = state.staff.some((person: any) => !person.founder);
  const complete = !!project && project.progress >= 100;
  const explain = (key: string, anchor: string, text: string): GuideStep | null => seen[key] ? null : { anchor, text, ack: key };
  const introduce = (key: string, anchor: string, text: string): GuideStep | null => seen[key] ? null : { anchor, text, tap: key };
  if (!route) {
    if (state.event) return { anchor: 'next', text: '有一个决定在等你，点这里查看。' };
    const steps: Array<() => GuideStep | null> = [
      // Where you are comes before what you do: the goal card carries both the ambition and the current
      // state, so the opening sequence starts there, then reads the money, and only then asks for a title.
      () => introduce('goal', 'goal', '欢迎！你是工作室的创始人。点这里看看公司目标，也看看现在的处境。'),
      () => explain('money', 'finance', '资金是你的全部家当。月开支 = 工资 + 房租，按天累计、月底统一扣除；资金 ÷ 月开支 ≈ 还能撑几个月。'),
      () => !project && !state.catalog.length ? { anchor: 'nav-project', text: '「项目」负责立项、查看进度和发售。点这里为第一款游戏立项；首作选小型就够。', tap: 'navProject' } : null,
      () => project && !seen.track ? explain('track', 'track', '五项内容各有进度，最慢的一项是瓶颈；稳定看未修缺陷，没人测试就无从估计。完成度 55% 解锁体验版、试玩与发售；做满后仍可返工。') : null,
      () => project && !playing && !seen.clock ? { anchor: 'clock', text: '点这里开始时间，团队每天推进开发。右边可以切换速度。', tap: 'clock' } : null,
      () => project && !seen.assign ? { anchor: 'nav-project', text: '作品需要有人去做：点「项目」，找到「调整分工」，把人分到各项工作上。', tap: 'navProject' } : null,
      // A hire is only useful against a short board, so the tip names the trade that covers the
      // founder's weakest ability instead of always saying "programmer". Tapping the tab is enough:
      // the condition must be satisfied by the very tap it asks for, or the tip can never be cleared.
      () => project && project.progress >= 10 && !hasTeammate && !seen.navTeam ? { anchor: 'nav-team', text: '一个人也能做完首作，但一个人只能顾一头。点「团队」招一位' + core.ROLES[weakestRole(state)].name + '，' + core.ROLES[weakestRole(state)].task + '，进度会快很多。', tap: 'navTeam' } : null,
      // A new hire only covers their own trade by default. Teaching the habit of re-splitting the
      // work right after the first hire is the difference between a second pair of hands and a salary.
      () => project && seen.assign && hasTeammate && !seen.reassign && !project.released ? { anchor: 'nav-project', text: '新同事到岗了。他默认只做本行，点「项目」→「调整分工」，可以让他多担几项。', tap: 'navReassign' } : null,
      // The radar only appears once a prototype exists, so its explanation has to wait for that moment
      // too — teaching six axes before they are on screen is a wall of words with nothing to point at.
      () => project?.checkpoints.prototype && !seen.dimensions ? { anchor: 'radar', text: '原型出来了，六维评分也解锁：创意、深度、流畅、画面、声音、稳定。实线是现在的分数，虚线是按当前团队的水平能到哪；综合评分是六项按玩家口味加权。', ack: 'dimensions' } : null,
      // On the main screen these two stay forced taps: opening the page is the lesson. Only the tip
      // inside each page is a "知道了" explanation, because acting there costs money.
      () => project?.checkpoints.prototype && !seen.navTools ? { anchor: 'nav-tools', text: '原型成形了。点「工具」看看：只提速、不提高质量，画面、声音和测试工具也已开放。', tap: 'navTools' } : null,
      () => project?.checkpoints.demo && !seen.testing ? { anchor: 'nav-testing', text: '体验版完成：点「试玩」，先招一批玩家来找缺陷。', tap: 'navTesting' } : null,
      () => project?.test && !seen.promote && !project.promoted ? explain('promote', 'nav-market', '试玩之后可以去「市场」投放推广。推广只换关注，不保证销量；首作可以先投一小笔，也可以不投。') : null,
      () => project?.test && !seen.defects ? explain('defects', 'stat-defects', '待修缺陷是测试和玩家发现、还没修的问题。员工负责的工作做满后自动消耗工时修复；没测到的缺陷会在发售后被玩家发现。') : null,
      () => complete && !project.released ? explain('launchBook', 'nav-project', '各评分项都做满了。想发售时在「项目」里正式发售，也可以继续返工提高评分。') : null,
      () => !project && state.catalog.length === 1 ? introduce('review', 'nav-market', '首作已发售。点「市场」打开档案，看看复盘：哪里亏了，下一作怎么改。') : null
    ];
    for (const step of steps) { const result = step(); if (result) return result; }
    return null;
  }
  switch (route.menu) {
    case 'team': return hasTeammate ? null : { anchor: 'recruit-' + weakestRole(state), text: '招一位' + core.ROLES[weakestRole(state)].name + '，' + core.ROLES[weakestRole(state)].task + '。' };
    case 'tools': {
      // The main screen only walks the player to this page; inside, point at a tool they can afford,
      // so the lesson ends with something bought rather than another tip that cannot be cleared.
      if (seen.tools || !project) return null;
      const unowned = Object.keys(core.STUDIO_TOOLS)
        .filter((key: string) => core.toolOpen(state, key) && !state.tools.includes(key));
      if (!unowned.length) return null;
      const buyable = unowned.find((key: string) => state.cash >= core.STUDIO_TOOLS[key].cost) || unowned[0];
      return { anchor: 'tool-' + buyable, text: '工具只加速对应那类工作，不提高质量。买不起也不要紧，钱先花在招人或推广上更划算。', ack: 'tools' };
    }
    case 'recruit':
      return state.candidates[route.id] ? (hasTeammate ? null : { anchor: 'candidates', text: '六项能力决定作品各项能做多好，速度决定开发进度，月薪越高开支越大。' }) : { anchor: 'recruit', text: '发布招聘要花一点钱，熟人会推荐几位候选人。' };
    case 'candidate': return hasTeammate ? null : { anchor: 'hire', text: '工资按在职天数累计，月底结算。满意就录用。' };
    case 'project':
      if (!project) return null;
      if (!seen.assign) return { anchor: 'assign', text: '点「调整分工」，把人分到各项工作上；没有人做的工作会一直停在原地。', tap: 'assignPage' };
      if (hasTeammate && !seen.reassign && !project.released) return { anchor: 'assign', text: '新同事还没安排上：点「调整分工」，看看他现在做什么。', tap: 'assignPage' };
      // Several buttons live on this page; once the trial build exists the useful one is the release.
      if (project.checkpoints.demo && !project.released && !seen.launchBook) return { anchor: 'launch', text: '体验版已经能卖了：做好准备后点这里发售，也可以继续制作、返工提高评分。', ack: 'launchBook' };
      return null;
    case 'assign': {
      if (!seen.assign) return { anchor: 'person-assign-0', text: '给每人挑工作，可以多选。做别的岗位的工作照样推进工期，只是评分更低、缺陷更多。', ack: 'assign' };
      if (hasTeammate && !seen.reassign) {
        const mate = state.staff.findIndex((person: any) => !person.founder);
        return { anchor: 'person-assign-' + Math.max(0, mate), text: '新同事默认只做本行。也可以点其它工作让他多担几项，做完会自动空出手。', ack: 'reassign' };
      }
      return null;
    }
    case 'testing': return seen.testing ? null : { anchor: 'tests', text: '花一点钱招玩家试玩：能发现大部分缺陷，也会指出这类玩家最在意的评分项。预算紧可以晚点再试。', ack: 'testing' };
    case 'market':
      if (project && !project.promoted && !seen.promotions) return { anchor: 'promotions', text: '推广把钱换成关注：越多越贵，每多花一万元关注增长会变慢。首作预算有限，可以先投一小笔，也可以暂不推广。', ack: 'promotions' };
      return !project && state.catalog.length === 1 ? { anchor: 'book-0', text: '打开首作，看看复盘。', tap: 'reviewBook' } : null;
    default: return null;
  }
}
