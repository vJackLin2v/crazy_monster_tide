const path = require('path');
const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const OUT = 'H:/AI-game/crazy_monster_tide/deliverables/fix2_2026-10-31/screenshots';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message.slice(0, 160)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 30 || !n) return null; if (p(n)) return n; for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    window.__G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
  });
  await page.evaluate(async () => { const g = window.__G; g.charId = 'knight'; await g.startBattle(); });
  await sleep(1500);
  await page.evaluate(() => { const g = window.__G; g.showLevelUp(g.battle.rs.rollRewards()); });
  const before = await page.evaluate(() => { const b = window.__G.battle; return { run: b.runTime, waveLeft: b.waveLeft, kills: b.rs.kills }; });
  await sleep(1500);
  const after = await page.evaluate(() => { const b = window.__G.battle; return { run: b.runTime, waveLeft: b.waveLeft, kills: b.rs.kills, paused: b.paused }; });
  await page.locator('canvas').screenshot({ path: path.join(OUT, 'levelup_continue.png') });
  console.log('LEVELUP=' + JSON.stringify({ before, after }));
  // 已购道具详情
  await page.evaluate(() => { const g = window.__G; g.closeModal(); g.battle.rs.items.push({ id: 't_fire' }, { id: 't_fire' }); g.showShop(); });
  await sleep(900);
  await page.mouse.click(42, 556);
  await sleep(800);
  await page.locator('canvas').screenshot({ path: path.join(OUT, 'owned_detail.png') });
  console.log('done');
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
