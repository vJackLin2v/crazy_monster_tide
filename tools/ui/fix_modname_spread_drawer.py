
import io, re
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# 1) modName：去掉基础名里已有的罗马数字，避免"加量 Ⅱ Ⅱ"
p = root + r'\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    const d = moduleDef(id);
    const base = d ? d.name : baseOf(id);""",
"""    const d = moduleDef(id);
    // ⚠️ 有的模块名本身已带等级后缀（加量 Ⅱ），再拼一次会变成"加量 Ⅱ Ⅱ"（用户反馈）
    const raw = d ? d.name : baseOf(id);
    const base = raw.replace(/\s*[\u2160-\u216B\u2170-\u217B]+$/, '');""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('modName fixed:', 'u2160' in s)

# 2) 加量：弹体间距 0.06 -> 0.30 弧度（约 17°），两个刀刃能看出是两次释放
p2 = root + r'\battle\Battle.ts'
b = io.open(p2, encoding='utf-8').read()
b = b.replace("      const baseSpread = baseShots > 1 ? 0.06 : 0;",
              "      // 用户反馈：两份刀刃几乎重叠，看不出打了两发 → 间距调到 ~17°\n      const baseSpread = baseShots > 1 ? 0.30 : 0;", 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(b)
print('spread:', '0.30 : 0' in b)

# 3) 黑科技抽屉：列表底部再上移，避免被按钮挡住
p3 = root + r'\ui\Modals.ts'
m = io.open(p3, encoding='utf-8').read()
m = m.replace("const VIEW_BOTTOM = -VH / 2 + 150;", "const VIEW_BOTTOM = -VH / 2 + 196;", 1)
io.open(p3, 'w', encoding='utf-8', newline='').write(m)
print('drawer bottom:', '-VH / 2 + 196' in m)

# 4) 命中触发类模块：不再要求技能标签（只要能命中就能装）
p4 = root + r'\data\Modules.ts'
mo = io.open(p4, encoding='utf-8').read()
changes = [
  (r"burn:     \{ name: '上火', icon: '✹', stack: 'tier',     max: 3, requires: \['fire','lightning','holy'\],",
   "burn:     { name: '上火', icon: '✹', stack: 'tier',     max: 3, requires: [],  // 命中触发：任何能造成伤害的技能都可装"),
  (r"frost:    \{ name: '冷静', icon: '✽', stack: 'tier',     max: 3, requires: \['ice'\],",
   "frost:    { name: '冷静', icon: '✽', stack: 'tier',     max: 3, requires: [],  // 命中触发"),
  (r"vamp:     \{ name: '吸血', icon: '♥', stack: 'unique',   max: 3, requires: \['physical','poison'\],",
   "vamp:     { name: '吸血', icon: '♥', stack: 'unique',   max: 3, requires: [],  // 命中触发"),
  (r"thunder:  \{ name: '渡劫', icon: '⚡', stack: 'tier',     max: 3, requires: \['lightning','arcane','holy'\],",
   "thunder:  { name: '渡劫', icon: '⚡', stack: 'tier',     max: 3, requires: [],  // 命中触发：回旋刃也能落雷（用户指出原规则不合理）"),
  (r"harvest:  \{ name: '割韭菜', icon: '✂', stack: 'unique',   max: 3, requires: \['physical','fire','poison'\],",
   "harvest:  { name: '割韭菜', icon: '✂', stack: 'unique',   max: 3, requires: [],  // 击杀触发"),
  (r"thornmail: \{ name: '刺猬', icon: '✜', stack: 'unique',   max: 3, requires: \['nature','physical'\],",
   "thornmail: { name: '刺猬', icon: '✜', stack: 'unique',   max: 3, requires: [],  // 受击触发"),
]
miss = []
for pat, rep in changes:
    m2 = re.sub(pat, rep, mo)
    if m2 == mo: miss.append(pat[:24])
    mo = m2
io.open(p4, 'w', encoding='utf-8', newline='').write(mo)
print('modules relaxed, miss=', miss)
