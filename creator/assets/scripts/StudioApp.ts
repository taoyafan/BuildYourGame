import {
  _decorator, Component, Node, Canvas, Camera, Color, Layers, UITransform, Label,
  view, screen, ResolutionPolicy, Graphics, Sprite, SpriteFrame, resources, ScrollView,
  Mask, EditBox, Button, HorizontalTextAlignment, VerticalTextAlignment, Texture2D,
  game as engineGame, Game, tween, UIOpacity
} from 'cc';
import core from './generated/logic';
import createContent from './generated/content';
import { platform } from './Platform';

const { ccclass } = _decorator;
const colors = {
  bg: '#f3f6f2', paper: '#ffffff', ink: '#243c34', muted: '#76877d',
  green: '#1b6651', soft: '#e5eee7', line: '#d7e2d9', amber: '#a57024',
  blue: '#497899', danger: '#a7463c', pale: '#edf2ee'
};
const navigation = [
  ['project', '项目', 'FolderKanban'], ['team', '团队', 'Users'],
  ['tools', '工具', 'Wrench'], ['testing', '试玩', 'FlaskConical'],
  ['market', '市场', 'ChartNoAxesCombined'], ['finance', '公司', 'Building2']
];

@ccclass('StudioApp')
export class StudioApp extends Component {
  state: any;
  playing = false;
  speed = 1;
  private elapsed = 0;
  private resumeAfterMenu = false;
  private routes: any[] = [];
  private draft = { name: '', type: '', scale: 0 };
  private content: any;
  private stage: Node;
  private canvas: Node;
  private camera: Camera;
  private width = 390;
  private height = 844;
  private top = 18;
  private bottom = 16;
  private policy = -1;
  private frames = new Map<string, SpriteFrame>();
  private frameLoads = new Map<string, Array<(frame: SpriteFrame) => void>>();
  private inputRequest: any = null;
  private notice = '';
  private storageIssue = '';
  private clearNotice = () => { this.notice = ''; this.render(); };

  start() {
    view.setDesignResolutionSize(390, 844, ResolutionPolicy.FIXED_WIDTH);
    this.canvas = new Node('StudioCanvas');
    this.canvas.layer = Layers.Enum.UI_2D;
    this.node.addChild(this.canvas);
    this.canvas.addComponent(UITransform).setContentSize(view.getVisibleSize());
    const surface = this.canvas.addComponent(Canvas);
    const cameraNode = new Node('Camera');
    this.canvas.addChild(cameraNode);
    cameraNode.setPosition(0, 0, 1000);
    this.camera = cameraNode.addComponent(Camera);
    this.camera.projection = Camera.ProjectionType.ORTHO;
    this.camera.near = 0;
    this.camera.far = 2000;
    this.camera.visibility = Layers.Enum.UI_2D;
    this.camera.clearColor = new Color(colors.bg);
    surface.cameraComponent = this.camera;
    this.stage = this.box(this.canvas, 'Interface', 0, 0, 390, 844);
    this.state = this.load();
    this.content = createContent({ game: core, getState: () => this.state, getDraft: () => this.draft });
    if (!this.state.company) this.routes = [{ menu: 'setup' }];
    else if (this.state.event) this.routes = [{ menu: 'event' }];
    this.resize();
    screen.on('window-resize', this.resize, this);
    engineGame.on(Game.EVENT_HIDE, this.background, this);
    platform.onHide(() => { if (this.isValid) this.background(); });
    if (this.storageIssue) this.notify(this.storageIssue);
  }

  onDestroy() {
    screen.off('window-resize', this.resize, this);
    engineGame.off(Game.EVENT_HIDE, this.background, this);
  }

  private resize() {
    const frame = screen.windowSize;
    const policy = frame.width / frame.height > 0.75 ? ResolutionPolicy.SHOW_ALL : ResolutionPolicy.FIXED_WIDTH;
    if (this.policy !== policy) {
      this.policy = policy;
      view.setDesignResolutionSize(390, 844, policy);
    }
    const size = view.getVisibleSize();
    this.width = size.width;
    this.height = size.height;
    const safe = platform.insets();
    this.top = safe.top;
    this.bottom = safe.bottom;
    this.canvas.setPosition(size.width / 2, size.height / 2);
    this.camera.orthoHeight = size.height / 2;
    this.stage.getComponent(UITransform).setContentSize(size);
    this.stage.setPosition(-size.width / 2, size.height / 2);
    this.render();
  }

  private background() {
    this.playing = false;
    this.resumeAfterMenu = false;
    this.elapsed = 0;
    this.save();
    this.render();
  }

  update(delta: number) {
    if (!this.playing || this.routes.length || this.inputRequest || this.state?.event || this.state?.over) return;
    this.elapsed += Math.min(delta, 0.25) * this.speed;
    let changed = false;
    try {
      while (this.elapsed >= 1 && !this.state.event && !this.state.over) {
        this.elapsed -= 1;
        this.state = core.stepDay(this.state);
        changed = true;
        if (this.state.event) {
          this.playing = false;
          this.resumeAfterMenu = false;
          this.routes = [{ menu: 'event' }];
        }
      }
      if (this.state.over) this.playing = false;
      if (changed) { this.save(); this.render(); }
    } catch (error) {
      this.playing = false;
      this.notify(error.message);
    }
  }

  private load() {
    try {
      const raw = platform.read() || platform.read('sunlight-studio-v1');
      if (raw) return core.restoreStudio(JSON.parse(raw));
    } catch {
      try {
        const raw = platform.read();
        if (raw) platform.write(raw, 'sunlight-studio-v2-recovery');
      } catch { this.storageIssue = '本地存档不可用，请及时导出进度。'; }
      this.storageIssue ||= '存档无法读取；原数据保留在恢复副本中。';
    }
    return core.createStudio();
  }

  private save() {
    try { platform.write(JSON.stringify(this.state)); }
    catch { this.storageIssue = '本地保存失败，请从公司菜单导出进度。'; }
  }

  private box(parent: Node, name: string, x: number, y: number, width: number, height: number, fill?: string, radius = 0) {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    parent.addChild(node);
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0, 1);
    transform.setContentSize(width, height);
    node.setPosition(x, -y);
    if (fill) {
      const graphics = node.addComponent(Graphics);
      graphics.fillColor = new Color(fill);
      if (radius) graphics.roundRect(0, -height, width, height, radius);
      else graphics.rect(0, -height, width, height);
      graphics.fill();
    }
    return node;
  }

  private text(parent: Node, value: any, x: number, y: number, width: number, height = 24, size = 14, color = colors.ink, bold = false) {
    const node = this.box(parent, String(value).slice(0, 40), x, y, width, height);
    const label = node.addComponent(Label);
    label.string = String(value ?? '');
    label.fontSize = size;
    label.lineHeight = size + 7;
    label.color = new Color(color);
    label.isBold = bold;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;
    label.horizontalAlign = HorizontalTextAlignment.LEFT;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    return label;
  }

  private paragraph(parent: Node, value: string, y: number, muted = false) {
    const label = this.text(parent, value, 0, y, this.width - 40, 28, 14, muted ? colors.muted : colors.ink);
    label.overflow = Label.Overflow.RESIZE_HEIGHT;
    label.verticalAlign = VerticalTextAlignment.TOP;
    label.updateRenderData(true);
    return Math.max(26, label.node.getComponent(UITransform).height) + 14;
  }

  private image(parent: Node, resource: string, x: number, y: number, width: number, height: number, tint?: string) {
    const node = this.box(parent, resource, x, y, width, height);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    if (tint) sprite.color = new Color(tint);
    const apply = (frame: SpriteFrame) => { if (node.isValid) sprite.spriteFrame = frame; };
    if (this.frames.has(resource)) apply(this.frames.get(resource));
    else if (this.frameLoads.has(resource)) this.frameLoads.get(resource).push(apply);
    else {
      this.frameLoads.set(resource, [apply]);
      resources.load(resource + '/texture', Texture2D, (error, texture) => {
        const callbacks = this.frameLoads.get(resource) || [];
        this.frameLoads.delete(resource);
        if (error) { console.warn('Artwork unavailable:', resource, error.message); return; }
        const frame = new SpriteFrame();
        frame.texture = texture;
        this.frames.set(resource, frame);
        callbacks.forEach(callback => callback(frame));
      });
    }
    return node;
  }

  private button(parent: Node, title: string, x: number, y: number, width: number, height: number, callback: () => void, primary = false, disabled = false, icon?: string) {
    const node = this.box(parent, title, x, y, width, height, disabled ? colors.pale : primary ? colors.green : colors.soft, 6);
    const button = node.addComponent(Button);
    button.interactable = !disabled;
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.97;
    if (icon) this.image(node, 'icons/' + icon, title ? 12 : (width - 20) / 2, (height - 20) / 2, 20, 20, primary ? '#ffffff' : colors.green);
    if (title) {
      const label = this.text(node, title, icon ? 38 : 10, 0, width - (icon ? 46 : 20), height, 14, disabled ? colors.muted : primary ? colors.paper : colors.green, primary);
      label.horizontalAlign = HorizontalTextAlignment.CENTER;
    }
    node.on(Button.EventType.CLICK, () => {
      try { callback(); }
      catch (error) { this.notify(error.message || '本次操作未执行。'); }
    });
    return node;
  }

  private clear() {
    for (const child of [...this.stage.children]) { child.removeFromParent(); child.destroy(); }
  }

  private scroller(y: number, height: number) {
    const scrollNode = this.box(this.stage, 'Scroll', 20, y, this.width - 40, Math.max(50, height));
    const viewport = this.box(scrollNode, 'Viewport', 0, 0, this.width - 40, Math.max(50, height));
    viewport.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    const body = this.box(viewport, 'Content', 0, 0, this.width - 40, height);
    const scroll = scrollNode.addComponent(ScrollView);
    scroll.content = body;
    scroll.horizontal = false;
    scroll.vertical = true;
    scroll.elastic = true;
    scroll.cancelInnerEvents = true;
    return { body, finish: (length: number) => body.getComponent(UITransform).setContentSize(this.width - 40, Math.max(height, length + 20)) };
  }

  private render() {
    if (!this.stage || !this.state || !this.content) return;
    this.clear();
    this.box(this.stage, 'Paper', 0, 0, this.width, this.height, colors.bg);
    if (this.inputRequest) this.renderInput();
    else if (this.routes.length) this.renderMenu();
    else this.renderStudio();
    if (this.notice || this.storageIssue) {
      const message = this.notice || this.storageIssue;
      const toast = this.button(this.stage, message, 20, this.height - this.bottom - 125, this.width - 40, 54, () => { this.notice = ''; this.storageIssue = ''; this.render(); }, true);
      const opacity = toast.addComponent(UIOpacity);
      opacity.opacity = 0;
      tween(opacity).to(0.15, { opacity: 255 }).start();
    }
  }

  private renderStudio() {
    const state = this.state;
    const width = this.width;
    const month = Math.floor((state.day - 1) / 30) + 1;
    const top = this.top;
    this.image(this.stage, 'icons/Sun', 20, top + 2, 27, 27, colors.amber);
    this.text(this.stage, state.company || '日光工作室', 57, top, width - 77, 32, 21, colors.ink, true);
    const clockY = top + 44;
    this.text(this.stage, `第 ${month} 月 · ${(state.day - 1) % 30 + 1} 日`, 20, clockY + 2, 126, 22, 14, colors.ink, true);
    this.text(this.stage, state.over ? '经营结束' : state.event ? '等待关键决策' : this.playing ? '研发进行中' : '时间已暂停', 20, clockY + 24, 126, 18, 11, colors.muted);
    this.button(this.stage, '', width - 214, clockY, 42, 42, () => this.dispatch('clock'), true, false, this.playing ? 'Pause' : 'Play');
    [1, 4, 12].forEach((value, index) => this.button(this.stage, value + '×', width - 162 + index * 48, clockY, 44, 42, () => { this.speed = value; this.render(); }, this.speed === value));
    const financesY = clockY + 58;
    const column = (width - 40) / 3;
    [['可用资金', this.content.money(state.cash)], ['预计月开支', this.content.money(core.monthlyCost(state))], ['本月应付', this.content.money(state.accrued)]].forEach(([name, value], index) => {
      this.text(this.stage, name, 20 + column * index, financesY, column, 19, 11, colors.muted);
      this.text(this.stage, value, 20 + column * index, financesY + 21, column - 4, 25, 19, index === 0 ? colors.green : colors.ink, true);
    });
    const navY = this.height - this.bottom - 58;
    this.box(this.stage, 'NavigationBackground', 0, navY - 8, width, 66 + this.bottom, colors.paper);
    navigation.forEach(([menu, title, icon], index) => {
      const cellWidth = width / 6;
      const node = this.box(this.stage, title, index * cellWidth, navY, cellWidth, 54);
      node.addComponent(Button);
      this.image(node, 'icons/' + icon, (cellWidth - 22) / 2, 5, 22, 22, colors.green);
      this.text(node, title, 0, 32, cellWidth, 18, 11, colors.ink).horizontalAlign = HorizontalTextAlignment.CENTER;
      node.on(Button.EventType.CLICK, () => this.openMenu(menu));
    });
    const contentY = financesY + 62;
    const { body, finish } = this.scroller(contentY, navY - contentY - 20);
    const artHeight = Math.min(160, Math.max(100, (this.height - this.top) * 0.19));
    this.box(body, 'StudioWindow', 0, 0, width - 40, artHeight, '#e5ece2', 6);
    this.image(body, 'office', 0, 0, width - 40, artHeight);
    let y = artHeight + 15;
    this.text(body, 'STUDIO / ' + String(month).padStart(2, '0'), 0, y, width - 40, 18, 10, colors.muted, true);
    y += 24;
    const project = state.project;
    if (project) {
      const metrics = core.projectMetrics(project);
      const forecast = core.projectForecast(state);
      this.text(body, project.name, 0, y, width - 40, 32, 23, colors.ink, true);
      y += 39;
      const phases = [['立项', 0], ['原型', 25], ['Demo', 55], ['完成', 100], ['发售', 101]];
      const gap = (width - 64) / 4;
      const phase = metrics.progress < 25 ? 0 : metrics.progress < 55 ? 1 : metrics.progress < 100 ? 2 : 3;
      const phaseStart = [0, 25, 55, 100][phase];
      const phaseEnd = [25, 55, 100, 100][phase];
      const track = (phase + (phaseEnd > phaseStart ? (metrics.progress - phaseStart) / (phaseEnd - phaseStart) : 0)) / 4;
      this.box(body, 'MilestoneRail', 12, y + 6, width - 64, 3, colors.line);
      this.box(body, 'MilestoneProgress', 12, y + 6, (width - 64) * track, 3, colors.green);
      phases.forEach(([title, threshold], index) => {
        this.box(body, String(title), 7 + index * gap, y, 13, 13, metrics.progress >= Number(threshold) ? colors.green : colors.line, 6);
        this.text(body, title, index * gap - 2, y + 18, 48, 18, 10, colors.muted);
      });
      y += 48;
      this.text(body, this.content.stage(project), 0, y, 180, 22, 13, colors.muted);
      this.text(body, metrics.progress.toFixed(1) + '%', width - 110, y, 70, 22, 15, colors.green, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
      y += 30;
      this.box(body, 'ProgressTrack', 0, y, width - 40, 5, colors.line, 2);
      this.box(body, 'Progress', 0, y, (width - 40) * metrics.progress / 100, 5, colors.green, 2);
      y += 18;
      const estimate = metrics.progress < 25 ? forecast.protoDays : metrics.progress < 55 ? forecast.demoDays : forecast.days;
      this.text(body, estimate == null ? '等待安排内容开发' : `距下一研发节点约 ${estimate} 天`, 0, y, width - 40, 22, 12, colors.muted);
      y += 31;
      [['玩法', metrics.gameplay, colors.green], ['视觉', metrics.visual, colors.amber], ['稳定性', metrics.stability, colors.blue]].forEach(([title, value, color], index) => {
        const cell = (width - 40) / 3;
        this.text(body, title, index * cell, y, cell - 10, 20, 11, colors.muted);
        this.text(body, Number(value).toFixed(1), index * cell, y + 22, cell - 10, 27, 24, String(color), true);
        this.box(body, String(title) + 'Track', index * cell, y + 57, cell - 15, 3, colors.line);
        this.box(body, String(title) + 'Value', index * cell, y + 57, (cell - 15) * Number(value) / 100, 3, String(color));
      });
      y += 77;
      y += this.paragraph(body, `${this.content.number(project.followers)} 人关注 · ${project.test ? project.test.count + ' 人试玩，口碑 ' + project.test.score.toFixed(1) : '尚无玩家评价'}`, y, true);
    } else {
      this.text(body, state.catalog.length ? '下一部作品，继续创造。' : '从一张桌子，到第一部作品。', 0, y, width - 40, 38, 22, colors.ink, true);
      y += 47;
    }
    const advice = this.content.advice();
    const banner = this.button(body, advice.title, 0, y, width - 40, 48, () => this.openMenu(advice.menu), true);
    banner.name = 'NextAction';
    y += 65;
    this.text(body, '团队近况', 0, y, width - 40, 24, 15, colors.ink, true);
    y += 34;
    if (!state.staff.length) y += this.paragraph(body, '创始人 · 产品方向、预算与用人', y, true);
    for (const person of state.staff) {
      const mark = this.box(body, person.role, 0, y, 34, 34, person.role === 'art' ? '#eee3cf' : colors.soft, 6);
      this.text(mark, person.name.slice(-1), 0, 0, 34, 34, 16, person.role === 'art' ? colors.amber : colors.green, true).horizontalAlign = HorizontalTextAlignment.CENTER;
      this.text(body, person.name + ' · ' + core.ROLES[person.role].name, 46, y, width - 86, 22, 13, colors.ink, true);
      this.text(body, project ? '累计实际工作 ' + person.work.toFixed(1) : '待新项目安排', 46, y + 24, width - 86, 18, 11, colors.muted);
      y += 57;
    }
    finish(y);
  }

  private renderMenu() {
    const route = this.routes[this.routes.length - 1];
    const model = this.content.menuContents(route);
    const title = route.menu === 'history' ? '经营记录' : route.menu === 'project' && !this.state.project ? '新作立项' : model?.title || '工作室';
    const y = this.top;
    if (this.routes.length > 1) this.button(this.stage, '', 20, y, 40, 40, () => { this.routes.pop(); this.render(); }, false, false, 'ArrowLeft');
    this.text(this.stage, title, 70, y, this.width - 140, 40, 20, colors.ink, true).horizontalAlign = HorizontalTextAlignment.CENTER;
    if (this.state.company) this.button(this.stage, '', this.width - 60, y, 40, 40, () => this.closeMenu(), false, false, 'X');
    this.box(this.stage, 'Divider', 20, y + 56, this.width - 40, 1, colors.line);
    const scroll = this.scroller(y + 73, this.height - y - 73 - this.bottom);
    let cursor = 0;
    if (route.menu === 'setup') {
      this.image(scroll.body, 'office', 0, cursor, this.width - 40, 160);
      cursor += 180;
      cursor += this.paragraph(scroll.body, '为你的工作室取名', cursor);
      let name = '';
      this.input(scroll.body, '例如：日光工作室', '', cursor, 48, value => { name = value; });
      cursor += 64;
      this.button(scroll.body, '成立工作室', 0, cursor, this.width - 40, 48, () => {
        this.apply(core.nameCompany(this.state, name));
        this.resumeAfterMenu = false;
        this.closeMenu();
      }, true);
      cursor += 66;
    } else if (route.menu === 'project' && !this.state.project) {
      this.input(scroll.body, '作品名称', this.draft.name, cursor, 48, value => { this.draft.name = value; });
      cursor += 68;
      cursor += this.paragraph(scroll.body, '游戏类型', cursor);
      for (const [key, item] of Object.entries(core.TYPES) as any) {
        this.button(scroll.body, item.name, 0, cursor, this.width - 40, 44, () => { this.draft.type = key; this.render(); }, this.draft.type === key);
        cursor += 53;
      }
      cursor += 8;
      ['小型作品', '中型作品', '大型作品'].forEach((name, index) => {
        const cell = (this.width - 56) / 3;
        this.button(scroll.body, name, index * (cell + 8), cursor, cell, 44, () => { this.draft.scale = index; this.render(); }, this.draft.scale === index);
      });
      cursor += 62;
      cursor += this.paragraph(scroll.body, this.content.planPreview(), cursor, true);
      this.button(scroll.body, '确认立项', 0, cursor, this.width - 40, 48, () => this.dispatch('form-submit'), true, !this.draft.type);
      cursor += 66;
    } else if (route.menu === 'history') {
      const reports = [...(this.state.reports || [])].reverse();
      for (const report of reports) cursor = this.drawBlock(scroll.body, { type: 'band', title: '第 ' + report.month + ' 月账单', lines: [['期初', this.content.money(report.opening)], ['收入', this.content.money(report.income)], ['支出', this.content.money(report.expense)], ['期末', this.content.money(report.closing)]] }, cursor);
      for (const record of [...this.state.history].reverse()) cursor += this.paragraph(scroll.body, typeof record === 'string' ? record : `第 ${record.day ?? '?'} 天 · ${record.text ?? record.title ?? record.message ?? JSON.stringify(record)}`, cursor, true);
      if (!cursor) cursor += this.paragraph(scroll.body, '经营记录将在实际工作和收支发生后出现。', cursor, true);
    } else {
      for (const block of model?.blocks || []) cursor = this.drawBlock(scroll.body, block, cursor);
    }
    scroll.finish(cursor);
  }

  private drawBlock(parent: Node, block: any, y: number): number {
    const width = this.width - 40;
    switch (block.type) {
      case 'text': return y + this.paragraph(parent, block.text, y, block.muted);
      case 'section':
        this.text(parent, block.title, 0, y + 6, width, 28, 17, colors.ink, true);
        return y + 46;
      case 'lines':
      case 'band': {
        if (block.title) { this.text(parent, block.title, 0, y, width, 30, 17, colors.ink, true); y += 38; }
        for (const [name, value] of block.items || block.lines) {
          this.text(parent, name, 0, y, width * 0.51, 35, 13, colors.muted);
          this.text(parent, value, width * 0.52, y, width * 0.48, 35, 13, colors.ink, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
          this.box(parent, 'RowDivider', 0, y + 39, width, 1, colors.line);
          y += 48;
        }
        return y + 10;
      }
      case 'result':
        this.text(parent, block.label, 0, y, width, 24, 13, colors.muted);
        this.text(parent, block.value, 0, y + 31, width, 53, 39, colors.green, true);
        y += 96;
        return block.note ? y + this.paragraph(parent, block.note, y, true) : y;
      case 'buttons':
      case 'choices':
        for (const item of block.items) {
          this.button(parent, item.text, 0, y, width, item.detail ? 48 : 46, () => this.dispatch(item.action, item.data), !!item.primary || block.type === 'choices', !!item.disabled);
          y += item.detail ? 58 : 56;
          if (item.detail) y += this.paragraph(parent, item.detail, y, true);
        }
        return y + 8;
      case 'focus':
        for (const [key, name] of [['develop', '内容开发'], ['polish', '玩法打磨'], ['bugs', '修复缺陷']]) {
          this.button(parent, name, 0, y, width, 44, () => this.dispatch('focus', { focus: key }), this.state.project.focus === key);
          y += 54;
        }
        return y + 8;
      case 'candidates': {
        for (const person of this.state.candidates[block.role]?.people || []) {
          this.text(parent, person.name + ' · ' + core.TRAITS[person.trait].name, 0, y, width, 28, 17, colors.ink, true);
          y += 36;
          y += this.paragraph(parent, `能力 ${person.skill} / 速度 ${person.pace} · 月薪 ${this.content.money(person.wage)}`, y, true);
          this.button(parent, person.hired ? '已录用' : '查看简历与产能比较', 0, y, width, 44, () => this.openMenu('candidate', person.id), false, !!person.hired);
          y += 65;
        }
        return y;
      }
      case 'staff':
        for (const person of this.state.staff) {
          this.button(parent, person.name + ' · ' + core.ROLES[person.role].name, 0, y, width, 48, () => this.openMenu('person', person.id));
          y += 59;
        }
        if (!this.state.staff.length) y += this.paragraph(parent, '还没有同事，先发布一份招聘。', y, true);
        return y;
      case 'tools':
        for (const [role, tool] of Object.entries(core.STUDIO_TOOLS) as any) {
          this.text(parent, tool.name, 0, y, width, 28, 17, colors.ink, true);
          y += 36;
          const before = core.rates({ ...this.state, tools: this.state.tools.filter(item => item !== role) });
          const after = core.rates({ ...this.state, tools: [...new Set([...this.state.tools, role])] });
          y += this.paragraph(parent, `${core.ROLES[role].name}产能（未配置 → 已配置）${before[role].toFixed(2)} → ${after[role].toFixed(2)} / 天`, y, true);
          this.button(parent, this.state.tools.includes(role) ? '已购置' : '购置 · ' + this.content.money(tool.cost), 0, y, width, 46, () => this.dispatch('buy-tool', { role }), true, this.state.tools.includes(role) || this.state.cash < tool.cost);
          y += 68;
        }
        return y;
      case 'feedback':
        for (const item of block.items) {
          this.text(parent, item.title || item.dimension || '玩家反馈', 0, y, width, 28, 16, colors.ink, true);
          y += 35;
          y += this.paragraph(parent, item.text || item.detail || '', y, true);
        }
        return y;
      case 'catalog':
        for (const book of [...this.state.catalog].reverse()) {
          this.button(parent, '《' + book.name + '》', 0, y, width, 47, () => this.openMenu('book', book.id));
          y += 55;
          y += this.paragraph(parent, `${this.content.number(book.units)} 份 · 回款 ${this.content.money(book.received)} · 口碑 ${book.reviewScore.toFixed(1)}`, y, true);
        }
        return y;
      case 'bills':
        for (const report of [...(this.state.reports || [])].reverse()) {
          y += this.paragraph(parent, `第 ${report.month} 月 · 收入 ${this.content.money(report.income)} / 支出 ${this.content.money(report.expense)} / 期末 ${this.content.money(report.closing)}`, y, true);
        }
        return y;
      default: return y;
    }
  }

  private input(parent: Node, placeholder: string, value: string, y: number, height: number, changed: (value: string) => void, multiline = false) {
    const width = this.width - 40;
    const field = this.box(parent, 'InputBackground', 0, y, width, height, colors.paper, 6);
    const node = this.box(field, 'Input', 12, 5, width - 24, height - 10);
    node.getComponent(UITransform).setAnchorPoint(0.5, 0.5);
    node.setPosition(width / 2, -height / 2);
    node.active = false;
    const edit = node.addComponent(EditBox);
    edit.inputMode = multiline ? EditBox.InputMode.ANY : EditBox.InputMode.SINGLE_LINE;
    for (const child of [...node.children]) { child.removeFromParent(); child.destroy(); }
    edit.textLabel = this.text(node, '', -(width - 24) / 2, -(height - 10) / 2, width - 24, height - 10, multiline ? 16 : 15, multiline ? colors.ink : colors.muted);
    edit.placeholderLabel = this.text(node, placeholder, -(width - 24) / 2, -(height - 10) / 2, width - 24, height - 10, 15, colors.muted);
    edit.textLabel.overflow = Label.Overflow.CLAMP;
    edit.placeholderLabel.overflow = Label.Overflow.CLAMP;
    edit.maxLength = multiline ? 1048576 : 30;
    edit.string = value;
    node.on('text-changed', (box: EditBox) => changed(box.string));
    node.active = true;
    return edit;
  }

  private renderInput() {
    const request = this.inputRequest;
    this.text(this.stage, request.title, 20, this.top, this.width - 40, 40, 22, colors.ink, true);
    const container = this.box(this.stage, 'InputForm', 20, this.top + 67, this.width - 40, this.height - this.top - 100);
    const height = request.multiline ? Math.max(100, Math.min(300, this.height - this.top - this.bottom - 240)) : 54;
    this.input(container, request.multiline ? '粘贴存档 JSON' : '请输入', request.value || '', 0, height, value => { request.value = value; }, request.multiline);
    this.button(container, request.readonly ? '复制到剪贴板' : '确认', 0, height + 20, this.width - 40, 48, () => {
      try {
        const result = request.accept(request.value || '');
        if (result?.catch) result.catch(error => this.notify(error.message));
        if (!request.readonly) { this.inputRequest = null; this.render(); }
      } catch (error) { this.notify(error.message); }
    }, true);
    this.button(container, '返回', 0, height + 81, this.width - 40, 44, () => { this.inputRequest = null; this.render(); });
  }

  private openMenu(menu: string, id?: string, critical = false) {
    if (!this.routes.length) { this.resumeAfterMenu = this.playing; this.playing = false; this.elapsed = 0; }
    if (critical || menu === 'event' || menu === 'setup') this.resumeAfterMenu = false;
    if (critical) this.routes = [];
    if (menu === 'project' && !this.state.project) this.draft = { name: '', type: '', scale: 0 };
    this.routes.push({ menu, id });
    this.render();
  }

  private closeMenu() {
    if (!this.state.company) return;
    this.routes = [];
    this.inputRequest = null;
    this.playing = this.resumeAfterMenu && !this.state.event && !this.state.over;
    this.resumeAfterMenu = false;
    this.elapsed = 0;
    this.render();
  }

  private apply(next: any, message?: string) {
    this.state = next;
    this.save();
    if (next.event) { this.playing = false; this.resumeAfterMenu = false; this.routes = [{ menu: 'event' }]; }
    if (next.over) { this.playing = false; this.resumeAfterMenu = false; }
    this.render();
    if (message) this.notify(message);
  }

  private notify(message: string) {
    this.notice = String(message || '操作未完成');
    this.unschedule(this.clearNotice);
    this.scheduleOnce(this.clearNotice, 2.5);
    this.render();
  }

  dispatch(action: string, data: any = {}) {
    try {
      switch (action) {
        case 'clock':
          if (!this.state.company) return this.openMenu('setup', undefined, true);
          if (this.state.event) return this.openMenu('event', undefined, true);
          if (!this.state.over && !this.routes.length) { this.playing = !this.playing; this.elapsed = 0; this.render(); }
          break;
        case 'menu': this.openMenu(data.menu, data.id); break;
        case 'form-submit': this.apply(core.startProject(this.state, this.draft)); this.closeMenu(); break;
        case 'recruit': this.apply(core.publishRecruitment(this.state, data.role), '简历已收到，本批名单保持稳定。'); break;
        case 'hire': this.apply(core.hire(this.state, data.id), '同事已加入，实际工作随时间产生。'); break;
        case 'dismiss': this.apply(core.dismiss(this.state, data.id)); this.routes = [{ menu: 'team' }]; this.render(); break;
        case 'buy-tool': this.apply(core.buyTool(this.state, data.role), '工具已购置。'); break;
        case 'assets': this.apply(core.buyAssets(this.state), '素材已投入。'); break;
        case 'plain': this.apply({ ...this.state, project: { ...this.state.project, plain: true } }, '保留朴素视觉，等待玩家反馈。'); break;
        case 'focus': this.apply(core.setFocus(this.state, data.focus)); break;
        case 'test': this.apply(core.testDemo(this.state, Number(data.count))); break;
        case 'promote': this.apply(core.promote(this.state, Number(data.tier)), '推广完成，关注不等于实际购买。'); break;
        case 'launch': this.apply(core.launchProject(this.state)); break;
        case 'decision':
          this.apply(core.resolveStudioEvent(this.state, data.choice));
          if (!this.state.event) {
            this.routes = [{ menu: ({ tools: 'tools', recruit: 'recruit-art', test: 'testing', visual: 'visual' })[data.choice] || 'project' }];
            this.resumeAfterMenu = false;
            this.render();
          }
          break;
        case 'export': {
          const raw = JSON.stringify(this.state);
          this.inputRequest = { title: '导出存档', value: raw, multiline: true, readonly: true, accept: () => platform.copy(raw).then(() => this.notify('存档已复制。')) };
          this.render();
          platform.download(raw).catch(error => this.notify(error.message));
          break;
        }
        case 'import':
          this.inputRequest = { title: '导入存档', value: '', multiline: true, accept: (raw: string) => {
            if (raw.length > 1048576) throw new Error('存档文件过大。');
            const next = core.restoreStudio(JSON.parse(raw));
            this.playing = false;
            this.resumeAfterMenu = false;
            this.routes = [];
            this.apply(next, '存档已恢复，时间保持暂停。');
            if (!next.company) this.routes = [{ menu: 'setup' }];
          } };
          this.render();
          break;
        case 'restart':
          this.playing = false;
          this.resumeAfterMenu = false;
          this.routes = [{ menu: 'setup' }];
          this.apply(core.createStudio());
          break;
      }
    } catch (error) { this.notify(error.message || '本次操作未执行。'); }
  }
}