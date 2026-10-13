/**
 * 全局常量 —— 唯一数值来源
 *
 * 所有数值都从 HTML 原型（prototype-html/）移植而来，且与以下文档一致：
 *  - docs/ui/ui-spec-approved.md  v1.0（已冻结：360x640 / fitWidth / Nearest）
 *  - memory-bank/decisions.md     D-27（ZOOM=2 观感基准）
 *  - docs/systems/wave_rules.md   波次闯关规则
 *
 * ⚠️ 改这里的任何数字前，先回看上面三份文档；不要凭手感改。
 */

// ---------- 屏幕与视野 ----------
export const SCREEN_W = 360;
export const SCREEN_H = 640;
/** 渲染缩放：整数倍，单位 32px -> 屏幕 64px（占屏高 10%）
 *  ⚠️ 这是**与 HTML 原型完全一致**的值（原型 ZOOM=2）。
 *     关键在于「适配方式」也必须一致：工程用 fitWidth+fitHeight（完整容纳），
 *     保证可视设计高度正好 640 —— 否则同样的 64px 会显得更小（见 D-31）。
 *  改这个值必须连带改 ①竞技场 ②生成半径 ③刷怪密度（D-27）。 */
export const ZOOM = 2;
export const VIEW_W = SCREEN_W / ZOOM;   // 180
export const VIEW_H = SCREEN_H / ZOOM;   // 320

/** 竞技场（世界坐标）：可视区的 3.4 x 2.9 倍，留出风筝空间 */
export const ARENA_W = 620;
export const ARENA_H = 940;

// ---------- 单位 ----------
export const UNIT_NATIVE = 32;           // 单位精灵原生尺寸（像素）
export const UNIT_NATIVE_BIG = 40;       // 大体型单位（basilisk / boss-demonlord）
export const BASE_SPEED = 96;            // 基础移速 px/s（横穿 360px 屏约 3.8s）
export const BASE_PICKUP = 85;           // 经验拾取半径（靠近即吸，不必踩上去）
export const PLAYER_RADIUS = 12;         // 随 ZOOM 同步上调，避免"撞上却没伤害"
export const TARGET_RANGE = 260;         // 技能索敌半径（BOSS 生成距离必须小于它）

// ---------- 波次（docs/systems/wave_rules.md） ----------
export const RUN = {
  waves: 20,
  bossEvery: 10,        // 每 10 波一个 BOSS 波（10 / 20 / 30 …）
  eliteEvery: 3,        // 每 3 波一次精英（BOSS 波除外）
  eliteDoubleFrom: 12,  // 第 12 波起精英出 2 只
  baseTime: 18,         // 第 1 波时长（秒）
  timeStep: 3,          // 每 timeEvery 波 +3s
  timeEvery: 3,
  canContinue: true,    // 打通 20 波后可继续（无尽）
} as const;

export function waveTime(n: number): number {
  return RUN.baseTime + Math.floor((n - 1) / RUN.timeEvery) * RUN.timeStep;
}
export function isBossWave(n: number): boolean { return n % RUN.bossEvery === 0; }
export function isEliteWave(n: number): boolean { return !isBossWave(n) && n % RUN.eliteEvery === 0; }
export function eliteCount(n: number): number { return n >= RUN.eliteDoubleFrom ? 2 : 1; }

// ---------- 战斗手感 ----------
export const HITSTOP = { normal: 0.035, elite: 0.16, boss: 0.34 };  // 顿帧时长
export const HITSTOP_SCALE = 0.22;                                   // 顿帧期间的时间缩放
export const SHAKE = { kill: 1.2, hurt: 4, elite: 9, boss: 14 };     // 屏震强度
export const DEATH_ANIM_TIME = 0.75;                                 // 死亡动画时长（超过即回收，见 KI-001）

// ---------- 成长曲线 ----------
export const HP_GROWTH_PER_WAVE = 0.24;   // 敌人血量 / 波
export const DMG_GROWTH_PER_WAVE = 0.12;  // 敌人伤害 / 波
export const EXP_BASE = 5;
export const EXP_PER_LEVEL = 3.2;

// ---------- 商店 ----------
export const SHOP_SLOTS = 4;              // 固定 4 货位（参考 Brotato）
export const REROLL_BASE_COST = 2;        // 刷新价格递增起点

// ---------- 栅格 ----------
export const GRID_TILE = 24;              // 背景棋盘格边长（世界坐标）
