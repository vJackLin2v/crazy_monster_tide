# M2-A.3 击杀来源审计表

> 目标：所有非即时伤害击杀显式传来源，禁止回退"最后释放技能"。

## killEnemy 调用审计

| 调用位置 | 伤害类型 | 来源参数 | 结果 |
|---|---|---|---|
| hitEnemy 命中结算 | 即时命中 | `telSid`（攻击对象自身/当前命中） | 归属技能 |
| applyRawDamage（雷击/反伤/模块） | 模块直接伤害 | `'unknown'` | 不污染技能 |
| updateEnemies DoT 结算 | 灼烧/中毒 | `dotTel`（DoT 保存来源） | 归属施加者 |
| 玩家受击刺猬反伤 | 黑科技反伤 | `'unknown'` | 不归属技能 |

## DoT 来源规则

- Enemy 新增 `burnTelSkill / poisonTelSkill`；
- 施加/刷新时记录**最新施加来源**（同一状态下后施加者覆盖，稳定且可解释）；
- 区域灼烧/毒雾使用区域创建时的 `telSkill`；
- 击杀时：
  - 仅一种 DoT → 该来源；
  - 同时存在 → 伤害更高的一层来源（`burnDmg >= poisonDmg` 取 burn，否则 poison）；
  - 旧存档/来源缺失 → `unknown`；
- 不改变 DoT 数值、持续时间、刷新与 tick 频率。

## killEnemy 回退

```ts
const killTel = telSkill ?? 'unknown';   // 不再使用 this.telSkillId
```

hitEnemy 的即时调用仍可用当前施法来源；延迟攻击均显式传 `telSkill`。

## 运行时验证

```json
{"burnRes":{"fireballKills":1,"iceKills":0},
 "thorn":{"iceKills":0,"unknownKills":1}}
{"chain":["fireball"],"split":["fireball"],"fireballHits":8}
```

- 火球挂灼烧、切冰晶矛后灼烧击杀：fireball 1 / ice 0；
- 刺猬反伤击杀：unknown 1 / ice 0；
- chain/split 模块归因 fireball。
