# 疯狂怪潮 · AI 修复提示词（可直接复制给编码 Agent）

> 用法：整段复制给 Agent，它会按批次执行、每批改完停下等确认。  
> 只想修某一批时，复制「全局约束」+ 该批次小节即可。  
> 来源：`reports/full_audit_and_fix_plan_20261102.md`（详细取证与备选方案在该文档）。



---

## 全局约束（每个批次都必须遵守）

```
你是 Cocos Creator 3.8.6 + TypeScript 项目的编码 Agent，项目根目录：
H:\AI-game\crazy_monster_tide

开工前必读（只读一次，不要反复读）：
1. memory-bank/rules.md        —— 项目硬规则，优先级高于本提示词
2. memory-bank/tasks.md        —— 当前进度与已完成项

硬规则（违反即返工）：
- 禁止 npm install / yarn install。
- 禁止向 C 盘写入任何文件。
- 禁止用 shell（cat/echo/sed/awk）重写含中文的源码；改代码必须用 edit / write 工具，
  或用 python 且显式 encoding='utf-8'。
- 单次读取不超过 3 个文件。
- 一次只做一个批次。改完立刻停下，等我确认后再做下一批。
- 不要顺手重构、不要改代码风格、不要动与本批次无关的文件。
- 不要为了让测试通过而修改 tests/ 里的期望值（唯一例外：批次 4 的数值调整，
  且必须在汇报里逐条列出改了哪几个期望值、原值→新值）。
- 修完必须跑验收命令，并把真实输出贴进汇报。禁止"应该可以/理论上没问题"。

汇报格式固定四段：
完成 / 验证 / 未完成 / 下一步
（验证段必须带命令 + 输出摘要；未完成段如实写没做的部分）

环境（直接用，不要重新安装）：
- tsx:      node /h/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs <file>
- playwright 环境变量:
  PLAYWRIGHT_BROWSERS_PATH='C:/Users/LIN/AppData/Local/ms-playwright'
  NODE_PATH=/h/AI-game/pixel_roguelike_wechat_agent_kit/node_modules
- 静态服务: node tools/ui/serve.cjs   （监听 8123，UI 审计依赖它）
- UI 审计脚本必须先关性能面板：cc.debug.setDisplayStats(false)

基线（改动前先跑一次确认起点）：
- tests/run.ts = 586 PASS / 0 FAIL
- tsc -p tsconfig.check.json = 0
- tsc -p tsconfig.ui-check.json = 0

如果发现提示词里描述的代码与磁盘上的实际代码不一致：
不要猜、不要自行发挥。停下来，把实际代码片段贴出来，告诉我差异，等我决定。
```

---

## 批次 1（P0 · 内存泄漏，必须先做）

```
任务：修 3 个节点泄漏。全部是"节点创建了没人销毁"，不涉及玩法逻辑，风险低。

────────────────────────────────
【1-A】BUG-01 主菜单 DEBUG「数据」按钮无限累积
文件：cocos/assets/scripts/GameRoot.ts

现状（第 376-379 行，在 showMenu() 末尾）：
    if (DEBUG) {
      const dbgBtn = button(this.uiRoot, SCREEN_W / 2 - 40, SCREEN_H / 2 - 30, 64, 28, '数据', { size: 10 });
      onTap(dbgBtn.node, () => this.showTelemetry());
    }

根因：这个按钮直接挂在常驻节点 this.uiRoot 上，而 clearScreen()（第 286 行）
只销毁 this.cur 和 this.hud，所以每进一次菜单就多一个按钮，永不回收。
实测连续进出三次菜单后 uiRoot 下有 3 个 btn[数据]。

要求：
1. 在 class 字段区（靠近其它 private 字段）新增：
     private dbgBtn: Node | null = null;
2. 把上面那段改成"存在则复用，不存在才创建"：
     if (DEBUG) {
       if (!this.dbgBtn || !this.dbgBtn.isValid) {
         const b = button(this.uiRoot, SCREEN_W / 2 - 40, SCREEN_H / 2 - 30, 64, 28, '数据', { size: 10 });
         onTap(b.node, () => this.showTelemetry());
         this.dbgBtn = b.node;
       }
       this.dbgBtn.setSiblingIndex(this.uiRoot.children.length - 1);
     }
   注意 button() 返回 { node, label, setEnabled }，所以缓存的是 b.node。

验收：
- 连续进出菜单（菜单→设置→返回）× 5 次，uiRoot 下 name='btn' 且带「数据」文字的节点数恒为 1。
- tsc 两套 = 0。

────────────────────────────────
【1-B】BUG-02 换技能后蓄力指示圈永久残留
文件：cocos/assets/scripts/battle/Battle.ts

现状（第 489-496 行）：
    clearSkillRuntime(slot: number): void {
      delete this.castCount[slot];
      delete this.orbits[slot];
      delete this.charges[slot];
      this.skillT[slot] = 0;
      this.cdTotal[slot] = 0;
    }

根因：chargeFx 是 Record<number, Node>（第 298 行声明），蓄力时创建并挂在 layerPlayer
上（第 1190-1199 行），唯一销毁点在 resolveCharge()（第 1987-1988 行）。
这里把 charges[slot] 删了 → updateNewSkillTypes 的 for...in 再也遍历不到这个槽位
→ resolveCharge 永不执行 → 节点永久留在画面上。
实测：换技能后 charging=false，但 chargeFx[slot] 仍在、isValid=true、节点还在树里。

要求：改成下面这样（保留原有五行，插入三行销毁逻辑）：
    clearSkillRuntime(slot: number): void {
      delete this.castCount[slot];
      delete this.orbits[slot];
      delete this.charges[slot];
      // ★ chargeFx 是节点，必须和 charges 一起销毁，否则换技能后圈永久残留
      const fx = this.chargeFx[slot];
      if (fx && fx.isValid) fx.destroy();
      delete this.chargeFx[slot];
      this.skillT[slot] = 0;
      this.cdTotal[slot] = 0;
    }

验收：
- 蓄力中调用 clearSkillRuntime(slot)，layerPlayer 下 name='chargeFx' 的节点数 = 0。
- 手动路径：蓄能脉冲蓄力中打开构筑面板换技能 → 角色身上圈立即消失。

────────────────────────────────
【1-C】BUG-03 开新局 / 读档后蓄力圈残留（同一根因的另一条路径）
文件：cocos/assets/scripts/battle/Battle.ts

现状（第 536-542 行，resetRunState() 内）：
    // ⚠️ A2：这四个是纯数据状态，不带 node，旧实现漏清 → 新一局出现幽灵地雷/哨兵/蓄能/环刃
    this.traps = [];
    this.sentries = [];
    this.charges = {};
    this.orbits = {};
    this.castCount = {};
    this.echoQueue = [];

根因：注释说"这四个不带 node"是对的，但 chargeFx 是第五个状态且带 node，被整体漏掉了，
既没 destroy 也没重置这个 Record。layerPlayer 在 resetRunState 里不会被销毁，
所以节点会跨局残留。

要求：在 this.orbits = {}; 之后插入：
    // ★ chargeFx 带 node，与上面几个"纯数据"不同，必须单独销毁并重置
    for (const k in this.chargeFx) {
      const n = this.chargeFx[Number(k)];
      if (n && n.isValid) n.destroy();
    }
    this.chargeFx = {};

注意 for...in 的 key 是 string，取值要 Number(k)。

验收：
- 蓄力中直接调用 G.battle.resetRunState()，layerPlayer 下 chargeFx 子节点数 = 0。
- 连续开 5 局，chargeFx 节点数恒为 0。

────────────────────────────────
批次 1 完成后统一验收：
1. npx tsc -p tsconfig.check.json          → 0 错误
2. npx tsc -p tsconfig.ui-check.json       → 0 错误
3. node <tsx> tests/run.ts                 → 586 PASS / 0 FAIL
4. 汇报里说明三处改动的实际行号（可能因插入而位移）
```

---

## 批次 2（P1 · 视觉与文案，玩家可见）

```
任务：4 个 UI/文案问题。都是小改动，但必须逐个截图验证。

────────────────────────────────
【2-A】BUG-04 结算页残留调试水印与"导出日志"按钮
文件：cocos/assets/scripts/GameRoot.ts，第 1470-1477 行

现状：
      // 真机调试：一键复制本局日志（放在标题牌左侧，构建失败不阻断结算）
      const vs2 = view.getVisibleSize();
      // 构建标记：用来确认玩家跑的是哪个包
      text(this.cur, vs2.width / 2 - 76, vs2.height / 2 - 16, '阶段3 收尾版',
        { size: 8, color: new Color(150, 160, 180, 255), width: 140, align: 'right', outline: false });
      const chip = panel(this.cur, 58 - vs2.width / 2, vs2.height / 2 - (safeTop() + 56), 88, 26, { art: 'btn' });
      text(chip, 0, 0, '导出日志', { size: 10, color: new Color(240, 236, 226, 255), width: 84, bold: true, outline: true });
      onTap(chip, () => this.copyRunLogs());

根因：开发期临时加的，没被 if (DEBUG) 包住，正式包也会显示，玩家可见。

要求：整段删除这 8 行（含两行注释和 const vs2）。
      copyRunLogs() 方法本身必须保留 —— 它还被 showTelemetry() 调试页使用。
      删除后如果 view / safeTop 在本函数内不再使用，不要删它们的 import
      （整个 GameRoot 其它地方还在用），只删这一段。

验收：
- 结算页截图：无水印、无「导出日志」按钮。
- 调试页（设置里的「数据」入口）仍能正常导出日志。
- tsc 无"未使用变量 vs2"告警。

────────────────────────────────
【2-B】BUG-05 构建面板技能标签露英文
文件：cocos/assets/scripts/GameRoot.ts，第 1766 行起的 TAG_CN

现状：形态组只有 projectile/area/pulse/chain/melee/beam/burst，
      缺 orbit、trap、summon、charge 四个，导致面板显示「物理 · orbit · 近战」。
      tagText() 里用 TAG_CN[t] ?? t 兜底，缺词会静默退化成英文，不报错。

要求：在形态组补四个，措辞与技能中文名对齐：
      orbit: '环身', trap: '陷阱', summon: '召唤', charge: '蓄能',
      放在 burst: '爆发' 之后、特性组注释之前。

验收：
- 构筑面板里环刃 / 地雷阵 / 哨戒哨兵 / 蓄能脉冲 四行标签全中文。
- 截图对比 reports/text_fit/tags-check.png 的位置。
- tsc 两套 = 0。

────────────────────────────────
【2-C】BUG-06 升级三选一卡片数值行纵向裁切
文件：cocos/assets/scripts/ui/Modals.ts，第 121 行

现状：
      const nLines = Math.max(1, Math.ceil(c.nums.length / charsPerLine(txtW, 14)));
      const h = nLines * 19;

根因：UIKit.text() 第 176 行显式设了 l.lineHeight = Math.round(size * 1.5)，
      14px 字行高 21px；但这里按 19px 算高度，Label 的 overflow 是 CLAMP
      → 上下各切 1px，共 2px。360×640 视口必现（该视口 CH 取到下限 92）。

要求：只改这一行：
      const h = nLines * Math.round(14 * 1.5);
      （不要顺手改 UIKit 的 lineHeight，那会影响全项目所有文字）

布局安全性（已核算，可直接用）：CH 最小 92 时 numsY = -10，
两行 h=42 占 [-31, +11]，卡片半高 46，底部余量 15px，不溢出。

验收：
- 重跑 UI 审计：合计问题 0 条（改动前是 2 条）。
- 360×640 截图：「+2 发 · 每发 55% 伤害」两行完整，"害"字下半截不再缺。
- 390×844 / 412×915 不出现新的溢出。

────────────────────────────────
【2-D】BUG-07 HUD 空技能槽占位符渲染成方框
文件：cocos/assets/scripts/ui/Hud.ts，第 191 行

现状：
      const plus = text(box, 0, 1, '＋', { size: 22, color: COL.dash, width: 44, outline: false });
      （注意是全角加号 U+FF0B）

根因：项目像素字体子集里没有全角＋字形，Label fallback 渲染成 ▯▯▯。

要求：把 '＋' 换成 ASCII 半角 '+'（U+002B），其余参数不动。
      不要改成图形绘制（那是另一个方案，改动面更大）。

验收：
- HUD 空槽显示「+」。
- 检查两种状态：4 个槽全空、以及部分技能部分空。
- 三视口截图各一张。

────────────────────────────────
批次 2 完成后统一验收：
1. 起静态服务 node tools/ui/serve.cjs
2. 重跑 node tools/ui/audit_text_fit.cjs → 期望 "合计问题 0 条"
3. 结算页 / 构筑面板 / HUD / 升级页 各截一张图，路径写进汇报
4. tsc 两套 = 0；tests/run.ts = 586 PASS
```

---

## 批次 3（P1 · 规则问题，装得上但没效果）

```
任务：修 3 处"假选项"。这批会影响玩家构筑体验，改完要重跑组合审计。

────────────────────────────────
【3-A】CNT-01 环刃 × 急速 无效
文件：cocos/assets/scripts/game/SkillCalc.ts 第 8 行

现状：
      ring_blade: ['orbit', 'giant', 'rapid', 'burn', 'frost', 'vamp', 'harvest'],

根因：环刃是持续存在的环带，转速在 Battle.ts:1911 硬编码 1.4 圈/秒：
        o.rot += dt * 1.4 * Math.PI * 2;
      而 calcSkill 里 rapid 只作用于 cd（第 126-127 行）。cd 对环刃只影响"重新召唤"
      的间隔，不影响持续伤害 → 装急速几乎零收益。
      而设计文档 docs/design/skill_expansion_design.md 写的是"1.4 圈/秒（受 rapid 加成）"，
      文档与实现不一致。

要求（采用"摘掉选项"方案，不要改玩法）：
1. SkillCalc.ts:8 去掉 'rapid'：
      ring_blade: ['orbit', 'giant', 'burn', 'frost', 'vamp', 'harvest'],
2. docs/design/skill_expansion_design.md 里把环刃转速那行改成：
      | 转速 | 1.4 圈/秒（固定） |

不要走"给 SkillRuntime 加 rapid 字段"的方案 —— 那要动公共接口和存档，超范围。

验收：
- 构筑面板给环刃装模块时，列表里不出现「急速」。
- tests/run.ts 586 PASS（若有白名单断言用例会失败，把失败信息贴出来，不要自行改期望值）。

────────────────────────────────
【3-B】CNT-02 地雷阵 × 增大 无效
文件：cocos/assets/scripts/battle/Battle.ts 第 2004 行（explodeTrap 内）

现状：
      if (Math.hypot(e.x - tr.x, e.y - tr.y) <= 48) this.hitEnemy(...);
      半径 48 硬编码，从不读 rt.size。

根因：白名单 SkillCalc.ts:9 放行了 'giant'，但这里根本不看 size。
      白名单文件自己的注释就写着"否会出现装得上但没效果"。

要求（让增大真的生效）：
1. 在循环外先算半径：
      const radius = Math.max(48, tr.rt.size);
   用 Math.max 而不是直接 tr.rt.size，是因为地雷基础 size=44，
   直接替换会让裸装半径从 48 掉到 44（隐性削弱）。
2. 判定改为：
      if (Math.hypot(e.x - tr.x, e.y - tr.y) <= radius) this.hitEnemy(...);
3. 同函数第一行的特效缩放同步改，否则"范围变大了但爆炸看起来还是那么小"：
      this.addVfx(FX.killBig, tr.x, tr.y, 0.45, 2.2 * (radius / 48));

地雷的踩雷触发半径 16（Battle.ts:1929 附近）保持不动 —— 只扩大爆炸范围。

验收：
- 裸装引爆：效果与改动前一致（半径 48）。
- 装 1 层增大：能打到明显更远的敌人（半径约 70），爆炸特效同步变大。

────────────────────────────────
【3-C】CNT-03 连锁闪电 × 增大 / × 重复施放 无效
文件：cocos/assets/scripts/battle/Battle.ts 第 1104-1124 行
     + cocos/assets/scripts/game/SkillRules.ts

现状（chain 分支）：
      if (def.type === 'chain') {
        if (!tgt) return;
        let cur = tgt; const hit = new Set<Enemy>([cur]);
        this.spawnBolt(this.px, this.py, cur.x, cur.y);
        this.hitEnemy(cur, rt.dmg, rt, art.hit);
        for (let j = 0; j < 2 + rt.bounce + rt.chain; j++) {
          const from = cur;
          const nx = this.nearestEnemy(from.x, from.y, 140, hit);
          ...
        }
        return;
      }

根因：整段没读 rt.size，也没有 queueEcho。对比同文件的 trap / charge / projectile
      分支都有 if (!this.echoReplay) this.queueEcho(slot, ...)。

要求：
1. SkillRules.ts 新增（必须与现有 mineEchoRepeats / chargeEchoRepeats 完全同风格，
   它们都在第 36-46 行，内部调用已有的 echoRepeats 辅助函数）：
      /** 连锁闪电：重复施放最多 1 次（与地雷/蓄能一致） */
      export function chainEchoRepeats(echoStacks: number): number {
        return echoStacks > 0 ? Math.min(1, echoRepeats(echoStacks)) : 0;
      }
   写完先 grep 确认 echoRepeats 的可见性（是否需 export/同文件），按实际情况调整。

2. Battle.ts chain 分支改三处：
   a) 循环前算跳跃半径（"增大"让链跳更远）。def 是 SKILLS[sk.id]（第 1098 行），
      已有 size 字段，直接用 def.size，不要写 SKILLS[def.id]（SkillDef 没有 id）：
        const jumpR = 140 * (1 + (rt.size - def.size) / 100);
   b) nearestEnemy 的 140 换成 jumpR
   c) return 之前补：
        if (!this.echoReplay) this.queueEcho(slot, chainEchoRepeats(rt.echo));

3. SKILLS 在第 30 行已 import，不需要新增 import。

验收：
- 装「重复施放」：一次施放看到两轮闪电。
- 装「增大」：两只相距 130~180 的怪能链到（改动前链不到）。
- 重跑组合审计 tools/audit_combo.ts，连锁闪电最强 DPS 应从 27.7 上升到 40 左右。
  如果没变化，说明 queueEcho 没生效，停下来报告。

────────────────────────────────
批次 3 完成后统一验收：
1. node <tsx> tools/audit_combo.ts
   → "空转清单" 里不应再出现这 3 条
   → 记录连锁闪电、地雷阵、环刃的 DPS 变化
2. node <tsx> tests/run.ts → 586 PASS
3. tsc 两套 = 0
```



---

## 批次 4（数值 · 只改霜爆，单变量）

```
任务：只调一个数字，观察一轮，不要顺手动 fan / echo。

────────────────────────────────
【4-A】BAL-01 霜爆单体 DPS 过低
文件：cocos/assets/scripts/data/Skills.ts 第 28 行

现状：
      frostnova: { name: '霜爆', ..., cd: 3.6, dmg: 7, spd: 0, ..., size: 34, ... }

数据：单体口径 DPS = 7 / 3.6 ≈ 1.9，是所有技能里最低的。
      次低是灵能箭 8.0，最强裸装乱杀 27.2 → 相差 14 倍。
      霜爆是唯一的 pulse 技能，在 BOSS 战（单体）里几乎零输出。

要求：dmg 7 → 12（cd 保持 3.6）。
      不动其它任何字段，不要动 fan / echo / 乱杀 / 陨石。

理由：→ 单体 3.3 DPS，仍低于次低；多目标时靠命中数叠加成为强力清群手段。
      一次只调一个变量，避免无法归因。

验收：
1. node <tsx> tools/audit_combo.ts
   → 霜爆裸装 DPS 应从 1.9 变为约 3.3，最强组合从 5.4 变为约 9.3
   → 最强/中位比值应从 4.08× 下降到约 3.9×
2. node <tsx> tests/run.ts → 若有数值断言失败，逐条列出 原值→新值 再改期望值
3. 汇报里贴出改动前后的 DPS 对照表

注意：如果 tests 里有硬编码 7 这个伤害值的用例，改期望值时必须在汇报里
      单独列一节"测试期望值变更清单"，写清楚每个用例为什么变。
```

---

## 批次 5（性能 · 先做低风险两项）

```
任务：只做两个低风险优化。网格化改造（PERF-01）单独一批，本批不要碰。

────────────────────────────────
【5-A】PERF-03 HUD 每帧拼接签名字符串 → 节流到 20Hz
文件：cocos/assets/scripts/ui/Hud.ts，sync() 开头（第 220 行附近）

现状：每帧拼接含 toFixed(2) 的长签名字符串做脏检查（约 200-400 字节/帧），
      60fps → 每秒 12-24KB 垃圾。脏检查逻辑本身是对的，不要删。

要求：在 sync(dt) 最前面加节流（dt 参数已存在，若签名不同按实际调整）：
      this.syncT = (this.syncT ?? 0) + dt;
      if (this.syncT < 0.05) return;
      this.syncT = 0;
   并在 class 字段区加：
      private syncT = 0;

      注意：不要加在 lastSig 比较之后，要加在最前面，否则字符串照样每帧拼。

验收：
- CD 进度条、血条、经验条视觉无差异（20Hz 肉眼看不出）。
- 压测 60s，节点数与堆内存与改动前一致。
- tsc 两套 = 0。

────────────────────────────────
【5-B】PERF-02 每颗子弹一个 Set → 对象池
文件：cocos/assets/scripts/battle/Battle.ts

现状（第 1275 行，spawnBullet 内）：
      hit: new Set(),

要求：
1. 字段区加：
      private hitSetPool: Set<Enemy>[] = [];
2. spawnBullet 里改成：
      const hitSet = this.hitSetPool.pop() ?? new Set<Enemy>();
      hitSet.clear();
      // 然后把对象的 hit: new Set() 换成 hit: hitSet,
3. 找到子弹回收处（bullets 里被移除/销毁的分支），加：
      if (this.hitSetPool.length < 64) { b.hit.clear(); this.hitSetPool.push(b.hit); }

关键：回收入池前必须 clear()，否则下一颗子弹会继承上一颗的命中表 → 打不中同一个敌人。
这是最容易出的 bug，改完必须专门测。

验收：
- 同一敌人被同一颗子弹重复命中？不应该发生（穿甲弹除外）。
- 打一整波，伤害数字总和与改动前同一 seed 下一致。
- 压测 60s：节点数 122→351 振荡、堆 87MB 恒定（与基线一致）。
- tests/run.ts 586 PASS。

────────────────────────────────
批次 5 完成后统一验收：
1. node .tmp/probe_soak2.cjs → 贴出 12 行采样，对比基线
2. tsc 两套 = 0；tests/run.ts = 586 PASS
3. 不要在本批改动 updateBullets 的循环结构
```

---

## 批次 6（工程收尾）

```
【6-A】BUG-08 Math.min 单参数笔误（两处）
文件：cocos/assets/scripts/battle/Battle.ts

第 1527 行：this.waveDmgDealt += Math.min(dmg);
第 2240 行：this.waveDmgDealt += Math.min(dot);

Math.min 只传一个参数时等于直接返回该值，功能上没错，但会误导读者以为有上限保护。
要求：去掉 Math.min(...)，改成 += dmg / += dot。

验收：tsc = 0；打一波怪，结算页"本波伤害"与改动前一致。

────────────────────────────────
【6-B】FS.xs 11px → 12px（微信规范辅助文本下限）
文件：cocos/assets/scripts/ui/Tokens.ts

现状：FS = { xs: 11, ... }，11px 低于微信小程序规范 12px 下限。

要求：xs: 11 → 12。改完必须重跑 UI 审计，确认没有因为变大而新增裁切。
      如果有新增问题，先报告，不要自行调整布局。

验收：node tools/ui/audit_text_fit.cjs → 仍是 0 条。

────────────────────────────────
【6-C】把 UI 审计接进回归清单
文件：memory-bank/tasks.md（追加一节，不覆盖历史）

要求：把下面四条命令写进"每批必跑"清单：
      npx tsc -p tsconfig.check.json
      npx tsc -p tsconfig.ui-check.json
      node <tsx> tests/run.ts
      node tools/ui/audit_text_fit.cjs   （期望 0 条）
不要真的去改 CI 配置，本项目没有 CI。
```

---

## 给 Agent 的收尾要求

```
全部批次做完后，在 memory-bank/tasks.md 顶部更新"当前任务"：
- 完成：逐条列出实际改动的 file:line 与修复编号
- 验证：贴四条验收命令的真实输出
- 未完成：如实列出没做的（例如 PERF-01 网格化、真机确认）
- 下一步：建议

并在 .workbuddy/memory/YYYY-MM-DD.md 追加当天记录（append，不要覆盖）。

禁止在没跑验收命令的情况下声称完成。
```
