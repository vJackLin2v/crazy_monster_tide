const { chromium } = require('playwright');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const page=await b.newPage({viewport:{width:1400,height:1000},
    userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'});
  const qs = ['"向僵尸开炮"', '"弹壳特攻队"', '微信小游戏 UI 设计', '"roguelike" 小游戏 截图'];
  for (const q of qs) {
    await page.goto('https://cn.bing.com/images/search?q='+encodeURIComponent(q),{waitUntil:'domcontentloaded',timeout:40000});
    await sleep(2200);
    const t = await page.$$eval('a.iusc', els => els.slice(0,5).map(e=>{
      try { const m=JSON.parse(e.getAttribute('m')); return (m.t||'').slice(0,30); } catch(_) { return ''; }
    }));
    console.log('「'+q+'」-> '+JSON.stringify(t));
  }
  await b.close();
})();
