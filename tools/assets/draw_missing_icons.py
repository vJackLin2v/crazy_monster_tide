# -*- coding: utf-8 -*-
"""补画 4 个缺失图标（32×32，纯代码绘制，本工程自有）。

产物（cocos/assets/resources/art/icons/）：
    ui-magnifier.png      放大镜     —— 道具「放大镜」area_s
    ui-magnet.png         吸铁石     —— 道具「吸铁石」pickup_s
    ui-magnet-core.png    磁力核心   —— 道具「磁力核心」pickup_l
    ui-thunder-core.png   雷暴核心   —— 道具「雷暴核心」cdr_bolt

画法：PIL 基本图形 + 1px 深色描边 + 固定色板，无抗锯齿（像素图）。
"""
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
                   'cocos/assets/resources/art/icons')
S = 32

C = {
    'line': (20, 18, 28, 255),
    'gold': (232, 184, 74, 255),
    'gold_l': (248, 226, 150, 255),
    'steel': (106, 168, 216, 255),
    'steel_d': (44, 78, 110, 255),
    'lens': (176, 220, 244, 255),
    'white': (244, 240, 224, 255),
    'red': (200, 64, 64, 255),
    'red_d': (132, 36, 36, 255),
    'brown': (140, 92, 50, 255),
    'yellow': (248, 216, 80, 255),
    'orange': (232, 144, 48, 255),
    'clear': (0, 0, 0, 0),
}


def canvas():
    return Image.new('RGBA', (S, S), C['clear'])


def circ(d, cx, cy, r, color):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)


def ring(d, cx, cy, r, w, color):
    circ(d, cx, cy, r, color)
    circ(d, cx, cy, r - w, C['clear'])


def magnifier():
    img = canvas()
    d = ImageDraw.Draw(img)
    # 手柄（先画，镜片压在上面）
    d.line([(18, 19), (27, 27)], fill=C['line'], width=6)
    d.line([(18, 19), (27, 27)], fill=C['brown'], width=3)
    d.line([(26, 26), (27, 27)], fill=C['gold'], width=3)
    # 镜框
    ring(d, 12, 12, 10, 3, C['line'])
    ring(d, 12, 12, 9, 3, C['gold'])
    ring(d, 12, 12, 7, 2, C['line'])
    circ(d, 12, 12, 6, C['lens'])
    circ(d, 12, 12, 4, C['steel'])
    circ(d, 12, 12, 2, C['steel_d'])
    # 高光
    for x, y in ((8, 8), (9, 8), (8, 9), (10, 7)):
        d.point((x, y), fill=C['white'])
    return img


def magnet(core=False):
    img = canvas()
    d = ImageDraw.Draw(img)
    # U 形外壳（黑色描边）
    d.arc([4, 4, 28, 30], start=0, end=180, fill=C['line'], width=8)
    d.rectangle([4, 5, 12, 20], fill=C['line'])
    d.rectangle([20, 5, 28, 20], fill=C['line'])
    # 红色主体
    d.arc([6, 6, 26, 28], start=0, end=180, fill=C['red'], width=5)
    d.rectangle([7, 7, 11, 19], fill=C['red'])
    d.rectangle([21, 7, 25, 19], fill=C['red'])
    # 白色磁极
    d.rectangle([6, 6, 12, 10], fill=C['white'])
    d.rectangle([20, 6, 26, 10], fill=C['white'])
    d.rectangle([6, 9, 12, 10], fill=C['steel'])
    d.rectangle([20, 9, 26, 10], fill=C['steel'])
    if core:
        # 中间能量核
        circ(d, 16, 20, 5, C['line'])
        circ(d, 16, 20, 4, C['yellow'])
        circ(d, 16, 20, 2, C['white'])
        for x, y in ((16, 12), (11, 20), (21, 20), (16, 27)):
            d.point((x, y), fill=C['yellow'])
    return img


def thunder_core():
    img = canvas()
    d = ImageDraw.Draw(img)
    circ(d, 16, 16, 12, C['line'])
    circ(d, 16, 16, 11, C['steel_d'])
    circ(d, 16, 16, 9, C['orange'])
    circ(d, 16, 16, 7, C['yellow'])
    # 闪电
    bolt = [(17, 8), (12, 17), (16, 17), (13, 25), (21, 15), (17, 15), (20, 8)]
    d.polygon(bolt, fill=C['white'])
    d.line([(17, 8), (12, 17), (16, 17), (13, 25)], fill=C['line'], width=1)
    # 外侧电弧
    for x, y in ((3, 9), (2, 13), (4, 22), (28, 10), (29, 15), (27, 22)):
        d.point((x, y), fill=C['yellow'])
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, im in (('ui-magnifier', magnifier()),
                     ('ui-magnet', magnet(False)),
                     ('ui-magnet-core', magnet(True)),
                     ('ui-thunder-core', thunder_core())):
        im.save(os.path.join(OUT, name + '.png'))
        print('wrote', name + '.png')


if __name__ == '__main__':
    main()
