# 金币转攻击（greed）实装与文档数量修正

## 发现

greed 描述承诺“金币 +25%”，但 apply 为空，实际只有攻击加成 hook，没有金币倍率；GREED_GOLD_MUL 常量未被使用。

## 修改

- Items.ts greed.apply：`s.greed += 0.25`。
  - 击杀金币与波末金币都走 RunState 的 greed 加成，现在实际 +25%。
  - 攻击加成仍由 greedPowerBonus 运行时处理。
- Items.ts 头注释：70 → 79（51 普通 / 24 高级 / 4 传说）。
- Skills.ts 头注释：16 → 20（当前实际）。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 587 PASS / 0 FAIL
  - 新增：greed apply 后 stats.greed=0.25；击杀 100 金币 → 125
- 微信构建：3.14MB / 10.98MB；index.js 334,125 B（2026-11-01 16:14:25）

## 未处理

- docs/assets/item_audit_20261101.md 的旧审计表未重新生成；
- 卡片 Hook 标签未做。
