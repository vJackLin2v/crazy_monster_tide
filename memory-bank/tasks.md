# 当前任务

## 当前阶段

**阶段3（2026-10-31）内容扩展 + 难度系统（已完成开发，等真机复测）**
- 伤害事件：game/DamageContext.ts（来源推导 canTriggerModules、canHarvest/canVamp、ModuleUsage 闸门）；
- 黑科技 M1–M6：溢出爆裂 / 残影护盾 / 处决 / 返程斩 / 焚烧地带 / 蓄势（数值表 game/ModuleValues.ts）；
- 难度：五档 data/Difficulties.ts（普通=基准、回血预算 null）、BOSS 召唤状态机 game/BossSummon.ts、
  难度页 ui/DifficultyScreens.ts（视觉 40 / 热区 44）、通关解锁、结算显示难度；
- 新技能：ring_blade / mine_field / sentry / charge_pulse（各带实体上限与来源规则）+ 黑科技白名单；
- 新道具 10 件 + game/SpecialItems.ts（专注核心伤害/冷却、碎冰、落雷追加、刷新省钱、低血强化、
  金币转攻击、共鸣、余烬、反伤）；
- UI：ui/ModalList.ts（安装屏背包 + 商店已有道具滚动）、结算布局重排、命名去梗、BOSS 通关先结算；
- 数值：怪少而强（间隔 .92 / 批量 2 / 同屏 24~34 / HP 成长 .34）、波时 22~46s、商店涨价加速、
  回血上限 5HP/s、吸血 2%、每波回血 6%、击退 26→12、5 波起每 2 波精英；
- 测试 264 PASS / 0 FAIL；tsc 双配置 0；微信包 3.06MB / 10.89MB。
- 构建只认 build-wechat.bat -nopause（直接调 CocosCreator CLI 会静默不产出）。

