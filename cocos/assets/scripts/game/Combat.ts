/**
 * 战斗计算（纯逻辑，不依赖 cc）
 *
 * 拆出来的目的：把「怎么算」和「怎么画」分开。
 * 数值来源全部走 core/Const.ts，别在这里写魔法数字。
 */
import { VIEW_W, VIEW_H, ZOOM } from '../core/Const';
import { balance } from '../core/Balance';
import { ENEMIES } from '../data/Enemies';
import type { CharStats } from '../data/Types';
import type { Rng } from '../core/Rng';

// ---------- 刷怪 ----------
export interface SpawnPlan { batch: number; interval: number; }

/** 同屏活怪上限（玩法审计 §8.2）：超过软上限就降速，达到硬上限就停刷 */
export const ALIVE_SOFT = 40;
export const ALIVE_HARD = 60;
/** 超过软上限时刷怪间隔的惩罚倍率 */
export const ALIVE_SLOW_MUL = 1.6;

/** 运行时生效的活怪上限（可被 Balance 覆盖） */
export function aliveCaps(): { soft: number; hard: number; slowMul: number } {
  const s = balance().spawn;
  return { soft: s.aliveSoft, hard: s.aliveHard, slowMul: s.slowMul };
}

/**
 * 当前波次的刷怪节奏。
 * ⚠️ 曲线被用户实测打回过一次：原来的 `1 + floor(wave/2)` 在第 2 波直接从 1 只/批跳到 2 只/批，
 *    强度翻 2.25 倍（decisions.md D-19）。现在用更缓的台阶。
 * ⚠️ ZOOM=2 后可视区只有 180x320，怪量必须比 1x 时代低（D-27）。
 */
export function spawnPlan(wave: number): SpawnPlan {
  return {
    // 2026-10-13 用户要求"把密度调起来"（视觉模型反馈"怪物不多"）。
    // 关键前提变了：修正缩放后可视世界只有约 157x278，屏幕"能装下"的怪比以前少很多，
    // 所以同样的间隔会显得很空。这里按"屏幕上的怪"来标定，而不是按抽象数字。
    // 按"屏幕上的怪"标定（可视世界约 157x278，能装下的怪比修正缩放前少很多）。
    // ⚠️ 早期不能太猛：第 1 波玩家只有 1 个技能，DPS ≈ 0.6 只/秒，
    //    刷得比杀得快会直接崩盘。所以**低位靠开场铺怪制造"扑面感"，
    //    速率随玩家技能数一起涨**。
    // 2026-10-13 用"屏幕上的怪"实测标定（不是估算）：
    //   旧参数(interval 0.95-w*0.042) 实测在屏怪 **平均 0.75 只 / 最多 2 只** —— 玩家反馈「怪都看不到」。
    //   修正缩放后可视世界 152x320（比修正前小很多），屏幕上"能装下的怪"本来就少，
    //   所以必须显著提高刷新率才能有"怪潮"感。
    // 第二轮标定：上一版(0.40-w*0.013)实测在屏怪平均 6.7 只 —— 密度对了，但**玩家第 1 波就死**。
    // 原因：第 1 波玩家只有 1 个技能，DPS≈0.8 只/秒，而刷怪 2.6 只/秒 -> 净积累 1.8 只/秒，
    //       18 秒攒 30+ 只，必死。
    // 现在按「**刷怪率略高于玩家 DPS**」标定：早期缓，随技能数增长而加速。
    // 第三轮标定（前两轮实测数据）：
    //   1.4只/秒 -> 在屏 2.6 只，玩家活（HP 84/120）
    //   2.6只/秒 -> 在屏 6.7 只，玩家**第 1 波就死**
    // 取中间：第 1 波约 2.0 只/秒（在屏 4~5 只），随技能数增长加速。
    // ★ 2026-10-29 难度曲线返工（docs/audits/gameplay_audit_and_proposal.md §8.2 候选 A）：
    //   旧参数 max(0.18, 0.53-0.022w) × min(5,1+floor(w/3)) 让生成率从 1.97/s 涨到 27.78/s（14 倍），
    //   且第 3/6/9/12 波是乘法台阶（+109% / +58% / +42% / +35%），中后期活怪无上限地堆积。
    //   新参数：峰值 ≈ 8.8/s（原 27.8），台阶幅度约 +33%，配合 Battle 里的活怪软/硬上限。
    interval: Math.max(balance().spawn.minInterval, balance().spawn.baseInterval - wave * balance().spawn.perWave),
    batch: Math.min(balance().spawn.batchMax, 1 + Math.floor(wave / balance().spawn.batchEvery)),
  };
}

export interface Vec2Like { x: number; y: number; }

/**
 * 在玩家周围的**屏幕外一圈**取刷新点。
 *
 * ⚠️ 半径必须由**真实可视尺寸**推导，不能写死。
 *    踩过的坑（KI-004）：写死 195~235 时，若相机把可视世界缩到 157x278
 *    （半对角线只有 159），怪就等于刷在 1.2~1.5 个屏幕之外 —— 走 2~5 秒才进画面，
 *    屏幕长时间是空的，完全没有"怪潮"感。
 *
 * 取 1.02~1.22 倍半对角线：刚好在画面外，几步就进来。
 */
export function spawnPointAround(
  rng: Rng, px: number, py: number, arenaW: number, arenaH: number,
  viewW: number, viewH: number,
): Vec2Like {
  // ⚠️ 必须沿**可视矩形的外扩边框**取点，不能沿圆取半径。
  //    踩过的坑：按半对角线(hypot(78,139)=159)取圆，横向刷出的怪离画面边缘
  //    有 159-78=81 世界单位，50px/s 要走 1.6 秒才露面 —— 用户反馈「怪都看不到」。
  //    沿矩形边框外扩，则**任何方向都是"刚出画面"**，0.4~1 秒就能走进来。
  const hw = viewW / 2, hh = viewH / 2;
  const a = rng.range(0, Math.PI * 2);
  const ca = Math.cos(a), sa = Math.sin(a);
  // 沿方向 a 到矩形边界的距离
  const tx = Math.abs(ca) < 1e-6 ? 1e9 : hw / Math.abs(ca);
  const ty = Math.abs(sa) < 1e-6 ? 1e9 : hh / Math.abs(sa);
  const r = Math.min(tx, ty) + rng.range(18, 55);   // 刚出边框一点
  return {
    x: Math.max(14, Math.min(arenaW - 14, px + ca * r)),
    y: Math.max(14, Math.min(arenaH - 14, py + sa * r)),
  };
}

/** 波次强度倍率：血量线性 +24%/波，伤害 +12%/波 */
export function waveScale(wave: number): { hp: number; dmg: number } {
  const g = Math.max(0, wave - 1);
  const b = balance().growth;
  return { hp: 1 + b.hpPerWave * g, dmg: 1 + b.dmgPerWave * g };
}

// ---------- 伤害 ----------
export interface DamageResult { dmg: number; crit: boolean; }

/**
 * 一次伤害结算。
 * 注：`base` 已经包含技能等级、行为模块、属性、标签加成（由 SkillCalc 算好），
 *     这里只负责**暴击**这一层随机 —— 保证暴击也走同一个 Rng，可复现。
 */
export function rollDamage(base: number, stats: CharStats, rng: Rng): DamageResult {
  // 阶段 E：暴击率上限 75%（永不 100%），暴击伤害上限 ×3.5
  const crit = rng.chance(Math.min(0.75, stats.crit));
  const dmg = Math.max(1, Math.round(base * (crit ? Math.min(3.5, stats.critdmg) : 1)));
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
