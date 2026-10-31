/**
 * 阶段3 交付截图：主菜单 / 战斗 / 商店 / 结算 / 无尽徽章。
 * 前提：cocos/build/web-mobile 已构建，node tools/ui/serve.cjs 正在 8123 端口服务。
 * 用 playwright-core + 本机 Chrome（避免额外下载浏览器）。
 */
const path = require('path');
const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const OUT = 'H:/AI-game/crazy_monster_tide/deliverables/stage3_2026-10-31/screenshots';

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

  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await sleep(11000);

  const canvas = page.locator('canvas');
  await canvas.screenshot({ path: path.join(OUT, 'main_menu.png') });

  await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => {
      if (d > 30 || !n) return null;
      if (p(n)) return n;
      for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; }
      return null;
    };
    window.__G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    window.__G.charId = 'knight';
    window.__G.startBattle();
  });
  await sleep(7000);
  await canvas.screenshot({ path: path.join(OUT, 'battle.png') });

  await page.evaluate(() => {
    const G = window.__G, rs = G.battle.rs;
    rs.wave = 6;
    rs.gold = 180;
    rs.items = ['power_s', 'haste_s', 'maxhp_s', 'crit_s', 'armor_s', 'speed_s', 'greed_s', 'lifesteal_s']
      .map(id => ({ id }));
    G.showShop();
  });
  await sleep(1800);
  await canvas.screenshot({ path: path.join(OUT, 'shop.png') });

  await page.evaluate(() => { window.__G.showResult(false); });
  await sleep(1500);
  await canvas.screenshot({ path: path.join(OUT, 'result.png') });

  // 无尽：重新开一局，把波次推到 42，结算页应显示 30/40 徽章
  await page.evaluate(() => { window.__G.startBattle(); });
  await sleep(7000);
  await page.evaluate(() => {
    const G = window.__G, rs = G.battle.rs;
    rs.endless = true;
    rs.wave = 42;
    rs.kills = 520;
    G.showResult(false);
  });
  await sleep(1500);
  await canvas.screenshot({ path: path.join(OUT, 'endless.png') });

  console.log('errors=' + (errs.slice(0, 5).join(' | ') || 'none'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
