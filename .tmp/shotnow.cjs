const { chromium } = require('playwright');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch(); const page=await b.newPage({viewport:{width:900,height:1000}});
  await page.goto('http://127.0.0.1:7456/?t='+Date.now(),{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('canvas',{timeout:60000}); await sleep(18000);
  await page.locator('canvas').screenshot({path:'screenshots/now-menu.png'});
  console.log('主界面截图: screenshots/now-menu.png');
  const box=await page.locator('canvas').boundingBox();
  const vs=await page.evaluate(()=>{const v=window.cc.view.getVisibleSize();return {w:v.width,h:v.height};});
  const toPage=(gx,gy)=>({x:box.x+(gx+vs.w/2)/vs.w*box.width,y:box.y+(vs.h/2-gy)/vs.h*box.height});
  const p=toPage(0,24); await page.mouse.click(p.x,p.y); await sleep(1200);
  await page.locator('canvas').screenshot({path:'screenshots/now-charselect.png'});
  console.log('角色选择截图: screenshots/now-charselect.png');
  await b.close();
})();
