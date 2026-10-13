# -*- coding: utf-8 -*-
"""
UI 排版静态检查 —— 解析 assets/scripts/ui/*.ts 里的坐标调用，
按嵌套关系算出绝对位置，报出超出 360x640 屏幕的节点。

为什么需要它：排版越界（文字出屏/按钮掉底）是 UI 最容易犯的错，
而打开编辑器验证一次很贵（编辑器只在启动时编译，每次都要重启）。
这个脚本能在**不重启**的情况下把这类问题一次找全。

用法： python tools/ui_layout_check.py
"""
import re, io, glob, os, sys

HW, HH = 180, 320          # 360x640 的半宽 / 半高
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

nodes = {}
ASSIGN = re.compile(r"const\s+(\w+)\s*=\s*(panel|button|bar|screen|mkNode)\s*\((.*?)\)\s*;", re.S)

def split_args(args):
    depth = 0; parts = []; cur = ''
    for ch in args:
        if ch in '([{': depth += 1
        elif ch in ')]}': depth -= 1
        if ch == ',' and depth == 0: parts.append(cur); cur = ''
        else: cur += ch
    parts.append(cur)
    return [p.strip() for p in parts]

for f in glob.glob('assets/scripts/ui/*.ts') + ['assets/scripts/GameRoot.ts']:
    for m in ASSIGN.finditer(io.open(f, encoding='utf-8').read()):
        var, kind, args = m.group(1), m.group(2), m.group(3)
        parts = split_args(args)
        parent = parts[0] if parts and re.match(r'^\w+$', parts[0]) else None
        ns = [int(p) for p in parts[1:] if re.match(r'^-?\d+$', p)]
        nodes[var] = (kind, parent, ns, f)

def absxy(v, seen=None):
    if seen is None: seen = set()
    if v in seen or v not in nodes: return None
    seen.add(v)
    kind, parent, ns, _f = nodes[v]
    if kind == 'screen': return (0, 0)
    if kind in ('panel', 'button', 'bar') and len(ns) >= 3: x, y = ns[0], ns[1]
    elif kind == 'mkNode' and len(ns) >= 4: x, y = ns[2], ns[3]
    else: return None
    p = absxy(parent) if parent else (0, 0)
    return None if p is None else (p[0] + x, p[1] + y)

def size_of(kind, ns):
    if kind == 'button' and len(ns) >= 4: return (ns[2], max(44, ns[3]))
    if len(ns) >= 4: return (ns[2], ns[3])
    return None

def main():
    bad = 0
    print('=== 容器节点 ===')
    for v, (kind, _p, ns, f) in sorted(nodes.items()):
        if kind not in ('panel', 'button', 'bar'): continue
        pos = absxy(v); sz = size_of(kind, ns)
        if not pos or not sz: continue
        l, r = pos[0] - sz[0] / 2, pos[0] + sz[0] / 2
        b, t = pos[1] - sz[1] / 2, pos[1] + sz[1] / 2
        if l < -HW - 1 or r > HW + 1 or b < -HH - 1 or t > HH + 1:
            bad += 1
            print('  [X] %-20s %-18s 左%.0f 右%.0f 下%.0f 上%.0f' % (os.path.basename(f), v, l, r, b, t))

    print('=== 文字节点（左/右对齐时 x 是边界，不是中心）===')
    TEXT = re.compile(r"text\(\s*(\w+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(.*?)\)\s*;", re.S)
    total = 0
    for f in glob.glob('assets/scripts/ui/*.ts') + ['assets/scripts/GameRoot.ts']:
        for m in TEXT.finditer(io.open(f, encoding='utf-8').read()):
            total += 1
            pv, x, y = m.group(1), int(m.group(2)), int(m.group(3))
            rest = m.group(4)
            wm = re.search(r"width:\s*(\d+)", rest)
            w = int(wm.group(1)) if wm else 300
            al = 'left' if "align: 'left'" in rest else ('right' if "align: 'right'" in rest else 'center')
            cx = x + w / 2 if al == 'left' else (x - w / 2 if al == 'right' else x)
            p = absxy(pv) or (0, 0)
            ax, ay = p[0] + cx, p[1] + y
            l, r = ax - w / 2, ax + w / 2
            if l < -HW - 1 or r > HW + 1 or ay < -HH - 1 or ay > HH + 1:
                bad += 1
                print('  [X] %-20s 绝对(%.0f,%.0f) 宽%d %s -> 左%.0f 右%.0f' % (os.path.basename(f), ax, ay, w, al, l, r))
    print('文字 %d 个' % total)
    print()
    print('越界合计: %d' % bad)
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main())
