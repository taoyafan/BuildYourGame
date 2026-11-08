# 小红书小工具

把 Cocos 的 web-mobile 产物适配成小红书小工具并发上去。**游戏源码不动，只改构建产物。**

## 目录

```
xiaohongshu/
  build_minitool.py   一键构建（web-mobile -> 适配 -> 审计 -> zip）
  patch-csp.py        引擎动态代码静态化（升级 Cocos 后要重新核对）
  serve-csp.js        本地复刻容器 CSP 的验证服务器
  assets/cover.png    小红书专用封面（3:4 竖版），其它平台用不上
  build/              产物（git 忽略）
    minitool/         适配后的目录，可审计
    minitool.zip      上传用的包
```

发布用的**图标不在这里**：它在仓库根 `assets/icon.jpg`（512×512，1:1），所有平台共用一份，换图标只改那一处。

## 一条命令

```bash
npm --prefix creator run build:web
python xiaohongshu/build_minitool.py
```

产物：`xiaohongshu/build/minitool.zip`，正常是 118 个文件、0.86 MiB 左右，末尾输出 `PASS: N file(s)`。

## 要改什么（5 项，缺一不可）

| # | 位置 | 改法 | 不改会怎样 |
|---|---|---|---|
| 1 | `index.html` 内联 `<script>` | 抽出成外链 `boot.js` | **真机黑屏**。容器 CSP 不含 `unsafe-inline`，`System.import` 整段不执行 |
| 2 | `index.html` 行内事件 `oncontextmenu="..."` | 改 `addEventListener` | 同上，事件和整段脚本一起被拦 |
| 3 | `cocos-js/cc.js` 的 `$P` | `Function(...)` 换成静态闭包 | 模块加载即抛 `EvalError`，白屏 |
| 4 | `cocos-js/cc.js` 的 CCClass 默认值初始化器 | 同上 | 节点销毁重建时报错 |
| 5 | `src/polyfills.bundle.js` 两处 | `Function("return this")()` 换成 `globalThis` | 启动阶段抛错 |
| 6 | 顶部 52px | 画布整体下推（见下节） | 容器返回/分享钮压住标题、加速、叉叉 |

另有一项不是改代码，是绕白名单：**`.wav` / `.bin` 不在平台允许的后缀里**，全部改名成 `.png` 并同步引用，否则审核拒包。代价是音效不响（引擎按图片解码，报 `Error 4930`），游戏可玩。

## 顶部让位（重要）

容器会在画布上方浮一层**原生**导航外壳（左返回、右分享两个圆钮，直径约 54），它不在 DOM 里、也没有接口隐藏。实测它覆盖 y 28～82（390 宽设计空间），正好压住主页标题行和加速按钮，以及各页右上角的关闭叉叉。

处理方式是**把整块画布下推 52px**（外壳 44 + 间距 8），游戏内部布局一行不动：

- `chrome-inset.js`：把 `window.innerHeight` 改小 52（引擎按它算画布尺寸）
- `style.css`：`body { box-sizing: border-box; padding-top: 52px; background: #f3f6f2 }`（`#f3f6f2` 是 canvas 清屏色，留白看起来是同一块背景）

效果：画布从 52 铺到屏幕底，底部导航仍贴底；游戏自己的安全区（`env(safe-area-inset-top)`，真机约 38）叠加后内容从 y≈90 开始，正好落在圆钮下方。

**禁止改 Cocos 源码**。所有适配只在 `xiaohongshu/build/minitool/` 这份复制出来的 H5 里做，`creator/assets/scripts/` 保持原样。

## 版本号

小红书的 `version` 有三条硬规则：三段数字、每段不以 0 开头（`0` 本身可以）、不能带 `beta` 后缀。

**约定：直接用仓库 `VERSION`，和游戏内版本号保持一致**，不另编一套。`0.1.54` 就填 `0.1.54`，游戏升到 `0.1.55` 小红书就用 `0.1.55`。`build_minitool.py` 结尾会读 `VERSION` 并做格式断言，输出「送审 version = 0.1.54」。

更新已有小工具时必须用**没用过的新版本号**，否则后端拒绝。

## 上传

前置：`minitool-zip-builder` 与 `redapp-cli` 两个 Skill 已装在 `~/.workbuddy/skills/`，`redapp` 已登录（`redapp whoami`）。

平台走的是**两阶段确认**：先 dry-run 拿 `planHash`，再带 `--confirm <planHash>` 真执行。

```bash
# 1. 上传代码包
redapp upload --file xiaohongshu/build/minitool.zip --type pkg --dry-run --agent
redapp upload --file xiaohongshu/build/minitool.zip --type pkg --confirm <planHash> --agent
#    -> 返回 fileId: red_app/xxxx.zip

# 2. 生成预览二维码（preview.json 里填上一步的 fileId 与 md5）
cat > /tmp/preview.json <<'EOF'
{ "pkgFileId": "red_app/xxxx.zip", "md5": "<md5>", "appName": "造游工坊", "version": "0.1.54" }
EOF
redapp preview --source thirdAgent --file /tmp/preview.json --dry-run --agent
redapp preview --source thirdAgent --file /tmp/preview.json --confirm <planHash> --qr-out ./qr.png --agent
```

扫码进的是**开发版**，只有自己能看到；要别人也能玩必须送审发布。

## 送审

送审除代码包外还要**图标**（JPG/PNG，1:1，≤5 MiB）和**封面**（JPG/PNG，3:4 竖版，≤10 MiB），CLI 不会自动裁剪。

```json
{
  "appName": "造游工坊",
  "slogan": "开一家游戏工作室",
  "iconFileId": "<ICON_FILE_ID>",
  "coverFileId": "<COVER_FILE_ID>",
  "version": "0.1.54",
  "pkgFileId": "red_app/xxxx.zip",
  "md5": "<md5>",
  "categories": ["casual_game"],
  "authorizations": []
}
```

`redapp submit --source thirdAgent --file submit.json --dry-run --agent` 之后再加 `--confirm <planHash>`。

必填规则：`appName` / `slogan` 各 ≤14 字符；`categories` 只能一个；`authorizations` 无需求就是空数组（本游戏无相册/摄像头/定位/录音/头像昵称需求）；新建不传 `appId`。

更新已有小工具时 `version` 必须是没用过的号，`edit` 改基础信息则**每次都必须同时传 `appName`、`slogan`、`iconFileId` 三项**。

送审前必须走一遍扫码预览并明确通过；`status` 里 `0 未发布 / 1 审核中 / 2 已发布 / 3 未通过 / 4 已下架`。

## 更新版本（游戏发新版后）

**不麻烦，五步，基本是重复命令**。前提是 Cocos 引擎版本没变。

```bash
# 1. 打包游戏 + 生成小红书包（两条命令，patch 脚本自动判断有没有版本过）
npm --prefix creator run build:web
python xiaohongshu/build_minitool.py        # 结尾会打印「送审 version = x.y.z」

# 2. 上传新代码包（dry-run 拿 planHash，再 confirm）
redapp upload --file xiaohongshu/build/minitool.zip --type pkg --dry-run --agent
redapp upload --file xiaohongshu/build/minitool.zip --type pkg --confirm <planHash> --agent

# 3. preview 新包（含同一份 iconFileId）→ 二维码给你扫

# 4. submit.json 里把 version 改成新版本号、pkgFileId/md5 换新，其余不变
#    然后 dry-run + confirm
```

**注意点**

- `version` 必须用**没送审过的号**，否则后端拒绝。沿用仓库 `VERSION` 就自然避开。
- 图标和封面**不用重传**，之前的 `iconFileId` / `coverFileId` 一直有效，新 `submit.json` 原样复用。
- 送审内容一变（换包或换图），上一轮的预览确认就失效，**必须重新生成二维码让你扫**。
- `submit.json` 里**不要写 `appId`**，写了就变成"给已有小工具发新版本"；两者都能用，但语义不同，首次新建保持省略。

**唯一会真的变麻烦的情况**：升级 Cocos 版本。`patch-csp.py` 是按 `cc.js` 里的具体文本打补丁的，引擎压缩变量名一变就匹配不上，脚本会直接报 `pattern not found`（不会静默产出一个坏包）。那种情况需要重新定位那 3 处 `Function()`，大约半小时的活。只改游戏逻辑、不升引擎的话，永远不用碰。

## 排查顺序（踩过的坑）

1. **不要在本地用宽松 CSP 验证**。带 `script-src 'self' 'unsafe-inline'` 的模拟器会放行内联脚本，本地一切正常、真机黑屏。用 `node xiaohongshu/serve-csp.js build/minitool 8811 strict`。
2. 分不清是包的问题还是容器的问题时，先发一个纯静态自检页，把真机能力打在屏幕上测：外置脚本、`eval`、`new Function`、WebGL、fetch/XHR/arrayBuffer、动态插 script。
3. 仍黑屏就发一个带错误覆盖层的包：`window.onerror` + `unhandledrejection` + `console.error` 全打到 DOM 上，再用 `gl.readPixels` 采样 5 个点判断"是真没画出来还是画了没显示"。本地校准过：正常画面返回 `亮5/5`。
4. `status --app-id` 在未送审前返回"小工具不存在"是正常的，不代表预览失败。
5. `mini-app-simulator: blocked` 的 rejection 来自容器自身，预览环境常见，无害。

## 已验证的真机环境

小米 V2307A，Android 16，WebView Chrome 124，Adreno 750：

- 外置脚本可执行，内联脚本被拦
- `eval` / `new Function` 均被拦
- WebGL2 可用
- `fetch` / XHR / `arrayBuffer` 读包内文件正常
- 动态插入 `<script>` 可行

## 待办

- [ ] 音效恢复：白名单无音频后缀，需换加载通路（如把音频塞进 json/base64 用 WebAudio 播），工作量不小
- [ ] 送审发布
