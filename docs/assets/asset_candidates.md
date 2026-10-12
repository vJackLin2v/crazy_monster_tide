# 首版可直接用素材清单（**S1 素材门禁结论**）

> 盘点对象：`H:\AI-game\pixel_roguelike_wechat_agent_kit\assets`（**3,666 个文件 / 11.77 MB**）
> 盘点工具：`tools/assets/asset_scan.py`（只读 PNG 头部，可复现）
> 原始数据：`docs/assets/data/kit_assets/asset_index.csv`（3,666 行）
> 机器可读裁决：`docs/assets/data/candidate_verdicts.json`
> 盘点日期：2026-10-12

---

## 0.0 重要更新（2026-10-12 晚）

用户指令：「你不用管版权问题，直接用就行」→ 原 `blocked` 的 925 个文件**已由用户批准使用**
（见 `decisions.md` D-26）。本文件下方的裁决表保留为**原始审计记录**（可追溯），
但**当前生效状态以下方 §1 的"已接入"为准**。

**已接入工程**：单位 463 帧 / 技能 VFX 947 帧 / 图标 129 个 / 立绘 270 张。
详见 `decisions.md` D-26 与 `prototype-html/README.md`。

---

## 0. 结论先行

| 裁决 | 文件数 | 占比 | 含义 |
|---|---:|---:|---|
| ✅ **approved**（可商用） | **2,711** | 74% | 可进本工程 `assets/approved/` 并用于发布 |
| 🔴 **blocked**（不可用） | **925** | 25% | **商业游戏解包**，禁商用/禁再分发 |
| 🟡 **unclear**（待裁决） | 3 | 0.1% | 来源包无许可文本 |
| 🚫 reference_only | 20 | 0.5% | 设计参考截图 |
| 📋 登记/说明文件 | 5 | 0.1% | README 等 |

### 🔴 本次门禁最重要的发现

**需求书 §7 写的「已有约 70+ 怪物素材」是错的 —— 那批素材不能用。**

| 事实 | 说明 |
|---|---|
| 那批怪物（95 个动画表）、玩家单位（113 表）、Boss 立绘、音效 | 全部来自 **`Slotbound`（商业游戏，Steam AppID 4459590）的解包** |
| 母本自己的审计结论 | `status = internal-use-only`；**禁商用 / 禁再分发 / 禁进 git / 禁入发布包** |
| 母本为什么能用 | 母本定性为「**学习/内部演示，不发布**」（其 `D-ASSET-001 = D`） |
| **我们的处境不同** | 《疯狂怪潮》目标是**微信小游戏（要上架）** → **这批素材一个都不能用** |

> 这正是素材门禁存在的意义：**如果不盘，我们会在 Cocos 里用着解包素材做完整款游戏，然后在上架前发现全部要换。**

---

## 1. 可直接用（approved）· 2,711 个

| 用途 | 类别 | 文件 | 体积 | 来源 | 许可 | 署名 |
|---|---|---:|---:|---|---|---|
| **道具/技能/属性图标** | `approved/icons/items` | 1,193 | 1.01 MB | Willibab 916 + Shikashi 276 | 免费商用 / CC BY 3.0 | ⚠️ **Shikashi 部分必须署名** |
| **UI 面板 / 边框（9-slice）** | `approved/ui/panels` | 370 | 0.14 MB | Kenney Fantasy UI Borders | **CC0** | 否 |
| UI 结算屏专用件 | `approved/ui/result` | 6 | 0.00 MB | CC0 + 本工程自绘 | CC0 | 否 |
| **技能 VFX 组件库** | `approved/vfx/*` | 1,041 | 0.77 MB | IM/PF/XI/FZ/SV/SF | 商用 / CC0 / CC BY 4.0 | ⚠️ SF 需署名一行 |
| 战斗竞技场地图件 | `approved/bg/arena` | 13 | 0.05 MB | 素材工坊（CC0 + 用户确认） | CC0 | 否 |
| 主菜单视差背景 | `approved/bg/menu`（bg_far/mid/near） | 30 | 0.73 MB | Xianxia Pixel Pack | **CC0** | 否 |
| **中文像素字体** | `approved/fonts` | 5 | 4.14 MB | Fusion Pixel / Ark Pixel（TakWolf） | **SIL OFL 1.1** | ⚠️ 须保留版权声明 + OFL 全文 |
| **程序化 UI 件**（9-slice/摇杆/地图节点/HUD） | `generated/*` | 53 | 0.28 MB | **本工程程序绘制，无外部输入** | 自有 | 否 |

### 亮点：`generated/` 是最干净的一类

摇杆、地图节点、9-slice 边框、HUD 条都是**程序画的**，没有外部输入 → 零授权风险。
UI 冻结后的自绘部分（遮罩/抽屉/卡片/按钮）应继续走这条路。

### 可用 VFX 组件库规模（够覆盖 16 个技能）

```
approved/vfx/  90 个组件 / 约 940 帧，按「组件叠加」组织（不是一技能一套）
  core/ flash spark ring burst smoke dust      projectiles  fire ice lightning poison arcane
  chain/  beam/{start,body,end,cutoff}         ground/ ring fill flame poison frost
  defense/ shield orbit   feedback/ hit crit level_up death pickup   support/ heal buff
  melee/ slash            summon/ summon_fx
```
> 对比需求：16 个基础技能 + 20+ VFX → **完全够用，且有富余**。

---

## 2. 不可用（blocked）· 925 个 —— **必须从生产路径排除**

| 路径 | 文件 | 为什么不可用 |
|---|---:|---|
| `internal/**` | 867 | SlotBound 解包（玩家单位/敌人/Boss/立绘/图标）。仅本地学习，禁商用禁再分发 |
| **`approved/ui/kit/**`** | **58** | ⚠️ **它虽然在 `approved/` 目录里，但构建脚本的输入是 `H:\slotBound_game\assets\ui`** —— 与母本自己的审计结论直接冲突（`build_ui_kit.py` L34-35） |

### ⚠️ 关于 `approved/ui/kit/` 的额外说明

这是**母本 `approved/` 池内部的一处自相矛盾**：
- 母本 `asset_license.md` §1 判定 SlotBound 素材为 `internal-use-only`；
- 但 `build_ui_kit.py` 把 `slotBound_game/assets/ui` 的产物写进了 `approved/ui/kit/`；
- 该 report 自称 `"owner": "用户自有 Godot 工程"` —— **这个定性是错的**，同一批证据链证明它是解包素材。

**本工程裁决：不给它开例外。** 需要按钮/HUD 条/徽章时，用 Kenney CC0 面板重做或程序自绘。

---

## 3. 待裁决（unclear）· 3 个

| 文件 | 来源 | 问题 |
|---|---|---|
| `approved/bg/menu/menu-bg.png`、`menu-bg-simple.png`、`menu-bg-main.png` | `mainmenu_mid2.png`（来源包内**无许可文本**） | 商用前必须回溯 itch.io 原页面确认 |

> 这 3 个文件**不影响首版**：主菜单背景可直接用 Xianxia 那 30 个视差件（CC0）重拼。

---

## 4. 对我方需求（`docs/requirements.md` §10）的覆盖度

| 需求项 | 目标 | 现成可用 | 状态 |
|---|---|---|---|
| 主动技能图标 | 16 | 1,193 个通用图标池 | ✅ 富余 |
| 行为模块图标 | 18 | 同上 | ✅ 富余 |
| 道具图标 | 50 + 20 | 同上 | ✅ 富余 |
| 属性/数值图标 | ~24 | 同上 + 程序绘制 | ✅ |
| 技能表现 / VFX | 16 技能 + 20 VFX | 90 组件 / 940 帧 | ✅ 富余 |
| UI 面板 / 边框 | 1 套 | Kenney 369 件 + 程序绘制 53 | ✅ |
| 地图 / 背景 | 战斗 + 主菜单 | arena 13 + menu 30 | ✅ |
| 字体（中文像素） | 1~2 款 | Fusion Pixel（OFL 1.1） | ✅ |
| **玩家角色（6）** | 6 套 | **0** | 🔴 **缺** |
| **敌人（怪潮主力）** | 70+ | **0** | 🔴 **缺** |
| **精英 / Boss** | 5~6 | **0** | 🔴 **缺** |
| **音频** | BGM + 音效 30+ | **0** | 🔴 **缺** |
| **按钮 / HUD 条 / 徽章** | 1 套 | 0（`ui/kit` 被阻断） | 🔴 **缺** |

### 缺口严重度

```
🔴 P0（阻塞进 Cocos 正式开发）
   GAP-101 玩家角色精灵（6 套，需待机/移动/受击/死亡）
   GAP-102 敌人精灵（怪潮主力，建议 >= 8 种 + 精英 + BOSS）
   GAP-103 按钮 / HUD 条 / 徽章（UI 冻结规格里已定，需要件）

🟡 P1（可在 Cocos 阶段先用占位，但发布前必须解决）
   GAP-104 音频（BGM + 打击/升级/拾取音效）
   GAP-105 menu-bg 3 个文件的授权回溯

🟢 P2
   GAP-106 角色立绘 / 头像（角色选择界面用）
```

---

## 5. 缺口怎么补（按 `docs/requirements.md` §8 的优先级）

```
已有素材改造 → 网络合法素材 → AI 生成/改造 → 占位
```

| 缺口 | 建议方案 | 备注 |
|---|---|---|
| GAP-101 角色 | ① 在 CC0 包里找像素角色（Kenney/32rogues/SunnyLand/DCSS 都已确认可商用）② 自绘 | 6 个角色需**风格统一**，建议同源 |
| GAP-102 敌人 | 优先从 **CC0 包**取（母本已确认 Kenney MicroRoguelike / RoguelikeRPG 是 CC0） | 需求是"优先后用现有"，现在"现有"不可用 → 必须换源 |
| GAP-103 UI 件 | 用 Kenney `approved/ui/panels`（CC0）重着色 + 程序自绘 | 不碰 `ui/kit` |
| GAP-104 音频 | CC0 音效库（Kenney 有 CC0 音频包）或自录 | 首版可先静音 |

---

## 6. 门禁裁定

| 问题 | 裁定 |
|---|---|
| 素材评估门禁是否通过？ | **有条件通过** —— UI/图标/VFX/字体/背景充足，但**单位与音频为零** |
| 能否进入 Cocos？ | **可以**（S4 只要求"按 UI Spec 实现"），单屏用几何占位；但**单位与音频必须在美术接入前补齐** |
| 能否发布？ | **不能**，先补齐 GAP-101~104 |
| 必须立刻做的事 | ① 把 `blocked` 的 925 个文件明确排除出生产路径；② 需求书 §7「70+ 怪物素材」改为「不可用，需另寻」 |
