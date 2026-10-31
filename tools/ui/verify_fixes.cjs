/**
 * P0/P2/P3 修复验证：A1 滚动区回收 / A2 跨局残留 / A3 技能运行时清理 / D 关键界面截图。
 * 前提：web-mobile 已构建；serve.cjs 在 8123。
 */
const path = require('path');
const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const OUT = 'H:/AI-game/crazy_monster_tide/deliverables/fix_2026-10-31/screenshots';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('ERR ' + e.message.slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); });
  const shot = async (n) => page.locator('canvas').screenshot({ path: path.join(OUT, n) });
  const G = (fn) => page.evaluate(fn);

  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await sleep(10000);
  await G(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await sleep(10000);
  await G(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => {
      if (d > 30 || !n) return null;
      if (p(n)) return n;
      for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; }
      return null;
    };
    window.__G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
  });

  // A2：注入上一局残留 → 重开一局 → 必须全清
  await G(async () => { await window.__G.startBattle(); });
  await sleep(5000);
  const a2 = await G(async () => {
    const b = window.__G.battle;
    const rt = b.rs.skillRuntime(0);
    b.traps.push({ x: 10, y: 10, t: 0, armed: true, dmg: 5, rt });
    b.sentries.push({ x: 10, y: 10, t: 0, cd: 0, dmg: 5, rt });
    b.charges[0] = { t: 0, dmg: 5, r: 60, rt };
    b.orbits[0] = { n: 2, radius: 40, dmg: 5, rot: 0, tick: 0, rt };
    b.runTime = 99;
    await window.__G.startBattle();
    return {
      traps: b.traps.length, sentries: b.sentries.length,
      charges: Object.keys(b.charges).length, orbits: Object.keys(b.orbits).length,
      runTime: b.runTime, healSpent: b.healBudgetSpent,
    };
  });
  await sleep(1000);
  console.log('A2=' + JSON.stringify(a2));

  // A3：技能被替换/丢弃后运行时清零
  const a3 = await G(() => {
    const b = window.__G.battle;
    const rt = b.rs.skillRuntime(0);
    b.orbits[0] = { n: 2, radius: 40, dmg: 5, rot: 0, tick: 0, rt };
    b.charges[0] = { t: 0, dmg: 5, r: 60, rt };
    b.castCount[0] = 2;
    b.clearSkillRuntime(0);
    return {
      orbits: Object.keys(b.orbits).length, charges: Object.keys(b.charges).length,
      cast: Object.keys(b.castCount).length,
    };
  });
  console.log('A3=' + JSON.stringify(a3));

  // A1：反复重建图鉴（每次 makeScroll）后，有效滚动区数量应有界
  const a1 = [];
  for (let i = 0; i < 40; i++) {
    await G(() => { window.__G.showCodex(); });
    await sleep(30);
    if (i === 9 || i === 19 || i === 39) a1.push(await G(() => window.__scrollAreas()));
  }
  console.log('A1=' + JSON.stringify(a1));

  // D 截图：图鉴 / 安装屏 / 暂停抽屉 / 战斗 HUD
  await G(() => { window.__G.showCodex(); });
  await sleep(1200);
  await shot('codex.png');

  await G(() => { window.__G.showMenu(); });
  await sleep(800);
  await G(async () => { await window.__G.startBattle(); });
  await sleep(5000);
  await G(() => {
    const g = window.__G, rs = g.battle.rs;
    rs.modsBag.push('burn', 'frost', 'thunder');
    g.showInstall('pause');
    g.selectBag(0);          // 选中背包里的黑科技：顶部提示会进入"空槽=装上，占用=替换"
    g.renderInstall();
  });
  await sleep(1200);
  await shot('install.png');

  await G(() => { window.__G.closeModal(); window.__G.showPause(); });
  await sleep(1200);
  await shot('drawer.png');

  await G(() => { window.__G.closeModal(); const g = window.__G; g.battle.paused = true; });
  await sleep(500);
  await shot('hud.png');

  console.log('errors=' + (errs.slice(0, 6).join(' | ') || 'none'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
