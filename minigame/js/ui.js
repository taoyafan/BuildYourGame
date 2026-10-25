/*
 * BuildYourGame 小游戏 UI 框架：canvas 渲染 + 触摸命中 + 弹窗菜单 + 存档 + 游戏循环。
 * 纯逻辑在 ./core.js；界面内容模型在 ./content.js。
 */
(function () {
  'use strict';

  const game = require('./core.js');

  // ==================== 平台适配 ====================

  const storageKey = 'sunlight-studio-v2';

  const store = {
    get(key) {
      try {
        const value = wx.getStorageSync(key);
        return value === '' || value === undefined || value === null ? null : value;
      } catch (error) { return null; }
    },
    set(key, value) {
      try { wx.setStorageSync(key, value); return true; } catch (error) { return false; }
    }
  };

  function askText(title, placeholder) {
    return new Promise(resolve => {
      wx.showModal({
        title,
        editable: true,
        placeholderText: placeholder,
        success: res => resolve(res.confirm ? String(res.content || '').trim() : ''),
        fail: () => resolve('')
      });
    });
  }

  // ==================== 画布 ====================

  const info = wx.getSystemInfoSync() || { windowWidth: 375, windowHeight: 667, pixelRatio: 2 };
  const W = info.windowWidth || 375;
  const H = info.windowHeight || 667;
  const DPR = info.pixelRatio || 2;

  // 右上角微信原生胶囊按钮安全区：顶栏右侧元素必须避开它（胶囊浮于画布之上）。
  // 个别设备/模拟器上该 API 可能返回物理像素或失效值，需做合理性校验，无效时回退保守预留。
  let SAFE_RIGHT = W - 110;
  let capsuleTop = 24;
  let capsuleHeight = 32;
  try {
    if (wx.getMenuButtonBoundingClientRect) {
      const rect = wx.getMenuButtonBoundingClientRect();
      if (rect && rect.left > 40 && rect.left < W - 40) {
        SAFE_RIGHT = Math.min(SAFE_RIGHT, rect.left - 8);
      }
      if (rect && rect.top > 0 && rect.top < H / 2) capsuleTop = rect.top;
      if (rect && rect.height > 0 && rect.height < 80) capsuleHeight = rect.height;
    }
  } catch (error) { /* 保留回退值 */ }

  // 顶部安全区：刘海与状态栏同样浮于画布之上（大刘海可宽达 209px、高约 37px，
  // 正压在顶栏中央），原生胶囊在刘海右侧下方。胶囊顶部必在刘海底部之下，
  // 取「状态栏高度 / 胶囊顶部」较大值 + 余量，顶部内容整体下移让开二者。
  const TOP_INSET = Math.max(info.statusBarHeight || 20, capsuleTop) + 6;

  const canvas = wx.createCanvas();
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);
  ctx.textBaseline = 'middle';

  const PAD = 14;
  const HEADER_H = 52;
  const MASTHEAD_H = 54;
  const NAV_H = 56;

  const C = {
    green: '#176b52', greenDeep: '#0f4d3a', greenSoft: '#e8f3ed', greenLine: '#c3ddd1',
    ink: '#1c2b26', body: '#3d4f49', muted: '#75857f', faint: '#a7b4af',
    line: '#e2e9e5', bg: '#f5f8f6', card: '#ffffff',
    blue: '#2f6f9f', amber: '#b45309', red: '#a63d3d', white: '#ffffff',
    art: '#b07920', artBg: '#faf2df',
    toast: 'rgba(22,38,32,0.92)'
  };

  const NAV = [['project', '项目'], ['team', '团队'], ['tools', '工具'], ['testing', '测试'], ['market', '市场'], ['finance', '公司']];

  const MILESTONES = [
    { key: 'start', label: '立项', at: 0, origin: true, done: '已启动', current: '筹备中', locked: '筹备中' },
    { key: 'proto', label: '可玩原型', at: 0.25, done: '原型已完成', current: '原型搭建中', locked: '原型搭建中' },
    { key: 'demo', label: 'Demo 可测试', at: 0.55, done: '已解锁 · 可招募试玩', current: '完成度 55% 时解锁', locked: '完成度 55% 时解锁' },
    { key: 'complete', label: '内容完成', at: 1, done: '计划内容已完成', current: '完成度 100% 时', locked: '完成度 100% 时' },
    { key: 'release', label: '发售', at: null, done: '已发售', current: '可以发售了', locked: '内容完成后可发售' }
  ];
  const MILESTONE_ETA = { proto: { left: 20, key: 'protoDays' }, demo: { left: 40, key: 'demoDays' }, complete: { left: 60, key: 'days' } };

  // ==================== 状态 ====================

  let storageAvailable = true;
  let loadNotice = '';
  let recoveryRaw = null;
  let state = load();
  let playing = false;
  let paused = false;
  let speed = 1;
  let elapsed = 0;
  let resumeAfterMenu = false;
  let routes = [];
  let toast = null;
  let toastTimer = null;
  let formDraft = { name: '', type: '', scale: 0 };
  let expandedMonths = {};
  let hits = [];
  let lastMainH = 0;
  let lastMenuH = 0;
  let peopleScroll = 0;   // 团队近况横带（网页版 .people-list 移动端 overflow-x）的横向滚动量
  let stripRect = null;   // 当前可见的横带区域（屏幕坐标），不可见时为 null 并禁掉横向滚动
  const scrollState = { main: 0, menu: 0 };

  const content = require('./content.js')({
    game,
    getState: () => state,
    getDraft: () => formDraft
  });
  const money = content.money;
  const number = content.number;

  function load() {
    try {
      const raw = store.get(storageKey) || store.get('sunlight-studio-v1');
      if (raw) {
        const saved = JSON.parse(raw);
        const restored = game.restoreStudio(saved);
        if (saved.version === 1) loadNotice = '旧档已迁移：余额和项目完成比例保留，时间暂停；原存档仍保留。';
        return restored;
      }
    } catch (error) {
      try { recoveryRaw = store.get(storageKey); } catch (e) { storageAvailable = false; }
      loadNotice = '存档无法读取；原数据未覆盖。可导入备份，或建立新公司。';
    }
    return game.createStudio();
  }

  function save() {
    if (recoveryRaw) { store.set(storageKey + '-recovery', recoveryRaw); recoveryRaw = null; }
    storageAvailable = store.set(storageKey, JSON.stringify(state));
  }

  // ==================== 绘制基元 ====================

  function setFont(size, weight) {
    if (ctx.setFontSize) { try { ctx.setFontSize(size); } catch (error) { /* 新版基础库已内置 font */ } }
    ctx.font = (weight || 400) + ' ' + size + 'px sans-serif';
  }

  function measure(text, size, weight) {
    setFont(size, weight);
    return ctx.measureText(text).width;
  }

  function ellipsis(text, maxWidth, size, weight) {
    let value = String(text);
    if (measure(value, size, weight) <= maxWidth) return value;
    while (value.length > 1 && measure(value + '…', size, weight) > maxWidth) value = value.slice(0, -1);
    return value + '…';
  }

  function wrapText(text, maxWidth, size, weight) {
    const lines = [];
    let current = '';
    for (const ch of String(text).split('')) {
      if (ch === '\n') { lines.push(current); current = ''; continue; }
      if (current && measure(current + ch, size, weight) > maxWidth) { lines.push(current); current = ch; }
      else current += ch;
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }

  function drawText(text, x, y, size, weight, color, align) {
    setFont(size, weight);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(String(text), x, y);
    ctx.textAlign = 'left';
  }

  function rr(x, y, w, h, r) {
    const rad = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function panel(x, y, w, h, opts) {
    const o = opts || {};
    rr(x, y, w, h, o.radius === undefined ? 12 : o.radius);
    ctx.fillStyle = o.fill || C.card;
    ctx.fill();
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeWidth || 1; ctx.stroke(); }
  }

  function dashed(x1, y1, x2, y2, color) {
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  // ==================== 图标（手绘线性图标，匹配网页版 Lucide 风格） ====================
  // 24×24 归一化坐标：M/L 直线，C 三次贝塞尔，Q 二次贝塞尔，A 圆弧(圆心,半径,起角,止角)，RR 圆角矩形，DOT 实心点

  const ICONS = {
    sun: [['DOT', 12, 12, 4, 'stroke'], ['M', 12, 2], ['L', 12, 4.4], ['M', 12, 19.6], ['L', 12, 22], ['M', 2, 12], ['L', 4.4, 12], ['M', 19.6, 12], ['L', 22, 12], ['M', 4.9, 4.9], ['L', 6.6, 6.6], ['M', 17.4, 17.4], ['L', 19.1, 19.1], ['M', 19.1, 4.9], ['L', 17.4, 6.6], ['M', 6.6, 17.4], ['L', 4.9, 19.1]],
    download: [['M', 12, 3], ['L', 12, 15], ['M', 7, 10], ['L', 12, 15], ['L', 17, 10], ['M', 4, 17], ['L', 4, 21], ['L', 20, 21], ['L', 20, 17]],
    upload: [['M', 12, 15], ['L', 12, 3], ['M', 7, 8], ['L', 12, 3], ['L', 17, 8], ['M', 4, 17], ['L', 4, 21], ['L', 20, 21], ['L', 20, 17]],
    rotate: [['A', 12, 12, 9, Math.PI * 1.5, Math.PI * 3], ['M', 3, 3], ['L', 3, 8], ['L', 8, 8], ['M', 11.3, 3.2], ['Q', 6.5, 3.4, 4.4, 6], ['L', 3.2, 8.1]],
    gamepad: [['RR', 2, 8, 20, 9, 4.5], ['M', 6, 12.5], ['L', 10, 12.5], ['M', 8, 10.5], ['L', 8, 14.5], ['DOT', 15, 11.5, 0.7, 'fill'], ['DOT', 18, 13.5, 0.7, 'fill']],
    users: [['DOT', 9, 7.5, 3.4, 'stroke'], ['M', 15, 21], ['L', 15, 19.5], ['A', 11, 19.5, 4, Math.PI, 0], ['L', 7, 15.5], ['A', 3, 19.5, 4, Math.PI, 0], ['L', 3, 21], ['M', 19.5, 21], ['L', 19.5, 19.4], ['A', 16.4, 16.2, 3.6, Math.PI, 0], ['A', 16, 7, 4, -Math.PI / 2, Math.PI / 2]],
    wrench: [['M', 14, 10.5], ['L', 4.5, 19.5], ['A', 16.5, 7.5, 3.6, -0.26, 4.97]],
    flask: [['M', 10, 2], ['L', 10, 7.5], ['M', 8.5, 2], ['L', 15.5, 2], ['M', 10, 7.5], ['L', 5, 17.3], ['Q', 5.6, 21, 9.2, 21], ['L', 14.8, 21], ['Q', 18.4, 21, 19, 17.3], ['L', 14, 7.5], ['M', 7.2, 16], ['L', 16.8, 16]],
    megaphone: [['M', 3, 11], ['L', 21, 6], ['L', 21, 18], ['L', 3, 13], ['L', 3, 11], ['A', 8.7, 16, 3, 0.26, 2.88]],
    receipt: [['M', 4, 2.5], ['L', 20, 2.5], ['L', 20, 15.5], ['L', 18, 17], ['L', 16, 15.5], ['L', 14, 17], ['L', 12, 15.5], ['L', 10, 17], ['L', 8, 15.5], ['L', 6, 17], ['L', 4, 15.5], ['L', 4, 2.5], ['M', 8, 7], ['L', 16, 7], ['M', 8, 10], ['L', 16, 10], ['M', 8, 13], ['L', 14, 13]],
    message: [['RR', 3, 4, 18, 12.5, 5], ['M', 8, 16.5], ['L', 6.5, 21], ['L', 13.5, 16.5]],
    userplus: [['DOT', 9, 7.5, 3.4, 'stroke'], ['M', 15, 21], ['L', 15, 19.5], ['A', 11, 19.5, 4, Math.PI, 0], ['L', 7, 15.5], ['A', 3, 19.5, 4, Math.PI, 0], ['L', 3, 21], ['M', 19, 8], ['L', 19, 14], ['M', 16, 11], ['L', 22, 11]],
    flag: [['M', 4, 22], ['L', 4, 3.5], ['M', 4, 4], ['C', 7, 3, 9.5, 6, 12.5, 6], ['C', 15.5, 6, 17.5, 4, 20.5, 4], ['L', 20.5, 13], ['C', 17.5, 13, 15.5, 15, 12.5, 15], ['C', 9.5, 15, 7, 12, 4, 13], ['L', 4, 4]],
    sparkles: [['M', 10, 1.5], ['L', 11.7, 8.3], ['L', 18.5, 10], ['L', 11.7, 11.7], ['L', 10, 18.5], ['L', 8.3, 11.7], ['L', 1.5, 10], ['L', 8.3, 8.3], ['L', 10, 1.5], ['M', 19, 3], ['L', 19.6, 5.4], ['L', 22, 6], ['L', 19.6, 6.6], ['L', 19, 9], ['L', 18.4, 6.6], ['L', 16, 6], ['L', 18.4, 5.4], ['L', 19, 3]],
    rocket: [['M', 12, 2.5], ['C', 14.5, 5.5, 15.5, 9, 15, 12.5], ['L', 9, 12.5], ['C', 8.5, 9, 9.5, 5.5, 12, 2.5], ['DOT', 12, 8, 1.4, 'stroke'], ['M', 9, 12], ['L', 5.5, 16.5], ['L', 9.5, 15.5], ['M', 15, 12], ['L', 18.5, 16.5], ['L', 14.5, 15.5], ['M', 10.5, 14.5], ['L', 12, 19.5], ['L', 13.5, 14.5]],
    activity: [['M', 2.5, 12], ['L', 6, 12], ['L', 9, 20.5], ['L', 15, 3.5], ['L', 18, 12], ['L', 21.5, 12]],
    arrow: [['M', 7, 17], ['L', 17, 7], ['M', 8, 7], ['L', 17, 7], ['L', 17, 16]],
    'arrow-left': [['M', 19, 12], ['L', 5, 12], ['M', 12, 19], ['L', 5, 12], ['L', 12, 5]],
    x: [['M', 6, 6], ['L', 18, 18], ['M', 18, 6], ['L', 6, 18]],
    play: [['M', 8, 5], ['L', 19, 12], ['L', 8, 19], ['L', 8, 5]],
    pause: [['M', 8.5, 5], ['L', 11.5, 5], ['L', 11.5, 19], ['L', 8.5, 19], ['L', 8.5, 5], ['M', 12.5, 5], ['L', 15.5, 5], ['L', 15.5, 19], ['L', 12.5, 19], ['L', 12.5, 5]]
  };
  const ICON_FILLED = { play: true, pause: true };

  function drawIcon(name, cx, cy, size, color, weight) {
    const cmds = ICONS[name];
    if (!cmds) return;
    const k = size / 24;
    const ox = cx - 12 * k;
    const oy = cy - 12 * k;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = weight || 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const c of cmds) {
      const t = c[0];
      if (t === 'M') ctx.moveTo(ox + c[1] * k, oy + c[2] * k);
      else if (t === 'L') ctx.lineTo(ox + c[1] * k, oy + c[2] * k);
      else if (t === 'C') ctx.bezierCurveTo(ox + c[1] * k, oy + c[2] * k, ox + c[3] * k, oy + c[4] * k, ox + c[5] * k, oy + c[6] * k);
      else if (t === 'Q') ctx.quadraticCurveTo(ox + c[1] * k, oy + c[2] * k, ox + c[3] * k, oy + c[4] * k);
      else if (t === 'A') {
        ctx.moveTo(ox + (c[1] + c[3] * Math.cos(c[4])) * k, oy + (c[2] + c[3] * Math.sin(c[4])) * k);
        ctx.arc(ox + c[1] * k, oy + c[2] * k, c[3] * k, c[4], c[5]);
      } else if (t === 'RR') rr(ox + c[1] * k, oy + c[2] * k, c[3] * k, c[4] * k, c[5] * k);
      else if (t === 'DOT') {
        ctx.moveTo(ox + (c[1] + c[3]) * k, oy + c[2] * k);
        ctx.arc(ox + c[1] * k, oy + c[2] * k, c[3] * k, 0, Math.PI * 2);
        if (c[4] === 'fill') ctx.fill();
      }
    }
    if (ICON_FILLED[name]) ctx.fill();
    else ctx.stroke();
    ctx.restore();
  }

  const NAV_ICONS = { project: 'gamepad', team: 'users', tools: 'wrench', testing: 'flask', market: 'megaphone', finance: 'receipt' };
  const ADVICE_ICONS = { 'receipt-text': 'receipt', 'message-circle': 'message', 'user-plus': 'userplus', 'gamepad-2': 'gamepad', wrench: 'wrench', rocket: 'rocket', 'flask-conical': 'flask', activity: 'activity' };

  function hit(x, y, w, h, action, data, disabled) {
    hits.push({ x, y, w, h, action, data: data || null, disabled: !!disabled });
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  // ==================== 按钮行 ====================

  function actionRow(x, y, w, item) {
    const detail = item.detail;
    const h = item.primary ? 48 : (detail ? 58 : 46);
    const disabled = !!item.disabled;
    panel(x, y, w, h, {
      fill: disabled ? '#f0f3f1' : (item.primary ? C.green : C.card),
      stroke: disabled ? C.line : (item.primary ? C.green : C.line),
      radius: 10
    });
    if (item.primary) {
      drawText(ellipsis(item.text, w - 32, 14, 500), x + w / 2, y + h / 2, 14, 500, disabled ? C.faint : C.white, 'center');
    } else if (detail) {
      drawText(ellipsis(item.text, w - 32, 13.5, 500), x + 14, y + 19, 13.5, 500, disabled ? C.faint : C.ink);
      wrapText(item.detail, w - 28, 11.5, 400).slice(0, 2).forEach((ln, i) => drawText(ln, x + 14, y + 38 + i * 15, 11.5, 400, disabled ? C.faint : C.muted));
    } else {
      drawText(ellipsis(item.text, w - 44, 13.5, 500), x + 14, y + h / 2, 13.5, 500, disabled ? C.faint : C.ink);
      drawText('›', x + w - 14, y + h / 2, 16, 400, disabled ? C.faint : C.greenLine, 'right');
    }
    if (!disabled) hit(x, y, w, h, item.action, item.data || null);
    return h;
  }

  // ==================== 通用积木渲染 ====================

  function renderBlocks(blocks, x, y, w, scroll, view) {
    const at = (cy, h, fn) => {
      const sy = view.top + (cy - scroll);
      if (sy + h >= view.top - 24 && sy <= view.top + view.h + 24) fn(sy);
    };
    for (const b of blocks) {
      if (b.type === 'text') {
        const lines = wrapText(b.text, w, 12.5, 400).slice(0, 6);
        const h = lines.length * 19 + 6;
        at(y, h, sy => lines.forEach((ln, i) => drawText(ln, x, sy + 14 + i * 19, 12.5, 400, b.muted ? C.muted : C.body)));
        y += h;
      } else if (b.type === 'section') {
        at(y, 30, sy => drawText(b.title, x, sy + 18, 13.5, 500, C.ink));
        y += 30;
      } else if (b.type === 'lines') {
        const h = b.items.length * 28 + 8;
        at(y, h, sy => {
          panel(x, sy, w, h - 4, { fill: C.card, stroke: C.line, radius: 10 });
          b.items.forEach((item, i) => {
            const tone = item[2] === 'down' ? C.red : item[2] === 'up' ? C.green : C.ink;
            drawText(item[0], x + 14, sy + 18 + i * 28, 12.5, 400, C.muted);
            drawText(ellipsis(item[1], w * 0.6, 12.5, 500), x + w - 14, sy + 18 + i * 28, 12.5, 500, tone, 'right');
          });
        });
        y += h;
      } else if (b.type === 'band') {
        const inner = b.lines.length * 28 + 46;
        at(y, inner, sy => {
          panel(x, sy, w, inner - 4, { fill: C.greenSoft, stroke: C.greenLine, radius: 10 });
          drawText(b.title, x + 14, sy + 22, 13.5, 500, C.greenDeep);
          b.lines.forEach((item, i) => {
            const tone = item[2] === 'down' ? C.red : item[2] === 'up' ? C.green : C.ink;
            drawText(item[0], x + 14, sy + 48 + i * 28, 12.5, 400, C.body);
            drawText(ellipsis(item[1], w * 0.6, 12.5, 500), x + w - 14, sy + 48 + i * 28, 12.5, 500, tone, 'right');
          });
        });
        y += inner;
      } else if (b.type === 'buttons' || b.type === 'choices') {
        b.items.forEach(item => {
          const h = (item.primary ? 48 : (item.detail ? 58 : 46)) + 8;
          at(y, h, sy => actionRow(x, sy, w, item));
          y += h;
        });
      } else if (b.type === 'result') {
        const h = 88;
        at(y, h, sy => {
          panel(x, sy, w, h - 6, { fill: C.greenSoft, stroke: C.greenLine, radius: 12 });
          drawText(b.label, x + w / 2, sy + 20, 11.5, 400, C.body, 'center');
          drawText(ellipsis(b.value, w - 60, 24, 500), x + w / 2, sy + 46, 24, 500, C.greenDeep, 'center');
          if (b.note) drawText(ellipsis(b.note, w - 32, 11, 400), x + w / 2, sy + 70, 11, 400, C.muted, 'center');
        });
        y += h;
      } else if (b.type === 'feedback') {
        b.items.forEach(item => {
          const h = 70;
          at(y, h, sy => {
            panel(x, sy, w, h - 6, { fill: C.card, stroke: C.line, radius: 10 });
            drawText(item.title + ' · ' + item.value.toFixed(1), x + 14, sy + 20, 12.5, 500, C.ink);
            wrapText(item.text, w - 28, 11.5, 400).slice(0, 2).forEach((ln, i) => drawText(ln, x + 14, sy + 40 + i * 15, 11.5, 400, C.muted));
          });
          y += h + 4;
        });
      } else if (b.type === 'focus') {
        const items = [['develop', '功能开发'], ['polish', '玩法打磨'], ['bugs', '修复缺陷']];
        at(y, 48, sy => {
          const cw = (w - 16) / 3;
          items.forEach((item, i) => {
            const cx = x + i * (cw + 8);
            const active = state.project.focus === item[0];
            panel(cx, sy, cw, 42, { fill: active ? C.green : C.card, stroke: active ? C.green : C.line, radius: 10 });
            drawText(item[1], cx + cw / 2, sy + 21, 12.5, 500, active ? C.white : C.body, 'center');
            hit(cx, sy, cw, 42, 'focus', { focus: item[0] });
          });
        });
        y += 48;
      } else if (b.type === 'staff') {
        if (!state.staff.length) {
          at(y, 44, sy => drawText('还没有员工。你负责制作方向，先发布程序员招聘。', x, sy + 14, 12, 400, C.muted));
          y += 44;
        } else {
          state.staff.forEach(person => {
            const h = 62;
            at(y, h, sy => {
              panel(x, sy, w, h - 8, { fill: C.card, stroke: C.line, radius: 10 });
              panel(x + 12, sy + 10, 36, 36, { fill: person.role === 'code' ? C.greenSoft : '#eef3f8', stroke: person.role === 'code' ? C.greenLine : '#cfdeeb', radius: 18 });
              drawText(person.name.slice(-1), x + 30, sy + 29, 14, 500, person.role === 'code' ? C.greenDeep : C.blue, 'center');
              const task = state.project ? (person.role === 'art' ? '视觉制作' : { develop: '功能开发', polish: '玩法打磨', bugs: '缺陷修复' }[state.project.focus]) : '等待新项目';
              drawText(ellipsis(person.name, w * 0.42, 13, 500), x + 60, sy + 20, 13, 500, C.ink);
              drawText(game.ROLES[person.role].name + ' · ' + task, x + 60, sy + 38, 11, 400, C.muted);
              drawText(person.work.toFixed(1), x + w - 14, sy + 22, 13, 500, C.ink, 'right');
              drawText('累计工作量', x + w - 14, sy + 38, 9.5, 400, C.faint, 'right');
              hit(x, sy, w, h - 8, 'menu', { menu: 'person', id: person.id });
            });
            y += h;
          });
        }
      } else if (b.type === 'candidates') {
        const pool = state.candidates[b.role];
        (pool ? pool.people : []).forEach(person => {
          const h = 72;
          at(y, h, sy => {
            panel(x, sy, w, h - 8, { fill: C.card, stroke: C.line, radius: 10 });
            drawText(ellipsis(person.name + (person.hired ? ' · 已录用' : ''), w - 44, 13, 500), x + 14, sy + 20, 13, 500, person.hired ? C.muted : C.ink);
            drawText('能力 ' + person.skill + ' · 速度 ' + person.pace + ' · 月薪 ' + money(person.wage), x + 14, sy + 38, 11, 400, C.muted);
            drawText(ellipsis(game.TRAITS[person.trait].name + '：' + game.TRAITS[person.trait].text, w - 44, 11, 400), x + 14, sy + 54, 11, 400, C.faint);
            drawText('›', x + w - 16, sy + (h - 8) / 2, 16, 400, C.greenLine, 'right');
            if (!person.hired) hit(x, sy, w, h - 8, 'menu', { menu: 'candidate', id: person.id });
          });
          y += h;
        });
      } else if (b.type === 'catalog') {
        state.catalog.forEach(book => {
          const h = 66;
          at(y, h, sy => {
            panel(x, sy, w, h - 8, { fill: C.card, stroke: C.line, radius: 10 });
            drawText(ellipsis('《' + book.name + '》', w - 44, 13, 500), x + 14, sy + 20, 13, 500, C.ink);
            drawText(number(book.units) + ' 份 · 回款 ' + money(book.received) + ' · 评价 ' + book.reviewScore.toFixed(1), x + 14, sy + 40, 11, 400, C.muted);
            drawText('›', x + w - 16, sy + (h - 8) / 2, 16, 400, C.greenLine, 'right');
            hit(x, sy, w, h - 8, 'menu', { menu: 'book', id: book.id });
          });
          y += h;
        });
      } else if (b.type === 'bills') {
        (state.reports || []).slice(0, -1).reverse().forEach(report => {
          const h = 34;
          at(y, h, sy => {
            panel(x, sy, w, h - 4, { fill: C.card, stroke: C.line, radius: 8 });
            drawText('第 ' + report.month + ' 月', x + 14, sy + 15, 12, 400, C.body);
            drawText('收入 ' + money(report.income), x + w - 92, sy + 15, 10.5, 400, C.muted, 'right');
            drawText('净 ' + money(report.net), x + w - 14, sy + 15, 11.5, 500, report.net < 0 ? C.red : C.green, 'right');
          });
          y += h;
        });
      } else if (b.type === 'tools') {
        Object.entries(game.STUDIO_TOOLS).forEach(entry => {
          const role = entry[0];
          const tool = entry[1];
          const owned = state.tools.includes(role);
          const before = game.rates(state);
          const after = game.rates({ ...state, tools: [...state.tools, role] });
          const h = 138;
          at(y, h, sy => {
            panel(x, sy, w, h - 8, { fill: C.card, stroke: C.line, radius: 10 });
            drawText(tool.name, x + 14, sy + 20, 13.5, 500, C.ink);
            wrapText(tool.text, w - 28, 11.5, 400).slice(0, 2).forEach((ln, i) => drawText(ln, x + 14, sy + 38 + i * 15, 11.5, 400, C.muted));
            drawText('当前对应产能', x + 14, sy + 76, 11.5, 400, C.muted);
            drawText(owned ? before[role].toFixed(2) + ' 工作量/天' : before[role].toFixed(2) + ' → ' + after[role].toFixed(2) + ' 工作量/天', x + w - 14, sy + 76, 11.5, 500, C.ink, 'right');
            const btnY = sy + h - 46;
            const bw = w - 28;
            const canBuy = !owned && state.cash >= tool.cost;
            panel(x + 14, btnY, bw, 34, { fill: owned || !canBuy ? '#f0f3f1' : C.green, stroke: owned || !canBuy ? C.line : C.green, radius: 8 });
            drawText(owned ? '已购置' : '购置 · ' + money(tool.cost), x + 14 + bw / 2, btnY + 17, 12.5, 500, owned || !canBuy ? C.faint : C.white, 'center');
            if (canBuy) hit(x + 14, btnY, bw, 34, 'buy-tool', { role });
          });
          y += h;
        });
      }
    }
    return y;
  }

  // ==================== 立项表单 ====================

  function renderProjectForm(x, y, w, scroll, view) {
    const at = (cy, h, fn) => {
      const sy = view.top + (cy - scroll);
      if (sy + h >= view.top - 24 && sy <= view.top + view.h + 24) fn(sy);
    };
    at(y, 44, sy => {
      panel(x, sy, w, 36, { fill: C.card, stroke: C.line, radius: 10 });
      drawText('游戏名称', x + 14, sy + 18, 12.5, 400, C.muted);
      drawText(ellipsis(formDraft.name || '为你的作品命名', w * 0.55, 13, 500), x + w - 34, sy + 18, 13, 500, formDraft.name ? C.ink : C.faint, 'right');
      drawText('›', x + w - 14, sy + 18, 16, 400, C.greenLine, 'right');
      hit(x, sy, w, 36, 'form-name');
    });
    y += 44;
    at(y, 26, sy => drawText('游戏类型', x, sy + 16, 13, 500, C.ink));
    y += 26;
    Object.entries(game.TYPES).forEach(entry => {
      const key = entry[0];
      const type = entry[1];
      const h = 60;
      at(y, h, sy => {
        const active = formDraft.type === key;
        panel(x, sy, w, h - 8, { fill: active ? C.greenSoft : C.card, stroke: active ? C.green : C.line, radius: 10 });
        drawText(type.name, x + 14, sy + 20, 13, 500, active ? C.greenDeep : C.ink);
        drawText(ellipsis(type.description, w - 70, 11, 400), x + 14, sy + 38, 11, 400, C.muted);
        panel(x + w - 40, sy + 14, 22, 22, { fill: active ? C.green : C.card, stroke: active ? C.green : C.line, radius: 11 });
        if (active) drawText('✓', x + w - 29, sy + 25, 12, 500, C.white, 'center');
        hit(x, sy, w, h - 8, 'form-type', { type: key });
      });
      y += h;
    });
    at(y, 26, sy => drawText('内容体量', x, sy + 16, 13, 500, C.ink));
    y += 26;
    game.SCALES.forEach((item, index) => {
      const h = 44;
      at(y, h, sy => {
        const active = Number(formDraft.scale) === index;
        panel(x, sy, w, h - 6, { fill: active ? C.greenSoft : C.card, stroke: active ? C.green : C.line, radius: 10 });
        drawText(item.name, x + 14, sy + 19, 12.5, 500, active ? C.greenDeep : C.ink);
        panel(x + w - 40, sy + 8, 22, 22, { fill: active ? C.green : C.card, stroke: active ? C.green : C.line, radius: 11 });
        if (active) drawText('✓', x + w - 29, sy + 19, 12, 500, C.white, 'center');
        hit(x, sy, w, h - 6, 'form-scale', { scale: index });
      });
      y += h;
    });
    const lines = wrapText(content.planPreview(), w, 11.5, 400);
    at(y, lines.length * 17 + 16, sy => {
      panel(x, sy, w, lines.length * 17 + 8, { fill: C.greenSoft, stroke: C.greenLine, radius: 10 });
      lines.forEach((ln, i) => drawText(ln, x + 14, sy + 18 + i * 17, 11.5, 400, C.greenDeep));
    });
    y += lines.length * 17 + 16 + 10;
    const ready = !!formDraft.name && !!formDraft.type;
    at(y, 52, sy => {
      panel(x, sy, w, 46, { fill: ready ? C.green : '#f0f3f1', stroke: ready ? C.green : C.line, radius: 10 });
      drawText('开始项目', x + w / 2, sy + 23, 14, 500, ready ? C.white : C.faint, 'center');
      if (ready) hit(x, sy, w, 46, 'form-submit');
    });
    y += 52;
    const note = wrapText('当前月开支 ' + money(game.monthlyCost(state)) + '，立项不额外收取费用。后续招聘、素材和推广由你决定。', w, 11, 400);
    at(y, note.length * 16 + 8, sy => note.forEach((ln, i) => drawText(ln, x, sy + 12 + i * 16, 11, 400, C.muted)));
    y += note.length * 16 + 8;
    return y;
  }

  // ==================== 经营记录 ====================

  function renderHistory(x, y, w, scroll, view) {
    const at = (cy, h, fn) => {
      const sy = view.top + (cy - scroll);
      if (sy + h >= view.top - 24 && sy <= view.top + view.h + 24) fn(sy);
    };
    const reports = state.reports || [];
    const currentMonth = content.monthOf(state.day);
    const months = new Map();
    reports.forEach(report => { if (!months.has(report.month)) months.set(report.month, { report, entries: [] }); });
    if (!months.has(currentMonth)) months.set(currentMonth, { report: null, entries: [] });
    state.history.forEach(entry => {
      const m = content.monthOf(entry.day);
      if (!months.has(m)) months.set(m, { report: null, entries: [] });
      months.get(m).entries.push(entry);
    });
    const groups = [...months.entries()].sort((l, r) => r[0] - l[0]);
    at(y, 36, sy => drawText('默认按月度汇总账单，展开某个月可查看当日明细。', x, sy + 12, 11.5, 400, C.muted));
    y += 36;
    if (!groups.length) {
      at(y, 36, sy => drawText('还没有经营记录。', x, sy + 14, 12.5, 400, C.muted));
      return y + 36;
    }
    groups.forEach(entry => {
      const month = entry[0];
      const group = entry[1];
      const open = !!expandedMonths[month];
      const headH = 46;
      at(y, headH, sy => {
        panel(x, sy, w, headH - 6, { fill: C.card, stroke: C.line, radius: 10 });
        drawText('第 ' + month + ' 月' + (group.report ? ' · 已结算' : ' · 进行中'), x + 14, sy + 20, 12.5, 500, C.ink);
        const summary = group.report ? '净 ' + money(group.report.net) : (month === currentMonth ? '已累计应付 ' + money(state.accrued) : '账单未保存');
        drawText(ellipsis(summary, w * 0.45, 11.5, 500), x + w - 34, sy + 20, 11.5, 500, group.report && group.report.net < 0 ? C.red : C.green, 'right');
        drawText(open ? '▾' : '▸', x + w - 14, sy + 20, 13, 400, C.muted, 'right');
        hit(x, sy, w, headH - 6, 'toggle-month', { month });
      });
      y += headH;
      if (!open) return;
      let inner = 0;
      if (group.report) {
        const r = group.report;
        const billItems = [['期初资金', money(r.opening)], ['收入合计', money(r.income)], ['支出合计', money(r.expense)], ['其中工资与基础开支', money(r.payroll)], ['资金净变化', money(r.net)], ['期末资金', money(r.closing)]];
        at(y, billItems.length * 26 + 44, sy => {
          panel(x, sy, w, billItems.length * 26 + 38, { fill: C.greenSoft, stroke: C.greenLine, radius: 10 });
          billItems.forEach((item, i) => {
            const tone = item[0] === '资金净变化' ? (r.net < 0 ? C.red : C.green) : C.ink;
            drawText(item[0], x + 14, sy + 20 + i * 26, 11.5, 400, C.body);
            drawText(item[1], x + w - 14, sy + 20 + i * 26, 11.5, 500, tone, 'right');
          });
        });
        inner += billItems.length * 26 + 44;
        y += billItems.length * 26 + 44;
        at(y, 26, sy => drawText('当日明细', x, sy + 16, 12.5, 500, C.ink));
        inner += 26;
        y += 26;
      }
      if (!group.entries.length) {
        at(y, 30, sy => drawText('本月暂无记录。', x, sy + 12, 11.5, 400, C.muted));
        y += 30;
        return;
      }
      group.entries.forEach(entryItem => {
        const lines = wrapText(entryItem.text, w - 20, 11, 400);
        const h = 40 + lines.length * 15;
        at(y, h, sy => {
          panel(x, sy, w, h - 6, { fill: C.card, stroke: C.line, radius: 8 });
          drawText('第 ' + entryItem.day + ' 天', x + 12, sy + 16, 10, 400, C.faint);
          drawText(ellipsis(entryItem.title, w - 90, 12, 500), x + 70, sy + 16, 12, 500, C.ink);
          lines.forEach((ln, i) => drawText(ln, x + 12, sy + 34 + i * 15, 11, 400, C.muted));
        });
        y += h;
      });
    });
    return y;
  }

  // ==================== 主界面 ====================

  function drawMilestoneTrack(project, forecast, x, y, w) {
    const progress = project.done / project.total;
    const firstPending = MILESTONES.findIndex(node => node.at === null || progress < node.at);
    const active = firstPending === -1 ? MILESTONES.length - 1 : firstPending;
    const fill = progress >= 1 ? 90 : progress >= 0.55 ? 70 + ((progress - 0.55) / 0.45) * 20 : progress >= 0.25 ? 50 + ((progress - 0.25) / 0.3) * 20 : 10 + (progress / 0.25) * 20;
    const colW = w / 5;
    const railY = y + 56;
    const posOf = index => x + w * (0.1 + index * 0.2);

    // 轨道线：前四段实线，末段（内容完成→发售）虚线
    for (let i = 1; i < MILESTONES.length; i++) {
      const from = posOf(i - 1);
      const to = posOf(i);
      if (i === MILESTONES.length - 1) dashed(from, railY, to, railY, '#c4cfca');
      else {
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(from, railY);
        ctx.lineTo(to, railY);
        ctx.stroke();
      }
    }
    // 进度填充
    const fillX = x + w * (fill / 100);
    if (fillX > posOf(0) + 1) {
      ctx.strokeStyle = C.green;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(posOf(0), railY);
      ctx.lineTo(fillX, railY);
      ctx.stroke();
    }

    MILESTONES.forEach((node, index) => {
      const nx = x + colW * (index + 0.5);
      const mx = posOf(index);
      const reached = node.at !== null && progress >= node.at;
      const phase = reached ? 'done' : index === active ? 'current' : 'locked';
      wrapText(node.label, colW - 4, 10.5, 500).slice(0, 2).forEach((ln, i) => drawText(ln, nx, y + 10 + i * 13, 10.5, 500, phase === 'locked' ? C.faint : C.ink, 'center'));
      const hint = node.origin
        ? (project.started ? '第 ' + (Math.floor((project.started - 1) / 30) + 1) + ' 月 ' + ((project.started - 1) % 30 + 1) + ' 日立项' : '已启动')
        : node[phase];
      wrapText(hint, colW - 2, 9.5, 400).slice(0, 2).forEach((ln, i) => drawText(ln, nx, railY + 16 + i * 12, 9.5, 400, phase === 'locked' ? C.faint : C.muted, 'center'));

      if (node.origin) {
        panel(mx - 4.5, railY - 4.5, 9, 9, { fill: C.green, radius: 4.5 });
      } else if (phase === 'done') {
        panel(mx - 7, railY - 7, 14, 14, { fill: C.green, radius: 7 });
        drawText('✓', mx, railY, 9, 500, C.white, 'center');
      } else if (phase === 'current') {
        panel(mx - 7, railY - 7, 14, 14, { fill: C.white, stroke: C.green, radius: 7, strokeWidth: 2 });
        panel(mx - 2.5, railY - 2.5, 5, 5, { fill: C.green, radius: 2.5 });
      } else {
        panel(mx - 5.5, railY - 5.5, 11, 11, { fill: C.white, stroke: '#cdd6d2', radius: 5.5, strokeWidth: 1.5 });
      }
    });

    // ETA chip
    const target = MILESTONES[active];
    const eta = MILESTONE_ETA[target.key];
    if (eta) {
      const value = forecast[eta.key];
      const label = value === null || value === undefined ? '待安排' : '预计 ' + value + ' 天';
      const cw = Math.max(58, measure(label, 9.5, 500) + 14);
      const cx = clamp(x + w * (eta.left / 100) - cw / 2, x, x + w - cw);
      panel(cx, y + 30, cw, 16, { fill: C.greenSoft, stroke: C.greenLine, radius: 8 });
      drawText(label, cx + cw / 2, y + 38, 9.5, 500, C.greenDeep, 'center');
      dashed(cx + cw / 2, y + 46, cx + cw / 2, railY - 8, C.greenLine);
    }
    return 84;
  }

  // 网页版 .production-meters = grid 一行三列（移动端 gap 12）：三个指标并排一行
  // 每个指标内部：标签与数值同行两端对齐 + 进度条 + 说明小字；宽度按列宽自适应截断
  function drawMeter(label, value, detail, color, x, y, w) {
    const valueText = value.toFixed(1);
    const vw = measure(valueText, 12, 500);
    drawText(ellipsis(label, Math.max(18, w - 6 - vw - 4), 10, 400), x + 2, y + 11, 10, 400, C.muted);
    drawText(valueText, x + w - 2, y + 11, 12, 500, C.ink, 'right');
    panel(x + 2, y + 20, w - 4, 5, { fill: '#edf1ef', radius: 2.5 });
    const bw = (w - 4) * clamp(value / 100, 0, 1);
    if (bw > 1) panel(x + 2, y + 20, bw, 5, { fill: color, radius: 2.5 });
    drawText(ellipsis(detail, w - 4, 9.5, 400), x + 2, y + 36, 9.5, 400, C.faint);
    return 46;
  }

  function renderMain() {
    const viewTop = TOP_INSET + MASTHEAD_H + HEADER_H + 4;
    const viewH = H - TOP_INSET - MASTHEAD_H - HEADER_H - NAV_H - 8;
    scrollState.main = clamp(scrollState.main, 0, Math.max(0, lastMainH - viewH));
    const scroll = scrollState.main;
    const x = PAD;
    const w = W - PAD * 2;
    const at = (cy, h, fn) => {
      const sy = viewTop + (cy - scroll);
      if (sy + h >= viewTop - 24 && sy <= viewTop + viewH + 24) fn(sy);
    };

    // 财务条
    const project = state.project;
    const forecast = game.projectForecast(state);
    const hint = content.advice();
    const book = state.catalog[0];

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, viewTop, W, viewH);
    ctx.clip();

    let y = 12;
    const finH = 54;
    at(y, finH, sy => {
      panel(x, sy, w, finH - 6, { fill: C.card, stroke: C.line, radius: 12 });
      const cells = [['账面资金', money(state.cash)], ['预计月开支', money(game.monthlyCost(state))], ['已累计应付', money(state.accrued)], ['研发团队', state.staff.length + ' 人']];
      const cw = w / 4;
      cells.forEach((cell, i) => {
        const cx = x + i * cw;
        if (i > 0) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, sy + 12); ctx.lineTo(cx, sy + 36); ctx.stroke(); }
        drawText(cell[0], cx + cw / 2, sy + 18, 9.5, 400, C.muted, 'center');
        drawText(ellipsis(cell[1], cw - 8, 12, 500), cx + cw / 2, sy + 34, 12, 500, C.ink, 'center');
      });
    });
    y += finH;

    // 项目区
    const deskPad = 12;
    const deskX = x;
    const deskW = w;
    // 建议横幅高度先算（网页版中它位于项目卡底部）
    const hintLines = wrapText(hint.text, w - 96, 11, 400).slice(0, 2);
    const advH = 16 + 20 + hintLines.length * 15 + 10;
    let inner = deskPad + 26 + (project ? 84 + 34 + 66 + 52 + 46 : 88) + advH + deskPad;
    at(y, inner, sy => {
      panel(deskX, sy, deskW, inner - 8, { fill: C.card, stroke: C.line, radius: 12 });
      drawText(project ? game.TYPES[project.type].name + ' / ' + content.stage(project) : '工作室 / 新的计划', deskX + deskPad, sy + 22, 10.5, 400, C.muted);
      drawText(ellipsis(project ? '《' + project.name + '》' : '下一款，做什么？', deskW - 92, 15, 500), deskX + deskPad, sy + 42, 15, 500, C.ink);
      const btnLabel = project ? '项目' : '立项';
      const btnIcon = project ? 'gamepad' : 'flag';
      panel(deskX + deskW - 76, sy + 14, 64, 28, { fill: C.greenSoft, stroke: C.greenLine, radius: 8 });
      drawIcon(btnIcon, deskX + deskW - 60, sy + 28, 14, C.greenDeep);
      drawText(btnLabel, deskX + deskW - 36, sy + 28, 11.5, 500, C.greenDeep, 'center');
      hit(deskX + deskW - 76, sy + 14, 64, 28, 'menu', { menu: 'project' });

      let cy = sy + deskPad + 40;
      if (project) {
        drawMilestoneTrack(project, forecast, deskX + deskPad, cy, deskW - deskPad * 2);
        cy += 84 + 4;
        drawText('研发完成度', deskX + deskPad, cy + 14, 11.5, 400, C.muted);
        drawText(forecast.metrics.progress.toFixed(1) + '%', deskX + deskW - deskPad, cy + 14, 13.5, 500, C.ink, 'right');
        drawText('预计还需 ' + (forecast.days === null ? '待安排' : forecast.days + ' 天'), deskX + deskW - deskPad - 90, cy + 14, 10.5, 400, C.muted, 'right');
        cy += 30;
        drawText('开发 ' + forecast.code.toFixed(2) + ' 工作量/天', deskX + deskPad, cy + 12, 11, 400, C.body);
        drawText('视觉 ' + forecast.art.toFixed(2) + ' 工作量/天', deskX + deskW - deskPad, cy + 12, 11, 400, C.body, 'right');
        cy += 24;
        // 玩法 / 视觉 / 稳定性：网页版 .production-meters 一行三列并排（gap 12），不再逐条竖排
        const mw = deskW - deskPad * 2;
        const meterGap = 12;
        const meterW = (mw - meterGap * 2) / 3;
        const meterDefs = [
          ['玩法完成情况', forecast.metrics.gameplay, project.focus === 'polish' ? '集中打磨中' : '开发与打磨逐步形成', C.green],
          ['视觉表现', forecast.metrics.visual, project.assets ? '含采购素材成果' : '由美术实际制作形成', C.art],
          ['稳定性', forecast.metrics.stability, '已知缺陷 ' + project.defects + ' 项', C.blue]
        ];
        meterDefs.forEach((def, i) => {
          drawMeter(def[0], def[1], def[2], def[3], deskX + deskPad + i * (meterW + meterGap), cy, meterW);
        });
        cy += 46 + 6;
        const cells = [
          ['关注人数', number(project.followers)],
          [project.test ? '试玩口碑' : '玩家评价', project.test ? project.test.score.toFixed(1) + ' / 100' : '尚无评价'],
          ['最近测试样本', project.test ? project.test.count + ' 人' : '未测试']
        ];
        const cw = mw / 3;
        cells.forEach((cell, i) => {
          const cx = deskX + deskPad + i * cw;
          if (i > 0) { ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx, cy + 6); ctx.lineTo(cx, cy + 36); ctx.stroke(); }
          drawText(cell[0], cx + cw / 2, cy + 14, 9.5, 400, C.muted, 'center');
          drawText(ellipsis(cell[1], cw - 6, 11.5, 500), cx + cw / 2, cy + 30, 11.5, 500, C.ink, 'center');
        });
      } else {
        panel(deskX + deskPad, sy + deskPad + 44, deskW - deskPad * 2, 62, { fill: C.greenSoft, stroke: C.greenLine, radius: 10 });
        drawText(state.company || '为工作室取一个名字', deskX + deskPad + 14, sy + deskPad + 66, 13.5, 500, C.greenDeep);
        drawText(book ? '上一作累计售出 ' + number(book.units) + ' 份，回款 ' + money(book.received) + '。' : '从一位同事、一个想法开始。', deskX + deskPad + 14, sy + deskPad + 86, 11.5, 400, C.body);
      }

      // 建议横幅：浅绿底 + 绿色左边框 + 深色文字（与网页版一致，位于项目卡底部）
      const advY = sy + inner - 8 - deskPad - advH;
      panel(deskX + deskPad, advY, deskW - deskPad * 2, advH, { fill: C.greenSoft, radius: 8 });
      ctx.fillStyle = C.green;
      ctx.fillRect(deskX + deskPad, advY, 3, advH);
      drawText(ellipsis(hint.title, deskW - deskPad * 2 - 58, 12.5, 600), deskX + deskPad + 12, advY + 16, 12.5, 600, C.ink);
      hintLines.forEach((ln, i) => drawText(ln, deskX + deskPad + 12, advY + 34 + i * 15, 11, 400, C.muted));
      const abx = deskX + deskW - deskPad - 32;
      panel(abx, advY + advH / 2 - 16, 32, 32, { fill: C.card, radius: 16 });
      drawIcon(ADVICE_ICONS[hint.symbol] || 'arrow', abx + 16, advY + advH / 2, 15, C.green);
      hit(abx, advY + advH / 2 - 16, 32, 32, 'menu', { menu: hint.menu });
    });
    y += inner;

    // 团队近况：网页版移动端为固定高度横带（.people-desk flex:0 0 90px），
    // 人员卡片一排固定 170px 宽、左右滑动（.people-list flex + overflow-x），最近动态在移动端隐藏
    stripRect = null;
    const stripH = 48;
    const peopleH = 42 + stripH + 10;
    at(y, peopleH, sy => {
      panel(x, sy, w, peopleH - 8, { fill: C.card, stroke: C.line, radius: 12 });
      drawText('工作室近况', x + 14, sy + 18, 11.5, 500, C.ink);
      panel(x + w - 76, sy + 8, 64, 26, { fill: C.greenSoft, stroke: C.greenLine, radius: 8 });
      drawIcon('users', x + w - 60, sy + 21, 14, C.greenDeep);
      drawText('团队', x + w - 36, sy + 21, 11.5, 500, C.greenDeep, 'center');
      hit(x + w - 76, sy + 8, 64, 26, 'menu', { menu: 'team' });
      const stripTop = sy + 40;
      if (state.staff.length) {
        const cardW = 170;
        const cardGap = 12;
        const contentW = state.staff.length * cardW + (state.staff.length - 1) * cardGap;
        stripRect = { x: x + 8, y: stripTop, w: w - 16, h: stripH, contentW };
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 6, stripTop - 6, w - 12, stripH + 12);
        ctx.clip();
        state.staff.forEach((person, i) => {
          const px = x + 12 + i * (cardW + cardGap) - peopleScroll;
          if (px + cardW <= stripRect.x || px >= stripRect.x + stripRect.w) return; // 视外不绘制、不注册热区
          panel(px + 8, stripTop + 10, 26, 26, { fill: person.role === 'code' ? C.greenSoft : C.artBg, radius: 6 });
          drawText(person.name.slice(-1), px + 21, stripTop + 24, 12, 500, person.role === 'code' ? C.green : C.art, 'center');
          const task = project ? (person.role === 'art' ? '视觉制作' : { develop: '功能开发', polish: '玩法打磨', bugs: '缺陷修复' }[project.focus]) : '等待新项目';
          drawText(ellipsis(person.name, cardW - 58, 11, 500), px + 42, stripTop + 17, 11, 500, C.ink);
          drawText(ellipsis(game.ROLES[person.role].name + ' · ' + task, cardW - 58, 9, 400), px + 42, stripTop + 32, 9, 400, C.muted);
          drawText(person.work.toFixed(1), px + cardW - 8, stripTop + 17, 11, 500, C.ink, 'right');
          drawText('累计工作量', px + cardW - 8, stripTop + 31, 8, 400, C.faint, 'right');
          hit(px, stripTop, cardW, stripH, 'menu', { menu: 'person', id: person.id });
        });
        ctx.restore();
      } else {
        drawText('还没有员工。你负责制作方向，先发布程序员招聘。', x + 14, stripTop + 16, 11, 400, C.muted);
      }
    });
    y += peopleH;
    ctx.restore();
    lastMainH = y + 10;
  }

  function renderMasthead() {
    // 顶栏整体下移 TOP_INSET：避开顶部大刘海（中央）与原生胶囊（右上）
    const top = TOP_INSET;
    // 底边线（网页版为 1px 墨色）
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, top + MASTHEAD_H + 0.5);
    ctx.lineTo(W, top + MASTHEAD_H + 0.5);
    ctx.stroke();
    // 左：太阳标 + 公司名 + 标语
    panel(PAD, top + 8, 28, 28, { fill: C.card, stroke: C.ink, radius: 14 });
    drawIcon('sun', PAD + 14, top + 22, 16, C.green);
    const nameX = PAD + 36;
    drawText(ellipsis(state.company || '日光工作室', SAFE_RIGHT - 100 - nameX, 14, 600), nameX, top + 19, 14, 600, C.ink);
    drawText('把下一款游戏，做出来。', nameX, top + 35, 9.5, 400, C.muted);
    // 右：存档状态 + 导出 / 导入 / 重新创业，整体避开右上角原生胶囊
    drawText(storageAvailable ? '本机存档' : '存档不可用', SAFE_RIGHT - 92, top + 27, 9, 400, C.muted, 'right');
    [['export', 'download'], ['import', 'upload'], ['menu', 'rotate']].forEach(([action, icon], i) => {
      const bx = SAFE_RIGHT - 88 + i * 30;
      panel(bx, top + 12, 28, 28, { fill: C.card, stroke: C.line, radius: 8 });
      drawIcon(icon, bx + 14, top + 26, 14, C.muted);
      // 重新创业与网页版一致：先打开确认页（可先导出存档），不在顶栏直接清档
      hit(bx, top + 12, 28, 28, action, action === 'menu' ? { menu: 'restart' } : null);
    });
  }

  function renderClockBar() {
    const top = TOP_INSET + MASTHEAD_H;
    panel(0, top, W, HEADER_H, { fill: C.card, radius: 0 });
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, top + HEADER_H);
    ctx.lineTo(W, top + HEADER_H);
    ctx.stroke();
    const month = content.monthOf(state.day);
    const day = (state.day - 1) % 30 + 1;
    // 时钟条位于顶栏下方：原生胶囊通常只压住顶栏行，压不到时钟条。
    // 胶囊底部高于控制区顶部时，倍速/暂停右对齐到屏幕边缘（与网页版一致，日期也不再被截断）；
    // 个别高胶囊设备上则回退到胶囊安全区，保证永不被遮。
    const clockRight = (capsuleTop + capsuleHeight <= top + 8) ? W - PAD : SAFE_RIGHT;
    const dateW = Math.max(48, clockRight - 142 - PAD - 6);
    drawText(ellipsis('第 ' + month + ' 月 · ' + day + ' 日', dateW, 15, 500), PAD, top + 18, 15, 500, C.ink);
    drawText(ellipsis(pauseReason(), dateW, 10.5, 400), PAD, top + 38, 10.5, 400, C.muted);

    // 控制区与网页版同序：[播放/暂停] [1x 4x 12x 分组]
    const canToggle = !!state.company && !state.event && !state.over && !routes.length;
    panel(clockRight - 142, top + 8, 40, 40, { fill: canToggle ? C.green : '#eef1ef', radius: 20 });
    drawIcon(canToggle ? (playing ? 'pause' : 'play') : 'play', clockRight - 122, top + 29, 16, canToggle ? C.white : C.faint);
    if (canToggle) hit(clockRight - 142, top + 8, 40, 40, 'clock');

    const gx = clockRight - 98;
    panel(gx, top + 8, 98, 36, { fill: C.card, stroke: C.line, radius: 6 });
    [1, 4, 12].forEach((value, i) => {
      const bx = gx + i * 33;
      const active = speed === value;
      if (active) panel(bx + 1, top + 9, 31, 34, { fill: C.greenSoft, radius: 5 });
      if (i > 0) {
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx, top + 14);
        ctx.lineTo(bx, top + 38);
        ctx.stroke();
      }
      drawText(value + 'x', bx + 16.5, top + 27, 12, active ? 700 : 400, active ? C.green : C.muted, 'center');
      hit(bx, top + 8, 33, 36, 'speed', { value });
    });
  }

  function renderNav() {
    const y = H - NAV_H;
    panel(0, y, W, NAV_H, { fill: C.card, radius: 0 });
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
    ctx.stroke();
    const cw = W / NAV.length;
    NAV.forEach((item, i) => {
      const cx = i * cw;
      const active = routes.length && routes[routes.length - 1].menu === item[0];
      if (active) panel(cx + 6, y + 6, cw - 12, NAV_H - 12, { fill: C.greenSoft, radius: 10 });
      drawIcon(NAV_ICONS[item[0]], cx + cw / 2, y + 20, 17, active ? C.green : C.muted);
      drawText(item[1], cx + cw / 2, y + 39, 10.5, 500, active ? C.greenDeep : C.muted, 'center');
      hit(cx, y, cw, NAV_H, 'menu', { menu: item[0] });
    });
  }

  function renderMenu() {
    const route = routes[routes.length - 1];
    panel(0, 0, W, H, { fill: C.bg, radius: 0 });
    // 头部整体下移 TOP_INSET：面包屑与关闭/返回按钮都要避开顶部大刘海与原生胶囊
    const headH = TOP_INSET + 84;
    panel(0, 0, W, headH, { fill: C.card, radius: 0 });
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headH);
    ctx.lineTo(W, headH);
    ctx.stroke();
    // 面包屑（仅一级菜单；二级菜单让位给返回按钮）
    if (routes.length === 1) {
      drawText('工作室 / 经营决策', PAD, TOP_INSET + 14, 10.5, 400, C.muted);
    }
    // 动作行：返回（二级）/ 标题 / 关闭。整行下移到 TOP_INSET+36，保证 36pt 高的按钮整行落在胶囊底部之下
    const rowY = TOP_INSET + 36;
    if (routes.length > 1) {
      panel(PAD, rowY, 36, 36, { fill: C.greenSoft, radius: 10 });
      drawIcon('arrow-left', PAD + 18, rowY + 18, 16, C.greenDeep);
      hit(PAD, rowY, 36, 36, 'back');
    }
    // ✕ 右对齐：胶囊底部高于本行时才贴屏幕右缘（与网页版一致），否则回退胶囊安全区
    const closeRight = (capsuleTop + capsuleHeight <= rowY) ? W - PAD : SAFE_RIGHT;
    if (state.company) {
      panel(closeRight - 36, rowY, 36, 36, { fill: C.greenSoft, radius: 10 });
      drawIcon('x', closeRight - 18, rowY + 18, 14, C.greenDeep);
      hit(closeRight - 36, rowY, 36, 36, 'close');
    }
    let special;
    if (route.menu === 'history') special = { title: '经营记录' };
    else if (route.menu === 'project' && !state.project) special = { title: '新作立项' };
    else special = content.menuContents(route) || { title: '工作室', blocks: [] };
    // 标题保持屏幕正中，仅做宽度封顶：右缘不越过 ✕ 左缘（或屏幕右内边距）
    const titleRightLimit = (state.company ? closeRight - 36 : W - PAD) - 8;
    const centerMax = Math.max(40, (titleRightLimit - W / 2) * 2);
    drawText(ellipsis(special.title, centerMax, 15.5, 500), W / 2, rowY + 18, 15.5, 500, C.ink, 'center');

    const view = { top: headH + 8, h: H - headH - 20 };
    const x = PAD;
    const w = W - PAD * 2;
    scrollState.menu = clamp(scrollState.menu, 0, Math.max(0, lastMenuH - view.h));
    const scroll = scrollState.menu;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, view.top, W, view.h);
    ctx.clip();
    let end;
    if (route.menu === 'history') end = renderHistory(x, 8, w, scroll, view);
    else if (route.menu === 'project' && !state.project) end = renderProjectForm(x, 8, w, scroll, view);
    else end = renderBlocks(special.blocks, x, 8, w, scroll, view);
    ctx.restore();
    lastMenuH = end + 12;
  }

  // 提示条几何：主视图贴在时钟条下方，菜单视图贴在菜单头部下方
  function toastBox() {
    if (!toast || Date.now() > toast.until) { toast = null; return null; }
    const lines = wrapText(toast.text, W - 72, 12, 400).slice(0, 2);
    const h = 18 + lines.length * 17;
    const y = (routes.length ? TOP_INSET + 84 : TOP_INSET + MASTHEAD_H + HEADER_H) + 10;
    return { x: 24, y, w: W - 48, h, lines };
  }

  function drawToast() {
    const box = toastBox();
    if (!box) return;
    panel(box.x, box.y, box.w, box.h, { fill: C.toast, radius: 10 });
    box.lines.forEach((ln, i) => drawText(ln, box.x + box.w / 2, box.y + 14 + i * 17, 12, 400, C.white, 'center'));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    hits = [];
    stripRect = null; // 每次重画重置；横带不可见（菜单视图或滚出视口）时禁掉横向滚动
    if (routes.length) renderMenu();
    else { renderMasthead(); renderClockBar(); renderMain(); renderNav(); }
    drawToast();
  }

  // ==================== 交互与流程 ====================

  function pauseReason() {
    if (state.over) return '经营结束';
    if (!state.company) return '等待公司命名';
    if (state.event) return '等待决策 · ' + state.event.title;
    if (routes.length) return '菜单中 · 时间暂停';
    return playing ? '正常经营中' : '手动暂停';
  }

  function clearToast(redraw) {
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
    if (toast) { toast = null; if (redraw) draw(); }
  }

  function notify(message) {
    // 2.4 秒后由定时器强制清除并重画——暂停/无交互时 gameTick 早退、不会自动重画，
    // 仅靠 until 判定会让过期 toast 永久挂在屏上直到下次交互，必须显式定时清除
    if (toastTimer) clearTimeout(toastTimer);
    toast = { text: String(message), until: Date.now() + 2400 };
    toastTimer = setTimeout(() => {
      toastTimer = null;
      toast = null;
      draw();
    }, 2500);
    draw();
  }

  function update(next, message) {
    state = next;
    save();
    if (state.event) {
      playing = false;
      openMenu('event', null, true);
    } else {
      if (state.over) { playing = false; resumeAfterMenu = false; }
      draw();
    }
    if (message) notify(message);
  }

  function openMenu(menu, id, critical) {
    if (!routes.length) { resumeAfterMenu = playing; playing = false; elapsed = 0; scrollState.menu = 0; }
    if (critical || menu === 'event' || menu === 'setup') resumeAfterMenu = false;
    if (critical) routes = [];
    routes.push({ menu, id: id === undefined ? null : id });
    if (menu === 'project' && !state.project) formDraft = { name: '', type: '', scale: 0 };
    draw();
  }

  function closeMenu() {
    if (!state.company) return;
    routes = [];
    playing = resumeAfterMenu && !state.event && !state.over && !paused;
    resumeAfterMenu = false;
    elapsed = 0;
    draw();
  }

  async function askCompanyName() {
    const value = await askText('成立你的工作室', '例如：日光工作室');
    if (!value) return;
    try {
      update(game.nameCompany(state, value));
      resumeAfterMenu = false;
      closeMenu();
      notify('工作室已成立。先招募一位程序员，时间仍保持暂停。');
    } catch (error) { notify(error.message || '命名失败，请重试。'); }
  }

  async function askProjectName() {
    const value = await askText('游戏名称', '为你的作品命名');
    if (value) { formDraft.name = value; draw(); }
  }

  async function importSave() {
    const raw = await askText('导入存档', '粘贴此前导出的存档 JSON');
    if (!raw) return;
    try {
      const restored = game.restoreStudio(JSON.parse(raw));
      playing = false;
      resumeAfterMenu = false;
      routes = [];
      update(restored, '存档已恢复，时间保持暂停。');
      if (!state.company) openMenu('setup', null, true);
    } catch (error) { notify(error.message || '导入失败，当前进度未改变。'); }
  }

  function dispatch(action, data) {
    data = data || {};
    try {
      switch (action) {
        case 'clock':
          if (!state.company) { openMenu('setup', null, true); break; }
          if (state.event) { openMenu('event', null, true); break; }
          if (state.over || routes.length) break;
          playing = !playing;
          elapsed = 0;
          draw();
          break;
        case 'speed': speed = Number(data.value); draw(); break;
        case 'menu': openMenu(data.menu, data.id); break;
        case 'close': closeMenu(); break;
        case 'back': routes.pop(); draw(); break;
        case 'name-company': askCompanyName(); break;
        case 'form-name': askProjectName(); break;
        case 'form-type': formDraft.type = data.type; draw(); break;
        case 'form-scale': formDraft.scale = data.scale; draw(); break;
        case 'form-submit':
          try {
            update(game.startProject(state, { name: formDraft.name, type: formDraft.type, scale: Number(formDraft.scale) }));
            closeMenu();
            notify('项目已立项，准备好后开始时间。');
          } catch (error) { notify(error.message); }
          break;
        case 'recruit': update(game.publishRecruitment(state, data.role), '简历已收到；本批候选人不会因重开菜单改变。'); break;
        case 'hire': update(game.hire(state, data.id), '同事已加入。产能预估已变化，实际成果从工作开始产生。'); break;
        case 'dismiss':
          update(game.dismiss(state, data.id), '员工已离职，已产生的工资保留。');
          routes = [{ menu: 'team', id: null }];
          draw();
          break;
        case 'buy-tool': update(game.buyTool(state, data.role), '工具已购置，对应岗位的产能已更新。'); break;
        case 'assets': update(game.buyAssets(state), '素材已投入，视觉表现与资金已更新。'); break;
        case 'plain': update({ ...state, project: { ...state.project, plain: true } }, '保留朴素风格，后续通过试玩观察玩家是否接受。'); break;
        case 'focus': update(game.setFocus(state, data.focus), '工作重点已调整；实际改善随工作产生。'); break;
        case 'test': update(game.testDemo(state, Number(data.count)), '测试完成，反馈已经送达。'); break;
        case 'promote': update(game.promote(state, Number(data.tier)), '推广完成，新增关注已记录；不保证实际购买。'); break;
        case 'launch': update(game.launchProject(state)); break;
        case 'decision': {
          const choice = data.choice;
          update(game.resolveStudioEvent(state, choice));
          if (!state.event) {
            routes = [{ menu: choice === 'tools' ? 'tools' : choice === 'recruit' ? 'recruit-art' : choice === 'test' ? 'testing' : choice === 'visual' ? 'visual' : 'project', id: null }];
            resumeAfterMenu = false;
            draw();
          }
          break;
        }
        case 'export':
          wx.setClipboardData({
            data: JSON.stringify(state),
            success: () => notify('存档已复制到剪贴板，可粘贴到笔记等应用保存。'),
            fail: () => notify('复制失败，请重试或改用网页版导出。')
          });
          break;
        case 'import': importSave(); break;
        case 'toggle-month': expandedMonths[data.month] = !expandedMonths[data.month]; draw(); break;
        case 'restart':
          playing = false;
          resumeAfterMenu = false;
          routes = [];
          update(game.createStudio());
          openMenu('setup', null, true);
          break;
        default: break;
      }
    } catch (error) { notify(error.message || '本次操作未执行。'); }
  }

  // ==================== 游戏循环 ====================

  function gameTick(delta) {
    if (!playing || routes.length || state.event || state.over || paused) return;
    elapsed += delta * speed;
    try {
      while (elapsed >= 1000 && playing && !state.event && !state.over) {
        elapsed -= 1000;
        const previousMonth = state.report ? state.report.month : 0;
        state = game.stepDay(state);
        save();
        if (state.event) { playing = false; openMenu('event', null, true); }
        else if (state.over) { playing = false; notify('公司未能支付月底开支，经营结束。'); }
        else if (state.report && state.report.month !== previousMonth) notify('第 ' + state.report.month + ' 月结算：收入 ' + money(state.report.income) + '，支出 ' + money(state.report.expense) + '。');
        else draw();
      }
    } catch (error) { playing = false; notify(error.message); }
  }

  setInterval(() => gameTick(100), 100);

  wx.onHide(() => {
    if (playing || resumeAfterMenu) { playing = false; resumeAfterMenu = false; elapsed = 0; }
    paused = true;
    draw();
  });
  wx.onShow(() => { paused = false; draw(); });

  // ==================== 触摸 ====================

  let touchInfo = null;

  wx.onTouchStart(event => {
    const t = event.touches && event.touches[0];
    if (!t) return;
    // 落在团队横带内：本次拖动同时驱动横向滚动（网页版移动端 .people-list 左右滑动）
    const inStrip = !!stripRect && t.clientX >= stripRect.x && t.clientX <= stripRect.x + stripRect.w
      && t.clientY >= stripRect.y - 8 && t.clientY <= stripRect.y + stripRect.h + 8;
    touchInfo = { x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t0: Date.now(), moved: 0, strip: inStrip };
  });

  wx.onTouchMove(event => {
    if (!touchInfo) return;
    const t = event.touches && event.touches[0];
    if (!t) return;
    const dx = t.clientX - touchInfo.x;
    const dy = t.clientY - touchInfo.y;
    touchInfo.x = t.clientX;
    touchInfo.y = t.clientY;
    touchInfo.moved += Math.abs(dx) + Math.abs(dy);
    const key = routes.length ? 'menu' : 'main';
    const viewH = routes.length ? H - (TOP_INSET + 84) - 20 : H - TOP_INSET - MASTHEAD_H - HEADER_H - NAV_H - 8;
    const contentH = routes.length ? lastMenuH : lastMainH;
    scrollState[key] = clamp(scrollState[key] - dy, 0, Math.max(0, contentH - viewH));
    // 团队横带横向滚动（与纵向滚动互不干扰：纵拖仍然滚页面）
    if (touchInfo.strip && stripRect) {
      peopleScroll = clamp(peopleScroll - dx, 0, Math.max(0, stripRect.contentW - stripRect.w));
    }
    draw();
  });

  wx.onTouchEnd(() => {
    if (!touchInfo) return;
    const info = touchInfo;
    touchInfo = null;
    if (info.moved > 8 || Date.now() - info.t0 > 600) return;
    // 点按提示条本体即取消：既缩短停留时间，也给玩家立即消除的入口
    const box = toastBox();
    if (box && info.sx >= box.x && info.sx <= box.x + box.w && info.sy >= box.y && info.sy <= box.y + box.h) {
      clearToast(true);
      return;
    }
    for (let i = hits.length - 1; i >= 0; i--) {
      const r = hits[i];
      if (r.disabled) continue;
      if (info.sx >= r.x && info.sx <= r.x + r.w && info.sy >= r.y && info.sy <= r.y + r.h) {
        dispatch(r.action, r.data);
        return;
      }
    }
  });

  wx.onTouchCancel(() => { touchInfo = null; });

  // ==================== 启动 ====================

  draw();
  if (!state.company) openMenu('setup', null, true);
  else if (state.event) openMenu('event', null, true);
  if (loadNotice) notify(loadNotice);

  // 调试/测试钩子（Node 冒烟测试与开发者工具调试用）
  globalThis.StudioDebug = {
    get state() { return state; },
    get playing() { return playing; },
    get routes() { return routes.map(r => r.menu); },
    get draft() { return formDraft; },
    get hits() { return hits.map(h => ({ action: h.action, data: h.data, x: h.x, y: h.y, w: h.w, h: h.h })); },
    get toast() { return toast ? { text: toast.text, left: Math.max(0, toast.until - Date.now()) } : null; },
    get strip() { return stripRect; },
    get peopleScroll() { return peopleScroll; },
    openMenu, closeMenu, dispatch, draw, notify,
    tick: gameTick,
    setSpeed: v => { speed = v; },
    setPlaying: v => { playing = v; elapsed = 0; }
  };
})();
