import type { ItemDef, CharStats } from './Types';

/** 20 个道具（需求 §10 首版目标 50 普通 + 20 高级；原型阶段先做 20）
 *  规则：道具直接改写角色属性；高级道具主要由精英/BOSS 掉落。 */
export const ITEMS: Record<string, ItemDef> = {
  glove:   { name: '铁匠手套', icon: '🧤', tier: 1, desc: '攻击力 +12%',              apply: (s: CharStats) => { s.power *= 1.12; } },
  boots:   { name: '轻羽靴',   icon: '👟', tier: 1, desc: '移动速度 +10%',            apply: (s: CharStats) => { s.speed *= 1.10; } },
  lens:    { name: '放大镜',   icon: '🔍', tier: 1, desc: '范围 +12%',                apply: (s: CharStats) => { s.area *= 1.12; } },
  ring:    { name: '疾风戒',   icon: '💍', tier: 1, desc: '攻速 +12%',                apply: (s: CharStats) => { s.haste *= 1.12; } },
  magnet:  { name: '吸铁石',   icon: '🧲', tier: 1, desc: '拾取范围 +25%',            apply: (s: CharStats) => { s.pickup *= 1.25; } },
  plate:   { name: '铁胸甲',   icon: '🛡', tier: 1, desc: '减伤 +6%',                 apply: (s: CharStats) => { s.armor += 0.06; } },
  heart:   { name: '生命护符', icon: '💗', tier: 2, desc: '生命上限 +25 并立即回满',  apply: (s: CharStats) => { s.maxhp += 25; s.hp = s.maxhp; } },
  ember:   { name: '余烬核心', icon: '🔥', tier: 2, desc: '火/圣标签伤害 +25%',       apply: (s: CharStats) => { s.tagBonus.fire = (s.tagBonus.fire ?? 0) + 0.25; } },
  shard:   { name: '寒霜碎片', icon: '🧊', tier: 2, desc: '冰标签技能冷却 -18%',      apply: (s: CharStats) => { s.tagCdr.ice = (s.tagCdr.ice ?? 0) + 0.18; } },
  coin:    { name: '贪婪硬币', icon: '🪙', tier: 2, desc: '金币获取 +30%',            apply: (s: CharStats) => { s.greed += 0.3; } },
  whet:    { name: '磨刀石',   icon: '🪨', tier: 1, desc: '攻击力 +10%',              apply: (s: CharStats) => { s.power *= 1.10; } },
  battery: { name: '电池',     icon: '🔋', tier: 1, desc: '攻速 +10%',                apply: (s: CharStats) => { s.haste *= 1.10; } },
  biglens: { name: '广角镜',   icon: '🔭', tier: 1, desc: '范围 +10%',                apply: (s: CharStats) => { s.area *= 1.10; } },
  boots2:  { name: '疾风靴',   icon: '👢', tier: 1, desc: '移动速度 +8%',             apply: (s: CharStats) => { s.speed *= 1.08; } },
  alloy:   { name: '合金板',   icon: '⬛', tier: 1, desc: '减伤 +5%',                 apply: (s: CharStats) => { s.armor += 0.05; } },
  fang:    { name: '獠牙',     icon: '🦷', tier: 1, desc: '暴击率 +6%',               apply: (s: CharStats) => { s.crit += 0.06; } },
  scope:   { name: '瞄准镜',   icon: '🎯', tier: 1, desc: '暴击伤害 +25%',            apply: (s: CharStats) => { s.critdmg += 0.25; } },
  magnet2: { name: '强磁铁',   icon: '🧲', tier: 1, desc: '拾取范围 +30%',            apply: (s: CharStats) => { s.pickup *= 1.30; } },
  medkit:  { name: '急救包',   icon: '🧰', tier: 1, desc: '生命上限 +10 并立即回满',  apply: (s: CharStats) => { s.maxhp += 10; s.hp = s.maxhp; } },
  prism:   { name: '棱镜',     icon: '🔮', tier: 2, desc: '全部标签伤害 +8%',         apply: (s: CharStats) => { s.tagAll += 0.08; } },
};

/** 精英 / BOSS 掉落池（高级道具） */
export const ELITE_POOL = ['heart', 'ember', 'shard', 'coin', 'prism', 'scope'];

export const ITEM_IDS = Object.keys(ITEMS);
