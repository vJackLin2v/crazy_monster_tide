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

/** 观感倍率：在"自适应基准"之上再放大的倍数（1.0 = 与 HTML 原型完全同比例）
 *
 *  自适应基准 = max(可视宽/VIEW_W, 可视高/VIEW_H)，保证"不管屏幕多大多小，
 *  单位都占屏高 10%"（与原型一致）。
 *
 *  调参史：
 *   - 1.15：用户要"放大 3 倍"时留的余量，但**副作用是可视范围比原型小 22%**，
 *           用户随即反馈「视角高度太低，怪都看不到」→ 退回 1.0
 *   - 1.0：与 HTML 原型逐项一致（单位 10%、可视世界 152x320）
 *   - **0.85（当前）**：用户两次反馈"视角要拉高" → 视野放大 38%
 *                        （可视世界约 179x376、单位占屏高 8.5%）
 *
 *  ⚠️ 记住这个权衡：**单位和视野是同一个旋钮的两端** —— 单位变大 = 视野变小 = 更看不到怪。
 *     想"单位大"又要"看得远"，只能靠**减少屏幕上的杂物**，不能靠调这个值。 */
export const ZOOM_MUL = 0.85;
export const VIEW_W = SCREEN_W / ZOOM;   // 180
export const VIEW_H = SCREEN_H / ZOOM;   // 320

/** 竞技场（世界坐标）：可视区的 3.4 x 2.9 倍，留出风筝空间 */
export const ARENA_W = 620;
export const ARENA_H = 940;

// ---------- 单位 ----------
export const UNIT_NATIVE = 32;           // 单位精灵原生尺寸（像素）
export const UNIT_NATIVE_BIG = 40;       // 大体型单位（basilisk / boss-demonlord）
export const BASE_SPEED = 96;            // 基础移速 px/s（横穿 360px 屏约 3.8s）
// 经验拾取半径（arena px）。
// ⚠️ 2026-10-20 M31：85 → 34。85 时半径约等于**半个屏幕宽**（相机 viewW≈178），
//    怪一死经验球立刻被吸走，玩家根本看不到「掉落 → 拾取」这个循环（用户反馈「没有经验系统」）。
//    34 约等于屏幕 68px，要走近才吸，和土豆兄弟 / 吸血鬼幸存者的手感一致。
export const BASE_PICKUP = 34;
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
// ★ 2026-10-29：24%/12% 会让第 10 波血量 3.16×、伤害 2.08×，而玩家成长跟不上（见玩法审计 §8.2）
export const HP_GROWTH_PER_WAVE = 0.18;   // 敌人血量 / 波
export const DMG_GROWTH_PER_WAVE = 0.10;  // 敌人伤害 / 波
export const EXP_BASE = 5;
export const EXP_PER_LEVEL = 3.2;

// ---------- 商店 ----------
export const SHOP_SLOTS = 4;              // 固定 4 货位（参考 Brotato）
export const REROLL_BASE_COST = 2;        // 刷新价格递增起点

// ---------- 栅格 ----------
export const GRID_TILE = 24;              // 背景棋盘格边长（世界坐标）

