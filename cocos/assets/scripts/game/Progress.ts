import type { DifficultyId } from '../data/Difficulties';
import { DIFFICULTY_IDS } from '../data/Difficulties';
/**
 * 存档数据形状（**纯数据，不 import cc**）
 *
 * 单测要在没有 Cocos 的环境里跑，所以把「数据结构 + 默认值 + 解析/迁移」和「localStorage 读写」拆开：
 *   · 本文件：类型、默认值、`parseSave`（可被 tsconfig.check / tests 引入）
 *   · `engine/Save.ts`：真正的读写（依赖 cc 的 sys.localStorage）
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
  /** 上次选择的难度（退出后保留） */
  selectedDifficulty: DifficultyId;
  /** 永久解锁的难度 */
  difficulties: DifficultyId[];
  /** 图鉴已发现条目（'enemy:goblin' / 'skill:fireball' / 'item:power_s' / 'char:knight'） */
  seen: string[];
  /** 无尽徽章：'<难度>:<波次>'，每档每里程碑只记一次（30/40/50） */
  endlessBadges: string[];
  /** 画面偏好：特效透明度 0~1、屏幕震动、受击红屏（真机反馈 #6） */
  fxAlpha: number;
  shakeOn: boolean;
  hurtOn: boolean;
}

export function defaultSave(): SaveData {
  return {
    music: true, sfx: true,
    runs: 0, wins: 0, kills: 0, bestWave: 0, bestLv: 0, bossKills: 0, merges: 0,
    ach: [],
    charsWin: [],
    selectedDifficulty: 'normal',
    difficulties: ['casual', 'normal'],
    seen: [],
    endlessBadges: [],
    fxAlpha: 1, shakeOn: true, hurtOn: true,
  };
}

const NUM_KEYS = ['runs', 'wins', 'kills', 'bestWave', 'bestLv', 'bossKills', 'merges'] as const;

function strArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const x of v) if (typeof x === 'string' && x && out.indexOf(x) < 0) out.push(x);
  return out;
}

function isDifficultyId(v: unknown): v is DifficultyId {
  return typeof v === 'string' && (DIFFICULTY_IDS as string[]).indexOf(v) >= 0;
}

/**
 * 存档解析（纯函数）：**读全所有字段**，非法值回落到默认值，最后跑一次迁移。
 *
 * ⚠️ 2026-10-31 修复：旧实现只回填了一部分字段，导致 selectedDifficulty / difficulties /
 * seen / charsWin / 画面偏好**写进去读不回来**（难度解锁每次重启都丢）。
 * 现在按"逐字段校验 + 不覆盖已有合法值"的方式读全。
 */
export function parseSave(raw: string | null | undefined): SaveData {
  const d = defaultSave();
  if (!raw) return d;
  let o: Partial<SaveData> | null = null;
  try {
    o = JSON.parse(raw) as Partial<SaveData>;
  } catch {
    return d;
  }
  if (!o || typeof o !== 'object') return d;

  if (typeof o.music === 'boolean') d.music = o.music;
  if (typeof o.sfx === 'boolean') d.sfx = o.sfx;
  for (const k of NUM_KEYS) {
    const v = o[k];
    if (typeof v === 'number' && isFinite(v) && v >= 0) d[k] = Math.floor(v);
  }
  const ach = strArray(o.ach); if (ach) d.ach = ach;
  const charsWin = strArray(o.charsWin); if (charsWin) d.charsWin = charsWin;
  const seen = strArray(o.seen); if (seen) d.seen = seen;
  const badges = strArray(o.endlessBadges); if (badges) d.endlessBadges = badges;

  if (isDifficultyId(o.selectedDifficulty)) d.selectedDifficulty = o.selectedDifficulty;
  const rawObj = o as unknown as Record<string, unknown>;
  const diffs = strArray(o.difficulties);
  if (diffs) {
    const valid = diffs.filter(isDifficultyId) as DifficultyId[];
    if (valid.length) d.difficulties = valid;
  } else if (!('difficulties' in rawObj)) {
    // 旧档没有字段 → 交给 migrateDifficulty 补（wins>=1 时补困难），不当成"已有空列表"
    (d as unknown as { difficulties?: DifficultyId[] }).difficulties = undefined;
  }

  if (typeof o.fxAlpha === 'number' && isFinite(o.fxAlpha)) {
    d.fxAlpha = Math.max(0, Math.min(1, o.fxAlpha));
  }
  if (typeof o.shakeOn === 'boolean') d.shakeOn = o.shakeOn;
  if (typeof o.hurtOn === 'boolean') d.hurtOn = o.hurtOn;

  return migrateDifficulty(d);
}

/**
 * 难度存档迁移（设计 v6）：只补不改，不覆盖已有值。
 * 旧档（无字段）→ selectedDifficulty=normal，difficulties=[casual,normal]，wins>=1 补 hard。
 */
export function migrateDifficulty(save: SaveData): SaveData {
  const anySave = save as unknown as {
    selectedDifficulty?: DifficultyId;
    difficulties?: DifficultyId[];
    wins?: number;
  };
  if (!anySave.selectedDifficulty) anySave.selectedDifficulty = 'normal';
  if (!Array.isArray(anySave.difficulties)) {
    const d: DifficultyId[] = ['casual', 'normal'];
    if ((anySave.wins ?? 0) >= 1) d.push('hard');
    anySave.difficulties = d;
  }
  return save;
}

/** 无尽徽章里程碑（difficulty_system_design.md §6） */
export const ENDLESS_MILESTONES = [30, 40, 50] as const;

export function badgeId(difficulty: DifficultyId, wave: number): string {
  return difficulty + ':' + wave;
}

/**
 * 本局结束后应补发的徽章（每档每里程碑只记一次）。
 * 只根据"本局达到过的最高波次"发放，退出/异常中断时也只会发已到达的档位。
 */
export function badgesForRun(
  existing: string[], difficulty: DifficultyId, bestWave: number,
): string[] {
  const out = existing.slice();
  for (const m of ENDLESS_MILESTONES) {
    if (bestWave >= m) {
      const id = badgeId(difficulty, m);
      if (out.indexOf(id) < 0) out.push(id);
    }
  }
  return out;
}
