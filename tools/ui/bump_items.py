
import io
p = r'H:\AI-game\crazy_monster_tide\tools\ui\shot_shop.cjs'
s = io.open(p, encoding='utf-8').read()
s = s.replace("rs.items = ['power_s','power_s','haste_s','maxhp_s','crit_s','armor_s','speed_s','greed_s','lifesteal_s'].map(id => ({ id }));",
"rs.items = ['power_s','power_s','haste_s','maxhp_s','crit_s','armor_s','speed_s','greed_s','lifesteal_s','pierce_s','bounce_s','count_s','regen_s','killheal_s','knock_s','invuln_s','area_s','projspd_s','size_s','dodge_s'].map(id => ({ id }));")
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('20 items')
