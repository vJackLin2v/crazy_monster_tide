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
  const res = await page.evaluate(async () => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 40 || !n) return null; if (p(n)) return n; for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    const g = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    g.charId = 'knight'; await g.startBattle(); await new Promise(r => setTimeout(r, 600));
    const out = {};
    // 普通选卡：手动进入升级暂停态
    g.battle.paused = true; g.battle.pendingUps = 1;
    g.showLevelUp(g.battle.rs.rollRewards());
    out.before = { paused: g.battle.paused, phase: g.phase };
    const t0 = g.battle.runTime;
    g.pickReward(-1);
    await new Promise(r => setTimeout(r, 1200));
    out.afterSkip = { paused: g.battle.paused, phase: g.phase, dRun: +(g.battle.runTime - t0).toFixed(2), pending: g.battle.pendingUps };
    // 选黑科技：进入安装屏 -> 关闭
    g.battle.paused = true; g.battle.pendingUps = 1;
    g.pendingRewards = [{ kind: 'module', id: 'burn', name: '灼烧' }];
    g.showLevelUp(g.pendingRewards);
    g.pickReward(0);
    out.install = { paused: g.battle.paused, phase: g.phase, ret: g.installReturn };
    g.afterInstall();
    await new Promise(r => setTimeout(r, 800));
    out.afterInstall = { paused: g.battle.paused, phase: g.phase, pending: g.battle.pendingUps };
    return out;
  });
  console.log(JSON.stringify(res));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
