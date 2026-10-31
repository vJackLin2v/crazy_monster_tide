const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 150)));
  page.on('console', m => { if (m.type() === 'error') errs.push('ERR ' + m.text().slice(0, 150)); });
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(8500);
  const got = await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    G.save.selectedDifficulty = 'casual';
    G.charId = 'knight'; G.startBattle();
    return 1;
  });
  await sleep(5000);
  const st = await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    const bt = G.battle, rs = bt.rs;
    const e = bt.enemies[0];
    return { diff: rs.difficulty, wave: rs.wave, enemies: bt.enemies.length, kills: rs.kills,
             eHp: e ? Math.round(e.maxhp) : null, save: G.save.selectedDifficulty, unlocks: G.save.difficulties };
  });
  console.log('state=' + JSON.stringify(st));
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
