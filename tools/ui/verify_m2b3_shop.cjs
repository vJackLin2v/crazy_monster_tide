const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  const out = await page.evaluate(async () => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 40 || !n) return null; if (p(n)) return n; for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    const g = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    g.charId = 'monk'; await g.startBattle();
    await new Promise(r => setTimeout(r, 500));
    const rs = g.battle.rs;
    rs.skills = [{ id: 'meteor', lvl: 1, mods: [] }];
    rs.stats.modCdrMul = 1.25;
    rs.wave = 5; rs.gold = 100;
    rs.shopStock = [
      { kind: 'module', id: 'multi', price: 20, basePrice: 20, sold: false, locked: false },
      { kind: 'module', id: 'burn', price: 20, basePrice: 20, sold: false, locked: false },
      { kind: 'module', id: 'giant', price: 20, basePrice: 20, sold: false, locked: false },
      { kind: 'module', id: 'rapid_2', price: 20, basePrice: 20, sold: false, locked: false },
    ];
    g.phase = 'shop';
    g.renderShop();
    await new Promise(r => setTimeout(r, 300));
    const labels = [];
    const walk = n => { if (!n) return; const l = n.getComponent && n.getComponent('cc.Label'); if (l && l.string) labels.push(l.string); for (const c of n.children) walk(c); };
    walk(sc);
    return { labels: labels.filter(x => x.includes('需要') || x.includes('兼容') || x.includes('冷却') || x.includes('Lv.2')) };
  });
  console.log(JSON.stringify(out));
  await page.screenshot({ path: 'H:/AI-game/crazy_monster_tide/deliverables/m2b3_ui_shop_incompatible.png', fullPage: false });
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
