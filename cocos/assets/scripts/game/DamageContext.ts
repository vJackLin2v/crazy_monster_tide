/**
 * 伤害事件上下文（设计 v6 · damage_event_interface.md）
 *
 * 目的：把"这次伤害来自哪里 / 能不能触发黑科技"从调用方手里收回来，
 * 统一由入口按来源推导，模块只用 allowedSources 声明自己能接受哪些来源。
 */
export type DamageSource = 'normal' | 'split' | 'echo' | 'chain' | 'module' | 'summon';

export interface DamageContext {
  source: DamageSource;
  /** 是否允许触发黑科技（由来源推导，调用方不得自由填写） */
  canTriggerModules: boolean;
  /** 原始施法 id：同一次施法产生的所有弹体共享 */
  castId: string;
  /** 弹体 id：用于"同一弹体同一次返程只触发一次" */
  projectileId?: string;
  /** 返程序号：同一弹体第几次返程 */
  returnIndex?: number;
  /** 目标是否 BOSS（处决等模块据此分支） */
  isBoss: boolean;
}

/** 来源 → 能否触发模块（module / summon 一律不能） */
export function canSourceTriggerModules(src: DamageSource): boolean {
  return src !== 'module' && src !== 'summon';
}

/** 击杀回血（harvest）：召唤物击杀不算玩家击杀，直接跳过 */
export function canHarvest(ctx: DamageContext): boolean {
  return ctx.source !== 'summon';
}

/** 吸血（vamp）：module 伤害不能再触发模块，但 summon 是明确的例外（v6 定稿） */
export function canVamp(ctx: DamageContext): boolean {
  return ctx.source === 'summon' ? true : ctx.canTriggerModules;
}

let castSeq = 0;
/** 生成新的施法 id（每次玩家主动施放一次） */
export function nextCastId(): string {
  castSeq += 1;
  return 'c' + castSeq;
}
/** 测试用：重置计数器 */
export function resetCastSeq(): void { castSeq = 0; }

/**
 * 构造上下文。注意：**调用方不能传 canTriggerModules**，
 * 只能给 source / castId / projectileId / returnIndex / isBoss。
 */
export function makeDamageContext(
  source: DamageSource,
  castId: string,
  extra?: { projectileId?: string; returnIndex?: number; isBoss?: boolean },
): DamageContext {
  return {
    source,
    canTriggerModules: canSourceTriggerModules(source),
    castId,
    projectileId: extra?.projectileId,
    returnIndex: extra?.returnIndex,
    isBoss: !!extra?.isBoss,
  };
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
