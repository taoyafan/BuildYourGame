import {
  _decorator, Component, Node, Canvas, Camera, Color, Layers, UITransform, Label,
  view, screen, ResolutionPolicy, Graphics, Sprite, SpriteFrame, resources, ScrollView,
  Mask, EditBox, Button, HorizontalTextAlignment, VerticalTextAlignment, Texture2D,
  game as engineGame, Game, tween, Tween, UIOpacity, Vec2, Vec3, BlockInputEvents, AudioClip, AudioSource, EventTouch
} from 'cc';
import * as core from './core/Studio';
import * as content from './core/Content';
import { Pen, drawRoom, drawDesk, drawAvatar, drawBrick, drawWork, seatLayout, roomProps, SKINS, HAIRS, HAIR_STYLES, FACES, GLASSES } from './ui/Art';
import { platform } from './Platform';

const { ccclass } = _decorator;
const colors = {
  bg: '#f3f6f2', paper: '#ffffff', ink: '#243c34', muted: '#76877d',
  green: '#1b6651', soft: '#e5eee7', line: '#d7e2d9', amber: '#a57024',
  blue: '#497899', danger: '#a7463c', pale: '#edf2ee', gold: '#e0a526', night: '#14231d'
};
const navigation = [
  ['project', '项目', 'FolderKanban'], ['team', '团队', 'Users'],
  ['market', '市场', 'ChartNoAxesCombined'], ['finance', '公司', 'Building2']
];
// A tip must bring its anchor into view from either direction. On the market page the promotion
// cards are far down the list, so the tip before the exhibition one leaves the page scrolled down;
// `current` is the restored offset at render time, `offset` the anchor's distance from the top.
export function guideScrollTarget(current: number, offset: number, size: number, view: number): number | null {
  const margin = 12;
  if (offset < current + margin) return Math.max(0, offset - 16);
  if (offset + size > current + view - margin) return Math.max(0, offset - view / 3);
  return null;
}
const tierColors = ['#2f7d63', '#3b6ea5', '#7b55b8', '#d39a1e', '#d39a1e'];
// One rarity ramp for tags and values: green → blue → purple → gold. Red is only for warnings.
const toneColors: any = {
  green: '#2f7d63', blue: '#3b6ea5', purple: '#7b55b8', gold: '#d39a1e', red: '#c8574f', muted: '#76877d', stress: '#3a403d'
};
// Grouped buttons always carry an icon; this picks one from the action when the menu gives none.
const actionIcons: any = {
  menu: 'ChevronRight', test: 'FlaskConical', exhibition: 'Award', recruit: 'UserPlus', hire: 'UserPlus',
  dismiss: 'UserMinus', outing: 'Plane', 'overtime-all': 'Moon', launch: 'Rocket', review: 'ChartNoAxesCombined',
  move: 'Building2', 'restart-confirm': 'RotateCcw', promote: 'Megaphone', mentor: 'GraduationCap',
  poach: 'Briefcase', sale: 'Coins', dlc: 'Gift', sequel: 'Sparkles',
  'new-slot': 'Sparkles', 'load-slot': 'Play', 'delete-slot': 'UserMinus'
};

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
  // Every playthrough lives in its own storage key; `slot` is the one currently being played.
  private slot = 1;
  private slotIndex: any = null;
  private notice = '';
  private noticeFresh = false;
  private scrollKey = '';
  // The offset this render restored, before the guide may scroll to its anchor. A freshly rebuilt
  // ScrollView has not laid out its boundaries yet, so getScrollOffset() right after clear() is not
  // a trustworthy "where was the page" answer; `keep` is the offset the player actually left behind.
  private scrollKeep = 0;
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
  // A forced tap inside a menu must be cleared by the highlighted control itself. Other menu buttons
  // stay usable (no shield in menus), but pressing them cannot silently skip the lesson.
  private menuTapNodes = new Set<Node>();
  private guideAnchor = '';
  private helpKey = '';
  private overScreenShown = false;
  private scrollBottom = false;
  private chartSelection: { id: string; index: number } | null = null;
  private scatterPick = '';
  private officePage = 0;
  private officeSwiped = false;
  private brickTip: any = null;
  private activeTouches = new Set<number>();
  private renderPending = false;
  // A text field has the focus. Every render() destroys and rebuilds the whole screen, which also
  // destroys the EditBox and closes the soft keyboard. On some devices a deferred redraw lands just
  // as the keyboard opens, so the field looks like it vanishes before the player can type.
  private editing = false;
  // Wall-clock gap since the last daily redraw, so the fastest speed does not rebuild the whole screen every frame.
  private tickGap = 0;
  // Menus used to give every card, chip, divider and button its own Graphics component. One shared
  // canvas per menu body draws all those static shapes in one mesh instead, which is what made the
  // team and achievement pages slow to open. `ax`/`ay` live on each node as body-relative coords.
  private shapePen: Pen | null = null;
  private shapeRoot: Node | null = null;
  // Wrapped text height only depends on the string, the width and the font size. Measuring it forces
  // a synchronous Label layout, so keep the result across renders instead of repeating it.
  private textHeights = new Map<string, number>();
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
    // Leaving the app always closes the soft keyboard; do not keep the input guard armed.
    this.editing = false;
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
    // If the player is typing, let editing-did-ended decide when to apply the deferred redraw.
    if (!this.activeTouches.size && this.renderPending && !this.editing) this.scheduleOnce(() => this.render(), 0);
  }

  update(delta: number) {
    // Real time with the game open, for the founder's dream; not scaled by game speed.
    if (this.state?.company) this.state.playSeconds = (this.state.playSeconds || 0) + Math.min(delta, 1);
    if (this.activeTouches.size || !this.playing || this.routes.length || this.state?.event || this.state?.over) return;
    const frame = Math.min(delta, 0.25);
    this.elapsed += frame * this.speed;
    this.tickGap += frame;
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
        this.celebrations.push({ kind: 'settle', title: core.monthText(report.month) + '结算', text: `收入 ${content.money(report.income)}，支出 ${content.money(report.expense)}，净 ${report.net >= 0 ? '+' : ''}${content.money(report.net)}`, amount: 0 });
      }
      if (changed) {
        this.save();
        // Even at 4x a day can tick on most frames, and each render rebuilds the whole main screen.
        // State still advances every day; only the redraw is capped. Events, game over and stopping
        // must appear at once.
        if (this.tickGap >= 0.3 || !this.playing || this.state.event || this.state.over || this.routes.length) {
          this.tickGap = 0;
          this.render();
        }
        this.celebrate();
      }
      if (changed && report && report.month !== settledMonth) this.floatAt(this.anchors.get('finance'), (report.net >= 0 ? '+' : '') + content.money(report.net), report.net >= 0 ? colors.green : colors.danger, 0.13);
    } catch (error) {
      this.playing = false;
      this.notify(error.message);
    }
  }

  private load() {
    let index: any = null;
    try {
      const rawIndex = platform.read(core.SAVE_INDEX_KEY);
      if (rawIndex) index = core.normalizeSaveIndex(JSON.parse(rawIndex));
    } catch { index = null; }
    if (!index) {
      // Upgrading from the single-save build: move the old save into slot 1 and keep a backup copy,
      // so nobody loses a company just because the save format grew slots.
      let legacy: string | null = null;
      try { legacy = platform.read(core.SAVE_LEGACY_KEY); } catch { /* storage unreadable */ }
      index = { active: 1, nextId: 2, slots: [1] };
      try {
        // An interrupted migration can leave slot 1 written but the index missing. Never overwrite an
        // existing slot in that case, or a second launch would erase the very progress we moved.
        const existing = platform.read(core.SAVE_SLOT_KEY(1));
        if (legacy && !existing) {
          platform.write(legacy, core.SAVE_SLOT_KEY(1));
          platform.write(legacy, core.SAVE_LEGACY_BACKUP_KEY);
          platform.remove(core.SAVE_LEGACY_KEY);
        } else if (!legacy && !existing) {
          platform.write(JSON.stringify(core.createStudio()), core.SAVE_SLOT_KEY(1));
        }
        platform.write(JSON.stringify(index), core.SAVE_INDEX_KEY);
      } catch { this.storageIssue = '设备存储不可用，进度可能无法保存。'; }
    }
    this.slotIndex = index;
    this.slot = index.active;
    let outdated = false;
    try {
      const raw = platform.read(core.SAVE_SLOT_KEY(this.slot));
      if (raw) {
        const saved = JSON.parse(raw);
        outdated = typeof saved?.version === 'number' && saved.version < 7;
        return core.restoreStudio(saved);
      }
    } catch {
      // Keep the unreadable copy aside, then start fresh. The warning is shown once and can be dismissed;
      // it must not come back on every render, or the player can never get rid of it.
      try {
        const raw = platform.read(core.SAVE_SLOT_KEY(this.slot));
        if (raw) platform.write(raw, core.SAVE_RECOVERY_KEY);
      } catch { this.storageIssue = '设备存储不可用，进度可能无法保存。'; }
      this.storageIssue ||= outdated ? '0.2.0 改为模块化玩法，旧存档无法继续，已另存为恢复副本，新开了一局。' : '这份存档无法读取，已另存为恢复副本，新开了一局。';
    }
    return core.createStudio();
  }

  private save() {
    try { platform.write(JSON.stringify(this.state), core.SAVE_SLOT_KEY(this.slot)); }
    catch { this.storageIssue = '保存失败，请检查设备存储空间。'; }
  }

  private writeSlotIndex() {
    try { platform.write(JSON.stringify(this.slotIndex), core.SAVE_INDEX_KEY); }
    catch { this.storageIssue = '存档列表保存失败，请检查设备存储空间。'; }
  }

  private slotSummaries() {
    return (this.slotIndex?.slots || []).map((id: number, index: number) => {
      let raw: string | null = null;
      try { raw = platform.read(core.SAVE_SLOT_KEY(id)); } catch { /* unreadable slot */ }
      return core.slotSummary(raw, id, index + 1, id === this.slot);
    });
  }

  // Switching saves changes every id on screen, so drop all per-playthrough view state first.
  private enterSlot(next: any, message: string) {
    this.playing = false;
    this.resumeAfterMenu = false;
    this.guidePaused = false;
    this.elapsed = 0;
    this.celebrations = [];
    this.shown = null;
    this.watching = null;
    this.draft = { name: '', type: '', scale: 0 };
    this.notice = '';
    this.officePage = 0;
    this.chartSelection = null;
    this.scrollKey = '';
    this.menuAck = null;
    this.overScreenShown = false;
    this.scrollBottom = false;
    this.routes = [];
    this.state = this.drain(next);
    this.save();
    if (!next.company) this.routes = [{ menu: 'setup' }];
    else if (next.event) this.routes = [{ menu: 'event' }];
    this.setNotice(message);
    this.render();
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
    const ax = ((parent as any).ax ?? 0) + x;
    const ay = ((parent as any).ay ?? 0) + y;
    (node as any).ax = ax;
    (node as any).ay = ay;
    const batched = !!this.shapePen && (parent === this.shapeRoot || !!(parent as any).inBatch);
    (node as any).inBatch = batched;
    if (fill) {
      if (batched) this.shapePen!.rect(ax, ay, width, height, fill, radius, alpha);
      else new Pen(node.addComponent(Graphics)).rect(0, 0, width, height, fill, radius, alpha);
    }
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
    const key = `${width}|${size}|${value}`;
    let measured = this.textHeights.get(key);
    if (measured === undefined) {
      // A new string has to be laid out now because everything below it is positioned from its height.
      label.updateRenderData(true);
      measured = label.node.getComponent(UITransform).height;
      if (this.textHeights.size > 1500) this.textHeights.clear();
      this.textHeights.set(key, measured);
    } else {
      // Already measured on a previous render: let the normal render pass build the label's render
      // data, and just reserve the known height so the rest of the page keeps its layout.
      label.node.getComponent(UITransform).setContentSize(width, measured);
    }
    return Math.max(size + 12, measured) + 10;
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
        // Acting on a menu while its explanation is open counts as having read it. For a forced tap,
        // only the highlighted group counts; every other control still works but leaves the tip up.
        const tapAllowed = !this.menuTapNodes.size || this.menuTapNodes.has(node);
        if (this.menuAck && node.parent?.name !== 'Bubble' && tapAllowed) { this.state = core.markSeen(this.state, this.menuAck); this.menuAck = null; this.save(); }
        callback();
      }
      catch (error) { this.notify(error.message || '本次操作未执行。'); }
    });
    return node;
  }

  private button(parent: Node, title: string, x: number, y: number, width: number, height: number, callback: () => void, primary = false, disabled = false, icon?: string, anchor?: string) {
    const node = this.box(parent, title, x, y, width, height, disabled ? colors.pale : primary ? colors.green : colors.soft, 8);
    this.clickable(node, callback, !disabled);
    // Grouped buttons all carry an icon so a row never mixes iconed and plain buttons; the icon sits
    // before the centred title.
    if (icon && !title) this.navIcon(node, icon, (width - 20) / 2, (height - 20) / 2, 20, disabled ? colors.muted : primary ? '#ffffff' : colors.green);
    if (title) {
      const iconSize = icon ? 16 : 0;
      const textWidth = Math.min(width - 12 - iconSize, title.length * 14 + 4);
      const start = (width - textWidth - (icon ? iconSize + 6 : 0)) / 2;
      if (icon) this.navIcon(node, icon, Math.max(6, start), (height - iconSize) / 2, iconSize, disabled ? colors.muted : primary ? '#ffffff' : colors.green);
      const label = this.text(node, title, icon ? Math.max(6, start) + iconSize + 6 : 0, 0, icon ? Math.min(width - Math.max(6, start) - iconSize - 10, textWidth) : width, height, 14, disabled ? colors.muted : primary ? colors.paper : colors.green, primary);
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
    // In a menu all card art goes onto one shared canvas. Keep the drawing order: card background
    // first, then the tag / chips / avatar / radar that sit on top of it.
    const batched = !!this.shapePen && (parent === this.shapeRoot || !!(parent as any).inBatch);
    const pen = batched ? this.shapePen! : new Pen(node.addComponent(Graphics));
    const ox = batched ? (node as any).ax : 0;
    const oy = batched ? (node as any).ay : 0;
    const shapes: (() => void)[] = [];
    let cursor = 12;
    if (options.icon) this.image(node, 'icons/' + options.icon, 14, 14, 20, 20, options.disabled ? colors.muted : colors.green);
    if (options.avatar) {
      if (batched) shapes.push(() => drawAvatar(pen, ox + 25, oy + 25, 12, options.avatar, options.avatarLook));
      else drawAvatar(this.canvasNode(node, 'Avatar', 10, 10, 30, 30).pen, 15, 15, 12, options.avatar, options.avatarLook);
    }
    if (options.brick) drawBrick(this.canvasNode(node, 'Brick', 8, 10, 30, 30).pen, 0, 0, 30, core.AXES[options.brick.axis].color, options.brick.glyph, 1, 'have');
    const left = options.icon || options.avatar || options.brick ? 44 : 14;
    // A person card carries a small ability radar on the right; the text column makes room for it.
    const side = options.radar ? 70 : 0;
    this.text(node, title, left, cursor, width - left - side - (options.tag ? 70 : 14), 22, 15, options.disabled ? colors.muted : colors.ink, true);
    if (options.tag) {
      const tagFill = options.tagColor || colors.gold;
      const tag = this.box(node, 'Tag', width - 62 - side, cursor + 1, 50, 20, batched ? undefined : tagFill, 10);
      if (batched) shapes.push(() => pen.rect((tag as any).ax, (tag as any).ay, 50, 20, tagFill, 10));
      this.text(tag, options.tag, 0, 0, 50, 20, 11, '#ffffff', true).horizontalAlign = HorizontalTextAlignment.CENTER;
    }
    cursor += 26;
    if (detail && options.compact) {
      this.text(node, detail, left, cursor - 2, width - left - 14 - side, 18, 12, colors.muted);
      cursor += 20;
    } else if (detail) cursor += this.paragraph(node, detail, cursor, true, left, width - left - 14 - side, 12) - 4;
    if (options.chips?.length) cursor = this.chips(node, options.chips, left, cursor, width - left - 14 - side, batched ? { pen, ox, oy, shapes } : undefined) + 4;
    if (options.radar) {
      cursor = Math.max(cursor, 74);
      if (batched) shapes.push(() => this.miniRadar(null, ox + width - side + 4, oy + 8, 60, options.radar, pen));
      else this.miniRadar(node, width - side + 4, 8, 60, options.radar);
    }
    const height = cursor + 8;
    node.getComponent(UITransform).setContentSize(width, height);
    // An irreversible, ready-to-go action gets a heavier gold frame and a stripe on its left edge,
    // so it reads as the one thing to notice at the bottom of a long page.
    const emphasis = !!options.emphasis && !options.disabled;
    pen.rect(ox, oy, width, height, emphasis ? '#fff1cf' : options.highlight ? '#fff8e6' : colors.paper, 10);
    pen.frame(ox, oy, width, height, emphasis || options.highlight ? colors.gold : colors.line, emphasis ? 3 : options.highlight ? 2 : 1, 10);
    shapes.forEach(draw => draw());
    if (emphasis) pen.rect(ox, oy, 5, height, colors.gold, 3);
    this.clickable(node, callback, !options.disabled);
    if (options.anchor) this.anchors.set(options.anchor, node);
    return height;
  }

  // Tag chips coloured by rarity (green → blue → purple → gold); anything harmful is dark grey with a "!".
  private chips(parent: Node, items: any[], x: number, y: number, width: number, shared?: { pen: Pen; ox: number; oy: number; shapes: (() => void)[] }) {
    let cursorX = x;
    let cursorY = y;
    for (const item of items) {
      const label = (item.warn ? '! ' : '') + item.name;
      const chipWidth = item.name.length * 12 + 14 + (item.warn ? 10 : 0);
      if (cursorX + chipWidth > x + width && cursorX > x) { cursorX = x; cursorY += 22; }
      const cx = cursorX, cy = cursorY, fill = toneColors[item.tone] || colors.green;
      if (shared) {
        shared.shapes.push(() => shared.pen.rect(shared.ox + cx, shared.oy + cy, chipWidth, 18, fill, 9));
        this.text(parent, label, cx, cy, chipWidth, 18, 11, '#ffffff', true).horizontalAlign = HorizontalTextAlignment.CENTER;
      } else {
        const chip = this.box(parent, 'Chip', cx, cy, chipWidth, 18, fill, 9);
        this.text(chip, label, 0, 0, chipWidth, 18, 11, '#ffffff', true).horizontalAlign = HorizontalTextAlignment.CENTER;
      }
      cursorX += chipWidth + 6;
    }
    return cursorY + 22;
  }

  // Six abilities as a radar, mapped onto the same axes as a project's six dimensions.
  private abilityValues(abilities: any) {
    const out: any = {};
    for (const key of core.DIM_KEYS) out[key] = abilities[key === 'stability' ? 'discover' : key] || 0;
    return out;
  }

  private miniRadar(parent: Node | null, x: number, y: number, size: number, abilities: any, shared?: Pen) {
    const pen = shared || this.canvasNode(parent!, 'MiniRadar', x, y, size, size).pen;
    const baseX = shared ? x : 0;
    const baseY = shared ? y : 0;
    const values = this.abilityValues(abilities);
    const center = size / 2;
    const radius = size / 2 - 4;
    const point = (index: number, value: number) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / 6;
      return [baseX + center + Math.cos(angle) * radius * value / 100, baseY + center + Math.sin(angle) * radius * value / 100];
    };
    const ring = core.DIM_KEYS.map((_key: string, index: number) => point(index, 100));
    pen.poly(([] as number[]).concat(...ring), colors.pale);
    const shape = core.DIM_KEYS.map((key: string, index: number) => point(index, values[key]));
    pen.poly(([] as number[]).concat(...shape), colors.green, 170);
  }

  // A tap target over a drawn brick; tapping toggles its card. The card belongs to the board it was tapped on.
  // `gap` is the label height under the brick, so the card opens below the label instead of over the icon.
  private brickSpot(node: Node, x: number, y: number, size: number, item: any, gap = 34) {
    const key = node.name + '|' + (item.module || item.name) + '|' + Math.round(x) + ',' + Math.round(y);
    const spot = this.box(node, 'Spot', x, y, size, size);
    this.clickable(spot, () => {
      this.brickTip = this.brickTip?.key === key ? null : { key, board: node.name, x, y, size, gap, item };
      this.render();
    });
  }

  // Where the open card sits on a board and how much room it needs below the tapped brick.
  private tipLayout(boardName: string) {
    const tip = this.brickTip;
    if (!tip || tip.board !== boardName) return null;
    const buttons = [...(tip.item.route ? [{ text: '看组成', route: tip.item.route }] : []), ...(tip.item.actions || [])];
    const cardH = 72 + Math.ceil(buttons.length / 2) * 32;
    return { tip, buttons, cardH, bottom: tip.y + tip.size + tip.gap + cardH + 6 };
  }

  // The card for the tapped brick: name, state and a note, plus a way into the next layer and whatever
  // can be done with the module (build the next tier, rebuild, license).
  private brickTipCard(node: Node, width: number, _height: number) {
    const layout = this.tipLayout(node.name);
    if (!layout || !layout.tip.key.startsWith(node.name + '|')) return;
    const { tip, buttons, cardH } = layout;
    const cardW = Math.min(250, width - 8);
    const x = Math.max(4, Math.min(width - cardW - 4, tip.x + tip.size / 2 - cardW / 2));
    const y = tip.y + tip.size + tip.gap;
    const card = this.box(node, 'Tip', x, y, cardW, cardH);
    // Not part of the page's shared bottom layer: the bricks and the workbench drawn above that layer
    // would otherwise cover the card's background and leave white text on a light page.
    (card as any).inBatch = false;
    new Pen(card.addComponent(Graphics)).rect(0, 0, cardW, cardH, colors.night, 10, 245);
    card.on(Node.EventType.TOUCH_START, () => undefined);
    this.text(card, tip.item.name, 10, 6, cardW - 20, 20, 13, '#ffffff', true);
    this.text(card, tip.item.detail || '', 10, 26, cardW - 20, 18, 11, '#cfe3d8');
    this.text(card, tip.item.note || '', 10, 44, cardW - 20, 28, 10, '#cfe3d8');
    const cell = (cardW - 26) / 2;
    buttons.forEach((item: any, index: number) => {
      const bx = 10 + (index % 2) * (cell + 6);
      const by = 72 + Math.floor(index / 2) * 32;
      this.button(card, item.text, bx, by, cell, 28, () => {
        this.brickTip = null;
        if (item.route) this.openMenu(item.route.menu, item.route.id);
        else this.dispatch(item.action, item.data);
      }, index === 0);
    });
  }

  // Monthly ability record as six lines, with ticks on the days something happened to the person.
  private trace(parent: Node, y: number, trace: any[], history: any[]) {
    const width = this.width - 40;
    const height = 150;
    const { node, pen } = this.canvasNode(parent, 'Trace', 0, y, width, height);
    const left = 28;
    const right = width - 8;
    const top = 8;
    const bottom = height - 40;
    const lineColors = ['#c8574f', '#3b6ea5', '#2f7d63', '#d39a1e', '#9b6fb0', '#76877d'];
    const first = trace[0].day;
    const last = trace[trace.length - 1].day;
    const xOf = (day: number) => left + (right - left) * (last > first ? (day - first) / (last - first) : 0);
    const yOf = (value: number) => bottom - (bottom - top) * value / 100;
    for (const value of [0, 50, 100]) {
      pen.line(left, yOf(value), right, yOf(value), colors.line, 1);
      this.text(node, String(value), 0, yOf(value) - 8, left - 4, 16, 9, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
    }
    core.ABILITY_KEYS.forEach((key: string, index: number) => {
      for (let step = 1; step < trace.length; step++) pen.line(xOf(trace[step - 1].day), yOf(trace[step - 1].a[key]), xOf(trace[step].day), yOf(trace[step].a[key]), lineColors[index], 1.6);
    });
    for (const item of history) if (item.day >= first && item.day <= last) pen.circle(xOf(item.day), bottom + 6, 2.5, colors.amber);
    core.ABILITIES.forEach((ability: any, index: number) => {
      const x = left + index * (right - left) / 6;
      this.box(node, 'Key', x, bottom + 16, 10, 4, lineColors[index], 2);
      this.text(node, ability.name, x + 12, bottom + 10, 40, 16, 10, colors.muted);
    });
    this.text(node, core.dateText(first), left, height - 14, 120, 14, 9, colors.muted);
    this.text(node, core.dateText(last) + ' · 橙点为档案事件', right - 200, height - 14, 200, 14, 9, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
    return height;
  }

  private clear() {
    this.anchors.clear();
    this.groupTops.clear();
    this.shapePen = null;
    this.shapeRoot = null;
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
    // Bankruptcy opens its own screen once per failed run, including when a failed save is loaded
    // (the day loop is already stopped then, so only render sees it).
    if (this.state.over && !this.overScreenShown) {
      this.overScreenShown = true;
      this.resumeAfterMenu = false;
      this.routes = [{ menu: 'gameover' }];
      this.scrollBottom = false;
    }
    const key = this.routes.map((route: any) => route.menu + (route.id || '') + (route.dim || '')).join('>');
    // Keep the focused EditBox alive: defer redraws of the same page until editing ends. A route
    // change still redraws immediately and clears a stale guard (a few platforms do not dispatch
    // editing-did-ended), so the screen can never stay frozen on an old page.
    if (this.editing && key === this.scrollKey) { this.renderPending = true; return; }
    if (this.editing) this.editing = false;
    this.renderPending = false;
    if (this.playing && !this.routes.length && !this.state.event && !this.state.over && content.guide(this.state, null, true)?.ack) {
      this.guidePaused = true;
      this.playing = false;
      this.elapsed = 0;
    }
    // A day tick re-renders the whole page. Without carrying the offset over, scrolling down while the
    // clock ran snapped back to the top every tick. A different screen starts at the top again.
    const keep = key === this.scrollKey && this.scrollView ? this.scrollView.getScrollOffset().y : 0;
    this.scrollKeep = keep;
    this.clear();
    this.box(this.stage, 'Paper', 0, 0, this.width, this.height, colors.bg);
    // A screen that throws half-way used to leave a blank page with no way back. Draw the reason on
    // the page instead, and keep the bottom navigation alive so the player can still move around.
    try {
      if (this.routes.length) this.renderMenu();
      else this.renderStudio();
    } catch (error: any) {
      console.error('Render failed:', error);
      this.text(this.stage, '这一页没能画出来：' + (error?.message || error), 20, this.top + 70, this.width - 40, 60, 13, colors.danger);
      this.button(this.stage, '返回工作室', 20, this.top + 130, this.width - 40, 44, () => { this.routes = []; this.playing = false; this.render(); }, true);
    }
    // Restore the player's scroll position before measuring the guide anchor: renderGuide() may need
    // to scroll back up to a tip near the top (the exhibition buttons right after the promotion
    // cards), and a restore after it would silently undo that scroll and misplace the highlight.
    if (keep > 1 && this.scrollView) this.scrollView.scrollToOffset(new Vec2(0, keep), 0);
    this.renderGuide();
    // Applied after the guide so a tip cannot undo the jump to the bottom of the company page.
    // If a tip points somewhere else, let its own scroll win and keep the request pending: the next
    // render (after the tip is read) lands on the release button instead of hiding the highlight.
    if (this.scrollBottom && this.scrollView && this.scrollBody && (!this.guideAnchor || this.guideAnchor === 'launch')) {
      this.scrollBottom = false;
      const max = Math.max(0, this.scrollBody.getComponent(UITransform).height - this.scrollHeight);
      this.scrollView.scrollToOffset(new Vec2(0, max), 0);
    }
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
    const header = platform.header();
    const top = header.top;
    const headerRight = width - Math.max(20, header.capsule);
    // On the mini program the header shares a row with the native capsule; the reserved width is a
    // best-effort guess, so keep the play/speed buttons a little further in rather than let the
    // last speed chip touch the capsule on devices whose capsule is wider than reported.
    const controlsRight = headerRight - (platform.mini ? 22 : 8);
    // Play/pause plus the two speed caps (1x and 4x). The 12x button was removed: it made the clock
    // outrun the interface and left no time to read what was happening.
    const SPEEDS = [1, 4];
    const controlsLeft = controlsRight - (SPEEDS.length + 1) * 40;
    const companyName = state.company || '造游工坊';
    this.text(this.stage, companyName, 20, top, controlsLeft - 32, 24, 17, colors.ink, true);
    this.text(this.stage, core.dateText(state.day), 20, top + 24, controlsLeft - 32, 18, 11, this.playing ? colors.green : colors.muted);
    this.button(this.stage, '', controlsLeft, top + 2, 40, 40, () => this.dispatch('clock'), true, false, this.playing ? 'Pause' : 'Play', 'clock');
    SPEEDS.forEach((value, index) => this.button(this.stage, value + '×', controlsLeft + 40 + index * 40, top + 2, 38, 40, () => { this.speed = value; this.render(); }, this.speed === value));
    const financesY = top + 52;
    const finance = this.box(this.stage, 'Finance', 20, financesY, inner, 42, colors.paper, 10);
    this.anchors.set('finance', finance);
    const column = inner / 3;
    const cashLabel = [['资金', content.money(state.cash)], ['月开支', content.money(core.monthlyCost(state))], ['本月收入', content.money(state.ledger.income)]].map(([name, value], index) => {
      this.text(finance, name, 10 + column * index, 3, column - 10, 16, 10, colors.muted);
      return this.text(finance, value, 10 + column * index, 18, column - 12, 22, 15, index === 0 ? colors.green : index === 2 ? colors.amber : colors.ink, true);
    })[0];
    const navY = this.height - this.bottom - 58;
    this.box(this.stage, 'NavigationBackground', 0, navY - 8, width, 66 + this.bottom, colors.paper);
    navigation.forEach(([menu, title, icon], index) => {
      const cellWidth = width / navigation.length;
      const lock = content.menuLock(state, menu);
      const node = this.box(this.stage, title, index * cellWidth, navY, cellWidth, 54);
      this.clickable(node, () => {
        if (lock) { this.notify(title + '：' + lock + '。'); return; }
        // "项目" always opens the project page. With no running title it offers 接委托 and 新项目,
        // so the player chooses instead of being dropped straight into the setup form.
        const id = ['project', 'market'].includes(menu) ? this.watching : undefined;
        this.openMenu(menu, id);
      });
      this.navIcon(node, lock ? 'Lock' : icon, (cellWidth - 22) / 2, 5, 22, lock ? colors.line : colors.green);
      this.text(node, title, 0, 32, cellWidth, 18, 11, lock ? colors.muted : colors.ink).horizontalAlign = HorizontalTextAlignment.CENTER;
      this.anchors.set('nav-' + menu, node);
    });
    const contentY = financesY + 50;
    const open = core.liveProjects(state);
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
      this.text(strip, `${shown.name}${shown.released ? ' · 补丁' : ''} · ${index + 1}/${open.length}`, 44, 0, inner - 88, 34, 12, colors.green, true).horizontalAlign = HorizontalTextAlignment.CENTER;
      contentTop = contentY + 44;
    }
    const project = shown;
    // Fixed rows below and above the scene; the scene absorbs any shortage on short screens.
    // Content heights below the header: office, bulletin, project panel and the next-step card.
    const shrink = Math.max(0, Math.min(70, (project ? 586 : 334) - (navY - contentTop - 10)));
    const { body, finish } = this.scroller(contentTop, navY - contentTop - 10);
    let y = 0;
    const metrics = project ? (project.released ? core.projectMetrics(project) : core.visibleMetrics(project)) : null;
    y += this.office(body, y, 190 - shrink, project, metrics) + 4;
    this.anchors.set('scene', this.box(body, 'SceneAnchor', 0, 0, inner, y - 4));
    y += this.bulletin(body, y) + 8;
    if (project?.released) y = this.patchPanel(body, y, project);
    else if (project) y = this.projectPanel(body, y, metrics);
    else {
      this.text(body, state.catalog.length ? '下一部作品，继续创造。' : '从一间小屋，到第一部作品。', 0, y, inner, 28, 17, colors.ink, true);
      y += 36;
    }
    const advice = content.advice(state, project ? project.id : undefined);
    y += this.choice(body, y, advice.title, advice.text, () => this.openMenu(advice.menu, advice.id, false, undefined, !!advice.bottom), { icon: 'ChevronRight', highlight: true, emphasis: advice.emphasis, anchor: 'next', compact: true });
    finish(y - 20);
    this.showDeltas(cashLabel);
  }

  // The office is the main screen's picture and its doors: the big screen shows the current work, the
  // plaque the star rating, the whiteboard opens the calendar, the shelf the achievements and the desks
  // the team. At most eight desks are drawn; the rest of the team is a "+N" chip.
  private office(body: Node, y: number, height: number, project: any, metrics: any) {
    const state = this.state;
    const inner = this.width - 40;
    const { node, pen } = this.canvasNode(body, 'Office', 0, y, inner, height);
    const rating = core.ratingOf(state);
    const achievements = core.achievementsOf(state);
    drawRoom(pen, inner, height, state.office, { cups: Math.min(3, Math.ceil(achievements.count / 6)), books: state.catalog.length, stars: rating.tier + 1, starColor: tierColors[rating.tier] });
    this.clickable(node, () => { if (!this.officeSwiped) this.openMenu('team'); });
    const props = roomProps(inner, height, state.office);
    // Big screen with the work the main screen is looking at, or the last release. The work art is drawn
    // at its design height and scaled down to the screen, and the screen clips anything at the edges.
    const screen = props.screen;
    const monitor = this.box(node, 'Screen', screen.x, screen.y, screen.w, screen.h);
    monitor.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
    const zoom = screen.h / 96;
    const { node: art, pen: screenPen } = this.canvasNode(monitor, 'Art', 0, 0, screen.w / zoom, 96);
    art.setScale(zoom, zoom, 1);
    if (project) drawWork(screenPen, screen.w / zoom, 96, project.type, project.released ? 1 : metrics.progress / 100, metrics.dimensions.picture, project.started);
    else if (state.catalog.length) drawWork(screenPen, screen.w / zoom, 96, state.catalog[0].type, 1, state.catalog[0].metrics.dimensions.picture, state.catalog[0].released);
    else { screenPen.rect(0, 0, screen.w / zoom, 96, '#3b4744', 2); this.text(monitor, '立项后作品在这里成形', 0, 0, screen.w, screen.h, 10, '#cfeee0').horizontalAlign = HorizontalTextAlignment.CENTER; }
    const caption = project ? '《' + project.name + '》' + (project.released ? ' 补丁' : '') : state.catalog.length ? '上一作《' + state.catalog[0].name + '》' : '';
    if (caption) {
      const tag = this.box(monitor, 'Caption', 4, screen.h - 16, Math.min(screen.w - 8, caption.length * 10 + 10), 14, colors.night, 7, 190);
      this.text(tag, caption, 5, 0, Math.min(screen.w - 18, caption.length * 10), 14, 9, '#ffffff');
    }
    this.clickable(monitor, () => project ? this.openMenu('project', project.id) : this.openMenu('project'));
    this.anchors.set('work', monitor);
    // Desks: people on the watched project first, then anyone resting or stressed, then by seniority.
    const working = this.playing && core.liveProjects(state).length > 0;
    const onProject = (person: any) => project && core.projectOf(state, person)?.id === project.id ? 0 : 1;
    const attention = (person: any) => person.leaveUntil > state.day || person.stressTags.length ? 0 : 1;
    const sorted = [...state.staff].sort((left: any, right: any) => onProject(left) - onProject(right) || attention(left) - attention(right) || (left.joined || 0) - (right.joined || 0));
    // Up to 20 desks fit one picture; a bigger team pages sideways, the watched project's people first.
    const pages = Math.max(1, Math.ceil(sorted.length / 20));
    const page = Math.min(this.officePage, pages - 1);
    const shown = sorted.slice(page * 20, page * 20 + 20);
    const layout = seatLayout(Math.min(20, Math.max(shown.length, core.seats(state) - page * 20)), inner, height);
    const desks = new Pen(this.box(node, 'Desks', 0, 0, inner, height).addComponent(Graphics));
    // One node, one Graphics and one forever tween per head used to mean twenty live tweens and twenty
    // extra Graphics components, all torn down and rebuilt on every daily redraw while the clock runs.
    // Draw the faces into two shared Graphics instead: the working ones bob together, the rest stay put.
    const bobbing = this.box(node, 'Heads', 0, 0, inner, height);
    const bobbingPen = new Pen(bobbing.addComponent(Graphics));
    const still = this.box(node, 'HeadsStill', 0, 0, inner, height);
    const stillPen = new Pen(still.addComponent(Graphics));
    let anyBobbing = false;
    layout.forEach((seat, index) => {
      const person = shown[index];
      drawDesk(desks, seat.x, seat.y, seat.scale, !!person, person?.role, working && person && person.leaveUntil <= state.day);
      if (!person) return;
      const active = working && person.leaveUntil <= state.day;
      const face = active ? bobbingPen : stillPen;
      if (active) anyBobbing = true;
      const cy = seat.y - 42 * seat.scale;
      drawAvatar(face, seat.x, cy, 11 * seat.scale, person.id, person.look);
      if (person.stressTags.length) face.circle(seat.x + 8 * seat.scale, cy - 12 * seat.scale, 3, colors.danger);
    });
    if (anyBobbing) tween(bobbing).by(0.22, { position: new Vec3(0, 2, 0) }).by(0.22, { position: new Vec3(0, -2, 0) }).union().repeatForever().start();
    if (pages > 1) {
      let startX = 0;
      node.on(Node.EventType.TOUCH_START, (event: EventTouch) => { startX = event.getUILocation().x; this.officeSwiped = false; });
      node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => { if (Math.abs(event.getUILocation().x - startX) > 30) this.officeSwiped = true; });
      node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
        const dx = event.getUILocation().x - startX;
        if (Math.abs(dx) <= 30) return;
        this.officePage = (page + (dx < 0 ? 1 : pages - 1)) % pages;
        this.scheduleOnce(() => this.render(), 0);
      });
      const pager = '‹ ' + (page + 1) + '/' + pages + ' ›';
      const pageChip = this.box(node, 'Pager', 6, height - 22, 54, 18, colors.night, 9, 200);
      this.text(pageChip, pager, 0, 0, 54, 18, 10, '#ffffff').horizontalAlign = HorizontalTextAlignment.CENTER;
      this.clickable(pageChip, () => { this.officePage = (page + 1) % pages; this.render(); });
    }
    // One chip in the bottom corner: room, people and seats.
    const label = core.OFFICES[state.office].name + ' ' + state.staff.length + '/' + core.seats(state);
    const chipWidth = label.length * 10 + 14;
    const chip = this.box(node, 'Room', inner - chipWidth - 6, height - 22, chipWidth, 18, colors.night, 9, 200);
    this.text(chip, label, 7, 0, chipWidth - 14, 18, 10, '#ffffff');
    this.clickable(chip, () => this.openMenu('team'));
    const hotspot = (name: string, rect: any, text: string, open: () => void) => {
      const spot = this.box(node, name, rect.x, rect.y, rect.w, rect.h);
      const tag = this.box(spot, 'Label', (rect.w - 30) / 2, rect.h - 13, 30, 12, colors.night, 6, 170);
      this.text(tag, text, 0, 0, 30, 12, 9, '#ffffff').horizontalAlign = HorizontalTextAlignment.CENTER;
      this.clickable(spot, open);
      this.anchors.set(name, spot);
      return spot;
    };
    hotspot('board', props.board, '日历', () => this.openMenu('industry', 'schedule'));
    const shelf = hotspot('shelf', props.shelf, '成就', () => this.openMenu('achievements'));
    // A new achievement makes the shelf glow until the achievement page is opened.
    if (achievements.fresh > 0) {
      const glow = this.box(shelf, 'Glow', 0, 0, props.shelf.w, props.shelf.h);
      new Pen(glow.addComponent(Graphics)).frame(0, 0, props.shelf.w, props.shelf.h, colors.gold, 3, 4);
      const opacity = glow.addComponent(UIOpacity);
      tween(opacity).to(0.6, { opacity: 60 }).to(0.6, { opacity: 255 }).union().repeatForever().start();
    }
    const plaque = this.box(node, 'Plaque', props.plaque.x, props.plaque.y, props.plaque.w, props.plaque.h);
    this.clickable(plaque, () => this.openMenu('rating'));
    this.anchors.set('tier', plaque);
    if (rating.watch) this.text(plaque, '!', props.plaque.w - 12, 0, 10, props.plaque.h, 12, colors.danger, true);
    return height;
  }

  // One or two lines of industry news under the office, like a TV in the corner. Reading it is
  // optional; anything the player must act on still gets its own banner.
  private bulletin(body: Node, y: number) {
    const inner = this.width - 40;
    const items = core.bulletinOf(this.state);
    const node = this.box(body, 'Bulletin', 0, y, inner, 34, colors.night, 8);
    this.navIcon(node, 'Newspaper', 8, 8, 18, '#ffd166');
    // Rotate on the wall clock, not game days, so high speed never flashes items past.
    const item = items.length ? items[Math.floor(Date.now() / 6000) % items.length] : null;
    const line = item ? (item.own ? '【本社】' : '') + item.title + (item.text ? ' · ' + item.text : '') : core.RATING_MEDIA + '：圈子里暂时没有新消息。';
    const label = this.text(node, line, 32, 2, inner - 40, 30, 10, item?.own ? '#ffd166' : '#e8f3ed');
    label.lineHeight = 14;
    label.overflow = Label.Overflow.CLAMP;
    this.clickable(node, () => this.openMenu('industry', 'news'));
    this.anchors.set('bulletin', node);
    return 34;
  }

  // Four stats beside the radar instead of under it, so the scoring block costs no extra row.
  private statColumn(body: Node, x: number, y: number, width: number, cells: any[], open?: () => void) {
    const cellHeight = 41;
    cells.forEach(([title, value, color, bar, anchor], index) => {
      const node = this.box(body, title, x, y + index * cellHeight, width, cellHeight - 4, colors.paper, 8);
      if (open) this.clickable(node, open);
      this.text(node, title, 10, 2, width - 16, 14, 10, colors.muted);
      const label = this.text(node, value, 10, 15, width - 16, 20, value === '—' || value === '未测' ? 13 : 16, value === '—' || value === '未测' ? colors.muted : color, true);
      if (anchor === 'stat-followers') { this.followersLabel = label; this.rollLabel('followers', label, (n: number) => content.number(n)); }
      if (bar >= 0) {
        this.box(node, 'Track', 10, cellHeight - 9, width - 20, 3, colors.line);
        this.box(node, 'Value', 10, cellHeight - 9, (width - 20) * Math.min(100, bar) / 100, 3, color);
      }
      this.anchors.set(anchor, node);
    });
    return cells.length * cellHeight;
  }

  // A running patch on the main screen: what it fixes, how far along it is, who is on it.
  private patchPanel(body: Node, y: number, project: any) {
    const inner = this.width - 40;
    const forecast = core.patchForecast(this.state, project);
    const book = this.state.catalog.find((item: any) => item.id === project.id);
    const heading = this.box(body, 'Heading', 0, y, inner, 24);
    this.clickable(heading, () => this.openMenu('project', project.id));
    this.text(heading, '《' + project.name + '》补丁', 0, 0, inner - 150, 24, 16, colors.ink, true);
    this.text(heading, '修复 ' + forecast.fixed + '/' + forecast.targets + (project.patch.rework ? ' · 返工' + core.DIMENSIONS.find(item => item.key === project.patch.rework)?.name : ''), inner - 150, 0, 150, 24, 12, colors.green, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
    y += 28;
    const track = this.box(body, 'Track', 0, y, inner, 40);
    this.anchors.set('track', track);
    this.box(track, 'Rail', 0, 22, inner, 4, colors.line);
    this.box(track, 'Fill', 0, 22, inner * forecast.share, 4, colors.green);
    this.text(track, forecast.days === null ? '还没有人做 · 点开安排补丁人手' : forecast.days === 0 ? '即将上线' : '约 ' + forecast.days + ' 天上线 · 剩余 ' + forecast.left.toFixed(1) + ' 人日', 0, 0, inner, 18, 11, forecast.days === null ? colors.amber : colors.green, true);
    this.clickable(track, () => this.openMenu('project', project.id));
    y += 46;
    const metrics = core.projectMetrics(project);
    const radarWidth = Math.round(inner * 0.58);
    const height = this.radar(body, y, metrics, project.type, project, radarWidth);
    this.statColumn(body, radarWidth + 6, y, inner - radarWidth - 6, [
      ['综合', metrics.overall.toFixed(0), colors.green, metrics.overall, 'stat-overall'],
      ['待修', Math.max(0, forecast.targets - forecast.fixed) + ' 项', colors.blue, -1, 'stat-defects'],
      ['口碑', book ? book.reviewScore.toFixed(1) : '—', colors.amber, -1, 'stat-review'],
      ['日销', book ? book.lastDayUnits + ' 份' : '—', colors.ink, -1, 'stat-daily']
    ], () => this.openMenu('project', project.id));
    y += Math.max(height, 164) + 6;
    this.text(body, '补丁做完自动上线；口碑与销量随之后的玩家评价逐步变化。', 0, y, inner, 18, 11, colors.muted);
    return y + 26;
  }

  private projectPanel(body: Node, y: number, metrics: any) {
    const state = this.state;
    // Must follow the tab the player picked, not whichever project happens to be first.
    const open = core.liveProjects(state);
    const project = open.find((item: any) => item.id === this.watching) || open[0];
    if (!project) return y;
    const inner = this.width - 40;
    const forecast = core.projectForecast(state, project);
    const heading = this.box(body, 'Heading', 0, y, inner, 24);
    this.clickable(heading, () => this.openMenu('project', project.id));
    this.text(heading, '《' + project.name + '》', 0, 0, inner - 150, 24, 16, colors.ink, true);
    this.text(heading, core.TYPES[project.type].name + ' · ' + core.SCALES[project.scale].name + '   ' + metrics.progress.toFixed(0) + '%', inner - 150, 0, 150, 24, 12, colors.green, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
    y += 28;
    y += this.milestones(body, y, project, metrics, forecast) + 6;
    // The radar is six zeroes and a lot of empty space until a prototype exists. Reveal the scoring
    // panel when it actually has a shape instead of opening the game on a wall of zeroes.
    if (!project.checkpoints?.prototype) {
      const hint = this.box(body, 'PrototypeHint', 0, y, inner, 54, colors.pale, 8);
      this.text(hint, '完成 25% 原型后，这里显示六维评分、瓶颈与关注。现在先开始时间或调整分工。', 12, 2, inner - 24, 50, 12, colors.muted);
      return y + 62;
    }
    const radarWidth = Math.round(inner * 0.58);
    const height = this.radar(body, y, metrics, project.type, project, radarWidth);
    const bottleneck = forecast.bottleneck ? core.bottleneckName(forecast.bottleneck.key) : '—';
    this.anchors.set('stats', this.box(body, 'StatsAnchor', radarWidth + 6, y, inner - radarWidth - 6, 164));
    this.statColumn(body, radarWidth + 6, y, inner - radarWidth - 6, [
      ['综合估计', metrics.overall.toFixed(0), colors.green, metrics.overall, 'stat-overall'],
      ['瓶颈', bottleneck || '—', colors.amber, -1, 'stat-bottleneck'],
      ['待修缺陷', metrics.known + ' 项', colors.blue, -1, 'stat-defects'],
      ['关注', content.number(project.followers), colors.ink, -1, 'stat-followers']
    ], () => this.openMenu('project', project.id));
    y += Math.max(height, 164) + 6;
    const insight = core.TYPES[project.type].audience + '最看重：' + core.audienceFocus(project.type);
    this.anchors.set('insight', this.text(body, insight + (project.test ? ' · 试玩 ' + project.test.score.toFixed(1) + ' 分' : ''), 0, y, inner, 18, 11, colors.muted).node);
    return y + 26;
  }

  // Six-axis radar: the solid layer is the current score, the dashed one is where today's team would
  // land if it finished the work. The gap between them is what time can still buy. On the main screen
  // it takes the left part of the row and the stats sit beside it.
  private radar(body: Node, y: number, metrics: any, type: string, project?: any, compact = 0, caption = true) {
    const inner = compact || this.width - 40;
    const height = compact ? 164 : caption ? 184 : 168;
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
      // Ability radars label the sixth axis 发现, the ability behind stability.
      const name = metrics.labels ? metrics.labels[index] : core.DIMENSIONS.find(dimension => dimension.key === key)?.name || '';
      const score = Math.round(metrics.dimensions[key] || 0);
      const label = this.text(node, name + '\n' + (key === 'stability' && metrics.untested ? '未测' : score + (metrics.labels ? '' : ' 分')), 0, 0, 56, 32, 11, metrics.labels ? toneColors[content.valueTone(score)] : colors.muted);
      label.horizontalAlign = HorizontalTextAlignment.CENTER;
      // setPosition uses engine coords (y up). Center the 32px label on the radial point.
      const spot = point(index, 120);
      label.node.setPosition(spot.x - 28, -spot.y + 16);
      if (project && !project.released) this.clickable(label.node, () => this.openMenu('dimension', project.id, false, key));
    });
    if (!compact && caption) this.text(node, '绿线为当前 · 黄虚线为做完预期 · 点评分看详情', 8, height - 16, inner - 16, 14, 10, colors.muted);
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
    this.clickable(track, () => this.openMenu('project', project.id));
    // Launch unlocks at the trial build, not at 100%. The old track ended in "发售" at full progress,
    // which taught the opposite and made players grind to 100% before daring to release.
    // A job has no prototype or trial build: just start and handover.
    const module = project.kind === 'module';
    const phases = module ? (project.job ? [['接单', 0], ['交付', 100]] : [['开工', 0], ['收进模块库', 100]]) : [['立项', 0], ['原型', 25], ['体验版', 55], ['做满', 100]];
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
    const phase = module ? (metrics.progress < 100 ? 0 : 3) : metrics.progress < 25 ? 0 : metrics.progress < 55 ? 1 : metrics.progress < 100 ? 2 : 3;
    const note = module ? (days == null ? '缺人手' : (project.job ? '距交付约 ' : '距做完约 ') + days + ' 天') : phase === 3 ? '已可发售' : phase === 2 && days != null ? '可发售 · 做满约 ' + days + ' 天' : days == null ? '缺人手' : '距做完约 ' + days + ' 天';
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
    const open = core.liveProjects(this.state);
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
    // Save pages need the slot list, which lives in device storage rather than in the state.
    const slotPage = ['slots', 'new-slot-confirm', 'slot', 'slot-delete'].includes(route.menu);
    const model = custom ? null : content.menu(this.state, route, slotPage ? this.slotSummaries() : []);
    const title = route.menu === 'setup' ? '成立工作室' : route.menu === 'new-project' ? '新作立项' : route.menu === 'history' ? '经营记录' : model.title;
    const y = this.top;
    if (this.routes.length > 1) this.button(this.stage, '', 20, y, 40, 40, () => { this.routes.pop(); this.render(); }, false, false, 'ArrowLeft');
    this.text(this.stage, title, 70, y, this.width - 140, 40, 19, colors.ink, true).horizontalAlign = HorizontalTextAlignment.CENTER;
    // Event pages used to have no close button at all, so the release screen trapped the player in it.
    // A single-choice event (release, settlement) can be dismissed with ✕; a real decision still must be made.
    const singleChoiceEvent = route.menu === 'event' && (this.state.event?.choices?.length || 0) === 1;
    if (this.state.company && (route.menu !== 'event' || singleChoiceEvent)) this.button(this.stage, '', this.width - 60, y, 40, 40, () => this.closeMenu(), false, false, 'X');
    this.box(this.stage, 'Divider', 20, y + 54, this.width - 40, 1, colors.line);
    const scroll = this.scroller(y + 68, this.height - y - 68 - this.bottom);
    // One Graphics for every static rectangle on this page. It is the first child of the scroll body,
    // so all labels and buttons drawn afterwards stay on top of it. Body-relative coordinates start
    // at zero here, which is what box() records on every descendant as ax/ay.
    const body = scroll.body;
    (body as any).ax = 0;
    (body as any).ay = 0;
    this.shapeRoot = body;
    const shapes = this.box(body, 'Shapes', 0, 0, this.width - 40, 1);
    shapes.setSiblingIndex(0);
    this.shapePen = new Pen(shapes.addComponent(Graphics));
    let cursor = 0;
    try {
      if (route.menu === 'setup') cursor = this.renderSetup(body);
      else if (route.menu === 'new-project') cursor = this.renderNewProject(body);
      else if (route.menu === 'history') cursor = this.renderHistory(body);
      else for (const block of model.blocks) cursor = this.drawBlock(body, block, cursor);
    } finally {
      shapes.getComponent(UITransform).setContentSize(this.width - 40, Math.max(1, cursor));
      this.shapePen = null;
      this.shapeRoot = null;
    }
    scroll.finish(cursor);
  }

  private renderSetup(body: Node) {
    const inner = this.width - 40;
    const { pen } = this.canvasNode(body, 'Room', 0, 0, inner, 150);
    drawRoom(pen, inner, 150, 0);
    const desks = new Pen(this.box(body, 'Desk', 0, 0, inner, 150).addComponent(Graphics));
    seatLayout(1, inner, 150).forEach(seat => drawDesk(desks, seat.x, seat.y, seat.scale, false, 'code', false));
    let cursor = 166;
    cursor += this.paragraph(body, '一间小屋、一张桌子和 ' + content.money(this.state.cash) + ' 积蓄。先接一份委托，再做自己的游戏。', cursor);
    this.draft.suggested = this.draft.suggested || content.randomStudioName();
    this.input(body, this.draft.suggested, this.draft.name, cursor, 48, value => { this.draft.name = value; });
    cursor += 62;
    this.text(body, '你的出身', 0, cursor, inner, 24, 15, colors.ink, true);
    cursor += 30;
    const founder = core.ORIGINS[this.draft.founder] ? this.draft.founder : 'code';
    for (const role of Object.keys(core.ORIGINS)) {
      const origin = core.ORIGINS[role];
      cursor += this.choice(body, cursor, origin.name, origin.focus + '\n第一份委托：' + core.MODULES[origin.starter].name, () => { this.draft.founder = role; this.render(); }, { highlight: founder === role, tag: founder === role ? '已选' : '', tagColor: colors.green, brick: core.MODULES[origin.starter] }) + 8;
    }
    // The founder's look: four small rows, with the face updating as the player taps.
    const look = this.draft.look || (this.draft.look = { skin: 1, face: 0, hair: 0, hairColor: 0, glasses: 0 });
    cursor += 6;
    this.text(body, '你的样子', 0, cursor, inner, 24, 15, colors.ink, true);
    cursor += 30;
    drawAvatar(this.canvasNode(body, 'Face', 0, cursor, 72, 72).pen, 36, 36, 28, 'founder', look);
    const rows: Array<[string, number, (index: number) => void, (index: number) => boolean]> = [
      ['肤色', SKINS.length, index => { look.skin = index; }, index => look.skin === index],
      ['脸型', FACES, index => { look.face = index; }, index => look.face === index],
      ['发型', HAIR_STYLES, index => { look.hair = index; }, index => look.hair === index],
      ['发色', HAIRS.length, index => { look.hairColor = index; }, index => look.hairColor === index],
      ['眼镜', GLASSES.length, index => { look.glasses = index; }, index => look.glasses === index]
    ];
    const left = 84;
    rows.forEach(([label, count, set, on], row) => {
      const y = cursor + row * 34;
      this.text(body, label, left, y, 36, 28, 12, colors.muted);
      const cell = Math.min(30, (inner - left - 40 - (count - 1) * 4) / count);
      for (let index = 0; index < count; index++) {
        const swatch = label === '肤色' ? SKINS[index] : label === '发色' ? HAIRS[index] : '';
        const x = left + 40 + index * (cell + 4);
        const node = this.box(body, 'Swatch', x, y, cell, 28, swatch || (on(index) ? colors.green : colors.pale), 6);
        if (!swatch) this.text(node, label === '眼镜' ? GLASSES[index] : String(index + 1), 0, 0, cell, 28, 11, on(index) ? '#ffffff' : colors.ink).horizontalAlign = HorizontalTextAlignment.CENTER;
        if (on(index)) new Pen(this.box(node, 'Pick', 0, 0, cell, 28).addComponent(Graphics)).frame(0, 0, cell, 28, colors.ink, 2, 6);
        this.clickable(node, () => { set(index); this.render(); });
      }
    });
    cursor += rows.length * 34 + 10;
    this.button(body, '成立工作室', 0, cursor, inner, 48, () => {
      this.apply(core.nameCompany(this.state, this.draft.name.trim() || this.draft.suggested, founder, look));
      this.resumeAfterMenu = false;
      this.closeMenu();
    }, true);
    return cursor + 66;
  }

  private renderNewProject(body: Node) {
    const inner = this.width - 40;
    const state = this.state;
    this.draft.suggested = this.draft.suggested || content.randomTitle(state);
    if (!this.draft.slots) this.draft = { ...core.recommendPlan(state), ...this.draft, slots: core.recommendPlan(state).slots };
    this.input(body, this.draft.suggested, this.draft.name, 0, 48, value => { this.draft.name = value; });
    let cursor = 64;
    if (this.draft.sequel) cursor += this.paragraph(body, '系列续作：继承原作的模块组合与部分关注，玩家期待更高。', cursor, true);
    const formTop = cursor;
    // Every slot comes filled in (what the company has, or a recommendation) and folded into one line;
    // the player opens only the slot they want to change. The first title's gameplay is the origin's.
    const first = core.firstGameCore(state);
    const open = this.draft.open || (this.draft.open = {});
    const rent: string[] = this.draft.rent || (this.draft.rent = []);
    const statusOf = (key: string) => {
      const need = core.tierFor(key, this.draft.scale || 0);
      const info = core.lineInfo(state, key);
      if (info.level >= need) return { need, text: '已有', tone: colors.green, brick: 'have' };
      if (rent.includes(key)) return { need, text: '租用', tone: colors.blue, brick: 'have' };
      if (info.level > 0 || info.next > 0) return { need, text: '补到 ' + need + ' 档', tone: colors.amber, brick: 'partial' };
      return { need, text: '新做', tone: colors.amber, brick: 'missing' };
    };
    for (const slot of core.SLOTS) {
      if (!core.slotOpen(state, slot)) continue;
      const chosen: string[] = this.draft.slots?.[slot.key] || [];
      const fixed = !!this.draft.sequel || (slot.key === 'core' && !!first);
      const expanded = !!open[slot.key];
      const color = core.AXES[slot.axis].color;
      const summary = chosen.map(key => core.MODULES[key].name + '（' + statusOf(key).text + '）').join('、') || '未选';
      const row = this.box(body, 'Slot', 0, cursor, inner, 52, expanded ? colors.soft : colors.paper, 10);
      new Pen(this.box(row, 'Rim', 0, 0, inner, 52).addComponent(Graphics)).frame(0, 0, inner, 52, expanded ? colors.green : colors.line, expanded ? 2 : 1, 10);
      chosen.slice(0, 2).forEach((key: string, index: number) => {
        const module = core.MODULES[key];
        const status = statusOf(key);
        drawBrick(this.canvasNode(row, 'Brick', 8 + index * 34, 10, 30, 30).pen, 0, 0, 30, color, module.glyph, status.need, status.brick);
      });
      const textLeft = 8 + Math.max(1, Math.min(2, chosen.length)) * 34 + 4;
      this.text(row, slot.name + (this.draft.sequel && fixed ? ' · 沿用原作' : ''), textLeft, 6, inner - textLeft - 40, 20, 13, colors.ink, true);
      this.text(row, summary, textLeft, 26, inner - textLeft - 40, 20, 11, colors.muted);
      this.text(row, expanded ? '收起' : '调整', inner - 48, 16, 40, 20, 11, colors.green, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
      this.clickable(row, () => { open[slot.key] = !expanded; this.render(); });
      cursor += 60;
      if (!expanded) continue;
      const unlocked = Object.keys(core.MODULES).filter(key => core.MODULES[key].slot === slot.key && core.moduleOpen(state, key));
      // A locked slot still opens like any other; its list just holds the one choice already picked,
      // so there is nothing to switch to. No grey 固定 label and no explanation popup.
      const options = fixed ? unlocked.filter(key => chosen.includes(key)) : unlocked;
      const cell = (inner - 16) / 3;
      options.forEach((key: string, index: number) => {
        const on = chosen.includes(key);
        const module = core.MODULES[key];
        const status = statusOf(key);
        // An art title keeps one visual style: mixing pixel and hand-drawn libraries is not a choice.
        const pickedStyle = chosen.map(line => core.MODULES[line].style).find(Boolean) || '';
        const styleClash = slot.key === 'art' && !!pickedStyle && !!module.style && module.style !== pickedStyle;
        const blocked = core.lineBlocked(this.draft, key) || (styleClash ? '与已选风格不同' : '');
        const x = (index % 3) * (cell + 8);
        const y = cursor + Math.floor(index / 3) * 92;
        const node = this.box(body, 'Pick', x, y, cell, 84, blocked ? colors.pale : on ? colors.soft : colors.paper, 10);
        new Pen(this.box(node, 'Rim', 0, 0, cell, 84).addComponent(Graphics)).frame(0, 0, cell, 84, on ? colors.green : colors.line, on ? 2 : 1, 10);
        drawBrick(this.canvasNode(node, 'Brick', (cell - 40) / 2, 4, 40, 40).pen, 0, 0, 40, blocked ? colors.line : color, module.glyph, status.need, blocked ? 'missing' : status.brick);
        this.text(node, module.name, 4, 46, cell - 8, 18, 11, blocked ? colors.muted : colors.ink, true).horizontalAlign = HorizontalTextAlignment.CENTER;
        this.text(node, blocked || '需 ' + status.need + ' 档 · ' + status.text, 2, 64, cell - 4, 16, 10, blocked ? colors.muted : status.tone).horizontalAlign = HorizontalTextAlignment.CENTER;
        this.clickable(node, () => {
          // A line that needs something on another axis cannot go in; say why instead of doing nothing.
          if (blocked && !on) { this.notify(module.name + blocked + '。'); return; }
          const list = (this.draft.slots[slot.key] || []).slice();
          if (on) { if (list.length > slot.min) list.splice(list.indexOf(key), 1); }
          else if (slot.max === 1) list.splice(0, list.length, key);
          else if (list.length < slot.max) list.push(key);
          this.draft.slots = { ...this.draft.slots, [slot.key]: list };
          this.draft.rent = rent.filter(line => core.planLines(this.draft).includes(line));
          this.render();
        });
      });
      cursor += Math.max(1, Math.ceil(options.length / 3)) * 92 + 4;
      // A line the company does not have can be rented instead of built: no work, capped quality, paid
      // once now. Gameplay never; the first title one line, later titles two. It never joins the library.
      const renting = new Set(core.planModules(state, this.draft).filter((item: any) => item.rented).map((item: any) => item.line));
      for (const key of chosen.filter(line => core.rentable(line) && core.lineInfo(state, line).level < core.tierFor(line, this.draft.scale || 0))) {
        const on = rent.includes(key);
        const full = !on && renting.size >= core.rentLimit(state);
        const price = core.rentPrice(key, this.draft.scale || 0);
        this.button(body, (on ? '改为自己做：' : '租用：') + core.MODULES[key].name + (on ? '' : full ? '（' + (core.releases(state) ? '每作' : '首作') + '最多租 ' + core.rentLimit(state) + ' 个）' : '（质量 ' + core.RENT_QUALITY + '，' + content.money(price.price) + '）'), 0, cursor, inner, 38, () => {
          this.draft.rent = on ? rent.filter(line => line !== key) : [...rent, key];
          this.render();
        }, on, full);
        cursor += 44;
      }
    }
    this.anchors.set('project-form', this.box(body, 'FormAnchor', 0, formTop, inner, cursor - formTop - 8));
    const openScales = core.SCALES.map((_scale: any, index: number) => index).filter((index: number) => core.scaleOpen(state, index));
    if (openScales.length > 1) {
      this.text(body, '体量', 0, cursor, inner, 24, 15, colors.ink, true);
      cursor += 30;
      openScales.forEach((index: number, position: number) => {
        const cell = (inner - 8 * (openScales.length - 1)) / openScales.length;
        this.button(body, core.SCALES[index].name, position * (cell + 8), cursor, cell, 42, () => { this.draft.scale = index; this.render(); }, this.draft.scale === index);
      });
      cursor += 54;
    }
    cursor += this.paragraph(body, content.planPreview(state, this.draft), cursor, true, 0, inner, 13);
    const coming = core.nextUnlocks(state);
    if (coming.length) cursor += this.paragraph(body, '下一作发售后开放：' + coming.join('、'), cursor, true, 0, inner, 12);
    this.button(body, '确认立项', 0, cursor, inner, 48, () => this.dispatch('form-submit'), true, !!core.planIssue(state, this.draft) || !core.scaleOpen(state, this.draft.scale));
    return cursor + 66;
  }

  private renderHistory(body: Node) {
    let cursor = 0;
    for (const report of [...this.state.reports].reverse().slice(0, 24)) cursor = this.drawBlock(body, { type: 'lines', title: core.monthText(report.month), items: [['收入', content.money(report.income)], ['支出', content.money(report.expense)], ['月末资金', content.money(report.closing)]] }, cursor);
    for (const record of this.state.history.slice(0, 60)) cursor += this.paragraph(body, `${core.dateText(record.day)} · ${record.title}：${record.text}`, cursor, true, 0, this.width - 40, 12);
    if (!cursor) cursor += this.paragraph(body, '经营记录会在实际工作和收支发生后出现。', cursor, true);
    return cursor;
  }

  private drawBlock(parent: Node, block: any, y: number): number {
    const width = this.width - 40;
    switch (block.type) {
      case 'toggle': {
        if (block.anchor) this.anchors.set(block.anchor, this.box(parent, 'ToggleAnchor', 0, y, width, 36));
        this.text(parent, block.text, 0, y, width - 72, 36, 14, colors.ink, true);
        const toggle = this.box(parent, block.text + 'Switch', width - 56, y + 3, 56, 30, block.value ? colors.green : colors.line, 15);
        this.box(toggle, 'Thumb', block.value ? 28 : 4, 4, 24, 22, colors.paper, 11);
        // Keep the block's own payload (which employee, which setting) instead of dropping it.
        this.clickable(toggle, () => this.dispatch(block.action, { ...(block.data || {}), enabled: !block.value, value: !block.value }));
        return y + 48;
      }
      case 'text': return y + this.paragraph(parent, block.text, y, block.muted, 0, width, block.muted ? 13 : 14);
      case 'help': {
        // Long explanations hide behind a small "?" row instead of filling the page by default.
        const open = this.helpKey === block.key;
        this.button(parent, (open ? '▾ ' : '▸ ') + block.title, 0, y, width, 38, () => {
          this.helpKey = open ? '' : block.key;
          this.render();
        }, false, false, 'CircleHelp');
        let next = y + 44;
        if (open) next += this.paragraph(parent, block.text, next, true, 0, width, 13);
        return next + 8;
      }
      case 'dropdown': {
        // One control replaces a wall of sort tabs: the label shows the current choice and the list
        // of ways to sort opens in place, exactly where the old tabs used to be.
        const open = this.helpKey === block.key;
        const label = (block.label ? block.label + ' · ' : '') + block.text + (open ? '  ▲' : '  ▼');
        this.button(parent, label, 0, y, width, 42, () => { this.helpKey = open ? '' : block.key; this.render(); }, false, false, 'ArrowDown', block.anchor);
        let next = y + 48;
        if (open) {
          const columns = 3;
          const cell = (width - (columns - 1) * 6) / columns;
          block.items.forEach((item: any, index: number) => {
            this.button(parent, item.text, (index % columns) * (cell + 6), next + Math.floor(index / columns) * 44, cell, 38, () => {
              this.routes[this.routes.length - 1] = { ...this.routes[this.routes.length - 1], id: item.value };
              this.helpKey = '';
              this.render();
            }, item.value === block.value);
          });
          next += Math.ceil(block.items.length / columns) * 44 + 6;
        }
        return next + 4;
      }
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
        if (this.shapePen && (node as any).inBatch) this.shapePen.rect((node as any).ax, (node as any).ay, width, height, '#fff8e6', 8);
        else new Pen(node.addComponent(Graphics)).rect(0, 0, width, height, '#fff8e6', 8);
        this.image(node, 'icons/' + (block.icon || 'Star'), 12, 10, 18, 18, colors.amber);
        return y + height + 12;
      }
      case 'lines': {
        if (block.title) { this.text(parent, block.title, 0, y, width, 28, 16, colors.ink, true); y += 34; }
        for (const [name, value, tone] of block.items) {
          this.text(parent, name, 0, y, width * 0.48, 34, 13, colors.muted);
          this.text(parent, value, width * 0.48, y, width * 0.52, 34, 13, tone ? toneColors[tone] || colors.ink : colors.ink, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
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
          const icon = item.icon || (item.action === 'priority' ? (String(item.text).includes('提高') ? 'ArrowUp' : 'ArrowDown') : actionIcons[item.action] || 'ChevronRight');
          this.button(parent, item.text, left, row, cell - (item.help ? 44 : 0), 46, () => this.dispatch(item.action, item.data), true, !!item.disabled, icon, item.anchor);
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
        // Menu choices name themselves with `text`, event choices with `title`.
        for (const item of block.items) y += this.choice(parent, y, item.text ?? item.title ?? '', item.detail, () => this.dispatch(item.action, item.data || { choice: item.id }), { tag: item.tag || (item.recommended ? '推荐' : ''), highlight: item.recommended, disabled: item.disabled, anchor: item.anchor }) + 10;
        if (block.anchor) this.anchors.set(block.anchor, this.box(parent, 'GroupAnchor', 0, start, width, y - start - 10));
        return y + 4;
      }
      case 'actions': {
        // Menu actions as cards: an icon, what it does and why it might be greyed out, instead of a
        // column of identical green bars.
        const start = y;
        for (const item of block.items) y += this.choice(parent, y, item.text, item.detail, () => this.dispatch(item.action, item.data), { icon: item.icon || 'ChevronRight', tag: item.tag, tagColor: colors.green, disabled: item.disabled, anchor: item.anchor, emphasis: item.emphasis, compact: String(item.detail || '').length <= 24 }) + 8;
        if (block.anchor) this.anchors.set(block.anchor, this.box(parent, 'GroupAnchor', 0, start, width, y - start - 8));
        return y + 6;
      }
      case 'tabs': {
        const columns = Math.min(3, block.items.length);
        const cell = (width - (columns - 1) * 6) / columns;
        block.items.forEach((item: any, index: number) => this.button(parent, item.text, (index % columns) * (cell + 6), y + Math.floor(index / columns) * 44, cell, 38, () => { this.routes[this.routes.length - 1] = item.route; this.helpKey = ''; this.render(); }, item.active, !!item.locked));
        return y + Math.ceil(block.items.length / columns) * 44 + 6;
      }
      case 'card': {
        const start = y;
        this.text(parent, block.title, 0, y, width, 26, 16, colors.ink, true);
        y += 30;
        y += this.paragraph(parent, block.text, y, true, 0, width, 13);
        const button = block.button;
        this.button(parent, button.text, 0, y, width, 44, () => this.dispatch(button.action, button.data), true, !!button.disabled, button.icon || actionIcons[button.action] || 'ChevronRight', button.anchor);
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
          const bestAbility = core.primaryAbility(person);
          const bestText = core.ABILITIES.find(ability => ability.key === bestAbility)?.name + ' ' + Math.round(person.abilities[bestAbility]);
          const detail = `月薪 ${content.money(person.wage)} · 速度 ${person.speed}\n最强：${bestText} · 潜力${core.potentialBand(person)}`;
          y += this.choice(parent, y, (person.fame ? '★ ' : '') + person.name, detail, () => this.openMenu('candidate', person.id), { tag: person.hired ? '已录用' : person.fame ? '名人' : '', tagColor: person.fame ? colors.gold : colors.green, disabled: person.hired, anchor: 'candidate-' + index, radar: person.abilities, chips: core.personTags(person), avatar: person.id, avatarLook: person.look }) + 10;
        });
        this.anchors.set('candidates', this.box(parent, 'CandidatesAnchor', 0, start, width, y - start - 10));
        return y;
      }
      case 'staff':
        if (!this.state.staff.length) return y + this.paragraph(parent, '还没有同事，先发布一份招聘。', y, true);
        const order = (block.order || []).map((id: string) => this.state.staff.find((person: any) => person.id === id)).filter(Boolean);
        const people = order.length ? order : this.state.staff;
        for (let index = 0; index < people.length; index++) {
          const person = people[index];
          // Tags stay on the card: they are how the player ties a later slowdown to overtime.
          const chips = core.personTags(person);
          const bestAbility = core.primaryAbility(person);
          const detail = `月薪 ${content.money(person.wage)} · ${core.ABILITIES.find(ability => ability.key === bestAbility)?.name} ${Math.round(person.abilities[bestAbility])}${person.leaveUntil > this.state.day ? ' · 外出中' : ''}${person.mentor ? ' · 带教中' : ''}`;
          y += this.choice(parent, y, person.name + ' · ' + core.ROLES[person.role].name, detail, () => this.openMenu('person', person.id), { radar: person.abilities, chips, avatar: person.id, avatarLook: person.look, anchor: 'staff-' + index }) + 10;
        }
        return y;
      case 'avatar': {
        drawAvatar(this.canvasNode(parent, 'Avatar', 0, y, 56, 56).pen, 28, 28, 22, block.id, block.look);
        this.text(parent, block.text, 68, y + 8, width - 68, 40, 14, colors.ink, true);
        return y + 64;
      }
      case 'ability-radar': {
        const values = this.abilityValues(block.abilities);
        const labels = core.ABILITIES.map(ability => ability.name);
        return y + this.radar(parent, y, { dimensions: values, labels }, '', undefined, 0, false) + 6;
      }
      case 'compose': {
        // One layer of a recipe as a workbench: the whole stands on top, its parts sit on the table below.
        const top = 72;
        const size = 50;
        const columns = Math.max(1, Math.min(4, Math.floor((width + 12) / (size + 26))));
        const rows = Math.max(1, Math.ceil(block.children.length / columns));
        const height = Math.max(top + 34 + rows * (size + 22), this.tipLayout('Compose')?.bottom || 0);
        const { node, pen } = this.canvasNode(parent, 'Compose', 0, y, width, height);
        pen.rect(0, 0, width, height, '#f1e7d6', 10);
        pen.rect(0, top + 18, width, height - top - 18, '#dcc6a3', 10);
        pen.rect(0, top + 14, width, 8, '#b48a5a', 3);
        const rootSize = 60;
        const pitch = width / columns;
        const spots = block.children.map((_child: any, index: number) => ({ x: pitch * (index % columns) + (pitch - size) / 2, y: top + 34 + Math.floor(index / columns) * (size + 22) }));
        for (const spot of spots) pen.line(width / 2, 8 + rootSize, spot.x + size / 2, spot.y + 2, '#b48a5a', 1.5);
        const color = (item: any) => core.AXES[item.axis]?.color || colors.green;
        drawBrick(pen, (width - rootSize) / 2, 6, rootSize, color(block.root), block.root.glyph || 'star', block.root.level || 1, block.root.status, block.root.oneOff);
        this.brickSpot(node, (width - rootSize) / 2, 6, rootSize, block.root, 6);
        block.children.forEach((child: any, index: number) => {
          drawBrick(pen, spots[index].x, spots[index].y, size, color(child), child.glyph, child.level || 1, child.status, child.oneOff);
          this.brickSpot(node, spots[index].x, spots[index].y, size, child, 24);
          // A light plate under each name keeps it readable on the wooden table.
          pen.rect(spots[index].x - (pitch - size) / 2 + 4, spots[index].y + size + 2, pitch - 8, 18, '#fffaf0', 6, 235);
          this.text(node, child.name, spots[index].x - (pitch - size) / 2 + 4, spots[index].y + size + 2, pitch - 8, 18, 11, colors.ink, true).horizontalAlign = HorizontalTextAlignment.CENTER;
        });
        const rootLeft = (width + rootSize) / 2 + 8;
        const rootWidth = Math.max(40, width - rootLeft - 4);
        pen.rect(rootLeft, 6 + rootSize / 2 - 11, rootWidth, 22, '#fffaf0', 6, 235);
        this.text(node, block.root.name, rootLeft + 4, 6 + rootSize / 2 - 10, rootWidth - 8, 20, 12, colors.ink, true);
        this.brickTipCard(node, width, height);
        return y + height + 8;
      }
      case 'bricks': {
        // A shelf of bricks with short names; tapping one opens its card.
        const size = 52;
        const columns = Math.max(1, Math.floor((width + 8) / (size + 30)));
        const pitch = width / columns;
        const rows = Math.max(1, Math.ceil(block.items.length / columns));
        const tips = block.items.some((item: any) => !item.open);
        const height = Math.max(rows * (size + 40), tips ? this.tipLayout('Bricks')?.bottom || 0 : 0);
        const { node, pen } = this.canvasNode(parent, 'Bricks', 0, y, width, height);
        block.items.forEach((item: any, index: number) => {
          const x = pitch * (index % columns) + (pitch - size) / 2;
          const top = Math.floor(index / columns) * (size + 40);
          drawBrick(pen, x, top, size, core.AXES[item.axis]?.color || colors.green, item.glyph, item.level || 1, item.status, item.oneOff);
          this.text(node, item.name, pitch * (index % columns) + 2, top + size + 2, pitch - 4, 30, 10, item.status === 'missing' ? colors.muted : colors.ink).horizontalAlign = HorizontalTextAlignment.CENTER;
          // A shelf opens in place instead of showing a card.
          if (item.open) {
            const spot = this.box(node, 'Spot', x, top, size, size + 32);
            this.clickable(spot, () => {
              const route = this.routes[this.routes.length - 1];
              this.brickTip = null;
              this.routes[this.routes.length - 1] = { ...route, id: item.open };
              this.render();
            });
          } else this.brickSpot(node, x, top, size, item);
        });
        if (tips) this.brickTipCard(node, width, height);
        return y + height + 6;
      }
      case 'tags': {
        y = this.chips(parent, block.items, 0, y, width) + 2;
        for (const item of block.items) if (item.text) y += this.paragraph(parent, item.name + '（' + (item.kind || '') + (item.rarity ? ' · ' + item.rarity : '') + '）：' + item.text, y, true, 0, width, 12) - 4;
        return y + 6;
      }
      case 'trace': return y + this.trace(parent, y, block.trace, block.history) + 10;
      case 'achievements':
        for (const item of block.items) {
          const done = item.day !== null;
          const hidden = item.group === 'hidden' && !done;
          const progress = !done && item.progress ? '\n进度 ' + (item.progress[2] === 'money'
            ? content.money(Math.min(item.progress[0], item.progress[1])) + ' / ' + content.money(item.progress[1])
            : Math.round(Math.min(item.progress[0], item.progress[1])) + ' / ' + item.progress[1]) : '';
          y += this.choice(parent, y, hidden ? '???' : item.title, hidden ? '隐藏成就，达成后揭晓。' : item.text + (item.reward ? '\n奖励：' + item.reward : '') + (done ? '\n' + core.dateText(item.day) + '达成' : progress), () => undefined, { icon: done ? 'Trophy' : hidden ? 'CircleHelp' : 'Lock', tag: done ? '已达成' : '', tagColor: colors.gold, highlight: done && item.group === 'milestone' }) + 8;
        }
        return y + 4;
      case 'dream': {
        const start = y;
        const node = this.box(parent, 'Dream', 0, y, width, 40);
        let cursor = 18;
        for (const line of block.lines) cursor += this.paragraph(node, line, cursor, false, 18, width - 36, 14, '#e8eefc') + 4;
        const height = cursor + 12;
        node.getComponent(UITransform).setContentSize(width, height);
        const sky = this.box(parent, 'DreamSky', 0, start, width, height, '#141a33', 14);
        sky.setSiblingIndex(node.getSiblingIndex());
        const stars = new Pen(this.box(sky, 'Stars', 0, 0, width, height).addComponent(Graphics));
        for (let index = 0; index < 26; index++) stars.circle((index * 97) % width, (index * 53) % height, 1 + (index % 3) * 0.6, '#fff6d0', 120 + (index % 4) * 30);
        const opacity = node.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(1.6, { opacity: 255 }).start();
        return y + height + 14;
      }
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
          y += this.choice(parent, y, '《' + book.name + '》', `${content.number(book.units)} 份 · 回款 ${content.money(book.received)} · 评价 ${book.reviewScore.toFixed(1)}\n${this.state.day - book.released < 7 ? '首周统计中' : book.firstRanks ? '全国首周榜第 ' + book.firstRanks[1] + ' 名' : '首周名次未知'}`, () => this.openMenu('book', book.id), { tag: balance >= 0 ? '已回本' : '未回本', tagColor: balance >= 0 ? colors.green : colors.muted, anchor: 'book-' + index }) + 10;
        });
        return y;
      case 'cover': return y + this.cover(parent, y, block.book) + 14;
      case 'chart': return y + this.chart(parent, y, block.book) + 14;
      case 'scatter': return y + this.scatter(parent, y, block) + 10;
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
        const start = y;
        for (const item of block.items) {
          const dimension = core.DIMENSIONS.find(entry => entry.key === item.key);
          const idle = item.remaining > 0.0001 && item.days === null;
          const slow = item.key === block.bottleneck;
          const row = this.box(parent, 'Dim', 0, y, width, 46, slow ? '#fff8e6' : idle ? '#f4f1ea' : colors.paper, 8);
          this.text(row, dimension?.name || item.key, 12, 4, width - 150, 18, 13, colors.ink, true);
          this.text(row, item.remaining > 0 ? item.remaining.toFixed(0) + ' 人日' : '已完成', width - 140, 4, 128, 18, 12, item.remaining > 0 ? colors.muted : colors.green).horizontalAlign = HorizontalTextAlignment.RIGHT;
          const note = item.days === null ? (item.remaining > 0.0001 ? '无人负责 · 点开分工' : '') : '预计 ' + item.days + ' 天' + (slow && item.key === 'stability' ? ' · 测试最慢' : '');
          this.text(row, note, 12, 24, width - 180, 16, 11, idle ? colors.danger : slow ? colors.amber : colors.muted);
          if (slow) this.text(row, '瓶颈', width - 72, 24, 60, 16, 11, colors.amber, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
          else if (idle) this.text(row, '缺人', width - 72, 24, 60, 16, 11, colors.danger, true).horizontalAlign = HorizontalTextAlignment.RIGHT;
          // Tap a row to open its detail page (score, who's on it, and a shortcut to assign).
          this.clickable(row, () => this.openMenu('dimension', block.projectId, false, item.key));
          y += 50;
        }
        // One ring for all six rows: the tutorial explains the whole scoreboard, not just the first row.
        this.anchors.set('project-dimensions', this.box(parent, 'DimensionsAnchor', 0, start, width, y - start - 4));
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
          // A finished item keeps its box (so the assignment is still visible) but stops looking like
          // work in progress: pale card, muted text, and "已完成" where the ability used to be.
          const done = !!work.done;
          const column = index % columns;
          const line = Math.floor(index / columns);
          const node = this.box(card, 'Work-' + work.key, 12 + column * (cell + 8), header + line * 50, cell, 42, done ? colors.pale : on ? colors.green : colors.soft, 8);
          const shortName = work.key === 'discover' ? '找缺陷' : work.key === 'repair' ? '修缺陷' : work.name;
          this.text(node, shortName, 2, 2, cell - 4, 22, 12, on && !done ? colors.paper : colors.muted, true).horizontalAlign = HorizontalTextAlignment.CENTER;
          const sub = done ? (on ? '已完成 · 让出工时' : '已完成') : '能力 ' + (work.ability ?? '—');
          this.text(node, sub, 2, 23, cell - 4, 16, 9, on && !done ? '#e8f3ed' : colors.muted).horizontalAlign = HorizontalTextAlignment.CENTER;
          this.clickable(node, () => {
            // 界面只报“谁、哪个项目、点了哪项”，由 core 按存档取反并保证不为空。
            // 旧版在这里自己拼名单：拼出空表时三块工作会一起灭掉，之后再点也写不进正确的项目。
            const route = this.routes[this.routes.length - 1] || {};
            const fallback = core.projectOpen(this.state)[0];
            const projectId = block.projectId || route.id || (fallback ? fallback.id : '');
            const person = this.state.staff.find((item: any) => item.id === block.personId);
            if (!projectId || !person) { this.notify('这个项目或成员已经不存在了，请返回重进。'); return; }
            const name = core.WORKS.find(entry => entry.key === work.key)?.name || work.key;
            // 用 assignedWorks 而不是 personWorks 算 after：personWorks 受 belongsTo 门控，
            // 而真正写状态的 toggleAssign 用的是 assignedWorks。两者不一致时，会把“调入本项目”误报成“已退出”，
            // 且跨项目看人时按钮全灰。统一来源后提示才正确，点击也能把人真正调过来。
            const next = core.toggleAssign(this.state, projectId, person.id, work.key);
            const after = core.assignedWorks(core.activeProject(next, projectId) || { id: projectId }, person);
            this.apply(next);
            // Turning the last box off no longer bounces back to the home trade: the person idles.
            if (!after.length) this.notify(person.name + '：已空闲，不做任何工作，工资照付。');
            else this.notify(person.name + (after.includes(work.key) ? ' 已加入「' + name + '」' : ' 已退出「' + name + '」'));
          });
        });
        // The lesson is "everyone picks their work", so the ring has to hug the whole grid. Anchoring
        // the first cell made it look like only 创意 could be chosen.
        this.anchors.set('person-assign-' + block.index, this.box(card, 'AssignGrid', 8, header - 4, width - 16, rows * 50 + 4));
        // Two shortcuts share the row: the one item this person is best at, or every item. There is no
        // "idle" button any more — turning every box off still idles them, but it is not offered as a
        // shortcut because a normal click on the last lit box is what a player means by "stop this".
        const chip = (width - 32) / 2;
        const chipX = (index: number) => 12 + index * (chip + 8);
        this.button(card, '只做擅长', chipX(0), header + rows * 50 + 2, chip, 36, () => {
          const route = this.routes[this.routes.length - 1] || {};
          const project = core.activeProject(this.state, route.id) || core.projectOpen(this.state)[0];
          const target = this.state.staff.find((item: any) => item.id === block.personId);
          if (!project || !target) { this.notify('这个项目或成员已经不存在了，请返回重进。'); return; }
          // Best of the trade, not the first home key: coders and designers have two trades.
          const best = core.homeWork(target);
          const name = core.WORKS.find((entry: any) => entry.key === best)?.name || best;
          this.apply(core.assign(this.state, project.id, target.id, [best]));
          this.notify(target.name + '：只做擅长的一项（' + name + '）。');
        }, false);
        this.button(card, '全部都做', chipX(1), header + rows * 50 + 2, chip, 36, () => {
          const route = this.routes[this.routes.length - 1] || {};
          const project = core.activeProject(this.state, route.id) || core.projectOpen(this.state)[0];
          const target = this.state.staff.find((item: any) => item.id === block.personId);
          if (!project || !target) { this.notify('这个项目或成员已经不存在了，请返回重进。'); return; }
          this.apply(core.assign(this.state, project.id, target.id, [...core.WORK_KEYS]));
          this.notify(target.name + '：所有工作都接手。');
        }, false);
        // No idle shortcut: the two buttons above fill the row exactly. A third one used to sit at
        // chipX(2), which started past the card's right edge and showed up as a sliver of a button.
        // Turning off the last work box is still how a player idles someone.
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

  // The market page: reception across, first-week sales up, one point per title; tapping one names it.
  private scatter(parent: Node, y: number, block: any) {
    const width = this.width - 40;
    const origin = y;
    let x = 0;
    for (const item of block.legend) {
      const cell = Math.max(64, item.text.length * 14 + 34);
      if (x + cell > width) { x = 0; y += 36; }
      const { node, pen } = this.canvasNode(parent, 'Legend', x, y, cell, 30);
      pen.rect(0, 0, cell, 30, item.active ? colors.soft : colors.paper, 15);
      pen.frame(0, 0, cell, 30, item.active ? colors.green : colors.line, item.active ? 2 : 1, 15);
      pen.circle(15, 15, 6, item.color);
      this.text(node, item.text, 26, 0, cell - 30, 30, 12, colors.ink, item.active);
      this.clickable(node, () => { this.routes[this.routes.length - 1] = item.route; this.scatterPick = ''; this.render(); });
      x += cell + 6;
    }
    y += block.legend.length ? 40 : 0;
    const height = 230;
    const left = 46;
    const right = width - 10;
    const top = 10;
    const bottom = height - 26;
    const points = block.points || [];
    const xs = points.map((point: any) => point.x);
    const low = Math.max(0, Math.floor(Math.min(40, ...xs) / 10) * 10);
    const high = Math.min(100, Math.ceil(Math.max(70, ...xs) / 10) * 10);
    const peak = Math.max(10, ...points.map((point: any) => point.y)) * 1.1;
    const px = (value: number) => left + (right - left) * (value - low) / Math.max(1, high - low);
    const py = (value: number) => bottom - (bottom - top) * value / peak;
    const { node, pen } = this.canvasNode(parent, 'Scatter', 0, y, width, height);
    pen.rect(left, top, right - left, bottom - top, '#fbf8f1', 4);
    for (const fraction of [0, 0.5, 1]) {
      const lineY = py(peak / 1.1 * fraction);
      pen.line(left, lineY, right, lineY, colors.line, 1);
      this.text(node, content.number(peak / 1.1 * fraction), 0, lineY - 8, left - 6, 16, 10, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
    }
    this.text(node, '口碑 ' + low, left, height - 20, 80, 16, 10, colors.muted);
    this.text(node, String(high), right - 40, height - 20, 40, 16, 10, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
    const ordered = [...points].sort((a: any, b: any) => Number(a.own) - Number(b.own));
    for (const point of ordered) {
      const cx = px(point.x);
      const cy = py(point.y);
      if (point.own) pen.circle(cx, cy, 9, colors.night);
      pen.circle(cx, cy, point.own ? 7 : 5, point.color, point.own ? 255 : 220);
      if (point.id === this.scatterPick) pen.frame(cx - 10, cy - 10, 20, 20, colors.ink, 2, 10);
    }
    let touchStart: Vec2 | null = null;
    node.on(Node.EventType.TOUCH_START, (event: EventTouch) => { touchStart = event.getUILocation().clone(); });
    node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
      const location = event.getUILocation();
      if (!touchStart || Math.hypot(location.x - touchStart.x, location.y - touchStart.y) > 12) return;
      const local = node.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(location.x, location.y, 0));
      let best: any = null;
      let distance = 18;
      for (const point of points) {
        const gap = Math.hypot(px(point.x) - local.x, py(point.y) + local.y);
        if (gap < distance) { distance = gap; best = point; }
      }
      this.scatterPick = best ? best.id : '';
      this.render();
    });
    node.on(Node.EventType.TOUCH_CANCEL, () => { touchStart = null; });
    y += height + 6;
    if (block.few) y += this.paragraph(parent, '样本太少，看不出什么。', y, true, 0, width, 12);
    const picked = points.find((point: any) => point.id === this.scatterPick);
    if (picked) y += this.paragraph(parent, picked.name + ' · ' + picked.studio + '\n口碑 ' + Math.round(picked.x) + ' · 首周 ' + content.number(picked.y) + ' 份' + (picked.tags.length ? ' · ' + picked.tags.join('、') : ''), y, false, 0, width, 13);
    return y - origin;
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
      const inBillions = peak >= 10000;
      const axisScale = inBillions ? 10000 : 1;
      this.text(node, inBillions ? '亿元' : '万元', 0, 4, left - 6, 18, 10, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
      for (const fraction of [0, 0.5, 1]) {
        const value = peak * fraction;
        const axisY = valueY(value);
        pen.line(left, axisY, right, axisY, colors.line, 1);
        const shown = value / axisScale;
        this.text(node, shown.toFixed(inBillions ? 2 : shown >= 100 ? 0 : 2), 0, axisY - 8, left - 6, 16, 10, colors.muted).horizontalAlign = HorizontalTextAlignment.RIGHT;
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
      label.string = '+' + content.money(0);
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

  // Non-blocking banner for milestones; does not pause the game. Something learned arrives as a short
  // chat bubble instead: who said it, a brick, two sentences; a tap skips it.
  private celebrate() {
    if (this.celebrating || !this.celebrations.length || this.routes.length) return;
    const item = this.celebrations.shift();
    this.celebrating = true;
    const width = this.width - 40;
    if (item.kind === 'unlock') {
      const module = item.line ? core.MODULES[item.line] : null;
      const color = core.AXES[module ? module.axis : item.axis]?.color || colors.green;
      // The height is only known after the text has been laid out. Drawing the background at the
      // original 40px and then resizing the node left its lower half transparent, so the body text
      // sat on the page instead of on the bubble. Paint the paper at the final height instead.
      const bubble = this.box(this.effects, 'Bubble', 20, this.top + 98, width, 40);
      const textHeight = this.paragraph(bubble, item.text, 34, false, 64, width - 78, 13);
      const height = Math.max(70, textHeight + 44);
      bubble.getComponent(UITransform).setContentSize(width, height);
      const paper = this.box(bubble, 'Paper', 0, 0, width, height, colors.paper, 14, 250);
      paper.setSiblingIndex(0);
      const { pen } = this.canvasNode(bubble, 'Face', 10, 10, 44, 44);
      drawBrick(pen, 0, 0, 44, color, module ? module.glyph : 'star', 1, 'have');
      new Pen(this.box(bubble, 'Rim', 0, 0, width, height).addComponent(Graphics)).frame(0, 0, width, height, color, 2, 14);
      this.text(bubble, item.title, 64, 8, width - 78, 22, 14, colors.ink, true);
      const opacity = bubble.addComponent(UIOpacity);
      opacity.opacity = 0;
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        Tween.stopAllByTarget(opacity);
        bubble.destroy();
        this.celebrating = false;
        this.celebrate();
      };
      this.clickable(bubble, close);
      tween(opacity).to(0.2, { opacity: 255 }).delay(4).to(0.3, { opacity: 0 }).call(close).start();
      return;
    }
    const big = ['breakeven', 'office', 'record', 'warning'].includes(item.kind);
    const banner = this.box(this.effects, 'Banner', 20, this.top + 98, width, 70, item.kind === 'warning' ? colors.danger : big ? colors.amber : colors.night, 14, 240);
    this.image(banner, 'icons/' + (({ breakeven: 'Trophy', office: 'Building2', record: 'Star', units: 'TrendingUp', settle: 'Coins', warning: 'Award' } as any)[item.kind] || 'Sparkles'), 16, 24, 22, 22, '#ffffff');
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
    if (!this.routes.length && !this.state.event && !this.state.over) {
      this.playing = true;
      this.elapsed = 0;
    }
    this.render();
  }

  private renderGuide() {
    this.menuAck = null;
    this.menuTapNodes.clear();
    this.guideAnchor = '';
    const route = this.routes.length ? this.routes[this.routes.length - 1] : null;
    const step = content.guide(this.state, route, this.playing);
    if (!step) return;
    this.guideAnchor = step.anchor;
    // A forced tip can point at any card in a group. Highlight the first one, but accept every card
    // in the group as the tap that clears it. No matched anchors means no restriction, so a tip can
    // never trap the player on a page where its target failed to render.
    if (route && step.tap && step.tapGroup) {
      const prefix = step.tapGroup + '-';
      this.anchors.forEach((node, key) => { if (key.startsWith(prefix)) this.menuTapNodes.add(node); });
    }
    // A "知道了" tip is optional: the highlighted control stays live, so the player may act on it or
    // simply dismiss the tip. Never shield the highlight itself. Whatever the player presses counts
    // as having read it — on the main screen as well as inside menus, where anchors are often whole
    // groups of rows with no button of their own.
    if (step.ack || (route && step.tap)) this.menuAck = step.ack || step.tap;
    const target = this.anchors.get(step.anchor);
    let rect = null;
    if (target) {
      if (this.scrollView && target.parent === this.scrollBody) {
        const offset = -target.position.y;
        const size = target.getComponent(UITransform).height;
        const goal = guideScrollTarget(this.scrollKeep, offset, size, this.scrollHeight);
        if (goal !== null) this.scrollView.scrollToOffset(new Vec2(0, goal), 0);
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
    // Main screen: only what is outside the highlight is swallowed. The highlight itself always stays
    // clickable — shielding it made a "知道了" tip pointing at a navigation button look broken (the
    // press did nothing and 知道了 was the only way out). Menus stay free so players can pick any choice.
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
      // The tap forwarder exists for forced steps on the main screen only: there the highlight sits on
      // a navigation button and the tip has to hand the press over. "知道了" steps need no forwarder —
      // the real button receives the press itself and menuAck marks the tip as read.
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

  // Only short names go through an EditBox. Feeding a whole save JSON into one made the label lay out
  // tens of thousands of characters on the UI thread, which is what froze the export screen.
  private input(parent: Node, placeholder: string, value: string, y: number, height: number, changed: (value: string) => void) {
    const width = this.width - 40;
    const field = this.box(parent, 'InputBackground', 0, y, width, height, colors.paper, 8);
    const node = this.box(field, 'Input', 12, 5, width - 24, height - 10);
    node.getComponent(UITransform).setAnchorPoint(0.5, 0.5);
    node.setPosition(width / 2, -height / 2);
    node.active = false;
    const edit = node.addComponent(EditBox);
    edit.inputMode = EditBox.InputMode.SINGLE_LINE;
    for (const child of [...node.children]) { child.removeFromParent(); child.destroy(); }
    edit.textLabel = this.text(node, '', -(width - 24) / 2, -(height - 10) / 2, width - 24, height - 10, 15, colors.ink);
    edit.placeholderLabel = this.text(node, placeholder, -(width - 24) / 2, -(height - 10) / 2, width - 24, height - 10, 15, colors.muted);
    edit.textLabel.overflow = Label.Overflow.CLAMP;
    edit.placeholderLabel.overflow = Label.Overflow.CLAMP;
    edit.maxLength = 24;
    edit.string = value;
    node.on(EditBox.EventType.TEXT_CHANGED, (box: EditBox) => changed(box.string));
    node.on(EditBox.EventType.EDITING_DID_BEGAN, () => { this.editing = true; });
    // Ending the edit releases the guard and applies any redraw that was deferred while typing.
    // Both "finished" and "return" are listened to: some platforms only send one of them.
    const ended = () => {
      if (!this.editing) return;
      this.editing = false;
      if (this.renderPending) this.scheduleOnce(() => this.render(), 0);
    };
    node.on(EditBox.EventType.EDITING_DID_ENDED, ended);
    node.on(EditBox.EventType.EDITING_RETURN, ended);
    node.active = true;
    return edit;
  }

  private openMenu(menu: string, id?: string, critical = false, dim?: string, bottom = false) {
    this.helpKey = '';
    // After a failed run the save/restart controls are at the bottom of the company page; a ready
    // release jumps to the bottom of the project page where the shipping button sits.
    this.scrollBottom = bottom || (menu === 'finance' && !!this.state.over);
    if (!this.routes.length) { this.resumeAfterMenu = this.playing || this.guidePaused; this.guidePaused = false; this.playing = false; this.elapsed = 0; }
    if (critical || menu === 'event' || menu === 'setup') this.resumeAfterMenu = false;
    if (critical) this.routes = [];
    if (menu === 'new-project') this.draft = { ...core.recommendPlan(this.state) };
    this.brickTip = null;
    if (menu === 'book') this.markReview(id);
    if (menu === 'achievements') { this.state = core.markAchievementsSeen(this.state); this.save(); }
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
    this.playing = this.resumeAfterMenu && !this.state.over;
    this.resumeAfterMenu = false;
    this.elapsed = 0;
    this.render();
    this.celebrate();
  }

  private setNotice(message: string) {
    this.notice = String(message || '操作未完成');
    this.noticeFresh = true;
    this.unschedule(this.clearNotice);
    this.scheduleOnce(this.clearNotice, 2.5);
  }

  private apply(next: any, message?: string) {
    this.state = this.drain(next);
    this.save();
    if (next.event) { this.playing = false; this.resumeAfterMenu = false; this.routes = [{ menu: 'event' }]; }
    if (next.over) { this.playing = false; this.resumeAfterMenu = false; }
    if (!next.over) this.overScreenShown = false;
    // Put the toast on the page before drawing it. Calling notify() afterwards rebuilt the entire
    // screen a second time for every action that showed a message.
    if (message) this.setNotice(message);
    this.render();
    this.celebrate();
  }

  private notify(message: string) {
    this.setNotice(message);
    this.render();
  }

  private decide(choice: string) {
    const event = this.state.event;
    this.apply(core.resolveStudioEvent(this.state, choice));
    if (this.state.event) return;
    this.routes = [];
    this.resumeAfterMenu = false;
    this.playing = core.liveProjects(this.state).length > 0 && event.id !== 'cash' && !this.state.over;
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
          const next = core.startProject(this.state, { ...this.draft, name: this.draft.name.trim() || this.draft.suggested });
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
        case 'outing': this.apply(core.teamOuting(this.state, Number(data.days) || 3), '团建已安排，全队停工。'); break;
        case 'overtime': this.apply(core.setOvertime(this.state, data.id, !!data.enabled)); break;
        case 'overtime-all': this.apply(core.setAllOvertime(this.state, !!data.enabled), data.enabled ? '全员开始加班。' : '全员恢复正常工作。'); break;
        case 'sound': this.apply(core.setSound(this.state, !!data.value)); break;
        case 'exhibition': this.apply(core.enterExhibition(this.state, data.id, Number(data.tier) || 0), '展会已报名，继续完善会影响名次。'); break;
        case 'operate': this.apply(core.operateBook(this.state, data.id, data.kind), '更新已开始制作。'); break;
        case 'sale': this.apply(core.setSale(this.state, data.id, !!data.enabled, data.floor), data.enabled ? '已开启促销，系统会按余量决定打折时机。' : '已关闭促销，恢复原价销售。'); break;
        case 'sequel': {
          const book = this.state.catalog.find((item: any) => item.id === data.id);
          if (!book) throw new Error('原作不存在。');
          this.openMenu('new-project');
          this.draft = { name: (book.name + ' 2').slice(0, 24), scale: book.scale, slots: JSON.parse(JSON.stringify(book.slots)), rent: [...(book.rent || [])], sequel: book.id };
          this.render();
          break;
        }
        case 'patch-start': {
          const next = core.startPatch(this.state, data.id, data.rework || null, !!data.sync);
          this.watching = data.id;
          this.routes = [{ menu: 'project', id: data.id }, { menu: 'assign', id: data.id }];
          this.apply(next, '补丁已开工，请安排人手。');
          break;
        }
        case 'mentor': this.apply(core.setMentor(this.state, data.id, data.mentor || null, data.ability), data.mentor ? '带教开始。' : '带教已结束。'); if (data.mentor) { this.routes.pop(); this.render(); } break;
        case 'poach': {
          const before = this.state.staff.length;
          const next = core.poach(this.state, data.id, Number(data.bid));
          this.apply(next, next.staff.length > before ? '挖角成功！' : '对方拒绝了。');
          break;
        }
        case 'patch-crew': this.apply(core.setPatchCrew(this.state, data.id, data.person, !!data.on)); break;
        case 'patch-release': this.apply(core.releasePatch(this.state, data.id), '补丁已上线。'); this.routes = [{ menu: 'book', id: data.id }]; this.render(); break;
        case 'dlc': {
          const next = core.makeDLC(this.state, data.id);
          const project = next.projects[next.projects.length - 1];
          this.watching = project.id;
          this.routes = [{ menu: 'project', id: project.id }, { menu: 'assign', id: project.id }];
          this.apply(next, '资料片已作为新项目立项，请安排人手。');
          break;
        }
        case 'port': {
          const next = core.makePort(this.state, data.id, data.platform);
          const project = next.projects[next.projects.length - 1];
          this.watching = project.id;
          this.routes = [{ menu: 'project', id: project.id }, { menu: 'assign', id: project.id }];
          this.apply(next, '移植已立项，请安排人手。');
          break;
        }
        case 'assign': this.apply(core.assign(this.state, data.id, data.person, data.works)); break;
        case 'module-build':
        case 'module-rebuild': {
          const next = core.startModuleProject(this.state, data.line, Number(data.level), action === 'module-rebuild');
          const project = next.projects[next.projects.length - 1];
          this.watching = project.id;
          this.routes = [{ menu: 'project', id: project.id }, { menu: 'assign', id: project.id }];
          this.apply(next, '模块项目已开工，请安排人手。');
          break;
        }
        case 'license': this.apply(core.setLicense(this.state, data.line, !!data.on), data.on ? '已授权，每月底收授权费。' : '已收回授权。'); break;
        case 'raise': this.apply(core.raiseWage(this.state, data.id)); this.closeMenu(); this.celebrate(); break;
        case 'take-job': {
          const next = core.takeJob(this.state, data.id);
          const project = next.projects[next.projects.length - 1];
          this.watching = project.id;
          this.routes = [{ menu: 'project', id: project.id }, { menu: 'assign', id: project.id }];
          this.apply(next, '委托已接下，请安排人手。');
          break;
        }
        case 'priority': this.apply(core.setPriority(this.state, data.id, Number(data.priority))); break;
        case 'test': this.apply(core.testDemo(this.state, data.id)); break;
        case 'fix-first': this.apply(core.setFixFirst(this.state, data.id, !!data.on)); break;
        case 'promote': {
          const next = core.promote(this.state, data.id, Number(data.cost));
          this.apply(next, '推广带来 ' + content.number(core.activeProject(next, data.id)?.promoFollowers || 0) + ' 位关注。');
          break;
        }
        // Releasing is irreversible. The project-page button only opens a confirmation screen; the
        // confirming press is a separate action so a stray tap can never ship the game.
        case 'launch': this.openMenu('launch-confirm', data.id); break;
        case 'launch-cancel': this.routes.pop(); this.render(); break;
        case 'launch-final': this.apply(core.launchProject(this.state, data.id)); break;
        case 'decision': this.decide(data.choice); break;
        case 'review':
          this.apply(core.resolveStudioEvent(this.state, 'continue'));
          this.routes = [];
          this.openMenu('book', data.id);
          break;
        case 'move': this.apply(core.moveOffice(this.state)); this.closeMenu(); this.celebrate(); break;
        case 'load-slot': {
          const id = Number(data.id);
          if (id === this.slot) break;
          if (!this.slotIndex.slots.includes(id)) throw new Error('这份存档不存在。');
          const raw = platform.read(core.SAVE_SLOT_KEY(id));
          if (!raw) throw new Error('这份存档是空的，无法加载。');
          const next = core.restoreStudio(JSON.parse(raw));
          this.save();
          this.slot = id;
          this.slotIndex.active = id;
          this.writeSlotIndex();
          this.enterSlot(next, '已加载存档 ' + (this.slotIndex.slots.indexOf(id) + 1) + '，时间保持暂停。');
          break;
        }
        case 'new-slot': {
          if (this.slotIndex.slots.length >= core.SAVE_SLOT_LIMIT) throw new Error('存档已满，请先删除一个存档。');
          this.save();
          const id = this.slotIndex.nextId++;
          this.slotIndex.slots.push(id);
          this.slotIndex.active = id;
          this.slot = id;
          this.writeSlotIndex();
          this.enterSlot(core.createStudio(), '新存档已建好，先给工作室起个名字。');
          break;
        }
        case 'delete-slot': {
          const id = Number(data.id);
          if (id === this.slot) throw new Error('正在游玩的存档不能删除。');
          if (!this.slotIndex.slots.includes(id)) throw new Error('这份存档不存在。');
          try { platform.remove(core.SAVE_SLOT_KEY(id)); } catch { /* already gone */ }
          this.slotIndex.slots = this.slotIndex.slots.filter((item: number) => item !== id);
          this.writeSlotIndex();
          const at = this.routes.findIndex((route: any) => route.menu === 'slots');
          this.routes = at >= 0 ? this.routes.slice(0, at + 1) : [{ menu: 'slots' }];
          this.notify('存档已删除。');
          break;
        }
        case 'restart-confirm':
          this.enterSlot(core.createStudio(), '新的一局开始了，先给工作室起个名字。');
          break;
      }
    } catch (error) { this.notify(error.message || '本次操作未执行。'); }
  }
}
