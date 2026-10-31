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
  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    G.charId = 'mage'; G.startBattle();
    setTimeout(() => {
      const rs = G.battle.rs;
      rs.skills = [
        { id: 'ring_blade', lvl: 1, mods: [] },
        { id: 'mine_field', lvl: 1, mods: [] },
        { id: 'sentry', lvl: 1, mods: [] },
        { id: 'charge_pulse', lvl: 1, mods: [] },
      ];
    }, 600);
  });
  await sleep(12000);
  const st = await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    const bt = G.battle;
    return { wave: bt.rs.wave, kills: bt.rs.kills, enemies: bt.enemies.length,
             orbits: Object.keys(bt['orbits']).length, traps: bt['traps'].length,
             sentries: bt['sentries'].length, charges: Object.keys(bt['charges']).length,
             skills: bt.rs.skills.map(s => s.id) };
  });
  console.log('state=' + JSON.stringify(st));
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
