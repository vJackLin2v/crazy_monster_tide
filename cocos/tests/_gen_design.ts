
import { ITEMS, itemNumbers, ELITE_POOL } from '../assets/scripts/data/Items';
import { SKILLS } from '../assets/scripts/data/Skills';
import { MODULES, MODULE_IDS, MODULE_NUMS, MODULE_HOOKS } from '../assets/scripts/data/Modules';
import { ATTRS } from '../assets/scripts/data/Attrs';
import { CHARS } from '../assets/scripts/data/Chars';
import { ENEMIES, BOSS_UNITS } from '../assets/scripts/data/Enemies';

const L: string[] = [];
const p = (s = '') => L.push(s);

p('# 《疯狂怪潮》设计说明（供外部评审）');
p('');
p('> 自动生成：直接读取项目源码数据表，保证与实际运行一致。');
p('> 游戏：竖屏像素风自动射击 roguelike；玩家只控制走位，4 个主动技能自动开火。');
p('');
p('## 0. 一局的流程');
p('');
p('- 20 波，每波有倒计时，撑到时间结束即过波；每 3 波出精英，第 10 / 20 波是 BOSS。');
p('- 击杀掉经验球（需走到范围拾取）+ 金币；升级弹 3 选 1（技能 / 黑科技 / 道具 / 属性）。');
p('- 波间商店：4 个货位，可买 / 锁定 / 刷新；模块买入后进背包，进下一波前统一安装。');
p('- 4 个技能槽，每技能 3 个黑科技槽；3 个同名黑科技可合成 Ⅱ（效果×2、占 1 槽）。');
p('');
p('## 1. 角色（6 名）');
p('');
p('| id | 名称 | 正向天赋 | 负面代价 | 初始技能 | 基础属性 |');
p('|---|---|---|---|---|---|');
for (const c of CHARS as any[]) {
  const st = Object.entries(c.stats || {}).map(([k, v]) => k + '=' + v).join(', ');
  p('| ' + c.id + ' | ' + c.name + ' | ' + c.pos + ' | ' + c.neg + ' | ' + ((SKILLS as any)[c.start]?.name || '') + ' | ' + st + ' |');
}
p('');
p('## 2. 技能（16 个）');
p('');
p('| id | 名称 | 类型 | 标签 | 伤害 | 冷却(s) | 说明 |');
p('|---|---|---|---|---|---|---|');
for (const id of Object.keys(SKILLS)) {
  const s = (SKILLS as any)[id];
  p('| ' + id + ' | ' + s.name + ' | ' + s.type + ' | ' + (s.tags || []).join('/') + ' | ' + s.dmg + ' | ' + s.cd + ' | ' + (s.desc || '') + ' |');
}
p('');
p('## 3. 黑科技（行为模块，18 个）');
p('');
p('| id | 名称 | 叠加 | 上限 | 数值效果 | 运行落点 | 兼容标签 | 说明 |');
p('|---|---|---|---|---|---|---|---|');
for (const id of MODULE_IDS) {
  const m = (MODULES as any)[id];
  p('| ' + id + ' | ' + m.name + ' | ' + m.stack + ' | ' + m.max + ' | ' + (MODULE_NUMS[id] || '') + ' | '
    + (MODULE_HOOKS[id] || []).join('/') + ' | ' + (m.requires || []).join('/') + ' | ' + m.desc + ' |');
}
p('');
p('> 合成：3 个同名合并为强化版（名称加 Ⅱ），效果 2 份、只占 1 槽，不可再合成。');
p('');
p('## 4. 道具（共 ' + Object.keys(ITEMS).length + ' 件，其中 ' + ELITE_POOL.length + ' 件为高级/精英掉落）');
p('');
p('| id | 名称 | 档次 | 数值效果 | 获取途径 | 人类可读描述 |');
p('|---|---|---|---|---|');
for (const id of Object.keys(ITEMS)) {
  const it = (ITEMS as any)[id];
  const src2 = (ELITE_POOL as string[]).includes(id) ? '精英/BOSS 掉落池' : '商店 / 升级';
  p('| ' + id + ' | ' + it.name + ' | ' + (it.tier === 2 ? '高级' : '普通') + ' | ' + itemNumbers(it, id) + ' | ' + src2 + ' | ' + it.desc + ' |');
}
p('');
p('## 5. 属性（24 项，升级可叠加；基准=角色开局值，非全表 base）');
p('');
p('| id | 名称 | 基础 | 每次 | 显示 | 说明 |');
p('|---|---|---|---|---|---|');
for (const id of Object.keys(ATTRS)) {
  const a = (ATTRS as any)[id];
  const fmt = (v: number) => { try { return a.fmt(v); } catch { return String(v); } };
  const num = (s: string) => { const m = s.match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
  const shownBase = fmt(a.base);
  const shownNext = fmt(a.base + a.step);
  const suffix = shownNext.replace(/-?\d+(?:\.\d+)?/, '').trim();
  const dv = num(shownNext) - num(shownBase);
  const stepTxt = (dv > 0 ? '+' : '') + (Math.round(dv * 10) / 10) + (suffix ? (suffix.startsWith('%') ? suffix : ' ' + suffix) : '');
  p('| ' + id + ' | ' + a.name + ' | ' + shownBase + ' | ' + stepTxt + ' | ' + shownNext + ' | ' + (a.desc || '') + ' |');
}
p('');
p('## 6. 敌人');
p('');
p('| id | 单位 | HP | 速度 | 伤害 | 半径 | 经验 | 金币 | 出现波次 | 备注 |');
p('|---|---|---|---|---|---|---|---|---|---|');
for (const id of Object.keys(ENEMIES)) {
  const e = (ENEMIES as any)[id];
  p('| ' + id + ' | ' + e.unit + ' | ' + e.hp + ' | ' + e.spd + ' | ' + e.dmg + ' | ' + e.r + ' | ' + e.exp + ' | ' + e.gold + ' | ' + (e.from ?? '-') + ' | ' + (e.boss ? 'BOSS' : e.elite ? '精英' : '') + ' |');
}
p('');
p('BOSS 轮换：' + BOSS_UNITS.join(' / '));
p('');
p('## 7. 请评审者重点回答');
p('');
p('1. 道具之间是否存在明显冗余 / 谁永远不值得选？');
p('2. 黑科技的数值与代价是否匹配（例如 扇射 +2 发 ×55% 伤害 vs 加量 +1 发 ×100%）？');
p('3. 技能同质化程度：16 个技能里哪些定位重叠？');
p('4. 属性成长曲线是否合理（每次升级的边际收益）？');
p('5. 是否有明显的唯一正确解或必选组合？');
p('6. 建议的改法（具体到数值与规则），以及理由。');
p('');
console.log(L.join('\n'));