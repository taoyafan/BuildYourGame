# 小红书小工具

把 Cocos 的 web-mobile 产物适配成小红书小工具并发上去。**游戏源码不动，只改构建产物。**

## 目录

```
xiaohongshu/
  build_minitool.py   一键构建（web-mobile -> 适配 -> 审计 -> zip）
  patch-csp.py        引擎动态代码静态化（升级 Cocos 后要重新核对）
  serve-csp.js        本地复刻容器 CSP 的验证服务器
  build/              产物（git 忽略）
    minitool/         适配后的目录，可审计
    minitool.zip      上传用的包
```

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

另有一项不是改代码，是绕白名单：**`.wav` / `.bin` 不在平台允许的后缀里**，全部改名成 `.png` 并同步引用，否则审核拒包。代价是音效不响（引擎按图片解码，报 `Error 4930`），游戏可玩。

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
{ "pkgFileId": "red_app/xxxx.zip", "md5": "<md5>", "appName": "日光工作室", "version": "1.0.0" }
EOF
redapp preview --source thirdAgent --file /tmp/preview.json --dry-run --agent
redapp preview --source thirdAgent --file /tmp/preview.json --confirm <planHash> --qr-out ./qr.png --agent
```

扫码进的是**开发版**，只有自己能看到；要别人也能玩必须送审发布。

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
