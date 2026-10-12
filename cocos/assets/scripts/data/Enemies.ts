import type { EnemyDef } from './Types';

/** 敌人阵容（12 杂兵 + 1 精英 + 1 BOSS 模板）
 *  unit = assets/art/units/<unit>/；from = 从第几波解锁（新手期只出慢怪）
 *  ⚠️ 速度标定：最快怪必须低于玩家基础移速（BASE_SPEED=96），"可躲"是硬条件。 */
export const ENEMIES: Record<string, EnemyDef> = {
  goblin:        { unit: 'goblin',        hp: 12, spd: 50, dmg: 6,  r: 11, exp: 1, gold: 1, from: 1 },
  wolf:          { unit: 'wolf',          hp: 14, spd: 60, dmg: 7,  r: 11, exp: 1, gold: 1, from: 3 },
  eyebat:        { unit: 'eyebat',        hp: 12, spd: 70, dmg: 7,  r: 10, exp: 1, gold: 1, from: 4 },
  orc:           { unit: 'orc',           hp: 22, spd: 46, dmg: 9,  r: 12, exp: 1, gold: 2, from: 5 },
  imp:           { unit: 'imp',           hp: 18, spd: 56, dmg: 8,  r: 11, exp: 1, gold: 1, from: 7 },
  stingerbat:    { unit: 'stingerbat',    hp: 16, spd: 66, dmg: 8,  r: 10, exp: 2, gold: 2, from: 8 },
  hyena:         { unit: 'hyena',         hp: 26, spd: 62, dmg: 10, r: 12, exp: 2, gold: 2, from: 9 },
  axolizard:     { unit: 'axolizard',     hp: 34, spd: 48, dmg: 11, r: 13, exp: 2, gold: 2, from: 11 },
  lizardhunter:  { unit: 'lizardhunter',  hp: 30, spd: 58, dmg: 11, r: 12, exp: 2, gold: 2, from: 13 },
  succubus:      { unit: 'succubus',      hp: 38, spd: 54, dmg: 12, r: 12, exp: 3, gold: 3, from: 15 },
  basilisk:      { unit: 'basilisk',      hp: 46, spd: 44, dmg: 13, r: 14, exp: 3, gold: 3, from: 17 },
  gnollberserker:{ unit: 'gnollberserker',hp: 150,spd: 44, dmg: 16, r: 17, exp: 8, gold: 12, elite: true },
  boss:          { unit: 'boss-demonlord',hp: 900,spd: 48, dmg: 22, r: 26, exp: 40, gold: 45, boss: true },
};

/** BOSS 轮换：第 10 波恶魔领主 / 第 20 波地狱守望者 / 第 30 波起星光圣骑士 */
export const BOSS_UNITS = ['boss-demonlord', 'boss-hellwarden', 'boss-paladin'] as const;

export function bossUnitFor(wave: number): string {
  const i = Math.max(0, Math.floor(wave / 10) - 1) % BOSS_UNITS.length;
  return BOSS_UNITS[i];
}

/** 普通怪池：按 from 解锁（失败即空数组，调用方需兜底） */
export function enemyPool(wave: number): string[] {
  return Object.keys(ENEMIES).filter(k => {
    const d = ENEMIES[k];
    return !d.elite && !d.boss && wave >= (d.from ?? 1);
  });
}

/** 玩家单位（6 个角色，见 Chars.ts） */
export const PLAYER_UNITS = ['swordswoman', 'archer', 'mage', 'spearman', 'jester', 'rider'] as const;
