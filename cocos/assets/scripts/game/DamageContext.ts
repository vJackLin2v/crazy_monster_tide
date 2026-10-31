/**
 * 伤害事件上下文（设计 v7 · damage_event_interface.md）
 *
 * 目的：把"这次伤害来自哪里 / 能不能触发黑科技 / 能不能回血"从调用方手里收回来，
 * 统一由入口按来源推导，模块只用 allowedSources 声明自己能接受哪些来源。
 *
 * v7 变更（2026-10-31 阶段3 收尾）：
 *   1. `canHarvest` / `canVamp` 变成**上下文字段**，由工厂统一推导；
 *   2. `canTriggerModules` 仍然只由来源推导，调用方参数类型里没有该字段；
 *   3. 哨兵的 vamp 例外改成**显式** `summonKind === 'sentry'` —— 其它召唤物不会误继承；
 *   4. 上下文对象冻结（Object.freeze），运行期也不允许改写派生权限。
 * 注意：这些字段是"派生权限"，不是"调用方选项"。要新增例外，必须改本文件并补测试。
 */
export type DamageSource = 'normal' | 'split' | 'echo' | 'chain' | 'module' | 'summon';

/** 召唤物种类：只有哨兵享受 vamp 例外（设计 v6 定稿） */
export type SummonKind = 'sentry';

export interface DamageContext {
  readonly source: DamageSource;
  /** 是否允许触发黑科技（由来源推导，调用方不得自由填写） */
  readonly canTriggerModules: boolean;
  /** 是否允许击杀回血（harvest）：召唤物击杀一律 false */
  readonly canHarvest: boolean;
  /** 是否允许吸血（vamp）：module 否；summon 只有哨兵是 */
  readonly canVamp: boolean;
  /** 原始施法 id：同一次施法产生的所有弹体共享 */
  readonly castId: string;
  /** 弹体 id：用于"同一弹体同一次返程只触发一次" */
  readonly projectileId?: string;
  /** 返程序号：同一弹体第几次返程 */
  readonly returnIndex?: number;
  /** 目标是否 BOSS（处决等模块据此分支） */
  readonly isBoss: boolean;
  /** 召唤物种类（仅 source === 'summon' 时有意义） */
  readonly summonKind?: SummonKind;
}

/** 调用方**唯一允许**传的附加字段（刻意不包含三个 can* 派生字段） */
export interface DamageContextInput {
  projectileId?: string;
  returnIndex?: number;
  isBoss?: boolean;
  summonKind?: SummonKind;
}

/** 来源 → 能否触发模块（module / summon 一律不能） */
export function canSourceTriggerModules(src: DamageSource): boolean {
  return src !== 'module' && src !== 'summon';
}

/** 来源 → 能否击杀回血：召唤物击杀不算玩家击杀（即使计入总击杀数） */
export function canSourceHarvest(src: DamageSource): boolean {
  return src !== 'summon';
}

/** 来源 → 能否吸血：module 不行；summon 只有哨兵是显式例外 */
export function canSourceVamp(src: DamageSource, summonKind?: SummonKind): boolean {
  if (src === 'module') return false;
  if (src === 'summon') return summonKind === 'sentry';
  return true;
}

let castSeq = 0;
/** 生成新的施法 id（每次玩家主动施放一次；复读重放也算一次独立施法） */
export function nextCastId(): string {
  castSeq += 1;
  return 'c' + castSeq;
}
/** 测试用：重置计数器 */
export function resetCastSeq(): void { castSeq = 0; }

/**
 * 统一工厂：三个派生权限只在这里计算。
 * 注意参数类型 `DamageContextInput` 不含 canTriggerModules / canHarvest / canVamp，
 * 调用方即使传了也会被忽略（并冻结对象，防止事后改写）。
 */
export function makeDamageContext(
  source: DamageSource,
  castId: string,
  extra?: DamageContextInput,
): DamageContext {
  return Object.freeze({
    source,
    canTriggerModules: canSourceTriggerModules(source),
    canHarvest: canSourceHarvest(source),
    canVamp: canSourceVamp(source, extra?.summonKind),
    castId,
    projectileId: extra?.projectileId,
    returnIndex: extra?.returnIndex,
    isBoss: !!extra?.isBoss,
    summonKind: extra?.summonKind,
  });
}

/** 击杀回血（harvest）：召唤物击杀不算玩家击杀，直接跳过 */
export function canHarvest(ctx: DamageContext): boolean {
  return ctx.canHarvest;
}

/** 吸血（vamp）：module 伤害不能再触发模块，但哨兵是明确的例外（v6 定稿） */
export function canVamp(ctx: DamageContext): boolean {
  return ctx.canVamp;
}

/** 模块在数据里声明的触发条件 */
export interface ModuleGate {
  id: string;
  allowedSources: DamageSource[];
  /** 模块级冷却（秒），可选 */
  cooldownSec?: number;
  /** 同一次施法最多触发几次，可选 */
  maxPerCast?: number;
}

interface Usage { lastAt: number; counts: Record<string, number> }

/**
 * 统一触发闸门：来源 → 允许来源 → 冷却 → 单次施法上限。
 * 所有模块都走这里，不在 Battle 里各写一套 if。
 */
export class ModuleUsage {
  private used = new Map<string, Usage>();

  private get(id: string): Usage {
    let u = this.used.get(id);
    if (!u) { u = { lastAt: -1e9, counts: {} }; this.used.set(id, u); }
    return u;
  }

  canTrigger(ctx: DamageContext, gate: ModuleGate, now: number): boolean {
    if (!ctx.canTriggerModules) return false;
    if (!gate.allowedSources.includes(ctx.source)) return false;
    const u = this.get(gate.id);
    if (gate.cooldownSec !== undefined && now - u.lastAt < gate.cooldownSec) return false;
    if (gate.maxPerCast !== undefined && (u.counts[ctx.castId] ?? 0) >= gate.maxPerCast) return false;
    return true;
  }

  /** 触发成功后记录一次 */
  mark(ctx: DamageContext, gate: ModuleGate, now: number): void {
    const u = this.get(gate.id);
    u.lastAt = now;
    u.counts[ctx.castId] = (u.counts[ctx.castId] ?? 0) + 1;
  }

  /** 换局/清场时重置 */
  reset(): void { this.used.clear(); }
}
