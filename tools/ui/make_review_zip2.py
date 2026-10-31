
import io, os, zipfile, time, glob
root = r'H:\AI-game\crazy_monster_tide'

p = os.path.join(root, 'START_PROMPT.md')
s = io.open(p, encoding='utf-8').read()
s = s.replace('进度到 **M27**。', '进度到 **阶段3（内容扩展 + 难度系统）**；设计→实现对照见 docs/implementation_status.md。')
s = s.replace('**63 PASS / 0 FAIL**', '**264 PASS / 0 FAIL**')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('prompt updated:', '264 PASS' in s)

out_dir = os.path.join(root, 'deliverables')
os.makedirs(out_dir, exist_ok=True)
for old in glob.glob(os.path.join(out_dir, 'crazy_pigeon_king_review*.zip')):
    os.remove(old)
out = os.path.join(out_dir, 'crazy_pigeon_king_review_' + time.strftime('%Y%m%d_%H%M') + '.zip')

pairs = []
d1 = os.path.join(root, 'docs', 'design')
for f in sorted(os.listdir(d1)):
    if f.endswith('.md'):
        pairs.append(('docs/design', f))
pairs += [('docs', 'implementation_status.md'), ('memory-bank', 'HANDOFF.md')]
d2 = os.path.join(root, 'reports')
for f in sorted(os.listdir(d2)):
    if f.endswith('.md'):
        pairs.append(('reports', f))
for f in ['19-difficulty-v2.png', '20-result-v2.png', '21-result-12items.png', '22-install.png', '23-shop.png']:
    pairs.append(('screenshots', f))

n = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for d, f in pairs:
        fp = os.path.join(root, d, f)
        if os.path.exists(fp):
            z.write(fp, d + '/' + f); n += 1
    z.writestr('README.txt',
        '疯狂鸽王 阶段3 交付审核包\n'
        'date: ' + time.strftime('%Y-%m-%d %H:%M') + '\n'
        '内容：docs/design 22 篇 + implementation_status + HANDOFF + reports 7 篇 + 截图 5 张\n'
        '审核重点：docs/implementation_status.md（做了什么/偏了什么）、design/FINAL_DESIGN_DECISIONS.md、design/doc_conflict_check.md\n'
        '代码状态：264 单测全绿，微信包 3.06MB/10.89MB\n')
print('zip:', out)
print('files:', n, 'KB:', round(os.path.getsize(out)/1024, 1))
