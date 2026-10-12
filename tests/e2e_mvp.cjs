const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
(async () => {

const ROOT = path.resolve('prototype-html');
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
const srv = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream'});
  res.end(fs.readFileSync(f));
});
await new Promise(r=>srv.listen(8777, r));

const VIEWPORTS = [
  {name:'375x812', w:375, h:812}, {name:'390x844', w:390, h:844}, {name:'412x915', w:412, h:915}
];
const browser = await chromium.launch();
const errors = [];
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

for (const vp of VIEWPORTS){
  const ctx = await browser.newContext({viewport:{width:vp.w,height:vp.h}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type()==='error') errors.push('['+vp.name+'] '+m.text()); });
  page.on('pageerror', e => errors.push('['+vp.name+'] PAGEERROR '+e.message));
  await page.goto('http://127.0.0.1:8777/index.html');
  await page.waitForTimeout(500);
  console.log('\n== 视口 ' + vp.name + ' ==');

  // 1) 角色选择
  ok(await page.locator('#scr-charselect.on').count() === 1, '角色选择屏可见');
  ok(await page.locator('#charrow .char').count() === 6, '6 个角色');
  await page.screenshot({path:`screenshots/${vp.name}-1-charselect.png`});

  // 2) 换一个角色 + 开始
  await page.locator('#charrow .char').nth(0).click();
  await page.waitForTimeout(150);
  await page.locator('#btn-start').click();
  await page.waitForTimeout(300);
  ok(await page.locator('#scr-map.on').count() === 1, '进入地图');
  const nodes = await page.locator('.node.avail').count();
  ok(nodes >= 1, '地图有可选节点 (' + nodes + ')');
  await page.screenshot({path:`screenshots/${vp.name}-2-map.png`});

  // 3) 进战斗
  await page.locator(".node.avail").first().click({force:true});
  await page.waitForTimeout(600);
  ok(await page.locator('#scr-battle.on').count() === 1, '进入战斗');
  ok(await page.locator('#skillbar .sk').count() === 4, '技能栏 4 格');

  // 4) 动态摇杆：按下 → 摇杆出现 → 拖动 → 松开消失
  const box = await page.locator('#stage').boundingBox();
  const cx = box.x + box.width/2, cy = box.y + box.height*0.72;
  await page.mouse.move(cx, cy); await page.mouse.down();
  await page.waitForTimeout(120);
  ok(await page.locator('#joy').isVisible(), '摇杆按下出现');
  await page.mouse.move(cx+40, cy-20, {steps:6});
  await page.waitForTimeout(400);
  await page.mouse.up();
  await page.waitForTimeout(200);
  ok(!(await page.locator('#joy').isVisible()), '摇杆松开消失');

  // 5) 战斗推进：等怪物出现 / 伤害数字
  await page.waitForTimeout(4000);
  await page.screenshot({path:`screenshots/${vp.name}-3-battle.png`});
  const killed = await page.evaluate(()=>typeof G!=='undefined' ? G.battleKilled : -1);
  const alive = await page.evaluate(()=>typeof ents!=='undefined' ? ents.enemies.length : -1);
  const hpNow = await page.evaluate(()=>typeof G!=='undefined' ? Math.round(G.stats.hp) : -1);
  ok(killed > 0, '战斗循环在跑：4s 内击杀 ' + killed + ' 只，场上残留 ' + alive + '，HP ' + hpNow);

  // 6) 强制升级 → 3 选 1
  await page.evaluate(()=>{ addExp(G.expNeed); });
  await page.waitForTimeout(400);
  ok(await page.locator('#scr-levelup.on').count() === 1, '升级 3 选 1 出现');
  ok(await page.locator('#lucards .card').count() === 3, '3 张卡');
  await page.screenshot({path:`screenshots/${vp.name}-4-levelup.png`});

  // 7) 选卡（若为模块则进安装步骤）
  await page.locator('#lucards .card').first().click();
  await page.waitForTimeout(400);
  const inInstall = await page.locator('#scr-install.on').count();
  const backBattle = await page.locator('#scr-battle.on').count();
  ok(inInstall + backBattle >= 1, '选卡后进入 安装步骤 或 回到战斗 (install=' + inInstall + ')');
  if (inInstall){ await page.screenshot({path:`screenshots/${vp.name}-5-install.png`}); await page.locator('#btn-instback').click(); await page.waitForTimeout(300); }

  // 8) 暂停 → Build 面板 4 Tab
  await page.locator('#btn-pause').click();
  await page.waitForTimeout(300);
  ok(await page.locator('#scr-build.on').count() === 1, '暂停进入 Build 面板');
  ok(await page.locator('#btabs .tab').count() === 4, 'Build 4 个页签');
  await page.locator('#btabs .tab').nth(1).click(); await page.waitForTimeout(150);
  await page.screenshot({path:`screenshots/${vp.name}-6-build.png`});
  await page.locator('#btn-resume').click();
  await page.waitForTimeout(200);

  // 9) 三档视口：无溢出 / 无横向滚动
  const overflow = await page.evaluate(()=>{
    const s = document.getElementById('stage').getBoundingClientRect();
    return {ok: s.left >= -1 && s.right <= window.innerWidth+1 && s.top >= -1 && s.bottom <= window.innerHeight+1,
            sw: document.documentElement.scrollWidth, iw: window.innerWidth};
  });
  ok(overflow.ok, '舞台完整落在视口内 无裁切');
  ok(overflow.sw <= overflow.iw + 1, '无横向滚动');

  await ctx.close();
}

// 10) 固定 seed 可复现
{
  const ctx = await browser.newContext({viewport:{width:390,height:844}});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('[seed] PAGEERROR '+e.message));
  await page.goto('http://127.0.0.1:8777/index.html');
  const r1 = await page.evaluate(()=>{ G.seed = 424242; const m = genMap(424242); return JSON.stringify(m.layers.map(l=>l.map(n=>n.type))); });
  const r2 = await page.evaluate(()=>{ const m = genMap(424242); return JSON.stringify(m.layers.map(l=>l.map(n=>n.type))); });
  console.log('\n== 固定 seed ==');
  ok(r1 === r2 && r1.length > 10, '同 seed 生成同一张地图');
  const d1 = await page.evaluate(()=>{ G.rng = makeRng(7); G.stats = freshStats(CHARS[0]); G.char=CHARS[0]; G.skills=[mkSkill('fireball')]; G.map={layer:0}; return rollRewards().map(r=>r.kind+':'+(r.id||'')).join(','); });
  const d2 = await page.evaluate(()=>{ G.rng = makeRng(7); return rollRewards().map(r=>r.kind+':'+(r.id||'')).join(','); });
  ok(d1 === d2, '同 seed 抽出同一组奖励: ' + d1);
  await ctx.close();
}

console.log('\n================ 结果 ================');
console.log('PASS ' + pass + ' / FAIL ' + fail);
console.log('控制台错误: ' + (errors.length ? '\n  ' + errors.join('\n  ') : '无'));
await browser.close(); srv.close();
process.exit(fail || errors.length ? 1 : 0);

})().catch(e => { console.error('RUNNER ERROR', e); process.exit(2); });
