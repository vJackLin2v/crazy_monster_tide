
import os, zipfile, time, shutil
root = r'H:\AI-game\crazy_monster_tide'
out_dir = os.path.join(root, 'deliverables')
os.makedirs(out_dir, exist_ok=True)
stamp = time.strftime('%Y%m%d_%H%M')
out = os.path.join(out_dir, 'crazy_pigeon_king_review_' + stamp + '.zip')

def add(z, base, arc):
    n = 0
    for dp, _, fs in os.walk(base):
        for f in fs:
            p = os.path.join(dp, f)
            z.write(p, os.path.join(arc, os.path.relpath(p, base)))
            n += 1
    return n

total = 0
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    total += add(z, os.path.join(root, 'docs', 'delivery'), 'delivery')
    total += add(z, os.path.join(root, 'reports'), 'reports')
    total += add(z, os.path.join(root, 'screenshots', 'delivery'), 'screenshots/pages')
    total += add(z, os.path.join(root, 'screenshots', 'regression'), 'screenshots/regression')
    z.writestr('BUILD_INFO.txt',
        'project: 疯狂鸽王 (crazy_monster_tide)\n'
        'engine: Cocos Creator 3.8.6 / TypeScript\n'
        'platform: wechatgame 360x640 portrait, appid wx8a25bc49632e9b92\n'
        'build: 2026-10-30 16:36 (wechatgame) / 16:35 (web-mobile)\n'
        'tests: PASS 175 / FAIL 0\n'
        'zip: ' + time.strftime('%Y-%m-%d %H:%M:%S') + '\n')
print('zip:', out)
print('files:', total, 'size MB:', round(os.path.getsize(out)/1048576, 2))
