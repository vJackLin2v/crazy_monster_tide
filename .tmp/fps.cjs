const { chromium } = require('playwright');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(); const page=await b.newPage({viewport:{width:900,height:1000}});
  const errs=[]; page.on('pageerror',e=>errs.push(String(e.message).slice(0,140)));
  await page.goto('http://127.0.0.1:7456/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('canvas',{timeout:60000}); await sleep(18000);
  const box=await page.locator('canvas').boundingBox();
  const vs=await page.evaluate(()=>{const v=window.cc.view.getVisibleSize();return {w:v.width,h:v.height};});
  const toPage=(gx,gy)=>({x:box.x+(gx+vs.w/2)/vs.w*box.width,y:box.y+(vs.h/2-gy)/vs.h*box.height});
  const tap=async(gx,gy)=>{const p=toPage(gx,gy);await page.mouse.click(p.x,p.y);await sleep(600);};
  await tap(0,24); await tap(82,-331); await sleep(3000);
  // 采集 3 秒帧率
  const fps = await page.evaluate(()=>new Promise(res=>{
    let n=0; const t0=performance.now();
    const tick=()=>{ n++; if(performance.now()-t0<3000) requestAnimationFrame(tick); else res(n/((performance.now()-t0)/1000)); };
    requestAnimationFrame(tick);
  }));
  console.log('战斗中的帧率: ' + fps.toFixed(1) + ' FPS');
  const info = await page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const world=find(sc,n=>n.name==='World'); const g=find(sc,n=>n.name==='Ground');
    return { drawCalls: cc.director.root.batcher ? 'n/a' : 'n/a',
             groundKids: g?g.children.length:0 };
  });
  console.log('页面错误:', errs.length?errs.slice(0,3).join(' | '):'无');
  await b.close();
})();
