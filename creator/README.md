# 造游工坊 · Cocos Creator

Creator 3.8.8 手机竖屏工程，本项目唯一的主版本。构建 H5、微信小游戏、抖音小游戏与 TapTap 小游戏。

## 运行与构建

1. 安装 Cocos Creator 3.8.8，在仓库根目录执行 `npm --prefix creator ci` 与 `npm --prefix creator run prepare:assets`。
2. 用 Creator 打开本目录与 [assets/Studio.scene](assets/Studio.scene)，浏览器预览；桌面浏览器可用设备模拟查看 390 × 844 竖屏。
3. 构建：`npm --prefix creator run build:web | build:wechat | build:douyin | build:tap`，产物在 `build/`，日志在 `temp/`。环境变量、退出码与产物验证见 [AGENTS.md](../AGENTS.md)。

H5 产物需通过本地 HTTP 服务打开，不能双击 HTML。抖音发布前在 [build-configs/bytedance-mini-game.json](build-configs/bytedance-mini-game.json) 配置自己的 AppID；发布与真机授权仍需对应平台账号。

## 源码

- [assets/scripts/core/Planning.ts](assets/scripts/core/Planning.ts)：基础经济模型与轮换排期的共用公式与参数；[MarketCycle.ts](assets/scripts/core/MarketCycle.ts) 处理体量切换。
- [assets/scripts/core/Modules.ts](assets/scripts/core/Modules.ts)：模块、六条轴、四个大类与出身数据。
- [assets/scripts/core/Studio.ts](assets/scripts/core/Studio.ts)：经营规则，不依赖引擎，可在 Node 中用临时脚本模拟。
- [assets/scripts/core/Content.ts](assets/scripts/core/Content.ts)：菜单、下一步建议与首作教程步骤。
- [assets/scripts/StudioApp.ts](assets/scripts/StudioApp.ts)：原生节点界面与操作，教程按锚点计算高亮位置。
- [assets/scripts/ui/Art.ts](assets/scripts/ui/Art.ts)：代码绘制办公室、人物与作品画面。
- [assets/scripts/ui/People.ts](assets/scripts/ui/People.ts)：六档办公室使用固定比例底图，短屏可纵向滚动。程序按 `art.json` 叠加 `atlas.png` 中的椅子、人物、摆件和状态符号。后三档的前台和员工区分别取图，翻页只更新员工区工位。园区大楼的作品展墙根据存档展示作品封面与奖杯。
- [assets/scripts/Platform.ts](assets/scripts/Platform.ts)：微信 `wx`、抖音 `tt`、H5 的存储、剪贴板与安全区。
- 图标、音效与背景音乐由 [tools/prepare.cjs](tools/prepare.cjs) 在构建前生成，不联网下载，也不进 git；换机器后运行 `prepare:assets` 即可。

## 存档

最多 5 个存档槽，键为 `sunlight-studio-slot-N`，格式版本 9，含规则修订号，旧存档读取时按修订号迁移；无法迁移或损坏的存档保留恢复副本并新开一局。不同浏览器来源与小游戏平台的存档相互隔离，迁移时从「公司」导出、导入（H5 下载文件，小游戏复制到剪贴板，均保留文本窗口）。后台暂停，不做离线补算。

玩法、菜单与阶段节点见 [游戏设计.md](../游戏设计.md)；界面与验证约定见 [AGENTS.md](../AGENTS.md)。
