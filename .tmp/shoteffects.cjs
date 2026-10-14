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
  await tap(0,24); await tap(82,-331); await sleep(2500);
  // 注入满配 build，制造密集战斗（多特效同时出现）
  await page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const c=find(sc,n=>n.name==='Battle').getComponent('Battle');
    c.rs.skills=[{id:'fireball',lvl:5,mods:['multi','multi','giant']},{id:'arcane',lvl:5,mods:['rapid','multi']},
                 {id:'chain',lvl:3,mods:['burn']},{id:'shockwave',lvl:4,mods:['giant']}];
  });
  const keys=[['KeyW','KeyD'],['KeyD','KeyS'],['KeyS','KeyA'],['KeyA','KeyW']];
  let best=0, bestShot=null;
  for(let r=0;r<24;r++){
    const st=await page.evaluate(()=>{
      const cc=window.cc,sc=cc.director.getScene();
      const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
      const ui=find(sc,n=>n.name==='UiRoot');
      return ui?ui.children.map(x=>x.name):[];
    });
    if(st.includes('scr-levelup')){ await tap(-108,40); await sleep(250); continue; }
    const fx=await page.evaluate(()=>{
      const cc=window.cc,sc=cc.director.getScene();
      const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
      const L=find(sc,n=>n.name==='Fx');
      return L?L.children.length:0;
    });
    if(fx>best){ best=fx; await page.locator('canvas').screenshot({path:'screenshots/effects.png'}); bestShot=fx; }
    const [k1,k2]=keys[r%4];
    await page.keyboard.down(k1); await page.keyboard.down(k2); await sleep(420);
    await page.keyboard.up(k1); await page.keyboard.up(k2);
  }
  console.log('特效最多时 Fx 层节点数:', best);
  await b.close();
})();
