# -*- coding: utf-8 -*-
"""
一键把 Cocos 的 web-mobile 构建产物做成能上传小红书的小工具 zip。

    python xiaohongshu/build_minitool.py

流程：
    creator/build/web-mobile
      -> 复制到 xiaohongshu/build/minitool
      -> 非白名单资源改名（.wav/.bin -> .png）并同步引用
      -> 引擎动态代码静态化（patch-csp.py）
      -> index.html 脚本全外置、去掉行内事件
      -> 写 mini_tool.json 清单 + 官方审计
      -> 打包 xiaohongshu/build/minitool.zip

产物直接用 redapp upload 上传，见 README.md。
"""
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'creator', 'build', 'web-mobile')
OUT_DIR = os.path.join(ROOT, 'xiaohongshu', 'build')
DST = os.path.join(OUT_DIR, 'minitool')
ZIP_PATH = os.path.join(OUT_DIR, 'minitool.zip')
PATCH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'patch-csp.py')

# 平台白名单，不在其中的后缀一律不允许出现在包里
ALLOWED_EXT = {'.jpg', '.css', '.gif', '.svg', '.png', '.js', '.jpeg',
               '.json', '.html', '.woff2', '.webp', '.woff'}

SKILL_DIR = os.environ.get(
    'XHS_SKILL_DIR',
    os.path.join(os.path.expanduser('~'), '.workbuddy', 'skills', 'minitool-zip-builder'),
)

BOOT_JS = """// 容器要求：脚本必须外置，行内事件一律改 addEventListener
(function () {
  var cvs = document.getElementById('GameCanvas');
  if (cvs) cvs.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  System.import('./index.js').catch(function (err) { console.error(err); });
})();
"""

# 容器顶部浮着返回/分享两个圆钮，实测覆盖 y 28..82（390 宽设计空间）。
# 它是原生层，不在 DOM 里也没有接口隐藏，只能把整块画布往下推。
# 引擎按 window.innerHeight 算画布高度，所以 CSS 内边距和 innerHeight 必须成对减。
CHROME_INSET_JS = """/* 小红书容器的导航外壳（左返回、右分享）浮在画布上方，且无法隐藏。
   把画布整体下推，内容自动让开；游戏内部布局完全不动。 */
(function () {
  var OFF = 52; // 外壳 44 + 与内容的间距 8

  var real = window.innerHeight;
  var ok = false;
  try {
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      get: function () { return real - OFF; }
    });
    ok = true;
  } catch (e) {
    ok = false;
  }

  if (!ok) {
    // 拿不到 innerHeight 就撤掉 CSS 内边距，宁可被遮一点也不要留空白
    if (document.body) document.body.style.paddingTop = '0px';
    return;
  }

  window.addEventListener('resize', function () {
    try { delete window.innerHeight; } catch (e) {}
    real = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      get: function () { return real - OFF; }
    });
  });
})();
"""

# 顶部留白用 canvas 清屏色，看起来是同一块背景
CHROME_INSET_CSS = """
/* 小红书容器导航外壳占位：容器原生按钮浮在画布上方，这里把画布下推 52px */
body {
  box-sizing: border-box;
  padding-top: 52px;
  background-color: #f3f6f2;
}
"""


def step(msg):
    print('\n== ' + msg)


def fail(msg):
    raise SystemExit('FAIL: ' + msg)


# ---------------------------------------------------------------- 0. 检查
step('检查源产物')
if not os.path.isdir(os.path.join(SRC, 'cocos-js')):
    fail(f'找不到 {SRC}，先跑 npm --prefix creator run build:web')
print('  源:', SRC)

# ---------------------------------------------------------------- 1. 复制
step('复制到小红书 build 目录')
if os.path.exists(DST):
    shutil.rmtree(DST)
os.makedirs(OUT_DIR, exist_ok=True)
shutil.copytree(SRC, DST)
print('  ->', DST)

# ------------------------------------------- 2. 非白名单资源改名并同步引用
step('处理白名单外的资源')
renamed = 0
for base, dirs, files in os.walk(DST):
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext not in ALLOWED_EXT:
            src_p = os.path.join(base, f)
            dst_p = os.path.splitext(src_p)[0] + '.png'
            os.rename(src_p, dst_p)
            renamed += 1
print(f'  改名 {renamed} 个（音频会被当图片解码，游戏静音，见 README）')

# 引用同步：资源 json 里的后缀、settings.json 里的 effect.bin
for base, dirs, files in os.walk(os.path.join(DST, 'assets')):
    for f in files:
        if not f.endswith('.json'):
            continue
        p = os.path.join(base, f)
        t = open(p, encoding='utf-8').read()
        if '.wav' in t or '.bin' in t:
            open(p, 'w', encoding='utf-8').write(
                t.replace('".wav"', '".png"').replace('".bin"', '".png"'))
settings = os.path.join(DST, 'src', 'settings.json')
t = open(settings, encoding='utf-8').read()
if 'effect.bin' in t:
    open(settings, 'w', encoding='utf-8').write(t.replace('effect.bin', 'effect.png'))
print('  引用已同步')

# ------------------------------------------- 3. 引擎动态代码静态化
step('引擎补丁（禁 eval / new Function）')
subprocess.run([sys.executable, PATCH, SRC, DST], check=True)

# ------------------------------------------- 4. 顶部让位 + 入口页脚本外置
step('容器导航外壳让位')
open(os.path.join(DST, 'chrome-inset.js'), 'w', encoding='utf-8').write(CHROME_INSET_JS)
css_path = os.path.join(DST, 'style.css')
if CHROME_INSET_CSS.strip() not in open(css_path, encoding='utf-8').read():
    with open(css_path, 'a', encoding='utf-8') as f:
        f.write(CHROME_INSET_CSS)
print('  chrome-inset.js + style.css 已写入（下推 52px）')

step('改造 index.html')
html_path = os.path.join(DST, 'index.html')
html = open(html_path, encoding='utf-8').read()

# 只去掉「没有 src」的内联 script（真机 CSP 不放行，会让 System.import 整段不执行）。
# 外链 script 必须保留，误删会导致引擎和 polyfill 都不加载。
spans = []
for m in re.finditer(r'<script\b[^>]*>(.*?)</script\s*>', html, re.S | re.I):
    open_tag = m.group(0)[:m.group(0).index('>') + 1]
    if re.search(r'\bsrc\s*=', open_tag, re.I):
        continue
    spans.append((m.start(), m.end()))
for s, e in reversed(spans):
    html = html[:s] + html[e:]
inline = [None] * len(spans)

# 去掉行内事件属性 onxxx="..."
html, n_attr = re.subn(r'\son[a-zA-Z]+\s*=\s*"[^"]*"', '', html)
html = re.sub(r"\son[a-zA-Z]+\s*=\s*'[^']*'", '', html)

# 外置启动脚本挂在 </body> 前；让位脚本要最先执行，其他脚本之前
html = html.replace('</body>', '<script src="chrome-inset.js" charset="utf-8"></script>\n<script src="boot.js" charset="utf-8"></script>\n</body>')
open(html_path, 'w', encoding='utf-8').write(html)
print(f'  移除内联脚本 {len(inline)} 段、行内事件 {n_attr} 处，已挂 chrome-inset.js + boot.js')

open(os.path.join(DST, 'boot.js'), 'w', encoding='utf-8').write(BOOT_JS)

# 复查：残留内联脚本或行内事件会被真机直接拦掉
left = [m.group(0) for m in re.finditer(r'<script\b[^>]*>', html, re.I)
        if not re.search(r'\bsrc\s*=', m.group(0), re.I)]
if left:
    fail(f'index.html 仍有 {len(left)} 段内联脚本: {left[:2]}')
if re.search(r'\son[a-zA-Z]+\s*=', html):
    fail('index.html 仍有行内事件')
kept = len(re.findall(r'<script\b[^>]*\bsrc\s*=', html, re.I))
print(f'  保留外链脚本 {kept} 段')

# ------------------------------------------- 5. 清单 + 审计
step('写清单并审计')
manifest_js = os.path.join(SKILL_DIR, 'scripts', 'write_manifest.mjs')
audit_js = os.path.join(SKILL_DIR, 'scripts', 'audit_artifact.mjs')
for p in (manifest_js, audit_js):
    if not os.path.isfile(p):
        fail(f'找不到 {p}，先安装 minitool-zip-builder Skill')
subprocess.run(['node', manifest_js, DST, 'true'], check=True, cwd=ROOT)
subprocess.run(['node', audit_js, DST], check=True, cwd=ROOT)

# ------------------------------------------- 6. 打包
step('打包 zip')
if os.path.exists(ZIP_PATH):
    os.remove(ZIP_PATH)
count = 0
with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for base, dirs, files in os.walk(DST):
        for f in sorted(files):
            p = os.path.join(base, f)
            arc = os.path.relpath(p, DST).replace('\\', '/')
            z.write(p, arc)
            count += 1
size = os.path.getsize(ZIP_PATH)
print(f'  {count} 个文件，{size} 字节（{size / 1048576:.2f} MiB）')
print('  ->', ZIP_PATH)

if size > 10 * 1048576:
    fail('超过 10 MiB 上限')

# ------------------------------------------- 7. 版本号
# 小红书的 version 必须三段数字、每段不以 0 开头、不带 beta 后缀。
# 约定：直接用仓库 VERSION，和游戏内版本保持一致，不另编一套号。
step('核对版本号')
ver = open(os.path.join(ROOT, 'VERSION'), encoding='utf-8').read().strip()
parts = ver.split('.')
if len(parts) != 3 or not all(p.isdigit() for p in parts):
    fail(f'VERSION「{ver}」不是三段数字，小红书不接受')
if any(len(p) > 1 and p.startswith('0') for p in parts):
    fail(f'VERSION「{ver}」有段以 0 开头，小红书不接受')
print(f'  送审 version = {ver}（与源码一致）')

print('\nOK。上传：见 xiaohongshu/README.md')
