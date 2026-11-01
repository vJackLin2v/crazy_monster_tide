# M2-B.2 审查验证记录

## 1. 基线与工作区

| 项 | 值 |
|---|---|
| HEAD | 26bfe64 |
| 分支 | main |
| 游戏源码改动 | 无（git diff -- cocos 为空） |
| 未跟踪 | .workbuddy、M2/M3 提示词、docs/m2b/m2b_2、用户 xlsx |
| 本轮性质 | 只读审查 + 新增文档 |

## 2. 只读检查命令

- git status --porcelain
- git diff --stat -- cocos
- tsc -p tsconfig.check.json
- tsc -p tsconfig.ui-check.json
- tsx tests/run.ts

结果：tsc 0 / 0；测试 536 PASS / 0 FAIL。

## 3. rapid 计算验证

用独立计算脚本计算，不修改游戏参数：

- 普通：0.88^1 / 0.88^1.6 / 0.88^2.2
- 法师：0.88^(1.25×1) / 0.88^(1.25×1.6) / 0.88^(1.25×2.2)

结果：

普通：12.0000% / 18.4972% / 24.5148%
法师：14.7679% / 22.5600% / 29.6398%

UI 实际字符串（只读调用 moduleDetailText）：

- rapid => 冷却 -12.0%
- rapid_2 => Lv.2 · 冷却 -18.5%
- rapid_3 => Lv.3 · 冷却 -24.5%
- MODULE_NUMS.rapid => 冷却 -12%
- MODULE_NUMS.rapid_2 => undefined

结论：普通文案与计算一致；法师三级全部低报。

## 4. 商店确定性验证

### 4.1 生成池抽样

构造 RunState('monk', seed, normal)，只给 meteor；100 个固定种子，每种子刷新一次，统计模块货位：

- 模块样本：189
- 当前不可安装：98（51.9%）
- 典型不可安装：pierce 16、multi 15、snipe 15、orbit 14、bounce 11、chain 11、fan 9、split 7
- 兼容：burn/frost/thunder/harvest/rapid/echo/giant/overload/vamp/thornmail

这是确定性模拟，不是真实玩家体验。

### 4.2 购买/保留/恢复/出售

构造 monk 只带 meteor，直接放一个 multi 货位，金币 100：

{"before":[],"bought":true,"afterBuy":["multi"],"canNow":{"ok":false,"why":"不兼容"},"canLater":true,"soldGold":9,"goldDelta":9,"afterSell":[]}

验证：

- 购买成功并进入 modsBag；
- 当前不兼容，不能安装；
- 获得 spirit 后 canInstall=true；
- 可出售，回收 9 金币；
- 无死状态。

## 5. 无法验证 / 未做

- 未做微信真机视觉与点击验证；
- 未做真实玩家购买决策实验；
- 未运行新构建（本轮无源码改动，构建结果沿用 M2-B.1：3.14MB / 10.97MB）；
- 未验证其他角色/多技能组合的全部商店样本（只做了 meteor-only 的确定性模拟）。

## 6. 结论

- 游戏源码完全未修改。
- rapid：战斗计算未发现错误；文案对法师错误。
- 商店：无死状态；商店不提示兼容性，且与奖励池过滤口径不一致，属体验/决策问题。
