/**
 * 主菜单 V3 截图：无存档 / 有存档 / 开始新冒险确认 / 图鉴 / 成就 / 设置。
 */
const path = require('path');
const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const OUT = 'H:/AI-game/crazy_monster_tide/deliverables/menu_v3_2026-10-31/screenshots';

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

  // 1. 无存档
  await shot('menu_no_save.png');

  // 2. 有存档
  await G(async () => {
    const g = window.__G;
    g.charId = 'knight';
    await g.startBattle();
    const rs = g.battle.rs;
    rs.wave = 12; rs.gold = 140;
    rs.stats.maxhp = 72; rs.stats.hp = 45;
    g.battle.paused = true;
    g.saveActiveRunNow();
    g.showMenu();
  });
  await sleep(1200);
  await shot('menu_has_save.png');

  // 3. 开始新冒险确认
  await G(() => { window.__G.requestStart(); });
  await sleep(1000);
  await shot('start_confirm.png');
  await G(() => { window.__G.closeModal(); });

  // 4-6. 图鉴 / 成就 / 设置
  await G(() => { window.__G.showMenu(); window.__G.showCodex(); });
  await sleep(1200);
  await shot('codex.png');
  await G(() => { window.__G.showMenu(); window.__G.showAchievements(); });
  await sleep(1200);
  await shot('achievements.png');
  await G(() => { window.__G.showMenu(); window.__G.showSettings(); });
  await sleep(1200);
  await shot('settings.png');

  console.log('errors=' + (errs.slice(0, 6).join(' | ') || 'none'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
