/**
 * 续玩恢复的数值规范化（纯函数，Battle.resumeRun 与单测共用）
 *
 * 背景：上一轮外部审查看到"主菜单 45/72 → 战斗 72/72"，怀疑恢复把当前生命覆盖成满血。
 * 实际排查：代码恢复的是存档 hp，72/72 是**截图脚本为防死手动补满**造成的假象。
 * 为了让这类问题以后有硬证据，这里把"生命/最大生命"的恢复规则集中成可测函数：
 *   · maxhp 至少 1；
 *   · hp 必须落在 [1, maxhp]；
 *   · hp 非法（0/负数/NaN/超过上限）→ 安全修复并返回 issue，调用方可以决定提示。
 */
import type { CharStats } from '../data/Types';

export interface StatRepair {
  stats: CharStats;
  issues: string[];
}

export function normalizeRestoredStats(input: CharStats): StatRepair {
  const stats: CharStats = { ...input };
  const issues: string[] = [];
  const maxhpRaw = Number(stats.maxhp);
  stats.maxhp = Number.isFinite(maxhpRaw) ? Math.max(1, Math.round(maxhpRaw)) : 1;
  if (!Number.isFinite(maxhpRaw) || maxhpRaw < 1) issues.push('最大生命非法，已修为 1');

  const hpRaw = Number(stats.hp);
  if (!Number.isFinite(hpRaw)) {
    stats.hp = stats.maxhp;
    issues.push('当前生命非法，已回满');
  } else if (hpRaw <= 0) {
    stats.hp = 1;
    issues.push('当前生命 ≤ 0，已修为 1');
  } else if (hpRaw > stats.maxhp) {
    stats.hp = stats.maxhp;
    issues.push('当前生命超过上限，已夹到上限');
  } else {
    stats.hp = hpRaw;
  }
  // 其它属性只做 NaN 防护，不改变数值
  for (const k of Object.keys(stats) as (keyof CharStats)[]) {
    const v = stats[k];
    if (typeof v === 'number' && !Number.isFinite(v)) (stats as unknown as Record<string, number>)[k as string] = 0;
  }
  return { stats, issues };
}

/** 恢复前后对比（浏览器/日志用）：只列关键字段，避免刷屏 */
export function summarizeRestore(saveHp: number, saveMax: number, gotHp: number, gotMax: number): string {
  return 'hp=' + gotHp + '/' + gotMax + ' (存档 ' + Math.round(saveHp) + '/' + Math.round(saveMax) + ')';
}
