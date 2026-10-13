/* 走一遍完整 UI 流程，逐屏截图 */
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1 });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('[console] ' + m.text().slice(0, 160)); });

  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await sleep(20000);

  // 游戏坐标(设计空间 360x760，原点屏幕中心，y 向上) -> 页面坐标
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(() => { const v = window.cc.view.getVisibleSize(); return { w: v.width, h: v.height }; });
  const toPage = (gx, gy) => ({
    x: box.x + (gx + vs.w / 2) / vs.w * box.width,
    y: box.y + (vs.h / 2 - gy) / vs.h * box.height,
  });
  const tap = async (gx, gy, label) => {
    const p = toPage(gx, gy);
    await page.mouse.click(p.x, p.y);
    console.log('  点击 ' + label + ' @(' + gx + ',' + gy + ') -> 页面(' + Math.round(p.x) + ',' + Math.round(p.y) + ')');
    await sleep(900);
  };
  const shot = async (n) => { await page.locator('canvas').screenshot({ path: 'screenshots/ui-' + n + '.png' }); console.log('  截图 ui-' + n + '.png'); };

  // 运行时确认新代码
  const state = await page.evaluate(() => {
    const cc = window.cc; const sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 8 || !n) return null; if (p(n)) return n;
      for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    const ui = find(sc, n => n.name === 'UiRoot');
    return { hasUiRoot: !!ui, uiKids: ui ? ui.children.map(c => c.name) : [],
             visible: [Math.round(cc.view.getVisibleSize().width), Math.round(cc.view.getVisibleSize().height)] };
  });
  console.log('运行时:', JSON.stringify(state));
  await shot('1-menu');

  await tap(0, -40, '开始游戏');
  await shot('2-charselect');

  await tap(76, -272, '开始闯关');
  await sleep(3500);
  await shot('3-battle');

  console.log('页面错误:', errs.length ? errs.slice(0, 6).join(' || ') : '无');
  await b.close();
})();
