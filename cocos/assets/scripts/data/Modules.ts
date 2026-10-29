import type { ModuleDef } from './Types';

/** 18 个行为模块（docs/systems/behavior_modules.md；需求 §10 目标约 18）
 *  核心规则：可重复安装；模块自己声明叠加方式与上限；兼容性由标签决定。 */
export const MODULES: Record<string, ModuleDef> = {
  multi:     { name: '加量', icon: '≡', stack: 'additive', max: 4, requires: ['projectile'],               desc: '一次开火多打出 1 发，全额伤害、同方向' },
  fan:       { name: '扇射', icon: '⋔', stack: 'additive', max: 3, requires: ['projectile'],               desc: '额外散开 2 枚小子弹（55% 伤害、射程短）；每多 1 份 +2 枚' },
  split:     { name: '裂开', icon: '⋉', stack: 'additive', max: 3, requires: ['projectile'],               desc: '命中后炸出小子弹：1 份 2 枚、2 份 3 枚、3 份 4 枚' },
  bounce:    { name: '反弹', icon: '↺', stack: 'additive', max: 3, requires: ['projectile'],               desc: '命中后转向另一只继续飞（弹体不消失）' },
  pierce:    { name: '穿透', icon: '⇢', stack: 'additive', max: 3, requires: ['projectile'],               desc: '可额外穿透 +1 个目标' },
  orbit:     { name: '转圈圈', icon: '◌', stack: 'additive', max: 3, requires: ['projectile'],               desc: '多 1 枚绕着角色转的子弹' },
  giant:     { name: '巨大', icon: '⬤', stack: 'additive', max: 3, requires: ['projectile','area','pulse','chain'], desc: '体积/范围 +30%' },
  rapid:     { name: '起飞', icon: '»', stack: 'tier',     max: 3, requires: ['projectile','pulse','chain','area'], desc: '技能冷却 -12%（可叠加）' },
  echo:      { name: '复读机', icon: '↻', stack: 'tier',     max: 3, requires: ['area','pulse','chain'],      desc: '施放后 0.4s 再放一次（60% 伤害）；每份 +1 次重放' },
  burn:      { name: '上火', icon: '✹', stack: 'tier',     max: 3, requires: ['fire','lightning','holy'],  desc: '命中挂灼烧：每 0.5s 掉 10% 伤害、持续 2s；每份 +10% 且 +0.6s' },
  frost:     { name: '冷静', icon: '✽', stack: 'tier',     max: 3, requires: ['ice'],                      desc: '命中减速 35%、1.2s；每份 +10% 减速、+0.4s' },
  vamp:      { name: '吸血', icon: '♥', stack: 'unique',   max: 3, requires: ['physical','poison'],        desc: '伤害的 4% 回复自身生命（合成为 Ⅱ 后约 6.4%，低于两份普通）' },
  chain:     { name: '传染', icon: '⛓', stack: 'tier',     max: 3, requires: ['projectile','chain'],       desc: '命中后跳到附近另一只身上（不再穿过去）；每份 +1 跳' },
  snipe:     { name: '点名', icon: '⌖', stack: 'tier',     max: 3, requires: ['projectile'],               desc: '弹速 +40%，伤害 +15%（每份叠乘）' },
  harvest:   { name: '割韭菜', icon: '✂', stack: 'unique',   max: 3, requires: ['physical','fire','poison'],  desc: '每次击杀回复 1 点生命（Ⅱ 约 1.6 点）' },
  thunder:   { name: '渡劫', icon: '⚡', stack: 'tier',     max: 3, requires: ['lightning','arcane','holy'], desc: '命中时 15%/份 概率落雷，对落点范围造成 50% 伤害' },
  thornmail: { name: '刺猬', icon: '✜', stack: 'unique',   max: 3, requires: ['nature','physical'],        desc: '被咬时反弹 6 点伤害（Ⅱ 约 9.6 点）' },
  overload:  { name: '超载', icon: '⚠', stack: 'tier',     max: 3, requires: ['projectile','area','pulse','chain'], desc: '伤害 +25%、范围 -10%（每份叠乘）' },
};

export const MODULE_IDS = Object.keys(MODULES);

/**
 * 强化模块的"效果折算"：**越高级收益越低**（用户 2026-10-29 定则）。
 *
 * 三个概念要分清：
 *   · 占位/合成计数 = `modPower()`：Ⅱ 仍算 **2 份**（占 1 槽、用于上限与合成判定）
 *   · 实际效果     = `modEffect()`：Ⅱ 只给 **1.6 份**效果（2 × 0.8）
 *   · 整数型模块（子弹数/跳数）无法出半份，因此它们的"递减"体现在
 *     「3 份普通 → 合成后 2 份」这一步（本来就是 3 → 2）
 *
 * 结果：同投入下 Ⅱ 永远比"三份普通"弱，但省 2 个槽 —— 这才是合成的取舍。
 */
export const TIER2_EFFECT = 1.6;

/** 该模块提供几"份"**实际效果**（普通 1，强化 1.6） */
export function modEffect(id: string): number {
  return id.endsWith('_2') ? TIER2_EFFECT : 1;
}

/**
 * 黑科技的**数值一句话**（M56）：升级卡片第二行用。
 * 必须与 SkillCalc / Battle 里的实际系数一致（tests/run.ts 有断言防漂移）。
 */
export const MODULE_NUMS: Record<string, string> = {
  multi:     '+1 发 · 全额伤害',
  fan:       '+2 发 · 每发 55% 伤害',
  split:     '命中后再炸 2 枚子弹',
  bounce:    '+1 次转向弹射',
  pierce:    '穿透 +1 个目标',
  orbit:     '+1 枚环绕弹',
  giant:     '体积 / 范围 +30%',
  rapid:     '冷却 -12%',
  echo:      '0.4s 后追加 60% 伤害',
  burn:      '命中附加灼烧 2s',
  frost:     '减速 35% · 1.2s',
  vamp:      '伤害的 6% 回血',
  chain:     '跳 1 次 · 70% 伤害',
  snipe:     '弹速 +40% · 伤害 +15%',
  harvest:   '击杀回复 1 HP',
  thunder:   '15% 概率落雷',
  thornmail: '被咬时反伤 8',
  overload:  '伤害 +25% · 范围 -10%',
};

/**
 * 黑科技的**运行时落点**清单（M50）。
 *
 * 为什么要这张表：M49 排查发现 bounce / chain / split / echo / thornmail 这 5 个模块
 * 数据表里写得好好的，但代码里**从来没有被用过** —— 玩家装了等于没装。
 * 这张表 + `tests/run.ts` 的断言保证：每个模块都必须至少在某一层真正生效。
 *
 *   calc   = SkillCalc.calcSkill 结算进 SkillRuntime（数值层）
 *   onhit  = Battle.updateBullets 命中时生效（弹体行为）
 *   cast   = Battle.fireSkill 施放时生效（如复读机延迟重放）
 *   kill   = Battle.killEnemy 击杀时生效（割韭菜）
 *   player = Battle.updateEnemies 玩家受击时生效（刺猬反伤）
 */
export type ModuleHook = 'calc' | 'onhit' | 'cast' | 'kill' | 'player';

export const MODULE_HOOKS: Record<string, ModuleHook[]> = {
  multi: ['calc'],
  fan: ['calc'],
  split: ['onhit'],
  bounce: ['onhit'],
  pierce: ['onhit'],
  orbit: ['calc'],
  giant: ['calc'],
  rapid: ['calc'],
  echo: ['cast'],
  burn: ['onhit'],
  frost: ['onhit'],
  vamp: ['onhit'],
  chain: ['onhit'],
  snipe: ['calc'],
  harvest: ['kill'],
  thunder: ['onhit'],
  thornmail: ['player'],
  overload: ['calc'],
};

// ───────────── 合成（M32）─────────────
// 规则（用户 2026-10-20 定）：**3 个同名模块 → 1 个强化模块**，强化版 = 2 份效果、只占 1 个槽位，
// 且不能再合成（上限 ×2）。强化模块用 `<基础id>_2` 作 id，只存在于"合成产物"里，
// 不进奖励池 / 商店池（那些地方只认 MODULES 的 18 个 id）。
export const MERGE_COST = 3;

export const MERGED_MODULES: Record<string, ModuleDef> = {};
for (const id of MODULE_IDS) {
  const m = MODULES[id];
  MERGED_MODULES[id + '_2'] = {
    ...m,
    name: m.name,               // 等级由 UI 用「Ⅱ」后缀表示，名字本身不带
    desc: m.desc,
    stack: 'unique',
    max: 1,
  };
}

/** 基础 id（`multi_2` → `multi`） */
export function baseOf(id: string): string {
  return id.endsWith('_2') ? id.slice(0, -2) : id;
}
export function isMerged(id: string): boolean { return id.endsWith('_2'); }
/** 一次模块条目算几份效果：普通 1，强化 2 */
export function modPower(id: string): number { return isMerged(id) ? 2 : 1; }
/** 统一定义查询：基础表 + 强化表 */
export function moduleDef(id: string): ModuleDef | undefined {
  return MODULES[id] ?? MERGED_MODULES[id];
}
