/* 新视角下：数屏幕上的怪 */
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0,150)));
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await sleep(18000);
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(() => { const v = window.cc.view.getVisibleSize(); return { w: v.width, h: v.height }; });
  const toPage = (gx, gy) => ({ x: box.x + (gx + vs.w/2)/vs.w*box.width, y: box.y + (vs.h/2 - gy)/vs.h*box.height });
  const tap = async (gx, gy) => { const p = toPage(gx, gy); await page.mouse.click(p.x, p.y); await sleep(700); };
  const probe = async () => page.evaluate(() => {
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const world=find(sc,n=>n.name==='World'); const unit=find(sc,n=>n.name==='Unit');
    const pl=find(sc,n=>n.name.indexOf('player:')===0);
    const vs=cc.view.getVisibleSize(); const s=world.scale.x;
    if(!pl) return null;
    let onScreen=0, total=0, dists=[];
    for(const c of unit.children){
      if(c.name.indexOf('enemy:')!==0) continue;
      total++;
      const dx=(c.position.x-pl.position.x)*s, dy=(c.position.y-pl.position.y)*s;
      const inside = Math.abs(dx) < vs.width/2 && Math.abs(dy) < vs.height/2;
      if(inside) onScreen++;
      dists.push(Math.round(Math.hypot(dx,dy)));
    }
    return { worldScale:+s.toFixed(3), visibleWorld:[Math.round(vs.width/s), Math.round(vs.height/s)],
             unitPct:+(32*s/vs.height*100).toFixed(1), onScreen, total, dists: dists.sort((a,b)=>a-b).slice(0,12) };
  });
  await tap(0,-40); await tap(76,-272); await sleep(3000);
  const keys=[['KeyW','KeyD'],['KeyD','KeyS'],['KeyS','KeyA'],['KeyA','KeyW']];
  for (let r=0;r<14;r++){
    const [k1,k2]=keys[r%4];
    await page.keyboard.down(k1); await page.keyboard.down(k2); await sleep(700);
    await page.keyboard.up(k1); await page.keyboard.up(k2);
    if (r%3===2) console.log('  r%02d %s', r, JSON.stringify(await probe()));
  }
  await page.locator('canvas').screenshot({ path:'screenshots/view-new.png' });
  console.log('截图 view-new.png  页面错误:', errs.length?errs.slice(0,3).join(' | '):'无');
  await b.close();
})();
