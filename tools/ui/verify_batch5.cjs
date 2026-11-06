const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(8000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(8000);
  const out = await page.evaluate(async () => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 50 || !n) return null; if (p(n)) return n; for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    const g = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    g.charId = 'knight'; await g.startBattle(); await new Promise(r => setTimeout(r, 300));
    const b = g.battle; b.paused = true; b.rs.stats.crit = 0;
    const e = b.enemies[0];
    b.enemies = [e]; e.x = b.px + 20; e.y = b.py; e.hp = 1000; e.maxhp = 1000; e.dead = false; e.r = 10; e.spd = 0; e.dmg = 0;
    const rt = { cd: 0, dmg: 10, spd: 200, size: 5, count: 1, fan: 0, pierce: 0, bounce: 0, orbit: 0, split: 0, chain: 0, echo: 0, burn: 0, slow: 0, vamp: 0, thunder: 0, harvest: false };
    b.rebuildEnemyGrid();
    const hp0 = e.hp;
    b.spawnBullet(b.px, b.py, 200, 0, rt, undefined, undefined, false, false, 1.0);
    b.updateBullets(0.1);
    const hp1 = e.hp;
    b.updateBullets(2.0);
    const bulletsAfter1 = b.bullets.length;
    b.rebuildEnemyGrid();
    b.spawnBullet(b.px, b.py, 200, 0, rt, undefined, undefined, false, false, 1.0);
    b.updateBullets(0.1);
    const hp2 = e.hp;
    return { hit1: hp0 - hp1, hit2: hp1 - hp2, bulletsAfter1, sameSetReused: b.hitSetPool.length > 0 };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });

