/**
 * 回血预算（纯函数，RunState.heal 与单测共用；Battle.healPlayer 只是表现层包装）
 *
 * 规则（2026-10-31 修复 A4）：
 *  · 所有难度都有**每秒预算**；普通难度配置为 null 时按默认 8 HP/s 处理；
 *  · 全局还有单秒硬夹 5 点（沿用 2026-10-31 的按压），避免站桩不死；
 *  · 预算按**实际恢复量**记账：先夹剩余生命，再累计 spent（99/100 请求 5 → 只记 1）；
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
 * @param room   剩余可恢复生命（默认 Infinity；用于按实际恢复量记账）
 * @returns 实际回血与更新后的 spent
 */
export function healStep(
  amount: number, id: DifficultyId, hpPct: number, spent: number, room = Infinity,
): { heal: number; spent: number } {
  if (!(amount > 0)) return { heal: 0, spent };
  const budget = effectiveHealBudget(id);
  const cap = Math.min(budget, HEAL_HARD_CAP);
  const scaled = healAmount(amount, id, hpPct);
  // 预算按**实际恢复量**记账：先夹剩余生命，再累计 spent
  const maxHeal = Math.max(0, Math.min(scaled, cap - Math.max(0, spent), room));
  const heal = Number.isFinite(maxHeal) ? maxHeal : 0;
  return { heal, spent: Math.max(0, spent) + heal };
}
