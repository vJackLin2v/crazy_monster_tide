const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 140)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    window.__G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    window.__G.charId = 'knight';
    window.__G.startBattle();
  });
  await sleep(4000);
  await page.evaluate(() => {
    const G = window.__G, rs = G.battle.rs;
    rs.skills = [{ id: 'fireball', lvl: 3, mods: ['multi'] }, { id: 'ring_blade', lvl: 2, mods: ['giant'] }, { id: 'sentry', lvl: 1, mods: [] }];
    const ids = ['power_s','power_s','haste_s','area_s','maxhp_s','speed_s','crit_s','armor_s','lifesteal_s','greed_s','bloodpact','shatter'];
    rs.items = ids.map(id => ({ id }));
    G.showResult(true);
  });
  await sleep(1500);
  await page.locator('canvas').screenshot({ path: 'screenshots/delivery/21-result-12items.png' });
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });