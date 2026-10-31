/**
 * 难度选择页（设计 v6 · difficulty_ui_spec.md）
 *
 * 布局（360×640，S=28 / B=10）：
 *   标题 S+52、副标题 S+82
 *   5 行难度：S+118 起，视觉 40 高，pitch 44，**点击热区 44x44**
 *   详情面板 370~506（由 rules[] 生成文案）
 *   主按钮 520~568、返回 576~620
 */
import { Node, Label, LabelOutline, view } from 'cc';
import { panel, text, title, button, onTap, mkNode, screen, screenHeader } from './UIKit';
import { COL } from './Tokens';
import { safeTop, safeBottom } from './Safe';
import { DIFFICULTIES, type DifficultyConfig, type DifficultyId, type DifficultyRule } from '../data/Difficulties';

function at(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

/** 规则 → 玩家能看懂的一句话（同时用于详情面板与锁定提示） */
export function ruleText(r: DifficultyRule): string {
  switch (r.kind) {
    case 'noEliteUntilWave': return '前 ' + r.wave + ' 波不出现精英';
    case 'lowHpHealBonus': return '生命低于 ' + r.thresholdPct + '% 时回血更快';
    case 'shopGuaranteeOffense': return '商店必出 ' + r.count + ' 件攻击向道具';
    case 'eliteAffixFromWave': return '第 ' + r.wave + ' 波起精英有 ' + Math.round(r.chance * 100) + '% 概率带词缀';
    case 'eliteAlwaysAffixFromWave': return '第 ' + r.wave + ' 波起精英必带 ' + r.count + ' 个词缀';
    case 'noHealInShop': return '商店不再出售治疗道具';
    case 'rerollLimitPerWave': return '每波最多刷新 ' + r.count + ' 次';
    case 'bossSummon': return 'BOSS 会在 ' + r.thresholds.join('% / ') + '% 生命时召唤小怪（同时最多 ' + r.maxAlive + ' 只）';
    case 'lockCostPerLock': return '每次锁定商品花费 ' + r.gold + ' 金币';
    case 'eliteGuaranteedWaves': return '第 ' + r.waves.join('/') + ' 波保底出现精英';
    case 'bossEnrage': return 'BOSS 生命低于 ' + r.thresholdPct + '% 时狂怒（伤害/移速提升）';
    default: return '';
  }
}

/** 倍率 → 一句话（只列不为 1 的项） */
function multLines(c: DifficultyConfig): string[] {
  const out: string[] = [];
  if (c.enemyHpMul !== 1) out.push('怪物生命 ' + (c.enemyHpMul > 1 ? '+' : '') + Math.round((c.enemyHpMul - 1) * 100) + '%');
  if (c.enemyDmgMul !== 1) out.push('怪物伤害 ' + (c.enemyDmgMul > 1 ? '+' : '') + Math.round((c.enemyDmgMul - 1) * 100) + '%');
  if (c.shopPriceMul !== 1) out.push('商店价格 ' + (c.shopPriceMul > 1 ? '+' : '') + Math.round((c.shopPriceMul - 1) * 100) + '%');
  if (c.startHpMul !== 1) out.push('初始生命 ' + Math.round(c.startHpMul * 100) + '%');
  if (c.goldMul !== 1) out.push('金币 ' + Math.round(c.goldMul * 100) + '%');
  return out;
}

export function buildDifficultySelect(
  parent: Node,
  unlocked: DifficultyId[],
  selected: DifficultyId,
  onBack: () => void,
  onConfirm: (id: DifficultyId) => void,
): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-difficulty', COL.bg1);
  screenHeader(root, VW, S, '选择难度', 58);

  let cur: DifficultyId = unlocked.indexOf(selected) >= 0 ? selected : 'normal';
  let warn = '';

  // ── 5 行难度 ──
  const ROW_W = 336, ROW_H = 40, PITCH = 44, TOP = S + 118;
  const rows: { id: DifficultyId; box: Node; label: Label; lock: Label; stars?: Label }[] = [];
  const detailHost = mkNode(root, 'diffDetail', ROW_W, 136, A(180, 370 + 68).x, A(180, 370 + 68).y);
  const warnLabel = text(root, A(180, 512).x, A(180, 512).y, '', { size: 10, color: COL.red, width: 320, outline: false });

  function renderDetail(): void {
    for (const c of detailHost.children.slice()) c.destroy();
    const c = DIFFICULTIES.find(d => d.id === cur) ?? DIFFICULTIES[1];
    panel(detailHost, 0, 0, ROW_W, 136, { art: 'panel_soft' });
    // D4：内容整体垂直居中，避免标题与奖励之间大片留白
    const lines: string[] = [...multLines(c), ...c.rules.map(ruleText)].filter(Boolean).slice(0, 4);
    const blockH = 20 + lines.length * 18 + 10 + 12;
    const top = blockH / 2;
    const titleY = top - 10;
    const firstLineY = titleY - 22;
    const rewardY = firstLineY - Math.max(0, lines.length - 1) * 18 - 16;
    text(detailHost, -ROW_W / 2 + 12, titleY, c.name + ' · ' + c.tagline,
      { size: 12, color: COL.accent, align: 'left', width: ROW_W - 24, bold: true, outline: true });
    lines.forEach((ln, i) => {
      text(detailHost, -ROW_W / 2 + 12, firstLineY - i * 18, '· ' + ln,
        { size: 10, color: COL.cream, align: 'left', width: ROW_W - 24, outline: false });
    });
    text(detailHost, -ROW_W / 2 + 12, rewardY, c.reward ? ('通关奖励：' + c.reward) : '通关奖励：无',
      { size: 10, color: COL.dim, align: 'left', width: ROW_W - 24, outline: false });
  }

  function paint(): void {
    for (const r of rows) {
      const isSel = r.id === cur;
      const isLocked = unlocked.indexOf(r.id) < 0;
      paintPanelBox(r.box, isSel);
      r.label.color = isLocked ? COL.dim2 : (isSel ? COL.ink : COL.cream);
      // 选中时底色是橙的：去掉黑描边，否则字会糊成一团（截图确认过）
      const ol = r.label.node.getComponent(LabelOutline);
      if (ol) ol.enabled = !isSel && !isLocked;
      r.lock.node.active = isLocked;
      if (r.stars) r.stars.node.active = !isLocked;
    }
    warnLabel.string = warn;
    renderDetail();
  }

  function paintPanelBox(box: Node, sel: boolean): void {
    // 只用 UIKit 的 panel 重绘（保持像素风格一致）
    const kids = box.children.slice();
    for (const k of kids) if (k.name === 'bg') k.destroy();
    const bg = panel(box, 0, 0, ROW_W, ROW_H, { art: sel ? 'btn_primary' : 'btn' });
    bg.name = 'bg';
    bg.setSiblingIndex(0);
  }

  DIFFICULTIES.forEach((c, i) => {
    const y = TOP + i * PITCH;
    const p = A(180, y + ROW_H / 2);
    const box = mkNode(root, 'diffRow', ROW_W, ROW_H, p.x, p.y);
    const label = text(box, -ROW_W / 2 + 14, 1, c.name, { size: 14, color: COL.cream, align: 'left', width: 120, bold: true, outline: true });
    const stars = text(box, ROW_W / 2 - 14, 1, '★'.repeat(c.stars) + '☆'.repeat(5 - c.stars),
      { size: 11, color: COL.accent, align: 'right', width: 120, outline: false });
    const lock = text(box, ROW_W / 2 - 14, 1, '未解锁', { size: 10, color: COL.dim2, align: 'right', width: 120, outline: false });
    lock.node.active = false;
    rows.push({ id: c.id, box, label, lock, stars });
    // 热区 44 高（视觉 40），覆盖行间 4px 空隙
    const hit = mkNode(root, 'diffHit', ROW_W, 44, p.x, p.y);
    (hit as unknown as { __hit?: boolean }).__hit = true;
    onTap(hit, () => {
      if (unlocked.indexOf(c.id) < 0) {
        warn = '通关「' + (c.unlock.type === 'win' ? nameOf(c.unlock.difficulty) : '前置难度') + '」后解锁';
        paint();
        return;
      }
      cur = c.id;
      warn = '';
      paint();
    });
  });

  const confirm = button(root, 0, A(180, 520 + 24).y, 336, 48, '确认并选择角色', { primary: true, size: 16 });
  onTap(confirm.node, () => onConfirm(cur));
  const back = button(root, 0, A(180, 576 + 22).y, 336, 44, '返回', { size: 14 });
  onTap(back.node, onBack);

  paint();
  return root;
}

function nameOf(id: DifficultyId): string {
  const c = DIFFICULTIES.find(d => d.id === id);
  return c ? c.name : id;
}
