# M2-B.3 UI/内容清理（2026-11-01）

## 1. 范围技能去重

- 移除重复的范围技能：`shockwave`（震荡波）、`thorn`（荆棘环）、`frostring`（寒冰环）。
- 仅保留 `frostnova`（霜爆）作为纯范围爆发。
- 同步移除 SKILLS/SKILL_ART 条目；技能总数 20 → 17。
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

## 5. 图标完全唯一

- 核对 Dungreed/Sephiria 外部素材后，采用本地未使用图标完成 12 组跨类重复拆分（不新增外部资源依赖）。
- 当前道具 / 黑科技 / 技能共 113 个图标，全部唯一。
- 新增全局断言：ITEM_ICON + MODULE_ICON + SKILLS 图标集合无重复。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 587 PASS / 0 FAIL
- 微信构建：3.14MB / 10.97MB；index.js 332,622 B（2026-11-01 20:20:40）
- 浏览器截图：HUD 无橙色条；商店标签只剩数值
