import {
  _decorator, Component, Node, Canvas, Camera, Color, Layers, UITransform, Label,
  view, screen, ResolutionPolicy, Graphics, Sprite, SpriteFrame, resources, ScrollView,
  Mask, EditBox, Button, HorizontalTextAlignment, VerticalTextAlignment, Texture2D,
  game as engineGame, Game, tween, UIOpacity, Vec2, Vec3, BlockInputEvents, AudioClip, AudioSource, EventTouch
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
  private draft: any = { name: '', type: '', scale: 0 };
  // Which open project the main screen currently speaks for when several run at once.
  private watching: string | null = null;
  private audio: AudioSource;
  private sounds = new Map<string, AudioClip>();
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
  private noticeFresh = false;
  private scrollKey = '';
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
  private helpKey = '';
  private chartSelection: { id: string; index: number } | null = null;
  private activeTouches = new Set<number>();
  private renderPending = false;
  // timeUp clears both: a storage warning shares the toast with normal notices, so if it were left
  // behind, every later render would bring the old warning back and it could never be dismissed.
  private clearNotice = () => { this.notice = ''; this.storageIssue = ''; this.render(); };

  start() {
    view.setDesignResolutionSize(390, 844, ResolutionPolicy.FIXED_WIDTH);
    this.canvas = new Node('StudioCanvas');
    this.canvas.layer = Layers.Enum.UI_2D;
    this.node.addChild(this.canvas);
    this.canvas.addComponent(UITransform).setContentSize(view.getVisibleSize());
    this.canvas.on(Node.EventType.TOUCH_START, this.touchStarted, this, true);
    this.canvas.on(Node.EventType.TOUCH_END, this.touchFinished, this, true);
    this.canvas.on(Node.EventType.TOUCH_CANCEL, this.touchFinished, this, true);
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
    this.audio = this.canvas.addComponent(AudioSource);
    for (const name of ['click', 'income', 'launch', 'breakeven']) resources.load('sounds/' + name, AudioClip, (error, clip) => {
      if (!error && this.isValid) this.sounds.set(name, clip);
    });
    if (!this.state.company) this.routes = [{ menu: 'setup' }];
    else if (this.state.event) this.routes = [{ menu: 'event' }];
    this.resize();
    screen.on('window-resize', this.resize, this);
    engineGame.on(Game.EVENT_HIDE, this.background, this);
    platform.onHide(() => { if (this.isValid) this.background(); });
    // The storage warning stays until dismissed (no timer), so it is not lost while the player is still
    // reading the opening screen; normal notices still expire on their own.
    if (this.storageIssue) this.render();
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
    this.activeTouches.clear();
    this.playing = false;
    this.guidePaused = false;
    this.resumeAfterMenu = false;
    this.elapsed = 0;
    this.save();
    this.render();
  }

  private touchStarted(event: EventTouch) {
    this.activeTouches.add(event.getID());
  }

  private touchFinished(event: EventTouch) {
    this.activeTouches.delete(event.getID());
    if (!this.activeTouches.size && this.renderPending) this.scheduleOnce(() => this.render(), 0);
  }

  update(delta: number) {
    if (this.activeTouches.size || !this.playing || this.routes.length || this.inputRequest || this.state?.event || this.state?.over) return;
    this.elapsed += Math.min(delta, 0.25) * this.speed;
    let changed = false;
    const settledMonth = this.state.report?.month;
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
        if (content.guide(this.state, null, true)?.ack) { this.elapsed = 0; break; }
      }
      if (this.state.over) this.playing = false;
      // Daily sales and payroll are summarised at month end instead of floating every day.
      if (changed && this.shown) this.shown.cash = this.state.cash;
      const report = this.state.report;
      if (changed && report && report.month !== settledMonth) {
        if (report.income > 0) this.playSound('income');
        this.celebrations.push({ kind: 'settle', title: `第 ${report.month} 月结算`, text: `收入 ${content.money(report.income)}，支出 ${content.money(report.expense)}，净 ${report.net >= 0 ? '+' : ''}${content.money(report.net)}`, amount: 0 });
      }
      if (changed) { this.save(); this.render(); this.celebrate(); }
      if (changed && report && report.month !== settledMonth) this.floatAt(this.anchors.get('finance'), (report.net >= 0 ? '+' : '') + content.money(report.net), report.net >= 0 ? colors.green : colors.danger, 0.13);
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
      // Keep the unreadable copy aside, then start fresh. The warning is shown once and can be dismissed;
      // it must not come back on every render, or the player can never get rid of it.
      try {
        const raw = platform.read();
        if (raw) platform.write(raw, 'sunlight-studio-v2-recovery');
      } catch { this.storageIssue = '本地存档不可用，请及时导出进度。'; }
      this.storageIssue ||= '旧存档无法读取，已另存为恢复副本，新开了一局。';
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
    if (next.feed.some((item: any) => item.kind === 'breakeven')) this.playSound('breakeven');
    else if (next.feed.some((item: any) => item.kind === 'release')) this.playSound('launch');
    this.celebrations.push(...next.feed.filter((item: any) => item.kind !== 'release'));
    return core.consumeFeed(next);
  }

  private playSound(name: string) {
    const clip = this.sounds.get(name);
    if (this.state?.sound && clip && this.audio) this.audio.playOneShot(clip, name === 'click' ? 0.3 : 0.55);
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

  // Every icon is the same white line art tinted at runtime; keep one code path so they stay consistent.
  private navIcon(parent: Node, name: string, x: number, y: number, size: number, tint: string) {
    return this.image(parent, 'icons/' + name, x, y, size, size, tint);
  }

  private clickable(node: Node, callback: () => void, enabled = true) {
    const button = node.addComponent(Button);
    button.interactable = enabled;
    button.transition = Button.Transition.SCALE;
    button.zoomScale = 0.97;
    node.on(Button.EventType.CLICK, () => {
      try {
        // CLICK means this press has finished. Clear the touch guard before running the action:
        // otherwise apply()/notify() can both skip rendering, leaving grey buttons and stale text
        // even though core.toggleAssign()/assign() already changed the project correctly.
        this.activeTouches.clear();
        this.playSound('click');
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
    // Icons are reserved for icon-only buttons (clock, speed). A titled button is words alone and
    // centred: mixing a small glyph into a row of plain buttons was never worth the asymmetry.
    if (icon && !title) this.navIcon(node, icon, (width - 20) / 2, (height - 20) / 2, 20, disabled ? colors.muted : primary ? '#ffffff' : colors.green);
    if (title) {
      const label = this.text(node, title, 0, 0, width, height, 14, disabled ? colors.muted : primary ? colors.paper : colors.green, primary);
      label.enableWrapText = false;
      label.horizontalAlign = HorizontalTextAlignment.CENTER;
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
    if (this.activeTouches.size) { this.renderPending = true; return; }
    this.renderPending = false;
    if (this.playing && !this.routes.length && !this.inputRequest && !this.state.event && !this.state.over && content.guide(this.state, null, true)?.ack) {
      this.guidePaused = true;
      this.playing = false;
      this.elapsed = 0;
    }
    // A day tick re-renders the whole page. Without carrying the offset over, scrolling down while the
    // clock ran snapped back to the top every tick. A different screen starts at the top again.
    const key = this.routes.map((route: any) => route.menu + (route.id || '') + (route.dim || '')).join('>') + (this.inputRequest ? '#' : '');
    const keep = key === this.scrollKey && this.scrollView ? this.scrollView.getScrollOffset().y : 0;
    this.clear();
    this.box(this.stage, 'Paper', 0, 0, this.width, this.height, colors.bg);
    // A screen that throws half-way used to leave a blank page with no way back. Draw the reason on
    // the page instead, and keep the bottom navigation alive so the player can still move around.
    try {
      if (this.inputRequest) this.renderInput();
      else if (this.routes.length) this.renderMenu();
      else this.renderStudio();
    } catch (error: any) {
      console.error('Render failed:', error);
      this.text(this.stage, '这一页没能画出来：' + (error?.message || error), 20, this.top + 70, this.width - 40, 60, 13, colors.danger);
      this.button(this.stage, '返回工作室', 20, this.top + 130, this.width - 40, 44, () => { this.routes = []; this.inputRequest = null; this.playing = false; this.render(); }, true);
    }
    if (!this.inputRequest) this.renderGuide();
    if (keep > 1 && this.scrollView) this.scrollView.scrollToOffset(new Vec2(0, keep), 0);
    this.scrollKey = key;
    if (this.notice || this.storageIssue) {
      const message = this.notice || this.storageIssue;
      const toast = this.box(this.stage, 'Toast', 20, this.height - this.bottom - 130, this.width - 40, 52, colors.night, 12, 235);
      this.text(toast, message, 16, 0, this.width - 128, 52, 13, '#ffffff').horizontalAlign = HorizontalTextAlignment.CENTER;
      this.button(toast, '', this.width - 82, 8, 34, 36, () => this.clearNotice(), false, false, 'X', 'dismiss-notice');
      // Dismissing drops the sticky storage warning too, so it cannot come straight back on the next render.
      this.clickable(toast, () => { this.notice = ''; this.storageIssue = ''; this.render(); });
      const opacity = toast.addComponent(UIOpacity);
      // Fade only when the message is new. Re-animating on every re-render made one notice flash several
      // times while the clock was running, which read as the same tip popping up four times.
      if (this.noticeFresh) { opacity.opacity = 0; tween(opacity).to(0.15, { opacity: 255 }).start(); this.noticeFresh = false; }
      else opacity.opacity = 255;
    }
  }

  private renderStudio() {
    const state = this.state;
    const width = this.width;
    const inner = width - 40;
    const month = Math.floor((state.day - 1) / 30) + 1;
    const header = platform.header();
    const top = header.top;
    const headerRight = width - Math.max(20, header.capsule);
    // On the mini program the header shares a row with the native capsule; the reserved width is a
    // best-effort guess, so keep the play/speed buttons a little further in rather than let the
    // last speed chip touch the capsule on devices whose capsule is wider than reported.
    const controlsRight = headerRight - (platform.mini ? 22 : 8);
    const controlsLeft = controlsRight - 4 * 40;
    this.text(this.stage, state.company || '日光工作室', 20, top, controlsLeft - 32, 24, 17, colors.ink, true);
    this.text(this.stage, `第 ${month} 月 ${(state.day - 1) % 30 + 1} 日`, 20, top + 24, controlsLeft - 32, 18, 11, this.playing ? colors.green : colors.muted);
    this.button(this.stage, '', controlsLeft, top + 2, 40, 40, () => this.dispatch('clock'), true, false, this.playing ? 'Pause' : 'Play', 'clock');
    [1, 4, 12].forEach((value, index) => this.button(this.stage, value + '×', controlsLeft + 40 + index * 40, top + 2, 38, 40, () => { this.speed = value; this.render(); }, this.speed === value));
    const financesY = top + 52;
    const finance = this.box(this.stage, 'Finance', 20, financesY, inner, 42, colors.paper, 10);
    this.anchors.set('finance', finance);
    const column = inner / 4;
    const cashLabel = [['资金', content.money(state.cash)], ['月开支', content.money(core.monthlyCost(state))], ['本月收入', content.money(state.ledger.income)], ['本月支出', content.money(content.monthSpent(state))]].map(([name, value], index) => {
      this.text(finance, name, 10 + column * index, 3, column - 10, 16, 10, colors.muted);
      return this.text(finance, value, 10 + column * index, 18, column - 12, 22, 15, index === 0 ? colors.green : index === 2 ? colors.amber : colors.ink, true);
    })[0];
    const navY = this.height - this.bottom - 58;
    this.box(this.stage, 'NavigationBackground', 0, navY - 8, width, 66 + this.bottom, colors.paper);
    navigation.forEach(([menu, title, icon], index) => {
      const cellWidth = width / 6;
      const lock = content.menuLock(state, menu);
      const node = this.box(this.stage, title, index * cellWidth, navY, cellWidth, 54);
      this.clickable(node, () => {
        if (lock) { this.notify(title + '：' + lock + '。'); return; }
        const target = menu === 'project' && !core.projectOpen(state).length ? 'new-project' : menu;
        const id = ['project', 'testing', 'market'].includes(menu) ? this.watching : undefined;
        this.openMenu(target, id);
      });
      this.navIcon(node, lock ? 'Lock' : icon, (cellWidth - 22) / 2, 5, 22, lock ? colors.line : colors.green);
      this.text(node, title, 0, 32, cellWidth, 18, 11, lock ? colors.muted : colors.ink).horizontalAlign = HorizontalTextAlignment.CENTER;
      this.anchors.set('nav-' + menu, node);
    });
    const contentY = financesY + 50;
    const viewHeight = navY - contentY - 10;
    const open = core.projectOpen(state);
    // Several projects at once: a tab strip picks which one the main screen speaks for.
    const shown = open.find((item: any) => item.id === this.watching) || open[0];
    if (shown) this.watching = shown.id;
    let contentTop = contentY;
    if (open.length > 1) {
      const strip = this.box(this.stage, 'Projects', 20, contentY, inner, 38);
      const index = open.findIndex((item: any) => item.id === shown.id);
      const previous = this.box(strip, 'PreviousProject', 0, 0, 36, 34, colors.soft, 8);
      this.navIcon(previous, 'ArrowLeft', 8, 7, 20, colors.green);
      this.clickable(previous, () => { this.watching = open[(index + open.length - 1) % open.length].id; this.render(); });
      const next = this.box(strip, 'NextProject', inner - 36, 0, 36, 34, colors.soft, 8);
      this.navIcon(next, 'ChevronRight', 8, 7, 20, colors.green);
      this.clickable(next, () => { this.watching = open[(index + 1) % open.length].id; this.render(); });
      this.text(strip, `${shown.name} · ${index + 1}/${open.length}`, 44, 0, inner - 88, 34, 12, colors.green, true).horizontalAlign = HorizontalTextAlignment.CENTER;
      contentTop = contentY + 44;
    }
    const project = shown;
    // Fixed rows below and above the scene; the scene absorbs any shortage on short screens.
    const shrink = Math.max(0, Math.min(80, (project ? 504 : 372) - (navY - contentTop - 10)));
    const { body, finish } = this.scroller(contentTop, navY - contentTop - 10);
    let y = this.goalCard(body, 0) + 8;
    const sceneTop = y;
    y += this.office(body, y, 116 - Math.round(shrink / 2)) + 6;
    const metrics = project ? core.visibleMetrics(project) : null;
    const workHeight = 96 - Math.round(shrink / 2);
    const { node: work, pen } = this.canvasNode(body, 'Work', 0, y, inner, workHeight);
    if (project) drawWork(pen, inner, workHeight, project.type, metrics.progress / 100, metrics.dimensions.picture, project.started);
    else if (state.catalog.length) drawWork(pen, inner, workHeight, state.catalog[0].type, 1, state.catalog[0].metrics.dimensions.picture, state.catalog[0].released);
    else { pen.rect(0, 0, inner, workHeight, colors.pale, 6); this.text(work, '立项后，作品会在这里一点点成形', 0, 0, inner, workHeight, 13, colors.muted).horizontalAlign = HorizontalTextAlignment.CENTER; }
    if (!project && state.catalog.length) {
      const caption = '上一作《' + state.catalog[0].name + '》';
      const chipWidth = Math.min(inner - 16, caption.length * 12 + 20);
      const chip = this.box(work, 'Caption', 8, workHeight - 28, chipWidth, 22, colors.night, 11, 190);
      this.text(chip, caption, 10, 0, chipWidth - 20, 22, 11, '#ffffff');
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
    const title = (index < 0 ? '挑战' : `目标 ${index + 1}/${goals.steps.length}`) + ' · ' + goals.current.title;
    this.text(card, title, 38, 1, inner - 124, 17, 12, colors.ink, true);
    this.text(card, '奖励：' + goals.current.reward, 38, 17, inner - 124, 15, 10, colors.amber);
    goals.steps.forEach((step, dot) => this.box(card, 'Dot', inner - 12 - (goals.steps.length - dot) * 10, 14, 6, 6, step.done ? colors.amber : step.key === goals.current.key ? '#f0c56a' : colors.line, 3));
    this.clickable(card, () => this.openMenu('goals'));
    this.anchors.set('goal', card);
    return 34;
  }

  private office(body: Node, y: number, height: number) {
    const state = this.state;
    const inner = this.width - 40;
    const { node, pen } = this.canvasNode(body, 'Office', 0, y, inner, height);
    drawRoom(pen, inner, height, state.office);
    const working = this.playing && core.projectOpen(state).length > 0;
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
    // Must follow the tab the player picked, not whichever project happens to be first.
    const open = core.projectOpen(state);
    const project = open.find((item: any) => item.id === this.watching) || open[0];
    if (!project) return y;
    const inner = this.width - 40;
    const forecast = core.projectForecast(state, project);
    this.text(body, '《' + project.name + '》', 0, y, inner - 150, 24, 16, colors.ink, true);
    this.text(body, core.TYPES[project.type].name + ' · ' + core.SCALES[project.scale].name + '   ' + metrics.progress.toFixed(0) + '%', inner - 150, y, 150, 24, 12, colors.green, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
    y += 28;
    y += this.milestones(body, y, project, metrics, forecast) + 6;
    // The radar is six zeroes and a lot of empty space until a prototype exists. Reveal the scoring
    // panel when it actually has a shape instead of opening the game on a wall of zeroes.
    if (!project.checkpoints?.prototype) {
      const hint = this.box(body, 'PrototypeHint', 0, y, inner, 54, colors.pale, 8);
      this.text(hint, '完成 25% 原型后，这里显示六维评分、瓶颈与关注。现在先开始时间或调整分工。', 12, 2, inner - 24, 50, 12, colors.muted);
      return y + 62;
    }
    y += this.radar(body, y, metrics, project.type, project) + 8;
    const bottleneck = forecast.bottleneck ? core.DIMENSIONS.find(dimension => dimension.key === forecast.bottleneck.key)?.name : '—';
    const cells: any[] = [
      ['综合估计', metrics.overall.toFixed(0), colors.green, metrics.overall, 'stat-overall'],
      ['瓶颈', bottleneck || '—', colors.amber, -1, 'stat-bottleneck'],
      ['待修缺陷', metrics.known + ' 项', colors.blue, -1, 'stat-defects'],
      ['关注', content.number(project.followers), colors.ink, -1, 'stat-followers']
    ];
    const cell = inner / 4;
    this.anchors.set('stats', this.box(body, 'StatsAnchor', 0, y, inner, 46));
    cells.forEach(([title, value, color, bar, anchor], index) => {
      const node = this.box(body, title, index * cell, y, cell - 6, 46);
      this.text(node, title, 0, 0, cell - 6, 16, 10, colors.muted);
      const label = this.text(node, value, 0, 16, cell - 6, 24, anchor === 'stat-overall' ? 14 : value === '未测试' ? 13 : 18, value === '未测试' || value === '—' ? colors.muted : color, true);
      if (anchor === 'stat-followers') { this.followersLabel = label; this.rollLabel('followers', label, (n: number) => content.number(n)); }
      if (bar >= 0) {
        this.box(node, 'Track', 0, 42, cell - 12, 3, colors.line);
        this.box(node, 'Value', 0, 42, (cell - 12) * bar / 100, 3, color);
      }
      this.anchors.set(anchor, node);
    });
    y += 50;
    const insight = core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type);
    this.anchors.set('insight', this.text(body, insight + (project.test ? ' · 试玩 ' + project.test.score.toFixed(1) + ' 分' : ''), 0, y, inner, 18, 11, colors.muted).node);
    return y + 26;
  }

  // Six-axis radar: the solid layer is the current score, the dashed one is where today's team would
  // land if it finished the work. The gap between them is what time can still buy.
  private radar(body: Node, y: number, metrics: any, type: string, project?: any) {
    const inner = this.width - 40;
    const height = 184;
    const { node, pen } = this.canvasNode(body, 'Radar', 0, y, inner, height);
    this.anchors.set('radar', node);
    const center = { x: inner / 2, y: 82 };
    const radius = 52;
    const count = core.DIM_KEYS.length;
    // Layout coordinates (origin top-left, y downward). The Pen flips y internally for the Graphics
    // API, so these values are already in the downward-positive space the Pen expects.
    const point = (index: number, value: number) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
      return { x: center.x + Math.cos(angle) * radius * value / 100, y: center.y + Math.sin(angle) * radius * value / 100 };
    };
    for (const ring of [0.25, 0.5, 0.75, 1]) {
      const points = core.DIM_KEYS.map((_key: string, index: number) => point(index, ring * 100));
      for (let index = 0; index < count; index += 1) {
        const next = points[(index + 1) % count];
        pen.line(points[index].x, points[index].y, next.x, next.y, ring === 1 ? colors.line : colors.pale, 1);
      }
    }
    core.DIM_KEYS.forEach((_key: string, index: number) => {
      const far = point(index, 100);
      pen.line(center.x, center.y, far.x, far.y, colors.pale, 1);
    });
    // The dashed layer shows where today's team would land if it finished all planned work.
    const expected = project ? core.expectedDimensions(this.state, project) : null;
    if (expected) {
      const dash = core.DIM_KEYS.map((key: string, index: number) => point(index, expected[key] || 0));
      for (let index = 0; index < count; index += 1) {
        const a = dash[index];
        const b = dash[(index + 1) % count];
        this.dashedLine(pen, a.x, a.y, b.x, b.y, colors.amber);
      }
    }
    const solid = core.DIM_KEYS.map((key: string, index: number) => point(index, metrics.dimensions[key] || 0));
    for (let index = 0; index < count; index += 1) {
      const next = solid[(index + 1) % count];
      pen.line(solid[index].x, solid[index].y, next.x, next.y, colors.green, 2);
    }
    core.DIM_KEYS.forEach((key: string, index: number) => {
      const name = core.DIMENSIONS.find(dimension => dimension.key === key)?.name || '';
      const score = Math.round(metrics.dimensions[key] || 0);
      const label = this.text(node, name + '\n' + (key === 'stability' && metrics.untested ? '未测' : score + ' 分'), 0, 0, 56, 32, 11, colors.muted);
      label.horizontalAlign = HorizontalTextAlignment.CENTER;
      // setPosition uses engine coords (y up). Center the 32px label on the radial point.
      const spot = point(index, 120);
      label.node.setPosition(spot.x - 28, -spot.y + 16);
      if (project && !project.released) this.clickable(label.node, () => this.openMenu('dimension', project.id, false, key));
    });
    this.text(node, '绿线为当前 · 黄虚线为做完预期 · 点评分看详情', 8, height - 16, inner - 16, 14, 10, colors.muted);
    return height;
  }

  // Dashed segment for the radar's "expected" layer (the Pen only draws solid lines).
  private dashedLine(pen: Pen, x1: number, y1: number, x2: number, y2: number, hex: string) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    if (length < 1) return;
    const step = 4;
    const count = Math.max(1, Math.floor(length / step));
    for (let index = 0; index < count; index += 2) {
      const t0 = index / count;
      const t1 = Math.min(1, (index + 1) / count);
      pen.line(x1 + dx * t0, y1 + dy * t0, x1 + dx * t1, y1 + dy * t1, hex, 1);
    }
  }

  // Phase track: days to the next milestone sit above the current segment, total days under "完成".
  private milestones(body: Node, y: number, project: any, metrics: any, forecast: any) {
    const inner = this.width - 40;
    const track = this.box(body, 'Track', 0, y, inner, 58);
    this.anchors.set('track', track);
    // Launch unlocks at the trial build, not at 100%. The old track ended in "发售" at full progress,
    // which taught the opposite and made players grind to 100% before daring to release.
    const phases = [['立项', 0], ['原型', 25], ['体验版', 55], ['做满', 100]];
    const railLeft = 12;
    const railWidth = inner - 24;
    const railY = 22;
    const fill = Math.max(0, Math.min(1, metrics.progress / 100));
    // Nodes sit at their own thresholds. Spacing them evenly made a 25% prototype unlock sit at a third
    // of the rail, so the bar always looked behind the milestone the game had already passed.
    const at = (threshold: number) => railLeft + railWidth * (threshold / 100);
    this.box(track, 'Rail', railLeft, railY + 5, railWidth, 3, colors.line);
    this.box(track, 'Fill', railLeft, railY + 5, railWidth * fill, 3, colors.green);
    const days = forecast.days;
    const phase = metrics.progress < 25 ? 0 : metrics.progress < 55 ? 1 : metrics.progress < 100 ? 2 : 3;
    const note = phase === 3 ? '已可发售' : phase === 2 && days != null ? '可发售 · 做满约 ' + days + ' 天' : days == null ? '缺人手' : '距做完约 ' + days + ' 天';
    const warn = phase < 3 && (days == null || !!forecast.bottleneck);
    const noteWidth = phase >= 2 ? 190 : 130;
    const noteCenter = at(metrics.progress);
    this.text(track, note, Math.max(0, Math.min(inner - noteWidth, noteCenter - noteWidth / 2)), 0, noteWidth, 18, 11, warn ? colors.amber : colors.green, true).horizontalAlign = HorizontalTextAlignment.CENTER;
    phases.forEach(([title, threshold], index) => {
      const x = at(Number(threshold));
      this.box(track, String(title), x - 6.5, railY, 13, 13, metrics.progress >= Number(threshold) ? colors.green : colors.line, 6);
      const label = this.text(track, title, Math.min(inner - 48, Math.max(0, x - 24)), railY + 16, 48, 16, 10, colors.muted);
      label.horizontalAlign = index === 0 ? HorizontalTextAlignment.LEFT : index === phases.length - 1 ? HorizontalTextAlignment.RIGHT : HorizontalTextAlignment.CENTER;
    });
    return 58;
  }

  // Floating "+N" hints for followers, cash and found defects; only for changes worth noticing.
  private showDeltas(cashLabel: Label) {
    const open = core.projectOpen(this.state);
    const project = open.find((item: any) => item.id === this.watching) || open[0];
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
    // Event pages used to have no close button at all, so the release screen trapped the player in it.
    // A single-choice event (release, settlement) can be dismissed with ✕; a real decision still must be made.
    const singleChoiceEvent = route.menu === 'event' && (this.state.event?.choices?.length || 0) === 1;
    if (this.state.company && (route.menu !== 'event' || singleChoiceEvent)) this.button(this.stage, '', this.width - 60, y, 40, 40, () => this.closeMenu(), false, false, 'X');
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
    this.text(body, '你的出身（决定首作哪一维最拿手）', 0, cursor, inner, 24, 15, colors.ink, true);
    cursor += 30;
    const founder = this.draft.founder || 'code';
    const founderRoles = Object.keys(core.ROLES);
    founderRoles.forEach((role: string, index: number) => {
      const cell = (inner - 16) / 3;
      const col = index % 3;
      const row = Math.floor(index / 3);
      this.button(body, core.ROLES[role].name, col * (cell + 8), cursor + row * 50, cell, 42, () => { this.draft.founder = role; this.render(); }, founder === role, false);
    });
    cursor += Math.ceil(founderRoles.length / 3) * 50;
    cursor += this.paragraph(body, '你一个人也能独立做完第一款游戏；后面招到同事，再补齐其余各项。', cursor, true, 0, inner, 13);
    this.button(body, '成立工作室', 0, cursor, inner, 48, () => {
      this.apply(core.nameCompany(this.state, this.draft.name, this.draft.founder || 'code'));
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
    if (this.draft.sequel) cursor += this.paragraph(body, '系列续作：继承原作类型与部分关注，玩家期待更高。', cursor, true);
    this.text(body, '类型', 0, cursor, inner, 24, 15, colors.ink, true);
    cursor += 30;
    for (const [key, type] of Object.entries(core.TYPES) as any) {
      const detail = type.audience + ' · ' + core.audienceFocus(key) + '\n工作量 ' + (type.work * core.SCALES[this.draft.scale].work).toFixed(0) + ' · ' + content.price(type.price * core.SCALES[this.draft.scale].price);
      cursor += this.choice(body, cursor, type.name, detail, () => { this.draft.type = key; this.render(); }, { highlight: this.draft.type === key, tag: this.draft.type === key ? '已选' : '', tagColor: colors.green, disabled: !!this.draft.sequel && this.draft.type !== key }) + 8;
    }
    this.anchors.set('project-form', this.box(body, 'FormAnchor', 0, 0, inner, cursor - 8));
    cursor += 4;
    this.text(body, '体量', 0, cursor, inner, 24, 15, colors.ink, true);
    cursor += 30;
    core.SCALES.forEach((scale, index) => {
      const cell = (inner - 16) / 3;
      const open = core.scaleOpen(state, index);
      this.button(body, scale.name, index * (cell + 8), cursor, cell, 42, () => { this.draft.scale = index; this.render(); }, this.draft.scale === index, !open, !open ? 'Lock' : undefined);
    });
    cursor += 54;
    if (!core.scaleOpen(state, 1) || !core.scaleOpen(state, 2)) cursor += this.paragraph(body, '中型：首作发售后开放；大型：搬进正式办公室后开放。', cursor, true);
    cursor += this.paragraph(body, content.planPreview(state, this.draft), cursor, true, 0, inner, 13);
    this.button(body, '确认立项', 0, cursor, inner, 48, () => this.dispatch('form-submit'), true, !this.draft.type || !core.scaleOpen(state, this.draft.scale));
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
      case 'toggle': {
        this.text(parent, block.text, 0, y, width - 72, 36, 14, colors.ink, true);
        const toggle = this.box(parent, block.text + 'Switch', width - 56, y + 3, 56, 30, block.value ? colors.green : colors.line, 15);
        this.box(toggle, 'Thumb', block.value ? 28 : 4, 4, 24, 22, colors.paper, 11);
        // Keep the block's own payload (which employee, which setting) instead of dropping it.
        this.clickable(toggle, () => this.dispatch(block.action, { ...(block.data || {}), enabled: !block.value, value: !block.value }));
        return y + 48;
      }
      case 'text': return y + this.paragraph(parent, block.text, y, block.muted, 0, width, block.muted ? 13 : 14);
      case 'foot':
        this.text(parent, block.text, 0, y + 10, width, 18, 11, colors.muted).horizontalAlign = HorizontalTextAlignment.CENTER;
        return y + 34;
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
          this.text(parent, value, index * cell, y + 18, cell - 6, 28, 17, index === block.items.length - 1 && block.tone !== 'plain' ? (block.tone === 'up' ? colors.green : colors.danger) : colors.ink, true);
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
        // Wide menus used to stack every action as a full-width row, pushing real content far below
        // the fold. Blocks can now ask for two or three compact columns (roles, save actions).
        const columns = Math.max(1, Math.min(3, Number(block.columns) || 1, block.items.length));
        const gap = 8;
        const cell = (width - (columns - 1) * gap) / columns;
        block.items.forEach((item: any, index: number) => {
          const column = index % columns;
          const line = Math.floor(index / columns);
          const left = column * (cell + gap);
          const row = y + line * 56;
          this.button(parent, item.text, left, row, cell - (item.help ? 44 : 0), 46, () => this.dispatch(item.action, item.data), true, !!item.disabled, item.icon, item.anchor);
          if (item.help) this.button(parent, '', left + cell - 38, row + 4, 38, 38, () => {
            this.helpKey = this.helpKey === item.helpKey ? '' : item.helpKey;
            this.render();
          }, false, false, 'CircleHelp', 'hire-help');
        });
        const rows = Math.ceil(block.items.length / columns);
        y += rows * 56;
        for (const item of block.items) if (item.help && this.helpKey === item.helpKey) y += this.paragraph(parent, item.help, y, true, 0, width, 13);
        if (block.anchor) this.anchors.set(block.anchor, this.box(parent, 'GroupAnchor', 0, start, width, y - start - 10));
        return y + 4;
      }
      case 'segments': {
        this.text(parent, block.title, 0, y, width, 24, 13, colors.ink, true);
        y += 28;
        const cell = (width - (block.items.length - 1) * 8) / block.items.length;
        block.items.forEach((item: any, index: number) => this.button(parent, item.text, index * (cell + 8), y, cell, 42, () => this.dispatch(item.action, item.data), !!item.active, false, undefined, item.anchor));
        return y + 54;
      }
      case 'choices': {
        const start = y;
        // Event choices carry their id only; hand it to the dispatcher so the decision has something to resolve.
        for (const item of block.items) y += this.choice(parent, y, item.text, item.detail, () => this.dispatch(item.action, item.data || { choice: item.id }), { tag: item.recommended ? '推荐' : '', highlight: item.recommended, disabled: item.disabled, anchor: item.anchor }) + 10;
        if (block.anchor) this.anchors.set(block.anchor, this.box(parent, 'GroupAnchor', 0, start, width, y - start - 10));
        return y + 4;
      }
      case 'tabs': {
        const columns = Math.min(3, block.items.length);
        const cell = (width - (columns - 1) * 6) / columns;
        block.items.forEach((item: any, index: number) => this.button(parent, item.text, (index % columns) * (cell + 6), y + Math.floor(index / columns) * 44, cell, 38, () => { this.routes[this.routes.length - 1] = item.route; this.helpKey = ''; this.render(); }, item.active, !!item.locked, item.locked ? 'Lock' : undefined));
        return y + Math.ceil(block.items.length / columns) * 44 + 6;
      }
      case 'card': {
        const start = y;
        this.text(parent, block.title, 0, y, width, 26, 16, colors.ink, true);
        y += 30;
        y += this.paragraph(parent, block.text, y, true, 0, width, 13);
        const button = block.button;
        this.button(parent, button.text, 0, y, width, 44, () => this.dispatch(button.action, button.data), true, !!button.disabled, undefined, button.anchor);
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
          const tags = [person.fame ? '行业名人' : '', ...person.tags.map((tag: any) => core.ABILITY_TAGS[tag.key]?.name || core.PERSONALITY_TAGS[tag.key]?.name)].filter(Boolean);
          const home = (core.ROLES[person.role].home || []).filter((key: string) => core.WORK_KEYS.includes(key));
          const homeAbilities = Array.from(new Set(home.map((key: string) => core.WORKS.find(work => work.key === key)?.ability).filter(Boolean)));
          const bestAbility = core.ABILITY_KEYS.reduce((best: any, key: string) => person.abilities[key] > person.abilities[best] ? key : best, core.ABILITY_KEYS[0]);
          const homeText = homeAbilities.map((key: string) => core.ABILITIES.find(ability => ability.key === key)?.name + ' ' + person.abilities[key]).join(' / ');
          const bestText = core.ABILITIES.find(ability => ability.key === bestAbility)?.name + ' ' + person.abilities[bestAbility];
          const detail = `速度 ${person.speed} · 月薪 ${content.money(person.wage)}\n本行：${homeText}\n最高：${bestText}\n${tags.join(' · ')}`;
          y += this.choice(parent, y, (person.fame ? '★ ' : '') + person.name, detail, () => this.openMenu('candidate', person.id), { tag: person.hired ? '已录用' : person.fame ? '名人' : '', tagColor: person.fame ? colors.gold : colors.green, disabled: person.hired, anchor: 'candidate-' + index }) + 10;
        });
        this.anchors.set('candidates', this.box(parent, 'CandidatesAnchor', 0, start, width, y - start - 10));
        return y;
      }
      case 'staff':
        if (!this.state.staff.length) return y + this.paragraph(parent, '还没有同事，先发布一份招聘。', y, true);
        for (const person of this.state.staff) {
          // Tags stay on the card: they are how the player ties a later slowdown to overtime.
          const tags = [...person.stressTags.map((key: string) => core.STRESS_TAGS[key].name), ...person.tags.map((tag: any) => core.ABILITY_TAGS[tag.key]?.name || core.PERSONALITY_TAGS[tag.key]?.name)];
          const detail = `速度 ${person.speed} · 月薪 ${content.money(person.wage)}${person.leaveUntil > this.state.day ? ' · 休假中' : ''}${tags.length ? '\n' + tags.join(' · ') : ''}`;
          const stress = person.stressTags.length > 0;
          y += this.choice(parent, y, person.name + ' · ' + core.ROLES[person.role].name, detail, () => this.openMenu('person', person.id), { tag: person.stressTags.includes('leaving') ? '想走' : stress ? '疲惫' : '', tagColor: colors.amber }) + 10;
        }
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
          y += this.choice(parent, y, '《' + book.name + '》', `${content.number(book.units)} 份 · 回款 ${content.money(book.received)} · 评价 ${book.reviewScore.toFixed(1)}\n${this.state.day - book.released < 7 ? '首周新品 · ' : ''}${book.rank ? '销量榜第 ' + book.rank + ' 名' : '未上榜'}`, () => this.openMenu('book', book.id), { tag: balance >= 0 ? '已回本' : '未回本', tagColor: balance >= 0 ? colors.green : colors.muted, anchor: 'book-' + index }) + 10;
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
      case 'radar': return y + this.radar(parent, y, block.metrics, block.genre, core.activeProject(this.state, block.projectId)) + 12;
      case 'dimensions': {
        // Each dimension shows its remaining person-days and estimated finish; the slowest staffed one
        // is the bottleneck, and dimensions nobody works on are called out instead of pencilled in.
        for (const item of block.items) {
          const dimension = core.DIMENSIONS.find(entry => entry.key === item.key);
          const idle = item.key !== 'stability' && item.remaining > 0.0001 && item.days === null;
          const slow = item.key === block.bottleneck;
          const row = this.box(parent, 'Dim', 0, y, width, 46, slow ? '#fff8e6' : idle ? '#f4f1ea' : colors.paper, 8);
          this.text(row, dimension?.name || item.key, 12, 4, width - 150, 18, 13, colors.ink, true);
          this.text(row, item.remaining > 0 ? item.remaining.toFixed(0) + ' 人日' : '已完成', width - 140, 4, 128, 18, 12, item.remaining > 0 ? colors.muted : colors.green).horizontalAlign = HorizontalTextAlignment.RIGHT;
          const note = item.days === null ? (item.remaining > 0.0001 ? (item.key === 'stability' ? '未安排测试 · 漏掉的缺陷留给玩家' : '无人负责 · 点开分工') : '') : '预计 ' + item.days + ' 天';
          this.text(row, note, 12, 24, width - 180, 16, 11, idle ? colors.danger : slow ? colors.amber : colors.muted);
          if (slow) this.text(row, '瓶颈', width - 72, 24, 60, 16, 11, colors.amber, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
          else if (idle) this.text(row, '缺人', width - 72, 24, 60, 16, 11, colors.danger, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
          // Tap a row to open its detail page (score, who's on it, and a shortcut to assign).
          this.clickable(row, () => this.openMenu('dimension', block.projectId, false, item.key));
          y += 50;
        }
        return y + 4;
      }
      case 'person-assign': {
        const flags = [...(block.stress || []), ...(block.fame ? ['磨合期'] : [])];
        const columns = Math.min(3, Math.max(1, block.works.length));
        const rows = Math.ceil(block.works.length / columns);
        const detailHeight = Math.max(20, Math.ceil(block.detail.length / 25) * 16);
        const header = 30 + detailHeight + (flags.length ? 20 : 0);
        // Extra row at the bottom: the two shortcuts. Without them a player who wants a plain
        // "do everything" or "back to your own trade" has to tap seven boxes one at a time.
        const shortcut = 44;
        const height = header + rows * 50 + shortcut;
        const card = this.box(parent, 'Assign', 0, y, width, height, colors.paper, 10);
        // Tapping the name row opens that person's own page; the work boxes below are the toggles.
        const titleRow = this.box(card, 'AssignTitle', 0, 0, width, 26);
        this.text(card, block.title, 12, 8, width - 128, 20, 13, colors.ink, true);
        if (block.status) this.text(card, block.status, width - 116, 8, 104, 20, 10, colors.amber).horizontalAlign = HorizontalTextAlignment.RIGHT;
        this.clickable(titleRow, () => this.openMenu('person', block.personId));
        this.text(card, block.detail, 12, 28, width - 24, detailHeight, 11, colors.muted);
        if (flags.length) this.text(card, '产出下降：' + flags.join(' · '), 12, 28 + detailHeight, width - 24, 16, 10, colors.danger);
        const cell = (width - 24 - (columns - 1) * 8) / columns;
        block.works.forEach((work: any, index: number) => {
          const on = work.on;
          const column = index % columns;
          const line = Math.floor(index / columns);
          const node = this.box(card, 'Work-' + work.key, 12 + column * (cell + 8), header + line * 50, cell, 42, on ? colors.green : colors.soft, 8);
          const shortName = work.key === 'discover' ? '找缺陷' : work.key === 'repair' ? '修缺陷' : work.name;
          this.text(node, shortName, 2, 2, cell - 4, 22, 12, on ? colors.paper : colors.green, true).horizontalAlign = HorizontalTextAlignment.CENTER;
          this.text(node, '能力 ' + (work.ability ?? '—'), 2, 23, cell - 4, 16, 10, on ? '#e8f3ed' : colors.muted).horizontalAlign = HorizontalTextAlignment.CENTER;
          this.clickable(node, () => {
            // 界面只报“谁、哪个项目、点了哪项”，由 core 按存档取反并保证不为空。
            // 旧版在这里自己拼名单：拼出空表时三块工作会一起灭掉，之后再点也写不进正确的项目。
            const route = this.routes[this.routes.length - 1] || {};
            const fallback = core.projectOpen(this.state)[0];
            const projectId = block.projectId || route.id || (fallback ? fallback.id : '');
            const person = this.state.staff.find((item: any) => item.id === block.personId);
            if (!projectId || !person) { this.notify('这个项目或成员已经不存在了，请返回重进。'); return; }
            const name = core.WORKS.find(entry => entry.key === work.key)?.name || work.key;
            // 用 assignedWorks 而不是 personWorks 算 before/after：personWorks 受 belongsTo 门控，
            // 而真正写状态的 toggleAssign 用的是 assignedWorks。两者不一致时，会把“调入本项目”误报成“已退出”，
            // 且跨项目看人时按钮全灰。统一来源后提示才正确，点击也能把人真正调过来。
            const project = core.activeProject(this.state, projectId) || { id: projectId };
            const before = core.assignedWorks(project, person);
            const next = core.toggleAssign(this.state, projectId, person.id, work.key);
            const after = core.assignedWorks(core.activeProject(next, projectId) || { id: projectId }, person);
            this.apply(next);
            const returnedHome = before.length === 1 && before.includes(work.key) && !after.includes(work.key);
            if (returnedHome) this.notify(person.name + '：每人至少做一项，已回到本行。');
            else this.notify(person.name + (after.includes(work.key) ? ' 已加入「' + name + '」' : ' 已退出「' + name + '」'));
          });
        });
        // The lesson is "everyone picks their work", so the ring has to hug the whole grid. Anchoring
        // the first cell made it look like only 创意 could be chosen.
        this.anchors.set('person-assign-' + block.index, this.box(card, 'AssignGrid', 8, header - 4, width - 16, rows * 50 + 4));
        const person = this.state.staff.find((item: any) => item.id === block.personId);
        const homeKey = person ? ((core.ROLES[person.role].home || []).find((key: string) => core.WORK_KEYS.includes(key)) || 'discover') : '';
        const half = (width - 32) / 2;
        this.button(card, '只做本行', 12, header + rows * 50 + 2, half, 36, () => {
          const route = this.routes[this.routes.length - 1] || {};
          const project = core.activeProject(this.state, route.id) || core.projectOpen(this.state)[0];
          const target = this.state.staff.find((item: any) => item.id === block.personId);
          if (!project || !target || !homeKey) { this.notify('这个项目或成员已经不存在了，请返回重进。'); return; }
          this.apply(core.assign(this.state, project.id, target.id, [homeKey]));
          this.notify(target.name + '：只做本行。');
        }, false);
        this.button(card, '全部都做', 12 + half + 8, header + rows * 50 + 2, half, 36, () => {
          const route = this.routes[this.routes.length - 1] || {};
          const project = core.activeProject(this.state, route.id) || core.projectOpen(this.state)[0];
          const target = this.state.staff.find((item: any) => item.id === block.personId);
          if (!project || !target) { this.notify('这个项目或成员已经不存在了，请返回重进。'); return; }
          this.apply(core.assign(this.state, project.id, target.id, [...core.WORK_KEYS]));
          this.notify(target.name + '：所有工作都接手。');
        }, false);
        return y + height + 12;
      }
      default: return y;
    }
  }

  private cover(parent: Node, y: number, book: any) {
    const width = this.width - 40;
    const { node, pen } = this.canvasNode(parent, 'Cover', 0, y, width, 150);
    drawWork(pen, width, 150, book.type, 1, book.metrics.dimensions.picture, book.released);
    pen.rect(0, 100, width, 50, colors.night, 0, 170);
    this.text(node, '《' + book.name + '》', 14, 104, width - 28, 26, 19, '#ffffff', true);
    this.text(node, core.TYPES[book.type].name + ' · ' + core.SCALES[book.scale].name + ' · ' + this.state.company, 14, 128, width - 28, 18, 11, '#d7e2d9');
    return 150;
  }

  private chart(parent: Node, y: number, book: any) {
    const width = this.width - 40;
    const origin = y;
    const { weekly, cumulative, cost } = content.salesHistory(book);
    const flags: number[] = Array.isArray(book.saleFlags) ? book.saleFlags : [];
    const selected = this.chartSelection?.id === book.id ? Math.max(0, Math.min(weekly.length - 1, this.chartSelection.index)) : weekly.length - 1;
    const start = Math.floor(selected / 12) * 12;
    const count = Math.min(12, weekly.length - start);
    this.text(parent, '收入历史', 0, y, width - 90, 34, 16, colors.ink, true);
    const changePage = (offset: number) => {
      this.chartSelection = { id: book.id, index: Math.max(0, Math.min(weekly.length - 1, selected + offset)) };
      this.render();
    };
    this.button(parent, '', width - 78, y, 34, 34, () => changePage(-12), false, start === 0, 'ArrowLeft', 'chart-previous');
    this.button(parent, '', width - 34, y, 34, 34, () => changePage(12), false, start + count >= weekly.length, 'ChevronRight', 'chart-next');
    y += 42;
    this.text(parent, `第 ${start + 1}～${start + count} 周`, 0, y, width, 20, 12, colors.muted);
    y += 28;
    const left = 44;
    const right = width - 12;
    const slot = (right - left) / count;
    const plot = (title: string, values: number[], accumulated: boolean) => {
      this.text(parent, title, 0, y, width, 22, 14, colors.ink, true);
      y += 28;
      const height = accumulated ? 174 : 154;
      const top = 32;
      const bottom = height - 28;
      const peak = Math.max(...values.slice(start, start + count), accumulated ? cost : 0, 0.01) * 1.12;
      const valueY = (value: number) => bottom - (bottom - top) * value / peak;
      const { node, pen } = this.canvasNode(parent, accumulated ? 'CumulativeIncome' : 'WeeklyIncome', 0, y, width, height);
      pen.rect(left + (selected - start) * slot, top, slot, bottom - top, colors.soft);
      this.text(node, '万元', 0, 4, left - 6, 18, 10, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
      for (const fraction of [0, 0.5, 1]) {
        const value = peak * fraction;
        const axisY = valueY(value);
        pen.line(left, axisY, right, axisY, colors.line, 1);
        this.text(node, value.toFixed(value >= 100 ? 0 : 2), 0, axisY - 8, left - 6, 16, 10, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
      }
      for (let index = start; index < start + count; index++) {
        const center = left + (index - start + 0.5) * slot;
        const pointY = valueY(values[index]);
        if (accumulated) {
          const previousX = index === start ? left : center - slot;
          const previousValue = index === 0 ? 0 : values[index - 1];
          pen.line(previousX, valueY(previousValue), center, pointY, colors.green, 2);
          pen.circle(center, pointY, index === selected ? 4 : 2, colors.green);
        } else if (values[index] > 0) {
          pen.rect(center - slot * 0.3, pointY, slot * 0.6, bottom - pointY, flags[index] ? colors.amber : colors.green, 2);
        }
      }
      if (accumulated) {
        const costY = valueY(cost);
        for (let cursor = left; cursor < right; cursor += 12) pen.line(cursor, costY, Math.min(cursor + 7, right), costY, colors.amber, 1.5);
        this.text(node, '当前累计投入 ' + content.money(cost), left, 4, right - left, 18, 11, colors.amber);
      } else {
        this.text(node, '原价周', left, 4, 70, 18, 11, colors.green);
        this.text(node, '促销周', left + 78, 4, 70, 18, 11, colors.amber);
      }
      this.text(node, '第 ' + (start + 1) + ' 周', left, height - 22, 80, 18, 10, colors.muted);
      if (count > 1) this.text(node, '第 ' + (start + count) + ' 周', right - 80, height - 22, 80, 18, 10, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
      let touchStart: Vec2 | null = null;
      node.on(Node.EventType.TOUCH_START, (event: EventTouch) => { touchStart = event.getUILocation().clone(); });
      node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
        const location = event.getUILocation();
        if (!touchStart || Math.hypot(location.x - touchStart.x, location.y - touchStart.y) > 12) return;
        const local = node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));
        if (local.x < left || local.x > right || -local.y < top || -local.y > bottom) return;
        this.chartSelection = { id: book.id, index: start + Math.min(count - 1, Math.floor((local.x - left) / slot)) };
        this.render();
      });
      node.on(Node.EventType.TOUCH_CANCEL, () => { touchStart = null; });
      y += height + 16;
    };
    plot('每周收入', weekly, false);
    plot('累计收入与当前成本', cumulative, true);
    const currentWeek = Math.floor((this.state.day - book.released) / 7);
    this.text(parent, `第 ${selected + 1} 周${selected === currentWeek ? ' · 本周未结束' : ''}${flags[selected] ? ' · 有促销' : ''}`, 0, y, width, 22, 13, colors.ink, true);
    y += 28;
    y += this.paragraph(parent, `当周收入 ${content.money(weekly[selected])} · 累计 ${content.money(cumulative[selected])}`, y, false, 0, width, 13);
    const balance = cumulative[selected] - cost;
    y += this.paragraph(parent, (balance >= 0 ? '超过当前投入 ' : '距覆盖当前投入还差 ') + content.money(Math.abs(balance)), y, true, 0, width, 12);
    const saleWeeks = flags.filter(flag => flag).length;
    const fullWeeks = weekly.length - saleWeeks;
    const saleTotal = weekly.reduce((total: number, value: number, index: number) => total + (flags[index] ? value : 0), 0);
    const fullTotal = weekly.reduce((total: number, value: number, index: number) => total + (flags[index] ? 0 : value), 0);
    y += this.paragraph(parent, '促销周平均 ' + (saleWeeks ? content.money(saleTotal / saleWeeks) : '暂无') + ' · 原价周平均 ' + (fullWeeks ? content.money(fullTotal / fullWeeks) : '暂无'), y, true, 0, width, 12);
    return y - origin;
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
    this.image(banner, 'icons/' + (({ breakeven: 'Trophy', office: 'Building2', record: 'Star', units: 'TrendingUp', settle: 'Coins' } as any)[item.kind] || 'Sparkles'), 16, 24, 22, 22, '#ffffff');
    this.text(banner, item.title, 50, 12, width - 64, 24, 16, '#ffffff', true);
    this.text(banner, item.text, 50, 36, width - 64, 20, 12, '#fff3d6');
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
    if (next?.ack) return;
    this.guidePaused = false;
    if (!this.routes.length && !this.inputRequest && !this.state.event && !this.state.over) {
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
    // In a menu the tip has nothing to forward to: its anchor is usually a whole group of rows, not a
    // button, so an overlay would swallow the press and the real buttons underneath would go dead.
    // Instead the tip rides on the click: whatever the player presses counts as having read it.
    if (route && (step.ack || step.tap)) this.menuAck = step.ack || step.tap;
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
    // Every tip dims whatever it is not pointing at, menus included: a highlight only reads as a
    // highlight when the rest of the screen steps back.
    const dim = (x: number, y: number, w: number, h: number) => {
      if (w > 0 && h > 0) this.box(this.stage, 'Dim', x, y, w, h, colors.night, 0, 120);
    };
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
      // The tap forwarder exists for the main screen only: there the highlight sits on a navigation
      // button and the tip has to hand the press over. Menus are already interactive, so the rows keep
      // the press themselves — no overlay, no dead buttons.
      if (step.tap && !this.confirmSkip && !this.routes.length && target?.getComponent(Button)) {
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

  private openMenu(menu: string, id?: string, critical = false, dim?: string) {
    this.helpKey = '';
    if (!this.routes.length) { this.resumeAfterMenu = this.playing || this.guidePaused; this.guidePaused = false; this.playing = false; this.elapsed = 0; }
    if (critical || menu === 'event' || menu === 'setup') this.resumeAfterMenu = false;
    if (critical) this.routes = [];
    if (menu === 'new-project') this.draft = { name: '', type: '', scale: 0 };
    if (menu === 'book') this.markReview(id);
    this.routes.push({ menu, id, dim });
    this.render();
  }

  private markReview(id?: string) {
    const book = this.state.catalog.find((item: any) => item.id === id);
    if (book?.tutorial && !this.state.tutorial.seen.review) { this.state = core.markSeen(this.state, 'review'); this.save(); }
  }

  private closeMenu() {
    if (!this.state.company) return;
    if (this.state.event) {
      // 只有一个选项的事件（发售、月度结算这类）点 ✕ 就该等于收下结果。原来一律弹回事件页，
      // 右上角的关闭看起来完全没反应，玩家只能从页面里的按钮退出。
      const choices = this.state.event.choices || [];
      if (choices.length === 1) { this.decide(choices[0].id); return; }
      this.routes = [{ menu: 'event' }];
      this.render();
      return;
    }
    this.routes = [];
    this.inputRequest = null;
    this.playing = this.resumeAfterMenu && !this.state.over;
    this.resumeAfterMenu = false;
    this.elapsed = 0;
    this.render();
    this.celebrate();
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
    this.noticeFresh = true;
    this.unschedule(this.clearNotice);
    this.scheduleOnce(this.clearNotice, 2.5);
    this.render();
  }

  private decide(choice: string) {
    const event = this.state.event;
    this.apply(core.resolveStudioEvent(this.state, choice));
    if (this.state.event) return;
    this.routes = [];
    this.resumeAfterMenu = false;
    this.playing = core.projectOpen(this.state).length > 0 && event.id !== 'cash' && !this.state.over;
    this.elapsed = 0;
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
            this.guidePaused = false;
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
          if (this.state.staff.length === 1) { this.routes = []; this.render(); }
          break;
        }
        case 'dismiss': this.apply(core.dismiss(this.state, data.id)); this.routes = [{ menu: 'team' }]; this.render(); break;
        case 'leave': this.apply(core.takeLeave(this.state, data.id), '带薪休假已安排。'); break;
        case 'outing': this.apply(core.teamOuting(this.state, Number(data.days) || 2), '团建已安排，占用工作日。'); break;
        case 'overtime': this.apply(core.setOvertime(this.state, data.id, !!data.enabled)); break;
        case 'sound': this.apply(core.setSound(this.state, !!data.value)); break;
        case 'deadline': this.apply(core.setDeadline(this.state, data.id, Number(data.days)), '发售日期已公布。'); break;
        case 'exhibition': this.apply(core.enterExhibition(this.state, data.id), '展会已报名，继续完善会影响名次。'); break;
        case 'operate': this.apply(core.operateBook(this.state, data.id, data.kind), '更新已开始制作。'); break;
        case 'sale': this.apply(core.setSale(this.state, data.id, !!data.enabled, data.floor), data.enabled ? '已开启促销，系统会按余量决定打折时机。' : '已关闭促销，恢复原价销售。'); break;
        case 'sequel': {
          const book = this.state.catalog.find((item: any) => item.id === data.id);
          if (!book) throw new Error('原作不存在。');
          this.openMenu('new-project');
          this.draft = { name: (book.name + ' 2').slice(0, 24), type: book.type, scale: book.scale, sequel: book.id };
          this.render();
          break;
        }
        case 'buy-tool': this.apply(core.buyTool(this.state, data.key), '工具已购置，对应工作更快了。'); break;
        case 'outsource': this.apply(core.outsourceSound(this.state, data.id, Number(data.tier)), '声音已外包，相关评分项立即推进。'); break;
        case 'dlc': {
          const next = core.makeDLC(this.state, data.id);
          const project = next.projects[next.projects.length - 1];
          this.watching = project.id;
          this.routes = [{ menu: 'project', id: project.id }, { menu: 'assign', id: project.id }];
          this.apply(next, '资料片已作为新项目立项，请安排人手。');
          break;
        }
        case 'assign': this.apply(core.assign(this.state, data.id, data.person, data.works)); break;
        case 'priority': this.apply(core.setPriority(this.state, data.id, Number(data.priority))); break;
        case 'test': this.apply(core.testDemo(this.state, data.id, Number(data.count))); break;
        case 'promote': {
          const project = core.activeProject(this.state, data.id);
          const before = project ? project.followers : 0;
          const cost = Number(data.cost);
          this.apply(core.promote(this.state, data.id, cost));
          const after = core.activeProject(this.state, data.id);
          const index = core.PROMOTE_TIERS.indexOf(cost);
          this.floatAt(this.anchors.get('promote-' + index), '+' + content.number((after ? after.followers : 0) - before) + ' 人关注', colors.green);
          break;
        }
        case 'launch': this.apply(core.launchProject(this.state, data.id)); break;
        case 'decision': this.decide(data.choice); break;
        case 'review':
          this.apply(core.resolveStudioEvent(this.state, 'continue'));
          this.routes = [];
          this.openMenu('book', data.id);
          break;
        case 'move': this.apply(core.moveOffice(this.state)); this.closeMenu(); this.celebrate(); break;
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
        case 'restart-confirm':
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
