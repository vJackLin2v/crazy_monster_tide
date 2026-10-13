/* 在运行中的 Cocos 预览里注入缩放修改，然后分别截图对比 */
const { chromium } = require('playwright');
const SCALES = process.argv[2] ? process.argv[2].split(',').map(Number) : [3, 6, 8.44];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(18000);   // 等引擎 + 资源

  // 先摸清结构
  const info = await page.evaluate(() => {
    const cc = window.cc;
    const scene = cc.director.getScene();
    const find = (n, pred, d = 0) => {
      if (d > 8 || !n) return null;
      if (pred(n)) return n;
      for (const c of n.children) { const r = find(c, pred, d + 1); if (r) return r; }
      return null;
    };
    const world = find(scene, n => n.name === 'World');
    const player = find(scene, n => n.name.indexOf('player:') === 0);
    const vs = cc.view.getVisibleSize();
    return {
      worldName: world ? world.name : null,
      playerName: player ? player.name : null,
      playerLocal: player ? [player.position.x, player.position.y] : null,
      visible: [vs.width, vs.height],
      unitCount: find(scene, n => n.name === 'Unit') ? find(scene, n => n.name === 'Unit').children.length : -1,
    };
  });
  console.log('结构:', JSON.stringify(info));

  // 注入：关掉老的相机组件，自己摆 World
  for (const s of SCALES) {
    await page.evaluate((S) => {
      const cc = window.cc;
      const scene = cc.director.getScene();
      const find = (n, pred, d = 0) => {
        if (d > 8 || !n) return null;
        if (pred(n)) return n;
        for (const c of n.children) { const r = find(c, pred, d + 1); if (r) return r; }
        return null;
      };
      const world = find(scene, n => n.name === 'World');
      const player = find(scene, n => n.name.indexOf('player:') === 0);
      // 关掉 Camera2D（否则它每帧把 scale 重置回去）
      if (world.components) for (const c of world.components) if (c && c.constructor && c.constructor.name === 'Camera2D') c.enabled = false;
      world.setScale(S, S, 1);
      // 把玩家摆到屏幕中心：P = -S * playerLocal
      world.setPosition(-S * player.position.x, -S * player.position.y, 0);
      window.__INJ = S;
    }, s);
    await page.waitForTimeout(400);
    const c = await page.locator('canvas').screenshot({ path: `screenshots/cocos-s${String(s).replace('.', '_')}.png` });
    console.log(`已截图 scale=${s}`);
  }
  await browser.close();
})();
