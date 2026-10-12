import { MODULES } from '../data/Modules';
import { SKILLS } from '../data/Skills';
import type { CharStats, SkillDef, Tag } from '../data/Types';

/** 运行时技能实例：等级 + 已安装的行为模块（最多 3 个，允许重复） */
export interface SkillInst {
  id: string;
  lvl: number;
  mods: string[];   // 长度 0~3；同一个模块可出现多次（按 MODULES[id].max 限制上限）
}

export const MAX_SKILLS = 4;
export const MAX_SLOTS = 3;

export function makeSkill(id: string): SkillInst {
  return { id, lvl: 1, mods: [] };
}

/** 某模块在该技能上装了几个 */
export function modCount(sk: SkillInst, mid: string): number {
  let n = 0;
  for (const m of sk.mods) if (m === mid) n++;
  return n;
}

/** 兼容性判定：技能标签与模块 requires 有交集即兼容（docs/systems/tags.md） */
export function isCompatible(skillId: string, mid: string): boolean {
  const b = SKILLS[skillId], m = MODULES[mid];
  if (!b || !m) return false;
  return m.requires.some(t => (b.tags as Tag[]).includes(t));
}

/** 还能不能往这个技能上装这个模块（兼容 + 槽位 + 叠加上限） */
export function canInstall(sk: SkillInst, mid: string): { ok: boolean; why: string } {
  const m = MODULES[mid];
  if (!m) return { ok: false, why: '模块不存在' };
  if (!isCompatible(sk.id, mid)) return { ok: false, why: '不兼容' };
  if (modCount(sk, mid) >= m.max) return { ok: false, why: '已满级' };
  if (sk.mods.length >= MAX_SLOTS) return { ok: false, why: '需替换槽位' };
  return { ok: true, why: '' };
}

/** calcSkill 的产物：技能在「当前属性 + 已装模块」下的实际参数 */
export interface SkillRuntime {
  cd: number; dmg: number; spd: number; size: number;
  count: number; fan: number; pierce: number; bounce: number;
  orbit: number; split: number; chain: number;
  echo: number; burn: number; slow: number; vamp: number;
  thunder: number; thornmail: number; harvest: boolean;
}

/**
 * 核心：把「技能基础 + 等级 + 行为模块 + 角色属性」算成一次施放的实际参数。
 *
 * 叠加规则（docs/systems/behavior_modules.md）：
 *  - additive：直接线性累加（多装一个 = 多一份效果）
 *  - tier：乘区叠加（0.88^N / 1.15^N 之类）
 *  - unique / exclusive：上限 1
 * 不得在这里偷偷改规则；要改先改文档。
 */
export function calcSkill(sk: SkillInst, stats: CharStats): SkillRuntime {
  const b: SkillDef = SKILLS[sk.id];
  if (!b) throw new Error(`未知技能：${sk.id}`);

  // 基础值随技能等级成长
  let cd = b.cd * Math.pow(0.94, sk.lvl - 1);
  let dmg = b.dmg * (1 + 0.22 * (sk.lvl - 1));

  let count = 1, fan = 0, pierce = 0, bounce = 0, orbit = 0, split = 0;
  let sizeMul = 1, echo = 0, burn = 0, slow = 0, vamp = 0, rapid = 0;
  let chain = 0, snipe = 0, overload = 0, harvest = 0, thunder = 0, thornmail = 0;

  for (const mid of sk.mods) {
    switch (mid) {
      case 'multi':     count++; break;
      case 'fan':       fan++; break;
      case 'split':     split++; break;
      case 'bounce':    bounce++; break;
      case 'pierce':    pierce++; break;
      case 'orbit':     orbit++; break;
      case 'giant':     sizeMul *= 1.30; break;
      case 'rapid':     rapid++; break;
      case 'echo':      echo++; break;
      case 'burn':      burn++; break;
      case 'frost':     slow++; break;
      case 'vamp':      vamp++; break;
      case 'chain':     chain++; break;
      case 'snipe':     snipe++; break;
      case 'harvest':   harvest++; break;
      case 'thunder':   thunder++; break;
      case 'thornmail': thornmail++; break;
      case 'overload':  overload++; break;
    }
  }

  cd *= Math.pow(0.88, rapid);                    // 急速：乘区

  // 标签冷却减免（来自道具）
  for (const t of b.tags) {
    const v = stats.tagCdr[t];
    if (v) cd *= (1 - v);
  }
  cd = cd / stats.haste;                          // 攻速属性
  cd = Math.max(0.12, cd);                        // 冷却下限，防止 Build 失控

  // 伤害：角色攻击力 x 标签加成 x 全局标签加成
  let tagMul = 1;
  for (const t of b.tags) {
    const v = stats.tagBonus[t];
    if (v) tagMul *= (1 + v);
  }
  if (stats.tagAll) tagMul *= (1 + stats.tagAll);
  dmg *= stats.power * tagMul;

  if (snipe)    dmg *= Math.pow(1.15, snipe);
  if (overload) { dmg *= Math.pow(1.25, overload); sizeMul *= Math.pow(0.90, overload); }

  return {
    cd,
    dmg,
    spd: b.spd * (stats.projSpd ?? 1) * (snipe ? Math.pow(1.4, snipe) : 1),
    size: b.size * sizeMul * (0.9 + 0.1 * stats.area) * stats.area,
    count, fan, pierce, bounce, orbit, split, chain,
    echo, burn, slow, vamp, thunder, thornmail,
    harvest: harvest > 0,
  };
}
