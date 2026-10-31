# -*- coding: utf-8 -*-
"""从真实运行截图裁切四个功能图标，生成预览图（docs/ui/menu_v3_icons_preview.png）。"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = r"H:/AI-game/crazy_monster_tide"
SHOT = os.path.join(ROOT, "deliverables/menu_v3_2026-10-31/screenshots/menu_no_save.png")
OUT = os.path.join(ROOT, "docs/ui/menu_v3_icons_preview.png")

img = Image.open(SHOT).convert("RGBA")
W, H = img.size  # 720x1280（2x）

# 图标行：底部四列（设计坐标 x=45/135/225/315 → 2x 后 90/270/450/630）
centers = [90, 270, 450, 630]
names = [("战绩", "History"), ("图鉴", "Codex"), ("成就", "Achievement"), ("设置", "Settings")]

def is_icon_px(p):
    r, g, b, a = p
    if a < 128:
        return False
    # 米白或金色像素
    return (r > 170 and g > 150 and b > 150) or (r > 200 and g > 140 and b < 140)

crops = []
for cx in centers:
    xs, ys = [], []
    for y in range(1010, 1150):
        for x in range(cx - 44, cx + 44):
            if 0 <= x < W and is_icon_px(img.getpixel((x, y))):
                xs.append(x); ys.append(y)
    if not xs:
        raise SystemExit("icon not found near x=%d" % cx)
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    side = max(x1 - x0, y1 - y0) + 8
    mx, my = (x0 + x1) // 2, (y0 + y1) // 2
    box = (mx - side // 2, my - side // 2, mx + side // 2, my + side // 2)
    cell = img.crop(box)
    # 只保留图标像素，其余透明（避免带上一块背景）
    px = cell.load()
    for yy in range(cell.height):
        for xx in range(cell.width):
            p = px[xx, yy]
            if not is_icon_px(p):
                px[xx, yy] = (0, 0, 0, 0)
    crops.append(cell)
    print("crop", cx, box, cell.size)

BG = (19, 28, 54, 255)
CANVAS_W, CANVAS_H = 760, 600
canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), BG)
d = ImageDraw.Draw(canvas)
font_big = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 24)
font_name = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 18)
font_small = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 12)

def center_text(x, y, text, font, fill):
    box = d.textbbox((0, 0), text, font=font)
    d.text((x - (box[2] - box[0]) / 2, y), text, font=font, fill=fill)

center_text(CANVAS_W / 2, 18, "《疯狂鸽王》主菜单功能图标 V3", font_big, (244, 231, 198, 255))
center_text(CANVAS_W / 2, 48, "16×16 像素网格 · 游戏内 32×32（2 倍整数放大）", font_small, (160, 180, 210, 255))

col_x = [100, 280, 460, 640]
for i, cell in enumerate(crops):
    cx = col_x[i]
    big = cell.resize((96, 96), Image.NEAREST)
    canvas.alpha_composite(big, (cx - 48, 90))
    # 16×16 网格辅助线（每 6px 一格）
    for k in range(17):
        d.line([(cx - 48 + k * 6, 90), (cx - 48 + k * 6, 186)], fill=(255, 255, 255, 30))
        d.line([(cx - 48, 90 + k * 6), (cx + 48, 90 + k * 6)], fill=(255, 255, 255, 30))
    small = cell.resize((32, 32), Image.NEAREST)
    canvas.alpha_composite(small, (cx - 16, 300))
    center_text(cx, 340, "菜单显示 32×32", font_small, (150, 170, 200, 255))
    center_text(cx, 370, names[i][0], font_name, (244, 231, 198, 255))
    center_text(cx, 396, names[i][1], font_small, (255, 168, 75, 255))

center_text(CANVAS_W / 2, 460, "图标由 16×16 整数像素网格绘制（Graphics），无抗锯齿、无渐变、无 Emoji/汉字替代", font_small, (150, 170, 200, 255))
center_text(CANVAS_W / 2, 486, "预览来自 360×640 @2x 真实运行截图裁切，非设计稿", font_small, (150, 170, 200, 255))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
canvas.save(OUT)
print("saved", OUT, canvas.size)
