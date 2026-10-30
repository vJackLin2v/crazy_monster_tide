/**
 * 战斗日志（Telemetry）—— 下次玩的时候能记录，事后能分析
 *
 * 只记**每波一行 + 每局一行**，不记每帧：20 波 ≈ 21 条，localStorage 存最近 20 局毫无压力。
 * 纯数据、不依赖 cc，可在单测里跑。
 *
 * 用法：
 *   · 游戏内自动记录（Battle 波末 / GameRoot 结算调用）；
 *   · 控制台 `__logs()` 看全部，`__logDump()` 输出 JSON，`__logClear()` 清空；
 *   · 设置页「导出战斗日志」按钮会把 JSON 打到控制台并复制到剪贴板（浏览器）。
 *
 * 为什么不用现成打点：微信小游戏没有可靠的长连接；先把**本地可导出**做出来，
 * 真机复现问题时直接导出 JSON 发回来即可。
 */

export interface WaveRec {
  wave: number;
  /** 本波耗时（秒） */
  sec: number;
  kills: number;
  lv: number;
  gold: number;
  /** 本波最高同屏活怪 */
  aliveMax: number;
  /** 本波结束时血量 */
  hp: number;
  /** 本波玩家受到的总伤害 */
  dmgTaken: number;
  /** 本波玩家造成的总伤害（阶段2 A/B 用） */
  dmgDealt?: number;
}

export interface RunRec {
  id: string;
  at: number;
  charId: string;
  seed: number;
  waves: WaveRec[];
  end: 'dead' | 'clear' | 'quit';
  deathWave: number;
  kills: number;
  maxAlive: number;
  dmgTaken: number;
  durSec: number;
}

const KEY = 'cmt_log_v1';
const MAX_RUNS = 20;

let cur: RunRec | null = null;
let waveT0 = 0;
let waveKills0 = 0;

/** 读全部局记录（新→旧） */
export function listRuns(): RunRec[] {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as RunRec[]) : [];
  } catch {
    return [];
  }
}

function persist(runs: RunRec[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(runs.slice(0, MAX_RUNS)));
  } catch (e) {
    console.warn('[Log] 写入失败（不影响本局）', e);
  }
}

export function telemetryStart(charId: string, seed: number): void {
  cur = {
    id: 'r' + Date.now().toString(36),
    at: Date.now(),
    charId, seed,
    waves: [],
    end: 'quit',
    deathWave: 0, kills: 0, maxAlive: 0, dmgTaken: 0, durSec: 0,
  };
  waveT0 = Date.now();
  waveKills0 = 0;
}

/** 每波开始时调用（记录起点，用于算本波耗时/本波击杀） */
export function telemetryWaveStart(killsBase: number): void {
  waveT0 = Date.now();
  waveKills0 = killsBase;
}

/** 每波结束时调用 */
export function telemetryWaveEnd(d: {
  wave: number; kills: number; lv: number; gold: number;
  aliveMax: number; hp: number; dmgTaken: number;
}): void {
  if (!cur) return;
  cur.waves.push({
    wave: d.wave,
    sec: Math.round((Date.now() - waveT0) / 100) / 10,
    kills: Math.max(0, d.kills - waveKills0),
    lv: d.lv, gold: d.gold, aliveMax: d.aliveMax, hp: Math.round(d.hp),
    dmgTaken: Math.round(d.dmgTaken),
  });
}

/** 一局结束：落盘 */
export function telemetryRunEnd(d: {
  end: 'dead' | 'clear' | 'quit'; deathWave: number; kills: number;
  maxAlive: number; dmgTaken: number; durSec: number;
}): void {
  if (!cur) return;
  cur.end = d.end;
  cur.deathWave = d.deathWave;
  cur.kills = d.kills;
  cur.maxAlive = Math.max(cur.maxAlive, d.maxAlive);
  cur.dmgTaken = Math.round(d.dmgTaken);
  cur.durSec = Math.round(d.durSec);
  const runs = listRuns();
  runs.unshift(cur);
  persist(runs);
  console.log('[Log] 本局已记录：' + cur.charId + ' 第 ' + cur.deathWave + ' 波 · ' + cur.kills + ' 杀 · '
    + cur.waves.length + ' 行波次数据');
  cur = null;
}

/** 导出 JSON（文档/发同事用） */
export function exportLogs(): string {
  return JSON.stringify(listRuns(), null, 2);
}

export function clearLogs(): void {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY); } catch { /* 忽略 */ }
}

/** 汇总：按角色统计通关/平均死亡波次（"分析"用的最小实现） */
export function summarize(): Record<string, { runs: number; avgDeathWave: number; bestWave: number; avgKills: number }> {
  const out: Record<string, { runs: number; avgDeathWave: number; bestWave: number; avgKills: number }> = {};
  for (const r of listRuns()) {
    const k = r.charId;
    const o = out[k] ?? { runs: 0, avgDeathWave: 0, bestWave: 0, avgKills: 0 };
    o.runs++;
    o.avgDeathWave += r.end === 'clear' ? 20 : r.deathWave;
    o.bestWave = Math.max(o.bestWave, r.waves.reduce((m, w) => Math.max(m, w.wave), r.deathWave));
    o.avgKills += r.kills;
    out[k] = o;
  }
  for (const k of Object.keys(out)) {
    out[k].avgDeathWave = Math.round(out[k].avgDeathWave / out[k].runs * 10) / 10;
    out[k].avgKills = Math.round(out[k].avgKills / out[k].runs);
  }
  return out;
}
