const { chromium } = require('playwright');
const fs=require('fs'),path=require('path'),https=require('https'),http=require('http');
const OUT='H:/AI-game/crazy_monster_tide/.tmp/research';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const QS = process.argv.slice(2);
(async()=>{
  const b=await chromium.launch();
  const page=await b.newPage({viewport:{width:1400,height:1000},
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'});
  for(const [qi,q] of QS.entries()){
    try{
      await page.goto('https://cn.bing.com/images/search?q='+encodeURIComponent('"'+q+'"'),{waitUntil:'domcontentloaded',timeout:45000});
      await sleep(2000); await page.mouse.wheel(0,3000); await sleep(1800);
      const cands = await page.$$eval('a.iusc', els => els.map(e=>{
        try { const m=JSON.parse(e.getAttribute('m')); return {u:m.murl,t:m.t||''}; } catch(_) { return null; }
      }).filter(Boolean));
      let i=0;
      for(const c of cands.slice(0,18)){
        if(i>=3) break;
        try{
          const buf=await new Promise((res,rej)=>{
            const mod=c.u.startsWith('https')?https:http;
            mod.get(c.u,{headers:{'User-Agent':'Mozilla/5.0','Referer':'https://cn.bing.com/'}},r=>{
              if(r.statusCode!==200) return rej(new Error('x'));
              const ch=[]; r.on('data',d=>ch.push(d)); r.on('end',()=>res(Buffer.concat(ch)));
            }).on('error',rej).setTimeout(15000,function(){this.destroy();});
          });
          if(buf.length<40000) continue;
          const f=path.join(OUT,'g'+qi+'_'+(++i)+'.img'); fs.writeFileSync(f,buf);
          console.log('  ['+q+' #'+i+'] '+Math.round(buf.length/1024)+'KB  '+c.t.slice(0,40));
        }catch(e){}
      }
      if(i===0) console.log('  '+q+' -> 没抓到足够大的图');
    }catch(e){ console.log(q+' 失败 '+String(e.message).slice(0,60)); }
  }
  await b.close();
})();
