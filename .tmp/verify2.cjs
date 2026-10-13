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
    const ground = find(scene, n => n.name === 'Ground');
    const vs = cc.view.getVisibleSize();
    const s = world.scale.x;
    // 数"在可视区内"的敌人
    const camX = -world.position.x / s, camY = (vs.height / 2 - world.position.y) / s + 0;
    let onScreen = 0, total = 0;
    const cx = player.position.x, cy = player.position.y;
    for (const c of unit.children) {
      if (c === player || !c.active) continue;
      total++;
      const dx = Math.abs(c.position.x - cx) * s, dy = Math.abs(c.position.y - cy) * s;
      if (dx < vs.width / 2 + 20 && dy < vs.height / 2 + 20) onScreen++;
    }
    return {
      design: [cc.view.getDesignResolutionSize().width, cc.view.getDesignResolutionSize().height],
      visible: [Math.round(vs.width), Math.round(vs.height)],
      worldScale: +s.toFixed(3),
      unitPct: +(32 * s / vs.height * 100).toFixed(1),
      playerHasShadow: !!player.getChildByName('shadow'),
      groundGraphics: ground && ground.getComponent(cc.Graphics) ? 'yes' : 'no',
      onScreenEnemies: onScreen, totalEnemies: total,
    };
  });
  console.log(JSON.stringify(r, null, 1));
  await page.locator('canvas').screenshot({ path: 'screenshots/cocos-v2.png' });
  console.log('截图 -> screenshots/cocos-v2.png');
  await b.close();
})();
