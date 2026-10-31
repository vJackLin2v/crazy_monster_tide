
/** 四个新技能的黑科技白名单（设计 v6 兼容矩阵落地的第一版） */
export const NEW_SKILL_ALLOW: Record<string, string[]> = {
  // 与 skill_expansion_design.md §五 矩阵逐格一致（2026-10-31 对齐）：
  // 矩阵里是 N 的组合**这里也必须没有**，否则会出现"装得上但没效果"。
  // 说明：thunder/chain 这类"弹体触发"的模块，对环刃/地雷阵/蓄能脉冲（无弹体）没有效果，
  // 因此矩阵与白名单都标 N —— 宁可不给装，也不给"装上去看不出来"的假选项。
  ring_blade: ['orbit', 'giant', 'rapid', 'burn', 'frost', 'vamp', 'harvest', 'thornmail'],
  mine_field: ['giant', 'rapid', 'burn', 'frost', 'vamp', 'harvest', 'thornmail', 'split', 'echo', 'overload'],
  sentry: ['multi', 'fan', 'split', 'bounce', 'pierce', 'rapid', 'burn', 'frost', 'chain', 'snipe', 'harvest', 'thunder', 'vamp'],
  charge_pulse: ['giant', 'burn', 'frost', 'vamp', 'harvest', 'overload', 'echo'],
};

import { moduleDef, baseOf, modPower, modEffect } from '../data/Modules';
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

/** 某模块在该技能上"值几份"（强化模块 = 2 份；用于叠加上限判定） */
export function modCount(sk: SkillInst, mid: string): number {
  const base = baseOf(mid);
  let n = 0;
  for (const m of sk.mods) if (baseOf(m) === base) n += modPower(m);
  return n;
}

/** 兼容性判定：技能标签与模块 requires 有交集即兼容（docs/systems/tags.md） */
export function isCompatible(skillId: string, mid: string): boolean {
  const b = SKILLS[skillId], m = moduleDef(mid);
  if (!b || !m) return false;
  // requires 为空 = 命中触发/受击触发类，任何能造成伤害的技能都可以装（设计 v7 修订）
  if (!m.requires || m.requires.length === 0) return true;
  return m.requires.some(t => (b.tags as Tag[]).includes(t));
}

/** 还能不能往这个技能上装这个模块（兼容 + 槽位 + 叠加上限） */
export function canInstall(sk: SkillInst, mid: string): { ok: boolean; why: string } {
  const m = moduleDef(mid);
  if (!m) return { ok: false, why: '模块不存在' };
  // 新技能：先过白名单（无效的黑科技直接拒绝并说明原因，而不是装上没效果）
  const allow = NEW_SKILL_ALLOW[sk.id];
  if (allow) {
    // 新技能走白名单；命中后不再查旧的标签兼容表
    if (allow.indexOf(mid.replace(/_(\d+)$/, '')) < 0) return { ok: false, why: '该黑科技对这类技能无效' };
  } else if (!isCompatible(sk.id, mid)) {
    return { ok: false, why: '不兼容' };
  }
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
  thunder: number; thornmail: number; harvest: number;   // 效果份数（0 = 没装）
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
export function calcSkill(sk: SkillInst, stats: CharStats, atkMul = 1): SkillRuntime {
  const b: SkillDef = SKILLS[sk.id];
  if (!b) throw new Error(`未知技能：${sk.id}`);

  // 基础值随技能等级成长
  let cd = b.cd * Math.pow(0.94, sk.lvl - 1);
  const baseCd = cd;                      // 上限计算基准（第三轮批准：总冷却不得低于基础的 35%）
  let dmg = b.dmg * (1 + 0.22 * (sk.lvl - 1));

  let count = 1, fan = 0, pierce = 0, bounce = 0, orbit = 0, split = 0;
  let sizeMul = 1, echo = 0, burn = 0, slow = 0, vamp = 0, rapid = 0;
  let chain = 0, snipe = 0, overload = 0, harvest = 0, thunder = 0, thornmail = 0;

  for (const mid of sk.mods) {
    // 强化模块（`multi_2`）= 2 份效果，占 1 槽（M32 合成规则）
    const n = modPower(mid);      // 整数型（子弹/跳数）用"份数"
    const e = modEffect(mid);     // 数值型（倍率/概率/DoT）用"效果份数"：Ⅱ = 1.6 而不是 2
    switch (baseOf(mid)) {
      case 'multi':     count += n; break;
      case 'fan':       fan += n; break;
      case 'split':     split += n; break;
      case 'bounce':    bounce += n; break;
      case 'pierce':    pierce += n; break;
      case 'orbit':     orbit += n; break;
      // —— 数值型：按"效果份数" e 累加，合成后收益递减 ——
      case 'giant':     sizeMul *= Math.pow(1.30, e); break;
      case 'rapid':     rapid += e; break;
      case 'echo':      echo += e; break;
      case 'burn':      burn += e; break;
      case 'frost':     slow += e; break;
      case 'vamp':      vamp += e; break;
      case 'snipe':     snipe += e; break;
      case 'harvest':   harvest += e; break;
      case 'thunder':   thunder += e; break;
      case 'thornmail': thornmail += e; break;
      case 'overload':  overload += e; break;
      // —— 整数型：只能整份（3 份 → 合成 2 份，本身就是递减）——
      case 'chain':     chain += n; break;
    }
  }

  // 急速：乘区。秘术学徒的「黑科技冷却效果 +25%」= 每份急速的减免幅度 ×1.25
  // （0.88 的"效果"是 -12%，×1.25 → -15% → 单份系数 0.85）
  const rapidPer = stats.modCdrMul ? Math.pow(0.88, stats.modCdrMul) : 0.88;
  cd *= Math.pow(rapidPer, rapid);

  // 标签冷却减免（来自道具）
  for (const t of b.tags) {
    const v = stats.tagCdr[t];
    if (v) cd *= (1 - v);
  }
  // ★ 第三轮批准（2026-10-21）：攻速与冷却缩减**都缩短技能 cd**，原来双双无上限，
  //   实测 12/12 叠加把火球从 0.85s 压到 0.23s（3.7 倍频率）。现在加两道闸：
  //   ① 攻速最多 +120%（haste ≤ 2.2）；② 冷却缩减封顶 50%；
  //   ③ 总冷却不得低于基础 cd 的 35%（另一道绝对下限 0.12s）。
  const hasteEff = Math.max(1, Math.min(2.2, stats.haste));
  cd = cd / hasteEff;                             // 攻速属性
  cd *= (1 - Math.min(0.5, stats.cdr ?? 0));      // 冷却缩减属性（封顶 50%）
  cd = Math.max(0.12, baseCd * 0.35, cd);         // 总冷却下限

  // 伤害：角色攻击力 x 标签加成 x 全局标签加成
  let tagMul = 1;
  for (const t of b.tags) {
    const v = stats.tagBonus[t];
    if (v) tagMul *= (1 + v);
  }
  if (stats.tagAll) tagMul *= (1 + stats.tagAll);
  // ★ 第三轮阶段 E（用户批准）：线性无上限属性加**硬上限**，避免后期数值失控。
  //   上限值经过"1/3/5/8 次叠加"曲线核对：8 次攻击力 = +64%，上限 +200% 留足成长空间。
  const capMul = (v: number, max: number) => Math.max(0.1, Math.min(max, v));
  dmg *= capMul(stats.power, 3.0) * tagMul;

  // ★ 范围伤害属性：只加成 area / pulse 类技能（M44 替换掉"召唤强化"）
  if ((b.tags as string[]).includes('area') || (b.tags as string[]).includes('pulse')) {
    dmg *= (1 + Math.min(1.0, stats.aoeDmg ?? 0));      // 范围伤害加成上限 +100%
  }
  if (snipe)    dmg *= Math.pow(1.15, snipe);
  if (overload) { dmg *= Math.pow(1.25, overload); sizeMul *= Math.pow(0.90, overload); }

  // ★ 属性追加在模块之后（属性是全局被动，模块是技能专属）
  //   全部设上限，避免"多重/穿透"叠到失控
  count = Math.min(5, count + Math.min(3, stats.count ?? 0));
  pierce = Math.min(6, pierce + Math.min(4, stats.pierce ?? 0));
  bounce = Math.min(5, bounce + Math.min(3, stats.bounce ?? 0));

  // 角色临时强化（铁拳骑士：受击后 2s 攻击力 +20%），由 Battle 在施放时传入
  if (atkMul !== 1) dmg *= atkMul;

  return {
    cd,
    dmg,
    spd: b.spd * (stats.projSpd ?? 1) * (snipe ? Math.pow(1.4, snipe) : 1),
    // 范围属性上限 ×2.2（+120%）：继续堆只会变难看，不会更强
  size: b.size * sizeMul * (0.9 + 0.1 * Math.min(2.2, stats.area)) * Math.min(2.2, stats.area) * (stats.sizeMul ?? 1),
    count, fan, pierce, bounce, orbit, split, chain,
    echo, burn, slow, vamp, thunder, thornmail,
    harvest,
  };
}
