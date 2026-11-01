# 黑科技共鸣描述与实现统一

## 修改

- Items.ts resonator desc：
  - 原：“同一技能装了 2 个同类黑科技时，该技能伤害 +20%”
  - 新：“同一技能装了 2 个相同触发时机（Hook）的黑科技时，该技能伤害 +20%”
- 实现未改：Battle 仍按 MODULE_HOOKS 的同 Hook 计数触发；resonatorMul 仍为 1.20。
- 目的：让文案与 sameHookPairs/同 Hook 判定一致，不误导玩家按“同类模块”搭配。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 585 PASS / 0 FAIL
  - 新增共鸣器描述一致性断言
- 微信构建：3.14MB / 10.98MB；index.js 334,112 B（2026-11-01 16:09:27）

## 未处理

- 卡片还未显示每个模块的 Hook 标签；当前用“相同触发时机（Hook）”说明。
- 未改数值/触发规则。
