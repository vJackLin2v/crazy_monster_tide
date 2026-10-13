const { chromium } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='H:/AI-game/crazy_monster_tide';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const srv=http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/prototype-html/index.html';
    const f=path.join(ROOT,p); if(!fs.existsSync(f)){s.writeHead(404);return s.end('404');}
    s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'}); s.end(fs.readFileSync(f));});
  await new Promise(r=>srv.listen(8813,r));
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  await pg.goto('http://127.0.0.1:8813/prototype-html/index.html'); await sleep(2500);
  await pg.locator('#btn-play').click(); await sleep(300);
  await pg.locator('#btn-start').click(); await sleep(2500);

  console.log('ents 结构:', JSON.stringify(await pg.evaluate(()=>Object.keys(ents).map(k=>k+':'+(Array.isArray(ents[k])?ents[k].length:typeof ents[k])))));

  await pg.evaluate(()=>{
    G.skills=[mkSkill('fireball'),mkSkill('ice_spear'),mkSkill('arcane'),mkSkill('chain')];
    G.skills.forEach(s=>s.lvl=3);
    G.skills[0].mods=['multi','multi','giant'];
    G.skills[1].mods=['pierce','rapid'];
    G.skills[2].mods=['rapid'];
    G.player.inv = 99999;
    if (G.stats) G.stats.hp = G.stats.maxhp;
  });

  let shot=false;
  for(let i=0;i<40;i++){
    // 每轮：保证是战斗状态 + 场上够热闹
    await pg.evaluate(()=>{
      if (G.screen !== 'battle') { try { backToBattle(); } catch(e) { G.screen='battle'; G.paused=false; G.levelPause=false; } }
      G.paused = false; G.levelPause = false;
      const n = (ents.enemies||[]).length;
      if (n < 9) {
        for (let k = n; k < 11; k++) {
          const a = Math.random()*Math.PI*2, r = 55 + Math.random()*45;
          spawnEnemy(['goblin','wolf','orc','imp','hyena','eyebat'][k%6], G.player.x+Math.cos(a)*r, G.player.y+Math.sin(a)*r);
        }
      }
      if (G.player) { G.player.inv = 99999; }
    });
    await sleep(420);
    const st = await pg.evaluate(()=>({screen:G.screen, paused:G.paused, lvl:!!G.levelPause, e:(ents.enemies||[]).length}));
    if (st.screen==='battle' && !st.paused && !st.lvl && st.e>=8) {
      await pg.locator('#stage').screenshot({path:'screenshots/demo-battle.png'});
      console.log('  ✅ 抓到战斗画面：状态='+st.screen+' 场上怪='+st.e);
      shot=true; break;
    }
  }
  if(!shot) console.log('  ❌ 仍失败');
  await b.close(); srv.close();
})();
