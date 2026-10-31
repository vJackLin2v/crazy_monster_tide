/**
 * 新黑科技的数值表（设计 v6 · module_expansion_design.md）
 *
 * 单独抽出来是为了**可测**：Battle 里只调用这些函数，
 * 测试用独立写死的期望值断言，避免"配置当预期"。
 */
export const MAX_STACKS = 3;

/** M1 溢出爆裂：伤害 8/14/20，半径 40/46/52 */
export function killblastDamage(stacks: number): number { return 8 + 6 * (Math.max(1, Math.min(MAX_STACKS, stacks)) - 1); }
export function killblastRadius(stacks: number): number { return 40 + 6 * (Math.max(1, Math.min(MAX_STACKS, stacks)) - 1); }

/** M2 残影护盾：3/5/7（每份 +2），池上限 9 */
export function shieldAmount(stacks: number): number { return 3 + 2 * (Math.max(1, Math.min(MAX_STACKS, stacks)) - 1); }
export const SHIELD_CAP = 9;
export const SHIELD_COOLDOWN = 1.5;
export const SHIELD_DURATION = 4;

/** 吸血：每份按伤害的 4% 回血（desc / MODULE_NUMS / 实现三处统一） */
export const VAMP_HEAL_PER_STACK = 0.04;
/** 反伤：每份 6 点（Ⅱ = 1.6 份 → 9.6，取整 10） */
export const THORNMAIL_BASE = 6;
export function thornmailBack(stacks: number): number { return Math.round(THORNMAIL_BASE * stacks); }

/** M3 处决：普通 40/58/76，BOSS 减半 20/29/38 */
export function executePct(stacks: number, isBoss: boolean): number {
  const s = Math.max(1, Math.min(MAX_STACKS, stacks));
  const pct = 0.40 + 0.18 * (s - 1);
  return isBoss ? pct * 0.5 : pct;
}

/** M4 返程斩：70/95/120% */
export function returnstrikePct(stacks: number): number { return 0.70 + 0.25 * (Math.max(1, Math.min(MAX_STACKS, stacks)) - 1); }

/** M5 焚烧地带：概率 35/45/55%（split 减半），3 跳，每跳 30%，区域上限 4 */
export function lingeringChance(stacks: number, fromSplit: boolean): number {
  const s = Math.max(1, Math.min(MAX_STACKS, stacks));
  const base = 0.35 + 0.10 * (s - 1);
  return fromSplit ? base / 2 : base;
}
export const LINGER_TICKS = 3;
export const LINGER_TICK_DMG = 0.30;
export const LINGER_MAX_ZONES = 4;

/** M6 蓄势：周期 3/2/2 次，倍率 1.8/2.1/2.4 */
export function overchargePeriod(stacks: number): number { return [3, 2, 2][Math.max(1, Math.min(MAX_STACKS, stacks)) - 1]; }
export function overchargeMul(stacks: number): number { return [1.8, 2.1, 2.4][Math.max(1, Math.min(MAX_STACKS, stacks)) - 1]; }
