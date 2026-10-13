const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(14000);
  const r = await page.evaluate(() => {
    const cc = window.cc; const scene = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 8 || !n) return null; if (p(n)) return n;
      for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    const player = find(scene, n => n.name.indexOf('player:') === 0);
    const unit = find(scene, n => n.name === 'Unit');
    let enemies = 0, gems = 0, shadows = 0;
    for (const c of unit.children) {
      if (c.name.indexOf('enemy:') === 0) { enemies++; if (c.getChildByName('shadow')) shadows++; }
      else if (c.name === 'gem') gems++;
    }
    const ground = find(scene, n => n.name === 'Ground');
    return { playerHasShadow: !!(player && player.getChildByName && player.getChildByName('shadow')),
             enemyShadows: shadows, enemies, gems,
             groundKids: ground ? ground.children.length : -1 };
  });
  console.log('热重载检查:', JSON.stringify(r));
  console.log(r.playerHasShadow ? '✅ 新代码已生效（阴影在）' : '❌ 还是旧代码（编辑器未重编译）');
  await b.close();
})();
