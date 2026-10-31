/**
 * M2-A 战斗遥测类型（纯数据，不依赖 cc，可单测）
 */
export const TELEMETRY_SCHEMA_VERSION = 2;

export type RunResult = 'victory' | 'death' | 'quit' | 'unknown';
export type Completeness = 'complete' | 'interrupted' | 'partial' | 'corrupted';

export interface TelemetryEvent {
  eventId: number;
  runId: string;
  timestamp: number;
  elapsedMs: number;
  wave: number;
  type: string;
  sourceId?: string;
  targetId?: string;
  value?: number;
  extra?: Record<string, unknown>;
}

export interface SkillTelemetry {
  skillId: string;
  castCount: number;
  hitCount: number;
  damageTotal: number;
  damageAverage: number;
  damageMax: number;
  killCount: number;
  firstCastTime: number;
  lastCastTime: number;
  /** 黑科技加成估算（仅记录可计算的增量，不并入 damageTotal） */
  moduleBonus: number;
}

export interface ModuleTelemetry {
  moduleId: string;
  acquireCount: number;
  triggerCount: number;
  damageTotal: number;
  healTotal: number;
  relatedSkillIds: string[];
  firstTriggerTime: number;
  lastTriggerTime: number;
  /** 无法准确统计的指标（如减伤量） */
  unsupported?: string[];
}

export interface WaveTelemetry {
  wave: number;
  startMs: number;
  endMs: number;
  durationMs: number;
  kills: number;
  damageTaken: number;
  healing: number;
  skillDamage: Record<string, number>;
  moduleTriggers: Record<string, number>;
  bossKilled: boolean;
  completed: boolean;
}

export interface RunTelemetry {
  runId: string;
  characterId: string;
  difficultyId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  maxWave: number;
  result: RunResult;
  damageTaken: number;
  healingReceived: number;
  damagePrevented?: number;
  killTotal: number;
  bossKillTotal: number;
  goldEarned: number;
  goldSpent: number;
  finalHp: number;
  finalMaxHp: number;
}

export interface ShopTelemetry {
  enters: number;
  displays: Record<string, number>;
  purchases: Record<string, number>;
  purchaseByKind: Record<string, number>;
  goldIn: number;
  goldOut: number;
  rerolls: number;
  locks: number;
  heals: number;
  attrs: number;
}

export interface PerformanceTelemetry {
  samples: number;
  peakEnemies: number;
  peakBullets: number;
  peakAreas: number;
  peakEventsPerSec: number;
  peakUpdateMs: number;
  telemetryMsTotal: number;
  telemetryMsMax: number;
}

export interface RunTelemetryRecord {
  schemaVersion: number;
  runId: string;
  summary: RunTelemetry;
  waves: WaveTelemetry[];
  skills: SkillTelemetry[];
  modules: ModuleTelemetry[];
  shop: ShopTelemetry;
  performance: PerformanceTelemetry;
  events: TelemetryEvent[];
  completeness: {
    complete: boolean;
    state: Completeness;
    missingFields: string[];
    unsupportedMetrics: string[];
  };
}
