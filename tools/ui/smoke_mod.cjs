const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push('ERR ' + m.text().slice(0, 160)); });
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(8500);
  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    G.charId = 'knight'; G.startBattle();
    setTimeout(() => {
      const rs = G.battle.rs;
      rs.skills[0].mods = ['killblast', 'execute', 'overcharge', 'shieldonhit', 'returnstrike', 'lingering'];
    }, 800);
  });
  await sleep(9000);
  const st = await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    const bt = G.battle;
    return { wave: bt.rs.wave, enemies: bt.enemies.length, kills: bt.rs.kills, shield: bt['shield'], zones: bt['areas'].length,
             cast: bt['castCount'], hp: Math.round(bt.rs.stats.hp) };
  });
  console.log('state=' + JSON.stringify(st));
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
