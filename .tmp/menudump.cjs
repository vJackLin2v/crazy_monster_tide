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
    const vsv=cc.view.getVisibleSize();
    const out=[];
    const walk=(n,depth)=>{ const ut=n.getComponent&&n.getComponent('cc.UITransform');
      const lb=n.getComponent&&n.getComponent('cc.Label');
      const gp=n.getComponent&&n.getComponent('cc.Graphics');
      if(ut&&ut.contentSize.height>0){
        out.push({d:depth, n:n.name, t:lb?lb.string.slice(0,16):'', y:Math.round(n.position.y),
                  h:Math.round(ut.contentSize.height), w:Math.round(ut.contentSize.width),
                  top:Math.round(n.position.y+ut.contentSize.height/2),
                  bot:Math.round(n.position.y-ut.contentSize.height/2)});
      }
      for(const c of n.children) walk(c,depth+1); };
    walk(scr,0);
    return {vs:[Math.round(vsv.width),Math.round(vsv.height)], items:out};
  });
  console.log('可视尺寸:', JSON.stringify(r.vs), ' (屏幕顶 y=' + (r.vs?r.vs[1]/2:0) + ', 屏幕底 y=' + (-r.vs[1]/2) + ')');
  console.log('主界面节点（按 y 从高到低）:');
  for(const it of (r.items||[]).sort((a,b)=>b.y-a.y))
    console.log('  y=%5d  高%4d 宽%4d  顶%5d 底%5d  %-8s %s', it.y, it.h, it.w, it.top, it.bot, it.n, it.t?('"'+it.t+'"'):'');
  await b.close();
})();
