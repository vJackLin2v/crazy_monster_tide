# M2-B.3.x 整数型黑科技 Ⅲ 级空转修复

## 根因

data/Modules.ts 的 modPower(id) 是容量/上限语义：level>1 恒为 2。
game/SkillCalc.ts 与 game/ModuleText.ts 把它当整数型模块的效果份数，导致 Ⅱ 与 Ⅲ 都读成 2。

## 修改

- data/Modules.ts：
  - 新增 modIntEffect(id) = levelOf(id)（Ⅰ=1、Ⅱ=2、Ⅲ=3、Ⅳ=4…）；
  - modPower 返回值保持 1/2 不变，注释明确只服务 canInstall 上限与合成计数。
- game/SkillCalc.ts：
  - 整数型 n 改为 modIntEffect；
  - echo 改为 modIntEffect；
  - 数值型 giant/rapid/burn/frost/vamp/snipe/harvest/thunder/thornmail/overload 继续 modEffect。
- game/ModuleText.ts：
  - 整数型 n 改为 modIntEffect；
  - echo 显示改为整数 n。

## 效果

| 模块 | Ⅰ | Ⅱ | Ⅲ |
|---|---:|---:|---:|
| multi | +1 发 | +2 发 | +3 发 |
| fan | 2 枚 | 4 枚 | 6 枚 |
| split | 2 枚 | 3 枚 | 4 枚 |
| bounce/pierce/orbit/chain | +1 | +2 | +3 |
| echo | 1 次 | 2 次 | 3 次 |

容量与合成：modPower 不变，Ⅲ 仍按 2 份计入上限/合成；3 个 Ⅱ 合成 Ⅲ 的占位规则不变。

## 验证

- tsc check = 0
- tsc ui-check = 0
- tests/run.ts = **558 PASS / 0 FAIL**
- 新增 8 条：
  - modIntEffect('multi_3')===3
  - modIntEffect('multi_2')===2
  - modPower('multi_3')===2
  - moduleDetailText('multi_3') 含 +3 发
  - moduleDetailText('chain_3') 含 跳 3 次
  - multi_3 火球 count=4
  - echo_3 calcSkill.echo=3
  - moduleDetailText('echo_3') 含 追加 3 次
- 微信构建 success：3.14MB / 10.98MB，index.js 334,323 B（2026-11-01 15:19:47）

## 未处理

- 其他系统的同类问题未发现；剩余 modPower 用法都是 canInstall/合成容量语义。
- 未改任何技能/道具数值、UI 布局或随机机制。
