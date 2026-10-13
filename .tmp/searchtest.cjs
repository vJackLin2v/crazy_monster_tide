const { chromium } = require('playwright');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const page=await b.newPage({viewport:{width:1400,height:1000},
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'});
  for (const q of ['cat','手机游戏','pixel art game hud']) {
    await page.goto('https://cn.bing.com/images/search?q='+encodeURIComponent(q),{waitUntil:'domcontentloaded',timeout:40000});
    await sleep(2000);
    const t = await page.$$eval('a.iusc', els => els.slice(0,4).map(e=>{
      try { return JSON.parse(e.getAttribute('m')).t || ''; } catch(_) { return ''; }
    }));
    console.log('查询「'+q+'」-> ' + JSON.stringify(t));
  }
  await b.close();
})();
