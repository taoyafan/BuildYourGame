import { JsonAsset, Node, Rect, Sprite, SpriteFrame, Texture2D, UITransform, resources } from 'cc';

type FrameSpec = { image: string; rect: number[]; inset?: number | number[] };
type OfficeManifest = { frames: Record<string, FrameSpec>; work?: string[]; offices?: number[] };

// Artwork is optional: publish a complete pack atomically so a missing atlas never hides the
// functional Graphics office. Frame rectangles use source pixels measured from the top left.
export class OfficeArt {
  private frames = new Map<string, SpriteFrame>();
  private manifest: OfficeManifest | null = null;
  private disposed = false;
  private actors: { sprite: Sprite; active: boolean; phase: number; y: number; scale: number }[] = [];
  private clock = 0;

  load(done: () => void) {
    resources.load('art/office-sample/manifest', JsonAsset, (error, asset) => {
      if (error || this.disposed) return;
      const data = asset.json as OfficeManifest;
      if (!data?.frames) return;
      const required = ['wall', 'floor', 'window', 'monitor', 'plaque', 'board', 'shelf', 'chair', 'desk', 'computer', 'idle'];
      if (!required.every(key => data.frames[key])) { console.warn('Office artwork pack is incomplete'); return; }
      const images = Array.from(new Set(Object.values(data.frames).map(frame => frame.image)));
      const textures = new Map<string, Texture2D>();
      let pending = images.length;
      let failed = false;
      for (const name of images) resources.load('art/office-sample/' + name + '/texture', Texture2D, (failure, texture) => {
        if (this.disposed) return;
        if (failure) { failed = true; console.warn('Office artwork texture:', name, failure.message); }
        else textures.set(name, texture);
        if (--pending) return;
        if (failed) { console.warn('Office artwork texture unavailable'); return; }
        const next = new Map<string, SpriteFrame>();
        try {
          for (const [key, spec] of Object.entries(data.frames)) {
            const texture = textures.get(spec.image)!;
            const [x, y, width, height] = spec.rect;
            if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > texture.width || y + height > texture.height) throw new Error(key);
            const frame = new SpriteFrame();
            frame.texture = texture;
            frame.rect = new Rect(x, y, width, height);
            const inset = spec.inset || 0;
            const [left, top, right, bottom] = typeof inset === 'number' ? [inset, inset, inset, inset] : inset;
            if (![left, top, right, bottom].every(value => Number.isFinite(value) && value >= 0) || left + right > width || top + bottom > height) throw new Error(key + ' insets');
            frame.insetLeft = left;
            frame.insetRight = right;
            frame.insetTop = top;
            frame.insetBottom = bottom;
            next.set(key, frame);
          }
          if (data.work?.some(key => !next.has(key))) throw new Error('work frames');
        } catch (failure) {
          for (const frame of next.values()) frame.destroy();
          console.warn('Invalid office artwork rectangle:', failure);
          return;
        }
        this.frames = next;
        this.manifest = data;
        done();
      });
    });
  }

  available(office: number) { return !!this.manifest && (this.manifest.offices || [0, 1]).includes(office); }

  place(parent: Node, key: string, x: number, y: number, width: number, height: number) {
    const frame = this.frames.get(key);
    if (!frame) return null;
    const node = new Node('OfficeArt-' + key);
    node.layer = parent.layer;
    parent.addChild(node);
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0, 1);
    transform.setContentSize(width, height);
    node.setPosition(x, -y);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = frame;
    if (this.manifest!.frames[key].inset) sprite.type = Sprite.Type.SLICED;
    return sprite;
  }

  person(parent: Node, x: number, y: number, scale: number, active: boolean, phase: number) {
    const sequence = active && this.manifest?.work?.length ? this.manifest.work : ['idle'];
    const sprite = this.place(parent, sequence[Math.floor(this.clock * 5 + phase) % sequence.length], x - 32 * scale, y - 62 * scale, 64 * scale, 72 * scale);
    if (sprite) this.actors.push({ sprite, active, phase, y: sprite.node.position.y, scale });
  }

  clear() { this.actors.length = 0; }

  update(delta: number, running: boolean) {
    // One clock survives the daily UI rebuild. Cosmetic movement never changes simulation state.
    if (!running) return;
    this.clock += Math.min(delta, 0.1);
    for (const actor of this.actors) {
      if (!actor.sprite.isValid) continue;
      if (actor.active && this.manifest?.work?.length) {
        const sequence = this.manifest.work;
        actor.sprite.spriteFrame = this.frames.get(sequence[Math.floor(this.clock * 5 + actor.phase) % sequence.length])!;
      } else {
        actor.sprite.node.setPosition(actor.sprite.node.position.x, actor.y + Math.sin(this.clock * 2 + actor.phase) * 0.4 * actor.scale);
      }
    }
  }

  destroy() {
    this.disposed = true;
    this.clear();
    for (const frame of this.frames.values()) frame.destroy();
    this.frames.clear();
  }
}
