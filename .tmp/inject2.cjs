/* 模拟最终效果：自适应缩放 + 怪铺在画面边缘（新生成半径的效果） */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(18000);
  for (const s of [9.7]) {
    const r = await page.evaluate((S) => {
      const cc = window.cc;
      const scene = cc.director.getScene();
      const find = (n, pred, d = 0) => { if (d > 8 || !n) return null; if (pred(n)) return n;
        for (const c of n.children) { const t = find(c, pred, d + 1); if (t) return t; } return null; };
      const world = find(scene, n => n.name === 'World');
      const player = find(scene, n => n.name.indexOf('player:') === 0);
      const unit = find(scene, n => n.name === 'Unit');
      for (const c of world.components) if (c && c.constructor && c.constructor.name === 'Camera2D') c.enabled = false;
      world.setScale(S, S, 1);
      world.setPosition(-S * player.position.x, -S * player.position.y, 0);
      // 把怪铺到"可视半对角线 1.05~1.25 倍"处（= 新生成半径的效果）
      const visible = cc.view.getVisibleSize();
      const halfDiag = Math.hypot(visible.width / 2, visible.height / 2) / S;
      let i = 0, n = 0;
      for (const c of unit.children) {
        if (c === player) continue;
        const a = (i / 9) * Math.PI * 2 + 0.3;
        const rad = halfDiag * (1.05 + (i % 3) * 0.09);
        // World 本地坐标：y 向上 -> 相对玩家的偏移
        c.setPosition(player.position.x + Math.cos(a) * rad, player.position.y - Math.sin(a) * rad, 0);
        i++; n++;
      }
      return { scale: S, halfDiag: Math.round(halfDiag), moved: n };
    }, s);
    console.log('注入:', JSON.stringify(r));
    await page.waitForTimeout(700);
    await page.locator('canvas').screenshot({ path: `screenshots/cocos-fixed.png` });
    console.log('已截图 screenshots/cocos-fixed.png');
  }
  await b.close();
})();
