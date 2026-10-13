const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(25000);
  const r = await page.evaluate(() => {
    const cc = window.cc;
    const scene = cc.director.getScene();
    const find = (n, pred, d = 0) => { if (d > 8 || !n) return null; if (pred(n)) return n;
      for (const c of n.children) { const t = find(c, pred, d + 1); if (t) return t; } return null; };
    const world = find(scene, n => n.name === 'World');
    const player = find(scene, n => n.name.indexOf('player:') === 0);
    const unit = find(scene, n => n.name === 'Unit');
    const vs = cc.view.getVisibleSize();
    const s = world.scale.x;
    const out = [];
    for (const c of unit.children) {
      const sp = c.getComponent(cc.Sprite);
      const ut = c.getComponent(cc.UITransform);
      out.push({
        name: c.name,
        pos: [Math.round(c.position.x), Math.round(c.position.y)],
        dxDesign: Math.round((c.position.x - player.position.x) * s),
        dyDesign: Math.round((c.position.y - player.position.y) * s),
        hasFrame: !!(sp && sp.spriteFrame),
        size: ut ? [Math.round(ut.contentSize.width), Math.round(ut.contentSize.height)] : null,
        active: c.active, scale: +c.scale.x.toFixed(2),
      });
    }
    return { worldPos: [Math.round(world.position.x), Math.round(world.position.y)], s: +s.toFixed(3),
             visible: [vs.width, vs.height], playerPos: [Math.round(player.position.x), Math.round(player.position.y)],
             nodes: out };
  });
  console.log('world:', JSON.stringify(r.worldPos), 's=', r.s, 'visible=', JSON.stringify(r.visible), 'player=', JSON.stringify(r.playerPos));
  console.log('节点数:', r.nodes.length);
  for (const n of r.nodes) console.log('  ', JSON.stringify(n));
  await b.close();
})();
