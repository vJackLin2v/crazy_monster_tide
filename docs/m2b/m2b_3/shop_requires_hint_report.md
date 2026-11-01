# 商店 requires 兼容提示报告

## 1. 实现位置

- 提示生成：game/ModuleText.ts 的 moduleRequiresHint(id, skillIds)。
- 兼容判断：直接调用 SkillCalc.canInstall(makeSkill(skillId), id)，不新增第二套规则。
- 商店卡片：GameRoot.renderShopUnsafe，模块 sub = moduleRequiresHint(...) + '\n' + moduleDetailText(id, stats)。

没有修改：

- RunState.makeShopItem / modPool；
- 商品概率、价格、刷新；
- buySlot / modsBag / installAt / sellMod / mergeModule；
- 商店购买按钮可用性。

## 2. 提示内容

模块 requires 来自 data/Modules.ts，标签映射：

- projectile → 投射物
- pulse → 脉冲
- chain → 连锁
- area → 范围
- 其他标签按原 id 回退

显示规则：

| 当前技能情况 | 显示 |
|---|---|
| 有兼容技能 | 需要：投射物 |
| 多条件 | 需要：投射物/范围/脉冲/连锁（完整显示） |
| 无兼容技能 | 暂无兼容，可留用 · 需要：投射物 |
| requires 为空 | 无需特定技能 |

“可留用”明确告诉玩家：购买后可按现有机制保留，以后获得兼容技能再安装。

## 3. 商店卡片实际效果

浏览器真实 UI（debug web build）读取到的 label：

- 多重射击（当前只有 meteor）：暂无兼容，可留用 · 需要：投射物
- 灼烧：无需特定技能
- 增大：需要：投射物/范围/脉冲/连锁
- rapid_2（法师）：需要：投射物/脉冲/连锁/范围 / Lv.2 · 冷却 -22.6%

对应截图：

- deliverables/m2b3_ui_shop.png
- deliverables/m2b3_ui_shop_incompatible.png

卡片 sub 仍是两行；提示放在第一行，数值在第二行。极长组合情况下，数值行可能被省略号截断，但 requires 提示在行首完整保留。

## 4. 购买、保存、后续安装是否保持原行为

保持原行为：

- 提示不改变按钮可用状态；
- 暂时不兼容模块仍可购买（buySlot 未改）；
- 购买后仍进入 modsBag；
- 后续获得兼容技能后仍可 installAt；
- 仍可出售/合成；
- 未过滤商品池，未改价格/概率。

## 5. 相关测试

新增 8 条：

1. 兼容时显示“需要：投射物”；
2. 无兼容时显示“暂无兼容”；
3. 多条件完整显示“需要：投射物/范围/脉冲/连锁”；
4. 空 requires 显示“无需特定技能”；
5. 暂时不兼容模块仍可购买并保留；
6. 购买后当前技能仍不兼容（规则未变）；
7. 获得兼容技能后可安装；
8. 保留模块仍可出售。

另有既有购买/库存/安装测试全部保留。

测试结果：550 PASS / 0 FAIL。

## 6. 未改变的内容

- 未过滤商品；
- 未改商品池/概率/价格；
- 未禁止购买不兼容模块；
- 未自动退款/替换/卸载；
- 未改库存容量或合成规则；
- 未改技能兼容规则。

## 7. 风险

- 提示会使商店卡片第二行更拥挤；当前两行布局可读，极长 detail 会被截断。
- 如果后续决定“只卖当前可用”，那属于商品池产品决策，不在本轮范围。
