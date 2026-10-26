# 日光工作室 · Cocos Creator

Creator 3.8.8 手机竖屏版，也是本项目唯一的主版本。招聘、立项、研发、试玩、发售和公司管理使用同一套引擎界面，分别构建 H5、微信小游戏与抖音小游戏。

## 本地运行

1. 安装 Cocos Creator 3.8.8。
2. 在仓库根目录执行 `npm --prefix creator ci`，然后执行 `npm --prefix creator run prepare:assets`。
3. 使用 Creator 打开本目录，打开 [assets/Studio.scene](assets/Studio.scene)，点击浏览器预览。

首次导入会生成资源库与类型配置，耗时比后续预览长。桌面浏览器可使用设备模拟查看 390 × 844 竖屏；普通浏览器预览不需要微信或抖音账号。

## 构建

在 PowerShell 中设置编辑器路径，再运行所需目标：

```powershell
$env:COCOS_CREATOR = 'C:\path\to\CocosCreator.exe'
npm --prefix creator run build:web
npm --prefix creator run build:wechat
npm --prefix creator run build:douyin
```

命令自动准备本地图标，构建结果位于本目录的 `build/`，日志位于 `temp/`。网页版构建需通过本地 HTTP 服务打开，不能直接双击 HTML：

```powershell
npx --yes http-server@14.1.1 creator/build/web-mobile -a 127.0.0.1 -p 8802 -c-1
```

微信与抖音构建包分别导入各自开发者工具；抖音发布前需在 [build-configs/bytedance-mini-game.json](build-configs/bytedance-mini-game.json) 配置自己的 AppID，微信 AppID 沿用现有项目配置。发布与真机授权仍需对应平台账号，不由引擎代替。

## 源码与界面

- [assets/scripts/core/Studio.ts](assets/scripts/core/Studio.ts) 是经营规则，不依赖引擎，可在 Node 中用临时脚本模拟数值；[assets/scripts/core/Content.ts](assets/scripts/core/Content.ts) 生成菜单、下一步建议与首作教程步骤。
- [assets/scripts/StudioApp.ts](assets/scripts/StudioApp.ts) 使用原生节点、滚动、输入与 Tween 展示并操作这些数据，包括教程高亮、发售与回本特效。教程按界面登记的锚点计算高亮位置，不写死坐标。
- [assets/scripts/ui/Art.ts](assets/scripts/ui/Art.ts) 用代码绘制办公室、工位、人物与按类型变化的作品画面，是正式美术前的占位风格。
- [assets/scripts/Platform.ts](assets/scripts/Platform.ts) 集中处理微信 `wx`、抖音 `tt`、H5 的存储、剪贴板与安全区。界面按 390 宽适配，顶部避让整个胶囊底边，底部避让手势区；存档、重开在「公司」二级菜单。
- 图标使用本地 Lucide，由 [tools/prepare.cjs](tools/prepare.cjs) 在构建时转为 PNG，许可见 [tools/vendor/lucide.LICENSE](tools/vendor/lucide.LICENSE)。未接入远程素材或付费素材。

存档键沿用 `sunlight-studio-v2`，当前为第 3 版格式，读取旧版存档时自动迁移。不同浏览器来源及不同小游戏平台的本地存档相互隔离，迁移时从「公司」导出、导入。后台暂停、不做离线补算；普通菜单恢复原运行状态，关键决策处理后按选择继续或保持暂停。

## 验证约定

遵循根目录 [开发与验证约定](../README.md#开发与验证约定)，不保留测试文件。按需在浏览器、开发者工具和真机中验证；必要的临时脚本使用后删除。重点确认输入与键盘、菜单滚动、胶囊与手势区、后台暂停和存档恢复。平台真机适配不能由 H5 预览替代。