/**
 * 本局续玩存档（ActiveRunSave）—— 纯数据模型，不依赖 cc
 *
 * 设计（docs/design/run_save_and_history_design.md）：
 *  · 只保存"恢复一局所需"的状态：角色 / 属性 / 构筑 / 经济 / 波次 / 敌人 / RNG；
 *  · 子弹、区域、地雷、哨兵、蓄能这些**瞬时实体**不保存（寿命 <3s，恢复后由技能自然重建）；
 *  · 存的是"安全点快照"：战斗暂停、波次结算、商店、升级三选一。
 *
 * 所有字段都是 JSON-safe；版本号用于迁移，任何校验失败都返回明确原因，不静默当没有存档。
 */
import type { DifficultyId } from '../data/Difficulties';
import type { CharStats } from '../data/Types';
import type { RunMilestone } from './RunHistory';

export const RUN_SAVE_VERSION = 1;

export type RunPhase = 'battle' | 'shop' | 'levelup';

/** 敌人快照（只存战斗实体必需字段；状态效果按剩余时间保存） */
export interface EnemySave {
  kind: string;
  x: number; y: number;
  hp: number; maxhp: number;
  spd: number; dmg: number; r: number; exp: number; gold: number;
  elite: boolean; boss: boolean;
  summoned?: boolean;
  fromSplit?: boolean;
  affixes?: string[];
  slowPct?: number;
  burnT?: number; poisonT?: number;
  burnDmg?: number; poisonDmg?: number;
}

/** BOSS 召唤状态机快照（噩梦难度） */
export interface BossSummonSave {
  fired: boolean[];
  pendingWaves: number;
  warningActive: boolean;
  warningEndAt: number;
  lastSummonCompletedAt: number;
  dead: boolean;
}

export interface BattleSave {
  waveLeft: number;
  spawnAcc: number;
  elitesSpawned: number;
  px: number; py: number;
  skillT: number[];
  enemies: EnemySave[];
  bossSummon?: BossSummonSave;
  bossDefeated?: boolean;
  /** 统一回血的秒窗口与已用额度（旧存档缺失时按当前窗口从 0 开始） */
  healWindow?: number;
  healSpent?: number;
}

export interface ShopSlotSave {
  kind: string;
  id: string;
  price: number;
  basePrice?: number;
  sold: boolean;
  locked: boolean;
}

export interface SkillSave { id: string; lvl: number; mods: string[] }

export interface ActiveRunSave {
  v: number;
  runId: string;
  startedAt: number;
  savedAt: number;
  charId: string;
  difficulty: DifficultyId;
  seed: number;
  rngState: number;
  phase: RunPhase;
  wave: number;
  endless: boolean;
  gold: number; lv: number; exp: number; expNeed: number;
  kills: number; waveKills: number; runTime: number;
  /** 结算/历史用的累计量（恢复后不能丢，否则主动放弃会少统计） */
  eliteKills: number; bossKills: number;
  goldEarned: number; goldSpent: number;
  milestones: RunMilestone[];
  stats: CharStats;
  baseStats: CharStats;
  skills: SkillSave[];
  modsBag: string[];
  items: { id: string }[];
  attrTaken: Record<string, number>;
  shopReroll: number;
  shopStock: ShopSlotSave[] | null;
  carryOver: ShopSlotSave[];
  legendaryTaken: boolean;
  /** 升级三选一待选卡（phase = levelup 时恢复用） */
  pendingRewards?: { kind: string; id: string; needReplace?: boolean }[];
  battle: BattleSave;
}

export type LoadCheck =
  | { status: 'ok'; save: ActiveRunSave }
  | { status: 'none' }
  | { status: 'version'; message: string }
  | { status: 'corrupt'; message: string };

const DIFFICULTIES: DifficultyId[] = ['casual', 'normal', 'hard', 'nightmare', 'hell'];

export function newRunId(now = Date.now(), rnd = Math.random()): string {
  return 'r' + now.toString(36) + '-' + Math.floor(rnd * 0xffffff).toString(36);
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && isFinite(v) ? v : fallback;
}
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function bool(v: unknown, fallback = false): boolean {
  return typeof v === 'boolean' ? v : fallback;
}
function statsOf(v: unknown): CharStats | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.maxhp !== 'number' || typeof o.hp !== 'number') return null;
  // 奖励/存档都是纯数值，允许就地拷贝；非法值回落 0 会在恢复时炸，所以整体判空
  return { ...(v as CharStats) };
}

/** 把一处不合法的地方变成人话，避免"继续游戏点了没反应" */
export function validateActiveRun(raw: unknown): LoadCheck {
  if (!raw || typeof raw !== 'object') return { status: 'none' };
  const o = raw as Record<string, unknown>;
  if (typeof o.v !== 'number') return { status: 'corrupt', message: '存档缺少版本号' };
  if (o.v > RUN_SAVE_VERSION) return { status: 'version', message: '存档来自更高版本（v' + o.v + '）' };
  if (o.v < RUN_SAVE_VERSION) return { status: 'version', message: '存档版本过旧（v' + o.v + '）' };

  const charId = str(o.charId);
  if (!charId) return { status: 'corrupt', message: '存档缺少角色' };
  if (DIFFICULTIES.indexOf(o.difficulty as DifficultyId) < 0) return { status: 'corrupt', message: '存档难度非法' };
  const phase = o.phase;
  if (phase !== 'battle' && phase !== 'shop' && phase !== 'levelup') {
    return { status: 'corrupt', message: '存档阶段非法' };
  }
  const stats = statsOf(o.stats);
  const baseStats = statsOf(o.baseStats) ?? stats;
  if (!stats || !baseStats) return { status: 'corrupt', message: '存档缺少角色属性' };
  const b = o.battle as Record<string, unknown> | undefined;
  if (!b || typeof b !== 'object') return { status: 'corrupt', message: '存档缺少战斗快照' };
  const enemies = Array.isArray(b.enemies) ? b.enemies as EnemySave[] : [];
  const skillsRaw = Array.isArray(o.skills) ? o.skills : [];
  if (!skillsRaw.length) return { status: 'corrupt', message: '存档没有技能' };

  const save: ActiveRunSave = {
    v: RUN_SAVE_VERSION,
    runId: str(o.runId, newRunId()),
    startedAt: num(o.startedAt, Date.now()),
    savedAt: num(o.savedAt, Date.now()),
    charId,
    difficulty: o.difficulty as DifficultyId,
    seed: num(o.seed, 1) >>> 0,
    rngState: num(o.rngState, typeof o.seed === 'number' ? o.seed : 1) >>> 0,
    phase: phase as RunPhase,
    wave: Math.max(1, Math.floor(num(o.wave, 1))),
    endless: bool(o.endless),
    gold: Math.max(0, Math.floor(num(o.gold, 0))),
    lv: Math.max(1, Math.floor(num(o.lv, 1))),
    exp: Math.max(0, num(o.exp, 0)),
    expNeed: Math.max(1, num(o.expNeed, 5)),
    kills: Math.max(0, Math.floor(num(o.kills, 0))),
    waveKills: Math.max(0, Math.floor(num(o.waveKills, 0))),
    runTime: Math.max(0, num(o.runTime, 0)),
    eliteKills: Math.max(0, Math.floor(num(o.eliteKills, 0))),
    bossKills: Math.max(0, Math.floor(num(o.bossKills, 0))),
    goldEarned: Math.max(0, Math.floor(num(o.goldEarned, 0))),
    goldSpent: Math.max(0, Math.floor(num(o.goldSpent, 0))),
    milestones: Array.isArray(o.milestones)
      ? (o.milestones as RunMilestone[]).filter(m => m && typeof m.text === 'string').slice(0, 80)
      : [],
    stats, baseStats,
    skills: skillsRaw.map((s) => {
      const r = s as Record<string, unknown>;
      return { id: str(r.id), lvl: Math.max(1, Math.floor(num(r.lvl, 1))), mods: Array.isArray(r.mods) ? r.mods.filter((m): m is string => typeof m === 'string') : [] };
    }).filter(s => !!s.id),
    modsBag: Array.isArray(o.modsBag) ? o.modsBag.filter((m): m is string => typeof m === 'string') : [],
    items: Array.isArray(o.items) ? (o.items as { id: string }[]).filter(i => i && typeof i.id === 'string') : [],
    attrTaken: (o.attrTaken && typeof o.attrTaken === 'object') ? o.attrTaken as Record<string, number> : {},
    shopReroll: Math.max(0, Math.floor(num(o.shopReroll, 0))),
    shopStock: Array.isArray(o.shopStock) ? o.shopStock as ShopSlotSave[] : null,
    carryOver: Array.isArray(o.carryOver) ? o.carryOver as ShopSlotSave[] : [],
    legendaryTaken: bool(o.legendaryTaken),
    pendingRewards: Array.isArray(o.pendingRewards)
      ? (o.pendingRewards as { kind: string; id: string; needReplace?: boolean }[]) : undefined,
    battle: {
      waveLeft: Math.max(0, num(b.waveLeft, 0)),
      spawnAcc: Math.max(0, num(b.spawnAcc, 0)),
      elitesSpawned: Math.max(0, Math.floor(num(b.elitesSpawned, 0))),
      px: num(b.px, 180), py: num(b.py, 320),
      skillT: Array.isArray(b.skillT) ? (b.skillT as number[]).map(n => Math.max(0, num(n, 0))) : [0, 0, 0, 0],
      enemies: enemies.filter(e => e && typeof e.kind === 'string' && isFinite(e.x) && isFinite(e.y)),
      bossSummon: b.bossSummon as BossSummonSave | undefined,
      bossDefeated: bool(b.bossDefeated),
    },
  };
  if (!save.skills.length) return { status: 'corrupt', message: '存档技能列表为空' };
  return { status: 'ok', save };
}

/** 主菜单继续卡片要显示的信息（只读摘要，不加载战斗） */
export interface ContinueInfo {
  runId: string;
  charId: string;
  difficulty: DifficultyId;
  wave: number;
  endless: boolean;
  savedAt: number;
  skillNames: string[];
  skillCount: number;
  itemCount: number;
  hp: number;
  maxhp: number;
  phase: RunPhase;
}

export function continueInfoOf(save: ActiveRunSave, skillName: (id: string) => string): ContinueInfo {
  return {
    runId: save.runId,
    charId: save.charId,
    difficulty: save.difficulty,
    wave: save.wave,
    endless: save.endless,
    savedAt: save.savedAt,
    skillNames: save.skills.map(s => skillName(s.id)),
    skillCount: save.skills.length,
    itemCount: save.items.length,
    hp: Math.round(save.stats.hp),
    maxhp: Math.round(save.stats.maxhp),
    phase: save.phase,
  };
}

/** 恢复时的轻量校验：等级/属性/构筑必须自洽，避免"恢复了但一进战斗就崩" */
export function assertRestorable(save: ActiveRunSave): string[] {
  const errs: string[] = [];
  if (!(save.stats.hp > 0)) errs.push('生命值非法');
  if (!(save.stats.maxhp > 0)) errs.push('最大生命非法');
  if (!(save.wave >= 1)) errs.push('波次非法');
  if (!save.skills.length) errs.push('没有技能');
  for (const s of save.skills) if (!s.id) errs.push('技能 id 为空');
  return errs;
}
