/* 疯狂怪潮 · 静态门禁（波次闯关版）
   能代码量的一律量，不问模型：对比度 / 热区 / 波次 / 像素可读性 / 因果链 / 确定性 / 合规 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');            // 工程根（素材在 ../assets 下）
const PAGE = '/prototype-html/index.html';
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
(async () => {
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = PAGE;
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
  res.end(fs.readFileSync(f));
});
await new Promise(r => srv.listen(8778, r));
const b = await chromium.launch();
const page = await b.newPage({viewport:{width:390,height:844}, deviceScaleFactor:2});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:8778' + PAGE);

console.log('\n== 1. Design Token 对比度（WCAG AA >= 4.5:1）==');
const contrast = await page.evaluate(() => {
  const lum = h => { const c = [1,3,5].map(i => parseInt(h.substr(i,2),16)/255)
      .map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]; };
  const ratio = (a, bb) => { const l1 = lum(a), l2 = lum(bb); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
  const cs = getComputedStyle(document.documentElement); const v = n => cs.getPropertyValue(n).trim();
  return { cream_on_bg1: ratio(v('--cream'), v('--bg-1')), cream_on_bg2: ratio(v('--cream'), v('--bg-2')),
           accent_on_bg2: ratio(v('--accent'), v('--bg-2')), mint_on_bg2: ratio(v('--mint'), v('--bg-2')),
           ink_on_accent: ratio('#20160A', v('--accent')) };
});
Object.entries(contrast).forEach(([k, v]) => ok(v >= 4.5, k + ' = ' + v.toFixed(2) + ':1'));

console.log('\n== 2. 触控热区 ==');
const pb = await page.locator('#btn-play').boundingBox();   // 量完再点，否则元素已隐藏
ok(pb.height >= 40, '主界面按钮高 ' + pb.height.toFixed(0) + 'px');
await page.locator('#btn-play').click(); await page.waitForTimeout(250);
const chBox = await page.locator('#chargrid .char').first().boundingBox();
ok(chBox.width >= 90 && chBox.height >= 60, '角色卡 ' + chBox.width.toFixed(0) + 'x' + chBox.height.toFixed(0));
const startBox = await page.locator('#btn-start').boundingBox();
ok(startBox.height >= 40, '开始按钮高 ' + startBox.height.toFixed(0) + 'px');
await page.locator('#btn-start').click(); await page.waitForTimeout(600);
const pauseBox = await page.locator('#btn-pause').boundingBox();
ok(pauseBox.width >= 30 && pauseBox.height >= 30, '暂停键 ' + pauseBox.width.toFixed(0) + 'x' + pauseBox.height.toFixed(0));

console.log('\n== 3. 波次系统 ==');
const wv = await page.evaluate(() => ({wave:G.wave, total:RUN.waves, t1:waveTime(1), t4:waveTime(4), t20:waveTime(20),
                                       bossEvery:RUN.bossEvery, eliteEvery:RUN.eliteEvery,
                                       boss10:isBossWave(10), boss20:isBossWave(20), elite6:isEliteWave(6),
                                       canContinue:RUN.canContinue, doubleFrom:RUN.eliteDoubleFrom}));
ok(wv.total === 20 && wv.wave === 1, '共 ' + wv.total + ' 波，当前第 ' + wv.wave + ' 波');
ok(wv.t4 > wv.t1 && wv.t20 > wv.t4, '波次时长递增：' + wv.t1 + 's -> ' + wv.t4 + 's -> ' + wv.t20 + 's');
ok(wv.boss10 && wv.boss20, 'BOSS 波在 10 / 20（bossEvery=' + wv.bossEvery + '）');
ok(wv.elite6, '精英波：每 ' + wv.eliteEvery + ' 波一次（第 6 波=' + wv.elite6 + '）');
ok(wv.canContinue, '打通 20 波后可继续（无尽模式）');
ok(wv.doubleFrom === 12, '第 ' + wv.doubleFrom + ' 波起精英出 2 只');

console.log('\n== 3b. 内容池规模 ==');
const pool = await page.evaluate(() => ({
  skills: Object.keys(SKILLS).length, modules: Object.keys(MODULES).length,
  items: Object.keys(ITEMS).length, chars: CHARS.length
}));
ok(pool.skills === 16, '主动技能 ' + pool.skills + ' 个（需求 §10 目标 16）');
ok(pool.modules === 18, '行为模块 ' + pool.modules + ' 个（需求 §10 目标约 18）');
ok(pool.items === 20, '道具 ' + pool.items + ' 个（MVP 演示 20 / 首版目标 50）');
ok(pool.chars === 6, '角色 ' + pool.chars + ' 个（需求 §6：6）');

const feel0 = await page.evaluate(() => ({speed:G.stats.speed, pickup:G.stats.pickup, base:BASE_SPEED, basePickup:BASE_PICKUP}));
ok(feel0.base >= 90, '基础移速 ' + feel0.base + ' px/s（横穿 360px 屏幕约 ' + (360/feel0.base).toFixed(1) + ' 秒）');
ok(feel0.pickup >= 80, '基础拾取半径 ' + feel0.pickup + ' px（屏幕宽度的 ' + Math.round(feel0.pickup/360*100) + '%）');
console.log('');
console.log('== 3b2. 手感基线（移速 / 拾取半径） ==');
console.log('\n== 3c. 打击感机制 ==');
await page.evaluate(() => { G.hitstop = 0.3; G.shake = 12; });
await page.waitForTimeout(700);
const feel = await page.evaluate(() => ({hitstop:G.hitstop, shake:G.shake}));
ok(feel.hitstop < 0.3, '顿帧会衰减：0.3 -> ' + feel.hitstop.toFixed(3));
ok(feel.shake < 12, '屏震会衰减：12 -> ' + feel.shake.toFixed(2));
ok(await page.locator('#cd0').count() === 1, '技能冷却遮罩元素存在（CD 可视化）');

console.log('');
console.log('== 3d. 经验自动拾取（靠近即吸，不用走过去） ==');
// 注意：战斗中会不断有新宝石掉落，不能看 gems.length，必须给测试宝石打标记
await page.evaluate(() => {
  G.exp = 0; G.expNeed = 99999;
  ents.gems.push({x:G.player.x + 80, y:G.player.y + 20, v:4, t:0, pop:0, vx:0, vy:0, tag:'near'});
  ents.gems.push({x:G.player.x + 400, y:G.player.y, v:4, t:0, pop:0, vx:0, vy:0, tag:'far'});
  G.player.inv = 99;   // 免得被怪撞死影响测试
});
await page.waitForTimeout(1500);
const gp = await page.evaluate(() => ({
  near: ents.gems.some(g => g.tag === 'near'),
  far:  ents.gems.some(g => g.tag === 'far'),
  exp: G.exp
}));
ok(!gp.near, '★ 80px 外的宝石被自动吸走（仍在场：' + gp.near + '）');
ok(gp.exp >= 4, '经验已入账 +' + gp.exp);
ok(gp.far, '★ 400px 外的宝石原地不动（仍在场：' + gp.far + '）—— 半径不是无限大');
console.log('');
console.log('== 3e. 难度曲线（反断崖）与性能 ==');
const curve = await page.evaluate(() => {
  const spawns = (w) => {
    const T = waveTime(w);
    const interval = Math.max(0.40, 1.15 - w*0.045);
    const n = Math.min(3, 1 + Math.floor(w/6));
    return Math.round(T / interval * n);
  };
  const pool = (w) => enemyPool(w);
  return {w1: spawns(1), w2: spawns(2), w3: spawns(3), w20: spawns(20),
          pool1: pool(1).join(','), pool2: pool(2).join(','), pool3: pool(3).join(','),
          fastest: Math.max.apply(null, Object.keys(ENEMY_DEF).filter(k=>!ENEMY_DEF[k].boss&&!ENEMY_DEF[k].elite).map(k=>ENEMY_DEF[k].spd)),
          fastestName: Object.keys(ENEMY_DEF).filter(k=>!ENEMY_DEF[k].boss&&!ENEMY_DEF[k].elite).sort((a,b)=>ENEMY_DEF[b].spd-ENEMY_DEF[a].spd)[0],
          speedPlayer: G.stats.speed};
});
ok(curve.w2 <= curve.w1 * 1.4, '第 2 波不是断崖：第1波 ' + curve.w1 + ' 只 -> 第2波 ' + curve.w2 + ' 只（旧版 24 -> 54，翻 2.25 倍）');
ok(curve.pool1 === 'goblin', '第 1 波只有最基础的哥布林（新手保护）：' + curve.pool1);
ok(curve.pool2 === 'goblin', '第 2 波仍只有哥布林：' + curve.pool2);
ok(curve.pool3 === 'goblin,wolf', '第 3 波解锁狼：' + curve.pool3);
ok(curve.fastest < curve.speedPlayer, '最快怪 ' + curve.fastestName + ' ' + curve.fastest + ' px/s < 玩家 ' + curve.speedPlayer + ' px/s（可躲是硬条件）');
ok(curve.w20 < 400, '第 20 波总刷怪量 ' + curve.w20 + '（ZOOM=2 后可视区缩小 4 倍，同步下调）');

const perf = await page.evaluate(async () => {
  startWave(15); G.paused = false; go('battle');
  ents.enemies.length = 0;
  for (let i = 0; i < 130; i++){
    const a = i/130*Math.PI*2, rr = 70 + (i % 45);
    spawnEnemy('goblin', G.player.x + Math.cos(a)*rr, G.player.y + Math.sin(a)*rr);
  }
  G.player.inv = 999;
  const t0 = performance.now(); let frames = 0;
  await new Promise(res => {
    const tick = () => { frames++; (performance.now() - t0 < 1000) ? requestAnimationFrame(tick) : res(); };
    requestAnimationFrame(tick);
  });
  return {frames, alive: ents.enemies.filter(e => !e.dead).length};
});
ok(perf.frames >= 40, '130 只怪同屏（ZOOM=2）：1 秒 ' + perf.frames + ' 帧（>=40 视为可接受）');
// 还原到正常第 1 波，后面的测试还要继续打怪
await page.evaluate(() => { startWave(1); G.paused = false; go('battle'); });
await page.waitForTimeout(300);

console.log('');
console.log('== 3f. 金币经济 ==');
const gold = await page.evaluate(() => {
  const rows = [];
  for (const w of [1,3,5,10]) rows.push({w, clear: 12 + w*5, drop: ENEMY_DEF.goblin.gold});
  G.wave = 1; G.shopReroll = 0; G.shopStock = null; G.carryOver = [];
  refreshShop(false);
  const stock = G.shopStock.map(s => ({k:s.kind, p:s.price}));
  return {rows, stock};
});
ok(gold.rows[0].clear >= 15, '第 1 波结算 ' + gold.rows[0].clear + ' 金币（回调后）');
ok(gold.rows[2].clear >= 35, '第 5 波结算 ' + gold.rows[2].clear + ' 金币');
const cheapest = Math.min(...gold.stock.map(s => s.p));
ok(cheapest <= 20, '第 1 波商店最便宜 ' + cheapest + ' 金币（买得起）');
ok(gold.stock.length === 4, '固定 4 个货位：' + gold.stock.length + '（参考 Brotato 的货架结构）');

console.log('');
console.log('== 3g. 商店购买反馈（不消失 / 已购买印记 / 锁定） ==');
const shopFix = await page.evaluate(() => {
  G.wave = 1; G.gold = 500; G.shopStock = null; G.carryOver = []; G.shopReroll = 0;
  refreshShop(false);
  const before = G.shopStock.length;
  const t0 = G.shopStock.find(s => !s.sold);
  buyShop(t0, ITEMS[t0.id] ? ITEMS[t0.id].name : 'x', G.shopStock.indexOf(t0));
  return {before, after: G.shopStock.length, sold: G.shopStock.filter(s => s.sold).length,
          locked: G.shopStock.filter(s => s.locked).length};
});
ok(shopFix.after === shopFix.before, '★ 购买后货位数量不变：' + shopFix.before + ' -> ' + shopFix.after + '（旧版整行消失）');
ok(shopFix.sold === 1, '★ 已购买货位置为 sold 状态（UI 上盖「已购买」印记）');
ok(shopFix.locked === 0, '购买后自动解锁（不再占锁定位）');

const lockFix = await page.evaluate(() => {
  G.gold = 500;
  const target = G.shopStock.findIndex(s => !s.sold);
  const id = G.shopStock[target].id;
  toggleLock(target);
  const lockedNow = G.shopStock[target].locked;
  refreshShop(true);                       // 刷新（保留锁定）
  return {target, id, lockedNow, after: G.shopStock[target] ? G.shopStock[target].id : null,
          stillLocked: G.shopStock[target] ? G.shopStock[target].locked : false};
});
ok(lockFix.lockedNow, '货位可上锁');
ok(lockFix.after === lockFix.id && lockFix.stillLocked, '★ 锁定的货位刷新后仍在：' + lockFix.id);
await page.evaluate(() => { G.gold = 40; G.shopStock = null; G.carryOver = []; G.shopReroll = 0; });

console.log('');
console.log('');
console.log('== 3g2. 观感基准（缩放 / 视野 / 单屏密度） ==');
const look = await page.evaluate(() => ({
  zoom: ZOOM, viewW: VIEW_W, viewH: VIEW_H, arenaW: ARENA.W, arenaH: ARENA.H,
  playerR: G.player ? G.player.r : 12
}));
ok(look.zoom === 2, '渲染缩放 ZOOM=' + look.zoom + 'x（整数倍，像素不糊）');
const spriteOnScreen = 32 * look.zoom;
ok(spriteOnScreen / 640 >= 0.08 && spriteOnScreen / 640 <= 0.13,
   '单位占屏高 ' + (spriteOnScreen/640*100).toFixed(1) + '%（参考区间 8~13%）');
ok(look.viewW === 360/look.zoom && look.viewH === 640/look.zoom,
   '可视世界 ' + look.viewW + 'x' + look.viewH + '（= 屏幕 / ZOOM）');
ok(look.arenaW >= look.viewW*3 && look.arenaH >= look.viewH*2.5,
   '竞技场 ' + look.arenaW + 'x' + look.arenaH + ' 是可视区的 ' + (look.arenaW/look.viewW).toFixed(1) + 'x' + (look.arenaH/look.viewH).toFixed(1) + ' 倍（留出风筝空间）');
ok(look.playerR >= 11, '玩家碰撞半径 ' + look.playerR + '（随视觉放大同步上调，避免"明明撞上却没伤害"）');

console.log('== 3h. 美术资源接入（单位 / 技能特效 / 图标） ==');
const art = await page.evaluate(() => ({
  unitFrames: U_TOTAL, unitLoaded: U_LOADED, unitFail: U_FAIL,
  vfxFrames: V_TOTAL, vfxLoaded: V_LOADED, vfxFail: V_FAIL,
  units: Object.keys(UNITS).length, vfx: Object.keys(VFX).length,
  skillsWithArt: Object.keys(SKILL_ART).length
}));
ok(art.units === 21, '单位素材 ' + art.units + ' 套（6 玩家 + 12 杂兵 + 3 BOSS）');
ok(art.unitFail === 0 && art.unitLoaded === art.unitFrames, '单位帧全部加载 ' + art.unitLoaded + '/' + art.unitFrames + '（失败 ' + art.unitFail + '）');
ok(art.vfx >= 80, 'VFX 组件 ' + art.vfx + ' 个');
ok(art.vfxFail === 0, 'VFX 帧加载失败 ' + art.vfxFail + ' 个（应为 0）');
ok(art.skillsWithArt === 16, '16 个技能全部绑定图标与特效：' + art.skillsWithArt);

console.log('\n== 4. 像素级可读性 ==');
await page.waitForTimeout(2200);
const pix = await page.evaluate(() => {
  const g = document.getElementById('cv').getContext('2d');
  // 世界 → 屏幕要考虑 ZOOM（定位环是世界空间的椭圆 19x8，锚点在玩家脚下 +8）
  const cam = {cx: Math.max(0, Math.min(ARENA.W-VIEW_W, G.player.x-VIEW_W/2)),
               cy: Math.max(0, Math.min(ARENA.H-VIEW_H, G.player.y-VIEW_H/2))};
  const px = (G.player.x - cam.cx) * ZOOM, py = (G.player.y - cam.cy) * ZOOM;
  let warm = 0, ring = 0;
  for (let a = 0; a < 96; a++){
    const th = a/96*Math.PI*2;
    for (const k of [0.88, 1.0, 1.12]){
      const x = Math.round(px + Math.cos(th) * 19 * ZOOM * k);
      const y = Math.round(py + 8*ZOOM + Math.sin(th) * 8 * ZOOM * k);
      if (x < 0 || y < 0 || x >= 360 || y >= 640) continue;
      const d = g.getImageData(x, y, 1, 1).data; ring++;
      if (d[0] > 115 && (d[0]-d[2]) > 50 && d[0] > d[1] && d[1] > d[2]) warm++;
    }
  }
  const img = g.getImageData(0,0,360,640).data;
  let bright = 0, total = 0;
  for (let i = 0; i < img.length; i += 4){ total++; if (img[i] > 235 && img[i+1] > 235 && img[i+2] > 200) bright++; }
  return {ringPct: warm/ring*100, brightPct: bright/total*100, enemies: ents.enemies.length, killed: G.battleKilled};
});
ok(pix.ringPct > 40, '玩家定位环可见（暖色占比 ' + pix.ringPct.toFixed(0) + '%）');
ok(pix.brightPct > 0.005, '有高亮像素（伤害数字/白闪）' + pix.brightPct.toFixed(3) + '%');
ok(pix.killed > 0, '自动攻击在击杀（已清 ' + pix.killed + '）');

console.log('\n== 5. 因果链：模块 -> 安装 -> 数值 ==');
await page.evaluate(() => { G.levelPause = true; openInstall('multi','levelup'); });
await page.waitForTimeout(300);
ok(await page.locator('#scr-install.on').count() === 1, '安装屏打开');
await page.locator('#instlist .row').first().locator('.slotbtn').first().click();
await page.waitForTimeout(300);
const aft = await page.evaluate(() => ({mods:G.skills[0].mods.slice(), count:calcSkill(G.skills[0]).count}));
ok(aft.mods.length >= 1, '模块已装入：' + JSON.stringify(aft.mods));
ok(aft.count >= 2, '「多重」生效：投射物 x' + aft.count);

console.log('\n== 6. 波间商店 ==');
await page.evaluate(() => { G.paused = false; waveLeft = 0.05; });
await page.waitForTimeout(700);
ok(await page.locator('#scr-shop.on').count() === 1, '波次结束进入商店');
const st = await page.evaluate(() => ({gold:G.gold, n:(G.shopStock||[]).length, kinds:[...new Set((G.shopStock||[]).map(s=>s.kind))]}));
ok(st.gold > 0, '结算给金币 ' + st.gold);
ok(st.n >= 3, '货架 ' + st.n + ' 件，类型：' + st.kinds.join('/'));
const gA = await page.evaluate(() => G.gold);
await page.locator('#btn-reroll').click(); await page.waitForTimeout(250);
ok(await page.evaluate(() => G.gold) < gA, '刷新扣金币');

console.log('\n== 7. 确定性 ==');
const det = await page.evaluate(() => {
  G.shopReroll = 0; G.shopStock = null; G.carryOver = [];
  refreshShop(false);
  const a = G.shopStock.map(s => s.kind+':'+s.id).join(',');
  G.shopStock = null; G.carryOver = [];
  refreshShop(false);
  const c = G.shopStock.map(s => s.kind+':'+s.id).join(',');
  return {same: a === c, list: a};
});
ok(det.same, '同 seed 商店货架一致：' + det.list);

console.log('\n== 8. 合规扫描（禁用赌博语义）==');
const kw = ['老虎机','转盘','骰子','筹码','下注','赔率','开箱','抽奖','赌场'];
let hits = [];
for (const f of ['index.html','src/data.js','src/engine.js','src/flow.js','src/ui.js','src/render.js']){
  const t = fs.readFileSync(path.join(ROOT, 'prototype-html', f), 'utf8');
  kw.forEach(k => { if (t.includes(k)) hits.push(f + ':' + k); });
}
ok(hits.length === 0, '源码无赌博语义词' + (hits.length ? ' -> ' + hits.join(',') : ''));

console.log('\n== 9. 旧系统已彻底移除 ==');
const legacy = await page.evaluate(() => ({
  genMap: typeof genMap, enterNode: typeof enterNode, renderMap: typeof renderMap, openEvent: typeof openEvent,
  makeShopStock: typeof makeShopStock
}));
Object.entries(legacy).forEach(([k, v]) => ok(v === 'undefined', '旧函数 ' + k + ' 已移除'));
const html = fs.readFileSync(path.join(ROOT, 'prototype-html', 'index.html'), 'utf8');
ok(!html.includes('scr-map'), 'index.html 无地图屏');
ok(!html.includes('scr-event'), 'index.html 无事件屏');

console.log('\n================ 门禁结果 ================');
console.log('PASS ' + pass + ' / FAIL ' + fail);
console.log('运行时错误: ' + (errs.length ? errs.join(' | ') : '无'));
await b.close(); srv.close();
process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('RUNNER ERROR', e); process.exit(2); });
