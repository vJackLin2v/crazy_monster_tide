/**
 * 历史对局（RunHistory）—— 纯数据模型，不依赖 cc
 *
 * 设计（docs/design/run_save_and_history_design.md）：
 *  · 只记录**已经结束**的对局；未完成的本局归 ActiveRunSave 管，绝不混进来；
 *  · 摘要（列表用）与详情（点开才用）分层，列表不加载详情；
 *  · runId 幂等：同一局重复结算只写一次；
 *  · 容量上限 50 局，超出删最旧（摘要与详情一起删）。
 */
import type { DifficultyId } from '../data/Difficulties';

export type RunResult = 'victory' | 'defeat' | 'endless_end' | 'abandoned';

export interface RunMilestone {
  wave: number;
  /** 游戏内秒数（runTime） */
  at: number;
  kind: 'wave' | 'boss' | 'level' | 'legendary' | 'endless' | 'end';
  text: string;
}

export interface RunSummary {
  runId: string;
  startedAt: number;
  endedAt: number;
  characterId: string;
  difficulty: DifficultyId;
  result: RunResult;
  reachedWave: number;
  totalWaves: number;
  durationSeconds: number;
  killCount: number;
  eliteKillCount: number;
  bossKillCount: number;
  goldEarned: number;
  goldSpent: number;
  endlessMode: boolean;
  finalSkillIds: string[];
  finalItemIds: string[];
  badges: string[];
}

export interface RunDetail {
  runId: string;
  skills: { id: string; lvl: number; mods: string[] }[];
  items: { id: string; count: number }[];
  stats: Record<string, number>;
  milestones: RunMilestone[];
  endReason: string;
}

export interface RunHistoryData {
  v: number;
  summaries: RunSummary[];
  details: Record<string, RunDetail>;
}

export const RUN_HISTORY_VERSION = 1;
export const HISTORY_MAX = 50;

const RESULTS: RunResult[] = ['victory', 'defeat', 'endless_end', 'abandoned'];

export function emptyHistory(): RunHistoryData {
  return { v: RUN_HISTORY_VERSION, summaries: [], details: {} };
}

export function isRunResult(v: unknown): v is RunResult {
  return typeof v === 'string' && (RESULTS as string[]).indexOf(v) >= 0;
}

export function resultLabel(r: RunResult): string {
  if (r === 'victory') return '通关';
  if (r === 'defeat') return '失败';
  if (r === 'endless_end') return '无尽结束';
  return '主动放弃';
}

export function endReasonText(r: RunResult): string {
  if (r === 'victory') return '20 波全部清空，通关';
  if (r === 'defeat') return '生命归零，被怪潮击败';
  if (r === 'endless_end') return '无尽模式中倒下';
  return '玩家主动放弃本局';
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && isFinite(v) ? v : fallback;
}
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function summaryOk(v: unknown): v is RunSummary {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.runId === 'string' && !!o.runId && isRunResult(o.result);
}

function normalizeSummary(v: RunSummary): RunSummary {
  return {
    runId: v.runId,
    startedAt: num(v.startedAt, 0),
    endedAt: num(v.endedAt, 0),
    characterId: str(v.characterId, 'knight'),
    difficulty: (['casual', 'normal', 'hard', 'nightmare', 'hell'] as string[]).indexOf(v.difficulty) >= 0
      ? v.difficulty : 'normal',
    result: v.result,
    reachedWave: Math.max(0, Math.floor(num(v.reachedWave, 0))),
    totalWaves: Math.max(1, Math.floor(num(v.totalWaves, 20))),
    durationSeconds: Math.max(0, num(v.durationSeconds, 0)),
    killCount: Math.max(0, Math.floor(num(v.killCount, 0))),
    eliteKillCount: Math.max(0, Math.floor(num(v.eliteKillCount, 0))),
    bossKillCount: Math.max(0, Math.floor(num(v.bossKillCount, 0))),
    goldEarned: Math.max(0, Math.floor(num(v.goldEarned, 0))),
    goldSpent: Math.max(0, Math.floor(num(v.goldSpent, 0))),
    endlessMode: !!v.endlessMode,
    finalSkillIds: Array.isArray(v.finalSkillIds) ? v.finalSkillIds.filter((x): x is string => typeof x === 'string') : [],
    finalItemIds: Array.isArray(v.finalItemIds) ? v.finalItemIds.filter((x): x is string => typeof x === 'string') : [],
    badges: Array.isArray(v.badges) ? v.badges.filter((x): x is string => typeof x === 'string') : [],
  };
}

/** 解析持久化数据：坏数据整体丢弃但不能抛异常 */
export function validateHistory(raw: unknown): RunHistoryData {
  if (!raw || typeof raw !== 'object') return emptyHistory();
  const o = raw as Record<string, unknown>;
  if (o.v !== RUN_HISTORY_VERSION) return emptyHistory();
  const arr = Array.isArray(o.summaries) ? o.summaries : [];
  const summaries = arr.filter(summaryOk).map(normalizeSummary)
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, HISTORY_MAX);
  const detailsRaw = (o.details && typeof o.details === 'object') ? o.details as Record<string, unknown> : {};
  const details: Record<string, RunDetail> = {};
  for (const s of summaries) {
    const d = detailsRaw[s.runId];
    if (!d || typeof d !== 'object') continue;
    const dd = d as Partial<RunDetail>;
    details[s.runId] = {
      runId: s.runId,
      skills: Array.isArray(dd.skills) ? dd.skills : [],
      items: Array.isArray(dd.items) ? dd.items : [],
      stats: (dd.stats && typeof dd.stats === 'object') ? dd.stats : {},
      milestones: Array.isArray(dd.milestones) ? dd.milestones : [],
      endReason: str(dd.endReason, endReasonText(s.result)),
    };
  }
  return { v: RUN_HISTORY_VERSION, summaries, details };
}

/** 同一局只写一次（runId 幂等） */
export function hasRun(h: RunHistoryData, runId: string): boolean {
  return h.summaries.some(s => s.runId === runId);
}

/** 写入一局；重复 runId 返回 added=false（不覆盖已有记录） */
export function addRun(
  h: RunHistoryData, summary: RunSummary, detail: RunDetail,
): { data: RunHistoryData; added: boolean } {
  if (hasRun(h, summary.runId)) return { data: h, added: false };
  const summaries = [summary, ...h.summaries].sort((a, b) => b.endedAt - a.endedAt);
  const details: Record<string, RunDetail> = { ...h.details, [detail.runId]: detail };
  const kept = summaries.slice(0, HISTORY_MAX);
  const keptIds = new Set(kept.map(s => s.runId));
  for (const id of Object.keys(details)) if (!keptIds.has(id)) delete details[id];
  return { data: { v: RUN_HISTORY_VERSION, summaries: kept, details }, added: true };
}

export type HistoryFilter = 'all' | 'win' | 'lose' | 'endless';

export function filterRuns(list: RunSummary[], filter: HistoryFilter): RunSummary[] {
  if (filter === 'win') return list.filter(s => s.result === 'victory');
  if (filter === 'lose') return list.filter(s => s.result === 'defeat' || s.result === 'abandoned');
  if (filter === 'endless') return list.filter(s => s.endlessMode);
  return list;
}

export interface HistoryStats {
  total: number;
  wins: number;
  bestWave: number;
  longestSeconds: number;
}

export function historyStats(list: RunSummary[]): HistoryStats {
  let wins = 0, bestWave = 0, longest = 0;
  for (const s of list) {
    if (s.result === 'victory') wins++;
    bestWave = Math.max(bestWave, s.reachedWave);
    longest = Math.max(longest, s.durationSeconds);
  }
  return { total: list.length, wins, bestWave, longestSeconds: longest };
}

/** 构造摘要（结算时调用；只读 RunState 快照字段） */
export interface SummaryInput {
  runId: string;
  startedAt: number;
  endedAt: number;
  characterId: string;
  difficulty: DifficultyId;
  result: RunResult;
  reachedWave: number;
  totalWaves: number;
  durationSeconds: number;
  killCount: number;
  eliteKillCount: number;
  bossKillCount: number;
  goldEarned: number;
  goldSpent: number;
  endlessMode: boolean;
  finalSkillIds: string[];
  finalItemIds: string[];
  badges: string[];
}

export function buildSummary(i: SummaryInput): RunSummary {
  return normalizeSummary({ ...i });
}
