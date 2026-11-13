# AGENTS.md

面向 AI 编码助手的工作约定与踩坑记录。**开始改动前请先读完本文件。**

## 项目概览

「造游工坊」——持续经营类工作室模拟游戏。唯一的正式版本是 [creator/](creator/README.md) 下的 **Cocos Creator 3.8.8** 手机竖屏工程，同一套逻辑分别构建 H5、微信小游戏、抖音小游戏。

- 经营规则：[creator/assets/scripts/core/Studio.ts](creator/assets/scripts/core/Studio.ts)（不依赖引擎，可在 Node 中模拟）
- 内容数据：[creator/assets/scripts/core/Content.ts](creator/assets/scripts/core/Content.ts)
- 界面：[creator/assets/scripts/StudioApp.ts](creator/assets/scripts/StudioApp.ts)（原生节点 + 场景绘制）
- 平台差异：[creator/assets/scripts/Platform.ts](creator/assets/scripts/Platform.ts)（微信 `wx` / 抖音 `tt` / H5 的存储、安全区、胶囊）

设计与玩法只在 [游戏设计.md](游戏设计.md) 维护；参数与公式只在代码里维护。

## 内容与文档范围

- 游戏内容文档只记录当前版本已确定的目标，不混写下一版、终版或未来扩展承诺。
- TODO 不设「暂缓」：想法只有做与不做，要做的进「待讨论」或「待实现」，不做的直接删除；具体数值仍只在代码中维护。
- 尚未确定的当前问题放「待讨论」；讨论确认且能够当轮完成的直接实现并验证，不先堆进「待实现」。只有已确定但尚不能完成的任务才进入「待实现」。
- 已完成任务从 TODO 删除，不保留完成历史；程序、设计与运行说明在对应行为变更时同步更新。

## 本机环境

| 项 | 值 |
| --- | --- |
| Cocos Creator | `C:\temp\CocosCreator-3.8.8\CocosCreator.exe`（本轮构建已验证，非 Dashboard 安装） |
| 环境变量 | 构建时显式设置 `COCOS_CREATOR`，不要假定旧的 E 盘路径仍存在 |
| 微信开发者工具 | `E:\Tencent\微信web开发者工具\cli.bat` |
| 微信 AppID | `wx6ec12949d6ad0ad8` |
| H5 构建输出 | `creator/build/web-mobile` |
| 微信构建输出 | `creator/build/wechatgame` |

所有平台产物均在 `creator/build/`。只维护 Creator 工程，不另建独立 HTML / DOM 预览版；浏览器试玩使用 Creator 构建的 H5，小游戏平台适配仍须独立验收。

## 构建与预览

### 关键：先清掉 `ELECTRON_RUN_AS_NODE`

在 DSH 等 Electron 宿主环境里，子进程会被注入 `ELECTRON_RUN_AS_NODE=1`。Cocos Creator 本身是 Electron 程序，被注入后会退化成纯 Node 解释器，表现为：

```
CocosCreator.exe: bad option: --project
```

退出码 9，编辑器起不来，构建直接失败。**这是宿主环境变量污染，不是用户系统设置**（用户级/系统级均为空，普通终端不受影响）。

**所有 Creator 命令前必须先清除：**

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:COCOS_CREATOR = 'C:\temp\CocosCreator-3.8.8\CocosCreator.exe'
```

安装位置变化时，先确认可执行文件存在且版本为 3.8.8，再设置上述变量。

### 构建命令

```powershell
npm --prefix creator ci                    # 首次，安装 @resvg/resvg-js
npm --prefix creator run prepare:assets    # 生成图标与音效
npm --prefix creator run build:web         # H5
npm --prefix creator run build:wechat      # 微信小游戏
npm --prefix creator run build:douyin      # 抖音小游戏
```

- 退出码 **36 表示成功**（`tools/build.cjs` 已按此判定），不是 0。
- 首次构建约 100 秒（要编译引擎），之后约 20–30 秒。
- 构建日志：`creator/temp/build-<platform>.log`。
- 无界面构建**不需要**登录 Cocos Dashboard：带 `--project` + `--build` 会直接走 `Editor.Startup.build()`。启动时打印的 `Load profile failed: local://editor/packages.json` 是无害噪音。

### 预览

```powershell
# H5：必须走 HTTP，不能双击 HTML
npx --yes http-server@14.1.1 creator/build/web-mobile -a 127.0.0.1 -p 8802 -c-1

# 微信：导入开发者工具
& 'E:\Tencent\微信web开发者工具\cli.bat' open --project 'G:\code\Game\BuildYourGame\creator\build\wechatgame'
```

## ⚠️ 血的教训：改完必须验证产物，不要口头声称“已修好”

2026-10-31 曾出现连续多轮“改了但界面没变”，耗时极长，最终查明有三个独立原因。**每一条都会让改动看起来没生效。**

### 1. 构建被中断 = 改动没进产物

构建脚本会先清 `build/` 目录再写入。如果命令被中断（超时、进程被杀），产物会**停在旧版本甚至整个目录消失**，而源码明明已改。

**对策**：改完源码后，必须核对产物时间戳晚于源码，并检查产物里确实包含新逻辑（用 grep 找标志性字符串或变量）。不要只看构建日志说 “Built”。

```powershell
# 验证示例
$p = 'creator/build/wechatgame/assets/main/index.js'
"产物时间: " + (Get-Item $p).LastWriteTime   # 必须晚于源码修改时间
$c = [System.Text.Encoding]::UTF8.GetString([System.IO.File]::ReadAllBytes($p))
$c.Contains('预期的新字符串')                  # True 才算真的生效
```

### 2. 微信开发者工具会缓存，且可能停在旧实例

改了产物但工具里画面不变，通常是：工具还开着旧进程、或残留了自定义编译条件。

**对策**：改完产物后**完整重启**工具，再 `cli.bat open` 重新导入。必要时：

```powershell
Get-Process -Name '微信开发者工具' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 8
& 'E:\Tencent\微信web开发者工具\cli.bat' open --project '<上述路径>'
```

工具会打印 `app.json 中未定义自定义编译中指定的启动页面` 红字时，说明残留了畸形编译条件（`project.config.json` 里的 `currentL` 字段）。删掉该字段或重新构建产物即可，**不影响运行**。

### 3. 一次改多个构建目标 = 容易混淆

H5 和微信是**两套独立产物**。只重建 `build:wechat` 然后去浏览器验证，看到的必然是旧画面。

**对策**：明确要验证的平台，只构建并验证那一个；或两个都重建。

## 微信平台适配要点

- 顶部要避让微信胶囊（`getMenuButtonBoundingClientRect`）与状态栏。
- `Platform.insets()` 是**全局**安全区，被菜单、输入框、教程高亮等多处共用，改它会波及所有界面。
- 需要只调整主界面时，**新增独立方法**（如 `Platform.header()`）而不要改造 `insets()`。
- 主界面顶栏与胶囊同处一行：标题在左、操作按钮在右，按钮组以胶囊左边缘为基准整体左移。
- 底部避让 home 指示条。

## 界面约定

- 按钮：菜单内可点按钮一律深绿，不可用为灰色；切换控件用深绿表示选中、浅色表示未选。
- 推荐：用「推荐」标签表示，不用按钮颜色暗示。
- 教程：操作步骤高亮可点的目标，讲解步骤只能点「知道了」关闭。
- 主界面一屏显示不滚动；新增内容需在短屏下核对高度。

## 验证约定

本项目**不保留自动化测试文件**。日常改动按需用语法检查、浏览器试玩、微信开发者工具验证即可。

**⛔ 禁止运行 TypeScript 类型检查**（`tsc --noEmit`、Creator 自带 `tsc.js` 等一律不用）：耗时长且被引擎自带 `cc.d.ts` 的无关报错淹没。语法与编译问题只通过**构建**暴露（`npm --prefix creator run build:web`，退出码 36 = 成功）；逻辑用临时 Node 脚本加载 `core/Studio.ts` 跑断言，用完删除。

- 不新增或维护持久化的测试脚本、测试用例、测试框架。
- 确需临时脚本时，只使用 `.tmp.cjs` / `.tmp.js` / `.tmp.html` 后缀（已在 `.gitignore`），验证完删除，不提交。
- 不留下测试专用依赖或产物。

重点确认：输入与键盘、菜单滚动、胶囊与手势区、后台暂停、存档恢复。**平台真机适配不能由 H5 预览替代。**

## 提交约定

- 只在用户要求时提交。每次 commit 后立即 `git push`，不留只在本地的提交。
- 实现「待实现」前，若 TODO 有新增条目，先单独提交 TODO（保留待实现的提交记录），再实现并删除已完成条目。
- push 失败时先排查并重试（如 SSH 失败改用 `git push https://github.com/taoyafan/BuildYourGame.git main`），确实推不上去才向用户说明原因。

## 其他注意事项

- `creator/settings/v2/packages/information.json`：Creator 首次以工程模式启动时，会把 `customSplash` / `removeSplash` 的 `enable` 改为 `true` 并写入会话 `sid`。这是编辑器行为，**不是代码改动**。还原一次后，后续构建通常不再变；若反复被改，可考虑 `git update-index --skip-worktree`。
- `engine.json` 常因换行符（LF/CRLF）显示为已修改，但内容可能逐字节相同，用 `git diff` 确认后再决定是否处理。
- 长期记忆文件在 `.workbuddy/memory/MEMORY.md`（未纳入 git）。
- 无头浏览器截图在 Cocos WebGL 场景下会得到黑图，不可用于视觉验证。
