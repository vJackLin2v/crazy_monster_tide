# M2-A.2 技能来源归因审计表

> 目标：确保延迟攻击/命中内部模块使用**父攻击自身来源**，不再依赖全局最后施法。

## 1. hitEnemy 内部模块

| 模块 | 位置 | 修复前 | 修复后 |
|---|---|---|---|
| execute | hitEnemy | `this.telSkillId` | `telSid`（当前命中来源） |
| voltloop | hitEnemy | `this.telSkillId` | `telSid` |
| lingering | hitEnemy | `this.telSkillId` | `telSid`，且创建区域传 `telSid` |
| shieldonhit | hitEnemy | `this.telSkillId` | `telSid` |
| thunder | hitEnemy | `this.telSkillId` | `telSid`，递归伤害传 `telSid` |
| killblast | killEnemy | `this.telSkillId` | `killTel`（传入来源或 unknown） |

## 2. 延迟攻击来源

| 对象 | 创建 | 命中读取 | 继承 |
|---|---|---|---|
| 普通弹体 | spawnBullet | b.telSkill | 创建时绑定当前施法 |
| 分裂弹 | 命中 b 时 spawnBullet | 子弹 telSkill | 继承 b.telSkill |
| chain | 命中 b 时 hitEnemy | 传 b.telSkill | 继承弹体 |
| echo | fireSkill(echoReplay) | cast/模块 echo | 当前 skill 正确 |
| 区域（zone/pulse） | spawnArea | a.telSkill | 显式参数或创建时当前 |
| lingering 区域 | hitEnemy 内 spawnArea | a.telSkill | 传 telSid |
| 陨石 | castMeteor | m.telSkill → spawnArea | 创建时绑定 |
| 地雷 | traps 创建 | tr.telSkill | 创建时绑定 |
| 哨兵弹 | sentry 射击 | spawnBullet 传 sn.telSkill | 继承召唤技能 |
| 环刃 | orbits 创建 | o.telSkill | 创建时绑定 |
| 蓄能 | charges 创建 | c.telSkill | 创建时绑定 |
| 模块直接击杀 | applyRawDamage | killEnemy telSkill='unknown' | 不归到技能 |

## 3. 仍使用全局的位置（均为即时创建，非延迟命中）

- `fireSkill`：记录 cast/echo；
- `spawnBullet` / `spawnArea` 默认回退：仅在即时调用未显式传来源时使用；
- `castMeteor`、traps/sentries/orbits/charges 创建：绑定当时的施法。

## 4. 验证

- 单元（513→517）：模块触发/伤害携带父技能、unknown 保留；
- 浏览器运行时：
  - 延迟弹体：fireball 50 / ice 0；
  - lingering 区域：area.telSkill=fireball，fireball 伤害 63、ice 0，lingering/execute relatedSkillIds=['fireball']；
- 未做：chain/split 的浏览器运行时断言（代码继承与单测间接覆盖，列入 known limitations）。
