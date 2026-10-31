#!/usr/bin/env node
/**
 * 真机行为日志分析：读取导出的 JSON（DeviceLog 事件 / Telemetry 对局 / 两者合并），
 * 输出玩家真实行为摘要。不依赖任何外部库。
 *
 * 用法：
 *   node tools/analyze_device_log.cjs <log.json>
 *   node tools/analyze_device_log.cjs <log.txt>      # 支持粘贴文本里夹着 JSON 的情况
 */
const fs = require('fs');

function readJson(p) {
  const raw = fs.readFileSync(p, 'utf8');
  try { return JSON.parse(raw); } catch { /* 尝试从文本中截取 JSON */ }
  const i = raw.search(/[[{]/);
  const j = Math.max(raw.lastIndexOf(']'), raw.lastIndexOf('}'));
  if (i >= 0 && j > i) return JSON.parse(raw.slice(i, j + 1));
  throw new Error('无法解析日志 JSON');
}

function fmtDur(sec) {
  const s = Math.max(0, Math.round(sec));
  return Math.floor(s / 60) + 'm' + String(s % 60).padStart(2, '0') + 's';
}

function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) + '%' : '0%'; }

function main() {
  const file = process.argv[2];
  if (!file) { console.log('用法: node tools/analyze_device_log.cjs <日志文件.json>'); process.exit(1); }
  const data = readJson(file);
  const events = Array.isArray(data) ? (data[0] && data[0].ev ? data : []) : (data.events || []);
  const runs = Array.isArray(data) ? (data[0] && data[0].charId ? data : []) : (data.runs || []);

  console.log('==== 《疯狂鸽王》真机行为日志 ====');
  console.log('文件: ' + file);
  if (events.length) {
    const t0 = events[0].t, t1 = events[events.length - 1].t;
    console.log('事件: ' + events.length + ' 条 · ' + new Date(t0).toLocaleString() + ' → ' + new Date(t1).toLocaleString()
      + ' · 跨度 ' + fmtDur((t1 - t0) / 1000));
  }
  if (runs.length) console.log('对局记录: ' + runs.length + ' 局');
  console.log('');

  if (events.length) {
    const by = (ev) => events.filter(e => e.ev === ev);
    const count = (ev) => by(ev).length;
    const sessions = by('session_start');
    const menus = by('menu_shown');
    const platform = {};
    for (const s of sessions) {
      const p = (s.d && s.d.platform) || 'unknown';
      const m = (s.d && s.d.model) || '';
      const k = p + (m ? ' / ' + m : '');
      platform[k] = (platform[k] || 0) + 1;
    }

    console.log('---- 启动 / 设备 ----');
    console.log('启动次数: ' + sessions.length + (Object.keys(platform).length ? '（' + Object.entries(platform).map(([k, v]) => k + ' ×' + v).join('，') + '）' : ''));
    console.log('菜单展示: ' + menus.length + ' 次（有存档 ' + menus.filter(m => m.d && m.d.save === 'ok').length
      + '，无存档 ' + menus.filter(m => m.d && m.d.save === 'none').length
      + '，损坏 ' + menus.filter(m => m.d && m.d.save === 'corrupt').length + '）');
    console.log('');

    console.log('---- 主菜单操作 ----');
    const continueClick = count('menu_continue');
    const startClick = count('menu_start');
    console.log('继续游戏点击: ' + continueClick + ' · 开始游戏点击: ' + startClick);
    console.log('新游戏确认: 弹出 ' + count('start_confirm_shown')
      + ' · 继续 ' + count('start_confirm_continue')
      + ' · 放弃并开始 ' + count('start_confirm_abandon')
      + ' · 返回 ' + count('start_confirm_back'));
    const pages = {};
    for (const p of by('page_view')) { const k = (p.d && p.d.page) || '?'; pages[k] = (pages[k] || 0) + 1; }
    console.log('页面浏览: ' + (Object.keys(pages).length ? Object.entries(pages).map(([k, v]) => k + '×' + v).join('，') : '无'));
    console.log('清坏档: ' + count('save_discard'));
    console.log('');

    console.log('---- 开局 / 结束 ----');
    const starts = by('run_start');
    const resumes = by('run_resume');
    const runEnds = by('run_end');
    console.log('新开局: ' + starts.length + ' · 续玩恢复: ' + resumes.length + ' · 结算: ' + runEnds.length);
    const byResult = {};
    for (const e of runEnds) { const r = (e.d && e.d.result) || '?'; byResult[r] = (byResult[r] || 0) + 1; }
    console.log('结算结果: ' + (Object.keys(byResult).length ? Object.entries(byResult).map(([k, v]) => k + '×' + v).join('，') : '无'));
    const deaths = by('player_dead');
    const hist = {};
    for (const d of deaths) { const w = (d.d && d.d.wave) || 0; hist[w] = (hist[w] || 0) + 1; }
    const waveKeys = Object.keys(hist).map(Number).sort((a, b) => a - b);
    console.log('死亡波次: ' + (waveKeys.length ? waveKeys.map(w => '第' + w + '波×' + hist[w]).join('，') : '无死亡记录'));
    console.log('通关: ' + count('run_clear') + ' · 主动放弃: ' + (count('quit_abandon') + byResult.abandoned || 0));
    if (runEnds.length) {
      const dur = runEnds.reduce((s, e) => s + ((e.d && e.d.duration) || 0), 0) / runEnds.length;
      const kills = runEnds.reduce((s, e) => s + ((e.d && e.d.kills) || 0), 0) / runEnds.length;
      console.log('平均时长: ' + fmtDur(dur) + ' · 平均击杀: ' + Math.round(kills));
    }
    console.log('');

    console.log('---- 升级 / 商店 ----');
    const lvOpen = by('levelup_open');
    const lvPick = by('levelup_pick');
    const skipped = lvPick.filter(e => e.d && e.d.kind === 'skip').length;
    console.log('升级出现: ' + lvOpen.length + ' · 选卡: ' + lvPick.length + ' · 跳过: ' + skipped + '（' + pct(skipped, lvPick.length) + '）');
    const kinds = {};
    for (const e of lvPick) { const k = (e.d && e.d.kind) || '?'; kinds[k] = (kinds[k] || 0) + 1; }
    console.log('选卡类型: ' + (Object.keys(kinds).length ? Object.entries(kinds).map(([k, v]) => k + '×' + v).join('，') : '无'));
    const shopOpen = by('shop_open');
    const buys = by('shop_buy');
    console.log('进店: ' + shopOpen.length + ' · 购买: ' + buys.length + ' · 刷新: ' + count('shop_reroll')
      + ' · 平均每店购买 ' + (shopOpen.length ? (buys.length / shopOpen.length).toFixed(1) : '0'));
    const top = {};
    for (const b of buys) { const id = (b.d && b.d.id) || '?'; top[id] = (top[id] || 0) + 1; }
    console.log('常买: ' + (Object.keys(top).length ? Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + '×' + v).join('，') : '无'));
    console.log('');

    const errors = by('js_error').concat(by('js_rejection'));
    console.log('---- 异常 ----');
    console.log('JS 报错/拒绝: ' + errors.length);
    for (const e of errors.slice(0, 5)) console.log('  · ' + ((e.d && e.d.msg) || '').slice(0, 160));
    console.log('');
  }

  if (runs.length) {
    console.log('---- 对局（Telemetry） ----');
    const byChar = {};
    for (const r of runs) {
      const k = (r.charId || '?') + '/' + (r.difficulty || '?');
      const o = byChar[k] || (byChar[k] = { n: 0, waves: 0, kills: 0, sec: 0, clear: 0 });
      o.n++; o.waves += r.deathWave || 0; o.kills += r.kills || 0; o.sec += r.durSec || 0;
      if (r.end === 'clear') o.clear++;
    }
    for (const [k, o] of Object.entries(byChar)) {
      console.log(k + ': ' + o.n + ' 局 · 平均到第 ' + (o.waves / o.n).toFixed(1) + ' 波 · 通关 ' + o.clear
        + ' · 平均击杀 ' + Math.round(o.kills / o.n) + ' · 平均 ' + fmtDur(o.sec / o.n));
    }
  }
  console.log('');
  console.log('提示：事件日志看"玩家点了什么"，Telemetry 看"局内发生了什么"；两者时间戳可对齐分析。');
}

main();
