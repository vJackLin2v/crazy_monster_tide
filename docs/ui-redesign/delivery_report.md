# UI 专项改造 · 交付报告

> 项目：《疯狂怪潮》`H:\AI-game\crazy_monster_tide`（Cocos Creator 3.8.6，竖屏 360×640）
> 日期：2026-10-28　｜　范围：只改 UI 表现层，未动任何战斗 / 数值 / 掉落 / 经济逻辑
> 配套文档：`ui_pages_v2.md`（逐页说明）、`asset_usage_manifest.md`（素材与授权）、`ui_credits.md`

---

## 0. 一句话结论

把原来"程序化圆角方块"的 UI 换成了**一套真实的 Kenney Pixel UI Pack（CC0）九宫格组件**，
并按竖屏实际可用空间重排了 11 个已实现界面：HUD / 升级三选一 / 主菜单 / 角色选择 / 商店 / 结算 /
暂停构建面板 / 黑科技安装 / 技能替换 / 二次确认 / 玩法说明。
构建通过、单测 111 PASS、三档视口各 12 张实机截图、真实点击冒烟通过。

> ⚠️ **必须先说的冲突**：任务包 `02_UI页面布局与尺寸规范.md` 按 **1280×720 横屏**设计，
> 但它描述的是另一个项目（《像素共鸣：远征》）；本工程是 **360×640 竖屏**的《疯狂怪潮》，
> 没有路线 / 图鉴 / 转职。按任务书自身的最高优先原则（"保护当前功能、先检查实际项目、只改 UI、不虚构功能"），
> 本次**保留竖屏**、只改已有页面、把横屏规格的"结构意图"重排到竖屏。详见 `ui_pages_v2.md` §0。

---

## 1. 完成（文件级）

### 1.1 素材（新增）
| 路径 | 内容 |
|---|---|
| `assets/ui/third_party/kenney_pixel_ui_pack/` | **原始下载包**（38 个文件）：`License.txt`（CC0）、`9-Slice/`、`Spritesheet/`、`Preview.png` |
| `tools/art/gen_ui_kit.py` | 生成脚本：把原始 48×48 九宫格按项目暗色调色板重上色 + 2px 黑边 → 52×52；可复跑、幂等 |
| `cocos/assets/resources/ui/kenney/` | **19 张游戏内使用的九宫格 PNG** + 19 个 `.png.meta` |
| `docs/ui-redesign/ui_kit_overview.png` | 素材总览（每张 3 种尺寸的拉伸验证，证明四角不变形） |

### 1.2 代码（改动 / 新增）
| 文件 | 类型 | 关键改动 |
|---|---|---|
| `cocos/assets/scripts/ui/Art.ts` | **新增** | UI 九宫格登记/预加载/`setUiSprite()`；缺素材时返回 false 让 UIKit 回退 |
| `cocos/assets/scripts/ui/Safe.ts` | **新增** | `safeTop()/safeBottom()`：优先读 `view.getSafeAreaRect()`，取不到用保守常量 |
| `cocos/assets/scripts/ui/UIKit.ts` | 重写 | `panel/paintPanel/button/slot/chip/gradBar` 全部改为九宫格素材 + 2px 黑边像素回退；新增 `screenHeader()/divider()`；按钮按下换图 + 文字下沉 |
| `cocos/assets/scripts/ui/Hud.ts` | 重写 | 顶部按安全区；生命=绿 / 经验=蓝紫 / BOSS=红；技能槽 54×54、黑科技方块移入槽内；金币文字坐标 bug 修复 |
| `cocos/assets/scripts/ui/MenuScreens.ts` | 重写 | 主菜单 / 玩法说明 / 角色选择 / 结算：统一标题条、安全区、选中态青框、结算改 4 统计卡 |
| `cocos/assets/scripts/ui/Modals.ts` | 改 | 升级三选一改**三张纵排等卡**、面板高度随内容；商店改标题条 + 自适应行高 + 稀有度框；抽屉页签 36 高 + 44 热区；确认框居中 |
| `cocos/assets/scripts/ui/ManageScreens.ts` | 改 | 黑科技安装 / 技能替换：从"飘在战场上的文字"改为**全屏面板**；矮屏 compact 布局 |
| `cocos/assets/scripts/engine/Assets.ts` | 改 | 新增 `loadUi()`：载入 `ui/kenney/*`，强制 NEAREST，设 10px 九宫格边距 |
| `cocos/assets/scripts/GameRoot.ts` | 改 | `boot()`：先预加载 UI 素材再出菜单（占位底色避免闪白） |

> 未改动：`core/Const`、`data/*`、`game/*`、`battle/Battle.ts` 等任何玩法/数值代码；
> 也未替换任何角色、怪物、技能特效素材。

---

## 2. 验证（真实输出）

### 2.1 构建（Cocos Creator 3.8.6 CLI，web-mobile）
```text
2026-10-28 14:22:40 - debug: build success in 12844!
================================ build Task (web-mobile) Finished in (13 s) ================================
```
- 构建产物：`cocos/build/web-mobile/`；资源包内可查到 `ui/kenney/` 的 19 张图（`assets/resources/config.json`）。
- 说明：CLI 需要先清掉环境变量 `ELECTRON_RUN_AS_NODE`，否则编辑器会以 node 模式启动并报
  `bad option: --project`（本次已踩到并解决）。

### 2.2 单测（项目现有 `tests/run.ts`）
```text
PASS 111 / FAIL 0
```
### 2.3 静态类型检查（`tsconfig.check.json`，core/data/game/tests）
```text
TSC exit 0
```
> 说明：工程没有装 `node_modules`（项目规则禁止 `npm install`），用的是共享工具链
> `H:\AI-game\xingnang\cocos_port\node_modules` 里的 `tsc` / `tsx`。

### 2.4 实机截图（真实运行 `http://127.0.0.1:8123` 的 web-mobile 构建，Playwright Chromium 截图）
三档视口 × 14 屏，共 42 张（另有 1 张 360×640 总览图），存放在 `screenshots/ui-redesign/`：

| 页面 | 360×640 | 390×844 | 412×915 |
|---|---|---|---|
| 主菜单 | `360x640-01-menu.png` | `390x844-01-menu.png` | `412x915-01-menu.png` |
| 玩法说明 | 02-howto | 02-howto | 02-howto |
| 角色选择 | 03-charselect | 03-charselect | 03-charselect |
| 战斗 HUD | 04-battle-hud | 04-battle-hud | 04-battle-hud |
| 精英/BOSS 泛光 | 04b-elite-boss | 04b-elite-boss | 04b-elite-boss |
| 升级三选一 | 05-levelup / 05b-levelup-mix | 同 | 同 |
| 商店 | 06-shop | 06-shop | 06-shop |
| 暂停构建面板 | 07-pause-build | 07-pause-build | 07-pause-build |
| 二次确认 | 08-confirm | 08-confirm | 08-confirm |
| 黑科技安装 | 09-install | 09-install | 09-install |
| 技能替换 | 10-replace | 10-replace | 10-replace |
| 结算（胜/负） | 11-result-win / 12-result-lose | 同 | 同 |

### 2.5 真实点击冒烟（不是 eval 调用，是鼠标/触摸点在设计坐标上）
```text
phase@start = menu
  tap 开始游戏 @design(180,328) css(195,355)
phase after start btn = charselect
  tap 角色卡#2 → 开始闯关
charId = mage | phase = battle
  tap 暂停 @design(333,109)
has modal after pause = true
  tap 继续
has modal after 继续 = false
ERRS none
```
覆盖：主菜单 → 角色选择 → 选卡（确实切换了角色） → 进战斗 → 暂停 → 继续。

### 2.6 全屏构建器运行时健康检查（逐个打开 13 个界面，抓页面错误）
```text
showMenu / showHowto / showCharSelect / startBattle / pause / showLevelUp / skip /
showShop / showPause / confirm / install / replace / result  → 全部 OK
rs = {"skills":1,"gold":8}
ERRS none
```

---

## 3. 对照 `05_验收清单.md`

| 项 | 结果 | 依据 |
|---|---|---|
| 只获取免费单包、无付费依赖 | ✅ | 官方 kenney.nl 0 元下载，未碰 All-in-1 |
| 主 UI 风格已选、未无规划混拼 | ✅ | 只用 Kenney Pixel UI Pack 一套；第二候选与 Foozle 均未混入 |
| 素材有名称/URL/许可/路径记录 | ✅ | `asset_usage_manifest.md`（19 张逐条） |
| 原始素材保留、未覆盖原件 | ✅ | 原件在 `assets/ui/third_party/kenney_pixel_ui_pack/` |
| 字体来源/许可/中文覆盖已确认 | ✅ | 结论：保留系统字体，理由与实测写在 manifest §6 |
| 没有把预览图/线框当素材 | ✅ | 只用 9-Slice PNG，Spritesheet 未使用 |
| 面板/按钮/卡片/标题栏/状态条风格统一 | ✅ | 全部来自同一套 9-Slice + 同一调色板 |
| 主/普通/禁用/选中态清楚 | ✅ | btn / btn_primary / btn_disabled / card_sel / card_gold |
| 无模糊、双线性、边框拉伸 | ✅ | NEAREST + 九宫格 10px；总览图含 3 尺寸拉伸验证 |
| 中文清晰、无缺字/乱码/溢出 | ✅ | 三档视口逐页人工核对；安装屏矮屏 compact 修过一次重叠 |
| 角色/技能素材自然融入 | ✅ | 角色卡与技能槽继续用原素材，未重绘 |
| 主菜单可进入角色选择 | ✅ | 点击冒烟 |
| 角色选择用现有素材、选中态明确 | ✅ | 青框 + 提亮底；点击后 `charId=mage` |
| HUD 不遮挡主战斗区、数据正确 | ✅ | 04-battle-hud 截图；中央无面板 |
| 四个技能槽与实际技能匹配 | ✅ | 槽内容来自 `rs.skills` |
| 三选一卡片等尺寸、可读、点击执行真实升级 | ✅ | 05-levelup 截图 + `pickReward()` |
| 暂停/恢复正确、底层不误触 | ✅ | `mask()` 挂 BlockInputEvents；点击冒烟 |
| 商店/结算/图鉴等现有页面可操作 | ✅ | 商店/结算/安装/替换均截图；图鉴不存在故未做 |
| 未实现功能没伪装 | ✅ | 没有新增任何假按钮 |
| 用原有 Cocos 架构，非 HTML 替代 | ✅ | 全部在 `cocos/assets/scripts/ui/` |
| 实机测横屏与安全区 | ⚠️ **未验证真机** | 已在 3 档浏览器视口验证；微信真机未测（见 §4） |
| 16:9 + 另一种宽高比 | ✅ | 360×640（16:9）+ 390×844 + 412×915 |
| 触控区域适合手指 | ✅ | 主按钮 ≥44；锁/页签挂 44 隐形热区 |
| 弹窗开关/页面切换无异常 | ✅ | 点击冒烟 + 12 屏截图 |
| 构建/运行测试已记录 | ✅ | §2.1~2.3 |

---

## 4. 2026-10-28 用户反馈的三条修复（本轮）

### 4.1 商店「锁」图标错位 ✅
**真因**：锁的 Graphics 画在 `rect(-6,-2,12,10)` + `rect(-4,8,8,6)`，整体 y 范围是 **-2..14**，
比按钮中心高 6px，所以看起来"浮在按钮上半截"。
**修法**：锁体 `rect(-6,-8,12,10)` + 锁梁 `rect(-4,2,8,6)`，整体落在 **-8..8** 居中。
另：商店描述文本宽度 168 → 156，避免长描述右端压到价格 chip。

### 4.2 精英 / BOSS 改「身体泛光」，去掉地面圈 ✅
**做法**：删掉 `addGroundRing()`（贴地椭圆环），改由 `setBodyGlow()` 打开两层同帧放大副本：
内层 1.22×（亮色、alpha 235）+ 外层 1.46×（暗色、alpha 120~130），垫在身体**后面**，随时间 ±5% 呼吸。
精英 = 绿 #78FF8C，BOSS = 红 #FF6050；BOSS 头顶「BOSS」标牌保留。

**顺带查出一个存在很久的 bug**：`_glow/_glow2/_outline` 挂在**容器节点**上，
而 `FrameAnim` 挂在 **body 子节点**上，`apply()` 只查 `this.node` → 这三层永远拿不到 spriteFrame，
**光晕/描边其实一直没渲染**（这正是 M59 当初要补地面圈的原因）。
已在 `FrameAnim.apply()` 里同时向上找一层父节点修掉，`_glow/_glow2` 现在会跟着动画换帧。

> 注：`_outline` 描边层按用户"只要泛光"的要求**没有启用**（它会给所有单位加一圈 1.14× 黑剪影，
> 属于全局观感变更，等确认再开）。

### 4.3 黑科技「槽位满」不再置灰 ✅
**真因**：`GameRoot` 传给安装屏的 `compatible()` 里带了 `sk.mods.length < MAX_SLOTS`，
槽位满了就返回 false → 整行 `UIOpacity 110` 压暗，玩家读成"这个技能不能装"。
**修法**：
1. `compatible()` 改用 `canInstall().why`：**"需替换槽位"算可用**（点槽位会替换掉那一格）；
2. 安装屏区分三种状态：真不兼容 → 压暗；槽位满但兼容 → **金色框 + 「Lv.N · 满」**（不压暗）；
3. 顶部提示改成「已选中「X」→ 点槽位：空槽=装上，占用=替换（满槽也能换）」。

---

## 5. 本轮复测

| 项 | 结果 |
|---|---|
| web-mobile 构建 | **build success in 13565**（14:54 之后再构建一次同样 success） |
| 三个视口截图 | 360×640 / 390×844 / 412×915 各 14 屏重新截（新增 `04b-elite-boss`） |
| 页面错误 | 每次截图脚本都监听 `pageerror/console.error`，全部 `none` |
| 精英/BOSS 泛光 | 运行时探针：`glowFrame=true / glow2Frame=true / color=(120,255,140,235)` ✅ |
| 商店锁 | 截图复核：锁体+锁梁在 32×32 按钮内居中 ✅ |
| 黑科技满槽 | 截图复核：火球行金色框 + 「Lv.1 · 满」，未压暗，槽位可点 ✅ |

---

## 6. 2026-10-28 卡死 / "玩家阵亡" 提示排查

### 6.1 先给结论

| 问题 | 结论 |
|---|---|
| 是不是内存泄漏？ | **不是**。4 轮长跑（200s 起，最高 218 只同屏）实测：**JS 堆稳定在 51~117 MB 不涨**，场景节点数只随场上敌人数量涨落（敌人清完立刻掉回去），FPS 54~60，无异常日志。 |
| 「玩家阵亡」提示怎么回事？ | 那行日志 = `[Battle] 玩家阵亡`，**只在 `rs.stats.hp <= 0` 时打印一次**。正常对局里它确实代表 HP 归零（实测 hp=-3 时打印）。真正的问题是：**同一帧/重入时它可能被重复触发**（长跑日志里连刷过），已改成**每局只触发一次**。 |
| 页面卡死是什么？ | 复现到的唯一"停住"状态是：**`battle.paused = true` 但没有任何弹窗**（玩家看不到可点的东西 → 观感就是卡死）。成因只可能是某个界面构建中途抛异常，或者弹窗被销毁却没恢复暂停。已按"绝不留下这种状态"修掉。 |

### 6.2 这轮新增的防御（三条）

1. **卡死看门狗**（`GameRoot.watchdog`）：战斗/商店阶段若连续 **2 秒** 处于
   「暂停 + 没有任何弹窗 + 仍在运行」，自动恢复（商店页则直接进下一波），并打印
   `[GameRoot] 看门狗：phase=battle 被暂停但没有弹窗 → 自动恢复`。
   *实测：人为把 `paused` 置 true 且不开弹窗 → 3.2s 后自动恢复；200s 正常对局里看门狗触发 **0 次**（没有误伤）。*
2. **界面构建 try/catch**：升级三选一 / 结算 / 安装屏 / 商店四处的构建都包了异常处理，
   失败时打印 `[UI] xxx 构建失败` 并自动恢复（跳过本次升级 / 回主菜单 / 直接下一波），
   不会再出现"面板没建出来但战斗被暂停"。
3. **结算只触发一次**：`onDead / onClear` 加了 `endShown` 闸门，
   重复调用不会重复弹结算、也不会重复刷「玩家阵亡」。
   *实测：连调两次 `onDead()`，阵亡日志仍是 1 条，phase 仍是 result。*

### 6.3 复现与观测方法（给下一次排查用）

```text
控制台出现这些行就说明命中了对应路径：
[UI] xxx 构建失败（已自动恢复）      ← 某个面板构建抛异常（已兜底）
[GameRoot] 看门狗：... → 自动恢复    ← 出现了"暂停但没有弹窗"的状态（已兜底）
[Battle] 玩家阵亡                    ← 本局第一次 HP 归零（现在每局只会有一条）
```

### 6.4 一条容易被误判的干扰项

排查期间我在**编辑器预览（7456）**上反复改代码并重建了十余次。
Cocos 编辑器一旦检测到脚本变化会**重新编译并热重载场景**，正在跑的对局会直接停住、
只剩最后一帧，控制台还保留着之前的日志（包括「玩家阵亡」）——
这跟"游戏自己卡死"的表现几乎一样。所以：

- 要**联机试玩**请用构建产物 **http://127.0.0.1:8123/**（不随改代码刷新）；
- 用 7456 时，只要我改过代码，**刷新一次页面**再玩即可。

## 7. 未完成 / 未验证

1. **微信真机安全区未实测**：`Safe.ts` 会读 `view.getSafeAreaRect()`，但浏览器里该 API 返回全屏，
   所以"刘海避让"这条只有常量兜底（顶 28 / 底 10 设计像素）在起作用。**需要在真机或微信开发者工具里确认数值**。
2. **像素字体的最终观感未采纳**：本次保留系统字体（理由见 manifest §6）。若要求"全中文像素字"，
   需要先把整套字号阶梯改成 12 的倍数——属于规格变更，未在本次做。
3. **Spritesheet 里的图标/箭头未使用**：本作已有统一的 32×32 图标体系，混入会破坏一致性（已在 manifest 记录）。
4. **商店在超长屏上仍有约 100~150 设计像素的留白**（货架与"已有道具"之间）：已用行高自适应压缩，
   但没有做"详情面板"式的填充（那需要新增交互，按规则不加）。
5. **静态截图不覆盖动画**：按钮按下态、卡片按压缩放在代码里，但截图是静态的，动画本身未逐帧验证。

---

## 8. 下一步建议

- 用微信开发者工具 / 真机跑一次 `build/wechatgame`，把 `Safe.ts` 的实际上下内边距打印出来，校准常量。
- 若要继续打磨：把"商店详情面板"和"图鉴"作为**新功能**单独立项（需要玩法侧先有数据），不要混在 UI 专项里。
- UI 回归可固定用这次的三档视口 + 12 屏脚本（`.tmp/ui_task/shoot_final.cjs`，可按 TAG/VW/VH 参数化）。
