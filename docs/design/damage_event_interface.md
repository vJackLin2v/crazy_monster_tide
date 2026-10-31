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
  /** 返程序号：同一弹体第几次返程，用于 returnstrike 只触发一次 */
  returnIndex?: number;
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

## 5. 统一触发闸门（开发时必须只有一个入口）

    export function canTriggerModule(ctx: DamageContext, mod: ModuleRuntime): boolean {
      if (!ctx.canTriggerModules) return false;          // module / summon 来源
      if (!mod.allowedSources.includes(ctx.source)) return false;
      if (mod.cooldownLeft > 0) return false;            // 模块级 CD（如 shieldonhit 1.5s 全局）
      if (mod.usedInCast(ctx.castId) >= mod.maxPerCast) return false;  // 单次施法上限
      return true;
    }

每条模块只声明数据（allowedSources / cooldown / maxPerCast），不在 Battle 里各写一套 if。

## 6. 专注核心（focused）与 echo 的关系（v4 定稿）

- 专注核心是**技能伤害乘区**，对原始施法与 echo 重放**同样生效**（都算该技能的伤害）；
- 但 echo 重放**不计入** overcharge 施法次数、不计入任何"第 N 次施法"类计数；
- v2 里"重放不吃加成"的旧说法已作废：专注核心按技能伤害乘区，对重放同样生效；但重放不计入施法次数。


## 7. canTriggerModules 的赋值规则（v5 定稿）

**不允许调用方自由填写**，统一由伤害入口根据来源推导：

    function canSourceTriggerModules(src: DamageSource): boolean {
      return src !== "module" && src !== "summon";
    }

    function makeContext(src: DamageSource, castId: string, extra?: Partial<DamageContext>): DamageContext {
      return { source: src, canTriggerModules: canSourceTriggerModules(src), castId, isBoss: false, ...extra };
    }

- 调用方只能传 source/castId/projectileId/returnIndex/isBoss，**不能传 canTriggerModules**；
- 模块再用自己的 allowedSources 过滤（例如 M5 只接受 normal/split）；
- 特殊豁免（如未来允许某来源触发）必须走**白名单配置**，不得临时传 true。

## 8. M1 目标筛选流程（性能）

    1. 用范围查询取爆炸半径内候选敌人（不做全场排序）
    2. 候选 <= 60 → 全部处理
    3. 候选 > 60 → 只在候选中按距离取最近 60 只
    4. 仅对选中的 60 只执行伤害

禁止"每次爆炸遍历全场敌人再排序"。


## 9. summon 来源的结算细则（v6 定稿）

| 机制 | summon 是否触发 | 说明 |
|---|---|---|
| 伤害与击杀 | 是 | 正常扣血、正常击杀，计入玩家击杀总数 |
| Harvest（击杀回血） | **否** | 击杀事件中显式跳过，不允许"换个来源就算玩家击杀" |
| onhit 类模块 | 否（默认） | canTriggerModules = false |
| Vamp（吸血） | **是（例外）** | 通过 vamp x 哨兵的兼容规则生效，系数/频率由测试固定 |
| 击杀统计 / 成就 | 是 | 只统计，不产生回血 |

实现约定：击杀结算函数第一行判断来源；若来源为 summon 且事件为 harvest，直接 return，不做任何回血。
