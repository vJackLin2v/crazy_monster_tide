# 素材索引与检索（给 Agent 用）

> **解决的问题**：Agent 挑不出图标。
> H 盘 **13 个素材位置、39,688 条素材**（2026-10-20 全盘普查后从 18,742 扩到 39,688，见 [`hdrive_inventory.md`](hdrive_inventory.md)），文件名中英混杂，大量 `relic-001` 这类无意义编号；
> M25 已经证明「按文件名猜画面」会错（`sh-pierce` 实际是红色靶心）。
>
> **方案**：脚本把素材整理成索引（尺寸/透明度/主色/重复/授权），
> 视觉模型只补「文件名看不出内容」的那一小撮（65 个 relic）；
> 查询用中英同义词，返回 **路径 + 画面描述 + 授权状态**。

---

## 1. 产物

| 文件 | 内容 | 大小 |
|---|---|---|
| `assets_index/index.jsonl` | 每行一条素材（**39,688 行**） | 17.7 MB |
| `assets_index/descriptions.json` | 视觉描述（323 条：relic 65 + 池子 61 + 在用图标 26 + 同 sha1 副本） | 60 KB |
| `assets_index/vision_relic.json` / `vision_pool.json` / `vision_used.json` | 三批描述的源文件（可手改） | 30 KB |
| `assets_index/blocklist.json` | 赌博语义黑名单（50 条：骰子/扑克/老虎机/赌徒） | 4 KB |
| `assets_index/summary.json` | 按类别/来源/授权的统计 | 1 KB |
| `assets_index/sheets/*.png` | 带编号对照页（视觉复核用） | 可重建 |
| `assets_index/vision_relic.json` | 65 条 relic 描述的源文件（可手改） | 12 KB |
| `tools/assets/asset_index.py` | 扫描 / 检索 / 对照页 / 取用 / 改造 | — |
| [`docs/assets/icon_semantic_audit.md`](icon_semantic_audit.md) | 70 道具 + 18 模块的图标语义核对结论 | — |

## 2. 命令

```bash
# 中文/英文检索（自动把「冰」扩成 ice/frost/chill…）
python tools/assets/asset_index.py search "冰 技能" --limit 8
python tools/assets/asset_index.py search "药水" --cat icon --size 32
python tools/assets/asset_index.py search "僵尸 单位" --json      # 给程序/AI 读
python tools/assets/asset_index.py search "点击 音效" --limit 5
python tools/assets/asset_index.py search "骰子" --risk            # 默认跳过黑名单；--risk 才显示

# 取用（复制 + 打印授权，不自动改文档）
python tools/assets/asset_index.py pick "project:icons/relic-025.png" --dest cocos/assets/resources/art/icons/item-potion.png

# 生成对照页（8 列，每格 72px，格内标 #序号）
python tools/assets/asset_index.py sheets --query "火焰" --limit 24
python tools/assets/asset_index.py sheets --pending --limit 64      # 文件名看不出内容的图标

# 把视觉描述并入索引（{id: {desc, tags}}）
python tools/assets/asset_index.py describe --file assets_index/vision_relic.json

# 改造现有素材：色相旋转 / 限色板（演示用，非生产）
python tools/assets/asset_index.py recolor cocos/assets/resources/art/icons/skill-frost_ray.png \
    --out .tmp/frost_fire.png --hue 150

# 重建索引（约 150 秒；改 ROOTS 后跑）
python tools/assets/asset_index.py scan
```

`search` 的类别提示词（图标 / 单位 / 怪物 / 背景 / 界面 / 音效 / 特效 / 立绘）会自动加权，不需要记 `--cat`。

## 3. 字段与授权

一行索引的字段：

```json
{"id":"project:icons/relic-041.png", "root":"project", "cat":"icon",
 "path":"H:\\...\\relic-041.png", "w":32, "h":32, "alpha":0.31,
 "palette":["#e8e0d0","#1a1a1a"], "sha1":"...", "dup_of":"...",
 "license":"user-approved", "license_note":"D-26 用户批准；上架前需替换",
 "desc":"白色骰子（⚠ 赌博语义，慎用）", "tags":["骰子","随机","白色","风险"]}
```

| `license` | 含义 | 能不能进生产 |
|---|---|---|
| `blocked` | SlotBound 解包（kit `internal/**`） | ❌ 不能 |
| `user-approved` | 项目内 icons/units，D-26 批准 | ⚠️ 能跑，**上架前必须换** |
| `ok-attribution` | 项目 VFX（多数 CC0，SF 需署名） | ✅ 补署名即可 |
| `attribution` | GameIcons CC BY 3.0 | ✅ 需按作者署名 |
| `unverified` | 素材工坊各池，未逐包核验 | ⚠️ 用前查 `asset_license.md` |

> 索引只做**标注**，不改变 Asset Gate 结论。

## 4. 覆盖范围

| 来源 | 行数 | 说明 |
|---|---:|---|
| project | 418 | 24 单位 / 268 图标 / 91 VFX 组 / 35 音频 |
| pool-icons | 6,677 | 技能、物品、状态、行囊守卫 324、GameIcons 4,251 SVG |
| pool-units | 2,592 组 | 按"单位/动画"聚合，不逐帧刷屏 |
| pool-ui | 3,427 | HealTD 图集、slotBound 预览等 |
| pool-items | 1,804 | 0x72 地牢、Shikashi 等 |
| pool-bg | 822 | 视差背景 |
| pool-vfx | 436 组 | Magma、Sephira、DCSS 等 |
| pool-audio | 316 | Kenney / slotBound 音效 |
| kit | 2,250 | 母本 approved + internal（含 420 blocked） |

## 5. 维护

1. **加池子**：改 `tools/assets/asset_index.py` 的 `ROOTS`，重跑 `scan`。
2. **加语义**：对文件名看不出内容的组，先 `sheets --query ...` 出对照页，看图写
   `{"id": {"desc": "...", "tags": [...]}}`，再 `describe --file`。
3. **改了索引字段**：`search_rows` 是唯一评分入口，别在别处另写一套。
4. **不要**把 `assets_index/` 当授权依据；它只是路标，授权以 `asset_license.md` 为准。

## 6. 已验证（真实输出摘要）

| 查询 | 首位结果 |
|---|---|
| `冰 技能` | `project:icons/skill-ice_spear.png`、`skill-frost_ray.png` |
| `药水` | `relic-042`（绿色药水瓶）、`relic-025`（紫绿药水瓶） |
| `骰子` | `relic-041`（白色骰子，⚠ 赌博语义） |
| `骷髅 图标` | `pool-ui/.../icon_skull.png`（16/32/48 三档） |
| `点击 音效` | `pool-audio/.../ui_click.wav` |
| `僵尸 单位` | `Kenney_TopDownShooter/Zombie 1`（4 帧） |
| `火焰 特效` | `VFX_Free_Pack/Effect_Magma`（30 帧） |
| `王冠` | `relic-060`（金色王冠） |

**顺带发现**：`relic-041` 是骰子图标 —— 项目红线 §11.1 禁止赌博语义。
已建立 `blocklist.json`（50 条：骰子 / 扑克 / 老虎机 / 赌徒），`search` **默认跳过**，
加 `--risk` 才会显示并标 `⚠风险`。全库扫描结论见下节。

### 6.1 抽查：文件名不可信（39 个 shortsicons）

把 `icons__imprinticons__shortsicons__*` 拼成对照页逐格核对，至少 3 个明显对不上：

| 文件名 | 画面实际是 |
|---|---|
| `sh-pierce` | 红白靶心（与 M25 记录一致） |
| `sh-enlarge` | 深色方块 + 红眼 + 两侧凸起（不是"放大"箭头） |
| `sh-golem` | 橙色铁砧 + 小十字（不是石头人） |
| `sh-mad` | 红色十字（不是愤怒脸） |

**结论**：配图标前先 `sheets` 看一眼，再按 `desc/tags` 选；**不要按文件名直接配**。

### 6.2 赌博语义全库扫描（红线 §11.1）

扫完 18,742 条，确认 **50 条**命中并写入 `blocklist.json`：

| 来源 | 数量 | 例子 |
|---|---:|---|
| GameIcons 矢量 | 33 | `dice-six-faces-five.svg`、`poker-hand.svg`、`rolling-dices.svg` |
| Sephiria_Demo | 10 | `Dice`、`DiceSpawner`、`Poker`、`TreeIcon_Dice`、`HUD_Dice`、`Gambler` |
| slotBound 老虎机 UI | 4 | `老虎机构筑选择.png`、`老虎机背景-…png` |
| 项目内 | 3 | `relic-041.png`（骰子）及其 2 个同 sha1 副本 |

另外用 grep 查过 `data/*.ts` 的道具/模块文案：**没有**赌博措辞。
`search` 默认跳过黑名单，`--risk` 才显示。

> 误报已排除：`slotsplus`（宝石=槽位+）、`mousewheel`（滚轮）、`slotodds`（槽位概率）。

## 7. 已知限制（诚实版）

1. **只有 323 条视觉描述**（relic 65 + 池子 61 + 在用图标 26 + 同 sha1 副本）；其余 3,700+ 图标仍靠文件名/路径，M25 的教训说明仍要抽查。
2. **SVG 没有尺寸**（w/h=0），`--size` 会过滤掉；需要时先栅格化。
3. **图集不是单体**：Shikashi 的 `#1 - Transparent Icons.png` 是一整张图，索引里当一张图，不能直接当图标用。
4. **重复 367 条**：同一文件在多个池里；`search` 默认只留第一份，`--all` 可看全部。
5. **授权未核验 13,688 条**：素材工坊的包大多没有逐包许可文本。
6. **不能生成**：本工具只做整理、检索、色相/限色改造；没有"凭空画图"的能力。
7. **`sheets/` 会被重跑覆盖**：对照页只是中间产物，描述要落到 `descriptions.json` 才算数。

---

## 8. 成品目录 `catalog`（2026-10-20 新增）

`index.jsonl` 是全量（18,742 条，含大量 `unverified`）。Agent 实际动手时不该在这上面挑，
所以新增一层**只含授权可用**的成品目录：

| 文件 | 内容 |
|---|---|
| `assets_index/catalog.jsonl` | **4,652 条**：一条一个可用素材（重复 sha1/同名同尺寸已去重） |
| `assets_index/CATALOG.md` | 人读版：门槛说明 + 统计 + 查询命令 + 给 Agent 的 4 条规则 |
| `assets_index/catalog_summary.json` | 按类别/授权/网格契合度的计数 |

实测构成（`catalog` 子命令输出）：

| 类别 | 条目 | 来源与门槛 |
|---|---:|---|
| icon-svg | **4,259** | GameIcons（CC BY 3.0，需署名）+ `fit=vector`；两处副本已去重 |
| icon | 200 | 项目内 32×32（`gate=replace-before-launch`，D-26：上线前要换） |
| vfx | 91 | 特效组件，`gate=ok`（多为 CC0） |
| unit | 102 | 项目 24 + **CC0 包（Kenney / Sunny Land 等）78** |

> **注意**：`ui` / `item` / `bg` 池在 catalog 里是 **0 条**——不是没有（3,859 + 1,804 + 867 个文件），
> 而是全部 `unverified`，没过授权门槛。这是当前最大的素材风险，不是工具问题。

命令：

```bash
python tools/assets/asset_index.py catalog                     # 重建（默认 8 个视觉类别）
python tools/assets/asset_index.py catalog --cats icon,icon-svg
python tools/assets/asset_index.py catalog --include-pending   # 连 unverified 一起看（只做摸底，别直接上）
```

`fit` 语义：`native` 32/64 原生 · `vector` SVG 可任意栅格化 · `offgrid` 非整数倍尺寸 · `big` ≥96 需整数倍缩小。

> 已知限制第 2 条（SVG 没有尺寸）已在 catalog 里修掉：读 `viewBox` 后统一记为 `64×64 / fit=vector`；
> `index.jsonl` 本身仍是 w/h=0，`search --size` 依然会过滤掉 SVG。
