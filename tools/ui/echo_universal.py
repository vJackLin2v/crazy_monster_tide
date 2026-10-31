
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\game\SkillCalc.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("  ring_blade: ['orbit', 'giant', 'rapid', 'burn', 'frost', 'vamp', 'chain', 'thunder', 'harvest', 'thornmail'],",
              "  ring_blade: ['orbit', 'giant', 'rapid', 'burn', 'frost', 'vamp', 'chain', 'thunder', 'harvest', 'thornmail', 'echo'],", 1)
s = s.replace("  sentry: ['multi', 'fan', 'split', 'bounce', 'pierce', 'giant', 'rapid', 'burn', 'frost', 'chain', 'snipe', 'harvest', 'thunder', 'vamp'],",
              "  sentry: ['multi', 'fan', 'split', 'bounce', 'pierce', 'giant', 'rapid', 'burn', 'frost', 'chain', 'snipe', 'harvest', 'thunder', 'vamp', 'echo'],", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('whitelist echo:', s.count("'echo'"))

p2 = r'H:\AI-game\crazy_monster_tide\cocos\tests\run.ts'
t = io.open(p2, encoding='utf-8').read()
add = """  ok(canInstall({ id: 'ring_blade', lvl: 1, mods: [] } as never, 'echo').ok === true, '环刃可以装复读机');
  ok(canInstall({ id: 'sentry', lvl: 1, mods: [] } as never, 'echo').ok === true, '哨兵可以装复读机');
  ok(canInstall({ id: 'blade', lvl: 1, mods: [] } as never, 'echo').ok === true, '回旋刃可以装复读机');
"""
anchor = "  ok(canInstall({ id: 'poison', lvl: 1, mods: [] } as never, 'multi').ok === false, '毒雾不能装加量（无弹体）');"
if anchor in t and '环刃可以装复读机' not in t:
    t = t.replace(anchor, anchor + "\n" + add, 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(t)
print('tests added')
