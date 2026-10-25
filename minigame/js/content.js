/*
 * 内容模型层：由 state 生成各界面的描述模型（blocks），渲染与交互在 ui.js。
 * 本文件对应 HTML 版 app.js 的 menuContents / advice 等纯内容函数，零绘制代码。
 */
module.exports = function (env) {
  const game = env.game;

  const money = value => Number(value).toFixed(2) + ' 万';
  const number = value => Math.round(value).toLocaleString('zh-CN');
  const monthOf = day => Math.floor((day - 1) / 30) + 1;

  function stage(project) {
    const progress = project.done / project.total;
    return progress >= 1 ? '交付准备' : progress >= 0.55 ? 'Demo 与完善' : progress >= 0.25 ? '内容制作' : '可玩原型';
  }

  function advice() {
    const state = env.getState();
    if (state.over) return { title: '公司未能支付月底开支', text: '作品与收支记录已保留，可以导出本次经营记录。', menu: 'finance', symbol: 'receipt-text' };
    if (state.event) return { title: state.event.title, text: '关键决策正在等待，不会因加速跳过。', menu: 'event', symbol: 'message-circle' };
    if (!state.staff.some(person => person.role === 'code')) return { title: '先找到能把想法做出来的同事', text: '你负责产品方向与预算，程序员负责开发和修复。', menu: 'recruit-code', symbol: 'user-plus' };
    if (!state.project) return { title: state.catalog.length ? '下一款，延续优势还是换个方向？' : '团队已经可以启动第一款作品', text: '选定作品类型与名称，比较工作量和当前产能。', menu: 'project', symbol: 'gamepad-2' };
    if (state.project.focus !== 'develop' && state.project.done < state.project.total) return { title: '团队正在改进已有体验', text: '打磨和修复会暂缓新内容；完成后可切回内容开发。', menu: 'project', symbol: 'wrench' };
    if (state.project.done >= state.project.total) return { title: '计划内容已完成，等待交付', text: '检查试玩、缺陷与关注情况后，可在项目菜单正式发售。', menu: 'project', symbol: 'rocket' };
    if (game.playtestOffer(state).available && !state.project.test) return { title: 'Demo 已可测试', text: '没有试玩前不显示玩家评价，测试可以帮助识别短板。', menu: 'testing', symbol: 'flask-conical' };
    return { title: '工作正在持续进行', text: '招聘、工具和工作重点可随时调整；现有安排无需重复确认。', menu: 'project', symbol: 'activity' };
  }

  function recruitmentBlocks(role) {
    const state = env.getState();
    const pool = state.candidates[role];
    const blocks = [{ type: 'text', text: game.ROLES[role].task + '。工资按实际在职天数累计，月底结算。' }];
    if (pool) {
      blocks.push({ type: 'text', text: '本批名单保持至第 ' + (pool.batch + 1) * 14 + ' 天；关闭菜单不会重抽。', muted: true });
      blocks.push({ type: 'candidates', role });
    } else {
      blocks.push({ type: 'text', text: '发布岗位后，候选人会提交不同能力和期望工资的简历。', muted: true });
    }
    const batchNow = Math.floor((state.day - 1) / 14);
    blocks.push({
      type: 'buttons',
      items: [{ text: pool ? '检查新一批简历' : '发布招聘', action: 'recruit', data: { role }, primary: true, disabled: !!(pool && pool.batch === batchNow) }]
    });
    return blocks;
  }

  function candidateMenu(route) {
    const state = env.getState();
    const person = Object.values(state.candidates).flatMap(pool => pool.people).find(item => item.id === route.id);
    if (!person) return { title: '简历已更新', blocks: [{ type: 'text', text: '请返回查看当前候选人。' }] };
    const projected = { ...state, staff: [...state.staff, person] };
    const before = game.rates(state);
    const after = game.rates(projected);
    const forecast = game.projectForecast(projected);
    return {
      title: person.name + ' / ' + game.ROLES[person.role].name,
      blocks: [
        { type: 'lines', items: [['能力', String(person.skill)], ['速度基准', String(person.pace)], ['期望月薪', money(person.wage)]] },
        { type: 'text', text: game.TRAITS[person.trait].name + '：' + game.TRAITS[person.trait].text },
        { type: 'section', title: '录用后的预期变化' },
        {
          type: 'lines',
          items: [
            ['月开支', money(game.monthlyCost(state)) + ' → ' + money(game.monthlyCost(projected))],
            [person.role === 'code' ? '当前阶段开发产能' : '视觉制作产能', before[person.role].toFixed(2) + ' → ' + after[person.role].toFixed(2) + ' 工作量/天'],
            ['内容预计剩余', forecast ? (forecast.days === null ? '需切回内容开发' : forecast.days + ' 天') : '']
          ]
        },
        { type: 'text', text: '入职后开始工作，不即时增加作品表现；实际成果随时间产生。', muted: true },
        { type: 'buttons', items: [{ text: person.hired ? '已录用' : '录用 · ' + money(person.wage) + '/月', action: 'hire', data: { id: person.id }, primary: true, disabled: !!person.hired }] }
      ]
    };
  }

  function personMenu(route) {
    const state = env.getState();
    const person = state.staff.find(item => item.id === route.id);
    if (!person) return { title: '员工已离职', blocks: [{ type: 'text', text: '可以返回团队查看其他同事。' }] };
    return {
      title: person.name,
      blocks: [
        { type: 'lines', items: [['岗位', game.ROLES[person.role].name], ['月薪', money(person.wage)], ['能力 / 速度', person.skill + ' / ' + person.pace], ['累计实际工作', person.work.toFixed(2)]] },
        { type: 'text', text: game.TRAITS[person.trait].text },
        { type: 'text', text: '已产生的工资不会因离职取消。', muted: true },
        { type: 'buttons', items: [{ text: '结束雇佣关系', action: 'menu', data: { menu: 'dismiss', id: person.id } }] }
      ]
    };
  }

  function testingMenu() {
    const state = env.getState();
    const project = state.project;
    const offer = game.playtestOffer(state);
    if (!project) return { title: 'Demo / 玩家反馈', blocks: [{ type: 'text', text: '先立项并完成可试玩的 Demo。' }] };
    const blocks = [];
    if (project.test) {
      blocks.push({ type: 'result', label: '试玩口碑', value: project.test.score.toFixed(1), note: project.test.count + ' 人 · 第 ' + project.test.day + ' 天；累计参与 ' + project.testCount + ' 人次' });
      blocks.push({ type: 'feedback', items: project.test.findings });
      blocks.push({ type: 'text', text: '评价对应测试时的版本；修改后需要复测，才知道新一批玩家是否认可。', muted: true });
    } else {
      blocks.push({ type: 'text', text: '尚无玩家评价。测试用来观察目标玩家的体验，不等于购买，也不保证市场定论。' });
    }
    blocks.push({
      type: 'buttons',
      items: [
        { text: '招募 30 人 · 0.80 万', action: 'test', data: { count: 30 }, disabled: !offer.available || state.cash < 0.8 },
        { text: '招募 100 人 · 2.00 万', action: 'test', data: { count: 100 }, disabled: !offer.available || state.cash < 2 }
      ]
    });
    if (!offer.available) blocks.push({ type: 'text', text: offer.reason || '先处理关键决策', muted: true });
    return { title: 'Demo / 玩家反馈', blocks };
  }

  function marketMenu() {
    const state = env.getState();
    const project = state.project;
    const blocks = [];
    if (project) {
      blocks.push({ type: 'lines', items: [['当前作品关注人数', number(project.followers)]] });
      blocks.push({ type: 'text', text: '关注是潜在受众，不是销量；推广不直接改善体验。' + game.market(project.type, Math.ceil(state.day / 30)).description });
      blocks.push({
        type: 'buttons',
        items: ['核心圈层', '试玩展示', '集中推广'].map((name, index) => ({
          text: name + ' · ' + money([2, 6, 12][index]),
          action: 'promote',
          data: { tier: index },
          disabled: project.done < project.total * 0.55 || state.cash < [2, 6, 12][index]
        }))
      });
    }
    blocks.push({ type: 'section', title: '已发售作品' });
    if (state.catalog.length) blocks.push({ type: 'catalog' });
    else blocks.push({ type: 'text', text: '作品完成并发售后，在这里继续观察销售与玩家评价。', muted: true });
    return { title: '市场与作品', blocks };
  }

  function bookMenu(route) {
    const state = env.getState();
    const book = state.catalog.find(item => item.id === route.id);
    if (!book) return { title: '作品档案', blocks: [{ type: 'text', text: '没有找到该作品。' }] };
    return {
      title: '《' + book.name + '》',
      blocks: [
        { type: 'result', label: '正式玩家评价', value: book.reviewScore.toFixed(1), note: number(book.reviewCount) + ' 位评价者；' + (book.tested ? '发售前有试玩反馈' : '发售前未测试') },
        {
          type: 'lines',
          items: [
            ['首发关注人数', number(book.openingFollowers)],
            ['首发购买', number(book.openingUnits) + ' 份'],
            ['首发到账', money(book.openingReceipt)],
            ['累计销量', number(book.units) + ' 份'],
            ['累计回款', money(book.received)],
            ['项目投入', money(book.invested)],
            [book.received >= book.invested ? '项目结余' : '尚差回本', money(Math.abs(book.received - book.invested))],
            ['最近一日销量', book.lastDayUnits + ' 份'],
            ['发售时市场', book.trend]
          ]
        },
        { type: 'text', text: '关注影响首发基础，实际体验影响玩家评价与后续传播。工具是公司资产，未全部计入单个项目投入；公司账单包含实际收支。', muted: true },
        { type: 'section', title: '团队与作品' },
        { type: 'text', text: book.team.length ? book.team.map(p => p.name + '（' + game.ROLES[p.role].name + '）').join('、') : '旧档作品' },
        { type: 'lines', items: [['玩法 / 视觉 / 稳定性', book.metrics.gameplay.toFixed(1) + ' / ' + book.metrics.visual.toFixed(1) + ' / ' + book.metrics.stability.toFixed(1)]] }
      ]
    };
  }

  function financeMenu() {
    const state = env.getState();
    const blocks = [{
      type: 'lines',
      items: [['账面资金', money(state.cash)], ['本月已累计应付', money(state.accrued)], ['预计月开支', money(game.monthlyCost(state))]]
    }];
    if (state.report) {
      const r = state.report;
      blocks.push({
        type: 'band',
        title: '第 ' + r.month + ' 月账单',
        lines: [
          ['期初资金', money(r.opening)],
          ['收入合计', money(r.income)],
          ['支出合计', money(r.expense)],
          ['其中工资与基础开支', money(r.payroll)],
          ['资金净变化', money(r.net), r.net < 0 ? 'down' : 'up'],
          ['期末资金', money(r.closing)]
        ]
      });
    } else {
      blocks.push({ type: 'text', text: '月底生成完整账单；采购与测试等即时支出已计入本月。', muted: true });
    }
    if ((state.reports || []).length > 1) {
      blocks.push({ type: 'section', title: '历史月度账单' });
      blocks.push({ type: 'bills' });
      blocks.push({ type: 'text', text: '逐月账单与当日明细，可在「经营记录」中展开查看。', muted: true });
    }
    blocks.push({
      type: 'buttons',
      items: [
        { text: '查看全部经营记录', action: 'menu', data: { menu: 'history' } },
        { text: '导出存档', action: 'export' },
        { text: '导入存档', action: 'import' },
        { text: '重新创业', action: 'menu', data: { menu: 'restart' } }
      ]
    });
    return { title: (state.company || '公司') + ' / 经营记录', blocks };
  }

  function eventMenu() {
    const state = env.getState();
    const event = state.event;
    if (!event) return { title: '决策已处理', blocks: [{ type: 'text', text: '可关闭窗口，准备好后继续经营。' }] };
    const released = event.id === 'release' ? state.catalog.find(book => book.id === state.lastRelease) : null;
    const blocks = [{ type: 'text', text: event.text }];
    if (released) {
      blocks.push({ type: 'result', label: '首发实际到账', value: '+' + money(released.openingReceipt) });
      blocks.push({
        type: 'lines',
        items: [
          ['累计项目投入', money(released.invested)],
          ['正式玩家评价', released.reviewScore.toFixed(1) + ' · ' + released.reviewCount + ' 人'],
          [released.received >= released.invested ? '已回本，项目结余' : '尚未回本，缺口', money(Math.abs(released.received - released.invested))]
        ]
      });
      blocks.push({ type: 'buttons', items: [{ text: '查看完整发售复盘', action: 'menu', data: { menu: 'book', id: released.id } }] });
    }
    blocks.push({
      type: 'choices',
      items: event.choices.map(choice => ({
        text: choice.title,
        detail: choice.detail,
        action: 'decision',
        data: { choice: choice.id },
        disabled: choice.id === 'assets' && state.project && state.cash < 4 * [1, 1.5, 2][state.project.scale]
      }))
    });
    blocks.push({ type: 'text', text: '关键决策处理后保持暂停，由你继续时间。', muted: true });
    return { title: event.title, blocks };
  }

  function planPreview() {
    const state = env.getState();
    const draft = env.getDraft();
    const type = draft.type;
    if (!game.AUDIENCES[type]) return '选择类型后查看工作量、受众和预估时间。';
    const scale = Number(draft.scale);
    const workload = game.AUDIENCES[type].work * [1, 1.65, 2.4][scale];
    const forecast = game.projectForecast(game.startProject(state, { name: '预估作品', type, scale }));
    const base = game.AUDIENCES[type].name + '；计划工作量 ' + workload.toFixed(1) + '。';
    if (forecast.days === null) return base + '尚无程序员，招聘后才能推进。';
    return base + '当前团队预计 ' + forecast.days + ' 天，研发期间费用约 ' + money(game.monthlyCost(state) * forecast.days / 30) + '；不含可选采购、测试与推广。';
  }

  function menuContents(route) {
    const state = env.getState();
    const project = state.project;
    switch (route.menu) {
      case 'setup':
        return {
          title: '成立你的工作室',
          blocks: [
            { type: 'text', text: '你负责产品方向、预算与用人。先为公司取名，再找到把想法做出来的同事。' },
            { type: 'buttons', items: [{ text: '为公司命名', action: 'name-company', primary: true }] }
          ]
        };
      case 'project':
        if (!project) return null;
        return {
          title: '《' + project.name + '》',
          blocks: [
            {
              type: 'lines',
              items: [
                ['当前阶段', stage(project)],
                ['预计剩余', (function () { const f = game.projectForecast(state); return f.days === null ? '当前不推进内容开发' : f.days + ' 天'; })()],
                ['已投入', money(project.invested)],
                ['受众', game.AUDIENCES[project.type].name]
              ]
            },
            { type: 'section', title: '程序团队工作重点' },
            { type: 'focus' },
            { type: 'text', text: '打磨和修复暂停新增内容，但不会让已完成工作消失。', muted: true },
            {
              type: 'buttons',
              items: [
                { text: '视觉制作与素材', action: 'menu', data: { menu: 'visual' } },
                { text: 'Demo 与测试反馈', action: 'menu', data: { menu: 'testing' } },
                { text: '展示与推广', action: 'menu', data: { menu: 'market' } },
                { text: '正式发售', action: 'launch', disabled: project.done < project.total - 0.001 }
              ]
            }
          ]
        };
      case 'team':
        return {
          title: '团队管理',
          blocks: [
            { type: 'lines', items: [['团队规模', state.staff.length + ' / 16 人'], ['月开支含基础费用', money(game.monthlyCost(state))]] },
            {
              type: 'buttons',
              items: [
                { text: '招聘程序员', action: 'menu', data: { menu: 'recruit-code' } },
                { text: '招聘美术', action: 'menu', data: { menu: 'recruit-art' } }
              ]
            },
            { type: 'staff' }
          ]
        };
      case 'recruit-code': return { title: '招聘 / 程序员', blocks: recruitmentBlocks('code') };
      case 'recruit-art': return { title: '招聘 / 美术', blocks: recruitmentBlocks('art') };
      case 'candidate': return candidateMenu(route);
      case 'person': return personMenu(route);
      case 'dismiss':
        return {
          title: '确认结束雇佣',
          blocks: [
            { type: 'text', text: '员工离职后停止产出与后续计薪；此前工作、已累计工资保留。' },
            { type: 'buttons', items: [{ text: '确认离职', action: 'dismiss', data: { id: route.id }, primary: true }] }
          ]
        };
      case 'tools':
        return {
          title: '工作工具',
          blocks: [
            { type: 'text', text: '工具属于公司，可用于后续作品；没有对应岗位时不会凭空产出。' },
            { type: 'tools' }
          ]
        };
      case 'visual':
        return {
          title: '视觉制作',
          blocks: project ? [
            { type: 'lines', items: [['视觉表现', game.projectMetrics(project).visual.toFixed(1)], ['美术人数', String(state.staff.filter(p => p.role === 'art').length)]] },
            { type: 'text', text: '美术持续制作，素材直接提供部分视觉成果；也可接受朴素画面，观察目标玩家评价。' },
            {
              type: 'buttons',
              items: [
                { text: '查看美术招聘', action: 'menu', data: { menu: 'recruit-art' } },
                { text: project.assets ? '已采购素材' : '采购素材 · ' + money(4 * [1, 1.5, 2][project.scale]), action: 'assets', disabled: !!project.assets },
                { text: '保持朴素风格', action: 'plain' }
              ]
            }
          ] : [{ type: 'text', text: '请先立项。' }]
        };
      case 'testing': return testingMenu();
      case 'market': return marketMenu();
      case 'book': return bookMenu(route);
      case 'finance': return financeMenu();
      case 'history': return null;
      case 'restart':
        return {
          title: '重新创业？',
          blocks: [
            { type: 'text', text: '当前进度将被新公司覆盖。需要保留本次经历，可以先导出。' },
            {
              type: 'buttons',
              items: [
                { text: '导出当前存档', action: 'export' },
                { text: '确认重新创业', action: 'restart', primary: true }
              ]
            }
          ]
        };
      case 'event': return eventMenu();
      default: return { title: '工作室', blocks: [{ type: 'text', text: '请选择经营菜单。' }] };
    }
  }

  return { money, number, monthOf, stage, advice, menuContents, planPreview };
};
