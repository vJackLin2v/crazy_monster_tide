
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()
old = """        return Array.from(counts.entries()).map(([id, count]) => ({
          name: ITEMS[id] ? ITEMS[id].name : id, icon: ITEM_ICON[id], count,
        }));"""
new = """        return Array.from(counts.entries()).map(([id, count]) => ({
          name: ITEMS[id] ? ITEMS[id].name : id, icon: ITEM_ICON[id], count,
          // 商店里点道具要能看说明：数值能算就显示数值，算不出就退回描述
          desc: ITEMS[id] ? (itemNumbers(ITEMS[id], id) || ITEMS[id].desc) : '',
        }));"""
if old in s:
    s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('desc passed')
else:
    print('owned map anchor miss')
