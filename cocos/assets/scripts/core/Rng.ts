/**
 * 可复现随机 —— 全游戏唯一的随机器
 *
 * 规则（docs/testing/seed_and_harness.md）：
 *  1. 所有随机（奖励 / 刷怪 / 地图 / 暴击）都从 RunSeed 派生，禁止直接调用 Math.random()
 *  2. 同 seed 必须得到逐位一致的结果（回归测试靠它比对）
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** mulberry32：小、快、够用；同 seed 序列完全可复现 */
  next(): number {
    let a = this.s;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    this.s = a;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number { return min + this.next() * (max - min); }
  int(min: number, max: number): number { return Math.floor(min + this.next() * (max - min + 1)); }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p: number): boolean { return this.next() < p; }
  /** 洗牌（返回新数组，不改原数组） */
  shuffled<T>(arr: readonly T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** 派生子随机源：同一父 seed + 不同标签 → 稳定的独立序列 */
  derive(tag: number): Rng { return new Rng((this.s ^ Math.imul(tag, 0x9E3779B1)) >>> 0); }

  /** 当前内部状态（用于"继续游戏"精确续接随机序列） */
  snapshot(): number { return this.s >>> 0; }

  /** 恢复内部状态；非法值回落到种子 */
  restore(state: number, fallbackSeed = 1): void {
    this.s = (isFinite(state) ? state : fallbackSeed) >>> 0;
  }
}
