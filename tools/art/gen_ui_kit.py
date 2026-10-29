# -*- coding: utf-8 -*-
"""从 Kenney Pixel UI Pack（CC0）生成项目用的像素 UI 九宫格套件。

来源：https://kenney.nl/assets/pixel-ui-pack （CC0，License.txt 随原始包保存在
      assets/ui/third_party/kenney_pixel_ui_pack/License.txt）

做法：
  1. 读原始 48x48 的 9-Slice 素材（每张只有 3~4 种颜色：底 / 高光 / 暗边 / 角标）；
  2. 按"角色"把这几个颜色替换成项目暗色调色板（保留 1px 斜面与角标结构，不改像素形状）；
  3. 四周加 2px 近黑描边（与项目既有「纯黑描边」视觉语言一致），输出 52x52；
  4. 同时写 Cocos 的 .meta（type=texture, nearest 过滤），供运行时 Assets 直接载入；
  5. 生成 docs/ui-redesign/ui_kit_overview.png 总览（含 3 种尺寸的九宫格拉伸验证）。

用法： python tools/art/gen_ui_kit.py
"""
import os
import json
import uuid

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, 'assets', 'ui', 'third_party', 'kenney_pixel_ui_pack', '9-Slice')
OUT = os.path.join(ROOT, 'cocos', 'assets', 'resources', 'ui', 'kenney')
DOCS = os.path.join(ROOT, 'docs', 'ui-redesign')

BORDER = 2                       # 外描边像素
INSET = 10                       # 九宫格边距（含描边）
OUT_SIZE = 48 + BORDER * 2       # 52
BLACK = (6, 6, 10, 255)

# name, 源文件, 颜色映射 {源 RGB: 目标 RGB}
KIT = [
    ('panel', 'Ancient/white.png', {
        (229, 229, 229): (42, 42, 58),      # 底（比屏幕底亮一档，面板才"浮"得出来）
        (203, 203, 203): (23, 23, 33),      # 内侧暗边
        (233, 233, 233): (106, 106, 133),   # 外侧亮边
        (194, 194, 194): (62, 62, 82),      # 角标
    }),
    ('panel_soft', 'Ancient/white.png', {
        (229, 229, 229): (52, 52, 74),
        (203, 203, 203): (28, 28, 40),
        (233, 233, 233): (122, 122, 152),
        (194, 194, 194): (74, 74, 98),
    }),
    ('well', 'space.png', {
        (100, 134, 175): (22, 22, 30),
        (124, 173, 197): (12, 12, 17),
        (165, 202, 224): (58, 58, 78),
    }),
    ('slot', 'space.png', {
        (100, 134, 175): (32, 32, 44),
        (124, 173, 197): (17, 17, 24),
        (165, 202, 224): (74, 74, 96),
    }),
    ('btn', 'Colored/grey.png', {
        (238, 238, 238): (58, 58, 72),
        (255, 255, 255): (85, 85, 106),
        (213, 213, 213): (39, 39, 47),
        (170, 170, 170): (48, 48, 60),
    }),
    ('btn_pressed', 'Colored/grey_pressed.png', {
        (238, 238, 238): (46, 46, 58),
        (255, 255, 255): (58, 58, 72),
        (213, 213, 213): (32, 32, 40),
    }),
    ('btn_primary', 'Colored/yellow.png', {
        (255, 204, 0): (245, 166, 35),
        (255, 217, 72): (255, 203, 107),
        (205, 164, 0): (184, 121, 12),
        (168, 134, 0): (192, 128, 16),
    }),
    ('btn_primary_pressed', 'Colored/yellow_pressed.png', {
        (255, 204, 0): (219, 146, 21),
        (255, 217, 72): (240, 166, 42),
        (205, 164, 0): (154, 100, 10),
    }),
    ('btn_danger', 'Colored/red.png', {
        (232, 106, 23): (232, 69, 47),
        (250, 129, 50): (255, 112, 80),
        (205, 93, 18): (168, 32, 15),
        (170, 78, 17): (192, 51, 28),
    }),
    ('btn_danger_pressed', 'Colored/red_pressed.png', {
        (232, 106, 23): (198, 52, 34),
        (205, 93, 18): (146, 26, 12),
        (250, 129, 50): (222, 78, 56),
    }),
    ('btn_disabled', 'Colored/grey.png', {
        (238, 238, 238): (42, 42, 52),
        (255, 255, 255): (51, 51, 63),
        (213, 213, 213): (34, 34, 43),
        (170, 170, 170): (42, 42, 52),
    }),
    ('card_sel', 'Outline/yellow.png', {
        (238, 238, 238): (34, 40, 60),      # 选中卡底（偏蓝）
        (255, 204, 0): (70, 200, 216),      # 青色描边 = 当前选中
        (213, 213, 213): (21, 26, 38),
        (170, 170, 170): (46, 76, 88),
    }),
    ('card_gold', 'Outline/yellow.png', {
        (238, 238, 238): (42, 36, 24),      # 金色 = 稀有 / 重点
        (255, 204, 0): (255, 210, 74),
        (213, 213, 213): (26, 22, 14),
        (170, 170, 170): (74, 62, 30),
    }),
    # 稀有度 / 状态描边（全部来自同一张 Outline 素材，只换描边色，保证线宽一致）
    ('rim_blue', 'Outline/yellow.png', {
        (238, 238, 238): (27, 36, 54),
        (255, 204, 0): (90, 169, 255),
        (213, 213, 213): (18, 26, 40),
        (170, 170, 170): (42, 68, 96),
    }),
    ('rim_purple', 'Outline/yellow.png', {
        (238, 238, 238): (36, 27, 54),
        (255, 204, 0): (160, 107, 255),
        (213, 213, 213): (22, 15, 34),
        (170, 170, 170): (70, 48, 106),
    }),
    ('rim_green', 'Outline/yellow.png', {
        (238, 238, 238): (27, 42, 34),
        (255, 204, 0): (106, 216, 106),
        (213, 213, 213): (16, 26, 20),
        (170, 170, 170): (46, 82, 56),
    }),
    ('rim_red', 'Outline/yellow.png', {
        (238, 238, 238): (42, 24, 26),
        (255, 204, 0): (255, 90, 90),
        (213, 213, 213): (26, 14, 16),
        (170, 170, 170): (86, 40, 44),
    }),
    ('rim_cyan', 'Outline/yellow.png', {
        (238, 238, 238): (34, 40, 60),
        (255, 204, 0): (70, 200, 216),
        (213, 213, 213): (21, 26, 38),
        (170, 170, 170): (46, 76, 88),
    }),
    ('list_row', 'list.png', {
        (255, 255, 255): (27, 27, 36),
        (213, 213, 213): (16, 16, 24),
        (238, 238, 238): (38, 38, 54),
    }),
]


def recolor(im, mapping):
    im = im.convert('RGBA')
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            if c[3] == 0:
                continue
            t = mapping.get((c[0], c[1], c[2]))
            if t is None:
                # 未登记的杂色：按亮度就近映射，保证不会漏出原色
                lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
                src_lums = sorted(((0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2]), v)
                                  for k, v in mapping.items())
                t = min(src_lums, key=lambda p: abs(p[0] - lum))[1]
            px[x, y] = (t[0], t[1], t[2], c[3])
    return im


def frame(img):
    out = Image.new('RGBA', (OUT_SIZE, OUT_SIZE), BLACK)
    out.alpha_composite(img, (BORDER, BORDER))
    return out


def nine_slice(img, inset, w, h):
    """按九宫格把 img 画到 w x h，验证拉伸时四角不变形。"""
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    s = img.width
    cx = [0, inset, s - inset, s]
    dx = [0, inset, w - inset, w]
    for i in range(3):
        for j in range(3):
            sw, sh = cx[i + 1] - cx[i], cx[j + 1] - cx[j]
            dw, dh = dx[i + 1] - dx[i], dx[j + 1] - dx[j]
            if sw <= 0 or sh <= 0 or dw <= 0 or dh <= 0:
                continue
            part = img.crop((cx[i], cx[j], cx[i + 1], cx[j + 1]))
            if part.size != (dw, dh):
                part = part.resize((dw, dh), Image.NEAREST)
            out.alpha_composite(part, (dx[i], dx[j]))
    return out


def write_meta(path, name):
    """写 Cocos 的 <name>.png.meta。

    ⚠️ 文件必须叫 *.png.meta（Cocos 只认这个文件名），并且 **已存在就跳过**：
    UUID 一旦被编辑器写进 meta，就不能再改，否则引用会断。
    """
    meta_path = path + '.png.meta'
    if os.path.exists(meta_path):
        return
    uid = str(uuid.uuid5(uuid.NAMESPACE_URL, 'kenney-pixel-ui:' + name))
    sub = hashlib_id = uid[:5]
    meta = {
        "ver": "1.0.27",
        "importer": "image",
        "imported": True,
        "uuid": uid,
        "files": [".json", ".png"],
        "subMetas": {
            sub: {
                "importer": "texture",
                "uuid": uid + "@" + sub,
                "displayName": name,
                "id": sub,
                "name": "texture",
                "userData": {
                    "wrapModeS": "clamp",
                    "wrapModeT": "clamp",
                    "minfilter": "nearest",
                    "magfilter": "nearest",
                    "packable": False,
                    "mipfilter": "none",
                    "anisotropy": 0,
                    "isUuid": True,
                    "imageUuidOrDatabaseUri": uid,
                    "visible": False,
                },
                "ver": "1.0.22",
                "imported": True,
                "files": [".json"],
                "subMetas": {},
            }
        },
        "userData": {
            "type": "texture",
            "hasAlpha": True,
            "fixAlphaTransparencyArtifacts": False,
            "redirect": uid + "@" + sub,
        },
    }
    with open(meta_path, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write('\n')


def write_dir_meta(path, name):
    if os.path.exists(path + '.meta'):
        return
    uid = str(uuid.uuid5(uuid.NAMESPACE_URL, 'kenney-dir:' + name))
    meta = {
        "ver": "1.2.0", "importer": "directory", "imported": True, "uuid": uid,
        "files": [], "subMetas": {}, "userData": {},
    }
    with open(path + '.meta', 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
        f.write('\n')


def main():
    os.makedirs(OUT, exist_ok=True)
    write_dir_meta(os.path.dirname(OUT), 'ui')
    write_dir_meta(OUT, 'kenney')

    preview = []
    for name, rel, mapping in KIT:
        src = Image.open(os.path.join(SRC, rel))
        img = frame(recolor(src, mapping))
        img.save(os.path.join(OUT, name + '.png'))
        write_meta(os.path.join(OUT, name), name)
        preview.append((name, img))
        print('  %-22s <- %-26s %d colors' % (name + '.png', rel, len(mapping)))

    # 总览：每个套件画 3 种尺寸（48 方形 / 200x64 面板 / 320x40 条），验证九宫格不变形
    PAD, ROW = 12, 84
    W = 380
    sheet = Image.new('RGBA', (W, ROW * len(preview) + 40), (24, 26, 36, 255))
    from PIL import ImageDraw
    dr = ImageDraw.Draw(sheet)
    dr.text((10, 10), 'Kenney Pixel UI Pack -> project kit (CC0, recolored, 2px black border, inset %d)' % INSET,
            fill=(230, 230, 240, 255))
    for i, (name, img) in enumerate(preview):
        y = 34 + i * ROW
        sheet.alpha_composite(img, (PAD, y))
        sheet.alpha_composite(nine_slice(img, INSET, 120, 48), (PAD + 60, y))
        sheet.alpha_composite(nine_slice(img, INSET, 180, 40), (PAD + 188, y + 4))
        dr.text((PAD, y + 56), name, fill=(200, 205, 220, 255))
    sheet = sheet.resize((sheet.width * 2, sheet.height * 2), Image.NEAREST)
    os.makedirs(DOCS, exist_ok=True)
    sheet.save(os.path.join(DOCS, 'ui_kit_overview.png'))
    print('overview -> docs/ui-redesign/ui_kit_overview.png (%dx%d)' % sheet.size)


if __name__ == '__main__':
    main()
