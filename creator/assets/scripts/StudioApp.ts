import {
  _decorator, Component, Node, Canvas, Camera, Color, Layers, UITransform, Label,
  view, screen, ResolutionPolicy, Graphics, Sprite, SpriteFrame, resources, ScrollView,
  Mask, EditBox, Button, HorizontalTextAlignment, VerticalTextAlignment, Texture2D,
  game as engineGame, Game, tween, UIOpacity, Vec2, Vec3, BlockInputEvents
} from 'cc';
import * as core from './core/Studio';
import * as content from './core/Content';
import { Pen, drawRoom, drawDesk, drawHead, drawWork, seatLayout } from './ui/Art';
import { platform } from './Platform';

const { ccclass } = _decorator;
const colors = {
  bg: '#f3f6f2', paper: '#ffffff', ink: '#243c34', muted: '#76877d',
  green: '#1b6651', soft: '#e5eee7', line: '#d7e2d9', amber: '#a57024',
  blue: '#497899', danger: '#a7463c', pale: '#edf2ee', gold: '#e0a526', night: '#14231d'
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
  private stage: Node;
  private effects: Node;
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
  private anchors = new Map<string, Node>();
  private scrollView: ScrollView | null = null;
  private scrollBody: Node | null = null;
  private scrollHeight = 0;
  private celebrations: any[] = [];
  private celebrating = false;
  private paidOut = '';
  private shown: any = null;
  private rolls = new Map<string, { value: number; label: Label | null; format: (n: number) => string }>();
  private followersLabel: Label | null = null;
  private guidePaused = false;
  private confirmSkip = false;
  private floatTimes = new Map<string, number>();
  private groupTops = new Map<string, number>();
  private menuAck: string | null = null;
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
    this.effects = this.box(this.canvas, 'Effects', 0, 0, 390, 844);
    this.state = this.load();
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
    for (const layer of [this.stage, this.effects]) {
      layer.getComponent(UITransform).setContentSize(size);
      layer.setPosition(-size.width / 2, size.height / 2);
    }
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
        this.state = this.drain(core.stepDay(this.state));
        changed = true;
        if (this.state.event) {
          this.playing = false;
          this.resumeAfterMenu = false;
          this.routes = [{ menu: 'event' }];
        }
      }
      if (this.state.over) this.playing = false;
      if (changed) this.holdForGuide();
      if (changed) { this.save(); this.render(); this.celebrate(); }
    } catch (error) {
      this.playing = false;
      this.notify(error.message);
    }
  }

  private load() {
    try {
      const raw = platform.read();
      if (raw) return core.restoreStudio(JSON.parse(raw));
    } catch {
      try {
        const raw = platform.read();
        if (raw) platform.write(raw, 'sunlight-studio-v2-recovery');
      } catch { this.storageIssue = '本地存档不可用，请及时导出进度。'; }
      this.storageIssue ||= '存档无法读取，原数据已保存为恢复副本。';
    }
    return core.createStudio();
  }

  private save() {
    try { platform.write(JSON.stringify(this.state)); }
    catch { this.storageIssue = '本地保存失败，请从公司菜单导出进度。'; }
  }

  // Moves milestone announcements out of the save into the on-screen queue.
  private drain(next: any) {
    if (!next.feed.length) return next;
    this.celebrations.push(...next.feed.filter((item: any) => item.kind !== 'release'));
    return core.consumeFeed(next);
  }

  private box(parent: Node, name: string, x: number, y: number, width: number, height: number, fill?: string, radius = 0, alpha = 255) {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    parent.addChild(node);
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0, 1);
    transform.setContentSize(width, height);
    node.setPosition(x, -y);
    if (fill) new Pen(node.addComponent(Graphics)).rect(0, 0, width, height, fill, radius, alpha);
    return node;
  }

  private canvasNode(parent: Node, name: string, x: number, y: number, width: number, height: number) {
    const node = this.box(parent, name, x, y, width, height);
    return { node, pen: new Pen(node.addComponent(Graphics)) };
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

  private paragraph(parent: Node, value: string, y: number, muted = false, x = 0, width = this.width - 40, size = 14, color?: string) {
    const label = this.text(parent, value, x, y, width, 28, size, color || (muted ? colors.muted : colors.ink));
    label.overflow = Label.Overflow.RESIZE_HEIGHT;
    label.verticalAlign = VerticalTextAlignment.TOP;
    label.updateRenderData(true);
    return Math.max(size + 12, label.node.getComponent(UITransform).height) + 10;
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

  private clickable(node: Node, callback: () => void, enabled = true) {
    const button = node.addComponent(Button);
    button.interactable = enabled;
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.97;
    node.on(Button.EventType.CLICK, () => {
      try {
        // Acting on a menu while its explanation is open counts as having read it.
        if (this.menuAck && node.parent?.name !== 'Bubble') { this.state = core.markSeen(this.state, this.menuAck); this.menuAck = null; this.save(); }
        callback();
      }
      catch (error) { this.notify(error.message || '本次操作未执行。'); }
    });
    return node;
  }

  private button(parent: Node, title: string, x: number, y: number, width: number, height: number, callback: () => void, primary = false, disabled = false, icon?: string, anchor?: string) {
    const node = this.box(parent, title, x, y, width, height, disabled ? colors.pale : primary ? colors.green : colors.soft, 8);
    this.clickable(node, callback, !disabled);
    if (icon) this.image(node, 'icons/' + icon, title ? 12 : (width - 20) / 2, (height - 20) / 2, 20, 20, disabled ? colors.muted : primary ? '#ffffff' : colors.green);
    if (title) {
      const label = this.text(node, title, icon ? 38 : 4, 0, width - (icon ? 48 : 8), height, 14, disabled ? colors.muted : primary ? colors.paper : colors.green, primary);
      label.enableWrapText = false;
      label.horizontalAlign = icon ? HorizontalTextAlignment.LEFT : HorizontalTextAlignment.CENTER;
    }
    if (anchor) this.anchors.set(anchor, node);
    return node;
  }

  // Card-style choice with a title line and a wrapped detail line.
  private choice(parent: Node, y: number, title: string, detail: string, callback: () => void, options: any = {}) {
    const width = this.width - 40;
    const node = this.box(parent, title, 0, y, width, 60);
    const background = node.addComponent(Graphics);
    let cursor = 12;
    if (options.icon) this.image(node, 'icons/' + options.icon, 14, 14, 20, 20, options.disabled ? colors.muted : colors.green);
    const left = options.icon ? 44 : 14;
    this.text(node, title, left, cursor, width - left - (options.tag ? 70 : 14), 22, 15, options.disabled ? colors.muted : colors.ink, true);
    if (options.tag) {
      const tag = this.box(node, 'Tag', width - 62, cursor + 1, 50, 20, options.tagColor || colors.gold, 10);
      this.text(tag, options.tag, 0, 0, 50, 20, 11, '#ffffff', true).horizontalAlign = HorizontalTextAlignment.CENTER;
    }
    cursor += 26;
    if (detail && options.compact) {
      this.text(node, detail, left, cursor - 2, width - left - 14, 18, 12, colors.muted);
      cursor += 20;
    } else if (detail) cursor += this.paragraph(node, detail, cursor, true, left, width - left - 14, 12) - 4;
    const height = cursor + 8;
    node.getComponent(UITransform).setContentSize(width, height);
    const pen = new Pen(background);
    pen.rect(0, 0, width, height, options.highlight ? '#fff8e6' : colors.paper, 10);
    pen.frame(0, 0, width, height, options.highlight ? colors.gold : colors.line, options.highlight ? 2 : 1, 10);
    this.clickable(node, callback, !options.disabled);
    if (options.anchor) this.anchors.set(options.anchor, node);
    return height;
  }

  private clear() {
    this.anchors.clear();
    this.groupTops.clear();
    this.scrollView = null;
    this.scrollBody = null;
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
    this.scrollView = scroll;
    this.scrollBody = body;
    this.scrollHeight = height;
    return { body, finish: (length: number) => {
      body.getComponent(UITransform).setContentSize(this.width - 40, Math.max(height, length + 20));
      scroll.elastic = length + 20 > height;
    } };
  }

  private render() {
    if (!this.stage || !this.state) return;
    this.clear();
    this.box(this.stage, 'Paper', 0, 0, this.width, this.height, colors.bg);
    if (this.inputRequest) this.renderInput();
    else if (this.routes.length) this.renderMenu();
    else this.renderStudio();
    if (!this.inputRequest) this.renderGuide();
    if (this.notice || this.storageIssue) {
      const message = this.notice || this.storageIssue;
      const toast = this.box(this.stage, 'Toast', 20, this.height - this.bottom - 130, this.width - 40, 52, colors.night, 12, 235);
      this.text(toast, message, 16, 0, this.width - 72, 52, 13, '#ffffff').horizontalAlign = HorizontalTextAlignment.CENTER;
      this.clickable(toast, () => { this.notice = ''; this.storageIssue = ''; this.render(); });
      const opacity = toast.addComponent(UIOpacity);
      opacity.opacity = 0;
      tween(opacity).to(0.15, { opacity: 255 }).start();
    }
  }

  private renderStudio() {
    const state = this.state;
    const width = this.width;
    const inner = width - 40;
    const month = Math.floor((state.day - 1) / 30) + 1;
    const top = this.top;
    const status = state.over ? '经营结束' : state.event ? '等待你的决定' : this.playing ? '时间流动中' : '时间已暂停';
    this.text(this.stage, state.company || '日光工作室', 20, top, width - 210, 24, 17, colors.ink, true);
    this.text(this.stage, `第 ${month} 月 ${(state.day - 1) % 30 + 1} 日 · ${status}`, 20, top + 24, width - 210, 18, 11, this.playing ? colors.green : colors.muted);
    this.button(this.stage, '', width - 186, top + 2, 40, 40, () => this.dispatch('clock'), true, false, this.playing ? 'Pause' : 'Play', 'clock');
    [1, 4, 12].forEach((value, index) => this.button(this.stage, value + '×', width - 140 + index * 40, top + 2, 38, 40, () => { this.speed = value; this.render(); }, this.speed === value));
    const financesY = top + 52;
    const finance = this.box(this.stage, 'Finance', 20, financesY, inner, 42, colors.paper, 10);
    this.anchors.set('finance', finance);
    const column = inner / 3;
    const cashLabel = [['资金', content.money(state.cash)], ['月开支', content.money(core.monthlyCost(state))], ['本月应付', content.money(state.accrued)]].map(([name, value], index) => {
      this.text(finance, name, 12 + column * index, 3, column - 12, 16, 10, colors.muted);
      return this.text(finance, value, 12 + column * index, 18, column - 14, 22, 16, index === 0 ? colors.green : colors.ink, true);
    })[0];
    const navY = this.height - this.bottom - 58;
    this.box(this.stage, 'NavigationBackground', 0, navY - 8, width, 66 + this.bottom, colors.paper);
    navigation.forEach(([menu, title, icon], index) => {
      const cellWidth = width / 6;
      const lock = content.menuLock(state, menu);
      const node = this.box(this.stage, title, index * cellWidth, navY, cellWidth, 54);
      this.clickable(node, () => lock ? this.notify(title + '：' + lock + '。') : this.openMenu(menu === 'project' && !state.project ? 'new-project' : menu));
      this.image(node, 'icons/' + (lock ? 'Lock' : icon), (cellWidth - 22) / 2, 5, 22, 22, lock ? colors.line : colors.green);
      this.text(node, title, 0, 32, cellWidth, 18, 11, lock ? colors.muted : colors.ink).horizontalAlign = HorizontalTextAlignment.CENTER;
      this.anchors.set('nav-' + menu, node);
    });
    const contentY = financesY + 50;
    const viewHeight = navY - contentY - 10;
    const project = state.project;
    // Fixed rows below and above the scene; the scene absorbs any shortage on short screens.
    const shrink = Math.max(0, Math.min(80, (project ? 504 : 372) - viewHeight));
    const { body, finish } = this.scroller(contentY, viewHeight);
    let y = this.goalCard(body, 0) + 8;
    const sceneTop = y;
    y += this.office(body, y, 116 - Math.round(shrink / 2)) + 6;
    const metrics = project ? core.projectMetrics(project) : null;
    const workHeight = 96 - Math.round(shrink / 2);
    const { node: work, pen } = this.canvasNode(body, 'Work', 0, y, inner, workHeight);
    if (project) drawWork(pen, inner, workHeight, project.type, project.done / project.total, metrics.visual, project.started);
    else if (state.catalog.length) drawWork(pen, inner, workHeight, state.catalog[0].type, 1, state.catalog[0].metrics.visual, state.catalog[0].released);
    else { pen.rect(0, 0, inner, workHeight, colors.pale, 6); this.text(work, '立项后，作品会在这里一点点成形', 0, 0, inner, workHeight, 13, colors.muted).horizontalAlign = HorizontalTextAlignment.CENTER; }
    if (!project && state.catalog.length) {
      const caption = '上一作《' + state.catalog[0].name + '》';
      const chip = this.box(work, 'Caption', 8, workHeight - 28, Math.min(inner - 16, caption.length * 12 + 20), 22, colors.night, 11, 190);
      this.text(chip, caption, 10, 0, caption.length * 12 + 4, 22, 11, '#ffffff');
    }
    this.anchors.set('work', work);
    this.anchors.set('scene', this.box(body, 'SceneAnchor', 0, sceneTop, inner, y + workHeight - sceneTop));
    y += workHeight + 10;
    if (project) y = this.projectPanel(body, y, metrics);
    else {
      this.text(body, state.catalog.length ? '下一部作品，继续创造。' : '从一间小屋，到第一部作品。', 0, y, inner, 28, 17, colors.ink, true);
      y += 36;
    }
    const advice = content.advice(state);
    y += this.choice(body, y, advice.title, advice.text, () => this.openMenu(advice.menu, advice.id), { icon: 'ChevronRight', highlight: true, anchor: 'next', compact: true });
    finish(y - 20);
    this.showDeltas(cashLabel);
  }

  private goalCard(body: Node, y: number) {
    const goals = core.goalsOf(this.state);
    const inner = this.width - 40;
    const index = goals.steps.findIndex(step => step.key === goals.current.key);
    const card = this.box(body, 'Goal', 0, y, inner, 34, '#fff8e6', 10);
    this.image(card, 'icons/' + (index < 0 ? 'Trophy' : 'Target'), 10, 7, 20, 20, colors.amber);
    const title = (index < 0 ? '挑战' : `目标 ${index + 1}/3`) + ' · ' + goals.current.title;
    this.text(card, title, 38, 0, inner - 96, 34, 13, colors.ink, true);
    this.text(card, '奖励：' + goals.current.reward, 38, 0, inner - 96, 34, 11, colors.amber).horizontalAlign = HorizontalTextAlignment.RIGHT;
    goals.steps.forEach((step, dot) => this.box(card, 'Dot', inner - 50 + dot * 14, 12, 9, 9, step.done ? colors.amber : step.key === goals.current.key ? '#f0c56a' : colors.line, 5));
    this.clickable(card, () => this.openMenu('goals'));
    this.anchors.set('goal', card);
    return 34;
  }

  private office(body: Node, y: number, height: number) {
    const state = this.state;
    const inner = this.width - 40;
    const { node, pen } = this.canvasNode(body, 'Office', 0, y, inner, height);
    drawRoom(pen, inner, height, state.office);
    const working = this.playing && !!state.project;
    const layout = seatLayout(core.seats(state), inner, height);
    const desks = new Pen(this.box(node, 'Desks', 0, 0, inner, height).addComponent(Graphics));
    layout.forEach((seat, index) => {
      const person = state.staff[index];
      drawDesk(desks, seat.x, seat.y, seat.scale, !!person, person?.role, working);
      if (!person) return;
      const head = this.box(node, 'Head', seat.x, seat.y - 42 * seat.scale, 1, 1);
      drawHead(new Pen(head.addComponent(Graphics)), seat.scale, person.role);
      if (working) tween(head).by(0.22, { position: new Vec3(0, 2, 0) }).by(0.22, { position: new Vec3(0, -2, 0) }).union().repeatForever().start();
    });
    const label = core.OFFICES[state.office].name + ' · ' + state.staff.length + '/' + core.seats(state) + ' 工位';
    const chip = this.box(node, 'Room', 8, 8, label.length * 12 + 16, 22, '#ffffff', 11, 220);
    this.text(chip, label, 8, 0, label.length * 12 + 4, 22, 11, colors.ink);
    this.clickable(node, () => this.openMenu('team'));
    return height;
  }

  private projectPanel(body: Node, y: number, metrics: any) {
    const state = this.state;
    const project = state.project;
    const inner = this.width - 40;
    const forecast = core.projectForecast(state);
    this.text(body, '《' + project.name + '》', 0, y, inner - 150, 24, 16, colors.ink, true);
    this.text(body, core.TYPES[project.type].name + ' · ' + core.SCALES[project.scale].name + '   ' + metrics.progress.toFixed(0) + '%', inner - 150, y, 150, 24, 12, colors.green, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
    y += 28;
    y += this.milestones(body, y, project, metrics, forecast) + 6;
    const cells: any[] = [
      ['玩法', metrics.gameplay.toFixed(0), colors.green, metrics.gameplay, 'stat-gameplay'],
      ['视觉', metrics.visual.toFixed(0), colors.amber, metrics.visual, 'stat-visual'],
      ['已知缺陷', project.test ? project.found + ' 项' : '未测试', colors.blue, -1, 'stat-defects'],
      ['关注', content.number(project.followers), colors.ink, -1, 'stat-followers']
    ];
    const cell = inner / 4;
    this.anchors.set('stats', this.box(body, 'StatsAnchor', 0, y, inner, 46));
    cells.forEach(([title, value, color, bar, anchor], index) => {
      const node = this.box(body, title, index * cell, y, cell - 6, 46);
      this.text(node, title, 0, 0, cell - 6, 16, 10, colors.muted);
      const label = this.text(node, value, 0, 16, cell - 6, 24, value === '未测试' ? 13 : 18, value === '未测试' ? colors.muted : color, true);
      if (anchor === 'stat-followers') { this.followersLabel = label; this.rollLabel('followers', label, (n: number) => content.number(n)); }
      if (bar >= 0) {
        this.box(node, 'Track', 0, 42, cell - 12, 3, colors.line);
        this.box(node, 'Value', 0, 42, (cell - 12) * bar / 100, 3, color);
      }
      this.anchors.set(anchor, node);
    });
    y += 50;
    const insight = state.insights[project.type] ? core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type) : core.TYPES[project.type].audience + '的偏好：试玩后可知';
    this.anchors.set('insight', this.text(body, insight + (project.test ? ' · 试玩 ' + project.test.score.toFixed(1) + ' 分' : ''), 0, y, inner, 18, 11, colors.muted).node);
    return y + 26;
  }

  // Phase track: days to the next milestone sit above the current segment, total days under "完成".
  private milestones(body: Node, y: number, project: any, metrics: any, forecast: any) {
    const inner = this.width - 40;
    const track = this.box(body, 'Track', 0, y, inner, 58);
    this.anchors.set('track', track);
    const phases = [['立项', 0], ['原型', 25], ['Demo', 55], ['完成', 100], ['发售', 101]];
    const gap = (inner - 24) / 4;
    const railY = 22;
    const phase = metrics.progress < 25 ? 0 : metrics.progress < 55 ? 1 : metrics.progress < 100 ? 2 : 3;
    const phaseStart = [0, 25, 55, 100][phase];
    const phaseEnd = [25, 55, 100, 100][phase];
    const fill = (phase + (phaseEnd > phaseStart ? (metrics.progress - phaseStart) / (phaseEnd - phaseStart) : 0)) / 4;
    this.box(track, 'Rail', 12, railY + 5, inner - 24, 3, colors.line);
    this.box(track, 'Fill', 12, railY + 5, (inner - 24) * fill, 3, colors.green);
    const focusName = project.focus === 'special' ? core.TYPES[project.type].special.name : core.FOCUS[project.focus].name;
    const estimate = phase === 0 ? forecast.protoDays : phase === 1 ? forecast.demoDays : forecast.days;
    const note = project.focus !== 'develop' ? focusName + '中 · 开发暂停' : phase === 3 ? '可以发售' : estimate == null ? '没有程序员' : '约 ' + estimate + ' 天';
    const warn = project.focus !== 'develop' || (phase < 3 && estimate == null);
    const noteX = 12 + gap * (phase + 0.5);
    this.text(track, note, Math.max(0, Math.min(inner - 130, noteX - 65)), 0, 130, 18, 11, warn ? colors.amber : colors.green, true).horizontalAlign = HorizontalTextAlignment.CENTER;
    phases.forEach(([title, threshold], index) => {
      this.box(track, String(title), 6 + index * gap, railY, 13, 13, metrics.progress >= Number(threshold) ? colors.green : colors.line, 6);
      const label = this.text(track, title, Math.min(inner - 48, Math.max(0, index * gap - 11)), railY + 16, 48, 16, 10, colors.muted);
      label.horizontalAlign = index === 0 ? HorizontalTextAlignment.LEFT : index === phases.length - 1 ? HorizontalTextAlignment.RIGHT : HorizontalTextAlignment.CENTER;
    });
    if (phase < 3 && forecast.days != null && project.focus === 'develop') this.text(track, '全部约 ' + forecast.days + ' 天', 3 * gap - 22, railY + 31, 70, 14, 9, colors.muted).horizontalAlign = HorizontalTextAlignment.CENTER;
    return 58;
  }

  // Floating "+N" hints for followers, cash and found defects; only for changes worth noticing.
  private showDeltas(cashLabel: Label) {
    const project = this.state.project;
    const current = { id: project?.id || '', followers: project ? Math.round(project.followers) : 0, cash: this.state.cash, found: project ? project.found : 0, company: this.state.company, day: this.state.day };
    const last = this.shown;
    this.shown = current;
    // A different save (restart or import) is not a change the player caused.
    if (!last || last.company !== current.company || current.day < last.day) return;
    if (Math.abs(current.cash - last.cash) >= 0.5) this.floatAt(this.anchors.get('finance'), (current.cash > last.cash ? '+' : '') + content.money(current.cash - last.cash), current.cash > last.cash ? colors.green : colors.danger, 0.17);
    if (!project || last.id !== current.id) return;
    if (current.followers - last.followers >= 50) {
      this.startRoll('followers', last.followers, current.followers);
      if (this.followersLabel?.isValid) this.rollLabel('followers', this.followersLabel, (n: number) => content.number(n));
      this.floatAt(this.anchors.get('stat-followers'), '+' + content.number(current.followers - last.followers) + ' 人', colors.green);
    }
    if (current.found > last.found) this.floatAt(this.anchors.get('stat-defects'), '发现 ' + (current.found - last.found) + ' 项', colors.danger);
  }

  floatAt(target: Node | undefined, text: string, color: string, xRatio = 0.5) {
    if (!target?.isValid) return;
    const now = Date.now();
    if (now - (this.floatTimes.get(target.name) || 0) < 1200) return;
    this.floatTimes.set(target.name, now);
    const bounds = target.getComponent(UITransform).getBoundingBoxToWorld();
    const local = this.effects.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(bounds.x + bounds.width * xRatio, bounds.y + bounds.height, 0));
    const node = new Node('Float');
    node.layer = Layers.Enum.UI_2D;
    this.effects.addChild(node);
    node.addComponent(UITransform).setContentSize(160, 26);
    node.setPosition(local.x, local.y);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = 16;
    label.lineHeight = 22;
    label.isBold = true;
    label.color = new Color(color);
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.enableOutline = true;
    label.outlineColor = new Color('#ffffff');
    label.outlineWidth = 2;
    const opacity = node.addComponent(UIOpacity);
    node.setScale(0.6, 0.6, 1);
    tween(node).to(0.18, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' }).to(0.12, { scale: new Vec3(1, 1, 1) }).by(1.1, { position: new Vec3(0, 34, 0) }, { easing: 'quadOut' }).start();
    tween(opacity).delay(0.9).to(0.5, { opacity: 0 }).call(() => node.destroy()).start();
  }

  // Rolling numbers survive re-renders: each render re-attaches the newest label to the running tween.
  private startRoll(key: string, from: number, to: number) {
    const roll = { value: from, label: null as Label | null, format: (n: number) => content.number(n) };
    this.rolls.set(key, roll);
    tween(roll).to(0.9, { value: to }, { easing: 'quartOut', onUpdate: () => { if (roll.label?.isValid) roll.label.string = roll.format(roll.value); } })
      .call(() => { if (this.rolls.get(key) === roll) this.rolls.delete(key); }).start();
  }

  private rollLabel(key: string, label: Label, format: (n: number) => string) {
    const roll = this.rolls.get(key);
    if (!roll) return;
    roll.format = format;
    roll.label = label;
    label.string = format(roll.value);
  }

  private renderMenu() {
    const route = this.routes[this.routes.length - 1];
    const custom = ['setup', 'new-project', 'history'].includes(route.menu);
    const model = custom ? null : content.menu(this.state, route);
    const title = route.menu === 'setup' ? '成立工作室' : route.menu === 'new-project' ? '新作立项' : route.menu === 'history' ? '经营记录' : model.title;
    const y = this.top;
    if (this.routes.length > 1) this.button(this.stage, '', 20, y, 40, 40, () => { this.routes.pop(); this.render(); }, false, false, 'ArrowLeft');
    this.text(this.stage, title, 70, y, this.width - 140, 40, 19, colors.ink, true).horizontalAlign = HorizontalTextAlignment.CENTER;
    if (this.state.company && route.menu !== 'event') this.button(this.stage, '', this.width - 60, y, 40, 40, () => this.closeMenu(), false, false, 'X');
    this.box(this.stage, 'Divider', 20, y + 54, this.width - 40, 1, colors.line);
    const footer = this.resumeAfterMenu && this.state.company && !this.state.event ? 64 : 0;
    const scroll = this.scroller(y + 68, this.height - y - 68 - this.bottom - footer);
    let cursor = 0;
    if (route.menu === 'setup') cursor = this.renderSetup(scroll.body);
    else if (route.menu === 'new-project') cursor = this.renderNewProject(scroll.body);
    else if (route.menu === 'history') cursor = this.renderHistory(scroll.body);
    else for (const block of model.blocks) cursor = this.drawBlock(scroll.body, block, cursor);
    scroll.finish(cursor);
    if (footer) this.button(this.stage, '返回工作室，继续经营', 20, this.height - this.bottom - 54, this.width - 40, 46, () => this.closeMenu(), true, false, 'Play');
  }

  private renderSetup(body: Node) {
    const inner = this.width - 40;
    const { pen } = this.canvasNode(body, 'Room', 0, 0, inner, 150);
    drawRoom(pen, inner, 150, 0);
    const desks = new Pen(this.box(body, 'Desk', 0, 0, inner, 150).addComponent(Graphics));
    seatLayout(4, inner, 150).forEach(seat => drawDesk(desks, seat.x, seat.y, seat.scale, false, 'code', false));
    let cursor = 166;
    cursor += this.paragraph(body, '一间小屋、四张空桌子和 ' + content.money(this.state.cash) + ' 积蓄。你是创始人，负责方向、预算与用人。', cursor);
    cursor += this.paragraph(body, '先给工作室起个名字。', cursor, true);
    this.input(body, '例如：日光工作室', this.draft.name, cursor, 48, value => { this.draft.name = value; });
    cursor += 62;
    this.button(body, '成立工作室', 0, cursor, inner, 48, () => {
      this.apply(core.nameCompany(this.state, this.draft.name));
      this.resumeAfterMenu = false;
      this.closeMenu();
    }, true);
    return cursor + 66;
  }

  private renderNewProject(body: Node) {
    const inner = this.width - 40;
    const state = this.state;
    this.input(body, '作品名称', this.draft.name, 0, 48, value => { this.draft.name = value; });
    let cursor = 64;
    this.text(body, '类型', 0, cursor, inner, 24, 15, colors.ink, true);
    cursor += 30;
    for (const [key, type] of Object.entries(core.TYPES) as any) {
      const detail = type.audience + (state.insights[key] ? '，最看重 ' + core.audienceFocus(key) : '') + ' · 工作量 ' + (type.work * core.SCALES[this.draft.scale].work).toFixed(0);
      cursor += this.choice(body, cursor, type.name, detail, () => { this.draft.type = key; this.render(); }, { highlight: this.draft.type === key, tag: this.draft.type === key ? '已选' : '', tagColor: colors.green }) + 8;
    }
    this.anchors.set('project-form', this.box(body, 'FormAnchor', 0, 0, inner, cursor - 8));
    cursor += 4;
    this.text(body, '体量', 0, cursor, inner, 24, 15, colors.ink, true);
    cursor += 30;
    core.SCALES.forEach((scale, index) => {
      const cell = (inner - 16) / 3;
      this.button(body, scale.name, index * (cell + 8), cursor, cell, 42, () => { this.draft.scale = index; this.render(); }, this.draft.scale === index);
    });
    cursor += 54;
    cursor += this.paragraph(body, content.planPreview(state, this.draft), cursor, true, 0, inner, 13);
    this.button(body, '确认立项', 0, cursor, inner, 48, () => this.dispatch('form-submit'), true, !this.draft.type);
    return cursor + 66;
  }

  private renderHistory(body: Node) {
    let cursor = 0;
    for (const report of [...this.state.reports].reverse().slice(0, 24)) cursor = this.drawBlock(body, { type: 'lines', title: '第 ' + report.month + ' 月', items: [['收入', content.money(report.income)], ['支出', content.money(report.expense)], ['月末资金', content.money(report.closing)]] }, cursor);
    for (const record of this.state.history.slice(0, 60)) cursor += this.paragraph(body, `第 ${record.day} 天 · ${record.title}：${record.text}`, cursor, true, 0, this.width - 40, 12);
    if (!cursor) cursor += this.paragraph(body, '经营记录会在实际工作和收支发生后出现。', cursor, true);
    return cursor;
  }

  private drawBlock(parent: Node, block: any, y: number): number {
    const width = this.width - 40;
    switch (block.type) {
      case 'text': return y + this.paragraph(parent, block.text, y, block.muted, 0, width, block.muted ? 13 : 14);
      case 'section':
        this.text(parent, block.title, 0, y + 8, width, 26, 16, colors.ink, true);
        return y + 42;
      case 'note': {
        const node = this.box(parent, 'Note', 0, y, width, 40);
        const height = this.paragraph(node, block.text, 10, false, 40, width - 52, 13) + 10;
        node.getComponent(UITransform).setContentSize(width, height);
        new Pen(node.addComponent(Graphics)).rect(0, 0, width, height, '#fff8e6', 8);
        this.image(node, 'icons/' + (block.icon || 'Star'), 12, 10, 18, 18, colors.amber);
        return y + height + 12;
      }
      case 'lines': {
        if (block.title) { this.text(parent, block.title, 0, y, width, 28, 16, colors.ink, true); y += 34; }
        for (const [name, value] of block.items) {
          this.text(parent, name, 0, y, width * 0.48, 34, 13, colors.muted);
          this.text(parent, value, width * 0.48, y, width * 0.52, 34, 13, colors.ink, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
          this.box(parent, 'RowDivider', 0, y + 38, width, 1, colors.line);
          y += 44;
        }
        return y + 8;
      }
      case 'stats': {
        const cell = width / block.items.length;
        block.items.forEach(([name, value]: any, index: number) => {
          this.text(parent, name, index * cell, y, cell - 6, 18, 11, colors.muted);
          this.text(parent, value, index * cell, y + 18, cell - 6, 28, 17, index === block.items.length - 1 ? (block.tone === 'up' ? colors.green : colors.danger) : colors.ink, true);
        });
        return y + 58;
      }
      case 'result':
        this.text(parent, block.label, 0, y, width, 22, 13, colors.muted);
        this.text(parent, block.value, 0, y + 24, width, 50, 38, colors.green, true);
        y += 80;
        return block.note ? y + this.paragraph(parent, block.note, y, true, 0, width, 12) : y;
      case 'buttons': {
        const start = y;
        for (const item of block.items) {
          this.button(parent, item.text, 0, y, width, 46, () => this.dispatch(item.action, item.data), !!item.primary, !!item.disabled, undefined, item.anchor);
          y += 56;
        }
        if (block.anchor) this.anchors.set(block.anchor, this.box(parent, 'GroupAnchor', 0, start, width, y - start - 10));
        return y + 4;
      }
      case 'choices': {
        const start = y;
        for (const item of block.items) y += this.choice(parent, y, item.text, item.detail, () => this.dispatch(item.action, item.data), { tag: item.recommended ? '推荐' : '', highlight: item.recommended, disabled: item.disabled, anchor: item.anchor }) + 10;
        if (block.anchor) this.anchors.set(block.anchor, this.box(parent, 'GroupAnchor', 0, start, width, y - start - 10));
        return y + 4;
      }
      case 'tabs': {
        const cell = (width - (block.items.length - 1) * 6) / block.items.length;
        block.items.forEach((item: any, index: number) => this.button(parent, item.text, index * (cell + 6), y, cell, 38, () => { this.routes[this.routes.length - 1] = item.route; this.render(); }, item.active, false, item.locked ? 'Lock' : undefined));
        return y + 50;
      }
      case 'card': {
        const start = y;
        this.text(parent, block.title, 0, y, width, 26, 16, colors.ink, true);
        y += 30;
        y += this.paragraph(parent, block.text, y, true, 0, width, 13);
        const button = block.button;
        this.button(parent, button.text, 0, y, width, 44, () => this.dispatch(button.action, button.data), !!button.primary, !!button.disabled, undefined, button.anchor);
        if (block.group) {
          // Consecutive cards of one group share an anchor spanning from the first card's top.
          const top = this.groupTops.get(block.group) ?? start;
          this.groupTops.set(block.group, top);
          this.anchors.set(block.group, this.box(parent, 'GroupAnchor', 0, top, width, y + 44 - top));
        }
        return y + 62;
      }
      case 'candidates': {
        const start = y;
        block.people.forEach((person: any, index: number) => {
          const detail = `能力 ${person.skill} · 速度 ${person.pace} · 月薪 ${content.money(person.wage)}\n${core.TRAITS[person.trait].name}：${core.TRAITS[person.trait].text}`;
          y += this.choice(parent, y, person.name, detail, () => this.openMenu('candidate', person.id), { tag: person.hired ? '已录用' : '', tagColor: colors.green, disabled: person.hired, anchor: 'candidate-' + index }) + 10;
        });
        this.anchors.set('candidates', this.box(parent, 'CandidatesAnchor', 0, start, width, y - start - 10));
        return y;
      }
      case 'staff':
        if (!this.state.staff.length) return y + this.paragraph(parent, '还没有同事，先发布一份招聘。', y, true);
        for (const person of this.state.staff) y += this.choice(parent, y, person.name + ' · ' + core.ROLES[person.role].name, `能力 ${person.skill} · 速度 ${person.pace} · 月薪 ${content.money(person.wage)}`, () => this.openMenu('person', person.id)) + 10;
        return y;
      case 'focus':
        for (const item of block.items) y += this.choice(parent, y, item.text, item.detail, () => this.dispatch('focus', { focus: item.key }), { tag: item.active ? '进行中' : '', tagColor: colors.green, highlight: item.active, disabled: item.disabled, anchor: item.anchor }) + 8;
        return y + 4;
      case 'checklist': {
        const start = y;
        for (const item of block.items) {
          const mark = this.box(parent, 'Mark', 0, y + 5, 22, 22, item.ok ? colors.green : item.required ? colors.danger : colors.line, 11);
          if (item.ok) this.image(mark, 'icons/Check', 3, 3, 16, 16, '#ffffff');
          this.text(parent, item.label + (item.required ? '（必需）' : ''), 32, y, width - 32, 20, 13, colors.ink, true);
          this.text(parent, item.text, 32, y + 19, width - 32, 18, 12, colors.muted);
          y += 46;
        }
        this.anchors.set('checklist', this.box(parent, 'ChecklistAnchor', 0, start, width, y - start));
        return y + 4;
      }
      case 'feedback':
        for (const item of block.items) {
          this.text(parent, item.title + ' · ' + Number(item.value).toFixed(0), 0, y, width, 24, 15, colors.ink, true);
          y += 28;
          y += this.paragraph(parent, item.text, y, true, 0, width, 13);
        }
        return y;
      case 'catalog':
        this.state.catalog.forEach((book: any, index: number) => {
          const balance = book.received - book.invested;
          y += this.choice(parent, y, '《' + book.name + '》', `${content.number(book.units)} 份 · 回款 ${content.money(book.received)} · 评价 ${book.reviewScore.toFixed(1)}`, () => this.openMenu('book', book.id), { tag: balance >= 0 ? '已回本' : '未回本', tagColor: balance >= 0 ? colors.green : colors.muted, anchor: 'book-' + index }) + 10;
        });
        return y;
      case 'cover': return y + this.cover(parent, y, block.book) + 14;
      case 'chart': return y + this.chart(parent, y, block.book) + 14;
      case 'quotes':
        for (const quote of block.items) {
          const node = this.box(parent, 'Quote', 0, y, width, 40);
          const tone = quote.positive ? colors.green : quote.negative ? colors.danger : colors.ink;
          const height = this.paragraph(node, '“' + quote.text + '”', 9, false, 14, width - 28, 13, tone) + 6;
          node.getComponent(UITransform).setContentSize(width, height);
          const background = this.box(parent, 'QuoteBackground', 0, y, width, height, quote.positive ? '#eaf4ee' : quote.negative ? '#f8ebe8' : colors.pale, 10);
          background.setSiblingIndex(node.getSiblingIndex());
          y += height + 8;
        }
        return y + 6;
      case 'reasons':
        block.items.forEach((item: any, index: number) => {
          const mark = this.box(parent, 'Number', 0, y + 2, 22, 22, colors.amber, 11);
          this.text(mark, String(index + 1), 0, 0, 22, 22, 12, '#ffffff', true).horizontalAlign = HorizontalTextAlignment.CENTER;
          this.text(parent, item.title, 32, y, width - 32, 24, 14, colors.ink, true);
          y += 26;
          y += this.paragraph(parent, item.text, y, true, 32, width - 32, 13);
        });
        return y + 4;
      case 'goals':
        for (const step of block.items) {
          const current = step.key === block.current;
          y += this.choice(parent, y, step.title, step.text + '\n奖励：' + step.reward, () => undefined, { icon: step.done ? 'Check' : current ? 'Target' : 'Lock', tag: step.done ? '已完成' : current ? '进行中' : '', tagColor: step.done ? colors.green : colors.gold, highlight: current }) + 10;
        }
        return y + 4;
      case 'payout': return y + this.payout(parent, y, block) + 10;
      default: return y;
    }
  }

  private cover(parent: Node, y: number, book: any) {
    const width = this.width - 40;
    const { node, pen } = this.canvasNode(parent, 'Cover', 0, y, width, 150);
    drawWork(pen, width, 150, book.type, 1, book.metrics.visual, book.released);
    pen.rect(0, 100, width, 50, colors.night, 0, 170);
    this.text(node, '《' + book.name + '》', 14, 104, width - 28, 26, 19, '#ffffff', true);
    this.text(node, core.TYPES[book.type].name + ' · ' + core.SCALES[book.scale].name + ' · ' + this.state.company, 14, 128, width - 28, 18, 11, '#d7e2d9');
    return 150;
  }

  private chart(parent: Node, y: number, book: any) {
    const width = this.width - 40;
    const height = 150;
    this.text(parent, '累计回款（按周）', 0, y, width, 20, 13, colors.ink, true);
    y += 24;
    const { node, pen } = this.canvasNode(parent, 'Chart', 0, y, width, height);
    pen.rect(0, 0, width, height, colors.paper, 8);
    const cumulative: number[] = [];
    book.weekly.forEach((value: number, index: number) => cumulative.push((cumulative[index - 1] || 0) + value));
    const slots = Math.max(8, cumulative.length);
    const peak = Math.max(book.invested * 1.15, ...cumulative, 1);
    const chartTop = 16;
    const chartHeight = height - 40;
    const slot = (width - 24) / slots;
    const scale = (value: number) => chartHeight * value / peak;
    const paid = cumulative.findIndex(value => value >= book.invested);
    cumulative.forEach((value, index) => {
      const barHeight = Math.max(2, scale(value));
      pen.rect(12 + index * slot + slot * 0.15, chartTop + chartHeight - barHeight, slot * 0.7, barHeight, paid >= 0 && index >= paid ? colors.green : '#b9cfc4', 2);
    });
    const lineY = chartTop + chartHeight - scale(book.invested);
    for (let x = 12; x < width - 12; x += 10) pen.rect(x, lineY - 1, 6, 2, colors.danger);
    this.text(node, '投入 ' + content.money(book.invested), width - 130, Math.max(0, lineY - 20), 118, 18, 11, colors.danger).horizontalAlign = HorizontalTextAlignment.RIGHT;
    if (paid >= 0) {
      const x = 12 + paid * slot + slot / 2;
      pen.circle(x, lineY, 5, colors.gold);
      this.text(node, '第 ' + (paid + 1) + ' 周回本', Math.min(width - 90, Math.max(4, x - 40)), Math.min(chartHeight, lineY + 6), 86, 18, 11, colors.amber, true);
    }
    this.text(node, '发售', 8, height - 22, 60, 18, 10, colors.muted);
    this.text(node, '第 ' + slots + ' 周', width - 70, height - 22, 60, 18, 10, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
    return height + 24;
  }

  private payout(parent: Node, y: number, block: any) {
    const width = this.width - 40;
    const node = this.box(parent, 'Payout', 0, y, width, 112, '#fff8e6', 12);
    this.anchors.set('payout', node);
    this.text(node, block.label, 0, 10, width, 20, 13, colors.amber, true).horizontalAlign = HorizontalTextAlignment.CENTER;
    const label = this.text(node, '+' + content.money(block.amount), 0, 32, width, 48, 36, colors.amber, true);
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    this.text(node, block.note, 0, 82, width, 20, 12, colors.muted).horizontalAlign = HorizontalTextAlignment.CENTER;
    const key = this.state.lastRelease + ':' + block.amount;
    if (this.paidOut !== key) {
      this.paidOut = key;
      const counter = { value: 0 };
      label.string = '+0.00 万';
      tween(counter).delay(0.2).to(1.2, { value: block.amount }, { easing: 'quartOut', onUpdate: () => { if (label.isValid) label.string = '+' + content.money(counter.value); } }).start();
      this.burst(node, width / 2, 56, block.amount);
    }
    return 112;
  }

  // Coin burst scaled by the amount received.
  private burst(parent: Node, x: number, y: number, amount: number) {
    const count = amount < 3 ? 8 : amount < 15 ? 16 : 28;
    if (amount >= 3) {
      const glow = this.box(parent, 'Glow', x, y, 1, 1);
      new Pen(glow.addComponent(Graphics)).circle(0, 0, 60, '#ffd77a', 120);
      glow.setScale(0.2, 0.2, 1);
      const opacity = glow.addComponent(UIOpacity);
      tween(glow).to(0.5, { scale: new Vec3(amount >= 15 ? 2.4 : 1.6, amount >= 15 ? 2.4 : 1.6, 1) }, { easing: 'quadOut' }).start();
      tween(opacity).delay(0.3).to(0.6, { opacity: 0 }).call(() => glow.destroy()).start();
    }
    for (let index = 0; index < count; index++) {
      const coin = this.box(parent, 'Coin', x, y, 1, 1);
      const pen = new Pen(coin.addComponent(Graphics));
      pen.circle(0, 0, 6, colors.gold);
      pen.circle(0, 0, 3.5, '#ffd77a');
      const angle = Math.PI * 2 * index / count + Math.random() * 0.4;
      const distance = 50 + Math.random() * (amount >= 15 ? 110 : 70);
      const opacity = coin.addComponent(UIOpacity);
      tween(coin).to(0.7, { position: new Vec3(x + Math.cos(angle) * distance, -y + Math.sin(angle) * distance * 0.7 + 20, 0) }, { easing: 'quadOut' }).by(0.4, { position: new Vec3(0, -30, 0) }, { easing: 'quadIn' }).start();
      tween(opacity).delay(0.75).to(0.35, { opacity: 0 }).call(() => coin.destroy()).start();
    }
  }

  // Non-blocking banner for milestones; does not pause the game.
  private celebrate() {
    if (this.celebrating || !this.celebrations.length || this.routes.length || this.inputRequest) return;
    const item = this.celebrations.shift();
    this.celebrating = true;
    const width = this.width - 40;
    const big = ['breakeven', 'office', 'record'].includes(item.kind);
    const banner = this.box(this.effects, 'Banner', 20, this.top + 98, width, 70, big ? colors.amber : colors.night, 14, 240);
    this.image(banner, 'icons/' + (({ breakeven: 'Trophy', office: 'Building2', record: 'Star', units: 'TrendingUp' } as any)[item.kind] || 'Sparkles'), 16, 24, 22, 22, '#ffffff');
    this.text(banner, item.title, 50, 12, width - 64, 24, 16, '#ffffff', true);
    this.text(banner, item.text, 50, 36, width - 64, 20, 12, '#fff3d6');
    if (item.kind !== 'notice') this.burst(this.effects, this.width / 2, this.top + 133, big ? Math.max(15, item.amount) : 5);
    banner.setScale(0.9, 0.9, 1);
    const opacity = banner.addComponent(UIOpacity);
    opacity.opacity = 0;
    tween(banner).to(0.25, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
    tween(opacity).to(0.2, { opacity: 255 }).delay(big ? 2.6 : 1.8).to(0.3, { opacity: 0 }).call(() => {
      banner.destroy();
      this.celebrating = false;
      this.celebrate();
    }).start();
  }

  // Time paused for an explanation resumes once no further explanation is waiting.
  private resumeFromGuide() {
    if (!this.guidePaused) return;
    const next = content.guide(this.state, null, false);
    if (next?.ack || next?.tap) return;
    this.guidePaused = false;
    if (!this.routes.length && !this.state.event && !this.state.over && this.state.project) {
      this.playing = true;
      this.elapsed = 0;
    }
    this.render();
  }

  private renderGuide() {
    this.menuAck = null;
    const route = this.routes.length ? this.routes[this.routes.length - 1] : null;
    const step = content.guide(this.state, route, this.playing);
    if (!step) return;
    if (step.ack && route) this.menuAck = step.ack;
    const target = this.anchors.get(step.anchor);
    let rect = null;
    if (target) {
      if (this.scrollView && target.parent === this.scrollBody) {
        const offset = -target.position.y;
        const size = target.getComponent(UITransform).height;
        if (offset + size > this.scrollHeight - 10) this.scrollView.scrollToOffset(new Vec2(0, Math.max(0, offset - this.scrollHeight / 3)), 0);
      }
      const bounds = target.getComponent(UITransform).getBoundingBoxToWorld();
      const local = this.stage.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(bounds.x, bounds.y, 0));
      rect = { x: local.x - 5, y: -(local.y + bounds.height) - 5, w: bounds.width + 10, h: bounds.height + 10 };
    }
    const dim = (x: number, y: number, w: number, h: number) => { if (w > 0 && h > 0) this.box(this.stage, 'Dim', x, y, w, h, colors.night, 0, 120); };
    const acknowledge = () => { this.apply(core.markSeen(this.state, step.ack)); this.resumeFromGuide(); };
    const targetEnabled = !target || !target.getComponent(Button) || target.getComponent(Button).interactable;
    // Main screen: everything outside the highlight is swallowed (explanations close only via "知道了").
    // Menus stay free so players can still pick non-recommended choices.
    const shield = (x: number, y: number, w: number, h: number) => {
      if (w <= 0 || h <= 0 || this.confirmSkip || this.routes.length) return;
      if (!step.ack && !targetEnabled) return;
      this.box(this.stage, 'GuideShield', x, y, w, h).addComponent(BlockInputEvents);
    };
    if (rect) {
      dim(0, 0, this.width, rect.y);
      dim(0, rect.y + rect.h, this.width, this.height - rect.y - rect.h);
      dim(0, rect.y, rect.x, rect.h);
      dim(rect.x + rect.w, rect.y, this.width - rect.x - rect.w, rect.h);
      const headerBottom = this.routes.length ? this.top + 54 : 0;
      shield(0, headerBottom, this.width, rect.y - headerBottom);
      shield(0, rect.y + rect.h, this.width, this.height - rect.y - rect.h);
      shield(0, rect.y, rect.x, rect.h);
      shield(rect.x + rect.w, rect.y, this.width - rect.x - rect.w, rect.h);
      if (step.ack) shield(rect.x, rect.y, rect.w, rect.h);
      if (step.tap && !this.confirmSkip) {
        const anchor = step.anchor;
        this.clickable(this.box(this.stage, 'GuideTap', rect.x, rect.y, rect.w, rect.h), () => {
          this.state = core.markSeen(this.state, step.tap);
          this.save();
          this.resumeFromGuide();
          this.anchors.get(anchor)?.emit(Button.EventType.CLICK);
        });
      }
      const ring = this.box(this.stage, 'Ring', rect.x, rect.y, rect.w, rect.h);
      new Pen(ring.addComponent(Graphics)).frame(0, 0, rect.w, rect.h, '#ffd166', 3, 10);
      const opacity = ring.addComponent(UIOpacity);
      tween(opacity).to(0.6, { opacity: 110 }).to(0.6, { opacity: 255 }).union().repeatForever().start();
    }
    const width = this.width - 40;
    const bubble = this.box(this.stage, 'Bubble', 20, 0, width, 60);
    let height: number;
    if (this.confirmSkip) {
      height = this.paragraph(bubble, '跳过后不再出现教程提示，确定跳过吗？', 14, false, 16, width - 32, 14) + 14;
      const cell = (width - 40) / 2;
      this.button(bubble, '继续教程', 16, height, cell, 34, () => { this.confirmSkip = false; this.render(); }, true);
      this.button(bubble, '确认跳过', 24 + cell, height, cell, 34, () => {
        this.confirmSkip = false;
        this.apply(core.skipTutorial(this.state));
        this.resumeFromGuide();
      });
    } else {
      height = this.paragraph(bubble, step.text, 14, false, 16, width - 32, 14) + 14;
      const skipWidth = 72;
      const skipRow = step.ack ? height : height - 8;
      const skip = this.text(bubble, '跳过教程', width - 16 - skipWidth, skipRow, skipWidth, step.ack ? 34 : 26, 11, colors.muted);
      skip.horizontalAlign = HorizontalTextAlignment.RIGHT;
      this.clickable(skip.node, () => { this.confirmSkip = true; this.render(); });
      if (step.ack) this.button(bubble, '知道了', 16, height, width - 40 - skipWidth, 34, acknowledge, true);
      else height -= 20;
    }
    height += 48;
    bubble.getComponent(UITransform).setContentSize(width, height);
    const pen = new Pen(bubble.addComponent(Graphics));
    pen.rect(0, 0, width, height, colors.paper, 12);
    pen.frame(0, 0, width, height, '#ffd166', 2, 12);
    const floor = this.height - this.bottom - 8;
    const ceiling = this.top + 4;
    const gap = 14;
    let placement = 'free';
    let bubbleY = floor - height - (this.routes.length ? 0 : 58);
    if (rect) {
      // Bubble sits right next to the highlight so text, arrow and target read as one unit.
      if (floor - (rect.y + rect.h + gap) >= height) { placement = 'below'; bubbleY = rect.y + rect.h + gap; }
      else if (rect.y - gap - ceiling >= height) { placement = 'above'; bubbleY = rect.y - gap - height; }
      else { placement = 'inside'; bubbleY = Math.max(ceiling, Math.min(floor - height, rect.y + rect.h - height - 8)); }
    }
    bubble.setPosition(20, -bubbleY);
    if (rect && placement !== 'inside') {
      const arrow = this.box(this.stage, 'Arrow', 0, 0, 1, 1);
      const x = Math.min(20 + width - 24, Math.max(44, rect.x + rect.w / 2));
      const below = placement === 'below';
      const base = below ? bubbleY + 1 : bubbleY + height - 1;
      const tip = below ? bubbleY - gap + 3 : bubbleY + height + gap - 3;
      new Pen(arrow.addComponent(Graphics)).poly([x - 10, base, x + 10, base, x, tip], '#ffd166');
      tween(arrow).by(0.45, { position: new Vec3(0, below ? -3 : 3, 0) }).by(0.45, { position: new Vec3(0, below ? 3 : -3, 0) }).union().repeatForever().start();
    }
  }

  private input(parent: Node, placeholder: string, value: string, y: number, height: number, changed: (value: string) => void, multiline = false) {
    const width = this.width - 40;
    const field = this.box(parent, 'InputBackground', 0, y, width, height, colors.paper, 8);
    const node = this.box(field, 'Input', 12, 5, width - 24, height - 10);
    node.getComponent(UITransform).setAnchorPoint(0.5, 0.5);
    node.setPosition(width / 2, -height / 2);
    node.active = false;
    const edit = node.addComponent(EditBox);
    edit.inputMode = multiline ? EditBox.InputMode.ANY : EditBox.InputMode.SINGLE_LINE;
    for (const child of [...node.children]) { child.removeFromParent(); child.destroy(); }
    edit.textLabel = this.text(node, '', -(width - 24) / 2, -(height - 10) / 2, width - 24, height - 10, multiline ? 16 : 15, colors.ink);
    edit.placeholderLabel = this.text(node, placeholder, -(width - 24) / 2, -(height - 10) / 2, width - 24, height - 10, 15, colors.muted);
    edit.textLabel.overflow = Label.Overflow.CLAMP;
    edit.placeholderLabel.overflow = Label.Overflow.CLAMP;
    edit.maxLength = multiline ? 1048576 : 24;
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
    if (menu === 'new-project') this.draft = { name: '', type: '', scale: 0 };
    if (menu === 'book') this.markReview(id);
    this.routes.push({ menu, id });
    this.render();
  }

  private markReview(id?: string) {
    const book = this.state.catalog.find((item: any) => item.id === id);
    if (book?.tutorial && !this.state.tutorial.seen.review) { this.state = core.markSeen(this.state, 'review'); this.save(); }
  }

  private closeMenu() {
    if (!this.state.company) return;
    if (this.state.event) { this.routes = [{ menu: 'event' }]; this.render(); return; }
    this.routes = [];
    this.inputRequest = null;
    this.playing = this.resumeAfterMenu && !this.state.over;
    this.resumeAfterMenu = false;
    this.elapsed = 0;
    this.holdForGuide();
    this.render();
    this.celebrate();
  }

  // Keep time stopped while an explanation is on screen; "知道了" resumes it.
  private holdForGuide() {
    const step = this.playing ? content.guide(this.state, null, true) : null;
    if (step?.ack || step?.tap) {
      this.playing = false;
      this.guidePaused = true;
    }
  }

  private apply(next: any, message?: string) {
    this.state = this.drain(next);
    this.save();
    if (next.event) { this.playing = false; this.resumeAfterMenu = false; this.routes = [{ menu: 'event' }]; }
    if (next.over) { this.playing = false; this.resumeAfterMenu = false; }
    this.render();
    if (message) this.notify(message);
    this.celebrate();
  }

  private notify(message: string) {
    this.notice = String(message || '操作未完成');
    this.unschedule(this.clearNotice);
    this.scheduleOnce(this.clearNotice, 2.5);
    this.render();
  }

  private decide(choice: string) {
    const event = this.state.event;
    const routes: any = { tools: { menu: 'tools' }, recruit: { menu: 'recruit', id: 'art:' + content.bestChannel(this.state) }, test: { menu: 'testing' }, visual: { menu: 'visual' }, prepare: { menu: 'project' } };
    this.apply(core.resolveStudioEvent(this.state, choice));
    if (this.state.event) return;
    if (routes[choice] && this.state.project) {
      this.routes = [routes[choice]];
      this.resumeAfterMenu = true;
      this.render();
      return;
    }
    this.routes = [];
    this.resumeAfterMenu = false;
    this.playing = !!this.state.project && event.id !== 'cash' && !this.state.over;
    this.elapsed = 0;
    this.holdForGuide();
    this.render();
    if (this.playing) this.notify('继续经营中，随时可以暂停。');
    this.celebrate();
  }

  dispatch(action: string, data: any = {}) {
    try {
      switch (action) {
        case 'clock':
          if (!this.state.company) return this.openMenu('setup', undefined, true);
          if (this.state.event) return this.openMenu('event', undefined, true);
          if (!this.state.over && !this.routes.length) {
            this.playing = !this.playing;
            this.elapsed = 0;
            if (this.playing && !this.state.tutorial.seen.clock) this.state = core.markSeen(this.state, 'clock');
            this.render();
          }
          break;
        case 'menu': this.openMenu(data.menu, data.id); break;
        case 'form-submit': {
          const next = core.startProject(this.state, this.draft);
          this.routes = [];
          this.resumeAfterMenu = false;
          this.apply(next);
          break;
        }
        case 'recruit': this.apply(core.publishRecruitment(this.state, data.role, data.channel)); break;
        case 'hire': {
          const person: any = Object.values(this.state.candidates).flatMap((pool: any) => pool.people).find((item: any) => item.id === data.id);
          this.apply(core.hire(this.state, data.id), person.name + ' 加入了工作室！');
          if (this.state.staff.length === 1 && !this.state.project) { this.routes = []; this.render(); }
          break;
        }
        case 'dismiss': this.apply(core.dismiss(this.state, data.id)); this.routes = [{ menu: 'team' }]; this.render(); break;
        case 'buy-tool': this.apply(core.buyTool(this.state, data.role), '工具已购置，产能已经提高。'); break;
        case 'assets': this.apply(core.buyAssets(this.state), '素材已就位，画面表现提高了。'); break;
        case 'plain': this.apply(core.keepPlain(this.state), '保持朴素画面，发售后看玩家反应。'); break;
        case 'focus': this.apply(core.setFocus(this.state, data.focus)); break;
        case 'test': this.apply(core.testDemo(this.state, Number(data.count))); break;
        case 'promote': {
          const before = this.state.project.followers;
          this.apply(core.promote(this.state, Number(data.tier)));
          this.floatAt(this.anchors.get('promote-' + data.tier), '+' + content.number(this.state.project.followers - before) + ' 人关注', colors.green);
          break;
        }
        case 'launch': this.apply(core.launchProject(this.state)); break;
        case 'decision': this.decide(data.choice); break;
        case 'review':
          this.apply(core.resolveStudioEvent(this.state, 'continue'));
          this.routes = [];
          this.openMenu('book', data.id);
          break;
        case 'move': this.apply(core.moveOffice(this.state)); this.routes = []; this.render(); this.celebrate(); break;
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
            this.shown = null;
            this.apply(next, '存档已恢复，时间保持暂停。');
            if (!next.company) this.routes = [{ menu: 'setup' }];
          } };
          this.render();
          break;
        case 'restart':
          this.playing = false;
          this.resumeAfterMenu = false;
          this.celebrations = [];
          this.shown = null;
          this.draft = { name: '', type: '', scale: 0 };
          this.routes = [{ menu: 'setup' }];
          this.apply(core.createStudio());
          break;
      }
    } catch (error) { this.notify(error.message || '本次操作未执行。'); }
  }
}
