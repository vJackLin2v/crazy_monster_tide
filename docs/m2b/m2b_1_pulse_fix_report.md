# M2-B.1 pulse 技能命中修复报告

> 基线：HEAD `0818ae9`（530 PASS）  
> 修复后：536 PASS / 0 FAIL；tsc check/ui-check = 0  
> 微信构建：3.14MB / 10.97MB，index.js 333,472 B（2026-11-01 14:50:45）  
> 本轮只修 pulse 命中时序/去重，不修改任何数值。

## 1. 修改前的实际执行链路

1. `Battle.fireSkill` 的 pulse 分支（技能类型 `pulse`）：
   - `this.spawnArea(px, py, rt.size + 26, rt.dmg, 0.45, 'pulse', art.aoe, rt)`
2. `Battle.spawnArea`：
   - pulse 初始 `r = 0`，`maxR = rt.size + 26`，`life = 0.45`；
   - 推入 `this.areas`。
3. `Battle.updateAreas`：
   - 每帧 `a.t += dt`；
   - `a.r = a.maxR * min(1, a.t/a.life)`；
   - 第一次更新时 `a.r` 从 0 开始，通常只有 1~3px；
   - `if (!a.done)` 内遍历敌人，只有 `dist < a.r + e.r` 才命中；
   - 遍历完立即 `a.done = true`；
   - 之后半径继续扩散，但不再判定命中；
   - `compact` 在 `a.t >= a.life` 时移除节点。

**结果**：除非敌人在施放瞬间就贴在玩家身边（小于初始半径 + 敌人半径），pulse 永远不命中。

## 2. 根本原因

不是伤害、范围或冷却问题，而是**命中判定的时间窗错误**：

- pulse 的半径需要 0.45s 从 0 扩散到 maxR；
- 代码在半径≈0 的第一帧就结束全部命中判定；
- 扩散过程只保留视觉，伤害判定没有跟着波前推进。

run_001 的 `frostring`：41 次释放、0 命中、0 伤害，与该路径一致。

## 3. 修改的文件和函数

| 文件 | 修改 |
|---|---|
| `cocos/assets/scripts/game/PulseHit.ts` | 新增纯逻辑 `collectPulseHits` / `stepPulse`（波前判定、去重、收尾） |
| `cocos/assets/scripts/battle/Battle.ts` | `Area` 增加 `hit: Set<Enemy>`；`spawnArea` 初始化 pulse 的去重集合；`updateAreas` 改为逐帧调用 `stepPulse`，不再首帧 done |
| `cocos/tests/run.ts` | 新增 §29（6 条）覆盖 pulse 命中/去重/范围/生命周期 |
| `tools/ui/verify_m2b1_pulse.cjs` | 浏览器运行时验证实际伤害/范围/清理 |

**未修改**：`fireSkill` 的数值、`spawnArea` 的半径/生命周期、`resolveCharge`、其他区域逻辑。

## 4. 修改前后判定逻辑

### 修改前

```ts
a.r = a.maxR * Math.min(1, a.t / a.life);
if (!a.done) {
  for (const e of this.enemies) {
    if (!e.dead && dist < a.r + e.r) hitEnemy(...);
  }
  a.done = true;   // ← 首帧就结束
}
```

### 修改后

```ts
const wave = stepPulse(a, dt, this.enemies); // 推进 t、r，收集本帧命中
for (const e of wave.hits) hitEnemy(...);
if (wave.expired) a.done = true;
```

`stepPulse` 规则：

- 每帧按 `maxR * min(1, t/life)` 扩散；
- 只命中当前半径内、尚未命中的敌人（`Set<Enemy>`）；
- 生命结束时按 `maxR` 做一次收尾扫描；
- 命中仍用原有 `dist < r + e.r` 碰撞口径，不改变最大范围；
- 生命周期仍由 `a.t >= a.life` 的原有 `compact` 清理。

**设计口径**：保持原实现的“圆形扩张波前”判定，不改成一次性全范围，也不改成环形壳。

## 5. 新增测试及结果

§29 共 6 条：

1. 扩散初期半径未到：不命中；
2. 敌人位于扩散路径上：命中一次；
3. 同一 pulse 对同一敌人不重复命中；
4. 范围外敌人不会受伤；
5. 生命周期结束后 `expired=true`，hit 记录保留供清理；
6. 死亡目标不被命中。

**结果：536 PASS / 0 FAIL。**  
原有 530 条全部保留，未删除/弱化；新增 6 条，差异为 +6。

浏览器运行时（真实 Battle 路径，debug web build）：

```json
{"insideDamage":15,"outsideDamage":0,"areasAfter":0,"hits":1}
```

- 范围内敌人在 pulse 扩散后受到一次伤害（10 基础，暴击 15；命中计数 1）；
- 范围外敌人 0 伤害；
- 0.8s 后 area 已清理（areasAfter=0）。

## 6. 完整回归结果

- `tsc -p tsconfig.check.json`：EXIT=0
- `tsc -p tsconfig.ui-check.json`：EXIT=0
- `tsx tests/run.ts`：**536 PASS / 0 FAIL**
- 未修改旧测试断言

## 7. 微信小游戏构建

- 命令：`cmd /c "build-wechat.bat -nopause"`
- 结果：success
- 主包 / 总计：3.14MB / 10.97MB
- index.js：333,472 B（2026-11-01 14:50:45）
- 未做微信真机验证

## 8. 是否改变任何游戏数值

**否。**

- 基础伤害、冷却、最大范围、扩散时长、攻击频率均未改；
- 只改 pulse 命中判定时序与去重；
- 未改怪物/角色/黑科技/商店/回血/RNG。

## 9. 是否影响其他技能

- 只影响 pulse 类型：`shockwave`、`frostnova`、`thorn`、`frostring`；
- `charge_pulse` 是 charge 类型，走 `resolveCharge`，未修改；
- zone/area（毒雾、陨石区、乱杀区等）走 `else` 分支，未修改；
- 其他技能不受影响。

## 10. 尚未解决的问题

- 微信真机未验证；目前只有浏览器真实 Battle 路径 + 自动化测试。
- pulse 修复后 4 个技能从“几乎无效”变为正常，前期难度可能变化；这是行为修复，需后续单独观察，不与数值调整混合。
- 暴击使测试伤害为 15（基础 10）属正常随机；测试只断言“命中一次/范围外 0”，不依赖固定伤害值。
- rapid 文案、商店兼容、回血等其他 M2-B 问题未在本轮处理。
