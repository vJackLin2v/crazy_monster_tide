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
    g.charId = 'knight'; await g.startBattle();
    const b = g.battle;
    await new Promise(r => setTimeout(r, 500));
    const rt = { cd: 0, dmg: 10, spd: 0, size: 30, count: 1, fan: 0, pierce: 0, bounce: 0, split: 0, chain: 0, echo: 0, burn: 0, slow: 0, vamp: 0, thunder: 0, thornmail: 0, harvest: false };
    const inside = b.enemies[0];
    const outside = b.enemies[1];
    inside.hp = 10000; inside.maxhp = 10000; inside.spd = 0; inside.dmg = 0; inside.x = b.px + 40; inside.y = b.py; inside.dead = false;
    if (outside) { outside.hp = 10000; outside.maxhp = 10000; outside.spd = 0; outside.dmg = 0; outside.x = b.px + 100; outside.y = b.py; outside.dead = false; }
    const hp0 = inside.hp, out0 = outside ? outside.hp : 0;
    b.spawnArea(b.px, b.py, 56, 10, 0.45, 'pulse', undefined, rt, 0.45, 'frostring');
    await new Promise(r => setTimeout(r, 800));
    const rec = b.telemetry.toRecord();
    const sk = rec.skills.find(s => s.skillId === 'frostring');
    return {
      insideDamage: hp0 - inside.hp,
      outsideDamage: outside ? out0 - outside.hp : 0,
      areasAfter: b.areas.length,
      hits: sk ? sk.hitCount : 0,
    };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
