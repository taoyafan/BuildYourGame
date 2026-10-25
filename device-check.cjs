'use strict';
/*
 * 真机参数设备校验：模拟 iPhone X 类设备（W=390、大刘海、右上原生胶囊 left=281 top=45 h=37）
 * 验证：✕ 右缘、标题居中、指标一行三列、团队横带、热区不压胶囊、toast 定时器
 * 运行：node device-check.cjs
 */
const storage = new Map();
const modals = [];
const clipboards = [];
const touch = {};
const CJK = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/;

function createCtxStub() {
  let fontSize = 12;
  const noop = () => { };
  const stub = {
    _font: '', _strokes: 0, _fills: 0, _texts: [],
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

// iPhone X 类：W=390，状态栏 44，胶囊 left=281 top=45 宽 94 高 37（底部 82）；safeArea.bottom 810 → 底部安全区 34 → HOME_INSET 封顶 16
global.wx = {
  getSystemInfoSync: () => ({ windowWidth: 390, windowHeight: 844, pixelRatio: 3, statusBarHeight: 44, screenHeight: 844, safeArea: { top: 44, right: 390, bottom: 810, left: 0, width: 390, height: 766 } }),
  getMenuButtonBoundingClientRect: () => ({ left: 281, right: 375, top: 45, bottom: 82, width: 94, height: 37 }),
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
global.setInterval = () => 0;

let passed = 0;
function ok(cond, message) {
  if (!cond) { console.error('FAIL: ' + message); process.exit(1); }
  passed += 1;
  console.log('ok - ' + message);
}
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
function answerModal(confirm, content) {
  const opts = modals.shift();
  if (opts.success) opts.success({ confirm, content });
}
function textRight(entry) {
  ctxStub.setFontSize(entry.size);
  const w = ctxStub.measureText(entry.text).width;
  if (entry.align === 'center') return entry.x + w / 2;
  if (entry.align === 'right') return entry.x;
  return entry.x + w;
}

(async () => {
  const core = require('./minigame/js/core.js');
  for (const path of ['./minigame/js/ui.js', './minigame/js/content.js', './minigame/js/core.js']) delete require.cache[require.resolve(path)];
  require('./minigame/js/ui.js');
  const StudioDebug = globalThis.StudioDebug;

  // 命名 + 招一名程序员 + 立项，进入有项目有团队的主界面
  StudioDebug.dispatch('name-company');
  answerModal(true, '真机校验');
  await flush();
  StudioDebug.dispatch('menu', { menu: 'recruit-code' });
  StudioDebug.dispatch('recruit', { role: 'code' });
  StudioDebug.dispatch('hire', { id: StudioDebug.state.candidates.code.people[0].id });
  StudioDebug.openMenu('project');
  StudioDebug.dispatch('form-type', { type: 'story' });
  StudioDebug.dispatch('form-scale', { scale: 0 });
  StudioDebug.dispatch('form-name');
  answerModal(true, '真机之作');
  await flush();
  StudioDebug.dispatch('form-submit');
  ok(StudioDebug.state.project && StudioDebug.state.staff.length === 1, '已立项并有 1 名员工');

  StudioDebug.draw();
  const W = 390, H = 844, PAD = 14;
  // 1. 顶部安全区：胶囊（281..375, 45..82）不得压到任何热区
  const capsuleZone = { x: 273, y: 41, w: 110, h: 46 };
  const onCapsule = StudioDebug.hits.filter(h => h.x < capsuleZone.x + capsuleZone.w && h.x + h.w > capsuleZone.x && h.y < capsuleZone.y + capsuleZone.h && h.y + h.h > capsuleZone.y);
  ok(onCapsule.length === 0, '主界面无热区压在原生胶囊区域（capsuleTop=45 h=37）');
  // 2. 时钟控制区右缘到屏幕边缘（胶囊底部 82 压不到时钟条行）
  const controlRight = Math.max(...StudioDebug.hits.filter(h => h.action === 'speed' || h.action === 'clock').map(h => h.x + h.w));
  ok(controlRight >= W - PAD - 1 && controlRight <= W - PAD + 1, '倍速/暂停控制区右对齐屏幕边缘（' + (W - PAD) + '）');
  // 3. 菜单：✕ 右缘到屏幕边缘 + 标题居中
  StudioDebug.openMenu('team');
  ctxStub._texts.length = 0;
  StudioDebug.draw();
  const closeBtn = StudioDebug.hits.find(h => h.action === 'close');
  ok(closeBtn && closeBtn.x + closeBtn.w === W - PAD, '菜单 ✕ 右对齐屏幕边缘（' + (W - PAD) + '）');
  ok(closeBtn.y >= 45 + 37 - 1, '菜单 ✕ 整行在胶囊底部之下（y=' + closeBtn.y + ' >= 82）');
  const rowTexts = ctxStub._texts.filter(t => t.align === 'center' && t.y >= closeBtn.y && t.y <= closeBtn.y + closeBtn.h);
  ok(rowTexts.length === 1, '菜单动作行只有一个居中标题');
  ok(Math.abs(rowTexts[0].x - W / 2) < 0.01, '标题居中于屏幕正中（' + W / 2 + '）');
  ok(textRight(rowTexts[0]) <= closeBtn.x, '标题右缘不越过 ✕ 左缘');
  StudioDebug.dispatch('close');
  // 4. 指标一行三列（不压胶囊、不超出卡片）
  ctxStub._texts.length = 0;
  StudioDebug.draw();
  const meters = ctxStub._texts.filter(t => t.text === '玩法完成情况' || t.text === '视觉表现' || t.text === '稳定性');
  ok(meters.length === 3, '三个指标都渲染');
  const mYs = meters.map(t => t.y);
  ok(Math.max(...mYs) - Math.min(...mYs) <= 2, '三个指标同一行（一行三列）');
  const mXs = meters.map(t => t.x).sort((a, b) => a - b);
  ok(mXs[0] > PAD && mXs[2] + 60 < W - PAD, '三列均在项目卡内且不越界');
  // 5. 团队横带几何
  const strip = StudioDebug.strip;
  ok(!!strip, '团队横带已渲染');
  ok(strip.x >= PAD && strip.x + strip.w <= W - PAD + 1, '横带不超出屏幕左右边距');
  const personHits = StudioDebug.hits.filter(h => h.action === 'menu' && h.data && h.data.menu === 'person');
  ok(personHits.length === 1 && personHits[0].w === 170, '员工卡片 170px 宽且在横带内');
  ok(personHits[0].y >= strip.y - 1 && personHits[0].y + personHits[0].h <= strip.y + strip.h + 1, '卡片热区与横带区域一致');
  // 6. toast：定时器强制清除
  const realSetTimeout = global.setTimeout;
  let timerFn = null;
  global.setTimeout = (fn, ms) => { timerFn = fn; return 1; };
  StudioDebug.notify('真机提示');
  global.setTimeout = realSetTimeout;
  ok(!!timerFn, 'notify 注册了强制清除定时器');
  timerFn();
  ok(StudioDebug.toast === null, '定时器到点 toast 强制清除');
  // 7. 横带拖动
  touch.start({ touches: [{ clientX: strip.x + 40, clientY: strip.y + 24 }] });
  touch.move({ touches: [{ clientX: strip.x + 40 - 30, clientY: strip.y + 24 }] });
  touch.end({ touches: [] });
  ok(StudioDebug.peopleScroll === 0, '单名员工内容不足一屏时横向滚动保持 0（不抖动）');
  // 8. 底部导航上提：整条与文字标签都避开 home 控制条（真机条位于 H-15..H-10）
  const navHits2 = StudioDebug.hits.filter(h => h.action === 'menu' && h.y > 750);
  ok(navHits2.length === 6, '底部导航 6 个按钮都有热区');
  ok(StudioDebug.homeInset === 16, 'safeArea 底部差 34 → 封顶 16pt 上提量');
  ok(navHits2.every(h => h.y + h.h === H - StudioDebug.homeInset), '底部导航整体上提 ' + StudioDebug.homeInset + 'pt，底边（' + (H - StudioDebug.homeInset) + '）在 home 控制条顶（' + (H - 15) + '）之上');
  const navLabels = ctxStub._texts.filter(t => t.y > 700 && (t.text === '项目' || t.text === '团队' || t.text === '公司'));
  ok(navLabels.length >= 3, '导航文字标签已渲染');
  ok(navLabels.every(t => t.y <= H - 25), '标签基线（' + Math.max(...navLabels.map(t => t.y)) + '）距 home 控制条顶（' + (H - 15) + '）留足 10pt，不再被压字');

  console.log('\n真机参数校验全部通过：' + passed + ' 项');
  process.exit(0);
})().catch(error => { console.error('ERROR', error); process.exit(1); });
