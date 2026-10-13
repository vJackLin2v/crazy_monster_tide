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
  const tap = async (gx, gy) => { const p = toPage(gx, gy); await page.mouse.click(p.x, p.y); await sleep(500); };
  const st = async () => page.evaluate(() => {
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot');
    const world=find(sc,n=>n.name==='World'); const unit=find(sc,n=>n.name==='Unit');
    const pl=find(sc,n=>n.name.indexOf('player:')===0);
    const vsv=cc.view.getVisibleSize(); const s=world?world.scale.x:0;
    const screens = ui?ui.children.map(x=>x.name):[];
    if(!pl) return { screens, onScreen:0, total:0 };
    let onScreen=0, total=0;
    for(const c of unit.children){
      if(c.name.indexOf('enemy:')!==0) continue;
      total++;
      const dx=(c.position.x-pl.position.x)*s, dy=(c.position.y-pl.position.y)*s;
      if(Math.abs(dx)<vsv.width/2 && Math.abs(dy)<vsv.height/2) onScreen++;
    }
    return { screens, onScreen, total };
  });
  await tap(0,-40); await tap(76,-272); await sleep(3000);
  const keys=[['KeyW','KeyD'],['KeyD','KeyS'],['KeyS','KeyA'],['KeyA','KeyW']];
  const env = [];
  let shots = 0;
  for (let r=0;r<34;r++){
    const s = await st();
    if (s.screens.includes('scr-levelup')) { await tap(-108,40); await sleep(400); continue; }
    if (s.screens.includes('scr-shop')) { console.log('  商店'); break; }
    env.push(s.onScreen);
    if (s.onScreen >= 8 && shots === 0) { shots++; await page.locator('canvas').screenshot({path:'screenshots/view-busy.png'}); console.log('  ★ 屏幕上有 %d 只怪，已截图 view-busy.png' % s.onScreen); }
    if (r%4===3) console.log('   r%02d 屏幕:%s 在屏怪:%d 总数:%d', r, JSON.stringify(s.screens), s.onScreen, s.total);
    const [k1,k2]=keys[r%4];
    await page.keyboard.down(k1); await page.keyboard.down(k2); await sleep(650);
    await page.keyboard.up(k1); await page.keyboard.up(k2);
  }
  console.log('  在屏怪数量序列:', env.join(','));
  console.log('  平均 %.1f  最大 %d', env.reduce((a,b)=>a+b,0)/Math.max(1,env.length), Math.max(...env,0));
  console.log('  页面错误:', errs.length?errs.slice(0,3).join(' | '):'无');
  await b.close();
})();
