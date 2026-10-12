import { BASE_SPEED, BASE_PICKUP } from '../core/Const';
import type { CharDef, CharStats } from '../data/Types';

/** 空属性表（所有字段显式初始化，避免 undefined 参与运算产生 NaN） */
export function emptyStats(): CharStats {
  return {
    power: 1, haste: 1, area: 1, maxhp: 100, speed: BASE_SPEED,
    crit: 0.05, critdmg: 1.5, pickup: BASE_PICKUP, armor: 0, regen: 0,
    projSpd: 1, greed: 0, tagAll: 0,
    tagBonus: {}, tagCdr: {}, hp: 100,
  };
}

/**
 * 由角色生成初始属性。
 *
 * ⚠️ 铁律：角色的 `speedMul` / `pickupMul` 是**倍率**，必须乘在基础值上，
 *    不能把倍率直接当成绝对值写进 speed/pickup。
 *    原型里曾因此把移速覆盖成 0.9 px/s，角色几乎不能动（decisions.md D-13）。
 */
export function freshStats(char: CharDef): CharStats {
  const s = emptyStats();
  const cs = char.stats ?? {};

  s.speed = BASE_SPEED * (cs.speedMul ?? 1);
  s.pickup = BASE_PICKUP * (cs.pickupMul ?? 1);

  for (const k of Object.keys(cs) as (keyof typeof cs)[]) {
    if (k === 'speedMul' || k === 'pickupMul') continue;
    (s as unknown as Record<string, unknown>)[k] = cs[k];
  }
  s.hp = s.maxhp;
  return s;
}

/** 校验：角色的倍率字段没有被误当成绝对值（开发期断言，发布可关） */
export function assertStatsSane(s: CharStats): string[] {
  const errs: string[] = [];
  if (s.speed < 20) errs.push(`移速异常偏低：${s.speed} px/s（疑似把倍率当绝对值，见 D-13）`);
  if (s.maxhp <= 0) errs.push(`生命上限非法：${s.maxhp}`);
  if (s.pickup < 10) errs.push(`拾取半径异常偏低：${s.pickup}`);
  return errs;
}
