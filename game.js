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
  const WORK_PER_PERSON_MONTH = 5;
  const PLAYTEST = { progress: 0.25, cost: 6, reach: 0.06, fixPace: 0.65, promoReach: 0.15 };
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const round = value => Math.round(value * 100) / 100;
  const tier = value => Number.isInteger(value) && value >= 0 && value <= 2;

  function createGame(seed = Date.now()) {
    return {
      version: 1, seed: seed >>> 0, month: 1, cash: 100, team: 0, pay: 1,
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
    return TEAMS[state.team].people * WORK_PER_PERSON_MONTH * state.pace;
  }

  function personMonths(work) {
    return work / WORK_PER_PERSON_MONTH;
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
    recordCash(next, 'setupCost', cost);
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

  function takeTurn(state, plan = defaultPlan(state)) {
    if (state.event) throw new Error('请先处理当前事件。');
    const planned = applyPlan(state, plan);
    return planned.event ? planned : advance(planned);
  }

  function recordCash(state, key, amount) {
    if (!amount) return;
    if (!state.pending) state.pending = { cashBefore: state.cash, setupCost: 0, testingCost: 0, eventCost: 0, eventIncome: 0 };
    state.pending[key] = round(state.pending[key] + amount);
  }

  function testingOffer(state) {
    const cost = round(PLAYTEST.cost * SCALES[state.project ? state.project.scale : 0].cost);
    const reason = state.over ? '经营已结束' : !state.project ? '立项并推进研发后开放' : state.project.test ? '本作已完成提前测试' : state.event ? '先处理待决事件' : state.project.done / state.project.total < PLAYTEST.progress ? '研发达到四分之一后开放' : cost > state.cash ? '资金不足' : '';
    return { cost, available: !reason, reason };
  }

  function runPlaytest(state) {
    const offer = testingOffer(state);
    if (!offer.available) throw new Error(offer.reason);
    const next = clone(state);
    recordCash(next, 'testingCost', offer.cost);
    next.cash = round(next.cash - offer.cost);
    next.project.invested = round(next.project.invested + offer.cost);
    const value = quality(next);
    const gain = round(3 + random(next) * 4);
    const topics = {
      story: ['叙事节奏', '关键转折出现得太晚，前段体验需要压缩。', '角色动机仍有理解门槛，关键线索可以更清楚。'],
      sim: ['系统可读性', '资源反馈不够清晰，玩家难以判断自己的经营是否有效。', '中期目标不够突出，玩家理解规则后缺少新的追求。'],
      action: ['操作与交付', '核心动作反馈不够稳定，优先修正基础手感比继续堆内容更重要。', '部分战斗节奏拖沓，缩短重复段落能改善完整体验。']
    };
    const topic = topics[next.project.type];
    const finding = topic[gain >= 5 ? 1 : 2];
    next.project.reachBonus += PLAYTEST.reach;
    next.project.test = { month: next.month, cost: offer.cost, finding, label: qualityLabel(value).label, decision: '' };
    next.event = {
      id: 'playtest', title: `提前测试：${topic[0]}`,
      text: `${qualityLabel(value).label}。${finding}测试已带来少量曝光，但不保证商业成功。`,
      choices: [
        { id: 'test-fix', title: '按反馈集中修改', detail: `下一月自研产能为正常的 ${PLAYTEST.fixPace * 100}%，本作品质增加 ${gain}。`, pace: PLAYTEST.fixPace, quality: gain },
        { id: 'test-promo', title: '用试玩素材扩大曝光', detail: `再投入 ${(offer.cost / 2).toFixed(2)} 万，增加市场触达；不解决测试指出的问题。`, cost: offer.cost / 2, reach: PLAYTEST.promoReach },
        { id: 'test-stay', title: '保留记录，按原排期推进', detail: '不额外花钱、不占用研发时间，保留测试获得的基础曝光。' }
      ]
    };
    addHistory(next, '完成提前测试', `${finding}测试支出 ${offer.cost.toFixed(2)} 万。`);
    return next;
  }

  function skipToDecision(state, plan = defaultPlan(state)) {
    const startMonth = state.month;
    const alreadyTestable = testingOffer(state).available;
    let next = takeTurn(state, plan);
    while (next.month - startMonth < 12 && !next.over && !next.event && next.project) {
      if (!alreadyTestable && testingOffer(next).available) break;
      if (runway(next) < 2) break;
      next = takeTurn(next);
    }
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
      workload: { total: personMonths(projected.project.total), remaining: personMonths(remaining), monthly: personMonths(firstCapacity) },
      releaseMonth: state.month + duration - 1, releaseMarket: market(plan.type, state.month + duration - 1),
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
    recordCash(next, 'eventCost', choice.cost || 0);
    recordCash(next, 'eventIncome', choice.income || 0);
    next.cash = round(next.cash + (choice.income || 0) - (choice.cost || 0));
    if (choice.pace) next.pace = choice.pace;
    if (choiceId === 'bridge') next.bridgeUsed = true;
    if (next.project) {
      next.project.bonus += choice.quality || 0;
      next.project.reachBonus += choice.reach || 0;
      next.project.invested = round(next.project.invested + (choice.cost || 0));
      if (next.event.id === 'playtest' && next.project.test) next.project.test.decision = choice.title;
    }
    addHistory(next, next.event.title, choice.title + '。' + choice.detail);
    next.events.push(next.month);
    next.event = null;
    return next;
  }

  function finishReport(state, report, cashBefore) {
    const pending = state.pending || { cashBefore, setupCost: 0, testingCost: 0, eventCost: 0, eventIncome: 0 };
    const totalIncome = round(report.income + pending.eventIncome + (report.release ? report.release.received : 0));
    const totalExpense = round(report.expense + pending.setupCost + pending.testingCost + pending.eventCost);
    state.report = { ...report, ...pending, totalIncome, totalExpense, net: round(totalIncome - totalExpense), cashAfter: state.cash };
    state.pending = null;
    addHistory(state, `第 ${report.month} 月账单`, `收入 ${totalIncome.toFixed(2)} 万，${report.failed ? '应付' : '支出'} ${totalExpense.toFixed(2)} 万，净变化 ${state.report.net.toFixed(2)} 万。`);
  }

  function advance(state) {
    if (state.over) throw new Error('经营已经结束。');
    if (state.event) throw new Error('请先处理当前事件。');
    const next = clone(state);
    const cashBefore = next.cash;
    const monthly = burn(next);
    const income = catalogIncome(next, next.month);
    next.cash = round(next.cash + income - monthly);
    let release = null;
    let work = 0;
    next.catalog.forEach(book => { book.received = round(book.received + tailIncome(book, next.month)); });
    if (next.cash < 0) {
      next.over = true;
      finishReport(next, { month: next.month, expense: monthly, income, release: null, work: 0, failed: true }, cashBefore);
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
        release.launchMarket = market(project.type, next.month).label;
        release.promotion = PROMO[project.promo].name;
        release.tested = Boolean(project.test);
        next.catalog.unshift(release);
        next.cash = round(next.cash + opening);
        next.project = null;
        addHistory(next, `《${release.name}》正式发售`, `${qualityLabel(value).label}。首发回款约相当于 ${(opening / monthly).toFixed(1)} 个月当时团队开支，后续销售将逐月到账。`);
      }
    }
    next.pace = 1;
    finishReport(next, { month: next.month, expense: monthly, income, release, work, failed: false }, cashBefore);
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
      if (project.test && (!Number.isInteger(project.test.month) || !finite(project.test.cost) || project.test.cost < 0 || !['finding', 'label', 'decision'].every(key => text(project.test[key])))) return false;
    }
    if (state.pending && (!finite(state.pending.cashBefore) || !['setupCost', 'testingCost', 'eventCost', 'eventIncome'].every(key => finite(state.pending[key]) && state.pending[key] >= 0))) return false;
    if (state.event && (!text(state.event.id) || !text(state.event.title) || !text(state.event.text) || !Array.isArray(state.event.choices) || !state.event.choices.every(choice => choice && text(choice.id) && text(choice.title) && text(choice.detail) && ['income', 'cost', 'pace', 'quality', 'reach'].every(key => choice[key] === undefined || finite(choice[key]))))) return false;
    if (state.report && (!Number.isInteger(state.report.month) || !finite(state.report.expense) || state.report.expense <= 0 || !finite(state.report.income) || !finite(state.report.work) || typeof state.report.failed !== 'boolean' || state.report.release && !validBook(state.report.release))) return false;
    if (state.report && !['cashBefore', 'cashAfter', 'totalIncome', 'totalExpense', 'net', 'setupCost', 'testingCost', 'eventCost', 'eventIncome'].every(key => state.report[key] === undefined || finite(state.report[key]))) return false;
    return true;
  }

  function createStudio(seed = Date.now()) {
    return {
      version: 2, seed: seed >>> 0, day: 1, company: '', cash: 100,
      staff: [], project: null, catalog: [], tools: [], candidates: {},
      event: null, over: false, accrued: 0,
      ledger: { opening: 100, income: 0, expense: 0, payroll: 0 },
      report: null, history: [], tutorial: {}, notices: {}, bridgeUsed: false, lastRelease: null
    };
  }

  const ROLES = {
    code: { name: '程序员', task: '功能开发与缺陷修复', traits: ['prototype', 'careful', 'systems'] },
    art: { name: '美术', task: '视觉制作与素材统一', traits: ['efficient', 'detail', 'versatile'] }
  };
  const TRAITS = {
    prototype: { name: '原型能手', text: '原型阶段开发速度提高 35%。' },
    careful: { name: '测试习惯', text: '新增缺陷减少 45%，修复效率提高 35%。' },
    systems: { name: '系统经验', text: '玩法打磨效率提高 35%。' },
    efficient: { name: '交付熟练', text: '视觉制作速度提高 25%。' },
    detail: { name: '细节打磨', text: '完成的视觉工作表现提高，制作速度降低 10%。' },
    versatile: { name: '风格适配', text: '视觉制作速度提高 10%，作品细节能力提高 7 点。' }
  };
  const STUDIO_TOOLS = {
    code: { name: '开发工具链', cost: 6, multiplier: 1.3, text: '程序开发、玩法打磨与缺陷修复速度提高 30%。' },
    art: { name: '视觉制作工具', cost: 5, multiplier: 1.25, text: '美术制作速度提高 25%，不直接增加视觉表现。' }
  };
  const AUDIENCES = {
    story: { name: '叙事玩家', weights: [0.45, 0.4, 0.15], work: 38, price: 0.006 },
    sim: { name: '经营玩家', weights: [0.6, 0.15, 0.25], work: 50, price: 0.008 },
    action: { name: '动作玩家', weights: [0.4, 0.25, 0.35], work: 62, price: 0.01 }
  };
  const FAMILY_NAMES = ['林', '陈', '周', '许', '沈', '叶', '宋', '程', '顾', '苏', '陆', '江'];
  const GIVEN_NAMES = ['知夏', '明远', '可宁', '星河', '亦舟', '思齐', '安然', '予墨', '嘉禾', '清和', '一帆', '若溪'];

  function studioLog(state, title, text) {
    state.history.unshift({ day: state.day, title, text });
    state.history = state.history.slice(0, 120);
  }

  function studioAction(state) {
    if (state.over) throw new Error('公司已停止经营。');
    return clone(state);
  }

  function spend(state, amount, label) {
    if (amount > state.cash) throw new Error('当前资金不足。');
    state.cash = round(state.cash - amount);
    state.ledger.expense = round(state.ledger.expense + amount);
    studioLog(state, label, `支付 ${amount.toFixed(2)} 万。`);
  }

  function nameCompany(state, name) {
    const next = studioAction(state);
    const value = String(name || '').trim().slice(0, 24);
    if (!value) throw new Error('请输入公司名称。');
    next.company = value;
    studioLog(next, '工作室成立', `${value}，从第一位同事和第一款作品开始。`);
    return next;
  }

  function publishRecruitment(state, role) {
    if (!Object.hasOwn(ROLES, role)) throw new Error('招聘岗位无效。');
    const next = studioAction(state);
    const batch = Math.floor((next.day - 1) / 14);
    if (next.candidates[role] && next.candidates[role].batch === batch) return next;
    const people = Array.from({ length: 3 }, (_, index) => {
      const skill = Math.round(48 + random(next) * 43);
      const pace = Math.round(65 + random(next) * 45);
      const trait = ROLES[role].traits[Math.floor(random(next) * ROLES[role].traits.length)];
      const name = FAMILY_NAMES[Math.floor(random(next) * FAMILY_NAMES.length)] + GIVEN_NAMES[Math.floor(random(next) * GIVEN_NAMES.length)];
      const wage = round(1.3 + skill * 0.035 + (pace - 65) * 0.018 + random(next) * 0.7);
      return { id: `${role}-${batch}-${index}-${next.seed}`, name, role, skill, pace, trait, wage, hired: false, work: 0 };
    });
    next.candidates[role] = { batch, people };
    studioLog(next, '发布招聘', `${ROLES[role].name}岗位收到 ${people.length} 份简历；本批候选人保持至第 ${(batch + 1) * 14} 天。`);
    return next;
  }

  function hire(state, id) {
    const next = studioAction(state);
    const person = Object.values(next.candidates).flatMap(pool => pool.people).find(item => item.id === id);
    if (!person || person.hired) throw new Error('候选人已不可录用。');
    if (next.staff.length >= 16) throw new Error('当前小型工作室最多容纳 16 人。');
    if (next.cash - next.accrued < monthlyCost(next) + person.wage) throw new Error('资金不足以覆盖录用后的近期工资，请先控制开支。');
    person.hired = true;
    next.staff.push({ ...person, joined: next.day });
    studioLog(next, `${person.name} 加入`, `${ROLES[person.role].name}，月薪 ${person.wage.toFixed(2)} 万；${TRAITS[person.trait].text}`);
    return next;
  }

  function dismiss(state, id) {
    const next = studioAction(state);
    const person = next.staff.find(item => item.id === id);
    if (!person) throw new Error('员工不存在。');
    next.staff = next.staff.filter(item => item.id !== id);
    studioLog(next, `${person.name} 离职`, '此前工作与已产生工资保留，后续不再计薪。');
    return next;
  }

  function rates(state) {
    const project = state.project;
    let code = 0;
    let art = 0;
    for (const person of state.staff) {
      let value = person.pace / 100;
      if (person.role === 'code' && person.trait === 'prototype' && project && project.done < project.total * 0.25) value *= 1.35;
      if (person.role === 'art') value *= person.trait === 'efficient' ? 1.25 : person.trait === 'detail' ? 0.9 : 1.1;
      if (state.tools.includes(person.role)) value *= STUDIO_TOOLS[person.role].multiplier;
      if (person.role === 'code') code += value;
      else art += value;
    }
    return { code, art };
  }

  function startProject(state, plan) {
    const next = studioAction(state);
    if (!next.company) throw new Error('请先命名公司。');
    if (next.project) throw new Error('请先完成当前项目。');
    if (!plan || !Object.hasOwn(TYPES, plan.type) || !tier(plan.scale)) throw new Error('项目方向无效。');
    const name = String(plan.name || '').trim().slice(0, 24);
    if (!name) throw new Error('请输入游戏名称。');
    const total = AUDIENCES[plan.type].work * [1, 1.65, 2.4][plan.scale];
    next.project = {
      id: `${next.day}-${next.seed}-${next.catalog.length}`, name, type: plan.type, scale: plan.scale,
      total, done: 0, artTotal: total * 0.7, artDone: 0, codeValue: 0, artValue: 0,
      defects: 0, defectDebt: 0, polish: 0, focus: 'develop', invested: 0,
      followers: Math.round(120 * market(plan.type, Math.ceil(next.day / 30)).multiplier),
      checkpoints: {}, test: null, tests: 0, testCount: 0, assets: false, plain: false, started: next.day
    };
    studioLog(next, '新作立项', `《${name}》面向${AUDIENCES[plan.type].name}，${SCALES[plan.scale].name}。`);
    return next;
  }

  function projectMetrics(project) {
    const progress = project.done / project.total;
    const ability = project.done > 0 ? project.codeValue / project.done : 0;
    const artAbility = project.artDone > 0 ? project.artValue / project.artDone : 0;
    return {
      progress: round(progress * 100),
      gameplay: round(clamp(progress * 45 + ability * 0.4 + project.polish, 0, 98)),
      visual: round(clamp(project.artDone / project.artTotal * (18 + artAbility * 0.75), 0, 98)),
      stability: round(clamp(98 - project.defects * 4, 18, 98)), defects: project.defects
    };
  }

  function projectForecast(state) {
    if (!state.project) return null;
    const project = state.project;
    const capacity = rates(state);
    const remaining = Math.max(0, project.total - project.done);
    let days = remaining <= 0 ? 0 : null;
    if (remaining > 0 && capacity.code && project.focus === 'develop') {
      const probe = clone(state);
      days = 0;
      while (probe.project.done < probe.project.total - 0.001 && days < 10000) {
        produceDay(probe);
        days += 1;
      }
    }
    return { ...capacity, days, metrics: projectMetrics(project) };
  }

  function buyTool(state, role) {
    if (!Object.hasOwn(STUDIO_TOOLS, role)) throw new Error('工具不存在。');
    const next = studioAction(state);
    if (next.tools.includes(role)) throw new Error('该工具已购置。');
    spend(next, STUDIO_TOOLS[role].cost, `购置${STUDIO_TOOLS[role].name}`);
    next.tools.push(role);
    return next;
  }

  function buyAssets(state) {
    const next = studioAction(state);
    if (!next.project || next.project.assets) throw new Error('当前无法采购素材。');
    spend(next, 4 * [1, 1.5, 2][next.project.scale], '采购视觉素材');
    const project = next.project;
    const amount = Math.min(project.artTotal - project.artDone, project.artTotal * 0.55);
    project.artDone += amount;
    project.artValue += amount * 64;
    project.assets = true;
    project.invested = round(project.invested + 4 * [1, 1.5, 2][project.scale]);
    return next;
  }

  function setFocus(state, focus) {
    if (!['develop', 'polish', 'bugs'].includes(focus)) throw new Error('工作安排无效。');
    const next = studioAction(state);
    if (!next.project) throw new Error('当前没有项目。');
    next.project.focus = focus;
    studioLog(next, '调整开发重点', { develop: '继续实现计划内容。', polish: '程序团队暂缓内容开发，集中打磨玩法。', bugs: '程序团队暂缓内容开发，集中修复缺陷。' }[focus]);
    return next;
  }

  function audienceScore(metrics, type) {
    const weights = AUDIENCES[type].weights;
    return metrics.gameplay * weights[0] + metrics.visual * weights[1] + metrics.stability * weights[2];
  }

  function findings(metrics, type) {
    const weights = AUDIENCES[type].weights;
    const items = [
      { key: 'polish', title: '玩法体验', value: metrics.gameplay, text: metrics.gameplay < 65 ? '核心体验还不够完整，继续开发或留出时间打磨。' : '核心体验已得到认可，继续打磨仍可能改善评价。' },
      { key: 'visual', title: '视觉表现', value: metrics.visual, text: metrics.visual < 55 ? '画面表达较弱，可考虑美术、素材或接受朴素风格。' : '视觉表达清晰，已有制作投入得到认可。' },
      { key: 'bugs', title: '稳定性', value: metrics.stability, text: metrics.defects ? `发现 ${metrics.defects} 项已知缺陷；修复会改善体验。` : '本轮没有发现影响体验的已知缺陷。' }
    ];
    return items.sort((left, right) => (100 - right.value) * weights[['polish', 'visual', 'bugs'].indexOf(right.key)] - (100 - left.value) * weights[['polish', 'visual', 'bugs'].indexOf(left.key)]);
  }

  function playtestOffer(state) {
    const project = state.project;
    const reason = !project ? '先立项开发' : project.done < project.total * 0.55 ? '完成 Demo 后开放' : project.test && state.day - project.test.day < 3 ? '间隔至少 3 天再招募新一批玩家' : '';
    return { available: !reason && !state.over && !state.event, reason };
  }

  function testDemo(state, count = 30) {
    if (![30, 100].includes(count)) throw new Error('测试批次无效。');
    const offer = playtestOffer(state);
    if (!offer.available) throw new Error(offer.reason || '先处理当前决策。');
    const next = studioAction(state);
    const cost = count === 30 ? 0.8 : 2;
    spend(next, cost, '招募试玩玩家');
    const project = next.project;
    const metrics = projectMetrics(project);
    const feedback = findings(metrics, project.type);
    const score = round(clamp(audienceScore(metrics, project.type) + (random(next) - 0.5) * 6 * Math.sqrt(30 / count), 0, 100));
    project.invested = round(project.invested + cost);
    project.tests += 1;
    project.testCount += count;
    project.followers += Math.round(count * score / 100 * 2);
    project.test = { day: next.day, count, score, findings: feedback, source: '试玩玩家' };
    next.event = { id: 'feedback', title: '试玩反馈送达', text: `${count} 位${AUDIENCES[project.type].name}，本轮评价 ${score.toFixed(1)}。${feedback[0].text}`, choices: [
      { id: 'polish', title: '集中打磨玩法', detail: '暂缓新内容，已有玩法表现随工作逐步改善。' },
      { id: 'visual', title: '优先检查视觉投入', detail: '查看美术招聘与素材方案，不自动支付费用。' },
      { id: 'bugs', title: '集中修复缺陷', detail: '暂缓新内容，已知缺陷随工作逐项减少。' },
      { id: 'continue', title: '按现有安排继续', detail: '保留反馈，不改变当前研发重点。' }
    ] };
    studioLog(next, 'Demo 测试', `${count} 人参与，评价 ${score.toFixed(1)}；${feedback[0].text}`);
    return next;
  }

  function promote(state, tierIndex) {
    if (![0, 1, 2].includes(tierIndex)) throw new Error('推广方案无效。');
    const next = studioAction(state);
    if (!next.project || next.project.done < next.project.total * 0.55) throw new Error('请先制作可展示的 Demo。');
    const cost = [2, 6, 12][tierIndex];
    const gain = Math.round([350, 1100, 2300][tierIndex] * market(next.project.type, Math.ceil(next.day / 30)).multiplier);
    spend(next, cost, 'Demo 推广');
    next.project.followers += gain;
    next.project.invested = round(next.project.invested + cost);
    studioLog(next, '推广结果', `新增 ${gain} 位关注者；关注不等于购买。`);
    return next;
  }

  function launchProject(state) {
    const next = studioAction(state);
    const project = next.project;
    if (!project || project.done < project.total - 0.001) throw new Error('计划内容尚未完成。');
    const metrics = projectMetrics(project);
    const trend = market(project.type, Math.ceil(next.day / 30));
    const fit = project.test ? clamp(project.test.score / 100, 0.15, 0.95) : 0.48;
    const units = Math.max(1, Math.round(project.followers * (0.2 + fit * 0.5) * trend.multiplier));
    const price = AUDIENCES[project.type].price * [1, 1.25, 1.6][project.scale];
    const receipt = round(units * price);
    const score = round(clamp(audienceScore(metrics, project.type) + (random(next) - 0.5) * 3, 0, 100));
    const book = {
      id: project.id, name: project.name, type: project.type, scale: project.scale,
      released: next.day, metrics, invested: round(project.invested), received: receipt,
      price, units, openingUnits: units, openingReceipt: receipt, openingFollowers: project.followers,
      followers: project.followers, dailyUnits: units / 15, reviewScore: score,
      reviewCount: Math.max(1, Math.round(units * 0.12)), tested: project.tests > 0,
      testScore: project.test ? project.test.score : null, testCount: project.testCount, trend: trend.label,
      lastGrowth: 0, lastDayUnits: units, team: next.staff.map(person => ({ name: person.name, role: person.role, trait: person.trait }))
    };
    next.cash = round(next.cash + receipt);
    next.ledger.income = round(next.ledger.income + receipt);
    next.catalog.unshift(book);
    next.lastRelease = book.id;
    next.project = null;
    next.event = { id: 'release', title: `《${book.name}》正式发售`, text: `首发售出 ${units} 份，到账 ${receipt.toFixed(2)} 万。首发回款不是最终利润。`, choices: [{ id: 'continue', title: '查看结果后继续经营', detail: '后续销量与玩家评价继续变化，可筹备下一款作品。' }] };
    studioLog(next, next.event.title, next.event.text);
    return next;
  }

  function resolveStudioEvent(state, choice) {
    if (!state.event || !state.event.choices.some(item => item.id === choice)) throw new Error('当前选择无效。');
    const next = studioAction(state);
    const event = next.event;
    next.event = null;
    if (choice === 'bridge') {
      if (next.bridgeUsed) throw new Error('创始人积蓄已使用。');
      next.bridgeUsed = true;
      next.cash = round(next.cash + 35);
      next.ledger.income = round(next.ledger.income + 35);
    }
    if (next.project) {
      if (choice === 'plain') next.project.plain = true;
      if (choice === 'assets') return buyAssets(next);
      if (event.id === 'feedback' && ['polish', 'bugs'].includes(choice)) next.project.focus = choice;
      if (choice === 'launch') return launchProject(next);
      if (choice === 'polish' && event.id === 'ready') next.project.focus = 'polish';
    }
    studioLog(next, event.title, event.choices.find(item => item.id === choice).title);
    return next;
  }

  function produceDay(state) {
    const project = state.project;
    if (!project) return;
    project.invested += monthlyCost(state) / 30;
    for (const person of state.staff) {
      let amount = person.pace / 100 * (state.tools.includes(person.role) ? STUDIO_TOOLS[person.role].multiplier : 1);
      if (person.role === 'code') {
        if (project.focus === 'bugs') {
          project.defectDebt -= amount * (person.trait === 'careful' ? 1.35 : 1);
          while (project.defectDebt < 0 && project.defects > 0) { project.defects -= 1; project.defectDebt += 1; }
          project.defectDebt = Math.max(0, project.defectDebt);
        } else if (project.focus === 'polish') {
          project.polish = Math.min(14, project.polish + amount * (person.trait === 'systems' ? 0.81 : 0.6));
        } else {
          if (person.trait === 'prototype' && project.done < project.total * 0.25) amount *= 1.35;
          amount = Math.min(amount, project.total - project.done);
          project.done += amount;
          project.codeValue += amount * person.skill;
          project.defectDebt += amount * (100 - person.skill) / 100 * 0.7 * (person.trait === 'careful' ? 0.55 : 1);
          while (project.defectDebt >= 1) { project.defects += 1; project.defectDebt -= 1; }
        }
      } else {
        amount *= person.trait === 'efficient' ? 1.25 : person.trait === 'detail' ? 0.9 : 1.1;
        amount = Math.min(amount, project.artTotal - project.artDone);
        project.artDone += amount;
        project.artValue += amount * Math.min(100, person.skill + (person.trait === 'detail' ? 16 : person.trait === 'versatile' ? 7 : 0));
      }
      person.work = round(person.work + amount);
    }
  }

  function salesDay(state) {
    for (const book of state.catalog) {
      const age = state.day - book.released;
      if (age <= 0 || age > 360) continue;
      if (book.legacyRemaining !== undefined) {
        const income = Math.min(book.legacyRemaining, book.legacyDaily);
        book.legacyRemaining = round(book.legacyRemaining - income);
        book.received = round(book.received + income);
        state.cash = round(state.cash + income);
        state.ledger.income = round(state.ledger.income + income);
        continue;
      }
      const growth = clamp(0.96 + (book.reviewScore - 55) * 0.002, 0.88, 1.045);
      const saturation = Math.max(0.1, 1 - book.units / (3500 * [1, 2, 4][book.scale]));
      book.dailyUnits = Math.max(0, book.dailyUnits * growth * (0.985 + saturation * 0.015));
      const units = Math.max(0, Math.round(book.dailyUnits));
      const income = round(units * book.price);
      book.lastDayUnits = units;
      book.lastGrowth = round((growth - 1) * 100);
      book.units += units;
      const reviews = Math.round(units * 0.12);
      if (reviews) {
        const score = clamp(audienceScore(book.metrics, book.type) + (random(state) - 0.5) * 6 / Math.sqrt(reviews), 0, 100);
        book.reviewScore = round((book.reviewScore * book.reviewCount + score * reviews) / (book.reviewCount + reviews));
        book.reviewCount += reviews;
      }
      book.followers += Math.max(0, Math.round(units * (book.reviewScore - 45) / 100));
      book.received = round(book.received + income);
      state.cash = round(state.cash + income);
      state.ledger.income = round(state.ledger.income + income);
    }
  }

  function cashWarning(state) {
    const key = Math.floor((state.day - 1) / 30);
    if (!state.company || state.cash - state.accrued >= monthlyCost(state) * 0.6 || state.notices[`cash-${key}`]) return null;
    state.notices[`cash-${key}`] = true;
    return { id: 'cash', title: '近期工资需要准备', text: `现金 ${state.cash.toFixed(2)} 万，已累计应付 ${state.accrued.toFixed(2)} 万。可以先查看团队和账单再继续。`, choices: [...(!state.bridgeUsed ? [{ id: 'bridge', title: '投入创始人积蓄', detail: '补充 35 万，整局限一次，不代表经营问题已经解决。' }] : []), { id: 'continue', title: '自行调整后继续', detail: '不获得额外资金，月底仍需支付已产生费用。' }] };
  }

  function studioCheckpoint(state) {
    const warning = cashWarning(state);
    if (warning) return warning;
    const project = state.project;
    const tutorial = state.catalog.length === 0;
    if (project) {
      const ratio = project.done / project.total;
      if (ratio >= 0.25 && !project.checkpoints.prototype) {
        project.checkpoints.prototype = true;
        studioLog(state, '可玩原型完成', '核心功能已经可以运行。开发工具可提高后续速度，但不能直接买到玩家好评。');
        if (tutorial) return { id: 'prototype', title: '第一个可玩原型', text: '程序员的工作已经变成可运行的内容。可以查看工具带来的效率变化，也可以保持现有安排。', choices: [{ id: 'tools', title: '查看开发工具', detail: '比较投入与每天产能，不自动购买。' }, { id: 'continue', title: '按现有安排开发', detail: '不额外花钱，继续制作。' }] };
      }
      if (ratio >= 0.3 && !project.checkpoints.visual) {
        project.checkpoints.visual = true;
        if (tutorial && !state.staff.some(person => person.role === 'art') && !project.assets) return { id: 'visual', title: '原型能玩，视觉还很朴素', text: '视觉不会随程序进度自动变好。美术人员负责持续制作，素材能直接提供部分成果，也可以接受当前风格。', choices: [{ id: 'recruit', title: '查看美术招聘', detail: '比较候选人与持续工资。' }, { id: 'assets', title: '采购现成素材', detail: `一次性 ${4 * [1, 1.5, 2][project.scale]} 万，完成部分视觉工作。` }, { id: 'plain', title: '保持朴素表现', detail: '不额外投入，测试时观察目标玩家是否接受。' }] };
      }
      if (ratio >= 0.55 && !project.checkpoints.demo) {
        project.checkpoints.demo = true;
        studioLog(state, 'Demo 可试玩', '可以招募试玩玩家或展示 Demo，评价与关注人数是两件不同的事。');
        if (tutorial) return { id: 'demo', title: 'Demo 已经可以交给玩家', text: '测试后才有试玩评价；测试人数、关注人数和购买人数分别记录。可以测试，也可以承担未知评价的风险继续开发。', choices: [{ id: 'test', title: '招募首批测试玩家', detail: '选择小批或较充分的样本。' }, { id: 'continue', title: '暂不测试，继续开发', detail: '保留当前投入，不凭空生成口碑。' }] };
      }
      if (ratio >= 1 && !project.checkpoints.ready) {
        project.checkpoints.ready = true;
        return { id: 'ready', title: '计划内容已完成', text: `《${project.name}》可以交付。完成度不代表玩家一定喜欢；可以检查试玩、缺陷和关注情况，再决定是否发售。`, choices: [{ id: 'launch', title: '正式发售', detail: '首发由关注人数与购买转化形成，后续销售受玩家口碑影响。' }, { id: 'polish', title: '先留出时间打磨', detail: '继续产生工资，玩法逐步改善；之后可在项目菜单发售。' }] };
      }
    }
    return null;
  }

  function monthlyCost(state) {
    return round(1.5 + state.staff.reduce((sum, person) => sum + person.wage, 0));
  }

  function stepDay(state) {
    if (state.over) throw new Error('公司已停止经营。');
    if (state.event) throw new Error('请先处理关键决策。');
    const next = clone(state);
    const warning = cashWarning(next);
    if (warning) { next.event = warning; return next; }
    next.accrued += monthlyCost(next) / 30;
    produceDay(next);
    salesDay(next);
    if (next.day % 30 === 0) {
      const payroll = round(next.accrued);
      next.cash = round(next.cash - payroll);
      next.ledger.payroll = payroll;
      next.ledger.expense = round(next.ledger.expense + payroll);
      next.report = { month: next.day / 30, ...next.ledger, closing: next.cash, net: round(next.ledger.income - next.ledger.expense) };
      next.ledger = { opening: next.cash, income: 0, expense: 0, payroll: 0 };
      next.accrued = 0;
      next.over = next.cash < 0;
      studioLog(next, `第 ${next.report.month} 月账单`, `收入 ${next.report.income.toFixed(2)} 万，支出 ${next.report.expense.toFixed(2)} 万，净变化 ${next.report.net.toFixed(2)} 万。`);
    }
    next.day += 1;
    if (!next.over) next.event = studioCheckpoint(next);
    return next;
  }

  function validStudio(state) {
    const number = value => typeof value === 'number' && Number.isFinite(value);
    const nonnegative = value => number(value) && value >= 0;
    const text = value => typeof value === 'string' && value.length <= 5000;
    const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
    const person = value => value && identifier(value.id) && text(value.name) && Object.hasOwn(ROLES, value.role) && ROLES[value.role].traits.includes(value.trait) && number(value.skill) && value.skill >= 0 && value.skill <= 100 && number(value.pace) && value.pace > 0 && value.pace <= 200 && number(value.wage) && value.wage > 0 && nonnegative(value.work) && typeof value.hired === 'boolean';
    const metrics = value => value && ['progress', 'gameplay', 'visual', 'stability', 'defects'].every(key => nonnegative(value[key]));
    const feedback = value => value && Number.isInteger(value.day) && nonnegative(value.count) && number(value.score) && value.score >= 0 && value.score <= 100 && text(value.source) && Array.isArray(value.findings) && value.findings.every(item => item && text(item.key) && text(item.title) && number(item.value) && text(item.text));
    if (!state || state.version !== 2 || !Number.isInteger(state.day) || state.day < 1 || !Number.isInteger(state.seed) || !text(state.company) || !number(state.cash) || !nonnegative(state.accrued) || typeof state.over !== 'boolean' || typeof state.bridgeUsed !== 'boolean') return false;
    if (!Array.isArray(state.staff) || state.staff.length > 16 || !state.staff.every(person) || new Set(state.staff.map(item => item.id)).size !== state.staff.length) return false;
    if (!Array.isArray(state.tools) || !state.tools.every(key => Object.hasOwn(STUDIO_TOOLS, key)) || new Set(state.tools).size !== state.tools.length) return false;
    if (!state.candidates || typeof state.candidates !== 'object' || !Object.entries(state.candidates).every(([role, pool]) => Object.hasOwn(ROLES, role) && pool && Number.isInteger(pool.batch) && Array.isArray(pool.people) && pool.people.length <= 3 && pool.people.every(item => person(item) && item.role === role))) return false;
    if (!state.ledger || !number(state.ledger.opening) || !['income', 'expense', 'payroll'].every(key => nonnegative(state.ledger[key]))) return false;
    if (!state.notices || typeof state.notices !== 'object' || !state.tutorial || typeof state.tutorial !== 'object') return false;
    if (!Array.isArray(state.history) || !state.history.every(item => item && Number.isInteger(item.day) && text(item.title) && text(item.text))) return false;
    if (state.event && (!identifier(state.event.id) || !text(state.event.title) || !text(state.event.text) || !Array.isArray(state.event.choices) || !state.event.choices.length || !state.event.choices.every(item => item && identifier(item.id) && text(item.title) && text(item.detail)))) return false;
    if (state.report && (!Number.isInteger(state.report.month) || !['opening', 'income', 'expense', 'payroll', 'closing', 'net'].every(key => number(state.report[key])))) return false;
    if (state.project) {
      const project = state.project;
      if (!identifier(project.id) || !text(project.name) || !Object.hasOwn(TYPES, project.type) || !tier(project.scale) || !['total', 'done', 'artTotal', 'artDone', 'codeValue', 'artValue', 'defects', 'defectDebt', 'polish', 'invested', 'followers', 'tests', 'testCount', 'started'].every(key => nonnegative(project[key])) || project.total <= 0 || project.artTotal <= 0 || project.done > project.total + 0.001 || project.artDone > project.artTotal + 0.001 || !['develop', 'polish', 'bugs'].includes(project.focus) || !project.checkpoints || typeof project.checkpoints !== 'object' || typeof project.assets !== 'boolean' || typeof project.plain !== 'boolean' || project.test && !feedback(project.test)) return false;
    }
    if (!Array.isArray(state.catalog) || !state.catalog.every(book => book && identifier(book.id) && text(book.name) && Object.hasOwn(TYPES, book.type) && tier(book.scale) && metrics(book.metrics) && ['released', 'invested', 'received', 'price', 'units', 'openingUnits', 'openingReceipt', 'openingFollowers', 'followers', 'dailyUnits', 'reviewScore', 'reviewCount', 'testCount', 'lastDayUnits'].every(key => nonnegative(book[key])) && book.price > 0 && number(book.lastGrowth) && (book.testScore === null || number(book.testScore)) && typeof book.tested === 'boolean' && text(book.trend) && Array.isArray(book.team) && book.team.every(item => item && text(item.name) && Object.hasOwn(ROLES, item.role) && Object.hasOwn(TRAITS, item.trait)) && (book.legacyRemaining === undefined || nonnegative(book.legacyRemaining) && nonnegative(book.legacyDaily)))) return false;
    return state.lastRelease === null || typeof state.lastRelease === 'string';
  }

  function restoreStudio(saved) {
    if (validStudio(saved)) return clone(saved);
    if (!validState(saved)) throw new Error('这不是有效的工作室存档，当前进度未改变。');
    const next = createStudio(saved.seed);
    next.day = (saved.month - 1) * 30 + 1;
    next.company = '日光工作室';
    next.cash = saved.cash;
    next.over = saved.over;
    next.bridgeUsed = saved.bridgeUsed;
    next.ledger.opening = next.cash;
    next.staff = Array.from({ length: TEAMS[saved.team].people }, (_, index) => {
      const role = index % 3 === 2 ? 'art' : 'code';
      return { id: `legacy-${index}`, name: `原团队同事 ${index + 1}`, role, skill: PAY[saved.pay].ability, pace: 85, trait: role === 'code' ? 'systems' : 'versatile', wage: PAY[saved.pay].wage, hired: true, joined: 1, work: 0 };
    });
    next.history = saved.history.map(item => ({ day: (item.month - 1) * 30 + 1, title: item.title, text: item.text }));
    if (saved.project && !next.over) {
      const source = saved.project;
      const ratio = Math.min(1, source.done / source.total);
      const started = startProject(next, { name: source.name, type: source.type, scale: source.scale });
      next.project = started.project;
      next.project.done = next.project.total * ratio;
      next.project.codeValue = next.project.done * (source.done ? source.qualityWork / source.done : PAY[saved.pay].ability);
      next.project.artDone = next.project.artTotal * ratio;
      next.project.artValue = next.project.artDone * PAY[saved.pay].ability;
      next.project.invested = source.invested;
      next.project.followers = Math.round(120 + PROMO[source.promo].reach * 1200);
      next.project.checkpoints = { prototype: ratio >= 0.25, visual: ratio >= 0.3, demo: ratio >= 0.55 };
    }
    next.catalog = saved.catalog.map((book, index) => {
      const remaining = Math.max(0, round(book.sales - book.received));
      const days = Math.max(1, 330 - (saved.month - book.released) * 30);
      return { id: `legacy-book-${index}`, name: book.name, type: book.type, scale: book.scale, released: Math.max(1, book.released * 30), metrics: { progress: 100, gameplay: book.quality, visual: book.quality, stability: book.quality, defects: 0 }, invested: book.invested, received: book.received, price: AUDIENCES[book.type].price, units: Math.round(book.received / AUDIENCES[book.type].price), openingUnits: 0, openingReceipt: book.received, openingFollowers: 0, followers: 0, dailyUnits: 0, reviewScore: book.quality, reviewCount: 0, tested: Boolean(book.tested), testScore: null, testCount: 0, trend: '旧档迁移', lastGrowth: 0, lastDayUnits: 0, team: [], legacyRemaining: remaining, legacyDaily: remaining / days };
    });
    studioLog(next, '旧档已迁移', '保留余额、作品投入与完成比例；原团队转为具名员工。旧作余款继续到账，新项目采用日级规则。');
    return next;
  }

  const api = { TYPES, SCALES, MATERIALS, TEAMS, PAY, PROMO, createGame, defaultPlan, planCost, applyPlan, takeTurn, testingOffer, runPlaytest, skipToDecision, burn, speed, personMonths, market, quality, qualityLabel, salesEstimate, tailIncome, catalogIncome, runway, forecast, resolveEvent, advance, validState, createStudio, monthlyCost, stepDay, ROLES, TRAITS, STUDIO_TOOLS, AUDIENCES, nameCompany, publishRecruitment, hire, dismiss, rates, startProject, projectMetrics, projectForecast, buyTool, buyAssets, setFocus, playtestOffer, testDemo, promote, launchProject, resolveStudioEvent, validStudio, restoreStudio };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StudioGame = api;
})(globalThis);