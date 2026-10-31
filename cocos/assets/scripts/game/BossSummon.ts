/**
 * 噩梦 BOSS 召唤状态机（设计 v6 · difficulty_system_design.md §8）
 *
 * 纯逻辑，便于单测：调用方每帧喂 hpPct / now / 当前存活召唤物数量，
 * 返回"现在应该召唤几只"（0 = 不召唤）。
 */
export interface BossSummonConfig {
  thresholds: number[];      // [70, 35]
  count: number;             // 每个波次最多 3 只
  maxAlive: number;          // 同时最多 6 只
  minIntervalSec: number;    // 两次实际召唤完成至少 12s
  warnSec: number;           // 预警 1.2s
}

export class BossSummonState {
  private fired: boolean[] = [];
  private warningActive = false;
  private warningEndAt = 0;
  private lastSummonCompletedAt = -Infinity;
  private pendingWaves = 0;
  private dead = false;

  constructor(private cfg: BossSummonConfig) {
    this.fired = cfg.thresholds.map(() => false);
  }

  /** BOSS 死亡：取消所有未执行请求 */
  onBossDead(): void {
    this.dead = true;
    this.warningActive = false;
    this.pendingWaves = 0;
  }

  get pending(): number { return this.pendingWaves; }
  get isWarning(): boolean { return this.warningActive; }

  /**
   * 每帧调用。
   * @returns 本帧要召唤的数量（0 表示不召唤）
   */
  update(hpPct: number, now: number, aliveSummons: number): number {
    if (this.dead) return 0;

    // 1) 阈值 → 提交请求（每个阈值只提交一次）
    for (let i = 0; i < this.cfg.thresholds.length; i++) {
      if (!this.fired[i] && hpPct <= this.cfg.thresholds[i]) {
        this.fired[i] = true;
        this.pendingWaves += 1;
      }
    }

    // 2) 预警阶段：到点就结算
    if (this.warningActive) {
      if (now < this.warningEndAt) return 0;
      this.warningActive = false;
      const slots = Math.max(0, this.cfg.maxAlive - aliveSummons);
      const n = Math.min(this.cfg.count, slots);
      this.lastSummonCompletedAt = now;
      this.pendingWaves = Math.max(0, this.pendingWaves - 1);
      return n;   // 空位为 0 时 n = 0，但请求已完成，不会永久挂起
    }

    // 3) 有请求 + 冷却结束 + 没有其他预警 → 起预警
    if (this.pendingWaves > 0 && now - this.lastSummonCompletedAt >= this.cfg.minIntervalSec) {
      this.warningActive = true;
      this.warningEndAt = now + this.cfg.warnSec;
    }
    return 0;
  }
}
