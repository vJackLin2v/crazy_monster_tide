# 《疯狂怪潮》 crazy-monster-tide

竖屏像素风 · 自动攻击割草 · 构筑向肉鸽 · 微信小游戏。

> **一句话**：你只管走位，技能自己开火；4 个主动技能 × 每技能 3 个可插拔行为槽，
> 行为模块可重复安装、可随时搬家，怪潮铺满屏幕，Build 成型后一键清场。

---

## 这个工程是什么

一个 **Agent 驱动**的游戏工程。人只做决策与验收，编码 / 测试 / 文档由 AI Agent 按
`AGENTS.md` 的路由规则分批完成。

工程第一原则不是「文档多」，而是 **单次只给 Agent 尽可能小、尽可能有用的上下文**：

- `AGENTS.md` = 地图（告诉 Agent 现在该读哪几个文件）
- `docs/` = 规则仓库（按需读，禁止全量加载）
- `memory-bank/` = 实时状态（做到哪、决定了什么、踩了什么坑）

---

## 怎么开局

1. 让 Agent 读 `AGENTS.md`（它会自己决定接下来读什么）。
2. 读 `docs/requirements.md`（唯一需求来源）。
3. 读 `memory-bank/tasks.md`（当前该做什么）。
4. 按 `docs/process.md` 的阶段门禁推进，**一次只做一个里程碑，做完停下等确认**。

新会话开始，直接用 `START_PROMPT.md` 作为提示词。

---

## 目录

```
AGENTS.md               Agent 总入口（地图 + 红线）
START_PROMPT.md         新会话启动提示词
docs/
  requirements.md       唯一需求来源（v0.2）
  control_protocol.md   Agent 信息分级与读取纪律
  process.md            开发流程与阶段门禁
  team_division.md      角色分工与交付物
  systems/              玩法规则（10 个系统）
  ui/                   UI 流程、竖屏规格、原型门禁
  assets/               素材门禁、盘点、缺口、归一化、授权
  testing/              分层测试、固定种子、玩家模拟
memory-bank/
  project.md            项目现状
  architecture.md       目录与技术架构（引擎待定，见 decisions D-02）
  decisions.md          已确认决策 D-01 ~ D-06
  rules.md              硬规则与红线
  tasks.md              当前阶段 / 里程碑 / 待办
scripts/  tools/        实现期使用，当前为空
```

---

## 当前状态

**M0 工程脚手架**：需求已固化、Agent 文档体系已就位，实现未开始。

阶段路线：`需求分析 → 素材门禁 → HTML 可玩 MVP → UI 冻结 → 引擎实现 → 测试 → 验收`。

详见 `memory-bank/tasks.md`。

---

## 与母本工程的关系

需求来源：`H:\AI-game\pixel_roguelike_wechat_agent_kit`。
该工程含 3,666 个素材文件、素材总览 Excel（1,299 张内嵌图）、HTML 原型与系统文档，
**可作为迁移源，但迁移必须先登记决策**（见 `docs/assets/asset_inventory.md` 与 `memory-bank/decisions.md` D-04）。

同时参考：`H:\AI-game\行囊守卫`（Godot 竖屏小游戏的 Agent 文档体系与踩坑清单）。
