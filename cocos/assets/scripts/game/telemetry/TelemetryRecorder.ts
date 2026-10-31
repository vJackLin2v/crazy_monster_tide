/**
 * 战斗遥测记录器（M2-A）
 *
 * 设计原则：
 *  - 纯数据、无 cc 依赖、无随机数调用；所有方法内部失败不抛出；
 *  - 只做聚合与有限的事件环形缓冲（300 条），不逐帧创建对象；
 *  - 不参与任何战斗判定；关闭/未接入时对战斗零影响。
 */
import {
  TELEMETRY_SCHEMA_VERSION, type Completeness, type ModuleTelemetry,
  type PerformanceTelemetry, type RunResult, type RunTelemetry, type RunTelemetryRecord,
  type ShopTelemetry, type SkillTelemetry, type TelemetryEvent, type WaveTelemetry,
} from './TelemetryTypes';

const EVENT_CAP = 300;

function nowMs(): number { return Date.now(); }

export interface RunMeta { runId: string; characterId: string; difficultyId: string; startTime?: number; }

export class TelemetryRecorder {
  readonly schemaVersion = TELEMETRY_SCHEMA_VERSION;
  readonly runId: string;
  private startMs: number;
  private endMs = 0;
  private ended = false;
  private currentWave = 1;
  private waveStartMs: number;
  private events: TelemetryEvent[] = [];
  private eventSeq = 0;
  /** 累计事件数（不受事件环裁剪影响，用于 eventsPerSec） */
  private eventTotal = 0;
  /** 当前波次技能伤害 / 黑科技触发 */
  private waveSkillDamage: Record<string, number> = {};
  private waveModuleTriggers: Record<string, number> = {};
  private endedWaves = new Set<number>();

  private summary: RunTelemetry;
  private waves: WaveTelemetry[] = [];
  private skills = new Map<string, SkillTelemetry>();
  private modules = new Map<string, ModuleTelemetry>();
  private shop: ShopTelemetry = {
    enters: 0, displays: {}, purchases: {}, purchaseByKind: {},
    goldIn: 0, goldOut: 0, rerolls: 0, locks: 0, heals: 0, attrs: 0,
  };
  private perf: PerformanceTelemetry = {
    samples: 0, peakEnemies: 0, peakBullets: 0, peakAreas: 0,
    peakEventsPerSec: 0, peakUpdateMs: 0, telemetryMsTotal: 0, telemetryMsMax: 0,
  };
  private completeness: Completeness = 'partial';
  private missing: string[] = [];
  private unsupported: string[] = ['damagePrevented（护盾减伤量未精确归因）'];

  constructor(meta: RunMeta) {
    this.runId = meta.runId;
    this.startMs = meta.startTime ?? nowMs();
    this.waveStartMs = this.startMs;
    this.push('run_start', { extra: { characterId: meta.characterId, difficulty: meta.difficultyId } });
    this.summary = {
      runId: this.runId, characterId: meta.characterId, difficultyId: meta.difficultyId,
      startTime: this.startMs, endTime: 0, durationMs: 0, maxWave: 1, result: 'unknown',
      damageTaken: 0, healingReceived: 0, killTotal: 0, bossKillTotal: 0,
      goldEarned: 0, goldSpent: 0, finalHp: 0, finalMaxHp: 0,
    };
  }

  /** 续玩：沿用原 runId 的已有统计，不重新开一局 */
  resumeFrom(r: RunTelemetryRecord): void {
    try {
      this.startMs = r.summary.startTime || this.startMs;
      this.summary = { ...r.summary, endTime: 0, result: 'unknown', durationMs: 0 };
      this.waves = r.waves.map(w => ({ ...w }));
      this.endedWaves = new Set(this.waves.map(w => w.wave));
      this.skills.clear();
      for (const s of r.skills) this.skills.set(s.skillId, { ...s });
      this.modules.clear();
      for (const m of r.modules) this.modules.set(m.moduleId, { ...m, relatedSkillIds: m.relatedSkillIds.slice() });
      this.shop = {
        ...r.shop,
        displays: { ...r.shop.displays }, purchases: { ...r.shop.purchases },
        purchaseByKind: { ...r.shop.purchaseByKind },
      };
      this.perf = { ...r.performance };
      this.events = r.events.slice(-EVENT_CAP);
      this.eventSeq = this.events.reduce((m, e) => Math.max(m, e.eventId), 0);
      this.currentWave = Math.max(1, r.summary.maxWave || 1);
      this.waveStartMs = nowMs();
      this.completeness = 'partial';
      this.ended = false;
    } catch { /* ignore */ }
  }

  get isEnded(): boolean { return this.ended; }
  get wave(): number { return this.currentWave; }
  get eventCount(): number { return this.events.length; }
  /** 累计事件数（含已被环裁剪的） */
  get totalEventCount(): number { return this.eventTotal; }

  private elapsedMs(): number { return Math.max(0, nowMs() - this.startMs); }

  private push(type: string, data?: { sourceId?: string; targetId?: string; value?: number; extra?: Record<string, unknown> }): void {
    try {
      if (this.events.length >= EVENT_CAP) this.events.shift();
      this.eventSeq++;
      this.eventTotal++;
      this.events.push({
        eventId: this.eventSeq, runId: this.runId, timestamp: nowMs(),
        elapsedMs: this.elapsedMs(), wave: this.currentWave, type,
        sourceId: data?.sourceId, targetId: data?.targetId, value: data?.value, extra: data?.extra,
      });
    } catch { /* 遥测失败不影响战斗 */ }
  }

  private skill(id: string): SkillTelemetry {
    let s = this.skills.get(id);
    if (!s) {
      s = {
        skillId: id, castCount: 0, hitCount: 0, damageTotal: 0, damageAverage: 0,
        damageMax: 0, killCount: 0, firstCastTime: 0, lastCastTime: 0,
        moduleBonus: 0,
      };
      this.skills.set(id, s);
    }
    return s;
  }

  private module(id: string): ModuleTelemetry {
    let m = this.modules.get(id);
    if (!m) {
      m = {
        moduleId: id, acquireCount: 0, triggerCount: 0, damageTotal: 0,
        healTotal: 0, relatedSkillIds: [], firstTriggerTime: 0, lastTriggerTime: 0,
      };
      this.modules.set(id, m);
    }
    return m;
  }

  // ---------- 生命周期 ----------

  waveStart(wave: number): void {
    try {
      this.currentWave = Math.max(1, Math.floor(wave));
      this.waveStartMs = nowMs();
      this.waveSkillDamage = {};
      this.waveModuleTriggers = {};
      this.summary.maxWave = Math.max(this.summary.maxWave, this.currentWave);
      this.push('wave_start', { value: this.currentWave });
    } catch { /* ignore */ }
  }

  waveEnd(wave: number, d: {
    kills: number; damageTaken: number; healing: number;
    skillDamage?: Record<string, number>; moduleTriggers?: Record<string, number>;
    bossKilled?: boolean;
  }): void {
    try {
      const w = Math.max(1, Math.floor(wave));
      if (this.endedWaves.has(w)) return;
      this.endedWaves.add(w);
      const end = nowMs();
      this.waves.push({
        wave: w, startMs: this.waveStartMs, endMs: end,
        durationMs: Math.max(0, end - this.waveStartMs),
        kills: Math.max(0, d.kills | 0), damageTaken: Math.max(0, d.damageTaken || 0),
        healing: Math.max(0, d.healing || 0),
        skillDamage: d.skillDamage ?? { ...this.waveSkillDamage },
        moduleTriggers: d.moduleTriggers ?? { ...this.waveModuleTriggers },
        bossKilled: !!d.bossKilled,
        completed: true,
      });
      this.summary.maxWave = Math.max(this.summary.maxWave, w);
      this.push('wave_end', { value: w, extra: { kills: d.kills, damageTaken: d.damageTaken } });
    } catch { /* ignore */ }
  }

  end(result: RunResult, d: {
    durationMs?: number; finalHp?: number; finalMaxHp?: number;
    goldEarned?: number; goldSpent?: number; complete?: boolean;
  } = {}): void {
    try {
      if (this.ended) return;
      this.ended = true;
      this.endMs = nowMs();
      this.summary.endTime = this.endMs;
      this.summary.durationMs = Math.max(0, d.durationMs ?? (this.endMs - this.startMs));
      this.summary.result = result;
      this.summary.finalHp = Math.max(0, d.finalHp ?? 0);
      this.summary.finalMaxHp = Math.max(0, d.finalMaxHp ?? 0);
      this.summary.goldEarned = Math.max(0, d.goldEarned ?? 0);
      this.summary.goldSpent = Math.max(0, d.goldSpent ?? 0);
      this.completeness = d.complete === false ? 'partial' : 'complete';
      this.push('run_end', { extra: { result } });
    } catch { /* ignore */ }
  }

  markIncomplete(reason: string): void {
    try {
      if (this.ended) return;
      this.completeness = 'interrupted';
      if (this.missing.indexOf(reason) < 0) this.missing.push(reason);
      this.push('run_interrupted', { extra: { reason } });
    } catch { /* ignore */ }
  }

  // ---------- 技能 / 伤害 ----------

  cast(skillId: string, echo = false, relatedModule?: string): void {
    try {
      const s = this.skill(skillId || 'unknown');
      s.castCount++;
      if (!s.firstCastTime) s.firstCastTime = this.elapsedMs();
      s.lastCastTime = this.elapsedMs();
      this.push('skill_cast', { sourceId: skillId, extra: echo ? { echo: true } : undefined });
      if (relatedModule) this.moduleTrigger(relatedModule, skillId);
    } catch { /* ignore */ }
  }

  /** 一次命中：dmg 为最终伤害；moduleBonus 是已计算的加成增量（不并入 damageTotal） */
  hit(skillId: string, dmg: number, _kill = false, moduleBonus = 0, targetId?: string): void {
    try {
      if (!(dmg > 0) || !Number.isFinite(dmg)) return;
      const s = this.skill(skillId || 'unknown');
      s.hitCount++;
      s.damageTotal += dmg;
      if (dmg > s.damageMax) s.damageMax = dmg;
      s.damageAverage = s.hitCount > 0 ? s.damageTotal / s.hitCount : 0;
      if (moduleBonus > 0) s.moduleBonus += moduleBonus;
      const key = skillId || 'unknown';
      this.waveSkillDamage[key] = (this.waveSkillDamage[key] ?? 0) + dmg;
      this.push('skill_hit', { sourceId: key, targetId, value: dmg });
    } catch { /* ignore */ }
  }

  bossSpawn(): void { try { this.push('boss_spawn', { value: this.currentWave }); } catch { /* ignore */ } }
  bossDeath(): void { try { this.push('boss_death', { value: this.currentWave }); } catch { /* ignore */ } }

  kill(skillId?: string, boss = false): void {
    try {
      this.summary.killTotal++;
      if (boss) this.summary.bossKillTotal++;
      if (skillId) this.skill(skillId).killCount++;
      this.push('skill_kill', { sourceId: skillId, extra: boss ? { boss: true } : undefined });
    } catch { /* ignore */ }
  }

  // ---------- 黑科技 ----------

  moduleAcquire(id: string, skillIds: string[] = []): void {
    try {
      if (!id) return;
      const m = this.module(id);
      m.acquireCount++;
      for (const s of skillIds) if (s && m.relatedSkillIds.indexOf(s) < 0) m.relatedSkillIds.push(s);
      this.push('module_acquire', { sourceId: id });
    } catch { /* ignore */ }
  }

  moduleTrigger(id: string, skillId?: string): void {
    try {
      if (!id) return;
      const m = this.module(id);
      m.triggerCount++;
      const t = this.elapsedMs();
      if (!m.firstTriggerTime) m.firstTriggerTime = t;
      m.lastTriggerTime = t;
      if (skillId && m.relatedSkillIds.indexOf(skillId) < 0) m.relatedSkillIds.push(skillId);
      this.waveModuleTriggers[id] = (this.waveModuleTriggers[id] ?? 0) + 1;
      this.push('module_trigger', { sourceId: id, targetId: skillId });
    } catch { /* ignore */ }
  }

  moduleDamage(id: string, dmg: number, skillId?: string): void {
    try {
      if (!id || !(dmg > 0) || !Number.isFinite(dmg)) return;
      const m = this.module(id);
      m.damageTotal += dmg;
      this.moduleTrigger(id, skillId);
      this.push('module_damage', { sourceId: id, targetId: skillId, value: dmg });
    } catch { /* ignore */ }
  }

  moduleHeal(id: string, amount: number, skillId?: string): void {
    try {
      if (!id || !(amount > 0) || !Number.isFinite(amount)) return;
      const m = this.module(id);
      m.healTotal += amount;
      this.moduleTrigger(id, skillId);
      this.push('module_heal', { sourceId: id, targetId: skillId, value: amount });
    } catch { /* ignore */ }
  }

  // ---------- 玩家 ----------

  playerDamage(amount: number, source?: string): void {
    try {
      if (!(amount > 0) || !Number.isFinite(amount)) return;
      this.summary.damageTaken += amount;
      this.push('player_damage_taken', { sourceId: source, value: amount });
    } catch { /* ignore */ }
  }

  playerHeal(amount: number, source?: string): void {
    try {
      if (!(amount > 0) || !Number.isFinite(amount)) return;
      this.summary.healingReceived += amount;
      this.push('player_heal', { sourceId: source, value: amount });
      if (source && source !== 'regen' && source !== 'shop' && source !== 'waveclear') {
        this.moduleHeal(source, amount);
      }
    } catch { /* ignore */ }
  }

  // ---------- 商店 / 成长 ----------

  shopOpen(stock: { id: string; kind: string }[], gold: number): void {
    try {
      this.shop.enters++;
      this.shop.goldIn += Math.max(0, gold);
      this.shopDisplay(stock);
      this.push('shop_open', { value: stock.length, extra: { gold } });
    } catch { /* ignore */ }
  }

  /** 记录一次"货架展示"（进入商店 / 刷新后的新货架；锁定保留项不要重复计） */
  shopDisplay(stock: { id: string; kind: string }[]): void {
    try {
      for (const s of stock) {
        const key = s.kind + ':' + s.id;
        this.shop.displays[key] = (this.shop.displays[key] ?? 0) + 1;
      }
      this.push('shop_display', { value: stock.length });
    } catch { /* ignore */ }
  }

  shopPurchase(kind: string, id: string, price: number, goldBefore: number, goldAfter: number): void {
    try {
      const key = kind + ':' + id;
      this.shop.purchases[key] = (this.shop.purchases[key] ?? 0) + 1;
      this.shop.purchaseByKind[kind] = (this.shop.purchaseByKind[kind] ?? 0) + 1;
      if (kind === 'heal') this.shop.heals++;
      if (kind === 'attr') this.shop.attrs++;
      this.shop.goldOut += Math.max(0, goldBefore - goldAfter);
      this.push('item_purchase', { sourceId: id, value: price, extra: { kind, goldBefore, goldAfter } });
    } catch { /* ignore */ }
  }

  shopReroll(): void { try { this.shop.rerolls++; this.push('shop_reroll'); } catch { /* ignore */ } }
  shopLock(): void { try { this.shop.locks++; this.push('shop_lock'); } catch { /* ignore */ } }
  shopLeave(gold: number): void { try { this.push('shop_leave', { extra: { gold } }); } catch { /* ignore */ } }

  itemAcquire(id: string): void { try { this.push('item_acquire', { sourceId: id }); } catch { /* ignore */ } }

  levelUp(lv: number): void { try { this.push('level_up', { value: lv }); } catch { /* ignore */ } }
  upgradeSelect(kind: string, id: string, skipped = false): void {
    try { this.push('upgrade_select', { sourceId: id, extra: { kind, skipped } }); } catch { /* ignore */ }
  }

  // ---------- 性能 ----------

  performanceSample(s: { enemies: number; bullets: number; areas: number; eventsPerSec: number; updateMs: number; writeMs?: number }): void {
    try {
      this.perf.samples++;
      this.perf.peakEnemies = Math.max(this.perf.peakEnemies, s.enemies | 0);
      this.perf.peakBullets = Math.max(this.perf.peakBullets, s.bullets | 0);
      this.perf.peakAreas = Math.max(this.perf.peakAreas, s.areas | 0);
      this.perf.peakEventsPerSec = Math.max(this.perf.peakEventsPerSec, s.eventsPerSec | 0);
      this.perf.peakUpdateMs = Math.max(this.perf.peakUpdateMs, s.updateMs || 0);
      if (s.writeMs !== undefined) {
        this.perf.telemetryMsTotal += s.writeMs;
        this.perf.telemetryMsMax = Math.max(this.perf.telemetryMsMax, s.writeMs);
      }
      this.push('performance_sample', { value: s.updateMs, extra: { enemies: s.enemies, bullets: s.bullets } });
    } catch { /* ignore */ }
  }

  // ---------- 输出 ----------

  toRecord(): RunTelemetryRecord {
    const skills = Array.from(this.skills.values()).map(s => ({ ...s }));
    const modules = Array.from(this.modules.values()).map(m => ({ ...m, relatedSkillIds: m.relatedSkillIds.slice() })) as ModuleTelemetry[];
    const complete = this.completeness === 'complete' && !!this.summary.result && this.summary.result !== 'unknown';
    return {
      schemaVersion: this.schemaVersion,
      runId: this.runId,
      summary: { ...this.summary },
      waves: this.waves.map(w => ({ ...w })),
      skills,
      modules,
      shop: {
        ...this.shop,
        displays: { ...this.shop.displays },
        purchases: { ...this.shop.purchases },
        purchaseByKind: { ...this.shop.purchaseByKind },
      },
      performance: { ...this.perf },
      events: this.events.slice(),
      completeness: {
        complete,
        state: complete ? 'complete' : this.completeness,
        missingFields: this.missing.slice(),
        unsupportedMetrics: this.unsupported.slice(),
      },
    };
  }

  exportJson(): string {
    try { return JSON.stringify(this.toRecord(), null, 2); } catch { return '{}'; }
  }

  /** 事件数（性能/上限测试用） */
  get stats(): { events: number; skills: number; modules: number; waves: number } {
    return { events: this.events.length, skills: this.skills.size, modules: this.modules.size, waves: this.waves.length };
  }
}
