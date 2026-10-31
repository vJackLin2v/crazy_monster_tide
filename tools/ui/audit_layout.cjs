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
  // 通用检查：某容器内所有 Label 是否越界 / 互相重叠
  const audit = (rootName) => page.evaluate((rn) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 20 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const root = find(sc, n => n.name === rn);
    if (!root) return 'no ' + rn;
    const rect = (n) => { const ut = n.getComponent('cc.UITransform'); if (!ut) return null; const wp = n.getWorldPosition();
      return { x0: wp.x - ut.width * n.anchorX, x1: wp.x + ut.width * (1 - n.anchorX), y0: wp.y - ut.height * n.anchorY, y1: wp.y + ut.height * (1 - n.anchorY), w: ut.width, h: ut.height }; };
    // 卡片容器：宽度 310（升级卡）或 336（行）
    const cards = [];
    const walk = (n, d) => { if (d > 8 || !n) return; const ut = n.getComponent && n.getComponent('cc.UITransform');
      if (ut && (Math.round(ut.width) === 310 || Math.round(ut.width) === 336)) cards.push(n);
      for (const c of n.children) walk(c, d + 1); };
    walk(root, 0);
    const out = [];
    for (const card of cards) {
      const cr = rect(card); if (!cr) continue;
      const labels = [];
      const lw = (n, d) => { if (d > 4 || !n) return; const lb = n.getComponent && n.getComponent('cc.Label'); if (lb && n.name !== 'textShadow') labels.push({ n, r: rect(n), s: lb.string }); for (const c of n.children) lw(c, d + 1); };
      lw(card, 0);
      const bad = [];
      for (const L of labels) {
        if (!L.r) continue;
        if (L.r.x0 < cr.x0 - 2 || L.r.x1 > cr.x1 + 2 || L.r.y0 < cr.y0 - 2 || L.r.y1 > cr.y1 + 2) {
          bad.push('OUT ' + L.s.slice(0, 14));
        }
      }
      for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i].r, c2 = labels[j].r;
        if (!a || !c2) continue;
        const ox = Math.min(a.x1, c2.x1) - Math.max(a.x0, c2.x0);
        const oy = Math.min(a.y1, c2.y1) - Math.max(a.y0, c2.y0);
        if (ox > 3 && oy > 3) bad.push('OVERLAP "' + labels[i].s.slice(0, 10) + '" x "' + labels[j].s.slice(0, 10) + '"');
      }
      if (bad.length) out.push({ card: Math.round(cr.w) + 'x' + Math.round(cr.h), bad });
    }
    return JSON.stringify(out);
  }, rootName);

  await ev("(G.charId='knight', G.startBattle(), 1)"); await sleep(4200);
  // 三种长度：短 / 长 / 超长
  await ev("(G.battle.paused = true, G.showLevelUp([{kind:'attr',id:'power'},{kind:'item',id:'count_l'},{kind:'skill',id:'blade_storm'}]), 1)");
  await sleep(900);
  console.log('LEVELUP:', await audit('scr-levelup'));

  await ev("(G.closeModal(), G.battle.rs.gold = 999, G.showShop(), 1)"); await sleep(900);
  console.log('SHOP:', await audit('scr-shop'));

  await ev("(() => { const rs=G.battle.rs; rs.modsBag=['multi','multi','pierce','fan','bounce','split','orbit','giant','rapid','snipe','burn','frost']; rs.skills[0].mods=['multi','pierce']; G.closeModal(); G.pauseTab=1; G.showPause(); return 1; })()");
  await sleep(900);
  console.log('DRAWER:', await audit('scr-build'));
  console.log('errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
