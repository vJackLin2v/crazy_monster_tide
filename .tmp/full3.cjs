const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + String(e.message).slice(0, 220)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 220)); });
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await sleep(18000);
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(() => { const v = window.cc.view.getVisibleSize(); return { w: v.width, h: v.height }; });
  const toPage = (gx, gy) => ({ x: box.x + (gx + vs.w/2)/vs.w*box.width, y: box.y + (vs.h/2 - gy)/vs.h*box.height });
  const tap = async (gx, gy) => { const p = toPage(gx, gy); await page.mouse.click(p.x, p.y); await sleep(600); };
  const shot = async n => { await page.locator('canvas').screenshot({ path: 'screenshots/f-' + n + '.png' }); };
  const st = async () => page.evaluate(() => {
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot');
    const bt=find(sc,n=>n.name==='Battle'); const c=bt&&bt.getComponent('Battle');
    return { screens: ui?ui.children.map(x=>x.name):[], lv:c?c.rs.lv:0, wave:c?c.rs.wave:0,
             paused:c?c.paused:null, hp:c?Math.round(c.rs.stats.hp):0, gold:c?c.rs.gold:0 };
  });

  await tap(0, -40); await tap(76, -272);
  await sleep(2500);
  const keys = [['KeyW','KeyD'],['KeyD','KeyS'],['KeyS','KeyA'],['KeyA','KeyW']];
  let got = { levelup: false, shop: false, result: false };
  for (let r = 0; r < 40; r++) {
    const s = await st();
    if (!got.levelup && s.screens.includes('scr-levelup')) { got.levelup = true; await shot('4-levelup'); console.log('★ 升级弹窗'); }
    if (got.levelup && s.screens.includes('scr-levelup')) { await tap(-108, 40); }
    if (!got.shop && s.screens.includes('scr-shop')) { got.shop = true; await shot('5-shop'); console.log('★ 商店'); }
    if (!got.result && s.screens.includes('scr-result')) { got.result = true; await shot('8-result'); console.log('★ 结算'); break; }
    if (got.shop) { console.log('  商店已出现，点下一波'); await tap(82, -200); await sleep(2500); await shot('6-battle2'); }
    if (r % 3 === 0) console.log('  r%02d %s', r, JSON.stringify(s));
    if (s.hp <= 0) { console.log('  玩家阵亡'); break; }
    const [k1, k2] = keys[r % 4];
    await page.keyboard.down(k1); await page.keyboard.down(k2);
    await sleep(700);
    await page.keyboard.up(k1); await page.keyboard.up(k2);
  }
  const fin = await st(); console.log('最终状态:', JSON.stringify(fin));
  if (fin.screens.includes('scr-battle') || fin.screens.includes('HudRoot')) await shot('7-battle-late');
  console.log('页面错误:', errs.length ? errs.slice(0, 8).join(' || ') : '无');
  await b.close();
})();
