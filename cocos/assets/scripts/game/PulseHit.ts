/**
 * pulse 技能扩散命中（纯逻辑，Battle 与单测共用）
 *
 * 设计口径（保持原技能设计）：
 *  - 以施放点为中心，半径从 0 扩散到 maxR；
 *  - 每个敌人只在波前到达自身时命中一次；
 *  - 不超出 maxR（命中判定使用敌人自身的碰撞半径，沿用原有 < r + e.r）；
 *  - 生命周期结束后做一次 maxR 收尾扫描，防止帧步进漏掉边缘目标。
 */
export interface PulseBody {
  x: number; y: number; r: number; dead?: boolean;
}

export interface PulseWave<T extends PulseBody> {
  x: number; y: number; maxR: number; life: number; t: number; r: number;
  hit: Set<T>;
}

/** 收集当前半径内尚未命中的目标（会写入 hit 去重） */
export function collectPulseHits<T extends PulseBody>(
  x: number, y: number, radius: number, enemies: T[], hit: Set<T>,
): T[] {
  const out: T[] = [];
  for (const e of enemies) {
    if (e.dead || hit.has(e)) continue;
    if (Math.hypot(e.x - x, e.y - y) < radius + e.r) {
      hit.add(e);
      out.push(e);
    }
  }
  return out;
}

/** 推进一帧；返回本帧新命中的目标与是否到期 */
export function stepPulse<T extends PulseBody>(
  w: PulseWave<T>, dt: number, enemies: T[],
): { hits: T[]; expired: boolean } {
  w.t += dt;
  w.r = w.maxR * Math.min(1, w.t / w.life);
  const hits = collectPulseHits(w.x, w.y, w.r, enemies, w.hit);
  const expired = w.t >= w.life;
  if (expired) {
    // 生命结束的收尾：按 maxR 再扫一次；hit 已去重，不会重复命中
    const rest = collectPulseHits(w.x, w.y, w.maxR, enemies, w.hit);
    for (const e of rest) hits.push(e);
  }
  return { hits, expired };
}
