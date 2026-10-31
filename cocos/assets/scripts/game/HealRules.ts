/**
 * 回血预算（纯函数，Battle.healPlayer 与单测共用）
 *
 * 规则（2026-10-31 修复 A4）：
 *  · 所有难度都有**每秒预算**；普通难度配置为 null 时按默认 8 HP/s 处理；
 *  · 全局还有单秒硬夹 5 点（沿用 2026-10-31 的按压），避免站桩不死；
 *  · healAmount 的条件倍率（休闲低血等）不变。
 */
import { healAmount, healBudget } from '../data/Difficulties';
import type { DifficultyId } from '../data/Difficulties';

export const DEFAULT_HEAL_BUDGET = 8;
/** 单秒可回血的硬上限 */
export const HEAL_HARD_CAP = 5;

export function healBudgetOrDefault(budget: number | null): number {
  return budget === null ? DEFAULT_HEAL_BUDGET : budget;
}

/** 当前难度的有效每秒预算（已应用默认值；硬夹在 healStep 里） */
export function effectiveHealBudget(id: DifficultyId): number {
  return healBudgetOrDefault(healBudget(id));
}

/**
 * 一次回血结算：
 * @param amount 原始回血量
 * @param spent  本秒已经回过的量
 * @returns 实际回血与更新后的 spent
 */
export function healStep(
  amount: number, id: DifficultyId, hpPct: number, spent: number,
): { heal: number; spent: number } {
  if (!(amount > 0)) return { heal: 0, spent };
  const budget = effectiveHealBudget(id);
  const cap = Math.min(budget, HEAL_HARD_CAP);
  const scaled = healAmount(amount, id, hpPct);
  const heal = Math.max(0, Math.min(scaled, cap - Math.max(0, spent)));
  return { heal, spent: Math.max(0, spent) + heal };
}
