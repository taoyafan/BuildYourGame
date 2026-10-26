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
