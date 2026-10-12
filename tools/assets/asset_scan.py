#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""素材盘点扫描器（只读 PNG/音频头部，不加载像素数据，几秒可扫完上万文件）

用法:
    python tools/assets/asset_scan.py <目录> <输出目录> [--label 标签]

产出:
    <输出目录>/asset_index.csv    每文件一行：相对路径/类别/扩展名/字节/宽/高/色彩类型/是否有 alpha
    <输出目录>/asset_summary.json 汇总：按类别计数、尺寸分布、体积

设计原则:
    1. 只读头部（PIL 的 Image.open 不 load）—— 3,600 个文件 2 秒内完成。
    2. 不做任何"判断"，只出事实；能否使用由 docs/assets/asset_license.md 决定。
    3. 可复现：同一目录跑两次结果必须一致（排序固定）。
"""
import sys, os, csv, json, glob

def png_info(path):
    """读 PNG IHDR：宽/高/位深/色彩类型。色彩类型 6=RGBA, 4=GA, 2=RGB, 0=G, 3=调色板"""
    try:
        with open(path, 'rb') as f:
            head = f.read(33)
        if head[:8] != b'\x89PNG\r\n\x1a\n':
            return None
        w = int.from_bytes(head[16:20], 'big')
        h = int.from_bytes(head[20:24], 'big')
        depth = head[24]
        ctype = head[25]
        return {'w': w, 'h': h, 'depth': depth, 'ctype': ctype,
                'alpha': ctype in (4, 6) or (ctype == 3 and b'tRNS' in head)}
    except Exception:
        return None


def scan(root, outdir, label):
    rows = []
    root = os.path.abspath(root)
    if not os.path.isdir(root):
        print('目录不存在:', root, file=sys.stderr); return 1
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        for fn in sorted(filenames):
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, root).replace('\\', '/')
            parts = rel.split('/')
            # 类别 = 相对路径的前两级（如 approved/icons）
            cat = '/'.join(parts[:2]) if len(parts) > 2 else '/'.join(parts[:1])
            ext = os.path.splitext(fn)[1].lower()
            size = os.path.getsize(full)
            info = png_info(full) if ext == '.png' else None
            rows.append({
                'label': label, 'rel': rel, 'category': cat, 'ext': ext, 'bytes': size,
                'w': info['w'] if info else '', 'h': info['h'] if info else '',
                'ctype': info['ctype'] if info else '', 'alpha': info['alpha'] if info else ''
            })
    os.makedirs(outdir, exist_ok=True)
    csv_path = os.path.join(outdir, 'asset_index.csv')
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        wr = csv.DictWriter(f, fieldnames=['label','rel','category','ext','bytes','w','h','ctype','alpha'])
        wr.writeheader(); wr.writerows(rows)

    # 汇总
    by_cat, by_ext, by_size, by_alpha = {}, {}, {}, {}
    total_bytes = 0
    for r in rows:
        by_cat[r['category']] = by_cat.get(r['category'], 0) + 1
        by_ext[r['ext']] = by_ext.get(r['ext'], 0) + 1
        total_bytes += r['bytes']
        if r['w'] and r['h']:
            k = '%dx%d' % (r['w'], r['h'])
            by_size[k] = by_size.get(k, 0) + 1
        if r['alpha']:
            by_alpha['with_alpha'] = by_alpha.get('with_alpha', 0) + 1
    summary = {
        'label': label, 'root': root, 'files': len(rows),
        'bytes': total_bytes, 'mb': round(total_bytes/1048576, 2),
        'by_category': dict(sorted(by_cat.items())),
        'by_ext': dict(sorted(by_ext.items())),
        'top_sizes': dict(sorted(by_size.items(), key=lambda kv: -kv[1])[:20]),
        'alpha': by_alpha
    }
    with open(os.path.join(outdir, 'asset_summary.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print('扫描完成: %s' % root)
    print('  文件数 %d ｜ 体积 %.2f MB ｜ 类别 %d 种' % (len(rows), total_bytes/1048576, len(by_cat)))
    for k, v in summary['by_category'].items():
        print('    %-34s %5d' % (k, v))
    print('  输出: %s' % csv_path)
    return 0


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    a = sys.argv[1:]
    label = 'scan'
    if '--label' in a:
        i = a.index('--label'); label = a[i+1]; a = a[:i] + a[i+2:]
    sys.exit(scan(a[0], a[1], label))
