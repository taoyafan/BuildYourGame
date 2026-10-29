import { Color, Graphics } from 'cc';

// Graphics helper using top-left coordinates (y grows downward) to match the UI layout.
export class Pen {
  constructor(public g: Graphics) {}

  private color(hex: string, alpha = 255) {
    const color = new Color(hex);
    color.a = alpha;
    return color;
  }

  rect(x: number, y: number, w: number, h: number, hex: string, r = 0, alpha = 255) {
    this.g.fillColor = this.color(hex, alpha);
    if (r) this.g.roundRect(x, -y - h, w, h, Math.min(r, w / 2, h / 2));
    else this.g.rect(x, -y - h, w, h);
    this.g.fill();
  }

  frame(x: number, y: number, w: number, h: number, hex: string, width = 1.5, r = 0) {
    this.g.strokeColor = this.color(hex);
    this.g.lineWidth = width;
    if (r) this.g.roundRect(x, -y - h, w, h, r);
    else this.g.rect(x, -y - h, w, h);
    this.g.stroke();
  }

  circle(x: number, y: number, r: number, hex: string, alpha = 255) {
    this.g.fillColor = this.color(hex, alpha);
    this.g.circle(x, -y, r);
    this.g.fill();
  }

  line(x1: number, y1: number, x2: number, y2: number, hex: string, width = 1.5) {
    this.g.strokeColor = this.color(hex);
    this.g.lineWidth = width;
    this.g.moveTo(x1, -y1);
    this.g.lineTo(x2, -y2);
    this.g.stroke();
  }

  poly(points: number[], hex: string, alpha = 255) {
    this.g.fillColor = this.color(hex, alpha);
    this.g.moveTo(points[0], -points[1]);
    for (let index = 2; index < points.length; index += 2) this.g.lineTo(points[index], -points[index + 1]);
    this.g.close();
    this.g.fill();
  }
}

export const palette = {
  code: '#2f7d63', art: '#c58a32', design: '#497899', skin: '#f1cfb0', hair: '#3b3330',
  desk: '#a7774c', deskTop: '#c4925f', screenOn: '#cfeee0', screenArt: '#f6e2b8', screenOff: '#5c6a66'
};

// Fixed seat layout so desks stay put as people join.
export function seatLayout(seats: number, w: number, h: number) {
  const rows = seats > 4 ? 2 : 1;
  const perRow = Math.ceil(seats / rows);
  const result: { x: number; y: number; scale: number }[] = [];
  for (let index = 0; index < seats; index++) {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    const gap = w / (perRow + 0.4);
    const scale = Math.min(rows === 2 ? (row === 0 ? 0.78 : 0.95) : 1, gap / 62);
    result.push({ x: gap * (column + 0.7), y: rows === 2 ? (row === 0 ? h * 0.5 : h * 0.79) : h * 0.72, scale });
  }
  return result;
}

export function drawRoom(pen: Pen, w: number, h: number, office: number) {
  const formal = office >= 1;
  pen.rect(0, 0, w, h, formal ? '#e6eee9' : '#f1e7d6', 8);
  const floor = formal ? h * 0.42 : h * 0.55;
  pen.rect(0, floor, w, h - floor, formal ? '#cdd8d2' : '#dcc6a3', 0);
  pen.rect(0, h - 8, w, 8, formal ? '#bccac3' : '#c9ae86', 0);
  if (formal) {
    for (let index = 0; index < 3; index++) {
      const x = 18 + index * (w - 36) / 3;
      const width = (w - 36) / 3 - 14;
      pen.rect(x, 12, width, floor - 24, '#bfe0ee', 3);
      pen.rect(x, 12 + (floor - 24) * 0.62, width, (floor - 24) * 0.38, '#d9ecf3', 0);
      pen.frame(x, 12, width, floor - 24, '#9fb7bf', 2, 3);
      pen.line(x + width / 2, 12, x + width / 2, floor - 12, '#9fb7bf', 2);
    }
    pen.rect(w - 44, floor - 30, 26, 30, '#8b6a4c', 3);
    pen.circle(w - 31, floor - 40, 16, '#5c9a6e');
    pen.circle(w - 40, floor - 50, 10, '#6fae7f');
  } else {
    pen.rect(22, 14, 72, floor - 34, '#bfe0ee', 3);
    pen.circle(70, 30, 8, '#ffe6a3');
    pen.frame(22, 14, 72, floor - 34, '#9a8466', 3, 3);
    pen.line(58, 14, 58, floor - 20, '#9a8466', 2);
    pen.rect(w - 92, 20, 46, 30, '#fbf6ec', 2);
    pen.rect(w - 86, 26, 34, 6, '#e6a85c', 1);
    pen.rect(w - 86, 36, 22, 4, '#c9bba3', 1);
    pen.rect(w - 34, floor - 24, 18, 24, '#b07b55', 3);
    pen.circle(w - 25, floor - 34, 12, '#6fae7f');
  }
}

export function drawDesk(pen: Pen, x: number, y: number, scale: number, occupied: boolean, role: string, working: boolean) {
  const s = scale;
  if (occupied) {
    pen.rect(x - 11 * s, y - 34 * s, 22 * s, 20 * s, role === 'art' ? palette.art : role === 'design' ? palette.design : palette.code, 7 * s);
  } else {
    pen.rect(x - 11 * s, y - 24 * s, 22 * s, 12 * s, '#b9a993', 4 * s, 120);
  }
  pen.rect(x - 15 * s, y - 33 * s, 22 * s, 16 * s, '#3f4a47', 2 * s);
  pen.rect(x - 13 * s, y - 31 * s, 18 * s, 12 * s, occupied && working ? (role === 'art' ? palette.screenArt : palette.screenOn) : palette.screenOff, 1 * s);
  pen.rect(x - 7 * s, y - 17 * s, 6 * s, 4 * s, '#3f4a47', 0);
  pen.rect(x - 28 * s, y - 13 * s, 56 * s, 7 * s, palette.deskTop, 2 * s);
  pen.rect(x - 25 * s, y - 6 * s, 4 * s, 16 * s, palette.desk, 0);
  pen.rect(x + 21 * s, y - 6 * s, 4 * s, 16 * s, palette.desk, 0);
}

export function drawHead(pen: Pen, scale: number, role: string) {
  const s = scale;
  pen.circle(0, 0, 9 * s, palette.skin);
  pen.rect(-9 * s, -10 * s, 18 * s, 7 * s, role === 'art' ? '#7a4b2a' : palette.hair, 4 * s);
}

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

// Prototype art: content count follows progress, colors and details follow visual quality.
export function drawWork(pen: Pen, w: number, h: number, type: string, progress: number, visual: number, seed = 7) {
  const tier = visual < 35 ? 0 : visual < 62 ? 1 : 2;
  const rand = seeded(seed);
  const gray = (light: number) => ['#e9ebea', '#d3d7d5', '#b7bdba', '#9aa29e'][light];
  const box = (x: number, y: number, bw: number, bh: number, light = 1) => {
    pen.rect(x, y, bw, bh, gray(light), 2);
    pen.frame(x, y, bw, bh, gray(3), 1, 2);
    pen.line(x, y, x + bw, y + bh, gray(2), 1);
    pen.line(x + bw, y, x, y + bh, gray(2), 1);
  };
  const ground = h * 0.74;
  const k = Math.min(1, h / 96);
  if (type === 'sim') {
    pen.rect(0, 0, w, h, tier ? '#cfe9f5' : gray(0), 6);
    if (tier === 2) { pen.circle(w * 0.84, h * 0.2, 13, '#ffd77a'); pen.circle(w * 0.25, h * 0.17, 9, '#ffffff', 220); pen.circle(w * 0.3, h * 0.15, 11, '#ffffff', 220); }
    pen.rect(0, ground, w, h - ground, tier ? '#9ccf7f' : gray(1), 0);
    const count = Math.max(1, Math.ceil(progress * 7));
    for (let index = 0; index < count; index++) {
      const bw = 28 + rand() * 14;
      const bh = (26 + rand() * 40) * k * 0.85;
      const x = 14 + index * (w - 40) / 7;
      if (!tier) { box(x, ground - bh, bw, bh, 1); continue; }
      const colors = ['#e8a87c', '#8fb9d9', '#f2d083', '#c9a3d6', '#9fd3b5'];
      pen.rect(x, ground - bh, bw, bh, colors[index % colors.length], 2);
      pen.poly([x - 3, ground - bh, x + bw / 2, ground - bh - 12, x + bw + 3, ground - bh], '#b5564a');
      if (tier === 2) for (let row = 0; row < Math.floor(bh / 14); row++) { pen.rect(x + 5, ground - bh + 6 + row * 13, 7, 6, '#fff7d6', 1); pen.rect(x + bw - 12, ground - bh + 6 + row * 13, 7, 6, '#fff7d6', 1); }
    }
    if (tier === 2) for (let index = 0; index < 5; index++) { const x = 10 + rand() * (w - 20); pen.rect(x - 1.5, ground - 2, 3, 10, '#7a5a3a'); pen.circle(x, ground - 6, 7, '#4f9a5f'); }
  } else if (type === 'story') {
    pen.rect(0, 0, w, h, tier ? '#2e3a5c' : gray(0), 6);
    if (tier === 2) for (let index = 0; index < 18; index++) pen.circle(rand() * w, rand() * h * 0.55, 1 + rand(), '#fff6d0');
    if (progress > 0.05) tier ? pen.circle(w * 0.78, h * 0.22, 15, '#f7e7b0') : box(w * 0.72, h * 0.1, 26, 26, 1);
    pen.poly([0, ground, w * 0.3, h * 0.5, w * 0.6, ground], tier ? '#3f5873' : gray(1));
    pen.rect(0, ground, w, h - ground, tier ? '#24324a' : gray(2), 0);
    if (progress > 0.3) {
      if (tier) { pen.rect(w * 0.55, ground - 34, 46, 34, '#5b4a6a', 2); pen.poly([w * 0.55 - 5, ground - 34, w * 0.55 + 23, ground - 54, w * 0.55 + 51, ground - 34], '#7a3e4a'); pen.rect(w * 0.55 + 18, ground - 24, 10, 10, '#ffd77a', 1); }
      else box(w * 0.55, ground - 40, 46, 40, 1);
    }
    if (progress > 0.55) {
      if (tier) { pen.rect(w * 0.3 - 6, ground - 26, 12, 20, '#c8574f', 4); pen.circle(w * 0.3, ground - 32, 7, palette.skin); }
      else box(w * 0.3 - 8, ground - 36, 16, 36, 1);
    }
    if (progress > 0.8) for (let index = 0; index < 4; index++) tier ? pen.circle(w * 0.36 + index * 18, ground + 10, 3, '#ffd77a', 200) : box(w * 0.36 + index * 18 - 4, ground + 6, 8, 8, 2);
  } else {
    pen.rect(0, 0, w, h, tier ? '#ffe3c2' : gray(0), 6);
    if (tier === 2) { pen.poly([0, ground, w * 0.2, h * 0.3, w * 0.42, ground], '#f2b48a', 200); pen.poly([w * 0.3, ground, w * 0.62, h * 0.22, w * 0.95, ground], '#e79c78', 200); }
    pen.rect(0, ground, w, h - ground, tier ? '#8a5a3c' : gray(2), 0);
    const count = Math.max(1, Math.ceil(progress * 5));
    for (let index = 0; index < count; index++) {
      const x = 20 + index * (w - 60) / 5 + rand() * 10;
      const y = ground - 22 - rand() * h * 0.38;
      tier ? pen.rect(x, y, 42, 9, '#6f9a4f', 3) : box(x, y, 42, 9, 1);
      if (progress > 0.6 && index % 2) tier ? pen.circle(x + 21, y - 9, 4, '#f5c542') : box(x + 17, y - 13, 8, 8, 2);
    }
    if (progress > 0.1) {
      if (tier) { pen.rect(26, ground - 26, 14, 18, '#3a6ea5', 4); pen.circle(33, ground - 32, 7, palette.skin); pen.rect(40, ground - 22, 12, 3, '#d8dde0', 1); }
      else box(24, ground - 36, 18, 36, 1);
    }
    if (progress > 0.4) for (let index = 0; index < 2; index++) tier ? pen.rect(w * 0.6 + index * 50, ground - 16, 18, 16, '#b3473f', 6) : box(w * 0.6 + index * 50, ground - 18, 18, 18, 1);
  }
  if (!tier) pen.frame(1, 1, w - 2, h - 2, gray(3), 1, 6);
}
