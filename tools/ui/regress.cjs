const { chromium } = require('playwright');
const OUT = 'H:/AI-game/crazy_monster_tide/screenshots/regression';
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 140)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);
  const shot = async (n) => { await page.locator('canvas').screenshot({ path: OUT + '/' + n + '.png' }); };

  // 三档数据：空 / 3 技能+3 道具 / 满 4 技能+9 道具
  const setups = {
    empty: "rs.skills.length=1; rs.skills[0].mods=[]; rs.items.length=0;",
    mid: "rs.skills.push({id:'ice_spear',lvl:1,mods:['multi','pierce']},{id:'meteor',lvl:2,mods:['burn']}); rs.items.push({id:'power_l'},{id:'haste_s'},{id:'count_l'});",
    full: "rs.skills.push({id:'ice_spear',lvl:1,mods:['multi','pierce','fan']},{id:'meteor',lvl:3,mods:['burn','split']},{id:'holybolt',lvl:2,mods:['echo']}); rs.items.push({id:'power_l'},{id:'haste_s'},{id:'count_l'},{id:'crit_l'},{id:'vamp_l'},{id:'armor_l'},{id:'speed_l'},{id:'gold_l'},{id:'hp_l'});",
  };
  for (const key of Object.keys(setups)) {
    await ev("(G.charId='knight', G.startBattle(), 1)"); await sleep(4200);
    await ev("(() => { const rs=G.battle.rs; " + setups[key] + " G.battle.paused=true; G.pauseTab=0; G.showPause(); return 1; })()");
    await sleep(600);
    await shot('drawer-skill-' + key);
    await ev("(G.closeModal(), G.pauseTab=1, G.showPause(), 1)"); await sleep(500); await shot('drawer-mod-' + key);
    await ev("(G.closeModal(), G.pauseTab=2, G.showPause(), 1)"); await sleep(500); await shot('drawer-item-' + key);
    await ev("(G.closeModal(), G.pauseTab=3, G.showPause(), 1)"); await sleep(500); await shot('drawer-attr-' + key);
    await ev("(G.closeModal(), G.endShown=false, G.showResult(true), 1)"); await sleep(900); await shot('result-' + key);
    await ev("(G.closeModal(), G.showMenu(), 1)"); await sleep(300);
  }
  // 商店：三种状态（可买 / 买过 / 锁定）
  await ev("(G.charId='knight', G.startBattle(), 1)"); await sleep(4200);
  await ev("(() => { const rs=G.battle.rs; rs.gold=120; rs.shopStock=[{kind:'module',id:'fan',price:20,sold:false,locked:true},{kind:'item',id:'count_l',price:18,sold:true,locked:false},{kind:'item',id:'power_l',price:999,sold:false,locked:false},{kind:'heal',id:'heal',price:15,sold:false,locked:false}]; G.battle.paused=true; G.phase='shop'; G.renderShop(); return 1; })()");
  await sleep(900); await shot('shop-states');
  console.log('regression shots:', fs.readdirSync(OUT).length, 'errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
