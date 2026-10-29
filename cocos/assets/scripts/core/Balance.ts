/**
 * 可配置数值表（Balance）—— 玩法调参的唯一入口
 *
 * 设计目标（用户 2026-10-29 要求「数据都改成可配置式」）：
 *   1. **不用重编译**就能改数：值写在 localStorage 的 `cmt_balance_v1`，启动时合并到默认值；
 *   2. 所有默认值仍然集中在一个文件里，改了立刻能在代码里搜到；
 *   3. 支持部分覆盖：只写想改的字段，其它走默认；
 *   4. 控制台可直接 `balanceOverride({ spawn: { batchMax: 4 } })` 立刻生效（下次进局）；
 *   5. `exportBalance()` / `importBalance(json)` 便于把一套调好的参数发给别人。
 *
 * ⚠️ 这个文件**只放数字与结构**，不放规则分支。规则仍写在 Combat / RunState / Battle 里。
 * ⚠️ 不要在这里写 "if 某角色" 之类的逻辑；角色差异走 Chars.ts。
 */

export interface Balance {
  /** 刷怪曲线：interval = clamp(minInterval, baseInterval - perWave * wave)，batch = clamp(1, 1 + floor(wave / batchEvery), batchMax) */
  spawn: {
    baseInterval: number; perWave: number; minInterval: number;
    batchEvery: number; batchMax: number;
    /** 开场铺怪：min(openMax, openBase + floor(wave / openEvery)) */
    openBase: number; openEvery: number; openMax: number;
    /** 同屏活怪：软上限（超过则间隔 ×slowMul）、硬上限（停刷） */
    aliveSoft: number; aliveHard: number; slowMul: number;
  };
  /** 敌人成长曲线（每波） */
  growth: { hpPerWave: number; dmgPerWave: number };
  /** 波次时长 */
  wave: { baseTime: number; timeStep: number; timeEvery: number };
  /** 升级三选一权重（按等级分档） */
  reward: {
    earlyMax: number; midMax: number;
    early: { skill: number; module: number; item: number; attr: number };
    mid: { skill: number; module: number; item: number; attr: number };
    late: { skill: number; module: number; item: number; attr: number };
  };
  /** 商店 */
  shop: {
    slots: number;
    itemBase: number; itemRand: number; itemPerWave: number;
    modBase: number; modRand: number; modPerWave: number;
    healBase: number; healPerWave: number;
    attrBase: number; attrPerWave: number;
    rerollBase: number;
    /** 波末结算金币：base + perWave * wave (+ bonus) */
    clearGoldBase: number; clearGoldPerWave: number;
  };
  /** 精英 / BOSS 的 AI 节奏（秒） */
  ai: {
    eliteChargeTele: number; eliteChargeDash: number; eliteChargeRec: number; eliteChargeCd: number;
    bossChargeTele: number; bossChargeDash: number; bossChargeRec: number; bossChargeCd: number;
    bossSlamTele: number; bossSlamRadius: number; bossSlamMul: number; bossSlamRec: number;
    bossFirstCd: number; eliteFirstCd: number; chargeSpeedMul: number;
  };
  /** 经验 / 拾取 */
  exp: { base: number; perLevel: number; waveEndMul: number };
  /** 落雷（thunder 模块）：触发概率固定 15%×份数，这里只配范围与伤害倍率 */
  thunder: { radius: number; mul: number };
}

export const DEFAULT_BALANCE: Balance = {
  spawn: {
    baseInterval: 0.62, perWave: 0.016, minInterval: 0.34,
    batchEvery: 4, batchMax: 3,
    openBase: 5, openEvery: 2, openMax: 12,
    aliveSoft: 40, aliveHard: 60, slowMul: 1.6,
  },
  growth: { hpPerWave: 0.18, dmgPerWave: 0.10 },
  wave: { baseTime: 18, timeStep: 3, timeEvery: 3 },
  reward: {
    earlyMax: 5, midMax: 12,
    early: { skill: 0.35, module: 0.25, item: 0.25, attr: 0.15 },
    mid: { skill: 0.20, module: 0.35, item: 0.25, attr: 0.20 },
    late: { skill: 0.15, module: 0.35, item: 0.30, attr: 0.20 },
  },
  shop: {
    slots: 4,
    itemBase: 12, itemRand: 6, itemPerWave: 2,
    modBase: 16, modRand: 7, modPerWave: 3,
    healBase: 8, healPerWave: 1,
    attrBase: 16, attrPerWave: 3,
    rerollBase: 2,
    clearGoldBase: 12, clearGoldPerWave: 5,
  },
  ai: {
    eliteChargeTele: 0.7, eliteChargeDash: 0.35, eliteChargeRec: 0.55, eliteChargeCd: 4.5,
    bossChargeTele: 0.7, bossChargeDash: 0.35, bossChargeRec: 0.55, bossChargeCd: 3.2,
    bossSlamTele: 0.9, bossSlamRadius: 70, bossSlamMul: 1.5, bossSlamRec: 0.5,
    bossFirstCd: 2.2, eliteFirstCd: 3.0, chargeSpeedMul: 2.2,
  },
  exp: { base: 5, perLevel: 3.2, waveEndMul: 0.5 },
  // ⚠️ 候选值（文档未规定）：半径 60、伤害 50%。已列入 docs/audits/non_ui_bug_audit.md 待负责人确认
  thunder: { radius: 60, mul: 0.5 },
};

const KEY = 'cmt_balance_v1';

/** 深合并（只覆盖对象里的已知键；数组/标量直接替换） */
function merge<T>(base: T, patch: unknown): T {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base;
  const out = { ...(base as Record<string, unknown>) };
  for (const k of Object.keys(base as Record<string, unknown>)) {
    const bv = (base as Record<string, unknown>)[k];
    const pv = (patch as Record<string, unknown>)[k];
    if (pv === undefined) continue;
    out[k] = (bv && typeof bv === 'object' && !Array.isArray(bv)) ? merge(bv, pv) : pv;
  }
  return out as T;
}

let current: Balance | null = null;

/** 当前生效的数值表（只读语义：调用方不要直接改它，用 override） */
export function balance(): Balance {
  if (current) return current;
  const base = JSON.parse(JSON.stringify(DEFAULT_BALANCE)) as Balance;
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(KEY);
      if (raw) current = merge(base, JSON.parse(raw));
    }
  } catch (e) {
    console.warn('[Balance] 读取覆盖失败，使用默认值', e);
  }
  current = current ?? base;
  return current;
}

/** 深层的"可选"类型：允许只写某个分组里的一个字段 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

/** 局部覆盖并持久化（控制台调参用）：balanceOverride({ spawn: { batchMax: 4 } }) */
export function balanceOverride(patch: DeepPartial<Balance>): Balance {
  const merged = merge(balance(), patch);
  current = merged;
  try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch (e) { console.warn('[Balance] 写入失败', e); }
  console.log('[Balance] 已覆盖：' + JSON.stringify(patch));
  return merged;
}

/** 清掉覆盖，回到代码里的默认值 */
export function balanceReset(): Balance {
  current = null;
  try { localStorage.removeItem(KEY); } catch { /* 忽略 */ }
  return balance();
}

/** 导出当前参数（JSON 字符串），便于贴给同事或存进文档 */
export function exportBalance(): string {
  return JSON.stringify(balance(), null, 2);
}

/** 从 JSON 导入（返回是否成功） */
export function importBalance(json: string): boolean {
  try {
    const obj = JSON.parse(json);
    return !!balanceOverride(obj);
  } catch (e) {
    console.warn('[Balance] 导入失败：JSON 解析错误', e);
    return false;
  }
}
