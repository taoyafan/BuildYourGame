// 把 Creator 的纯逻辑（core/Studio.ts、core/Content.ts）打包进 HTML 版：逻辑只有一份来源，
// 界面在 ui.js 里用 DOM 重写。产出 web/logic.js 与可单文件打开的 dist/日光工作室.html。
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const core = join(root, 'creator', 'assets', 'scripts', 'core');

const entry = join(here, '.entry.tmp.ts');
await writeFile(entry, `export * as core from ${JSON.stringify(join(core, 'Studio.ts'))};\nexport * as content from ${JSON.stringify(join(core, 'Content.ts'))};\n`);

const bundled = await build({
  entryPoints: [entry],
  bundle: true,
  format: 'iife',
  globalName: 'Logic',
  target: 'es2019',
  logLevel: 'warning',
  write: false,
});
await writeFile(join(here, 'logic.js'), bundled.outputFiles[0].text);
await unlink(entry);

// 单文件版本：把 logic.js 与 ui.js 内联进 index.html，方便直接双击打开或发给别人试玩。
const [html, logic, ui] = await Promise.all([
  readFile(join(here, 'index.html'), 'utf8'),
  readFile(join(here, 'logic.js'), 'utf8'),
  readFile(join(here, 'ui.js'), 'utf8'),
]);
const single = html
  .replace('<script src="logic.js"></script>', `<script>\n${logic}\n</script>`)
  .replace('<script src="ui.js"></script>', `<script>\n${ui}\n</script>`);
await mkdir(join(root, 'dist'), { recursive: true });
// 两份内容一样：中文名给人看，index.html 让本地服务有个短地址（手机上手输）。
await writeFile(join(root, 'dist', '日光工作室.html'), single);
await writeFile(join(root, 'dist', 'index.html'), single);
console.log('built web/logic.js、dist/日光工作室.html、dist/index.html');
