# 遥测架构

## 模块

```
game/telemetry/
├── TelemetryTypes.ts      # 纯类型 + schemaVersion
├── TelemetryRecorder.ts   # 单局聚合器（技能/黑科技/波次/商店/性能/事件环）
└── TelemetryStore.ts      # localStorage 读写、50 局裁剪、聚合、JSON 导出
ui/TelemetryScreen.ts      # DEBUG 构建的只读查看页（不常驻战斗 HUD）
```

## 接入点（实际代码）

| 位置 | 行为 |
|---|---|
| `GameRoot.startBattle` | 创建 Recorder，注入 `battle.telemetry` |
| `GameRoot.continueGame` | 同 runId 创建，并从 Store 读取旧记录 `resumeFrom` |
| `GameRoot.finishRun` | end + saveRecord（历史写失败不影响遥测；反之亦然） |
| `Battle.fireSkill` | `cast(skillId, echoReplay)` |
| `Battle.hitEnemy` | `hit(当前施法技能, 最终伤害)` |
| `Battle.killEnemy` | `kill(skill, boss)` / `bossDeath` |
| `Battle.healPlayer` | `playerHeal(实际治疗, 来源)` |
| 玩家受击 3 处 | `playerDamage(实际伤害, 来源)` |
| `Battle.startWave/finishWave` | `waveStart/waveEnd`（击杀/承伤/治疗/BOSS） |
| `Battle.update` 1Hz | `performanceSample`（敌/弹/区域/更新耗时） |
| `GameRoot` 商店 | `shopOpen/shopPurchase/shopReroll/shopLock` |
| `GameRoot` 升级 | `levelUp/upgradeSelect` |

## 不影响战斗的保证

1. Recorder 只读参数并累加，不写回战斗字段；
2. 不调用 `Rng`/`Math.random`（事件时间用 `Date.now`）；
3. 所有调用为可选链 `this.telemetry?.x()`；未接入/关闭时零调用；
4. Recorder 内部全部 try/catch，异常不冒泡；
5. 存储只在 `finishRun` 写一次；性能采样 1Hz；
6. 事件环上限 300，内存有界。

## 关闭方式

- 不创建 Recorder（`battle.telemetry = null`）即完全关闭；
- 或在 `GameRoot.startBattle/continueGame` 注释创建行；
- 关闭后战斗、RNG、存档逻辑不受影响（所有调用点均为可选）。
