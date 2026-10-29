# HANDOFF —— 新会话接管须知

> 最后更新：2026-10-20 ｜ 由上一轮 Agent 在上下文耗尽前写下
> **读这份就够开工了**。细节仍以 `AGENTS.md` / `tasks.md` / `rules.md` 为准。

---

## 0. 一句话现状

**《疯狂怪潮》已经是一个功能完整的可玩 Demo**：Cocos 3.8.6 工程、11 屏 UI、20 波 + 精英 + BOSS + 无尽、
16 技能、18 行为模块、24 属性、70 道具、6 BOSS、音频 + 音效。
**需求 §10 的内容量指标全部达标。**

最近做完的是 **M35/M36**（波末不再杀怪换经验 / 模块**玩梗改名** / 安装屏说明条·兼容白光·**卸下**·合成按钮与等级显示修复）、
**M34**（16 个技能加玩家向说明 / 地刺改**素材**，不再程序化绘制）、
**M33**（开局重置全部局内状态 / 波末吸取看得见且升完级才进商店 / **范围技能只画 32px 的根因** / 技能页手风琴）、
**M32**（技能图标语义修 4 个 / 安装行为模块页重做 / **行为模块合成 D-40**）、
**M31**（经验球「看得见」：拾取半径 85→34 + 菱形晶体；全量文案去术语）与
**M30**（扇射不散射 / 怪物只有 idle 动画 / 技能特效跨波残留 / 商店显示已有道具 / 暂停面板装不了模块）；
再往前是 **M29**（立绘回一页 / 技能视觉 / 施法动作 / 属性页 / 投射物朝向 / 替换卡死，D-37）、
**M28**（已被 M29 #1 回退）与 **M27**。详见 `tasks.md`。

**2026-10-20 实机验收**：M29 六条已全部实机看过（Playwright 驱动预览 + 截屏 + 状态断言），
顺手修掉 Build 抽屉坐标 bug（属性页 24 项现在全可见、副标题不再写死「第 0 波」）。

---

## 1. 开工先跑这三条（验环境）

```bash
cd H:/AI-game/crazy_monster_tide/cocos

# 类型检查（逻辑层，不需要编辑器）
node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json

# 类型检查（画面层，用 cc 桩）
node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.cc.json

# 单测（87 项）
node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts
```

**三条必须全绿（0 错误 / 94 PASS）再动代码。** 上一次交接时是绿的。

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
| ~~Q1~~ | ~~角色立绘要不要改成 2 列~~ | **已定（D-36 → D-37 修订）**：先试 2 列（104×120）用户嫌大 → **回到 3 列一页 6 个，立绘 78×90**（仍比最早的 52×60 大 50%）。实机截图：`.tmp/live_2-charselect.png` |
| **Q2** | **手感 / 难度 / 音量的具体问题** | 这块 Agent 完全没法自己判断，**必须用户玩一局后反馈**。我这边只能保证"能跑、无报错、数值有依据" |
| Q3 | 局外成长（角色解锁/永久强化）首版是否上线 | `requirements.md` Q4 |
| Q4 | 商业化（广告/内购）与合规文案 | `requirements.md` Q5 |
| Q5 | 微信相关（分包 / 上架） | **用户明确说"先不要搞微信相关的，先把游戏做出来"** |

---

## 5. 已知问题清单（按优先级）

### 🔴 未验证（最该先做）

| 项 | 说明 |
|---|---|
| ~~M29 的 6 条没经过确认~~ | **2026-10-20 已实机验收 6/6 通过**（见 `tasks.md`「M29 实机验收」）。仍缺的只是**真人体感**（Q2） |
| ~~M29 新换的弹体素材没在引擎里看过~~ | 已验：素材表 `.tmp/sheet_proj_assets.png`（三张都是头右尾左的长条/月牙）+ 实机裁剪 `.tmp/crop_proj05.png` |
| ~~M28/M29 角色选择没看实机~~ | 已验：`.tmp/live_2-charselect.png`（3 列 × 2 行一页 6 个；6 个 `portrait.png` 的 .meta 都在） |
| **M30 的 5 条 + M27 的 4 条没经过真人确认** | 代码/实机都验过（见 `tasks.md`「M30」），**观感与手感仍要用户玩一局** |
| **真机 / 三档视口** | 预览做不到，需要 Web 构建产物 |
| **音频听感** | 22 个音频载入成功、BGM `playing=true`、无报错 —— 但**我听不到声音**，音量平衡/刺耳与否要用户听 |

### 🟡 已知缺陷

| 项 | 说明 |
|---|---|
| resources 约 17MB → 微信主包 4MB 限制 | 上架阻塞，需分包方案（**用户暂缓**） |
| 受击无敌帧 DEMO 0.55s / Cocos 0.80s | 两版分叉，未定基准（Cocos 的 0.80 是三轮实测标定的，倾向以它为准） |
| 死神镰刀图标画风不一致 | 唯一一个非"行囊守卫"风格（Sephiria 的真镰刀），**用户明确接受** |
| 主池还有 90+ 怪物单位没用 | 可扩普通怪/精英，纯内容工作 |
| **拾取半径 85 → 34 是平衡改动（M31）** | 手感要用户确认；觉得要跑太远就回调到 40~50。**改的时候 `Const.BASE_PICKUP` 与 `Attrs.pickup.base` 必须同时改**，否则属性面板差值错 |
| `eyebat` 没有 attack 帧 / `stingerbat` 没有 walk 帧 | 源素材包（行囊守卫 02EyeBat / 05StingerBat）本来就没有这两路；代码会回退到 idle。要补得另找图 |

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
| 11 | 构建抽屉里把**父节点坐标**当抽屉内部坐标用（`dcTop = c.y + (DH+24)/2`） | 内容整体下移 `|c.y|` px（760 屏 157px / 640 屏 97px）：属性页 24 项只有 12 项能读、其余被底部按钮压住。**抽屉内的元素一律用抽屉内部坐标**（2026-10-20 实机验收发现并修复） |
| 12 | 抽屉副标题写死 `'第 ' + 0 + ' 波'` | 波次要走 `rs.wave`，别写常量 |
| 13 | 模块写了参数但**没接进结算**（扇射只加 `fan`，发射循环只跑 `count`） | 加模块要顺着「数据表 → calcSkill → 施放处」走完一遍；只改数据表=没效果 |
| 14 | 敌人 `anim` 只在 `setClips` 时播过 idle，update 里从不切换 | 单位有三套以上帧就**必须在 update 里按状态切**（walk/attack/death），否则看着像贴图平移 |
| 15 | 波次结束只清了敌人，没清飞行物 / 区域 / 召唤 / 闪电 | `beginWaveEnd` 必须 `clearFieldFx()`，否则上一波特效飘进商店和下一波 |
| 16 | **图标"看着不像"** 只靠文件名 / 上一轮的结论判断 | 必须把候选**拼成 8× 对照页**再看；`sk-ring` 实际是"绿地上的黑影"、`sk-bolt` 是"弓+一坨橙"、`skill-ground_slash` 是树枝状闪电。缺合适的图时，**从项目自己的 VFX 帧复制**（同风格、已授权） |
| 17 | 合成类模块用 `<id>_2` 后缀后，**名称查询漏改** | 所有地方用 `moduleDef(id)`，不要直接 `MODULES[id]`，否则界面显示原始 id |
| 18 | 选中态存**模块 id** → 同名模块一起高亮 | UI 选择要存**实例**（背包索引 / 槽位），存 id 会把所有同名一起点亮 |
| 19 | 暂停面板「装模块」只认真背包里的模块，背包一空就静默返回 | 已装模块也要能搬（`RunState.moveMod`）；空背包时别静默 return |
| 20 | **参数实现了但玩家看不见**：拾取半径 85 arena ≈ 半个屏宽（cam.viewW≈178），经验球当帧被吸走 | 任何"掉落→拾取"类循环，先算**半径占屏幕的比例**；再小也要能被眼睛看见（球体尺寸 × 相机缩放） |
| 21 | 开发术语漏到玩家界面（「攻击实例」「乘区叠加」「火标签」） | 写 desc 时按玩家语言；全量扫描 `data/*.ts` 的 desc + UI 中文字面量，黑名单见 tasks.md M31 |
| 22 | **`FrameAnim.setClips` 会把节点改成帧原生尺寸（32px）** —— 范围特效没关 autoSize | 半径 24~34 的震荡波 / 霜爆 / 毒雾 / 刃暴 / 地刺全画成 32px 一小圈，看起来"技能没效果"。范围类节点必须 `anim.autoSize = false` |
| 23 | 开新局只 `new RunState`，**场上实体和玩家节点没清** | `startRun` 先 `resetRunState()`：敌人 / 宝石 / 子弹 / 区域 / 特效 / 召唤 / 闪电 / 玩家节点 / 波次计时全清 |
| 24 | 波末吸到第一颗经验就弹升级卡，**打断吸取过程** | 波末经验先记 `waveEndUps`，等宝石清空再 `onLevelUp(n)` 连开 n 张，选完才 `finishWave()` |
| 25 | `addVfx` 对**没预加载**的 key 直接返回 null → 新加的特效"第一发永远不出" | 现在会触发 `Assets.loadVfx(key)` 懒加载；新 key 同时加进 `preloadVfx()` |
| 26 | **背景图由另一个会话负责**（2026-10-20 用户指定） | 不要再改 `Battle.buildTree()` 的地面绘制段，避免两个会话互相覆盖 |
| 27 | `button()` **强制 44px 触摸高度**，塞进 26~30px 的行里必定错位/溢出 | 短行里的按钮用 `panel() + onTap()` 自绘（如合成按钮 64×26） |
| 28 | 物品/模块"等级"用浮在角上的小 chip，位置很怪 | 等级写进名字（「加量Ⅱ」）+ 金色字，不要再叠角标 |
| 29 | 只能替换、不能卸下模块 | `RunState.unequip(si, sl)` + 安装屏「卸下」按钮（M36） |
| 30 | **tags / 描述里声明了能力，代码里没实现**（`return` 回旋刃飞出去不回来） | 改技能时要对着 tags 逐条确认：homing / return / pierceable / dot 都有对应逻辑，否则就是"写着有、玩起来没有" |
| 31 | **黑科技只存参数、命中流程没接**（bounce/chain/split/echo/thornmail 全是死的）；`bulletRt()` 还把 vamp/thunder/slow 清零 | 加模块要连"数据表 → calcSkill → 命中/发射 → 运行时实体"四层都通了；`bulletRt` 必须透传全部效果字段 |

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
2. 打开编辑器 → 导入 `portrait.png` → 实机逐条核对 **M29 的 6 条**（角色选择 / 灵能箭·圣光弹·回旋刃的弹体 / 刃暴施法 / 属性页 / 火球朝向 / 替换技能后能否继续）
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
