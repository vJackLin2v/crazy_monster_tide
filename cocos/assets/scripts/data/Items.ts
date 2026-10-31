import type { ItemDef, CharStats } from './Types';
import { emptyStats } from '../game/Stats';

/**
 * 道具 —— **70 个**（需求 §10：50 普通 + 20 高级，现已补齐）
 *
 * 构成：
 *   · tier 1 × 50 = 24 个属性各 2 档（小/大）+ 2 个治疗
 *   · tier 2 × 20 = 标签加成（火/冰/雷/奥术/物理/毒/圣/自然）、冷却减免、多属性组合、特殊效果
 *
 * 规则：道具直接改写角色属性；高级道具主要由精英/BOSS 掉落。
 * ⚠️ 道具**全部唯一**（`RunState` 用 id 去重），所以数量 = 池子大小。
 */
export const ITEMS: Record<string, ItemDef> = {
  power_s: { name: '铁匠手套', icon: '⚔', tier: 1, desc: '攻击更疼一点', apply: (s: CharStats) => { s.power *= 1.08; } },
  power_l: { name: '战锤碎片', icon: '⚔', tier: 1, desc: '攻击明显更疼', apply: (s: CharStats) => { s.power *= 1.16; } },
  haste_s: { name: '疾风戒', icon: '»', tier: 1, desc: '出手更快一点', apply: (s: CharStats) => { s.haste *= 1.08; } },
  haste_l: { name: '迅捷护符', icon: '»', tier: 1, desc: '出手明显更快', apply: (s: CharStats) => { s.haste *= 1.16; } },
  area_s: { name: '放大镜', icon: '◎', tier: 1, desc: '技能范围更大', apply: (s: CharStats) => { s.area *= 1.08; } },
  area_l: { name: '广角符文', icon: '◎', tier: 1, desc: '技能范围大很多', apply: (s: CharStats) => { s.area *= 1.18; } },
  maxhp_s: { name: '生命护符', icon: '♥', tier: 1, desc: '血条变长一点', apply: (s: CharStats) => { s.maxhp += 15; } },
  maxhp_l: { name: '巨人之心', icon: '♥', tier: 1, desc: '血条长一截', apply: (s: CharStats) => { s.maxhp += 35; } },
  speed_s: { name: '轻羽靴', icon: '➤', tier: 1, desc: '跑得更快一点', apply: (s: CharStats) => { s.speed *= 1.06; } },
  speed_l: { name: '疾风长靴', icon: '➤', tier: 1, desc: '跑得明显更快', apply: (s: CharStats) => { s.speed *= 1.14; } },
  crit_s: { name: '鹰眼', icon: '✹', tier: 1, desc: '更容易打出暴击', apply: (s: CharStats) => { s.crit += 0.04; } },
  crit_l: { name: '猎手之瞳', icon: '✹', tier: 1, desc: '暴击更容易了', apply: (s: CharStats) => { s.crit += 0.09; } },
  critdmg_s: { name: '破甲锥', icon: '✦', tier: 1, desc: '暴击打得更疼', apply: (s: CharStats) => { s.critdmg += 0.15; } },
  critdmg_l: { name: '斩钢刃', icon: '✦', tier: 1, desc: '暴击特别疼', apply: (s: CharStats) => { s.critdmg += 0.35; } },
  projSpd_s: { name: '羽毛箭', icon: '⇢', tier: 1, desc: '子弹飞得更快', apply: (s: CharStats) => { s.projSpd *= 1.1; } },
  projSpd_l: { name: '追风矢', icon: '⇢', tier: 1, desc: '子弹快得离谱', apply: (s: CharStats) => { s.projSpd *= 1.22; } },
  pierce_s: { name: '穿甲尖', icon: '⇉', tier: 1, desc: '子弹多穿一个', apply: (s: CharStats) => { s.pierce += 1; } },
  pierce_l: { name: '破空矢', icon: '⇉', tier: 1, desc: '子弹多穿两个', apply: (s: CharStats) => { s.pierce += 2; } },
  bounce_s: { name: '弹跳石', icon: '↺', tier: 1, desc: '子弹多弹一次', apply: (s: CharStats) => { s.bounce += 1; } },
  bounce_l: { name: '回音石', icon: '↺', tier: 1, desc: '子弹多弹两次', apply: (s: CharStats) => { s.bounce += 2; } },
  count_s: { name: '分裂核心', icon: '≡', tier: 1, desc: '一次多打一发', apply: (s: CharStats) => { s.count += 1; } },
  count_l: { name: '三重镜', icon: '≡', tier: 1, desc: '多打一发，且额外那发更疼', apply: (s: CharStats) => { s.count += 1; s.extraProjDmg += 0.15; } },
  sizeMul_s: { name: '巨兽骨', icon: '⬤', tier: 1, desc: '子弹变大了', apply: (s: CharStats) => { s.sizeMul *= 1.1; } },
  sizeMul_l: { name: '大就是好', icon: '⬤', tier: 1, desc: '子弹特别大', apply: (s: CharStats) => { s.sizeMul *= 1.22; } },
  armor_s: { name: '铁胸甲', icon: '🛡', tier: 1, desc: '挨打掉血更少', apply: (s: CharStats) => { s.armor += 0.05; } },
  armor_l: { name: '龙鳞甲', icon: '🛡', tier: 1, desc: '挨打几乎不疼', apply: (s: CharStats) => { s.armor += 0.11; } },
  regen_s: { name: '苔藓苔', icon: '✚', tier: 1, desc: '慢慢自动回血', apply: (s: CharStats) => { s.regen += 0.3; } },
  regen_l: { name: '生命之泉', icon: '✚', tier: 1, desc: '自动回血更快', apply: (s: CharStats) => { s.regen += 0.7; } },
  invuln_s: { name: '龟甲片', icon: '⏱', tier: 1, desc: '挨打后无敌更久', apply: (s: CharStats) => { s.invuln += 0.1; } },
  invuln_l: { name: '时之沙', icon: '⏱', tier: 1, desc: '挨打后无敌很久', apply: (s: CharStats) => { s.invuln += 0.22; } },
  lifesteal_s: { name: '血牙', icon: '❖', tier: 1, desc: '攻击能回一点血', apply: (s: CharStats) => { s.lifesteal += 0.03; } },
  lifesteal_l: { name: '嗜血之刃', icon: '❖', tier: 1, desc: '攻击能回不少血', apply: (s: CharStats) => { s.lifesteal += 0.07; } },
  pickup_s: { name: '吸尘器', icon: '⌾', tier: 1, desc: '经验吸得更远', apply: (s: CharStats) => { s.pickup *= 1.25; } },
  pickup_l: { name: '吸铁石', icon: '⌾', tier: 1, desc: '经验吸得很远', apply: (s: CharStats) => { s.pickup *= 1.55; } },
  greed_s: { name: '金币袋', icon: '◆', tier: 1, desc: '金币掉得更多', apply: (s: CharStats) => { s.greed += 0.15; } },
  greed_l: { name: '贪婪硬币', icon: '◆', tier: 1, desc: '金币掉得很多', apply: (s: CharStats) => { s.greed += 0.35; } },
  expGain_s: { name: '智慧卷轴', icon: '★', tier: 1, desc: '经验涨得更快', apply: (s: CharStats) => { s.expGain += 0.12; } },
  expGain_l: { name: '贤者之石', icon: '★', tier: 1, desc: '经验涨得很快', apply: (s: CharStats) => { s.expGain += 0.28; } },
  killHeal_s: { name: '猎魂刀', icon: '✚', tier: 1, desc: '杀一个回点血', apply: (s: CharStats) => { s.killHeal += 0.5; } },
  killHeal_l: { name: '死神镰刀', icon: '✚', tier: 1, desc: '杀一个回不少血', apply: (s: CharStats) => { s.killHeal += 1.5; } },
  cdr_s: { name: '齿轮', icon: '◷', tier: 1, desc: '技能转得更快', apply: (s: CharStats) => { s.cdr += 0.05; } },
  cdr_l: { name: '时之轮', icon: '◷', tier: 1, desc: '技能转得很快', apply: (s: CharStats) => { s.cdr += 0.11; } },
  knockback_s: { name: '铁拳套', icon: '↦', tier: 1, desc: '把怪推得更远', apply: (s: CharStats) => { s.knockback += 6; } },
  knockback_l: { name: '巨力腰带', icon: '↦', tier: 1, desc: '把怪推飞', apply: (s: CharStats) => { s.knockback += 14; } },
  eliteDmg_s: { name: '斩魔刃', icon: '☠', tier: 1, desc: '打精英更疼', apply: (s: CharStats) => { s.eliteDmg += 0.1; } },
  eliteDmg_l: { name: '屠龙剑', icon: '☠', tier: 1, desc: '精英杀手', apply: (s: CharStats) => { s.eliteDmg += 0.25; } },
  aoe_s: { name: '熔火符', icon: '◎', tier: 1, desc: '范围技能更疼', apply: (s: CharStats) => { s.aoeDmg += 0.12; } },
  aoe_l: { name: '烈焰之核', icon: '◎', tier: 1, desc: '范围技能很疼', apply: (s: CharStats) => { s.aoeDmg += 0.28; } },
  heal1: { name: '急救包', icon: '💊', tier: 1, desc: '立刻回一口血', apply: (s: CharStats) => { s.hp = Math.min(s.maxhp, s.hp + 30); } },
  heal2: { name: '治疗药水', icon: '🧪', tier: 1, desc: '血直接回满', apply: (s: CharStats) => { s.hp = s.maxhp; } },
  t_fire: { name: '余烬核心', icon: '🔥', tier: 2, desc: '火系技能更疼', apply: (s: CharStats) => { s.tagBonus.fire = (s.tagBonus.fire ?? 0) + 0.25; } },
  t_ice: { name: '冰河之心', icon: '🧊', tier: 2, desc: '冰系技能更疼', apply: (s: CharStats) => { s.tagBonus.ice = (s.tagBonus.ice ?? 0) + 0.20; } },
  t_bolt: { name: '雷神之锤', icon: '⚡', tier: 2, desc: '雷系技能更疼', apply: (s: CharStats) => { s.tagBonus.lightning = (s.tagBonus.lightning ?? 0) + 0.25; } },
  t_arcane: { name: '奥术宝石', icon: '🔮', tier: 2, desc: '奥术技能更疼', apply: (s: CharStats) => { s.tagBonus.arcane = (s.tagBonus.arcane ?? 0) + 0.25; } },
  t_phys: { name: '锋锐原石', icon: '🗡', tier: 2, desc: '物理技能更疼', apply: (s: CharStats) => { s.tagBonus.physical = (s.tagBonus.physical ?? 0) + 0.25; } },
  t_poison: { name: '剧毒囊', icon: '☣', tier: 2, desc: '毒系技能更疼', apply: (s: CharStats) => { s.tagBonus.poison = (s.tagBonus.poison ?? 0) + 0.25; } },
  t_holy: { name: '圣徽', icon: '✝', tier: 2, desc: '圣系技能更疼', apply: (s: CharStats) => { s.tagBonus.holy = (s.tagBonus.holy ?? 0) + 0.25; } },
  t_nature: { name: '自然之心', icon: '🌿', tier: 2, desc: '自然技能更疼', apply: (s: CharStats) => { s.tagBonus.nature = (s.tagBonus.nature ?? 0) + 0.25; } },
  cdr_ice: { name: '寒霜碎片', icon: '❄', tier: 2, desc: '冰系技能转得更快', apply: (s: CharStats) => { s.tagCdr.ice = (s.tagCdr.ice ?? 0) + 0.18; } },
  cdr_bolt: { name: '雷暴核心', icon: '🌩', tier: 2, desc: '雷系技能转得更快', apply: (s: CharStats) => { s.tagCdr.lightning = (s.tagCdr.lightning ?? 0) + 0.15; } },
  prism: { name: '棱镜', icon: '💠', tier: 2, desc: '所有技能都更疼', apply: (s: CharStats) => { s.tagAll += 0.08; } },
  dragon: { name: '巨龙之心', icon: '🐉', tier: 2, desc: '血更厚，还会自动回血', apply: (s: CharStats) => { s.maxhp += 40; s.hp = Math.min(s.maxhp, s.hp + 40); s.regen += 0.5; } },
  rage: { name: '狂战之怒', icon: '😤', tier: 2, desc: '打得更疼，也更爱暴击', apply: (s: CharStats) => { s.power *= 1.20; s.crit += 0.08; } },
  shadow: { name: '迅捷之影', icon: '💨', tier: 2, desc: '跑得快，出手也快', apply: (s: CharStats) => { s.speed *= 1.15; s.haste *= 1.10; } },
  aegis: { name: '守护圣盾', icon: '🔰', tier: 2, desc: '挨打不疼，无敌更久', apply: (s: CharStats) => { s.armor += 0.10; s.invuln += 0.20; } },
  reaper: { name: '收割者', icon: '💀', tier: 2, desc: '杀怪回血、涨经验', apply: (s: CharStats) => { s.killHeal += 2; s.expGain += 0.15; } },
  aoe_x: { name: '天火之心', icon: '◎', tier: 2, desc: '范围技能非常疼', apply: (s: CharStats) => { s.aoeDmg += 0.40; } },
  slayer: { name: '屠魔者', icon: '⚔', tier: 2, desc: '对精英与首领更狠，也更抗打', apply: (s: CharStats) => { s.eliteDmg += 0.20; s.bossArmor += 0.10; } },
  grail: { name: '贪婪金杯', icon: '🏆', tier: 2, desc: '金币哗哗地掉', apply: (s: CharStats) => { s.greed += 0.40; } },
  vampire: { name: '吸血鬼牙', icon: '🩸', tier: 2, desc: '能吸血，暴击更疼', apply: (s: CharStats) => { s.lifesteal += 0.08; s.critdmg += 0.20; } },

  // ── 第一批新道具（设计 v6：tier 1 普通 / 2 稀有 / 3 传说）──
  emberstack: { name: '灼烧增伤', icon: 'sh-fire', tier: 2, desc: '火系命中的目标再受火伤 +25%', special: 'emberstack', apply: () => { /* 运行时处理 */ } },
  shatter:    { name: '破冰增伤',     icon: 'sh-shield', tier: 2, desc: '对被减速目标 +20% 伤害，对未被减速目标 -5%', special: 'shatter', apply: () => { /* 运行时处理 */ } },
  voltloop:   { name: '落雷追加', icon: 'sk-bolt', tier: 2, desc: '雷击命中 15% 概率追加 40% 小雷击', special: 'voltloop', apply: () => { /* 运行时处理 */ } },
  bloodpact:  { name: '攻击强化（代价生命）',     icon: 'sh-blood', tier: 3, desc: '攻击力 +30%，最大生命 -25%', special: 'bloodpact', apply: (s) => { s.power *= 1.30; s.maxhp = Math.round(s.maxhp * 0.75); } },
  lastbreath: { name: '低血强化',     icon: 'sh-execute', tier: 2, desc: '生命低于 35% 时攻速 +35%，高于则 -8%', special: 'lastbreath', apply: () => { /* 运行时处理 */ } },
  thorncoat:  { name: '受击反伤', icon: 'sh-heart', tier: 1, desc: '受击反弹 12 点伤害（0.5s CD），移速 -6%', special: 'thorncoat', apply: () => { /* 移速 -6% 由运行时处理 */ } },
  greed:      { name: '金币转攻击', icon: 'relic-007', tier: 2, desc: '金币 +25%，每 100 金币攻击 +3%（上限 +15%）', special: 'greed', apply: () => { /* 金币 +25% 由运行时处理 */ } },
  frugal:     { name: '刷新省钱', icon: 'relic-019', tier: 1, desc: '刷新费用 -50%，每波结束金币 -2', special: 'frugal', apply: () => { /* 运行时处理 */ } },
  focused:    { name: '少技能强化', icon: 'sh-sizeup', tier: 3, desc: '装备技能 ≤2 个时：技能伤害 +25%、冷却 -10%', special: 'focused', apply: () => { /* 运行时处理 */ } },
  resonator:  { name: '模块共鸣',   icon: 'relic-030', tier: 3, desc: '同一技能装 2 个同 Hook 黑科技时，该技能伤害 +20%', special: 'resonator', apply: () => { /* 运行时处理 */ } },
};

/** 精英 / BOSS 掉落池（高级道具） */
export const ELITE_POOL = ['t_fire', 't_ice', 't_bolt', 'prism', 'dragon', 'grail'];

export const ITEM_IDS = Object.keys(ITEMS);

// ─────────────────────────────────────────────────────────────
// 道具数值说明（M43）：从 apply **实际改了什么**反推，不手写、不会和数值脱节
// ─────────────────────────────────────────────────────────────
/**
 * 道具的"数值说明"（M43）——从 apply 函数**实际改了什么**反推，不手写、不会和数值脱节。
 *
 * 用法：暂停面板「道具」页的展开卡里，人话描述下面那行具体数值。
 * ⚠️ 用户要求：不要出现 px/s 这类单位、也不写"当前值 → 新值"，只写这件道具加了多少。
 */

type Key = keyof CharStats;

// 这些属性在道具里都是"乘"上去的（×1.08 之类），显示成百分比才和设计意图一致
// （尤其是移动速度/拾取范围：直接显示 +13 会让人以为是绝对值）
const MULT: [Key, string][] = [
  ['power', '攻击力'], ['haste', '攻速'], ['area', '范围'],
  ['projSpd', '子弹速度'], ['sizeMul', '子弹大小'],
  ['speed', '移动速度'], ['pickup', '拾取范围'],
];
const PCT: [Key, string][] = [
  ['crit', '暴击率'], ['critdmg', '暴击伤害'], ['armor', '减伤'], ['lifesteal', '吸血'],
  ['greed', '金币获取'], ['expGain', '经验获取'], ['cdr', '冷却缩减'],
  ['eliteDmg', '精英伤害'], ['aoeDmg', '范围伤害'],
  ['extraProjDmg', '额外弹伤害'], ['bossArmor', '首领减伤'],
];
const FLAT: [Key, string, string][] = [
  ['maxhp', '生命上限', ''], ['pierce', '穿透', ' 个'],
  ['bounce', '弹射', ' 次'], ['count', '多重', ' 发'], ['regen', '生命回复', '/秒'],
  ['invuln', '受击无敌', ' 秒'],
  ['killHeal', '击杀回血', ''], ['knockback', '击退', ''],
];

const TAG_CN: Record<string, string> = {
  fire: '火', ice: '冰', lightning: '雷', arcane: '奥术',
  physical: '物理', poison: '毒', holy: '圣', nature: '自然',
};

const pct = (n: number) => (n >= 0 ? '+' : '') + Math.round(n * 100) + '%';

/** 把一件道具的数值效果拼成一行（如「攻击力 +8% · 暴击率 +4%」） */
export function itemNumbers(it: ItemDef, id: string): string {
  // 回血类：emptyStats 本来就满血，diff 看不出来 —— 这两件直接写死数值
  if (id === 'heal1') return '立刻回复 30 生命';
  if (id === 'heal2') return '立刻回满生命';

  const s = emptyStats();
  const before = JSON.parse(JSON.stringify(s)) as CharStats;
  it.apply(s);

  const parts: string[] = [];
  for (const [k, label] of MULT) {
    const b = (before[k] as number) || 1;
    const cur = s[k] as number;
    const raw = cur - b;
    // 有的道具是直接加绝对值（如 拾取 +3），按比例算会得出 -91%，所以这里判断：
    // 变化幅度超过 50% 且是小数加法时，按 "+N" 显示（用户反馈"移动速度写个 3"看不懂）
    const flatAdd = Math.abs(raw) >= 1 && Number.isInteger(raw);
    const absurd = Math.abs(raw / b) > 0.5;
    if (Math.abs(raw) > 1e-9 && (flatAdd || absurd)) {
      const v = Math.abs(raw) < 10 ? Number(raw.toFixed(1)) : Math.round(raw);
      parts.push(label + ' ' + (v >= 0 ? '+' : '') + v);
    } else {
      const d = (cur / b) - 1;
      if (Math.abs(d) > 1e-9) parts.push(label + ' ' + pct(d));
    }
  }
  for (const [k, label] of PCT) {
    const d = (s[k] as number) - (before[k] as number);
    if (Math.abs(d) > 1e-9) parts.push(label + ' ' + pct(d));
  }
  for (const [k, label, unit] of FLAT) {
    const d = (s[k] as number) - (before[k] as number);
    if (Math.abs(d) < 1e-9) continue;
    const v = Math.abs(d) < 10 ? Number(d.toFixed(1)) : Math.round(d);
    parts.push(label + ' ' + (v >= 0 ? '+' : '') + v + unit);
  }
  for (const t of Object.keys(s.tagBonus)) {
    const v = s.tagBonus[t as keyof typeof s.tagBonus];
    if (v) parts.push((TAG_CN[t] ?? t) + '系技能伤害 ' + pct(v));
  }
  for (const t of Object.keys(s.tagCdr)) {
    const v = s.tagCdr[t as keyof typeof s.tagCdr];
    if (v) parts.push((TAG_CN[t] ?? t) + '系技能冷却 ' + pct(-v));
  }
  if (s.tagAll) parts.push('全部技能伤害 ' + pct(s.tagAll));
  return parts.join(' · ');
}
