const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  const errs=[]; page.on('pageerror', e=>errs.push(String(e.message).slice(0,150)));
  await page.goto('http://127.0.0.1:7456/', { waitUntil:'domcontentloaded', timeout:60000 });
  await page.waitForSelector('canvas', { timeout:60000 });
  await sleep(18000);
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(()=>{const v=window.cc.view.getVisibleSize();return {w:v.width,h:v.height};});
  const toPage=(gx,gy)=>({x:box.x+(gx+vs.w/2)/vs.w*box.width, y:box.y+(vs.h/2-gy)/vs.h*box.height});
  const tap=async(gx,gy)=>{const p=toPage(gx,gy); await page.mouse.click(p.x,p.y); await sleep(500);};
  const nskills=async()=>page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const bt=find(sc,n=>n.name==='Battle'); const c=bt&&bt.getComponent('Battle');
    const ui=find(sc,n=>n.name==='UiRoot');
    return {n:c?c.rs.skills.length:0, screens:ui?ui.children.map(x=>x.name):[]};
  });
  await tap(0,-40); await tap(76,-272); await sleep(2500);
  const keys=[['KeyW','KeyD'],['KeyD','KeyS'],['KeyS','KeyA'],['KeyA','KeyW']];
  for(let r=0;r<46;r++){
    const s=await nskills();
    if(s.screens.includes('scr-levelup')){ await tap(-108,40); await sleep(300); if((await nskills()).n>=4) break; continue; }
    if(s.screens.includes('scr-shop')){ await tap(82,-200); await sleep(1500); continue; }
    if(s.n>=4) break;
    const [k1,k2]=keys[r%4];
    await page.keyboard.down(k1); await page.keyboard.down(k2); await sleep(600);
    await page.keyboard.up(k1); await page.keyboard.up(k2);
  }
  console.log('  当前技能数:', (await nskills()).n);
  await tap(152,286); await sleep(900);
  const r = await page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot'); const d=ui&&ui.getChildByName('scr-build');
    if(!d) return {err:'no build'};
    const out=[];
    const walk=n=>{ const l=n.getComponent&&n.getComponent('cc.Label');
      if(l&&l.string) out.push({y:Math.round(n.position.y), a:n.active, s:l.string});
      for(const c of n.children) walk(c); };
    walk(d);
    return {n:out.length, labels: out.sort((a,b)=>b.y-a.y)};
  });
  console.log('  面板文字节点', r.n);
  for (const l of (r.labels||[])) console.log('    y=' + String(l.y).padStart(5) + (l.a?'':' [隐]') + ' "' + l.s.slice(0,46) + '"');
  await page.locator('canvas').screenshot({path:'screenshots/pause2.png'});
  console.log('  错误:', errs.length?errs.slice(0,3).join(' | '):'无');
  await b.close();
})();
