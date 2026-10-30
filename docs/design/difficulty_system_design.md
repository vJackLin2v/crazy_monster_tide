# 难度系统设计 v3（difficulty_system_design）

> 依据 v2 审核意见修订：普通 = 唯一基准、回血统一公式、商店价格公式、刷怪口径、召唤状态机、精英生成、存档迁移、无尽徽章防重复。

## 1. 五档参数（初版测试值，可调）

| 参数 | 休闲 | 普通 | 困难 | 噩梦 | 地狱 |
|---|---:|---:|---:|---:|---:|
| 怪物 HP | 0.80 | 1.00 | 1.25 | 1.45 | 1.90 |
| 怪物伤害 | 0.80 | 1.00 | 1.15 | 1.35 | 1.55 |
| 刷怪间隔倍率 spawnMul | 1.15 | 1.00 | 0.92 | 0.85 | 0.78 |
| 精英概率 | 0.8 | 1.0 | 1.2 | 1.5 | 1.8 |
| BOSS HP / 伤害 | 0.9 / 0.9 | 1 / 1 | 1.2 / 1.1 | 1.45 / 1.25 | 1.7 / 1.4 |
| 初始生命 | 1.10 | 1.00 | 1.00 | 0.95 | 0.90 |
| 金币 | 1.20 | 1.00 | 0.92 | 0.85 | 0.78 |
| 经验 | 1.15 | 1.00 | 0.95 | 0.90 | 0.85 |
| 商店价格 | 0.90 | 1.00 | 1.10 | 1.22 | 1.35 |
| 刷新费用 | 0.90 | 1.00 | 1.15 | 1.30 | 1.50 |
| 回血倍率 healMul | 1.20 | 1.00 | 0.90 | 0.80 | 0.70 |
| 回血预算 HP/s | 8 | **null（不启用）** | 8 | 6 | 5 |

普通难度 = 当前版本的完整复刻：实现上把普通设为基准配置（不覆盖任何字段），其他难度只写与普通不同的字段。

## 2. 统一公式（开发必须按此实现）

### 刷怪（方案 A：倍率乘间隔）

    实际刷怪间隔 = 基础间隔 x spawnMul

即：休闲 0.62 x 1.15 更慢；地狱 0.62 x 0.78 更快。倍率 > 1 = 更慢。

### 回血（先算基础，再查预算，不重复削弱）

    基础回血 = 原始回血量 x healMul x 条件倍率（休闲低血额外 x1.2）
    实际回血 = min(基础回血, 剩余回血预算)
    预算每秒清零一次；**普通难度 healBudgetPerSecond = null，表示不启用该限制，保持原版本行为**

### 商店价格

    价格 = 基础价格 x shopPrice x (1 + 递增系数 x (wave - 1))
    递增系数：仅地狱 0.02（每波 +2%），其余 0；**封顶作用于"每波递增部分"，最多 +35%**
最终最高价 = 1.35（地狱基础价）x 1.35（增量封顶）= **1.8225 倍基础价**

已购买、已锁定的商品不受后续涨价影响（价格在生成时锁定）。

### 噩梦锁定费用

每次点击锁定扣 2 金币（不是每波一次）。金币不足时不能锁定。

## 3. 各档特色规则

### 休闲
- 第 1~3 波不生成精英；
- 玩家生命 < 30% 时回血再 x1.2（与 healMul 连乘，见公式）；
- 商店生成时必带 1 件 category = offense 的道具（按分类判断，不按名字）。

### 普通
- 不增加任何额外规则（精英词缀、刷新上限、锁定费用、回血预算全部沿用现有版本）。

### 困难
- 第 12 波起，精英有 25% 概率带 1 个词缀（护盾：额外 20% 生命）；
- 商店不生成治疗类道具；
- 每波刷新次数上限 3（普通无限）。

### 噩梦
- 第 8 波起精英必带 1 个词缀（护盾/加速/分裂 中随机，不重复）；
- BOSS 召唤状态机（见 §4）；
- 回血预算 6HP/s（金币已在参数表 x0.85，不再额外写 -15%）；
- 锁定每次 2 金币。

### 地狱
- 第 5/8/11/14/17/20 波保证至少 1 只精英：若该波原有逻辑已生成精英，则不额外补；
- 精英必带 2 个不同词缀（不能重复同一词缀）；
- BOSS 生命 < 30% 进入狂怒：伤害 +25%、移速 +15%（一次性，不叠加）；
- 商店价格每波 +2%（封顶 +35%）；
- 初始生命 x0.90、回血预算 5HP/s。

## 4. 噩梦 BOSS 召唤状态机

    状态字段：summon70Done, summon35Done, warningActive, warningEndAt, lastSummonAt, pendingSummonWaves

同一时刻只允许一个预警：
  若 warningActive 为 true，任何新召唤请求只增加 pendingSummonWaves，不启动第二个预警

    每次 BOSS 血量更新：
      若 hp% < 70 且 !summon70Done → 标记 summon70Done，请求召唤
      若 hp% < 35 且 !summon35Done → 标记 summon35Done，请求召唤

    请求召唤：
      若 now - lastSummonAt < 12s → pendingSummon = true（等待，不丢弃）
      否则 → 起 1.2s 预警 → 结算召唤

    每帧检查 pending：
      若 pendingSummonWaves > 0 且 !warningActive 且 now - lastSummonAt >= 12 → 起预警

    结算召唤：
      存活召唤物 = 当前场上召唤物数量
      可召唤数 = min(3, 6 - 存活召唤物)
      召唤 可召唤数 只（生命 = 普通怪 x0.7，伤害 = 普通怪 x0.8）
      lastSummonAt = now（**以实际召唤完成为准**，不是预警开始时刻），pendingSummonWaves -= 1

    BOSS 死亡 → warningActive = false、pendingSummonWaves = 0（取消所有未执行召唤）

每个阈值只触发一次；两次召唤间隔 >= 12s；同时 <= 6 只。

## 5. 解锁与存档迁移

| 难度 | 解锁 |
|---|---|
| 休闲 / 普通 | 默认 |
| 困难 | 历史 wins >= 1（迁移时补）或 普通通关 1 次 |
| 噩梦 | 困难通关 1 次 |
| 地狱 | 噩梦通关 1 次 |

迁移（只在字段缺失时执行，不覆盖已有值）：

    if (progress.difficulties == null) {
      const d = ["casual", "normal"];
      if (progress.wins >= 1) d.push("hard");
      progress.difficulties = d;
    }
    if (progress.selectedDifficulty == null) progress.selectedDifficulty = "normal";

区分两个字段：Progress.difficulties = 永久解锁列表；RunState.difficulty = 本局难度（不写回永久进度）。

## 6. 无尽模式

- 进入无尽保留本局难度，不可切换；
- 里程碑 30 / 40 / 50 波：每个难度每个里程碑只记录一次，只记录达到过的最高波次；
- 不计入 20 波通关次数；
- 不给任何局内数值奖励。


## 7. 存档字段最终约定（v5，唯一写法）

    interface Progress {
      selectedDifficulty: DifficultyId;
      difficulties: DifficultyId[];
    }

    interface RunState {
      difficulty: DifficultyId;
    }

规则：

1. 难度选择页只写 Progress.selectedDifficulty；解锁状态只写 Progress.difficulties；
2. 开始新局时 runState.difficulty = progress.selectedDifficulty；
3. 战斗 / 商店 / 结算 / 无尽只读 RunState.difficulty，且不可修改；
4. 除上述三个字段外，任何其他存档字段写法都已删除，不得再使用。


## 8. BOSS 召唤状态机（v5 定稿）

字段：

    summon70Done: boolean
    summon35Done: boolean
    warningActive: boolean
    warningEndAt: number
    lastSummonCompletedAt: number
    pendingSummonWaves: number   // 待执行的**召唤波次**数量，不是怪物数量

规则：

1. 每个血量阈值（<70%、<35%）**最多提交 1 个召唤请求**，每个请求 = 1 个波次；
2. 同一时刻只允许 1 个预警（warningActive）；有新请求时只让 pendingSummonWaves +1，不启动第二个预警；
3. 两次**实际召唤完成时刻**至少间隔 12 秒（lastSummonCompletedAt 在召唤执行完时更新，不是预警开始时）；
4. 执行召唤时：
      空位 = 6 - 当前存活召唤物数量
      本次召唤数量 = min(3, 空位)
     若空位 <= 0 → 该请求直接完成（pendingSummonWaves -1），**不永久挂起**；
5. BOSS 死亡：warningActive = false、pendingSummonWaves = 0（取消所有未执行请求）。


## 9. 普通难度 = 不介入原版本（v5 定稿）

普通难度**不是**"把所有倍率重新乘一遍 1.0"，而是**完全不介入**现有逻辑：

| 系统 | 普通难度行为 |
|---|---|
| 刷怪间隔 | 不重新计算，直接用原版本公式 |
| 怪物成长 | 不重复乘 1.0 |
| 商店价格 / 刷新 | 不应用任何倍率 |
| 回血 | 不进入新增预算系统（healBudgetPerSecond = null） |
| 精英生成 | 不增加额外随机判定 |
| 奖励池 / 掉落 | 不改变权重 |

实现建议（概念示意，实际用配置合并而不是到处散落 if）：

    const diff = runState.difficulty;
    if (diff !== "normal") applyDifficultyOverrides(diff);

即：普通走原分支，非普通才叠加覆盖项。
