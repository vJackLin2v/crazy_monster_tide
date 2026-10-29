
import { ITEMS, itemNumbers } from '../assets/scripts/data/Items';
import { ATTRS } from '../assets/scripts/data/Attrs';
import { CHARS } from '../assets/scripts/data/Chars';
import { SKILLS } from '../assets/scripts/data/Skills';
import { calcSkill, makeSkill } from '../assets/scripts/game/SkillCalc';
import { freshStats } from '../assets/scripts/game/Stats';

const L: string[] = [];
const p = (s = '') => L.push(s);

p('## 道具重复检测（数值文本完全相同 = 重复）');
p('');
const byText = new Map<string, string[]>();
for (const id of Object.keys(ITEMS) as string[]) {
  const t = itemNumbers((ITEMS as any)[id], id);
  if (!byText.has(t)) byText.set(t, []);
  byText.get(t)!.push(id + '(' + (ITEMS as any)[id].name + ')');
}
let dup = 0;
for (const [t, ids] of byText) {
  if (ids.length > 1) { dup++; p('- ' + t + ' → ' + ids.join(' / ')); }
}
if (!dup) p('（无）');
p('');

p('## 属性边际收益（以骑士为例，1/3/5/8 次叠加后的显示值）');
p('');
const st0 = freshStats(CHARS[0]);
const keys = ['power', 'haste', 'area', 'crit', 'critdmg', 'cdr', 'maxhp', 'speed', 'pickup', 'aoeDmg', 'eliteDmg', 'greed', 'expGain'];
p('| 属性 | 0 | 1 | 3 | 5 | 8 |');
p('|---|---|---|---|---|---|');
for (const k of keys) {
  const a = (ATTRS as any)[k];
  if (!a) continue;
  const row = [0, 1, 3, 5, 8].map(n => a.fmt((st0 as any)[k] + a.step * n));
  p('| ' + a.name + ' | ' + row.join(' | ') + ' |');
}
p('');

p('## 冷却缩减的实际效果（火球 cd 0.85s，急速/冷却各自乘区）');
p('');
const base = makeSkill('fireball');
for (const n of [0, 1, 3, 5, 8, 12]) {
  const st: any = { ...st0 };
  st.cdr = 0.04 * n;
  const st2: any = { ...st0 };
  st2.haste = 1 + 0.08 * n;
  const rt2 = calcSkill(base, st2);
  const st3: any = { ...st0 };
  st3.cdr = 0.04 * n; st3.haste = 1 + 0.08 * n;
  const rt3 = calcSkill(base, st3);
  p('- 冷却缩减 ' + n + ' 次：cd=' + calcSkill(base, st).cd.toFixed(2) + 's ｜ 攻速 ' + n + ' 次：cd=' + rt2.cd.toFixed(2) + 's ｜ 两者都 ' + n + ' 次：cd=' + rt3.cd.toFixed(2) + 's');
}
p('');

p('## 技能一览（伤害/冷却/每秒基础 DPS，不考虑多目标）');
p('');
p('| 技能 | 类型 | 伤害 | 冷却 | 基础 DPS |');
p('|---|---|---|---|---|');
for (const id of Object.keys(SKILLS) as string[]) {
  const s = (SKILLS as any)[id];
  const rt = calcSkill(makeSkill(id), st0);
  p('| ' + s.name + ' | ' + s.type + ' | ' + Math.round(rt.dmg) + ' | ' + rt.cd.toFixed(2) + 's | ' + (rt.dmg / rt.cd).toFixed(1) + ' |');
}
console.log(L.join('\n'));