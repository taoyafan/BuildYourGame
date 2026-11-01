# 日光工作室 · HTML 版

浏览器里直接跑的版本，用于在没有 Cocos Creator 的机器上快速试玩：招聘、立项、分工、试玩、推广、发售、补丁／更新／DLC、促销、续作、展会、榜单、年度评选、裁员与扩建都在，界面用 DOM 重写。

## 它是什么，不是什么

- 经营规则与菜单内容**不另写一份**：[build.mjs](build.mjs) 用 esbuild 把 `creator/assets/scripts/core/Studio.ts` 与 `core/Content.ts` 打进 `logic.js`，所以规则只有一份来源，改规则请改 Creator 那边的 TS，再重新打包。
- 界面是新的实现：[ui.js](ui.js) 把 `Content.menu()` 返回的数据块渲染成 DOM，取代 Creator 的节点与 Tween。
- 为了让 `Content.menu()` 能直接复用，这里显式实现了引擎版里用代码搭的部分：建档、立项表单、主界面时钟与六维列表、经营记录、存档导入导出。
- 无法翻译的部分省略：办公室与工位绘制、作品封面、Tween 特效、音效、粒子与飘字、教程高亮定位（教程改为文字提示加「知道了／跳过教程」）。

## 构建与打开

```bash
cd web
npm i                       # 只装 esbuild
npm run build               # 产出 web/logic.js 与 dist/日光工作室.html
```

- `dist/日光工作室.html` 是单文件版，双击即可打开，也可以直接发给别人。
- 开发时用 `web/index.html`（引用 `logic.js` 与 `ui.js`），改 `ui.js` 刷新即可，不需要重新打包。
- 存档键与 Creator 版相同（`sunlight-studio-v2`，第 6 版格式），但浏览器与小游戏的本地存储互相隔离，跨设备要用「公司 → 导出存档」。

## 与正式版本的关系

正式版本仍是 [creator/](../creator/README.md) 的 Cocos Creator 3.8.8 工程，它才负责 H5、微信小游戏与抖音小游戏的构建与真机适配。HTML 版是同一套规则的桌面预览，界面与正式版不保证逐像素一致。
