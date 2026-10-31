/**
 * 构筑平衡解析模型（tools/analysis/build_balance.ts）
 *
 * ⚠️ 这是**解析推导**，不是真机实测：
 *    - 用 calcSkill 算技能在给定属性下的实际伤害/冷却；
 *    - 假设「单体命中 1 次」「AoE 命中 4 个」；
 *    - 怪物血量用 waveScale（与游戏一致）；
 * 目的：找出明显过强/过弱的构筑与技能，而不是给出精确 DPS。
 */
import { writeFileSync } from 'fs';
import { CHARS } from '../../cocos/assets/scripts/data/Chars';
import { calcSkill } from '../../cocos/assets/scripts/game/SkillCalc';
import { freshStats } from '../../cocos/assets/scripts/game/Stats';
import { waveScale } from '../../cocos/assets/scripts/game/Combat';

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
  { name: '召唤流', skills: [{ id: 'sentry', mods: ['multi', 'rapid', 'snipe'] }, { id: 'fireball', mods: ['multi'] }, { id: 'chain', mods: ['chain'] }, { id: 'ice_spear', mods: ['pierce'] }] },
  { name: '蓄能爆破', skills: [{ id: 'charge_pulse', mods: ['overload', 'giant', 'echo'] }, { id: 'shockwave', mods: ['giant'] }, { id: 'meteor', mods: ['giant'] }, { id: 'fireball', mods: ['multi'] }] },
  { name: '弹幕海', skills: [{ id: 'fireball', mods: ['multi', 'fan', 'split'] }, { id: 'ice_spear', mods: ['multi', 'pierce'] }, { id: 'chain', mods: ['multi'] }, { id: 'blade', mods: ['multi'] }] },
];

const CHAR = CHARS[0];
const ST = freshStats(CHAR);

function skillSingleDps(id: string, mods: string[]): { dps: number; rt: ReturnType<typeof calcSkill> } {
  const sk = { id, lvl: 5, mods };
  const rt = calcSkill(sk as never, ST);
  const perCast = rt.dmg * Math.max(1, rt.count) * (1 + rt.fan * 0.6);
  return { dps: perCast / Math.max(0.15, rt.cd), rt };
}

function aoeDps(id: string, mods: string[]): number {
  const { dps } = skillSingleDps(id, mods);
  return dps * 4;
}

const waves = [5, 10, 15, 20];
const rows: string[] = [];
rows.push('| 构筑 | ' + waves.map(w => 'W' + w + ' 单体 DPS / 秒杀1只').join(' | ') + ' |');
rows.push('|---|' + waves.map(() => '---').join('|') + '|');
const warn: string[] = [];
for (const b of BUILDS) {
  const cells: string[] = [];
  for (const w of waves) {
    const dps = b.skills.reduce((a, s) => a + skillSingleDps(s.id, s.mods).dps, 0);
    const hp = 20 * waveScale(w).hp;
    const ttk = hp / Math.max(1, dps);
    if (w === 20 && ttk > 6) warn.push(b.name + '：W20 单体秒杀 ' + ttk.toFixed(1) + 's（偏弱）');
    if (w === 5 && ttk < 0.35) warn.push(b.name + '：W5 秒杀 ' + ttk.toFixed(2) + 's（偏强）');
    cells.push(dps.toFixed(0) + ' / ' + ttk.toFixed(2) + 's');
  }
  rows.push('| ' + b.name + ' | ' + cells.join(' | ') + ' |');
}

const md = [
  '# 构筑平衡解析（build_balance_v2）',
  '',
  '> ⚠️ 解析模型，不是真机实测：单体按 1 次命中、AoE 按 4 目标估算；怪物血量用 waveScale。',
  '> 用途是找"明显过强/过弱"，不是精确数值。',
  '',
  '## 单体 DPS 与"秒杀一只普通怪"所需时间',
  '',
  ...rows,
  '',
  '## 告警',
  '',
  ...(warn.length ? warn.map(w => '- ' + w) : ['- 无明显异常']),
  '',
  '## 结论',
  '',
  '- 若 W20 单体秒杀 > 6s，说明该构筑在后期清不动小怪，需要加强核心技能或降低怪物血量成长；',
  '- 若 W5 秒杀 < 0.35s，说明前期过强，建议降低初始伤害或提高第 1~5 波血量。',
].join('\n');

writeFileSync('reports/build_balance_v2.md', md, 'utf8');
console.log('written reports/build_balance_v2.md');
for (const line of rows) console.log(line);
for (const w of warn) console.log('WARN ' + w);
