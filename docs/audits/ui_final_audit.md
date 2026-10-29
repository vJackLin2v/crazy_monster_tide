# UI 收尾 / 触控 / 微信适配 —— 审计与交付记录

> 执行日期：2026-10-29 ｜ 分支 `main` ｜ 基线 `be26b4b` → 本轮提交（见文末）
> 环境：Cocos Creator 3.8.6 + TypeScript，竖屏 360×640，web-mobile 构建
> **微信真机未验证**（文末列出需人工完成的步骤）

---

## 0. 开工基线

```text
git rev-parse --abbrev-ref HEAD  → main
git log --oneline -1             → bab70cc 忽略 deliverables/ 打包目录
git status --short               → （空，工作区干净）
```

参考基线 `be26b4b` 之后的提交都是文档/截图，不含玩法改动；本轮在此基础上实施。
本地 `ccos/package.json` 只有 `typecheck`（`tsc -p tsconfig.check.json`）和 `test`（`tsx tests/run.ts`），
实际执行用仓库外的 node_modules 绝对路径（见 §6）。

---

## 1. 逐条改动

### P0-A 安全区读取（**真 bug，已修**）

| 项 | 内容 |
|---|---|
| 问题 | `Safe.ts` 调用的是 `view.getSafeAreaRect()`，**该方法在 3.8.6 不存在**；异常被 `catch` 吞掉 → 永远走常量兜底，刘海机上从未读到过真实安全区 |
| 依据 | 本机安装版引擎源码 `resources/3d/engine/cocos/core/platform/sys.ts`：API 是 **`sys.getSafeAreaRect(symmetric = true): Rect`**；`cocos/ui/safe-area.ts` 内部也用它 |
| 坐标系 | 引擎内部 `view._convertToUISpace()` 转过 → 返回**设计分辨率单位**、**原点在可见区左下角**。所以 `topInset = visible.height - (r.y + r.height)`、`bottomInset = r.y` |
| 改动 | `ui/Safe.ts` 全量重写：改用 `sys.getSafeAreaRect(false)`；打印来源日志；注册 `canvas-resize / design-resolution-changed / window-resize / orientation-change` 重置缓存；设计留白与真实安全区**分开记录**（`layout = max(28, rawTop)`） |
| 证据 1 | 控制台：`[Safe] source=sys raw(top/bottom)=0/0 → layout=28/10 visible=360x640` —— `source=sys` 证明**真的调到了引擎 API**（旧实现只可能是 fallback） |
| 证据 2 | 在浏览器里模拟刘海（把 `sys.getSafeAreaRect` 改成 top=44 / bottom=21 后 `view.emit('canvas-resize')`）：<br>`[Safe] source=sys raw=44/21 → layout=44/21`；主菜单标题 y 由 **228 → 212**（正好下移 16 = 44−28）；HUD 的 HP 条同步下移。<br>截图：`screenshots/ui-final/360x640-safearea-notch-sim.png`、`...-safearea-notch-hud.png` |
| 未验证 | 微信真机（见 §7 步骤 1–3） |

### P1-A 按钮禁用行为（**已修**）

| 项 | 内容 |
|---|---|
| 问题 | `button()` 里 `dis` 是创建时常量；`setEnabled(false)` 只换外观。业务回调挂在 `onTap` 上，禁用后**照样执行、照样播点击音**，还会切到按下图 |
| 改动 | `ui/UIKit.ts`：`button()` 内新增可变 `enabled`，写节点标记 `__uiEnabled`；`setEnabled` 同步外观与标记；`onTap()` 在 `TOUCH_END` 里 `if (node.__uiEnabled === false) return;`（**先于音效**） |
| 调用方 | 全仓只有图鉴翻页两处 `setEnabled`（`MetaScreens.ts`），风险可控 |
| 证据 | 图鉴「角色」页 `1 / 1` → 点「下一页」→ 仍 `1 / 1`（无业务动作）；切到「道具」页 `1 / 12` → 点「下一页」→ `2 / 12`（启用后正常） |

### P1-B 触控热区 ≥44 与不重叠（**已修 + 新增独立审计**）

| 位置 | 原状态 | 现在 |
|---|---|---|
| `mergeHit` | 46×**34** | 46×**44**，且合并行距 34 → **46**（`MERGE_PITCH`），行高 30 → 38 |
| `unequipHit` | 80×**34** | 80×**44** |
| 安装槽 `slotHit` | 热区=槽体 74×34 | **独立热区 74×44**（视觉不变） |
| 背包 `bagHit` | 热区=格体 100×30 | **独立热区 100×44**；格高 30 → 40、行距 36 → 46 |
| 抽屉技能行 | 整行 42 高 | **44** |
| 抽屉「查看全部属性」 | 26 高 | **独立热区 44 高**（视觉条仍 26，位置内移） |

新增 `tools/ui/audit_hit_area.cjs`：收集所有 `__hit` 节点，检查 **尺寸 ≥44×44、屏幕越界、两两相交**（仅允许祖孙关系重叠，用于"行内锁定钮"这种必须吞事件的场景）。
**注意**：原来的 `audit_overflow.cjs` 会跳过 `*Hit`，所以它 PASS 不代表热区合格 —— 两个工具是互补的，报告里分开写。

```text
=== 热区审计（360x640） ===
PASS 所有可点热区 ≥44×44、无越界、无意外重叠
```

### P1-C 字号 / 孤字 / 决策后果（**已修**）

| 文案 | 原 | 现 |
|---|---|---|
| 抽屉·属性差值 | 9 | **10**（列宽 30→36） |
| 抽屉·技能摘要 | 9 | **10** |
| 抽屉·黑科技说明 | 9 | **10** |
| 抽屉·「还有 N 件 / N 个」 | 9 | **10** |
| 安装屏·被选中模块效果 | 11，但拼了「名称」前缀 → 末尾 2~3 字掉行 | **去掉前缀**（顶部已写"已拿起「X」"）+ 宽度 232→236 + 高度 36 → **单行完整**，无孤字 |
| 替换屏·"N 个黑科技退回背包 / 无黑科技可退" | **9**，且与技能名挤在同一行 | **11**，改为第二行（`y=-11`，`h=16`），点之前就能读到后果 |
| 替换屏·底部说明 | 10 | **11** |

`h` 一律按"字号 ×1.5 × 行数"给足，避免 CLAMP 静默裁切。

### P1-D 角色卡可见立绘尺度（**已核 + 微调**）

| 角色 | 源尺寸 | 整数倍 | 渲染可见 |
|---|---|---|---|
| 铁拳骑士 | 13×15 | 4× | 52×**60** |
| 秘术学徒 | 14×15 | 4× | 56×**60** |
| 荒野游侠 | 14×15 | 4× | 56×**60** |
| 苦行僧 | 12×14 | 4× | 48×**56** |
| 陨星师 | 14×15 | 4× | 56×**60** |
| 狂信者 | 17×25 | 2× | 34×**50** |

- `CharLayout.portraitFit` 目标高度 56 → **55**，使 6 个角色落在目标 **±9.1%**（50~60）。
- 骑乘单位（17×25）**只能 2 倍**：3 倍 = 75 会超出卡片立绘框（60），且**不允许拉伸**——这是唯一偏低的角色，已在报告里标注。
- 未做任何非等比缩放；portrait 失败仍回退 idle 首帧；名称与勾选徽标不与立绘重叠（见 `360x640-charselect*.png`）。

### P2-A 主菜单一行核心循环
`MenuScreens.ts:96` 在英文副题下加 **11px 一行**：`自动开火 · 4 技能构筑 · 20 波挑战`。
不加卡片、不加面板，主 CTA 仍是全页唯一橙色焦点。

### P2-B 玩法说明合成规则条
`MenuScreens.ts:155` 把弱提示升级为 **336×34 规则条**（11px，`panel_soft`），与「返回」间距充足，未新增第五步。

### P2-C 成就 / 结算边界
- `MetaScreens.ts:253` 成就行高**自适应**（`min(50, 可用高度分)`），九行完整显示，末行与「返回」≥12px（实测 ~37px @360、~150px @412）。
- `MenuScreens.ts:438` 结算构筑被截断时显示 `仅显示前 N 项（共 M 项）`。

---

## 2. 明确的"不做什么"

- 没有改任何伤害 / 掉落 / 技能数值 / 升级概率 / 金币 / 商店价格 / 波次时长。
- 没有换色板、没有新增 UI 依赖、没有引入新美术素材（九宫格仍是 Kenney CC0）。
- 没有为了填满页面加滚动容器/装饰卡/常驻动效。

---

## 3. 截图（`screenshots/ui-final/`，未覆盖旧基线）

> 取证修正：第一轮 `charselect-sel` 是调用 `G.selectChar()` 生成的，但该方法**不存在**（返回 ERR 被忽略），
> 导致三档的"已选"截图与"未选"**完全重复**（文件大小一致被发现）。已改为**真实点击第 6 张卡片**重拍，
> 并用"选中徽标数 = 1"校验，现在两版文件大小不同、徽标只出现在被点的那张卡上。

三档视口 × 20 种状态：`menu / howto / charselect / charselect-sel / settings / codex-1page / ach /
hud-empty / hud-lowhp-boss / levelup / shop / drawer-skill / drawer-mod / drawer-item / drawer-attr /
install / install-slot / replace / confirm / result-win / result-lose`
（390/412 略去部分抽屉子页；另含 360 的安全区模拟两张：`*-safearea-notch-sim/-hud.png`）。

---

## 4. 自动化验收结果

| 项 | 命令 | 结果 |
|---|---|---|
| 类型检查 | `tsc -p tsconfig.check.json` | **exit 0** |
| 单测 | `tsx tests/run.ts` | **PASS 120 / FAIL 0** |
| 构建 | Cocos CLI `--build platform=web-mobile` | **build success** |
| 越界审计（三档） | `node tools/ui/audit_overflow.cjs` | **PASS 360 / 390 / 412**，exit 0 |
| 热区审计 | `node tools/ui/audit_hit_area.cjs` | **PASS**，exit 0 |
| 安全区 | 浏览器控制台 + 模拟刘海 | `source=sys`；44/21 下标题 228→212 |
| 按钮禁用 | 图鉴翻页真实点击 | 禁用不翻页、启用正常 |
| 商店锁/购 | 真实点击（999 金币） | 点锁 gold 不变、locked=true；点主体 gold −14、sold=true |
| 升级卡按下态 | 派发 TOUCH_START 读 Sprite.color | 卡片 255→205，**图标保持 255**（未被污染） |

---

## 5. 修改文件清单

| 文件 | 说明 |
|---|---|
| `cocos/assets/scripts/ui/Safe.ts` | 改用 `sys.getSafeAreaRect`、坐标换算、来源日志、尺寸变化重置 |
| `cocos/assets/scripts/ui/UIKit.ts` | 按钮运行时 enabled（`__uiEnabled`）、`onTap` 拦截禁用、`__hit` 标记 |
| `cocos/assets/scripts/ui/ManageScreens.ts` | 槽/背包/合成/卸下热区、替换后果 11px 两行、安装效果单行 |
| `cocos/assets/scripts/ui/Modals.ts` | 抽屉技能行 44、属性条独立热区、差值与摘要/说明 10px、merge 行距 46 |
| `cocos/assets/scripts/ui/CharLayout.ts` | 立绘目标高 56 → 55 |
| `cocos/assets/scripts/ui/MenuScreens.ts` | 菜单一行核心循环、玩法说明规则条、结算截断提示 |
| `cocos/assets/scripts/ui/MetaScreens.ts` | 成就行高自适应（末行留白） |
| `tools/ui/audit_hit_area.cjs` | **新增**：热区尺寸/越界/重叠审计 |

---

## 6. 命令原文（可复现）

```powershell
# 类型检查 / 单测（仓库无 node_modules，用本机 toolchain）
cd cocos
node H:\AI-game\xingnang\cocos_port\node_modules\typescript\bin\tsc -p tsconfig.check.json
node H:\AI-game\xingnang\cocos_port\node_modules\tsx\dist\cli.mjs tests/run.ts

# 构建
$env:ELECTRON_RUN_AS_NODE=''
& 'C:\ProgramData\cocos\editors\Creator\3.8.6\CocosCreator.exe' --project <repo>\cocos --build 'platform=web-mobile;debug=false;md5Cache=false'

# 截图/审计（需先起静态服务 :8123）
$env:NODE_PATH='H:\AI-game\agent-visual-asset-service\frontend\node_modules'
node tools\ui\audit_overflow.cjs
node tools\ui\audit_hit_area.cjs
```

---

## 7. 微信真机验证步骤（未执行，需人工）

1. 微信开发者工具导入 `cocos/build/web-mobile`（或用 Creator 的「微信小游戏」构建），开启**真机调试**。
2. 看控制台 `[Safe]` 行：应为 `source=sys` 且 `raw(top/bottom)` 非 0（iPhone 刘海机 top 通常 44~47、bottom 34）。
3. 若 `source=fallback` 或 raw 恒为 0：说明 `sys.getSafeAreaRect` 在该机型/宿主没给值 —— 记下机型与系统版本。
4. 目视检查：HUD 的 HP 条、右上暂停键、BOSS 血条、页面标题、底部按钮/技能栏 **都不被刘海或手势条压住**。
5. 前后台切换一次（微信切到后台再回来），确认安全区没有错位（缓存已注册重置）。
6. 触控：在安装屏点相邻两个技能槽的**边界处**，确认不会串槽；商店点锁后不触发购买。

---

## 8. 清单

**已修复**：P0-A 安全区、P1-A 按钮禁用、P1-B 热区（含合并行距）、P1-C 字号/孤字/替换后果、P1-D 立绘尺度、P2-A/B/C。

**未完成 / 风险**：
1. **微信真机全部未验证**（含安全区、触控手感、性能）——这是唯一阻止"上线级验收"的项。
2. 立绘"狂信者"（骑乘 17×25）可见高度 50，相对目标 55 为 −9.1%（在 ±10% 内），但低于其它角色的 60；受"整数倍 + 不拉伸"约束无解，已在 §1 P1-D 说明。
3. 抽屉仍是"无滚动"，黑科技超过 6 条只显示前 3+3（按提示词要求未引入滚动容器）。
4. 热区审计只覆盖已注册 `__hit` 的节点；自定义监听（如将来的长按）需同样打标记。

**是否存在阻止上线的 P0/P1**：代码层面无已知 P0；**P1 未闭合项为 P0-A 的真机确认**（浏览器已证明链路正确，真机值仍需人工看一眼）。
