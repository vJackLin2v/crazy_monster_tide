
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("      text(this.cur, vs2.width / 2 - 76, vs2.height / 2 - 16, BUILD_TAG.slice(0, 16),",
              "      text(this.cur, vs2.width / 2 - 76, vs2.height / 2 - 16, 'build 12:00',", 1)
s = s.replace("      const chip = panel(this.cur, 0, -vs2.height / 2 + safeBottom() + 118, 336, 34, { art: 'btn' });",
              "      const chip = panel(this.cur, 0, -vs2.height / 2 + safeTop() + 118, 336, 34, { art: 'btn' });", 1)
s = s.replace("import { safeTop, safeBottom } from './ui/Safe';", "import { safeTop } from './ui/Safe';", 1)
s = s.replace("import { BUILD_TAG } from './core/BuildTag';\n", "", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('simplified:', 'build 12:00' in s, 'safeBottom' in s)
