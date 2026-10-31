# -*- coding: utf-8 -*-
import json, io
d = json.load(io.open('tools/review_data.json', encoding='utf-8'))
L = []
L.append('### 技能（%d）' % len(d['skills'])); L.append('')
L.append('| id | 名称 | 类型 | 冷却 | 伤害 | 标签 | 描述 |')
L.append('|---|---|---|---|---|---|---|')
for s in d['skills']:
    L.append('| %s | %s | %s | %ss | %s | %s | %s |' % (s['id'], s['name'], s['type'], s['cd'], s['dmg'], '/'.join(s['tags']), s['desc']))
L += ['', '### 黑科技（%d）' % len(d['modules']), '']
L.append('| id | 名称 | 叠加 | 数值 | 兼容要求 | 描述 |')
L.append('|---|---|---|---|---|---|')
for m in d['modules']:
    L.append('| %s | %s | %s ×%s | %s | %s | %s |' % (m['id'], m['name'], m['stack'], m['max'], m.get('nums') or '-', ' / '.join(m['requires']) or '任意', m['desc']))
L += ['', '### 道具（%d）' % len(d['items']), '']
L.append('| id | 名称 | 稀有度 | 效果 |')
L.append('|---|---|---|---|')
for it in d['items']:
    L.append('| %s | %s | T%s | %s |' % (it['id'], it['name'], it['tier'], it['desc']))
L += ['', '### 难度', '']
L.append('| 难度 | 星级 | 敌人HP | 敌人伤害 | 刷怪 | 精英率 | BOSS HP | 初始生命 | 金币 | 经验 | 商店价格 | 刷新 | 回血预算 |')
L.append('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for x in d['diffs']:
    L.append('| %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (
        x['name'], x['stars'], x['hp'], x['dmg'], x['spawn'], x['elite'], x['bossHp'], x['startHp'],
        x['gold'], x['exp'], x['price'], x['reroll'], '默认8' if x['healBudget'] is None else x['healBudget']))
L += ['', '规则：' + json.dumps([{'name': x['name'], 'rules': x['rules'], 'unlock': x['unlock'], 'reward': x['reward']} for x in d['diffs']], ensure_ascii=False, indent=1)]
L += ['', '### 全局数值', '', '    ' + json.dumps({'balance': d['balance'], 'run': d['run'], 'waveTime1': d['waveTime1'], 'waveTime20': d['waveTime20'], 'bossWaves': d['bossWaves']}, ensure_ascii=False, indent=1)]
io.open('docs/review/gpt_review_tables_2026-10-31.md', 'w', encoding='utf-8').write('\n'.join(L))
print('ok', len(L))
