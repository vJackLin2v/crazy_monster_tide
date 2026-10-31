
import io, re
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# ---------- #9 去梗改名：模块 ----------
p = root + r'\data\Modules.ts'
s = io.open(p, encoding='utf-8').read()
ren = {
 "name: '加量'": "name: '多重射击'",
 "name: '扇射'": "name: '散射'",
 "name: '裂开'": "name: '分裂'",
 "name: '反弹'": "name: '弹射'",
 "name: '穿透'": "name: '穿透'",
 "name: '转圈圈'": "name: '环绕弹'",
 "name: '巨大'": "name: '增大'",
 "name: '起飞'": "name: '冷却缩减'",
 "name: '复读机'": "name: '重复施放'",
 "name: '上火'": "name: '灼烧'",
 "name: '冷静'": "name: '减速'",
 "name: '吸血'": "name: '吸血'",
 "name: '传染'": "name: '连锁'",
 "name: '点名'": "name: '狙击'",
 "name: '割韭菜'": "name: '击杀回血'",
 "name: '渡劫'": "name: '落雷'",
 "name: '刺猬'": "name: '反伤'",
 "name: '超载'": "name: '强化伤害'",
}
for a, b in ren.items():
    s = s.replace(a, b)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('modules renamed')

# ---------- #9 去梗改名：道具 ----------
p2 = root + r'\data\Items.ts'
it = io.open(p2, encoding='utf-8').read()
ren2 = {
 "name: '背水'": "name: '低血强化'",
 "name: '贪欲之心'": "name: '金币转攻击'",
 "name: '精打细算'": "name: '刷新省钱'",
 "name: '血契'": "name: '攻击强化（代价生命）'",
 "name: '余烬刻印'": "name: '灼烧增伤'",
 "name: '碎冰'": "name: '破冰增伤'",
 "name: '回响电弧'": "name: '落雷追加'",
 "name: '专注核心'": "name: '少技能强化'",
 "name: '共鸣器'": "name: '模块共鸣'",
 "name: '荆棘外衣'": "name: '受击反伤'",
}
for a, b in ren2.items():
    it = it.replace(a, b)
io.open(p2, 'w', encoding='utf-8', newline='').write(it)
print('items renamed')

# ---------- #7 去掉"合成规则"说明条 ----------
p3 = root + r'\ui\MenuScreens.ts'
m = io.open(p3, encoding='utf-8').read()
m = re.sub(r"\n\s*// P2-B：合成规则从.{0,40}?\n", "\n", m, count=1)
m = re.sub(r"\n\s*text\(bar, 0, 1, '合成规则：3 个同名黑科技[^']*'[^;]*;\n", "\n", m, count=1)
io.open(p3, 'w', encoding='utf-8', newline='').write(m)
print('rule bar removed:', '合成规则' not in m)

# ---------- #6 模块名去重：显示"基础名 + Ⅱ"，不再重复 ----------
p4 = root + r'\ui\ManageScreens.ts'
mg = io.open(p4, encoding='utf-8').read()
mg = mg.replace("(mod.name + (mod.merged ? 'Ⅱ' : '')).slice(0, 5)",
                "(mod.name.replace(/\\s*[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/, '') + (mod.merged ? ' Ⅱ' : '')).slice(0, 7)")
mg = mg.replace("(m.name + (m.merged ? 'Ⅱ' : '')).slice(0, 5)",
                "(m.name.replace(/\\s*[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/, '') + (m.merged ? ' Ⅱ' : '')).slice(0, 7)")
# 合成区文案去掉"效果×2"的规则说明
mg = mg.replace("text(box, -158, mergeTitleY, '合成：3 个同名 → 1 个 II（效果 ×2，只占 1 槽）',",
                "text(box, -158, mergeTitleY, '合成区（3 个同名 → 1 个更强版）',")
io.open(p4, 'w', encoding='utf-8', newline='').write(mg)
print('manage names:', 'replace(/\\s*[' in mg)

# ---------- #8 特殊道具：没有数值时回退显示 desc ----------
p5 = root + r'\GameRoot.ts'
g = io.open(p5, encoding='utf-8').read()
g = g.replace("nums: it ? itemNumbers(it, r.id) : '',",
              "nums: it ? (itemNumbers(it, r.id) || it.desc) : '',", 1)
g = g.replace("nums: it ? itemNumbers(it, id) : '',",
              "nums: it ? (itemNumbers(it, id) || it.desc) : '',", 1)
io.open(p5, 'w', encoding='utf-8', newline='').write(g)
print('desc fallback:', g.count('|| it.desc'))
