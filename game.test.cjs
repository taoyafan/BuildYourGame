const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('./game.js');

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
  assert.equal(state.cash, 67);
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