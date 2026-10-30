
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push('c:' + m.text().slice(0, 120)); });
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9500);
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 20 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);

  await ev("(G.seed=2024, G.charId='knight', G.startBattle(), 1)"); await sleep(4000);
  await ev("(G.battle.paused = true, 1)");

  // ① 合成候选里是否包含唯一模块
  const mergeIds = await ev("(() => { const cc=window.cc, sc=cc.director.getScene(); const find=(n,p,d=0)=>{ if(d>20||!n) return null; if(p(n)) return n; for(const c of n.children){const t=find(c,p,d+1); if(t) return t;} return null;}; const G=find(sc,x=>x.getComponent&&x.getComponent('GameRoot')).getComponent('GameRoot'); return 'n/a'; })()");
  const cands = await ev("(() => { const rs=G.battle.rs; const ids=Object.keys(window.__bal ? {} : {}); return 'skip'; })()");

  // 直接算：给 3 个吸血 → 合成 → 装上 → 读 rt.vamp
  const r = await ev(`(() => {
    const rs = G.battle.rs;
    rs.modsBag = ['vamp','vamp','vamp'];
    const before = rs.modsBag.length;
    const ok = rs.mergeModule('vamp');
    const merged = rs.modsBag.filter(m => m === 'vamp_2').length;
    rs.skills[0].mods = ['vamp_2'];
    const rt = G.battle.rs.skillRuntime(0);
    return JSON.stringify({ before, ok, merged, vampEffect: rt.vamp, bag: rs.modsBag });
  })()`);
  console.log('吸血合成+效果 = ' + r);

  // ② 三个唯一模块都出现在合成候选（GameRoot 传给安装屏的列表）
  const list = await ev(`(() => {
    const rs = G.battle.rs;
    const q = ['vamp','harvest','thornmail'];
    rs.modsBag = ['vamp','vamp','vamp','harvest','harvest','harvest','thornmail','thornmail','thornmail'];
    const ready = q.map(id => ({ id, times: rs.mergeReady(id), max: 3 }));
    return JSON.stringify(ready);
  })()`);
  console.log('唯一模块合成就绪 = ' + list);

  // ③ 跑 40 秒，看新数值下是否报错、日志是否记录
  await ev("(rs2 = G.battle.rs, G.battle.paused = false, 1)");
  const cx = 180, cy = 380, R = 55;
  await page.mouse.move(cx, cy); await page.mouse.down();
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const el = Date.now() - t0, a = el / 1000 * 1.6;
    await page.mouse.move(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.7);
    await sleep(90);
    await ev("(() => { const cc=window.cc, sc=cc.director.getScene(); const find=(n,p,d=0)=>{ if(d>20||!n) return null; if(p(n)) return n; for(const c of n.children){const t=find(c,p,d+1); if(t) return t;} return null;}; if (find(sc, n=>n.name==='scr-levelup')) { G.pickReward(0); return 1; } if (find(sc, n=>n.name==='scr-install')) { G.afterInstall(); return 1; } if (G.phase==='shop') { G.nextWave(); return 1; } return 0; })()");
    if ((await ev("G.phase")) === 'result') break;
  }
  await page.mouse.up();
  const st = await ev("JSON.stringify({ wave: G.battle.rs.wave, kills: G.battle.rs.kills, maxAlive: G.battle.maxAlive, hp: Math.round(G.battle.rs.stats.hp) })");
  console.log('40s 实跑 = ' + st);
  if ((await ev("G.phase")) !== 'result') { await ev("(G.showResult(false), 1)"); }
  await sleep(1000);
  const logs = await page.evaluate(() => (window.__logs ? window.__logs().length : -1));
  console.log('日志局数 = ' + logs + ' ｜ errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
