/* 抓一张"主力战斗中"的 Cocos 截图（玩家跑起来、有怪有特效） */
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  await page.goto('http://127.0.0.1:7456/', { waitUntil:'domcontentloaded', timeout:60000 });
  await page.waitForSelector('canvas', { timeout:60000 });
  await sleep(18000);
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(()=>{const v=window.cc.view.getVisibleSize();return {w:v.width,h:v.height};});
  const toPage=(gx,gy)=>({x:box.x+(gx+vs.w/2)/vs.w*box.width, y:box.y+(vs.h/2-gy)/vs.h*box.height});
  const tap=async(gx,gy)=>{const p=toPage(gx,gy); await page.mouse.click(p.x,p.y); await sleep(500);};
  await tap(0,24); await tap(82,-331); await sleep(2500);
  // 注入满配 build，让画面接近"中期战斗"
  await page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const c=find(sc,n=>n.name==='Battle').getComponent('Battle');
    c.rs.skills=[{id:'fireball',lvl:4,mods:['multi']},{id:'ice_spear',lvl:3,mods:['pierce']},
                 {id:'arcane',lvl:3,mods:['rapid']},{id:'chain',lvl:2,mods:[]}];
    c.rs.stats.hp = c.rs.stats.maxhp;
    c.rs.stats.pickup = 999;       // 让经验球全吸过来，画面更接近真实战斗
  });
  const keys=[['KeyW','KeyD'],['KeyD','KeyS'],['KeyS','KeyA'],['KeyA','KeyW']];
  for(let r=0;r<20;r++){
    const s=await page.evaluate(()=>{
      const cc=window.cc,sc=cc.director.getScene();
      const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
      const ui=find(sc,n=>n.name==='UiRoot');
      return ui?ui.children.map(x=>x.name):[];
    });
    if(s.includes('scr-levelup')){ await tap(-108,40); await sleep(300); continue; }
    const [k1,k2]=keys[r%4];
    await page.keyboard.down(k1); await page.keyboard.down(k2); await sleep(600);
    await page.keyboard.up(k1); await page.keyboard.up(k2);
    if(r===12){ await page.locator('canvas').screenshot({path:'screenshots/cocos-now.png'}); console.log('  已截图 cocos-now.png'); }
    if(r>=13) break;
  }
  await b.close();
})();
