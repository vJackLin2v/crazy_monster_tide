/**
 * 精英词缀（difficulty_system_design.md §3，设计 v7）
 *
 * 三档效果（全部是**真实战斗数值**，不是 UI 图标）：
 *   · shield 护盾：最大生命 +20%（当前生命按比例保留）
 *   · swift  加速：移动速度 +25%
 *   · split  分裂：死亡时分裂出 2 只小怪（小怪不再带词缀，不递归）
 *
 * 纯函数，方便单测；Battle 只负责把结果落到 Enemy 上。
 */
import type { DifficultyRule } from '../data/Difficulties';

export type EliteAffix = 'shield' | 'swift' | 'split';

/** 护盾：最大生命 +20%（设计原文"额外 20% 生命"） */
export const AFFIX_SHIELD_HP_MUL = 1.2;
/** 加速：移动速度 +25% */
export const AFFIX_SWIFT_SPEED_MUL = 1.25;
/** 分裂：死亡时分裂出的小怪生命 = 本体最大生命 x 0.35，速度 x 0.9 */
export const AFFIX_SPLIT_COUNT = 2;
export const AFFIX_SPLIT_HP_MUL = 0.35;
export const AFFIX_SPLIT_SPEED_MUL = 0.9;

/** 取得某档难度、某一波的精英词缀规则（没有就是 null） */
export function eliteAffixRule(
  rules: DifficultyRule[], wave: number,
): { always: number; chance: number; pool: EliteAffix[] } | null {
  let always = 0, chance = 0;
  let pool: EliteAffix[] = [];
  for (const r of rules) {
    if (r.kind === 'eliteAlwaysAffixFromWave' && wave >= r.wave) {
      always = Math.max(always, r.count);
      pool = r.affixes as EliteAffix[];
    } else if (r.kind === 'eliteAffixFromWave' && wave >= r.wave) {
      chance = Math.max(chance, r.chance);
      if (!pool.length) pool = r.affixes as EliteAffix[];
    }
  }
  if (!pool.length) return null;
  return { always, chance, pool };
}

/**
 * 决定一只精英的词缀。`roll` 必须是 [0,1) 的随机源（测试里传固定序列）。
 * 普通难度 rules 为空 → 直接返回 []，**不消耗任何随机数**。
 */
export function rollEliteAffixes(
  rules: DifficultyRule[], wave: number, roll: () => number,
): EliteAffix[] {
  const rule = eliteAffixRule(rules, wave);
  if (!rule) return [];
  let count = rule.always;
  if (count <= 0) {
    if (rule.chance <= 0) return [];
    if (roll() >= rule.chance) return [];
    count = 1;
  }
  const pool = rule.pool.slice();
  const out: EliteAffix[] = [];
  while (out.length < count && pool.length) {
    const i = Math.min(pool.length - 1, Math.floor(roll() * pool.length));
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** 词缀对最大生命的倍率（护盾） */
export function affixHpMul(affixes: EliteAffix[]): number {
  return affixes.includes('shield') ? AFFIX_SHIELD_HP_MUL : 1;
}
/** 词缀对移动速度的倍率（加速） */
export function affixSpeedMul(affixes: EliteAffix[]): number {
  return affixes.includes('swift') ? AFFIX_SWIFT_SPEED_MUL : 1;
}
/** 死亡是否分裂 */
export function affixSplits(affixes: EliteAffix[]): boolean {
  return affixes.includes('split');
}

/** 词缀中文名（HUD / 结算 / 图鉴） */
export const AFFIX_NAMES: Record<EliteAffix, string> = {
  shield: '护盾',
  swift: '加速',
  split: '分裂',
};
