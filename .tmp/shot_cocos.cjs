const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 520, height: 940 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  console.log('打开 Cocos 预览 http://127.0.0.1:7456/ ...');
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  console.log('canvas 出现，等待引擎与资源（20s）...');
  await page.waitForTimeout(20000);

  const info = await page.evaluate(() => {
    const cc = window.cc;
    const canvas = document.querySelector('canvas');
    let scene = null, node = null;
    try { scene = cc && cc.director && cc.director.getScene(); } catch (e) {}
    const out = {
      hasCC: !!cc,
      canvasW: canvas ? canvas.width : null,
      canvasH: canvas ? canvas.height : null,
      canvasCSS: canvas ? [canvas.clientWidth, canvas.clientHeight] : null,
      dpr: window.devicePixelRatio,
    };
    try {
      const vs = cc.view.getVisibleSize();
      const dr = cc.view.getDesignResolutionSize();
      out.visibleSize = [vs.width, vs.height];
      out.designSize = [dr.width, dr.height];
      out.canvasRect = cc.view.getCanvasSize ? [cc.view.getCanvasSize().width, cc.view.getCanvasSize().height] : null;
    } catch (e) { out.viewErr = String(e).slice(0, 80); }
    try {
      out.scene = scene ? scene.name : null;
      const kids = scene ? scene.children.map(c => c.name) : [];
      out.sceneChildren = kids;
      // 找 Battle 节点树
      const find = (n, name, depth) => {
        if (depth > 6 || !n) return null;
        if (n.name === name) return n;
        for (const c of n.children) { const r = find(c, name, depth + 1); if (r) return r; }
        return null;
      };
      const world = find(scene, 'World', 0);
      out.foundWorld = !!world;
      if (world) {
        const sc = world.scale;
        out.worldScale = [sc.x, sc.y, sc.z];
        out.worldPos = [world.position.x, world.position.y];
        const unit = find(world, 'Unit', 0);
        out.unitChildren = unit ? unit.children.length : -1;
        if (unit && unit.children.length) {
          const c0 = unit.children[0];
          const ut = c0.getComponent(cc.UITransform);
          out.firstUnit = { name: c0.name, size: ut ? [ut.contentSize.width, ut.contentSize.height] : null,
                            scale: [c0.scale.x, c0.scale.y] };
        }
      }
    } catch (e) { out.sceneErr = String(e).slice(0, 120); }
    return out;
  });
  console.log('运行时状态:', JSON.stringify(info, null, 1));
  await page.screenshot({ path: 'screenshots/cocos-preview.png' });
  console.log('截图已保存 screenshots/cocos-preview.png');
  console.log('页面错误:', errs.length ? errs.slice(0, 5).join(' | ') : '无');
  await browser.close();
})();
