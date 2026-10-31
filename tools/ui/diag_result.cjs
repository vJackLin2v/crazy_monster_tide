const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const logs = [];
  page.on('pageerror', e => logs.push('PAGEERR ' + e.message.slice(0, 160)));
  page.on('console', m => { const t = m.text(); if (m.type() === 'error' || t.includes('GameRoot') || t.includes('日志')) logs.push('[' + m.type() + '] ' + t.slice(0, 160)); });
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    window.__G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    window.__G.charId = 'knight';
    window.__G.startBattle();
  });
  await sleep(5000);
  const phase = await page.evaluate(() => ({ phase: window.__G.phase, hasBattle: !!window.__G.battle }));
  console.log('phase=', JSON.stringify(phase));
  const res = await page.evaluate(() => {
    try {
      const G = window.__G, rs = G.battle.rs;
      rs.skills = [{ id: 'fireball', lvl: 3, mods: ['multi'] }];
      rs.items = [{ id: 'power_s' }, { id: 'power_s' }];
      G.showResult(true);
      return 'ok';
    } catch (e) { return 'ERR ' + (e && e.message); }
  });
  console.log('showResult=', res);
  await sleep(1500);
  await page.locator('canvas').screenshot({ path: 'screenshots/delivery/20-result-v2.png' });
  console.log('logs=' + (logs.slice(0, 6).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });