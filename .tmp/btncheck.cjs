const { chromium } = require('playwright');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(); const page=await b.newPage({viewport:{width:900,height:1000}});
  await page.goto('http://127.0.0.1:7456/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('canvas',{timeout:60000}); await sleep(18000);
  const box=await page.locator('canvas').boundingBox();
  const vs=await page.evaluate(()=>{const v=window.cc.view.getVisibleSize();return {w:v.width,h:v.height};});
  const toPage=(gx,gy)=>({x:box.x+(gx+vs.w/2)/vs.w*box.width,y:box.y+(vs.h/2-gy)/vs.h*box.height});
  const tap=async(gx,gy)=>{const p=toPage(gx,gy);await page.mouse.click(p.x,p.y);await sleep(600);};
  await tap(0,-40); await tap(76,-272); await sleep(2500); await tap(155,367); await sleep(900);
  const r=await page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>12||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot'); const dr=ui&&ui.getChildByName('scr-build');
    if(!dr) return {err:'no scr-build'};
    const res=[];
    const walk=(n,depth)=>{ const lb=n.getComponent&&n.getComponent('cc.Label'); const ut=n.getComponent&&n.getComponent('cc.UITransform');
      if(lb&&lb.string&&ut) res.push({t:lb.string.slice(0,10), y:Math.round(n.position.y), h:Math.round(ut.contentSize.height), depth});
      for(const c of n.children) walk(c, depth+1); };
    walk(dr,0);
    return {items: res.sort((a,b)=>b.y-a.y).slice(0,16)};
  });
  console.log('原始:', JSON.stringify(r.items));
  await b.close();
})();
