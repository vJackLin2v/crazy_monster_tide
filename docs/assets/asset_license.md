# 素材授权与 Asset Gate

## 1. 铁律

> **素材不得因为「目录里有」就直接使用。**
> 任何素材进入本工程 `assets/approved/` 前，必须在本文件有对应条目。

## 2. Asset Gate 检查项

| # | 检查项 | 通过标准 |
|---|---|---|
| 1 | 来源可追溯 | 有明确出处（URL / 作者 / 包名 / 生成方式） |
| 2 | 授权明确 | 许可类型写清楚 |
| 3 | 允许商用 | 明确允许商业使用 ← **本项目要上架微信小游戏，这条是硬门槛** |
| 4 | 允许修改 | 明确允许修改与再分发 |
| 5 | 署名要求 | 若需署名，写明署名位置与文案 |
| 6 | 与竞品无冲突 | 非某商业产品的私有素材 |
| 7 | 记录在案 | 已写入本文件表格 |

任一项不通过 → `blocked`，不得进入生产路径。

---

## 3. 本工程已登记的来源（裁决于 2026-10-12）

### ✅ 可商用（可进 `assets/approved/`，可用于发布）

| # | 来源包 | 用于 | 许可 | 商用 | 可改 | 署名 | 证明 |
|---|---|---|---|---|---|---|---|
| 1 | **Willibab's Simple Icons** | 武器/装备图标 | 免费商用 | ✅ | ✅ | 非强制（但不得声称原创） | 包内说明 + itch.io |
| 2 | **Shikashi's Fantasy Icons** | 通用道具图标 | **CC BY 3.0** | ✅ | ✅ | **必须**：`Icons made by Shikashi` | 包内许可 |
| 3 | **Kenney Fantasy UI Borders** | UI 面板 9-slice | **CC0** | ✅ | ✅ | 否 | 包内 `License.txt` |
| 4 | **IceMaan — Pixel VFX Essentials** | 技能 VFX | IceMaan Free VFX License | ✅ | ✅ | 否 | 包内许可；禁转售/禁再分发 |
| 5 | **Pixel VFX Studio — PVFX Foundry** | 技能 VFX | **CC0 1.0** | ✅ | ✅ | 否 | `pack.json` + `PROVENANCE.json` |
| 6 | **Sentient Dream — Level Up Effect** | 升级 VFX | 免费素材条款 | ✅ | ✅ | 否 | 包内条款 |
| 7 | **Xianxia Pixel Pack** | 主菜单视差背景 | **CC0 1.0** | ✅ | ✅ | 否 | `LICENSE.txt` 全文（作者已披露 AI 生成） |
| 8 | **Foozle 2DE0001 Pixel Magic Effects** | 法术 VFX | **CC0** | ✅ | ✅ | 否 | `Readme.txt` 原文 |
| 9 | **DCSS Tiles** | 少量地形/VFX | **CC0** | ✅ | ✅ | 否 | 包内 `LICENSE.txt` |
| 10 | **素材工坊·竞技场地形** | 战斗地图 | CC0（主清单 + 用户确认） | ✅ | ✅ | 否 | 主清单记录 |
| 11 | **Fusion Pixel Font (TakWolf)** | 中文像素字体 | **SIL OFL 1.1** | ✅ | ✅ | ⚠️ 保留版权声明 + OFL 全文 | 字体 name 表实读 + `LICENSE-OFL.txt` |
| 12 | **本工程程序绘制**（`generated/`） | 摇杆/地图节点/9-slice/HUD | 自有 | ✅ | ✅ | 否 | 无外部输入 |

### ⚠️ 需署名（可用，但必须写进 credits）

| 来源 | 署名文案 | 用在哪 |
|---|---|---|
| Shikashi's Fantasy Icons | `Icons made by Shikashi` | 道具/技能图标的一部分（276 个） |
| spell-fx-free (heyheythere) | `Spell FX Free by heyheythere — CC BY 4.0` | VFX 的一部分 |
| Fusion Pixel | `Fusion Pixel Font by TakWolf (OFL 1.1)` | 字体 |

### 🔴 阻断（**不得**进入本项目生产路径）

| # | 来源 | 文件数 | 原因 |
|---|---|---:|---|
| B1 | `SlotBound`（Steam AppID 4459590）解包素材 —— 母本 `internal/**` | 867 | 商业游戏私有素材；母本审计为 `internal-use-only`；**禁商用/禁再分发/禁进仓库** |
| B2 | **母本 `approved/ui/kit/**`** | **58** | ⚠️ 构建脚本输入是 `H:\slotBound_game\assets\ui`（`tools/assets/build_ui_kit.py` L34-35），**与母本自身审计冲突**。本项目**不给例外** |
| B3 | `Sephiria_Demo`（21,453 文件，在素材工坊池） | — | 包内 README 明确禁商用禁再分发 |
| B4 | `PPVFX_GeneralPack1` / `VFX_Free_Pack` / `70_Effects` / `1~10.png` | — | 无许可文件，授权不明 |
| B5 | `GandalfHardcore` 系列 | — | 明文**禁止 AI 训练**，与 AI 辅助管线冲突 |

### 🟡 待裁决

| # | 条目 | 问题 | 影响 |
|---|---|---|---|
| U1 | `menu-bg*.png` ×3（源 `mainmenu_mid2.png`） | 来源包无许可文本 | 可用 Xianxia（CC0）重拼替代，不阻塞 |
| U2 | LPC 角色纸娃娃 | CC-BY-SA 3.0 **传染性** | SA 会传染本项目授权选择，需单独裁决 |
| U3 | GameIcons（4,235 SVG） | CC BY 3.0 需逐个作者署名 | 首版用不到 |

### 🚫 reference_only（只做设计参考）

| 条目 | 位置 | 限制 |
|---|---|---|
| Möbelmon UI 截图 ×18 + logo/icon | `assets/ui-reference/mobelmon/` | 不复制美术/文案；不进 `approved/` |
| Brotato 截图 ×7（母本 ui-reference） | 母本 `assets/ui-reference/brotato/` | 同上 |

---

## 4. 使用纪律

1. `blocked` 素材**不得**复制进本工程任何目录（含 `assets/source/`）。
2. 需要参考时，通过母本路径**只读**查阅，不复制。
3. `approved` 素材复制进本工程时，须在 `asset_normalization.md` 记录归一化处理。
4. 每个素材文件都应能回答：「这个素材在 360x640 上最终显示多大？」

## 5. 待办

- [x] 首轮授权登记（覆盖母本 `assets/` 全部 3,666 个文件）
- [ ] 补齐缺口素材的授权登记（GAP-101~104）
- [ ] U1/U2 裁决
