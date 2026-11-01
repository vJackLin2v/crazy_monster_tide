# 霜爆 / 寒冰环定位拆分

## 定位

| 技能 | 定位 | 自带减速 | 对减速目标 |
|---|---|---|---|
| 寒冰环 frostring | 近身高频控制 | 是：35%（BOSS 30%），1.2s | — |
| 霜爆 frostnova | 大范围冰爆 | 否 | 伤害 ×1.5 |

## 修改

- Skills.ts：
  - 寒冰环描述加“减速敌人”；
  - 霜爆 tags 从 ice/area/pulse/slow 改为 ice/area/pulse/burst；
  - 霜爆描述改为“对减速目标伤害更高”。
- SkillRules.ts：
  - 新增 FROSTRING_SLOW_PCT=0.35、FROSTRING_SLOW_DURATION=1.2；
  - frostringSlowPct(isBoss)：BOSS 30%；
  - FROSTNOVA_BURST_MUL=1.5；frostnovaDamage(base, slowed)。
- Battle.ts：
  - pulse 生成时记录技能 id 到 area.tag；
  - 寒冰环命中后施加/刷新自身减速（不覆盖更强减速）；
  - 霜爆命中时若目标 slow>0，使用 frostnovaDamage 结算 ×1.5。

未改其他技能规则，未改任何基础伤害/冷却/范围。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 582 PASS / 0 FAIL
  - 新增：霜爆对减速目标 1.5x；寒冰环 35%/BOSS 30%；两者标签/描述区分
- 浏览器运行时（debug web）确认寒冰环使敌人减速（slow 计时 >0，slowPct=0.35）
- 微信构建：3.14MB / 10.98MB；index.js 334,087 B（2026-11-01 15:55:22）
- 未做微信真机视觉确认

## 待观察

- 霜爆 1.5x 是初始设计值，需受控测试/实战确认；
- 霜爆不再自带减速，单独携带时控制力下降，这是定位取舍；
- frost 模块仍可给任何技能附加减速，属于玩家主动构筑。
