/* 抓 DEMO 的真正战斗画面：先确保状态是 battle，且没有升级弹窗 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = 'H:/AI-game/crazy_monster_tide';
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg','.wav':'audio/wav'};
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = http.createServer((q, s) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/prototype-html/index.html';
    const f = path.join(ROOT, p);
    if (!fs.existsSync(f)) { s.writeHead(404); return s.end('404'); }
    s.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
    s.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(8811, r));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await pg.goto('http://127.0.0.1:8811/prototype-html/index.html');
  await sleep(2500);
  await pg.locator('#btn-play').click(); await sleep(300);
  await pg.locator('#btn-start').click(); await sleep(2500);

  // 布置一个"中期战斗"场面
  await pg.evaluate(() => {
    const G = window.__G;
    G.skills = [mkSkill('fireball'), mkSkill('ice_spear'), mkSkill('arcane'), mkSkill('chain')];
    G.skills.forEach(s => s.lvl = 3);
    G.skills[0].mods = ['multi','multi','giant'];
    G.skills[1].mods = ['pierce','rapid'];
    G.player.inv = 9999;
    G.stats.hp = G.stats.maxhp;
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2, r = 60 + (i % 5) * 18;
      spawnEnemy(['goblin','wolf','orc','imp','hyena','eyebat'][i % 6],
        G.player.x + Math.cos(a) * r, G.player.y + Math.sin(a) * r);
    }
  });

  // 循环：有升级弹窗就跳过；确认是 battle 再截图
  let ok = false;
  for (let i = 0; i < 30; i++) {
    await sleep(600);
    const st = await pg.evaluate(() => ({ screen: window.__G.screen, lvl: window.__G.levelPause, enemies: (window.__G.enemies||[]).length }));
    if (st.screen === 'levelup' || st.lvl) {
      const skip = await pg.locator('#btn-skip').count();
      if (skip) { await pg.locator('#btn-skip').click(); console.log('  跳过升级弹窗'); await sleep(400); }
      else { await pg.evaluate(() => { const G=window.__G; G.levelPause=false; G.screen='battle'; G.paused=false; }); await sleep(400); }
      continue;
    }
    if (st.screen === 'battle' && st.enemies >= 6) {
      const st2 = await pg.evaluate(() => window.__G.screen);
      if (st2 === 'battle') {
        await pg.locator('#stage').screenshot({ path: 'screenshots/demo-battle.png' });
        console.log('  ✅ 已截图 demo-battle.png（状态=battle，场上 ' + st.enemies + ' 只怪）');
        ok = true; break;
      }
    }
  }
  if (!ok) console.log('  ❌ 没抓到战斗画面');
  await b.close(); srv.close();
})();
