/**
 * 遥测存储（M2-A）：localStorage 优先，测试可注入 storage。
 * 单局结束写一次；最多保留 50 局；按 runId 幂等覆盖；坏数据跳过不崩溃。
 */
import { TELEMETRY_SCHEMA_VERSION, type RunTelemetryRecord } from './TelemetryTypes';

export interface TelemetryStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY = 'cmt_telemetry_v1';
export const TELEMETRY_MAX_RUNS = 50;

function defaultStorage(): TelemetryStorageLike | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch { /* ignore */ }
  return null;
}

export function loadRecords(storage: TelemetryStorageLike | null = defaultStorage()): RunTelemetryRecord[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((r): r is RunTelemetryRecord =>
      !!r && typeof r === 'object' && typeof r.runId === 'string'
      && typeof r.schemaVersion === 'number' && !!r.summary);
  } catch { return []; }
}

export function saveRecord(record: RunTelemetryRecord, storage: TelemetryStorageLike | null = defaultStorage()): boolean {
  if (!storage) return false;
  try {
    const list = loadRecords(storage).filter(r => r.runId !== record.runId);
    list.unshift(record);
    // 裁剪：最新 50 局（按 endTime 降序，缺失则保留原顺序）
    list.sort((a, b) => (b.summary.endTime || 0) - (a.summary.endTime || 0));
    const trimmed = list.slice(0, TELEMETRY_MAX_RUNS);
    storage.setItem(KEY, JSON.stringify(trimmed));
    return true;
  } catch { return false; }
}

export function exportAllJson(storage: TelemetryStorageLike | null = defaultStorage()): string {
  return JSON.stringify({ schemaVersion: TELEMETRY_SCHEMA_VERSION, records: loadRecords(storage) }, null, 2);
}

export function exportRunJson(runId: string, storage: TelemetryStorageLike | null = defaultStorage()): string {
  const r = loadRecords(storage).find(x => x.runId === runId);
  return r ? JSON.stringify(r, null, 2) : '';
}

export function clearAll(storage: TelemetryStorageLike | null = defaultStorage()): void {
  try { storage?.removeItem(KEY); } catch { /* ignore */ }
}

export interface AggregateSummary {
  runs: number; wins: number; deaths: number; quits: number;
  avgMaxWave: number; avgDurationMs: number;
  byDifficulty: Record<string, number>;
  byCharacter: Record<string, number>;
}

export function aggregate(storage: TelemetryStorageLike | null = defaultStorage()): AggregateSummary {
  const records = loadRecords(storage).filter(r => r.completeness.complete);
  const out: AggregateSummary = {
    runs: records.length, wins: 0, deaths: 0, quits: 0,
    avgMaxWave: 0, avgDurationMs: 0, byDifficulty: {}, byCharacter: {},
  };
  let wave = 0, dur = 0;
  for (const r of records) {
    const s = r.summary;
    if (s.result === 'victory') out.wins++;
    else if (s.result === 'death') out.deaths++;
    else if (s.result === 'quit') out.quits++;
    wave += s.maxWave || 0; dur += s.durationMs || 0;
    out.byDifficulty[s.difficultyId] = (out.byDifficulty[s.difficultyId] ?? 0) + 1;
    out.byCharacter[s.characterId] = (out.byCharacter[s.characterId] ?? 0) + 1;
  }
  if (records.length) {
    out.avgMaxWave = Math.round((wave / records.length) * 10) / 10;
    out.avgDurationMs = Math.round(dur / records.length);
  }
  return out;
}

/** 技能总表（按总伤害排序） */
export function skillTotals(storage: TelemetryStorageLike | null = defaultStorage()): Record<string, { damage: number; kills: number; casts: number; hits: number }> {
  const out: Record<string, { damage: number; kills: number; casts: number; hits: number }> = {};
  for (const r of loadRecords(storage).filter(x => x.completeness.complete)) {
    for (const s of r.skills) {
      const o = out[s.skillId] ?? (out[s.skillId] = { damage: 0, kills: 0, casts: 0, hits: 0 });
      o.damage += s.damageTotal; o.kills += s.killCount;
      o.casts += s.castCount; o.hits += s.hitCount;
    }
  }
  return out;
}
