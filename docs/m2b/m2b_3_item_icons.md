# 道具图标分组修复

## 修复组

| 组 | 处理 |
|---|---|
| 生命护符 / 生命之泉 / 受击反伤 | 生命护符保留 sh-heart；生命之泉 → relic-042；受击反伤 → sk-guardshield |
| 铁胸甲 / 龟甲片 / 破冰增伤 | 铁胸甲保留 sh-shield；龟甲片 → relic-017；破冰增伤 → relic-024 |
| 金币袋 / 贪婪金杯 | 金币袋保留 gold-bag；贪婪金杯 → relic-015 |
| 龙鳞甲 / 守护圣盾 | 龙鳞甲保留 sh-blockshield；守护圣盾 → relic-055 |
| 血牙 / 血契 | 血牙保留 sh-blood；血契 → relic-026 |
| 苔藓苔 / 急救包 | 苔藓苔保留 sh-cross；急救包 → relic-045 |
| 铁匠手套 / 铁拳套 | 铁匠手套保留 sh-fist；铁拳套 → relic-046 |
| 时之沙 / 时之轮 | 时之沙保留 sh-hourglass；时之轮 → relic-018 |
| 吸尘器 / 吸铁石 | 吸尘器保留 ui-essence；吸铁石 → ui-magnet-core |
| 迅捷护符 / 疾风长靴 | 迅捷护符保留 up-speed；疾风长靴 → relic-053 |
| 破甲锥 / 穿甲尖 | 破甲锥保留 w-thrust；穿甲尖 → relic-020 |
| 冰系标签 / 冰冷却 | t_ice 保留 sh-ice；cdr_ice → relic-036 |
| 余烬核心 / 火系标签 | t_fire 保留 sh-fire；emberstack → relic-033 |
| 低血强化 / 收割者 | 收割者保留 sh-execute；lastbreath → relic-038 |

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 576 PASS / 0 FAIL（+14 条图标分组断言）
- 微信构建：3.14MB / 10.97MB；index.js 333,545 B（2026-11-01 15:48:33）
- 未做微信真机视觉确认

## 未处理

- 仍存在跨类“道具↔黑科技”图标（已用黑科技青色底框区分）；
- 道具↔技能 1 组（追风矢 / 灵能箭）未换；
- 其余 P2-P14 数值/技能定位/文档问题未动。
