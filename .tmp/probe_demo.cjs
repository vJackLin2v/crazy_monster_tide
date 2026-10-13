const { chromium } = require('playwright');
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT='H:/AI-game/crazy_monster_tide';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const srv=http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p==='/')p='/prototype-html/index.html';
    const f=path.join(ROOT,p); if(!fs.existsSync(f)){s.writeHead(404);return s.end('404');}
    s.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'}); s.end(fs.readFileSync(f));});
  await new Promise(r=>srv.listen(8812,r));
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:390,height:844}});
  await pg.goto('http://127.0.0.1:8812/prototype-html/index.html'); await sleep(2500);
  const r = await pg.evaluate(()=>{
    const names=['G','ents','spawnEnemy','mkSkill','UNITS','ENEMY_KINDS','ENEMIES','go','resumeBattle','applyReward','backToBattle'];
    const out={};
    for(const n of names){ try{ out[n] = eval('typeof '+n); }catch(e){ out[n]='ERR'; } }
    out.__G_keys = window.__G ? Object.keys(window.__G).join(',') : 'no __G';
    return out;
  });
  console.log(JSON.stringify(r,null,1));
  await b.close(); srv.close();
})();
