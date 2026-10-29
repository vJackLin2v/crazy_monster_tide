/**
 * 成就系统（纯逻辑，可在没有编辑器的环境单测）
 *
 * 只读 `SaveData` 里的累计数据；不参与战斗结算，不改任何玩法数值。
 * 解锁状态写回 `SaveData.ach`，由调用方落盘。
 */
import type { SaveData } from './Progress';

/** 成就依赖的累计字段（都是数字） */
export type AchMetric = 'runs' | 'wins' | 'kills' | 'bestWave' | 'bestLv' | 'bossKills' | 'merges';

export interface AchDef {
  id: string;
  name: string;
  desc: string;
  metric: AchMetric;
  target: number;
  /** 角色专属成就：必须用该角色通关（看 SaveData.charsWin） */
  charId?: string;
}

export const ACHIEVEMENTS: AchDef[] = [
  { id: 'first_run', name: '初次远征', desc: '完成第一局（无论胜负）', metric: 'runs', target: 1 },
  { id: 'kills_100', name: '百人斩', desc: '累计击杀 100 只怪物', metric: 'kills', target: 100 },
  { id: 'kills_1000', name: '千军辟易', desc: '累计击杀 1000 只怪物', metric: 'kills', target: 1000 },
  { id: 'wave_10', name: '深入怪潮', desc: '到达第 10 波', metric: 'bestWave', target: 10 },
  { id: 'wave_20', name: '抵达终点', desc: '到达第 20 波', metric: 'bestWave', target: 20 },
  { id: 'lv_10', name: '构建成型', desc: '单局达到 10 级', metric: 'bestLv', target: 10 },
  { id: 'boss_1', name: '屠龙者', desc: '击败 1 只 BOSS', metric: 'bossKills', target: 1 },
  { id: 'merge_1', name: '黑科技大师', desc: '合成 1 次强化模块（3 个同名 → II）', metric: 'merges', target: 1 },
  { id: 'win_1', name: '远征成功', desc: '通关一次（20 波全部清空）', metric: 'wins', target: 1 },
  // ★ 玩法审计 §8.7：每个角色一条专属目标，给复玩一个低成本理由
  { id: 'win_knight', name: '铁壁通关', desc: '用铁拳骑士通关一次', metric: 'wins', target: 1, charId: 'knight' },
  { id: 'win_mage', name: '奥术通关', desc: '用秘术学徒通关一次', metric: 'wins', target: 1, charId: 'mage' },
  { id: 'win_ranger', name: '游侠通关', desc: '用荒野游侠通关一次', metric: 'wins', target: 1, charId: 'ranger' },
  { id: 'win_monk', name: '苦行通关', desc: '用苦行僧通关一次', metric: 'wins', target: 1, charId: 'monk' },
  { id: 'win_summoner', name: '陨星通关', desc: '用陨星师通关一次', metric: 'wins', target: 1, charId: 'summoner' },
  { id: 'win_zealot', name: '狂信通关', desc: '用狂信者通关一次', metric: 'wins', target: 1, charId: 'zealot' },
];

export interface AchView { def: AchDef; cur: number; done: boolean }

/** 当前进度视图（按定义顺序） */
/** 某条成就是否已达成（角色专属看 charsWin，其余看累计数值） */
function reached(s: SaveData, def: AchDef): boolean {
  if (def.charId) return s.charsWin.includes(def.charId);
  return ((s[def.metric] as number) ?? 0) >= def.target;
}

export function achViews(s: SaveData): AchView[] {
  return ACHIEVEMENTS.map((def) => {
    const cur = def.charId
      ? (s.charsWin.includes(def.charId) ? def.target : 0)
      : Math.min(def.target, Math.max(0, Math.floor((s[def.metric] as number) ?? 0)));
    return { def, cur, done: s.ach.includes(def.id) };
  });
}

/** 根据累计数据算出**本次新解锁**的成就 id（不写盘） */
export function newlyUnlocked(s: SaveData): string[] {
  const out: string[] = [];
  for (const def of ACHIEVEMENTS) {
    if (s.ach.includes(def.id)) continue;
    if (reached(s, def)) out.push(def.id);
  }
  return out;
}

/** 把新解锁写进 SaveData.ach，返回是否有变化（调用方负责保存） */
export function applyUnlocks(s: SaveData): boolean {
  const add = newlyUnlocked(s);
  if (!add.length) return false;
  s.ach.push(...add);
  return true;
}

/** 已解锁数量（用于菜单/成就页标题） */
export function unlockedCount(s: SaveData): number {
  return ACHIEVEMENTS.filter(a => s.ach.includes(a.id)).length;
}
