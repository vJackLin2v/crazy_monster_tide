/**
 * 构筑平衡解析模型 v2（tools/analysis/build_balance.ts）
 *
 * 校准点（v2）：
 *  - 弹幕类（projectile/chain）：count x (1+fan)，且全部命中同一目标（保守）；
 *  - 范围类（pulse/area）：按命中 4 个目标计；
 *  - 地雷阵：按同屏 4 枚存量计（dmg x 4 / cd）；
 *  - 环刃：按 0.25s 一跳、2 片 x 1.5 计；
 *  - 哨兵：单体、不吃 multi/fan，按 8s 存活 / 9s 周期折算；
 *  - 蓄能脉冲：单体高爆发，DPS 按 dmg/cd。
 *
 * 仍是解析推导，不是真机实测。
 */
import { writeFileSync } from 'fs';
import { CHARS } from '../../cocos/assets/scripts/data/Chars';
import { calcSkill } from '../../cocos/assets/scripts/game/SkillCalc';
import { freshStats } from '../../cocos/assets/scripts/game/Stats';
import { waveScale } from '../../cocos/assets/scripts/game/Combat';
import { SKILLS } from '../../cocos/assets/scripts/data/Skills';

interface Build { name: string; skills: { id: string; mods: string[] }[] }

const BUILDS: Build[] = [
  { name: '火球爆发', skills: [{ id: 'fireball', mods: ['multi', 'split', 'burn'] }, { id: 'meteor', mods: ['giant'] }, { id: 'frostnova', mods: ['frost'] }, { id: 'chain', mods: ['chain'] }] },
  { name: '冰霜控制', skills: [{ id: 'ice_spear', mods: ['frost', 'pierce', 'multi'] }, { id: 'frostnova', mods: ['frost', 'giant'] }, { id: 'shockwave', mods: ['giant'] }, { id: 'poison', mods: ['giant'] }] },
  { name: '毒雾铺场', skills: [{ id: 'poison', mods: ['giant', 'burn'] }, { id: 'meteor', mods: ['giant', 'burn'] }, { id: 'ice_spear', mods: ['frost'] }, { id: 'chain', mods: ['chain', 'thunder'] }] },
  { name: '回旋刃', skills: [{ id: 'blade', mods: ['returnstrike', 'multi', 'pierce'] }, { id: 'ring_blade', mods: ['giant'] }, { id: 'shockwave', mods: ['giant'] }, { id: 'mine_field', mods: ['split'] }] },
  { name: '雷暴', skills: [{ id: 'chain', mods: ['thunder', 'chain', 'multi'] }, { id: 'shockwave', mods: ['thunder'] }, { id: 'fireball', mods: ['thunder'] }, { id: 'frostnova', mods: ['thunder'] }] },
  { name: '吸血站桩', skills: [{ id: 'fireball', mods: ['vamp', 'multi'] }, { id: 'blade', mods: ['vamp', 'returnstrike'] }, { id: 'shockwave', mods: ['vamp'] }, { id: 'poison', mods: ['vamp'] }] },
  { name: '荆棘反伤', skills: [{ id: 'shockwave', mods: ['thornmail', 'giant'] }, { id: 'frostnova', mods: ['thornmail'] }, { id: 'fireball', mods: ['thornmail'] }, { id: 'blade', mods: ['thornmail'] }] },
  { name: '环绕近战', skills: [{ id: 'ring_blade', mods: ['orbit', 'giant', 'burn'] }, { id: 'shockwave', mods: ['giant'] }, { id: 'blade', mods: ['multi'] }, { id: 'mine_field', mods: ['giant'] }] },
  { name: '陷阱控场', skills: [{ id: 'mine_field', mods: ['split', 'echo', 'giant'] }, { id: 'poison', mods: ['giant'] }, { id: 'frostnova', mods: ['frost', 'giant'] }, { id: 'meteor', mods: ['giant'] }] },
  { name: '召唤流', skills: [{ id: 'sentry', mods: ['rapid', 'snipe'] }, { id: 'fireball', mods: ['multi'] }, { id: 'chain', mods: ['chain'] }, { id: 'ice_spear', mods: ['pierce'] }] },
  { name: '蓄能爆破', skills: [{ id: 'charge_pulse', mods: ['overload', 'giant', 'echo'] }, { id: 'shockwave', mods: ['giant'] }, { id: 'meteor', mods: ['giant'] }, { id: 'fireball', mods: ['multi'] }] },
  { name: '弹幕海', skills: [{ id: 'fireball', mods: ['multi', 'fan', 'split'] }, { id: 'ice_spear', mods: ['multi', 'pierce'] }, { id: 'chain', mods: ['multi'] }, { id: 'blade', mods: ['multi'] }] },
];

const CHAR = CHARS[0];
const ST = freshStats(CHAR);

function skillDps(id: string, mods: string[]): { dps: number; burst: number } {
  const sk = { id, lvl: 5, mods };
  const rt = calcSkill(sk as never, ST);
  const def = SKILLS[id];
  const type = def ? def.type : 'projectile';
  const cd = Math.max(0.2, rt.cd);

  if (id === 'sentry') return { dps: (rt.dmg / 0.9) * (8 / 9), burst: rt.dmg };
  if (id === 'mine_field') return { dps: (rt.dmg * 4) / cd, burst: rt.dmg };
  if (id === 'ring_blade') return { dps: (1.5 * 2) / 0.25, burst: 3 };
  if (type === 'pulse' || type === 'area') return { dps: (rt.dmg * 4) / cd, burst: rt.dmg };
  if (type === 'charge') return { dps: rt.dmg / cd, burst: rt.dmg };
  const hits = Math.max(1, rt.count) * (1 + rt.fan);
  return { dps: (rt.dmg * hits) / cd, burst: rt.dmg * hits };
}

const waves = [5, 10, 15, 20];
const rows: string[] = ['| 构筑 | ' + waves.map(w => 'W' + w + ' DPS / 秒杀').join(' | ') + ' |', '|---|' + waves.map(() => '---').join('|') + '|'];
const warn: string[] = [];
for (const b of BUILDS) {
  const parts = b.skills.map(s => skillDps(s.id, s.mods));
  const cellFor = (w: number) => {
    const dps = parts.reduce((a, p) => a + p.dps, 0);
    const hp = 20 * waveScale(w).hp;
    const ttk = hp / Math.max(1, dps);
    return dps.toFixed(0) + ' / ' + ttk.toFixed(2) + 's';
  };
  rows.push('| ' + b.name + ' | ' + waves.map(cellFor).join(' | ') + ' |');
}

const md = [
  '# 构筑平衡解析 v2（校准后）',
  '',
  '> 解析模型，不是实测。v2 校准：弹幕全部命中单体、范围按 4 目标、地雷按 4 枚存量、环刃按 0.25s 跳、哨兵不吃 multi/fan 且按 8/9 存活折算。',
  '',
  ...rows,
  '',
  '## 告警',
  '',
  ...(warn.length ? warn.map(w => '- ' + w) : ['- 无明显异常']),
].join('\n');
// 相对排序：只看同一模型内的强弱差，不用绝对阈值（模型假设了满配角色，绝对值不可比）
const ranking = BUILDS.map(b => {
  const dps = b.skills.map(x => skillDps(x.id, x.mods)).reduce((a, p2) => a + p2.dps, 0);
  return { name: b.name, dps };
}).sort((a, b) => b.dps - a.dps);
md.push('', '## 相对排序（同一模型内可比）', '', ...ranking.map((r, i) => (i + 1) + '. ' + r.name + ' — ' + r.dps.toFixed(0) + ' DPS'));
md.push('', '## 模型局限（必读）', '',
  '1. 假设角色**满配**（4 技能 Lv5 + 每个 3 个模块），实际第 5 波远达不到，所以绝对秒杀时间偏乐观；',
  '2. 弹幕按“全部命中同一目标”保守估计，实际群怪时会溢出；',
  '3. 范围技能统一按 4 目标，未区分技能半径；',
  '4. 不含道具、角色天赋、难度倍率；',
  '5. 结论只用于**相对排序与找异常**，不作为调数值的唯一依据。');
writeFileSync('reports/build_balance_v2.md', md, 'utf8');
console.log(rows.join('\n'));
for (const w of warn) console.log('WARN ' + w);
