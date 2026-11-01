/**
 * 黑科技面板的精确数值文案（按当前等级）。
 * 与 SkillCalc/Battle 公式保持一致；用于安装屏、Build 面板、商店。
 */
import { MODULES, baseOf, modEffect, modPower, levelOf } from '../data/Modules';
import { canInstall, makeSkill } from './SkillCalc';

function pct(v: number): string {
  return (Math.round(v * 1000) / 10).toFixed(1) + '%';
}

export function moduleDetailText(id: string, stats?: { modCdrMul?: number }): string {
  const base = baseOf(id);
  const lvl = levelOf(id);
  const e = modEffect(id);
  const n = modPower(id);
  const prefix = levelOf(id) > 1 ? 'Lv.' + lvl + ' · ' : '';
  switch (base) {
    case 'multi': return prefix + '连续 +' + n + ' 发（间隔 0.08s，同向）';
    case 'fan': return prefix + '额外 ' + (2 * n) + ' 枚 · 每发 55% 伤害';
    case 'split': return prefix + '命中分裂 ' + (1 + n) + ' 枚';
    case 'bounce': return prefix + '弹射 +' + n + ' 次';
    case 'pierce': return prefix + '穿透 +' + n + ' 个目标';
    case 'orbit': return prefix + '环绕弹 +' + n + ' 枚';
    case 'giant': return prefix + '体积/范围 +' + pct(Math.pow(1.3, e) - 1);
    case 'rapid': {
      // 与 SkillCalc 的 rapidPer 一致：cd *= (0.88^modCdrMul)^e
      const mul = stats?.modCdrMul ?? 1;
      return prefix + '冷却 -' + pct(1 - Math.pow(0.88, mul * e));
    }
    case 'echo': return prefix + '追加 ' + Math.max(1, Math.round(e)) + ' 次 · 60% 伤害';
    case 'burn': return prefix + '每秒 ' + Math.round(10 * e) + '% 伤害 · ' + (2 + 0.6 * (e - 1)).toFixed(1) + 's';
    case 'frost': return prefix + '减速 ' + Math.round(35 + 10 * (e - 1)) + '% · ' + (1.2 + 0.4 * (e - 1)).toFixed(1) + 's';
    case 'vamp': return prefix + '伤害的 ' + pct(0.04 * e) + ' 回血';
    case 'chain': return prefix + '跳 ' + n + ' 次 · 每次 70% 伤害';
    case 'snipe': return prefix + '弹速 +' + pct(Math.pow(1.4, e) - 1) + ' · 伤害 +' + pct(Math.pow(1.15, e) - 1);
    case 'harvest': return prefix + '击杀回 ' + (Math.round(e * 10) / 10) + ' HP';
    case 'thunder': return prefix + pct(0.15 * e) + ' 概率落雷';
    case 'thornmail': return prefix + '受击反伤 ' + (Math.round(6 * e * 10) / 10);
    case 'overload': return prefix + '伤害 +' + pct(Math.pow(1.25, e) - 1) + ' · 范围 -' + pct(1 - Math.pow(0.9, e));
    default: return prefix + (MODULES[base]?.desc ?? '');
  }
}

/** 模块 requires 标签 → 玩家可读的短标签 */
const TAG_CN: Record<string, string> = {
  projectile: '投射物', pulse: '脉冲', chain: '连锁', area: '范围',
  orbit: '环绕', melee: '近战', trap: '陷阱', summon: '召唤',
};

/**
 * 商店模块的兼容条件提示。
 * 兼容判断复用 canInstall（与安装/战斗规则同源）；这里只做展示，不改变购买/安装。
 */
export function moduleRequiresHint(id: string, skillIds: string[]): string {
  const tags = MODULES[baseOf(id)]?.requires ?? [];
  if (!tags.length) return '无需特定技能';
  const ok = skillIds.some(sid => {
    const r = canInstall(makeSkill(sid), id);
    // 槽位已满/已满级仍表示类型兼容，不能误报“不兼容”
    return r.ok || r.why === '需替换槽位' || r.why === '已满级';
  });
  const need = tags.map(t => TAG_CN[t] ?? t).join('/');
  return (ok ? '需要：' : '暂无兼容，可留用 · 需要：') + need;
}

