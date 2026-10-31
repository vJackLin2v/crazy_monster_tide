const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  const logs = [];
  page.on('pageerror', e => logs.push('PAGEERR ' + e.message.slice(0, 200)));
  page.on('console', m => { const t = m.text(); if (t.includes('[Shop]') || m.type() === 'error') logs.push(m.type() + ': ' + t.slice(0, 220)); });
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
    rs.wave = 6;
    rs.items = Array.from({ length: 19 }, (_, i) => ({ id: i % 2 ? 'power_s' : 'haste_s' }));
    G.showShop();
  });
  await sleep(1500);
  console.log(logs.join('\n') || 'no logs');
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });