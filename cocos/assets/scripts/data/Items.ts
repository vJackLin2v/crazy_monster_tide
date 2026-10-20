import type { ItemDef, CharStats } from './Types';

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
  power_s: { name: '铁匠手套', icon: '⚔', tier: 1, desc: '攻击力 +8%', apply: (s: CharStats) => { s.power *= 1.08; } },
  power_l: { name: '战锤碎片', icon: '⚔', tier: 1, desc: '攻击力 +16%', apply: (s: CharStats) => { s.power *= 1.16; } },
  haste_s: { name: '疾风戒', icon: '»', tier: 1, desc: '攻速 +8%', apply: (s: CharStats) => { s.haste *= 1.08; } },
  haste_l: { name: '迅捷护符', icon: '»', tier: 1, desc: '攻速 +16%', apply: (s: CharStats) => { s.haste *= 1.16; } },
  area_s: { name: '放大镜', icon: '◎', tier: 1, desc: '范围 +8%', apply: (s: CharStats) => { s.area *= 1.08; } },
  area_l: { name: '广角符文', icon: '◎', tier: 1, desc: '范围 +18%', apply: (s: CharStats) => { s.area *= 1.18; } },
  maxhp_s: { name: '生命护符', icon: '♥', tier: 1, desc: '生命上限 +15 HP', apply: (s: CharStats) => { s.maxhp += 15; } },
  maxhp_l: { name: '巨人之心', icon: '♥', tier: 1, desc: '生命上限 +35 HP', apply: (s: CharStats) => { s.maxhp += 35; } },
  speed_s: { name: '轻羽靴', icon: '➤', tier: 1, desc: '移动速度 +6%', apply: (s: CharStats) => { s.speed *= 1.06; } },
  speed_l: { name: '疾风长靴', icon: '➤', tier: 1, desc: '移动速度 +14%', apply: (s: CharStats) => { s.speed *= 1.14; } },
  crit_s: { name: '鹰眼', icon: '✹', tier: 1, desc: '暴击率 +4%', apply: (s: CharStats) => { s.crit += 0.04; } },
  crit_l: { name: '猎手之瞳', icon: '✹', tier: 1, desc: '暴击率 +9%', apply: (s: CharStats) => { s.crit += 0.09; } },
  critdmg_s: { name: '破甲锥', icon: '✦', tier: 1, desc: '暴击伤害 +15%', apply: (s: CharStats) => { s.critdmg += 0.15; } },
  critdmg_l: { name: '斩钢刃', icon: '✦', tier: 1, desc: '暴击伤害 +35%', apply: (s: CharStats) => { s.critdmg += 0.35; } },
  projSpd_s: { name: '羽毛箭', icon: '⇢', tier: 1, desc: '弹速 +10%', apply: (s: CharStats) => { s.projSpd *= 1.1; } },
  projSpd_l: { name: '追风矢', icon: '⇢', tier: 1, desc: '弹速 +22%', apply: (s: CharStats) => { s.projSpd *= 1.22; } },
  pierce_s: { name: '穿甲尖', icon: '⇉', tier: 1, desc: '穿透 +1 个目标', apply: (s: CharStats) => { s.pierce += 1; } },
  pierce_l: { name: '破空矢', icon: '⇉', tier: 1, desc: '穿透 +2 个目标', apply: (s: CharStats) => { s.pierce += 2; } },
  bounce_s: { name: '弹跳石', icon: '↺', tier: 1, desc: '弹射 +1 次', apply: (s: CharStats) => { s.bounce += 1; } },
  bounce_l: { name: '回音石', icon: '↺', tier: 1, desc: '弹射 +2 次', apply: (s: CharStats) => { s.bounce += 2; } },
  count_s: { name: '分裂核心', icon: '≡', tier: 1, desc: '多重 +1 发', apply: (s: CharStats) => { s.count += 1; } },
  count_l: { name: '三重镜', icon: '≡', tier: 1, desc: '多重 +1 发', apply: (s: CharStats) => { s.count += 1; } },
  sizeMul_s: { name: '巨兽骨', icon: '⬤', tier: 1, desc: '弹体体积 +10%', apply: (s: CharStats) => { s.sizeMul *= 1.1; } },
  sizeMul_l: { name: '泰坦碎片', icon: '⬤', tier: 1, desc: '弹体体积 +22%', apply: (s: CharStats) => { s.sizeMul *= 1.22; } },
  armor_s: { name: '铁胸甲', icon: '🛡', tier: 1, desc: '减伤 +5%', apply: (s: CharStats) => { s.armor += 0.05; } },
  armor_l: { name: '龙鳞甲', icon: '🛡', tier: 1, desc: '减伤 +11%', apply: (s: CharStats) => { s.armor += 0.11; } },
  regen_s: { name: '苔藓苔', icon: '✚', tier: 1, desc: '生命回复 +0.3/s', apply: (s: CharStats) => { s.regen += 0.3; } },
  regen_l: { name: '生命之泉', icon: '✚', tier: 1, desc: '生命回复 +0.7/s', apply: (s: CharStats) => { s.regen += 0.7; } },
  invuln_s: { name: '龟甲片', icon: '⏱', tier: 1, desc: '受击无敌 +0.1s', apply: (s: CharStats) => { s.invuln += 0.1; } },
  invuln_l: { name: '时之沙', icon: '⏱', tier: 1, desc: '受击无敌 +0.22s', apply: (s: CharStats) => { s.invuln += 0.22; } },
  lifesteal_s: { name: '血牙', icon: '❖', tier: 1, desc: '吸血 +3%', apply: (s: CharStats) => { s.lifesteal += 0.03; } },
  lifesteal_l: { name: '嗜血之刃', icon: '❖', tier: 1, desc: '吸血 +7%', apply: (s: CharStats) => { s.lifesteal += 0.07; } },
  pickup_s: { name: '吸铁石', icon: '⌾', tier: 1, desc: '拾取范围 +25%', apply: (s: CharStats) => { s.pickup *= 1.25; } },
  pickup_l: { name: '磁力核心', icon: '⌾', tier: 1, desc: '拾取范围 +55%', apply: (s: CharStats) => { s.pickup *= 1.55; } },
  greed_s: { name: '金币袋', icon: '◆', tier: 1, desc: '金币获取 +15%', apply: (s: CharStats) => { s.greed += 0.15; } },
  greed_l: { name: '贪婪硬币', icon: '◆', tier: 1, desc: '金币获取 +35%', apply: (s: CharStats) => { s.greed += 0.35; } },
  expGain_s: { name: '智慧卷轴', icon: '★', tier: 1, desc: '经验获取 +12%', apply: (s: CharStats) => { s.expGain += 0.12; } },
  expGain_l: { name: '贤者之石', icon: '★', tier: 1, desc: '经验获取 +28%', apply: (s: CharStats) => { s.expGain += 0.28; } },
  killHeal_s: { name: '猎魂刀', icon: '✚', tier: 1, desc: '击杀回血 +0.5 HP', apply: (s: CharStats) => { s.killHeal += 0.5; } },
  killHeal_l: { name: '死神镰刀', icon: '✚', tier: 1, desc: '击杀回血 +1.5 HP', apply: (s: CharStats) => { s.killHeal += 1.5; } },
  cdr_s: { name: '齿轮', icon: '◷', tier: 1, desc: '冷却缩减 +5%', apply: (s: CharStats) => { s.cdr += 0.05; } },
  cdr_l: { name: '时之轮', icon: '◷', tier: 1, desc: '冷却缩减 +11%', apply: (s: CharStats) => { s.cdr += 0.11; } },
  knockback_s: { name: '铁拳套', icon: '↦', tier: 1, desc: '击退 +6', apply: (s: CharStats) => { s.knockback += 6; } },
  knockback_l: { name: '巨力腰带', icon: '↦', tier: 1, desc: '击退 +14', apply: (s: CharStats) => { s.knockback += 14; } },
  eliteDmg_s: { name: '斩魔刃', icon: '☠', tier: 1, desc: '精英伤害 +10%', apply: (s: CharStats) => { s.eliteDmg += 0.1; } },
  eliteDmg_l: { name: '屠龙剑', icon: '☠', tier: 1, desc: '精英伤害 +25%', apply: (s: CharStats) => { s.eliteDmg += 0.25; } },
  summonPower_s: { name: '图腾石', icon: '♜', tier: 1, desc: '召唤物强度 +15%', apply: (s: CharStats) => { s.summonPower += 0.15; } },
  summonPower_l: { name: '先祖之灵', icon: '♜', tier: 1, desc: '召唤物强度 +35%', apply: (s: CharStats) => { s.summonPower += 0.35; } },
  heal1: { name: '急救包', icon: '💊', tier: 1, desc: '立刻回复 30 生命', apply: (s: CharStats) => { s.hp = Math.min(s.maxhp, s.hp + 30); } },
  heal2: { name: '治疗药水', icon: '🧪', tier: 1, desc: '立刻回满生命', apply: (s: CharStats) => { s.hp = s.maxhp; } },
  t_fire: { name: '余烬核心', icon: '🔥', tier: 2, desc: '火标签 伤害 +25%', apply: (s: CharStats) => { s.tagBonus.fire = (s.tagBonus.fire ?? 0) + 0.25; } },
  t_ice: { name: '冰河之心', icon: '🧊', tier: 2, desc: '冰标签 伤害 +20%', apply: (s: CharStats) => { s.tagBonus.ice = (s.tagBonus.ice ?? 0) + 0.20; } },
  t_bolt: { name: '雷神之锤', icon: '⚡', tier: 2, desc: '雷标签 伤害 +25%', apply: (s: CharStats) => { s.tagBonus.lightning = (s.tagBonus.lightning ?? 0) + 0.25; } },
  t_arcane: { name: '奥术宝石', icon: '🔮', tier: 2, desc: '奥术标签 伤害 +25%', apply: (s: CharStats) => { s.tagBonus.arcane = (s.tagBonus.arcane ?? 0) + 0.25; } },
  t_phys: { name: '锋锐原石', icon: '🗡', tier: 2, desc: '物理标签 伤害 +25%', apply: (s: CharStats) => { s.tagBonus.physical = (s.tagBonus.physical ?? 0) + 0.25; } },
  t_poison: { name: '剧毒囊', icon: '☣', tier: 2, desc: '毒标签 伤害 +25%', apply: (s: CharStats) => { s.tagBonus.poison = (s.tagBonus.poison ?? 0) + 0.25; } },
  t_holy: { name: '圣徽', icon: '✝', tier: 2, desc: '圣标签 伤害 +25%', apply: (s: CharStats) => { s.tagBonus.holy = (s.tagBonus.holy ?? 0) + 0.25; } },
  t_nature: { name: '自然之心', icon: '🌿', tier: 2, desc: '自然标签 伤害 +25%', apply: (s: CharStats) => { s.tagBonus.nature = (s.tagBonus.nature ?? 0) + 0.25; } },
  cdr_ice: { name: '寒霜碎片', icon: '❄', tier: 2, desc: '冰标签 冷却 -18%', apply: (s: CharStats) => { s.tagCdr.ice = (s.tagCdr.ice ?? 0) + 0.18; } },
  cdr_bolt: { name: '雷暴核心', icon: '🌩', tier: 2, desc: '雷标签 冷却 -15%', apply: (s: CharStats) => { s.tagCdr.lightning = (s.tagCdr.lightning ?? 0) + 0.15; } },
  prism: { name: '棱镜', icon: '💠', tier: 2, desc: '全部标签 伤害 +8%', apply: (s: CharStats) => { s.tagAll += 0.08; } },
  dragon: { name: '巨龙之心', icon: '🐉', tier: 2, desc: '生命上限 +40，回复 +0.5/s', apply: (s: CharStats) => { s.maxhp += 40; s.hp = Math.min(s.maxhp, s.hp + 40); s.regen += 0.5; } },
  rage: { name: '狂战之怒', icon: '😤', tier: 2, desc: '攻击力 +20%，暴击率 +8%', apply: (s: CharStats) => { s.power *= 1.20; s.crit += 0.08; } },
  shadow: { name: '迅捷之影', icon: '💨', tier: 2, desc: '移速 +15%，攻速 +10%', apply: (s: CharStats) => { s.speed *= 1.15; s.haste *= 1.10; } },
  aegis: { name: '守护圣盾', icon: '🔰', tier: 2, desc: '减伤 +10%，无敌 +0.2s', apply: (s: CharStats) => { s.armor += 0.10; s.invuln += 0.20; } },
  reaper: { name: '收割者', icon: '💀', tier: 2, desc: '击杀回血 +2，经验 +15%', apply: (s: CharStats) => { s.killHeal += 2; s.expGain += 0.15; } },
  totem: { name: '图腾之心', icon: '🗿', tier: 2, desc: '召唤物 伤害与时长 +40%', apply: (s: CharStats) => { s.summonPower += 0.40; } },
  slayer: { name: '屠魔者', icon: '⚔', tier: 2, desc: '精英伤害 +25%', apply: (s: CharStats) => { s.eliteDmg += 0.25; } },
  grail: { name: '贪婪金杯', icon: '🏆', tier: 2, desc: '金币获取 +40%', apply: (s: CharStats) => { s.greed += 0.40; } },
  vampire: { name: '吸血鬼牙', icon: '🩸', tier: 2, desc: '吸血 +8%，暴击伤害 +20%', apply: (s: CharStats) => { s.lifesteal += 0.08; s.critdmg += 0.20; } },
};

/** 精英 / BOSS 掉落池（高级道具） */
export const ELITE_POOL = ['t_fire', 't_ice', 't_bolt', 'prism', 'dragon', 'grail'];

export const ITEM_IDS = Object.keys(ITEMS);
