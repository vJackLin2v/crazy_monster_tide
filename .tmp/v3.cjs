/* 新工作流验证：不用重启编辑器，Playwright 自己刷新预览页即可拿到新代码 */
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HW = 180, HH = 320;
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 180)));
  page.on('console', m => { if (m.type() === 'error') errs.push('[c] ' + m.text().slice(0, 140)); });

  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await sleep(18000);

  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(() => { const v = window.cc.view.getVisibleSize(); return { w: v.width, h: v.height }; });
  const toPage = (gx, gy) => ({ x: box.x + (gx + vs.w/2)/vs.w*box.width, y: box.y + (vs.h/2 - gy)/vs.h*box.height });
  const tap = async (gx, gy, l) => { const p = toPage(gx, gy); await page.mouse.click(p.x, p.y); await sleep(1000); console.log('  点击 ' + l); };

  const bounds = async (label) => {
    const r = await page.evaluate(({HW,HH}) => {
      const cc = window.cc, sc = cc.director.getScene();
      const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
      const ui=find(sc,n=>n.name==='UiRoot'); const bad=[]; let cnt=0;
      const walk=(n,d=0)=>{ if(d>7||!n.active)return;
        let ut=null,lb=null; try{ut=n.getComponent('cc.UITransform');}catch(e){}
        try{lb=n.getComponent('cc.Label');}catch(e){}
        if(ut){ cnt++;
          const w=ut.contentSize.width,h=ut.contentSize.height;
          const l=n.position.x-w/2,rr=n.position.x+w/2,t2=n.position.y+h/2,b2=n.position.y-h/2;
          if(rr>HW+1||l<-HW-1||t2>HH+1||b2<-HH-1) bad.push({n:n.name,t:lb?lb.string:'',p:[Math.round(n.position.x),Math.round(n.position.y)],s:[Math.round(w),Math.round(h)]});
        }
        for(const c of n.children) walk(c,d+1); };
      if(ui) for(const c of ui.children) walk(c,0);
      return {bad,cnt};
    }, {HW,HH});
    console.log('  [' + label + '] 节点 ' + r.cnt + ' 越界 ' + r.bad.length);
    for (const x of r.bad.slice(0,6)) console.log('     ❌ ' + x.n + ' "' + x.t.slice(0,18) + '" @' + x.p + ' 尺寸' + x.s);
    return r.bad.length;
  };
  const shot = async n => { await page.locator('canvas').screenshot({ path: 'screenshots/v3-' + n + '.png' }); };

  console.log('主界面:'); await bounds('menu'); await shot('menu');
  await tap(0, -40, '开始游戏'); await bounds('charselect'); await shot('charselect');
  await tap(76, -272, '开始闯关'); await sleep(5000);

  const rt = await page.evaluate(() => {
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const pl=find(sc,n=>n.name.indexOf('player:')===0);
    const unit=find(sc,n=>n.name==='Unit');
    let enemies=0,shadows=0;
    if(unit) for(const c of unit.children){ if(c.name.indexOf('enemy:')===0){enemies++; if(c.getChildByName&&c.getChildByName('shadow'))shadows++;} }
    return { hasPlayer:!!pl, playerShadow: pl&&pl.getChildByName?!!pl.getChildByName('shadow'):false, enemies, enemyShadows: shadows };
  });
  console.log('  运行时:', JSON.stringify(rt));
  console.log('战斗:'); await bounds('battle'); await shot('battle');
  await tap(152, 286, '暂停'); await bounds('build'); await shot('build');
  console.log('页面错误:', errs.length ? errs.slice(0,5).join(' || ') : '无');
  await b.close();
})();
