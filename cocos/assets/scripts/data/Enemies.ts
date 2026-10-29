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
  observer:      { unit: 'observer',      hp: 20, spd: 52, dmg: 8,  r: 11, exp: 2, gold: 2, from: 6 },
  claweddemon:   { unit: 'claweddemon',   hp: 40, spd: 50, dmg: 12, r: 13, exp: 2, gold: 2, from: 10 },
  venommaw:      { unit: 'venommaw',      hp: 55, spd: 42, dmg: 13, r: 14, exp: 3, gold: 3, from: 14 },
  cavebrute:     { unit: 'cavebrute',     hp: 80, spd: 38, dmg: 15, r: 16, exp: 4, gold: 4, from: 16 },
  gnollberserker:{ unit: 'gnollberserker',hp: 150,spd: 44, dmg: 16, r: 17, exp: 8, gold: 12, elite: true },
  boss:          { unit: 'boss-demonlord',hp: 900,spd: 48, dmg: 22, r: 26, exp: 40, gold: 45, boss: true },
};

/**
 * BOSS 轮换 —— **6 个**（需求 §10：5~6 个，现已补齐）
 *
 * 一轮 20 波里只有第 10 / 20 波是 BOSS 波，所以单局通常只见前两个；
 * 第 30 波起（无尽）与不同局会轮到后面几个。
 * 素材来源：行囊守卫主池（09Hell Enforcer / 10CaveDevourer / 08Crystal Guard），
 * 授权口径同 D-26（用户决定使用，上架前需重新裁决）。
 */
export const BOSS_UNITS = ['boss-demonlord', 'boss-hellwarden', 'boss-paladin',
                           'boss-infernal', 'boss-devourer', 'boss-crystal'] as const;

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
