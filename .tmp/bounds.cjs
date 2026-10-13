/* UI 边界检查：遍历所有 UI 节点，报出超出屏幕的（量化，不靠肉眼） */
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HALF_W = 180, HALF_H = 320;

const check = async (page, label) => {
  const r = await page.evaluate(({ HW, HH }) => {
    const cc = window.cc; const sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 10 || !n) return null; if (p(n)) return n;
      for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    const ui = find(sc, n => n.name === 'UiRoot');
    const bad = [], all = [];
    const walk = (n, d = 0) => {
      if (d > 7 || !n.active) return;
      let ut = null, lb = null;
      try { ut = n.getComponent('cc.UITransform'); } catch (e) {}
      try { lb = n.getComponent('cc.Label'); } catch (e) {}
      if (!ut && n._uiProps && n._uiProps.uiTransformComp) ut = n._uiProps.uiTransformComp;
      if (ut) {
        const w = ut.contentSize.width, h = ut.contentSize.height;
        const l = n.position.x - w / 2, rr = n.position.x + w / 2;
        const t2 = n.position.y + h / 2, b2 = n.position.y - h / 2;
        if (rr > HW + 1 || l < -HW - 1 || t2 > HH + 1 || b2 < -HH - 1) {
          bad.push({ name: n.name, text: lb ? lb.string : '', pos: [Math.round(n.position.x), Math.round(n.position.y)],
                     size: [Math.round(w), Math.round(h)],
                     out: { 左: Math.round(l), 右: Math.round(rr), 上: Math.round(t2), 下: Math.round(b2) } });
        }
        all.push(n.name);
      }
      for (const c of n.children) walk(c, d + 1);
    };
    let probe = { hasUi: !!ui, kids: ui ? ui.children.map(c => c.name) : [] };
    if (ui) for (const c of ui.children) walk(c, 0);
    return { bad, count: all.length, probe };
  }, { HW: HALF_W, HH: HALF_H });
  console.log('── ' + label + ' ──  节点 ' + r.count + ' 个，越界 ' + r.bad.length + ' 个   探测:' + JSON.stringify(r.probe));
  for (const b of r.bad.slice(0, 12)) {
    console.log('   ❌ ' + b.name + (b.text ? ' "' + b.text.slice(0, 20) + '"' : '') +
      '  位置(' + b.pos + ') 尺寸(' + b.size + ')  → 左' + b.out.左 + ' 右' + b.out.右 + ' 上' + b.out.上 + ' 下' + b.out.下);
  }
  console.log('');
};

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await sleep(20000);
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(() => { const v = window.cc.view.getVisibleSize(); return { w: v.width, h: v.height }; });
  const toPage = (gx, gy) => ({ x: box.x + (gx + vs.w/2)/vs.w*box.width, y: box.y + (vs.h/2 - gy)/vs.h*box.height });
  const tap = async (gx, gy) => { const p = toPage(gx, gy); await page.mouse.click(p.x, p.y); await sleep(1000); };

  await check(page, '主界面 scr-menu');
  await tap(0, -40);
  await check(page, '角色选择 scr-charselect');
  await tap(76, -272);
  await sleep(6000);
  await check(page, '战斗 HUD');
  await tap(152, 286);        // 暂停 -> Build 抽屉
  await check(page, 'Build 抽屉 scr-build');
  await b.close();
})();
