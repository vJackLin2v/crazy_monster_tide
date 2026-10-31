const path = require('path');
const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const OUT = 'H:/AI-game/crazy_monster_tide/deliverables/gpt_review_2026-10-31/screenshots';
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('ERR', e.message.slice(0, 120)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 40 || !n) return null; if (p(n)) return n; for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    window.__G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
  });
  const shot = (n) => page.locator('canvas').screenshot({ path: path.join(OUT, n) });
  await shot('menu_no_save.png');
  await page.evaluate(async () => { const g = window.__G; g.charId = 'knight'; await g.startBattle(); g.battle.rs.stats.hp = 45; g.battle.paused = true; g.saveActiveRunNow(); g.showMenu(); });
  await sleep(900); await shot('menu_has_save.png');
  await page.evaluate(() => window.__G.showSettings()); await sleep(700); await shot('settings.png');
  await page.evaluate(() => window.__G.showCodex()); await sleep(700); await shot('codex.png');
  await page.evaluate(() => window.__G.showAchievements()); await sleep(700); await shot('achievements.png');
  await page.evaluate(async () => { const g = window.__G; await g.startBattle(); g.battle.paused = true; g.showLevelUp(g.battle.rs.rollRewards()); });
  await sleep(900); await shot('levelup_paused.png');
  await page.evaluate(() => { const g = window.__G; g.closeModal(); g.battle.paused = false; g.showShop(); });
  await sleep(900); await shot('shop.png');
  await page.evaluate(() => { const g = window.__G; g.closeModal(); g.battle.paused = false; g.showResult(false); });
  await sleep(900); await shot('result.png');
  await page.evaluate(() => {
    const g = window.__G, now = Date.now();
    const sum = { runId:'demo', startedAt: now-600000, endedAt: now, characterId:'knight', difficulty:'normal', result:'victory', reachedWave:20, totalWaves:20, durationSeconds:612, killCount:1246, eliteKillCount:8, bossKillCount:10, goldEarned:980, goldSpent:700, endlessMode:false, finalSkillIds:['ring_blade','fireball','sentry','charge_pulse'], finalItemIds:[], badges:[] };
    const detail = { runId:'demo', endReason:'通关成功，成功守住全部 20 波',
      skills:[{id:'ring_blade',lvl:5,mods:['giant_2','burn_2']},{id:'fireball',lvl:4,mods:['split','chain']},{id:'sentry',lvl:3,mods:['multi','fan']},{id:'charge_pulse',lvl:2,mods:['echo']}],
      items:Array.from({length:20},(_,i)=>({id:['t_fire','emberstack','shatter','voltloop','thorncoat'][i%5],count:1})),
      stats:{hp:72,maxhp:72,power:1.8,gold:280,dmgDealt:45600,dmgTaken:690},
      milestones:[{wave:5,at:120,kind:'wave',text:'进入第 5 波'},{wave:10,at:300,kind:'boss',text:'BOSS 出现'},{wave:20,at:600,kind:'wave',text:'进入第 20 波'}] };
    g.history = { summaries:[sum], details:{demo:detail} };
  });
  await sleep(400);
  await page.evaluate(() => window.__G.showHistoryDetail('demo')); await sleep(900); await shot('history_detail.png');
  console.log('done');
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
