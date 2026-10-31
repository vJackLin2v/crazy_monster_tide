
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\game\SkillCalc.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""  const b = SKILLS[skillId], m = moduleDef(mid);
  if (!b || !m) return false;
  return m.requires.some(t => (b.tags as Tag[]).includes(t));""",
"""  const b = SKILLS[skillId], m = moduleDef(mid);
  if (!b || !m) return false;
  // requires 为空 = 命中触发/受击触发类，任何能造成伤害的技能都可以装（设计 v7 修订）
  if (!m.requires || m.requires.length === 0) return true;
  return m.requires.some(t => (b.tags as Tag[]).includes(t));""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('isCompatible:', 'requires.length === 0' in s)
