/**
 * 存档数据形状（**纯数据，不 import cc**）
 *
 * 单测要在没有 Cocos 的环境里跑，所以把「数据结构 + 默认值」和「localStorage 读写」拆开：
 *   · 本文件：类型与默认值（可被 tsconfig.check / tests 引入）
 *   · `Save.ts`：真正的读写（依赖 cc 的 sys.localStorage）
 */

export interface SaveData {
  /** 音乐（BGM）开关 */
  music: boolean;
  /** 音效开关 */
  sfx: boolean;
  /** 累计对局数（每次结算 +1） */
  runs: number;
  /** 通关次数（20 波全清） */
  wins: number;
  /** 累计击杀 */
  kills: number;
  /** 最高到达波次 */
  bestWave: number;
  /** 最高等级 */
  bestLv: number;
  /** 击败 BOSS 次数 */
  bossKills: number;
  /** 黑科技合成次数（3 同名 → II） */
  merges: number;
  /** 已解锁成就 id */
  ach: string[];
  /** 通关过的角色 id（角色专属成就用） */
  charsWin: string[];
}

export function defaultSave(): SaveData {
  return {
    music: true, sfx: true,
    runs: 0, wins: 0, kills: 0, bestWave: 0, bestLv: 0, bossKills: 0, merges: 0,
    ach: [],
    charsWin: [],
  };
}
