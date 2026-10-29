/** 核心属性 —— **24 个**（需求 §10 目标 24，现已补齐）。
 *  每一个都**真正接入结算**：基础→SkillCalc；生存/收益/特效→Battle / RunState。
 *  base = 初始值；step = 每次升级加多少；fmt = 展示格式 */
export interface AttrDef {
  name: string;
  icon: string;
  base: number;
  step: number;
  /** 玩家向的一句话（升级卡用）：这个属性到底干什么 */
  desc: string;
  fmt: (v: number) => string;
}

export const ATTRS: Record<string, AttrDef> = {
  // ══════ 基础 7 ══════
  power:    { name: '攻击力',   icon: '⚔', base: 1.0,  step: 0.08, desc: '攻击更疼', fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  haste:    { name: '攻速',     icon: '»', base: 1.0,  step: 0.07, desc: '出手更快', fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  area:     { name: '范围',     icon: '◎', base: 1.0,  step: 0.09, desc: '技能范围更大', fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  maxhp:    { name: '生命上限', icon: '♥', base: 100,  step: 12,   desc: '血更厚', fmt: v => v + ' HP' },
  speed:    { name: '移动速度', icon: '➤', base: 96,   step: 3,    desc: '跑得更快', fmt: v => Math.round(v) + '' },
  crit:     { name: '暴击率',   icon: '✹', base: 0.05, step: 0.05, desc: '更容易暴击', fmt: v => Math.round(v * 100) + '%' },
  critdmg:  { name: '暴击伤害', icon: '✦', base: 1.5,  step: 0.15, desc: '暴击更疼', fmt: v => Math.round(v * 100) + '%' },

  // ══════ 投射 5 ══════
  projSpd:  { name: '子弹速度', icon: '⇢', base: 1.0,  step: 0.08, desc: '子弹飞得更快', fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  pierce:   { name: '穿透',     icon: '⇉', base: 0,    step: 1,    desc: '子弹能多穿一个', fmt: v => '+' + v + ' 个目标' },
  bounce:   { name: '弹射',     icon: '↺', base: 0,    step: 1,    desc: '子弹会多弹一次', fmt: v => '+' + v + ' 次' },
  count:    { name: '多重',     icon: '≡', base: 0,    step: 1,    desc: '一次多打一发', fmt: v => '+' + v + ' 发' },
  sizeMul:  { name: '子弹大小', icon: '⬤', base: 1.0,  step: 0.10, desc: '子弹更大', fmt: v => '+' + Math.round((v - 1) * 100) + '%' },

  // ══════ 生存 4 ══════
  armor:    { name: '减伤',     icon: '🛡', base: 0,    step: 0.04, desc: '受伤更少', fmt: v => Math.round(v * 100) + '%' },
  regen:    { name: '生命回复', icon: '✚', base: 0,    step: 0.35, desc: '自动回血更快', fmt: v => v.toFixed(1) + '' },
  invuln:   { name: '受击无敌', icon: '⏱', base: 0.80, step: 0.06, desc: '被打后无敌更久', fmt: v => v.toFixed(2) + ' 秒' },
  lifesteal:{ name: '吸血',     icon: '❖', base: 0,    step: 0.02, desc: '攻击能吸血', fmt: v => Math.round(v * 100) + '%' },

  // ══════ 收益 4 ══════
  pickup:   { name: '拾取范围', icon: '⌾', base: 34,   step: 10,   desc: '经验球吸得更远', fmt: v => v + '' },
  greed:    { name: '金币获取', icon: '◆', base: 0,    step: 0.07, desc: '金币掉得更多', fmt: v => '+' + Math.round(v * 100) + '%' },
  expGain:  { name: '经验获取', icon: '★', base: 0,    step: 0.08, desc: '经验涨得更快', fmt: v => '+' + Math.round(v * 100) + '%' },
  killHeal: { name: '击杀回血', icon: '✚', base: 0,    step: 0.5,  desc: '每杀一个回点血', fmt: v => '+' + v.toFixed(1) + ' HP' },

  // ══════ 特效 4 ══════
  cdr:      { name: '冷却缩减', icon: '◷', base: 0,    step: 0.04, desc: '技能转得更快', fmt: v => Math.round(v * 100) + '%' },
  knockback:{ name: '击退',     icon: '↦', base: 26,   step: 4,    desc: '把怪推得更远', fmt: v => v + '' },
  eliteDmg: { name: '精英伤害', icon: '☠', base: 0,    step: 0.08, desc: '对精英和 BOSS 更疼', fmt: v => '+' + Math.round(v * 100) + '%' },
  aoeDmg:   { name: '范围伤害', icon: '◎', base: 0,    step: 0.08, desc: '范围技能更疼', fmt: v => '+' + Math.round(v * 100) + '%' },
};

export const ATTR_IDS = Object.keys(ATTRS);
