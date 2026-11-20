"""Pack approved production art into the game's runtime atlas and layout (creator/assets/resources/art)."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parents[1] / 'creator/assets/resources/art'
OUT.mkdir(parents=True, exist_ok=True)
STATES = ['neutral', 'portrait', 'tired', 'blink', 'idle']
CELL = 192
PAD = 2

people = json.loads((ROOT / 'characters/manifest.json').read_text(encoding='utf-8'))['characters']

def trim(pic):
    pic = pic.convert('RGBA')
    return pic.crop(pic.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox())

def fit(pic, width=None, height=None):
    pic = trim(pic)
    if width: height = round(pic.height * width / pic.width)
    else: width = round(pic.width * height / pic.height)
    return pic.resize((width, height), Image.Resampling.LANCZOS)

# Status and wall icons: a 4x2 sheet in this order.
icon_sheet = Image.open(ROOT / 'status/sources/icons-atlas.png').convert('RGBA')
icon_names = ['star-on', 'star-off', 'trophy-gold', 'trophy-silver', 'trophy-bronze', 'sweat', 'cloud', 'sparkle']
icons = {}
for index, name in enumerate(icon_names):
    col, row = index % 4, index // 4
    cell = icon_sheet.crop((round(col * icon_sheet.width / 4), round(row * icon_sheet.height / 2), round((col + 1) * icon_sheet.width / 4), round((row + 1) * icon_sheet.height / 2)))
    pic = trim(cell)
    scale = 96 / max(pic.size)
    icons[name] = pic.resize((max(1, round(pic.width * scale)), max(1, round(pic.height * scale))), Image.Resampling.LANCZOS)

parts = ROOT / 'cottage/parts'
props = {
    'desk': fit(Image.open(parts / 'desk.png'), width=300),
    'chair': fit(Image.open(parts / 'chair.png'), width=210),
    'laptop-open': fit(Image.open(parts / 'laptop-open.png'), width=160),
    'laptop-closed': fit(Image.open(parts / 'laptop-closed.png'), width=160),
    'mug': trim(Image.open(ROOT / 'cottage-runtime/masters/mug.png')),
    'plant': fit(Image.open(ROOT / 'office-sample/props-source.png').crop((890, 470, 1200, 810)), width=96),
    'notebook': trim(Image.open(ROOT / 'cottage-runtime/masters/notebook.png')),
    **icons,
}

# Characters fill a 5x10 grid; props stack in a column to the right, small ones three to a row.
width = CELL * 5 + PAD + 300
atlas = Image.new('RGBA', (width, CELL * 10))
characters = []
for row, person in enumerate(people):
    frames = {}
    for col, state in enumerate(STATES):
        pic = Image.open(ROOT / 'characters' / person['states'][state]['file']).convert('RGBA').resize((CELL, CELL), Image.Resampling.LANCZOS)
        atlas.alpha_composite(pic, (col * CELL, row * CELL))
        frames[state] = [col * CELL, row * CELL, CELL, CELL]
    rect = person['avatarRect']
    k = CELL / 256
    characters.append({'id': person['id'], 'sex': 'f' if person['sex'] == 'female' else 'm', 'frames': frames,
                       'avatar': [round(rect['x'] * k), round(rect['y'] * k), round(rect['width'] * k), round(rect['height'] * k)]})

rects = {}
x0, y, x, line = CELL * 5 + PAD, 0, CELL * 5 + PAD, 0
for name, pic in props.items():
    if x + pic.width > width:
        x, y, line = x0, y + line + PAD, 0
    atlas.alpha_composite(pic, (x, y))
    rects[name] = [x, y, pic.width, pic.height]
    x += pic.width + PAD
    line = max(line, pic.height)
    if pic.width > 150:
        x, y, line = x0, y + line + PAD, 0
assert y + line <= atlas.height, 'props overflow the atlas'
# A 256-colour palette keeps the mini-game main package small; the hand-painted look survives dithering.
atlas.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.FLOYDSTEINBERG).save(OUT / 'atlas.png', optimize=True)

# Uniform scale: squeezing the wall and stretching the floor pushed the desks far from the wall.
room = Image.open(ROOT / 'cottage/sources/room.png').convert('RGB').resize((1200, 570), Image.Resampling.LANCZOS)
room.save(OUT / 'cottage.jpg', quality=88, optimize=True)

def size(name, width):
    w, h = props[name].size
    return [width, round(h * width / w)]

# Workstation geometry in character-sprite pixels (256 per sprite), origin at the desk line centre.
# Back to front: chair, person, desk, laptop and mug, then the head symbols.
desk, chair = size('desk', 600), size('chair', 262)
laptop, closed, mug = size('laptop-open', 160), size('laptop-closed', 160), size('mug', 50)
plant, notebook = size('plant', 110), size('notebook', 80)
station = {
    'person': [-128, -240, 256, 256],
    'chair': [-chair[0] / 2, -122, chair[0], chair[1]],
    'desk': [-desk[0] / 2, 0, desk[0], round(desk[1] * 0.8)],
    'laptop-open': [-laptop[0] / 2 - 6, 40 - laptop[1], laptop[0], laptop[1]],
    'laptop-closed': [-closed[0] / 2 - 6, 46 - closed[1], closed[0], closed[1]],
    'mug': [120, 40 - mug[1], mug[0], mug[1]],
    'plant': [-270, 44 - plant[1], plant[0], plant[1]],
    'notebook': [170, 50 - notebook[1], notebook[0], notebook[1]],
    'symbols': [[74, -206, 54], [126, -206, 54]],
    'symbolSize': {'sweat': 40, 'cloud': 72},
}

layout = {
    'atlas': 'atlas', 'size': [atlas.width, atlas.height], 'unit': 256, 'states': STATES,
    'characters': characters, 'props': rects, 'station': station,
    'cottage': {
        'image': 'cottage', 'size': list(room.size), 'safe': 75, 'upper': 350,
        # Seat: desk-line x, y, scale, fixed desk ornaments. Columns line up; the front row is larger and
        # low enough that the back row's laptops stay partly visible.
        'seats': [[387, 337, 0.6, ['plant']], [810, 337, 0.6, ['notebook']], [352, 490, 0.7, ['notebook']], [846, 490, 0.7, ['plant']]],
        'screen': [268, 58, 394, 172], 'plaque': [706, 29, 210, 52], 'calendar': [690, 101, 257, 163],
        'shelf': [966, 77, 208, 273], 'shelfPlank': 194,
    },
}
(OUT / 'art.json').write_text(json.dumps(layout, ensure_ascii=False, indent=1), encoding='utf-8')
print(atlas.size, (OUT / 'atlas.png').stat().st_size, (OUT / 'cottage.jpg').stat().st_size)
