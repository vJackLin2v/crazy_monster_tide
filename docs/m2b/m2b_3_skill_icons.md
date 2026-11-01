# 技能重复图标修复

## 改动

| 组 | 原图标 | 改动 |
|---|---|---|
| 环刃 / 乱杀 | skill-whirlwind.png | 环刃 → sk-ring.png；乱杀 → sh-swordplus.png |
| 奥术飞弹 / 哨戒哨兵 | skill-arcane_missile.png | 哨戒哨兵 → skill-arcane_turret.png |
| 地雷阵 / 扎心 | skill-flame_field.png | 地雷阵 → skill-flame_bomb.png；扎心 → sh-earthquake.png |
| 蓄能脉冲 / 雷球 | skill-thunder_beam.png | 雷球 → skill-arcane_pulse.png |

SKILLS 与 SKILL_ART 两处 icon 同步修改；新图标均为原本未使用资源。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 562 PASS / 0 FAIL（+4 条图标唯一性断言）
- 微信构建：3.14MB / 10.97MB；index.js 333,531 B（2026-11-01 15:45:01）
- 未做微信真机视觉确认

## 未处理

- 道具 27 件共用 14 图标；
- 冰系/冷却数值、技能定位、tier/文档问题。
