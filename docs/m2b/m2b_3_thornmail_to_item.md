# 反伤黑科技移除、改由 thorncoat 道具承载

## 结论

- 删除黑科技 thornmail（反伤），不再进入 MODULES/MODULE_IDS/MODULE_HOOKS/图标/商店/奖励/合成。
- 反伤由现有道具 thorncoat（受击反伤 12 点，0.5s CD，移速 -6%）承载，不新增重复道具。
- RUN_SAVE_VERSION 1 → 2；旧存档按“版本过旧”拒绝。用户已确认旧存档可直接删除。

## 修改

- data/Modules.ts：移除 thornmail 定义、MODULE_NUMS、MODULE_HOOKS、相关注释。
- data/IconMap.ts：移除 MODULE_ICON.thornmail。
- game/SkillCalc.ts：移除 NEW_SKILL_ALLOW 中的 thornmail、SkillRuntime.thornmail、calcSkill 分支与返回字段。
- game/ModuleText.ts：移除 thornmail 文案分支。
- game/ModuleValues.ts：移除 THORNMAIL_BASE / thornmailBack。
- battle/Battle.ts：移除 thornEffect、反伤结算块、thornmailBack import、两处 SkillRuntime 字段。
- game/RunSave.ts：RUN_SAVE_VERSION = 2。
- tests/run.ts：移除旧反伤模块断言，新增“反伤黑科技已移除，由 thorncoat 承载”；矩阵 18×4 → 17×4。

## 保留

- 道具 thorncoat：12 点 / 0.5s CD / 移速 -6%，运行时仍走 tryThorncoat。
- 不改变任何技能/道具数值定义；仅删除一个不应作为黑科技的载体。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = 556 PASS / 0 FAIL
- 微信构建 success：3.14MB / 10.97MB；index.js 333,422 B（2026-11-01 15:31:56）

## 未处理

- 图标/描述区分（chain/bounce 等）未动；
- XLSX 其他 P2-P14 未动。
