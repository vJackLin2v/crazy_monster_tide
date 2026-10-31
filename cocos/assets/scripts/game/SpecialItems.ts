/**
 * 特殊道具的运行时效果（设计 v6 · item_expansion_design.md）
 *
 * 这些效果无法用 apply(stats) 表达（依赖血量、目标状态、技能数量、金币等运行时数据），
 * 所以统一抽成纯函数，Battle / RunState 只调用，测试用独立预期值断言。
 */

/** 背水：攻速倍率（低血 +35%，高血 -8%）——注意这是"攻速"，落到技能上要换算成冷却 */
export function lastbreathMul(hpPct: number): number {
  return hpPct < 0.35 ? 1.35 : 0.92;
}

/** 背水：技能冷却倍率 = 1 / 攻速倍率（低血 cd×0.741，高血 cd×1.087） */
export function lastbreathCdMul(hpPct: number): number {
  return 1 / lastbreathMul(hpPct);
}

/** 碎冰：对减速目标 +20%，对未被减速目标 -5% */
export function shatterMul(isSlowed: boolean): number {
  return isSlowed ? 1.20 : 0.95;
}

/** 专注核心：装备技能 ≤2 个时伤害 +25%、冷却 -10% */
export function focusedMods(skillCount: number): { dmg: number; cd: number } {
  return skillCount <= 2 ? { dmg: 1.25, cd: 0.90 } : { dmg: 1, cd: 1 };
}

/** 共鸣器：同一技能装 2 个同 Hook 模块时，该技能伤害 +20% */
export function resonatorMul(sameHookPairs: number): number {
  return sameHookPairs >= 1 ? 1.20 : 1;
}

/** 回响电弧：15% 概率追加 40% 伤害，0.6s 内置 CD */
export const VOLTLOOP_CHANCE = 0.15;
export const VOLTLOOP_DMG = 0.40;
export const VOLTLOOP_CD = 0.6;

/** 余烬刻印：下一次火伤 +25%（可叠 3 层） */
export const EMBERSTACK_MUL = 0.25;
export const EMBERSTACK_MAX = 3;

/** 贪欲之心：金币 +25%；每 100 金币攻击 +3%，封顶 +15% */
export const GREED_GOLD_MUL = 1.25;
export function greedPowerBonus(gold: number): number {
  return Math.min(0.15, Math.floor(Math.max(0, gold) / 100) * 0.03);
}

/** 精打细算：刷新费用 -50%，每波结束金币 -2 */
export const FRUGAL_REROLL_MUL = 0.5;
export const FRUGAL_WAVE_GOLD = 2;

/** 荆棘外衣：受击反弹 12 点，0.5s CD */
export const THORNCOAT_DMG = 12;
export const THORNCOAT_CD = 0.5;
