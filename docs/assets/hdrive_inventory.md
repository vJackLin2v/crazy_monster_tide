# H 盘素材分布与索引覆盖（2026-10-20 全盘普查）

> 触发：用户指出「素材不只在当前项目，整个 H 盘好几个地方都有」。
> 本文记录：H 盘到底有哪些图、哪些进了索引、哪些**故意不进**、为什么。

## 1. 怎么查的

`os.scandir` 全盘遍历，**33.3 秒 / 122 万条目**，只统计图片（png/jpg/webp/svg/gif/bmp）与音频，
跳过 `node_modules / .git / .godot / library / build / dist / temp / __pycache__ / AppData` 等。
脚本：`.tmp/census.py`，原始数据：`.tmp/hdrive_census.json`。

## 2. 结果（按图片数排序，只列前 12）

| 目录 | 图片 | 体积 | 判定 |
|---|---:|---:|---|
| `H:\AI-game` | 180,150 | 1.9 GB | ✅ 项目群，已按子目录分别接入 |
| `H:\galgame` | 51,763 | 10.3 GB | ⛔ 商业 galgame 安装包，**不可用** |
| `H:\slotBound_game` | 42,944 | 913 MB | ⛔ SlotBound 解包（已是 blocked 源） |
| `H:\SteamLibrary` | 41,439 | 16.2 GB | 跳过：游戏本体 |
| `H:\rougelike_crew` | 31,160 | 438 MB | ✅ `assets/` + `ai-material-factory/outputs/` 已接入 |
| `H:\job_prep\免费素材` | 6,425 | 43 MB | ✅ Kenney / CC0 / GameIcons，已接入 |
| `H:\WeGameApps` | 3,377 | 1.6 GB | 跳过：游戏平台 |
| `H:\边缘世界截图` | 2,286 | 42 GB | 跳过：截图，与像素风无关 |
| `H:\comfyUI` / `H:\Comfy-Desktop` | 2,263 | 1.1 GB | 跳过：工具本体 |
| `H:\AI学习计划` / `.codex-reset` | 1,465 | 512 MB | 跳过：非游戏素材 |
| `H:\shelldiver_game` | 289 | 78 MB | 待定：未核授权 |
| `H:\galgame` 之外的 galgame 子目录 | — | — | 同上，⛔ |

**结论：值得整理的只有 4 处**——`job_prep/免费素材`（CC0 大包）、`AI-game/Pixel Resonance Expedition/asset-catalog`、
`rougelike_crew/assets`、`rougelike_crew/ai-material-factory/outputs`。其余 3/4 是游戏本体、工具或版权禁区。

## 3. 现在索引覆盖 13 个 root

| root | 条目 | 内容 |
|---|---:|---|
| `prev-pixel` | 13,148 | **另一项目的素材目录**（Pixel Resonance Expedition）→ 来源待核 |
| `pool-icons` | 6,677 | 素材工坊·图标 |
| `cc0-packs` | 4,329 | **Kenney / GameIcons / Sunny Land 等 CC0 包**（本次新增） |
| `pool-ui` | 3,427 | 界面 UI |
| `crew-assets` | 3,304 | rougelike_crew 自带 assets → 来源待核 |
| `pool-units` | 2,592 | 人物素材 |
| `kit` | 2,250 | 母本 kit（含 blocked 的 internal） |
| `pool-items` / `pool-bg` / `pool-vfx` / `pool-audio` | 3,378 | 道具 / 背景 / 特效 / 音效 |
| `project` | 422 | 本项目在用素材 |
| `crew-ai` | 161 | AI 生成物（按组件聚合）→ 需登记工具与提示词 |
| **合计** | **39,688 行 / 1,202 MB** | 原 18,742 行 |

## 4. 为什么不是「18 万张全进索引」

1. 其中约 14 万张在 `node_modules`、构建产物、游戏本体里，对挑素材零价值；
2. 进来一条就要判一次授权，**未核验条目从 13,688 涨到 30,301**——索引越大，Agent 越容易被误导；
3. `galgame` / `slotBound_game` 属明确不可用，进了索引反而是风险（红线 §11.2）。

## 5. 授权现状（最大瓶颈）

| 状态 | 条目 | 说明 |
|---|---:|---|
| `unverified` | **30,301** | 未逐包核验，**不得进正式包** |
| `attribution` | 8,490 | GameIcons CC BY 3.0，需署名 |
| `blocked` | 420 | SlotBound 解包 |
| `user-approved` | 296 | 项目在用，上架前要换（D-26） |
| `ok-attribution` | 181 | CC0 为主 |

→ 成品目录 `catalog.jsonl` 只收后三类里 gate 通过的，**4,652 条**（见 `assets_index/CATALOG.md`）。

## 6. 下一步

1. `prev-pixel`（13,148 条）值得单独核一次来源——它是另一个像素项目的素材目录，血统可能比素材工坊更干净；
2. `cc0-packs` 里 Kenney 各包补 LICENSE 记录后，可整批升为 `ok`；
3. `crew-ai` 的 161 个组件要登记生成工具/模型/提示词，否则按 AI 合规要求无法追溯。
