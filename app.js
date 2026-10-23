(function () {
  'use strict';

  const game = window.StudioGame;
  const storageKey = 'sunlight-studio-v2';
  const root = document.getElementById('game-root');
  const dialog = document.getElementById('menu-dialog');
  let storageAvailable = true;
  let loadNotice = '';
  let recoveryRaw = null;
  let state = load();
  let playing = false;
  let speed = 1;
  let elapsed = 0;
  let resumeAfterMenu = false;
  let routes = [];
  let toastTimer;

  function load() {
    try {
      const raw = localStorage.getItem(storageKey) || localStorage.getItem('sunlight-studio-v1');
      if (raw) {
        const saved = JSON.parse(raw);
        const restored = game.restoreStudio(saved);
        if (saved.version === 1) loadNotice = '旧档已迁移：余额和项目完成比例保留，时间暂停；原存档仍保留。';
        return restored;
      }
    } catch {
      try { recoveryRaw = localStorage.getItem(storageKey); } catch { storageAvailable = false; }
      loadNotice = '存档无法读取；原数据未覆盖。可导入备份，或建立新公司。';
    }
    return game.createStudio();
  }

  function escape(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function icon(name) { return `<i data-lucide="${name}" aria-hidden="true"></i>`; }
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function money(value) { return `${value.toFixed(2)} 万`; }
  function number(value) { return Math.round(value).toLocaleString('zh-CN'); }
  function button(action, text, symbol, data = '', disabled = false, secondary = true) {
    return `<button class="button ${secondary ? 'secondary' : ''}" data-action="${action}" ${data} ${disabled ? 'disabled' : ''}>${icon(symbol)}${text}</button>`;
  }
  function line(label, value) { return `<div class="data-line"><span>${label}</span><strong>${value}</strong></div>`; }

  function notify(message) {
    const element = document.getElementById('notification');
    element.textContent = message;
    element.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('visible'), 4200);
  }

  function save() {
    try {
      if (recoveryRaw) {
        localStorage.setItem(`${storageKey}-recovery`, recoveryRaw);
        recoveryRaw = null;
      }
      localStorage.setItem(storageKey, JSON.stringify(state));
      storageAvailable = true;
    } catch { storageAvailable = false; }
  }

  function pauseReason() {
    if (state.over) return '经营结束';
    if (!state.company) return '等待公司命名';
    if (state.event) return `等待决策 · ${state.event.title}`;
    if (dialog.open) return '菜单中 · 时间暂停';
    return playing ? '正常经营中' : '手动暂停';
  }

  function stage(project) {
    const progress = project.done / project.total;
    return progress >= 1 ? '交付准备' : progress >= 0.55 ? 'Demo 与完善' : progress >= 0.25 ? '内容制作' : '可玩原型';
  }

  function advice() {
    if (state.over) return { title: '公司未能支付月底开支', text: '作品与收支记录已保留，可以导出本次经营记录。', menu: 'finance', symbol: 'receipt-text' };
    if (state.event) return { title: state.event.title, text: '关键决策正在等待，不会因加速跳过。', menu: 'event', symbol: 'message-circle' };
    if (!state.staff.some(person => person.role === 'code')) return { title: '先找到能把想法做出来的同事', text: '你负责产品方向与预算，程序员负责开发和修复。', menu: 'recruit-code', symbol: 'user-plus' };
    if (!state.project) return { title: state.catalog.length ? '下一款，延续优势还是换个方向？' : '团队已经可以启动第一款作品', text: '选定作品类型与名称，比较工作量和当前产能。', menu: 'project', symbol: 'gamepad-2' };
    if (state.project.focus !== 'develop' && state.project.done < state.project.total) return { title: '团队正在改进已有体验', text: '打磨和修复会暂缓新内容；完成后可切回内容开发。', menu: 'project', symbol: 'wrench' };
    if (state.project.done >= state.project.total) return { title: '计划内容已完成，等待交付', text: '检查试玩、缺陷与关注情况后，可在项目菜单正式发售。', menu: 'project', symbol: 'rocket' };
    if (game.playtestOffer(state).available && !state.project.test) return { title: 'Demo 已可测试', text: '没有试玩前不显示玩家评价，测试可以帮助识别短板。', menu: 'testing', symbol: 'flask-conical' };
    return { title: '工作正在持续进行', text: '招聘、工具和工作重点可随时调整；现有安排无需重复确认。', menu: 'project', symbol: 'activity' };
  }

  function meter(label, value, detail, tone) {
    return `<div class="production-meter ${tone}"><div><span>${label}</span><strong>${value.toFixed(1)}</strong></div><progress max="100" value="${value}" aria-label="${label}"></progress><small>${detail}</small></div>`;
  }

  function render() {
    const project = state.project;
    const forecast = game.projectForecast(state);
    const hint = advice();
    const book = state.catalog[0];
    const month = Math.floor((state.day - 1) / 30) + 1;
    const day = (state.day - 1) % 30 + 1;
    root.innerHTML = `<div class="studio-shell">
      <section class="clock-bar" aria-label="时间控制"><div><strong data-testid="date">第 ${month} 月 · ${day} 日</strong><span class="clock-reason" role="status">${escape(pauseReason())}</span></div><div class="clock-controls"><button class="icon-button clock-toggle" data-action="clock" title="${playing ? '暂停时间' : '开始时间'}" aria-label="${playing ? '暂停时间' : '开始时间'}" ${state.over ? 'disabled' : ''}>${icon(playing ? 'pause' : 'play')}</button><div class="speed-control" role="group" aria-label="时间速度">${[1, 4, 12].map(value => `<button data-action="speed" data-value="${value}" aria-pressed="${speed === value}" title="${value} 倍速度">${value}x</button>`).join('')}</div></div></section>
      <section class="studio-finances" aria-label="公司状态"><div><span>账面资金</span><strong data-testid="cash">${money(state.cash)}</strong></div><div><span>预计月开支</span><strong>${money(game.monthlyCost(state))}</strong></div><div><span>已累计应付</span><strong>${money(state.accrued)}</strong></div><div><span>研发团队</span><strong>${state.staff.length} 人</strong></div></section>
      <div class="studio-layout"><section class="project-desk" aria-label="当前项目"><div class="desk-heading"><div><span class="eyebrow">${project ? `${game.TYPES[project.type].name} / ${stage(project)}` : '工作室 / 新的计划'}</span><h2>${project ? `《${escape(project.name)}》` : '下一款，做什么？'}</h2></div>${button('menu', project ? '项目' : '立项', 'gamepad-2', 'data-menu="project"')}</div>
        ${project ? `<div class="main-progress"><div><span>研发完成度</span><strong data-testid="progress">${forecast.metrics.progress.toFixed(1)}%</strong></div><progress max="100" value="${forecast.metrics.progress}" aria-label="研发完成度"></progress></div><div class="production-numbers"><span>开发 <strong data-testid="code-rate">${forecast.code.toFixed(2)}</strong> 工作量/天</span><span>视觉 <strong>${forecast.art.toFixed(2)}</strong> 工作量/天</span><span>预计还需 <strong>${forecast.days === null ? '待安排' : `${forecast.days} 天`}</strong></span></div><div class="production-meters">${meter('玩法完成情况', forecast.metrics.gameplay, project.focus === 'polish' ? '集中打磨中' : '开发与打磨逐步形成', 'gameplay')}${meter('视觉表现', forecast.metrics.visual, project.assets ? '含采购素材成果' : '由美术实际制作形成', 'visual')}${meter('稳定性', forecast.metrics.stability, `已知缺陷 ${project.defects} 项`, 'stability')}</div><div class="audience-strip"><div><span>关注人数</span><strong>${number(project.followers)}</strong></div><div><span>${project.test ? '试玩口碑' : '玩家评价'}</span><strong data-testid="reputation">${project.test ? `${project.test.score.toFixed(1)} / 100` : '尚无玩家评价'}</strong></div><div><span>最近测试样本</span><strong>${project.test ? `${project.test.count} 人 · 第 ${project.test.day} 天` : '未测试'}</strong></div></div>` : `<div class="office-empty"><img src="office.svg" alt="工作室的电脑、手稿和窗边绿植"><div><strong>${escape(state.company || '为工作室取一个名字')}</strong><p>${book ? `上一作累计售出 ${number(book.units)} 份，回款 ${money(book.received)}。` : '从一位同事、一个想法开始。'}</p></div></div>`}
        <div class="studio-advice"><div><strong>${escape(hint.title)}</strong><p>${escape(hint.text)}</p></div><button class="icon-button" data-action="menu" data-menu="${hint.menu}" title="${escape(hint.title)}" aria-label="${escape(hint.title)}">${icon(hint.symbol)}</button></div>
      </section><aside class="people-desk" aria-label="团队近况"><div class="desk-heading"><h3>工作室近况</h3><button class="icon-button" data-action="menu" data-menu="team" title="管理团队" aria-label="管理团队">${icon('users')}</button></div><div class="people-list">${state.staff.length ? state.staff.map(person => `<button class="person-row" data-action="menu" data-menu="person" data-id="${escape(person.id)}"><span class="person-initial ${person.role}">${escape(person.name.slice(-1))}</span><span><strong>${escape(person.name)}</strong><small>${game.ROLES[person.role].name} · ${project ? person.role === 'art' ? '视觉制作' : { develop: '功能开发', polish: '玩法打磨', bugs: '缺陷修复' }[project.focus] : '等待新项目'}</small></span><span class="person-work">${person.work.toFixed(1)}<small>累计工作量</small></span></button>`).join('') : '<p class="muted">还没有员工。你负责制作方向，先发布程序员招聘。</p>'}</div><div class="recent-note"><span class="eyebrow">最近动态</span><strong>${escape(state.history[0] ? state.history[0].title : '工作室等待成立')}</strong><p>${escape(state.history[0] ? state.history[0].text : '先输入公司名称。')}</p></div></aside></div>
      <nav class="studio-nav" aria-label="经营菜单">${[['project', 'gamepad-2', '项目'], ['team', 'users', '团队'], ['tools', 'wrench', '工具'], ['testing', 'flask-conical', '测试'], ['market', 'megaphone', '市场'], ['finance', 'receipt-text', '公司']].map(([menu, symbol, text]) => `<button data-action="menu" data-menu="${menu}">${icon(symbol)}<span>${text}</span></button>`).join('')}</nav>
    </div>`;
    document.getElementById('company-label').textContent = state.company || '日光工作室';
    document.getElementById('save-status').textContent = storageAvailable ? '本机自动存档' : '存档不可用 · 请导出';
    icons();
  }

  function openMenu(menu, id, critical = false) {
    if (!dialog.open) {
      resumeAfterMenu = playing;
      playing = false;
      elapsed = 0;
      routes = [];
    }
    if (critical || menu === 'event' || menu === 'setup') resumeAfterMenu = false;
    if (critical) routes = [];
    routes.push({ menu, id });
    renderMenu();
    if (!dialog.open) dialog.showModal();
    render();
  }

  function closeMenu() {
    if (!state.company) return;
    dialog.close();
    routes = [];
    playing = resumeAfterMenu && !state.event && !state.over && !document.hidden;
    resumeAfterMenu = false;
    elapsed = 0;
    render();
  }

  function formField(label, name, value = '', placeholder = '') {
    return `<label class="form-field">${label}<input name="${name}" value="${escape(value)}" placeholder="${escape(placeholder)}" maxlength="24" required autocomplete="off"></label>`;
  }

  function recruitment(role) {
    const pool = state.candidates[role];
    return `<p class="menu-intro">${game.ROLES[role].task}。工资按实际在职天数累计，月底结算。</p>${pool ? `<p class="muted">本批名单保持至第 ${(pool.batch + 1) * 14} 天；关闭菜单不会重抽。</p><div class="choice-list">${pool.people.map(person => `<button class="menu-choice" data-action="menu" data-menu="candidate" data-id="${person.id}" ${person.hired ? 'disabled' : ''}><span><strong>${escape(person.name)} ${person.hired ? '· 已录用' : ''}</strong><small>能力 ${person.skill} · 速度 ${person.pace} · 月薪 ${money(person.wage)}</small><small>${game.TRAITS[person.trait].name}：${game.TRAITS[person.trait].text}</small></span>${icon('chevron-right')}</button>`).join('')}</div>` : '<p class="empty-note">发布岗位后，候选人会提交不同能力和期望工资的简历。</p>'}${button('recruit', pool ? '检查新一批简历' : '发布招聘', 'user-plus', `data-role="${role}"`, Boolean(pool && pool.batch === Math.floor((state.day - 1) / 14)))}`;
  }

  function menuContents(route) {
    const project = state.project;
    switch (route.menu) {
      case 'setup': return { title: '成立你的工作室', body: `<p class="menu-intro">你负责产品方向、预算与用人。先为公司取名，再找到把想法做出来的同事。</p><form data-form="company">${formField('公司名称', 'name', '', '例如：日光工作室')}<div class="menu-actions"><button class="button" type="submit">${icon('sun')}成立公司</button></div></form>` };
      case 'project': return { title: project ? `《${project.name}》` : '新作立项', body: project ? `${line('当前阶段', stage(project))}${line('预计剩余', game.projectForecast(state).days === null ? '当前不推进内容开发' : `${game.projectForecast(state).days} 天`)}${line('已投入', money(project.invested))}${line('受众', game.AUDIENCES[project.type].name)}<h3 class="menu-section-title">程序团队工作重点</h3><div class="mode-controls">${[['develop', '功能开发', 'code-2'], ['polish', '玩法打磨', 'sparkles'], ['bugs', '修复缺陷', 'bug']].map(([focus, text, symbol]) => `<button data-action="focus" data-focus="${focus}" aria-pressed="${project.focus === focus}">${icon(symbol)}${text}</button>`).join('')}</div><p class="muted">打磨和修复暂停新增内容，但不会让已完成工作消失。</p><div class="choice-list">${button('menu', '视觉制作与素材', 'palette', 'data-menu="visual"')}${button('menu', 'Demo 与测试反馈', 'flask-conical', 'data-menu="testing"')}${button('menu', '展示与推广', 'megaphone', 'data-menu="market"')}${button('launch', '正式发售', 'rocket', '', project.done < project.total - 0.001, false)}</div>` : `<form data-form="project">${formField('游戏名称', 'name', '', '为你的作品命名')}<label class="form-field">游戏类型<select name="type" required><option value="">选择作品方向</option>${Object.entries(game.TYPES).map(([type, value]) => `<option value="${type}">${value.name}</option>`).join('')}</select></label><label class="form-field">内容体量<select name="scale">${game.SCALES.map((item, index) => `<option value="${index}">${item.name}</option>`).join('')}</select></label><div id="plan-preview" class="plan-preview">选择类型后查看工作量、受众和预估时间。</div><p class="muted">当前月开支 ${money(game.monthlyCost(state))}，立项不额外收取费用。后续招聘、素材和推广由你决定。</p><div class="menu-actions"><button class="button" type="submit">${icon('flag')}开始项目</button></div></form>` };
      case 'team': return { title: '团队管理', body: `${line('团队规模', `${state.staff.length} / 16 人`)}${line('月开支含基础费用', money(game.monthlyCost(state)))}<div class="choice-list">${button('menu', '招聘程序员', 'code-2', 'data-menu="recruit-code"')}${button('menu', '招聘美术', 'palette', 'data-menu="recruit-art"')}${state.staff.map(person => `<button class="menu-choice" data-action="menu" data-menu="person" data-id="${person.id}"><span><strong>${escape(person.name)}</strong><small>${game.ROLES[person.role].name} · ${money(person.wage)}/月</small></span>${icon('chevron-right')}</button>`).join('')}</div>` };
      case 'recruit-code': return { title: '招聘 / 程序员', body: recruitment('code') };
      case 'recruit-art': return { title: '招聘 / 美术', body: recruitment('art') };
      case 'candidate': {
        const person = Object.values(state.candidates).flatMap(pool => pool.people).find(item => item.id === route.id);
        if (!person) return { title: '简历已更新', body: '<p>请返回查看当前候选人。</p>' };
        const projected = { ...state, staff: [...state.staff, person] };
        const before = game.rates(state);
        const after = game.rates(projected);
        const forecast = game.projectForecast(projected);
        return { title: `${person.name} / ${game.ROLES[person.role].name}`, body: `${line('能力', person.skill)}${line('速度基准', person.pace)}${line('期望月薪', money(person.wage))}<p class="trait-note">${game.TRAITS[person.trait].name}：${game.TRAITS[person.trait].text}</p><h3 class="menu-section-title">录用后的预期变化</h3>${line('月开支', `${money(game.monthlyCost(state))} → ${money(game.monthlyCost(projected))}`)}${line(person.role === 'code' ? '当前阶段开发产能' : '视觉制作产能', `${before[person.role].toFixed(2)} → ${after[person.role].toFixed(2)} 工作量/天`)}${forecast ? line('内容预计剩余', forecast.days === null ? '需切回内容开发' : `${forecast.days} 天`) : ''}<p class="muted">入职后开始工作，不即时增加作品表现；实际成果随时间产生。</p>${button('hire', person.hired ? '已录用' : `录用 · ${money(person.wage)}/月`, 'user-plus', `data-id="${person.id}"`, person.hired, false)}` };
      }
      case 'person': {
        const person = state.staff.find(item => item.id === route.id);
        if (!person) return { title: '员工已离职', body: '<p>可以返回团队查看其他同事。</p>' };
        return { title: person.name, body: `${line('岗位', game.ROLES[person.role].name)}${line('月薪', money(person.wage))}${line('能力 / 速度', `${person.skill} / ${person.pace}`)}${line('累计实际工作', person.work.toFixed(2))}<p class="trait-note">${game.TRAITS[person.trait].text}</p><p class="muted">已产生的工资不会因离职取消。</p>${button('menu', '结束雇佣关系', 'user-minus', `data-menu="dismiss" data-id="${person.id}"`)}` };
      }
      case 'dismiss': return { title: '确认结束雇佣', body: `<p class="menu-intro">员工离职后停止产出与后续计薪；此前工作、已累计工资保留。</p>${button('dismiss', '确认离职', 'user-minus', `data-id="${escape(route.id)}"`, false, false)}` };
      case 'tools': return { title: '工作工具', body: `<p class="menu-intro">工具属于公司，可用于后续作品；没有对应岗位时不会凭空产出。</p>${Object.entries(game.STUDIO_TOOLS).map(([role, tool]) => { const before = game.rates(state); const after = game.rates({ ...state, tools: [...state.tools, role] }); return `<section class="menu-band"><h3>${tool.name}</h3><p>${tool.text}</p>${line('当前对应产能', state.tools.includes(role) ? `${before[role].toFixed(2)} 工作量/天` : `${before[role].toFixed(2)} → ${after[role].toFixed(2)} 工作量/天`)}${button('buy-tool', state.tools.includes(role) ? '已购置' : `购置 · ${money(tool.cost)}`, 'shopping-cart', `data-role="${role}"`, state.tools.includes(role) || state.cash < tool.cost)}</section>`; }).join('')}` };
      case 'visual': return { title: '视觉制作', body: project ? `${line('视觉表现', game.projectMetrics(project).visual.toFixed(1))}${line('美术人数', state.staff.filter(person => person.role === 'art').length)}<p class="menu-intro">美术持续制作，素材直接提供部分视觉成果；也可接受朴素画面，观察目标玩家评价。</p><div class="choice-list">${button('menu', '查看美术招聘', 'user-plus', 'data-menu="recruit-art"')}${button('assets', project.assets ? '已采购素材' : `采购素材 · ${money(4 * [1, 1.5, 2][project.scale])}`, 'package', '', project.assets)}${button('plain', '保持朴素风格', 'check')}</div>` : '<p>请先立项。</p>' };
      case 'testing': {
        const offer = game.playtestOffer(state);
        return { title: 'Demo / 玩家反馈', body: !project ? '<p>先立项并完成可试玩的 Demo。</p>' : `${project.test ? `<div class="reputation-result"><span>试玩口碑</span><strong>${project.test.score.toFixed(1)}</strong><small>${project.test.count} 人 · 第 ${project.test.day} 天；累计参与 ${project.testCount} 人次</small></div>${project.test.findings.map(item => `<section class="feedback-row"><strong>${escape(item.title)} · ${item.value.toFixed(1)}</strong><p>${escape(item.text)}</p></section>`).join('')}<p class="muted">评价对应测试时的版本；修改后需要复测，才知道新一批玩家是否认可。</p>` : '<p class="menu-intro">尚无玩家评价。测试用来观察目标玩家的体验，不等于购买，也不保证市场定论。</p>'}<div class="menu-actions">${button('test', '招募 30 人 · 0.80 万', 'flask-conical', 'data-count="30"', !offer.available || state.cash < 0.8)}${button('test', '招募 100 人 · 2.00 万', 'users', 'data-count="100"', !offer.available || state.cash < 2)}</div>${!offer.available ? `<p class="muted">${escape(offer.reason || '先处理关键决策')}</p>` : ''}` };
      }
      case 'market': return { title: '市场与作品', body: `${project ? `${line('当前作品关注人数', number(project.followers))}<p class="menu-intro">关注是潜在受众，不是销量；推广不直接改善体验。${game.market(project.type, Math.ceil(state.day / 30)).description}</p><div class="choice-list">${['核心圈层', '试玩展示', '集中推广'].map((name, index) => button('promote', `${name} · ${money([2, 6, 12][index])}`, 'megaphone', `data-tier="${index}"`, project.done < project.total * 0.55 || state.cash < [2, 6, 12][index])).join('')}</div>` : ''}<h3 class="menu-section-title">已发售作品</h3>${state.catalog.length ? state.catalog.map(book => `<button class="menu-choice" data-action="menu" data-menu="book" data-id="${book.id}"><span><strong>《${escape(book.name)}》</strong><small>${number(book.units)} 份 · 回款 ${money(book.received)} · 玩家评价 ${book.reviewScore.toFixed(1)}</small></span>${icon('chevron-right')}</button>`).join('') : '<p class="muted">作品完成并发售后，在这里继续观察销售与玩家评价。</p>'}` };
      case 'book': {
        const book = state.catalog.find(item => item.id === route.id);
        if (!book) return { title: '作品档案', body: '<p>没有找到该作品。</p>' };
        return { title: `《${book.name}》`, body: `<div class="reputation-result"><span>正式玩家评价</span><strong>${book.reviewScore.toFixed(1)}</strong><small>${number(book.reviewCount)} 位评价者；${book.tested ? '发售前有试玩反馈' : '发售前未测试'}</small></div>${line('首发关注人数', number(book.openingFollowers))}${line('首发购买', `${number(book.openingUnits)} 份`)}${line('首发到账', money(book.openingReceipt))}${line('累计销量', `${number(book.units)} 份`)}${line('累计回款', money(book.received))}${line('项目投入', money(book.invested))}${line(book.received >= book.invested ? '项目结余' : '尚差回本', money(Math.abs(book.received - book.invested)))}${line('最近一日销量', `${book.lastDayUnits} 份`)}${line('发售时市场', escape(book.trend))}<p class="muted">关注影响首发基础，实际体验影响玩家评价与后续传播。工具是公司资产，未全部计入单个项目投入；公司账单包含实际收支。</p><h3 class="menu-section-title">团队与作品</h3><p>${book.team.length ? book.team.map(person => `${escape(person.name)}（${game.ROLES[person.role].name}）`).join('、') : '旧档作品'}</p>${line('玩法 / 视觉 / 稳定性', `${book.metrics.gameplay.toFixed(1)} / ${book.metrics.visual.toFixed(1)} / ${book.metrics.stability.toFixed(1)}`)}` };
      }
      case 'finance': return { title: `${state.company || '公司'} / 经营记录`, body: `${line('账面资金', money(state.cash))}${line('本月已累计应付', money(state.accrued))}${line('预计月开支', money(game.monthlyCost(state)))}${state.report ? `<section class="menu-band"><h3>第 ${state.report.month} 月账单</h3>${line('期初资金', money(state.report.opening))}${line('收入合计', money(state.report.income))}${line('支出合计', money(state.report.expense))}${line('其中工资与基础开支', money(state.report.payroll))}${line('资金净变化', money(state.report.net))}${line('期末资金', money(state.report.closing))}</section>` : '<p class="muted">月底生成完整账单；采购与测试等即时支出已计入本月。</p>'}<div class="choice-list">${button('menu', '查看全部经营记录', 'notebook-pen', 'data-menu="history"')}${button('export', '导出存档', 'download')}${button('import', '导入存档', 'upload')}${button('menu', '重新创业', 'rotate-ccw', 'data-menu="restart"')}</div>` };
      case 'history': return { title: '经营记录', body: state.history.map(entry => `<article class="log-entry"><small>第 ${entry.day} 天</small><strong>${escape(entry.title)}</strong><p>${escape(entry.text)}</p></article>`).join('') || '<p>还没有经营记录。</p>' };
      case 'restart': return { title: '重新创业？', body: `<p class="menu-intro">当前进度将被新公司覆盖。需要保留本次经历，可以先导出。</p>${button('export', '导出当前存档', 'download')}${button('restart', '确认重新创业', 'rotate-ccw', '', false, false)}` };
      case 'event': {
        const event = state.event;
        if (!event) return { title: '决策已处理', body: '<p>可关闭窗口，准备好后继续经营。</p>' };
        const released = event.id === 'release' ? state.catalog.find(book => book.id === state.lastRelease) : null;
        return { title: event.title, body: `<p class="menu-intro">${escape(event.text)}</p>${released ? `<div class="release-receipt"><span>首发实际到账</span><strong>+${money(released.openingReceipt)}</strong></div>${line('累计项目投入', money(released.invested))}${line('正式玩家评价', `${released.reviewScore.toFixed(1)} · ${released.reviewCount} 人`)}${line(released.received >= released.invested ? '已回本，项目结余' : '尚未回本，缺口', money(Math.abs(released.received - released.invested)))}${button('menu', '查看完整发售复盘', 'chart-no-axes-combined', `data-menu="book" data-id="${released.id}"`)}` : ''}<div class="choice-list">${event.choices.map(choice => `<button class="menu-choice" data-action="decision" data-choice="${choice.id}" ${choice.id === 'assets' && project && state.cash < 4 * [1, 1.5, 2][project.scale] ? 'disabled' : ''}><span><strong>${escape(choice.title)}</strong><small>${escape(choice.detail)}</small></span>${icon('arrow-up-right')}</button>`).join('')}</div><p class="muted">关键决策处理后保持暂停，由你继续时间。</p>` };
      }
      default: return { title: '工作室', body: '<p>请选择经营菜单。</p>' };
    }
  }

  function renderMenu() {
    if (!routes.length) return;
    const content = menuContents(routes[routes.length - 1]);
    dialog.innerHTML = `<div class="dialog-heading">${routes.length > 1 ? `<button class="icon-button" data-action="back" title="返回上一级" aria-label="返回上一级">${icon('arrow-left')}</button>` : '<span class="eyebrow">工作室 / 经营决策</span>'}${state.company ? `<button class="icon-button" data-action="close" title="关闭菜单" aria-label="关闭菜单">${icon('x')}</button>` : ''}</div><h2 id="menu-title">${escape(content.title)}</h2><div class="menu-body">${content.body}</div>`;
    icons();
  }

  function update(next, message) {
    state = next;
    save();
    if (state.event) {
      playing = false;
      openMenu('event', null, true);
    } else {
      if (state.over) { playing = false; resumeAfterMenu = false; }
      render();
      if (dialog.open) renderMenu();
    }
    if (message) notify(message);
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `studio-day-${state.day}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    notify('存档已导出。');
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const data = target.dataset;
    try {
      switch (data.action) {
        case 'clock':
          if (!state.company) { openMenu('setup', null, true); break; }
          if (state.event) { openMenu('event', null, true); break; }
          if (state.over || dialog.open) break;
          playing = !playing; elapsed = 0; render(); break;
        case 'speed': speed = Number(data.value); render(); break;
        case 'menu': openMenu(data.menu, data.id); break;
        case 'close': closeMenu(); break;
        case 'back': routes.pop(); renderMenu(); break;
        case 'recruit': update(game.publishRecruitment(state, data.role), '简历已收到；本批候选人不会因重开菜单改变。'); break;
        case 'hire': update(game.hire(state, data.id), '同事已加入。产能预估已变化，实际成果从工作开始产生。'); break;
        case 'dismiss': update(game.dismiss(state, data.id), '员工已离职，已产生的工资保留。'); routes = [{ menu: 'team' }]; renderMenu(); break;
        case 'buy-tool': update(game.buyTool(state, data.role), '工具已购置，对应岗位的产能已更新。'); break;
        case 'assets': update(game.buyAssets(state), '素材已投入，视觉表现与资金已更新。'); break;
        case 'plain': update({ ...state, project: { ...state.project, plain: true } }, '保留朴素风格，后续通过试玩观察玩家是否接受。'); break;
        case 'focus': update(game.setFocus(state, data.focus), '工作重点已调整；实际改善随工作产生。'); break;
        case 'test': update(game.testDemo(state, Number(data.count)), '测试完成，反馈已经送达。'); break;
        case 'promote': update(game.promote(state, Number(data.tier)), '推广完成，新增关注已记录；不保证实际购买。'); break;
        case 'launch': update(game.launchProject(state)); break;
        case 'decision': {
          const choice = data.choice;
          update(game.resolveStudioEvent(state, choice));
          if (!state.event) {
            routes = [{ menu: choice === 'tools' ? 'tools' : choice === 'recruit' ? 'recruit-art' : choice === 'test' ? 'testing' : choice === 'visual' ? 'visual' : 'project' }];
            resumeAfterMenu = false;
            renderMenu();
          }
          break;
        }
        case 'export': exportSave(); break;
        case 'import': playing = false; resumeAfterMenu = false; render(); document.getElementById('import-file').click(); break;
        case 'restart':
          playing = false; resumeAfterMenu = false; dialog.close(); routes = [];
          update(game.createStudio()); openMenu('setup', null, true); break;
      }
    } catch (error) { notify(error.message || '本次操作未执行。'); }
  });

  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form.dataset.form) return;
    event.preventDefault();
    const value = name => form.elements.namedItem(name).value;
    try {
      if (form.dataset.form === 'company') {
        update(game.nameCompany(state, value('name')));
        resumeAfterMenu = false;
        closeMenu();
        notify('工作室已成立。先招募一位程序员，时间仍保持暂停。');
      } else if (form.dataset.form === 'project') {
        update(game.startProject(state, { name: value('name'), type: value('type'), scale: Number(value('scale')) }));
        closeMenu();
        notify('项目已立项，准备好后开始时间。');
      }
    } catch (error) { notify(error.message); }
  });

  document.addEventListener('change', event => {
    if (!['type', 'scale'].includes(event.target.name)) return;
    const form = event.target.form;
    if (!form || form.dataset.form !== 'project') return;
    const type = form.elements.namedItem('type').value;
    const element = document.getElementById('plan-preview');
    if (!game.AUDIENCES[type]) { element.textContent = '请选择作品方向。'; return; }
    const scale = Number(form.elements.namedItem('scale').value);
    const workload = game.AUDIENCES[type].work * [1, 1.65, 2.4][scale];
    const forecast = game.projectForecast(game.startProject(state, { name: '预估作品', type, scale }));
    element.textContent = `${game.AUDIENCES[type].name}；计划工作量 ${workload.toFixed(1)}。${forecast.days !== null ? `当前团队预计 ${forecast.days} 天，研发期间费用约 ${money(game.monthlyCost(state) * forecast.days / 30)}；不含可选采购、测试与推广。` : '尚无程序员，招聘后才能推进。'}`;
  });

  dialog.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { playing = false; resumeAfterMenu = false; elapsed = 0; render(); }
  });
  window.addEventListener('blur', () => { playing = false; resumeAfterMenu = false; elapsed = 0; render(); });

  document.getElementById('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('存档文件过大。');
      const restored = game.restoreStudio(JSON.parse(await file.text()));
      playing = false; resumeAfterMenu = false;
      dialog.close(); routes = [];
      update(restored, '存档已恢复，时间保持暂停。');
      if (!state.company) openMenu('setup', null, true);
    } catch (error) { notify(error.message || '导入失败，当前进度未改变。'); }
    event.target.value = '';
  });

  setInterval(() => {
    if (!playing || dialog.open || state.event || state.over || document.hidden) return;
    elapsed += 100 * speed;
    try {
      while (elapsed >= 1000 && playing && !state.event && !state.over) {
        elapsed -= 1000;
        const previousMonth = state.report ? state.report.month : 0;
        state = game.stepDay(state);
        save();
        if (state.event) { playing = false; openMenu('event', null, true); }
        else if (state.over) { playing = false; notify('公司未能支付月底开支，经营结束。'); }
        else if (state.report && state.report.month !== previousMonth) notify(`第 ${state.report.month} 月结算：收入 ${money(state.report.income)}，支出 ${money(state.report.expense)}。`);
        render();
      }
    } catch (error) { playing = false; notify(error.message); render(); }
  }, 100);

  render();
  if (!state.company) openMenu('setup', null, true);
  else if (state.event) openMenu('event', null, true);
  if (loadNotice) notify(loadNotice);
})();