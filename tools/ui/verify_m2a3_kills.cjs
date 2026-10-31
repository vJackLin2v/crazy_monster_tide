const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
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
    const rt = { cd: 0, dmg: 10, spd: 100, size: 6, count: 1, fan: 0, pierce: 0, bounce: 0,
      split: 0, chain: 0, echo: 0, burn: 0, slow: 0, vamp: 0, thunder: 0, thornmail: 0, harvest: false };
    const e0 = b.enemies[0];
    e0.maxhp = 1e7; e0.hp = 1e6;
    // 1) 火球挂灼烧，切冰晶矛后灼烧击杀
    b.hitEnemy(e0, 1, { ...rt, burn: 1 }, undefined, false, 'normal', undefined, 'fireball');
    b.telSkillId = 'ice_spear';
    e0.hp = 1; e0.burnDmg = 10;
    await new Promise(r => setTimeout(r, 900));
    let rec = b.telemetry.toRecord();
    const fb = rec.skills.find(s => s.skillId === 'fireball');
    const ice = rec.skills.find(s => s.skillId === 'ice_spear');
    const burnRes = { fireballKills: fb ? fb.killCount : 0, iceKills: ice ? ice.killCount : 0 };
    // 2) 刺猬反伤击杀：设最近施法为 ice，反伤击杀应为 unknown
    b.rs.skills[0].mods.push('thornmail');
    const e1 = b.enemies.find(x => !x.dead && x !== e0) || b.enemies[0];
    if (e1) {
      b.telSkillId = 'ice_spear';
      e1.hp = 1; e1.maxhp = 100; e1.dmg = 10;
      e1.x = b.px; e1.y = b.py; b.inv = 0;
      await new Promise(r => setTimeout(r, 900));
    }
    rec = b.telemetry.toRecord();
    const ice2 = rec.skills.find(s => s.skillId === 'ice_spear');
    const unk = rec.skills.find(s => s.skillId === 'unknown');
    return { burnRes, thorn: { iceKills: ice2 ? ice2.killCount : 0, unknownKills: unk ? unk.killCount : 0 } };
  });
  console.log(JSON.stringify(out));
  console.log('errors=' + (errs.join(' | ') || 'none'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
