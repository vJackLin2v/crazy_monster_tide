# 项目现状

| 项 | 值 |
|---|---|
| 项目 | 《疯狂怪潮》 / `crazy-monster-tide` |
| 工程 | `H:\AI-game\crazy_monster_tide` |
| 阶段 | **M2 完成**：主界面 + 角色网格 + 遮罩 + 摇杆修复 + 波次闯关改版（土豆兄弟式） |
| 引擎 | **Cocos Creator 3.8.6**（与 `H:\AI-game\xingnang\cocos_port` 对齐）｜ D-02 |
| 世界观 | **像素奇幻** ｜ D-08 |
| UI 参考 | Möbelmon（reference_only） ｜ D-09 |
| 目标平台 | 微信小游戏（首发）→ 抖音小游戏 / Web 竖屏调试 |
| 需求基线 | `docs/requirements.md` v0.2 |

## 已完成

- M0：Agent 文档体系（地图 / 流程 / 系统规则 / UI / 素材 / 测试 / memory-bank）
- M1：四大决策落盘；Möbelmon UI 素材采集与结构化分析；**可玩 HTML MVP**（`prototype-html/`）
  - Playwright E2E：**52 PASS / 0 FAIL，零控制台错误**（375x812 / 390x844 / 412x915 三档视口）
  - 静态门禁：**31 PASS / 0 FAIL**（对比度 / 热区 / 波次 / 像素可读性 / 因果链 / 确定性 / 合规）
  - 固定 seed 可复现（同 seed → 同奖励组、同商店货架）

## 关卡结构（已变更）

~~树形地图~~ → **波次闯关**（D-11）：一局 5 波，倒计时过关，波间商店，第 5 波 BOSS。
详见 `docs/systems/wave_rules.md`。

## 未开始

- 素材盘点（S1）、UI 冻结（S3）、引擎工程（S4）

## 主要风险

| # | 风险 | 说明 | 缓解 |
|---|---|---|---|
| R1 | MVP 数值未平衡 | 目前只跑通循环，爽感与难度曲线未调 | M2 按手感反馈迭代 |
| R2 | 素材授权与体量 | 母本 3,666 个文件需逐项过 Gate | S1 集中处理 |
| R3 | 参考案例不足 3 个 | UI 协议要求 >=3 才能冻结 | M2 补齐（Q7） |
| R4 | 内容量偏大 | 16 技能 / 18 模块 / 70 道具对首版偏重 | 按里程碑切分，先跑通最小闭环 |

## 验证环境备忘

| 用途 | 命令 / 路径 |
|---|---|
| 跑 E2E | `NODE_PATH="H:/AI-game/pixel_roguelike_wechat_agent_kit/node_modules" node tests/e2e_mvp.cjs` |
| 本地起服 | `python -m http.server 4173 --directory prototype-html` |
| 本地视觉确认 | `"H:/AI学习计划/ComfyUI/.venv/Scripts/python.exe" tools/vision/vlm_look.py <图片> "<问题>"` |
| 批量目视 | `tools/vision/batch_analyze.py` / `tools/vision/critic.py` |
