
import io
p = r'H:\AI-game\crazy_monster_tide\tools\ui\shot_install.cjs'
s = io.open(p, encoding='utf-8').read()
s = s.replace("rs.modsBag = ['multi', 'multi', 'multi', 'giant', 'rapid_2', 'burn', 'frost'];",
              "rs.modsBag = ['multi', 'multi', 'multi', 'giant', 'rapid_2', 'burn', 'frost', 'chain', 'snipe', 'thunder', 'vamp', 'harvest'];")
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('12 mods')
