# M2-A.2 来源归因闭环修复报告

> 基线：M2-A.1 `b03cc9f`（513 PASS）｜ 本轮：**517 PASS**
> 仅修遥测来源，不改技能/伤害/RNG/商店/回血/UI。

## 修复

1. **hitEnemy 内部模块**：execute / voltloop / lingering / shieldonhit / thunder 全部改用 `telSid`（当前命中来源），不再用全局 `this.telSkillId`；
2. **lingering 区域**：`spawnArea(..., telSid)`，区域自身 `telSkill` 继承父攻击；
3. **thunder 递归**：递归 `hitEnemy(..., telSid)`；
4. **killblast**：使用 `killTel`（killEnemy 传入来源）；模块直接击杀 `applyRawDamage` 标 `unknown`；
5. **chain / split**：模块触发与子攻击使用 `b.telSkill`，继承父弹体；
6. **echo**：cast/echo 记录当前技能（本身即时，正确）。

## 验证

单元 517 PASS，新增：

- execute/voltloop/lingering 触发与伤害携带父技能；
- unknown 来源保留；
- 波次/商店/事件计数回归；
- 延迟弹体浏览器：fireball 50 / ice 0；
- lingering 浏览器：area.telSkill=fireball，fireball 伤害 63、ice 0，lingering/execute relatedSkillIds=['fireball']。

## 未覆盖

- chain/split 的浏览器运行时断言（代码继承，单测间接）；
- 模块乘区加成拆分、护盾减伤、item_effect、续玩当前波累计、真机。

详见 `m2a2_attribution_audit.md`。
