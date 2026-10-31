# 伤害事件系统接口设计（damage_event_interface · v7 定稿）

> 唯一实现：`cocos/assets/scripts/game/DamageContext.ts`
> 唯一入口：`Battle.hitEnemy`（伤害）/ `Battle.killEnemy`（击杀结算）
> 状态：**已实现**，并由 `tests/run.ts` §5n / §7 覆盖。

## 1. 数据结构（v7）

```ts
export type DamageSource = 'normal' | 'split' | 'echo' | 'chain' | 'module' | 'summon';
/** 召唤物种类：只有哨兵享受 vamp 例外 */
export type SummonKind = 'sentry';

export interface DamageContext {
  readonly source: DamageSource;
  readonly canTriggerModules: boolean;   // 由来源推导
  readonly canHarvest: boolean;          // 由来源推导（独立）
  readonly canVamp: boolean;             // 由来源 + summonKind 推导（独立）
  readonly castId: string;
  readonly projectileId?: string;
  readonly returnIndex?: number;
  readonly isBoss: boolean;
  readonly summonKind?: SummonKind;
}
```

## 2. 派生权限（唯一计算处：`makeDamageContext`）

| 函数 | 规则 | 说明 |
|---|---|---|
| `canSourceTriggerModules(src)` | `src !== 'module' && src !== 'summon'` | module 不递归；召唤物不触发玩家 onhit |
| `canSourceHarvest(src)` | `src !== 'summon'` | 召唤物击杀**不触发** harvest（但计入总击杀数） |
| `canSourceVamp(src, summonKind)` | module → false；summon → `summonKind === 'sentry'`；其余 → true | 哨兵例外是**显式**的，普通召唤物不会误继承 |

- 调用方参数类型是 `DamageContextInput`，**不包含**三个 `can*` 字段；
- 工厂返回 `Object.freeze(...)`，运行期也改不了；
- 伪造（如 `{ canTriggerModules: true } as never`）会被覆盖，测试 §7 有断言。

## 3. 来源 → 默认矩阵

| source | 触发 onhit 模块 | 击杀回血 harvest | 吸血 vamp |
|---|---|---|---|
| normal | 是 | 是 | 是 |
| split | 是（受模块上限） | 是 | 是 |
| echo | 是（不计施法次数） | 是 | 是 |
| chain | 是（受模块 CD） | 是 | 是 |
| module | **否** | 是（击杀仍算玩家） | **否** |
| summon | **否** | **否** | **仅哨兵** |

## 4. 击杀链路（v7 修复）

`hitEnemy` 构造 `ctx` 后，击杀必须把来源传下去：

```ts
if (e.hp <= 0) this.killEnemy(e, rt, ctx.source, ctx.summonKind);
```

`killEnemy` 内部重新构造 `killCtx`，并用它判定：

| 机制 | 依据 |
|---|---|
| 击杀数 / 金币 | 无条件（召唤物击杀也计入） |
| 击杀回血属性（killHeal） | `killCtx.canHarvest` |
| 割韭菜 harvest | `killCtx.canHarvest` |
| M1 溢出爆裂 | `killCtx.canTriggerModules`（module / summon 都不引爆） |

> 2026-10-31 审查发现的 bug：旧实现 `killEnemy(e, rt)` 丢了来源，哨兵击杀被当成普通击杀，
> harvest 照常回血。已修复，并由 §13 的接口断言 + 代码审查双重确认。

## 5. 调用约定

- `dealDamage` 等价物 = `hitEnemy(e, amount, rt, hitVfx?, noThunder?, src?, summonKind?)`；
- 模块内部产生伤害时必须新构造 `module` 上下文，**不得继承触发者 ctx**（M1 爆炸用 `applyRawDamage`）；
- `castId` 在 `fireSkill` 入口生成一次，向下所有弹体/连锁/分裂继承；
- `projectileId` / `returnIndex` 用于返程斩"每次返程一次"；
- **echo 重放**是独立施法（新 castId），但**不计入** M6 蓄势的施法次数（`Battle.echoReplay` 标记）。

## 6. 统一触发闸门

    ModuleUsage.canTrigger(ctx, gate, now):
      if (!ctx.canTriggerModules) return false
      if (!gate.allowedSources.includes(ctx.source)) return false
      if (gate.cooldownSec && now - last < cooldownSec) return false
      if (gate.maxPerCast && counts[ctx.castId] >= maxPerCast) return false
      return true

所有模块只声明数据（`allowedSources` / `cooldownSec` / `maxPerCast`），不在 Battle 里各写 if。

## 7. 蓄势（M6）与 echo

- 只统计**主动施法**：`fireSkill` 里 `if (oc > 0 && !this.echoReplay)`；
- echo 重放不计数、也不重置计数；
- 修复前 echo 会推进蓄势计数（实测可提前触发），v7 起不会。

## 8. summon 的结算细则

| 机制 | summon |
|---|---|
| 伤害 / 击杀 | 正常，计入玩家击杀总数 |
| Harvest | 否（`canHarvest = false`） |
| onhit 模块 | 默认否（`canTriggerModules = false`） |
| Vamp | 只有 `summonKind === 'sentry'` |
| 击杀统计 / 成就 | 是 |

## 9. 测试映射

| 规则 | 测试位置 |
|---|---|
| 来源 → 权限 | `tests/run.ts` §5n、§7 |
| 伪造 can* 无效 | §7「调用方伪造 can* 字段无效」 |
| castId 唯一 / 共享 | §7 最后两条 |
| 哨兵 vamp / 不回血 | §7「哨兵上下文…」 |

（Battle 内的击杀链路属于运行时行为，逻辑层单测无法直接覆盖；
 交付报告里明确标注"代码审查 + 类型检查 + 构建"三重证据，未以真机验证冒充。）
