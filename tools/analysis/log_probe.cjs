
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 140)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9500);
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 20 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);
  // 跑一局：标准属性，机械绕圈，自动处理弹窗
  await ev("(G.seed = 4242, G.charId='knight', G.startBattle(), 1)");
  await sleep(2500);
  const cx = 180, cy = 380, R = 55;
  await page.mouse.move(cx, cy); await page.mouse.down();
  const t0 = Date.now();
  while (Date.now() - t0 < 70000) {
    const el = Date.now() - t0, a = el / 1000 * 1.6;
    await page.mouse.move(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.7);
    await sleep(90);
    // 每轮都处理弹窗（升级选第 1 张 / 安装点完成 / 商店下一波），否则会卡在弹窗上
    const phase = await ev("(() => { const cc=window.cc, sc=cc.director.getScene(); const find=(n,p,d=0)=>{ if(d>20||!n) return null; if(p(n)) return n; for(const c of n.children){const t=find(c,p,d+1); if(t) return t;} return null;}; if (G.phase === 'result') return 'result'; if (find(sc, n=>n.name==='scr-levelup')) { G.pickReward(0); return 'lv'; } if (find(sc, n=>n.name==='scr-install')) { G.afterInstall(); return 'inst'; } if (G.phase === 'shop') { G.nextWave(); return 'shop'; } return G.phase; })()");
    if (phase === 'result') break;
  }
  await page.mouse.up();
  // 若 60 秒没死，手动进结算把日志刷出来（真实对局里阵亡/通关会自动触发）
  const ph = await ev("G.phase");
  if (ph !== 'result') { await ev("(G.showResult(false), 1)"); console.log('（探针：未阵亡，手动进结算以验证日志落盘）'); }
  await sleep(1200);
  const logs = await page.evaluate(() => window.__logs ? window.__logs() : 'no hook');
  console.log('日志局数 = ' + (Array.isArray(logs) ? logs.length : logs));
  if (Array.isArray(logs) && logs.length) {
    const r = logs[0];
    console.log('最近一局: char=' + r.charId + ' seed=' + r.seed + ' end=' + r.end + ' 死亡波=' + r.deathWave
      + ' 击杀=' + r.kills + ' 峰值活怪=' + r.maxAlive + ' 受伤=' + r.dmgTaken + ' 时长=' + r.durSec + 's');
    console.log('逐波(前5): ' + JSON.stringify(r.waves.slice(0, 5)));
  }
  console.log('数值表抽查: spawn=' + JSON.stringify(await page.evaluate(() => { const b = window.__bal(); return { i: b.spawn.baseInterval, batch: b.spawn.batchMax, soft: b.spawn.aliveSoft, hp: b.growth.hpPerWave }; })));
  console.log('override 生效: ' + await page.evaluate(() => { window.__balSet({ spawn: { batchMax: 4 } }); return window.__bal().spawn.batchMax; })
    + ' → reset 后 = ' + await page.evaluate(() => { window.__balReset(); return window.__bal().spawn.batchMax; }));
  console.log('汇总: ' + JSON.stringify(await page.evaluate(() => window.__logSummary())));
  console.log('errors=' + (errs.slice(0, 3).join('|') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });