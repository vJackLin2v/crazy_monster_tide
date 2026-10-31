
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("      text(chip, 0, 0, '复制日志', { size: 10, color: COL.cream, width: 84, bold: true, outline: true });",
              "      text(chip, 0, 0, '复制日志', { size: 10, color: new Color(240, 236, 226, 255), width: 84, bold: true, outline: true });", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('color literal:', 'new Color(240, 236, 226, 255)' in s)

# diag 脚本：打印所有 console 错误
p2 = r'H:\AI-game\crazy_monster_tide\tools\ui\diag_result.cjs'
d = io.open(p2, encoding='utf-8').read()
d = d.replace("page.on('console', m => { const t = m.text(); if (t.includes('GameRoot') || t.includes('日志')) logs.push(t.slice(0, 160)); });",
"page.on('console', m => { const t = m.text(); if (m.type() === 'error' || t.includes('GameRoot') || t.includes('日志')) logs.push('[' + m.type() + '] ' + t.slice(0, 160)); });")
io.open(p2, 'w', encoding='utf-8', newline='').write(d)
print('diag updated')
