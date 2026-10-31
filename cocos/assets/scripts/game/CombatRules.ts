/**
 * 战斗结算的可测试规则层（阶段3 审核 §7.1 的补强）
 *
 * 背景：Battle.ts 依赖 cc，纯 Node 单测跑不起来。上一轮审核指出"纯逻辑测试通过 ≠ 真实 Battle 链路正确"。
 * 处理方式：把**判定分支**（击杀是否能回血 / 是否能引爆 M1 / 是否能吸血）抽到这里，
 * 由 Battle 实际调用，单测覆盖同一份函数——这样测的是线上真用的逻辑，不是另写一套。
 *
 * ⚠️ 仍然不覆盖：实体生成、碰撞、动画与真实帧循环；那部分需要真机/浏览器运行时验证，
 *    交付报告里会明确标注，不拿类型检查冒充。
 */
import type { DamageSource, SummonKind } from './DamageContext';
// SummonKind 只用于 vampAllowed（击杀分支与召唤物种类无关）
import { canSourceHarvest, canSourceTriggerModules, canSourceVamp } from './DamageContext';

export interface KillOutcome {
  /** 是否计入总击杀数（召唤物击杀也计） */
  countKill: boolean;
  /** 是否允许触发击杀回血（harvest / 击杀回血属性） */
  harvestHeal: boolean;
  /** 是否允许触发 M1 溢出爆裂（module / summon 都不行） */
  killblast: boolean;
}

/** 击杀结算分支：Battle.killEnemy 与单测共用 */
export function killOutcome(src: DamageSource): KillOutcome {
  return {
    countKill: true,
    harvestHeal: canSourceHarvest(src),
    killblast: canSourceTriggerModules(src),
  };
}

/** 命中吸血分支：module 不允许；summon 只有哨兵（显式例外） */
export function vampAllowed(src: DamageSource, summonKind?: SummonKind): boolean {
  return canSourceVamp(src, summonKind);
}
