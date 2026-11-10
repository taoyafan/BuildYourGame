// The module catalog: data only, no rules. A game is assembled from modules; finished modules stay with
// the company and are reused or upgraded by later titles. Adding content means adding entries here.
//
// Each module has level-1 work per dimension in person-days (larger titles multiply it by the scale's
// work factor), the modules it is built on (`needs`), tags, and the slot category the player picks it in.
// `group` decides where it is listed in the library: 'system' for gameplay systems, 'tool' for engines,
// art styles, sound libraries and platform ports. One-off modules (`oneOff`) belong to a single title
// and are never kept. A part used by one module only is that module's own work and is not listed here.

export const MODULES: any = {
  // Shared tools: never picked directly, pulled in by the modules that need them.
  engine2d: { name: '2D 引擎', group: 'tool', work: { fluidity: 4 }, tags: ['2D'], desc: '画面、输入与关卡的底层，很多玩法都建立在它之上。' },
  saveSystem: { name: '存档系统', group: 'tool', work: { fluidity: 1, depth: 1 }, tags: [], desc: '记录进度与选择。' },

  pc: { name: 'PC 适配', group: 'tool', slot: 'platform', work: { fluidity: 2 }, tags: ['PC'], desc: '键鼠操作、分辨率与性能适配。' },
  mobile: { name: '手机适配', group: 'tool', slot: 'platform', work: { fluidity: 2 }, tags: ['手机'], desc: '触屏操作、竖横屏与耗电适配。' },

  actionCombat: { name: '横版动作战斗', group: 'system', slot: 'core', type: 'action', needs: ['engine2d'], work: { fluidity: 5, depth: 3 }, tags: ['动作'], desc: '跑跳、攻击与受击判定。' },
  branchingStory: { name: '分支叙事', group: 'system', slot: 'core', type: 'story', needs: ['engine2d', 'saveSystem'], work: { creativity: 4, depth: 3, fluidity: 1 }, tags: ['叙事', '选择'], desc: '对话、选项与多结局。' },
  turnTactics: { name: '回合策略', group: 'system', slot: 'core', type: 'think', needs: ['engine2d', 'saveSystem'], work: { depth: 6, creativity: 2 }, tags: ['策略'], desc: '回合、行动点与敌人的应对。' },

  roguelikeGen: { name: '肉鸽关卡生成', group: 'system', slot: 'feature', needs: ['engine2d'], work: { depth: 3, creativity: 3 }, tags: ['肉鸽', '随机'], desc: '每局随机生成地图与奖励。' },
  skillGrowth: { name: '技能成长', group: 'system', slot: 'feature', needs: ['saveSystem'], work: { depth: 3, creativity: 1 }, tags: ['成长'], desc: '技能树与长期养成。' },

  pixelArt: { name: '像素画风', group: 'tool', slot: 'art', work: { picture: 5 }, tags: ['像素'], desc: '像素角色、地块与动画规范。' },
  handDrawnArt: { name: '手绘画风', group: 'tool', slot: 'art', work: { picture: 6 }, tags: ['手绘'], desc: '手绘线稿、上色与镜头风格。' },

  retroMusic: { name: '复古配乐', group: 'tool', slot: 'music', work: { sound: 3 }, tags: ['复古'], desc: '芯片音色与短循环曲。' },
  lyricalMusic: { name: '抒情配乐', group: 'tool', slot: 'music', work: { sound: 4 }, tags: ['抒情'], desc: '钢琴与弦乐的情绪曲。' },
  sfxLibrary: { name: '通用音效库', group: 'tool', slot: 'sfx', work: { sound: 2 }, tags: [], desc: '按键、脚步、打击等常用音效。' },

  // One-off content: written for one title only.
  levelsEnemies: { name: '关卡与敌人', slot: 'content', oneOff: true, work: { depth: 3, creativity: 2, picture: 2 }, tags: [], desc: '这一作的关卡与敌人设计。' },
  heroStory: { name: '主角与剧情片段', slot: 'content', oneOff: true, work: { creativity: 2, picture: 2 }, tags: [], desc: '主角形象与串起关卡的剧情。' },
  script: { name: '剧本', slot: 'content', oneOff: true, work: { creativity: 5, depth: 2 }, tags: [], desc: '这一作的故事与对白。' },
  portraits: { name: '角色立绘', slot: 'content', oneOff: true, work: { picture: 4 }, tags: [], desc: '这一作的角色立绘。' },
  scenes: { name: '场景插画', slot: 'content', oneOff: true, work: { picture: 4 }, tags: [], desc: '这一作的场景插画。' }
};

// The slots of a title, in the order the form shows them. `min`/`max` bound how many modules a slot takes.
export const SLOTS: any[] = [
  { key: 'platform', name: '平台', min: 1, max: 1 },
  { key: 'core', name: '主玩法', min: 1, max: 1 },
  { key: 'feature', name: '功能', min: 0, max: 2 },
  { key: 'art', name: '画风', min: 1, max: 1 },
  { key: 'music', name: '配乐', min: 1, max: 1 },
  { key: 'sfx', name: '音效', min: 0, max: 1 },
  { key: 'content', name: '世界内容', min: 1, max: 3, oneOff: true }
];

// Ready-made recipes for the form: the two example games.
export const TEMPLATES: any[] = [
  { name: '像素动作肉鸽', slots: { platform: ['pc'], core: ['actionCombat'], feature: ['roguelikeGen', 'skillGrowth'], art: ['pixelArt'], music: ['retroMusic'], sfx: ['sfxLibrary'], content: ['levelsEnemies', 'heroStory'] } },
  { name: '手绘叙事冒险', slots: { platform: ['mobile'], core: ['branchingStory'], feature: [], art: ['handDrawnArt'], music: ['lyricalMusic'], sfx: ['sfxLibrary'], content: ['script', 'portraits', 'scenes'] } }
];

// Checked once at load: a broken catalog must fail loudly, not as a strange score in the middle of a run.
function checkCatalog() {
  const dims = ['creativity', 'depth', 'fluidity', 'picture', 'sound'];
  const slotKeys = SLOTS.map(slot => slot.key);
  for (const [id, module] of Object.entries(MODULES) as any) {
    if (module.slot && !slotKeys.includes(module.slot)) throw new Error(`模块 ${id} 的槽位 ${module.slot} 不存在`);
    if (!module.slot && !module.group) throw new Error(`模块 ${id} 既不能选也不在库里`);
    for (const key of Object.keys(module.work || {})) if (!dims.includes(key)) throw new Error(`模块 ${id} 的工作维度 ${key} 无效`);
    for (const need of module.needs || []) if (!MODULES[need]) throw new Error(`模块 ${id} 依赖的 ${need} 不存在`);
  }
  const visit = (id: string, path: string[]) => {
    if (path.includes(id)) throw new Error(`模块循环依赖：${[...path, id].join(' → ')}`);
    for (const need of MODULES[id].needs || []) visit(need, [...path, id]);
  };
  for (const id of Object.keys(MODULES)) visit(id, []);
  for (const template of TEMPLATES) for (const [slot, ids] of Object.entries(template.slots) as any) for (const id of ids) if (MODULES[id]?.slot !== slot) throw new Error(`模板 ${template.name} 的 ${id} 不在槽位 ${slot}`);
}
checkCatalog();
