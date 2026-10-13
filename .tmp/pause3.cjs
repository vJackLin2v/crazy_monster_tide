const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  const errs=[]; page.on('pageerror', e=>errs.push(String(e.message).slice(0,160)));
  await page.goto('http://127.0.0.1:7456/', { waitUntil:'domcontentloaded', timeout:60000 });
  await page.waitForSelector('canvas', { timeout:60000 });
  await sleep(18000);
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(()=>{const v=window.cc.view.getVisibleSize();return {w:v.width,h:v.height};});
  const toPage=(gx,gy)=>({x:box.x+(gx+vs.w/2)/vs.w*box.width, y:box.y+(vs.h/2-gy)/vs.h*box.height});
  const tap=async(gx,gy)=>{const p=toPage(gx,gy); await page.mouse.click(p.x,p.y); await sleep(600);};
  await tap(0,-40); await tap(76,-272); await sleep(3000);

  // 注入满配 build，直接测多行布局
  const inj = await page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const c=find(sc,n=>n.name==='Battle').getComponent('Battle');
    c.rs.skills = [
      {id:'fireball',lvl:5,mods:['multi','multi','giant']},
      {id:'ice_spear',lvl:3,mods:['pierce','rapid']},
      {id:'chain',lvl:2,mods:['burn']},
      {id:'blade',lvl:1,mods:[]},
    ];
    c.rs.modsBag = ['burn','frost','chain','thunder','overload'];
    c.rs.items = [{id:'glove'},{id:'boots'},{id:'magnet'}];
    c.rs.stats.power = 1.6; c.rs.stats.haste = 1.3;
    return c.rs.skills.length;
  });
  console.log('  已注入技能数:', inj);
  await tap(152,286); await sleep(1000);
  const dump = async (tabIdx) => {
    return page.evaluate((ti)=>{
      const cc=window.cc,sc=cc.director.getScene();
      const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
      const ui=find(sc,n=>n.name==='UiRoot'); const dr=ui&&ui.getChildByName('scr-build');
      if(!dr) return {err:'no scr-build'};
      const out=[];
      const walk=n=>{ const l=n.getComponent&&n.getComponent('cc.Label');
        if(l&&l.string) out.push({y:Math.round(n.position.y), x:Math.round(n.position.x), a:n.active, s:l.string});
        for(const c of n.children) walk(c); };
      walk(dr);
      return {labels: out.filter(o=>o.a).sort((a,b)=>b.y-a.y)};
    }, tabIdx);
  };
  const d1 = await dump(0);
  if (d1.err) console.log('  ', d1.err);
  else { console.log('  技能页可见文字（应逐行、y 递减 ~19）:'); 
    for (const l of d1.labels) console.log('    y=' + String(l.y).padStart(5) + ' x=' + String(l.x).padStart(4) + ' "' + l.s.slice(0,44) + '"'); }
  await page.locator('canvas').screenshot({path:'screenshots/pause-skills.png'});
  await tap(4+76+4-152+4, 172-70+0);   // 点"模块"页签（粗略坐标）
  await sleep(700);
  const d2 = await dump(1);
  if (!d2.err) { console.log('  模块页可见文字:'); for (const l of d2.labels) console.log('    y=' + String(l.y).padStart(5) + ' "' + l.s.slice(0,44) + '"'); }
  await page.locator('canvas').screenshot({path:'screenshots/pause-mods.png'});
  console.log('  错误:', errs.length?errs.slice(0,3).join(' | '):'无');
  await b.close();
})();
