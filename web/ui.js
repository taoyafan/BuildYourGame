/* 日光工作室 · HTML 版界面：把 core/Content 的菜单数据渲染成 DOM，特效从简，玩法完整。 */
(function () {
  const core = Logic.core;
  const content = Logic.content;
  const KEY = 'sunlight-studio-v2';
  const SPEED_MS = { 1: 900, 4: 230, 12: 80 };

  let state = null;
  let playing = false;
  let speed = 1;
  let ticker = null;
  let route = null;          // 当前菜单路由，null 表示主界面
  let stack = [];            // 菜单层级，返回键靠它回上一页
  let watching = null;       // 主界面正在看的项目（多个项目并行时）
  let toastTimer = null;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (text) => String(text == null ? '' : text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (v) => content.money(v);
  const num = (v) => content.number(v);

  /* ---------- 存档 ---------- */
  function freshState() {
    let s = core.createStudio(Date.now());
    return s;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return core.restoreStudio(JSON.parse(raw));
    } catch (error) {
      console.warn('存档读取失败', error);
    }
    return freshState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (error) { console.warn('存档写入失败', error); }
  }
  function apply(next) {
    state = next;
    save();
    if (state.event) stopClock();
    render();
  }
  function run(fn, ...args) {
    try {
      const next = fn(...args);
      if (next) apply(next);
      return next;
    } catch (error) {
      toast(error.message || String(error));
      return null;
    }
  }

  function toast(text) {
    let node = $('#toast');
    node.textContent = text;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
  }

  /* ---------- 时钟 ---------- */
  function stopClock() { playing = false; clearInterval(ticker); ticker = null; }
  function startClock() {
    if (state.over || state.event) return;
    playing = true;
    clearInterval(ticker);
    ticker = setInterval(() => {
      if (!playing) return;
      if (state.event || state.over) { stopClock(); render(); return; }
      const next = run(core.stepDay, state);
      if (!next) stopClock();
    }, SPEED_MS[speed]);
    render();
  }
  function toggleClock() { if (playing) { stopClock(); render(); } else startClock(); }

  /* ---------- 渲染 ---------- */
  function render() {
    if (!state.company) { renderSetup(); return; }
    $('#app').innerHTML = mainHtml() + (state.event ? eventHtml() : '');
    bindCommon();
    renderMenuPanel();
  }

  function renderSetup() {
    $('#app').innerHTML = `
      <section class="panel narrow">
        <h1>成立你的工作室</h1>
        <p class="muted">你负责产品方向、预算与用人。首作是练习，小亏也没关系。</p>
        <label class="field">公司名称<input id="company-name" maxlength="24" placeholder="例如：日光工作室" value=""></label>
        <div class="field">创始人出身
          <div class="roles" id="founder-roles">
            ${['code', 'design', 'art'].map((key, index) => `<button class="pill ${index === 0 ? 'on' : ''}" data-founder="${key}">${core.ROLES[key].name}</button>`).join('')}
          </div>
          <small class="muted">出身决定六项能力的初始分布，其余能力偏低；一个人也能做完首作。</small>
        </div>
        <button class="primary" id="create-company">成立公司</button>
      </section>`;
    let founder = 'code';
    $('#founder-roles').onclick = (event) => {
      const button = event.target.closest('[data-founder]');
      if (!button) return;
      founder = button.dataset.founder;
      [...$('#founder-roles').children].forEach((node) => node.classList.toggle('on', node === button));
    };
    $('#create-company').onclick = () => {
      const name = $('#company-name').value;
      run(core.nameCompany, state, name, founder);
    };
  }

  function mainHtml() {
    const open = core.projectOpen(state);
    const project = open.find((item) => item.id === watching) || open[0];
    if (project) watching = project.id;
    const metrics = project ? core.projectMetrics(project) : null;
    const forecast = project ? core.projectForecast(state, project) : null;
    const hint = content.advice(state);
    const guide = content.guide(state, route, playing);
    const month = Math.floor((state.day - 1) / 30) + 1;
    const dayOfMonth = (state.day - 1) % 30 + 1;
    const staffRows = state.staff.map((person) => {
      const tags = person.stressTags.map((key) => `<span class="tag bad">${core.STRESS_TAGS[key].name}</span>`).join('');
      const overtime = state.overtime[person.id] ? '<span class="tag on">加班</span>' : '';
      const leaving = person.leaveUntil > state.day ? '<span class="tag">休假</span>' : '';
      const fame = person.fame ? '<span class="tag gold">名人</span>' : '';
      return `<button class="row" data-open="person:${person.id}">
        <span class="grow"><b>${esc(person.name)}</b><small>${core.ROLES[person.role].name} · ${money(person.wage)}/月</small></span>
        <span class="tags">${fame}${overtime}${leaving}${tags}</span></button>`;
    }).join('');
    const strip = open.length > 1 ? `<div class="tabs">${open.map((item) => `<button class="pill ${item.id === project.id ? 'on' : ''}" data-watch="${item.id}">${esc(item.name)} · ${Math.round(item.progress)}%</button>`).join('')}</div>` : '';

    return `
      <header class="top">
        <div>
          <h1>${esc(state.company)}</h1>
          <small class="muted">第 ${month} 月 ${dayOfMonth} 日 · ${core.companyPhase(state).name}（${core.companyPhase(state).scarce}）</small>
        </div>
        <div class="controls">
          <button class="primary" id="clock-toggle">${playing ? '暂停' : '开始'}</button>
          <div class="speed">${[1, 4, 12].map((value) => `<button class="pill ${speed === value ? 'on' : ''}" data-speed="${value}">${value}×</button>`).join('')}</div>
        </div>
      </header>

      <section class="finance">
        ${[['资金', money(state.cash), 'cash'], ['月开支', money(core.monthlyCost(state)), ''], ['本月收入', money(state.ledger.income), 'up'], ['本月已开支', money(content.monthSpent(state)), '']].map(([label, value, tone]) => `<div><small>${label}</small><b class="${tone}">${value}</b></div>`).join('')}
      </section>

      ${goalCard()}
      ${strip}

      ${state.event ? '' : `<section class="advice" id="advice"><b>${esc(hint.title)}</b><p>${esc(hint.text)}</p></section>`}
      ${guide && !state.event ? `<section class="guide"><span>${esc(guide.text)}</span><span class="guide-actions">${guide.ack ? '<button class="link" data-ack="' + guide.ack + '">知道了</button>' : ''}<button class="link" data-skip-guide>跳过教程</button></span></section>` : ''}

      <main class="grid">
        <section class="panel">
          ${project ? projectCard(project, metrics, forecast) : `<h2>还没有在研作品</h2><p class="muted">${state.catalog.length ? '看看上一作的复盘，再开始下一款。' : '首作是练习，建议从“操作型 · 小型”开始。'}</p><button class="primary" data-open="new-project">新作立项</button>`}
        </section>
        <section class="panel">
          <h2>团队 <small class="muted">${state.staff.length}/${core.seats(state)} 工位 · ${core.OFFICES[state.office].name}</small></h2>
          <div class="list">${staffRows || '<p class="muted">还没有同事。</p>'}</div>
          <div class="row-actions">
            <button data-open="team">团队与招聘</button>
            <button data-open="team:outing">团建</button>
          </div>
        </section>
      </main>

      <nav class="nav">
        ${[['project', '项目'], ['team', '团队'], ['tools', '工具'], [project ? 'testing:' + project.id : 'testing', '试玩'], ['market', '市场'], ['finance', '公司']].map(([target, text]) => `<button data-open="${target}">${text}</button>`).join('')}
      </nav>
      <div id="toast" class="toast"></div>`;
  }

  function goalCard() {
    const goals = core.goalsOf(state);
    const index = goals.steps.findIndex((step) => step.key === goals.current.key);
    const label = index < 0 ? '挑战' : `目标 ${index + 1}/${goals.steps.length}`;
    const dots = goals.steps.map((step) => `<i class="${step.done ? 'done' : step.key === goals.current.key ? 'current' : ''}"></i>`).join('');
    return `<button class="goal" data-open="goals">
      <span><b>${label} · ${esc(goals.current.title)}</b><small>奖励：${esc(goals.current.reward)}</small></span>
      <span class="goal-dots">${dots}</span></button>`;
  }

  function projectCard(project, metrics, forecast) {
    const rows = forecast ? forecast.rows : [];
    const bars = rows.map((row) => {
      const dimension = core.DIMENSIONS.find((item) => item.key === row.key);
      const score = metrics.dimensions[row.key] || 0;
      const bottleneck = forecast.bottleneck && forecast.bottleneck.key === row.key;
      const idle = row.remaining > 0 && row.days === null;
      return `<button class="dim ${bottleneck ? 'bottleneck' : ''} ${idle ? 'idle' : ''}" data-open="dimension:${project.id}:${row.key}">
        <span class="dim-name">${dimension.name}${bottleneck ? ' · 瓶颈' : ''}${idle ? ' · 无人' : ''}</span>
        <span class="dim-score">${Math.round(score)}</span>
        <span class="bar"><i style="width:${Math.max(0, Math.min(100, score))}%"></i></span>
        <small class="muted">剩 ${Math.round(row.remaining)} 人日${row.days === null ? '' : ' · 约 ' + row.days + ' 天'}</small>
      </button>`;
    }).join('');
    const bottleneck = forecast.bottleneck ? core.DIMENSIONS.find((item) => item.key === forecast.bottleneck.key).name : '—';
    const stats = [
      ['综合评分', metrics.overall.toFixed(0)],
      ['瓶颈', bottleneck],
      ['已知缺陷', project.tests ? metrics.known + ' 项' : '未测试'],
      ['关注', num(project.followers)]
    ].map(([label, value]) => `<div><small>${label}</small><b>${value}</b></div>`).join('');
    const insight = `${core.TYPES[project.type].audience}最看重：${core.audienceFocus(project.type)}${project.test ? ' · 试玩 ' + project.test.score.toFixed(1) + ' 分' : ''}`;
    return `
      <h2>《${esc(project.name)}》<small class="muted">${core.TYPES[project.type].name} · ${core.SCALES[project.scale].name} · ${metrics.progress.toFixed(0)}%</small></h2>
      ${milestones(project, metrics, forecast)}
      <div class="stats-row">${stats}</div>
      <p class="muted small">${esc(insight)}</p>
      <div class="dims">${bars}</div>
      <div class="row-actions">
        <button data-open="assign:${project.id}">调整分工</button>
        <button data-open="testing:${project.id}">试玩</button>
        <button data-open="market:${project.id}">市场与推广</button>
        <button data-open="project">项目详情</button>
        <button class="primary" data-open="launch:${project.id}" ${metrics.progress < 55 ? 'disabled' : ''}>${metrics.progress >= 55 ? '发售' : '体验版后发售'}</button>
      </div>`;
  }

  // 制作阶段铁轨：立项 / 原型 / 体验版 / 完成 / 发售，与引擎版同一套门槛与文案。
  function milestones(project, metrics, forecast) {
    const phases = [['立项', 0], ['原型', 25], ['体验版', 55], ['完成', 100], ['发售', 101]];
    const phase = metrics.progress < 25 ? 0 : metrics.progress < 55 ? 1 : metrics.progress < 100 ? 2 : 3;
    const start = [0, 25, 55, 100][phase];
    const end = [25, 55, 100, 100][phase];
    const fill = (phase + (end > start ? (metrics.progress - start) / (end - start) : 0)) / 4;
    const estimate = phase === 0 ? Math.round((forecast.days || 0) * 0.5) : forecast.days;
    const note = phase === 3 ? '可以发售' : estimate == null ? '缺人手' : `约 ${estimate} 天`;
    return `<div class="milestones">
      <span class="rail"><i style="width:${Math.max(0, Math.min(100, fill * 100))}%"></i></span>
      <div class="phase-note">${note}${phase < 3 && forecast.days != null ? ` · 全部约 ${forecast.days} 天` : ''}</div>
      <div class="phase-labels">${phases.map(([title, threshold]) => `<span class="${metrics.progress >= threshold ? 'done' : ''}">${title}</span>`).join('')}</div>
    </div>`;
  }

  function eventHtml() {
    const event = state.event;
    return `<div class="modal">
      <section class="panel narrow">
        <h2>${esc(event.title)}</h2>
        <p>${esc(event.text)}</p>
        <div class="choices">${event.choices.map((choice) => `<button class="choice" data-decision="${choice.id}"><b>${esc(choice.title)}</b><small>${esc(choice.detail || '')}</small></button>`).join('')}</div>
      </section></div>`;
  }

  function bindCommon() {
    const clock = $('#clock-toggle');
    if (clock) clock.onclick = toggleClock;
    document.querySelectorAll('[data-speed]').forEach((node) => {
      node.onclick = () => { speed = Number(node.dataset.speed); if (playing) startClock(); else render(); };
    });
    document.querySelectorAll('[data-decision]').forEach((node) => {
      node.onclick = () => run(core.resolveStudioEvent, state, node.dataset.decision);
    });
    document.querySelectorAll('[data-skip-guide]').forEach((node) => {
      node.onclick = () => apply(core.skipTutorial(state));
    });
    document.querySelectorAll('[data-watch]').forEach((node) => {
      node.onclick = () => { watching = node.dataset.watch; render(); };
    });
    document.querySelectorAll('[data-ack]').forEach((node) => {
      node.onclick = () => apply(core.markSeen(state, node.dataset.ack));
    });
  }

  /* ---------- 菜单 ---------- */
  function openRoute(next) {
    if (!next) { stack = []; route = null; renderMenuPanel(); return; }
    if (typeof next === 'string') next = parseRoute(next);
    stack.push(next);
    route = next;
    if (next.menu === 'new-project') { renderNewProject(); return; }
    renderMenuPanel();
  }

  // 返回上一层；已经到第一层就回主界面（与引擎版的返回箭头一致）。
  function back() {
    stack.pop();
    route = stack.length ? stack[stack.length - 1] : null;
    if (!route) { renderMenuPanel(); return; }
    if (route.menu === 'new-project') { renderNewProject(); return; }
    renderMenuPanel();
  }

  function parseRoute(text) {
    const [menu, id, dim] = text.split(':');
    if (menu === 'launch') return { menu: 'launch', id };
    if (menu === 'dimension') return { menu: 'dimension', id, dim };
    if (menu === 'assign') return { menu: 'assign', id };
    if (menu === 'testing') return { menu: 'testing', id };
    if (menu === 'market') return { menu: 'market', id };
    if (menu === 'person') return { menu: 'person', id };
    if (menu === 'book') return { menu: 'book', id };
    if (menu === 'candidate') return { menu: 'candidate', id };
    if (menu === 'recruit') return { menu: 'recruit', id };
    if (menu === 'setup') return { menu: 'setup' };
    return { menu, id };
  }

  function renderMenuPanel() {
    const host = $('#menu');
    if (!route) { host.classList.remove('open'); host.innerHTML = ''; return; }
    let model = null;
    if (route.menu === 'launch') model = launchMenu(route.id);
    else if (route.menu === 'history') model = historyModel();
    else if (route.menu === 'new-project') { renderNewProject(); return; }
    else model = content.menu(state, route);
    host.classList.add('open');
    host.innerHTML = `<section class="panel sheet">
        <header class="sheet-head">
          <span class="head-actions">${stack.length > 1 ? '<button class="link" data-back>返回</button>' : ''}</span>
          <h2>${esc(model.title || '')}</h2>
          <button class="link" data-close>关闭</button>
        </header>
        <div class="sheet-body">${(model.blocks || []).map(blockHtml).join('')}</div>
      </section>`;
    bindSheet();
  }

  function historyModel() {
    const blocks = [];
    const reports = [...state.reports].slice(-6).reverse();
    if (reports.length) blocks.push({ type: 'section', title: '月度账单' }, {
      type: 'lines',
      items: reports.map((report) => [`第 ${report.month} 月`, `收入 ${money(report.income)} · 支出 ${money(report.expense)} · 期末 ${money(report.closing)}`])
    });
    if (state.history.length) blocks.push({ type: 'section', title: '经营记录' }, {
      type: 'lines',
      items: state.history.slice(0, 40).map((entry) => [`第 ${entry.day} 天 · ${entry.title}`, entry.text])
    });
    if (!blocks.length) blocks.push({ type: 'text', text: '还没有记录。', muted: true });
    return { title: '经营记录', blocks };
  }

  function launchMenu(id) {
    const project = state.projects.find((item) => item.id === id);
    const metrics = project ? core.projectMetrics(project) : null;
    const checklist = project ? core.launchChecklist(state, project) : [];
    return {
      title: '确认发售',
      blocks: [
        { type: 'text', text: project ? `《${project.name}》完成度 ${metrics.progress.toFixed(0)}%；带着未完成的维度上市会拉低评分。` : '项目不存在。' },
        { type: 'checklist', items: checklist },
        { type: 'buttons', items: [{ text: '确定发售', action: 'launch', data: { id } }, { text: '取消', action: 'menu', data: { menu: 'project' } }] }
      ]
    };
  }

  function blockHtml(block) {
    switch (block.type) {
      case 'lines': return `${block.title ? `<h3>${esc(block.title)}</h3>` : ''}<dl class="lines">${block.items.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
      case 'text': return `<p class="${block.muted ? 'muted' : ''}">${esc(block.text)}</p>`;
      case 'note': return `<p class="note">${esc(block.text)}</p>`;
      case 'section': return `<h3 class="section">${esc(block.title)}</h3>`;
      case 'tabs': return `<div class="tabs">${block.items.map((item) => `<button class="pill ${item.active ? 'on' : ''}" ${item.locked ? 'disabled' : ''} data-route='${esc(JSON.stringify(item.route))}'>${esc(item.text)}</button>`).join('')}</div>`;
      case 'segments': return `${block.title ? `<h3>${esc(block.title)}</h3>` : ''}<div class="tabs">${block.items.map((item) => `<button class="pill ${item.active ? 'on' : ''}" data-act="${item.action}" data-payload='${esc(JSON.stringify(item.data || {}))}'>${esc(item.text)}</button>`).join('')}</div>`;
      case 'buttons': return `<div class="buttons">${block.items.map((item) => `<button class="${item.primary ? 'primary' : ''}" data-act="${item.action}" data-payload='${esc(JSON.stringify(item.data || {}))}' ${item.disabled ? 'disabled' : ''}>${esc(item.text)}</button>`).join('')}</div>`;
      case 'card': return `<div class="card"><b>${esc(block.title)}</b><p class="muted">${esc(block.text)}</p>${block.button ? `<button data-act="${block.button.action}" data-payload='${esc(JSON.stringify(block.button.data || {}))}' ${block.button.disabled ? 'disabled' : ''}>${esc(block.button.text)}</button>` : ''}</div>`;
      case 'checklist': return `<ul class="checklist">${block.items.map((item) => `<li class="${item.ok ? 'ok' : 'todo'}"><b>${esc(item.label)}</b><span>${esc(item.text)}</span></li>`).join('')}</ul>`;
      case 'dimensions': return `<div class="dims">${block.items.map((row) => {
        const dimension = core.DIMENSIONS.find((item) => item.key === row.key);
        const active = block.bottleneck === row.key;
        return `<button class="dim ${active ? 'bottleneck' : ''}" data-route='${esc(JSON.stringify({ menu: 'dimension', id: block.projectId, dim: row.key }))}'>
          <span class="dim-name">${dimension.name}${active ? ' · 瓶颈' : ''}</span>
          <small class="muted">剩 ${Math.round(row.remaining)} 人日${row.days === null ? ' · 无人负责' : ' · 约 ' + row.days + ' 天'}</small></button>`;
      }).join('')}</div>`;
      case 'radar': return '';
      case 'person-assign': return personAssignHtml(block);
      case 'staff': return `<div class="list">${state.staff.map((person) => `<button class="row" data-route='${esc(JSON.stringify({ menu: 'person', id: person.id }))}'>
        <span class="grow"><b>${esc(person.name)}</b><small>${core.ROLES[person.role].name} · ${money(person.wage)}/月 · 速度 ${person.speed}</small></span>
        <span class="tags">${state.overtime[person.id] ? '<span class="tag on">加班</span>' : ''}${person.stressTags.map((key) => `<span class="tag bad">${core.STRESS_TAGS[key].name}</span>`).join('')}</span></button>`).join('')}</div>`;
      case 'candidates': return `<div class="list">${block.people.map((person) => `<button class="row" data-route='${esc(JSON.stringify({ menu: 'candidate', id: person.id }))}'>
        <span class="grow"><b>${esc(person.name)}${person.fame ? ' · 名人' : ''}</b><small>${core.ROLES[person.role].name} · ${money(person.wage)}/月 · 速度 ${person.speed}</small></span>
        <span class="tags">${person.tags.map((tag) => `<span class="tag">${(core.ABILITY_TAGS[tag.key] || core.PERSONALITY_TAGS[tag.key]).name}</span>`).join('')}</span></button>`).join('')}</div>`;
      case 'catalog': return `<div class="list">${state.catalog.map((book) => `<button class="row" data-route='${esc(JSON.stringify({ menu: 'book', id: book.id }))}'>
        <span class="grow"><b>《${esc(book.name)}》</b><small>${book.reviewScore.toFixed(1)} 分 · ${num(book.units)} 份 · ${money(book.received)}</small></span>
        <span class="tags">${book.breakout ? '<span class="tag gold">出圈</span>' : ''}${book.rank ? `<span class="tag">第${book.rank}</span>` : ''}</span></button>`).join('')}</div>`;
      case 'cover': return `<div class="cover"><b>《${esc(block.book.name)}》</b><small>${core.TYPES[block.book.type].name} · ${core.SCALES[block.book.scale].name} · ${num(block.book.openingUnits)} 份首发</small></div>`;
      case 'stats': return `<div class="stats">${block.items.map(([key, value]) => `<div><small>${esc(key)}</small><b class="${block.tone === 'up' ? 'up' : block.tone === 'down' ? 'down' : ''}">${esc(value)}</b></div>`).join('')}</div>`;
      case 'chart': return chartHtml(block.book);
      case 'goals': return `<ol class="goals">${block.items.map((step) => `<li class="${step.done ? 'done' : step.key === block.current ? 'current' : ''}"><b>${esc(step.title)}</b><small>${esc(step.text)}</small><em>${esc(step.reward)}</em></li>`).join('')}</ol>`;
      case 'reasons': return `<div class="reasons">${block.items.map((item) => `<div><b>${esc(item.title)}</b><p class="muted">${esc(item.text)}</p></div>`).join('')}</div>`;
      case 'feedback': return `<div class="reasons">${block.items.map((item) => `<div><b>${esc(item.title)} · ${Math.round(item.value)} 分</b><p class="muted">${esc(item.text)}</p></div>`).join('')}</div>`;
      case 'result': return `<div class="result"><small>${esc(block.label)}</small><b>${esc(block.value)}</b><small class="muted">${esc(block.note || '')}</small></div>`;
      case 'toggle': return `<label class="toggle"><input type="checkbox" data-act="${block.action}" data-payload='${esc(JSON.stringify(block.data || {}))}' ${block.value ? 'checked' : ''}><span>${esc(block.text)}</span></label>`;
      case 'choices': return `<div class="choices">${block.items.map((item) => `<button class="choice" data-act="${item.action}" data-payload='${esc(JSON.stringify({ choice: item.id }))}'><b>${esc(item.title)}</b><small>${esc(item.detail || '')}</small></button>`).join('')}</div>`;
      default: return `<p class="muted">（${esc(block.type)}）</p>`;
    }
  }

  function personAssignHtml(block) {
    return `<div class="person-assign">
      <div class="pa-head"><b>${esc(block.title)}</b>${block.status ? `<small class="tag">${esc(block.status)}</small>` : ''}
        ${block.fame ? '<small class="tag gold">磨合期</small>' : ''}${(block.stress || []).map((text) => `<small class="tag bad">${esc(text)}</small>`).join('')}</div>
      <small class="muted">${esc(block.detail)}</small>
      <div class="works">${block.works.map((work) => `<button class="work ${work.on ? 'on' : ''}" data-work="${work.key}" data-person="${block.personId}">${esc(work.name)}<small>${Math.round(work.ability)}</small></button>`).join('')}</div>
    </div>`;
  }

  function chartHtml(book) {
    const weekly = (book.weekly || []).slice(0, 26);
    const peak = Math.max(0.01, ...weekly);
    return `<div class="chart"><h3>按周回款（万）</h3><div class="bars">${weekly.map((value, index) => `<i style="height:${Math.max(2, (value / peak) * 100)}%" title="第${index + 1}周 ${value.toFixed(2)}万"></i>`).join('')}</div></div>`;
  }

  function bindSheet() {
    const host = $('#menu');
    host.querySelector('[data-close]').onclick = () => { stack = []; route = null; renderMenuPanel(); };
    const backButton = host.querySelector('[data-back]');
    if (backButton) backButton.onclick = back;
    host.querySelectorAll('[data-route]').forEach((node) => {
      node.onclick = () => openRoute(JSON.parse(node.dataset.route));
    });
    host.querySelectorAll('[data-act]').forEach((node) => {
      const act = node.dataset.act;
      const payload = node.dataset.payload ? JSON.parse(node.dataset.payload) : {};
      if (node.tagName === 'INPUT') {
        node.onchange = () => action(act, { ...payload, value: node.checked });
      } else {
        node.onclick = () => action(act, payload);
      }
    });
    host.querySelectorAll('[data-work]').forEach((node) => {
      node.onclick = () => {
        const personId = node.dataset.person;
        const key = node.dataset.work;
        const project = core.activeProject(state, route.id) || core.projectOpen(state)[0];
        if (!project) return;
        // 开关交给 core：界面不自己拼名单，避免拼出空表把三块工作一起灭掉。
        run(core.toggleAssign, state, project.id, personId, key);
      };
    });
  }

  /* ---------- 动作 ---------- */
  function action(kind, data) {
    const id = data.id;
    switch (kind) {
      case 'menu': return openRoute(data.menu ? { menu: data.menu, id: data.id } : null);
      case 'recruit': return run(core.publishRecruitment, state, data.role, data.channel);
      case 'hire': return run(core.hire, state, id);
      case 'test': return run(core.testDemo, state, id, data.count);
      case 'promote': return run(core.promote, state, id, data.cost);
      case 'exhibition': return run(core.enterExhibition, state, id);
      case 'deadline': return run(core.setDeadline, state, id, data.days);
      case 'priority': return run(core.setPriority, state, id, data.priority);
      case 'launch': { const next = run(core.launchProject, state, id); if (next) { stack = []; route = null; renderMenuPanel(); } return next; }
      case 'outsource': return run(core.outsourceSound, state, id, data.tier);
      case 'sale': return run(core.setSale, state, id, data.enabled !== false, data.floor);
      case 'operate': return run(core.operateBook, state, id, 'update');
      case 'dlc': return run(core.makeDLC, state, id);
      case 'sequel': return openRoute({ menu: 'new-project', sequel: id });
      case 'overtime': return run(core.setOvertime, state, id, !!data.value);
      case 'leave': return run(core.takeLeave, state, id);
      case 'dismiss': return run(core.dismiss, state, id);
      case 'buy-tool': return run(core.buyTool, state, data.key);
      case 'outing': return run(core.teamOuting, state, data.days || data.value || 2);
      case 'move': return run(core.moveOffice, state);
      case 'decision': return run(core.resolveStudioEvent, state, data.choice);
      case 'sound': return apply(core.setSound(state, !!data.value));
      case 'export': return exportSave();
      case 'import': return importSave();
      case 'restart-confirm': return restart();
      default: toast('这个操作在 HTML 版里没有实现：' + kind);
    }
  }

  /* ---------- 立项表单 ---------- */
  function renderNewProject() {
    const sequel = route && route.sequel;
    const book = sequel ? state.catalog.find((item) => item.id === sequel) : null;
    const host = $('#menu');
    host.classList.add('open');
    host.innerHTML = `<section class="panel sheet">
      <header class="sheet-head"><span class="head-actions">${stack.length > 1 ? '<button class="link" data-back>返回</button>' : ''}</span><h2>${book ? '开发《' + esc(book.name) + '》的续作' : '新作立项'}</h2><button class="link" data-close>关闭</button></header>
      <div class="sheet-body">
        <label class="field">作品名称<input id="project-name" maxlength="24" placeholder="为你的作品命名" value="${book ? esc(book.name + ' 2') : ''}"></label>
        <div class="field">类型<div class="roles" id="project-type">${Object.keys(core.TYPES).map((key, index) => `<button class="pill ${index === 0 ? 'on' : ''}" data-type="${key}">${core.TYPES[key].name}</button>`).join('')}</div></div>
        <div class="field">体量<div class="roles" id="project-scale">${core.SCALES.map((scale, index) => `<button class="pill ${index === 0 ? 'on' : ''}" data-scale="${index}" ${core.scaleOpen(state, index) ? '' : 'disabled'}>${scale.name}</button>`).join('')}</div></div>
        <p class="muted" id="plan-preview"></p>
        <div class="buttons"><button class="primary" id="create-project">开始项目</button></div>
      </div></section>`;
    let draft = { type: 'action', scale: 0, name: '', sequel: sequel || null };
    const refresh = () => {
      draft.name = $('#project-name').value;
      $('#plan-preview').textContent = content.planPreview(state, draft);
    };
    $('#menu [data-close]').onclick = () => { stack = []; route = null; renderMenuPanel(); };
    const backButton = $('#menu [data-back]');
    if (backButton) backButton.onclick = back;
    $('#project-name').oninput = refresh;
    $('#project-type').onclick = (event) => {
      const button = event.target.closest('[data-type]');
      if (!button) return;
      draft.type = button.dataset.type;
      [...$('#project-type').children].forEach((node) => node.classList.toggle('on', node === button));
      refresh();
    };
    $('#project-scale').onclick = (event) => {
      const button = event.target.closest('[data-scale]');
      if (!button || button.disabled) return;
      draft.scale = Number(button.dataset.scale);
      [...$('#project-scale').children].forEach((node) => node.classList.toggle('on', node === button));
      refresh();
    };
    $('#create-project').onclick = () => {
      const next = run(core.startProject, state, { ...draft, name: $('#project-name').value }, 0);
      if (next) { stack = [{ menu: 'project' }]; route = stack[0]; renderMenuPanel(); }
    };
    refresh();
  }

  /* ---------- 存档导出 / 导入 / 重开 ---------- */
  function exportSave() {
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.company || 'studio'}-第${state.day}天.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('存档已导出');
  }
  function importSave() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const next = core.restoreStudio(JSON.parse(String(reader.result)));
          stopClock();
          route = null;
          apply(next);
          toast('存档已导入');
        } catch (error) { toast(error.message); }
      };
      reader.readAsText(file);
    };
    input.click();
  }
  function restart() {
    stopClock();
    route = null;
    state = freshState();
    save();
    render();
  }

  /* ---------- 启动 ---------- */
  document.addEventListener('click', (event) => {
    const node = event.target.closest('[data-open]');
    if (node) openRoute(node.dataset.open);
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== KEY || !event.newValue) return;
    try { stopClock(); state = core.restoreStudio(JSON.parse(event.newValue)); route = null; render(); } catch (error) { /* 忽略别的标签的坏存档 */ }
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && !state.event) { event.preventDefault(); toggleClock(); }
  });

  state = load();
  render();
  window.studio = { get state() { return state; }, open: openRoute, run };
})();
