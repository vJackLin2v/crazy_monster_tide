# 商店模块兼容性完整流程审查

> 审查基线：HEAD 26bfe64（main）；只读审查，未修改源码/数值。
> 验证方式：RunState 确定性构造 + 固定种子；不是真实玩家对局。

## 1. 涉及源码

| 环节 | 文件 / 函数 |
|---|---|
| 商店生成 | game/RunState.ts makeShopItem（509-539） |
| 商品池 | 同函数 modPool（512）：totalMods(m) < MODULES[m].max 且未 used |
| 购买 | RunState.buySlot（557-587）；模块 modsBag.push(s.id)（579） |
| 库存 | RunState.modsBag: string[]（43）；RunSave.modsBag |
| 数量上限 | RunState.totalMods（291-297）：背包 + 已装都计入 |
| 安装 | RunState.installAt（404-424）；SkillCalc.canInstall/isCompatible（41-63） |
| 替换技能 | RunState.replaceSkill（373-380）：旧模块退回背包 |
| 丢弃技能 | RunState.dropSkill（394-402）：旧模块退回背包 |
| 出售 | RunState.sellMod（309-317）：max(6, round(9*modEffect)) |
| 合成 | RunState.mergeModule（332-347） |
| 奖励池对照 | RunState.rollRewards（264-270）过滤了 canInstall 兼容 |
| 商店 UI | GameRoot.renderShopUnsafe（1204-1225）：只显示名称/数值，不显示 requires |
| 安装 UI | GameRoot.renderInstallUnsafe（978-985）：用 canInstall 置灰不兼容项 |

## 2. 完整流程

### 路径 1：购买兼容模块

商店生成模块 → buySlot 扣金币 → modsBag.push(id) → 进入安装屏/暂停面板 → installAt/canInstall 通过 → 模块从背包移除并装到技能槽 → calcSkill 读取，效果生效。

### 路径 2：购买不兼容模块

商店生成与当前技能不兼容的模块 → buySlot 只检查存在/金币，不检查兼容 → 模块进入 modsBag → 当前无法 installAt（isCompatible false）→ 但模块可保留在背包；出售/合成/等未来技能。

实际确定性验证（只带 meteor 的 monk）：

{"before":[],"bought":true,"afterBuy":["multi"],"canNow":{"ok":false,"why":"不兼容"},"canLater":true,"soldGold":9,"goldDelta":9,"afterSell":[]}

- 购买成功，模块进背包；
- 当前不可安装；
- 获得 projectile 技能后 canLater=true；
- 可出售，获得 9 金币。

### 路径 3：未来获得兼容技能

modsBag 是持久数组；后续 rollRewards 可给新技能/替换技能。获得兼容技能后 installAt 会重新检查 isCompatible，原背包模块可安装。上例 canLater=true 已验证。

### 路径 4：技能替换/移除

- replaceSkill：back = sk.mods.slice(); modsBag.push(...back); skills[slot]=makeSkill(newId)；
- dropSkill：同样把 sk.mods 退回 modsBag；
- 已安装模块不会丢失、不会失效；替换后进入背包，可重新安装到兼容技能。
- 没有发现“技能没了、模块也消失”的路径。

### 路径 5：商店刷新

- refreshShop（488-507）保留 locked，其余重新 makeShopItem；
- 刷新/下一波不会自动过滤不兼容模块，因此不兼容模块可能反复出现；
- 刷新成本按 rerollCost，锁定不影响兼容性。

## 3. 十个关键问题

1. 出售的模块是直接安装还是先入库存？
   先入 modsBag，不是自动安装（buySlot 579）。

2. 购买后一定有地方保存吗？
   是，modsBag 数组；存档保存/恢复包含 modsBag（RunSave）。

3. 未安装模块是否占模块数量上限？
   是。totalMods 同时统计 modsBag 与已安装模块（291-297）；买不兼容模块会占该 base 的 max 配额，可能阻止后续同 base 商品/奖励。

4. 能否等到以后获得兼容技能再安装？
   能。确定性验证 canLater=true；installAt 安装时重新检查兼容。

5. 能否出售、替换或移除未安装模块？
   能。sellMod 出售；mergeModule 可 3 个同名合成；没有单独“丢弃”按钮但出售即可清出背包。

6. 技能替换后，已安装模块如何处理？
   replaceSkill/dropSkill 全部退回 modsBag（373-402），不丢失。

7. isCompatible 只在安装阶段检查吗？
   - installAt 安装时检查；
   - 奖励池 rollRewards 用 canInstall 过滤兼容（267）；
   - 商店 makeShopItem 不检查（512）；
   因此商店与奖励池口径不一致。

8. 商店展示时知道玩家当前技能配置吗？
   知道（RunState.skills 可用），但 makeShopItem 没有使用兼容性，只使用 totalMods 和 used。

9. 不兼容模块是否造成金币/库存/机会成本？
   - 可造成：买了当前装不上，金币变成背包物品；出售只回 max(6,9*modEffect)，通常低于购买价；
   - 占该 base 的 max 配额；
   - 但可保留到未来兼容技能，或出售/合成，不是死状态。
   - 固定种子模拟：只带 meteor 时，100 个种子的商店模块样本 189 个，其中 98 个（51.9%）当前无法安装；不是罕见边角。

10. 是否存在无法安装、无法保存、无法移除的死状态？
    未发现死状态。可保存、可等未来技能、可出售、可合成；问题在提示与购买决策，不在数据/库存无法恢复。

## 4. 设计判断

B. 可理解但体验不佳。

- 合理：长期构筑选择，玩家可以买下暂时不兼容模块，保留到以后获得兼容技能；系统支持保存/安装/出售/合成，没有资源死锁。
- 不佳：
  - 商店不显示 requires，购买前不知道当前装不上；
  - 商店与奖励池口径不一致（奖励池过滤，商店不过滤）；
  - 不兼容模块占 totalMods 配额，可能挤掉后续同 base 商品；
  - 出售价低于购买价，误买有金币损失。
- 因此不是 C（实际逻辑缺陷），也不是 A（完全合理无需改）；是 P1 的体验/决策问题。

## 5. 风险与边界

- 若直接过滤商店不兼容模块：会降低模块出现率，并影响“为未来技能提前买”的玩法；需先决定是否保留长期构筑选择。
- 若只加提示：需要 UI 空间和 requires 文案；不改变随机池/价格。
- 若限制购买：可能阻止合法的未来构筑，不建议未经设计确认直接做。
- 商店刷新/锁定不改变兼容判断；存档恢复保留 modsBag，但 validateActiveRun 只过滤非法 ID，不做兼容性检查（兼容只在安装时）。

## 6. 结论

- 不是 P0：没有金币消失、物品丢失、无法恢复的死状态。
- P1：明确影响购买决策与体验，且有合理绕过方式（不买/出售/等技能）。
- 建议优先级：先做“显示兼容性/需要标签”的 UI 方案，或只在明确设计要“只卖当前可用”时才过滤；不要直接改随机池/价格。
- 本轮不修改任何代码/数值。
