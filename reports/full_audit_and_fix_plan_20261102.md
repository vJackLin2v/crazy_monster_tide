# 疯狂怪潮 · 全量审查与修复方案

- 版本：v1.0
- 日期：2026-11-02
- 审查对象：`H:\AI-game\crazy_monster_tide`（Cocos Creator 3.8.6 / TypeScript / 微信小游戏）
- 基线：`tests/run.ts` = **586 PASS / 0 FAIL**
- 本轮性质：**只审查，未改动任何游戏源码**
- 配套报告：`reports/full_audit_20261102.md`（结论摘要）

---

## 0. 结论摘要

| 维度 | 结论 |
|---|---|
| 内存 | 战斗内**无泄漏**（60s 压测堆恒定 87MB / 峰值 117MB / 节点 122→351 振荡回落）。真实泄漏 3 处，全部在战斗外的 UI 层与技能切换路径 |
| BUG | 8 个，其中 P0 三个（两处节点泄漏 + 一处同根因） |
| 规则/数值 | 3 处"装得上但没效果"或文档与实现不符；数值同形态内健康，跨形态差异集中在霜爆 |
| 性能 | 5 个可优化点，最重的是 `updateBullets` 的 O(弹×敌) 双重循环 |
| UI | 三视口 × 11 页，仅 2 处文字裁切（同一根因，都在升级三选一卡片），无遮挡、无越界 |
| AI 测试 | 已有 Playwright + cc 反射地基，建议补"视觉冒烟 + CI 断言"，不建议现在就上商业方案 |

**修复优先级建议**：P0 三个 → P1 五个 → 数值/规则三个 → 性能五个。每批单独提交、单独回归。

---

## 1. 缺陷总表

| 编号 | 级别 | 类型 | 位置 | 一句话 |
|---|---|---|---|---|
| BUG-01 | P0 | 内存泄漏 | `GameRoot.ts:376-379` | DEBUG「数据」按钮每次进菜单追加一个，永不销毁 |
| BUG-02 | P0 | 内存+视觉 | `Battle.ts:489-496` | `clearSkillRuntime()` 不销毁 `chargeFx` 节点（换技能路径） |
| BUG-03 | P0 | 内存+视觉 | `Battle.ts:536-542` | `resetRunState()` 清了 `charges` 却不销毁 `chargeFx`（开新局路径） |
| BUG-04 | P1 | 视觉 | `GameRoot.ts:1470-1477` | 结算页残留调试水印「阶段3 收尾版」+ 导出日志按钮 |
| BUG-05 | P1 | 文案 | `GameRoot.ts:1766-1775` | `TAG_CN` 缺 `orbit/trap/summon/charge`，面板露英文 |
| BUG-06 | P1 | 排版 | `ui/Modals.ts:120-121` | 数值行 `h = nLines * 19`，14px 字行高 21 → 裁 2px |
| BUG-07 | P2 | 字形 | `ui/Hud.ts:191` | 空槽占位全角「＋」渲染成 ▯▯▯ |
| BUG-08 | P2 | 代码笔误 | `Battle.ts:1527`、`2240` | `Math.min(dmg)` 单参数 |
| CNT-01 | P1 | 规则/文档 | `Battle.ts:1911` | 环刃转速硬编码 1.4，文档写"受 rapid 加成" |
| CNT-02 | P1 | 规则 | `Battle.ts:2004` + `SkillCalc.ts:9` | 白名单放行 `地雷阵×增大`，但爆炸半径硬编码 48 |
| CNT-03 | P1 | 规则 | `Battle.ts:1104-1124` | 连锁闪电放行 `增大`/`重复施放`，分支不读 size、不 queueEcho |

---

## 2. BUG 详解与修复方案

### BUG-01（P0）主菜单 DEBUG「数据」按钮无限累积

**现象**
Web 预览构建（`DEBUG=true`）下反复进出主菜单，「数据」按钮数量线性增长，旧按钮留在 `uiRoot` 上永不销毁。

**证据**
```
menu0: scr-menu[疯狂鸽王] | btn[数据]
menu1: btn[数据] | scr-menu[疯狂鸽王] | btn[数据]
menu2: btn[数据] | btn[数据] | scr-menu[疯狂鸽王] | btn[数据]
settings: btn[数据] | btn[数据] | scr-menu[疯狂鸽王] | btn[数据] | scr-settings[设置]
```
复现脚本：`.tmp/probe_menu.cjs`。

**根因**
`showMenu()` 第一行 `clearScreen()` 只销毁 `this.cur`（页面根）与 `this.hud`：

```ts
// GameRoot.ts:286
private clearScreen() {
  if (this.cur && this.cur.isValid) this.cur.destroy();
  this.cur = null;
  this.hud = null;
}
```

而调试按钮是**直接挂到 `this.uiRoot`** 上的：

```ts
// GameRoot.ts:376
if (DEBUG) {
  const dbgBtn = button(this.uiRoot, SCREEN_W / 2 - 40, SCREEN_H / 2 - 30, 64, 28, '数据', { size: 10 });
  onTap(dbgBtn.node, () => this.showTelemetry());
}
```

`uiRoot` 是常驻节点，`cur` 销毁时它不受影响 → 每进一次菜单就多一个。

**影响面**
- 微信正式包 `DEBUG=false`，**不受影响**。
- Web 预览、`wechatgame` 调试构建受影响。单次累积约 1 个 `Node + 2 Label + 1 Graphics`，反复进出 100 次约多出 400 个节点，同时旧按钮仍可点击、仍响应 `__hit` 热区审计 → 会污染 UI 自动化结果。

**修复方案 A（推荐，改动一行 + 一个字段）**

```ts
// GameRoot.ts 字段区（class 内，靠近其它私有字段）
private dbgBtn: Node | null = null;
```

```ts
// GameRoot.ts:376，替换原 if (DEBUG) { ... } 整段
if (DEBUG) {
  if (!this.dbgBtn || !this.dbgBtn.isValid) {
    const b = button(this.uiRoot, SCREEN_W / 2 - 40, SCREEN_H / 2 - 30, 64, 28, '数据', { size: 10 });
    onTap(b.node, () => this.showTelemetry());
    this.dbgBtn = b.node;
  }
  // 重建页面后要把它重新提到最上层，否则会被新菜单盖住
  this.dbgBtn.setSiblingIndex(this.uiRoot.children.length - 1);
}
```

要点：`button()` 的返回类型是 `{ node: Node; label: Label; setEnabled }`（`UIKit.ts:263`），所以缓存的是 `b.node`。

**修复方案 B（备选，把按钮挂到页面根）**

```ts
const dbgBtn = button(this.cur!, SCREEN_W / 2 - 40, SCREEN_H / 2 - 30, 64, 28, '数据', { size: 10 });
```
随 `cur` 一起销毁，天然不累积。**但**前提是 `buildMenu` 的根节点坐标原点与 `uiRoot` 一致；若菜单根用了 `at()` 做安全区偏移，按钮位置会整体偏移，需实测确认。因此列为备选。

**验证**
1. 重跑 `.tmp/probe_menu.cjs`，期望 4 次输出中 `btn[数据]` 恒为 **1** 个。
2. `tsc -p tsconfig.check.json` / `-p tsconfig.ui-check.json` = 0。
3. `tests/run.ts` 仍 586 PASS。

**风险**：极低。唯一注意点是 `setSiblingIndex` 在某些引擎版本对刚 `destroy` 的兄弟节点会有一次延迟，若报错可改用 `this.dbgBtn.parent = null; this.dbgBtn.parent = this.uiRoot;` 重新挂载。

---

### BUG-02（P0）换技能后蓄力指示圈永久残留

**现象**
技能槽里是蓄能脉冲、正在蓄力（青色双环收缩动画）时，玩家通过构筑面板把该技能换成别的技能 —— 蓄力圈**不再消失**，永久钉在角色身上冻结不动。数据层已经清空（`charging=false`），但视觉节点还在。

**证据（运行时复现）**
```
进入蓄力 @1.5s -> {"charging":true,"fx":true,"onLayer":true}
clearSkillRuntime 前 chargeFx 节点数: 1
clearSkillRuntime 后 : {"charging":false,"fxRef":true,"nodesInTree":1,"fxValid":true}
errors: none
```
截图：`reports/text_fit/chargefx_leak.png` —— 角色身上两个青色同心圆，底部技能槽已变成火球。

**根因**
`chargeFx` 是 `Record<number, Node>`（`Battle.ts:298`），节点在进入蓄力时创建并挂到 `layerPlayer`（`Battle.ts:1190-1199`）：

```ts
this.charges[slot] = { t: 0, dmg: rt.dmg, r: Math.max(60, rt.size), rt, telSkill: this.telSkillId };
if (this.chargeFx[slot] && this.chargeFx[slot].isValid) this.chargeFx[slot].destroy();
const ring = new Node('chargeFx');
ring.parent = this.layerPlayer;
...
this.chargeFx[slot] = ring;
```

**唯一的销毁点**在 `resolveCharge()` 里（`Battle.ts:1987-1988`），只有"蓄力满 3 秒正常结算"才会走到。

而 `clearSkillRuntime()` 的注释写着"清掉该槽位的所有运行时（蓄势 + 环刃 + 蓄能）"，实现只 `delete` 了数据：

```ts
// Battle.ts:489（现状）
clearSkillRuntime(slot: number): void {
  delete this.castCount[slot];
  delete this.orbits[slot];
  delete this.charges[slot];        // ← 只删数据
  this.skillT[slot] = 0;
  this.cdTotal[slot] = 0;
}
```

删了 `charges[slot]` 之后，`updateNewSkillTypes` 的 `for (const key in this.charges)` 再也不会遍历到它 → 永远不会调用 `resolveCharge` → 节点永不销毁。

调用路径（全项目只有两条，都走 `resetCastCount`）：
- `GameRoot.ts:804` —— 替换屏 `showReplace()` 换技能；
- `GameRoot.ts:1636` —— 构筑面板安装新技能时替换。

**影响面**
`resolveCharge` 内部还会顺手 `delete this.chargeFx[slot]`，所以正常情况下引用会被清掉；一旦跳过，`chargeFx[slot]` 保留一个有效节点引用 → 除了画面残留，还会让下次同槽位蓄力时执行 `destroy()` 再建，属于"单槽位最多残留 1 个"的稳定泄漏（不无限增长，但跨局、跨技能一直挂在那儿）。

**修复方案**

```ts
// Battle.ts:489，整体替换
clearSkillRuntime(slot: number): void {
  delete this.castCount[slot];
  delete this.orbits[slot];
  delete this.charges[slot];
  // ★ BUG-02：蓄力指示圈是节点，必须和 charges 一起销毁，
  //   否则换技能后 charges 已空 → resolveCharge 永不执行 → 圈永久留在 layerPlayer 上
  const fx = this.chargeFx[slot];
  if (fx && fx.isValid) fx.destroy();
  delete this.chargeFx[slot];
  this.skillT[slot] = 0;
  this.cdTotal[slot] = 0;
}
```

**验证**
1. 重跑 `.tmp/probe_chargefx.cjs`，期望 `clearSkillRuntime 后` 输出 `fxRef:false` 且 `nodesInTree:0`。
2. 截图对比：换技能后角色身上无残留圆环。
3. 手动：蓄力中打开构筑面板换技能 → 圈立即消失。

**风险**：低。`chargeFx` 节点的唯一语义就是"该槽位蓄力中"，换技能时销毁符合预期。注意不要顺手把 `charges` 的删除放到 `destroy` 之后 —— 顺序无所谓，但别漏 `delete`。

---

### BUG-03（P0）开新局 / 读档后蓄力圈残留

**现象**
与 BUG-02 同源的另一条路径：在蓄力途中死亡、退出到菜单、再开新局或继续游戏，上一局的蓄力圈节点仍挂在 `layerPlayer` 上（`layerPlayer` 本身不随 `resetRunState` 销毁）。

**证据（代码级）**
`resetRunState()` 逐个销毁实体，并有一段专门的"纯数据状态"清理（`Battle.ts:536-542`）：

```ts
// ⚠️ A2：这四个是纯数据状态，不带 node，旧实现漏清 → 新一局出现幽灵地雷/哨兵/蓄能/环刃
this.traps = [];
this.sentries = [];
this.charges = {};
this.orbits = {};
this.castCount = {};
this.echoQueue = [];
```

注释判断"这四个不带 node"是对的，但 `chargeFx` 是**第五个状态，且带 node**，被整体漏掉了 —— 既没有 `destroy()`，也没有 `this.chargeFx = {}`。

对比 `resetRunState` 上半部分（`Battle.ts:506-526`），所有实体都走 `kill(n)` 统一销毁，唯独 `chargeFx` 不在列表里。

**影响面**
每开一局累积 ≤4 个节点（4 个技能槽）。反复开 50 局最多 200 个冻结的蓄力圈叠加在画面上 —— 视觉上会变成一团青色杂物，且 `chargeFx` 里还留着已销毁节点的旧引用（`isValid=false`，不会崩，但状态脏）。

**修复方案**

```ts
// Battle.ts:536 附近，插在 this.charges = {}; this.orbits = {}; 之后
// ★ BUG-03：chargeFx 是带 node 的状态，和上面四个"纯数据"不同，必须单独销毁
for (const k in this.chargeFx) {
  const n = this.chargeFx[Number(k)];
  if (n && n.isValid) n.destroy();
}
this.chargeFx = {};
```

注意 `for...in` 的 key 是 `string`，要用 `Number(k)` 取值（`Record<number, Node>` 的运行时 key 就是字符串）。

**验证**
1. 蓄力中直接调用 `G.battle.resetRunState()`，`layerPlayer` 下 `chargeFx` 子节点数应为 0。
2. 连续开 5 局后统计 `chargeFx` 节点数恒为 0。
3. `tests/run.ts` 586 PASS。

**风险**：低。`layerPlayer` 在 `resetRunState` 里不会被销毁（`createPlayer` 会重建 `playerNode`，但 `layerPlayer` 是图层），所以必须显式清子节点。

---

### BUG-04（P1）结算页残留调试水印与"导出日志"按钮

**现象**
玩家打通/死亡后的结算页，标题牌右上角有一行灰色小字「阶段3 收尾版」，左下角有一个「导出日志」按钮 —— 都是开发期遗留，对玩家可见。

**证据**
```ts
// GameRoot.ts:1470-1477
const vs2 = view.getVisibleSize();
// 构建标记：用来确认玩家跑的是哪个包
text(this.cur, vs2.width / 2 - 76, vs2.height / 2 - 16, '阶段3 收尾版',
  { size: 8, color: new Color(150, 160, 180, 255), width: 140, align: 'right', outline: false });
const chip = panel(this.cur, 58 - vs2.width / 2, vs2.height / 2 - (safeTop() + 56), 88, 26, { art: 'btn' });
text(chip, 0, 0, '导出日志', { size: 10, color: new Color(240, 236, 226, 255), width: 84, bold: true, outline: true });
onTap(chip, () => this.copyRunLogs());
```
截图：`reports/text_fit/360x640-result.png`。

**根因**
开发期为"确认玩家跑的是哪个包"临时加的，进正式交付时没摘。注意它**没有被 `if (DEBUG)` 包住**，所以正式包也会显示。

**影响面**
直接影响产品观感；「导出日志」按钮摆在结算页左下，误触会写剪贴板，非预期行为。

**修复方案（推荐：整段删除）**

删除 `GameRoot.ts:1470-1477` 整块（8 行）。`copyRunLogs()` 方法本身保留 —— 它还被 `showTelemetry()` 的调试页使用，删掉会连带失效。

```ts
// 删除以下整块（含注释）
// 真机调试：一键复制本局日志（放在标题牌左侧，构建失败不阻断结算）
const vs2 = view.getVisibleSize();
// 构建标记：用来确认玩家跑的是哪个包
text(this.cur, vs2.width / 2 - 76, vs2.height / 2 - 16, '阶段3 收尾版', { ... });
const chip = panel(this.cur, 58 - vs2.width / 2, ...);
text(chip, 0, 0, '导出日志', { ... });
onTap(chip, () => this.copyRunLogs());
```

**备选（想保留真机排障能力）**

```ts
if (DEBUG) {
  const vs2 = view.getVisibleSize();
  const chip = panel(this.cur, 58 - vs2.width / 2, vs2.height / 2 - (safeTop() + 56), 88, 26, { art: 'btn' });
  text(chip, 0, 0, '导出日志', { size: 10, color: new Color(240, 236, 226, 255), width: 84, bold: true, outline: true });
  onTap(chip, () => this.copyRunLogs());
}
```
水印「阶段3 收尾版」无论哪种方案都应删除 —— 它的唯一用途"确认包版本"应该用 `BUILD_TAG` 走设置页呈现。

**验证**
- 结算页截图无水印、无导出按钮；
- `copyRunLogs` 在调试页（`showTelemetry`）仍可调用；
- 构建无 `vs2` 未使用告警（若用备选方案，`vs2` 在 `if` 内声明即可）。

**风险**：低。删除后 `view` 的 import 若只此处使用会触发 TS 未使用告警 —— 实测 `view` 在 `GameRoot` 其它处大量使用，不受影响。

---

### BUG-05（P1）构建面板技能标签露出英文

**现象**
构筑/暂停面板的技能行显示 `物理 · orbit · 近战`、`物理 · trap · 范围`、`奥术 · summon · 远程`、`雷 · charge · 周身 · 爆发` —— `orbit / trap / summon / charge` 四个标签没翻译。

**证据**
截图 `reports/text_fit/tags-check.png`；代码：

```ts
// GameRoot.ts:1766-1775（现状）
const TAG_CN: Record<string, string> = {
  // 元素
  fire: '火', ice: '冰', lightning: '雷', physical: '物理',
  arcane: '奥术', holy: '圣', poison: '毒', nature: '自然',
  // 形态
  projectile: '远程', area: '范围', pulse: '周身', chain: '连锁',
  melee: '近战', beam: '射线', burst: '爆发',
  // 特性
  pierceable: '可穿透', homing: '追踪', return: '回旋',
  slow: '减速', dot: '持续伤害',
};
function tagText(tags: string[]): string {
  return tags.map(t => TAG_CN[t] ?? t).join(' · ');
}
```

**根因**
新增 4 个技能时给 `Skills.ts` 加了 `orbit / trap / summon / charge` 标签，词表没同步。`tagText` 的 `?? t` 兜底让缺词**静默退化**成英文，所以没有报错、也没被发现。

**修复方案**

```ts
// GameRoot.ts:1766，形态组补齐四个
  // 形态
  projectile: '远程', area: '范围', pulse: '周身', chain: '连锁',
  melee: '近战', beam: '射线', burst: '爆发',
  orbit: '环身', trap: '陷阱', summon: '召唤', charge: '蓄能',
```

用词参考 `Skills.ts` 里已有的中文名：`ring_blade` = 环刃（标签 orbit）、`mine_field` = 地雷阵（trap）、`sentry` = 哨戒哨兵（summon）、`charge_pulse` = 蓄能脉冲（charge）。若想更贴近玩法也可用 `环绕 / 地雷 / 哨戒 / 蓄力`，但需与 `ModuleText.ts` 的措辞统一。

**加固建议（防复发）**

在 `tests/run.ts` 加一条用例：遍历 `SKILLS` 与 `MODULES` 的所有 tag，断言每个 tag 都能在 `TAG_CN` 里命中。因为 `TAG_CN` 是 `GameRoot.ts` 内的模块级常量，需要先 `export` 它，或用正则读源码断言。

**验证**
- 构筑面板四个新技能的标签行全中文；
- `tsc` 两套 = 0；`tests/run.ts` 586 PASS（或 587，若加了断言用例）。

**风险**：无。纯词表新增。

---

### BUG-06（P1）升级三选一卡片数值行纵向裁切

**现象**
14px 的数值行（如「+2 发 · 每发 55% 伤害」）底部被裁掉约 2px，"害"字下半截缺失。360×640 视口必现，390/412 不出现。

**证据（审计脚本输出）**
```
########## 视口 360x640 ##########
  [升级三选一] 裁切·纵向 14px 框216x19 需21(1行) 「+2 发 · 每发 55% 伤害」
  [升级三选一] 裁切·纵向 14px 框216x19 需21(1行) 「伤害 7 · 冷却 2.4s」
########## 视口 390x844 ##########   (无)
########## 视口 412x915 ##########   (无)
合计问题 2 条
```
截图：`reports/text_fit/360x640-levelup.png`。

**根因（两处数值打架）**

`UIKit.text()` 显式把行高设成字号 1.5 倍：

```ts
// UIKit.ts:176
l.lineHeight = Math.round(size * 1.5);   // 14px → 21px
```

但 `Modals.buildLevelUp` 自己按 19px 一行算高度：

```ts
// Modals.ts:120-121
const nLines = Math.max(1, Math.ceil(c.nums.length / charsPerLine(txtW, 14)));
const h = nLines * 19;                                       // ← 19，不是 21
text(card, txtX, numsY, clampLines(c.nums, txtW, 14, 2),
  { size: 14, color: COL.cream, align: 'left', width: txtW, h, bold: true, outline: true });
```

`Label` 的 `overflow = CLAMP` + 高度 19 < 行高 21 → 上下各被切 1px，共 2px。360×640 时 `CH` 取到下限 92、`txtW` 更窄，文字更容易压到第二行边缘，所以只有这个视口暴露。

**修复方案 A（推荐，改一行）**

```ts
// Modals.ts:121
const h = nLines * Math.round(14 * 1.5);   // 与 UIKit 的 lineHeight 保持一致（21）
```

**方案 A 的布局安全性核算**（`CH` 最小 92 时）：
- `numsY = CH/2 - 56 = -10`，两行 `h = 42`，Label 中心 -10、半高 21 → 占 `[-31, +11]`，卡片半高 46，底部余量 15px —— 不溢出。
- 单行 `h = 21` → 占 `[-20.5, +0.5]`，更安全。

**修复方案 B（治本，抽公共常量）**

在 `UIKit.ts` 导出行高工具，两边共用，避免下次再对不上：

```ts
// UIKit.ts 顶部
export const lineH = (size: number) => Math.round(size * 1.5);
```
```ts
// UIKit.ts:176
l.lineHeight = lineH(size);
// UIKit.ts:164（shadow 副本同理）
sl.lineHeight = lineH(size);
```
```ts
// Modals.ts:121
const h = nLines * lineH(14);
```

**修复方案 C（想保持 19px 紧凑行距）**

不去改 `h`，而是让 `UIKit.text()` 支持自定义行高：

```ts
// TextOpts 增加 lineHeight?: number
l.lineHeight = o.lineHeight ?? Math.round(size * 1.5);
```
```ts
// Modals.ts
{ size: 14, ..., h, lineHeight: 19 }
```
这样 19px 框配 19px 行高，字不裁但行距更紧。**注意**：19/14 = 1.36，低于 iOS HIG 建议的 1.5，中文小字会显拥挤，不推荐用于正文，只适合单行。

**推荐组合**：方案 A 立即修；方案 B 作为重构项跟随。

**验证**
1. 重跑 `node tools/ui/audit_text_fit.cjs`，期望 **合计问题 0 条**。
2. 三视口截图人工确认「+2 发 · 每发 55% 伤害」两行完整、不压卡片底边。
3. `tsconfig.ui-check.json` = 0。

**风险**：低-中。若走方案 C，`TextOpts` 是公共接口，需回归全部 `text()` 调用点（编译器会保证参数合法，但视觉需抽查主菜单/结算/商店三页）。

---

### BUG-07（P2）HUD 空技能槽占位符渲染成方框

**现象**
未解锁的技能槽中央显示 `▯▯▯`（三个豆腐块），而不是一个「＋」。

**证据**
HUD 截图 `reports/text_fit/360x640-hud.png`；代码：

```ts
// Hud.ts:191
const plus = text(box, 0, 1, '＋', { size: 22, color: COL.dash, width: 44, outline: false });
```

**根因**
用的是**全角加号 U+FF0B（＋）**，项目用的像素字体子集里没有这个字形，`Label` 走 fallback 渲染成方框。ASCII 半角 `+`(U+002B) 一定在字体里。

**修复方案 A（最小改动）**

```ts
const plus = text(box, 0, 1, '+', { size: 22, color: COL.dash, width: 44, outline: false });
```

**修复方案 B（像素风更统一）**

用 `Graphics` 画十字，避免任何字体依赖：

```ts
// 空槽绘制处（Hud.ts:300-312 的 if (!sk) 分支）替换 s.plus.node.active = true;
const g = s.plusG;              // 新增 Graphics 成员
g.node.active = true;
g.clear();
g.lineWidth = 3; g.strokeColor = COL.dash;
g.moveTo(-7, 0); g.lineTo(7, 0);
g.moveTo(0, -7); g.lineTo(0, 7);
g.stroke();
```
需要把 `slots[]` 里的 `plus: Label` 换成 `plusG: Graphics`，并同步 `if (!sk)` 与 `else` 两个分支的 `active` 开关，改动面比 A 大。

**推荐**：先做 A（一行），视觉验收通过即可；若要求像素级一致再做 B。

**验证**
- HUD 空槽显示「+」，不是方框；
- 4 个空槽、混搭（部分技能部分空）两种状态都检查；
- 三视口截图。

**风险**：无。`+` 是 ASCII，字体必然有。

---

### BUG-08（P2）`Math.min` 单参数笔误

**现象**
两处伤害统计写法异常：`this.waveDmgDealt += Math.min(dmg);`

**证据**
```ts
// Battle.ts:1527（hitEnemy 内）
this.waveDmgDealt += Math.min(dmg);
// Battle.ts:2240（updateEnemies 的持续伤害结算内）
this.waveDmgDealt += Math.min(dot);
```

**根因**
`Math.min` 只传一个参数时直接返回该参数（`Math.min(x) === x`），功能上等价于 `+= dmg`，**不影响数值正确性**。判断是早期写 `Math.min(dmg, someCap)` 后删掉上限参数留下的残骸。

**影响面**
- 运行时：无功能影响。
- 维护：误导读者以为有上限保护；若将来有人改成 `Math.min(dmg, 9999)` 会悄悄改变统计口径。
- 静态检查：`tsc` 不报（`Math.min` 签名是可变参数）。

**修复方案**

```ts
// Battle.ts:1527
this.waveDmgDealt += dmg;
// Battle.ts:2240
this.waveDmgDealt += dot;
```

若当初确实想要上限，则应写成显式上限并加注释：

```ts
this.waveDmgDealt += Math.min(dmg, WAVE_DMG_CAP);
```
目前没有任何 `WAVE_DMG_CAP` 常量，说明本意就是直接累加。

**验证**
- 两套 `tsc` = 0；`tests/run.ts` 586 PASS；
- 打一波怪，结算面板"本波伤害"与修改前一致（可用同一 seed 对比）。

**风险**：无（语义等价）。

---

## 3. 规则与数值问题

### CNT-01（P1）环刃转速与设计文档不一致

**现象**
环刃装上「急速」后，转速没有任何变化。

**证据**
设计文档 `docs/design/skill_expansion_design.md` 环刃规格表：

```
| 转速 | 1.4 圈/秒（受 rapid 加成） |
```

实现（`Battle.ts:1911`）：

```ts
for (const key in this.orbits) {
  const slot = Number(key);
  const o = this.orbits[slot];
  o.rot += dt * 1.4 * Math.PI * 2;     // 硬编码 1.4，未读任何 rapid 倍率
```

而 `calcSkill` 里 rapid 只作用于冷却（`SkillCalc.ts:126-127`）：

```ts
const rapidPer = stats.modCdrMul ? Math.pow(0.88, stats.modCdrMul) : 0.88;
cd *= Math.pow(rapidPer, rapid);
```

环刃是**持续存在**的环带，不吃"施放频率"，`rt.cd` 只影响"重新召唤一次"的间隔 → rapid 对环刃的收益趋近于 0，同时白名单又放行了 `rapid`（`SkillCalc.ts:8`）。

**影响面**
玩家在环刃上装急速 = 白占一个槽位（3 槽里浪费 1 个），属于**误导性选项**。

**修复方案 A（推荐，快，改白名单 + 文档）**

```ts
// SkillCalc.ts:8
ring_blade: ['orbit', 'giant', 'burn', 'frost', 'vamp', 'harvest'],   // 去掉 'rapid'
```
```md
<!-- docs/design/skill_expansion_design.md 环刃规格表 -->
| 转速 | 1.4 圈/秒（固定） |
```

**修复方案 B（想保留玩法，让 rapid 真的加速）**

1. `SkillRuntime` 增加 `rapid: number` 字段（`SkillCalc.ts:67-72` 的接口）。
2. `calcSkill` 里把累计的 rapid 写进返回值：`rt.rapid = rapid;`。
3. 环刃运行时读它：

```ts
const rpm = 1.4 * (1 + 0.18 * Math.min(3, o.rt.rapid ?? 0));   // 每层 +18%，最多 3 层
o.rot += dt * rpm * Math.PI * 2;
```

**成本**：`SkillRuntime` 是存档与遥测都可能引用的公共结构，加字段要同步 `RunSave.ts` 的校验、`audit_combo.ts` 的模型、以及所有 `{...rt}` 的拷贝点。**建议排到数值专项里做，不要和 P0 混批。**

**验证**
- 方案 A：环刃的可用模块列表里没有急速；构筑面板不出现该选项；`tests/run.ts` 中若有白名单断言需同步更新。
- 方案 B：装 3 层急速后 `o.rot` 每秒增量应为 `1.4 * 1.54 * 2π`。

**风险**
- A：低，但会减少环刃的构筑自由（7 → 6 个可选模块）。
- B：中，动公共接口。

---

### CNT-02（P1）地雷阵 × 增大：装得上，半径不变

**现象**
给地雷阵装「增大」，爆炸范围没有任何变化。

**证据**
白名单放行（`SkillCalc.ts:9`）：

```ts
mine_field: ['giant', 'rapid', 'burn', 'frost', 'vamp', 'harvest', 'split', 'echo', 'overload'],
```

爆炸半径硬编码（`Battle.ts:2004`）：

```ts
private explodeTrap(tr: {...}): void {
  this.addVfx(FX.killBig, tr.x, tr.y, 0.45, 2.2);
  for (const e of this.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - tr.x, e.y - tr.y) <= 48) this.hitEnemy(...);   // ← 48 写死
  }
```

注意白名单文件自己的注释就写着：

```
// 矩阵里是 N 的组合**这里也必须没有**，否则会出现"装得上但没效果"。
```

**影响面**
又是一个"假选项"，浪费槽位。而且地雷阵本身可装模块只有 9/17，选择面已经窄，再塞一个无效项更伤。

**修复方案 A（让增大真的生效，推荐）**

```ts
// Battle.ts:2004
const radius = Math.max(48, tr.rt.size);       // 裸装 size=44 → 仍用 48；giant 后 size≈70 → 半径扩大
for (const e of this.enemies) {
  if (e.dead) continue;
  if (Math.hypot(e.x - tr.x, e.y - tr.y) <= radius) this.hitEnemy(...);
}
```

用 `Math.max(48, size)` 而不是直接用 `size`，是因为 `mine_field` 基础 `size = 44`（`Skills.ts`），直接替换会让裸装半径从 48 掉到 44 —— 属于隐性削弱。这样写保持裸装手感不变，只让增益生效。

**顺带要改的两处**：
- 地雷的触发半径也是 16 写死（`Battle.ts:1929` 附近 `<= 16`）。若想让"增大"同时扩大踩雷判定，改成 `Math.max(16, radius * 0.34)`；若只扩大爆炸范围，保持 16。
- `docs/design/skill_expansion_design.md` 补一句"爆炸半径 = max(48, size)"。

**修复方案 B（不实现，直接摘掉选项）**

```ts
mine_field: ['rapid', 'burn', 'frost', 'vamp', 'harvest', 'split', 'echo', 'overload'],
```

**推荐 A**：地雷阵可玩性偏弱（9/17），给它一个真实的范围收益比砍掉更有价值。

**验证**
- 裸装：站桩引爆，伤害范围与修改前一致（半径 48）。
- 装 1 层增大：半径应明显变大（约 70），能打到更远的敌人。
- 视觉上 `FX.killBig` 的缩放（当前硬编码 2.2）建议同步按 `radius / 48` 放大，否则"爆炸看起来还是那么小"：

```ts
this.addVfx(FX.killBig, tr.x, tr.y, 0.45, 2.2 * (radius / 48));
```

**风险**：低。唯一的平衡影响是地雷阵增强，属于预期。

---

### CNT-03（P1）连锁闪电 × 增大 / × 重复施放

**现象**
连锁闪电装「增大」（size）或「重复施放」（echo），完全无效果。

**证据**
连锁闪电走的是旧标签兼容表（不在 `NEW_SKILL_ALLOW` 里），因此 `giant` 与 `echo` 被放行。但 `chain` 分支（`Battle.ts:1104-1124`）从头到尾没读 `rt.size`，也没调用 `queueEcho`：

```ts
if (def.type === 'chain') {
  if (!tgt) return;
  let cur = tgt; const hit = new Set<Enemy>([cur]);
  this.spawnBolt(this.px, this.py, cur.x, cur.y);
  this.hitEnemy(cur, rt.dmg, rt, art.hit);
  for (let j = 0; j < 2 + rt.bounce + rt.chain; j++) {
    const from = cur;
    const nx = this.nearestEnemy(from.x, from.y, 140, hit);
    if (!nx) break;
    hit.add(nx);
    this.spawnBolt(from.x, from.y, nx.x, nx.y);
    this.hitEnemy(nx, rt.dmg * 0.85, rt, art.hit);
    this.addVfx('chain/chain-node', nx.x, nx.y, 0.3, 1);
    cur = nx;
  }
  return;                        // ← 没有 queueEcho，也没有用 rt.size
}
```

对比同文件里 `trap`/`charge`/`projectile` 分支都有 `if (!this.echoReplay) this.queueEcho(slot, ...)`。

**影响面**
连锁闪电可装 10/17，其中 2 个是死选项。

**修复方案（推荐：让 echo 生效，size 转成跳跃半径）**

```ts
if (def.type === 'chain') {
  if (!tgt) return;
  const jumpR = 140 * (1 + (rt.size - (SKILLS[def.id].size)) / 100);   // 增大 → 跳得更远
  let cur = tgt; const hit = new Set<Enemy>([cur]);
  this.spawnBolt(this.px, this.py, cur.x, cur.y);
  this.hitEnemy(cur, rt.dmg, rt, art.hit);
  for (let j = 0; j < 2 + rt.bounce + rt.chain; j++) {
    const from = cur;
    const nx = this.nearestEnemy(from.x, from.y, jumpR, hit);
    if (!nx) break;
    hit.add(nx);
    this.spawnBolt(from.x, from.y, nx.x, nx.y);
    this.hitEnemy(nx, rt.dmg * 0.85, rt, art.hit);
    this.addVfx('chain/chain-node', nx.x, nx.y, 0.3, 1);
    cur = nx;
  }
  // ★ CNT-03：补上重复施放（与 trap/charge 一致，最多 1 次）
  if (!this.echoReplay) this.queueEcho(slot, chainEchoRepeats(rt.echo));
  return;
}
```
`chainEchoRepeats` 需要在 `SkillRules.ts` 里照 `mineEchoRepeats` / `chargeEchoRepeats` 的样子新增（返回 `rt.echo > 0 ? 1 : 0`）。

**修复方案 B（简单粗暴：摘掉两个选项）**

在旧兼容表里把 `chain` 的 `requires` 改为不含 `projectile`（`giant`/`echo` 依赖它）—— 但旧表是按标签匹配的，改一处会影响所有 chain 类技能，风险比 A 高。

**推荐 A**：实现成本约 10 行，且让连锁闪电从 10/17 里剔除 2 个死选项，实际收益更大。

**验证**
- 装「重复施放」：一次施放应看到两轮闪电（间隔见 `queueEcho` 延迟）。
- 装「增大」：`nearestEnemy` 的搜索半径变大，链跳更远；可用两只相距 130~180 的怪测试。
- `tests/run.ts` 586 PASS。

**风险**：中低。echo 会让连锁闪电 DPS 提升约 60%，需同步复核平衡（连锁闪电当前裸装 13.5，最强 27.7，加 echo 后接近 44，仍在区间内）。

---

## 4. 数值与组合审查

### 4.1 审计方法与口径声明（重要）

脚本 `tools/audit_combo.ts` 用**真实** `canInstall` / `calcSkill` 枚举 17 技能 × 17 模块 × 3 槽（可重复）= **8616 组合**，再套一个分形态的 DPS 估算模型。

**这个模型有明确局限，必须说明**：它对 `pulse / charge / trap / summon / orbit` 只算「伤害 × 频率」，**不读 `size` / `spd` / 元素附加**。因此：

> 凡结论是"某技能 × 某模块无增益（×1.00）"，若该模块改的是半径、弹速、点燃、减速、吸血，则**不能判定为空转** —— 那是模型没算。

**上一版报告里有两处因此误判，本版更正：**

| 曾被判"空转" | 实际情况 | 依据 |
|---|---|---|
| 哨戒哨兵 × 狙击 | **有效** | `sentryShotPlan(count, fan, snipeStacks)` 里 `speed = SENTRY_BULLET_SPEED * Math.pow(1.4, snipeStacks)`（`SkillRules.ts:73-79`） |
| 蓄能脉冲 × 增大 | **有效** | `charges[slot].r = Math.max(60, rt.size)`（`Battle.ts:1187`），size 直接决定溅射半径 |
| 环刃 × 增大 | **有效** | `radius: Math.max(30, rt.size)`（`Battle.ts:1171`） |

**经源码逐行核实后，真正的"装得上没效果"只有 3 条**：CNT-01（环刃×急速）、CNT-02（地雷×增大）、CNT-03（连锁闪电×增大/×重复施放）。

### 4.2 组合规模与分布

```
组合总数 8616；中位 18.7；最强/中位 = 4.08×
```

**全表 Top 10**
```
乱杀    76.2  echo+echo+echo
乱杀    74.9  echo+echo+overload
陨石    74.7  echo+echo+echo
陨石    73.3  echo+echo+overload
火球    72.3  fan+fan+echo
火球    70.0  multi+fan+echo
乱杀    68.1  rapid+echo+echo
乱杀    68.1  echo+overload+overload
火球    67.8  multi+multi+echo
陨石    66.7  rapid+echo+echo
```

**Bottom 5** 全是霜爆的任意组合，恒为 **1.9**。

### 4.3 形态内 / 形态间对比

| 形态 | 技能 | 裸装 DPS | 最强 DPS | 放大倍数 | 最强搭配 |
|---|---|---|---|---|---|
| projectile | 火球 / 冰晶矛 / 奥术飞弹 / 回旋刃 / 圣光弹 / 雷球 / 灵能箭 | 8.0 ~ 16.0 | 41.0 ~ 72.3 | ×5.12 | `fan+fan+echo` |
| area | 毒雾 / 陨石 / 乱杀 / 扎心 | 14.0 ~ 27.2 | 39.2 ~ 76.2 | ×2.80 | `echo+echo+echo` |
| chain | 连锁闪电 | 13.5 | 27.7 | ×2.05 | `chain+overload+overload` |
| trap | 地雷阵 | — | — | — | `split` 路线 |
| summon | 哨戒哨兵 | — | — | — | `fan` 路线 |
| orbit | 环刃 | — | — | — | `orbit` 路线 |
| pulse | 霜爆 | **1.9** | **5.4** | ×2.80 | `echo+echo+echo` |

**结论**

1. **形态内是健康的**：projectile 8.0~16.0（2.0×），area 14.0~27.2（1.94×），都在可接受区间。
2. **形态间不健康**：area 顶（23~27）约是 projectile 顶（16）的 1.5 倍；而 pulse（霜爆）只有 1.9，是次低（灵能箭 8.0）的 **1/4**，比最强裸装低 **14 倍**。
3. **霜爆是唯一硬伤**：`cd 3.6 / dmg 7`（`Skills.ts:28`）。作为"范围爆发"它靠命中多目标补伤害，但单体口径只有 1.9，在 BOSS 战（单体）里几乎为零输出。
4. **构筑同质化**：所有 projectile 的最优解都是 `fan+fan+echo`，所有 area 都是 `echo+echo+echo`。一旦玩家摸到这套，其余 8600 种组合都成了陪跑。

### 4.4 建议调整（需人工确认后再动）

| 对象 | 现状 | 建议 | 理由 |
|---|---|---|---|
| 霜爆 | cd 3.6 / dmg 7 → 单体 1.9 | dmg 7 → **12~14**，或 cd 3.6 → 2.8 | 单体抬到 4 左右，多目标时仍是最强的清群之一，不至于在 BOSS 战挂零 |
| `fan` | 每层 +2 发、每发 55% → 满叠 ×5.12 | 第二层起收益 55% → **45%**，或第三层封顶 | 把 projectile 的 5.12× 压到 3.5× 左右 |
| `echo` | 每层 +60%，最多 3 层 → ×2.8 | 改为**加算**（+40%/+40%/+40% = ×2.2） | 削弱 area 的无脑三连，同时让 `echo+echo+overload` 这类混合搭配更有竞争力 |

**注意**：这三项都会改 `tests/run.ts` 里的期望值，且影响存档内的构筑强度。**建议单独开一批，先改霜爆（纯数值、影响面最小），观察一轮再动 fan/echo。**

---

## 5. 性能优化清单

### PERF-01（高）`updateBullets` 的 O(弹 × 敌) 双重循环

**现状**（`Battle.ts:2433`）：

```ts
for (const b of this.bullets) {
  ...
  for (const e of this.enemies) {
    if (e.dead || b.hit.has(e)) continue;
    if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) { ... }
  }
}
```

满配下子弹 20~40、敌人 12~20 → 每帧 240~800 次 `hypot`。`hypot` 内部有溢出保护，比 `sqrt(dx*dx+dy*dy)` 慢约 2 倍。

**修复方案（空间网格）**

```ts
// 字段
private enemyGrid = new Map<number, Enemy[]>();
private static readonly GRID = 64;
private gridScratch: Enemy[] = [];          // 复用，避免每帧分配

private rebuildEnemyGrid(): void {
  const g = this.enemyGrid;
  for (const arr of g.values()) arr.length = 0;   // 复用数组，不清 Map
  for (const e of this.enemies) {
    if (e.dead) continue;
    const k = (Math.floor(e.x / Battle.GRID) << 16) ^ Math.floor(e.y / Battle.GRID);
    const arr = g.get(k);
    if (arr) arr.push(e); else g.set(k, [e]);
  }
}

/** 收集 (x,y) 半径 r 内的候选敌人到 scratch，返回数量 */
private collectNear(x: number, y: number, r: number): number {
  const out = this.gridScratch; out.length = 0;
  const S = Battle.GRID;
  const x0 = Math.floor((x - r) / S), x1 = Math.floor((x + r) / S);
  const y0 = Math.floor((y - r) / S), y1 = Math.floor((y + r) / S);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      const arr = this.enemyGrid.get((cx << 16) ^ cy);
      if (!arr) continue;
      for (const e of arr) out.push(e);
    }
  }
  return out.length;
}
```

调用点改造：

```ts
// updateBullets 内，替换 for (const e of this.enemies)
this.rebuildEnemyGrid();   // 放到 update 主循环里，每帧一次（在 updateEnemies 之后）
...
const n = this.collectNear(b.x, b.y, b.r + 40);
for (let i = 0; i < n; i++) {
  const e = this.gridScratch[i];
  if (e.dead || b.hit.has(e)) continue;
  const dx = e.x - b.x, dy = e.y - b.y;
  if (dx * dx + dy * dy < (e.r + b.r) * (e.r + b.r)) { ... }
}
```

**收益估算**：12 敌、40 弹的场景，从 480 次距离计算降到约 40 × 4 = 160 次，约 **3× 提速**；敌人密度越高收益越大。

**验证**：`tests/run.ts` 586 PASS（战斗逻辑用例覆盖命中判定）；`.tmp/probe_soak2.cjs` 采 FPS 对比。

**风险**：中。网格只在"敌人位置已更新"后重建，**必须放在 `updateEnemies` 之后、`updateBullets` 之前**；`nearestEnemy` 若也改成走网格，注意它的语义是"全局最近"而非"半径内"，需要跨格搜索 + 距离兜底，建议先不动 `nearestEnemy`。

---

### PERF-02（中）每颗子弹分配一个 `Set`

**现状**（`Battle.ts:1275`）：`hit: new Set()`

每颗子弹创建一个 `Set`，满配每秒 20~40 颗 → 每秒 20~40 个短命对象 + 扩容。60 秒一局约 1200~2400 次分配。

**修复方案（对象池）**

```ts
// 字段
private hitSetPool: Set<Enemy>[] = [];

// spawnBullet
const hit = this.hitSetPool.pop() ?? new Set<Enemy>();
hit.clear();
const b: Bullet = { ..., hit, ... };

// 子弹回收处（updateBullets / bullet 死亡分支）
if (this.hitSetPool.length < 64) { b.hit.clear(); this.hitSetPool.push(b.hit); }
```

**收益**：GC 次数下降。压测已显示堆稳定（87MB），所以这是"减少 GC 抖动"而非"解决泄漏"，优先级中。

**风险**：低。注意子弹回收时必须 `clear()` 后再入池，否则下一颗子弹会"继承"上一颗的命中表 → 打不中。

---

### PERF-03（中）HUD 每帧拼接签名字符串

**现状**（`Hud.ts:220-227`）：

```ts
let sig = [Math.round(d.hp), d.maxhp, d.lv, Math.round(d.exp), d.gold, d.wave, d.kills, ...].join('|');
for (...) sig += '|' + (s ? s.name + ':' + s.lvl + ':' + s.modCount + ':' + s.cdPct.toFixed(2) + ':' + s.icon : '-');
if (sig === this.lastSig) return;
```

`toFixed(2)` 每次调用产生新字符串，整串每帧重建（约 200~400 字节），60fps → 每秒 12~24KB 垃圾。脏检查本身是对的（C6 优化），但代价转移到了字符串分配上。

**修复方案 A（节流，一行）**

```ts
// sync(dt) 开头
this.syncT = (this.syncT ?? 0) + dt;
if (this.syncT < 0.05) return;     // 20Hz 足够，CD 进度条的视觉差异看不出来
this.syncT = 0;
```

**方案 B（数值脏比较，彻底）**

把签名拆成几个标量比较，任一变脏才重绘：

```ts
const hp = Math.round(d.hp);
let dirty = hp !== this.c.hp || d.maxhp !== this.c.maxhp || d.lv !== this.c.lv
         || Math.round(d.exp) !== this.c.exp || d.gold !== this.c.gold || d.wave !== this.c.wave;
for (let i = 0; i < 4; i++) { const s = d.skills[i]; if ((s ? s.id + s.lvl + s.modCount : '') !== this.c.sk[i]) dirty = true; }
if (!dirty) return;
this.c = { hp, maxhp: d.maxhp, lv: d.lv, exp: Math.round(d.exp), gold: d.gold, wave: d.wave, sk: [...] };
```

**推荐 A**（改动最小、风险最低），若后续 profiling 仍见 GC 尖峰再上 B。

---

### PERF-04（中）`nearestEnemy` 线性扫描

`Battle.ts:1495` 每次调用遍历全部敌人。调用点包括：技能索敌（每施放一次）、连锁闪电每一跳、追踪弹每 0.1s、哨兵每 0.9s、蓄能结算。

**修复方案**：优先复用 PERF-01 的网格做"就近格搜索"；若暂不做网格，可加一个 **0.1s 缓存**（同一帧内多次调用直接复用结果）—— 但要注意"排除集" `exclude` 不同则不能复用。

**收益**：中等。连锁闪电跳数最多 10 跳，每跳一次全表扫描，是当前第二热点。

**风险**：低（缓存版）/ 中（网格版）。

---

### PERF-05（低）其它

| 项 | 位置 | 建议 |
|---|---|---|
| BOSS 标签每帧查找 | `updateEnemies` 内 `e.node.getChildByName('bossTag')` | 在 `Enemy` 结构里缓存 `bossTagNode` 引用 |
| 闪电节点未池化 | `spawnBolt` 每次 `new Node + Graphics` | 入对象池（寿命 0.2s，峰值不高，优先级低） |
| 资源缓存不释放 | `engine/Assets.ts` 全部 `Map` 常驻 | 单局无影响；若做多局/热更新，加 `releaseUnused()` |
| iOS 高性能模式 | 项目设置 | 开 `iOSHighPerformance` |
| 静态 UI 帧率 | 菜单/图鉴/设置页 | 降到 30fps，省电 |

---

## 6. UI 合规审查

### 6.1 对照标准

- 微信小程序设计规范：点击热区 ≥ 44×44px、辅助文本 ≥ 12px、正文 14~16px、行高 ≥ 1.5×、超长文本必须换行或省略号（不得硬裁）、页面边距 ≥ 16px。
- iOS HIG：最小可点击尺寸 44×44pt、正文最小 17pt（中文可 15~16）、行距 1.5 倍左右。

### 6.2 逐项符合度

| 检查项 | 要求 | 实测 | 结论 |
|---|---|---|---|
| 点击热区 | ≥ 44×44 | `UIKit.button()` 强制 `hh = Math.max(44, h)`（`UIKit.ts:264`） | **达标** |
| 辅助文本字号 | ≥ 12px | `FS.xs = 11`（`Tokens.ts`） | **不达标**，建议 11 → 12 |
| 正文行高 | ≥ 1.5× | `text()` 设 `lineHeight = size * 1.5` | **达标** |
| 文字超长处理 | 换行或省略，不得硬裁 | `overflow = CLAMP` + `enableWrapText`，但卡片高度写死 19px | **不达标**（BUG-06） |
| 页面边距 | ≥ 16px | 主菜单/结算/商店均为 16~20px | **达标** |
| 文字遮挡 | 无重叠 | 三视口 × 11 页，仅 2 条裁切 | **基本达标** |
| 对比度 | ≥ 4.5:1（正文） | 深底浅字，主色 `cream` 对 `bg` 约 12:1 | **达标** |

### 6.3 三视口审计结果

```
360×640：2 条（升级三选一，均 BUG-06）
390×844：0 条
412×915：0 条
```

覆盖页面：主菜单 / 选角色 / 玩法说明 / 设置 / 图鉴 / 成就 / HUD / 升级三选一 / 商店 / 暂停构筑 / 结算。

**唯一未达标项就是 BUG-06**，修完即为 0。

### 6.4 `FS.xs = 11px` 的处理建议

11px 低于微信规范下限 12px，但它只用于纯装饰性小字（版本号、次要说明）。两条路：

- **合规路线**：`FS.xs` 11 → 12。需要回归所有用了 `FS.xs` 的位置是否因变大而溢出（审计脚本可直接验证）。
- **例外路线**：保留 11px，但确认这些文字**不承载必要信息**（版本号可以，操作提示不行）。

建议走合规路线，成本低且审计脚本能兜底。

---

## 7. AI 自动化测试方案

### 7.1 业内方案对比

| 方案 | 类型 | 能力 | 接入成本 | 价格 |
|---|---|---|---|---|
| **modl:test** | 黑盒 + LLM | 录屏喂给多模态模型，判"画面是否明显错乱/卡住" | 极低（无需埋点） | $2000-8000/年 |
| **GameDriver** | API 层驱动 | 直接调引擎 API 做确定性断言，最稳 | 中（需改测试代码） | 商业授权 |
| **Applitools** | 视觉回归 | 像素级基线对比 + AI 忽略无关差异 | 低 | 按截图量计费 |
| **Playwright `toHaveScreenshot`** | 视觉回归 | 免费、可自托管基线 | 低 | 免费 |
| **UI-TARS**（字节，开源） | 多模态 Agent | 看截图自主点击/拖拽，ScreenSpotPro 94.2% | 中（需 GPU） | 自建成本 |
| **LVLM-Playground**（ICLR 2025） | 研究框架 | 用 LVLM 玩 3A 游戏做 QA | 高 | 免费 |
| **VideoGameQA-Bench**（NeurIPS 2025） | 基准 | 评估"哪个 VLM 适合做游戏 QA" | 低 | 免费 |
| **腾讯 WeTest** | 商业云测 | 无代码自动探索，官方称效率 +300% | 低 | 按机时 |

### 7.2 给本项目的建议（分层，按性价比排序）

**L1 · 已有地基，零成本增量（本轮就能做）**

`tools/ui/audit_text_fit.cjs` 已经能做：页面遍历 + 矩形越界 + 文本裁切 + 遮挡检测。把它从"人工跑"改成"CI 断言"：

```bash
# 期望输出 "合计问题 0 条"，否则退出码非 0
node tools/ui/audit_text_fit.cjs --fail-on-issue
```
收益：BUG-06 这类问题**永久不再复发**。

**L2 · 逻辑层回归（已具备）**

`tests/run.ts` 586 例，纯逻辑、秒级。建议把本轮新增的规则断言补进去：
- 每个 tag 都能在 `TAG_CN` 命中（防 BUG-05 复发）
- 每个白名单项都对应一个真实被消费的字段（防 CNT-02 复发）

**L3 · 视觉冒烟（推荐引入，低成本）**

录 30 秒战斗（含菜单→开局→战斗→升级→结算），抽 5~8 帧交多模态模型判断："是否有明显穿模/黑屏/UI 错位/角色卡住"。modl:test 是零接入方案；若想自建，UI-TARS 开源可跑。

**L4 · 真机性能与兼容（人工 + 云测）**

微信真机仍建议走 WeTest 或自建真机池，跑帧率/内存/发热曲线。AI 方案替代不了真机。

**L5 · 人类主观（不可省）**

手感、节奏、爽感 —— 只能靠人。建议每轮大改后固定 3 人试玩 20 分钟。

### 7.3 不建议现在做的

- 引入 GameDriver 类 API 层商业方案：本项目逻辑层已有 `tests/run.ts` 覆盖，收益重复。
- 全自动 AI 通关测试：本作是 roguelike，随机性强、判定标准难定义，投入产出比低。

---

## 8. 修复批次建议

| 批次 | 内容 | 文件 | 预计改动 | 回归重点 |
|---|---|---|---|---|
| **批次 1（P0）** | BUG-01、BUG-02、BUG-03 | `GameRoot.ts`、`Battle.ts` | ~15 行 | 反复进出菜单 5 次；蓄力中换技能；连续开 3 局 |
| **批次 2（P1 视觉/文案）** | BUG-04、BUG-05、BUG-06、BUG-07 | `GameRoot.ts`、`Modals.ts`、`Hud.ts` | ~20 行 | 三视口 UI 审计归零；结算页截图 |
| **批次 3（规则）** | CNT-01、CNT-02、CNT-03 | `SkillCalc.ts`、`Battle.ts`、`SkillRules.ts` | ~30 行 | 组合审计重跑；构筑面板选项数变化 |
| **批次 4（数值）** | 霜爆单独调，观察一轮再动 fan/echo | `Skills.ts`、`SkillCalc.ts` | 1~3 行 | 平衡回归、`tests/run.ts` 期望值 |
| **批次 5（性能）** | PERF-02、PERF-03 先行；PERF-01/04 单独一批 | `Battle.ts`、`Hud.ts` | ~60 行 | 压测 FPS/内存对比 |
| **批次 6（工程）** | BUG-08、`FS.xs` 12px、UI 审计接 CI | 多处 | ~10 行 | 全套回归 |

每批完成后统一跑：

```bash
# 1) 类型检查（两套）
npx tsc -p tsconfig.check.json
npx tsc -p tsconfig.ui-check.json

# 2) 逻辑单测
node /h/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts

# 3) 组合审计
node /h/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tools/audit_combo.ts

# 4) UI 审计（需先起静态服务）
node tools/ui/serve.cjs            # 8123
PLAYWRIGHT_BROWSERS_PATH='C:/Users/LIN/AppData/Local/ms-playwright' \
NODE_PATH=/h/AI-game/pixel_roguelike_wechat_agent_kit/node_modules \
node tools/ui/audit_text_fit.cjs
```

---

## 附录 A · 复现命令

| 目的 | 命令 |
|---|---|
| 单测基线 | `node <tsx> tests/run.ts` → 586 PASS / 0 FAIL |
| 组合审计 | `node <tsx> tools/audit_combo.ts` → 8616 组、4.08× |
| UI 审计 | `node tools/ui/audit_text_fit.cjs` → 2 条 |
| BUG-01 复现 | `node .tmp/probe_menu.cjs` → 数据按钮 1→2→3 |
| BUG-02 复现 | `node .tmp/probe_chargefx.cjs` → `fxRef:true, nodesInTree:1` |
| 内存压测 | `node .tmp/probe_soak2.cjs` → mem 87MB 恒定 |

环境变量（Playwright 相关）：
```bash
PLAYWRIGHT_BROWSERS_PATH='C:/Users/LIN/AppData/Local/ms-playwright'
NODE_PATH=/h/AI-game/pixel_roguelike_wechat_agent_kit/node_modules
```

## 附录 B · 产物清单

| 路径 | 内容 |
|---|---|
| `reports/full_audit_and_fix_plan_20261102.md` | 本文档 |
| `reports/full_audit_20261102.md` | 结论摘要版 |
| `reports/text_fit/*.png` | 三视口 × 7 页面截图（21 张） |
| `reports/text_fit/chargefx_leak.png` | BUG-02 视觉证据 |
| `reports/text_fit/soak.png` | 压测末帧 |
| `reports/text_fit/tags-check.png` | BUG-05 英文标签证据 |
| `tools/audit_combo.ts` | 组合审计脚本（新增） |
| `tools/ui/audit_text_fit.cjs` | UI 审计脚本（新增） |
| `.tmp/probe_menu.cjs` | BUG-01 复现脚本 |
| `.tmp/probe_chargefx.cjs` | BUG-02 复现脚本 |
| `.tmp/probe_soak2.cjs` | 内存压测脚本 |

---

## 附录 C · 本轮已确认无问题的项（避免重复排查）

| 项 | 结论 | 依据 |
|---|---|---|
| 战斗内节点/内存泄漏 | 无 | 60s 压测：节点 122→351 振荡、堆 87MB 恒定、池 40/48 与 22/64 |
| `Hud.slots[k].modDots` 未 clear | 无问题 | 实际每帧有 `s.modDots.clear()`（`Hud.ts:299`），`pathLength` 恒为 6 |
| `addExp` 的 `while` 死循环 | 无风险 | `RunSave` 校验已保证 `expNeed >= 1` |
| 伤害数字 / 火花对象池泄漏 | 无 | 上限 48 / 64，超限 `destroy`，压测中未触顶 |
| `curModal` 孤儿弹窗 | 已修 | 带销毁语义的 setter（M61），实测切换正常 |
| BOSS 死亡推进 | 正常 | `bossDefeated` / `bossKilled` 语义分离，波次推进正确 |
| 三视口文字遮挡 | 无 | 审计 11 页仅 2 条纵向裁切，无重叠 |
