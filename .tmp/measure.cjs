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
  const tap = async (gx, gy) => { const p = toPage(gx, gy); await page.mouse.click(p.x, p.y); await sleep(450); };
  const st = async () => page.evaluate(() => {
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot');
    const world=find(sc,n=>n.name==='World'); const unit=find(sc,n=>n.name==='Unit');
    const pl=find(sc,n=>n.name.indexOf('player:')===0);
    const vsv=cc.view.getVisibleSize(); const s=world?world.scale.x:1;
    const screens = ui?ui.children.map(x=>x.name):[];
    const bt=find(sc,n=>n.name==='Battle'); const c=bt&&bt.getComponent('Battle');
    if(!pl) return { screens, on:0, total:0, wave:c?c.rs.wave:0, hp:c?Math.round(c.rs.stats.hp):0, lv:c?c.rs.lv:0 };
    let on=0, total=0;
    for(const ch of unit.children){
      if(ch.name.indexOf('enemy:')!==0) continue;
      total++;
      const dx=(ch.position.x-pl.position.x)*s, dy=(ch.position.y-pl.position.y)*s;
      if(Math.abs(dx)<vsv.width/2 && Math.abs(dy)<vsv.height/2) on++;
    }
    return { screens, on, total, wave:c?c.rs.wave:0, hp:c?Math.round(c.rs.stats.hp):0, lv:c?c.rs.lv:0 };
  });
  await tap(0,-40); await tap(76,-272); await sleep(2500);
  const keys=[['KeyW','KeyD'],['KeyD','KeyS'],['KeyS','KeyA'],['KeyA','KeyW']];
  const ons=[]; let shot=false;
  for (let r=0;r<40;r++){
    const s = await st();
    if (s.screens.includes('scr-levelup')) { await tap(-108,40); await sleep(300); continue; }
    if (s.screens.includes('scr-shop')) { console.log('  到达商店（第' + s.wave + '波结束）'); break; }
    ons.push(s.on);
    if (!shot && s.on >= 8) { shot=true; await page.locator('canvas').screenshot({path:'screenshots/dense.png'});
      console.log('  ★ 在屏怪 ' + s.on + ' 只，已截图 dense.png（波' + s.wave + ' Lv' + s.lv + ' HP' + s.hp + '）'); }
    if (r%5===4) console.log('   r=' + r + '  在屏' + s.on + ' 总数' + s.total + ' 波' + s.wave + ' Lv' + s.lv + ' HP' + s.hp);
    const [k1,k2]=keys[r%4];
    await page.keyboard.down(k1); await page.keyboard.down(k2); await sleep(600);
    await page.keyboard.up(k1); await page.keyboard.up(k2);
  }
  const avg = ons.length ? ons.reduce((a,b)=>a+b,0)/ons.length : 0;
  console.log('  在屏怪序列: ' + ons.join(','));
  console.log('  平均 ' + avg.toFixed(1) + '  最大 ' + (ons.length?Math.max(...ons):0));
  console.log('  页面错误: ' + (errs.length?errs.slice(0,3).join(' | '):'无'));
  await b.close();
})();
