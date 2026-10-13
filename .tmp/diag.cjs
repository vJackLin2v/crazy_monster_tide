const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await sleep(20000);
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(() => { const v = window.cc.view.getVisibleSize(); return { w: v.width, h: v.height }; });
  const toPage = (gx, gy) => ({ x: box.x + (gx + vs.w/2)/vs.w*box.width, y: box.y + (vs.h/2 - gy)/vs.h*box.height });
  const tap = async (gx, gy) => { const p = toPage(gx, gy); await page.mouse.click(p.x, p.y); await sleep(900); };

  await tap(0, -40);                 // 开始游戏
  await tap(76, -272);               // 开始闯关
  await sleep(6000);

  const r = await page.evaluate(() => {
    const cc = window.cc; const sc = cc.director.getScene();
    const find = (n, p, d=0) => { if (d>10||!n) return null; if (p(n)) return n;
      for (const c of n.children) { const t = find(c, p, d+1); if (t) return t; } return null; };
    const ui = find(sc, n => n.name === 'UiRoot');
    const hud = find(sc, n => n.name === 'HudRoot');
    const out = { uiKids: ui ? ui.children.map(c => c.name) : [] };
    if (!hud) { out.hud = 'NOT FOUND'; return out; }
    const labels = [];
    const walk = (n, d = 0) => {
      if (d > 6) return;
      const l = n.getComponent && n.getComponent(cc.Label);
      if (l && l.string) labels.push({ s: l.string, pos: [Math.round(n.position.x), Math.round(n.position.y)],
                                       size: Math.round(l.fontSize) });
      for (const c of n.children) walk(c, d + 1);
    };
    walk(hud);
    out.labels = labels;
    const battle = find(sc, n => n.name === 'Battle');
    out.paused = battle ? battle.getComponent('Battle') ? battle.getComponent('Battle').paused : null : null;
    return out;
  });
  console.log('UiRoot 子节点:', JSON.stringify(r.uiKids));
  console.log('HUD 文字:');
  for (const l of (r.labels || [])) console.log('   "' + l.s + '"  @(' + l.pos + ')  ' + l.size + 'px');
  await page.locator('canvas').screenshot({ path: 'screenshots/diag-battle.png' });
  console.log('截图 diag-battle.png');
  await b.close();
})();
