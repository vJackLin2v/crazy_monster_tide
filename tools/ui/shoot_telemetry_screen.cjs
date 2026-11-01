const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(8000);
  await page.screenshot({ path: 'deliverables/m2a_real_runs_20261101/verification/menu_debug_20261101.png' });
  const ok = await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 40 || !n) return null; if (p(n)) return n; for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    const g = find(sc, x => x.getComponent && x.getComponent('GameRoot'))?.getComponent('GameRoot');
    if (!g) return false;
    g.showTelemetry();
    return true;
  });
  await sleep(800);
  await page.screenshot({ path: 'deliverables/m2a_real_runs_20261101/verification/telemetry_screen_20261101.png' });
  console.log(JSON.stringify({ opened: ok, errors: errs.length ? errs.slice(0,2) : [] }));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
