# 天火之心稀有度对齐

## 修改

- Items.ts aoe_x：tier 2 → tier 3；效果不变（范围伤害 +40%）。
- 目的：修复 workbook P11 的“tier2 强度高于部分 tier3”倒挂，而不是改数值。

## 结果

- 普通 51、高级 24、传说 4（合计 79）。
- 天火之心进入 tier3 池，仍是范围伤害 +40%。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 584 PASS / 0 FAIL
  - 新增：tier2=24、tier3=4、aoe_x.tier===3
- 微信构建：3.14MB / 10.98MB；index.js 334,087 B（2026-11-01 16:07:33）
