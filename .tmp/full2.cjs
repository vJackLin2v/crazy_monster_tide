const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR ' + String(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)); });
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await sleep(18000);
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(() => { const v = window.cc.view.getVisibleSize(); return { w: v.width, h: v.height }; });
  const toPage = (gx, gy) => ({ x: box.x + (gx + vs.w/2)/vs.w*box.width, y: box.y + (vs.h/2 - gy)/vs.h*box.height });
  const tap = async (gx, gy, l) => { const p = toPage(gx, gy); await page.mouse.click(p.x, p.y); await sleep(800); console.log('  点击 ' + l); };
  const shot = async n => { await page.locator('canvas').screenshot({ path: 'screenshots/f-' + n + '.png' }); console.log('  截图 f-' + n + '.png'); };
  const screens = async () => page.evaluate(() => {
    const cc = window.cc; const sc = cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot'); return ui?ui.children.map(c=>c.name):[];
  });
  const info = async () => page.evaluate(() => {
    const cc=window.cc,sc=cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const bt=find(sc,n=>n.name==='Battle');
    const c=bt&&bt.getComponent('Battle');
    return c?{lv:c.rs.lv,exp:c.rs.exp,need:c.rs.expNeed,gold:c.rs.gold,wave:c.rs.wave,paused:c.paused,hp:Math.round(c.rs.stats.hp)}:null;
  });

  await tap(0, -40, '开始游戏');
  await tap(76, -272, '开始闯关');
  await sleep(3000);

  // 用键盘绕圈走，去捡经验球
  const keys = [['KeyW','KeyD'],['KeyD','KeyS'],['KeyS','KeyA'],['KeyA','KeyW']];
  let sawLevelup = false, sawShop = false;
  for (let round = 0; round < 22; round++) {
    const [k1, k2] = keys[round % 4];
    await page.keyboard.down(k1); await page.keyboard.down(k2);
    await sleep(700);
    await page.keyboard.up(k1); await page.keyboard.up(k2);
    const s = await screens();
    if (!sawLevelup && s.includes('scr-levelup')) { sawLevelup = true; console.log('  ★ 升级弹窗出现'); await shot('4-levelup'); }
    if (sawLevelup) { await tap(-108, 40, '选第一张卡'); }
    if (!sawShop && s.includes('scr-shop')) { sawShop = true; console.log('  ★ 商店出现'); await shot('5-shop'); break; }
    if (round % 4 === 3) console.log('   第%2d轮 状态: %s  屏幕:%s', round+1, JSON.stringify(await info()), JSON.stringify(s));
  }
  if (sawShop) { await tap(82, -200, '下一波'); await sleep(2500); await shot('6-battle2'); }
  console.log('页面错误:', errs.length ? errs.slice(0,6).join(' || ') : '无');
  await b.close();
})();
