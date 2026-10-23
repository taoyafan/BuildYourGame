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
  const windowHandlers = {};
  let interval;
  const document = {
    hidden: false,
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {
        innerHTML: '', textContent: '', value: '', open: false,
        events: {}, addEventListener(type, handler) { this.events[type] = handler; }, classList: { add() {}, remove() {} },
        showModal() { this.open = true; }, close() { this.open = false; },
        querySelector() { return { focus() {} }; }
      });
      return nodes.get(id);
    },
    addEventListener(type, handler) { handlers[type] = handler; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8'), {
    window: { StudioGame: game, addEventListener(type, handler) { windowHandlers[type] = handler; } }, document,
    localStorage: { getItem() { return saved; }, setItem(key, value) { saved = value; } },
    setTimeout() {}, clearTimeout() {}, setInterval(handler) { interval = handler; }
  });
  return {
    html: () => document.getElementById('game-root').innerHTML,
    saved: () => saved,
    notification: () => document.getElementById('notification').textContent,
    dialog: () => document.getElementById('menu-dialog'),
    tick(count = 10) { for (let index = 0; index < count; index++) interval(); },
    blur() { windowHandlers.blur(); },
    hidden(value) { document.hidden = value; handlers.visibilitychange(); },
    cancel() { this.dialog().events.cancel({ preventDefault() {} }); },
    submit(form, values) { handlers.submit({ preventDefault() {}, target: { dataset: { form }, elements: { namedItem(name) { return { value: values[name] }; } } } }); },
    plan(type, scale) { handlers.change({ target: { name: 'type', form: { dataset: { form: 'project' }, elements: { namedItem(name) { return { value: name === 'type' ? type : String(scale) }; } } } } }); return document.getElementById('plan-preview').textContent; },
    async import(value) { await document.getElementById('import-file').events.change({ target: { files: [{ size: 100, async text() { return value; } }], value: '' } }); },
    click(action, data = {}) { handlers.click({ target: { closest() { return { disabled: false, dataset: { action, ...data } }; } } }); }
  };
}

test('UI starts paused and ordinary menus restore only the prior running state', () => {
  const ui = mountUi(staffedStudio());
  ui.tick(100);
  assert.equal(JSON.parse(ui.saved()).day, 1);
  ui.click('clock');
  ui.tick();
  assert.equal(JSON.parse(ui.saved()).day, 2);
  ui.click('menu', { menu: 'team' });
  ui.tick(100);
  assert.equal(JSON.parse(ui.saved()).day, 2);
  assert.match(ui.html(), /菜单中/);
  ui.cancel();
  ui.tick();
  assert.equal(JSON.parse(ui.saved()).day, 3);
  ui.click('clock');
  ui.click('menu', { menu: 'tools' });
  ui.click('close');
  ui.tick(100);
  assert.equal(JSON.parse(ui.saved()).day, 3);
});

test('UI company and project forms validate names and escape player text', () => {
  const ui = mountUi(game.createStudio(42));
  assert.equal(ui.dialog().open, true);
  ui.submit('company', { name: '' });
  assert.equal(JSON.parse(ui.saved()).company, '');
  ui.submit('company', { name: '<测试公司>' });
  ui.click('menu', { menu: 'project' });
  ui.submit('project', { name: '', type: 'story', scale: '0' });
  assert.equal(JSON.parse(ui.saved()).project, null);
  ui.submit('project', { name: '<script>作品</script>', type: 'story', scale: '0' });
  assert.match(ui.html(), /&lt;script&gt;/);
  assert.match(ui.html(), /尚无玩家评价/);
  assert.ok(!ui.html().includes('<script>作品'));
});

test('UI recruitment compares real capacity and cannot hire twice', () => {
  const ui = mountUi(game.nameCompany(game.createStudio(42), '公司'));
  ui.click('menu', { menu: 'recruit-code' });
  ui.click('recruit', { role: 'code' });
  const first = JSON.parse(ui.saved());
  const id = first.candidates.code.people[0].id;
  ui.click('menu', { menu: 'candidate', id });
  assert.match(ui.dialog().innerHTML, /预期变化/);
  assert.match(ui.dialog().innerHTML, /0.00 →/);
  ui.click('hire', { id });
  assert.equal(JSON.parse(ui.saved()).staff.length, 1);
  assert.match(ui.html(), /等待新项目/);
  ui.click('hire', { id });
  assert.equal(JSON.parse(ui.saved()).staff.length, 1);
  assert.match(ui.notification(), /不可录用/);
});

test('UI project preview includes truthful time and expense without spending', () => {
  const ui = mountUi(staffedStudio());
  const saved = ui.saved();
  ui.click('menu', { menu: 'project' });
  const preview = ui.plan('action', 0);
  assert.match(preview, /预计.*天/);
  assert.match(preview, /费用约.*万/);
  assert.match(preview, /不含可选采购/);
  assert.equal(ui.saved(), saved);
});

test('UI pauses critical events at high speed and stays paused after resolution', () => {
  const state = game.startProject(staffedStudio(), { name: '首作', type: 'story', scale: 0 });
  const ui = mountUi(state);
  ui.click('speed', { value: '12' });
  ui.click('clock');
  ui.tick(200);
  const paused = JSON.parse(ui.saved());
  assert.equal(paused.event.id, 'prototype');
  ui.tick(100);
  assert.deepEqual(JSON.parse(ui.saved()), paused);
  ui.click('decision', { choice: 'continue' });
  ui.click('close');
  ui.tick(100);
  assert.equal(JSON.parse(ui.saved()).day, paused.day);
  assert.equal(JSON.parse(ui.saved()).event, null);
  assert.match(ui.html(), /手动暂停/);
});

test('UI does not simulate offline and blur cancels menu auto-resume', () => {
  const ui = mountUi(staffedStudio());
  ui.click('clock');
  ui.tick();
  const day = JSON.parse(ui.saved()).day;
  ui.click('menu', { menu: 'team' });
  ui.blur();
  ui.click('close');
  ui.tick(100);
  assert.equal(JSON.parse(ui.saved()).day, day);
  ui.click('clock');
  ui.hidden(true);
  ui.tick(100);
  ui.hidden(false);
  ui.tick(100);
  assert.equal(JSON.parse(ui.saved()).day, day);
});

test('UI imports atomically and restores saves paused', async () => {
  const state = staffedStudio();
  const ui = mountUi(state);
  const saved = ui.saved();
  await ui.import('{"version":2}');
  assert.equal(ui.saved(), saved);
  await ui.import(JSON.stringify({ ...state, cash: 73.25 }));
  assert.equal(JSON.parse(ui.saved()).cash, 73.25);
  ui.tick(100);
  assert.equal(JSON.parse(ui.saved()).day, state.day);
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

test('UI launch receipt reports actual buyers, revenue and project recovery', () => {
  const state = game.startProject(staffedStudio(), { name: '首作', type: 'story', scale: 0 });
  state.project.done = state.project.total;
  state.project.codeValue = state.project.done * 70;
  const ui = mountUi(state);
  ui.click('launch');
  const released = JSON.parse(ui.saved());
  assert.equal(released.catalog.length, 1);
  assert.equal(released.project, null);
  assert.match(ui.dialog().innerHTML, /首发实际到账/);
  assert.match(ui.dialog().innerHTML, /正式玩家评价/);
  assert.match(ui.dialog().innerHTML, /不是最终利润/);
  ui.click('decision', { choice: 'continue' });
  ui.click('close');
  ui.click('menu', { menu: 'project' });
  ui.submit('project', { name: '第二部作品', type: 'sim', scale: '0' });
  assert.equal(JSON.parse(ui.saved()).catalog.length, 1);
  assert.equal(JSON.parse(ui.saved()).project.name, '第二部作品');
});

test('daily studio accrues only worked days and settles once at month end', () => {
  let state = game.createStudio(42);
  const original = JSON.stringify(state);
  let next = game.stepDay(state);
  assert.equal(JSON.stringify(state), original);
  assert.equal(next.cash, 100);
  assert.equal(next.day, 2);
  state = next;
  while (state.day <= 15) state = game.stepDay(state);
  state.staff.push({ wage: 3 });
  while (state.day <= 30) state = game.stepDay(state);
  assert.equal(state.report.payroll, 3);
  assert.equal(state.cash, 97);
  assert.equal(state.report.net, -3);
  assert.equal(state.accrued, 0);
  next = game.stepDay(state);
  assert.equal(next.cash, 97);
  assert.throws(() => game.stepDay({ ...state, event: { id: 'demo' } }));
});

function staffedStudio(seed = 42) {
  let state = game.nameCompany(game.createStudio(seed), '测试工作室');
  state = game.publishRecruitment(state, 'code');
  return game.hire(state, state.candidates.code.people[0].id);
}

function studioDays(state, count) {
  for (let index = 0; index < count; index++) {
    if (state.event) {
      const choice = state.event.choices.find(item => item.id === 'continue') || state.event.choices.find(item => item.id === 'plain') || state.event.choices[0];
      state = game.resolveStudioEvent(state, choice.id);
    }
    state = game.stepDay(state);
  }
  return state;
}

test('recruitment is seeded, stable and cannot hire a candidate twice', () => {
  const state = game.nameCompany(game.createStudio(42), '公司');
  const saved = JSON.stringify(state);
  const first = game.publishRecruitment(state, 'code');
  assert.equal(JSON.stringify(state), saved);
  assert.deepEqual(first, game.publishRecruitment(state, 'code'));
  assert.deepEqual(first, game.publishRecruitment(first, 'code'));
  const hired = game.hire(first, first.candidates.code.people[0].id);
  assert.throws(() => game.hire(hired, first.candidates.code.people[0].id));
  assert.ok(game.monthlyCost(hired) > game.monthlyCost(state));
  assert.notDeepEqual(game.publishRecruitment({ ...first, day: 15 }, 'code').candidates, first.candidates);
});

test('distinct roles produce their own work and tools improve only their role', () => {
  let state = game.startProject(staffedStudio(), { name: '首作', type: 'story', scale: 0 });
  const noArt = game.projectMetrics(state.project).visual;
  state = game.publishRecruitment(state, 'art');
  state = game.hire(state, state.candidates.art.people[0].id);
  assert.equal(game.projectMetrics(state.project).visual, noArt);
  const capacity = game.rates(state);
  const equipped = game.buyTool(state, 'code');
  assert.ok(game.rates(equipped).code > capacity.code);
  assert.equal(game.rates(equipped).art, capacity.art);
  assert.throws(() => game.buyTool(equipped, 'code'));
  const next = game.stepDay(equipped);
  assert.ok(next.project.done > 0);
  assert.ok(game.projectMetrics(next.project).visual > noArt);
  assert.ok(next.staff.every(person => person.work > 0));
  assert.equal(next.project.test, null);
  assert.equal(game.validStudio(next), true);
});

test('first project pauses at prototype and demo instead of skipping decisions', () => {
  let state = game.startProject(staffedStudio(), { name: '首作', type: 'story', scale: 0 });
  while (!state.event) state = game.stepDay(state);
  assert.equal(state.event.id, 'prototype');
  assert.throws(() => game.stepDay(state));
  state = game.resolveStudioEvent(state, 'continue');
  while (!state.event) state = game.stepDay(state);
  assert.equal(state.event.id, 'visual');
  state = game.resolveStudioEvent(state, 'plain');
  while (!state.event) state = game.stepDay(state);
  assert.equal(state.event.id, 'demo');
  state = game.resolveStudioEvent(state, 'continue');
  const original = JSON.stringify(state);
  const tested = game.testDemo(state, 30);
  assert.equal(JSON.stringify(state), original);
  assert.equal(tested.project.test.count, 30);
  assert.ok(tested.project.test.findings.some(item => item.key === 'visual' && item.value === 0));
  assert.ok(tested.project.followers > state.project.followers);
  assert.equal(tested.event.id, 'feedback');
  assert.equal(game.validStudio(tested), true);
  assert.throws(() => game.testDemo(tested));
  assert.throws(() => game.testDemo(game.resolveStudioEvent(tested, 'continue')));
});

test('polish, bug fixes and retesting reflect actual production', () => {
  let state = game.startProject(staffedStudio(), { name: '首作', type: 'story', scale: 0 });
  state = studioDays(state, 25);
  const before = game.projectMetrics(state.project);
  state = game.setFocus(state, 'bugs');
  state = studioDays(state, 5);
  assert.ok(state.project.defects < before.defects);
  assert.ok(game.projectMetrics(state.project).stability > before.stability);
  const gameplay = game.projectMetrics(state.project).gameplay;
  const done = state.project.done;
  state = studioDays(game.setFocus(state, 'polish'), 5);
  assert.equal(state.project.done, done);
  assert.ok(game.projectMetrics(state.project).gameplay > gameplay);
});

test('launch separates followers, buyers, reviews and allows word of mouth growth', () => {
  let state = game.startProject(staffedStudio(), { name: '首作', type: 'story', scale: 0 });
  state.project.done = state.project.total;
  state.project.codeValue = state.project.total * 95;
  state.project.artDone = state.project.artTotal;
  state.project.artValue = state.project.artTotal * 95;
  state.project.polish = 10;
  state.project.followers = 100;
  const launched = game.launchProject(state);
  const book = launched.catalog[0];
  assert.ok(book.units < book.openingFollowers);
  assert.ok(book.reviewScore > 80);
  const grown = studioDays(game.resolveStudioEvent(launched, 'continue'), 15);
  assert.ok(grown.catalog[0].dailyUnits > book.dailyUnits);
  assert.ok(grown.catalog[0].reviewCount > book.reviewCount);
  const poor = structuredClone(launched);
  poor.catalog[0].reviewScore = 30;
  poor.catalog[0].metrics = { progress: 100, gameplay: 25, visual: 15, stability: 55, defects: 10 };
  const declining = studioDays(game.resolveStudioEvent(poor, 'continue'), 15);
  assert.ok(declining.catalog[0].dailyUnits < book.dailyUnits);
  assert.equal(game.validStudio(grown), true);
});

test('new saves validate and legacy migration preserves cash and project progress', () => {
  const state = game.startProject(staffedStudio(), { name: '首作', type: 'story', scale: 0 });
  assert.equal(game.validStudio(JSON.parse(JSON.stringify(state))), true);
  assert.deepEqual(game.restoreStudio(state), state);
  assert.equal(game.validStudio({ ...state, accrued: NaN }), false);
  assert.equal(game.validStudio({ ...state, candidates: { code: { batch: 0, people: [{}] } } }), false);
  assert.equal(game.validStudio({ ...state, project: { ...state.project, test: {} } }), false);
  const old = game.advance(start());
  const next = game.restoreStudio(old);
  assert.equal(next.cash, old.cash);
  assert.ok(Math.abs(next.project.done / next.project.total - old.project.done / old.project.total) < 1e-8);
  assert.equal(game.validStudio(next), true);
  assert.throws(() => game.restoreStudio({ version: 2 }));
});

test('cash decisions take priority before an unaffordable month-end charge', () => {
  const state = staffedStudio();
  state.day = 30;
  state.cash = 1;
  state.accrued = 4;
  const paused = game.stepDay(state);
  assert.equal(paused.day, 30);
  assert.equal(paused.cash, 1);
  assert.equal(paused.event.id, 'cash');
  assert.equal(paused.over, false);
  const recovered = game.stepDay(game.resolveStudioEvent(paused, 'bridge'));
  assert.equal(recovered.day, 31);
  assert.equal(recovered.over, false);
  assert.ok(recovered.report.payroll > 4);
});

test('forecast uses actual trait stages and has no production or money side effects', () => {
  let state = game.startProject(staffedStudio(), { name: '预测核验', type: 'action', scale: 0 });
  state.staff[0].trait = 'prototype';
  const saved = JSON.stringify(state);
  const forecast = game.projectForecast(state);
  assert.equal(JSON.stringify(state), saved);
  let days = 0;
  while (!state.event || state.event.id !== 'ready') {
    if (state.event) {
      const choice = state.event.choices.find(item => item.id === 'continue') || state.event.choices.find(item => item.id === 'plain');
      state = game.resolveStudioEvent(state, choice.id);
    }
    state = game.stepDay(state);
    days++;
  }
  assert.equal(days, forecast.days);
  assert.ok(Math.abs(state.project.invested - game.monthlyCost(state) / 30 * days) < 1e-8);
});

test('legacy large teams and released catalogs remain loadable without money creation', () => {
  const large = { ...game.createGame(42), team: 2, cash: 73.25 };
  const converted = game.restoreStudio(large);
  assert.equal(converted.staff.length, 14);
  assert.equal(game.validStudio(converted), true);
  assert.equal(converted.cash, large.cash);
  const old = game.skipToDecision(game.skipToDecision(game.createGame(42)));
  const migrated = game.restoreStudio(old);
  assert.equal(game.validStudio(migrated), true);
  assert.equal(migrated.catalog[0].received, old.catalog[0].received);
  assert.ok(migrated.catalog[0].legacyRemaining > 0);
  const paid = studioDays(migrated, 10);
  assert.ok(paid.catalog[0].received > migrated.catalog[0].received);
});

test('assets and plain visuals are alternatives rather than mandatory hires', () => {
  const state = game.startProject(staffedStudio(), { name: '素材方案', type: 'story', scale: 0 });
  const supplied = game.buyAssets(state);
  assert.equal(state.cash - supplied.cash, 4);
  assert.ok(game.projectMetrics(supplied.project).visual > 30);
  assert.equal(supplied.staff.length, state.staff.length);
  assert.equal(supplied.project.done, 0);
  assert.throws(() => game.buyAssets(supplied));
  let plain = structuredClone(state);
  plain.project.done = plain.project.total;
  plain.project.codeValue = plain.project.done * 70;
  plain.project.plain = true;
  plain = game.launchProject(plain);
  assert.equal(plain.catalog[0].metrics.visual, 0);
  assert.ok(plain.catalog[0].units > 0);
});

test('daily seeded companies preserve valid saves and reconciled bills over multiple projects', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let state = game.nameCompany(game.createStudio(seed), '持续经营');
    for (const role of ['code', 'art']) {
      state = game.publishRecruitment(state, role);
      state = game.hire(state, state.candidates[role].people[seed % 3].id);
    }
    for (let day = 0; day < 500 && !state.over; day++) {
      if (state.event) {
        const choice = ['bridge', 'launch', 'continue', 'plain'].map(id => state.event.choices.find(item => item.id === id)).find(Boolean) || state.event.choices[0];
        state = game.resolveStudioEvent(state, choice.id);
      }
      if (!state.project && !state.event) state = game.startProject(state, { name: `作品 ${state.catalog.length}`, type: Object.keys(game.TYPES)[seed % 3], scale: seed % 3 });
      if (!state.event) state = game.stepDay(state);
      assert.equal(game.validStudio(state), true, `seed ${seed}, day ${day}`);
      if (state.report) assert.ok(Math.abs(state.report.opening + state.report.income - state.report.expense - state.report.closing) < 0.015);
    }
  }
});