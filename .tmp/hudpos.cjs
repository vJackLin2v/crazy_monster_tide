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
  await tap(0,-40); await tap(76,-272); await sleep(3000);
  const r=await page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot'); const hud=ui&&ui.getChildByName('HudRoot');
    if(!hud) return {err:'no hud'};
    const vsv=cc.view.getVisibleSize();
    const out=[];
    const inner = hud.getChildByName('Hud') || hud; for(const c of inner.children){
      const ut=c.getComponent&&c.getComponent('cc.UITransform');
      if(!ut) continue;
      const lb=c.getComponent&&c.getComponent('cc.Label');
      const top=c.position.y+ut.contentSize.height/2, bot=c.position.y-ut.contentSize.height/2;
      out.push({n:c.name, txt:lb?lb.string:'', y:Math.round(c.position.y), h:Math.round(ut.contentSize.height),
                fromTop: Math.round(vsv.height/2 - top), fromBot: Math.round(bot + vsv.height/2)});
    }
    return {vs:[Math.round(vsv.width),Math.round(vsv.height)], items:out.sort((a,b)=>b.y-a.y)};
  });
  console.log('可视尺寸:', JSON.stringify(r.vs));
  console.log('原始:', JSON.stringify(r.items, null, 1).slice(0, 1600));
  await b.close();
})();
