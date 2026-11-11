// The module catalog: data only, no rules. A game is assembled from modules; finished modules stay with
// the company and are reused or upgraded by later titles. Adding content means adding entries here.
//
// Each module has level-1 work per dimension in person-days (higher levels multiply it), the modules it is
// built on (`needs`), tags, its family (colour and library tab), a glyph for its brick, and the slot the
// player picks it in. `unlock` is how many released titles it waits for. One-off modules (`oneOff`)
// belong to a single title and are never kept. A part used by one module only is that module's own work.

// Families only decide colour, the library tab and how a brick is drawn.
export const FAMILIES: any = {
  base: { name: '底座', color: '#4a6d8c', tab: 'tool' },
  gameplay: { name: '玩法', color: '#c8574f', tab: 'system' },
  prototype: { name: '设计原型', color: '#7b55b8', tab: 'system' },
  art: { name: '美术素材', color: '#d39a1e', tab: 'asset' },
  audio: { name: '音频素材', color: '#2f9a8a', tab: 'asset' },
  platform: { name: '平台', color: '#6c7f95', tab: 'tool' },
  content: { name: '一次性内容', color: '#d9739b', tab: '' }
};

export const MODULES: any = {
  engine2d: { name: '2D 引擎', family: 'base', glyph: 'gear', work: { fluidity: 10 }, tags: ['2D'], desc: '画面、输入与关卡的底层，很多玩法都建立在它之上。' },
  saveSystem: { name: '存档系统', family: 'base', glyph: 'disk', work: { fluidity: 3, depth: 2 }, tags: [], desc: '记录进度与选择。' },

  // A starter module only needs its founder's one strength, so the opening job can be done alone.
  combatRules: { name: '横版战斗规则原型', family: 'prototype', glyph: 'blueprint', work: { creativity: 10 }, tags: [], desc: '出招、连段与受击的规则草案。' },

  actionCombat: { name: '横版动作战斗', family: 'gameplay', glyph: 'sword', slot: 'core', type: 'action', needs: ['engine2d', 'combatRules'], work: { fluidity: 8, depth: 2 }, tags: ['动作'], desc: '跑跳、攻击与受击判定。' },
  branchingStory: { name: '分支叙事', family: 'gameplay', glyph: 'book', slot: 'core', type: 'story', needs: ['engine2d', 'saveSystem'], work: { creativity: 8, depth: 1, fluidity: 1 }, tags: ['叙事', '选择'], desc: '对话、选项与多结局。' },
  turnTactics: { name: '回合策略', family: 'gameplay', glyph: 'grid', slot: 'core', type: 'think', unlock: 1, needs: ['engine2d', 'saveSystem'], work: { depth: 6, creativity: 4 }, tags: ['策略'], desc: '回合、行动点与敌人的应对。' },
  roguelikeGen: { name: '肉鸽关卡生成', family: 'gameplay', glyph: 'dice', slot: 'feature', needs: ['engine2d'], work: { depth: 4, creativity: 4 }, tags: ['肉鸽', '随机'], desc: '每局随机生成地图与奖励。' },
  skillGrowth: { name: '技能成长', family: 'gameplay', glyph: 'tree', slot: 'feature', needs: ['saveSystem'], work: { depth: 4, creativity: 2 }, tags: ['成长'], desc: '技能树与长期养成。' },

  pixelCharacters: { name: '像素人物素材库', family: 'art', shelf: '人物素材库', style: '像素', glyph: 'person', slot: 'art', work: { picture: 10 }, tags: ['像素'], desc: '像素角色、动作帧与表情。' },
  handCharacters: { name: '手绘人物素材库', family: 'art', shelf: '人物素材库', style: '手绘', glyph: 'person', slot: 'art', unlock: 1, work: { picture: 12 }, tags: ['手绘'], desc: '手绘角色立绘与动作。' },
  pixelScenes: { name: '像素场景素材库', family: 'art', shelf: '场景素材库', style: '像素', glyph: 'mountain', slot: 'art', unlock: 1, work: { picture: 8 }, tags: ['像素'], desc: '像素地块、背景与道具。' },
  handScenes: { name: '手绘场景素材库', family: 'art', shelf: '场景素材库', style: '手绘', glyph: 'mountain', slot: 'art', unlock: 1, work: { picture: 10 }, tags: ['手绘'], desc: '手绘背景与场景插画。' },

  retroMusic: { name: '复古配乐素材库', family: 'audio', shelf: '配乐素材库', style: '复古', glyph: 'note', slot: 'audio', work: { sound: 6 }, tags: ['复古'], desc: '芯片音色与短循环曲。' },
  lyricalMusic: { name: '抒情配乐素材库', family: 'audio', shelf: '配乐素材库', style: '抒情', glyph: 'note', slot: 'audio', work: { sound: 8 }, tags: ['抒情'], desc: '钢琴与弦乐的情绪曲。' },
  sfxLibrary: { name: '通用音效库', family: 'audio', shelf: '音效库', style: '通用', glyph: 'speaker', slot: 'audio', work: { sound: 4 }, tags: [], desc: '按键、脚步、打击等常用音效。' },

  pc: { name: 'PC 适配', family: 'platform', glyph: 'screen', slot: 'platform', work: { fluidity: 4 }, tags: ['PC'], desc: '键鼠操作、分辨率与性能适配。' },
  mobile: { name: '手机适配', family: 'platform', glyph: 'phone', slot: 'platform', work: { fluidity: 4 }, tags: ['手机'], desc: '触屏操作、竖横屏与耗电适配。' },

  levelsEnemies: { name: '关卡与敌人', family: 'content', glyph: 'flag', slot: 'content', oneOff: true, work: { depth: 3, creativity: 3, picture: 2 }, tags: [], desc: '这一作的关卡与敌人设计。' },
  heroStory: { name: '主角与剧情片段', family: 'content', glyph: 'mask', slot: 'content', oneOff: true, work: { creativity: 3, picture: 3 }, tags: [], desc: '主角形象与串起关卡的剧情。' },
  script: { name: '剧本', family: 'content', glyph: 'scroll', slot: 'content', oneOff: true, work: { creativity: 6, depth: 2 }, tags: [], desc: '这一作的故事与对白。' },
  portraits: { name: '角色立绘', family: 'content', glyph: 'frame', slot: 'content', oneOff: true, work: { picture: 5 }, tags: [], desc: '这一作的角色立绘。' }
};

// The slots of a title, in the order the form shows them. `min`/`max` bound how many modules a slot takes;
// `unlock` is how many released titles it waits for. A locked slot does not exist yet for the player.
export const SLOTS: any[] = [
  { key: 'core', name: '主玩法', min: 1, max: 1, unlock: 0 },
  { key: 'art', name: '美术素材', min: 1, max: 2, unlock: 0 },
  { key: 'audio', name: '音频素材', min: 1, max: 2, unlock: 1 },
  { key: 'feature', name: '功能', min: 0, max: 2, unlock: 2 },
  { key: 'content', name: '一次性内容', min: 1, max: 3, unlock: 2, oneOff: true },
  { key: 'platform', name: '平台', min: 1, max: 1, unlock: 3 }
];

// Origins: what the founder is good at, and the one-off job that opens the game. The job builds the
// starter module, which the first title then uses.
export const ORIGINS: any = {
  code: { name: '程序', focus: '让游戏跑得顺、手感好。', starter: 'engine2d', firstCore: 'actionCombat', job: '一家小公司需要一个能用的 2D 引擎', pay: 6 },
  design: { name: '策划', focus: '想出好玩的点子和规则。', starter: 'combatRules', firstCore: 'actionCombat', job: '一个团队需要一份横版战斗的规则原型', pay: 6 },
  art: { name: '美术', focus: '让游戏好看、有自己的风格。', starter: 'pixelCharacters', firstCore: 'branchingStory', job: '一个独立游戏需要一套像素人物素材', pay: 6 }
};

// Checked once at load: a broken catalog must fail loudly, not as a strange score in the middle of a run.
function checkCatalog() {
  const dims = ['creativity', 'depth', 'fluidity', 'picture', 'sound'];
  const slotKeys = SLOTS.map(slot => slot.key);
  for (const [id, module] of Object.entries(MODULES) as any) {
    if (!FAMILIES[module.family]) throw new Error(`模块 ${id} 的类别 ${module.family} 不存在`);
    if (module.slot && !slotKeys.includes(module.slot)) throw new Error(`模块 ${id} 的槽位 ${module.slot} 不存在`);
    for (const key of Object.keys(module.work || {})) if (!dims.includes(key)) throw new Error(`模块 ${id} 的工作维度 ${key} 无效`);
    for (const need of module.needs || []) if (!MODULES[need]) throw new Error(`模块 ${id} 依赖的 ${need} 不存在`);
  }
  const visit = (id: string, path: string[]) => {
    if (path.includes(id)) throw new Error(`模块循环依赖：${[...path, id].join(' → ')}`);
    for (const need of MODULES[id].needs || []) visit(need, [...path, id]);
  };
  for (const id of Object.keys(MODULES)) visit(id, []);
  for (const [key, origin] of Object.entries(ORIGINS) as any) {
    if (!MODULES[origin.starter] || MODULES[origin.firstCore]?.slot !== 'core') throw new Error(`出身 ${key} 的起步模块或首作玩法无效`);
  }
}
checkCatalog();
