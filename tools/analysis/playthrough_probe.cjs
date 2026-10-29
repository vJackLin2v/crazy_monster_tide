
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHARS = (process.env.CHARS || 'knight,mage,zealot').split(',');
const SEED = Number(process.env.SEED || 12345);
const MAXS = Number(process.env.MAXS || 130);

(async () => {
  const b = await chromium.launch();
  for (const ch of CHARS) {
    const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
    await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas'); await sleep(9500);
    const ev = (code) => page.evaluate((c) => {
      const cc = window.cc, sc = cc.director.getScene();
      const find = (n, p, d = 0) => { if (d > 20 || !n) return null; if (p(n)) return n; for (const chx of n.children) { const t = find(chx, p, d + 1); if (t) return t; } return null; };
      const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
      try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
    }, code);
    const stat = () => ev("JSON.stringify({ w: G.battle.rs.wave, lv: G.battle.rs.lv, kills: G.battle.rs.kills, hp: Math.round(G.battle.rs.stats.hp), maxhp: Math.round(G.battle.rs.stats.maxhp), alive: G.battle.enemies.filter(e=>!e.dead).length, phase: G.phase, modal: !!G.curModal })");

    await ev("(G.seed = " + SEED + ", G.charId = '" + ch + "', G.startBattle(), 1)");
    await sleep(2500);
    const cx = 180, cy = 380, R = 55;
    await page.mouse.move(cx, cy); await page.mouse.down();
    const t0 = Date.now();
    let lastWave = 0, waveStart = Date.now(), dmgTaken = 0, lastHp = null, maxAlive = 0, sumAlive = 0, samples = 0;
    const rows = [];
    let dead = false;
    while (Date.now() - t0 < MAXS * 1000) {
      const el = Date.now() - t0;
      const a = el / 1000 * 1.6;
      await page.mouse.move(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.7);
      await sleep(90);
      const st = JSON.parse(await stat());
      maxAlive = Math.max(maxAlive, st.alive); sumAlive += st.alive; samples++;
      if (lastHp !== null && st.hp < lastHp) dmgTaken += (lastHp - st.hp);
      lastHp = st.hp;
      if (st.w !== lastWave) {
        rows.push({ wave: lastWave, sec: Math.round((Date.now() - waveStart) / 1000), kills: st.kills, lv: st.lv });
        lastWave = st.w; waveStart = Date.now();
      }
      if (st.modal) {
        await ev("(() => { const cc=window.cc, sc=cc.director.getScene(); const find=(n,p,d=0)=>{ if(d>20||!n) return null; if(p(n)) return n; for(const c of n.children){const t=find(c,p,d+1); if(t) return t;} return null;}; if (find(sc, n=>n.name==='scr-levelup')) { G.pickReward(0); return 'lv'; } if (find(sc, n=>n.name==='scr-install')) { G.afterInstall(); return 'inst'; } if (G.phase==='shop') { G.nextWave(); return 'shop'; } G.closeModal(); return 'close'; })()");
        await sleep(500);
      }
      if (st.phase === 'result') { dead = true; break; }
    }
    await page.mouse.up();
    const end = JSON.parse(await stat());
    console.log('[' + ch + '] seed=' + SEED + ' 结束波次=' + end.w + ' 等级=' + end.lv + ' 击杀=' + end.kills
      + ' 存活=' + Math.round((Date.now() - t0) / 1000) + 's'
      + ' 平均活怪=' + (sumAlive / Math.max(1, samples)).toFixed(1) + ' 峰值=' + maxAlive
      + ' 累计受伤=' + dmgTaken + (dead ? ' 结局=阵亡' : ' 结局=超时未死'));
    console.log('  逐波: ' + rows.map(r => 'w' + r.wave + ':' + r.sec + 's/Lv' + r.lv).join(' '));
    console.log('  errors=' + (errs.slice(0, 2).join('|') || 'none'));
    await page.close();
  }
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
