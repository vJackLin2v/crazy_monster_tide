# HANDOFF —— 新会话接管须知

> 最后更新：2026-10-19 ｜ 由上一轮 Agent 在上下文耗尽前写下
> **读这份就够开工了**。细节仍以 `AGENTS.md` / `tasks.md` / `rules.md` 为准。

---

## 0. 一句话现状

**《疯狂怪潮》已经是一个功能完整的可玩 Demo**：Cocos 3.8.6 工程、11 屏 UI、20 波 + 精英 + BOSS + 无尽、
16 技能、18 行为模块、24 属性、70 道具、6 BOSS、音频 + 音效。
**需求 §10 的内容量指标全部达标。**

最近做完的是 **M28**（角色选择改 2 列 + 立绘裁掉透明边，角色本体 52×60 → 104×120，D-36）；
再往前是 **M27**（用户报的 5 条：经验系统 / 技能描述 / 图标重复 / 模块替换 / 范围特效）。详见 `tasks.md`。

---

## 1. 开工先跑这三条（验环境）

```bash
cd H:/AI-game/crazy_monster_tide/cocos

# 类型检查（逻辑层，不需要编辑器）
node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json

# 类型检查（画面层，用 cc 桩）
node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.cc.json

# 单测（63 项）
node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts
```

**三条必须全绿（0 错误 / 63 PASS）再动代码。** 上一次交接时是绿的。

---

## 2. 手动验证流程（必读，这套流程踩了很多坑才顺）

### 2.1 需要用户开着 Cocos Creator 编辑器

预览地址 `http://127.0.0.1:7456/`。**编辑器关着就什么都验不了。**

### 2.2 触发编辑器编译

```bash
cd H:/AI-game/crazy_monster_tide/cocos
python tools/cocos_compile.py <文件> <标记>
```

**三个坑（都踩过）：**

| 坑 | 说明 |
|---|---|
| 标记必须写在**代码**里，不能写在注释里 | 编译后注释被剥掉，永远匹配不到 → 空等 90 秒 |
| 编辑器**经常不侦测文件改动** | 一条命令里多重试几次（`for i in 1 2 3`），或先 `touch` 文件 |
| 有时需要把编辑器窗口置前 | `python tools/cocos_compile.py` 内部会调 `tools/activate_cocos.ps1` |

### 2.3 截图 + 看画面

```bash
# 逐屏截图（脚本在 .tmp/，可复用/改造）
NODE_PATH="H:/AI-game/pixel_roguelike_wechat_agent_kit/node_modules" node .tmp/uishot_cocos.cjs
```

**看图的唯一办法**（我自己的工具看不到图片）：

```bash
export ZHIPU_API_KEY=$(powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('ZHIPU_API_KEY','User')" | tr -d '\r\n')
VLM_MODEL=glm-4.5v python .tmp/see.py <图片> "<问题>"
```

- `glm-4.5v` 最强；`glm-4v-flash` 免费但自相矛盾
- ⚠️ **它经常误读小尺寸图标**（把靶心说成箭头、把拳头说成面具）。
  **要看图标必须放大到 80px 以上再看**，并且结论要回代码/实测复核。

---

## 3. 两个环境事实

| 事实 | 影响 |
|---|---|
| **预览可视高度是 760，不是设计稿的 640**（cover 相机） | 所有"贴底"的元素必须用 `VH - 离底距离` 定位，**不能写设计稿的绝对 y**，否则会悬空 120px（这个坑踩过两次：技能栏、Build 抽屉） |
| 预览画布尺寸被 Cocos 锁死 | **没法在预览里测多机型**。真·三档视口验证需要 Web 构建产物或真机 |

---

## 4. 待用户决策（问过但没定的）

| # | 问题 | 说明 |
|---|---|---|
| ~~Q1~~ | ~~角色立绘要不要改成 2 列~~ | **已定（D-36，2026-10-20）**：改 2 列 × 2 行 + 翻页；立绘改用裁掉透明留白的 `portrait.png`，角色本体 52×60 → **104×120**。实机截图待编辑器打开后补 |
| **Q2** | **手感 / 难度 / 音量的具体问题** | 这块 Agent 完全没法自己判断，**必须用户玩一局后反馈**。我这边只能保证"能跑、无报错、数值有依据" |
| Q3 | 局外成长（角色解锁/永久强化）首版是否上线 | `requirements.md` Q4 |
| Q4 | 商业化（广告/内购）与合规文案 | `requirements.md` Q5 |
| Q5 | 微信相关（分包 / 上架） | **用户明确说"先不要搞微信相关的，先把游戏做出来"** |

---

## 5. 已知问题清单（按优先级）

### 🔴 未验证（最该先做）

| 项 | 说明 |
|---|---|
| **M28 角色选择没看实机** | 布局数学 + 预览渲染已验（82 PASS），但 Cocos 实机截图要等编辑器打开。**新加的 6 张 `portrait.png` 需要编辑器导入后才有 .meta** |
| **M27 的 4 条改动没经过真人确认** | 经验减半、模块替换提示、刃爆起手爆发 —— 代码逻辑验过了，**手感得用户玩** |
| **真机 / 三档视口** | 预览做不到，需要 Web 构建产物 |
| **音频听感** | 22 个音频载入成功、BGM `playing=true`、无报错 —— 但**我听不到声音**，音量平衡/刺耳与否要用户听 |

### 🟡 已知缺陷

| 项 | 说明 |
|---|---|
| resources 约 17MB → 微信主包 4MB 限制 | 上架阻塞，需分包方案（**用户暂缓**） |
| 受击无敌帧 DEMO 0.55s / Cocos 0.80s | 两版分叉，未定基准（Cocos 的 0.80 是三轮实测标定的，倾向以它为准） |
| 死神镰刀图标画风不一致 | 唯一一个非"行囊守卫"风格（Sephiria 的真镰刀），**用户明确接受** |
| 主池还有 90+ 怪物单位没用 | 可扩普通怪/精英，纯内容工作 |

---

## 6. 本轮（M23~M27）踩过的坑 —— **别再踩**

| # | 坑 | 教训 |
|---|---|---|
| 1 | `Battle.start()` **不保证**在 `startRun` 之前跑（菜单里节点 inactive，Cocos 不调 start） | `startRun` 要自保 `if (!this.cam) this.buildTree()`；`buildTree` 必须**幂等**（重复调用会产生第二套 World/Camera，画面直接错） |
| 2 | `Graphics.ellipse() + fill()` 会让 Cocos **卡死** | 椭圆填充改用 `circle + fill` + 节点 `setScale(1, 0.42, 1)` |
| 3 | 同一节点加两个 `Graphics` → 图标画不出来 | `panel()` 内部已建 Graphics；要再画图标必须新建**子节点** |
| 4 | `resources.load()` **不接受扩展名** | `'art/audio/x.ogg'` 会失败，必须去掉 `.ogg/.wav/.png` |
| 5 | 「没载入就先记状态」→ 功能永不生效 | BGM 的 `bgm()` 在 clip 未载入时就记了 `curBgm`，之后同样调用被"同一首"挡掉 → 永远不播。要记 `wantBgm`，载入完补播 |
| 6 | `text()` 是**单行高**节点，自动换行的第二行会被裁 | 多行文本必须传 `h`（节点高度）；单行标签要限宽截断 |
| 7 | 橙底深字 + 2px 黑描边 = 糊成一团 | **深色字一律不加描边**（主按钮、选中的页签/chip） |
| 8 | 按文件名猜图标画面 = 错 | `sh-pierce` 其实是**靶心**、`sh-execute` 是**拳头**。**必须放大看图再分配** |
| 9 | 生成数据时忘了写单位/语义 | 道具描述出现一堆裸 `+1` / `+22%`。**批量生成后必须抽样人读一遍** |
| 10 | 编译标记写在注释里 = 假通过 | 见 §2.2 |

---

## 7. 关键文件地图（改东西前先看）

```
cocos/assets/scripts/
  core/Const.ts         ← 所有数值的唯一来源（波次/经济/成长/商店）
  game/SkillCalc.ts     ← 伤害与冷却的**单一结算入口**（属性、模块、标签联动都在这）
  game/RunState.ts      ← 一局状态（奖励/商店/安装/替换/经验）
  game/Stats.ts         ← 角色初始属性（倍率不能当绝对值，见 D-13）
  battle/Battle.ts      ← 战斗主体（刷怪/技能开火/掉落/波次推进/特效）
  ui/Tokens.ts          ← 设计令牌（改这里等于改规格）
  ui/UIKit.ts           ← 绘制原语（panel/button/text/slot/chip/gradBar/radialGlow）
  ui/Hud.ts             ← 战斗 HUD
  ui/MenuScreens.ts     ← 主界面/玩法说明/角色选择/结算
  ui/Modals.ts          ← 升级3选1/确认/商店/Build抽屉
  ui/ManageScreens.ts   ← 模块安装/技能替换
  data/IconMap.ts       ← 图标语义映射（道具70/模块18/属性24）
  data/Items.ts         ← 70 道具
  data/Attrs.ts         ← 24 属性
  GameRoot.ts           ← 屏幕流程编排 + 预制体

docs/ui/mockups/v2/     ← UI 设计稿（**一屏一文件** + style.css）
docs/ui/ui-spec-approved.md ← UI 规格 v1.1（已冻结）
screenshots/ui-audit/cocos/ ← 实机截图
screenshots/ui-v2-design/   ← 设计稿渲染图 + 并排对照
```

---

## 8. 下一步建议（按优先级）

1. **等用户玩一局反馈** —— 手感/难度/音量，这是唯一没法自查的部分
2. 打开编辑器 → 导入 6 张新 `portrait.png` → 实机核对角色选择屏（M28 的截图还没补）
3. 若要做多机型验证 → 出 Web 构建产物（Cocos 构建面板），用 Playwright 跑三档视口
4. 内容扩充：主池 90+ 怪物单位可用（`H:\AI-game\素材工坊\人物素材\敌人与怪物\行囊守卫\`）
5. 微信相关（用户暂缓，别主动开工）

---

## 9. 红线（每次都要守）

- 一次只做一个里程碑，做完停下等确认
- 禁止赌博语义（老虎机/转盘/骰子/开箱/付费抽取）
- 不得照搬竞品美术/文案/数值/UI
- `docs/requirements.md` 只读 —— 用户指令通过 §13 记录
- **禁止向 C 盘写文件**（`TEMP`/`TMP` 要指到工程内 `.tmp`）
- 不得用「应该可以」代替验证证据 —— **必须贴命令输出 / 截图 / 实测数据**

---

## 10. ⚠️ 工作区有 453 个未提交改动

最后一次 commit 是 `M27 之前` 的状态。未提交的主要是：

- **新增素材**：61 个图标 PNG（`resources/art/icons/`）、3 个 BOSS 的帧（`units/boss-{infernal,devourer,crystal}/`，约 380 张）
- **代码**：`battle/Battle.ts`、`GameRoot.ts`、`data/{Attrs,Items,Skills,Enemies,UnitFrames,IconMap}.ts`、`game/{RunState,SkillCalc,Stats}.ts`、`ui/*.ts`、`typings/cc-stub.d.ts`
- **文档**：`docs/**`、`memory-bank/**`

**建议**：开工前先 `git status` 看一眼，确认这些改动是预期的；需要的话先提交一版再动代码，
避免把上一轮的成果和这一轮的改动混在一起。
