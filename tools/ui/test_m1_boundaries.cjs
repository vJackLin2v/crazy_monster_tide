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
    const has = (name) => !!find(sc, n => n.name === name);
    const r = {};
    g.charId = 'knight'; await g.startBattle(); await new Promise(x => setTimeout(x, 400));
    // A. 升级中死亡/结算
    g.battle.paused = true; g.battle.pendingUps = 1;
    g.showLevelUp(g.battle.rs.rollRewards());
    g.showResult(false);
    await new Promise(x => setTimeout(x, 300));
    r.deathDuringLevelup = { phase: g.phase, levelup: has('scr-levelup'), result: has('scr-result') };
    // B. 连续升级（pendingUps=2）
    await g.startBattle(); await new Promise(x => setTimeout(x, 400));
    g.battle.paused = true; g.battle.pendingUps = 2;
    g.showLevelUp(g.battle.rs.rollRewards());
    g.pickReward(-1);
    await new Promise(x => setTimeout(x, 300));
    r.afterFirst = { phase: g.phase, paused: g.battle.paused, pending: g.battle.pendingUps, levelup: has('scr-levelup') };
    g.pickReward(-1);
    await new Promise(x => setTimeout(x, 300));
    r.afterSecond = { phase: g.phase, paused: g.battle.paused, pending: g.battle.pendingUps, levelup: has('scr-levelup') };
    // C. 安装屏返回
    g.battle.paused = true; g.battle.pendingUps = 1;
    g.pendingRewards = [{ kind: 'module', id: 'burn', name: '灼烧' }];
    g.showLevelUp(g.pendingRewards);
    g.pickReward(0);
    await new Promise(x => setTimeout(x, 300));
    g.afterInstall();
    await new Promise(x => setTimeout(x, 300));
    r.installReturn = { phase: g.phase, paused: g.battle.paused, pending: g.battle.pendingUps };
    return r;
  });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
