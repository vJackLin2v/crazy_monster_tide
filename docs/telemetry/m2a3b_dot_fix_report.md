# M2-A.3b DoT 来源边界补充修复

> 基线：M2-A.3 `e16d994`（519 PASS）｜ 本轮：**525 PASS**
> 只修 DoT 来源选择，不改伤害/持续时间/刷新/tick/RNG。

## 问题

旧逻辑在 burn 分支中用 `burnDmg >= poisonDmg` 比较，即使 poison 已结束，
残留的 `poisonDmg` 仍可能阻止 burn 来源被选中，导致击杀归 unknown/错误来源。

## 修复

新增纯函数 `pickDotSource`：

- 先记录本次 tick 的 `poisonActive/burnActive`（在扣减持续时间之前）；
- 仅 poison 生效 → poison 来源；
- 仅 burn 生效 → burn 来源；
- 两者生效 → 高伤害层来源（相等取 burn）；
- 已结束 DoT 的残留 dmg 不参与；
- 缺失 → unknown。

Battle 的 DoT 结算使用该函数；DoT 数值、持续时间、刷新、tick 频率完全不变。

## 测试

单元（6 条）：poison 结束/burn 结束/两者高伤害层/来源缺失/无生效 DoT。

浏览器真实战斗：

```json
{"fireballKills":1,"iceKills":1,"unknownKills":1}
```

- e0：poison 已结束但 poisonDmg=999，burn 有效 → 击杀归 fireball；
- e1：burn 已结束但 burnDmg=999，poison 有效 → 击杀归 ice；
- e2：两者有效但无来源 → unknown。

## 修改文件

- `game/telemetry/DotAttribution.ts`（新增纯函数）
- `battle/Battle.ts`（DoT 结算使用 active 标志 + pickDotSource）
- `cocos/tests/run.ts`（+6 条）
- `docs/telemetry/m2a3_kill_audit.md` / test_report
