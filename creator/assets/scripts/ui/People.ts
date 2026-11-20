import { JsonAsset, Node, Rect, Sprite, SpriteFrame, Texture2D, UITransform, resources } from 'cc';

type Layout = {
  size: number[]; unit: number; characters: { id: string; sex: string; frames: Record<string, number[]>; avatar: number[] }[];
  props: Record<string, number[]>; station: Record<string, any>; cottage: Record<string, any>;
};
export type Look = { face: string; laptop: '' | 'open' | 'closed'; person: boolean; mug: boolean; symbols: string[] };

// The approved character and cottage artwork: one atlas for people, furniture and symbols so a whole
// office batches, plus the cottage room as its own image. Coordinates are top-left, y down.
export class ArtPack {
  layout: Layout | null = null;
  private atlas: Texture2D | null = null;
  private room: Texture2D | null = null;
  private frames = new Map<string, SpriteFrame>();
  private disposed = false;
  private actors: { sprite: Sprite; art: string; face: string; phase: number }[] = [];
  private clock = 0;

  load(done: () => void) {
    let pending = 3;
    const finish = () => { if (--pending === 0 && !this.disposed && this.layout && this.atlas && this.room) done(); };
    resources.load('art/art', JsonAsset, (error, asset) => { if (error) console.warn('Art layout:', error.message); else this.layout = asset.json as Layout; finish(); });
    resources.load('art/atlas/texture', Texture2D, (error, texture) => { if (error) console.warn('Art atlas:', error.message); else this.atlas = texture; finish(); });
    resources.load('art/cottage/texture', Texture2D, (error, texture) => { if (error) console.warn('Cottage art:', error.message); else this.room = texture; finish(); });
  }

  get ready() { return !!(this.layout && this.atlas && this.room); }

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
  prop(name: string) { return this.frame('prop:' + name, this.atlas!, this.layout!.props[name]); }
  face(art: string, face: string) { const item = this.character(art); return this.frame(item.id + ':' + face, this.atlas!, item.frames[face] || item.frames.neutral); }
  avatar(art: string) {
    const item = this.character(art);
    const [x, y, w, h] = item.avatar;
    const cell = item.frames.portrait;
    return this.frame(item.id + ':avatar', this.atlas!, [cell[0] + x, cell[1] + y, w, h]);
  }
  roomFrame(x: number, width: number) { return this.frame('room:' + x + ':' + width, this.room!, [x, 0, width, this.layout!.cottage.size[1]]); }

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

  // One workstation, back to front: chair, person, desk, ornaments, laptop and mug, then the head symbols.
  // (x, y) is the desk line under the person's centre; k converts character pixels to the screen.
  station(parent: Node, x: number, y: number, k: number, art: string, look: Look | null, clip: number, phase: number, decor: string[] = []) {
    const station = this.layout!.station;
    const at = (key: string, frame: SpriteFrame) => {
      const [dx, dy, w, h] = station[key];
      return this.place(parent, frame, x + dx * k, y + dy * k, w * k, h * k, clip);
    };
    at('chair', this.prop('chair'));
    if (look?.person) {
      const sprite = at('person', this.face(art, look.face));
      // Breathing scales from the desk line, so the body never lifts off the desk.
      const transform = sprite.node.getComponent(UITransform)!;
      transform.setAnchorPoint(0.5, 0);
      sprite.node.setPosition(x, -(y + (station.person[1] + station.person[3]) * k));
      this.actors.push({ sprite, art, face: look.face, phase });
    }
    at('desk', this.prop('desk'));
    for (const name of decor) at(name, this.prop(name));
    if (look?.laptop) at('laptop-' + look.laptop, this.prop('laptop-' + look.laptop));
    if (look?.mug) at('mug', this.prop('mug'));
    (look?.symbols || []).forEach((name, index) => {
      const [dx, dy, slot] = station.symbols[index];
      const size = station.symbolSize?.[name] ?? slot;
      const rect = this.layout!.props[name];
      const width = size * k;
      const height = width * rect[3] / rect[2];
      this.place(parent, this.prop(name), x + dx * k - width / 2, y + dy * k - height / 2, width, height);
    });
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
