/** 核心属性（需求 §10 目标约 24；原型阶段 10 个）
 *  base = 初始值；step = 每次升级加多少；fmt = 展示格式 */
export interface AttrDef {
  name: string;
  icon: string;
  base: number;
  step: number;
  fmt: (v: number) => string;
}

export const ATTRS: Record<string, AttrDef> = {
  power:   { name: '攻击力',   icon: '⚔', base: 1.0,  step: 0.08, fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  haste:   { name: '攻速',     icon: '»', base: 1.0,  step: 0.07, fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  area:    { name: '范围',     icon: '◎', base: 1.0,  step: 0.09, fmt: v => '+' + Math.round((v - 1) * 100) + '%' },
  maxhp:   { name: '生命上限', icon: '♥', base: 100,  step: 12,   fmt: v => '+' + v + ' HP' },
  speed:   { name: '移动速度', icon: '➤', base: 96,   step: 3,    fmt: v => v + ' px/s' },
  crit:    { name: '暴击率',   icon: '✹', base: 0.05, step: 0.05, fmt: v => Math.round(v * 100) + '%' },
  critdmg: { name: '暴击伤害', icon: '✦', base: 1.5,  step: 0.15, fmt: v => Math.round(v * 100) + '%' },
  pickup:  { name: '拾取范围', icon: '◎', base: 85,   step: 26,   fmt: v => '+' + v },
  armor:   { name: '减伤',     icon: '🛡', base: 0,    step: 0.04, fmt: v => Math.round(v * 100) + '%' },
  regen:   { name: '生命回复', icon: '✚', base: 0,    step: 0.35, fmt: v => v.toFixed(2) + '/s' },
};

export const ATTR_IDS = Object.keys(ATTRS);
