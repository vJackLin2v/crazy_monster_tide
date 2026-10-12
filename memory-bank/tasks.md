# 当前任务

## 当前阶段

**M1 已完成**：决策落定（Q1~Q4 全部确认）+ Möbelmon UI 素材采集 + 竖屏 HTML MVP 可玩原型。
**下一步待用户确认。**

---

## M1 交付物

| # | 交付物 | 位置 | 状态 |
|---|---|---|---|
| 1 | 引擎对齐结论（Cocos Creator **3.8.6**） | `memory-bank/decisions.md` D-02 | 完成 |
| 2 | 四大决策落盘（命名 / 引擎 / 迁移 / 世界观） | `decisions.md` D-01/02/04/08 | 完成 |
| 3 | Möbelmon UI 素材采集（22 文件 / 5.7 MB） | `assets/ui-reference/mobelmon/` | 完成 |
| 4 | 参考结构化分析（色板实测 + Pattern 提取） | `docs/ui/reference-library/mobelmon-analysis.md` | 完成 |
| 5 | VLM 目视确认原始记录（18 屏） | `docs/ui/reference-library/mobelmon-vlm-raw.md` | 完成 |
| 6 | **竖屏 HTML 可玩 MVP** | `prototype-html/` | 完成 |
| 7 | Playwright 玩家流程 E2E（三档视口） | `tests/e2e_mvp.cjs` | 50 PASS / 0 FAIL |
| 8 | 截图（3 视口 x 6 屏） | `screenshots/` | 完成 |
| 9 | VLM 自我评审（UI Critic 目视部分） | `docs/ui/reference-library/self-critic-vlm.md` | 完成 |
| 10 | Design Token 实测落地 | `prototype-html/src/tokens.css` + `docs/ui/screen_specs.md` §5 | 完成 |

### MVP 已实现（对照 `docs/ui/prototype_gate.md`）

角色选择（6 角色 + 正负天赋 + 初始技能）| 树形地图（8 层，战斗/精英/商店/事件/BOSS 五态可辨）|
战斗（动态摇杆 + 4 技能自动开火 + 怪潮 + 伤害数字 + 受击白闪 + 击退 + 屏内定位环）|
升级横向 3 选 1（技能/行为模块/道具/属性 四类）| 行为模块安装步骤（兼容槽位判定）|
Build 面板（技能/行为/道具/属性 4 页签，可卸下/可搬家）| 商店（金币/售出/不足）| 事件（3 选项）|
结算（统计 + 本局 Build 回顾）| 固定 Seed（同 seed 同地图同奖励，E2E 已验证）。

---

## 待用户确认

| # | 问题 |
|---|---|
| Q5 | 首版是否需要商业化（广告位 / 内购）与合规文案 |
| Q7 | Möbelmon 之外是否再补 2 个参考案例（协议建议 >=3 再冻结 UI） |
| Q8 | MVP 手感 / 节奏 / 数值的调整意见（怪潮密度、技能手感、卡片文案） |

---

## 建议的下一个里程碑（等确认，不要自己开做）

**M2：UI 迭代 → 冻结 UI Spec（S3）**

- 目标：把 MVP 的 UI 打磨到可冻结的程度，产出 `docs/ui/ui-spec-approved.md`。
- 待办：补齐多动效状态（空态/满态/冷却/不可点）、参考案例补到 >=3、
  按 `prototype_gate.md` §3 Critic 清单逐项过、三档视口截图存档。
- 验收标准：Critic 清单全过 + 用户确认 + 产出冻结文档。

**备选 M2'：素材门禁（S1）** —— 盘点母本 3,666 个素材，产出可用清单（D-04 已批准迁移）。

---

## 后续里程碑草案（未批准）

| 里程碑 | 内容 |
|---|---|
| M3 | 引擎工程初始化（Cocos Creator 3.8.6，与 xingnang 对齐） |
| M4 | 战斗闭环移植（怪潮 / 自动攻击 / 反馈三件套） |
| M5 | 构筑系统（16 技能 / 18 模块 / 道具 / 属性 / 标签联动） |
| M6 | 树形地图 + 商店 / 事件 / 精英 / BOSS 正式实现 |
| M7 | 自动化测试 + 玩家模拟 + 视觉回归 + 综合验收 |
