import type { CharDef } from './Types';

/** 6 个角色（需求 §6 + docs/systems/character_rules.md）
 *  规则：每个角色必须同时有【明显的正向 Buff】与【明显的负向代价】。
 *  ⚠️ speedMul / pickupMul 是**倍率**，不要写成绝对值 ——
 *     （原型里曾把 speedMul 写成 speed:0.9 覆盖了基础移速 62，导致角色几乎不能动，见 D-13） */
export const CHARS: CharDef[] = [
  {
    id: 'knight', name: '铁拳骑士', unit: 'swordswoman',
    pos: '受击后 2s 内攻击力 +20%', neg: '移动速度 -10%',
    start: 'fireball',
    stats: { power: 1.0, speedMul: 0.90, maxhp: 72 },
  },
  {
    id: 'mage', name: '秘术学徒', unit: 'mage',
    pos: '黑科技冷却效果 +25%', neg: '生命上限 -20',
    start: 'arcane',
    // modCdr：模块提供的冷却效果 ×1.25（"黑科技冷却效果 +25%"，在 calcSkill 里只作用于 rapid）
    stats: { power: 1.1, maxhp: 48, modCdrMul: 1.25 },
  },
  {
    id: 'ranger', name: '荒野游侠', unit: 'archer',
    pos: '投射物速度 +25%，拾取范围 +50%', neg: '受到伤害 +15%（更脆）',
    start: 'ice_spear',
    // armor -0.15 = 「受到伤害 +15%」（与狂信者同一机制，之前这条负面根本没生效）
    stats: { power: 0.95, speedMul: 1.15, maxhp: 54, projSpd: 1.25, pickupMul: 1.5, armor: -0.15 },
  },
  {
    id: 'monk', name: '苦行僧', unit: 'spearman',
    pos: '生命回复 +0.5/s', neg: '攻击力 -12%',
    start: 'thorn',
    stats: { power: 0.88, regen: 0.5, maxhp: 66 },
  },
  {
    id: 'summoner', name: '陨星师', unit: 'jester',
    pos: '范围 +15%', neg: '主动技能伤害 -10%',
    start: 'meteor',
    stats: { power: 0.9, maxhp: 57, area: 1.15 },
  },
  {
    id: 'zealot', name: '狂信者', unit: 'rider',
    pos: '暴击率 +12%，暴击伤害 +40%', neg: '受到伤害 +15%',
    start: 'holybolt',
    stats: { power: 1.05, crit: 0.17, critdmg: 1.9, maxhp: 54, armor: -0.15 },
  },
];
