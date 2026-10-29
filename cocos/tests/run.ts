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
import { calcSkill, makeSkill, canInstall } from '../assets/scripts/game/SkillCalc';
import { MODULES, MODULE_IDS, MODULE_HOOKS, MODULE_NUMS } from '../assets/scripts/data/Modules';
import { assertStatsSane, freshStats, emptyStats } from '../assets/scripts/game/Stats';
import { CHARS } from '../assets/scripts/data/Chars';
import { RUN, waveTime, isBossWave, isEliteWave, eliteCount, BASE_SPEED, BASE_PICKUP, SHOP_SLOTS } from '../assets/scripts/core/Const';
import { ENEMIES, enemyPool, BOSS_UNITS, bossUnitFor } from '../assets/scripts/data/Enemies';
import { ATTRS } from '../assets/scripts/data/Attrs';
import { UNIT_FRAMES } from '../assets/scripts/data/UnitFrames';
import { ITEMS, ELITE_POOL, itemNumbers } from '../assets/scripts/data/Items';
import { CS, pageCount, cellPos, gridBottom, detailBox, detailRows, portraitFit } from '../assets/scripts/ui/CharLayout';
import { SKILLS, SKILL_ART } from '../assets/scripts/data/Skills';
import { VFX_FRAMES } from '../assets/scripts/data/VfxFrames';
import { ACHIEVEMENTS, achViews, newlyUnlocked, applyUnlocks } from '../assets/scripts/game/Achievements';
import { defaultSave } from '../assets/scripts/game/Progress';
import { balance, balanceOverride, balanceReset, DEFAULT_BALANCE } from '../assets/scripts/core/Balance';
import { telemetryStart, telemetryWaveEnd, telemetryRunEnd, listRuns, summarize } from '../assets/scripts/game/Telemetry';
import type { SaveData } from '../assets/scripts/game/Progress';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

console.log('\n== 1. D-13 回归：角色倍率不能被当成绝对值 ==');
for (const c of CHARS) {
  const s = freshStats(c);
  const errs = assertStatsSane(s);
  ok(errs.length === 0, `${c.name} 属性合理（移速 ${Math.round(s.speed)} px/s，拾取 ${Math.round(s.pickup)}）` + (errs.length ? ' → ' + errs.join('；') : ''));
}
ok(Math.abs(freshStats(CHARS[0]).speed - BASE_SPEED * 0.9) < 0.01, '骑士 = 基础移速 x 0.90 倍率');
ok(Math.abs(freshStats(CHARS[2]).pickup - BASE_PICKUP * 1.5) < 0.01, '游侠拾取 = 基础 x 1.5 倍率（基础 ' + BASE_PICKUP + '）');

// M50：每个黑科技都必须有运行时落点，且声明 calc 的模块真的会改动结算
{
  const st = freshStats(CHARS[0]);
  const missing = MODULE_IDS.filter(id => !MODULE_HOOKS[id] || !MODULE_HOOKS[id].length);
  ok(missing.length === 0, '每个黑科技都有运行时落点（缺失：' + (missing.join(',') || '无') + '）');
  const noNums = MODULE_IDS.filter(id => !MODULE_NUMS[id]);
  ok(noNums.length === 0, '每个黑科技都有数值说明（缺失：' + (noNums.join(',') || '无') + '）');
  const skillFor = (id: string) => {
    const req = MODULES[id].requires as unknown as string[];
    return Object.keys(SKILLS).find(k => (SKILLS[k].tags as unknown as string[]).some(tag => req.includes(tag)));
  };
  const noEffect: string[] = [];
  for (const id of MODULE_IDS) {
    if (!MODULE_HOOKS[id].includes('calc')) continue;
    const skId = skillFor(id);
    if (!skId) { noEffect.push(id + '(无兼容技能)'); continue; }
    const base = calcSkill(makeSkill(skId), st);
    const withMod = calcSkill({ ...makeSkill(skId), mods: [id] }, st);
    const changed = Object.keys(base).some(k => JSON.stringify((base as unknown as Record<string, unknown>)[k]) !== JSON.stringify((withMod as unknown as Record<string, unknown>)[k]));
    if (!changed) noEffect.push(id);
  }
  ok(noEffect.length === 0, '声明 calc 的黑科技都真的改动了结算（无效果：' + (noEffect.join(',') || '无') + '）');
}

console.log('\n== 2. 行为模块叠加规则 ==');
{
  const st = freshStats(CHARS[0]);
  const base = calcSkill(makeSkill('fireball'), st);
  ok(base.count === 1, '初始投射物数量 1');
  // M30 #1：扇射只改 fan，实际发数 = count + fan*2（在 Battle.fireSkill 里结算）
  ok(calcSkill({ ...makeSkill('fireball'), mods: ['fan'] }, st).fan === 1, '扇射 → fan=1（施放发数 = count + fan×2）');

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
{
  // M30 #5：Build 面板重新分配「已经装在技能上」的模块（背包空也要能做，且不损失）
  const rs = new RunState('knight', 1);
  rs.skills = [makeSkill('fireball'), makeSkill('ice_spear')];
  rs.skills[0].mods = ['pierce', 'giant'];
  rs.modsBag = [];
  ok(rs.moveMod(0, 0, 1, 0) === true, '跨技能搬模块：火球 → 冰晶矛');
  ok(rs.skills[0].mods.length === 1 && rs.skills[0].mods[0] === 'giant', '源技能只剩 giant');
  ok(rs.skills[1].mods[0] === 'pierce', '目标技能拿到了 pierce');
  ok(rs.modsBag.length === 0, '背包不变（是直接搬，不是退回背包）');
  // 目标槽已占用 -> 交换，谁也不丢
  const rs2 = new RunState('knight', 1);
  rs2.skills = [makeSkill('fireball'), makeSkill('ice_spear')];
  rs2.skills[0].mods = ['pierce'];
  rs2.skills[1].mods = ['multi'];                      // 两个都满足 projectile 标签，可互换
  const swapped = rs2.moveMod(0, 0, 1, 0);
  ok(swapped && rs2.skills[0].mods[0] === 'multi' && rs2.skills[1].mods[0] === 'pierce', '目标已占用时交换（不损失）');
}
{
  // M32：3 个同名模块 → 1 个「II」强化（效果 ×2、只占 1 槽；强化不再参与合成）
  const rs = new RunState('knight', 1);
  rs.skills = [makeSkill('fireball')];
  rs.modsBag = ['pierce', 'pierce', 'pierce', 'giant'];
  ok(rs.mergeReady('pierce') === 1, '3 个穿透 = 可合成 1 次');
  ok(rs.mergeModule('pierce') === true, '合成成功');
  ok(rs.modsBag.filter(x => x === 'pierce').length === 0 && rs.modsBag.includes('pierce_2'), '3 个基础模块换成 1 个 pierce_2');
  ok(rs.mergeReady('pierce') === 0, '强化模块不能再合成（封顶 ×2）');
  ok(rs.mergeModule('pierce') === false, '凑不满 3 个时合成失败（不会吞模块）');
  rs.skills[0].mods = ['pierce_2'];
  ok(calcSkill(rs.skills[0], freshStats(CHARS[0])).pierce === 2, '强化穿透 = 2 份效果，但只占 1 个槽');
  ok(rs.moveMod(0, 0, 0, 0) === false, '同一槽移到自己身上 = 无操作');
  // 反例：目标技能不兼容 -> 拒绝，谁都不动
  const rs3 = new RunState('knight', 1);
  rs3.skills = [makeSkill('fireball'), makeSkill('blade_storm')];
  rs3.skills[0].mods = ['pierce'];
  rs3.skills[1].mods = ['giant'];
  ok(rs3.moveMod(0, 0, 1, 1) === false && rs3.skills[0].mods[0] === 'pierce', '目标技能不兼容时拒绝移动（不乱丢模块）');
}

console.log('')
console.log('== 4b. 属性数量 + 是否真的进结算（需求 §10） ==')
{
  ok(Object.keys(ATTRS).length === 24, '核心属性 24 个（实际 ' + Object.keys(ATTRS).length + '）');
  ok(ATTRS.pierce !== undefined && ATTRS.cdr !== undefined && ATTRS.lifesteal !== undefined,
     '新增属性已在数据表里');
  const st = emptyStats();
  const c0 = calcSkill(makeSkill('fireball'), st);
  st.cdr = 0.3; st.count = 2; st.pierce = 2;
  const c1 = calcSkill(makeSkill('fireball'), st);
  ok(c1.cd < c0.cd, '★ 冷却缩减生效（' + c0.cd.toFixed(2) + 's → ' + c1.cd.toFixed(2) + 's）');
  ok(c1.count === c0.count + 2, '★ 多重生效（' + c0.count + ' → ' + c1.count + '）');
  ok(c1.pierce === c0.pierce + 2, '★ 穿透生效（' + c0.pierce + ' → ' + c1.pierce + '）');
}

console.log('')
console.log('')
console.log('== 4d. BOSS 数量 + 帧清单 ==')
{
  ok(BOSS_UNITS.length >= 5 && BOSS_UNITS.length <= 6, 'BOSS 数量 5~6（实际 ' + BOSS_UNITS.length + '）');
  ok(BOSS_UNITS.every(u => !!UNIT_FRAMES[u]), '每个 BOSS 都在帧清单里');
  ok(BOSS_UNITS.every(u => (UNIT_FRAMES[u].idle ?? 0) > 0 && (UNIT_FRAMES[u].death ?? 0) > 0),
     '每个 BOSS 都有 idle + death 帧');
  ok(bossUnitFor(10) !== bossUnitFor(20), '第 10 / 20 波是不同 BOSS');
}

console.log('== 4c. 道具数量（需求 §10：50 普通 + 20 高级） ==')
{
  const ids = Object.keys(ITEMS);
  const t1 = ids.filter(k => ITEMS[k].tier === 1).length;
  const t2 = ids.filter(k => ITEMS[k].tier === 2).length;
  ok(ids.length === 70, '道具共 70 个（实际 ' + ids.length + '）');
  ok(t1 === 50, '普通道具 50 个（实际 ' + t1 + '）');
  ok(t2 === 20, '高级道具 20 个（实际 ' + t2 + '）');
  ok(ELITE_POOL.every(k => ITEMS[k] && ITEMS[k].tier === 2), '精英掉落池里全是高级道具');
  // M43：道具详情的数值说明（从 apply 反推）
  ok(itemNumbers(ITEMS.power_s, 'power_s') === '攻击力 +8%', '数值说明：铁匠手套 = 攻击力 +8%');
  ok(itemNumbers(ITEMS.speed_l, 'speed_l').indexOf('移动速度 +14%') === 0, '数值说明：移速类按百分比显示');
  ok(itemNumbers(ITEMS.t_fire, 't_fire') === '火系技能伤害 +25%', '数值说明：余烬核心 = 火系技能伤害 +25%');
  ok(itemNumbers(ITEMS.dragon, 'dragon').indexOf('生命上限 +40') === 0, '数值说明：巨龙之心含「生命上限 +40」');
  // 抽一个道具验证它真的改属性
  const st = emptyStats();
  const before = st.power;
  ITEMS.power_l.apply(st);
  ok(st.power > before, '★ 道具生效（攻击力 ' + before.toFixed(2) + ' → ' + st.power.toFixed(2) + '）');
}

console.log('\n== 4e. 角色选择布局（3 列 / 一页 6 个 / 立绘按格子自适应） ==');
{
  ok(CHARS.length === 6, '角色 6 个（实际 ' + CHARS.length + '）');
  ok(pageCount(CHARS.length) === 1 && CS.PER_PAGE === 6, '6 个角色 → 1 页放得下（每屏 ' + CS.PER_PAGE + ' 个）');

  // 立绘按「裁掉透明留白后的内容尺寸」整数倍放大：13×15 → 6 倍 = 78×90
  const k1 = portraitFit(13, 15), k2 = portraitFit(17, 25);
  // M1 视觉升级：卡片 124→90 高，立绘目标高度 90→60（仍占卡高 2/3，把空间让给详情）
  ok(k1.k === 4 && k1.w === 52 && k1.h === 60, '13×15 立绘 → 4 倍 = 52×60（卡高 90 的 2/3）');
  ok(k2.k === 2 && k2.w === 34 && k2.h === 50, '17×25 骑乘立绘 → 2 倍 = 34×50');
  const allFit = [[13, 15], [14, 15], [12, 14], [17, 25]].every(([w, h]) => {
    const f = portraitFit(w, h);
    return f.w <= CS.CARD_W - 12 && f.h <= CS.PORTRAIT && f.k >= 1;
  });
  ok(allFit, '所有立绘都在格子可用区（≤ ' + Math.floor(CS.CARD_W - 12) + ' × ' + CS.PORTRAIT + '）');

  // 立绘 + 姓名必须在格子内，且互不压（3px 描边内缩）
  const innerH = CS.CARD_H / 2 - 3;
  const pTop = CS.PORTRAIT_DY + CS.PORTRAIT / 2;
  const pBot = CS.PORTRAIT_DY - CS.PORTRAIT / 2;
  const lTop = CS.NAME_DY + 10;
  const lBot = CS.NAME_DY - 10;
  ok(pTop <= innerH + 0.01 && pBot >= -innerH - 0.01, '立绘在格子内（上留白 ' + Math.round(innerH - pTop) + 'px）');
  ok(pBot - lTop >= 1.5 && lBot >= -innerH - 0.01, '姓名在立绘下方且不出格子（间隔 ' + (pBot - lTop).toFixed(0) + 'px）');

  let inX = true, inY = true;
  for (let s = 0; s < CS.PER_PAGE; s++) {
    const p = cellPos(s);
    if (p.x - CS.CARD_W / 2 < CS.MARGIN_X - 0.01 || p.x + CS.CARD_W / 2 > 360 - CS.MARGIN_X + 0.01) inX = false;
    if (p.cy + CS.CARD_H / 2 > gridBottom() + 0.01) inY = false;
  }
  ok(inX && inY, '一页 6 格都落在 12~348 的安全区内');
  ok(cellPos(0).cy - CS.CARD_H / 2 >= CS.GRID_TOP - 0.01, '第一行格子不压标题（网格顶边 ' + CS.GRID_TOP + '）');
  ok(Math.abs(cellPos(0).x + cellPos(2).x - 360) < 0.01, '3 列关于屏幕中线对称');

  for (const vh of [640, 760, 844]) {
    const box = detailBox(vh);
    const dr = detailRows(box.height);
    const half = box.height / 2;
    const fits = (r: { y: number; h: number }) => Math.abs(r.y) + r.h / 2 <= half + 0.5;
    ok(fits(dr.name) && fits(dr.pos) && fits(dr.neg) && fits(dr.skill) && fits(dr.stat),
       'VH ' + vh + '：详情 ' + Math.round(box.height) + 'px ' + (dr.compact ? '紧凑' : '完整') + '排版，内容全在面板内');
    ok(box.top > gridBottom() && box.top + box.height < vh - 65,
       'VH ' + vh + '：详情面板夹在网格与底部按钮之间（' + box.top + ' → ' + Math.round(box.top + box.height) + '）');
    // ⚠️ 用户反馈「角色格子和详情面板边框重叠」：缝隙必须够，否则 3px 描边会糊在一起
    ok(box.top - gridBottom() >= 10, 'VH ' + vh + '：网格与详情面板之间留 ' + Math.round(box.top - gridBottom()) + 'px 缝（≥10）');
  }

  const noOverlap = [640, 700, 760, 844].every(vh => {
    const dr = detailRows(detailBox(vh).height);
    const items = [
      { y: dr.name.y, halfH: dr.name.size / 2 },
      { y: dr.pos.y, halfH: dr.pos.size / 2 },
      { y: dr.neg.y, halfH: dr.neg.size / 2 },
      { y: dr.skill.y, halfH: dr.skill.h / 2 },
      { y: dr.stat.y, halfH: dr.stat.h / 2 },   // stat 现在是 2×3 属性网格块
    ];
    for (let i = 0; i + 1 < items.length; i++) {
      if (items[i].y - items[i + 1].y < items[i].halfH + items[i + 1].halfH - 0.6) return false;
    }
    return true;
  });
  ok(noOverlap, '详情五行互不压字（VH 640 / 700 / 760 / 844）');
}

console.log('\n== 4f. 技能视觉与描述一致（用户反馈「灵能箭射出来是个球」） ==');
{
  // 1) 所有引用的 VFX key 必须真实存在（打错一个字就静默变成空特效）
  const missing: string[] = [];
  for (const [id, a] of Object.entries(SKILL_ART)) {
    for (const k of [a.proj, a.hit, a.aoe, a.zone, a.cast, a.swing]) {
      if (k && VFX_FRAMES[k] === undefined) missing.push(id + ':' + k);
    }
  }
  ok(missing.length === 0, '16 个技能的 VFX key 全在 VfxFrames 表里' + (missing.length ? ' → ' + missing.join(', ') : ''));

  // 2) 不许再用「圆球」当弹道（灵能箭/圣光弹/回旋刃 原本都是 arcane-orb）
  const BALL = new Set(['projectile/arcane/arcane-orb', 'projectile/arcane/homing-orb']);
  const balls = Object.entries(SKILL_ART).filter(([, a]) => a.proj && BALL.has(a.proj)).map(([id]) => id);
  ok(balls.length === 0, '没有弹道技能再用圆球素材' + (balls.length ? ' → ' + balls.join(', ') : ''));

  // 3) 形状要对得上名字
  ok(SKILL_ART.spirit.proj === 'projectile/lightning/energy-bolt', '灵能箭 = 细长带尾的 bolt（不再是球）');
  ok(SKILL_ART.holybolt.proj === 'projectile/lightning/plasma-shot', '圣光弹 = 光弹（不再是球）');
  ok(SKILL_ART.blade.proj === 'melee/slash/wide-cleave', '回旋刃 = 月牙刃光（不再是球）');

  // 4) 区域技能要有施法动作（用户反馈「刃爆看不出施法，直接作用到敌人身上」）
  ok(!!SKILL_ART.blade_storm.cast && !!SKILL_ART.blade_storm.swing, '刃暴有施法动作（cast + swing）');
  const areaIds = Object.keys(SKILLS).filter(id => SKILLS[id].type === 'area');
  ok(areaIds.length > 0 && areaIds.every(id => !!SKILL_ART[id] && !!SKILL_ART[id].cast), 
     '所有区域技能都有起手动作（' + areaIds.join('/') + '）');
}

console.log('\n== 5. 商店（固定货位 / 购买不消失 / 锁定） ==');
{
  const rs = new RunState('knight', 99);
  rs.wave = 3;
  rs.refreshShop(false);
  ok(rs.shopStock?.length === SHOP_SLOTS, `固定 ${SHOP_SLOTS} 个货位`);
  ok(rs.shopStock!.every(s => s.price > 0), '每个货位都有价格');
  // 回归：refreshShop 漏了把抽到的 id 记进 used → 4 个货位会刷成同一件商品
  const slotIds = rs.shopStock!.map(s => s.kind + ':' + s.id);
  ok(new Set(slotIds).size === slotIds.length, '★ 4 个货位互不重复（' + slotIds.join(' / ') + '）');

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

console.log('\n== 5f. 成就系统（纯逻辑） ==');
{
  const mk = (o: Partial<SaveData> = {}): SaveData => ({ ...defaultSave(), ...o });
  const fresh = mk();
  ok(achViews(fresh).length === ACHIEVEMENTS.length, '成就定义 ' + ACHIEVEMENTS.length + ' 条，视图一一对应');
  ok(achViews(fresh).every(v => !v.done && v.cur === 0), '全新区间：全部未解锁、进度 0');

  const s1 = mk({ runs: 1, kills: 150, bestWave: 10 });
  const n1 = newlyUnlocked(s1);
  ok(n1.includes('first_run') && n1.includes('kills_100') && n1.includes('wave_10'), '达标的三条被识别');
  ok(!n1.includes('kills_1000') && !n1.includes('wave_20') && !n1.includes('win_1'), '未达标的不会被误解锁');
  ok(applyUnlocks(s1) === true && s1.ach.length === 3, 'applyUnlocks 写入 3 条');
  ok(applyUnlocks(s1) === false, '重复调用不再新增（幂等）');
  ok(achViews(s1).filter(v => v.done).length === 3, '视图里 3 条已完成');

  const s2 = mk({ kills: 100 });
  ok(applyUnlocks(s2) && s2.ach.includes('kills_100'), '边界：正好达标即解锁');
  ok(achViews(mk({ kills: 99999 })).find(v => v.def.id === 'kills_1000')!.cur === 1000, '进度按 target 截断，不溢出');
}

console.log('\n== 5g. 数值表与战斗日志（纯逻辑） ==');
{
  // 数值表：默认值可读、局部覆盖只改目标字段、reset 回到默认
  ok(balance().spawn.batchMax === DEFAULT_BALANCE.spawn.batchMax, '默认数值表可读（batchMax=' + DEFAULT_BALANCE.spawn.batchMax + '）');
  const before = balance().shop.modBase;
  balanceOverride({ shop: { modBase: before + 5 } });
  ok(balance().shop.modBase === before + 5, '局部覆盖生效（只改 modBase）');
  ok(balance().spawn.batchMax === DEFAULT_BALANCE.spawn.batchMax, '覆盖不影响其它分组');
  balanceReset();
  ok(balance().shop.modBase === before, 'reset 后恢复默认');

  // 日志：没有 localStorage 时不能崩，且空数据可汇总
  let threw = false;
  try {
    telemetryStart('knight', 1);
    telemetryWaveEnd({ wave: 1, kills: 10, lv: 2, gold: 20, aliveMax: 6, hp: 50, dmgTaken: 12 });
    telemetryRunEnd({ end: 'dead', deathWave: 1, kills: 10, maxAlive: 6, dmgTaken: 12, durSec: 18 });
  } catch { threw = true; }
  ok(!threw, '日志 API 在无 localStorage 环境下不抛异常');
  ok(Array.isArray(listRuns()), 'listRuns 返回数组');
  ok(typeof summarize() === 'object', 'summarize 返回对象');
}

console.log('\n== 5h. 非 UI BUG 回归（B1/B2/B3/B4/B10） ==');
{
  const mk = (charId = 'knight') => new RunState(charId, 12345);
  const total = (rs: any, base: string) => {
    let n = 0;
    for (const m of rs.modsBag) if ((m === base || m === base + '_2')) n += (m === base + '_2' ? 2 : 1);
    for (const s of rs.skills) for (const m of s.mods) if (m && (m === base || m === base + '_2')) n += (m === base + '_2' ? 2 : 1);
    return n;
  };

  // B1：替换技能不得复制模块（总量守恒）
  {
    const rs = mk();
    rs.skills[0].mods = ['multi', 'pierce'];
    const before = total(rs, 'multi') + total(rs, 'pierce');
    rs.replaceSkill(0, 'ice_spear');
    const after = total(rs, 'multi') + total(rs, 'pierce');
    ok(before === after && after === 2, 'B1 替换技能后模块总量不变（' + before + ' → ' + after + '）');
    ok(rs.modsBag.filter(m => m === 'multi').length === 1, 'B1 背包里 multi 只有 1 份（无重复返还）');
  }

  // B2：跨技能移到"第 3 个空槽"不能产生稀疏数组
  {
    const rs = mk();
    rs.skills.push({ id: 'ice_spear', lvl: 1, mods: [] } as never);
    rs.skills[0].mods = ['multi'];
    const okMove = rs.moveMod(0, 0, 1, 2);       // 目标技能只有 0 个模块，点第 3 槽
    const b = rs.skills[1].mods;
    const holeFree = b.length === 1 && b.every(m => typeof m === 'string' && m.length > 0);
    ok(okMove && holeFree, 'B2 跨技能移动到空槽后数组连续（length=' + b.length + '）');
    ok(!Object.keys(b).some(k => b[Number(k)] === undefined), 'B2 无 undefined 空洞');
  }

  // B3：installAt 的非法输入必须抛错且不改变状态
  {
    const rs = mk();
    rs.modsBag = ['multi'];
    const snap = () => JSON.stringify({ bag: rs.modsBag, mods: rs.skills.map(s => s.mods) });
    const before = snap();
    let threw = 0;
    try { rs.installAt(0, 0, 'not_a_module'); } catch { threw++; }
    try { rs.installAt(0, 0, 'pierce'); } catch { threw++; }          // 背包里没有
    try { rs.installAt(0, 5, 'multi'); } catch { threw++; }            // 槽位越界
    try { rs.installAt(9, 0, 'multi'); } catch { threw++; }            // 技能越界
    ok(threw === 4, 'B3 四种非法安装都抛错（' + threw + '/4）');
    ok(snap() === before, 'B3 失败时背包与技能槽完全不变');
  }

  // B4：强化模块一次占 2 份，不能突破 max（fan max=2，已有 1 份 + _2 会超）
  {
    const rs = mk();
    rs.skills[0].mods = ['fan'];
    rs.modsBag = ['fan_2'];
    let threw = false;
    try { rs.installAt(0, 1, 'fan_2'); } catch { threw = true; }
    ok(threw, 'B4 已占 1 份 + 强化 2 份 > max(2) 时拒绝安装');
    ok(rs.skills[0].mods.length === 1 && rs.modsBag.includes('fan_2'), 'B4 拒绝后状态不变');
  }

  // B10：波末金币的贪婪加成也必须封顶 +100%
  {
    const a = mk(); a.stats.greed = 1.0; const g1 = a.waveClearGold();
    const b = mk(); b.stats.greed = 1.5; const g2 = b.waveClearGold();
    ok(g1 === g2, 'B10 greed 1.5 与 1.0 的波末金币相同（封顶 +100%）：' + g1 + '=' + g2);
  }
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
if (fail) throw new Error(`有 ${fail} 项失败`);
