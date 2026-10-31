/**
 * 新技能的**特殊兼容规则**（skill_expansion_design.md §6，设计 v7 定稿）
 *
 * 为什么单独一个文件：这些是"技能 × 黑科技"的特殊边界，散在 Battle.ts 里既无法单测，
 * 也最容易和兼容矩阵脱节。这里只放**纯函数**，Battle 负责表现与实体。
 */
import { splitBullets, echoRepeats } from './ModuleScale';

/** 环刃：同时存在的刀刃硬上限（设计 §1：初始 2 片，每级 +1，上限 4） */
export const RING_BLADE_MAX = 4;

/**
 * 环刃片数 = min(4, 1 + 等级 + orbit 份数)
 * · 等级 1 → 2 片（设计"初始 2 片"）
 * · 每升 1 级 +1 片
 * · orbit × 环刃（S 规则）：额外 +1 片，但受 4 片上限约束
 */
export function ringBladeCount(level: number, orbitStacks: number): number {
  const lv = Math.max(1, Math.floor(level));
  const orb = Math.max(0, Math.floor(orbitStacks));
  return Math.min(RING_BLADE_MAX, 1 + lv + orb);
}

/** split × 地雷阵（S）：分裂地雷伤害系数 40% */
export const MINE_SPLIT_MUL = 0.4;

/** split × 地雷阵（S）：一次引爆产生的分裂弹数量（与子弹分裂同口径：2/3/4） */
export function mineSplitCount(splitStacks: number): number {
  return splitStacks > 0 ? splitBullets(splitStacks) : 0;
}

/**
 * echo × 地雷阵（S）：回声最多复制 1 次。
 * 复制出来的地雷自身 `echo = 0`，所以不会再次触发 echo。
 */
export function mineEchoRepeats(echoStacks: number): number {
  return echoStacks > 0 ? Math.min(1, echoRepeats(echoStacks)) : 0;
}

/**
 * echo × 蓄能脉冲（S）：重放**不重新蓄力**，直接按已蓄满数值结算一次。
 * 同样最多 1 次。
 */
export function chargeEchoRepeats(echoStacks: number): number {
  return echoStacks > 0 ? Math.min(1, echoRepeats(echoStacks)) : 0;
}

/** 蓄能脉冲的重放伤害系数（沿用复读机通用 60%） */
export const CHARGE_ECHO_MUL = 0.6;

/**
 * 哨兵开火计划：`multi`（count）决定每次几发，`fan` 决定额外散射几发。
 * 哨兵 0.9s 一发，基础弹速由 SENTRY_BULLET_SPEED 决定（哨兵技能本身 spd = 0）。
 */
export const SENTRY_BULLET_SPEED = 260;
export const SENTRY_FAN_DMG_MUL = 0.55;
export const SENTRY_FAN_SPREAD = 0.24;

export interface SentryShotPlan {
  /** 主弹数量（含 multi） */
  shots: number;
  /** 额外散射弹数量 */
  fanShots: number;
  speed: number;
}

export function sentryShotPlan(count: number, fan: number, snipeStacks = 0): SentryShotPlan {
  const snipeMul = Math.pow(1.4, Math.max(0, snipeStacks));
  return {
    shots: Math.max(1, Math.floor(count)),
    fanShots: Math.max(0, Math.floor(fan)) * 2,
    speed: SENTRY_BULLET_SPEED * snipeMul,
  };
}
