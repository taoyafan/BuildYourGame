# 造游工坊

持续经营的轻量游戏工作室模拟游戏：具名员工按天研发，费用按月结算，在团队、作品体验、现金与市场之间取舍。

## 运行与构建

唯一的正式版本是 [Cocos Creator 竖屏版](creator/README.md)，同一套界面与经营逻辑构建 H5、微信、抖音与 TapTap 小游戏。浏览器试玩使用 H5 构建产物，需通过 HTTP 服务打开。构建命令、机器环境与验证约定见 [AGENTS.md](AGENTS.md)。

## 文档

- [游戏设计.md](游戏设计.md)：定位、核心循环、机制与阶段节点（唯一的设计文档）
- [数值设计.md](数值设计.md)：经济模型、公式与参数
- [美术设计.md](美术设计.md)：视觉规范与素材状态
- [决策检验.md](决策检验.md)：检验方法
- [TODO.md](TODO.md)：未完成事项

## 开发约定

不保留自动化测试文件；日常改动用语法检查、浏览器试玩或微信开发者工具验证，确需临时脚本只用临时文件，验证后删除，不提交。详见 [AGENTS.md](AGENTS.md)。

图标来自 Lucide v0.468.0（ISC），授权原文见 [creator/tools/vendor/lucide.LICENSE](creator/tools/vendor/lucide.LICENSE)。