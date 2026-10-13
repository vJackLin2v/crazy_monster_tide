const { chromium } = require('playwright');
const fs=require('fs'),path=require('path'),https=require('https'),http=require('http');
const OUT='H:/AI-game/crazy_monster_tide/.tmp/research';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const QS=process.argv.slice(2);
(async()=>{
  const b=await chromium.launch();
  const page=await b.newPage({viewport:{width:1400,height:1000},
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'});
  for(const [qi,q] of QS.entries()){
    try{
      await page.goto('https://image.baidu.com/search/index?tn=baiduimage&word='+encodeURIComponent(q),{waitUntil:'domcontentloaded',timeout:45000});
      await sleep(3000);
      await page.mouse.wheel(0,2500); await sleep(2000);
      const urls = await page.evaluate(()=>{
        const out=[];
        document.querySelectorAll('img.main_img, img[src*="bdimg"], img[src*="baidu"]').forEach(im=>{
          const s=im.getAttribute('src')||im.getAttribute('data-src');
          if(s && s.startsWith('http')) out.push(s);
        });
        // 页面上还有 JSON 数据
        const m = document.documentElement.innerHTML.match(/objURL["']?\s*:\s*["']([^"']+)/g) || [];
        m.slice(0,10).forEach(x=>{ try{ out.push(decodeURIComponent(x.split(':')[1].replace(/["']/g,''))); }catch(e){} });
        return [...new Set(out)];
      });
      console.log(q+' -> '+urls.length+' 个候选');
      let i=0;
      for(const u of urls.slice(0,14)){
        if(i>=3) break;
        try{
          const buf=await new Promise((res,rej)=>{
            const mod=u.startsWith('https')?https:http;
            mod.get(u,{headers:{'User-Agent':'Mozilla/5.0','Referer':'https://image.baidu.com/'}},r=>{
              if(r.statusCode!==200) return rej(new Error('x'));
              const ch=[]; r.on('data',d=>ch.push(d)); r.on('end',()=>res(Buffer.concat(ch)));
            }).on('error',rej).setTimeout(15000,function(){this.destroy();});
          });
          if(buf.length<45000) continue;
          fs.writeFileSync(path.join(OUT,'b'+qi+'_'+(++i)+'.img'), buf);
          console.log('   ['+i+'] '+Math.round(buf.length/1024)+'KB  '+u.slice(0,70));
        }catch(e){}
      }
      if(i===0) console.log('   (没抓到足够大的)');
    }catch(e){ console.log(q+' 失败 '+String(e.message).slice(0,60)); }
  }
  await b.close();
})();
