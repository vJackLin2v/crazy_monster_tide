const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
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
    const base = { cd: 0, dmg: 1, spd: 100, size: 6, count: 1, fan: 0, pierce: 0, bounce: 0,
      split: 0, chain: 0, echo: 0, burn: 0, slow: 0, vamp: 0, thunder: 0, thornmail: 0, harvest: false };
    const es = b.enemies.slice(0, 5);
    for (const e of es) { e.hp = 1e7; e.maxhp = 1e7; }
    const e0 = es[0], e1 = es[1];
    if (e1) { e1.x = e0.x + 50; e1.y = e0.y; }
    // chain
    b.spawnBullet(e0.x - 12, e0.y, 100, 0, { ...base, chain: 1 }, undefined, undefined, false, false, 1.2, 'normal', undefined, 'fireball');
    await new Promise(r => setTimeout(r, 700));
    // split
    if (es[2]) {
      b.spawnBullet(es[2].x - 12, es[2].y, 100, 0, { ...base, split: 1 }, undefined, undefined, false, false, 1.2, 'normal', undefined, 'fireball');
      await new Promise(r => setTimeout(r, 700));
    }
    const rec = b.telemetry.toRecord();
    return {
      chain: rec.modules.find(m => m.moduleId === 'chain')?.relatedSkillIds || [],
      split: rec.modules.find(m => m.moduleId === 'split')?.relatedSkillIds || [],
      fireballHits: rec.skills.find(s => s.skillId === 'fireball')?.hitCount || 0,
    };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
