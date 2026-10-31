/**
 * 主菜单升级截图：无存档 / 有存档 / 继续恢复 / 历史列表 / 历史详情 / 历史空态 / 战斗 HUD。
 * 前提：web-mobile 已构建，tools/ui/serve.cjs 在 8123 服务。
 */
const path = require('path');
const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const OUT = 'H:/AI-game/crazy_monster_tide/deliverables/menu_history_2026-10-31/screenshots';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('ERR ' + e.message.slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); });

  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await sleep(10000);

  // 干净存档：无继续入口
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await sleep(10000);
  const canvas = page.locator('canvas');
  await canvas.screenshot({ path: path.join(OUT, 'menu_no_save.png') });

  // 抓 GameRoot
  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => {
      if (d > 30 || !n) return null;
      if (p(n)) return n;
      for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; }
      return null;
    };
    window.__G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
  });

  // 开局 → 战斗 HUD
  await page.evaluate(() => { window.__G.charId = 'knight'; window.__G.startBattle(); });
  await sleep(8000);
  await canvas.screenshot({ path: path.join(OUT, 'battle.png') });

  // 造一份中局存档并回菜单
  await page.evaluate(() => {
    const G = window.__G, rs = G.battle.rs;
    rs.wave = 12; rs.gold = 140;
    if (!rs.skills.some(s => s.id === 'sentry')) rs.skills.push({ id: 'sentry', lvl: 2, mods: ['multi'] });
    rs.stats.hp = Math.round(rs.stats.maxhp * 0.62);
    G.saveActiveRunNow();
    window.__before = JSON.stringify({
      gold: rs.gold, kills: rs.kills, wave: rs.wave,
      skills: rs.skills.map(s => s.id + ':' + s.lvl + ':' + s.mods.join(',')),
    });
    G.showMenu();
  });
  await sleep(1500);
  await canvas.screenshot({ path: path.join(OUT, 'menu_has_save.png') });

  // 继续游戏 → 恢复
  await page.evaluate(() => { window.__G.continueGame(); });
  await sleep(900);
  // 截图用：恢复后立刻回满血 + 长无敌，避免取证过程中被怪打死
  await page.evaluate(() => {
    const G = window.__G;
    if (G.battle && G.battle.rs) { G.battle.rs.stats.hp = G.battle.rs.stats.maxhp; G.battle.inv = 30; }
  });
  await sleep(6000);
  // 恢复瞬间可能正好触发升级：先跳过，再截"恢复后的战斗"
  const check = await page.evaluate(() => {
    const G = window.__G;
    if (G.pendingRewards && G.pendingRewards.length) G.pickReward(-1);
    const rs = G.battle.rs;
    const before = JSON.parse(window.__before);
    const skills = rs.skills.map(s => s.id + ':' + s.lvl + ':' + s.mods.join(','));
    // 恢复后战斗会继续推进，金币/击杀只允许增加；波次与构筑必须一致
    const match = rs.wave === before.wave
      && rs.gold >= before.gold && rs.kills >= before.kills
      && JSON.stringify(skills) === JSON.stringify(before.skills);
    return { match, after: JSON.stringify({ wave: rs.wave, gold: rs.gold, kills: rs.kills, skills }).slice(0, 140) };
  });
  await sleep(1200);
  await canvas.screenshot({ path: path.join(OUT, 'resume_battle.png') });
  console.log('resume-match=' + check.match + ' after=' + check.after);

  // 无尽模式进行中（第 25 波）
  await page.evaluate(() => {
    const G = window.__G, rs = G.battle.rs;
    rs.endless = true;
    rs.wave = 24;
    rs.stats.hp = rs.stats.maxhp;
    G.battle.inv = 3;          // 截图用短无敌，避免 2 秒内被第 25 波打死
    G.battle.advanceWave();
  });
  await sleep(2500);
  await page.evaluate(() => {
    const B = window.__G.battle;
    B.rs.stats.hp = B.rs.stats.maxhp;
    B.hurtFlash = 0;          // 清掉受击红边，截图更干净
  });
  await sleep(400);
  await canvas.screenshot({ path: path.join(OUT, 'endless.png') });

  // 结束一局 → 历史记录
  await page.evaluate(() => { const G = window.__G; G.battle.rs.wave = 14; G.showResult(false); });
  await sleep(1800);
  await canvas.screenshot({ path: path.join(OUT, 'result.png') });

  await page.evaluate(() => { window.__G.showMenu(); });
  await sleep(1200);
  await page.evaluate(() => { window.__G.showHistory(); });
  await sleep(1500);
  await canvas.screenshot({ path: path.join(OUT, 'history_list.png') });

  await page.evaluate(() => {
    const G = window.__G;
    const s = G.history.summaries[0];
    G.showHistoryDetail(s.runId);
  });
  await sleep(1500);
  await canvas.screenshot({ path: path.join(OUT, 'history_detail.png') });

  // 空态
  await page.evaluate(() => {
    const G = window.__G;
    G.history = { v: 1, summaries: [], details: {} };
    G.showHistory();
  });
  await sleep(1200);
  await canvas.screenshot({ path: path.join(OUT, 'history_empty.png') });

  console.log('errors=' + (errs.slice(0, 6).join(' | ') || 'none'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
