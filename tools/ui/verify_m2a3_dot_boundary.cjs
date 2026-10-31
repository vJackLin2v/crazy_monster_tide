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
    await new Promise(r => setTimeout(r, 400));
    const es = b.enemies.slice(0, 3);
    for (const e of es) { e.hp = 1; e.maxhp = 100; e.dead = false; e.burnT = 0; e.poisonT = 0; e.burnDmg = 0; e.poisonDmg = 0; e.burnTelSkill = undefined; e.poisonTelSkill = undefined; }
    const [e0, e1, e2] = es;
    if (e0) { e0.poisonT = 0; e0.poisonDmg = 999; e0.poisonTelSkill = 'ice'; e0.burnT = 0.5; e0.burnDmg = 1; e0.burnTelSkill = 'fireball'; }
    if (e1) { e1.poisonT = 0.5; e1.poisonDmg = 1; e1.poisonTelSkill = 'ice'; e1.burnT = 0; e1.burnDmg = 999; e1.burnTelSkill = 'fireball'; }
    if (e2) { e2.poisonT = 0.5; e2.poisonDmg = 1; e2.burnT = 0.5; e2.burnDmg = 2; }
    b.telSkillId = 'ice';
    await new Promise(r => setTimeout(r, 1000));
    const rec = b.telemetry.toRecord();
    const get = id => { const s = rec.skills.find(x => x.skillId === id); return s ? s.killCount : 0; };
    return { fireballKills: get('fireball'), iceKills: get('ice'), unknownKills: get('unknown') };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
