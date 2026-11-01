import * as core from './Studio';

export const money = (value: number) => Number(value).toFixed(2) + ' 万';
export const number = (value: number) => Math.round(value).toLocaleString('zh-CN');
export const price = (value: number) => (value * 10000).toFixed(0) + ' 元/份';
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
  if (!core.tutorialActive(state)) return '';
  const project = core.projectOpen(state).find((item: any) => item.checkpoints.demo);
  if ((menu === 'testing' || menu === 'market') && !project) return '任一项目 体验版完成后开放';
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
  if (!state.staff.some((person: any) => (project.assignments?.[person.id] || []).length) && !state.staff.some((person: any) => person.role === 'code' || person.role === 'design' || person.role === 'art')) {
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
  const [role, channel] = String(id || openRole + ':' + openChannel).split(':');
  if (!core.ROLES[role] || !core.CHANNELS[channel]) return recruitMenu(state, openRole + ':' + openChannel);
  const pool = state.candidates[id];
  const fee = core.recruitFee(state, channel);
  const blocks: any[] = [
    { type: 'tabs', items: Object.keys(core.ROLES).map(key => ({ text: core.ROLES[key].name, route: { menu: 'recruit', id: key + ':' + channel }, active: key === role, locked: !core.roleOpen(state, key) })) },
    { type: 'tabs', items: Object.keys(core.CHANNELS).map(key => ({ text: core.CHANNELS[key].name, route: { menu: 'recruit', id: role + ':' + key }, active: key === channel, locked: !core.channelOpen(state, key) })) },
    { type: 'text', text: core.ROLES[role].task + '。' + core.CHANNELS[channel].text, muted: true }
  ];
  if ((state.notices.layout || 0) > 0) blocks.push({ type: 'note', icon: 'Users', text: '近期裁员影响了公司的招聘吸引力，招聘费用已上浮。' });
  if (!core.roleOpen(state, role)) return { title: '招聘' + core.ROLES[role].name, blocks: [...blocks, { type: 'note', icon: 'Lock', text: core.ROLES[role].name + '岗位首作发售后开放。' }] };
  if (!core.channelOpen(state, channel)) return { title: '招聘' + core.ROLES[role].name, blocks: [...blocks, { type: 'note', icon: 'Lock', text: core.CHANNELS[channel].name + core.CHANNELS[channel].lock + '。' }] };
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
    case 'rankings': return rankingsMenu(state);
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
    case 'event': return state.event ? { title: state.event.title, blocks: [{ type: 'text', text: state.event.text }, { type: 'choices', items: state.event.choices.map((choice: any) => ({ ...choice, action: 'decision' })) }] } : { title: '没有待决事项', blocks: [{ type: 'text', text: '继续经营即可。' }] };
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
  const forecast = core.projectForecast(state, { type: draft.type, scale: draft.scale, work: Object.fromEntries(core.DIM_KEYS.map(key => [key, { total: workload * type.share[key], done: 0, value: 0 }])), defects: [], progress: 0 });
  const time = forecast && forecast.days === null ? '还没有能推进的人，招聘后才能开始。' : forecast ? '当前团队约 ' + forecast.days + ' 天完成。' : '';
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
  const metrics = core.projectMetrics(project);
  const forecast = core.projectForecast(state, project);
  const open = core.projectOpen(state);
  const idle = (forecast.idle || []).map((key: string) => core.DIMENSIONS.find(dimension => dimension.key === key)?.name);
  // A finished title has no remaining work, so its date is not "nobody can push it" but "done".
  const finished = forecast.rows.every((row: any) => row.remaining <= 0.0001);
  const idleRows = forecast.rows.filter((row: any) => row.remaining > 0.0001 && row.days === null);
  const etaText = finished ? '已完成' : idleRows.length ? '还有无人负责的评分项' : '第 ' + forecast.eta + ' 天（约 ' + forecast.days + ' 天）';
  const blocks: any[] = [
    { type: 'lines', items: [['《' + project.name + '》', core.TYPES[project.type].name + ' · ' + core.SCALES[project.scale].name], ['阶段', stage(project)], ['完成度', metrics.progress.toFixed(0) + '%']] },
    ...(open.length > 1 ? [{ type: 'tabs', items: open.map((item: any) => ({ text: item.name, route: { menu: 'project', id: item.id }, active: item.id === project.id })) }] : []),
    { type: 'radar', metrics, genre: project.type, projectId: project.id },
    { type: 'section', title: '六项评分（点开可看详情并分工）' },
    { type: 'dimensions', items: forecast.rows, bottleneck: forecast.bottleneck ? forecast.bottleneck.key : null, projectId: project.id },
    { type: 'lines', items: [['预计完成', etaText], ['已知缺陷', metrics.known + ' / ' + metrics.defects], ['关注', number(project.followers) + ' 人']] },
    ...(idle.length ? [{ type: 'note', icon: 'Users', text: idle.join('、') + '还没有人做。在「调整分工」里把人分过去，否则作品永远做不完。' }] : []),
    ...(open.length > 1 ? [{ type: 'segments', title: '项目优先级（同时进行的项目会分摊效率）', items: [0, 1, 2].map(rank => ({ text: '第 ' + (rank + 1) + ' 优先', action: 'priority', data: { id: project.id, priority: rank }, active: project.priority === rank, anchor: 'priority-' + rank })) }] : []),
    { type: 'note', icon: 'Users', text: core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type) },
    ...(project.progress >= 55 && project.deadline === null ? [{ type: 'segments', title: '公布发售日（换关注，延期会损失关注）', items: [14, 30, 60].map(days => ({ text: days + ' 天', action: 'deadline', data: { id: project.id, days }, active: false, anchor: 'deadline-' + days })) }] : []),
    ...(project.deadline !== null ? [{ type: 'text', text: '已公布：第 ' + project.deadline + ' 天发售。到期未发会损失关注。', muted: true }] : []),
    { type: 'buttons', items: [
      { text: '调整分工', action: 'menu', data: { menu: 'assign', id: project.id }, anchor: 'assign' },
      { text: '招募试玩', action: 'menu', data: { menu: 'testing', id: project.id } },
      { text: '市场与推广', action: 'menu', data: { menu: 'market', id: project.id } },
      { text: project.progress >= 100 ? '正式发售' : project.progress >= 55 ? (metrics.unfinished.length ? '带着未完成的评分项发售' : '正式发售') : '体验版完成后才能发售', action: 'launch', data: { id: project.id }, disabled: metrics.progress < 55, anchor: 'launch' },
      ...(open.length < 4 ? [{ text: '再开一个项目', action: 'menu', data: { menu: 'new-project' } }] : [])
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
  const metrics = core.projectMetrics(project);
  const forecast = core.projectForecast(state, project);
  const row = forecast.rows.find((entry: any) => entry.key === dimKey);
  // The works whose dimension maps to this one (stability is fed by discover + repair).
  const works = core.WORKS.filter(work => work.dimension === dimKey);
  const workKeys = works.map(work => work.key);
  const assignedPeople = state.staff.filter((person: any) => core.personWorks(state, project, person).some((key: string) => workKeys.includes(key)));
  const weight = core.TYPES[project.type].weights[dimKey];
  const score = metrics.dimensions[dimKey] || 0;
  const blocks: any[] = [
    { type: 'lines', items: [['当前评分', score.toFixed(0) + ' 分'], ['剩余工作量', row ? (row.remaining > 0 ? row.remaining.toFixed(0) + ' 人日' : '已完成') : '—'], ['预计完成', row ? (row.days === null ? (row.remaining > 0 ? '无人负责' : '已完成') : '约 ' + row.days + ' 天') : '—']] },
    { type: 'text', text: dimension.desc + (weight >= 0.3 ? ' ' + core.TYPES[project.type].audience + '玩家很看重这一项。' : ' 这类玩家相对不挑剔这一项。'), muted: true },
    { type: 'section', title: assignedPeople.length ? '负责这一项的人（点工作块直接调整）' : '还没有人做，点工作块安排人手' },
    ...state.staff.map((person: any, index: number) => {
      const assigned = core.personWorks(state, project, person);
      const elsewhere = state.projects.find((item: any) => item.id !== projectId && !item.released && (item.assignments?.[person.id] || []).length);
      const doing = assigned.filter((key: string) => workKeys.includes(key));
      return {
        type: 'person-assign', title: person.name + ' · ' + core.ROLES[person.role].name,
        detail: doing.length ? '正在做：' + doing.map(k => core.WORKS.find(w => w.key === k)?.name).join('、') : elsewhere ? '目前在其他项目，点这里的工作即可调过来' : '尚未负责这一项',
        personId: person.id, projectId, index, assigned,
        status: elsewhere ? '在《' + elsewhere.name + '》' : '',
        stress: person.stressTags.map((key: string) => core.STRESS_TAGS[key].name),
        fame: !!person.fame && state.day - (person.joined || 0) < 30,
        works: works.map(work => ({ key: work.key, name: work.name, ability: person.abilities[work.ability], on: assigned.includes(work.key) }))
      };
    }),
    { type: 'buttons', items: [{ text: '查看整部作品的分工', action: 'menu', data: { menu: 'assign', id: projectId }, anchor: 'to-assign' }] },
    { type: 'text', text: '评分 = 完成部分的质量 × 进度。完成度越高、负责的人能力越强，这一项分数越高。', muted: true }
  ];
  return { title: dimension.name, blocks };
}

function assignMenu(state: any, projectId: string) {
  const project = core.activeProject(state, projectId);
  if (!project) return { title: '分工', blocks: [{ type: 'text', text: '项目不存在。' }] };
  if (!state.staff.length) return { title: '分工', blocks: [{ type: 'text', text: '还没有同事，先去招聘。' }] };
  const blocks: any[] = [
    { type: 'text', text: '点工作块即可分工：绿色是在做，灰色是没做。每人至少保留一项工作；可以同时做多项，做完会自动空出手。', muted: false }
  ];
  state.staff.forEach((person: any, index: number) => {
    const assigned: string[] = core.personWorks(state, project, person);
    const elsewhere = state.projects.find((item: any) => item.id !== projectId && !item.released && (item.assignments?.[person.id] || []).length);
    const automatic = !elsewhere && !(project.assignments?.[person.id] || []).length;
    blocks.push({
      type: 'person-assign',
      title: person.name + ' · ' + core.ROLES[person.role].name,
      detail: elsewhere ? '目前在其他项目，点任意工作即可调过来' : automatic ? '默认做本行：' + assigned.map(k => core.WORKS.find(w => w.key === k)?.name).join('、') : '已安排：' + assigned.map(k => core.WORKS.find(w => w.key === k)?.name).join('、'),
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
  const blocks: any[] = [];
  if (project.test) {
    blocks.push({ type: 'result', label: '最近一次试玩评分', value: project.test.score.toFixed(1), note: project.test.count + ' 人 · 第 ' + project.test.day + ' 天 · 发现 ' + project.test.found + ' 项缺陷' });
    blocks.push({ type: 'note', icon: 'Target', text: core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type) });
    blocks.push({ type: 'feedback', items: project.test.findings });
    blocks.push({ type: 'text', text: '评分对应试玩时的版本。改进后再试玩，才能看到玩家是否认可。', muted: true });
  } else {
    blocks.push({ type: 'text', text: '缺陷藏在作品里，只有让玩家试玩才能发现；试玩还会告诉你这类玩家最在意哪一项。' });
  }
  if ((project.testLog || []).length > 1) {
    blocks.push({ type: 'section', title: '试玩历史' });
    blocks.push({ type: 'lines', items: [...(project.testLog || [])].reverse().map((entry: any) => ['第 ' + entry.day + ' 天 · ' + entry.count + ' 人', entry.score.toFixed(1) + ' 分']) });
  }
  blocks.push({ type: 'buttons', anchor: 'tests', items: [
    { text: '招募 30 人 · 0.80 万（发现约六成缺陷）', action: 'test', data: { id: project.id, count: 30 }, disabled: !offer.available || state.cash < 0.8, anchor: 'test-30' },
    { text: '招募 100 人 · 2.00 万（发现约九成缺陷）', action: 'test', data: { id: project.id, count: 100 }, disabled: !offer.available || state.cash < 2 }
  ] });
  if (!offer.available) blocks.push({ type: 'text', text: offer.reason || '先处理当前决策。', muted: true });
  return { title: '试玩', blocks };
}

function marketMenu(state: any, id?: string) {
  // Follow the project the player is actually looking at, not whichever one sorts first.
  const project = core.activeProject(state, id) || core.projectOpen(state)[0];
  const blocks: any[] = [];
  const expo = core.exhibitionOffer(state);
  blocks.push({ type: 'lines', items: [['下届日光游戏展', '第 ' + expo.day + ' 天'], ['体验版报名截止', '第 ' + expo.deadline + ' 天（剩余 ' + (expo.deadline - state.day) + ' 天）'], ['年度评奖', '第 ' + Math.ceil(state.day / 360) * 360 + ' 天']] });
  const currentNotReady = !!project && project.progress < 55;
  blocks.push({ type: 'buttons', items: [{ text: expo.entry ? '展会已报名' : '体验版报名展会 · 1.00 万', action: 'exhibition', data: { id: project?.id }, disabled: !expo.available || currentNotReady }, { text: '展会与媒体', action: 'menu', data: { menu: 'exhibitions' } }, { text: '销量榜与年度评选', action: 'menu', data: { menu: 'rankings' } }] });
  if (currentNotReady) blocks.push({ type: 'text', text: '当前项目完成体验版 后才能报名展会。', muted: true });
  else if (!expo.available) blocks.push({ type: 'text', text: expo.reason, muted: true });
  if (state.operation) blocks.push({ type: 'note', icon: 'Wrench', text: '更新制作中：剩余 ' + state.operation.remaining.toFixed(1) + ' 工作量。' });
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
  const dims = book.metrics.dimensions;
  return {
    title: '《' + book.name + '》',
    blocks: [
      { type: 'cover', book },
      { type: 'stats', items: [['累计回款', money(book.received)], ['项目投入', money(book.invested)], [balance >= 0 ? '已盈利' : '尚差回本', money(Math.abs(balance))]], tone: balance >= 0 ? 'up' : 'down' },
      ...(book.review.reasons.length ? [{ type: 'section', title: book.tutorial ? '首作复盘：下一作怎么改' : '复盘' }, { type: 'reasons', items: book.review.reasons }] : []),
      { type: 'chart', book },
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
      { type: 'lines', items: [['发售首周', state.day - book.released < 7 ? '新品上榜中' : '已结束'], ['当前 / 最高排名', (book.rank || '未上榜') + ' / ' + (book.bestRank || '未上榜')], ['排名变化', rankChange(book)], ['系列期待', book.expectation + ' 分评价压力'], ['主要更新', book.updates + ' 次']] },
      { type: 'section', title: '作品运营' },
      { type: 'buttons', items: [
        { text: '派人做补丁 / 返工', action: 'menu', data: { menu: 'assign', id }, anchor: 'assign-book' },
        { text: book.sale ? '关闭促销' : '开启促销', action: 'sale', data: { id, enabled: !book.sale }, disabled: state.day - book.released > 540, anchor: 'sale-toggle' },
        { text: '制作更新 · ' + money(2 + book.scale), action: 'operate', data: { id, kind: 'update' }, disabled: !!state.operation || book.updates >= 3 || state.cash < 2 + book.scale || !state.staff.length || state.day - book.released > 540 },
        { text: '追加资料片（DLC）· ' + money(4 + book.scale * 2), action: 'dlc', data: { id }, disabled: (book.dlcs || 0) >= 2 || state.cash < 4 + book.scale * 2 || state.day - book.released > 540 },
        { text: book.reviewScore >= 70 ? '开发续作' : '好评达到 70 分可开发续作', action: 'sequel', data: { id }, disabled: book.reviewScore < 70 }
      ] },
      ...(book.sale ? [
        { type: 'segments', title: '可接受的最低折扣', items: core.DISCOUNTS.map((value, index) => ({ text: Math.round(value * 100) + ' 折', action: 'sale', data: { id, enabled: true, floor: value }, active: book.saleFloor === index, anchor: 'sale-floor-' + index })) },
        { type: 'text', text: '开启后由系统决定什么时候打折、打多深：余量多、口碑好的作品折扣浅，便宜的尾货打得深。担心促销期比原价期赚得少，就关掉它，或在档案的按周回款里对照。' }
      ] : [{ type: 'text', text: '开启促销后，系统会在作品余量还够时自动打折；卖得越深，单份回款越低，但销量更多。' }]),
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
      { type: 'lines', items: [['当前阶段', phase.name + ' · ' + phase.scarce], ['公司名望', String(core.reputationOf(state))]] },
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
    { type: 'lines', items: [['公司名望', String(archive.reputation)], ['年度获奖', archive.wins + ' 次'], ['已发售作品', archive.books.length + ' 部']] },
    { type: 'text', text: '名望由作品的奖项与口碑累积而来，不单独计分；它决定能进多大的展会、能不能挖到行业名人。', muted: true }
  ];
  if (!archive.books.length) blocks.push({ type: 'text', text: '还没有作品。第一作发售后，这里会记下它的成绩与参与的人。' });
  for (const book of archive.books) {
    blocks.push({ type: 'section', title: '《' + book.name + '》' });
    blocks.push({ type: 'lines', items: [
      ['类型体量', core.TYPES[book.type].name + ' · ' + core.SCALES[book.scale].name],
      ['发售', '第 ' + book.released + ' 天'],
      ['口碑', book.review.toFixed(1) + ' 分'],
      ['销量 / 回款', number(book.units) + ' 份 · ' + money(book.received)],
      ['最好名次', book.bestRank ? '第 ' + book.bestRank + ' 名' : '未上榜'],
      ...(book.breakout ? [['备注', '创意出圈']] : [])
    ] });
    if (book.contributions.length) blocks.push({ type: 'lines', title: '参与的人', items: book.contributions.map((item: any) => [item.name, core.ROLES[item.role].name + ' · 贡献约 ' + Math.round(item.share * 100) + '%']) });
  }
  return { title: '公司档案', blocks };
}

function teamMenu(state: any) {
  const channel = bestChannel(state);
  const stressed = state.staff.filter((person: any) => person.stressTags.length);
  const sample = stressed[0] || state.staff[0];
  const chance = sample ? Math.round(core.outingChance(state, sample, 2) * 100) : 0;
  const pity = sample ? core.outingPity(state, sample) : 0;
  return {
    title: '团队',
    blocks: [
      { type: 'lines', items: [['工位', state.staff.length + ' / ' + core.seats(state) + '（' + core.OFFICES[state.office].name + '）'], ['月开支（含房租）', money(core.monthlyCost(state))]] },
      { type: 'buttons', items: Object.keys(core.ROLES).map(role => ({ text: '招聘' + core.ROLES[role].name + (core.roleOpen(state, role) ? '' : '（未开放）'), action: 'menu', data: { menu: 'recruit', id: role + ':' + channel }, disabled: !core.roleOpen(state, role), anchor: 'recruit-' + role })) },
      { type: 'text', text: '加班按人设置：产出更高，但缺陷更多，也会累积「疲惫」「想走」这类负面标签。没有数值仪表，标签会常驻在员工卡上。', muted: true },
      { type: 'segments', title: '团建时长（占工作日，工资照付）', items: [1, 2, 3].map(value => ({ text: value + ' 天', action: 'outing', data: { days: value, value }, active: false, anchor: 'outing-' + value })) },
      ...(state.staff.length ? [{ type: 'lines', items: [['当前清除标签概率', chance + '%'], ['保底', `${pity} / ${core.OUTING_PITY} 次必出`], ['频率影响', '连着做会越来越难见效，隔一段时间会回升']] }] : []),
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
  return {
    title: person.name,
    blocks: [
      { type: 'lines', items: [['岗位', core.ROLES[person.role].name], ['月薪', money(person.wage)], ['工作速度', String(person.speed)]] },
      ...(person.fame ? [{ type: 'note', icon: 'Star', text: '行业名人：自带粉丝，新作首发关注更高；入职前 30 天需要磨合，产出打八折。要价也高。' + (core.conditionText(person) ? ' 附带条件：' + core.conditionText(person) : '') }] : []),
      { type: 'lines', title: '六项能力', items: core.ABILITIES.map(ability => [ability.name, String(person.abilities[ability.key])]) },
      ...(person.tags.length ? [{ type: 'lines', title: '标签（只作摘要，不加数值）', items: person.tags.map((tag: any) => [core.ABILITY_TAGS[tag.key]?.name || core.PERSONALITY_TAGS[tag.key]?.name, core.ABILITY_TAGS[tag.key]?.text || core.PERSONALITY_TAGS[tag.key]?.text]) }] : []),
      { type: 'buttons', anchor: 'hire', items: [{ text: person.hired ? '已录用' : '录用 · 月薪 ' + money(person.wage), action: 'hire', data: { id: person.id }, disabled: person.hired || state.staff.length >= core.seats(state) }] }
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
  return {
    title: '工具',
    blocks: [
      { type: 'text', text: '工具属于公司，以后的作品都能用；只加速对应那类工作，不提高质量。', muted: true },
      ...Object.keys(core.STUDIO_TOOLS).map(key => {
        const tool = core.STUDIO_TOOLS[key];
        return { type: 'card', title: tool.name, text: tool.text, button: { text: state.tools.includes(key) ? '已购置' : '购置 · ' + money(tool.cost), action: 'buy-tool', data: { key }, disabled: state.tools.includes(key) || state.cash < tool.cost, anchor: 'tool-' + key } };
      })
    ]
  };
}

function financeMenu(state: any) {
  const ledger = state.ledger;
  return {
    title: '公司',
    blocks: [
      { type: 'lines', items: [['现金', money(state.cash)], ['本月收入', money(ledger.income)], ['本月已开支', money(monthSpent(state))], ['已累计应付', money(state.accrued)], ['月开支（工资 + 房租）', money(core.monthlyCost(state))]] },
      { type: 'buttons', items: [
        { text: '成长目标与扩建', action: 'menu', data: { menu: 'goals' } },
        { text: '公司档案 · 名望 ' + core.reputationOf(state), action: 'menu', data: { menu: 'archive' } },
        { text: '经营记录', action: 'menu', data: { menu: 'history' } },
        { text: '导出存档', action: 'export' },
        { text: '导入存档', action: 'import' },
        { text: '重新创业', action: 'menu', data: { menu: 'restart' } }
      ] },
      { type: 'toggle', text: '音效', value: state.sound, action: 'sound' }
    ]
  };
}

function historyMenu(state: any) {
  return { title: '经营记录', blocks: [] };
}

function rankChange(book: any) {
  if (!book.rank) return '未上榜';
  if (!book.previousRank) return '新上榜';
  const change = book.previousRank - book.rank;
  return change > 0 ? '上升 ' + change + ' 名' : change < 0 ? '下降 ' + Math.abs(change) + ' 名' : '持平';
}

function exhibitionsMenu(state: any) {
  const blocks: any[] = [{ type: 'text', text: '每年第 90、270 天举办展会，提前七天截止报名。完成体验版才能报名，作品体验决定与虚构工作室的比较结果。', muted: true }];
  for (const entry of [...state.exhibitions].reverse()) {
    blocks.push({ type: 'section', title: '第 ' + entry.day + ' 天 · 《' + entry.name + '》' });
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

function rankingsMenu(state: any) {
  const blocks: any[] = [{ type: 'text', text: '按日销量比较，每周更新；首发销量按七日折算，首周标记为新品。竞争作品为虚构。年度评选在每年第 360 天举行。', muted: true }];
  const newcomers = state.catalog.filter((book: any) => state.day - book.released < 7);
  if (newcomers.length) blocks.push({ type: 'section', title: '首周新品' }, { type: 'lines', items: newcomers.map((book: any) => ['《' + book.name + '》', '第 ' + (book.rank || '—') + ' 名 · ' + rankChange(book)]) });
  blocks.push({ type: 'section', title: '本期销量榜 · ' + state.rankings.length + ' 部作品' });
  if (state.rankings.length) blocks.push({ type: 'lines', items: state.rankings.map((entry: any) => [entry.rank + '. ' + entry.name, number(entry.units) + ' 份/日' + (entry.studio ? '' : ' · 本社')]) });
  else blocks.push({ type: 'text', text: '第一周结束后公布。' });
  for (const award of [...state.awards].reverse().slice(0, 9)) {
    blocks.push({ type: 'section', title: '第 ' + award.year + ' 年 · ' + award.category });
    blocks.push({ type: 'note', icon: 'Trophy', text: award.winner + (award.own ? ' · 本社获奖，粉丝增加' : ' 获奖') });
    blocks.push({ type: 'lines', items: award.ranking.slice(0, 5).map((entry: any, index: number) => [(index + 1) + '. ' + entry.name, entry.score.toFixed(1)]) });
  }
  return { title: '榜单与年度评选', blocks };
}

// Tutorial step for the current screen. `ack` explains an area and waits for "知道了"; `tap` introduces a
// control and counts as seen once the player presses it; neither means "press the highlighted control".
export type GuideStep = { anchor: string; text: string; ack?: string; tap?: string };

export function guide(state: any, route: any, playing: boolean): GuideStep | null {
  if (!guideOn(state)) return null;
  const seen = state.tutorial.seen;
  const project = core.projectOpen(state)[0];
  const hasWorker = state.staff.length > 0;
  const complete = !!project && project.progress >= 100;
  const explain = (key: string, anchor: string, text: string): GuideStep | null => seen[key] ? null : { anchor, text, ack: key };
  const introduce = (key: string, anchor: string, text: string): GuideStep | null => seen[key] ? null : { anchor, text, tap: key };
  if (!route) {
    if (state.event) return { anchor: 'next', text: '有一个决定在等你，点这里查看。' };
    const steps: Array<() => GuideStep | null> = [
      () => introduce('goal', 'goal', '欢迎！你是工作室的创始人。点这里看看公司目标：完成后会解锁新能力。'),
      () => hasWorker ? null : { anchor: 'nav-team', text: '「团队」负责招聘和管理同事。点这里，招一位程序员把游戏做出来。' },
      () => explain('money', 'finance', '资金是你的全部家当。月开支 = 工资 + 房租，按天累计、月底统一从资金扣除；资金 ÷ 月开支 ≈ 还能撑几个月。'),
      () => project || state.catalog.length ? null : { anchor: 'nav-project', text: '「项目」负责立项、查看进度和发售。点这里，为第一款游戏立项。' },
      () => project ? explain('track', 'track', '六个评分项各有自己的进度，最慢的一项就是瓶颈。完成度 55% 可以试玩，100% 可以发售。') : null,
      () => project && !playing && !seen.clock ? { anchor: 'clock', text: '点这里开始时间，团队每天推进开发。右边可以切换速度。' } : null,
      () => state.reports.length ? introduce('navFinance', 'nav-finance', '第一个月结算了：工资和房租已从资金扣除。点「公司」看看上个月的账单，目标和存档也在这里。') : null,
      () => project && !seen.assign ? { anchor: 'nav-project', text: '作品需要有人去做：点「项目」，找到「调整分工」，把同事分到各项工作上。' } : null,
      () => project && (state.staff.length >= 2 || (project.progress > 0 && project.progress < 25 && state.day > 30)) ? introduce('tools', 'nav-tools', '「工具」能加速对应工作：开局就能买，属于公司、以后的作品都能用，但只提速不提高质量。') : null,
      () => project?.test ? explain('defects', 'stat-defects', '已知缺陷：试玩发现的缺陷数。只有发现之后才能修复，发售后玩家也会陆续报告。') : null,
      () => complete && !seen.checklist ? { anchor: 'nav-project', text: '各评分项都做满了。点「项目」，可以正式发售，也可以继续返工提高评分。', tap: 'checklist' } : null,
      () => !project && state.catalog.length === 1 ? { anchor: 'nav-market', text: '点「市场」打开首作，看看复盘：哪里亏了，下一作怎么改。' } : null
    ];
    for (const step of steps) { const result = step(); if (result) return result; }
    return null;
  }
  switch (route.menu) {
    case 'team': return hasWorker ? null : { anchor: 'recruit-code', text: '点「招聘程序」。' };
    case 'recruit': return state.candidates[route.id] ? (hasWorker ? null : { anchor: 'candidates', text: '六项能力决定作品各项能做多好，速度决定开发进度，月薪越高开支越大。' }) : { anchor: 'recruit', text: '发布招聘要花一点钱，熟人会推荐几位候选人。' };
    case 'candidate': return hasWorker ? null : { anchor: 'hire', text: '工资按在职天数累计，月底结算。满意就录用。' };
    case 'project': return project && !seen.assign && state.staff.length ? { anchor: 'assign', text: '点「调整分工」，把同事分到各项工作上；没有人做的工作会一直停在原地。' } : null;
    case 'market':
      if (project && !project.promoted) return { anchor: 'promotions', text: '推广把钱换成关注：越多越贵，每多花一万元关注增长会变慢。首作预算有限，可以先投一小笔。' };
      return !project && state.catalog.length === 1 ? { anchor: 'book-0', text: '打开首作，看看复盘。' } : null;
    case 'assign': return seen.assign ? null : { anchor: 'person-assign-0', text: '给每人挑工作，可以多选。做别的岗位的工作照样推进工期，只是评分更低、缺陷更多。', ack: 'assign' };
    default: return null;
  }
}
