// The module catalog: data only, no rules. A game is assembled from modules; built modules stay with the
// company and later titles reuse them. Adding content means adding entries here.
//
// An entry is a line (a 2D engine, a pixel character library). Its tiers are separate modules generated
// from the same entry: tier k is built on tier k-1 and only adds the difference in work, so a big title
// reuses everything a small one left. `work` is the first tier's person-days per dimension; `tiers` caps
// how high the line goes. `needs` are lines on the same axis it is built on; `requires` are lines on
// another axis a title must also use (a hard technical requirement, shown greyed out when missing).
// `content` (gameplay only) is the title's own work that is never kept: its levels, script, portraits.
// `unlock` is how many released titles the line waits for.

// The four axes match the trades and the scores: design is creativity and depth, tech is fluidity, art is
// the picture and audio the sound. They decide the colour of a brick and the library page.
export const AXES: any = {
  design: { name: '玩法', color: '#c8574f' },
  tech: { name: '技术', color: '#4a6d8c' },
  art: { name: '美术', color: '#d39a1e' },
  audio: { name: '音乐', color: '#2f9a8a' }
};

export const MODULES: any = {
  // Gameplay is design: a document can settle it. A variant is built on its base and stays one layer up.
  actionCombat: { name: '横版动作', axis: 'design', glyph: 'sword', slot: 'core', type: 'action', work: { creativity: 5, depth: 5 }, content: { creativity: 3, depth: 3, picture: 3, sound: 1 }, tags: ['动作'], desc: '跑跳、出招与受击的规则。' },
  branchingStory: { name: '分支叙事', axis: 'design', glyph: 'book', slot: 'core', type: 'story', work: { creativity: 10 }, content: { creativity: 4, depth: 1, picture: 4, sound: 1 }, tags: ['叙事'], desc: '对话、选项与多结局的结构。' },
  turnTactics: { name: '回合策略', axis: 'design', glyph: 'grid', slot: 'core', type: 'think', unlock: 1, work: { depth: 7, creativity: 3 }, content: { depth: 4, creativity: 2, picture: 3, sound: 1 }, tags: ['策略'], desc: '回合、行动点与敌人的应对。' },
  roguelikeAction: { name: '肉鸽动作', axis: 'design', glyph: 'dice', slot: 'core', type: 'action', unlock: 2, needs: ['actionCombat'], work: { depth: 4, creativity: 4 }, tags: ['动作', '肉鸽'], desc: '在横版动作上加入每局随机的地图与奖励。' },
  ensembleStory: { name: '群像叙事', axis: 'design', glyph: 'mask', slot: 'core', type: 'story', unlock: 2, needs: ['branchingStory'], work: { creativity: 5, depth: 3 }, tags: ['叙事', '群像'], desc: '在分支叙事上让多位主角的线交织。' },
  growthTactics: { name: '养成策略', axis: 'design', glyph: 'tree', slot: 'core', type: 'think', unlock: 2, needs: ['turnTactics'], work: { depth: 5, creativity: 2 }, tags: ['策略', '成长'], desc: '在回合策略上加入角色养成与技能树。' },

  // Tech is what code builds: the engine every title runs on, and the platform it ships to.
  engine2d: { name: '2D 引擎', axis: 'tech', shelf: '引擎', glyph: 'gear', slot: 'engine', work: { fluidity: 10 }, tags: [], desc: '画面、输入与关卡的底层，每一作都跑在它上面。' },
  pc: { name: 'PC 适配', axis: 'tech', shelf: '平台适配', glyph: 'screen', slot: 'platform', tiers: 1, work: { fluidity: 4 }, tags: ['PC'], desc: '键鼠操作、分辨率与性能适配。' },
  mobile: { name: '手机适配', axis: 'tech', shelf: '平台适配', glyph: 'phone', slot: 'platform', tiers: 1, work: { fluidity: 4 }, tags: ['手机'], desc: '触屏操作、竖横屏与耗电适配。' },

  pixelCharacters: { name: '像素人物素材库', axis: 'art', shelf: '人物素材库', style: '像素', glyph: 'person', slot: 'art', work: { picture: 10 }, tags: ['像素'], desc: '像素角色、动作帧与表情。' },
  handCharacters: { name: '手绘人物素材库', axis: 'art', shelf: '人物素材库', style: '手绘', glyph: 'person', slot: 'art', unlock: 1, work: { picture: 12 }, tags: ['手绘'], desc: '手绘角色立绘与动作。' },
  pixelScenes: { name: '像素场景素材库', axis: 'art', shelf: '场景素材库', style: '像素', glyph: 'mountain', slot: 'art', unlock: 1, work: { picture: 8 }, tags: ['像素'], desc: '像素地块、背景与道具。' },
  handScenes: { name: '手绘场景素材库', axis: 'art', shelf: '场景素材库', style: '手绘', glyph: 'mountain', slot: 'art', unlock: 1, work: { picture: 10 }, tags: ['手绘'], desc: '手绘背景与场景插画。' },

  retroMusic: { name: '复古配乐库', axis: 'audio', shelf: '配乐库', style: '复古', glyph: 'note', slot: 'audio', work: { sound: 6 }, tags: ['复古'], desc: '芯片音色与短循环曲。' },
  lyricalMusic: { name: '抒情配乐库', axis: 'audio', shelf: '配乐库', style: '抒情', glyph: 'note', slot: 'audio', work: { sound: 8 }, tags: ['抒情'], desc: '钢琴与弦乐的情绪曲。' },
  sfxLibrary: { name: '通用音效库', axis: 'audio', shelf: '音效库', style: '通用', glyph: 'speaker', slot: 'audio', work: { sound: 4 }, tags: [], desc: '按键、脚步、打击等常用音效。' }
};

// The slots of a title, in the order the form shows them. `min`/`max` bound how many lines a slot takes;
// `unlock` is how many released titles it waits for. A locked slot does not exist yet for the player.
export const SLOTS: any[] = [
  { key: 'core', axis: 'design', name: '玩法', min: 1, max: 1, unlock: 0 },
  { key: 'engine', axis: 'tech', name: '引擎', min: 1, max: 1, unlock: 0 },
  { key: 'art', axis: 'art', name: '美术', min: 1, max: 2, unlock: 0 },
  { key: 'audio', axis: 'audio', name: '音乐', min: 1, max: 2, unlock: 1 },
  { key: 'platform', axis: 'tech', name: '平台', min: 1, max: 1, unlock: 3 }
];

// Origins: what the founder is good at, and the one-off job that opens the game. The job builds a real
// module of the founder's trade, which the first title then uses.
export const ORIGINS: any = {
  code: { name: '程序', focus: '让游戏跑得顺、手感好。', starter: 'engine2d', firstCore: 'actionCombat', job: '一家小公司需要一个能用的 2D 引擎', pay: 6 },
  design: { name: '策划', focus: '想出好玩的点子和规则。', starter: 'branchingStory', firstCore: 'branchingStory', job: '一个团队需要一套分支叙事的结构设计', pay: 6 },
  art: { name: '美术', focus: '让游戏好看、有自己的风格。', starter: 'pixelCharacters', firstCore: 'branchingStory', job: '一个独立游戏需要一套像素人物素材', pay: 6 }
};

// Checked once at load: a broken catalog must fail loudly, not as a strange score in the middle of a run.
function checkCatalog() {
  const dims = ['creativity', 'depth', 'fluidity', 'picture', 'sound'];
  for (const [id, module] of Object.entries(MODULES) as any) {
    if (!AXES[module.axis]) throw new Error(`模块 ${id} 的轴 ${module.axis} 不存在`);
    const slot = SLOTS.find(item => item.key === module.slot);
    if (!slot || slot.axis !== module.axis) throw new Error(`模块 ${id} 的槽位 ${module.slot} 无效`);
    if (module.tiers !== undefined && !(Number.isInteger(module.tiers) && module.tiers >= 1 && module.tiers <= 4)) throw new Error(`模块 ${id} 的档位数无效`);
    for (const key of Object.keys({ ...module.work, ...(module.content || {}) })) if (!dims.includes(key)) throw new Error(`模块 ${id} 的工作维度 ${key} 无效`);
    for (const need of module.needs || []) if (MODULES[need]?.axis !== module.axis) throw new Error(`模块 ${id} 依赖的 ${need} 不存在或不在同一条轴上`);
    for (const need of module.requires || []) if (!MODULES[need] || MODULES[need].axis === module.axis) throw new Error(`模块 ${id} 要求的 ${need} 不存在或在同一条轴上`);
    if (module.slot === 'core' && !module.content && !(module.needs || []).length) throw new Error(`玩法 ${id} 缺少本作内容`);
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
