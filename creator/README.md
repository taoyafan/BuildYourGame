# 造游工坊 · Cocos Creator

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
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm --prefix creator run build:web
npm --prefix creator run build:wechat
npm --prefix creator run build:douyin
```

命令自动准备本地图标和合成短音效，构建结果位于本目录的 `build/`，日志位于 `temp/`。网页版构建需通过本地 HTTP 服务打开，不能直接双击 HTML：

```powershell
npx --yes http-server@14.1.1 creator/build/web-mobile -a 127.0.0.1 -p 8802 -c-1
```

微信与抖音构建包分别导入各自开发者工具；抖音发布前需在 [build-configs/bytedance-mini-game.json](build-configs/bytedance-mini-game.json) 配置自己的 AppID，微信 AppID 沿用现有项目配置。发布与真机授权仍需对应平台账号，不由引擎代替。

## 源码与界面

- [assets/scripts/core/Planning.ts](assets/scripts/core/Planning.ts) 是基础经济模型与轮换排期共用的工作量、办公室编制、标准速度及阶段公式入口，公式与参数见[数值设计](../数值设计.md)；[MarketCycle.ts](assets/scripts/core/MarketCycle.ts) 负责体量切换。

- [assets/scripts/core/Studio.ts](assets/scripts/core/Studio.ts) 是经营规则，不依赖引擎，可在 Node 中用临时脚本模拟数值；[assets/scripts/core/Content.ts](assets/scripts/core/Content.ts) 生成菜单、下一步建议与首作教程步骤。
- [assets/scripts/StudioApp.ts](assets/scripts/StudioApp.ts) 使用原生节点、滚动、输入与 Tween 展示并操作这些数据，包括教程高亮、发售与回本特效。教程按界面登记的锚点计算高亮位置，不写死坐标。
- [assets/scripts/ui/Art.ts](assets/scripts/ui/Art.ts) 用代码绘制办公室、工位、人物与按类型变化的作品画面，是正式美术前的占位风格。
- [assets/scripts/Platform.ts](assets/scripts/Platform.ts) 集中处理微信 `wx`、抖音 `tt`、H5 的存储、剪贴板与安全区。界面按 390 宽适配，主界面顶栏与胶囊同行并避让其横向区域，菜单避让胶囊底边，底部避让手势区；存档、重开在「公司」二级菜单。
- 图标使用本地 Lucide，由 [tools/prepare.cjs](tools/prepare.cjs) 在构建时转为 PNG，许可见 [tools/vendor/lucide.LICENSE](tools/vendor/lucide.LICENSE)。未接入远程素材或付费素材。

点击、月度回款、发售与回本音效由准备脚本生成 WAV，经引擎 AudioSource 播放；「公司」内可关闭，不联网下载声音。

存档键沿用 `sunlight-studio-v2`，当前为第 6 版格式，含规则修订标记；旧存档读取时由代码按修订号迁移，第 6 版之前的存档无法迁移，加载时会被拒绝而不是被破坏，需要重开一局。不同浏览器来源及不同小游戏平台的本地存档相互隔离，迁移时从「公司」导出、导入。后台暂停、不做离线补算；普通菜单恢复原运行状态，关键决策处理后按选择继续或保持暂停。

导出使用 JSON 存档格式：H5 尝试下载文件，小游戏则复制完整文本到剪贴板，同时保留文本窗口供手动备份；导入时粘贴完整文本。导出窗口里的 JSON 是备份内容，不是报错。读取旧存档失败时保留恢复副本，并显示可点击关闭叉的提示。

## 菜单入口

菜单只负责操作入口与状态展示，玩法、阶段节点、主界面与取舍见根目录 [游戏设计.md](../游戏设计.md)。

- 「项目」：五项内容进度与瓶颈、已知问题与测试、调整分工（每人可并行多项）、试玩、多项目切换与完整优先级、公布发售日、发售；负责的内容完成后自动消耗工时修复已知缺陷。进行中的补丁与研发项目并列出现，补丁页显示修复与返工进度、人手、预计上线日与立即上线。
- 「团队」：招聘（程序/策划/美术，音频与测试首作发售后解锁）、按人加班、「疲惫」「想走」标签、团建（唯一的减压手段：1 / 3 / 5 天、次数积攒、最小间隔；回来弹出结果页，另有「团建记录」）、N+1 裁员。接受压力离职也支付 N+1，并保留裁员记录与同事影响，选择时显示金额。全部招聘渠道同屏显示，未开放的标为「待解锁」；录用按钮旁的问号可点击展开或收起不可用原因。员工与候选人卡带简笔头像、小雷达图与彩色标签；员工列表可按入职先后、最强能力、月薪、状态或任一项能力排序；员工详情含能力雷达、潜力、市场身价、带教、能力轨迹与档案。搬进正式办公室后有「猎头」入口，列出对手名人与三档出价。
- 「市场」：城市、全国、国际三级展会报名，日历、行业与展会入口，以及分笔追加的推广（只显示共投入与已获得关注，几天后反馈每笔效果）。
- 「行业」（市场、公司或白板进入）：首周榜与累计榜（三级）、对手工作室与档案、日历、新闻、评选（每年 6 月 30 日评上半年、12 月 30 日评全年，只作荣誉）。
- 作品收入历史：上下分别展示每周收入柱状图、累计收入与当前投入水平虚线，每页 12 周，左右箭头翻页；点击任一图选择周，两图与明细同步。跨年继续按实际周数记录，不截在第 52 周；进行中的周单独标注；拖动滚动不视作点选。成本线表示当前投入，不代表历史逐周投入或首次回本日期。
- 「公司」：资金、媒体评级、成就、行业与日历、经营记录，以及作品履历（已发售作品列表）。作品档案含复盘、收入历史、推广复盘、补丁记录、参与的人，以及开补丁、固定折扣促销、独立 DLC 项目和续作。
- 成就（奖杯架或「公司」进入）：里程碑（首作、回本、搬家、全国首周榜前十、全国年度获奖、二次扩建等）以及经营、作品、团队、行业与隐藏成就；隐藏成就达成前显示“???”。搬家与扩建在「公司」页的办公室一栏，不设条件。

## 界面与验证约定

界面约定（按钮、推荐、图标、教程、界面文字）与验证约定见仓库根目录 [AGENTS.md](../AGENTS.md)；稀有度配色规则见 [游戏设计.md](../游戏设计.md)。不保留测试文件，平台真机适配不能由 H5 预览替代。
