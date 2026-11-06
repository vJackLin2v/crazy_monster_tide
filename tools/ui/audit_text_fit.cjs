#!/usr/bin/env node
/**
 * 文本适配审计（text fit audit）v2
 *
 * 与 audit_overflow.cjs（矩形越界）/ audit_hit_area.cjs（热区）互补：
 *   本工具只看 **Label 自身**：文字是否被 CLAMP 裁掉、需要几行、行高够不够、兄弟文本是否互相遮挡。
 *
 * 判定依据（对照标准文档）：
 *   · 微信小程序设计规范 / iOS HIG：辅助文本 ≥ 12px、正文 14~16px、行高 ≈ 1.5×字号
 *   · 超长文本必须"省略号截断或换行"，不得直接裁切半个字
 *   · UIKit.text() 默认 overflow=CLAMP + enableWrapText，节点高 = 字号×1.5+4（= 单行）
 *     → 只要换行成 2 行，第二行就会被裁掉。这是本工具的核心检查项。
 *
 * v2 修正：
 *   · 遮挡判定改用**字形矩形**（按对齐方式+实际文字宽度收紧），不再拿整块排版框比较；
 *   · 每个页面只审自己的根节点（scr-* / HudRoot），避免被下层残留页面刷噪声。
 *
 * 用法：node tools/ui/audit_text_fit.cjs [baseUrl]
 * 退出码：0 = 无裁切/遮挡；1 = 有问题。
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE = process.argv[2] || 'http://127.0.0.1:8123/';
const OUT = 'H:/AI-game/crazy_monster_tide/reports/text_fit';
const VIEWPORTS = [{ w: 360, h: 640 }, { w: 390, h: 844 }, { w: 412, h: 915 }];

const MEASURE = function (rootName) {
  const cc = window.cc;
  const Label = cc.Label;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  const sc = cc.director.getScene();
  const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
  const root = rootName ? find(sc, n => n.name === rootName) : sc;
  const rows = [], overlaps = [];
  if (!root) return { rows, overlaps, missing: rootName };

  const boxOf = (n) => {
    const ut = n.getComponent('cc.UITransform'); if (!ut) return null;
    const wp = n.getWorldPosition();
    return { x0: wp.x - ut.width * n.anchorX, x1: wp.x + ut.width * (1 - n.anchorX),
             y0: wp.y - ut.height * n.anchorY, y1: wp.y + ut.height * (1 - n.anchorY),
             w: ut.width, h: ut.height, cx: wp.x, cy: wp.y };
  };
  const pathOf = (n) => { const a = []; let c = n, d = 0; while (c && d++ < 7) { a.unshift(c.name); c = c.parent; } return a.join('/'); };
  const wrapLines = (str, font, maxW) => {
    let lines = 1, cur = 0, maxLine = 0;
    ctx.font = font;
    for (const ch of str) {
      if (ch === '\n') { lines++; maxLine = Math.max(maxLine, cur); cur = 0; continue; }
      const w = ctx.measureText(ch).width;
      if (cur + w > maxW && cur > 0) { lines++; maxLine = Math.max(maxLine, cur); cur = w; } else cur += w;
    }
    return { lines, maxLine: Math.max(maxLine, cur) };
  };
  /** 字形矩形（只覆盖真正有字的区域，用于遮挡判定） */
  const inkOf = (n, lb) => {
    const r = boxOf(n); if (!r) return null;
    ctx.font = `${lb.fontSize}px ${lb.fontFamily || 'Arial'}`;
    const wrapped = lb.enableWrapText && lb.overflow === Label.Overflow.CLAMP;
    const m = wrapped ? wrapLines(lb.string, ctx.font, r.w) : { lines: 1, maxLine: ctx.measureText(lb.string).width };
    const w = Math.min(r.w, m.maxLine);
    const h = Math.min(r.h, m.lines * lb.lineHeight);
    const ha = lb.horizontalAlign, va = lb.verticalAlign;
    const x0 = ha === Label.HorizontalAlign.LEFT ? r.x0 : ha === Label.HorizontalAlign.RIGHT ? r.x1 - w : r.cx - w / 2;
    const y0 = va === Label.VerticalAlign.TOP ? r.y1 - h : va === Label.VerticalAlign.BOTTOM ? r.y0 : r.cy - h / 2;
    return { x0, x1: x0 + w, y0, y1: y0 + h, w, h };
  };

  const walk = (n, d) => {
    if (d > 22 || !n || !n.activeInHierarchy) return;
    const lb = n.getComponent && n.getComponent(Label);
    if (lb && lb.enabled && lb.string) {
      const r = boxOf(n);
      if (r && r.w > 0) {
        const font = `${lb.fontSize}px ${lb.fontFamily || 'Arial'}`;
        const wrapped = lb.enableWrapText && lb.overflow === Label.Overflow.CLAMP;
        const m = wrapped ? wrapLines(lb.string, font, r.w) : { lines: 1, maxLine: (ctx.font = font, ctx.measureText(lb.string).width) };
        const needH = m.lines * lb.lineHeight;
        const overflowV = needH > r.h + 1.5;
        const overflowH = !wrapped && m.maxLine > r.w + 1.5;
        if (overflowV || overflowH) {
          rows.push({ path: pathOf(n), text: lb.string.slice(0, 40), size: lb.fontSize,
            box: [Math.round(r.w), Math.round(r.h)], lines: m.lines, needH: Math.round(needH), overflowV, overflowH });
        }
      }
    }
    for (const c of n.children) walk(c, d + 1);
  };
  walk(root, 0);

  const checkParent = (n, d) => {
    if (d > 20 || !n || !n.activeInHierarchy) return;
    const kids = n.children.filter(k => k.activeInHierarchy && k.name !== 'textShadow' && k.name !== 'text');
    const labels = kids.map(k => ({ k, lb: k.getComponent && k.getComponent(Label) })).filter(o => o.lb && o.lb.string);
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = inkOf(labels[i].k, labels[i].lb), b = inkOf(labels[j].k, labels[j].lb);
        if (!a || !b) continue;
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
        const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
        if (ox > 3 && oy > 3) {
          overlaps.push({ parent: pathOf(n), a: labels[i].lb.string.slice(0, 18), b: labels[j].lb.string.slice(0, 18),
            ox: Math.round(ox), oy: Math.round(oy) });
        }
      }
    }
    for (const c of n.children) checkParent(c, d + 1);
  };
  checkParent(root, 0);
  return { rows, overlaps };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  let fail = 0;
  const seen = new Set();
  for (const vp of VIEWPORTS) {
    const page = await (await b.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 })).newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 120)));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas');
    await page.waitForTimeout(9000);
    // 关掉引擎自带性能面板：web 预览包 showFPS=true，会盖住底部 UI，干扰视觉核对
    await page.evaluate(() => { try { cc.debug.setDisplayStats(false); } catch (e) { /* ignore */ } });
    const ev = (code) => page.evaluate((c) => {
      const cc = window.cc, sc = cc.director.getScene();
      const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
      const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
      try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
    }, code).then(r => { const s = String(r); if (s.startsWith('ERR')) console.log('  ! eval 失败：' + s); return r; });
    const audit = async (tag, rootName) => {
      const r = await page.evaluate(MEASURE, rootName);
      if (r.missing) { console.log(`  ? [${tag}] 找不到根节点 ${rootName}`); return; }
      const lines = [];
      for (const x of r.rows) {
        const key = `${tag}|${x.text}|${x.overflowV}|${x.overflowH}`;
        if (seen.has(key) && vp.w !== 360) continue;
        seen.add(key);
        lines.push(`  [${tag}] 裁切${x.overflowV ? '·纵向' : ''}${x.overflowH ? '·横向' : ''} ${x.size}px `
          + `框${x.box[0]}x${x.box[1]} 需${x.needH}(${x.lines}行) 「${x.text}」 @${x.path.replace(/^Boot\/Canvas\/Game\//, '')}`);
      }
      for (const o of r.overlaps) {
        const key = `${tag}|ov|${o.a}|${o.b}`;
        if (seen.has(key) && vp.w !== 360) continue;
        seen.add(key);
        lines.push(`  [${tag}] 遮挡 「${o.a}」×「${o.b}」 ${o.ox}x${o.oy}px @${o.parent.replace(/^Boot\/Canvas\/Game\//, '')}`);
      }
      if (lines.length) { fail += lines.length; console.log(lines.join('\n')); }
    };

    console.log(`\n########## 视口 ${vp.w}x${vp.h} ##########`);
    await audit('主菜单', 'scr-menu');
    await ev('(G.showCharSelect(),1)'); await page.waitForTimeout(800); await audit('选角色', 'scr-charselect');
    await ev('(G.closeModal(), G.showHowto(),1)'); await page.waitForTimeout(700);
    await audit('玩法说明', 'scr-howto');
    await page.screenshot({ path: `${OUT}/${vp.w}x${vp.h}-howto.png` });
    await ev('(G.closeModal(), G.showSettings(),1)'); await page.waitForTimeout(700); await audit('设置', 'scr-settings');
    await ev("(G.closeModal(), G.save.seen=['enemy:goblin','enemy:wolf','enemy:boss','skill:blade','item:power_l'], G.showCodex(),1)");
    await page.waitForTimeout(800); await audit('图鉴', 'scr-codex');
    await page.screenshot({ path: `${OUT}/${vp.w}x${vp.h}-codex.png` });
    await ev('(G.closeModal(), G.showAchievements(),1)'); await page.waitForTimeout(700); await audit('成就', 'scr-ach');
    await ev('(G.closeModal(), G.showMenu(),1)'); await page.waitForTimeout(300);
    await ev("(G.charId='knight', G.startBattle(),1)"); await page.waitForTimeout(4200);
    await ev('(()=>{const rs=G.battle.rs; rs.gold=9999999; rs.waveKills=99999; rs.lv=99; rs.stats.hp=9999; rs.stats.maxhp=9999; rs.wave=99; return 1})()');
    await page.waitForTimeout(400); await audit('HUD-数字压力', 'HudRoot');
    await page.screenshot({ path: `${OUT}/${vp.w}x${vp.h}-hud.png` });
    await ev("(G.battle.paused=true, G.showLevelUp([{kind:'item',id:'count_l'},{kind:'module',id:'fan'},{kind:'skill',id:'blade_storm'}]),1)");
    await page.waitForTimeout(700); await audit('升级三选一', 'scr-levelup');
    await page.screenshot({ path: `${OUT}/${vp.w}x${vp.h}-levelup.png` });
    await ev("(()=>{const rs=G.battle.rs; G.closeModal(); rs.modsBag=['multi','pierce','fan','burn','split','orbit','giant']; rs.skills[0].mods=['multi','pierce']; rs.gold=999; rs.wave=5; rs.endless=false; G.phase='battle'; G.showShop(); return 1})()");
    await page.waitForTimeout(700); await audit('商店', 'scr-shop');
    await page.screenshot({ path: `${OUT}/${vp.w}x${vp.h}-shop.png` });
    await ev("(()=>{G.closeModal(); G.pauseTab=0; G.showPause(); return 1})()");
    await page.waitForTimeout(700); await audit('暂停-构建', 'scr-build');
    await page.screenshot({ path: `${OUT}/${vp.w}x${vp.h}-build.png` });
    await ev("(G.closeModal(), G.battle.rs.wave=20, G.showResult({wave:20,level:12,kills:640,gold:320,time:512,dmg:18200,items:['power_l','haste_s','count_l'],skills:['blade','ice_spear','meteor','holybolt']}),1)");
    await page.waitForTimeout(800); await audit('结算', 'scr-result');
    await page.screenshot({ path: `${OUT}/${vp.w}x${vp.h}-result.png` });
    if (errs.length) console.log('  pageerror: ' + errs.slice(0, 3).join(' | '));
    await page.close();
  }
  await b.close();
  console.log(`\n合计问题 ${fail} 条（同一条只报一次）；截图目录 ${OUT}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
