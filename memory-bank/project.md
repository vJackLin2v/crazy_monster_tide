# 项目现状

| 项 | 值 |
|---|---|
| 项目 | 《疯狂怪潮》 / `crazy-monster-tide` |
| 工程 | `H:\AI-game\crazy_monster_tide` |
| 阶段 | **M8 完成：美术资源接入** —— 单位 21 套 / VFX 85 组件 / 图标 129 / 立绘 270 已进原型 |
| 引擎 | **Cocos Creator 3.8.6**（与 `H:\AI-game\xingnang\cocos_port` 对齐）｜ D-02 |
| 世界观 | **像素奇幻** ｜ D-08 |
| UI 参考 | Möbelmon（reference_only） ｜ D-09 |
| 目标平台 | 微信小游戏（首发）→ 抖音小游戏 / Web 竖屏调试 |
| 需求基线 | `docs/requirements.md` v0.2 |

## 已完成

- M0：Agent 文档体系（地图 / 流程 / 系统规则 / UI / 素材 / 测试 / memory-bank）
- M1：四大决策落盘；Möbelmon UI 素材采集与结构化分析；**可玩 HTML MVP**（`prototype-html/`）
  - Playwright E2E：**90 PASS / 0 FAIL，零控制台错误**（375x812 / 390x844 / 412x915 三档视口）
  - 静态门禁：**67 PASS / 0 FAIL**（含商店交互 / 替换流程 / 难度曲线 / 性能 / 金币经济）
  - 固定 seed 可复现（同 seed → 同奖励组、同商店货架）

## 关卡结构（已变更）

~~树形地图~~ → **波次闯关**（D-11 / D-14）：一局 **20 波**，倒计时过关，波间商店，
第 10 / 20 波为 BOSS 波，每 3 波一次精英，**打通 20 波后可继续（无尽）或收工结算**。
详见 `docs/systems/wave_rules.md`。

## 素材门禁结论（M7）

| 裁决 | 文件数 | 说明 |
|---|---:|---|
| ✅ 可商用 | 2,711 | 图标 / VFX / UI 面板 / 背景 / 字体 / 程序绘制 |
| 🔴 阻断 | 925 | 母本 `internal/**` + `approved/ui/kit/**`（SlotBound 解包） |
| 🟡 待裁决 | 3 | `menu-bg*.png` |

**缺口（现有可用 = 0）**：GAP-101 角色精灵 / GAP-102 敌人精灵 / GAP-103 按钮 HUD 条 / GAP-104 音频。
详见 `docs/assets/asset_candidates.md`。

## 未开始

- 缺口素材补齐（GAP-101~104）、引擎工程（S4）

## 主要风险

| # | 风险 | 说明 | 缓解 |
|---|---|---|---|
| R1 | 数值待继续实测 | 第 2 波断崖与金币缺口已修，但中后期（8~20 波）仍未经真人验证 | 待第二轮实测 |
| R6 | 玩家提速后难度偏移 | 玩家 96 px/s、蝙蝠 86 px/s，速度带重叠，可能更难躲 | 待实测（Q12） |
| R7 | ~~美术资产为零~~ | 已接入单位/VFX/图标/立绘 | ✅ 关闭 |
| R8 | **素材授权风险** | 主池素材来自商业游戏解包，上游声明禁再分发 | 用户决定自用、承担风险（D-26）；**上架前必须重新裁决** |
| R9 | 风格割裂 | 单位/图标来自主池，UI 配色来自 Möbelmon | 待用户看截图后决定是否统一（Q17） |
| R2 | 素材授权与体量 | 母本 3,666 个文件需逐项过 Gate | S1 集中处理 |
| R3 | ~~参考案例不足~~ | 已补至 3 个（Möbelmon / Brotato / 微信官方指南） | ✅ 关闭 |
| R5 | ~~UI 规格未冻结~~ | 已冻结 v1.0 | ✅ 关闭 |
| R4 | 内容量偏大 | 16 技能 / 18 模块 / 70 道具对首版偏重 | 按里程碑切分，先跑通最小闭环 |

## 验证环境备忘

| 用途 | 命令 / 路径 |
|---|---|
| 跑 E2E | `NODE_PATH="H:/AI-game/pixel_roguelike_wechat_agent_kit/node_modules" node tests/e2e_mvp.cjs` |
| 本地起服 | `python -m http.server 4173 --directory prototype-html` |
| 本地视觉确认 | `"H:/AI学习计划/ComfyUI/.venv/Scripts/python.exe" tools/vision/vlm_look.py <图片> "<问题>"` |
| 批量目视 | `tools/vision/batch_analyze.py` / `tools/vision/critic.py` |
