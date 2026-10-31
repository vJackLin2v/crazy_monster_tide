# 事件字典

| type | 采集位置 | 关键字段 | 说明 |
|---|---|---|---|
| run_start | Recorder 构造 | sourceId/extra | 每局一次（续玩不重建） |
| run_end | GameRoot.finishRun | extra.result | 只结算一次（ended 守卫） |
| run_interrupted | markIncomplete | extra.reason | 异常/中断（本局 completeness 非 complete） |
| wave_start | Battle.startWave | value=wave | 与 wave_end 配对 |
| wave_end | Battle.finishWave | extra.kills/damageTaken | 波次聚合 |
| skill_cast | Battle.fireSkill | sourceId=skillId | echo 在 extra.echo=true |
| skill_hit | Battle.hitEnemy | value=最终伤害 | 一次命中一条（事件环内） |
| skill_kill | Battle.killEnemy | sourceId=skill, extra.boss | 击杀归属攻击对象自身来源 |
| module_acquire | GameRoot 升级/商店 | sourceId=moduleId | 获得黑科技 |
| module_trigger | 各模块触发点 | sourceId/targetId | echo/split/chain/thunder/voltloop/killblast/lingering/shield/execute 等 |
| module_damage | 模块直接伤害 | value | killblast/voltloop 等（不并入技能伤害） |
| module_heal | playerHeal 来源为模块 | value | vamp/harvest 由玩家治疗入口反推 |
| shop_display | shopOpen / 刷新成功后 | value=展示数 | 刷新后只记非锁定新货架 |
| item_purchase | 商店购买 | value=price | 含 kind |
| item_acquire | 升级拿道具 | sourceId=itemId | — |
| player_damage_taken | 受击 3 处 | value/来源 | 弹幕/BOSS 砸地/近战 |
| player_heal | Battle.healPlayer / 波末 / 商店 | value/来源 | 实际治疗量 |
| boss_spawn / boss_death | Battle.startWave/killEnemy | value=wave | 仅 BOSS |
| level_up | GameRoot.showLevelUp | value=lv | — |
| upgrade_select | GameRoot.pickReward | extra.kind/skipped | — |
| performance_sample | Battle.update 1Hz | value=updateMs | 敌/弹/区域数量 |

## 聚合口径

- `skill_cast`：一次 fireSkill（echo 单独标记，不增加蓄势计数）；
- `skill_hit`：一次 hitEnemy 结算（同一弹体多目标会多次）；
- `skill_damage`：由 `skill_hit.value` 汇总，不单独发事件；
- `module_damage` 不计入技能 damageTotal，避免二次统计。
