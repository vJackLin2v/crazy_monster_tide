# M2-A.3 击杀来源收尾报告

> 基线：M2-A.2 `c204240`（517 PASS）｜ 本轮：**519 PASS**
> 只修遥测来源，不改数值/RNG/玩法。

## 修复

1. DoT 来源：Enemy 增加 `burnTelSkill/poisonTelSkill`；施加/刷新记录来源；击杀传 `dotTel`；
2. 区域灼烧/毒雾：继承区域 `telSkill`；
3. 刺猬反伤击杀：显式 `unknown`；
4. `killEnemy` 缺省从 `this.telSkillId` 改为 `'unknown'`，非即时伤害不再回退最近施法；
5. 存档快照保存 DoT 来源（旧档缺失 → unknown）。

## 验证

- 519 PASS（原 517 + 2 条 unknown 击杀归属）；
- 浏览器：灼烧击杀 fireball 1/ice 0；刺猬 unknown 1/ice 0；chain/split relatedSkillIds=fireball；
- 微信构建成功；真机未验证。

## 未覆盖

模块乘区加成拆分、护盾减伤量、item_effect、续玩当前波实时累计、真机。
