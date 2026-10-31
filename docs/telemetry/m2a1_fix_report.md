# M2-A.1 遥测准确性补充修正报告

> 基线：M2-A `5eb4dc8`（503 PASS）｜ 本轮完成 commit 见交付包 ｜ 测试 **513 PASS / 0 FAIL**
> 未改变技能/怪物/难度/价格/回血/RNG/UI。

## 1. 技能伤害来源绑定

**问题**：hitEnemy 使用全局 `telSkillId`，延迟弹体可能归到后放的技能。

**修复**：
- `Bullet/Area/Meteor/trap/sentry/orbit/charge` 增加 `telSkill` 字段，在创建时从当前施法绑定；
- `hitEnemy(..., telSkill?)` 优先使用参数，其次才回退当前施法；
- 弹体/区域/地雷/哨兵/环刃/蓄能/陨石命中均传自身 `telSkill`；
- 分裂弹继承父弹体，chain 继承父弹体；
- 召唤物弹体无玩家技能来源 → `unknown`，不计入技能榜。

**验证**（浏览器真实运行）：火球弹体发射后把当前施法改为冰晶矛，延迟命中仍记 fireball：

```json
{"bulletTel":"fireball","fireballDamage":50,"iceDamage":0,"fireballHits":1}
```

## 2. 商店展示次数

- 新增 `TelemetryRecorder.shopDisplay(stock)`；
- 初次进入记录全部货架；
- 刷新成功后只记录 `!locked` 的新货架（锁定保留项不重复计）；
- 购买失败不增加分子；成功只加一次；
- 购买率 = 成功购买 / 展示次数。

测试：首次 4 件、刷新 4 件、锁定不重复、同商品多次展示累加、失败购买不计。

## 3. eventsPerSec

- Recorder 新增独立累计计数 `eventTotal` / `totalEventCount`，事件环裁剪不影响；
- Battle 性能采样改用 `totalEventCount` 差值；
- 事件环仍 ≤300。

测试：400 次事件后环=300、累计=401+；重建 Recorder 计数归零。

## 4. 波次技能/黑科技统计

- Recorder 在 `waveStart` 重置 `waveSkillDamage/waveModuleTriggers`；
- `hit` 累加当前波技能伤害；`moduleTrigger` 累加当前波触发；
- `waveEnd` 未显式传参时使用内部累计；
- 同一波重复 `waveEnd` 被 `endedWaves` 去重；
- 下一波自动清零；续玩保留历史 waves 数组，但当前波实时数据无法恢复（已记录）。

测试：多技能分别累计、同技能多次累加、触发计数、下一波独立、重复调用不重复。

## 5. triggerCount

- 确认没有独立的“技能触发”概念；
- 从 `SkillTelemetry` 删除该字段（schemaVersion 2），避免恒 0 被误读；
- 文档同步更新。

## 修改文件

| 文件 | 说明 |
|---|---|
| `battle/Battle.ts` | 攻击对象 telSkill 绑定；hitEnemy/killEnemy 来源参数；波次/性能计数 |
| `GameRoot.ts` | 刷新后 shopDisplay |
| `game/telemetry/TelemetryTypes.ts` | schemaVersion 2；移除 triggerCount |
| `game/telemetry/TelemetryRecorder.ts` | 事件累计、波次统计、shopDisplay、续玩/resume |
| `tests/run.ts` | 新增 10 条 M2-A.1 断言 |
| `docs/telemetry/` | 架构/事件/数据/测试/限制同步 |

## 仍未支持

- 模块乘区加成（shatter/emberstack/execute）未拆成 module_damage；
- 护盾减伤量、item_effect、控制持续时间；
- 召唤物/无技能来源弹体归为 unknown；
- 续玩当前波实时累计无法恢复；
- 真机未验证。
