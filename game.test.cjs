const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('./game.js');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function start(changes = {}, state = game.createGame(42)) {
  return game.applyPlan(state, { ...game.defaultPlan(state), ...changes });
}

test('preview is pure and compares all three staffing choices', () => {
  const state = game.createGame(42);
  const saved = JSON.stringify(state);
  const previews = [0, 1, 2].map(team => game.forecast(state, { ...game.defaultPlan(state), team }));
  assert.equal(JSON.stringify(state), saved);
  assert.ok(previews[0].duration > previews[1].duration);
  assert.ok(previews[1].monthly < previews[2].monthly);
  assert.ok(previews[0].runway > previews[2].runway);
});

test('materials are paid once and cannot buy a finished project', () => {
  const state = start({ material: 2, promo: 0 });
  assert.equal(state.cash, game.createGame(42).cash - game.MATERIALS[2].cost * game.SCALES[0].cost);
  assert.ok(state.project.total > 0);
  assert.equal(state.project.done, 0);
  const repeated = game.applyPlan(state, game.defaultPlan(state));
  assert.equal(repeated.cash, state.cash);
  assert.equal(repeated.project.invested, state.project.invested);
  assert.throws(() => game.applyPlan(state, { ...game.defaultPlan(state), material: 0 }));
});

test('payroll is charged only on month advance', () => {
  const state = start({ promo: 0 });
  const changed = game.applyPlan(state, { ...game.defaultPlan(state), pay: 2 });
  assert.equal(changed.cash, state.cash);
  const next = game.advance(changed);
  assert.equal(next.cash, Number((changed.cash - game.burn(changed)).toFixed(2)));
  assert.equal(next.month, 2);
});

test('marketing upgrades pay only the difference and cannot be refunded', () => {
  const state = start({ promo: 1 });
  const next = game.applyPlan(state, { ...game.defaultPlan(state), promo: 2 });
  assert.equal(state.cash - next.cash, 20);
  assert.throws(() => game.applyPlan(next, { ...game.defaultPlan(next), promo: 0 }));
});

test('last-month salary increase does not rewrite completed work quality', () => {
  let state = start({ pay: 0, promo: 0 });
  state = game.advance(game.advance(state));
  const previousWork = state.project.qualityWork;
  const next = game.applyPlan(state, { ...game.defaultPlan(state), pay: 2 });
  assert.equal(next.project.qualityWork, previousWork);
  assert.ok(game.quality(next) < game.PAY[2].ability);
  assert.ok(game.quality(next) > game.PAY[0].ability);
});

test('projects release automatically, tail revenue arrives, next project can start', () => {
  let state = start();
  for (let turns = 0; turns < 12 && state.project && !state.over; turns++) {
    if (state.event) state = game.resolveEvent(state, state.event.choices.find(choice => !choice.cost && !choice.disabled).id);
    state = game.advance(state);
  }
  assert.equal(state.over, false);
  assert.equal(state.project, null);
  assert.equal(state.catalog.length, 1);
  if (state.event) state = game.resolveEvent(state, 'decline');
  const previous = state.catalog[0].received;
  const next = game.advance(state);
  assert.ok(next.catalog[0].received > previous);
  const sequel = start({ name: '第二部作品' }, next);
  assert.equal(sequel.project.name, '第二部作品');
  assert.equal(sequel.catalog.length, 1);
});

test('declining cash generates a recoverable crisis before insolvency', () => {
  let state = start({ type: 'action', scale: 2, promo: 0 });
  state.cash = game.burn(state) * 2.5;
  state = game.advance(state);
  assert.equal(state.over, false);
  assert.equal(state.event.id, 'cash');
  assert.throws(() => game.advance(state));
  const recovered = game.resolveEvent(state, 'bridge');
  assert.equal(recovered.bridgeUsed, true);
  assert.ok(recovered.cash > state.cash);
  assert.equal(recovered.event, null);
});

test('an expensive commitment offers rescue before the next payroll', () => {
  const state = start({ type: 'action', scale: 2, material: 1, promo: 1, team: 2 });
  assert.ok(state.cash < game.burn(state));
  assert.equal(state.event.id, 'cash');
  assert.equal(state.over, false);
  const recovered = game.resolveEvent(state, 'contract');
  assert.equal(game.advance(recovered).over, false);
});

test('outsourcing trades one month of capacity for cash', () => {
  let state = start({ type: 'action', scale: 2, promo: 0 });
  state.cash = game.burn(state) * 2.5;
  state = game.advance(state);
  const recovered = game.resolveEvent(state, 'contract');
  assert.ok(recovered.cash > state.cash);
  assert.equal(recovered.pace, 0.3);
  assert.equal(game.advance(recovered).pace, 1);
});

test('ignoring cash problems can end the company with an explanatory report', () => {
  let state = game.createGame(1);
  state.cash = 1;
  state = game.advance(state);
  assert.equal(state.over, true);
  assert.equal(state.report.failed, true);
  assert.throws(() => game.advance(state));
});

test('saves round-trip and reject malformed data', () => {
  const state = start();
  assert.equal(game.validState(JSON.parse(JSON.stringify(state))), true);
  assert.equal(game.validState({ version: 1 }), false);
  assert.equal(game.validState({ ...state, team: 99 }), false);
  assert.equal(game.validState({ ...state, cash: NaN }), false);
  assert.equal(game.validState({ ...state, project: { ...state.project, total: 0 } }), false);
  assert.equal(game.validState({ ...state, report: { month: 2, expense: 0, income: 0, work: 0, failed: false } }), false);
  assert.equal(game.validState({ ...state, report: { month: 2, expense: 8, income: 0, work: 0, failed: false, release: { name: '坏数据' } } }), false);
});

test('randomized runs preserve finite state and bounded decisions', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let state = game.createGame(seed);
    for (let turn = 0; turn < 48 && !state.over; turn++) {
      if (!state.project) {
        const plan = { ...game.defaultPlan(state), promo: state.cash > 20 ? 1 : 0, type: Object.keys(game.TYPES)[seed % 3] };
        if (game.planCost(state, plan) <= state.cash) state = game.applyPlan(state, plan);
      }
      if (state.event) {
        const choices = state.event.choices.filter(choice => !choice.disabled && (choice.cost || 0) <= state.cash);
        state = game.resolveEvent(state, choices[seed % choices.length].id);
      }
      state = game.advance(state);
      assert.equal(game.validState(state), true, `seed ${seed}, turn ${turn}`);
      assert.ok(state.history.length <= 80);
    }
  }
});

function mountUi(state) {
  let saved = JSON.stringify(state);
  const nodes = new Map();
  const handlers = {};
  const document = {
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {
        innerHTML: '', textContent: '', value: '', open: false,
        addEventListener() {}, classList: { add() {}, remove() {} },
        showModal() { this.open = true; }, close() { this.open = false; },
        querySelector() { return { focus() {} }; }
      });
      return nodes.get(id);
    },
    addEventListener(type, handler) { handlers[type] = handler; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), {
    window: { StudioGame: game, scrollTo() {} }, document,
    localStorage: { getItem() { return saved; }, setItem(key, value) { saved = value; } },
    setTimeout() {}, clearTimeout() {}
  });
  return {
    html: () => document.getElementById('game-root').innerHTML,
    status() { return this.html().match(/<section class="company-status"[\s\S]*?<\/section>/)[0]; },
    saved: () => saved,
    notification: () => document.getElementById('notification').textContent,
    dialog: id => document.getElementById(id),
    change(name, value) { handlers.change({ target: { matches() { return true; }, name, value: String(value) } }); },
    click(action, choice) { handlers.click({ target: { closest() { return { disabled: false, dataset: { action, choice } }; } } }); }
  };
}

test('new companies start with one hundred wan and old balances are preserved', () => {
  const state = game.createGame(42);
  assert.equal(state.cash, 100);
  assert.ok(mountUi(state).status().includes('100.00 万'));
  const old = { ...state, cash: 73.25 };
  const ui = mountUi(old);
  assert.ok(ui.status().includes('73.25 万'));
  assert.equal(JSON.parse(ui.saved()).cash, old.cash);
  assert.ok(!ui.html().includes('data-action="apply"'));
  assert.ok(!ui.html().includes('资金单位'));
  ui.click('advance');
  assert.ok(ui.html().includes(`data-testid="last-expense">−${game.burn(state).toFixed(2)} 万`));
  assert.ok(!ui.html().includes('资金单位'));
});

test('company status compares drafts without charging or saving them', () => {
  const ui = mountUi(game.createGame(42));
  const before = ui.status();
  const saved = ui.saved();
  assert.ok(before.includes('未立项'));
  assert.ok(before.includes('成立第 1 年 · 第 1 月'));
  ui.change('team', 1);
  ui.change('material', 1);
  assert.notEqual(ui.status(), before);
  assert.ok(ui.status().includes('→ 7 人'));
  assert.ok(ui.status().includes('data-testid="current-cash">100.00 万'));
  assert.equal(ui.saved(), saved);
  ui.click('advance');
  const confirmed = JSON.parse(ui.saved());
  assert.ok(ui.status().includes(`${game.TEAMS[confirmed.team].people} 人`));
  assert.ok(ui.status().includes(confirmed.cash.toFixed(2)));
  assert.ok(!ui.status().includes('未立项'));
  assert.equal(confirmed.month, 2);
  assert.equal(confirmed.report.setupCost, 20);
  const after = ui.status();
  ui.change('team', 2);
  assert.notEqual(ui.status(), after);
  assert.ok(ui.status().includes('→ 14 人'));
});

test('monthly preview is pure and the full result leads the next decision', () => {
  const state = start();
  const original = JSON.stringify(state);
  const ui = mountUi(state);
  assert.equal(ui.saved(), original);
  assert.equal(JSON.stringify(state), original);
  assert.ok(ui.html().includes('data-testid="monthly-preview"'));
  assert.ok(!ui.status().includes('资金净变化'));
  ui.click('advance');
  const next = JSON.parse(ui.saved());
  assert.equal(next.seed, state.seed);
  const html = ui.html();
  assert.ok(html.indexOf('data-testid="last-report"') < html.indexOf('class="choices"'));
  assert.ok(html.indexOf('data-testid="last-report"') < html.indexOf('data-action="advance"'));
  assert.ok(html.indexOf('data-testid="last-report"') < html.indexOf('class="sidebar"'));
  assert.ok(html.includes(`data-testid="last-expense">−${next.report.expense.toFixed(2)}`));
  assert.ok(html.includes(`data-testid="last-cash-change">${next.report.net > 0 ? '+' : ''}${next.report.net.toFixed(2)}`));
});

test('status handles year rollover and failure without inventing a release', () => {
  const anniversary = mountUi({ ...game.createGame(42), month: 13 });
  assert.ok(anniversary.status().includes('成立第 2 年 · 第 1 月'));
  const failed = game.advance({ ...game.createGame(42), cash: 0 });
  const ui = mountUi(failed);
  assert.ok(ui.status().includes('成立第 1 年 · 第 1 月'));
  assert.ok(ui.status().includes('已停止经营'));
  assert.ok(ui.html().includes('应付工资及基础支出'));
  assert.ok(!ui.html().includes('data-testid="monthly-preview"'));
});

function optionLabel(ui, key, value) {
  const label = ui.html().match(new RegExp('<label class="segment"><input type="radio" name="' + key + '" value="' + value + '"[\\s\\S]*?</label>'));
  assert.ok(label, `Missing option ${key}:${value}`);
  return label[0];
}

test('every planning option has an amount with the correct billing period', () => {
  const state = game.createGame(42);
  const ui = mountUi(state);
  for (const [key, values] of Object.entries({ type: Object.keys(game.TYPES), scale: [0, 1, 2], material: [0, 1, 2], team: [0, 1, 2], pay: [0, 1, 2], promo: [0, 1, 2] })) {
    for (const value of values) assert.match(optionLabel(ui, key, value), /class="option-price">[^<]*万/);
  }
  const saved = ui.saved();
  const status = ui.status();
  ui.change('scale', 2);
  ui.change('pay', 2);
  assert.ok(optionLabel(ui, 'material', 1).includes(`${(game.MATERIALS[1].cost * game.SCALES[2].cost).toFixed(2)} 万 · 一次性`));
  assert.ok(optionLabel(ui, 'promo', 2).includes(`${(game.PROMO[2].cost * game.SCALES[2].cost).toFixed(2)} 万 · 一次性`));
  assert.ok(optionLabel(ui, 'team', 1).includes(`${game.burn({ ...state, team: 1, pay: 2 }).toFixed(2)} 万/月`));
  assert.ok(optionLabel(ui, 'pay', 2).includes(`${game.PAY[2].wage.toFixed(2)} 万/人/月`));
  const plan = { ...game.defaultPlan(state), scale: 2, pay: 2 };
  assert.ok(optionLabel(ui, 'scale', 1).includes(`立项 ${game.planCost(state, { ...plan, scale: 1 }).toFixed(2)} 万`));
  assert.equal(ui.saved(), saved);
  assert.notEqual(ui.status(), status);
});

test('in-progress marketing prices show paid tiers and only the upgrade difference', () => {
  const state = start({ scale: 1, promo: 1 });
  const ui = mountUi(state);
  assert.ok(optionLabel(ui, 'promo', 0).includes('不可退'));
  assert.ok(optionLabel(ui, 'promo', 1).includes('已投入'));
  const cost = game.planCost(state, { ...game.defaultPlan(state), promo: 2 });
  assert.ok(optionLabel(ui, 'promo', 2).includes(`补 ${cost.toFixed(2)} 万`));
  ui.change('promo', 2);
  assert.ok(optionLabel(ui, 'promo', 2).includes(`补 ${cost.toFixed(2)} 万`));
  assert.equal(JSON.parse(ui.saved()).cash, state.cash);
});

test('person-month conversion preserves schedules, progress and old saves', () => {
  let state = start({ type: 'action', material: 1 });
  state = game.advance(state);
  const saved = JSON.stringify(state);
  const preview = game.forecast(state, game.defaultPlan(state));
  assert.equal(preview.workload.total, game.personMonths(state.project.total));
  assert.equal(preview.workload.remaining, game.personMonths(state.project.total - state.project.done));
  assert.equal(preview.workload.monthly, game.personMonths(game.speed(state)));
  assert.equal(preview.duration, Math.ceil(preview.workload.remaining / preview.workload.monthly));
  assert.equal(preview.workload.monthly, game.TEAMS[state.team].people);
  const slowed = { ...state, pace: 0.3 };
  assert.ok(Math.abs(game.forecast(slowed, game.defaultPlan(slowed)).workload.monthly - preview.workload.monthly * slowed.pace) < 1e-10);
  assert.equal(game.validState(JSON.parse(saved)), true);
  const ui = mountUi(state);
  assert.equal(ui.saved(), saved);
  assert.ok(ui.html().includes(`data-testid="remaining-work">${Number(preview.workload.remaining.toFixed(2))} 人月`));
  assert.ok(ui.html().includes(`完成 ${Number(game.personMonths(state.report.work).toFixed(2))} 人月`));
  assert.ok(ui.html().includes(`data-testid="monthly-capacity">${Number(preview.workload.monthly.toFixed(2))} 人月/月`));
  assert.equal(JSON.stringify(state), saved);
});

test('monthly production is linear in headcount and event availability', () => {
  for (const [team, { people }] of game.TEAMS.entries()) {
    const state = start({ type: 'action', scale: 2, promo: 0, team }, { ...game.createGame(42), cash: 1000 });
    const preview = game.forecast(state, game.defaultPlan(state));
    assert.equal(preview.workload.monthly, people);
    assert.equal(game.personMonths(game.advance(state).report.work), people);
    assert.equal(preview.duration, Math.ceil(preview.workload.remaining / people));
    const slowed = { ...state, pace: 0.3 };
    assert.ok(Math.abs(game.personMonths(game.advance(slowed).report.work) - people * slowed.pace) < 1e-10);
    assert.ok(Math.abs(game.forecast(slowed, game.defaultPlan(slowed)).workload.monthly - people * slowed.pace) < 1e-10);
    assert.equal(game.advance(slowed).pace, 1);
  }
});

test('one turn commits the draft and advances without a separate confirmation', () => {
  const state = game.createGame(42);
  const plan = { ...game.defaultPlan(state), team: 1, material: 1 };
  const saved = JSON.stringify(state);
  const next = game.takeTurn(state, plan);
  assert.equal(next.month, state.month + 1);
  assert.equal(next.team, plan.team);
  assert.equal(next.cash, Number((state.cash - game.planCost(state, plan) - game.burn(next)).toFixed(2)));
  assert.equal(JSON.stringify(state), saved);
  assert.throws(() => game.takeTurn(state, { ...plan, scale: 2, material: 2, promo: 2 }));
  assert.equal(JSON.stringify(state), saved);
});

test('turn pauses for a newly created crisis before charging payroll', () => {
  const state = game.createGame(42);
  const plan = { ...game.defaultPlan(state), type: 'action', scale: 2, material: 1, promo: 1, team: 2 };
  const paused = game.takeTurn(state, plan);
  assert.equal(paused.month, state.month);
  assert.equal(paused.event.id, 'cash');
  assert.equal(paused.cash, state.cash - game.planCost(state, plan));
  assert.equal(paused.project.done, 0);
  assert.throws(() => game.takeTurn(paused));
  const rescued = game.resolveEvent(paused, 'bridge');
  const next = game.takeTurn(rescued);
  assert.equal(next.month, state.month + 1);
  assert.equal(next.cash, Number((rescued.cash - game.burn(rescued)).toFixed(2)));
});

test('monthly ledger reconciles setup, testing and event transactions', () => {
  let state = game.takeTurn(game.createGame(42));
  assert.equal(state.report.cashBefore, game.createGame(42).cash);
  assert.equal(Number((state.report.cashAfter - state.report.cashBefore).toFixed(2)), state.report.net);
  assert.ok(state.report.setupCost > 0);
  assert.equal(game.testingOffer(state).available, true);
  const saved = JSON.stringify(state);
  const offer = game.testingOffer(state);
  assert.equal(JSON.stringify(state), saved);
  const tested = game.runPlaytest(state);
  assert.equal(state.cash - tested.cash, offer.cost);
  assert.equal(tested.project.invested, Number((state.project.invested + offer.cost).toFixed(2)));
  assert.notEqual(tested.seed, state.seed);
  assert.throws(() => game.runPlaytest(tested));
  state = game.resolveEvent(tested, 'test-promo');
  state = game.takeTurn(state);
  assert.equal(state.report.testingCost, offer.cost);
  assert.equal(state.report.eventCost, offer.cost / 2);
  assert.ok(Math.abs(state.report.cashAfter - state.report.cashBefore - state.report.net) < 1e-8);
  assert.equal(state.project.test.decision, '用试玩素材扩大曝光');
  assert.equal(game.validState(JSON.parse(JSON.stringify(state))), true);
  assert.throws(() => game.runPlaytest(state));
});

test('testing fixes trade one month of capacity for persistent quality', () => {
  const state = game.takeTurn(game.createGame(42));
  const tested = game.runPlaytest(state);
  const gain = tested.event.choices[0].quality;
  const fixed = game.resolveEvent(tested, 'test-fix');
  assert.equal(fixed.project.bonus, state.project.bonus + gain);
  assert.ok(game.speed(fixed) < game.speed(state));
  const next = game.takeTurn(fixed);
  assert.equal(next.pace, 1);
  assert.equal(next.project.bonus, fixed.project.bonus);
  assert.equal(game.validState({ ...next, pending: { cashBefore: 0, setupCost: -1 } }), false);
  assert.equal(game.validState({ ...next, project: { ...next.project, test: { month: 1 } } }), false);
});

test('fast forward stops at testing, events and release without hiding monthly bills', () => {
  let state = game.skipToDecision(game.createGame(42));
  assert.equal(state.month, 2);
  assert.equal(game.testingOffer(state).available, true);
  state = game.skipToDecision(state);
  assert.equal(state.project, null);
  assert.ok(state.report.release);
  assert.ok(state.history.filter(item => item.title.includes('账单')).length >= 3);
  const preview = game.forecast(game.createGame(42), game.defaultPlan(game.createGame(42)));
  assert.equal(preview.releaseMarket.label, game.market('story', preview.releaseMonth).label);
});

test('UI supports one-click turns, paid feedback and a release receipt', () => {
  const ui = mountUi(game.createGame(42));
  assert.ok(!ui.html().includes('data-action="apply"'));
  assert.match(ui.html(), /data-panel="budget" >/);
  ui.click('advance');
  assert.equal(JSON.parse(ui.saved()).month, 2);
  assert.ok(!ui.html().includes('name="type"'));
  assert.ok(!ui.html().includes('name="material"'));
  ui.click('playtest');
  assert.ok(ui.dialog('event-dialog').open);
  assert.ok(ui.dialog('event-dialog').innerHTML.includes('付费测试'));
  ui.click('resolve', 'test-stay');
  assert.ok(!ui.dialog('event-dialog').open);
  assert.ok(ui.html().includes('测试反馈'));
  ui.click('skip');
  const state = JSON.parse(ui.saved());
  assert.ok(state.report.release);
  assert.ok(ui.dialog('result-dialog').open);
  assert.ok(ui.dialog('result-dialog').innerHTML.includes(state.report.release.received.toFixed(2)));
  assert.ok(ui.dialog('result-dialog').innerHTML.includes('不是最终利润'));
  ui.click('close-result');
  assert.ok(!ui.dialog('result-dialog').open);
});

test('handling a paused event retains the draft for the resumed turn', () => {
  const ui = mountUi(game.resolveEvent(game.runPlaytest(game.takeTurn(game.createGame(42))), 'test-stay'));
  const cash = { ...game.createGame(42), cash: 15 };
  const paused = mountUi(game.takeTurn(cash));
  assert.ok(paused.dialog('event-dialog').open);
  paused.change('pay', 0);
  paused.click('resolve', 'bridge');
  assert.match(optionLabel(paused, 'pay', 0), /checked/);
  paused.click('advance');
  const next = JSON.parse(paused.saved());
  assert.equal(next.pay, 0);
  assert.equal(next.report.setupCost, 11);
  assert.equal(next.report.eventIncome, 35);
  assert.equal(next.report.cashBefore, 15);
  assert.equal(Number((next.cash - next.report.cashBefore).toFixed(2)), next.report.net);
  assert.ok(ui.html().includes('测试反馈'));
});