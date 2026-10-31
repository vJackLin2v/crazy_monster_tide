const path = require('path');
const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await sleep(9000);
  await page.evaluate(() => localStorage.removeItem('cmt_device_log_v1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await sleep(9000);
  // 点主菜单"开始游戏"（无存档：按钮中心 180,306 设计坐标）
  await page.mouse.click(180, 306);
  await sleep(1500);
  const res = await page.evaluate(() => {
    const raw = localStorage.getItem('cmt_device_log_v1');
    const ev = raw ? JSON.parse(raw) : [];
    return { count: ev.length, events: ev.map(e => e.ev), sample: ev.slice(0, 5) };
  });
  console.log('DEVICELOG=' + JSON.stringify(res));
  await browser.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
