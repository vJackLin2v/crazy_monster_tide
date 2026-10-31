const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  const out = await page.evaluate(async () => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 40 || !n) return null; if (p(n)) return n; for (const c of n.children) { const t = find(c, p, d + 1); if (t) return t; } return null; };
    const g = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    g.charId = 'knight'; await g.startBattle();
    await new Promise(r => setTimeout(r, 3500));
    const mid = window.__m2a ? window.__m2a() : null;
    g.finishRun('defeat');
    await new Promise(r => setTimeout(r, 500));
    const agg = window.__m2a ? window.__m2a() : null;
    const raw = window.__m2aJson ? window.__m2aJson() : '{}';
    let rec = null;
    try { const j = JSON.parse(raw); rec = j.records && j.records[0]; } catch {}
    return {
      midAgg: mid, agg,
      record: rec ? {
        runId: rec.runId, complete: rec.completeness && rec.completeness.complete,
        waves: rec.waves.length, skills: rec.skills.length,
        modules: rec.modules.length, events: rec.events.length,
        skillDamage: rec.skills.reduce((s, x) => s + x.damageTotal, 0),
        shopDisplays: Object.keys(rec.shop.displays).length,
      } : null,
      size: raw.length,
    };
  });
  console.log(JSON.stringify(out).slice(0, 2000));
  console.log('errors=' + (errs.join(' | ') || 'none'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
