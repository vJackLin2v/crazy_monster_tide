/* 自动生成 —— 由磁盘实际文件扫描而来（tools 见 cocos/README.md）
   路径规则：resources/art/units/<单位>/<动画>/NN.png（2 位序号）
             resources/art/vfx/<组>/<子组>/<组件>/NNN.png（3 位序号）*/

/** 每个单位的各动画帧数（idle/walk/attack/death） */
export const UNIT_FRAMES: Record<string, Record<string, number>> = {
  'archer': { attack: 11, death: 4, idle: 4, walk: 6 },
  'axolizard': { attack: 8, death: 8, idle: 4, walk: 6 },
  'basilisk': { attack: 6, death: 7, idle: 4, walk: 5 },
  'boss-crystal': { attack: 8, death: 6, idle: 4, walk: 6 },
  'boss-demonlord': { attack: 7, death: 8, idle: 4, walk: 6 },
  'boss-devourer': { attack: 4, death: 10, idle: 4, walk: 5 },
  'boss-infernal': { attack: 6, death: 8, idle: 4, walk: 6 },
  'boss-hellwarden': { attack: 8, death: 7, idle: 4, walk: 6 },
  'boss-paladin': { attack: 9, death: 6, idle: 4, walk: 6 },
  'eyebat': { death: 4, idle: 4, walk: 4 },
  'gnollberserker': { attack: 6, death: 6, idle: 4, walk: 6 },
  'goblin': { attack: 4, death: 4, idle: 4, walk: 6 },
  'hyena': { attack: 4, death: 4, idle: 4, walk: 6 },
  'imp': { attack: 6, death: 5, idle: 4, walk: 5 },
  'jester': { attack: 6, death: 5, idle: 4, walk: 6 },
  'lizardhunter': { attack: 6, death: 8, idle: 4, walk: 6 },
  'mage': { attack: 11, death: 9, idle: 4, walk: 6 },
  'orc': { attack: 5, death: 6, idle: 4, walk: 6 },
  'rider': { attack: 7, death: 6, idle: 8, walk: 6 },
  'spearman': { attack: 7, death: 5, idle: 4, walk: 6 },
  'stingerbat': { attack: 7, death: 4, idle: 4 },
  'succubus': { attack: 9, death: 7, idle: 4, walk: 6 },
  'swordswoman': { attack: 6, death: 4, idle: 4, walk: 6 },
  'wolf': { attack: 5, death: 4, idle: 4, walk: 6 },
};

/** 各动画播放帧率 */
export const ANIM_FPS: Record<string, number> = { idle: 12, walk: 12, attack: 15, death: 12 };
