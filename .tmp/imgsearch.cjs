/* 用 Bing 图片搜索下载热门小游戏截图，用于分析 UI 比例 */
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), https = require('https'), http = require('http');
const OUT = 'H:/AI-game/crazy_monster_tide/.tmp/research';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const QUERIES = process.argv[2] ? [process.argv[2]] : ['向僵尸开炮 小游戏 截图', '弹壳特攻队 截图'];
const KEY = process.argv[3] || 'q1';

(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' });
  for (const q of QUERIES) {
    const url = 'https://cn.bing.com/images/search?q=' + encodeURIComponent(q);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await sleep(2500);
      const urls = await page.$$eval('a.mimg, img.mimg', els =>
        els.map(e => e.getAttribute('m') ? JSON.parse(e.getAttribute('m')).murl : e.getAttribute('src')).filter(Boolean));
      const uniq = [...new Set(urls)].slice(0, 6);
      console.log(q + ' -> 找到 ' + uniq.length + ' 张');
      let i = 0;
      for (const u of uniq) {
        try {
          const buf = await new Promise((res, rej) => {
            const mod = u.startsWith('https') ? https : http;
            mod.get(u, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://cn.bing.com/' } }, r => {
              if (r.statusCode !== 200) return rej(new Error('HTTP ' + r.statusCode));
              const chunks = []; r.on('data', c => chunks.push(c)); r.on('end', () => res(Buffer.concat(chunks)));
            }).on('error', rej).setTimeout(12000, function () { this.destroy(); });
          });
          if (buf.length < 8000) continue;
          const f = path.join(OUT, KEY + '-' + (++i) + '.img');
          fs.writeFileSync(f, buf);
          console.log('   [' + i + '] ' + Math.round(buf.length / 1024) + 'KB  ' + u.slice(0, 80));
        } catch (e) { }
      }
    } catch (e) { console.log(q + ' 失败: ' + String(e.message).slice(0, 80)); }
  }
  await b.close();
})();
