# M2-B.3 UI/内容清理（2026-11-01）

## 1. 范围技能去重

- 移除重复的自中心范围伤害技能：`shockwave`（震荡波）、`thorn`（荆棘环）。
- 保留：
  - `frostnova`（霜爆）：唯一纯范围爆发；
  - `frostring`（寒冰环）：近身控制/减速，不再算第二个纯 AoE 爆发。
- 同步移除 SKILLS/SKILL_ART 条目；技能总数 20 → 18。
- 未改保留技能的伤害/冷却/范围。

## 2. 商店“需要xxx”描述

- 移除 `moduleRequiresHint` 在商店卡片中的调用。
- 商店模块卡只显示 `moduleDetailText` 数值，不再出现“需要：投射物/…”或“暂无兼容…”长提示。
- 商品池、购买规则、库存、价格全部不变。

## 3. 金币下方橙色条

- 根因是 HUD 的 `waveBar`（波次进度条）虽设为 inactive 的旧代码/残留，运行时仍出现。
- 直接删除 `waveBarNode` / `waveBar` 字段与创建逻辑，彻底移除。
- 浏览器 HUD 截图确认橙色条消失：`deliverables/hud_current.png`。

## 4. 陨石竖直下落

- `updateMeteors` 中给陨石节点设置 `angle = 90`，火焰拖尾同样设 90°。
- 目标仍是 `fromY = y - 320` 落到 `y` 的垂直轨迹。
- 未改伤害/范围/落点。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 588 PASS / 0 FAIL
- 微信构建：3.14MB / 10.97MB；index.js 333,242 B（2026-11-01 20:00:38）
- 浏览器截图：HUD 无橙色条；商店标签只剩数值
