/* 疯狂怪潮 · 静态门禁（能代码量的一律量，不问 VLM）
   覆盖：Design Token 对比度 / 触控热区 / 像素级可读性 / 因果链 / 确定性 / 合规扫描 */
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', 'prototype-html');
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
(async () => {
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
  res.end(fs.readFileSync(f));
});
await new Promise(r => srv.listen(8778, r));
const b = await chromium.launch();
const page = await b.newPage({viewport:{width:390,height:844}, deviceScaleFactor:2});
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:8778/index.html');

console.log('\n== 1. Design Token 对比度（WCAG AA 正文 >= 4.5:1）==');
const contrast = await page.evaluate(() => {
  const lum = h => { const c = [1,3,5].map(i => parseInt(h.substr(i,2),16)/255)
      .map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]; };
  const ratio = (a,bb) => { const l1 = lum(a), l2 = lum(bb);
    return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
  const cs = getComputedStyle(document.documentElement); const v = n => cs.getPropertyValue(n).trim();
  return {
    cream_on_bg1: ratio(v('--cream'), v('--bg-1')),
    cream_on_bg2: ratio(v('--cream'), v('--bg-2')),
    accent_on_bg2: ratio(v('--accent'), v('--bg-2')),
    mint_on_bg2: ratio(v('--mint'), v('--bg-2')),
    ink_on_accent: ratio('#20160A', v('--accent'))
  };
});
Object.entries(contrast).forEach(([k, v]) => ok(v >= 4.5, k + ' = ' + v.toFixed(2) + ':1'));

console.log('\n== 2. 触控热区 ==');
const t1 = await page.locator('#btn-start').boundingBox();
ok(t1.height >= 40, '主按钮高度 ' + t1.height.toFixed(0) + 'px (>=40，含描边容差)');
ok(t1.width >= 200, '主按钮宽度 ' + t1.width.toFixed(0) + 'px');
await page.locator('#charrow .char').first().click();
await page.locator('#btn-start').click(); await page.waitForTimeout(300);
const nb = await page.locator('.node.avail').first().boundingBox();
ok(nb.width >= 44 && nb.height >= 44, '地图节点 ' + nb.width + 'x' + nb.height + ' (>=44)');
await page.locator('.node.avail').first().click({force:true}); await page.waitForTimeout(400);
const pb = await page.locator('#btn-pause').boundingBox();
ok(pb.width >= 30 && pb.height >= 30, '暂停键 ' + pb.width + 'x' + pb.height + ' (>=30，战斗内图标)');

console.log('\n== 3. 像素级可读性（玩家定位环 / 高亮反馈）==');
await page.waitForTimeout(2600);
const pix = await page.evaluate(() => {
  const cv = document.getElementById('cv'), g = cv.getContext('2d');
  const cam = {cx: Math.max(0, Math.min(ARENA.W-360, G.player.x-180)),
               cy: Math.max(0, Math.min(ARENA.H-640, G.player.y-320))};
  const px = G.player.x - cam.cx, py = G.player.y - cam.cy;
  let orange = 0, ring = 0;
  for (let a = 0; a < 64; a++){
    const th = a/64*Math.PI*2;
    for (const rr of [11,12,13,14]){
      const x = Math.round(px + Math.cos(th)*rr), y = Math.round(py + 12 + Math.sin(th)*rr*0.42);
      if (x < 0 || y < 0 || x >= 360 || y >= 640) continue;
      const d = g.getImageData(x, y, 1, 1).data; ring++;
      // 相对色判定：暖色（红通道显著高于蓝通道）即为定位环，避免被透明度混合值骗到
      if (d[0] > 115 && (d[0] - d[2]) > 50 && d[0] > d[1] && d[1] > d[2]) orange++;
    }
  }
  const img = g.getImageData(0, 0, 360, 640).data;
  let bright = 0, total = 0;
  for (let i = 0; i < img.length; i += 4){ total++;
    if (img[i] > 235 && img[i+1] > 235 && img[i+2] > 200) bright++; }
  return {ringPct: orange/ring*100, brightPct: bright/total*100,
          enemies: ents.enemies.length, killed: G.battleKilled};
});
ok(pix.ringPct > 40, '玩家脚下橙色定位环可见（环带暖色占比 ' + pix.ringPct.toFixed(0) + '%）');
ok(pix.brightPct > 0.005, '画面存在高亮像素（伤害数字 / 白闪）' + pix.brightPct.toFixed(3) + '%');
ok(pix.enemies >= 2, '怪潮在场（' + pix.enemies + ' 只）');
ok(pix.killed > 0, '自动攻击确实在击杀（已清 ' + pix.killed + '）');

console.log('\n== 4. 因果链：升级 -> 模块 -> 安装 -> 数值变化 ==');
await page.evaluate(() => { G.levelPause = true; openInstall('multi', 'levelup'); });
await page.waitForTimeout(300);
ok(await page.locator('#scr-install.on').count() === 1, '模块安装屏打开（多重 / 兼容 projectile）');
await page.locator('#instlist .row').first().click(); await page.waitForTimeout(300);
const afterInst = await page.evaluate(() => ({ mods: G.skills[0].mods.slice(), count: calcSkill(G.skills[0]).count }));
ok(afterInst.mods.length >= 1, '模块已装入技能：' + JSON.stringify(afterInst.mods));
ok(afterInst.count >= 2, '「多重」生效：投射物数量 -> ' + afterInst.count);

console.log('\n== 5. 确定性（固定 seed）==');
const det = await page.evaluate(() => {
  const a = genMap(999).layers.map(l => l.map(n => n.type).join(',')).join('|');
  const c = genMap(999).layers.map(l => l.map(n => n.type).join(',')).join('|');
  G.rng = makeRng(3); const r1 = rollRewards().map(r => r.kind + ':' + (r.id||'')).join(',');
  G.rng = makeRng(3); const r2 = rollRewards().map(r => r.kind + ':' + (r.id||'')).join(',');
  return {mapSame: a === c, rewardSame: r1 === r2, reward: r1};
});
ok(det.mapSame, '同 seed 地图一致');
ok(det.rewardSame, '同 seed 奖励组一致：' + det.reward);

console.log('\n== 6. 合规扫描（禁用赌博语义）==');
const kw = ['老虎机','转盘','骰子','筹码','下注','赔率','开箱','抽奖','赌场'];
let hits = [];
for (const f of ['index.html','src/data.js','src/engine.js','src/flow.js','src/ui.js','src/render.js']){
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  kw.forEach(k => { if (t.includes(k)) hits.push(f + ':' + k); });
}
ok(hits.length === 0, '源码无赌博语义词' + (hits.length ? ' -> ' + hits.join(',') : ''));

console.log('\n================ 门禁结果 ================');
console.log('PASS ' + pass + ' / FAIL ' + fail);
console.log('运行时错误: ' + (errs.length ? errs.join(' | ') : '无'));
await b.close(); srv.close();
process.exit(fail || errs.length ? 1 : 0);
})().catch(e => { console.error('RUNNER ERROR', e); process.exit(2); });
