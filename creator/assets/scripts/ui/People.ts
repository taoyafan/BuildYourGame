import { assetManager, Color, JsonAsset, Node, Rect, Sprite, SpriteFrame, Texture2D, UITransform, resources } from 'cc';

export const officeRooms = ['home', 'cottage', 'formal', 'studio', 'floor', 'campus'] as const;
type RoomArt = typeof officeRooms[number];
type RoomTexture = RoomArt | `${RoomArt}-staff` | `${RoomArt}-desk-row`;
// The two rooms a studio can afford at the start stay in the main package. Everything from the
// ten-desk office up is a separate subpackage, so the first package stays under WeChat's 4 MB.
const baseRooms: RoomTexture[] = ['home', 'cottage'];
const packedRooms: RoomTexture[] = ['formal', 'formal-desk-row', 'studio', 'studio-staff', 'floor', 'floor-staff', 'floor-desk-row', 'campus', 'campus-staff', 'campus-desk-row'];
const ROOM_BUNDLE = 'rooms';
// Module icon cells in row order, followed by the shared silver and gold overlays.
const moduleIconCells = [
  'actionCombat', 'topShooter', 'platformer', 'turnTactics', 'puzzle', 'management', 'branchingStory', 'visualNovel',
  'rpg', 'roguelikeAction', 'growthTactics', 'ensembleStory', 'deckBuilding', 'deduction', 'baseBuilding', 'survival',
  'openWorld', 'fantasy', 'scifi', 'apocalypse', 'mystery', 'wuxia', 'campus', 'engine2d',
  'engine3d', 'artPixel', 'artHand', 'artCartoon', 'artWatercolor', 'artPrint', 'retroMusic', 'lyricalMusic',
  'electronicMusic', 'orchestralMusic', 'sfxLibrary', 'module-silver', 'module-gold'
];

type SeatAnchor = [number, number, number, string[]?];
export type RoomRect = [number, number, number, number];
type RoomLayout = {
  size: [number, number];
  seats?: SeatAnchor[];
  deskRows?: { desk: RoomRect; seats: SeatAnchor[] }[];
  screen?: number[];
  plaque: number[];
  calendar: number[];
  shelf: number[];
  shelfPlank: number;
  covers?: RoomRect[];
  trophyStep?: number;
  staffFloor?: { size: [number, number]; deskRowsFrom?: RoomArt; deskOffsetY?: number; chairTint?: string };
};
type Layout = Record<RoomArt, RoomLayout> & {
  size: number[]; unit: number; characters: { id: string; sex: string; frames: Record<string, number[]>; avatar: number[] }[];
  props: Record<string, number[]>; station: Record<string, any>;
};
export type Look = { face: string; laptop: '' | 'open' | 'closed'; person: boolean; mug: boolean; symbols: string[] };
export type Station = { x: number; y: number; k: number; art: string; look: Look | null; phase: number; decor?: string[] };

// People, furniture and symbols share one atlas. Illustrated rooms have their own backgrounds.
// Coordinates are top-left, y down.
export class ArtPack {
  layout: Layout | null = null;
  private atlas: Texture2D | null = null;
  private moduleAtlas: Texture2D | null = null;
  private textures: Partial<Record<RoomTexture, Texture2D>> = {};
  private frames = new Map<string, SpriteFrame>();
  private disposed = false;
  private actors: { sprite: Sprite; art: string; face: string; phase: number }[] = [];
  private clock = 0;

  load(done: () => void) {
    resources.load('art/module-icons/texture', Texture2D, (error, texture) => {
      if (this.disposed) return;
      if (error) console.warn('Module icons:', error.message);
      else {
        this.moduleAtlas = texture;
        done();
      }
    });
    let pending = 2 + baseRooms.length;
    const finish = () => { if (pending > 0 && --pending === 0 && !this.disposed && this.ready) done(); };
    resources.load('art/art', JsonAsset, (error, asset) => { if (error) console.warn('Art layout:', error.message); else this.layout = asset.json as Layout; finish(); });
    resources.load('art/atlas/texture', Texture2D, (error, texture) => { if (error) console.warn('Art atlas:', error.message); else this.atlas = texture; finish(); });
    for (const name of baseRooms) {
      resources.load(`art/${name}/texture`, Texture2D, (error, texture) => {
        if (error) console.warn(`Room art (${name}):`, error.message);
        else this.textures[name] = texture;
        finish();
      });
    }
    // The bigger rooms arrive in the background; `done` runs a second time so the office redraws
    // with them instead of waiting for the subpackage before the first screen.
    this.loadRooms(() => { if (!this.disposed) done(); });
  }

  private loadRooms(done: () => void) {
    let pending = packedRooms.length;
    const finish = () => { if (pending > 0 && --pending === 0) done(); };
    assetManager.loadBundle(ROOM_BUNDLE, (error, bundle) => {
      if (error) {
        console.warn('Room bundle:', error.message);
        for (let i = 0; i < packedRooms.length; i++) finish();
        return;
      }
      for (const name of packedRooms) {
        bundle.load(`art/${name}/texture`, Texture2D, (err, texture) => {
          if (err) console.warn(`Room art (${name}):`, err.message);
          else this.textures[name] = texture;
          finish();
        });
      }
    });
  }

  get ready() { return !!(this.layout && this.atlas); }

  private frame(key: string, texture: Texture2D, rect: number[]) {
    let frame = this.frames.get(key);
    if (!frame) {
      frame = new SpriteFrame();
      frame.texture = texture;
      frame.rect = new Rect(rect[0], rect[1], rect[2], rect[3]);
      this.frames.set(key, frame);
    }
    return frame;
  }

  private character(art: string) { return this.layout!.characters.find(item => item.id === art) || this.layout!.characters[0]; }
  moduleIcon(key: string) {
    const index = moduleIconCells.indexOf(key);
    if (index < 0 || !this.moduleAtlas) return null;
    const size = this.moduleAtlas.width / 8;
    return this.frame('module:' + key, this.moduleAtlas, [(index % 8) * size, Math.floor(index / 8) * size, size, size]);
  }
  prop(name: string) { return this.frame('prop:' + name, this.atlas!, this.layout!.props[name]); }
  face(art: string, face: string) { const item = this.character(art); return this.frame(item.id + ':' + face, this.atlas!, item.frames[face] || item.frames.neutral); }
  avatar(art: string) {
    const item = this.character(art);
    const [x, y, w, h] = item.avatar;
    const cell = item.frames.portrait;
    return this.frame(item.id + ':avatar', this.atlas!, [cell[0] + x, cell[1] + y, w, h]);
  }
  roomFrame(name: RoomArt) {
    const texture = this.textures[name];
    return texture ? this.frame(name, texture, [0, 0, ...this.layout![name].size]) : null;
  }
  deskRowFrame(name: RoomArt) {
    const key = `${name}-desk-row` as const;
    const selected = this.textures[key] ? key : 'formal-desk-row';
    const texture = this.textures[selected];
    return texture ? this.frame(selected, texture, [0, 0, texture.width, texture.height]) : null;
  }
  staffFloorFrame(name: RoomArt) {
    const key = `${name}-staff` as const;
    const texture = this.textures[key];
    const floor = this.layout![name].staffFloor;
    return texture && floor ? this.frame(key, texture, [0, 0, ...floor.size]) : null;
  }

  // A sprite in a top-left box. Anything below `clip` is cut off by filling only the top part.
  place(parent: Node, frame: SpriteFrame, x: number, y: number, width: number, height: number, clip = Infinity) {
    const node = new Node('Art');
    node.layer = parent.layer;
    parent.addChild(node);
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0, 1);
    transform.setContentSize(width, height);
    node.setPosition(x, -y);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = frame;
    if (y + height > clip) {
      sprite.type = Sprite.Type.FILLED;
      sprite.fillType = Sprite.FillType.VERTICAL;
      const shown = Math.max(0, (clip - y) / height);
      sprite.fillStart = 1 - shown;
      sprite.fillRange = shown;
    }
    return sprite;
  }

  private stationPart(parent: Node, { x, y, k }: Station, key: string, frame: SpriteFrame, clip: number) {
    const [dx, dy, w, h] = this.layout!.station[key];
    return this.place(parent, frame, x + dx * k, y + dy * k, w * k, h * k, clip);
  }

  private stationBack(parent: Node, seat: Station, clip: number, chairTint?: Color) {
    const { x, y, k, art, look, phase } = seat;
    const station = this.layout!.station;
    const chair = this.stationPart(parent, seat, 'chair', this.prop('chair'), clip);
    if (chairTint) chair.color = chairTint;
    if (look?.person) {
      const sprite = this.stationPart(parent, seat, 'person', this.face(art, look.face), clip);
      // Breathing scales from the desk line, so the body never lifts off the desk.
      const transform = sprite.node.getComponent(UITransform)!;
      transform.setAnchorPoint(0.5, 0);
      sprite.node.setPosition(x, -(y + (station.person[1] + station.person[3]) * k));
      this.actors.push({ sprite, art, face: look.face, phase });
    }
  }

  private stationFront(parent: Node, seat: Station, clip: number) {
    const { x, y, k, look, decor = [] } = seat;
    const station = this.layout!.station;
    const at = (name: string) => this.stationPart(parent, seat, name, this.prop(name), clip);
    for (const name of decor) at(name);
    if (look?.laptop) at('laptop-' + look.laptop);
    if (look?.mug) at('mug');
    (look?.symbols || []).forEach((name, index) => {
      const [dx, dy, slot] = station.symbols[index];
      const size = station.symbolSize?.[name] ?? slot;
      const rect = this.layout!.props[name];
      const width = size * k;
      const height = width * rect[3] / rect[2];
      this.place(parent, this.prop(name), x + dx * k - width / 2, y + dy * k - height / 2, width, height);
    });
  }

  station(parent: Node, seat: Station, clip: number) {
    this.stationBack(parent, seat, clip);
    this.stationPart(parent, seat, 'desk', this.prop('desk'), clip);
    this.stationFront(parent, seat, clip);
  }

  // All chairs and people go behind the shared desktop. Laptops and ornaments go in front.
  stationRow(parent: Node, stations: Station[], frame: SpriteFrame, desk: RoomRect, clip: number, chairTint?: Color) {
    for (const seat of stations) this.stationBack(parent, seat, clip, chairTint);
    this.place(parent, frame, ...desk, clip);
    for (const seat of stations) this.stationFront(parent, seat, clip);
  }

  clear() { this.actors.length = 0; }

  update(delta: number, running: boolean) {
    // Cosmetic only and frozen while paused: everyone keeps the pose they had.
    if (!running || !this.ready) return;
    this.clock += Math.min(delta, 0.1);
    for (const actor of this.actors) {
      if (!actor.sprite.isValid) continue;
      const t = this.clock + actor.phase;
      actor.sprite.node.setScale(1, 1 + Math.sin(t * 1.6) * 0.012, 1);
      // A blink is a short closed-eye frame every few seconds, only on the plain working face.
      if (actor.face === 'neutral') actor.sprite.spriteFrame = this.face(actor.art, (t % 4.3) < 0.14 ? 'blink' : 'neutral');
    }
  }

  destroy() {
    this.disposed = true;
    this.clear();
    for (const frame of this.frames.values()) frame.destroy();
    this.frames.clear();
  }
}
