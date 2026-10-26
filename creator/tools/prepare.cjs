const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const { Resvg } = require('@resvg/resvg-js');

const project = path.resolve(__dirname, '..');
const root = path.resolve(project, '..');
const generated = path.join(project, 'assets/scripts/generated');
const resources = path.join(project, 'assets/resources');
fs.mkdirSync(generated, { recursive: true });
fs.mkdirSync(resources, { recursive: true });
for (const [input, output] of [['game.js', 'logic.ts'], ['minigame/js/content.js', 'content.ts']]) {
  esbuild.buildSync({
    entryPoints: [path.join(root, input)],
    outfile: path.join(generated, output),
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2020',
    tsconfigRaw: {}
  });
}
for (const name of ['logic.js', 'content.js']) fs.rmSync(path.join(generated, name), { force: true });
const image = new Resvg(fs.readFileSync(path.join(root, 'office.svg')), {
  fitTo: { mode: 'width', value: 1024 }
}).render().asPng();
fs.writeFileSync(path.join(resources, 'office.png'), image);
const lucide = require(path.join(root, 'lucide.min.js'));
const iconDirectory = path.join(resources, 'icons');
fs.mkdirSync(iconDirectory, { recursive: true });
for (const name of ['Sun', 'Play', 'Pause', 'FolderKanban', 'Users', 'Wrench', 'FlaskConical', 'ChartNoAxesCombined', 'Building2', 'ArrowLeft', 'X', 'ChevronRight']) {
  const icon = lucide[name] || lucide.icons?.[name];
  const nodes = icon?.[0] === 'svg' ? icon[2] : Array.isArray(icon) ? icon : icon?.iconNode;
  if (!nodes) throw new Error('Missing local Lucide icon: ' + name);
  const shapes = nodes.map(([tag, attributes]) => '<' + tag + ' ' + Object.entries(attributes).map(([key, value]) => key + '="' + value + '"').join(' ') + '/>').join('');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + shapes + '</svg>';
  fs.writeFileSync(path.join(iconDirectory, name + '.png'), new Resvg(svg).render().asPng());
}
console.log('Prepared shared logic, menu content and local office artwork for Creator.');