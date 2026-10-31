const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
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
    const e = b.enemies[0];
    const rt = { cd: 0, dmg: 50, spd: 100, size: 6, count: 1, fan: 0, pierce: 0, bounce: 0,
      split: 0, chain: 0, echo: 0, burn: 0, slow: 0, vamp: 0, thunder: 0, thornmail: 0, harvest: false };
    b.telSkillId = 'fireball';
    b.telemetry.cast('fireball');
    // 模拟"火球已发射、随后释放冰晶矛"：弹体自己绑定 fireball
    const bullet = b.spawnBullet(e ? e.x - 12 : b.px, e ? e.y : b.py, 1, 0, rt, undefined, undefined, false, false, 2.0, 'normal', undefined, 'fireball');
    b.telSkillId = 'ice_spear';
    b.telemetry.cast('ice_spear');
    await new Promise(r => setTimeout(r, 1200));
    const rec = b.telemetry.toRecord();
    const fb = rec.skills.find(s => s.skillId === 'fireball');
    const ice = rec.skills.find(s => s.skillId === 'ice_spear');
    return {
      bulletTel: bullet && bullet.telSkill,
      fireballDamage: fb ? fb.damageTotal : 0,
      iceDamage: ice ? ice.damageTotal : 0,
      fireballHits: fb ? fb.hitCount : 0,
    };
  });
  console.log(JSON.stringify(out));
  console.log('errors=' + (errs.join(' | ') || 'none'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
