const { chromium } = require('playwright');
const OUT = 'H:/AI-game/crazy_monster_tide/screenshots/regression';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(8500);
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);
  await ev("(G.charId='knight', G.startBattle(), 1)"); await sleep(4200);
  await ev("(() => { const rs=G.battle.rs; rs.skills.push({id:'ice_spear',lvl:2,mods:['multi','pierce']},{id:'meteor',lvl:1,mods:['burn']},{id:'holybolt',lvl:3,mods:['echo']}); rs.items.push({id:'power_l'},{id:'haste_s'},{id:'count_l'},{id:'crit_l'},{id:'vamp_l'},{id:'armor_l'},{id:'speed_l'},{id:'gold_l'},{id:'hp_l'},{id:'regen_l'}); rs.modsBag=['multi','pierce','fan','burn','split','orbit','giant','rapid','snipe','frost','bounce','chain']; G.battle.paused=true; G.pauseTab=0; G.showPause(); return 1; })()");
  await sleep(900);
  await page.locator('canvas').screenshot({ path: OUT + '/drawer-skill-fix.png' });
  for (const [i, name] of [[1, 'drawer-mod-fix'], [2, 'drawer-item-fix'], [3, 'drawer-attr-fix']]) {
    await ev("(G.closeModal(), G.pauseTab=" + i + ", G.showPause(), 1)"); await sleep(700);
    await page.locator('canvas').screenshot({ path: OUT + '/' + name + '.png' });
  }
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
