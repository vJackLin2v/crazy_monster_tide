# 冰系标签与冷却数值统一

## 修改

- Items.ts t_ice：tagBonus.ice 0.20 → 0.25（与其余 7 系一致）。
- Items.ts cdr_ice：tagCdr.ice 0.18 → 0.15（与 cdr_bolt 一致）。
- 描述未改（仍是“冰系技能更疼/转得更快”），由 itemNumbers 动态显示数值。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 578 PASS / 0 FAIL
  - 新增 2 条：冰河之心 +25%；寒霜碎片 -15%
- 微信构建：3.14MB / 10.97MB；index.js 333,546 B（2026-11-01 15:50:51）

## 影响

- 冰系标签道具实际加成 +20% → +25%；
- 冰系冷却道具 18% → 15%；
- 其余系别/道具未动。
