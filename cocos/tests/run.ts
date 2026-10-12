/**
 * 逻辑层单测（不需要 Cocos 编辑器）
 *  运行： npx tsx tests/run.ts        或   npm test
 *
 * 覆盖重点：
 *  1. D-13 回归：角色倍率不能被当成绝对值（移速/拾取）
 *  2. 行为模块叠加规则（additive / tier / 上限）
 *  3. 奖励池：4 类奖励、3 选 1、技能满了要替换
 *  4. 替换不让玩家损失（模块退回背包）
 *  5. 商店：固定 4 货位 / 购买后不消失 / 锁定刷新不掉 / 跨波携带
 *  6. 确定性：同 seed 同结果
 *  7. 波次规则：BOSS 波 / 精英波 / 无尽
 */
import { RunState } from '../assets/scripts/game/RunState';
import { calcSkill, makeSkill, canInstall, MAX_SLOTS } from '../assets/scripts/game/SkillCalc';
import { assertStatsSane, freshStats } from '../assets/scripts/game/Stats';
import { CHARS } from '../assets/scripts/data/Chars';
import { RUN, waveTime, isBossWave, isEliteWave, eliteCount, BASE_SPEED, SHOP_SLOTS } from '../assets/scripts/core/Const';
import { ENEMIES, enemyPool } from '../assets/scripts/data/Enemies';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

console.log('\n== 1. D-13 回归：角色倍率不能被当成绝对值 ==');
for (const c of CHARS) {
  const s = freshStats(c);
  const errs = assertStatsSane(s);
  ok(errs.length === 0, `${c.name} 属性合理（移速 ${Math.round(s.speed)} px/s，拾取 ${Math.round(s.pickup)}）` + (errs.length ? ' → ' + errs.join('；') : ''));
}
ok(Math.abs(freshStats(CHARS[0]).speed - BASE_SPEED * 0.9) < 0.01, '骑士 = 基础移速 x 0.90 倍率');
ok(Math.abs(freshStats(CHARS[2]).pickup - 85 * 1.5) < 0.01, '游侠拾取 = 基础 x 1.5 倍率');

console.log('\n== 2. 行为模块叠加规则 ==');
{
  const st = freshStats(CHARS[0]);
  const base = calcSkill(makeSkill('fireball'), st);
  ok(base.count === 1, '初始投射物数量 1');

  const s2 = makeSkill('fireball'); s2.mods = ['multi'];
  ok(calcSkill(s2, st).count === 2, '多重 x1 → 数量 2');
  const s3 = makeSkill('fireball'); s3.mods = ['multi', 'multi'];
  ok(calcSkill(s3, st).count === 3, '多重 x2 → 数量 3（可重复安装）');

  const s4 = makeSkill('fireball'); s4.mods = ['giant'];
  ok(Math.abs(calcSkill(s4, st).size / base.size - 1.3) < 0.001, '巨大 x1 → 体积 x1.30');

  const s5 = makeSkill('fireball'); s5.mods = ['rapid', 'rapid'];
  const c5 = calcSkill(s5, st), c0 = calcSkill(makeSkill('fireball'), st);
  ok(Math.abs(c5.cd / c0.cd - 0.88 * 0.88) < 0.001, '急速 x2 → 冷却 x0.88²（乘区叠加）');

  const s6 = makeSkill('fireball'); s6.mods = ['overload'];
  const c6 = calcSkill(s6, st);
  ok(Math.abs(c6.dmg / base.dmg - 1.25) < 0.001, '超载 → 伤害 +25%');
  ok(c6.size < base.size, '超载 → 范围 -10%（有代价，不是纯赚）');

  const s7 = makeSkill('fireball'); s7.mods = ['burn'];
  ok(calcSkill(s7, st).burn === 1, '灼烧 → burn 标志生效');
}
ok(!canInstall(Object.assign(makeSkill('fireball'), { mods: ['multi','multi','multi','multi'] }), 'multi').ok, '多重的数量上限生效（max=4）');
ok(canInstall(makeSkill('fireball'), 'multi').ok && !canInstall(makeSkill('fireball'), 'burst' as string).ok, '兼容性判定：多重可装 / 未知模块不可装');

console.log('\n== 3. 奖励池 ==');
{
  const rs = new RunState('knight', 20261012);
  const kinds = new Set<string>();
  for (let i = 0; i < 30; i++) rs.rollRewards().forEach(r => kinds.add(r.kind));
  ok(kinds.size >= 3, '奖励池覆盖多类：' + [...kinds].join('/'));
  const r1 = rs.rollRewards();
  ok(r1.length === 3, '每次 3 选 1（实际 ' + r1.length + '）');
  const uniq = new Set(r1.map(r => r.kind + ':' + r.id));
  ok(uniq.size === r1.length, '同一次 3 张卡不重复');
}
{
  const rs = new RunState('knight', 7);
  rs.skills = ['fireball','ice_spear','arcane','shockwave'].map(makeSkill);
  let sawReplace = false;
  for (let i = 0; i < 60; i++) if (rs.rollRewards().some(r => r.needReplace)) { sawReplace = true; break; }
  ok(sawReplace, '技能满 4 个时会给出「需替换」的新技能');
}

console.log('\n== 4. 替换不让玩家损失 ==');
{
  const rs = new RunState('knight', 1);
  rs.skills = [makeSkill('fireball'), makeSkill('ice_spear'), makeSkill('arcane'), makeSkill('shockwave')];
  rs.skills[0].mods = ['multi', 'pierce'];
  rs.modsBag = [];
  const back = rs.replaceSkill(0, 'blade');
  ok(rs.skills[0].id === 'blade', '技能已替换为 blade');
  ok(back.length === 2 && rs.modsBag.length === 2, '被替换技能上的 2 个模块退回背包（不损失）');
}
{
  const rs = new RunState('knight', 1);
  rs.skills[0].mods = ['multi', 'multi', 'pierce'];   // 3 槽塞满
  rs.modsBag = ['giant'];
  const r = rs.installAt(0, 0, 'giant');
  ok(rs.skills[0].mods[0] === 'giant', '槽位替换：giant 顶掉了第 1 槽');
  ok(r.replaced === 'multi' && rs.modsBag.includes('multi'), '被顶掉的 multi 退回背包');
  ok(!rs.modsBag.includes('giant'), '装上去的 giant 从背包移除');
}

console.log('\n== 5. 商店（固定货位 / 购买不消失 / 锁定） ==');
{
  const rs = new RunState('knight', 99);
  rs.wave = 3;
  rs.refreshShop(false);
  ok(rs.shopStock?.length === SHOP_SLOTS, `固定 ${SHOP_SLOTS} 个货位`);
  ok(rs.shopStock!.every(s => s.price > 0), '每个货位都有价格');

  rs.gold = 500;
  const before = rs.shopStock!.length;
  const buy = rs.buySlot(0);
  ok(buy.ok, '购买成功');
  ok(rs.shopStock!.length === before, '★ 购买后货位数量不变（不消失）');
  ok(rs.shopStock![0].sold === true, '该货位置为已购买');
  ok(!rs.buySlot(0).ok, '已购买的货位不能重复买');

  const id1 = rs.shopStock![1].id;
  rs.toggleLock(1);
  ok(rs.rerollShop(), '刷新成功');
  ok(rs.shopStock![1].id === id1 && rs.shopStock![1].locked, '★ 锁定的货位刷新后仍在');

  rs.carryLockedToNextWave();
  const carried = rs.carryOver.length;
  ok(carried >= 1, '锁定的货位被带到下一波（' + carried + ' 件）');
  rs.shopStock = null;
  rs.refreshShop(false);
  ok(rs.shopStock!.some(s => s.id === id1), '下一波商店里能看到带过来的锁定货');
}

console.log('\n== 6. 确定性与波次规则 ==');
{
  const a = new RunState('mage', 4242), b = new RunState('mage', 4242);
  const ra = JSON.stringify(a.rollRewards()), rb = JSON.stringify(b.rollRewards());
  ok(ra === rb, '同 seed → 同奖励组：' + ra);
  const sa = new RunState('mage', 4242), sb = new RunState('mage', 4242);
  sa.wave = 5; sb.wave = 5; sa.refreshShop(false); sb.refreshShop(false);
  ok(JSON.stringify(sa.shopStock) === JSON.stringify(sb.shopStock), '同 seed → 同商店货架');
}
ok(isBossWave(10) && isBossWave(20) && !isBossWave(9), 'BOSS 波在 10 / 20');
ok(isEliteWave(3) && !isEliteWave(10), '精英波每 3 波一次，且 BOSS 波不出精英');
ok(eliteCount(11) === 1 && eliteCount(12) === 2, '第 12 波起精英出 2 只');
ok(waveTime(1) === 18 && waveTime(20) === 36, `波次时长 18s → 36s（实测 ${waveTime(1)} → ${waveTime(20)}）`);
ok(enemyPool(1).join(',') === 'goblin', '第 1 波只有哥布林（新手保护）');
ok(enemyPool(3).includes('wolf'), '第 3 波解锁狼');
{
  const fastest = Math.max(...Object.values(ENEMIES).filter(e => !e.boss && !e.elite).map(e => e.spd));
  ok(fastest < BASE_SPEED, `最快怪 ${fastest} px/s < 玩家 ${BASE_SPEED} px/s（可躲是硬条件）`);
}
{
  const rs = new RunState('knight', 1);
  for (let i = 0; i < RUN.waves; i++) rs.nextWave();
  ok(rs.nextWave() === -1, '打通 20 波后默认结算');
  rs.endless = true;
  ok(rs.nextWave() === 21, '选择继续则进入第 21 波（无尽）');
}

console.log('\n================ 结果 ================');
console.log(`PASS ${pass} / FAIL ${fail}`);
process.exit(fail ? 1 : 0);
