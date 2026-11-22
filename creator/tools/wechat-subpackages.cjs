// Moves Asset Bundles out of the first package and declares them as WeChat subpackages.
// The builder keeps every bundle under `assets/<name>` and only writes `game.json` when the
// compression type is set in the editor's bundle inspector, which the CLI build never sees, so
// the three pieces it would have written are done here instead:
//   1. the bundle folder itself lives in `subpackages/<name>`
//   2. `game.json` lists it so WeChat downloads it on demand
//   3. `src/settings.json` tells the runtime which bundles are subpackages (the adapter then
//      resolves `<name>` to `subpackages/<name>` and calls `wx.loadSubpackage` before loading it)
const fs = require('node:fs');
const path = require('node:path');

// The rooms from the ten-desk office up; the first two offices stay in the first package.
const SUBPACKAGES = ['rooms'];

function findBundle(dest, name) {
  const folder = path.join(dest, 'assets', name);
  const config = path.join(folder, 'config.json');
  return fs.existsSync(config) ? folder : null;
}

// WeChat reads the first `game.js` under a subpackage root as that package's entry and refuses to
// compile without one. Nothing in the room bundle needs an entry, so it stays empty on purpose.
function writeEntry(folder) {
  fs.writeFileSync(path.join(folder, 'game.js'), '// WeChat subpackage entry: the room bundle only carries textures.\n');
}

function move(dest) {
  const moved = [];
  for (const name of SUBPACKAGES) {
    const to = path.join(dest, 'subpackages', name);
    const from = findBundle(dest, name);
    if (!from) {
      if (!fs.existsSync(path.join(to, 'config.json'))) { console.log(`Subpackage ${name}: bundle not found, skipped.`); continue; }
    } else {
      fs.rmSync(to, { recursive: true, force: true });
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.renameSync(from, to);
    }
    writeEntry(to);
    moved.push(name);
  }
  if (!moved.length) return moved;

  const settingsPath = path.join(dest, 'src', 'settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  settings.assets = settings.assets || {};
  settings.assets.subpackages = moved.slice();
  settings.assets.projectBundles = (settings.assets.projectBundles || []).filter((name) => !moved.includes(name));
  settings.assets.preloadBundles = (settings.assets.preloadBundles || []).filter((item) => !moved.includes(item.bundle));
  fs.writeFileSync(settingsPath, JSON.stringify(settings));

  const gamePath = path.join(dest, 'game.json');
  const game = JSON.parse(fs.readFileSync(gamePath, 'utf8'));
  game.subpackages = moved.map((name) => ({ name, root: `subpackages/${name}` }));
  fs.writeFileSync(gamePath, JSON.stringify(game, null, 4));

  return moved;
}

module.exports = function applyWechatSubpackages(dest) {
  const moved = move(dest);
  if (!moved.length) return 'No subpackages moved.';
  const size = (folder) => fs.readdirSync(folder, { withFileTypes: true })
    .reduce((total, item) => total + (item.isDirectory() ? size(path.join(folder, item.name)) : fs.statSync(path.join(folder, item.name)).size), 0);
  const packed = moved.map((name) => ({ name, kb: size(path.join(dest, 'subpackages', name)) / 1024 }));
  const main = (size(dest) - packed.reduce((total, item) => total + item.kb, 0) * 1024) / 1024;
  const detail = packed.map((item) => `${item.name} ${item.kb.toFixed(0)}KB`).join(', ');
  return `Subpackages: ${detail}. First package ${main.toFixed(0)}KB.`;
};
