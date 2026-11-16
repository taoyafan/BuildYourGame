// The module catalog: data only, no rules. A game is assembled from modules; built modules stay with the
// company and later titles reuse them. Adding content means adding entries here.
//
// Lines are flat: no line is built on another. Depth is a line's level: level k is built on level k-1 and
// only adds the difference in work, so a big title reuses everything a small one left. `work` is level 1's
// person-days per dimension; `tiers` caps how high the line goes. `requires` are lines on another axis a
// title must also use (a hard technical requirement, shown greyed out when missing). `content` (genres
// only) is the title's own work that is never kept: its levels, script, portraits. `unlock` marks a line
// that starts locked and is learned while making games, at most one per title; it can only be learned
// once that many titles are out (less one). Lines without it are the defaults every studio starts with.

// The four axes match the trades and the scores: design is creativity and depth, tech is fluidity, art is
// the picture and audio the sound. They decide the colour of a brick and the library page.
export const AXES: any = {
  design: { name: '玩法', color: '#c8574f' },
  tech: { name: '技术', color: '#4a6d8c' },
  art: { name: '美术', color: '#d39a1e' },
  audio: { name: '音乐', color: '#2f9a8a' }
};

export const MODULES: any = {
  // Gameplay is design: a document can settle it. A genre says what the title is and who buys it; a
  // mechanic is a system layered on top; a theme is the world it is set in, independent of the art style.
  actionCombat: { name: '横版动作', axis: 'design', glyph: 'sword', slot: 'core', type: 'action', work: { creativity: 5, depth: 5 }, content: { creativity: 3, depth: 3, picture: 3, sound: 1 }, tags: ['动作'], desc: '跑跳、出招与受击的规则。' },
  topShooter: { name: '俯视射击', axis: 'design', glyph: 'flag', slot: 'core', type: 'action', unlock: 2, work: { creativity: 4, depth: 6 }, content: { creativity: 2, depth: 3, picture: 4, sound: 1 }, tags: ['射击'], desc: '俯视角下的走位、瞄准与弹幕。' },
  platformer: { name: '平台跳跃', axis: 'design', glyph: 'mountain', slot: 'core', type: 'action', unlock: 3, work: { creativity: 5, depth: 4 }, content: { creativity: 3, depth: 2, picture: 4, sound: 1 }, tags: ['跳跃'], desc: '精确的跳跃、平台与机关。' },
  turnTactics: { name: '回合策略', axis: 'design', glyph: 'grid', slot: 'core', type: 'think', unlock: 1, work: { depth: 7, creativity: 3 }, content: { depth: 4, creativity: 2, picture: 3, sound: 1 }, tags: ['策略'], desc: '回合、行动点与敌人的应对。' },
  puzzle: { name: '解谜', axis: 'design', glyph: 'blueprint', slot: 'core', type: 'think', unlock: 2, work: { creativity: 6, depth: 5 }, content: { creativity: 3, depth: 4, picture: 2, sound: 1 }, tags: ['解谜'], desc: '机关、规则与一步步想通的关卡。' },
  management: { name: '模拟经营', axis: 'design', glyph: 'disk', slot: 'core', type: 'think', unlock: 3, work: { depth: 8, creativity: 3 }, content: { depth: 4, creativity: 2, picture: 3, sound: 1 }, tags: ['经营'], desc: '资源、产线与长期规划。' },
  branchingStory: { name: '分支叙事', axis: 'design', glyph: 'book', slot: 'core', type: 'story', work: { creativity: 10 }, content: { creativity: 4, depth: 1, picture: 4, sound: 1 }, tags: ['叙事'], desc: '对话、选项与多结局的结构。' },
  visualNovel: { name: '视觉小说', axis: 'design', glyph: 'scroll', slot: 'core', type: 'story', unlock: 2, work: { creativity: 8 }, content: { creativity: 4, depth: 1, picture: 5, sound: 2 }, tags: ['文字'], desc: '立绘、文本与演出撑起的故事。' },
  rpg: { name: '角色扮演', axis: 'design', glyph: 'frame', slot: 'core', type: 'story', unlock: 3, work: { creativity: 6, depth: 6 }, content: { creativity: 4, depth: 3, picture: 4, sound: 1 }, tags: ['RPG'], desc: '角色、任务与可以长大的冒险。' },

  roguelikeAction: { name: '随机关卡', axis: 'design', glyph: 'dice', slot: 'mechanic', unlock: 1, work: { depth: 4, creativity: 4 }, tags: ['肉鸽'], desc: '每局随机的地图与奖励，死了重来。' },
  growthTactics: { name: '角色养成', axis: 'design', glyph: 'tree', slot: 'mechanic', unlock: 1, work: { depth: 5, creativity: 2 }, tags: ['成长'], desc: '等级、技能树与装备。' },
  ensembleStory: { name: '多主角群像', axis: 'design', glyph: 'mask', slot: 'mechanic', unlock: 1, work: { creativity: 5, depth: 3 }, tags: ['群像'], desc: '多位主角的线互相交织。' },
  deckBuilding: { name: '卡牌构筑', axis: 'design', glyph: 'grid', slot: 'mechanic', unlock: 2, work: { depth: 5, creativity: 3 }, tags: ['卡牌'], desc: '一边打一边组自己的牌组。' },
  deduction: { name: '线索推理', axis: 'design', glyph: 'book', slot: 'mechanic', unlock: 2, work: { creativity: 4, depth: 4 }, tags: ['推理'], desc: '搜集线索、拼出真相。' },
  baseBuilding: { name: '基地建造', axis: 'design', glyph: 'blueprint', slot: 'mechanic', unlock: 3, work: { depth: 6, creativity: 2 }, tags: ['建造'], desc: '盖房子、摆设施、守住自己的地盘。' },
  survival: { name: '生存采集', axis: 'design', glyph: 'mountain', slot: 'mechanic', unlock: 3, work: { depth: 5, creativity: 3 }, tags: ['生存'], desc: '饥饿、采集与制作。' },
  openWorld: { name: '开放探索', axis: 'design', glyph: 'flag', slot: 'mechanic', unlock: 4, work: { creativity: 5, depth: 5 }, tags: ['探索'], desc: '想去哪就去哪的大地图。' },

  fantasy: { name: '奇幻', axis: 'design', glyph: 'star', slot: 'theme', work: { creativity: 3 }, tags: ['奇幻'], desc: '魔法、龙与剑的世界。' },
  scifi: { name: '科幻', axis: 'design', glyph: 'screen', slot: 'theme', work: { creativity: 3 }, tags: ['科幻'], desc: '星舰、机器人与未来城市。' },
  apocalypse: { name: '末日', axis: 'design', glyph: 'mountain', slot: 'theme', unlock: 1, work: { creativity: 3 }, tags: ['末日'], desc: '文明崩塌之后的废土。' },
  mystery: { name: '悬疑', axis: 'design', glyph: 'mask', slot: 'theme', unlock: 1, work: { creativity: 3 }, tags: ['悬疑'], desc: '谜团、反转与不安的气氛。' },
  wuxia: { name: '武侠', axis: 'design', glyph: 'sword', slot: 'theme', unlock: 2, work: { creativity: 3 }, tags: ['武侠'], desc: '江湖、门派与恩怨。' },
  campus: { name: '校园', axis: 'design', glyph: 'book', slot: 'theme', unlock: 3, work: { creativity: 3 }, tags: ['校园'], desc: '教室、社团与青春。' },

  // Tech is what code builds: the engine every title runs on.
  engine2d: { name: '2D 引擎', axis: 'tech', shelf: '引擎', glyph: 'gear', slot: 'engine', work: { fluidity: 10 }, tags: ['2D'], desc: '画面、输入与关卡的底层，每一作都跑在它上面。' },
  engine3d: { name: '3D 引擎', axis: 'tech', shelf: '引擎', glyph: 'gear', slot: 'engine', unlock: 4, work: { fluidity: 16 }, tags: ['3D'], desc: '三维场景、镜头与物理。' },

  pixelCharacters: { name: '像素人物素材库', axis: 'art', shelf: '人物素材库', style: '像素', glyph: 'person', slot: 'art', work: { picture: 10 }, tags: ['像素'], desc: '像素角色、动作帧与表情。' },
  handCharacters: { name: '手绘人物素材库', axis: 'art', shelf: '人物素材库', style: '手绘', glyph: 'person', slot: 'art', unlock: 1, work: { picture: 12 }, tags: ['手绘'], desc: '手绘角色立绘与动作。' },
  pixelScenes: { name: '像素场景素材库', axis: 'art', shelf: '场景素材库', style: '像素', glyph: 'mountain', slot: 'art', unlock: 1, work: { picture: 8 }, tags: ['像素'], desc: '像素地块、背景与道具。' },
  handScenes: { name: '手绘场景素材库', axis: 'art', shelf: '场景素材库', style: '手绘', glyph: 'mountain', slot: 'art', unlock: 1, work: { picture: 10 }, tags: ['手绘'], desc: '手绘背景与场景插画。' },

  retroMusic: { name: '复古配乐库', axis: 'audio', shelf: '配乐库', style: '复古', glyph: 'note', slot: 'audio', work: { sound: 6 }, tags: ['复古'], desc: '芯片音色与短循环曲。' },
  lyricalMusic: { name: '抒情配乐库', axis: 'audio', shelf: '配乐库', style: '抒情', glyph: 'note', slot: 'audio', unlock: 1, work: { sound: 8 }, tags: ['抒情'], desc: '钢琴与弦乐的情绪曲。' },
  electronicMusic: { name: '电子配乐库', axis: 'audio', shelf: '配乐库', style: '电子', glyph: 'note', slot: 'audio', unlock: 3, work: { sound: 8 }, tags: ['电子'], desc: '合成器与节拍。' },
  orchestralMusic: { name: '交响配乐库', axis: 'audio', shelf: '配乐库', style: '交响', glyph: 'note', slot: 'audio', unlock: 4, work: { sound: 10 }, tags: ['交响'], desc: '管弦乐团的大场面。' },
  sfxLibrary: { name: '通用音效库', axis: 'audio', shelf: '音效库', style: '通用', glyph: 'speaker', slot: 'audio', unlock: 2, work: { sound: 4 }, tags: [], desc: '按键、脚步、打击等常用音效。' }
};

// The slots of a title, in the order the form shows them. `min`/`max` bound how many lines a slot takes;
// `unlock` is how many released titles it waits for. A locked slot does not exist yet for the player.
export const SLOTS: any[] = [
  { key: 'core', axis: 'design', name: '类型', min: 1, max: 1, unlock: 0 },
  { key: 'mechanic', axis: 'design', name: '机制', min: 0, max: 2, unlock: 2 },
  { key: 'theme', axis: 'design', name: '题材', min: 1, max: 1, unlock: 0 },
  { key: 'engine', axis: 'tech', name: '引擎', min: 1, max: 1, unlock: 0 },
  { key: 'art', axis: 'art', name: '美术', min: 1, max: 2, unlock: 0 },
  { key: 'audio', axis: 'audio', name: '音乐', min: 1, max: 2, unlock: 1 }
];
// The second mechanic opens later than the first.
export const SECOND_MECHANIC = 4;

// Origins: what the founder is good at, and the one-off job that opens the game. The job builds a real
// module of the founder's trade, which the first title then uses.
export const ORIGINS: any = {
  code: { name: '程序', focus: '让游戏跑得顺、手感好。', starter: 'engine2d', firstCore: 'actionCombat', job: '一家小公司需要一个能用的 2D 引擎', pay: 4 },
  design: { name: '策划', focus: '想出好玩的点子和规则。', starter: 'branchingStory', firstCore: 'branchingStory', job: '一个团队需要一套分支叙事的结构设计', pay: 4 },
  art: { name: '美术', focus: '让游戏好看、有自己的风格。', starter: 'pixelCharacters', firstCore: 'branchingStory', job: '一个独立游戏需要一套像素人物素材', pay: 4 }
};

// Checked once at load: a broken catalog must fail loudly, not as a strange score in the middle of a run.
function checkCatalog() {
  const dims = ['creativity', 'depth', 'fluidity', 'picture', 'sound'];
  for (const [id, module] of Object.entries(MODULES) as any) {
    if (!AXES[module.axis]) throw new Error(`模块 ${id} 的轴 ${module.axis} 不存在`);
    const slot = SLOTS.find(item => item.key === module.slot);
    if (!slot || slot.axis !== module.axis) throw new Error(`模块 ${id} 的槽位 ${module.slot} 无效`);
    if (module.tiers !== undefined && !(Number.isInteger(module.tiers) && module.tiers >= 1 && module.tiers <= 4)) throw new Error(`模块 ${id} 的等级数无效`);
    for (const key of Object.keys({ ...module.work, ...(module.content || {}) })) if (!dims.includes(key)) throw new Error(`模块 ${id} 的工作维度 ${key} 无效`);
    if (module.needs) throw new Error(`模块 ${id} 不应有前置：模块是平铺的`);
    for (const need of module.requires || []) if (!MODULES[need] || MODULES[need].axis === module.axis) throw new Error(`模块 ${id} 要求的 ${need} 不存在或在同一条轴上`);
    if (module.slot === 'core' && (!module.content || !module.type)) throw new Error(`类型 ${id} 缺少本作内容或受众`);
  }
  for (const [key, origin] of Object.entries(ORIGINS) as any) {
    if (!MODULES[origin.starter] || MODULES[origin.firstCore]?.slot !== 'core') throw new Error(`出身 ${key} 的起步模块或首作玩法无效`);
  }
}
checkCatalog();
