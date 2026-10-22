(function () {
  'use strict';

  const game = window.StudioGame;
  const storageKey = 'sunlight-studio-v1';
  const root = document.getElementById('game-root');
  const eventDialog = document.getElementById('event-dialog');
  const resetDialog = document.getElementById('reset-dialog');
  const resultDialog = document.getElementById('result-dialog');
  const expandedPanels = new Set();
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

  function companyStatus() {
    const month = state.over ? state.month - 1 : state.month;
    const forecast = !state.over ? game.forecast(state, plan) : null;
    const current = state.project && !state.over ? game.forecast(state, game.defaultPlan(state)) : null;
    const runway = currentRunway();
    const risk = state.over ? '经营已结束' : !forecast.affordable ? '方案超出资金' : forecast.runway < forecast.duration ? '资金可能先耗尽' : dirty() || !state.project ? '当前 → 本回合方案' : '按当前安排估算';
    const change = (before, after) => `<span class="status-before">${before}</span>${before === after ? '' : `<span class="status-change"> → ${after}</span>`}`;
    return `<section class="company-status" aria-label="当前与方案预估"><div class="status-heading"><span data-testid="company-age">成立第 ${Math.floor((month - 1) / 12) + 1} 年 · 第 ${(month - 1) % 12 + 1} 月</span><span class="${state.over || forecast && (!forecast.affordable || forecast.runway < forecast.duration) ? 'warning' : ''}">${risk}</span></div><dl class="status-metrics"><div><dt>账面资金</dt><dd data-testid="current-cash">${state.cash.toFixed(2)} 万</dd><small>月开支 ${forecast ? change(`${game.burn(state).toFixed(2)} 万`, `${forecast.monthly.toFixed(2)} 万`) : `${game.burn(state).toFixed(2)} 万`}</small></div><div><dt>研发团队</dt><dd data-testid="current-team">${forecast ? change(`${game.TEAMS[state.team].people} 人`, `${game.TEAMS[plan.team].people} 人`) : `${game.TEAMS[state.team].people} 人`}</dd><small>${forecast && forecast.cost ? `本回合一次性投入 ${forecast.cost.toFixed(2)} 万` : game.TEAMS[state.team].name}</small></div><div><dt>资金可撑</dt><dd data-testid="current-runway">${state.over ? '已停止经营' : change(months(runway), months(forecast.runway))}</dd><small>计入旧作，不计未发售收入</small></div><div><dt>预计发售</dt><dd data-testid="current-release">${state.over ? '已停止经营' : change(current ? `第 ${current.releaseMonth} 月` : '未立项', `第 ${forecast.releaseMonth} 月`)}</dd><small>${forecast ? `还需 ${forecast.duration} 个月 · ${forecast.releaseMarket.label}` : '创业档案已结案'}</small></div></dl></section>`;
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

  function optionPrice(key, value) {
    const candidate = { ...plan, [key]: value };
    if (key === 'type' || key === 'scale') return `立项 ${game.planCost({ ...state, project: null }, candidate).toFixed(2)} 万`;
    if (key === 'team') return `${game.burn({ ...state, team: value, pay: plan.pay }).toFixed(2)} 万/月`;
    if (key === 'pay') return `${game.PAY[value].wage.toFixed(2)} 万/人/月`;
    if (key === 'material') return `${(game.MATERIALS[value].cost * game.SCALES[plan.scale].cost).toFixed(2)} 万 · ${state.project ? '已确定' : '一次性'}`;
    if (state.project) {
      if (value < state.project.promo) return `${(game.PROMO[value].cost * game.SCALES[plan.scale].cost).toFixed(2)} 万 · 不可退`;
      if (value === state.project.promo) return `${(game.PROMO[value].cost * game.SCALES[plan.scale].cost).toFixed(2)} 万 · 已投入`;
      return `补 ${game.planCost(state, candidate).toFixed(2)} 万`;
    }
    return `${(game.PROMO[value].cost * game.SCALES[plan.scale].cost).toFixed(2)} 万 · 一次性`;
  }

  function segmentField(key, title, items, detail, symbol) {
    const locked = Boolean(state.project) && ['type', 'scale', 'material'].includes(key);
    const values = Array.isArray(items) ? items.map((item, index) => ({ value: index, name: item.name })) : Object.entries(items).map(([value, item]) => ({ value, name: item.name }));
    const meta = locked ? '本作已确定' : key === 'promo' && state.project ? '仅可追加' : ['team', 'pay'].includes(key) ? '持续生效' : '立项时确定';
    return `<fieldset><legend>${icon(symbol)}${title}<span class="field-meta">${meta}</span></legend><div class="segments">${values.map(item => {
      const disabled = locked || key === 'promo' && state.project && item.value < state.project.promo;
      return `<label class="segment"><input type="radio" name="${key}" value="${item.value}" ${plan[key] === item.value ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${item.name}<small class="option-price">${optionPrice(key, item.value)}</small></span></label>`;
    }).join('')}</div><p class="field-detail">${escape(detail)}</p></fieldset>`;
  }

  function fields() {
    const materialCost = game.MATERIALS[plan.material].cost * game.SCALES[plan.scale].cost;
    const promoCost = game.PROMO[plan.promo].cost * game.SCALES[plan.scale].cost;
    const projectFields = state.project ? '' : segmentField('type', '作品方向', game.TYPES, game.TYPES[plan.type].description, 'gamepad-2') +
      segmentField('scale', '项目规模', game.SCALES, ['较短周期，较小市场。', '扩大内容与市场，也延长资金空窗。', '大体量作品，需要充足现金储备。'][plan.scale], 'layers');
    const material = state.project ? '' : segmentField('material', '物料采购', game.MATERIALS, materialCost ? `一次性 ${materialCost.toFixed(2)} 万，减少工作量，不直接提高品质。` : '自制为主，无采购费用。', 'package');
    const operations = segmentField('team', '研发团队', game.TEAMS, `${game.TEAMS[plan.team].people} 人，正常每月 ${game.TEAMS[plan.team].people} 人月；月开支含工资与基础支出。`, 'users') +
      segmentField('pay', '团队待遇', game.PAY, ['控制成本，后续完成部分的品质较低。', '成本与能力折中。', '提升后续工作的品质，不重算已完成部分。'][plan.pay], 'coffee') +
      segmentField('promo', '宣发安排', game.PROMO, promoCost ? `宣发总投入 ${promoCost.toFixed(2)} 万；已投部分不重复扣费。` : '自然曝光，无宣发支出。', 'megaphone');
    return projectFields + `<details class="detail-panel" data-panel="budget" ${expandedPanels.has('budget') ? 'open' : ''}><summary>${icon('sliders-horizontal')}${state.project ? '调整团队与预算' : '团队、采购与宣发'}<span>${game.TEAMS[plan.team].people} 人 · ${game.burn({ ...state, team: plan.team, pay: plan.pay }).toFixed(2)} 万/月</span></summary>${material}${operations}</details>`;
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
    return `<section class="preview" aria-labelledby="preview-title">
      <div class="preview-heading" id="preview-title">${icon('scan-eye')}本回合方案<span class="field-meta">${changed || !state.project ? '尚未执行' : '延续当前安排'}</span></div>
      ${monthlyPreview()}
      ${gap < 1 || !preview.affordable ? `<div class="notice ${note.tone}" role="status">${icon('triangle-alert')}<span>${note.text}</span></div>` : ''}
      ${changed && state.project && preview.duration === baseline.duration ? '<p class="estimate-note">本次调整不会提前发售，资金与品质仍会变化。</p>' : ''}
      <details class="detail-panel" data-panel="forecast" ${expandedPanels.has('forecast') ? 'open' : ''}><summary>${icon('chart-no-axes-combined')}研发与市场预估<span>第 ${preview.releaseMonth} 月 · ${preview.releaseMarket.label}</span></summary>
        <div class="forecast-summary"><span>资金可撑 <strong data-testid="preview-runway">${months(preview.runway)}</strong></span><span>研发还需 <strong data-testid="preview-duration">${preview.duration} 个月</strong></span></div>
        <dl class="workload"><div><dt>总工作量</dt><dd data-testid="total-work">${Number(preview.workload.total.toFixed(2))} 人月</dd></div><div><dt>剩余工作量</dt><dd data-testid="remaining-work">${Number(preview.workload.remaining.toFixed(2))} 人月</dd></div><div><dt>本月有效产能</dt><dd data-testid="monthly-capacity">${Number(preview.workload.monthly.toFixed(2))} 人月/月</dd></div></dl>
        ${timeline(preview)}<div class="outlook"><div><small>预计作品竞争力</small><strong>${preview.qualityInfo.label}</strong><p>${preview.qualityInfo.detail}</p></div><div><small>市场触达</small><strong>${preview.reach}</strong><p>${preview.reachDetail}</p></div></div>
      </details>
      <div class="action-row"><button class="button ${state.event ? 'warning' : ''}" data-action="${state.event ? 'event' : 'advance'}" ${!state.event && !preview.affordable ? 'disabled' : ''}>${icon(state.event ? 'message-circle' : 'arrow-right')}${state.event ? '处理待决事件' : '下一回合'}</button>${state.project ? `<button class="button secondary" data-action="skip" ${state.event || !preview.affordable ? 'disabled' : ''}>${icon('fast-forward')}到下一决策点</button>` : ''}</div>
    </section>`;
  }

  function monthlyPreview() {
    const preview = game.forecast(state, plan);
    const income = game.catalogIncome(state, state.month);
    const change = income - preview.monthly - preview.cost;
    const work = Math.min(preview.workload.remaining, preview.workload.monthly);
    const progress = (preview.workload.total - preview.workload.remaining + work) / preview.workload.total * 100;
    return `<section class="turn-preview" data-testid="monthly-preview"><div class="cash-summary"><div><span>旧作收入</span><strong>+${income.toFixed(2)} 万</strong></div><div><span>本次待扣</span><strong>−${(preview.monthly + preview.cost).toFixed(2)} 万</strong></div><div><span>结算后余额</span><strong>${(state.cash + change).toFixed(2)} 万</strong></div></div><p class="brief-text">${state.event ? '本月暂停；先处理事件，再执行当前方案。' : !preview.affordable ? '一次性投入超出可用资金，方案不可执行。' : state.cash + change < 0 ? '资金不足以支付工资，本月无法推进研发。' : `工资与基础开支 ${preview.monthly.toFixed(2)} 万${preview.cost ? `，一次性投入 ${preview.cost.toFixed(2)} 万` : ''}。预计完成度 ${Number(progress.toFixed(1))}%${preview.duration === 1 ? '，本月自动发售；首发回款尚未计入。' : `，本月推进 ${Number(work.toFixed(2))} 人月。`}`}</p></section>`;
  }

  function reportSection() {
    if (!state.report) return '';
    const report = state.report;
    const opening = report.release ? report.release.received : 0;
    const income = report.totalIncome ?? report.income + opening;
    const expense = report.totalExpense ?? report.expense;
    const change = report.net ?? income - expense;
    const flow = (label, amount) => amount ? `<div class="brief-line"><span>${label}</span><strong>${amount > 0 ? '+' : '−'}${Math.abs(amount).toFixed(2)} 万</strong></div>` : '';
    return `<section class="turn-report" data-testid="last-report"><h3>${icon('notebook-pen')}第 ${report.month} 月结果${report.release ? '<span class="release-tag">新作已发售</span>' : ''}</h3>
      <div class="cash-summary"><div><span>收入合计</span><strong>+${income.toFixed(2)} 万</strong></div><div><span>${report.failed ? '应付合计' : '支出合计'}</span><strong>−${expense.toFixed(2)} 万</strong></div><div><span>资金净变化</span><strong data-testid="last-cash-change">${change > 0 ? '+' : ''}${change.toFixed(2)} 万</strong></div></div>
      <p class="brief-text">${report.failed ? '资金未能覆盖应付开支，研发已停止。' : `本月完成 ${Number(game.personMonths(report.work).toFixed(2))} 人月。${report.release ? `《${escape(report.release.name)}》已发售，首发到账 ${opening.toFixed(2)} 万。` : '作品按当前安排推进。'}`}</p>
      <details class="detail-panel" data-panel="report" ${expandedPanels.has('report') ? 'open' : ''}><summary>${icon('receipt-text')}收支明细${report.cashBefore !== undefined ? `<span>${report.cashBefore.toFixed(2)} → ${report.cashAfter.toFixed(2)} 万</span>` : ''}</summary>
        ${flow('旧作回款', report.income)}${flow('首发回款', opening)}${flow('事件收入', report.eventIncome)}${flow('立项与宣发追加', -report.setupCost)}${flow('提前测试', -report.testingCost)}${flow('事件支出', -report.eventCost)}<div class="brief-line"><span>${report.failed ? '应付工资及基础支出' : '工资及基础支出'}</span><strong data-testid="last-expense">−${report.expense.toFixed(2)} 万</strong></div>
        <p class="brief-text">${report.totalExpense === undefined ? '旧档月报未记录当月即时收付。' : '含本月已即时收付的测试、立项和事件款项；不会再次扣款。'}</p>
      </details>${report.release ? '<button class="text-action" data-action="release">查看发售复盘</button>' : ''}</section>`;
  }

  function testingSection() {
    if (!state.project) return '';
    const offer = game.testingOffer(state);
    const tested = state.project.test;
    return `<section class="testing-section"><div><h3>${icon('flask-conical')}${tested ? '测试反馈' : '提前测试'}</h3><p class="brief-text">${tested ? `${escape(tested.finding)}${tested.decision ? `已决定：${escape(tested.decision)}。` : ''}` : offer.available ? '定向玩家试玩，获得明确反馈与少量曝光；每作一次，不保证销量。' : offer.reason}</p></div>${tested ? '' : `<button class="button secondary" data-action="playtest" ${!offer.available || dirty() ? 'disabled' : ''}>${icon('flask-conical')}测试 · ${offer.cost.toFixed(2)} 万</button>`}${!tested && dirty() ? '<p class="brief-text">本回合方案尚未执行；测试采用当前已执行安排。</p>' : ''}</section>`;
  }

  function showRelease() {
    const book = state.report && state.report.release;
    if (!book) return;
    const openingProfit = book.received - book.invested;
    resultDialog.innerHTML = `<div class="dialog-heading"><span class="eyebrow">第 ${book.released} 月 / 正式发售</span><button class="icon-button" data-action="close-result" title="关闭" aria-label="关闭发售复盘">${icon('x')}</button></div><h2 id="result-title">《${escape(book.name)}》发售成功</h2><div class="release-receipt"><span>首发实际到账</span><strong>+${book.received.toFixed(2)} 万</strong></div><div class="brief-line"><span>累计项目投入</span><strong>${book.invested.toFixed(2)} 万</strong></div><div class="brief-line"><span>${openingProfit >= 0 ? '首发已回本 · 结余' : '尚未回本 · 缺口'}</span><strong>${Math.abs(openingProfit).toFixed(2)} 万</strong></div><p class="brief-text">这是首发回款，不是最终利润。后续销量将逐月到账。</p><div class="release-review"><h3>这次交付</h3><p>${escape(game.qualityLabel(book.quality).label)}，${escape(book.promotion || '按原宣发安排')}；发售时市场${escape(book.launchMarket || game.market(book.type, book.released).label)}。</p><p>${book.tested ? '已做提前测试，玩家反馈与处理决定留在经营记录中。' : '未安排提前测试，本作按研发与宣发安排直接交付。'}品质、触达、档期和市场波动共同影响回款。</p></div>`;
    if (!resultDialog.open) resultDialog.showModal();
    icons();
  }

  function catalogSection() {
    return `<section class="sidebar-section"><h3>${icon('library')}作品档案 <span class="field-meta">${state.catalog.length ? `${state.catalog.length} 部` : '尚待落笔'}</span></h3>${state.catalog.length ? state.catalog.slice(0, 5).map(book => {
      const ratio = book.invested ? book.received / book.invested : 0;
      const recovered = ratio >= 1;
      const waiting = state.month - book.released <= 11;
      return `<article class="catalog-item"><h4>《${escape(book.name)}》</h4><p>第 ${book.released} 月发售 · ${game.TYPES[book.type].name} · ${game.SCALES[book.scale].name}</p><p>${game.qualityLabel(book.quality).label}</p><p>累计回款 ${book.received.toFixed(2)} 万 / 投入 ${book.invested.toFixed(2)} 万</p><p class="catalog-result ${recovered ? '' : 'loss'}">${recovered ? `已回本，项目结余 ${(book.received - book.invested).toFixed(2)} 万` : `累计收回约 ${Math.round(ratio * 100)}%，尚差 ${(book.invested - book.received).toFixed(2)} 万回本`}</p><p>${waiting ? '后续销售仍在逐月回款' : '主要销售周期已结束'}</p></article>`;
    }).join('') : `<div class="empty-catalog">${icon('book-open')}<p>这里会留下第一款作品，以及它为公司带来的下一次机会。</p></div>`}</section>`;
  }

  function sidebar() {
    return `<aside class="sidebar"><section class="studio-view"><div class="studio-caption"><strong>工作室近况</strong></div><img class="office-art" src="office.svg" alt="小型工作室的电脑、手稿和窗边绿植" width="380" height="230"></section><section class="sidebar-section"><h3>${icon('radio')}市场风向</h3>${Object.entries(game.TYPES).map(([key, type]) => {
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
    eventDialog.innerHTML = `<div class="dialog-heading"><span class="eyebrow">${event.id === 'cash' ? '现金危机 · 尚有退路' : event.id === 'playtest' ? '付费测试 / 玩家反馈' : '来自办公室之外'}</span><button class="icon-button" data-action="close-event" title="暂时收起" aria-label="暂时收起事件">${icon('x')}</button></div><h2 id="event-title">${escape(event.title)}</h2><p>${escape(event.text)}</p><div class="event-options">${event.choices.map(choice => `<button class="event-option" data-action="resolve" data-choice="${escape(choice.id)}" ${choice.disabled || (choice.cost || 0) > state.cash ? 'disabled' : ''}><span><strong>${escape(choice.title)}${choice.disabled ? ' · 已使用' : ''}</strong><small>${escape(choice.detail)}</small></span>${icon('arrow-up-right')}</button>`).join('')}</div>`;
    const key = `${state.month}-${event.id}`;
    if (shownEvent !== key) {
      shownEvent = key;
      if (!eventDialog.open) eventDialog.showModal();
    }
  }

  function render() {
    const stage = state.over ? '经营结束' : state.catalog.length >= 3 ? '站稳脚跟' : state.catalog.length ? '第一批玩家' : '创业起步';
    const title = state.project ? `《${escape(state.project.name)}》` : '下一款，做什么？';
    const projectHeader = state.project ? `<div class="project-progress"><div><span>${game.TYPES[state.project.type].name} · ${game.SCALES[state.project.scale].name} · ${game.MATERIALS[state.project.material].name}</span><strong>${Number((state.project.done / state.project.total * 100).toFixed(1))}%</strong></div><progress max="100" value="${state.project.done / state.project.total * 100}" aria-label="研发完成度"></progress></div>` : `<div class="project-name"><label for="project-name">作品名</label><input id="project-name" maxlength="24" value="${escape(plan.name)}" placeholder="给新作品起个名字"></div>`;
    const workspace = state.over ? `<section class="workspace"><div class="closed-company"><span class="eyebrow">创业档案 / 已结案</span><h2>这间办公室，暂时关灯。</h2><p>公司无法支付本月开支。此前的资金预警、研发投入与作品回款，都留在记录里。下一次，可以带着这段经验重新开始。</p><div class="closed-stats"><div><strong>${state.month - 1}</strong>个月创业经历</div><div><strong>${state.catalog.length}</strong>部已发售作品</div></div>${reportSection()}<button class="button" data-action="restart">${icon('rotate-ccw')}重新创业</button></div></section>` : `<section class="workspace">${reportSection()}<div class="section-heading"><h2>${title}</h2><span class="project-state">${state.project ? '研发进行中' : '新作立项'}</span></div>${projectHeader}<div class="choices">${fields()}</div>${testingSection()}${previewSection()}</section>`;
    root.innerHTML = `${companyStatus()}<div class="month-heading"><h2>创业第 ${state.over ? state.month - 1 : state.month} 月<span>月度经营札记</span></h2><span class="stage">${stage}</span></div>${state.event ? `<div class="event-banner"><div><strong>${escape(state.event.title)}</strong><p>有一项抉择待处理，经营安排仍可调整。</p></div><button class="button secondary" data-action="event">${icon('message-circle')}处理事件</button></div>` : ''}<div class="dashboard">${workspace}${sidebar()}</div>${historySection()}`;
    renderEvent();
    icons();
    document.getElementById('save-status').textContent = storageAvailable ? '本机自动存档' : '存档不可用 · 可导出';
  }

  function updateState(next, message, draft) {
    const released = next.catalog.length > state.catalog.length && next.report && next.report.release;
    state = next;
    plan = draft || game.defaultPlan(state);
    save();
    render();
    if (released) showRelease();
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
      if (nameInput && !state.project) plan.name = nameInput.value;
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

  document.addEventListener('toggle', event => {
    const target = event.target;
    if (!target.matches('details[data-panel]')) return;
    if (target.open) expandedPanels.add(target.dataset.panel);
    else expandedPanels.delete(target.dataset.panel);
  }, true);

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    try {
      switch (button.dataset.action) {
        case 'advance': {
          const month = state.month;
          const next = game.takeTurn(state, plan);
          updateState(next, next.month === month ? '方案已执行；先处理事件，再继续本月。工资尚未扣除。' : '本月已结算，收支与研发结果已更新。');
          break;
        }
        case 'skip': {
          const month = state.month;
          const next = game.skipToDecision(state, plan);
          updateState(next, `已推进 ${next.month - month} 个月，停在${next.over ? '经营终点' : next.event ? '待决事件' : next.report && next.report.release ? '新作发售' : '测试机会或资金风险'}。逐月账单保留在经营记录中。`);
          break;
        }
        case 'playtest':
          updateState(game.runPlaytest(state), '测试费用已支付，玩家反馈已送达。');
          break;
        case 'release':
          showRelease();
          break;
        case 'close-result':
          resultDialog.close();
          break;
        case 'event':
          if (!eventDialog.open) eventDialog.showModal();
          break;
        case 'close-event':
          eventDialog.close();
          break;
        case 'resolve': {
          const next = game.resolveEvent(state, button.dataset.choice);
          const change = next.cash - state.cash;
          updateState(next, `抉择已记录。${change ? `资金${change > 0 ? '到账' : '支付'} ${Math.abs(change).toFixed(2)} 万。` : ''}`, plan);
          break;
        }
        case 'restart':
          resetDialog.showModal();
          break;
        case 'confirm-restart':
          resetDialog.close();
          shownEvent = '';
          historyExpanded = false;
          expandedPanels.clear();
          if (resultDialog.open) resultDialog.close();
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
      if (resultDialog.open) resultDialog.close();
      updateState(restored, '存档已恢复。');
    } catch (error) {
      notify(error.message || '存档读取失败。');
    }
    event.target.value = '';
  });

  render();
  if (loadNotice) notify(loadNotice);
})();