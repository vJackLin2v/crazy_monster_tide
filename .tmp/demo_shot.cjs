const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = 'H:/AI-game/crazy_monster_tide';
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg','.wav':'audio/wav'};
(async () => {
  const srv = http.createServer((q, s) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/prototype-html/index.html';
    const f = path.join(ROOT, p);
    if (!fs.existsSync(f)) { s.writeHead(404); return s.end('404'); }
    s.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
    s.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(8810, r));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await pg.goto('http://127.0.0.1:8810/prototype-html/index.html');
  await pg.waitForTimeout(2200);
  await pg.locator('#btn-play').click(); await pg.waitForTimeout(300);
  await pg.locator('#btn-start').click(); await pg.waitForTimeout(2500);
  // 摆一个和 Cocos 类似的中期场面：若干怪围着玩家
  await pg.evaluate(() => {
    G.skills = [mkSkill('fireball'), mkSkill('ice_spear'), mkSkill('blade'), mkSkill('chain')];
    G.skills.forEach(s => s.lvl = 3);
    G.player.inv = 999;

    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2, r = 40 + (i % 25);
      spawnEnemy(['goblin','wolf','orc','imp','hyena','eyebat'][i % 6],
        G.player.x + Math.cos(a) * r, G.player.y + Math.sin(a) * r);
    }
    G.banner = '';
  });
  await pg.waitForTimeout(1600);
  await pg.locator('#stage').screenshot({ path: 'screenshots/cmp-demo.png' });
  console.log('DEMO 截图完成: screenshots/cmp-demo.png');
  await b.close(); srv.close();
})();
