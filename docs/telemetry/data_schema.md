# 数据 Schema（schemaVersion 1）

## 单局记录

```ts
interface RunTelemetryRecord {
  schemaVersion: 1;
  runId: string;
  summary: RunTelemetry;      // 对局总览
  waves: WaveTelemetry[];
  skills: SkillTelemetry[];
  modules: ModuleTelemetry[];
  shop: ShopTelemetry;
  performance: PerformanceTelemetry;
  events: TelemetryEvent[];   // 最近 300 条
  completeness: {
    complete: boolean;
    state: 'complete' | 'interrupted' | 'partial' | 'corrupted';
    missingFields: string[];
    unsupportedMetrics: string[];
  };
}
```

关键字段：

- `summary`：characterId/difficultyId/start/end/duration/maxWave/result/damageTaken/healing/killTotal/bossKillTotal/gold/finalHp/finalMaxHp；
- `waves[]`：wave/startMs/endMs/durationMs/kills/damageTaken/healing/skillDamage/moduleTriggers/bossKilled/completed；
- `skills[]`：cast/hit/damageTotal/damageAverage/damageMax/kill/trigger/moduleBonus/first/lastCast；
- `modules[]`：acquire/trigger/damage/heal/relatedSkillIds/first/last；
- `shop`：enters/displays/purchases（key = kind:id）/purchaseByKind/goldIn/goldOut/rerolls/locks/heals/attrs；
- `performance`：samples/peakEnemies/peakBullets/peakAreas/peakEventsPerSec/peakUpdateMs/telemetryMs。

## 存储

- key：`cmt_telemetry_v1`；最多 50 局；
- 写入时机：`GameRoot.finishRun` 一次；
- 同 runId 覆盖（续玩不新增）；
- 读取容错：JSON 损坏 → 空数组；旧 schema 记录保留可读（渲染层按字段缺失兜底）；
- 导出：`exportAllJson()` / `exportRunJson(runId)`。

## 完整性

- `complete`：finishRun 正常结束且有 result；
- `interrupted`：markIncomplete（异常/中断）；
- `partial`：未结束或状态缺失；
- 统计聚合 `aggregate()` 只使用 complete 记录。
