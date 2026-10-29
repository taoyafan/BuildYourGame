const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const project = path.resolve(__dirname, '..');
const lucide = require(path.join(__dirname, 'vendor/lucide.min.js'));
const iconDirectory = path.join(project, 'assets/resources/icons');
fs.mkdirSync(iconDirectory, { recursive: true });
const names = [
  'Sun', 'Play', 'Pause', 'FolderKanban', 'Users', 'Wrench', 'FlaskConical', 'ChartNoAxesCombined', 'Building2', 'ArrowLeft', 'X', 'ChevronRight',
  'Rocket', 'Target', 'Coins', 'Trophy', 'Lock', 'Check', 'Megaphone', 'Bug', 'Sparkles', 'UserPlus', 'Palette', 'TrendingUp', 'Gift', 'Star'
];
for (const name of names) {
  const icon = lucide[name] || lucide.icons?.[name];
  const nodes = icon?.[0] === 'svg' ? icon[2] : Array.isArray(icon) ? icon : icon?.iconNode;
  if (!nodes) throw new Error('Missing local Lucide icon: ' + name);
  const shapes = nodes.map(([tag, attributes]) => '<' + tag + ' ' + Object.entries(attributes).map(([key, value]) => key + '="' + value + '"').join(' ') + '/>').join('');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + shapes + '</svg>';
  fs.writeFileSync(path.join(iconDirectory, name + '.png'), new Resvg(svg).render().asPng());
}
console.log('Prepared ' + names.length + ' local icons for Creator.');

const soundDirectory = path.join(project, 'assets/resources/sounds');
fs.mkdirSync(soundDirectory, { recursive: true });
const sounds = { click: [660], income: [660, 880], launch: [392, 523, 659, 784], breakeven: [523, 659, 784, 1047] };
for (const [name, notes] of Object.entries(sounds)) {
  const rate = 22050;
  const duration = name === 'click' ? 0.05 : 0.12;
  const count = Math.ceil(rate * duration * notes.length);
  const wave = Buffer.alloc(44 + count * 2);
  wave.write('RIFF', 0);
  wave.writeUInt32LE(36 + count * 2, 4);
  wave.write('WAVEfmt ', 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(rate, 24);
  wave.writeUInt32LE(rate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write('data', 36);
  wave.writeUInt32LE(count * 2, 40);
  for (let sample = 0; sample < count; sample++) {
    const time = sample / rate;
    const note = Math.min(notes.length - 1, Math.floor(time / duration));
    const local = (time - note * duration) / duration;
    const envelope = Math.min(1, local * 20) * Math.pow(1 - local, 2);
    wave.writeInt16LE(Math.round(Math.sin(time * notes[note] * Math.PI * 2) * envelope * 7000), 44 + sample * 2);
  }
  fs.writeFileSync(path.join(soundDirectory, name + '.wav'), wave);
}
console.log('Prepared ' + Object.keys(sounds).length + ' local sound effects for Creator.');
