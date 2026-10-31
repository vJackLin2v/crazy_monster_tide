const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 } })).newPage();
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(8500);
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);
  const contentY = (rootName) => page.evaluate((rn) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const root = find(sc, n => n.name === rn); if (!root) return null;
    const c = find(root, n => n.name === 'scrollContent');
    return c ? Math.round(c.position.y) : null;
  }, rootName);

  await ev("(G.save.seen = [], G.showCodex(), 1)"); await sleep(900);
  // 切到怪物页（18 条，可滚动）
  const tab = await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const root = find(sc, n => n.name === 'scr-codex'); const arr = [];
    const walk = (n, d) => { if (d > 6 || !n) return; if (n.name === 'tabHit') arr.push(n); for (const c of n.children) walk(c, d + 1); }; walk(root, 0);
    const vs = cc.view.getVisibleSize(); const cv = document.querySelector('canvas');
    const n = arr[3]; let x = 0, y = 0, cur = n; while (cur && cur.name !== 'Canvas') { x += cur.position.x; y += cur.position.y; cur = cur.parent; }
    return { x: (vs.width / 2 + x) * (cv.clientWidth / vs.width), y: (vs.height / 2 - y) * (cv.clientHeight / vs.height) };
  });
  await page.mouse.click(tab.x, tab.y); await sleep(700);

  const y0 = await contentY('scr-codex');
  // 快速向上甩一下（短时间大位移 → 高速）
  await page.mouse.move(180, 520); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(180, 520 - i * 40); await sleep(12); }
  const yAtRelease = await contentY('scr-codex');
  await page.mouse.up();
  await sleep(120);
  const yAfter120 = await contentY('scr-codex');
  await sleep(500);
  const yAfter620 = await contentY('scr-codex');
  console.log(JSON.stringify({ y0, yAtRelease, yAfter120, yAfter620,
    glide120: yAfter120 - yAtRelease, glide620: yAfter620 - yAfter120 }));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
