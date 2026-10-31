const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 150)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9500);
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 20 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);

  // 字形级估算：CJK≈1.0*size，ASCII≈0.55*size；行数=ceil(总宽/盒宽)，需要高度=行数*1.5*size
  const audit = (rootName) => page.evaluate((rn) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 20 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const root = find(sc, n => n.name === rn);
    if (!root) return 'no ' + rn;
    const out = [];
    const walk = (n, d) => {
      if (d > 10 || !n) return;
      const lb = n.getComponent && n.getComponent('cc.Label');
      const ut = n.getComponent && n.getComponent('cc.UITransform');
      if (lb && ut && n.name !== 'textShadow') {
        const s = String(lb.string || '');
        const size = lb.fontSize || 12;
        let wSum = 0;
        for (const ch2 of s) wSum += (ch2.charCodeAt(0) > 255 ? 1.0 : 0.55) * size;
        const perLine = Math.max(1, ut.width);
        const lines = Math.max(1, Math.ceil(wSum / perLine));
        const needH = lines * size * 1.5;
        const clamped = lb.overflow === 3 || lb.overflow === 'CLAMP';   // Label.Overflow.CLAMP === 3
        if (needH > ut.height + 1.5) {
          out.push({ t: s.slice(0, 12), need: Math.round(needH), box: Math.round(ut.height), lines, clamp: clamped, w: Math.round(ut.width), size });
        }
      }
      for (const c of n.children) walk(c, d + 1);
    };
    walk(root, 0);
    return JSON.stringify(out);
  }, rootName);

  await ev("(G.charId='knight', G.startBattle(), 1)"); await sleep(4200);
  await ev("(G.battle.paused = true, G.battle.rs.gold = 999, G.showShop(), 1)"); await sleep(900);
  console.log('SHOP CLIPPED:', await audit('scr-shop'));

  await ev("(G.closeModal(), G.showLevelUp([{kind:'item',id:'count_l'},{kind:'module',id:'fan'},{kind:'skill',id:'blade_storm'}]), 1)"); await sleep(900);
  console.log('LEVELUP CLIPPED:', await audit('scr-levelup'));

  await ev("(() => { const rs=G.battle.rs; G.battle.hooks.onLevelUp=()=>{}; rs.modsBag=['multi','multi','pierce','fan','bounce','split','orbit','giant','rapid','snipe','burn','frost']; rs.skills[0].mods=['multi','pierce']; G.closeModal(); G.pauseTab=1; G.showPause(); return 1; })()"); await sleep(900);
  console.log('DRAWER CLIPPED:', await audit('scr-build'));

  await ev("(G.closeModal(), G.showCodex(), 1)"); await sleep(900);
  console.log('CODEX CLIPPED:', await audit('scr-codex'));
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
