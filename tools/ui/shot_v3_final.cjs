const path = require('path');
const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const OUT = 'H:/AI-game/crazy_monster_tide/deliverables/fix2_2026-10-31/screenshots';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message.slice(0, 120)));
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
  await page.locator('canvas').screenshot({ path: path.join(OUT, 'menu_final_no_save.png') });
  await page.evaluate(async () => { const g = window.__G; g.charId = 'knight'; await g.startBattle(); g.battle.rs.stats.hp = 45; g.battle.paused = true; g.saveActiveRunNow(); g.showMenu(); });
  await sleep(1000);
  await page.locator('canvas').screenshot({ path: path.join(OUT, 'menu_final_has_save.png') });
  await page.evaluate(() => { const g = window.__G; g.closeModal(); g.showLevelUp(g.battle.rs.rollRewards()); });
  await sleep(1000);
  await page.locator('canvas').screenshot({ path: path.join(OUT, 'levelup_pause.png') });
  console.log('done');
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
