import { JsonAsset, Rect, resources, SpriteFrame, Texture2D } from 'cc';

type EncodedArt = { width: number; height: number; palette: string[]; pixels: string };
type ThemeArt = { backdrop: EncodedArt; overhead?: EncodedArt; hero: EncodedArt; enemy: EncodedArt; floor: number; hover?: boolean };
type Surface = { width: number; height: number; rgba: Uint8Array };
type SceneArt = { backdrop: Surface; overhead?: Surface; hero: Surface; enemy: Surface };
type RGB = readonly [number, number, number];
type Style = 'hand' | 'pixel' | 'cartoon' | 'silhouette' | 'print';
type Layout = 'actionCombat' | 'topShooter' | 'platformer' | 'turnTactics' | 'puzzle' | 'management' | 'branchingStory' | 'visualNovel' | 'rpg';

const styles: Record<string, Style> = {
  artHand: 'hand', artPixel: 'pixel', artCartoon: 'cartoon', artWatercolor: 'silhouette', artPrint: 'print'
};
const silhouette: RGB[] = [[28, 24, 48], [91, 48, 77], [169, 79, 91], [231, 135, 119], [255, 221, 160]];
const ink: RGB[] = [[27, 42, 63], [58, 80, 99], [81, 146, 151], [198, 112, 67], [248, 229, 177]];
const cream: RGB = [250, 234, 197];
const dark: RGB = [30, 31, 49];
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const layouts: readonly Layout[] = ['actionCombat', 'topShooter', 'platformer', 'turnTactics', 'puzzle', 'management', 'branchingStory', 'visualNovel', 'rpg'];
const overheadLayouts: readonly Layout[] = ['topShooter', 'turnTactics', 'puzzle', 'management'];
// The office uses at most four previews at once. Keep recent frames across screen redraws.
const FRAME_CACHE_LIMIT = 48;

function decode(art: EncodedArt): Surface {
  const { width, height } = art;
  const palette = art.palette.map(hex => Number.parseInt(hex, 16));
  const rgba = new Uint8Array(width * height * 4);
  let bits = 0;
  let accumulator = 0;
  let offset = 0;
  for (const character of art.pixels) {
    if (character === '=') break;
    accumulator = (accumulator << 6) | alphabet.indexOf(character);
    bits += 6;
    if (bits < 8) continue;
    bits -= 8;
    const color = palette[(accumulator >> bits) & 255];
    rgba[offset++] = color >>> 24;
    rgba[offset++] = (color >>> 16) & 255;
    rgba[offset++] = (color >>> 8) & 255;
    rgba[offset++] = color & 255;
  }
  return { width, height, rgba };
}

function luma(r: number, g: number, b: number) {
  return (r * 3 + g * 6 + b) / 10;
}

function colorAt(source: Surface, offset: number, style: Style, actor: boolean, x: number, y: number): RGB {
  const { rgba } = source;
  const r = rgba[offset], g = rgba[offset + 1], b = rgba[offset + 2];
  const light = luma(r, g, b);
  if (style === 'silhouette') {
    if (actor) return light > 202 ? silhouette[2] : silhouette[0];
    return silhouette[light < 56 ? 0 : light < 93 ? 1 : light < 125 ? 2 : light < 172 ? 3 : 4];
  }
  if (style === 'print') {
    if ((x + y) % 5 === 0 && light > 72 && light < 132) return ink[1];
    return ink[light < 58 ? 0 : light < 99 ? 1 : light > 196 ? 4 : r - b > 24 ? 3 : 2];
  }
  if (style === 'pixel' || style === 'cartoon') {
    const right = Math.min(offset + 4, rgba.length - 4);
    const edge = Math.abs(light - luma(rgba[right], rgba[right + 1], rgba[right + 2]));
    if (style === 'cartoon' && edge > (actor ? 48 : 64)) return dark;
    const unit = style === 'pixel' ? 25 : 36;
    return [Math.min(255, Math.round(r / unit) * unit), Math.min(255, Math.round(g / unit) * unit), Math.min(255, Math.round(b / unit) * unit)];
  }
  return [r, g, b];
}

function paint(target: Surface, x: number, y: number, color: RGB, alpha = 255) {
  if (x < 0 || x >= target.width || y < 0 || y >= target.height || alpha === 0) return;
  const p = (y * target.width + x) * 4;
  const a = alpha / 255;
  target.rgba[p] = color[0] * a + target.rgba[p] * (1 - a);
  target.rgba[p + 1] = color[1] * a + target.rgba[p + 1] * (1 - a);
  target.rgba[p + 2] = color[2] * a + target.rgba[p + 2] * (1 - a);
  target.rgba[p + 3] = 255;
}

function fill(target: Surface, left: number, top: number, width: number, height: number, color: RGB, alpha = 255) {
  for (let y = top; y < top + height; y++) for (let x = left; x < left + width; x++) paint(target, x, y, color, alpha);
}

function line(target: Surface, x1: number, y1: number, x2: number, y2: number, color: RGB, thickness = 1, alpha = 255) {
  const steps = Math.max(1, Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let step = 0; step <= steps; step++) {
    fill(target, Math.round(x1 + (x2 - x1) * step / steps), Math.round(y1 + (y2 - y1) * step / steps), thickness, thickness, color, alpha);
  }
}

function groundMark(target: Surface, x: number, y: number, halfWidth: number, halfHeight: number, color: RGB, alpha = 210) {
  line(target, x - halfWidth, y, x, y - halfHeight, color, 1, alpha);
  line(target, x, y - halfHeight, x + halfWidth, y, color, 1, alpha);
  line(target, x - halfWidth, y, x, y + halfHeight, color, 1, alpha);
  line(target, x, y + halfHeight, x + halfWidth, y, color, 1, alpha);
}

function disk(target: Surface, cx: number, cy: number, radius: number, color: RGB) {
  for (let dy = -radius; dy <= radius; dy++) {
    const width = Math.floor(Math.sqrt(radius * radius - dy * dy));
    fill(target, cx - width, cy + dy, width * 2 + 1, 1, color);
  }
}

function drawArt(target: Surface, source: Surface, style: Style, left: number, top: number, width: number, height: number, actor = false, flipX = false) {
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.floor(x * source.width / width), sy = Math.floor(y * source.height / height);
    const offset = (sy * source.width + sx) * 4;
    const alpha = source.rgba[offset + 3];
    if (alpha === 0) continue;
    const drawX = left + (flipX ? width - 1 - x : x);
    paint(target, drawX, top + y, colorAt(source, offset, style, actor, x, y), style === 'pixel' ? (alpha >= 112 ? 255 : 0) : alpha);
  }
}

function actor(target: Surface, source: Surface, style: Style, center: number, foot: number, height: number, flipX = false) {
  const width = Math.round(height * source.width / source.height);
  const left = Math.round(center - width / 2), top = foot - height;
  if (style !== 'hand') {
    const stroke = style === 'silhouette' ? silhouette[4] : style === 'print' ? cream : dark;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const offset = (Math.floor(y * source.height / height) * source.width + Math.floor(x * source.width / width)) * 4;
      if (source.rgba[offset + 3] < 112) continue;
      const drawX = left + (flipX ? width - 1 - x : x);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) paint(target, drawX + dx, top + y + dy, stroke);
    }
  }
  drawArt(target, source, style, left, top, width, height, true, flipX);
}

function shadeBackdrop({ width, height, rgba }: Surface, sketch: boolean) {
  const tones = new Uint8Array(width * height);
  for (let i = 0; i < tones.length; i++) {
    const p = i * 4;
    tones[i] = luma(rgba[p], rgba[p + 1], rgba[p + 2]);
  }
  for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
    const i = row * width + col;
    let tone = tones[i];
    if (sketch) {
      const top = Math.max(0, row - 1) * width, bottom = Math.min(height - 1, row + 1) * width;
      const left = Math.max(0, col - 1), right = Math.min(width - 1, col + 1);
      const middle = row * width;
      const dx = tones[top + right] - tones[top + left]
        + 2 * (tones[middle + right] - tones[middle + left]) + tones[bottom + right] - tones[bottom + left];
      const dy = tones[bottom + left] - tones[top + left]
        + 2 * (tones[bottom + col] - tones[top + col]) + tones[bottom + right] - tones[top + right];
      const edge = (Math.abs(dx) + Math.abs(dy)) / 8;
      tone = 244 - Math.min(172, Math.max(0, edge - 8) * 5);
    }
    const p = i * 4;
    rgba[p] = rgba[p + 1] = rgba[p + 2] = tone;
  }
}

type PreviewStage = 'sketch' | 'grayscale' | 'color' | 'complete';

function compose(art: SceneArt, style: Style, layout: Layout, stage: PreviewStage, floor: number, hover: boolean) {
  const width = style === 'pixel' ? 96 : 192;
  const height = width * 7 / 16;
  const target: Surface = { width, height, rgba: new Uint8Array(width * height * 4) };
  const backdrop = overheadLayouts.includes(layout) && art.overhead ? art.overhead : art.backdrop;
  drawArt(target, backdrop, stage === 'sketch' ? 'hand' : style, 0, 0, width, height);
  if (stage === 'sketch' || stage === 'grayscale') shadeBackdrop(target, stage === 'sketch');
  if (stage !== 'complete') return target;

  const x = (n: number) => Math.round(width * n);
  const y = (n: number) => Math.round(height * n);
  const shaded = style === 'silhouette' ? silhouette[0] : dark;
  const accent = style === 'silhouette' ? silhouette[3] : ink[2];
  const reward = style === 'silhouette' ? silhouette[4] : ink[4];
  const alert = style === 'print' ? ink[3] : silhouette[2];
  const unit = style === 'pixel' ? 1 : 2;
  if (layout === 'branchingStory') {
    actor(target, art.hero, style, x(0.68), y(0.86), y(0.69));
    actor(target, art.enemy, style, x(0.30), y(0.74), y(0.29));
    fill(target, x(0.07), y(0.72), x(0.86), y(0.24), dark, 228);
    fill(target, x(0.11), y(0.80), x(0.40), y(0.025), cream);
    fill(target, x(0.11), y(0.87), x(0.31), y(0.025), cream, 170);
    fill(target, x(0.66), y(0.80), x(0.21), y(0.10), cream, 125);
  } else if (layout === 'visualNovel') {
    actor(target, art.hero, style, x(0.62), y(0.93), y(0.88));
    actor(target, art.enemy, style, x(0.31), y(0.76), y(0.40));
    fill(target, x(0.05), y(0.72), x(0.90), y(0.23), shaded, 229);
    fill(target, x(0.09), y(0.64), x(0.21), y(0.10), accent);
    fill(target, x(0.11), y(0.68), x(0.10), unit, cream);
    fill(target, x(0.09), y(0.80), x(0.53), unit, cream);
    fill(target, x(0.09), y(0.87), x(0.38), unit, cream, 165);
    disk(target, x(0.90), y(0.89), unit, reward);
  } else if (layout === 'turnTactics') {
    groundMark(target, x(0.32), y(0.68), x(0.048), y(0.065), shaded, 176);
    groundMark(target, x(0.32), y(0.675), x(0.046), y(0.060), accent);
    for (const [cx, cy] of [[0.415, 0.68], [0.46, 0.62], [0.505, 0.56]]) {
      groundMark(target, x(cx), y(cy), x(0.038), y(0.05), accent, 178);
    }
    actor(target, art.hero, style, x(0.32), y(0.67), y(0.29));
    groundMark(target, x(0.67), y(0.51), x(0.044), y(0.055), alert);
    actor(target, art.enemy, style, x(0.67), y(hover ? 0.46 : 0.50), y(0.22));
  } else if (layout === 'topShooter') {
    fill(target, x(0.30), y(0.67), x(0.07), 1, shaded, 105);
    actor(target, art.hero, style, x(0.33), y(0.68), y(0.28));
    for (const [px, py] of [[0.44, 0.54], [0.50, 0.51], [0.56, 0.48]]) {
      line(target, x(px) - unit, y(py) + 1, x(px) + unit, y(py), shaded, unit);
      line(target, x(px) - unit, y(py), x(px) + unit, y(py) - 1, reward);
    }
    const tx = x(0.65), ty = y(0.445);
    actor(target, art.enemy, style, tx, y(hover ? 0.51 : 0.55), y(0.22));
    const reach = y(0.09), tick = y(0.045);
    line(target, tx - reach, ty, tx - tick, ty, reward);
    line(target, tx + tick, ty, tx + reach, ty, reward);
    line(target, tx, ty - reach, tx, ty - tick, reward);
  } else if (layout === 'platformer') {
    const slabY = Math.floor(art.backdrop.height * floor);
    const slab: Surface = { width: art.backdrop.width, height: art.backdrop.height - slabY, rgba: art.backdrop.rgba.subarray(slabY * art.backdrop.width * 4) };
    for (const [left, top, span] of [[0.19, 0.62, 0.20], [0.47, 0.46, 0.19], [0.74, 0.30, 0.20]]) {
      drawArt(target, slab, style, x(left), y(top), x(span), y(0.11));
      fill(target, x(left), y(top), x(span), unit, reward, 125);
    }
    actor(target, art.hero, style, x(0.34), y(0.57), y(0.37));
    actor(target, art.enemy, style, x(0.82), y(0.30), y(0.20));
    for (const [cx, cy] of [[0.47, 0.33], [0.54, 0.29], [0.61, 0.30]]) disk(target, x(cx), y(cy), unit + 1, reward);
  } else if (layout === 'puzzle') {
    const cx = x(0.56), cy = y(0.56), radius = y(0.12);
    actor(target, art.hero, style, x(0.40), y(0.67), y(0.30));
    disk(target, cx, cy + unit, radius, shaded);
    disk(target, cx, cy, radius, accent);
    disk(target, cx, cy, radius - unit, shaded);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      disk(target, cx + dx * (radius - 1), cy + dy * (radius - 1), 1, cream);
    }
    const endX = cx + Math.round(radius * 0.52), endY = cy - Math.round(radius * 0.53);
    line(target, cx, cy, endX, endY, reward, unit);
    disk(target, cx, cy, unit, accent);
    disk(target, endX, endY, unit, reward);
  } else if (layout === 'management') {
    // Paint from the back of the scene to the front so nearby units overlap naturally.
    const formation = [
      [art.enemy, 0.34, 0.45, 0.23, true],
      [art.enemy, 0.66, 0.48, 0.24, false],
      [art.hero, 0.50, 0.60, 0.30, false],
      [art.enemy, 0.78, 0.65, 0.29, false],
      [art.enemy, 0.22, 0.67, 0.28, true],
      [art.hero, 0.39, 0.73, 0.33, true],
      [art.hero, 0.61, 0.76, 0.34, false],
      [art.enemy, 0.69, 0.86, 0.27, false],
      [art.enemy, 0.31, 0.89, 0.26, true],
    ] as const;
    for (const [sprite, center, foot, size, flipX] of formation) {
      const height = Math.min(y(size), Math.floor(x(0.19) * sprite.height / sprite.width));
      actor(target, sprite, style, x(center), y(foot), height, flipX);
    }
  } else if (layout === 'rpg') {
    actor(target, art.hero, style, x(0.35), y(floor), y(0.46));
    actor(target, art.enemy, style, x(0.70), y(floor - (hover ? 0.12 : 0.03)), y(0.28));
    fill(target, x(0.07), y(0.08), x(0.31), y(0.16), shaded, 226);
    fill(target, x(0.105), y(0.12), x(0.21), unit, accent);
    fill(target, x(0.105), y(0.17), x(0.15), unit, reward);
    fill(target, x(0.61), y(0.36), x(0.18), unit, alert);
    fill(target, x(0.69), y(0.72), x(0.25), y(0.24), shaded, 234);
    for (const [mx, my] of [[0.71, 0.76], [0.825, 0.76], [0.71, 0.86], [0.825, 0.86]]) {
      fill(target, x(mx), y(my), x(0.09), y(0.06), accent, 207);
      fill(target, x(mx + 0.018), y(my) + unit, x(0.05), unit, cream);
    }
  } else {
    const baseline = y(floor);
    actor(target, art.hero, style, x(0.35), baseline, y(0.38));
    actor(target, art.enemy, style, x(0.69), baseline - (hover ? y(0.11) : 0), y(hover ? 0.23 : 0.19));
  }
  return target;
}

export class WorkPreviews {
  private art: Record<string, ThemeArt> | null = null;
  private themes = new Map<string, SceneArt>();
  private frames = new Map<string, SpriteFrame>();
  private disposed = false;

  load(done: () => void) {
    resources.load('art/work-previews', JsonAsset, (error, asset) => {
      if (error || this.disposed) return;
      this.art = asset.json as Record<string, ThemeArt>;
      done();
    });
  }

  frame(work: { type: string; axes?: Record<string, string[]> }, progress: number) {
    const theme = work.axes?.theme?.[0];
    const source = theme && this.art?.[theme];
    if (!theme || !source) return null;
    const style = styles[work.axes?.art?.[0] || 'artHand'] || 'hand';
    const core = work.axes?.core?.[0] as Layout;
    const layout = layouts.includes(core) ? core : work.type === 'story' ? 'branchingStory' : work.type === 'think' ? 'turnTactics' : 'actionCombat';
    const stage = progress < 0.25 ? 'sketch' : progress < 0.55 ? 'grayscale' : progress < 1 ? 'color' : 'complete';
    const key = [theme, style, layout, stage].join('/');
    const cached = this.frames.get(key);
    if (cached) {
      this.frames.delete(key);
      this.frames.set(key, cached);
      return cached;
    }
    let art = this.themes.get(theme);
    if (!art) {
      art = { backdrop: decode(source.backdrop), hero: decode(source.hero), enemy: decode(source.enemy) };
      if (source.overhead) art.overhead = decode(source.overhead);
      this.themes.set(theme, art);
    }
    const surface = compose(art, style, layout, stage, source.floor, !!source.hover);
    const texture = new Texture2D();
    texture.reset({ width: surface.width, height: surface.height, format: Texture2D.PixelFormat.RGBA8888 });
    const filter = style === 'pixel' ? Texture2D.Filter.NEAREST : Texture2D.Filter.LINEAR;
    texture.setFilters(filter, filter);
    texture.uploadData(surface.rgba);
    const frame = new SpriteFrame();
    frame.texture = texture;
    frame.rect = new Rect(0, 0, surface.width, surface.height);
    this.frames.set(key, frame);
    if (this.frames.size > FRAME_CACHE_LIMIT) {
      const oldest = this.frames.keys().next().value!;
      this.releaseFrame(this.frames.get(oldest)!);
      this.frames.delete(oldest);
    }
    return frame;
  }

  private releaseFrame(frame: SpriteFrame) {
    const texture = frame.texture;
    frame.destroy();
    texture.destroy();
  }

  destroy() {
    this.disposed = true;
    for (const frame of this.frames.values()) this.releaseFrame(frame);
    this.frames.clear();
    this.themes.clear();
  }
}
