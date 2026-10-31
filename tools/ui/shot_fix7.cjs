const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 120)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  // 直接点菜单开始，看是否进难度页
  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    window.__G = G;
    G.showDifficulty();
  });
  await sleep(1200);
  const hasDiff = await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    return !!find(sc, n => n.name === 'scr-difficulty');
  });
  console.log('difficulty screen =', hasDiff);
  await page.locator('canvas').screenshot({ path: 'screenshots/delivery/19-difficulty-v2.png' });
  // 结算页：造一局数据后直接调用
  await page.evaluate(() => {
    const G = window.__G;
    G.charId = 'knight';
    G.startBattle();
  });
  await sleep(4000);
  await page.evaluate(() => {
    const G = window.__G, rs = G.battle.rs;
    rs.skills = [{ id: 'fireball', lvl: 3, mods: ['multi', 'burn'] }, { id: 'ring_blade', lvl: 2, mods: ['giant'] }];
    rs.items = [{ id: 'power_s' }, { id: 'power_s' }, { id: 'haste_s' }, { id: 'bloodpact' }];
    G.showResult(true);
  });
  await sleep(1500);
  await page.locator('canvas').screenshot({ path: 'screenshots/delivery/20-result-v2.png' });
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });