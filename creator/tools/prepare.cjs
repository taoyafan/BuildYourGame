const fs = require('node:fs');
const path = require('node:path');
const { Resvg } = require('@resvg/resvg-js');

const project = path.resolve(__dirname, '..');
const lucide = require(path.join(__dirname, 'vendor/lucide.min.js'));
const iconDirectory = path.join(project, 'assets/resources/icons');
fs.mkdirSync(iconDirectory, { recursive: true });
const names = [
  'Sun', 'Play', 'Pause', 'FolderKanban', 'Users', 'FlaskConical', 'ChartNoAxesCombined', 'Building2', 'ArrowLeft', 'X', 'ChevronRight',
  'Rocket', 'Target', 'Coins', 'Trophy', 'Lock', 'Check', 'Megaphone', 'Bug', 'Sparkles', 'UserPlus', 'Palette', 'TrendingUp', 'Gift', 'Star', 'CircleHelp',
  'CalendarDays', 'Newspaper', 'Award', 'Hammer', 'ScrollText',
  'ArrowUp', 'ArrowDown', 'Download', 'Upload', 'RotateCcw', 'Plane', 'Moon', 'UserMinus', 'GraduationCap', 'Briefcase', 'Music'
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

// Background music: a calm 8-bar chiptune loop (C Am F G, 120 bpm), synthesised here so no audio file is
// kept in git. Low sample rate and a short loop keep it small enough for the mini-game main package.
function writeWav(file, samples, rate) {
  const wave = Buffer.alloc(44 + samples.length * 2);
  wave.write('RIFF', 0);
  wave.writeUInt32LE(36 + samples.length * 2, 4);
  wave.write('WAVEfmt ', 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(1, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(rate, 24);
  wave.writeUInt32LE(rate * 2, 28);
  wave.writeUInt16LE(2, 32);
  wave.writeUInt16LE(16, 34);
  wave.write('data', 36);
  wave.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((value, index) => wave.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + index * 2));
  fs.writeFileSync(file, wave);
}
{
  const rate = 11025;
  const beat = 0.5;
  const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const _ = null;
  const melody = [
    [72, _, 76, 74, 72, _, 67, _], [69, _, 72, _, 76, 74, 72, _], [69, _, 72, 74, 72, _, 69, 67], [67, _, _, 71, 74, _, 72, _],
    [76, _, 74, 72, 74, _, 76, 79], [81, _, 79, 76, 72, _, 74, _], [72, _, 69, 72, 74, 76, 74, 72], [71, _, 67, _, 74, _, _, _]
  ];
  const length = Math.round(rate * beat * 4 * melody.length);
  const out = new Float32Array(length);
  const frequency = note => 440 * Math.pow(2, (note - 69) / 12);
  const waves = {
    lead: phase => Math.sin(phase * Math.PI * 2) * 0.8 + Math.sin(phase * Math.PI * 6) * 0.2,
    bass: phase => 1 - 4 * Math.abs(phase - 0.5),
    bell: phase => Math.sin(phase * Math.PI * 2)
  };
  // Notes wrap around the end, so a tail ringing past the last bar fades into the first one seamlessly.
  const play = (start, duration, note, volume, wave) => {
    const from = Math.round(start * rate);
    const count = Math.round(duration * rate);
    const step = frequency(note) / rate;
    for (let index = 0; index < count; index++) {
      const envelope = Math.min(1, index / (rate * 0.01)) * Math.pow(1 - index / count, 1.5);
      out[(from + index) % length] += waves[wave]((index * step) % 1) * envelope * volume;
    }
  };
  melody.forEach((bar, number) => {
    const chord = chords[number % chords.length];
    const start = number * beat * 4;
    for (let index = 0; index < 4; index++) play(start + index * beat, beat * 0.9, (index % 2 ? chord[2] : chord[0]) - 12, 0.3, 'bass');
    for (let index = 0; index < 8; index++) play(start + index * beat / 2, beat * 0.45, chord[index % 3] + 12, 0.06, 'bell');
    bar.forEach((note, index) => {
      if (note === null) return;
      let span = 1;
      while (index + span < bar.length && bar[index + span] === null) span++;
      play(start + index * beat / 2, span * beat / 2 * 0.95, note, 0.18, 'lead');
    });
  });
  const peak = out.reduce((top, value) => Math.max(top, Math.abs(value)), 0) || 1;
  writeWav(path.join(soundDirectory, 'bgm.wav'), out.map(value => value / peak * 0.7), rate);
  console.log('Prepared background music for Creator.');
}
