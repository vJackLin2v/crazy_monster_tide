const { chromium } = require('playwright');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const page=await b.newPage({viewport:{width:900,height:1000}});
  const errs=[]; page.on('pageerror',e=>errs.push(String(e.message).slice(0,180)));
  page.on('console',m=>{if(m.type()==='error')errs.push('[c] '+m.text().slice(0,180));});
  await page.goto('http://127.0.0.1:7456/',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForSelector('canvas',{timeout:60000});
  await sleep(18000);
  const box=await page.locator('canvas').boundingBox();
  const vs=await page.evaluate(()=>{const v=window.cc.view.getVisibleSize();return {w:v.width,h:v.height};});
  const toPage=(gx,gy)=>({x:box.x+(gx+vs.w/2)/vs.w*box.width, y:box.y+(vs.h/2-gy)/vs.h*box.height});
  const tap=async(gx,gy,l)=>{const p=toPage(gx,gy); await page.mouse.click(p.x,p.y); await sleep(600); if(l)console.log('  点击 '+l);};
  const shot=n=>page.locator('canvas').screenshot({path:'screenshots/'+n+'.png'});
  const st=async()=>page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot');
    const bt=find(sc,n=>n.name==='Battle'); const c=bt&&bt.getComponent('Battle');
    return {screens:ui?ui.children.map(x=>x.name):[],
            skills:c?c.rs.skills.map(s=>s.id+'['+s.mods.join(',')+']'):[],
            bag:c?c.rs.modsBag.slice():[]};
  });

  await tap(0,-40); await tap(76,-272); await sleep(2500);

  // 注入一个背包模块，测安装
  await page.evaluate(()=>{
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const c=find(sc,n=>n.name==='Battle').getComponent('Battle');
    c.rs.modsBag = ['multi','giant','burn'];
  });
  console.log('注入后:', JSON.stringify(await st()));

  await tap(155, 380-6-7, '暂停');       // 暂停按钮：HUD 行 y = TOPY-13 = 380-13 = 367
  await sleep(700); await shot('vi-pause');
  let s = await st(); console.log('  暂停后屏幕:', JSON.stringify(s.screens));

  // 点"装模块"按钮（抽屉内 IY=-244，中间按钮 x=0）
  await tap(0, -244, '装模块');
  await sleep(900); await shot('vi-install');
  s = await st(); console.log('  安装屏:', JSON.stringify(s.screens));

  // 点第 1 个槽位（si=0, sl=0 -> x=6, y=226-2=224）
  await tap(6, 224, '槽位 0-0');
  await sleep(800); await shot('vi-installed');
  s = await st(); console.log('  安装后 技能/背包:', JSON.stringify(s.skills), JSON.stringify(s.bag));
  console.log('  错误:', errs.length?errs.slice(0,4).join(' | '):'无');
  await b.close();
})();
