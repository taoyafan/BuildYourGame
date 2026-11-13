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

// Fixed seat layout so desks stay put as people join. Desks sit on the floor, below the wall props;
// up to four rows, back rows smaller, so twenty desks still fit the picture.
export function seatLayout(seats: number, w: number, h: number) {
  const rows = seats <= 4 ? 1 : seats <= 10 ? 2 : seats <= 15 ? 3 : 4;
  const perRow = Math.ceil(seats / rows);
  const result: { x: number; y: number; scale: number }[] = [];
  for (let index = 0; index < seats; index++) {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    const gap = w / (perRow + 0.4);
    const depth = rows === 1 ? 1 : rows === 2 ? (row === 0 ? 0.78 : 0.92) : 0.7 + 0.2 * row / (rows - 1);
    const spacing = rows > 2 ? h * 0.27 / (rows - 1) / 34 : 1;
    const scale = Math.min(depth, gap / 62, h / 150, spacing * depth / 0.9);
    const y = rows === 1 ? h * 0.88 : rows === 2 ? (row === 0 ? h * 0.72 : h * 0.93) : h * (0.66 + 0.27 * row / (rows - 1));
    result.push({ x: gap * (column + 0.7), y, scale });
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
  const formal = office >= 2;
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
  for (let index = 0; index < 5; index++) star(pen, plaque.x + plaque.w / 2 + (index - 2) * 11, plaque.y + plaque.h / 2, 5, index < record.stars ? record.starColor : '#d8cdb5');
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

function seeded(seed: number) {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

export const SKINS = ['#f7dcc4', '#f1cfb0', '#e5b892', '#c9956f', '#9c6a4b'];
export const HAIRS = ['#2b2523', '#4a3328', '#7a4b2a', '#b5833f', '#e2d2a8', '#8a8f94', '#a2443a', '#3b4f7a'];
export const HAIR_STYLES = 5;
export const FACES = 3;
export const GLASSES = ['不戴', '方框', '圆框', '墨镜'];
const EXTRAS = ['#2f7d63', '#c8574f', '#497899', '#e0a526', '#9b6fb0'];

// A simple face built from the person's id, so the same person always looks the same everywhere. A chosen
// look (the founder's) overrides skin, hair style, hair colour and glasses.
export function drawAvatar(pen: Pen, cx: number, cy: number, r: number, id: string, look: any = null) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  const rand = seeded(hash);
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  let skin = pick(SKINS);
  let hair = pick(HAIRS);
  const extra = pick(EXTRAS);
  let face = Math.floor(rand() * 3);
  let style = Math.floor(rand() * 5);
  let accessory = Math.floor(rand() * 6);
  if (look) {
    skin = SKINS[look.skin] || skin;
    hair = HAIRS[look.hairColor] || hair;
    style = Number.isInteger(look.hair) ? look.hair : style;
    face = Number.isInteger(look.face) ? look.face : face;
    // Older looks stored glasses as a boolean.
    const glasses = look.glasses === true ? 1 : Number(look.glasses) || 0;
    accessory = [0, 1, 5, 6][glasses] || 0;
  }
  const w = r * (face === 1 ? 1.5 : face === 2 ? 1.4 : 1.6);
  const h = r * (face === 2 ? 1.85 : 1.6);
  const top = cy - h / 2;
  if (style === 2) pen.rect(cx - w / 2 - r * 0.15, top, w + r * 0.3, h * 0.95, hair, r * 0.5);
  if (style === 3) pen.circle(cx, top - r * 0.12, r * 0.38, hair);
  pen.rect(cx - w / 2, top, w, h, skin, face === 0 ? w / 2 : r * 0.45);
  if (style !== 4) pen.rect(cx - w / 2 - r * 0.05, top - r * 0.08, w + r * 0.1, h * (style === 1 ? 0.42 : 0.3), hair, r * 0.45);
  if (style === 1) { pen.rect(cx - w / 2 - r * 0.08, top + h * 0.15, r * 0.3, h * 0.55, hair, r * 0.12); pen.rect(cx + w / 2 - r * 0.22, top + h * 0.15, r * 0.3, h * 0.55, hair, r * 0.12); }
  if (style === 4) pen.rect(cx - w / 2, top, w, h * 0.16, hair, r * 0.3, 150);
  const eyeY = top + h * 0.55;
  pen.circle(cx - w * 0.2, eyeY, Math.max(0.8, r * 0.1), '#2b2523');
  pen.circle(cx + w * 0.2, eyeY, Math.max(0.8, r * 0.1), '#2b2523');
  pen.rect(cx - r * 0.18, top + h * 0.76, r * 0.36, Math.max(0.8, r * 0.08), '#a5584a', r * 0.04);
  if (accessory === 1) {
    pen.line(cx - w * 0.38, eyeY, cx + w * 0.38, eyeY, '#2b3532', Math.max(0.8, r * 0.08));
    pen.frame(cx - w * 0.36, eyeY - r * 0.18, w * 0.3, r * 0.36, '#2b3532', Math.max(0.8, r * 0.08), r * 0.1);
    pen.frame(cx + w * 0.06, eyeY - r * 0.18, w * 0.3, r * 0.36, '#2b3532', Math.max(0.8, r * 0.08), r * 0.1);
  } else if (accessory === 5) {
    const lens = r * 0.2;
    pen.line(cx - w * 0.2 + lens, eyeY, cx + w * 0.2 - lens, eyeY, '#2b3532', Math.max(0.8, r * 0.07));
    pen.frame(cx - w * 0.2 - lens, eyeY - lens, lens * 2, lens * 2, '#2b3532', Math.max(0.8, r * 0.07), lens);
    pen.frame(cx + w * 0.2 - lens, eyeY - lens, lens * 2, lens * 2, '#2b3532', Math.max(0.8, r * 0.07), lens);
  } else if (accessory === 6) {
    pen.line(cx - w * 0.4, eyeY, cx + w * 0.4, eyeY, '#1d2422', Math.max(0.8, r * 0.08));
    pen.rect(cx - w * 0.38, eyeY - r * 0.16, w * 0.32, r * 0.32, '#1d2422', r * 0.12);
    pen.rect(cx + w * 0.06, eyeY - r * 0.16, w * 0.32, r * 0.32, '#1d2422', r * 0.12);
  } else if (accessory === 2) {
    pen.rect(cx - w / 2 - r * 0.12, top - r * 0.2, w + r * 0.24, r * 0.2, '#3f4a47', r * 0.1);
    pen.rect(cx - w / 2 - r * 0.25, eyeY - r * 0.3, r * 0.3, r * 0.55, extra, r * 0.12);
    pen.rect(cx + w / 2 - r * 0.05, eyeY - r * 0.3, r * 0.3, r * 0.55, extra, r * 0.12);
  } else if (accessory === 3) {
    pen.rect(cx - w / 2 - r * 0.05, top - r * 0.12, w + r * 0.1, h * 0.28, extra, r * 0.35);
    pen.rect(cx - w / 2 - r * 0.05, top + h * 0.12, w * 0.75, r * 0.14, extra, r * 0.07);
  } else if (accessory === 4) {
    pen.circle(cx - w / 2, eyeY + h * 0.14, Math.max(0.8, r * 0.1), '#e0a526');
    pen.circle(cx + w / 2, eyeY + h * 0.14, Math.max(0.8, r * 0.1), '#e0a526');
  }
}

// A module brick: family colour, the module's glyph on the face, one stud per level on top and a metal
// rim from the third level up. Built means solid, in progress half filled, missing only an outline.
export function drawBrick(pen: Pen, x: number, y: number, size: number, color: string, glyph: string, level: number, status: string, oneOff = false) {
  const studs = Math.max(1, Math.min(5, level || 1));
  const studW = size * 0.14;
  const top = y + size * 0.14;
  const body = size - size * 0.14;
  const solid = status === 'have';
  const faint = status === 'missing';
  const alpha = faint ? 70 : 255;
  const gap = (size - studs * studW) / (studs + 1);
  for (let index = 0; index < studs; index++) pen.rect(x + gap + index * (studW + gap), y + size * 0.03, studW, size * 0.13, faint ? '#c9d3cd' : color, size * 0.03, alpha);
  if (faint) pen.rect(x, top, size, body, '#eef2ef', size * 0.12);
  else {
    pen.rect(x, top, size, body, color, size * 0.12, solid ? 255 : 110);
    if (!solid) pen.rect(x, top + body / 2, size, body / 2, color, size * 0.12);
    pen.rect(x + size * 0.06, top + size * 0.05, size * 0.88, body * 0.18, '#ffffff', size * 0.06, 50);
  }
  const rim = level >= 5 ? '#e0a526' : level >= 4 ? '#c3ccd2' : level >= 3 ? '#b07b4f' : faint ? '#b8c4bd' : '#5c6a66';
  pen.frame(x, top, size, body, rim, level >= 3 ? 2.5 : 1.2, size * 0.12);
  if (oneOff) pen.frame(x + 3, top + 3, size - 6, body - 6, '#ffffff', 1, size * 0.1);
  drawGlyph(pen, x + size / 2, top + body / 2, size * 0.32, glyph, faint ? '#a9b5ae' : '#ffffff');
}

// Line-art pictograms for module faces, drawn from simple shapes so they stay crisp at any size.
function drawGlyph(pen: Pen, cx: number, cy: number, r: number, glyph: string, ink: string) {
  const w = Math.max(1.2, r * 0.16);
  switch (glyph) {
    case 'gear':
      for (let index = 0; index < 8; index++) { const a = index * Math.PI / 4; pen.line(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, cx + Math.cos(a) * r, cy + Math.sin(a) * r, ink, w * 1.6); }
      pen.circle(cx, cy, r * 0.62, ink); pen.circle(cx, cy, r * 0.28, '#000000', 60); break;
    case 'disk':
      pen.rect(cx - r, cy - r, r * 2, r * 2, ink, r * 0.2); pen.rect(cx - r * 0.55, cy - r, r * 1.1, r * 0.7, '#000000', 0, 60); pen.rect(cx - r * 0.6, cy + r * 0.15, r * 1.2, r * 0.7, '#000000', r * 0.1, 45); break;
    case 'blueprint':
      pen.frame(cx - r, cy - r * 0.8, r * 2, r * 1.6, ink, w); pen.line(cx - r * 0.6, cy + r * 0.4, cx, cy - r * 0.4, ink, w); pen.line(cx, cy - r * 0.4, cx + r * 0.6, cy + r * 0.4, ink, w); pen.line(cx - r * 0.6, cy + r * 0.4, cx + r * 0.6, cy + r * 0.4, ink, w); break;
    case 'sword':
      pen.line(cx - r * 0.8, cy + r * 0.8, cx + r * 0.8, cy - r * 0.8, ink, w * 1.8); pen.line(cx - r * 0.75, cy + r * 0.15, cx - r * 0.15, cy + r * 0.75, ink, w * 1.6); pen.circle(cx - r * 0.85, cy + r * 0.85, r * 0.16, ink); break;
    case 'book':
      pen.rect(cx - r, cy - r * 0.75, r * 0.95, r * 1.5, ink, r * 0.1); pen.rect(cx + r * 0.05, cy - r * 0.75, r * 0.95, r * 1.5, ink, r * 0.1); pen.line(cx, cy - r * 0.75, cx, cy + r * 0.75, '#3a4744', w); break;
    case 'grid':
      for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) pen.rect(cx - r + col * r * 0.7, cy - r + row * r * 0.7, r * 0.55, r * 0.55, ink, r * 0.08, (row + col) % 2 ? 255 : 150); break;
    case 'dice':
      pen.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7, ink, r * 0.3); for (const [dx, dy] of [[-0.4, -0.4], [0, 0], [0.4, 0.4]]) pen.circle(cx + dx * r, cy + dy * r, r * 0.16, '#000000', 90); break;
    case 'tree':
      pen.line(cx, cy + r, cx, cy - r * 0.2, ink, w * 1.6); pen.line(cx, cy + r * 0.1, cx - r * 0.7, cy - r * 0.5, ink, w); pen.line(cx, cy + r * 0.1, cx + r * 0.7, cy - r * 0.5, ink, w); for (const [dx, dy] of [[0, -0.6], [-0.7, -0.6], [0.7, -0.6]]) pen.circle(cx + dx * r, cy + dy * r, r * 0.25, ink); break;
    case 'person':
      pen.circle(cx, cy - r * 0.45, r * 0.4, ink); pen.rect(cx - r * 0.7, cy + r * 0.05, r * 1.4, r * 0.9, ink, r * 0.4); break;
    case 'mountain':
      pen.poly([cx - r, cy + r * 0.7, cx - r * 0.25, cy - r * 0.5, cx + r * 0.3, cy + r * 0.7], ink); pen.poly([cx - r * 0.1, cy + r * 0.7, cx + r * 0.45, cy - r * 0.1, cx + r, cy + r * 0.7], ink, 180); pen.circle(cx + r * 0.6, cy - r * 0.6, r * 0.2, ink); break;
    case 'note':
      pen.line(cx + r * 0.3, cy + r * 0.5, cx + r * 0.3, cy - r * 0.9, ink, w * 1.4); pen.line(cx + r * 0.3, cy - r * 0.9, cx + r * 0.9, cy - r * 0.6, ink, w * 1.4); pen.circle(cx, cy + r * 0.55, r * 0.38, ink); break;
    case 'speaker':
      pen.rect(cx - r * 0.9, cy - r * 0.35, r * 0.5, r * 0.7, ink); pen.poly([cx - r * 0.4, cy - r * 0.35, cx + r * 0.2, cy - r * 0.85, cx + r * 0.2, cy + r * 0.85, cx - r * 0.4, cy + r * 0.35], ink); pen.line(cx + r * 0.5, cy - r * 0.4, cx + r * 0.5, cy + r * 0.4, ink, w); pen.line(cx + r * 0.8, cy - r * 0.7, cx + r * 0.8, cy + r * 0.7, ink, w); break;
    case 'screen':
      pen.frame(cx - r, cy - r * 0.75, r * 2, r * 1.3, ink, w * 1.3, r * 0.1); pen.line(cx, cy + r * 0.55, cx, cy + r * 0.85, ink, w); pen.line(cx - r * 0.5, cy + r * 0.9, cx + r * 0.5, cy + r * 0.9, ink, w); break;
    case 'phone':
      pen.frame(cx - r * 0.55, cy - r, r * 1.1, r * 2, ink, w * 1.3, r * 0.2); pen.circle(cx, cy + r * 0.7, r * 0.1, ink); break;
    case 'flag':
      pen.line(cx - r * 0.6, cy + r, cx - r * 0.6, cy - r, ink, w * 1.4); pen.poly([cx - r * 0.6, cy - r, cx + r * 0.9, cy - r * 0.55, cx - r * 0.6, cy - r * 0.1], ink); break;
    case 'mask':
      pen.rect(cx - r, cy - r * 0.5, r * 2, r, ink, r * 0.5); pen.circle(cx - r * 0.45, cy, r * 0.22, '#000000', 90); pen.circle(cx + r * 0.45, cy, r * 0.22, '#000000', 90); break;
    case 'scroll':
      pen.rect(cx - r * 0.7, cy - r * 0.8, r * 1.4, r * 1.6, ink, r * 0.1); for (const dy of [-0.4, 0, 0.4]) pen.line(cx - r * 0.4, cy + dy * r, cx + r * 0.4, cy + dy * r, '#3a4744', w); break;
    case 'frame':
      pen.frame(cx - r * 0.8, cy - r, r * 1.6, r * 2, ink, w * 1.5); pen.circle(cx, cy - r * 0.2, r * 0.3, ink); pen.rect(cx - r * 0.45, cy + r * 0.2, r * 0.9, r * 0.5, ink, r * 0.25); break;
    default: {
      const points: number[] = [];
      for (let index = 0; index < 10; index++) { const a = -Math.PI / 2 + index * Math.PI / 5; const rr = index % 2 ? r * 0.45 : r; points.push(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
      pen.poly(points, ink);
    }
  }
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
