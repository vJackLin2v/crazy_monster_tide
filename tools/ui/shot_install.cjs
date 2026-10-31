const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('ERR ' + e.message.slice(0, 120)));
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
    rs.modsBag = ['multi', 'multi', 'multi', 'giant', 'rapid_2', 'burn', 'frost', 'chain', 'snipe', 'thunder', 'vamp', 'harvest'];
    rs.skills[0].mods = ['multi', 'giant'];
    G.showInstall('pause');
  });
  await sleep(1200);
  await page.locator('canvas').screenshot({ path: 'screenshots/delivery/22-install.png' });
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });