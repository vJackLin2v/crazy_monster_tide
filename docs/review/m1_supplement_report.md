# M1 补充变更报告（回血预算一致性 + 存档完整性）

> 基线：`a752d4a` → 补充完成 commit：见文末 ｜ 测试：**466 PASS / 0 FAIL** ｜ tsc 双配置 0
> 微信构建：3.11MB / 10.95MB（2026-10-31 21:23:54，index.js 309,158 B）

## 一、普通难度回血预算语义

### 1. 历史对照

| 版本 | 普通配置 | 有效预算 | 硬上限 | 代码 |
|---|---|---|---|---|
| `de41ae0`（M1 起始） | `null` | `DEFAULT_HEAL_BUDGET = 8` | 5 | `HealRules.healBudgetOrDefault / healStep` |
| `a752d4a`（M1 完成） | `null` | 8 | 5 | 同上（未改） |

`git show de41ae0:cocos/assets/scripts/game/HealRules.ts` 与当前实现的常量/默认值一致；M1 的改动只是把属性吸血/击杀回血/自然恢复接入 `RunState.heal`，**没有改变普通难度的预算语义**。

结论：**不是 M1 的有意设计变更**，而是更早的 A4 修复（commit `97954c0`）就确定的“null → 默认 8、硬夹 5”。§13 中“普通不启用回血预算”是**过期测试名称**，本轮只修正描述，不修改规则。

### 2. 描述修正（未改行为）

| 位置 | 修改前 | 修改后 |
|---|---|---|
| tests §13 标题 | 普通难度 = 不介入原版本 | 普通难度公式层：倍率 1、无特殊规则（回血为默认 8） |
| tests §13 断言名 | 不启用回血预算 | 配置为 null（运行期默认 8，非“无预算”） |
| HealRules 注释 | null 预算描述不清晰 | 明确 null→8、硬夹 5、按实际恢复量记账 |
| Difficulties 注释 | `null = 不限制` | `null = 使用默认 8，不是不限制` |

## 二、回血预算按实际恢复量记账（已修）

### 修改前

`healStep` 先按预算算出 `heal`，`spent += heal`，但 **room 截断发生在 RunState**：
99/100 请求 5 → step 计算 5、spent=5，实际只加 1 HP。剩余 4 点预算被“吃掉”。

### 修改后

`healStep(amount, id, hpPct, spent, room)`：

```ts
const maxHeal = Math.min(scaled, cap - spent, room);
const heal = maxHeal;          // 实际恢复量
return { heal, spent: spent + heal };
```

示例：

| 场景 | 请求 | 实际 | spent |
|---|---|---|---|
| 99/100，spent 0 | 5 | 1 | 1 |
| 同秒再掉到 95/100 | 4 | 4 | 5 |
| 同秒再请求 | 5 | 0 | 5 |
| 满血 | 5 | 0 | 不变 |
| 困难（healMul 0.9）0/100 | 5 | 4.5 | 4.5 |

### 新增测试（§26）

- 99/100 只记 1，剩余 4 点仍可用；
- 满血不消耗预算；
- 困难 0.9 倍率；
- 瞬时治疗按剩余生命截断；
- 连续多次回血合计 ≤5，且按实际量记账。

## 三、存档模块 / 道具白名单（已修）

### 规则

- 合法模块 = `MODULES` 正式表 + 合成等级（`baseOf`）+ **六个已批准但未入池的隐藏模块**；
- 未知道具 = 不在 `ITEMS`；
- 只过滤非法项，不因一个坏 id 判整档损坏、不删除合法内容。

### 覆盖字段

`skills[].mods`、`modsBag`、`items[]`、`pendingRewards`、`shopStock[]`、`carryOver[]`。

### 隐藏模块决定

依据 `module_expansion_design.md` + `FINAL_DESIGN_DECISIONS` M1~M6，六个模块属于“已批准、未接入掉落池”的设计内容；**存档恢复允许保留**，避免删除设计验证/测试构筑；但它们仍不会进入奖励池/商店池。

### 新增测试（§27）

- 合法模块、合成等级、隐藏模块保留；
- 未知模块从技能/背包/商店/待选奖励中过滤；
- 未知道具过滤；
- 含未知 id 的存档仍能加载（不崩溃）；
- `isLegalModuleId / isLegalItemId` 单测。

## 四、禁止项遵守

未修改：技能伤害、怪物成长、难度倍率、每波回满规则、商店价格、UI、六个隐藏模块数值、area 双乘公式。
未删除/弱化任何原有断言（435 → 447 → 466，全部通过）。

## 五、验证

```
tsc -p tsconfig.check.json      -> 0
tsc -p tsconfig.ui-check.json   -> 0
tsx tests/run.ts                -> 466 PASS / 0 FAIL
build-wechat.bat                -> success；3.11MB / 10.95MB
```

## 六、修改文件（补充轮）

| 文件 | 说明 |
|---|---|
| `game/HealRules.ts` | 增加 `room` 参数，按实际恢复量记账；注释修正 |
| `game/RunState.ts` | 传入 room；瞬时治疗同样按剩余生命 |
| `game/RunSave.ts` | 模块/道具白名单、商店/奖励过滤、隐藏模块允许表 |
| `cocos/tests/run.ts` | §13 名称修正；§26/§27 新增测试 |
| `docs/review/` | 本报告 + baseline/test/change 同步 |

> 具体 commit 与完整日志见补充验收包。
