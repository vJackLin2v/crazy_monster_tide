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
  const info = await page.evaluate(async () => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 40 || !n) return null; if (p(n)) return n; for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    const g = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    g.charId = 'knight'; await g.startBattle(); g.battle.rs.items.push({ id: 't_fire' }, { id: 't_fire' }); g.showShop();
    await new Promise(r => setTimeout(r, 800));
    const mls = [];
    const walk = (n, d = 0) => { if (!n || d > 40) return; if (n.name === 'mlContent') mls.push(n); for (const c of n.children) walk(c, d + 1); };
    walk(sc);
    const out = mls.map(m => m.children.map(c => { const w = c.getWorldPosition(); const u = c.getComponent(cc.UITransform); return { name: c.name, wx: w.x, wy: w.y, w: u && u.width, h: u && u.height }; }));
    return { canvas: { w: cc.view.getVisibleSize().width, h: cc.view.getVisibleSize().height }, lists: out };
  });
  console.log(JSON.stringify(info).slice(0, 1500));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
