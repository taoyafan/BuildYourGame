(function () {
  'use strict';

  const game = window.StudioGame;
  const storageKey = 'sunlight-studio-v1';
  const root = document.getElementById('game-root');
  const eventDialog = document.getElementById('event-dialog');
  const resetDialog = document.getElementById('reset-dialog');
  let storageAvailable = true;
  let loadNotice = '';
  let state = load();
  let plan = game.defaultPlan(state);
  let historyExpanded = false;
  let shownEvent = '';
  let toastTimer;

  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const restored = JSON.parse(raw);
        if (game.validState(restored)) return restored;
        loadNotice = '旧存档无法识别，已建立新公司；旧数据尚未覆盖。';
      }
    } catch {
      storageAvailable = false;
      loadNotice = '本机存档暂不可用，本次进度可通过导出保留。';
    }
    return game.createGame();
  }

  function escape(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  function icon(name) {
    return `<i data-lucide="${name}" aria-hidden="true"></i>`;
  }

  function icons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function months(value) {
    if (value >= 120) return '超过 120 个月';
    if (value <= 0) return '已无法支撑';
    if (value < 1) return '不足 1 个月';
    return `约 ${Number(value.toFixed(1))} 个月`;
  }

  function currentRunway() {
    return Math.max(0, game.runway(state));
  }

  function dirty() {
    return JSON.stringify(plan) !== JSON.stringify(game.defaultPlan(state));
  }

  function notify(message) {
    const element = document.getElementById('notification');
    element.textContent = message;
    element.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('visible'), 4200);
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
    }
    document.getElementById('save-status').textContent = storageAvailable ? '已存于本机' : '存档不可用 · 可导出';
  }

  function segmentField(key, title, items, detail, symbol) {
    const locked = Boolean(state.project) && ['type', 'scale', 'material'].includes(key);
    const values = Array.isArray(items) ? items.map((item, index) => ({ value: index, name: item.name })) : Object.entries(items).map(([value, item]) => ({ value, name: item.name }));
    const meta = locked ? '本作已确定' : key === 'promo' && state.project ? '仅可追加' : ['team', 'pay'].includes(key) ? '持续生效' : '立项时确定';
    return `<fieldset><legend>${icon(symbol)}${title}<span class="field-meta">${meta}</span></legend><div class="segments">${values.map(item => {
      const disabled = locked || key === 'promo' && state.project && item.value < state.project.promo;
      return `<label class="segment"><input type="radio" name="${key}" value="${item.value}" ${plan[key] === item.value ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${item.name}</span></label>`;
    }).join('')}</div><p class="field-detail">${escape(detail)}</p></fieldset>`;
  }

  function fields() {
    const costUnit = game.burn(state);
    const materialCost = game.MATERIALS[plan.material].cost * game.SCALES[plan.scale].cost;
    const promoCost = game.PROMO[plan.promo].cost * game.SCALES[plan.scale].cost;
    return segmentField('type', '作品方向', game.TYPES, game.TYPES[plan.type].description, 'gamepad-2') +
      segmentField('scale', '项目规模', game.SCALES, ['先完成一款完整作品，控制资金空窗期。', '扩大内容与目标市场，也要承担更长的开发。', '更大的市场想象，需要更充足的资金储备。'][plan.scale], 'layers') +
      segmentField('material', '物料采购', game.MATERIALS, materialCost ? `本作采购总投入约相当于当前团队 ${Number((materialCost / costUnit).toFixed(1))} 个月开支；缩短工作量，不直接改变品质。` : '依靠团队自制，不额外采购；研发所需时间更长。', 'package') +
      segmentField('team', '研发团队', game.TEAMS, ['人少、持续开支低，项目推进较慢。', '增加产能，同时提高每月开支。', '推进更快，但新增人力的提速逐渐递减。'][plan.team], 'users') +
      segmentField('pay', '团队待遇', game.PAY, ['以控制开支为先，作品品质较难达到同类预期。', '支撑主流水平的团队能力，兼顾成本。', '吸引更强的制作能力，但不会重写已完成部分的品质。'][plan.pay], 'coffee') +
      segmentField('promo', '宣发安排', game.PROMO, promoCost ? `本作宣发总投入约相当于当前团队 ${Number((promoCost / costUnit).toFixed(1))} 个月开支；提高触达，不保证销量。` : '主要等待自然发现，不投入付费推广。', 'megaphone');
  }

  function timeline(preview) {
    const cells = Array.from({ length: 8 }, (_, index) => index);
    return `<div class="timeline" aria-label="未来八个月的预计资金与研发时间"><div class="timeline-labels"><span></span>${cells.map(index => `<span>第${state.month + index}月</span>`).join('')}</div><div class="track"><span>资金可撑</span>${cells.map(index => `<span class="cell ${index < preview.runway ? 'funded' : ''}"></span>`).join('')}</div><div class="track"><span>研发所需</span>${cells.map(index => `<span class="cell ${index < preview.duration ? 'working' : ''} ${index === preview.duration - 1 ? 'finish' : ''}"></span>`).join('')}</div></div>`;
  }

  function previewSection() {
    const preview = game.forecast(state, plan);
    const baseline = game.forecast(state, game.defaultPlan(state));
    const changed = dirty();
    const gap = preview.runway - preview.duration;
    let note;
    if (!preview.affordable) note = { tone: 'urgent', text: '这次一次性投入超出现有资金。先降低物料或宣发投入，再考虑立项。' };
    else if (gap < 0) note = { tone: 'urgent', text: '按当前安排，资金可能先于研发耗尽。缩小项目、降低开支，或争取更早完成。' };
    else if (gap < 1) note = { tone: '', text: '预计能接近完工，但资金余量很小。完工不等于全部回款，首发仍有风险。' };
    else note = { tone: 'calm', text: `按当前条件，完工前约留有 ${Number(gap.toFixed(1))} 个月资金余量。销售结果仍取决于品质、触达和发售时的市场。` };
    const costText = preview.cost > 0 ? `本次一次性投入约合当前团队 ${Number((preview.cost / game.burn(state)).toFixed(1))} 个月开支。` : state.project ? '本次安排无额外一次性支出，工资在月末结算。' : '没有一次性采购或宣发支出，工资在月末结算。';
    return `<section class="preview" aria-labelledby="preview-title"><div class="preview-heading" id="preview-title">${icon('scan-eye')}安排预估<span class="field-meta">${changed || !state.project ? '尚未执行' : '按现有安排'}</span></div><div class="preview-kpis"><div class="kpi"><p class="kpi-label">投入后 · 资金预计可支撑</p><p class="kpi-value ${gap < 0 ? 'warning' : 'good'}" data-testid="preview-runway">${months(preview.runway)}</p><p class="kpi-before">${changed ? `${state.project ? '当前安排' : '默认方案'}：${months(baseline.runway)}` : '计入已有作品的预计回款'}</p></div><div class="kpi"><p class="kpi-label">项目预计还需</p><p class="kpi-value" data-testid="preview-duration">${preview.duration} 个月</p><p class="kpi-before">${changed ? `${state.project ? '当前安排' : '默认方案'}：${baseline.duration} 个月` : '根据类型、规模与团队估算'}</p></div></div>${timeline(preview)}<div class="outlook"><div><small>预计作品竞争力</small><strong>${preview.qualityInfo.label}</strong><p>${preview.qualityInfo.detail}</p></div><div><small>市场触达</small><strong>${preview.reach}</strong><p>${preview.reachDetail}</p></div></div><div class="notice ${note.tone}" role="status">${icon(gap < 0 ? 'triangle-alert' : 'info')}<span>${note.text}</span></div><p class="estimate-note">${costText}不计入尚未发售作品的预期收入。</p><div class="action-row"><button class="button secondary" data-action="apply" ${!preview.affordable || state.project && !changed ? 'disabled' : ''}>${icon(state.project ? 'check' : 'flag')}${state.project ? '确认安排' : '确认立项'}</button><button class="button ${state.event ? 'warning' : ''}" data-action="${state.event ? 'event' : 'advance'}" ${!state.event && (!state.project || changed) ? 'disabled' : ''}>${icon(state.event ? 'message-circle' : 'arrow-right')}${state.event ? '处理待决事件' : '结算这个月'}</button></div><p class="commit-status">${changed && state.project ? '有尚未确认的调整，本月仍按原安排执行。' : !state.project ? '立项后，团队会按安排持续研发。' : '当前安排已确认，无需每月重复设置。'}</p></section>`;
  }

  function reportSection() {
    if (!state.report) return `<section class="sidebar-section"><h3>${icon('notebook-pen')}开业手记</h3><p class="brief-title">先让第一款游戏走出办公室。</p><p class="brief-text">积蓄有限，理想很多。小项目能更早见到玩家，大项目则需要为更长的研发留足余地。</p></section>`;
    const report = state.report;
    const incomeMonths = report.income / report.expense;
    return `<section class="sidebar-section"><h3>${icon('notebook-pen')}第 ${report.month} 月结算</h3><p class="brief-title">${report.failed ? '这一次，现金先到了终点。' : report.release ? `《${escape(report.release.name)}》与玩家见面了。` : report.work > 0 ? '这个月，作品又向前了一步。' : '团队等待下一次立项。'}</p><div class="brief-line"><span>已有作品回款</span><strong>${incomeMonths > 0 ? `覆盖约 ${Number(incomeMonths.toFixed(1))} 个月团队开支` : '暂无销售回款'}</strong></div><div class="brief-line"><span>团队开支</span><strong>已结算当月工资与基础支出</strong></div>${report.release ? `<p class="brief-text">首发回款约覆盖 ${Number((report.release.received / report.expense).toFixed(1))} 个月发售时团队开支。后续销售收入逐月到账。</p>` : ''}</section>`;
  }

  function catalogSection() {
    return `<section class="sidebar-section"><h3>${icon('library')}作品档案 <span class="field-meta">${state.catalog.length ? `${state.catalog.length} 部` : '尚待落笔'}</span></h3>${state.catalog.length ? state.catalog.slice(0, 5).map(book => {
      const ratio = book.invested ? book.received / book.invested : 0;
      const recovered = ratio >= 1;
      const waiting = state.month - book.released <= 11;
      return `<article class="catalog-item"><h4>《${escape(book.name)}》</h4><p>第 ${book.released} 月发售 · ${game.TYPES[book.type].name} · ${game.SCALES[book.scale].name}</p><p>${game.qualityLabel(book.quality).label}</p><p class="catalog-result ${recovered ? '' : 'loss'}">${recovered ? `已回本，累计回款约为投入的 ${Number(ratio.toFixed(1))} 倍` : `累计收回约 ${Math.round(ratio * 100)}% 的项目投入`}</p><p>${waiting ? '后续销售仍在逐月回款' : '主要销售周期已结束'}</p></article>`;
    }).join('') : `<div class="empty-catalog">${icon('book-open')}<p>这里会留下第一款作品，以及它为公司带来的下一次机会。</p></div>`}</section>`;
  }

  function sidebar() {
    return `<aside class="sidebar"><section class="studio-view"><div class="studio-caption"><strong>工作室近况</strong><span>第 ${Math.floor((state.month - 1) / 12) + 1} 年 · ${((state.month - 1) % 12) + 1} 月</span></div><img class="office-art" src="office.svg" alt="小型工作室的电脑、手稿和窗边绿植" width="380" height="230"><div class="company-facts"><span>当前团队 <strong>${game.TEAMS[state.team].name}</strong></span><span>资金可撑 <strong>${months(currentRunway())}</strong></span></div></section>${reportSection()}<section class="sidebar-section"><h3>${icon('radio')}市场风向</h3>${Object.entries(game.TYPES).map(([key, type]) => {
      const trend = game.market(key, state.month);
      return `<div class="market-item"><strong>${type.name}</strong><span class="market-tag ${trend.multiplier > 1 ? 'up' : trend.multiplier < 1 ? 'down' : ''}">${trend.label}</span><p>${trend.description}</p></div>`;
    }).join('')}</section>${catalogSection()}</aside>`;
  }

  function historySection() {
    return `<section class="history ${historyExpanded ? 'expanded' : ''}"><div class="history-header"><h2>公司的那些事</h2>${state.history.length > 3 ? `<button class="history-toggle" data-action="history">${historyExpanded ? '收起记录' : `查看全部 ${state.history.length} 条`}${icon(historyExpanded ? 'chevron-up' : 'chevron-down')}</button>` : '<span class="eyebrow">每个决定，都算数。</span>'}</div><div class="history-list">${state.history.map(entry => `<article class="history-entry"><time>创业第 ${entry.month} 月</time><h3>${escape(entry.title)}</h3><p>${escape(entry.text)}</p></article>`).join('')}</div></section>`;
  }

  function renderEvent() {
    if (!state.event) {
      if (eventDialog.open) eventDialog.close();
      return;
    }
    const event = state.event;
    eventDialog.innerHTML = `<div class="dialog-heading"><span class="eyebrow">${event.id === 'cash' ? '现金危机 · 尚有退路' : '来自办公室之外'}</span><button class="icon-button" data-action="close-event" title="暂时收起" aria-label="暂时收起事件">${icon('x')}</button></div><h2 id="event-title">${escape(event.title)}</h2><p>${escape(event.text)}</p><div class="event-options">${event.choices.map(choice => `<button class="event-option" data-action="resolve" data-choice="${escape(choice.id)}" ${choice.disabled || (choice.cost || 0) > state.cash ? 'disabled' : ''}><span><strong>${escape(choice.title)}${choice.disabled ? ' · 已使用' : ''}</strong><small>${escape(choice.detail)}</small></span>${icon('arrow-up-right')}</button>`).join('')}</div>`;
    const key = `${state.month}-${event.id}`;
    if (shownEvent !== key) {
      shownEvent = key;
      if (!eventDialog.open) eventDialog.showModal();
    }
  }

  function render() {
    const stage = state.over ? '经营结束' : state.catalog.length >= 3 ? '站稳脚跟' : state.catalog.length ? '第一批玩家' : '创业起步';
    const title = state.project ? `《${escape(state.project.name)}》` : '下一款，做什么？';
    const preview = state.over ? null : game.forecast(state, plan);
    const summary = preview ? `<div class="live-summary" aria-live="polite"><span>投入后资金可撑<strong>${months(preview.runway)}</strong></span><span>项目预计还需<strong>${preview.duration} 个月</strong></span><span class="summary-risk ${preview.runway < preview.duration || !preview.affordable ? 'warning' : ''}">${!preview.affordable ? '投入超出资金' : preview.runway < preview.duration ? '资金可能先耗尽' : '按当前安排估算'}</span></div>` : '';
    const workspace = state.over ? `<section class="workspace"><div class="closed-company"><span class="eyebrow">创业档案 / 已结案</span><h2>这间办公室，暂时关灯。</h2><p>公司无法支付本月开支。此前的资金预警、研发投入与作品回款，都留在记录里。下一次，可以带着这段经验重新开始。</p><div class="closed-stats"><div><strong>${state.month - 1}</strong>个月创业经历</div><div><strong>${state.catalog.length}</strong>部已发售作品</div></div><button class="button" data-action="restart">${icon('rotate-ccw')}重新创业</button></div></section>` : `<section class="workspace"><div class="section-heading"><h2>${title}</h2><span class="project-state">${state.project ? '研发进行中' : '新作立项'}</span></div><div class="project-name"><label for="project-name">作品名</label><input id="project-name" maxlength="24" value="${escape(plan.name)}" placeholder="给第一款作品起个名字" ${state.project ? 'disabled' : ''}></div>${summary}<div class="choices">${fields()}</div>${previewSection()}</section>`;
    root.innerHTML = `<div class="month-heading"><h2>创业第 ${state.month} 月<span>月度经营札记</span></h2><span class="stage">${stage}</span></div>${state.event ? `<div class="event-banner"><div><strong>${escape(state.event.title)}</strong><p>有一项抉择待处理，经营安排仍可调整。</p></div><button class="button secondary" data-action="event">${icon('message-circle')}处理事件</button></div>` : ''}<div class="dashboard">${workspace}${sidebar()}</div>${historySection()}`;
    renderEvent();
    icons();
    document.getElementById('save-status').textContent = storageAvailable ? '本机自动存档' : '存档不可用 · 可导出';
  }

  function updateState(next, message) {
    state = next;
    plan = game.defaultPlan(state);
    save();
    render();
    if (message) notify(message);
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `sunlight-studio-month-${state.month}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    notify('存档已导出。');
  }

  document.addEventListener('change', event => {
    const target = event.target;
    if (target.matches('.segments input')) {
      const nameInput = document.getElementById('project-name');
      if (nameInput) plan.name = nameInput.value;
      plan[target.name] = target.name === 'type' ? target.value : Number(target.value);
      const focusedName = target.name;
      const focusedValue = target.value;
      render();
      const focused = root.querySelector(`input[name="${focusedName}"][value="${focusedValue}"]`);
      if (focused) focused.focus({ preventScroll: true });
    }
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'project-name') plan.name = event.target.value;
  });

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    try {
      switch (button.dataset.action) {
        case 'apply': {
          const newProject = !state.project;
          updateState(game.applyPlan(state, plan), newProject ? '立项完成，团队开始研发。' : '经营安排已确认。');
          break;
        }
        case 'advance':
          updateState(game.advance(state), '本月已结算，进度已保存。');
          if (!state.project) window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'event':
          if (!eventDialog.open) eventDialog.showModal();
          break;
        case 'close-event':
          eventDialog.close();
          break;
        case 'resolve':
          updateState(game.resolveEvent(state, button.dataset.choice), '抉择已记录。');
          break;
        case 'restart':
          resetDialog.showModal();
          break;
        case 'confirm-restart':
          resetDialog.close();
          shownEvent = '';
          historyExpanded = false;
          updateState(game.createGame(), '新的办公室，新的开始。');
          break;
        case 'export':
          exportSave();
          break;
        case 'import':
          document.getElementById('import-file').click();
          break;
        case 'history':
          historyExpanded = !historyExpanded;
          render();
          break;
      }
    } catch (error) {
      notify(error.message || '这次安排未能执行。');
    }
  });

  document.getElementById('import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1024 * 1024) throw new Error('存档文件过大。');
      const restored = JSON.parse(await file.text());
      if (!game.validState(restored)) throw new Error('这不是有效的日光工作室存档。');
      shownEvent = '';
      updateState(restored, '存档已恢复。');
    } catch (error) {
      notify(error.message || '存档读取失败。');
    }
    event.target.value = '';
  });

  render();
  if (loadNotice) notify(loadNotice);
})();