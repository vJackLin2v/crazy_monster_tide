/**
 * 难度配置（设计 v6 · difficulty_system_design.md / difficulties_data_spec.md）
 *
 * 原则：
 *  - normal 是唯一基准，所有倍率为 1、rules 为空；实现上"非普通才叠加覆盖"；
 *  - 其他难度只写与 normal 不同的字段（Partial 覆盖）；
 *  - rules[] 结构化存储，UI 直接从 rules 生成文案，不另写一份说明。
 */
export type DifficultyId = 'casual' | 'normal' | 'hard' | 'nightmare' | 'hell';

export type DifficultyRule =
  | { kind: 'noEliteUntilWave'; wave: number }
  | { kind: 'lowHpHealBonus'; thresholdPct: number; mul: number }
  | { kind: 'shopGuaranteeOffense'; count: number }
  | { kind: 'eliteAffixFromWave'; wave: number; chance: number; affixes: string[] }
  | { kind: 'eliteAlwaysAffixFromWave'; wave: number; count: number; affixes: string[] }
  | { kind: 'noHealInShop' }
  | { kind: 'rerollLimitPerWave'; count: number }
  | { kind: 'bossSummon'; thresholds: number[]; count: number; maxAlive: number; minIntervalSec: number; warnSec: number; hpMul: number; dmgMul: number }
  | { kind: 'lockCostPerLock'; gold: number }
  | { kind: 'eliteGuaranteedWaves'; waves: number[] }
  | { kind: 'bossEnrage'; thresholdPct: number; dmgMul: number; speedMul: number };

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  stars: 1 | 2 | 3 | 4 | 5;
  tagline: string;
  enemyHpMul: number;
  enemyDmgMul: number;
  /** 乘在刷怪**间隔**上：>1 更慢 */
  spawnMul: number;
  eliteChanceMul: number;
  bossHpMul: number;
  bossDmgMul: number;
  startHpMul: number;
  goldMul: number;
  expMul: number;
  shopPriceMul: number;
  /** 每波递增系数（仅地狱 0.02），封顶 +35% */
  shopPricePerWave: number;
  rerollCostMul: number;
  healMul: number;
  /** null = 不启用回血预算（普通难度） */
  healBudgetPerSecond: number | null;
  rules: DifficultyRule[];
  unlock: { type: 'default' } | { type: 'win'; difficulty: DifficultyId };
  reward: string;
}

const BASE: DifficultyConfig = {
  id: 'normal', name: '普通', stars: 2, tagline: '标准体验：和以往一样',
  enemyHpMul: 1, enemyDmgMul: 1, spawnMul: 1, eliteChanceMul: 1,
  bossHpMul: 1, bossDmgMul: 1, startHpMul: 1,
  goldMul: 1, expMul: 1, shopPriceMul: 1, shopPricePerWave: 0, rerollCostMul: 1,
  healMul: 1, healBudgetPerSecond: null, rules: [],
  unlock: { type: 'default' }, reward: '',
};

/** 其他难度：只写与 normal 不同的部分 */
const OVERRIDES: Record<Exclude<DifficultyId, 'normal'>, Partial<DifficultyConfig>> = {
  casual: {
    id: 'casual', name: '休闲', stars: 1, tagline: '降低压力，先熟悉系统',
    enemyHpMul: 0.80, enemyDmgMul: 0.80, spawnMul: 1.15, eliteChanceMul: 0.8,
    bossHpMul: 0.9, bossDmgMul: 0.9, startHpMul: 1.10,
    goldMul: 1.20, expMul: 1.15, shopPriceMul: 0.90, rerollCostMul: 0.90,
    healMul: 1.20, healBudgetPerSecond: 8,
    rules: [
      { kind: 'noEliteUntilWave', wave: 3 },
      { kind: 'lowHpHealBonus', thresholdPct: 30, mul: 1.2 },
      { kind: 'shopGuaranteeOffense', count: 1 },
    ],
    unlock: { type: 'default' }, reward: '',
  },
  hard: {
    id: 'hard', name: '困难', stars: 3, tagline: '需要开始理解构筑',
    enemyHpMul: 1.25, enemyDmgMul: 1.15, spawnMul: 0.92, eliteChanceMul: 1.2,
    bossHpMul: 1.2, bossDmgMul: 1.1,
    goldMul: 0.92, expMul: 0.95, shopPriceMul: 1.10, rerollCostMul: 1.15,
    healMul: 0.90, healBudgetPerSecond: 8,
    rules: [
      { kind: 'eliteAffixFromWave', wave: 12, chance: 0.25, affixes: ['shield'] },
      { kind: 'noHealInShop' },
      { kind: 'rerollLimitPerWave', count: 3 },
    ],
    unlock: { type: 'win', difficulty: 'normal' }, reward: '困难徽章',
  },
  nightmare: {
    id: 'nightmare', name: '噩梦', stars: 4, tagline: '考验构筑合理性',
    enemyHpMul: 1.45, enemyDmgMul: 1.35, spawnMul: 0.85, eliteChanceMul: 1.5,
    bossHpMul: 1.45, bossDmgMul: 1.25, startHpMul: 0.95,
    goldMul: 0.85, expMul: 0.90, shopPriceMul: 1.22, rerollCostMul: 1.30,
    healMul: 0.80, healBudgetPerSecond: 6,
    rules: [
      { kind: 'eliteAlwaysAffixFromWave', wave: 8, count: 1, affixes: ['shield', 'swift', 'split'] },
      { kind: 'bossSummon', thresholds: [70, 35], count: 3, maxAlive: 6, minIntervalSec: 12, warnSec: 1.2, hpMul: 0.7, dmgMul: 0.8 },
      { kind: 'lockCostPerLock', gold: 2 },
    ],
    unlock: { type: 'win', difficulty: 'hard' }, reward: '噩梦徽章',
  },
  hell: {
    id: 'hell', name: '地狱', stars: 5, tagline: '熟练玩家的极限挑战',
    enemyHpMul: 1.90, enemyDmgMul: 1.55, spawnMul: 0.78, eliteChanceMul: 1.8,
    bossHpMul: 1.7, bossDmgMul: 1.4, startHpMul: 0.90,
    goldMul: 0.78, expMul: 0.85, shopPriceMul: 1.35, shopPricePerWave: 0.02, rerollCostMul: 1.50,
    healMul: 0.70, healBudgetPerSecond: 5,
    rules: [
      { kind: 'eliteGuaranteedWaves', waves: [5, 8, 11, 14, 17, 20] },
      { kind: 'eliteAlwaysAffixFromWave', wave: 5, count: 2, affixes: ['shield', 'swift', 'split'] },
      { kind: 'bossEnrage', thresholdPct: 30, dmgMul: 1.25, speedMul: 1.15 },
      { kind: 'eliteAffixFromWave' as never, wave: 1, chance: 0, affixes: [] },
    ].filter(r => (r as { chance?: number }).chance !== 0) as DifficultyRule[],
    unlock: { type: 'win', difficulty: 'nightmare' }, reward: '地狱徽章 + 金色图鉴框',
  },
};

export const DIFFICULTY_IDS: DifficultyId[] = ['casual', 'normal', 'hard', 'nightmare', 'hell'];

export function difficultyOf(id: DifficultyId): DifficultyConfig {
  if (id === 'normal') return BASE;
  const o = OVERRIDES[id] ?? {};
  return { ...BASE, ...o, id };
}

/** 按顺序列出（UI 用） */
export const DIFFICULTIES: DifficultyConfig[] = DIFFICULTY_IDS.map(difficultyOf);

/** 精英概率：min(1, 基础 × 倍率) */
export function eliteChance(base: number, id: DifficultyId): number {
  return Math.min(1, base * difficultyOf(id).eliteChanceMul);
}

/** 刷怪间隔：基础 × spawnMul（>1 更慢） */
export function spawnInterval(base: number, id: DifficultyId): number {
  return base * difficultyOf(id).spawnMul;
}

/** 商店价格：基础 × shopPriceMul × (1 + perWave × (wave-1))，递增部分封顶 +35% */
export function shopPrice(base: number, id: DifficultyId, wave: number): number {
  const c = difficultyOf(id);
  const inc = Math.min(0.35, c.shopPricePerWave * Math.max(0, wave - 1));
  return base * c.shopPriceMul * (1 + inc);
}

/** 实际回血：min(基础 × healMul × 条件倍率, 剩余预算) */
export function healAmount(base: number, id: DifficultyId, hpPct: number): number {
  const c = difficultyOf(id);
  let v = base * c.healMul;
  for (const r of c.rules) {
    if (r.kind === 'lowHpHealBonus' && hpPct * 100 < r.thresholdPct) v *= r.mul;
  }
  return v;
}

/** 回血预算（null = 不限制） */
export function healBudget(id: DifficultyId): number | null {
  return difficultyOf(id).healBudgetPerSecond;
}


/** 通关当前难度后应解锁的下一档（最高档返回 null） */
export function nextDifficulty(id: DifficultyId): DifficultyId | null {
  const i = DIFFICULTY_IDS.indexOf(id);
  if (i < 0 || i >= DIFFICULTY_IDS.length - 1) return null;
  return DIFFICULTY_IDS[i + 1];
}
