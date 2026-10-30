# Difficulties 数据结构规格（difficulties_data_spec）

> 开发时先落这个文件；普通难度是唯一 base，其他档位用 Partial 覆盖。

    export type DifficultyId = "casual" | "normal" | "hard" | "nightmare" | "hell";

    export interface DifficultyConfig {
      id: DifficultyId;
      name: string;
      stars: 1 | 2 | 3 | 4 | 5;
      tagline: string;
      enemyHpMul: number;
      enemyDmgMul: number;
      spawnMul: number;          // 乘在刷怪间隔上：>1 更慢
      eliteChanceMul: number;
      bossHpMul: number;
      bossDmgMul: number;
      startHpMul: number;
      goldMul: number;
      expMul: number;
      shopPriceMul: number;
      shopPricePerWave: number;  // 地狱 0.02，其余 0
      rerollCostMul: number;
      healMul: number;
      healBudgetPerSecond: number | null;  // null = 不启用（普通难度）
      rules: DifficultyRule[];
      unlock: { type: "default" } | { type: "win"; difficulty: DifficultyId };
      rewards: { id: string; name: string; kind: "badge" | "achievement" | "codexFrame" }[];
    }

    export type DifficultyRule =
      | { kind: "noEliteUntilWave"; wave: number }
      | { kind: "lowHpHealBonus"; thresholdPct: number; mul: number }
      | { kind: "shopGuaranteeOffense"; count: number }
      | { kind: "eliteAffixFromWave"; wave: number; chance: number; affixes: string[] }
      | { kind: "eliteAlwaysAffixFromWave"; wave: number; count: number; affixes: string[] }
      | { kind: "noHealInShop" }
      | { kind: "rerollLimitPerWave"; count: number }
      | { kind: "bossSummon"; thresholds: number[]; count: number; maxAlive: number; minIntervalSec: number; warnSec: number; hpMul: number; dmgMul: number }
      | { kind: "lockCostPerLock"; gold: number }
      | { kind: "eliteGuaranteedWaves"; waves: number[] }
      | { kind: "bossEnrage"; thresholdPct: number; dmgMul: number; speedMul: number };

## 关键实现约定

1. DIFFICULTIES.normal 是唯一基准：所有倍率 = 1、rules = []，实现时不额外分支；
2. 其他难度用 Partial<DifficultyConfig> 覆盖 normal；
3. 运行时只读 balance()（全局）与 difficulty()（本局），不把倍率硬编码进 Battle；
4. rules[] 结构化存储：UI 详情面板直接遍历生成文案，避免 UI 文案与数值不同步。


## 精英生成：公式与优先级（v4 新增）

    概率 = min(1, 基础精英概率 x eliteChanceMul)

优先级（自上而下，先命中先返回）：

1. 该波被规则禁止生成精英（休闲第 1~3 波）→ 不生成；
2. 难度倍率调整后的概率判定；
3. 地狱指定波次（5/8/11/14/17/20）→ **至少 1 只**；若步骤 2 已生成则不补；
4. 词缀：困难 25% 概率 1 个；噩梦必带 1 个；地狱必带 2 个且**不重复**（从 affixes 中随机抽取，pool < count 时不重复补充）。

eliteAlwaysAffixFromWave.affixes 由数据配置提供（护盾 / 加速 / 分裂），Battle 不硬编码。
