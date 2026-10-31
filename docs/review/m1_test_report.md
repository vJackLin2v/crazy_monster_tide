# M1 测试报告（m1_test_report）

> 日期：2026-10-31 ｜ 引擎：Cocos Creator 3.8.6 ｜ 微信包 3.11MB / 10.95MB
> 结论：**447 PASS / 0 FAIL**（基线 435 + 新增 12）；tsc 双配置 0；微信构建成功。
> **未做微信真机测试**；浏览器边界测试见 §4。

## 1. 实际执行命令

```bash
cd cocos
node <ts> -p tsconfig.check.json
node <ts> -p tsconfig.ui-check.json
node <tsx> tests/run.ts
```

（完整命令与环境见 `test_reports/m1_test_execution.log`）

## 2. 结果

| 项 | 结果 |
|---|---|
| tsc check | EXIT=0 |
| tsc ui-check | EXIT=0 |
| 单元测试 | **447 PASS / 0 FAIL / 0 SKIP** |
| 微信构建 | success；主包 3.11MB / 总计 10.95MB；index.js 308,431 B（21:04:52） |
| 真机 | **未执行** |

回归：原 435 条断言全部通过，无删除/弱化原断言。

## 3. 新增测试（tests/run.ts §25）

1. 属性吸血走统一入口，且受 5HP/s 硬上限；
2. 回血记账到 `RunState.healSpent`；
3. 同一秒多次回血总和 ≤ 硬上限；
4. 满血不再增加生命；
5. 治疗量按最大生命截断；
6. NaN / Infinity / 负数不回血；
7. 异常输入后生命仍为有限数；
8. 跨秒前同窗口受预算限制；
9. 跨秒后预算窗口重置；
10. 商店瞬时治疗 40 生效且不占战斗预算；
11. 存档恢复后同秒沿用 spent（预算不重置）；
12. 存档恢复后跨秒开启新窗口。

## 4. 浏览器边界测试（真实运行）

脚本：`tools/ui/test_m1_boundaries.cjs`

```json
{"deathDuringLevelup":{"phase":"result","levelup":false,"result":true},
 "afterFirst":{"phase":"levelup","paused":true,"pending":1,"levelup":true},
 "afterSecond":{"phase":"battle","paused":false,"pending":0,"levelup":false},
 "installReturn":{"phase":"battle","paused":false,"pending":0}}
```

覆盖：

- 升级弹窗期间死亡/结算 → 结算页出现，升级弹窗关闭；
- 连续升级 → 第一次后仍弹第二张，第二次后恢复；
- 黑科技安装屏返回 → phase=battle、paused=false。

## 5. 代码审计（静态）

- 玩家 HP 直接写入扫描（`stats.hp`）：
  - 保留：`startRun` 初始生命、`startWave` 第 2 波起回满（规则，不是 heal）、最大生命成长同步加当前生命；
  - 已改：属性吸血、击杀回血属性、自然恢复、波末恢复、商店治疗全部走 `RunState.heal`。
- 隐藏黑科技：6 个均不在 `MODULES`，奖励池/商店池使用 `Object.keys(MODULES)`，无其他发放路径；
- 范围公式：`area` 在 `SkillCalc` 中乘了两次，未改，列入 M2（详见 `m1_change_report.md`）。

## 6. 未验证 / 风险

- 微信真机、切后台、暂停恢复未实测；
- 存档恢复的预算延续仅在纯逻辑层测试，未在真机走完整续玩；
- `area` 双乘、隐藏模块死代码、`noHealInShop` / `lockCostPerLock` 未实现等列 M2；
- 未改任何数值/难度/价格/UI。
