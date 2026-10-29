/**
 * 模块份数 → 具体数值（纯函数，可单测）
 *
 * 背景（用户 2026-10-29）：
 *   「装多个的时候可以增加数值啊，比如分裂炸 3 个 4 个、复读机增加再次释放次数、
 *     上火增加挂的秒数、冷静增加减速效果或者延长时间，设计好就行了」
 *
 * 这里就是"设计好的数字"，集中在一处，便于调参与测试。
 * 约定：n = 该模块在这个技能上的**份数**（普通 1 份，强化 _2 = 2 份）。
 * 所有函数对 n <= 0 返回基础值，避免调用方传 0 时出现负数。
 */

/** 分裂：命中后炸出的小子弹数量。1 份 2 枚 → 每多 1 份 +1 枚，封顶 6 枚 */
export function splitBullets(n: number): number {
  return Math.min(6, 2 + Math.max(0, n - 1));
}

/** 复读机：额外重放次数。1 份 1 次、2 份 2 次，封顶 3 次 */
export function echoRepeats(n: number): number {
  return Math.min(3, Math.max(0, n));
}

/** 复读机：第 i 次重放的延迟（秒），依次 0.4 / 0.8 / 1.2 */
export function echoDelay(i: number): number {
  return 0.4 * (i + 1);
}

/** 上火：灼烧持续时间（秒）。2 / 2.6 / 3.2 */
export function burnDuration(n: number): number {
  return 2 + 0.6 * Math.max(0, n - 1);
}

/** 上火：每跳伤害占本次命中伤害的比例。10% / 20% / 30% */
export function burnTickMul(n: number): number {
  return 0.10 * Math.max(1, n);
}

/** 冷静：减速比例。35% / 45% / 55%，封顶 60% */
export function frostSlowPct(n: number): number {
  return Math.min(0.60, 0.35 + 0.10 * Math.max(0, n - 1));
}

/** 冷静：减速持续时间（秒）。1.2 / 1.6 / 2.0 */
export function frostDuration(n: number): number {
  return 1.2 + 0.4 * Math.max(0, n - 1);
}
