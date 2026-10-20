/** 核心属性 —— **24 个**（需求 §10 目标 24，现已补齐）。
 *  每一个都**真正接入结算**：基础→SkillCalc；生存/收益/特效→Battle / RunState。
 *  base = 初始值；step = 每次升级加多少；fmt = 展示格式 */
export interface AttrDef {
  name: string;
  icon: string;
  base: number;
  step: number;
  fmt: (v: number) => string;
}

export const ATTRS: Record<string, AttrDef> = {
  // ══════ 基础 7 ══════
  power:    { name: '攻击力',   icon: '⚔', base: 1.0,  step: 0.08, fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  haste:    { name: '攻速',     icon: '»', base: 1.0,  step: 0.07, fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  area:     { name: '范围',     icon: '◎', base: 1.0,  step: 0.09, fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  maxhp:    { name: '生命上限', icon: '♥', base: 100,  step: 12,   fmt: v => v + ' HP' },
  speed:    { name: '移动速度', icon: '➤', base: 96,   step: 3,    fmt: v => v + ' px/s' },
  crit:     { name: '暴击率',   icon: '✹', base: 0.05, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
  critdmg:  { name: '暴击伤害', icon: '✦', base: 1.5,  step: 0.15, fmt: v => Math.round(v * 100) + '%' },

  // ══════ 投射 5 ══════
  projSpd:  { name: '弹速',     icon: '⇢', base: 1.0,  step: 0.08, fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  pierce:   { name: '穿透',     icon: '⇉', base: 0,    step: 1,    fmt: v => '+' + v + ' 个目标' },
  bounce:   { name: '弹射',     icon: '↺', base: 0,    step: 1,    fmt: v => '+' + v + ' 次' },
  count:    { name: '多重',     icon: '≡', base: 0,    step: 1,    fmt: v => '+' + v + ' 发' },
  sizeMul:  { name: '弹体体积', icon: '⬤', base: 1.0,  step: 0.10, fmt: v => '+' + Math.round((v - 1) * 100) + '%' },

  // ══════ 生存 4 ══════
  armor:    { name: '减伤',     icon: '🛡', base: 0,    step: 0.04, fmt: v => Math.round(v * 100) + '%' },
  regen:    { name: '生命回复', icon: '✚', base: 0,    step: 0.35, fmt: v => v.toFixed(2) + '/s' },
  invuln:   { name: '受击无敌', icon: '⏱', base: 0.80, step: 0.06, fmt: v => v.toFixed(2) + 's' },
  lifesteal:{ name: '吸血',     icon: '❖', base: 0,    step: 0.02, fmt: v => Math.round(v * 100) + '%' },

  // ══════ 收益 4 ══════
  pickup:   { name: '拾取范围', icon: '⌾', base: 85,   step: 26,   fmt: v => v + '' },
  greed:    { name: '金币获取', icon: '◆', base: 0,    step: 0.07, fmt: v => '+' + Math.round(v * 100) + '%' },
  expGain:  { name: '经验获取', icon: '★', base: 0,    step: 0.08, fmt: v => '+' + Math.round(v * 100) + '%' },
  killHeal: { name: '击杀回血', icon: '✚', base: 0,    step: 0.5,  fmt: v => '+' + v.toFixed(1) + ' HP' },

  // ══════ 特效 4 ══════
  cdr:      { name: '冷却缩减', icon: '◷', base: 0,    step: 0.04, fmt: v => Math.round(v * 100) + '%' },
  knockback:{ name: '击退',     icon: '↦', base: 26,   step: 4,    fmt: v => v + '' },
  eliteDmg: { name: '精英伤害', icon: '☠', base: 0,    step: 0.08, fmt: v => '+' + Math.round(v * 100) + '%' },
  summonPower:{ name: '召唤强化', icon: '♜', base: 0,  step: 0.12, fmt: v => '+' + Math.round(v * 100) + '%' },
};

export const ATTR_IDS = Object.keys(ATTRS);
