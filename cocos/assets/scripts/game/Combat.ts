/**
 * 战斗计算（纯逻辑，不依赖 cc）
 *
 * 拆出来的目的：把「怎么算」和「怎么画」分开。
 * 数值来源全部走 core/Const.ts，别在这里写魔法数字。
 */
import { HP_GROWTH_PER_WAVE, DMG_GROWTH_PER_WAVE, VIEW_W, VIEW_H, ZOOM } from '../core/Const';
import { ENEMIES } from '../data/Enemies';
import type { CharStats } from '../data/Types';
import type { Rng } from '../core/Rng';

// ---------- 刷怪 ----------
export interface SpawnPlan { batch: number; interval: number; }

/**
 * 当前波次的刷怪节奏。
 * ⚠️ 曲线被用户实测打回过一次：原来的 `1 + floor(wave/2)` 在第 2 波直接从 1 只/批跳到 2 只/批，
 *    强度翻 2.25 倍（decisions.md D-19）。现在用更缓的台阶。
 * ⚠️ ZOOM=2 后可视区只有 180x320，怪量必须比 1x 时代低（D-27）。
 */
export function spawnPlan(wave: number): SpawnPlan {
  return {
    // ZOOM=3 后可视面积又小了 2.25 倍 → 间隔再放宽
    interval: Math.max(0.55, 1.45 - wave * 0.05),
    batch: Math.min(3, 1 + Math.floor(wave / 7)),
  };
}

/** 生成半径：可视半对角线约 hypot(60,107)=122 → 130~165 刚好落在屏幕外
 *  （跟着 ZOOM 走：ZOOM 变大 → 视野变小 → 生成半径必须同步缩小，否则怪要走很久才进画面） */
export const SPAWN_RADIUS_MIN = 130;
export const SPAWN_RADIUS_MAX = 165;

export interface Vec2Like { x: number; y: number; }

/** 在玩家周围的屏幕外一圈取一个刷新点，并夹在竞技场边界内 */
export function spawnPointAround(
  rng: Rng, px: number, py: number, arenaW: number, arenaH: number,
): Vec2Like {
  const a = rng.range(0, Math.PI * 2);
  const r = rng.range(SPAWN_RADIUS_MIN, SPAWN_RADIUS_MAX);
  return {
    x: Math.max(14, Math.min(arenaW - 14, px + Math.cos(a) * r)),
    y: Math.max(14, Math.min(arenaH - 14, py + Math.sin(a) * r)),
  };
}

/** 波次强度倍率：血量线性 +24%/波，伤害 +12%/波 */
export function waveScale(wave: number): { hp: number; dmg: number } {
  const g = Math.max(0, wave - 1);
  return { hp: 1 + HP_GROWTH_PER_WAVE * g, dmg: 1 + DMG_GROWTH_PER_WAVE * g };
}

// ---------- 伤害 ----------
export interface DamageResult { dmg: number; crit: boolean; }

/**
 * 一次伤害结算。
 * 注：`base` 已经包含技能等级、行为模块、属性、标签加成（由 SkillCalc 算好），
 *     这里只负责**暴击**这一层随机 —— 保证暴击也走同一个 Rng，可复现。
 */
export function rollDamage(base: number, stats: CharStats, rng: Rng): DamageResult {
  const crit = rng.chance(stats.crit);
  const dmg = Math.max(1, Math.round(base * (crit ? stats.critdmg : 1)));
  return { dmg, crit };
}

/** 玩家受伤：先扣减伤，再乘角色负面（如狂信者受到伤害 +15%） */
export function playerTakenDamage(raw: number, stats: CharStats, negMul = 1): number {
  const afterArmor = raw * (1 - stats.armor);
  return Math.max(1, Math.round(afterArmor * negMul));
}

/** 波次结算金币 */
export function waveGold(wave: number, bonus: number, greed: number): number {
  return Math.round((12 + wave * 5 + bonus) * (1 + greed));
}

// ---------- 视口换算（屏幕 <-> 世界） ----------
/** 世界坐标 -> 屏幕像素 */
export function worldToScreen(wx: number, wy: number, camX: number, camY: number): Vec2Like {
  return { x: (wx - camX) * ZOOM, y: (wy - camY) * ZOOM };
}
/** 可视世界尺寸 */
export const VIEW = { w: VIEW_W, h: VIEW_H };

/** 校验：敌人表里最快怪必须慢于玩家基础移速（"可躲"是硬条件） */
export function fastestEnemySpeed(): number {
  let m = 0;
  for (const k of Object.keys(ENEMIES)) {
    const e = ENEMIES[k];
    if (e.boss || e.elite) continue;
    if (e.spd > m) m = e.spd;
  }
  return m;
}
