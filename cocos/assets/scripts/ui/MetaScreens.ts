/**
 * 元页面：设置 / 图鉴 / 成就
 *
 * 只读现有数据表与本地存档；不改任何玩法数值、不引入新素材。
 * 视觉沿用 UIKit 的九宫格（panel / slot / btn）+ screenHeader，与其它页面同一套规范。
 */
import { Node, Label, Color, Graphics, Sprite, UITransform, view, LabelOutline } from 'cc';
import { panel, text, title, button, onTap, mkNode, mask, screen, screenHeader, paintPanel } from './UIKit';
import { COL, FS, MIN_TAP } from './Tokens';
import { safeTop, safeBottom } from './Safe';
import type { SaveData } from '../game/Progress';
import { ACHIEVEMENTS, achViews, unlockedCount } from '../game/Achievements';
import { CHARS } from '../data/Chars';
import { SKILLS } from '../data/Skills';
import { ITEMS } from '../data/Items';
import { ITEM_ICON } from '../data/IconMap';
import { ENEMIES } from '../data/Enemies';
import { Assets, iconFrame, loadIcon } from '../engine/Assets';
import { listRuns, exportLogs } from '../game/Telemetry';
import { DEBUG } from 'cc/env';
import { applyFxPrefs } from '../game/Prefs';
import { writeSave } from '../engine/Save';

function at(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

/** 图标槽：有素材就放素材，没有就留空槽（不在 UI 里用 emoji 混排） */
function artSlot(parent: Node, x: number, y: number, size: number, art?: string): Node {
  const box = panel(parent, x, y, size, size, { art: 'slot' });
  if (!art) return box;
  const n = mkNode(box, 'icon', size - 10, size - 10);
  const sp = n.addComponent(Sprite);
  sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
  const f = iconFrame(art);
  if (f) sp.spriteFrame = f;
  else void loadIcon(art).then(() => { const g = iconFrame(art); if (g && sp.isValid) sp.spriteFrame = g; });
  return box;
}

/** 角色/怪物图：立绘优先，失败退 idle 首帧；整数倍缩放 */
function unitSlot(parent: Node, x: number, y: number, size: number, unit: string, preferPortrait: boolean): Node {
  const box = panel(parent, x, y, size, size, { art: 'slot' });
  const n = mkNode(box, 'p', size - 8, size - 8);
  const sp = n.addComponent(Sprite);
  sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
  const ut = n.getComponent(UITransform);
  const apply = (f: SpriteFrame | null) => {
    if (!f || !sp.isValid) return;
    sp.spriteFrame = f;
    const w = (f.rect && f.rect.width) || 32, h = (f.rect && f.rect.height) || 32;
    const k = Math.max(1, Math.floor(Math.min((size - 8) / h, (size - 8) / w)));
    if (ut) ut.setContentSize(w * k, h * k);
  };
  const loadUnit = () => void Assets.loadUnit(unit).then(c => apply((c.idle && c.idle[0]) || null)).catch(() => {});
  if (preferPortrait) {
    void Assets.loadPortrait(unit).then(f => { if (f) apply(f); else loadUnit(); }).catch(loadUnit);
  } else loadUnit();
  return box;
}

// ------------------------------------------------ 设置 ------------------------------------------------
export function buildSettings(parent: Node, s: SaveData, onToggle: (k: 'music' | 'sfx') => void,
                              onClose: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const root = mkNode(parent, 'scr-settings', VW, VH);
  mask(root, VW, VH);

  const W = 312, H = 452;
  const c = at(VW, VH, 180, VH / 2);
  const box = panel(root, c.x, c.y, W, H, { art: 'panel' });
  title(box, H / 2 - 30, '设置', { width: W - 40 });
  text(box, 0, H / 2 - 56, '音频开关会立刻生效并记住', { size: 10, color: COL.dim, width: W - 30, outline: false });

  const rows: { key: 'music' | 'sfx'; label: string; y: number }[] = [
    { key: 'music', label: '音乐', y: H / 2 - 96 },
    { key: 'sfx', label: '音效', y: H / 2 - 148 },
  ];
  rows.forEach((r) => {
    text(box, -W / 2 + 18, r.y, r.label,
      { size: 15, color: COL.cream, align: 'left', width: 120, bold: true, outline: true });
    // 状态用「颜色 + 文字」双通道：开=橙底深字「开」；关=深底浅字「关」
    const b = panel(box, W / 2 - 66, r.y, 96, 44, { art: s[r.key] ? 'btn_primary' : 'btn' });
    const l = text(b, 0, 1, s[r.key] ? '开' : '关',
      { size: 16, color: s[r.key] ? COL.ink : COL.dim, width: 88, bold: true, outline: !s[r.key] });
    const hit = mkNode(box, 'hit', 96, 44, W / 2 - 66, r.y);
    onTap(hit, () => {
      onToggle(r.key);                       // 由 GameRoot 改存档 + 调 Audio
      const on = s[r.key];
      paintPanel(b, 96, 44, { art: on ? 'btn_primary' : 'btn' });
      l.string = on ? '开' : '关';
      l.color = on ? COL.ink : COL.dim;
      const ol = l.node.getComponent(LabelOutline);
      if (ol) ol.enabled = !on;
    });
  });

  // ── 画面 / 无障碍（用户 #6，参考 Brotato 的 accessibility：降低闪烁与视觉杂乱）──
  text(box, 0, H / 2 - 186, '画面', { size: 10, color: COL.dim, width: W - 40, outline: false });
  const FX_LEVELS = [1, 0.75, 0.5, 0.25, 0];
  const fxRowY = H / 2 - 222;
  text(box, -W / 2 + 18, fxRowY, '特效透明度', { size: 15, color: COL.cream, align: 'left', width: 150, bold: true, outline: true });
  const fxVal = () => Math.round((s.fxAlpha ?? 1) * 100) + '%';
  const fxBtn = panel(box, W / 2 - 66, fxRowY, 96, 44, { art: (s.fxAlpha ?? 1) >= 0.99 ? 'btn_primary' : 'btn' });
  const fxLbl = text(fxBtn, 0, 1, fxVal(), { size: 14, color: (s.fxAlpha ?? 1) >= 0.99 ? COL.ink : COL.cream, width: 88, bold: true, outline: false });
  const fxHit = mkNode(box, 'hit', 96, 44, W / 2 - 66, fxRowY);
  onTap(fxHit, () => {
    const cur = s.fxAlpha ?? 1;
    const idx = FX_LEVELS.findIndex(v => Math.abs(v - cur) < 0.01);
    const next = FX_LEVELS[(idx + 1) % FX_LEVELS.length];
    s.fxAlpha = next;
    writeSave(s);
    applyFxPrefs(next, s.shakeOn, s.hurtOn);
    paintPanel(fxBtn, 96, 44, { art: next >= 0.99 ? 'btn_primary' : 'btn' });
    fxLbl.string = fxVal();
    fxLbl.color = next >= 0.99 ? COL.ink : COL.cream;
  });

  const toggles: { key: 'shakeOn' | 'hurtOn'; label: string; y: number }[] = [
    { key: 'shakeOn', label: '屏幕震动', y: H / 2 - 274 },
    { key: 'hurtOn', label: '受击红屏', y: H / 2 - 326 },
  ];
  toggles.forEach((r) => {
    text(box, -W / 2 + 18, r.y, r.label, { size: 15, color: COL.cream, align: 'left', width: 150, bold: true, outline: true });
    const b = panel(box, W / 2 - 66, r.y, 96, 44, { art: s[r.key] ? 'btn_primary' : 'btn' });
    const l = text(b, 0, 1, s[r.key] ? '开' : '关', { size: 16, color: s[r.key] ? COL.ink : COL.dim, width: 88, bold: true, outline: !s[r.key] });
    const hit = mkNode(box, 'hit', 96, 44, W / 2 - 66, r.y);
    onTap(hit, () => {
      s[r.key] = !s[r.key];
      writeSave(s);
      applyFxPrefs(s.fxAlpha, s.shakeOn, s.hurtOn);
      paintPanel(b, 96, 44, { art: s[r.key] ? 'btn_primary' : 'btn' });
      l.string = s[r.key] ? '开' : '关';
      l.color = s[r.key] ? COL.ink : COL.dim;
      const ol = l.node.getComponent(LabelOutline);
      if (ol) ol.enabled = !s[r.key];
    });
  });

  // 战斗日志导出只在调试构建里出现（用户 #6：上线要隐藏）
  if (DEBUG) {
    const runs = listRuns().length;
    text(box, 0, -H / 2 + 116, '战斗日志：已记录 ' + runs + ' 局（调试构建可见）',
      { size: 10, color: COL.dim, width: W - 24, outline: false });
    const exp = button(box, 0, -H / 2 + 82, 200, 40, '导出战斗日志', { size: 14 });
    onTap(exp.node, () => {
      const json = exportLogs();
      console.log('[Log] 导出 ' + runs + ' 局：\n' + json);
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) void navigator.clipboard.writeText(json);
      } catch { /* 剪贴板不可用就只打控制台 */ }
    });
  }

  const cl = button(box, 0, -H / 2 + 32, 200, 44, '关闭', { primary: true, size: 16 });
  onTap(cl.node, onClose);
  return root;
}

// ------------------------------------------------ 图鉴 ------------------------------------------------
interface CodexEntry { name: string; sub: string; art?: string; unit?: string; portrait?: boolean }

/** 敌人 id → 中文名（ENEMIES 里只有 unit 字段，没有显示名） */
const ENEMY_CN: Record<string, string> = {
  goblin: '哥布林', wolf: '野狼', eyebat: '眼球蝠', orc: '兽人', imp: '小恶魔',
  stingerbat: '刺蝠', hyena: '鬣狗', axolizard: '六角蜥', lizardhunter: '蜥蜴猎手',
  succubus: '魅魔', basilisk: '蛇怪', observer: '观察者', claweddemon: '爪魔',
  venommaw: '毒颚', cavebrute: '洞穴巨怪', gnollberserker: '豺狼狂战士', boss: '魔王',
};

const TABS: { key: string; label: string }[] = [
  { key: 'char', label: '角色' },
  { key: 'skill', label: '技能' },
  { key: 'item', label: '道具' },
  { key: 'enemy', label: '怪物' },
];

function codexData(tab: string): CodexEntry[] {
  if (tab === 'char') {
    return CHARS.map(c => ({
      name: c.name, sub: '初始技能：' + (SKILLS[c.start] ? SKILLS[c.start].name : c.start),
      unit: c.unit, portrait: true,
    }));
  }
  if (tab === 'skill') {
    return Object.keys(SKILLS).map((id) => {
      const d = SKILLS[id];
      return { name: d.name, sub: '伤害 ' + d.dmg + ' · 冷却 ' + d.cd.toFixed(2) + 's · ' + (d.desc || ''), art: d.icon };
    });
  }
  if (tab === 'item') {
    return Object.keys(ITEMS).map((id) => {
      const d = ITEMS[id];
      return { name: d.name, sub: d.desc, art: ITEM_ICON[id] };
    });
  }
  return Object.keys(ENEMIES).map((id) => {
    const d = ENEMIES[id];
    const tag = d.boss ? 'BOSS' : (d.elite ? '精英' : '');
    return {
      name: ENEMY_CN[id] ?? id,
      sub: 'HP ' + d.hp + ' · 速度 ' + d.spd + ' · 伤害 ' + d.dmg + (tag ? ' · ' + tag : ''),
      unit: d.unit,
    };
  });
}

export function buildCodex(parent: Node, onBack: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-codex', COL.bg1);

  screenHeader(root, VW, S, '图鉴', 58);

  const PER = 6;
  let tab = 0;
  let page = 0;

  // 四个页签
  const TAB_W = 78, TAB_GAP = 6, TAB_H = 34;
  const tabsW = TAB_W * 4 + TAB_GAP * 3;
  const tabY = S + 58 + 16 + TAB_H / 2;
  const tabNodes: { n: Node; l: Label; i: number }[] = [];
  TABS.forEach((t, i) => {
    const x = -tabsW / 2 + TAB_W / 2 + i * (TAB_W + TAB_GAP);
    const p = at2(180, tabY);
    const n = panel(root, p.x + x, p.y, TAB_W, TAB_H, { art: 'btn' });
    const l = text(n, 0, 1, t.label, { size: 12, color: COL.cream, width: TAB_W - 10, bold: true, outline: true });
    tabNodes.push({ n, l, i });
    const hit = mkNode(root, 'tabHit', TAB_W, MIN_TAP, p.x + x, p.y);
    onTap(hit, () => { tab = i; page = 0; refresh(); });
  });

  const listTop = tabY + TAB_H / 2 + 16;
  const ROW_H = 50, ROW_GAP = 6, ROW_W = 336;
  const rows: { node: Node; name: Label; sub: Label; iconBox: Node }[] = [];
  for (let i = 0; i < PER; i++) {
    const cy = listTop + ROW_H / 2 + i * (ROW_H + ROW_GAP);
    const c = at2(180, cy);
    const row = panel(root, c.x, c.y, ROW_W, ROW_H, { art: 'panel_soft' });
    const iconBox = mkNode(row, 'iconHost', 34, 34, -ROW_W / 2 + 8 + 17, 0);
    const nm = text(row, -ROW_W / 2 + 56, 9, '', { size: 13, color: COL.cream, align: 'left', width: 250, bold: true, outline: true });
    const sb = text(row, -ROW_W / 2 + 56, -10, '', { size: 10, color: COL.dim, align: 'left', width: 260, outline: false });
    rows.push({ node: row, name: nm, sub: sb, iconBox });
  }

  // 翻页 + 返回
  const pagerY = VH - B - 24 - 48 - 26;
  let pagerLabel: Label | null = null;
  const prevBtn = button(root, at2(12 + 44, pagerY).x, at2(12 + 44, pagerY).y, 88, 42, '‹ 上一页', { size: 12 });
  const nextBtn = button(root, at2(348 - 44, pagerY).x, at2(348 - 44, pagerY).y, 88, 42, '下一页 ›', { size: 12 });
  pagerLabel = text(root, 0, at2(180, pagerY).y, '', { size: 11, color: COL.dim, width: 100, outline: false });
  onTap(prevBtn.node, () => { page = Math.max(0, page - 1); refresh(); });
  onTap(nextBtn.node, () => { page = Math.min(pageCount() - 1, page + 1); refresh(); });
  const back = button(root, 0, -VH / 2 + B + 24, 336, 48, '返回', { size: FS.m });
  onTap(back.node, onBack);

  function pageCount(): number {
    return Math.max(1, Math.ceil(codexData(TABS[tab].key).length / PER));
  }

  function refresh(): void {
    tabNodes.forEach(t => {
      paintPanel(t.n, TAB_W, TAB_H, { art: t.i === tab ? 'btn_primary' : 'btn' });
      t.l.color = t.i === tab ? COL.ink : COL.cream;
      const ol = t.l.node.getComponent(LabelOutline);
      if (ol) ol.enabled = t.i !== tab;
    });
    const data = codexData(TABS[tab].key);
    const start = page * PER;
    rows.forEach((r, i) => {
      const e = data[start + i];
      r.node.active = !!e;
      if (!e) return;
      r.name.string = e.name;
      r.sub.string = e.sub.length > 26 ? e.sub.slice(0, 25) + '…' : e.sub;
      // 重建行内图标（数量固定 6 行，销毁旧节点即可）
      for (const ch of r.iconBox.children.slice()) ch.destroy();
      if (e.unit) unitSlot(r.iconBox, 0, 0, 34, e.unit, !!e.portrait);
      else artSlot(r.iconBox, 0, 0, 34, e.art);
    });
    if (pagerLabel) pagerLabel.string = (page + 1) + ' / ' + pageCount();
    // 只有一页时把翻页按钮压暗（禁用态），避免"点了没反应"
    const multi = pageCount() > 1;
    prevBtn.setEnabled(multi);
    nextBtn.setEnabled(multi);
  }

  refresh();
  return root;
}

// ------------------------------------------------ 成就 ------------------------------------------------
export function buildAchievements(parent: Node, s: SaveData, onBack: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-ach', COL.bg1);

  screenHeader(root, VW, S, '成就', 58);
  const got = unlockedCount(s);
  text(root, 0, at2(180, S + 58 + 20).y, '已解锁 ' + got + ' / ' + ACHIEVEMENTS.length,
    { size: 11, color: COL.dim, width: 320, outline: false });

  // P2-C：九行必须完整显示，且最后一行与「返回」至少留 12px（不引滚动容器）
  const top = S + 58 + 38;
  const ROW_W = 336;
  const listTop = top;
  const backTop = VH - B - 24 - 24;          // 返回按钮顶边（按钮高 48，中心在 B+24）
  const avail = backTop - 12 - listTop;      // 留 12px 视觉间距
  const n = ACHIEVEMENTS.length;
  const ROW_GAP = 5;
  const ROW_H = Math.max(38, Math.min(50, Math.floor((avail - (n - 1) * ROW_GAP) / n)));
  achViews(s).forEach((v, i) => {
    const cy = listTop + ROW_H / 2 + i * (ROW_H + ROW_GAP);
    const c = at2(180, cy);
    const row = panel(root, c.x, c.y, ROW_W, ROW_H, { art: v.done ? 'rim_gold' : 'panel_soft' });
    text(row, -ROW_W / 2 + 12, 8, v.def.name,
      { size: 13, color: v.done ? COL.accent : COL.cream, align: 'left', width: 200, bold: true, outline: true });
    text(row, -ROW_W / 2 + 12, -10, v.def.desc,
      { size: 10, color: COL.dim, align: 'left', width: 220, outline: false });
    // 右侧：进度 or 已解锁（文字 + 颜色双通道）
    if (v.done) {
      const b = panel(row, ROW_W / 2 - 40, 0, 60, 24, { art: 'btn_primary' });
      text(b, 0, 1, '已解锁', { size: 10, color: COL.ink, width: 56, bold: true, outline: false });
    } else {
      text(row, ROW_W / 2 - 10, 0, v.cur + ' / ' + v.def.target,
        { size: 11, color: COL.dim2, align: 'right', width: 72, bold: true, outline: false });
    }
  });

  const back = button(root, 0, -VH / 2 + B + 24, 336, 48, '返回', { size: FS.m });
  onTap(back.node, onBack);
  return root;
}
