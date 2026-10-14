const { chromium } = require('playwright');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(); const page=await b.newPage({viewport:{width:900,height:1000}});
  await page.goto('http://127.0.0.1:7456/?t='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('canvas',{timeout:60000}); await sleep(18000);
  const r=await page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>12||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot'); const scr=ui&&ui.getChildByName('scr-menu');
    if(!scr) return {err:'no scr-menu'};
    const res=[];
    // 带绝对坐标遍历
    const walk=(n,ax,ay,depth)=>{
      const ut=n.getComponent&&n.getComponent('cc.UITransform');
      const lb=n.getComponent&&n.getComponent('cc.Label');
      const p=n.position;
      const AX=ax+p.x, AY=ay+p.y;
      if(lb&&lb.string) res.push({d:depth, t:lb.string.slice(0,20), ax:Math.round(AX), ay:Math.round(AY),
        col:lb.color?'#'+[lb.color.r,lb.color.g,lb.color.b].map(v=>v.toString(16).padStart(2,'0')).join(''):'?'});
      if(ut&&n.name==='panel') res.push({d:depth, t:'[panel]', ax:Math.round(AX), ay:Math.round(AY), w:Math.round(ut.contentSize.width), h:Math.round(ut.contentSize.height)});
      for(const c of n.children) walk(c, AX, AY, depth+1);
    };
    walk(scr,0,0,0);
    return {vs:Math.round(cc.view.getVisibleSize().height), items:res};
  });
  console.log('屏幕高:', r.vs, ' 屏幕顶 y=+' + (r.vs/2) + ' 底 y=' + (-r.vs/2));
  console.log('带绝对坐标的文字/面板:');
  for(const it of (r.items||[])) console.log('   y=%5d x=%5d d%d  %-9s %s', it.ay, it.ax, it.d, it.t, it.col||(it.w?('w'+it.w+' h'+it.h):''));
  await b.close();
})();
