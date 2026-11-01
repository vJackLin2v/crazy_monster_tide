# 连锁/弹射辨识度修复

## 修改

- data/IconMap.ts：MODULE_ICON.chain 从 sh-multihits.png 改为 ui-thunder-core.png；multi 保留 sh-multihits.png。
- data/Modules.ts：
  - 连锁 desc：命中后跳击附近敌人并终结本弹体（每跳 70%）。
  - 弹射 desc：命中后转向附近另一只敌人继续飞（不终结，伤害递减）。
  - MODULE_NUMS.chain：跳 1 次 · 70% · 终结。
- game/ModuleText.ts：chain 精确文案加“终结”。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 558 PASS / 0 FAIL
- 新增：MODULE_ICON.chain !== MODULE_ICON.multi；连锁/弹射描述区分终结与续飞
- 微信构建：3.14MB / 10.97MB；index.js 333,480 B（2026-11-01 15:37:51）

## 说明

只改图标与描述，不改 chain/bounce 的伤害、跳数、概率或任何数值。
