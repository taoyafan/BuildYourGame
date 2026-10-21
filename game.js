(function (root) {
  'use strict';

  const TYPES = {
    story: { name: '叙事解谜', work: 44, market: 105, description: '制作周期短，市场较小，对精良表达更敏感。', sensitivity: 1.55 },
    sim: { name: '模拟经营', work: 66, market: 155, description: '周期与市场适中，需要扎实的系统设计。', sensitivity: 1.8 },
    action: { name: '动作冒险', work: 90, market: 225, description: '工作量大、受众广，对完成品质要求更高。', sensitivity: 2.15 }
  };
  const SCALES = [
    { name: '小型作品', work: 1, market: 1, cost: 1 },
    { name: '中型作品', work: 2.35, market: 2.6, cost: 2 },
    { name: '大型作品', work: 5.2, market: 5.8, cost: 4 }
  ];
  const MATERIALS = [
    { name: '自制为主', reduction: 0, cost: 0 },
    { name: '部分采购', reduction: 0.18, cost: 9 },
    { name: '大量采购', reduction: 0.35, cost: 23 }
  ];
  const TEAMS = [{ name: '精干团队', people: 3 }, { name: '常规团队', people: 7 }, { name: '扩充团队', people: 14 }];
  const PAY = [
    { name: '节约成本', wage: 1.9, ability: 51 },
    { name: '市场水平', wage: 2.6, ability: 70 },
    { name: '优厚待遇', wage: 3.6, ability: 87 }
  ];
  const PROMO = [
    { name: '自然曝光', cost: 0, reach: 0.4 },
    { name: '定向推广', cost: 11, reach: 0.78 },
    { name: '集中宣发', cost: 31, reach: 1.05 }
  ];
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const round = value => Math.round(value * 100) / 100;
  const tier = value => Number.isInteger(value) && value >= 0 && value <= 2;

  function createGame(seed = Date.now()) {
    return {
      version: 1, seed: seed >>> 0, month: 1, cash: 90, team: 0, pay: 1,
      project: null, catalog: [], event: null, events: [], pace: 1,
      bridgeUsed: false, lastCrisis: -10, over: false,
      report: null,
      history: [{ month: 1, title: '第一间办公室', text: '三个人，一笔积蓄。先做出一款游戏，再决定这家公司要走多远。' }]
    };
  }

  function random(state) {
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }

  function burn(state) {
    return round(TEAMS[state.team].people * PAY[state.pay].wage + 1.5);
  }

  function speed(state) {
    return Math.pow(TEAMS[state.team].people, 0.76) * 5 * state.pace;
  }

  function market(type, month) {
    const position = (Math.floor((month - 1) / 4) + Object.keys(TYPES).indexOf(type)) % 3;
    return [
      { multiplier: 1.22, label: '关注上升', description: '近期同类话题较热，但热度不保证持续到发售。' },
      { multiplier: 1, label: '需求平稳', description: '没有明显风口，作品本身更重要。' },
      { multiplier: 0.8, label: '市场拥挤', description: '近期同类竞争较多，需要更谨慎地控制投入。' }
    ][position];
  }

  function defaultPlan(state) {
    const project = state.project;
    return {
      type: project ? project.type : 'story', scale: project ? project.scale : 0,
      material: project ? project.material : 0, team: state.team, pay: state.pay,
      promo: project ? project.promo : 1,
      name: project ? project.name : ''
    };
  }

  function validatePlan(plan) {
    if (!plan || !Object.hasOwn(TYPES, plan.type) || !['scale', 'material', 'team', 'pay', 'promo'].every(key => tier(plan[key]))) {
      throw new Error('经营安排无效。');
    }
  }

  function planCost(state, plan) {
    validatePlan(plan);
    if (state.project) {
      if (plan.type !== state.project.type || plan.scale !== state.project.scale || plan.material !== state.project.material) {
        throw new Error('立项后不能更改类型、规模或已采购物料。');
      }
      if (plan.promo < state.project.promo) throw new Error('已投入的宣发不能撤回。');
      return round((PROMO[plan.promo].cost - PROMO[state.project.promo].cost) * SCALES[plan.scale].cost);
    }
    return round((MATERIALS[plan.material].cost + PROMO[plan.promo].cost) * SCALES[plan.scale].cost);
  }

  function applyPlan(state, plan) {
    if (state.over) throw new Error('这家公司的经营已经结束。');
    const cost = planCost(state, plan);
    if (cost > state.cash) throw new Error('现有资金不足以支付这次投入，请降低物料或宣发档位。');
    const next = clone(state);
    next.cash = round(next.cash - cost);
    next.team = plan.team;
    next.pay = plan.pay;
    if (!next.project) {
      const names = { story: '纸上远行', sim: '街角新世界', action: '荒野回声' };
      const name = String(plan.name || names[plan.type]).trim().slice(0, 24) || names[plan.type];
      next.project = {
        name, type: plan.type, scale: plan.scale, material: plan.material, promo: plan.promo,
        total: TYPES[plan.type].work * SCALES[plan.scale].work * (1 - MATERIALS[plan.material].reduction),
        done: 0, qualityWork: 0, bonus: 0, reachBonus: 0, invested: cost,
        started: next.month
      };
      addHistory(next, '新作立项', `《${name}》进入研发。方向：${TYPES[plan.type].name}，${SCALES[plan.scale].name}。`);
    } else {
      next.project.promo = plan.promo;
      next.project.invested = round(next.project.invested + cost);
    }
    if (!next.event) next.event = makeEvent(next);
    return next;
  }

  function quality(state) {
    const project = state.project;
    if (!project) return 0;
    const remaining = Math.max(0, project.total - project.done);
    return clamp((project.qualityWork + remaining * PAY[state.pay].ability) / project.total + project.bonus, 20, 96);
  }

  function qualityLabel(value) {
    if (value < 59) return { label: '低于同类预期', detail: '能完成作品，但粗糙之处会影响购买意愿。', tone: 'warning' };
    if (value < 79) return { label: '达到主流水平', detail: '能满足同类核心玩家，尚未形成品质优势。', tone: 'neutral' };
    return { label: '有明显品质优势', detail: '有机会靠体验脱颖而出，但仍需要被玩家看见。', tone: 'good' };
  }

  function salesEstimate(state, month = state.month) {
    const project = state.project;
    if (!project) return 0;
    const value = quality(state);
    const qualityFactor = Math.pow(value / 75, TYPES[project.type].sensitivity);
    const reach = PROMO[project.promo].reach + project.reachBonus;
    return TYPES[project.type].market * SCALES[project.scale].market * qualityFactor * reach * market(project.type, month).multiplier;
  }

  function tailIncome(book, month) {
    const age = month - book.released;
    if (age < 1 || age > 11) return 0;
    const normalization = (1 - Math.pow(0.72, 11)) / (1 - 0.72);
    return book.sales * 0.54 * Math.pow(0.72, age - 1) / normalization;
  }

  function catalogIncome(state, month) {
    return round(state.catalog.reduce((sum, book) => sum + tailIncome(book, month), 0));
  }

  function runway(state) {
    let available = state.cash;
    const monthly = burn(state);
    for (let offset = 0; offset < 120; offset++) {
      const income = catalogIncome(state, state.month + offset);
      const net = monthly - income;
      if (net > available) return Math.max(0, offset + available / net);
      available += income - monthly;
    }
    return 120;
  }

  function forecast(state, plan) {
    const cost = planCost(state, plan);
    const affordable = cost <= state.cash;
    const next = clone(state);
    next.cash = Math.max(next.cash, cost);
    const projected = applyPlan(next, plan);
    projected.cash = round(state.cash - cost);
    const remaining = projected.project.total - projected.project.done;
    const firstCapacity = speed(projected);
    const regularCapacity = firstCapacity / projected.pace;
    const duration = remaining <= firstCapacity ? 1 : 1 + Math.ceil((remaining - firstCapacity) / regularCapacity);
    return {
      affordable, cost, monthly: burn(projected), runway: runway(projected),
      duration, quality: quality(projected), qualityInfo: qualityLabel(quality(projected)),
      reach: ['自然发现为主', '覆盖核心圈层', '有望触达圈外'][plan.promo],
      reachDetail: ['没有付费推广，首批玩家较少。', '面向同类游戏的核心玩家推广。', '覆盖更多潜在玩家，额外触达逐渐递减。'][plan.promo]
    };
  }

  function addHistory(state, title, text) {
    state.history.unshift({ month: state.month, title, text });
    state.history = state.history.slice(0, 80);
  }

  function makeEvent(state) {
    const needed = burn(state);
    if (runway(state) < 2 && state.month - state.lastCrisis >= 4) {
      state.lastCrisis = state.month;
      return {
        id: 'cash', title: '账上只剩最后一点余地',
        text: '按当前安排，资金已不足以支撑两个月。现在还来得及找一条退路。也可以先缩减团队或待遇，再决定是否接受援助。',
        choices: [
          { id: 'contract', title: '接一个短期外包', detail: '获得约两个月当前团队开支；下一月自研只保留三成产能。', income: needed * 2, pace: 0.3 },
          { id: 'bridge', title: '投入创始人积蓄', detail: '补充一笔启动资金，不影响研发；整局只能使用一次。', income: 35, disabled: state.bridgeUsed },
          { id: 'decline', title: '按现有计划继续', detail: '不获得资金。若仍无法支付下月开支，公司将停止经营。' }
        ]
      };
    }
    if (!state.project || state.month % 4 !== 0 || state.events.includes(state.month)) return null;
    if (Math.floor(state.month / 4) % 2 === 1) {
      return {
        id: 'demo', title: '试玩群里的长留言',
        text: '一位玩家认真写下了试玩感受。问题不致命，但如果现在处理，作品会更完整。',
        choices: [
          { id: 'listen', title: '留出时间吸收反馈', detail: '下一月研发产能降至七成，作品获得一部分品质改善。', pace: 0.7, quality: 4 },
          { id: 'stay', title: '保持研发节奏', detail: '记录反馈，当前项目继续按原计划推进。' }
        ]
      };
    }
    return {
      id: 'show', title: '独立游戏展的最后一个展位',
      text: '主办方愿意给你的新作留个位置。参展能接触一批新玩家，但也需要额外投入。',
      choices: [
        { id: 'attend', title: '带试玩版参展', detail: '花费约半个月团队开支，为本作增加额外关注。', cost: needed * 0.5, reach: 0.15 },
        { id: 'pass', title: '留在办公室做游戏', detail: '不额外支出，维持现有宣发安排。' }
      ]
    };
  }

  function resolveEvent(state, choiceId) {
    if (!state.event || state.over) throw new Error('当前没有待处理事件。');
    const choice = state.event.choices.find(item => item.id === choiceId);
    if (!choice || choice.disabled) throw new Error('这个选项不可用。');
    if ((choice.cost || 0) > state.cash) throw new Error('现有资金不足以支付这次支出。');
    const next = clone(state);
    next.cash = round(next.cash + (choice.income || 0) - (choice.cost || 0));
    if (choice.pace) next.pace = choice.pace;
    if (choiceId === 'bridge') next.bridgeUsed = true;
    if (next.project) {
      next.project.bonus += choice.quality || 0;
      next.project.reachBonus += choice.reach || 0;
      next.project.invested = round(next.project.invested + (choice.cost || 0));
    }
    addHistory(next, next.event.title, choice.title + '。' + choice.detail);
    next.events.push(next.month);
    next.event = null;
    return next;
  }

  function advance(state) {
    if (state.over) throw new Error('经营已经结束。');
    if (state.event) throw new Error('请先处理当前事件。');
    const next = clone(state);
    const monthly = burn(next);
    const income = catalogIncome(next, next.month);
    next.cash = round(next.cash + income - monthly);
    let release = null;
    let work = 0;
    next.catalog.forEach(book => { book.received = round(book.received + tailIncome(book, next.month)); });
    if (next.cash < 0) {
      next.over = true;
      next.report = { month: next.month, expense: monthly, income, release: null, work: 0, failed: true };
      addHistory(next, '办公室的灯熄了', '资金不足以支付本月开支。公司的经营到此结束，作品和选择留在了这份记录里。');
      next.month += 1;
      return next;
    }
    if (next.project) {
      const project = next.project;
      work = Math.min(project.total - project.done, speed(next));
      project.done += work;
      project.qualityWork += work * PAY[next.pay].ability;
      project.invested = round(project.invested + monthly);
      if (project.done >= project.total - 0.000001) {
        const value = quality(next);
        const sales = round(salesEstimate(next) * (0.84 + random(next) * 0.32));
        const opening = round(sales * 0.46);
        release = {
          name: project.name, type: project.type, scale: project.scale, quality: value,
          sales, received: opening, invested: project.invested,
          released: next.month, payroll: monthly
        };
        next.catalog.unshift(release);
        next.cash = round(next.cash + opening);
        next.project = null;
        addHistory(next, `《${release.name}》正式发售`, `${qualityLabel(value).label}。首发回款约相当于 ${(opening / monthly).toFixed(1)} 个月当时团队开支，后续销售将逐月到账。`);
      }
    }
    next.pace = 1;
    next.report = { month: next.month, expense: monthly, income, release, work, failed: false };
    next.month += 1;
    next.event = makeEvent(next);
    return next;
  }

  function validState(state) {
    const finite = value => typeof value === 'number' && Number.isFinite(value);
    const text = value => typeof value === 'string';
    const validBook = book => book && text(book.name) && Object.hasOwn(TYPES, book.type) && tier(book.scale) && ['quality', 'sales', 'received', 'invested', 'released', 'payroll'].every(key => finite(book[key]) && book[key] >= 0) && book.payroll > 0;
    if (!state || state.version !== 1 || !Number.isInteger(state.month) || state.month < 1 || !finite(state.cash) || !tier(state.team) || !tier(state.pay) || !finite(state.seed) || !finite(state.pace) || state.pace <= 0 || !finite(state.lastCrisis) || typeof state.bridgeUsed !== 'boolean' || typeof state.over !== 'boolean') return false;
    if (!Array.isArray(state.events) || !state.events.every(Number.isInteger) || !Array.isArray(state.history) || !state.history.every(item => item && finite(item.month) && text(item.title) && text(item.text))) return false;
    if (!Array.isArray(state.catalog) || !state.catalog.every(validBook)) return false;
    if (state.project) {
      const project = state.project;
      if (!text(project.name) || !Object.hasOwn(TYPES, project.type) || !['scale', 'material', 'promo'].every(key => tier(project[key])) || !['total', 'done', 'qualityWork', 'bonus', 'reachBonus', 'invested', 'started'].every(key => finite(project[key])) || project.total <= 0 || project.done < 0 || project.done > project.total + 0.001) return false;
    }
    if (state.event && (!text(state.event.id) || !text(state.event.title) || !text(state.event.text) || !Array.isArray(state.event.choices) || !state.event.choices.every(choice => choice && text(choice.id) && text(choice.title) && text(choice.detail) && ['income', 'cost', 'pace', 'quality', 'reach'].every(key => choice[key] === undefined || finite(choice[key]))))) return false;
    if (state.report && (!Number.isInteger(state.report.month) || !finite(state.report.expense) || state.report.expense <= 0 || !finite(state.report.income) || !finite(state.report.work) || typeof state.report.failed !== 'boolean' || state.report.release && !validBook(state.report.release))) return false;
    return true;
  }

  const api = { TYPES, SCALES, MATERIALS, TEAMS, PAY, PROMO, createGame, defaultPlan, planCost, applyPlan, burn, speed, market, quality, qualityLabel, salesEstimate, tailIncome, catalogIncome, runway, forecast, resolveEvent, advance, validState };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StudioGame = api;
})(globalThis);