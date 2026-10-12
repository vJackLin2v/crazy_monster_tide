# Agent 控制协议（信息分级与读取纪律）

## 1. 目的

控制 Agent 的：**信息读取 → 任务分类 → 工作线路由 → 阶段推进 → 权限 → 验收**。

核心目标只有一个：**单次任务只加载尽可能有用的最小信息集。**

---

## 2. 信息分级

| 级别 | 内容 | 读取规则 |
|---|---|---|
| **L0 宪法级** | `AGENTS.md`、用户当前明确指令、红线（AGENTS §11） | 始终遵守，不可违反 |
| **L1 任务级** | `memory-bank/tasks.md`、`rules.md`、当次任务命中的 `docs/*` | 每次开工必读，读取数 ≤ 3 |
| **L2 参考级** | `decisions.md`、`architecture.md`、未命中的 `systems/*`、母本工程文档 | 仅任务需要时按需读 |
| **L3 归档级** | 历史汇报、旧版本文件、`*.bak` | 默认不读；除非用户点名 |

> 读取预算：单任务 **≤ 3 个文件**。超预算 = 任务没拆干净，先拆任务。

---

## 3. 任务分类与路由

| 任务类型 | 路由 |
|---|---|
| 需求澄清 / 规则冲突 | `docs/requirements.md` + `memory-bank/decisions.md`（只对照，不读代码） |
| 玩法系统实现 | 对应 `docs/systems/` 下命中的那个系统文件 + `memory-bank/architecture.md` |
| UI 任务 | `docs/ui/ui_capability_protocol.md`（强制首读）+ 命中 Pattern |
| 素材任务 | `docs/assets/asset_license.md` + `asset_gap.md` |
| 测试 / 验收 | `docs/testing/protocol.md` + `seed_and_harness.md` |
| 状态维护 | `memory-bank/tasks.md`（做完即更新） |

---

## 4. 权限矩阵

| 动作 | 是否可自动执行 |
|---|---|
| 读文件、写文档、写代码、跑测试、修 bug | 允许，自动 |
| 更新 `memory-bank/tasks.md` / `rules.md` | 允许，自动 |
| 新增 / 修改 `docs/systems/*` 规则 | 需用户确认后落盘 |
| 修改 `docs/requirements.md` | 禁止（只记录问题） |
| 推翻 `decisions.md` 里的 `D-*` | 禁止，需用户显式批准 |
| 引入新素材 / 新依赖 / 新引擎、发布动作 | 需用户确认 |

---

## 5. 上下文纪律

1. 大文件用范围读（`sed -n`、按标题跳读），不整篇灌入。
2. 一次会话只推进一个里程碑；结束前把「做到哪 / 下一步 / 踩坑」写回 `memory-bank/`。
3. 长文档先写骨架再填内容。
4. 新会话**不得继承上一个会话的结论**——只认文件里的状态，以 `memory-bank/tasks.md` 为准。
