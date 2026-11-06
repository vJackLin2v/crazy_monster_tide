# 疯狂怪潮 · 二次全量审查（微信平台 / 苹果端专项）

- 日期：2026-11-06
- 对象：`H:\AI-game\crazy_monster_tide`（Cocos Creator 3.8.6 / 微信小游戏）
- 性质：**只审查与规划，未改动任何游戏源码**
- 背景：2026-11-02 的 8 个 BUG + 3 个规则问题已全部修复（批次 1-7），本次为独立复查 + 平台层专项

---

## 0. 结论摘要

| 维度 | 结论 |
|---|---|
| **回归** | 全部通过：tsc 双配置 0 错误、586 PASS、UI 审计 0 条、60s 压测无泄漏 |
| **内存** | **无泄漏**（堆 51MB 全程恒定、峰值 87MB、节点 125→309 振荡回落） |
| **新 BUG** | **1 个 P0**：微信胶囊按钮遮挡 HUD 暂停键（4 机型实测，最严重重叠 1290px²，按钮 2/3 被盖） |
| **苹果端** | 安全区/底部 Home 条/包体积/文本均达标；胶囊是唯一硬伤 |
| **微信功能** | 转发、分享、排行榜、订阅消息**全部未实现**（0 处相关 API），需从零建设 |
| **包体积** | 主包 3.2MB（< 4MB 限制）、总 18MB（< 20MB 限制），**达标** |

**最优先事项**：修胶囊遮挡（1 个文件、约 15 行），否则 iPhone 用户进战斗后**无法暂停**。

---

## 1. 基线与回归验证

| 项目 | 命令 | 结果 |
|---|---|---|
| 逻辑层类型 | `tsc -p tsconfig.check.json` | **0 错误** |
| UI 层类型 | `tsc -p tsconfig.ui-check.json` | **0 错误** |
| 逻辑单测 | `tsx cocos/tests/run.ts` | **586 PASS / 0 FAIL** |
| 文本/布局审计 | `node tools/ui/audit_text_fit.cjs` | 三视口 **合计 0 条** |
| 内存压测（60s，第 15 波 + 4 满级技能） | `node .tmp/probe_soak2.cjs` | 见下 |

```
start {"nodes":125,"en":5,"mem":51,"peak":87}
15s   {"nodes":292,"en":13,"dp":15,"sp":10,"mem":51,"peak":87}
30s   {"nodes":263,"en":12,"dp":21,"sp":6,"mem":51,"peak":87}
45s   {"nodes":275,"en":8,"dp":34,"sp":14,"mem":51,"peak":87}
60s   {"nodes":309,"en":13,"dp":27,"sp":13,"mem":51,"peak":87}
errors: none
```

节点数在 125~309 之间振荡（对象池正常回收），JS 堆 **51MB 全程零增长**，峰值 87MB 不抬升，`dmgPool` 峰值 34（上限 48）、`sparkPool` 峰值 17（上限 64）。**结论：战斗内无泄漏。**

包体积（`du -sh` 实测）：

```
cocos/build/wechatgame              18M
cocos/build/wechatgame/subpackages  15M
主包（排除 subpackages）             3.2M
```

主包 3.2MB < 微信小游戏 4MB 首包限制 ✓；总量 18MB < 20MB 总包限制 ✓。**余量 2MB，后续加分享图/排行榜子域要留意。**

---

## 2. 新发现缺陷

### BUG-09（P0 · 苹果端）微信胶囊按钮遮挡暂停键与倒计时

#### 现象

iPhone 进战斗后，右上角的**暂停按钮被微信原生胶囊按钮（··· 和 ○）压住**，点击落不到游戏上；同时倒计时数字右半被遮挡。安卓胶囊同样在右上角，受影响程度相近。

#### 实测数据

用 Playwright 注入 `wx.getMenuButtonBoundingClientRect` 模拟四款 iPhone，扫描 HUD 全部节点与该矩形求交（脚本 `.tmp/probe_capsule.cjs`）：

| 机型 | 设计分辨率 | 胶囊(设计px) | 暂停键 pauseHit | 重叠面积 | 倒计时文字重叠 |
|---|---|---|---|---|---|
| iPhone SE2 375×667 | 360×640 | L270 T23 R353 B54 | x[308,352] y[548,592] | **253px²** | 239px² |
| iPhone 13 390×844 | 360×779 | L273 T47 R354 B77 | x[308,352] y[687,731] | **1259px²** | 554px² |
| iPhone 14 Pro 393×852 | 360×780 | L274 T53 R354 B82 | x[308,352] y[688,732] | **1290px²** | 531px² |
| iPhone 15 Pro Max 430×932 | 360×780 | L281 T53 R354 B80 | x[308,352] y[688,732] | **1179px²** | 287px² |

以 iPhone 13 为例：暂停键垂直占 687~731（44px 高），胶囊占 702~732 → **上方 29px 被盖，占按钮 66%**。胶囊是微信原生层，事件会被它吃掉，等于**暂停功能在全面屏 iPhone 上基本不可用**。

截图：`reports/text_fit/capsule_390x844.png` 等四张。

#### 根因

`ui/Hud.ts:146-149` 已经算好了胶囊矩形，但**算完就扔了**：

```ts
const caps = wxCapsuleRect();
const capsSane = !!caps && caps.left > 120 && caps.left < VW - 24 && caps.bottom < VH * 0.4;
// ↑ 这两个变量此后从未被引用（grep 全文件仅此一处）
const rightEdge = VW - 68;          // 写死
const pauseX = VW - 30;             // 写死
const pauseY = S + 42;              // 写死：距顶 = 安全区 28 + 42 = 70
```

而注释还写着：

```
// 胶囊只在顶部 ~46px 高，把暂停键下移到 S+62 就完全错开，文字不必再左让。
```

**注释说的是 `S+62`，代码是 `S+42`** —— 说明这里曾经按 `S+62` 改对过，后来又被改回 42，而避让逻辑整体退化成死代码。

为什么 `S+42` 会被盖：iPhone 13 胶囊底边距顶 77px（设计像素），暂停键中心距顶 70、高 44 → 顶边距顶 48，**完全落在胶囊的 47~77 区间内**。

`tsc` 不报未使用变量（`noUnusedLocals` 未开启），所以这个回归一路混到了现在。

#### 影响面

- **功能**：iPhone 全面屏机型（13/14/15 全系）暂停键点不动 → 玩家无法主动暂停、无法在战斗中查看构筑/退出。
- **视觉**：倒计时数字右侧被切，`:30` 这类两位数最明显。
- **范围**：仅真机；浏览器/开发者工具里 `wxCapsuleRect()` 返回 null，**所以所有 Web 端的自动化测试都发现不了**——这也是它能存活的原因。

#### 修复方案

核心思路：把"算出来的胶囊矩形"真正用起来，让暂停键落在胶囊**正下方**，文字列右边界让到胶囊左侧。

```ts
// ui/Hud.ts:146 起，替换现状
const caps = wxCapsuleRect();
// 胶囊合法性：某些机型/开发者工具返回值不可信（历史上有过暂停键跑出屏幕的反馈）
const capsSane = !!caps && caps.left > 120 && caps.left < VW - 24 && caps.bottom < VH * 0.4;

// 胶囊底边（设计像素，距屏幕顶部）。无胶囊时退回 0
const capBottom = capsSane ? caps!.bottom : 0;

// 暂停键：中心放在胶囊下方，至少留 18px 间隙；无胶囊时保持原位置
const pauseY = Math.max(S + 42, capBottom + 18 + 22);   // 22 = 按钮半高
// 文本列右边界：有胶囊时让到胶囊左侧 8px，避免长文案钻到胶囊下面
const rightEdge = capsSane ? Math.min(VW - 68, caps!.left - 8) : VW - 68;
```

**但要注意垂直空间冲突**：暂停键下移后会撞上 BOSS 血条（`S + 80`，即距顶 108）。iPhone 13 上 `capBottom = 77`，`pauseY = 77+18+22 = 117` → 暂停键占 95~139，BOSS 血条在 108，**会重叠**。

所以推荐**方案 B（换位）**，更彻底：

```ts
// 把暂停键从右上移到「胶囊下方的右侧竖条」，同时把 BOSS 血条整体下移
const pauseX = VW - 30;
const pauseY = capsSane ? caps!.bottom + 24 : S + 42;   // 中心距顶 101（iPhone 13）
// BOSS 区：从 S+80 改为「暂停键下方」，避开两者
const bossTop = Math.max(S + 80, (capsSane ? caps!.bottom + 24 + 18 : S + 42) + 16);
```

或者**方案 C（最省事）**：把暂停键挪到**左上角**（胶囊永远在右上），`pauseX = 30`、`pauseY = S + 42`。左上角当前是"波次·击杀"文字，把文字右移让位即可。

| 方案 | 改动量 | 优点 | 缺点 |
|---|---|---|---|
| A 下移 | 3 行 | 最小 | 撞 BOSS 血条，需连带改 BOSS 布局 |
| B 下移 + BOSS 顺延 | ~8 行 | 保持右上角习惯 | 右上角竖向空间变紧，小屏（SE2）可能挤 |
| **C 移到左上** | ~5 行 | 一劳永逸，不依赖胶囊值 | 改变玩家习惯（但多数割草游戏暂停就在左上） |

**推荐 C**：胶囊是微信的硬约束，右上角永远要和它抢地盘；左上角只有游戏自己的文字，可控。且不依赖 `getMenuButtonBoundingClientRect` 的设备兼容性（该 API 在个别机型历史上返回过异常值，代码里那段 `capsSane` 校验就是为此加的）。

若选 C，还要处理：`waveText`/`timerText` 右对齐到 `VW-12`，把左上角整块让出来。

#### 验证方法

1. 复跑 `.tmp/probe_capsule.cjs`，四机型均应输出 `>>> 无实体控件与胶囊重叠`。
2. 真机（iPhone 13/14 任一台）：进战斗，点右上角（或左上角）暂停，能弹出暂停面板。
3. 三视口 UI 审计仍为 0 条（确认文字右移后没溢出）。
4. 顺带把 `capsSane` 从死变量变成真正参与判断（或删除，避免下次误读）。

---

### RISK-01（P1 · 待真机确认）iOS 首次进入时 BGM 可能静音

**依据**（代码事实 + 平台约束，非实测）：

`engine/Audio.ts` 用 Cocos `AudioSource`，`bgm('menu')` 在 `showMenu()` 里**自动调用**：

```ts
private showMenu() {
  ...
  Sfx.bgm('menu');
```

而 iOS 微信小游戏对音频自动播放有限制（首次播放需要用户手势上下文）。当前代码没有任何"首次触摸后补播/恢复"的逻辑，也没有 `wx` 音频 API 兜底。

**判断**：这是**已知平台风险，但必须真机确认**——Cocos 3.8 的小游戏 adapter 内部可能已经做了 `wx.createInnerAudioContext` 的解锁处理，不能仅凭代码断言会静音。

**若真机确认无声，修复方案**：

```ts
// 在 GameRoot 的首次触摸回调里（任何一次 onTap 都行，加个 once 守卫）
private audioUnlocked = false;
private unlockAudioOnce(): void {
  if (this.audioUnlocked) return;
  this.audioUnlocked = true;
  Sfx.replayCurrentBgm();     // 新增：把 curBgm 重新 play 一次
}
```

配合 `AudioMgr` 增加：

```ts
replayCurrentBgm(): void {
  if (!this.bgmSrc || !this.curBgm) return;
  try { this.bgmSrc.stop(); this.bgmSrc.play(); } catch { /* ignore */ }
}
```

**验证**：iPhone 真机冷启动 → 停在主菜单 5 秒 → 听是否有 BGM；若无，点一下任意按钮后再听。

---

### RISK-02（P2 · 设计风险）全屏摇杆与 iOS 底部手势区

`Joystick` 节点是全屏的（实测 `x[0,360] y[70,710]`），玩家在屏幕最底部 34px（Home Indicator 区）拖拽时，iOS 可能把手势判为"上滑回桌面"，导致操作中断。

这不是 bug（微信不提供禁用系统手势的 API），但建议：

- 摇杆的**有效感应区**上移，底部留出 `safeBottom() + 8` 的死区；
- 或者在教程/首次进入时提示"在屏幕中上部拖动"。

当前 `Joystick` 已从 `y=70` 起（等于留了 `safeTop` 那么多的底部边距？需确认坐标系），实测不与底部重叠，风险较低，列为观察项。

---

## 3. 本轮已排除的问题（避免重复排查）

| 怀疑项 | 结论 | 依据 |
|---|---|---|
| 战斗内存泄漏 | **无** | 60s 压测堆 51MB 恒定、峰值 87MB、节点振荡 |
| `hitSetPool` 复用是否会串命中表 | **正确** | 回收处 `b.hit.clear()` 后才入池（`Battle.ts:2559`） |
| `chargeFx` 清理是否彻底 | **彻底** | 换技能 `499-502` + 开新局 `551-556` 双路径都销毁并重置 |
| 空间网格是否漏判（半径不足） | **无风险** | 敌人 `r` 最大 26（BOSS），网格按 `b.r + 40` 收集，余量充足 |
| 网格重建时机 | **正确** | 主循环顺序 `updateEnemies → rebuildEnemyGrid → updateBullets` |
| 切后台回来 dt 暴涨导致瞬移 | **已防** | `onAppHide` 直接 `paused = true`，`update` 首行早退 |
| 文本裁切/遮挡 | **0 条** | 三视口 × 11 页审计 |
| 安全区读取 | **正确** | `sys.getSafeAreaRect(false)`，非早期错误的 `view.getSafeAreaRect` |
| 主包超限 | **达标** | 3.2MB < 4MB |
| 精英/BOSS 放大后碰撞半径失真 | **无** | 只放大显示，`r` 不变（M64） |

---

## 4. 苹果端适配逐项对照

| 检查项 | 标准 | 现状 | 判定 |
|---|---|---|---|
| 刘海/灵动岛 | 顶部内容避开安全区 | `safeTop()` = max(28, 真实安全区)，17 处页面使用 | ✅ |
| 底部 Home Indicator | 内容避开 34pt | `safeBottom()`，技能栏 `VH-B-63` | ✅ |
| **右上胶囊按钮** | 内容不得进入胶囊矩形 | HUD 暂停键、倒计时与胶囊重叠 | ❌ **BUG-09** |
| 竖屏锁定 | portrait | `game.json: deviceOrientation=portrait` | ✅ |
| 触摸热区 | ≥ 44×44 | `button()` 强制 `Math.max(44,h)` | ✅ |
| 字号下限 | ≥ 12px（辅助文本） | `FS.xs` 已从 11 改到 12 | ✅ |
| 文字不裁切 | 换行或省略 | 审计 0 条 | ✅ |
| 包体积 | 首包 ≤ 4MB，总 ≤ 20MB | 3.2MB / 18MB | ✅（余量 2MB） |
| 前后台切换 | 挂起不丢进度、回来不偷袭 | `onAppHide` 存档 + `onAppShow` 弹暂停 | ✅ |
| 音频自动播放 | iOS 需手势解锁 | 无解锁逻辑 | ⚠️ RISK-01 |
| 高刷新率（120Hz） | dt 稳定 | `dt` 来自引擎，切后台已拦截 | ✅ |
| 大内存机型被杀 | 峰值 < 1GB | 峰值 87MB | ✅ |
| 真机性能 | 稳定 60fps | 未测（需真机） | ⏳ |

---

## 5. 微信小游戏基础功能规划

### 5.1 现状盘点

| 功能 | 现状 | 缺口 |
|---|---|---|
| 转发给好友（被动，右上角菜单） | **未实现** | 无 `wx.showShareMenu` / `wx.onShareAppMessage` |
| 转发给好友（主动，按钮触发） | **未实现** | 无 `wx.shareAppMessage` |
| 分享落地（带参数进入） | **未实现** | 无 `query` 解析 |
| 朋友圈分享 | 未实现 | 小游戏不支持朋友圈（平台限制） |
| 好友排行榜 | **未实现** | `game.json` 无 `openDataContext`，无子域工程 |
| 订阅消息 | 未实现 | 无模板 ID、无 `requestSubscribeMessage` |
| 游戏圈 / 录屏分享 | 未实现 | 无 `wx.createGameClubButton` / 录屏 API |
| 数据上报 | **已实现** | `DeviceLog` + `getRealtimeLogManager` |
| 版本更新 | **已实现** | `Update.ts` + `getUpdateManager` |

**结论：转发链路从零开始，排行榜需要新建子域工程。**

### 5.2 转发功能（P0，建议第一优先）

#### 5.2.1 被动转发（玩家点右上角 ··· → 转发）

```ts
// 新增 game/Share.ts
export interface SharePayload { title: string; imageUrl: string; query: string; }

/** 游戏启动时调用一次 */
export function initShare(): void {
  const wx = (globalThis as any).wx;
  if (!wx) return;

  // 打开转发菜单（withShareTicket 用于后续取群 ID，做群排行时需要）
  try { wx.showShareMenu({ withShareTicket: true }); } catch { /* 低版本忽略 */ }

  // 被动转发：微信会在玩家点"转发"时回调这里取内容
  try {
    wx.onShareAppMessage(() => buildShare('menu'));
  } catch { /* ignore */ }
}

function buildShare(scene: 'menu' | 'result' | 'win'): SharePayload {
  // 按场景给不同文案，提高点击率
  ...
}
```

#### 5.2.2 主动转发（结算页"炫耀成绩"按钮）

```ts
export function shareResult(info: { wave: number; kills: number; charName: string }): void {
  const wx = (globalThis as any).wx;
  if (!wx || typeof wx.shareAppMessage !== 'function') return;
  wx.shareAppMessage({
    title: `我用${info.charName}撑到第 ${info.wave} 波，击杀 ${info.kills} 只，来试试？`,
    imageUrl: 'share/result.png',      // 5:4，建议 500×400，<128KB
    query: `from=result&wave=${info.wave}`,   // 落地参数
  });
}
```

**入口位置**：结算页底部，与"再来一局"并排（不要做成主按钮，避免抢主线）。

#### 5.2.3 分享落地（带参数进入）

```ts
// GameRoot 初始化时
function readLaunchQuery(): Record<string, string> {
  const wx = (globalThis as any).wx;
  if (!wx) return {};
  try {
    const opt = wx.getLaunchOptionsSync?.();
    return opt?.query ?? {};
  } catch { return {}; }
}

// 还要处理"游戏已在后台，从分享卡片再次进入"
try {
  wx.onShow?.((res: any) => {
    const q = res?.query ?? {};
    if (q.from) handleShareEnter(q);
  });
} catch { /* ignore */ }
```

`handleShareEnter` 可以做的轻量运营：
- `from=result&wave=N` → 主菜单顶部显示"好友打到了第 N 波"，制造对比；
- 记录来源，用于后续分析分享转化（复用现有 `DeviceLog`，加一条 `share_enter` 事件）。

#### 5.2.4 分享素材规格（微信硬要求）

| 项 | 要求 |
|---|---|
| 图片比例 | **5:4**（宽:高） |
| 建议尺寸 | 500×400 |
| 文件大小 | 建议 < 128KB |
| 格式 | png / jpg |
| 标题长度 | 建议 ≤ 30 字（超出会截断） |

需要新做 3~4 张：菜单通用、通关炫耀、死亡安慰、角色专属。**这属于美术产出，需过 Asset Gate。**

#### 5.2.5 改动清单

| 文件 | 改动 |
|---|---|
| `game/Share.ts` | 新增（约 120 行） |
| `GameRoot.ts` | `initShare()` + `readLaunchQuery()` + 结算页分享按钮 + `onShow` 监听 |
| `ui/Modals.ts` | 结算面板加"炫耀成绩"按钮 |
| `game/DeviceLog.ts` | 新增 `share_click` / `share_enter` 事件 |
| `assets/share/*.png` | 新增分享图（需美术） |

**工作量估算**：逻辑 1 天，分享图 0.5 天，联调 0.5 天。

### 5.3 好友排行榜（P1）

#### 5.3.1 平台机制

微信小游戏的排行榜必须走**开放数据域**：好友数据只能在独立的 JS 沙箱（子域）里读，主域拿不到，只能在 sharedCanvas 上画。

```
主域（游戏）                     子域（openData/index.js）
  |                                  |
  |-- postMessage({type:'rank'}) --> |
  |                                  |-- wx.getFriendCloudStorage()
  |                                  |-- 在 sharedCanvas 上画榜单
  |<-- sharedCanvas 作为纹理贴图 ----|
```

#### 5.3.2 配置改动

```json
// game.json 增加
{
  "openDataContext": "openData"
}
```

Cocos Creator 侧需要在构建面板勾选"开放数据域"，并单独建一个子域工程目录（Cocos 3.8 支持 `build-templates/wechatgame/openData`）。

#### 5.3.3 数据字段（已有，无需改存档）

`Progress.ts` 的 `SaveData` 里现成可用：

```ts
bestWave: number;   // 最高波次 —— 主排序键
bestLv: number;     // 最高等级
kills: number;      // 累计击杀
bossKills: number;  // 击败 BOSS 次数
```

#### 5.3.4 主域代码骨架

```ts
export function submitScore(save: SaveData): void {
  const wx = (globalThis as any).wx;
  if (!wx?.setUserCloudStorage) return;
  wx.setUserCloudStorage({
    KVDataList: [
      { key: 'bestWave', value: String(save.bestWave) },
      { key: 'bestLv', value: String(save.bestLv) },
    ],
  });
}

export function openRank(): void {
  const wx = (globalThis as any).wx;
  const odc = wx?.getOpenDataContext?.();
  if (!odc) return;
  odc.postMessage({ type: 'showRank', key: 'bestWave' });
  // 把 odc.canvas 贴到 Sprite 上（Cocos 3.8 用 Texture2D + ImageAsset 绑定 canvas）
}
```

#### 5.3.5 子域代码骨架

```js
// openData/index.js
const sharedCanvas = wx.getSharedCanvas();
const ctx = sharedCanvas.getContext('2d');

wx.onMessage((msg) => {
  if (msg.type === 'showRank') renderRank(msg.key);
});

function renderRank(key) {
  wx.getFriendCloudStorage({
    keyList: [key],
    success(res) {
      const list = res.data
        .map(d => ({ name: d.nickname, avatar: d.avatarUrl, v: +(d.KVDataList.find(k => k.key === key)?.value || 0) }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 20);
      draw(list);
    },
  });
}
```

**注意**：子域只能用 Canvas 2D API 画（不能用 Cocos 组件），头像需要 `wx.createImage()` 加载。

#### 5.3.6 工作量与风险

- 子域工程搭建 + 榜单绘制：2~3 天
- 头像跨域加载、滚动、自己的排名高亮：+1 天
- **风险**：开放数据域与主域的 Canvas 合成在 iOS 上有过兼容问题（需真机验证）；子域代码无法热更新，改动要重新提审。
- **建议**：转发先上（收益/成本比高），排行榜作为第二阶段。

### 5.4 订阅消息（P2）

用途：每日挑战提醒、体力恢复提醒（本作无体力，价值有限）。

```ts
wx.requestSubscribeMessage({
  tmplIds: ['<模板ID>'],
  success: (res) => { /* res[tmplId] === 'accept' */ },
});
```

**前提**：需要在微信公众平台申请模板（审核 1~3 天），且**必须由用户点击触发**，不能自动弹。

对本作（单局 3~5 分钟的割草）而言，订阅消息的价值低于转发与排行榜，**建议延后**。

### 5.5 其他可选功能

| 功能 | API | 价值 | 建议 |
|---|---|---|---|
| 游戏圈 | `wx.createGameClubButton` | 玩家交流/反馈 | 低（需先有量） |
| 录屏分享 | `wx.getGameRecorderManager` | 高光时刻分享 | 中（割草游戏刷屏效果强，但开发成本高） |
| 收藏 | 小游戏**不支持** `addToFavorites`（那是小程序 API） | — | 跳过 |
| 朋友圈分享 | 小游戏**不支持** | — | 跳过 |

### 5.6 实施顺序建议

```
第 1 步（P0，1 天）：修 BUG-09 胶囊遮挡 —— 这个比任何新功能都优先
第 2 步（P0，2 天）：转发链路（被动 + 主动 + 落地参数 + 埋点）
第 3 步（P1，1 天）：分享图制作 + 结算页入口
第 4 步（P1，3~4 天）：好友排行榜（开放数据域）
第 5 步（P2）：订阅消息 / 游戏圈，看数据再定
```

**验收标准**：
- 转发：iPhone 上点右上角 ··· → 转发 → 好友收到卡片（标题/图正确）→ 好友点开进入游戏，`DeviceLog` 里有 `share_enter` 记录。
- 排行榜：两个互为好友的微信号，各自玩一局，榜单能同时看到两人且排序正确。

---

## 6. 下一步

1. **先修 BUG-09**（1 个文件约 15 行）——需要你确认选方案 A/B/C，我建议 C（暂停键移到左上角）。
2. 真机验证 RISK-01（iOS BGM 首次是否静音）。
3. 转发功能可以独立开工，不依赖 1、2。
4. 排行榜需要先确认是否要做子域工程（Cocos 构建配置有改动）。

按项目铁律，一次只做一个里程碑。**等你确认从哪一项开始。**
