// Removes the engine's hard devicePixelRatio cap in the web build.
// The browser screen adapter ships `Math.min(window.devicePixelRatio ?? 1, 2)`, so on 3x phones
// the canvas backing store stays at 2x and the browser upscales the whole frame: everything
// looks blurry. The WeChat adapter feeds the real systemInfo.devicePixelRatio (uncapped), which
// is why the mini game is sharp on the same device. Patching the built engine bundle makes the
// web build match. The pattern is matched exactly once; on mismatch we warn instead of guessing.
const fs = require('node:fs');
const path = require('node:path');

const PATTERN = /return Math\.min\((null!=.{0,80}window\.devicePixelRatio.{0,40}),2\)/;

module.exports = function patchWebPixelRatio(dest) {
  const file = path.join(dest, 'cocos-js', 'cc.js');
  const source = fs.readFileSync(file, 'utf8');
  const matches = source.match(new RegExp(PATTERN, 'g'));
  if (!matches || matches.length !== 1) {
    console.warn('Pixel-ratio patch skipped: engine pattern found ' + (matches ? matches.length : 0) + ' times.');
    return 'skipped (pattern not found)';
  }
  fs.writeFileSync(file, source.replace(PATTERN, 'return $1'));
  return 'patched devicePixelRatio cap in cocos-js/cc.js';
};
