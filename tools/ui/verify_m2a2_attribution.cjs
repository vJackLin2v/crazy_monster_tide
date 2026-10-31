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
    const e = b.enemies[0];
    if (!e) return { error: 'no enemy' };
    e.maxhp = 1e7; e.hp = 1e7;
    const rt = { cd: 0, dmg: 10, spd: 100, size: 6, count: 1, fan: 0, pierce: 0, bounce: 0,
      split: 0, chain: 0, echo: 0, burn: 0, slow: 0, vamp: 0, thunder: 0, thornmail: 0, harvest: false };
    // 1) lingering 区域：父技能 fireball，随后把全局最后施法改成 ice_spear
    b.rs.skills[0].mods.push('lingering');
    b.telSkillId = 'fireball';
    for (let i = 0; i < 30; i++) b.hitEnemy(e, 2, rt, undefined, false, 'normal', undefined, 'fireball');
    const areas = b.areas.filter(a => a.tag === 'lingering');
    const areaSkill = areas[0] ? areas[0].telSkill : null;
    b.telSkillId = 'ice_spear';
    await new Promise(r => setTimeout(r, 1200));
    const afterArea = b.telemetry.toRecord();
    const fb = afterArea.skills.find(s => s.skillId === 'fireball');
    const ice = afterArea.skills.find(s => s.skillId === 'ice_spear');
    // 2) execute：父技能 fireball
    b.rs.skills[0].mods.push('execute');
    e.hp = Math.max(1, e.maxhp * 0.2);
    b.hitEnemy(e, 5, rt, undefined, false, 'normal', undefined, 'fireball');
    const rec = b.telemetry.toRecord();
    const ex = rec.modules.find(m => m.moduleId === 'execute');
    return {
      areaSkill,
      fireballDamage: fb ? fb.damageTotal : 0,
      iceDamage: ice ? ice.damageTotal : 0,
      lingeringRelated: rec.modules.find(m => m.moduleId === 'lingering')?.relatedSkillIds || [],
      executeRelated: ex?.relatedSkillIds || [],
    };
  });
  console.log(JSON.stringify(out));
  console.log('errors=' + (errs.join(' | ') || 'none'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
