# 伤害事件系统接口设计（damage_event_interface）

> 开发前必须先落这个接口，否则六个模块的触发规则会散落在 Battle.ts 各处，无法保证一致。

## 1. 数据结构

```ts
export type DamageSource =
  | 'normal'   // 技能本体
  | 'split'    // 分裂衍生弹
  | 'echo'     // 复读重放
  | 'chain'    // 连锁跳
  | 'module'   // 黑科技产生的额外伤害
  | 'summon';  // 召唤物

export interface DamageContext {
  source: DamageSource;
  /** 是否允许触发黑科技（由来源 + 模块规则共同决定） */
  canTriggerModules: boolean;
  /** 原始施法 id：同一次施法产生的所有弹体共享 */
  castId: string;
  /** 弹体 id：用于"同一弹体同一次返程只触发一次" */
  projectileId?: string;
  /** 目标是否 BOSS：处决等模块据此分支 */
  isBoss: boolean;
}
```

## 2. 来源 → 是否可触发模块（默认矩阵）

| source | 可触发 onhit 模块 | 说明 |
|---|---|---|
| normal | 是 | 技能本体 |
| split | 按模块（默认**是**，但有次数上限） | 分裂弹是"真实命中" |
| echo | 按模块（默认**是**，但不计入蓄势/连击计数） | 重放能造成伤害，但不能攒计数 |
| chain | 是（受模块 CD 约束） | 连锁命中算真实命中 |
| module | **否** | 可扣血/击杀/施加状态，但不触发模块 |
| summon | **否**（默认） | 召唤物不触发玩家模块 |

## 3. 调用约定

- `dealDamage(enemy, amount, ctx)`：所有伤害必须走这个入口，`ctx` 必填；
- 模块内部产生伤害时，必须构造 `{ source: "module", canTriggerModules: false, ... }`；
- **不得继承触发者的 ctx**（这是 M1 反复出错的地方：爆炸不能因为由普通击杀触发就继承 normal）；
- `castId` 在 `fireSkill` 入口生成一次，向下所有弹体/连锁/分裂继承；
- `projectileId` 在 spawnBullet 时生成，返程序号 `returnIndex` 另存；
- 蓄势计数只认 `castId` 的新值，同 castId 重复调用不递增。

## 4. 单元测试要求（开发时）

1. module 伤害击杀敌人 → 不触发 killblast；
2. 一次施法 5 枚分裂弹 → overcharge 只 +1；
3. echo 重放 → overcharge 不增加；
4. 同一弹体返程命中 2 只敌人 → returnstrike 只结算 1 次；
5. 连锁 3 跳 → shieldonhit 受 1.5s CD 限制，最多 1 次；
6. 区域伤害（lingering）击杀敌人 → 不触发 killblast。