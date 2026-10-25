'use strict';
/*
 * 小游戏版冒烟测试：用 Node 垫片模拟 wx API 与 canvas 2D 上下文，
 * 驱动 minigame/js/ui.js 完成 命名→招聘→立项→研发→全菜单→导出导入→重开 全流程。
 * 运行：node minigame-smoke.cjs
 */

// ---------- wx 垫片 ----------

const storage = new Map();
const modals = [];
const clipboards = [];
const touch = {};

const CJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;

function createCtxStub() {
  let fontSize = 12;
  const noop = () => { };
  const stub = {
    _font: '',
    _strokes: 0,
    _fills: 0,
    _texts: [],
    get font() { return this._font; },
    set font(value) {
      this._font = value;
      const match = /(\d+(?:\.\d+)?)px/.exec(value);
      if (match) fontSize = parseFloat(match[1]);
    },
    setFontSize(value) { fontSize = value; },
    measureText(text) {
      let width = 0;
      for (const ch of String(text)) width += CJK.test(ch) ? fontSize : fontSize * 0.56;
      return { width };
    },
    scale: noop, clearRect: noop, fillRect: noop, strokeRect: noop, rect: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    arc: noop, arcTo: noop,
    stroke() { stub._strokes += 1; },
    fill() { stub._fills += 1; },
    save: noop, restore: noop, clip: noop, setLineDash: noop,
    fillText(text, x, y) { stub._texts.push({ text: String(text), x, y, size: fontSize, align: stub.textAlign }); },
    drawImage: noop,
    fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: 'left', textBaseline: 'alphabetic'
  };
  return stub;
}

const ctxStub = createCtxStub();

global.wx = {
  getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 2 }),
  getMenuButtonBoundingClientRect: () => ({ left: 280, right: 367, top: 24, bottom: 56, width: 87, height: 32 }),
  createCanvas: () => ({ width: 0, height: 0, getContext: () => ctxStub }),
  getStorageSync: key => (storage.has(key) ? storage.get(key) : ''),
  setStorageSync: (key, value) => { storage.set(key, String(value)); },
  setClipboardData: opts => { clipboards.push(opts.data); if (opts.success) opts.success(); },
  showModal: opts => { modals.push(opts); },
  onHide: fn => { touch.hide = fn; },
  onShow: fn => { touch.show = fn; },
  onTouchStart: fn => { touch.start = fn; },
  onTouchMove: fn => { touch.move = fn; },
  onTouchEnd: fn => { touch.end = fn; },
  onTouchCancel: fn => { touch.cancel = fn; }
};

global.setInterval = () => 0; // 游戏循环由测试手动 tick 驱动

// ---------- 断言工具 ----------

let passed = 0;
function ok(cond, message) {
  if (!cond) { console.error('FAIL: ' + message); process.exit(1); }
  passed += 1;
  console.log('ok - ' + message);
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function answerModal(confirm, content) {
  const opts = modals.shift();
  if (!opts) throw new Error('没有待处理的弹窗');
  if (opts.success) opts.success({ confirm, content });
}

function loadUi() {
  for (const path of ['./minigame/js/ui.js', './minigame/js/content.js', './minigame/js/core.js']) delete require.cache[require.resolve(path)];
  require('./minigame/js/ui.js');
  return globalThis.StudioDebug;
}

function tap(x, y) {
  touch.start({ touches: [{ clientX: x, clientY: y }] });
  touch.end({ touches: [] });
}

// 由记录的 fillText 调用反推文字右缘（对齐方式 + 垫片测宽）
function textRight(entry) {
  ctxStub.setFontSize(entry.size);
  const w = ctxStub.measureText(entry.text).width;
  if (entry.align === 'center') return entry.x + w / 2;
  if (entry.align === 'right') return entry.x;
  return entry.x + w;
}

// ---------- 主流程 ----------

(async () => {
  const core = require('./minigame/js/core.js');
  let StudioDebug = loadUi();

  // 1. 启动
  ok(StudioDebug.routes.includes('setup'), '无公司时自动弹出成立工作室');
  ok(StudioDebug.state.company === '', '初始没有公司名');
  StudioDebug.draw();
  ok(StudioDebug.hits.length > 0, '菜单有点击热区');

  // 2. 命名
  StudioDebug.dispatch('name-company');
  ok(modals.length === 1, '点击命名弹出输入框');
  answerModal(true, '测试工作室');
  await flush();
  ok(StudioDebug.state.company === '测试工作室', '公司命名生效');
  ok(StudioDebug.routes.length === 0, '命名后菜单关闭');

  // 3. 主界面与时间控制
  StudioDebug.draw();
  const clock = StudioDebug.hits.find(h => h.action === 'clock');
  ok(!!clock, '主界面有时钟按钮');
  ok(StudioDebug.hits.some(h => h.action === 'speed'), '主界面有速度按钮');
  ok(StudioDebug.hits.filter(h => h.action === 'menu').length >= 6, '主界面有导航菜单');
  ok(StudioDebug.hits.some(h => h.action === 'export'), '顶栏有导出按钮');
  ok(StudioDebug.hits.some(h => h.action === 'import'), '顶栏有导入按钮');
  // 重新创业按钮与网页版一致：打开确认页（可先导出），不在顶栏直接清档
  const restartBtn = StudioDebug.hits.find(h => h.action === 'menu' && h.data && h.data.menu === 'restart');
  ok(!!restartBtn, '顶栏重新创业按钮打开确认页而非直接重开');
  // 时钟控制区右缘：胶囊（垫片 top=24 height=32 → 底部 56）压不到时钟条（顶部 92），应到达屏幕边缘
  const controlRight = Math.max(...StudioDebug.hits.filter(h => h.action === 'speed' || h.action === 'clock').map(h => h.x + h.w));
  ok(controlRight >= 375 - 14 && controlRight <= 375 - 14 + 2, '倍速/暂停控制区右对齐到屏幕边缘（375-14=361），不再提前让位胶囊');
  ok(StudioDebug.hits.some(h => h.action === 'menu' && h.data && h.data.menu === 'recruit-code'), '建议横幅按钮可达（无程序员时指向招聘）');
  // 顶部安全区：原生胶囊（垫片 left=280）与刘海区域不得压到任何热区
  const capsuleZone = { x: 272, y: 20, w: 103, h: 40 };
  const onCapsule = StudioDebug.hits.filter(h => h.x < capsuleZone.x + capsuleZone.w && h.x + h.w > capsuleZone.x && h.y < capsuleZone.y + capsuleZone.h && h.y + h.h > capsuleZone.y);
  ok(onCapsule.length === 0, '主界面无热区压在原生胶囊区域');
  const exportHit = StudioDebug.hits.find(h => h.action === 'export');
  ok(exportHit && exportHit.y >= 30, '顶栏按钮已下移让位刘海/状态栏（TOP_INSET）');
  const strokesBefore = ctxStub._strokes;
  StudioDebug.draw();
  ok(ctxStub._strokes > strokesBefore, '主界面执行了矢量绘制（图标与线条）');
  // 提示条：约 2.4 秒自动消失，点按提示条本体可立即取消
  StudioDebug.notify('测试提示');
  const toast0 = StudioDebug.toast;
  ok(toast0 && toast0.left > 2000 && toast0.left <= 2400, '提示条时长约 2.4 秒（原 4.2 秒）');
  tap(24 + (375 - 48) / 2, 30 + 54 + 52 + 10 + 17);
  ok(StudioDebug.toast === null, '点按提示条本体可立即取消');
  // 点击顶栏重新创业只进确认页，公司进度不被清空
  const companyBeforeTap = StudioDebug.state.company;
  tap(restartBtn.x + restartBtn.w / 2, restartBtn.y + restartBtn.h / 2);
  ok(StudioDebug.routes.includes('restart'), '点击重新创业进入确认页');
  ok(StudioDebug.state.company === companyBeforeTap, '确认页阶段进度未被清空');
  StudioDebug.dispatch('close');
  ok(StudioDebug.routes.length === 0, '关闭确认页回到主界面');
  StudioDebug.draw();
  tap(clock.x + clock.w / 2, clock.y + clock.h / 2);
  ok(StudioDebug.playing === true, '点击时钟开始经营');
  const day0 = StudioDebug.state.day;
  StudioDebug.tick(1000);
  ok(StudioDebug.state.day === day0 + 1, 'tick 1000ms 推进一天');
  StudioDebug.dispatch('speed', { value: 4 });
  StudioDebug.tick(1000);
  ok(StudioDebug.state.day === day0 + 5, '4 倍速下 tick 推进 4 天');
  StudioDebug.setPlaying(false);
  ok(StudioDebug.playing === false, '手动暂停');

  // 4. 招聘与录用
  StudioDebug.openMenu('team');
  ok(StudioDebug.routes[StudioDebug.routes.length - 1] === 'team', '打开团队菜单');
  StudioDebug.dispatch('menu', { menu: 'recruit-code' });
  StudioDebug.dispatch('recruit', { role: 'code' });
  const pool = StudioDebug.state.candidates.code;
  ok(pool && pool.people.length > 0, '发布招聘产生候选人');
  StudioDebug.openMenu('candidate', pool.people[0].id);
  StudioDebug.draw();
  ok(StudioDebug.hits.some(h => h.action === 'close'), '菜单页有关闭按钮（避开原生胶囊）');
  ok(StudioDebug.hits.some(h => h.action === 'back'), '二级菜单页有返回按钮');
  StudioDebug.dispatch('hire', { id: pool.people[0].id });
  ok(StudioDebug.state.staff.some(p => p.id === pool.people[0].id), '录用成功');
  ok(StudioDebug.state.staff.some(p => p.role === 'code'), '团队拥有程序员');

  // 5. 立项表单
  StudioDebug.openMenu('project');
  StudioDebug.dispatch('form-type', { type: 'story' });
  StudioDebug.dispatch('form-scale', { scale: 0 });
  ok(StudioDebug.draft.type === 'story' && StudioDebug.draft.scale === 0, '表单类型与体量选择');
  StudioDebug.dispatch('form-name');
  answerModal(true, '测试之作');
  await flush();
  ok(StudioDebug.draft.name === '测试之作', '表单名称输入');
  StudioDebug.draw();
  StudioDebug.dispatch('form-submit');
  ok(StudioDebug.state.project && StudioDebug.state.project.name === '测试之作', '项目立项成功');
  ok(StudioDebug.routes.length === 0, '立项后菜单关闭');

  // 6. 研发推进与里程碑
  StudioDebug.setPlaying(true);
  for (let i = 0; i < 40 && StudioDebug.state.project && StudioDebug.state.project.done <= 0; i += 1) StudioDebug.tick(1000);
  ok(StudioDebug.state.project && StudioDebug.state.project.done > 0, '经营后项目产生推进');
  StudioDebug.setPlaying(false);
  StudioDebug.dispatch('focus', { focus: 'polish' });
  ok(StudioDebug.state.project.focus === 'polish', '切换工作重点为打磨');
  StudioDebug.dispatch('focus', { focus: 'develop' });
  StudioDebug.draw();
  ok(true, '含里程碑轨道的主界面渲染无异常');

  // 7. 遍历全部菜单
  const menus = ['project', 'team', 'tools', 'visual', 'testing', 'market', 'finance', 'history', 'restart', 'recruit-code', 'recruit-art'];
  for (const menu of menus) {
    StudioDebug.openMenu(menu);
    StudioDebug.draw();
  }
  ok(true, '全部菜单渲染无异常');
  StudioDebug.openMenu('history');
  StudioDebug.dispatch('toggle-month', { month: 1 });
  StudioDebug.draw();
  ok(true, '经营记录展开无异常');
  if (StudioDebug.state.staff.length) {
    StudioDebug.openMenu('person', StudioDebug.state.staff[0].id);
    ctxStub._texts.length = 0;
    StudioDebug.draw();
    ok(true, '员工详情渲染无异常');
    const personClose = StudioDebug.hits.find(h => h.action === 'close');
    const rowTexts = ctxStub._texts.filter(t => t.align === 'center' && t.y >= personClose.y && t.y <= personClose.y + personClose.h);
    ok(rowTexts.length > 0 && rowTexts.every(t => textRight(t) <= personClose.x), '菜单标题右缘不越过关闭按钮左缘（✕ 不压字）');
  }

  // 8. 导出与导入
  StudioDebug.openMenu('finance');
  StudioDebug.dispatch('export');
  ok(clipboards.length === 1, '导出写入剪贴板');
  const backup = clipboards[0];
  const parsed = JSON.parse(backup);
  ok(parsed.day === StudioDebug.state.day, '导出内容与当前进度一致');
  StudioDebug.dispatch('import');
  answerModal(true, backup);
  await flush();
  ok(StudioDebug.state.day === parsed.day, '导入恢复存档');
  StudioDebug.dispatch('restart');
  ok(StudioDebug.state.company === '' && StudioDebug.routes.includes('setup'), '重新创业回到命名');

  // 9. 触摸滚动与点击 discrimination
  StudioDebug.answerAsk = null;
  touch.start({ touches: [{ clientX: 100, clientY: 400 }] });
  touch.move({ touches: [{ clientX: 100, clientY: 300 }] });
  touch.move({ touches: [{ clientX: 100, clientY: 220 }] });
  touch.end({ touches: [] });
  ok(true, '触摸滚动无异常');
  // 重启后先重新命名（无公司名时命名窗不可关闭），回到主界面再验证底部导航
  StudioDebug.dispatch('name-company');
  answerModal(true, '第二世');
  await flush();
  ok(StudioDebug.routes.length === 0, '再次命名后回到主界面');
  StudioDebug.draw();
  const navHit = StudioDebug.hits.find(h => h.action === 'menu' && h.y > 600);
  ok(!!navHit, '底部导航有热区');

  // ---------- 阶段 B：存档路径 ----------

  // B1 有效 v2 存档恢复
  storage.clear();
  modals.length = 0;
  let seedState = core.createStudio();
  seedState = core.nameCompany(seedState, '续档工作室');
  seedState = core.publishRecruitment(seedState, 'code');
  seedState = core.hire(seedState, seedState.candidates.code.people[0].id);
  seedState = core.startProject(seedState, { name: '旧项目', type: 'sim', scale: 1 });
  seedState.day = 45;
  storage.set('sunlight-studio-v2', JSON.stringify(seedState));
  StudioDebug = loadUi();
  ok(StudioDebug.state.company === '续档工作室', '重启后从 v2 存档恢复公司');
  ok(StudioDebug.state.day === 45, '重启后恢复天数');
  ok(StudioDebug.state.project.name === '旧项目', '重启后恢复项目');
  ok(StudioDebug.routes.length === 0, '有公司时不弹命名窗');

  // B2 损坏存档回退新公司
  storage.clear();
  storage.set('sunlight-studio-v2', '{ 坏掉的 json');
  StudioDebug = loadUi();
  ok(StudioDebug.state.company === '', '损坏存档回退到新公司');
  ok(StudioDebug.routes.includes('setup'), '损坏存档仍弹出命名窗');

  // B3 v1 旧档迁移
  storage.clear();
  storage.set('sunlight-studio-v2', JSON.stringify({
    version: 1, month: 3, cash: 42.5, team: 0, pay: 1, seed: 12345, pace: 1, lastCrisis: 0,
    bridgeUsed: false, over: false,
    events: [], history: [{ month: 1, title: '公司成立', text: '一切从头开始。' }],
    catalog: [],
    project: { name: '旧作', type: 'story', scale: 0, material: 0, promo: 0, total: 100, done: 40, qualityWork: 30, bonus: 0, reachBonus: 0, invested: 20, started: 31 }
  }));
  StudioDebug = loadUi();
  ok(StudioDebug.state.company === '日光工作室', 'v1 旧档迁移为日光工作室');
  ok(StudioDebug.state.staff.length === 3, 'v1 旧档团队转为 3 名员工');
  ok(StudioDebug.state.project && StudioDebug.state.project.name === '旧作', 'v1 旧档项目保留');
  ok(Math.abs(StudioDebug.state.project.done / StudioDebug.state.project.total - 0.4) < 0.01, 'v1 旧档完成比例保留（40%）');
  StudioDebug.draw();
  ok(true, '迁移后主界面渲染无异常');

  // B4 隐藏/恢复暂停
  StudioDebug.setPlaying(true);
  touch.hide();
  ok(StudioDebug.playing === false, '退到后台自动暂停');
  touch.show();
  ok(StudioDebug.playing === false, '回到前台保持暂停（由玩家继续）');

  console.log('\n全部通过：' + passed + ' 项断言');
  process.exit(0);
})().catch(error => {
  console.error('ERROR', error);
  process.exit(1);
});
