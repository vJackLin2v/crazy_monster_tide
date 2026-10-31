
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\tests\run.ts'
s = io.open(p, encoding='utf-8').read()
add = """  ok(canInstall({ id: 'blade', lvl: 1, mods: [] } as never, 'thunder').ok === true, '回旋刃可以装渡劫（命中触发类不再要求标签）');
  ok(canInstall({ id: 'poison', lvl: 1, mods: [] } as never, 'vamp').ok === true, '毒雾可以装吸血');
  ok(canInstall({ id: 'fireball', lvl: 1, mods: [] } as never, 'harvest').ok === true, '火球可以装割韭菜');
  ok(canInstall({ id: 'poison', lvl: 1, mods: [] } as never, 'multi').ok === false, '毒雾不能装加量（无弹体）');
"""
anchor = "  ok(canInstall(cp, 'overload').ok === true && canInstall(cp, 'multi').ok === false, '蓄能可装 overload、不能装 multi');"
if anchor in s and '回旋刃可以装渡劫' not in s:
    s = s.replace(anchor, anchor + "\n" + add, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('tests added')
