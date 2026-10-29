
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9500);
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 20 || !n) return null; if (p(n)) return n; for (const chx of n.children) { const t = find(chx, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);
  const stat = () => ev("JSON.stringify({ w: G.battle.rs.wave, lv: G.battle.rs.lv, kills: G.battle.rs.kills, alive: G.battle.enemies.filter(e=>!e.dead).length, phase: G.phase, modal: !!G.curModal })");
  await ev("(G.seed = 777, G.charId='knight', G.startBattle(), 1)");
  await sleep(2000);
  // 仅供流程/密度观测：拉高血量，避免在 2 波就死
  await ev("(G.battle.rs.stats.maxhp = 99999, G.battle.rs.stats.hp = 99999, 1)");
  const cx = 180, cy = 380, R = 55;
  await page.mouse.move(cx, cy); await page.mouse.down();
  const t0 = Date.now(); const per = {}; let lastW = 0;
  while (Date.now() - t0 < 150000) {
    const el = Date.now() - t0; const a = el / 1000 * 1.6;
    await page.mouse.move(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.7);
    await sleep(90);
    const st = JSON.parse(await stat());
    const k = st.w; per[k] = per[k] || { n: 0, alive: 0, maxAlive: 0, kills0: st.kills };
    per[k].n++; per[k].alive += st.alive; per[k].maxAlive = Math.max(per[k].maxAlive, st.alive); per[k].kills = st.kills; per[k].lv = st.lv;
    if (st.modal) {
      await ev("(() => { const cc=window.cc, sc=cc.director.getScene(); const find=(n,p,d=0)=>{ if(d>20||!n) return null; if(p(n)) return n; for(const c of n.children){const t=find(c,p,d+1); if(t) return t;} return null;}; if (find(sc, n=>n.name==='scr-levelup')) { G.pickReward(0); return 'lv'; } if (find(sc, n=>n.name==='scr-install')) { G.afterInstall(); return 'inst'; } if (G.phase==='shop') { G.nextWave(); return 'shop'; } G.closeModal(); return 'close'; })()");
      await sleep(450);
    }
    if (st.phase === 'result') break;
  }
  await page.mouse.up();
  console.log('FLOW-ONLY（99999 HP，仅看流程/密度，不能用于难度结论）');
  for (const k of Object.keys(per).map(Number).sort((a, b) => a - b)) {
    const r = per[k];
    console.log('  wave ' + String(k).padStart(2) + '  平均活怪 ' + (r.alive / r.n).toFixed(1).padStart(5)
      + '  峰值 ' + String(r.maxAlive).padStart(3) + '  击杀 ' + String(r.kills).padStart(4) + '  Lv' + r.lv);
  }
  await b.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
