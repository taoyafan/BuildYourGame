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

// Fixed seat layout so desks stay put as people join. Desks sit on the floor, below the wall props.
export function seatLayout(seats: number, w: number, h: number) {
  const rows = seats > 4 ? 2 : 1;
  const perRow = Math.ceil(seats / rows);
  const result: { x: number; y: number; scale: number }[] = [];
  for (let index = 0; index < seats; index++) {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    const gap = w / (perRow + 0.4);
    const scale = Math.min(rows === 2 ? (row === 0 ? 0.78 : 0.92) : 1, gap / 62, h / 150);
    result.push({ x: gap * (column + 0.7), y: rows === 2 ? (row === 0 ? h * 0.72 : h * 0.93) : h * 0.88, scale });
  }
  return result;
}

// Where the wall props sit: the window, the big screen with the current work, the star plaque, the
// whiteboard (calendar) and the shelf (achievements).
export function roomProps(w: number, h: number, office: number) {
  const floor = h * 0.5;
  const tall = Math.max(18, floor - 34);
  return {
    floor,
    window: { x: 10, y: 10, w: w * 0.16, h: Math.max(16, floor - 22) },
    screen: { x: w * 0.21, y: 8, w: w * 0.4, h: Math.max(30, floor - 14) },
    plaque: { x: w * 0.65, y: 6, w: w * 0.33, h: 18 },
    board: { x: w * 0.65, y: 28, w: w * 0.155, h: tall },
    shelf: { x: w * 0.825, y: 28, w: w * 0.155, h: tall }
  };
}

function star(pen: Pen, cx: number, cy: number, r: number, hex: string) {
  const points: number[] = [];
  for (let index = 0; index < 10; index++) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 ? r * 0.45 : r;
    points.push(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
  }
  pen.poly(points, hex);
}

export function drawRoom(pen: Pen, w: number, h: number, office: number, record: { cups: number; books: number; stars: number; starColor: string } = { cups: 0, books: 0, stars: 1, starColor: '#2f7d63' }) {
  const formal = office >= 1;
  const props = roomProps(w, h, office);
  pen.rect(0, 0, w, h, formal ? '#e6eee9' : '#f1e7d6', 8);
  const floor = props.floor;
  pen.rect(0, floor, w, h - floor, formal ? '#cdd8d2' : '#dcc6a3', 0);
  pen.rect(0, h - 8, w, 8, formal ? '#bccac3' : '#c9ae86', 0);
  const win = props.window;
  pen.rect(win.x, win.y, win.w, win.h, '#bfe0ee', 3);
  pen.rect(win.x, win.y + win.h * 0.62, win.w, win.h * 0.38, '#d9ecf3', 0);
  if (!formal) pen.circle(win.x + win.w * 0.7, win.y + 10, 6, '#ffe6a3');
  pen.frame(win.x, win.y, win.w, win.h, formal ? '#9fb7bf' : '#9a8466', 2, 3);
  pen.line(win.x + win.w / 2, win.y, win.x + win.w / 2, win.y + win.h, formal ? '#9fb7bf' : '#9a8466', 2);
  // Big screen bezel; the work itself is drawn into it by the app.
  const screen = props.screen;
  pen.rect(screen.x - 4, screen.y - 4, screen.w + 8, screen.h + 8, '#2b3532', 4);
  pen.rect(screen.x + screen.w / 2 - 6, screen.y + screen.h + 4, 12, 4, '#2b3532', 0);
  // Star plaque.
  const plaque = props.plaque;
  pen.rect(plaque.x, plaque.y, plaque.w, plaque.h, '#8b6a4c', 4);
  pen.rect(plaque.x + 2, plaque.y + 2, plaque.w - 4, plaque.h - 4, '#f5ead2', 3);
  for (let index = 0; index < 3; index++) star(pen, plaque.x + plaque.w / 2 + (index - 1) * 14, plaque.y + plaque.h / 2, 6, index < record.stars ? record.starColor : '#d8cdb5');
  // Whiteboard with a little month grid.
  const board = props.board;
  pen.rect(board.x, board.y, board.w, board.h, '#fbfbf7', 3);
  pen.frame(board.x, board.y, board.w, board.h, '#8e9b97', 2, 3);
  pen.rect(board.x + 4, board.y + 3, board.w - 8, 4, '#d9534f', 1);
  const cellW = (board.w - 10) / 4;
  const rows = Math.min(4, Math.max(1, Math.floor((board.h - 22) / 6)));
  for (let row = 0; row < rows; row++) for (let col = 0; col < 4; col++) pen.rect(board.x + 5 + col * cellW, board.y + 10 + row * 6, cellW - 2, 4, row === 1 && col === 2 ? '#e6a85c' : '#dfe4e2', 1);
  // Shelf: one spine per released title, cups grow with unlocked achievements.
  const shelf = props.shelf;
  const plankY = shelf.y + shelf.h - 16;
  pen.rect(shelf.x, plankY, shelf.w, 4, '#8b6a4c', 1);
  const spines = Math.min(5, record.books);
  const spineColors = ['#c8574f', '#497899', '#e0a526', '#2f7d63', '#9b6fb0', '#d9814f'];
  for (let index = 0; index < spines; index++) pen.rect(shelf.x + 3 + index * 5, plankY - 13, 4, 13, spineColors[index % spineColors.length], 1);
  const cups = Math.min(3, record.cups);
  for (let index = 0; index < cups; index++) {
    const x = shelf.x + shelf.w - 10 - index * 9;
    pen.rect(x - 1, plankY - 3, 6, 3, '#b07b2a', 1);
    pen.rect(x + 1, plankY - 7, 2, 4, '#e0a526', 0);
    pen.circle(x + 2, plankY - 10, 3.5, '#f2c14e');
  }
  if (!spines && !cups) pen.frame(shelf.x + 6, plankY - 14, 12, 14, '#b9a993', 1, 1);
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
  if (type === 'think' || type === 'sim') {
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
    if (tier === 2) for (let index = 0; index < 5; index++) { const x = 9 + rand() * (w - 18); pen.rect(x - 1.5, ground - 2, 3, 10, '#7a5a3a'); pen.circle(x, ground - 6, 7, '#4f9a5f'); }
  } else if (type === 'story') {
    pen.rect(0, 0, w, h, tier ? '#2e3a5c' : gray(0), 6);
    if (tier === 2) for (let index = 0; index < 18; index++) pen.circle(3 + rand() * (w - 6), 3 + rand() * (h * 0.55 - 3), 1 + rand(), '#fff6d0');
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
