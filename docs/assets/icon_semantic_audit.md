# 图标语义核对（道具 70 + 模块 18）

> 方法：`IMap`（`data/IconMap.ts`）→ 图标文件 → `assets_index/descriptions.json` 里的画面描述，
> 逐条对照道具名 / 效果。**看的是画面，不是文件名。**
> 覆盖：70 个道具、18 个模块用到的 **63 个图标全部有画面描述**（本轮补齐 26 个）。
>
> 结论：**明显不符 21 处**（道具 17 + 模块 4），偏弱 15 处；其余匹配。

> **2026-10-20 已应用**：按本清单改了 `IconMap.ts` **28 处**（道具 14 + 模块 6 + 属性 7 + 巨龙之心 1，
> 避免与巨人之心撞图）。校验：`tsc.check 0 错` / `tsc.cc 0 错` / `tests 87 PASS 0 FAIL`；
> 27 项对照图见 `assets_index/sheets/remap-check.png`。
> **仍未改**：`area_s` 放大镜、`pickup_s/l` 吸铁石/磁力核心、`cdr_bolt` 雷暴核心 —— 库里没有语义合适的图标（⏸）。

---

## 1. 明显不符（建议换，待确认）

| 道具 | 效果 | 现图标 | 画面实际是 | 建议换成 |
|---|---|---|---|---|
| `area_s` 放大镜 | 范围 +8% | `sh-sizeup` | 人形 + 绿十字 | ⏸ 库内无放大镜，建议自绘 32px |
| `area_l` 广角符文 | 范围 +18% | `sh-enlarge` | 深色方块 + 红眼 | `relic-019` 卷轴 |
| `maxhp_l` 巨人之心 | 生命 +35 | `hp-up` | 灰金盾牌 | `relic-043` 肌肉手臂 |
| `speed_s` 轻羽靴 | 移速 +6% | `survive` | 暗红方框 | `relic-030` 紫色靴子 |
| `sizeMul_s` 巨兽骨 | 弹体体积 +10% | `sh-enlarge` | 深色方块 | `relic-032` 獠牙 / 角 |
| `sizeMul_l` 泰坦碎片 | 弹体体积 +22% | `sh-earthquake` | 棕色地裂 | `relic-034` 银锭 / 矿石 |
| `pickup_s` 吸铁石 | 拾取 +25% | `ui-essence` | 蓝水晶碎片 | ⏸ 无磁铁图标，建议自绘 |
| `pickup_l` 磁力核心 | 拾取 +55% | `ui-essence` | 蓝水晶碎片 | ⏸ 同上（且两件共用一图） |
| `expGain_s` 智慧卷轴 | 经验 +12% | `skillmastery` | 沙漏 / 框架 | `relic-056` 绿色书 |
| `expGain_l` 贤者之石 | 经验 +28% | `sh-meteor` | 橙红流星 | `relic-014` 紫色晶体 |
| `cdr_s` 齿轮 | 冷却 -5% | `up-reroll` | 米色交叉纸带 | `relic-040` 灰色齿轮 |
| `knockback_l` 巨力腰带 | 击退 +14 | `berserk` | 火焰骷髅 | `relic-004` 钉刺铁球 |
| `summonPower_s` 图腾石 | 召唤 +15% | `sh-golem` | 橙色铁砧 | `relic-015` 金色神像 |
| `t_phys` 锋锐原石 | 物理伤害 +25% | `sh-swordup` | 人形 + 绿加号 | `relic-044` 灰色石块 |
| `prism` 棱镜 | 全标签 +8% | `skillmastery` | 沙漏 / 框架 | `relic-010` 蓝色宝石 |
| `slayer` 屠魔者 | 精英伤害 +25% | `sh-swordup` | 人形 + 绿加号 | `relic-011` 金色弯刃 |
| `totem` 图腾之心 | 召唤 +40% | `sh-golem` | 橙色铁砧 | `relic-027` 橙绿护符 |
| `cdr_bolt` 雷暴核心 | 雷冷却 -15% | `sh-meteor` | 橙红流星 | ⏸ 与 `thunder` 模块争图标，待定 |

> 这些 `relic-*` 目前在 `IconMap` 里**一个都没用**（只有 `power_l` 用了 `relic-007`），
> 换过去不会产生重复。

## 2. 偏弱（能用，但语义一般）

| 道具 | 现图标 | 画面 | 问题 |
|---|---|---|---|
| `bounce_l` 回音石 | `sh-multihits` | 蓝色链状闪电 | "弹射"更像链状，勉强 |
| `count_s` 分裂核心 | `sh-multihit` | 黄色闪电 | 分裂 ≠ 闪电 |
| `t_bolt` 雷神之锤 | `sk-overload` | 放射爆裂 | 不是锤 |
| `t_arcane` 奥术宝石 | `sk-arcanecore` | 深色圆核 | 是"核"不是"宝石" |
| `t_nature` 自然之心 | `sk-healingsanct` | 灰色小教堂 | 自然 ≠ 教堂 |
| `shadow` 迅捷之影 | `sh-shadowclone` | 米色圆环 | 像光环 |
| `rage` 狂战之怒 | `sh-angry` | 绷带脸 | 勉强算"怒" |
| `heal2` 治疗药水 | `sh-heart` | 红心 | 是心不是药水（`relic-025/042` 有药水瓶） |
| `armor_s` 铁胸甲 | `sh-shield` | 盾 | 盾可代甲 |
| `invuln_s` 龟甲片 | `sh-shield` | 盾 | 与铁胸甲同图 |

## 3. 模块（18）

| 模块 | 现图标 | 画面 | 判定 |
|---|---|---|---|
| `giant` 巨大 | `sh-enlarge` | 深色方块 | ❌ 建议 `sk-mountain`（山） |
| `echo` 回响 | `sk-mountain` | 山峰 | ❌ 建议 `sh-diffusion`（螺旋） |
| `thunder` 雷鸣 | `sh-meteor` | 流星 | ❌ 建议 `sh-multihit`（黄色闪电） |
| `thornmail` 荆棘 | `sk-berserkaxe` | 战斧 | ❌ 建议 `relic-004`（钉刺球） |
| `split` 分裂 | `sh-multihit` | 黄色闪电 | 🟡 勉强 |
| `bounce` 反弹 | `sh-diffusion` | 螺旋 | 🟡 勉强 |
| `vamp` 吸血 | `sk-lifesap` | 叶片 | 🟡 叶片 = 吸取生命，可接受 |
| `chain` 连锁 | `sk-overload` | 放射爆裂 | 🟡 建议 `sh-multihits`（链状闪电） |
| `overload` 超载 | `sk-voltsaw` | 锯盘 | 🟡 可接受（"电锯"式过载） |

其余 9 个模块（多重/扇射/穿透/环绕/急速/灼烧/冰缓/狙击/收割）匹配。

## 4. 怎么改（确认后我一次改完）

`cocos/assets/scripts/data/IconMap.ts` 里每项一行：

```ts
area_l: 'relic-019.png',     // 原 sh-enlarge.png
maxhp_l: 'relic-043.png',    // 原 hp-up.png
speed_s: 'relic-030.png',    // 原 survive.png
...
```

改完跑：

```bash
node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json
node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.cc.json
node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts
```

## 5. 复核命令

```bash
python tools/assets/asset_index.py search "卷轴" --cat icon --size 32
python tools/assets/asset_index.py search "靴子" --cat icon --size 32
python tools/assets/asset_index.py search "齿轮" --cat icon --size 32
python tools/assets/asset_index.py sheets --query "齿轮" --limit 8   # 出对照页肉眼复核
```

> 图标画面全部来自实图描述（323 条）；`relic-041` 骰子已进黑名单，不参与分配。
