const { chromium } = require('playwright');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const page=await b.newPage({viewport:{width:1400,height:1000},
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'});
  await page.goto('https://cn.bing.com/images/search?q='+encodeURIComponent('向僵尸开炮 游戏截图'),{waitUntil:'domcontentloaded',timeout:45000});
  await sleep(2500);
  const c = await page.$$eval('a.iusc', els => els.slice(0,8).map(e=>{
    const raw = e.getAttribute('m');
    try { const m=JSON.parse(raw); return {keys:Object.keys(m).join(','), w:m.mw, h:m.mh, u:(m.murl||'').slice(0,70), t:(m.t||'').slice(0,20)}; }
    catch(err){ return {raw:(raw||'').slice(0,120)}; }
  }));
  console.log(JSON.stringify(c,null,1).slice(0,2000));
  await b.close();
})();
