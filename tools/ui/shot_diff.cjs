const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 150)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    G.save.difficulties = ['casual', 'normal', 'hard'];
    G.save.selectedDifficulty = 'hard';
    G.showDifficulty();
  });
  await sleep(1200);
  await page.locator('canvas').screenshot({ path: 'H:/AI-game/crazy_monster_tide/screenshots/delivery/18-difficulty.png' });
  const info = await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const root = find(sc, n => n.name === 'scr-difficulty');
    if (!root) return 'no screen';
    const out = [];
    const walk = (n, d) => { if (d > 5 || !n) return; if (n.name === 'diffHit') { const ut = n.getComponent('cc.UITransform'); out.push({ hit: Math.round(ut.height) }); } walk2(n.children, d); };
    function walk2(cs, d) { for (const c of cs) walk(c, d + 1); }
    walk(root, 0);
    return JSON.stringify(out);
  });
  console.log('hits=' + info);
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
