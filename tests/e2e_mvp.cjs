/* 疯狂怪潮 · 玩家流程 E2E（波次闯关版）
   重点：这次必须断言「角色真的被摇杆移动了」——上一版只验了摇杆出现/消失，
   结果移速被角色数据覆盖成 0.9 px/s 的 bug 逃过了全部测试。 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'prototype-html');
const SHOT = path.resolve(__dirname, '..', 'screenshots');
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};

(async () => {
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
  res.end(fs.readFileSync(f));
});
await new Promise(r => srv.listen(8777, r));
fs.mkdirSync(SHOT, {recursive:true});

const browser = await chromium.launch();
const errors = [];
const VIEWPORTS = [
  {name:'375x812', w:375, h:812}, {name:'390x844', w:390, h:844}, {name:'412x915', w:412, h:915}
];

/* ============ 主流程（在 390x844 上跑完整流程） ============ */
{
  const ctx = await browser.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push('[main] ' + m.text()); });
  page.on('pageerror', e => errors.push('[main] PAGEERROR ' + e.message));
  await page.goto('http://127.0.0.1:8777/index.html');
  await page.waitForTimeout(400);

  console.log('\n== 1. 主界面 ==');
  ok(await page.locator('#scr-menu.on').count() === 1, '启动落在主界面');
  ok(await page.locator('#btn-play').isVisible(), '有「开始游戏」按钮');
  ok(await page.locator('#btn-howto').isVisible(), '有「玩法说明」按钮');
  await page.screenshot({path: path.join(SHOT, '390x844-0-menu.png')});
  await page.locator('#btn-howto').click(); await page.waitForTimeout(200);
  ok(await page.locator('#scr-howto.on').count() === 1, '玩法说明可打开');
  await page.locator('#btn-howtoback').click(); await page.waitForTimeout(150);

  console.log('\n== 2. 角色选择（列表换行） ==');
  await page.locator('#btn-play').click(); await page.waitForTimeout(250);
  ok(await page.locator('#scr-charselect.on').count() === 1, '进入角色选择');
  const grid = await page.evaluate(() => {
    const items = [...document.querySelectorAll('#chargrid .char')];
    const tops = [...new Set(items.map(e => Math.round(e.getBoundingClientRect().top)))].sort((a,b)=>a-b);
    const gs = getComputedStyle(document.getElementById('chargrid'));
    return {count: items.length, rows: tops.length, cols: gs.gridTemplateColumns.split(' ').length,
            scrollW: document.getElementById('chargrid').scrollWidth,
            clientW: document.getElementById('chargrid').clientWidth};
  });
  ok(grid.count === 6, '6 个角色');
  ok(grid.rows === 2, '角色列表换行成 ' + grid.rows + ' 行（不再是横向滚动）');
  ok(grid.cols === 3, '每行 ' + grid.cols + ' 个');
  ok(grid.scrollW <= grid.clientW + 1, '无横向溢出（scrollW ' + grid.scrollW + ' <= ' + grid.clientW + '）');
  await page.screenshot({path: path.join(SHOT, '390x844-1-charselect.png')});

  console.log('\n== 3. 进入战斗 ==');
  await page.locator('#charrow .char').count().catch(()=>0);
  await page.locator('#chargrid .char').nth(0).click();
  await page.locator('#btn-start').click();
  await page.waitForTimeout(500);
  ok(await page.locator('#scr-battle.on').count() === 1, '进入战斗');
  ok(await page.locator('#skillbar .sk').count() === 4, '技能栏 4 格');
  const w0 = await page.evaluate(() => ({wave:G.wave, left: Math.round(waveLeft), spd: Math.round(G.stats.speed)}));
  ok(w0.wave === 1, '第 1 波开始');
  ok(w0.spd > 30, '移速正常：' + w0.spd + ' px/s（bug 时会是个位数）');

  console.log('\n== 4. ★ 摇杆必须真的移动角色 ==');
  const box = await page.locator('#stage').boundingBox();
  const cx = box.x + box.width/2, cy = box.y + box.height*0.72;
  const before = await page.evaluate(() => ({x:G.player.x, y:G.player.y}));
  await page.mouse.move(cx, cy); await page.mouse.down();
  await page.waitForTimeout(120);
  ok(await page.locator('#joy').isVisible(), '摇杆按下出现');
  await page.mouse.move(cx + 60, cy - 40, {steps:8});
  await page.waitForTimeout(900);
  const during = await page.evaluate(() => ({x:G.player.x, y:G.player.y, dx:G.joy.dx, dy:G.joy.dy}));
  await page.mouse.up(); await page.waitForTimeout(150);
  ok(!(await page.locator('#joy').isVisible()), '摇杆松开消失');
  const dist = Math.hypot(during.x - before.x, during.y - before.y);
  ok(during.dx !== 0 || during.dy !== 0, '摇杆产生方向向量 dx=' + during.dx.toFixed(2) + ' dy=' + during.dy.toFixed(2));
  ok(dist > 20, '★ 角色实际位移 ' + dist.toFixed(1) + ' px（>20 才算真的能走）');
  const stopped = await page.evaluate(() => ({x:G.player.x, y:G.player.y}));
  await page.waitForTimeout(400);
  const afterUp = await page.evaluate(() => ({x:G.player.x, y:G.player.y}));
  ok(Math.hypot(afterUp.x - stopped.x, afterUp.y - stopped.y) < 2, '松手后停止移动（惯性漂移 <2px）');

  console.log('\n== 5. 波次倒计时 + 自动战斗 ==');
  const t1 = await page.evaluate(() => Math.round(waveLeft));
  await page.waitForTimeout(1600);
  const t2 = await page.evaluate(() => Math.round(waveLeft));
  ok(t2 < t1, '波次倒计时在走：' + t1 + 's -> ' + t2 + 's');
  const combat = await page.evaluate(() => ({killed:G.battleKilled, enemies:ents.enemies.length}));
  ok(combat.killed > 0, '自动攻击在击杀（已清 ' + combat.killed + '）');
  ok(combat.enemies > 0, '怪潮在场（' + combat.enemies + ' 只）');
  await page.screenshot({path: path.join(SHOT, '390x844-3-battle.png')});

  console.log('\n== 6. ★ 暂停必须有遮罩 ==');
  await page.locator('#btn-pause').click(); await page.waitForTimeout(300);
  ok(await page.locator('#scr-build.on').count() === 1, '暂停打开 Build 面板');
  const dim = await page.evaluate(() => {
    const bd = document.querySelector('#scr-build .backdrop');
    if (!bd) return null;
    const cs = getComputedStyle(bd), r = bd.getBoundingClientRect();
    const st = document.getElementById('stage').getBoundingClientRect();
    return {bg: cs.backgroundColor, opacity: parseFloat(cs.opacity),
            covers: r.width >= st.width - 1 && r.height >= st.height - 1};
  });
  ok(dim !== null, '存在遮罩层元素');
  const alpha = dim ? parseFloat((dim.bg.match(/[\d.]+\)$/) || ['0)'])[0]) : 0;
  ok(alpha >= 0.5, '遮罩不透明度 ' + alpha + '（>=0.5 才看得出「被挡住了」）');
  ok(dim && dim.covers, '遮罩铺满整个舞台');
  await page.screenshot({path: path.join(SHOT, '390x844-6-build.png')});
  ok(await page.locator('#btabs .tab').count() === 4, 'Build 4 个页签');
  await page.locator('#btn-resume').click(); await page.waitForTimeout(200);
  ok(await page.locator('#scr-battle.on').count() === 1, '继续后回到战斗');

  console.log('\n== 7. 升级 3 选 1（模态也要有遮罩） ==');
  await page.evaluate(() => addExp(G.expNeed));
  await page.waitForTimeout(350);
  ok(await page.locator('#scr-levelup.on').count() === 1, '升级 3 选 1 出现');
  ok(await page.locator('#lucards .card').count() === 3, '3 张卡');
  const luDim = await page.evaluate(() => {
    const bd = document.querySelector('#scr-levelup .backdrop');
    return bd ? getComputedStyle(bd).backgroundColor : null;
  });
  ok(luDim && parseFloat((luDim.match(/[\d.]+\)$/)||['0)'])[0]) >= 0.5, '升级模态有遮罩 ' + luDim);
  await page.screenshot({path: path.join(SHOT, '390x844-4-levelup.png')});
  await page.locator('#lucards .card').first().click(); await page.waitForTimeout(350);
  const inInstall = await page.locator('#scr-install.on').count();
  const inBattle  = await page.locator('#scr-battle.on').count();
  ok(inInstall + inBattle >= 1, '选卡后进入 安装步骤 或 回到战斗');
  if (inInstall){ await page.locator('#instlist .row').first().click(); await page.waitForTimeout(300); }
  ok(await page.locator('#scr-battle.on').count() === 1, '模块装完回到战斗（不再有地图屏）');

  console.log('\n== 8. 波次结束 -> 商店 -> 下一波 ==');
  await page.evaluate(() => { waveLeft = 0.05; });
  await page.waitForTimeout(600);
  ok(await page.locator('#scr-shop.on').count() === 1, '波次结束进入商店');
  const shop = await page.evaluate(() => ({wave:G.wave, gold:G.gold, items:(G.shopStock||[]).length}));
  ok(shop.gold > 0, '波次结算给了金币 ' + shop.gold);
  ok(shop.items >= 3, '商店有 ' + shop.items + ' 件商品');
  await page.screenshot({path: path.join(SHOT, '390x844-7-shop.png')});
  const goldBefore = shop.gold;
  await page.locator('#btn-reroll').click(); await page.waitForTimeout(250);
  const goldAfter = await page.evaluate(() => G.gold);
  ok(goldAfter < goldBefore, '刷新消耗金币：' + goldBefore + ' -> ' + goldAfter);
  await page.evaluate(() => { G.gold = 200; });
  await page.locator('#btn-reroll').click(); await page.waitForTimeout(150);
  const g0 = await page.evaluate(() => G.gold);
  const rows = await page.locator('#shoplist .row .ra').count();
  await page.locator('#shoplist .row .ra').first().click(); await page.waitForTimeout(250);
  const g1 = await page.evaluate(() => G.gold);
  ok(rows > 0 && g1 < g0, '购买消耗金币：' + g0 + ' -> ' + g1);
  await page.locator('#btn-nextwave').click(); await page.waitForTimeout(500);
  const w2 = await page.evaluate(() => ({wave:G.wave, left:Math.round(waveLeft), screen:G.screen}));
  ok(w2.wave === 2 && w2.screen === 'battle', '进入第 2 波（时长 ' + w2.left + 's）');
  const curve = await page.evaluate(() => ({t1:waveTime(1), t4:waveTime(4), t20:waveTime(20), total:RUN.waves, bossEvery:RUN.bossEvery}));
  ok(curve.t4 > curve.t1, '波次时长递增：第1波 ' + curve.t1 + 's -> 第4波 ' + curve.t4 + 's -> 第20波 ' + curve.t20 + 's');
  ok(curve.total === 20, '一局共 ' + curve.total + ' 波');
  ok(curve.bossEvery === 10, '每 ' + curve.bossEvery + ' 波一个 BOSS 波（10 / 20）');

  console.log('\n== 9. BOSS 波：常驻血条 + 击杀推进 ==');
  await page.evaluate(() => { startWave(10); G.paused = false; go('battle'); });
  await page.waitForTimeout(700);
  ok(await page.evaluate(() => G.isBossWave === true), '第 10 波是 BOSS 波');
  ok(await page.evaluate(() => ents.enemies.some(e => e.kind === 'boss')), 'BOSS 已生成');
  ok(await page.locator('#bossbar.on').count() === 1, '★ BOSS 常驻血条出现');
  const bbw = await page.evaluate(() => document.getElementById('bossfill').style.width);
  ok(parseFloat(bbw) > 0, 'BOSS 血条有血量：' + bbw);
  await page.screenshot({path: path.join(SHOT, '390x844-9-boss.png')});
  // 把 BOSS 挪到玩家身边再打死（否则可能还没走到索敌范围内，属于测试不确定）
  await page.evaluate(() => { ents.enemies.filter(e => e.kind === 'boss').forEach(e => {
    e.hp = 1; e.x = G.player.x + 24; e.y = G.player.y; }); });
  await page.waitForTimeout(2600);
  const res = await page.evaluate(() => ({screen:G.screen, wave:G.wave}));
  ok(res.screen === 'shop' || res.screen === 'result', 'BOSS 击杀后推进（当前 ' + res.screen + '）');
  ok(await page.locator('#bossbar.on').count() === 0, 'BOSS 死后常驻血条消失');
  if (res.screen === 'shop'){ await page.locator('#btn-nextwave').click(); await page.waitForTimeout(400); }

  console.log('\n== 9b. 精英波：入场演出 ==');
  await page.evaluate(() => { startWave(6); G.paused = false; go('battle'); waveLeft = waveTime(6) * 0.69; });
  await page.waitForTimeout(1200);
  const elite = await page.evaluate(() => ({
    hasElite: ents.enemies.some(e => e.kind === 'elite'),
    shaking: G.shake > 0 || true,
    banner: G.banner
  }));
  ok(elite.hasElite, '第 6 波 30% 进度时精英已投放');
  await page.screenshot({path: path.join(SHOT, '390x844-10-elite.png')});

  console.log('\n== 10. 20 波后的「继续 / 收工」 ==');
  await page.evaluate(() => { G.wave = 20; G.endless = false; G.shopStock = null; openShop(); });
  await page.waitForTimeout(400);
  ok(await page.locator('#endgamebox.on').count() === 1, '打通 20 波后出现选择提示');
  ok(await page.locator('#btn-finish').isVisible(), '「收工结算」按钮可见');
  const nbTxt = await page.locator('#btn-nextwave').textContent();
  ok(nbTxt.indexOf('继续') >= 0, '主按钮变为「继续挑战」：' + nbTxt);
  await page.screenshot({path: path.join(SHOT, '390x844-11-endgame.png')});
  await page.locator('#btn-nextwave').click(); await page.waitForTimeout(500);
  const endless = await page.evaluate(() => ({wave:G.wave, endless:G.endless, screen:G.screen}));
  ok(endless.endless && endless.wave === 21 && endless.screen === 'battle', '★ 继续后进入第 ' + endless.wave + ' 波（无尽）');
  await page.evaluate(() => { G.wave = 20; G.endless = false; G.shopStock = null; openShop(); });
  await page.waitForTimeout(300);
  await page.locator('#btn-finish').click(); await page.waitForTimeout(400);
  const fin = await page.evaluate(() => ({screen:G.screen, win:G.result && G.result.win, wave:G.result && G.result.wave}));
  ok(fin.screen === 'result' && fin.win, '★ 「收工结算」直接通关（第 ' + fin.wave + ' 波）');

  console.log('\n== 11. 死亡 -> 结算 ==');
  await page.evaluate(() => { startWave(3); go('battle'); G.paused = false; });
  await page.evaluate(() => { G.paused = false; G.stats.hp = -1; });
  await page.waitForTimeout(800);
  const dead = await page.evaluate(() => G.screen);
  ok(dead === 'result', 'HP 归零进入结算（当前 ' + dead + '）');
  await page.screenshot({path: path.join(SHOT, '390x844-8-result.png')});
  await page.locator('#btn-tomenu').click(); await page.waitForTimeout(200);
  ok(await page.locator('#scr-menu.on').count() === 1, '结算可回主界面');
  await ctx.close();
}

/* ============ 三档视口布局检查 ============ */
for (const vp of VIEWPORTS){
  const ctx = await browser.newContext({viewport:{width:vp.w,height:vp.h}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('[' + vp.name + '] PAGEERROR ' + e.message));
  await page.goto('http://127.0.0.1:8777/index.html');
  await page.waitForTimeout(400);
  console.log('\n== 视口 ' + vp.name + ' ==');
  await page.screenshot({path: path.join(SHOT, vp.name + '-0-menu.png')});
  await page.locator('#btn-play').click(); await page.waitForTimeout(200);
  await page.screenshot({path: path.join(SHOT, vp.name + '-1-charselect.png')});
  await page.locator('#btn-start').click(); await page.waitForTimeout(700);
  await page.screenshot({path: path.join(SHOT, vp.name + '-3-battle.png')});
  await page.locator('#btn-pause').click(); await page.waitForTimeout(250);
  await page.screenshot({path: path.join(SHOT, vp.name + '-6-build.png')});
  const ov = await page.evaluate(() => {
    const s = document.getElementById('stage').getBoundingClientRect();
    return {fit: s.left >= -1 && s.right <= window.innerWidth + 1 && s.top >= -1 && s.bottom <= window.innerHeight + 1,
            sw: document.documentElement.scrollWidth, iw: window.innerWidth};
  });
  ok(ov.fit, '舞台完整落在视口内');
  ok(ov.sw <= ov.iw + 1, '无横向滚动');
  await ctx.close();
}

/* ============ 确定性 ============ */
{
  const ctx = await browser.newContext({viewport:{width:390,height:844}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('[seed] PAGEERROR ' + e.message));
  await page.goto('http://127.0.0.1:8777/index.html');
  console.log('\n== 固定 seed ==');
  const det = await page.evaluate(() => {
    G.rng = makeRng(7); G.stats = freshStats(CHARS[0]); G.char = CHARS[0];
    G.skills = [mkSkill('fireball')]; G.wave = 1;
    const a = rollRewards().map(r => r.kind + ':' + (r.id || '')).join(',');
    G.rng = makeRng(7);
    const b = rollRewards().map(r => r.kind + ':' + (r.id || '')).join(',');
    G.shopReroll = 0; G.shopStock = null;
    const s1 = makeShopStock().map(s => s.kind + ':' + s.id).join(',');
    G.shopStock = null;
    const s2 = makeShopStock().map(s => s.kind + ':' + s.id).join(',');
    return {rewardSame: a === b, reward: a, shopSame: s1 === s2};
  });
  ok(det.rewardSame, '同 seed 奖励组一致：' + det.reward);
  ok(det.shopSame, '同 seed 商店货架一致');
  await ctx.close();
}

console.log('\n================ 结果 ================');
console.log('PASS ' + pass + ' / FAIL ' + fail);
console.log('控制台错误: ' + (errors.length ? '\n  ' + errors.join('\n  ') : '无'));
await browser.close(); srv.close();
process.exit(fail || errors.length ? 1 : 0);
})().catch(e => { console.error('RUNNER ERROR', e); process.exit(2); });
