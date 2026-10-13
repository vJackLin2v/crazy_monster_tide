/* 逐屏走一遍，每屏截图 + 越界检查 */
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const HW = 180, HH = 320;
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 900, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.goto('http://127.0.0.1:7456/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await sleep(18000);
  const box = await page.locator('canvas').boundingBox();
  const vs = await page.evaluate(() => { const v = window.cc.view.getVisibleSize(); return { w: v.width, h: v.height }; });
  const toPage = (gx, gy) => ({ x: box.x + (gx + vs.w/2)/vs.w*box.width, y: box.y + (vs.h/2 - gy)/vs.h*box.height });
  const tap = async (gx, gy, l) => { const p = toPage(gx, gy); await page.mouse.click(p.x, p.y); await sleep(900); console.log('  点击 ' + l); };
  const shot = async n => { await page.locator('canvas').screenshot({ path: 'screenshots/f-' + n + '.png' }); console.log('  截图 f-' + n + '.png'); };
  const screens = async () => page.evaluate(() => {
    const cc = window.cc; const sc = cc.director.getScene();
    const find=(n,p,d=0)=>{if(d>10||!n)return null;if(p(n))return n;for(const c of n.children){const t=find(c,p,d+1);if(t)return t;}return null;};
    const ui=find(sc,n=>n.name==='UiRoot'); return ui?ui.children.map(c=>c.name):[];
  });

  console.log('1 主界面'); await shot('1-menu');
  await tap(0, -104, '玩法说明'); console.log('   当前屏:', JSON.stringify(await screens())); await shot('2-howto');
  await tap(0, -260, '返回');
  await tap(0, -40, '开始游戏'); await shot('3-charselect');
  await tap(76, -272, '开始闯关');

  // 等升级弹窗出现
  console.log('   等升级弹窗...');
  for (let i = 0; i < 40; i++) {
    await sleep(1500);
    const s = await screens();
    if (s.includes('scr-levelup')) { console.log('   升级弹窗出现（第 ' + (i+1) + ' 次探测）'); await shot('4-levelup'); break; }
  }
  await tap(-108, 40, '选第一张卡');

  // 等第 1 波结束 -> 商店
  console.log('   等第 1 波结束...');
  for (let i = 0; i < 40; i++) {
    await sleep(1500);
    const s = await screens();
    if (s.includes('scr-shop')) { console.log('   商店出现（第 ' + (i+1) + ' 次探测）'); await shot('5-shop'); break; }
  }
  await tap(82, -200, '下一波');
  await sleep(2500); await shot('6-battle2');
  await tap(152, 286, '暂停');
  await sleep(700); await shot('7-build');
  const s7 = await screens(); console.log('   暂停后当前屏:', JSON.stringify(s7));

  console.log('页面错误:', errs.length ? errs.slice(0, 5).join(' || ') : '无');
  await b.close();
})();
