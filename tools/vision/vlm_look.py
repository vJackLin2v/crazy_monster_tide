#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""本地视觉确认（目视确认）—— 用本地 Qwen2.5-VL-3B 看一张图并回答一个问题。

【为什么要有这个工具】
    本工程踩过的最大一类坑是"**逻辑层全绿、表现层是坏的**"（`HANDOVER.md` §6.2）：
      · 第 ④ 项：立绘数据文件 14 条断言全绿，但 `ui.js` 读错了键 → 立绘从来没画出来
      · 第 ③ 项：入口图标按原生 10×9 渲染、底部三入口停在屏幕 37% 处 —— 
        而当时 **68 条 E2E 全绿**，因为旧门禁只问"元素在不在"，不问"渲染多大、在哪个位置"
    这两类问题的共同点是：**断言能证明"东西存在"，证明不了"看起来对不对"**。
    所以要有一个真的会"看"的环节。

【模型与依赖】
    模型：`H:/_vlm_cache/Qwen2.5-VL-3B-Instruct`（本地、离线、免费、不上传图片）
    需要在**带 torch+CUDA 的 Python** 下跑。本机可用：
        H:/AI学习计划/ComfyUI/.venv/Scripts/python.exe
    （该 venv 里 torch 2.10 + CUDA 可用；本工程自己的 python 没有 torch。
      刻意**不往工程里装 torch** —— 那是 2GB+ 的依赖，为一次目视确认不值当。）

【用法】
    # 直接用那个 venv 的 python 跑
    "H:/AI学习计划/ComfyUI/.venv/Scripts/python.exe" tools/vision/vlm_look.py \
        .cache/menu_with_continue.png "这张主菜单截图里，三个按钮哪个最显眼？打分 1-10。"

    # 或者先设好环境变量再调
    set VLM_PYTHON=H:/AI学习计划/ComfyUI/.venv/Scripts/python.exe
    python tools/vision/vlm_look.py <图片> "<问题>" [max_new_tokens]

【怎么用它（重要）】
    把它当**评审**，不要当**裁判**：
      · 问具体、可判定的事（"哪个按钮最大""文字是否在同一水平线"），别问"好不好看"；
      · 它**看不清像素级细节**，也会编（3B 模型）。凡是能用 Playwright/PIL 精确量到的
        （尺寸、坐标、颜色、断链），一律**用代码量**，不要问它；
      · 它真正不可替代的地方是"整体观感/构图/层级"这类**几何量不出来**的判断。
    ⇒ 结论要落成**门禁断言**（能自动跑的），VLM 只负责在开发时提示"哪里不对"。
"""
from __future__ import annotations

import os
import sys

os.environ.setdefault("HF_HOME", "H:/_vlm_cache")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
os.environ.setdefault("TRANSFORMERS_NO_ADVISORY_WARNINGS", "1")

MODEL_DIR = os.environ.get("VLM_MODEL", "H:/_vlm_cache/Qwen2.5-VL-3B-Instruct")

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass


def main(argv):
    if len(argv) < 3:
        raise SystemExit(__doc__)
    img_path, prompt = argv[1], argv[2]
    max_new = int(argv[3]) if len(argv) > 3 else 600
    if not os.path.exists(img_path):
        raise SystemExit("图片不存在: %s" % img_path)

    try:
        import torch
        from PIL import Image
        from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration
    except ImportError as e:
        raise SystemExit(
            "缺少依赖（%s）。\n本工程自己的 python 没有 torch，请用带 CUDA 的 venv：\n"
            '  "H:/AI\u5b66\u4e60\u8ba1\u5212/ComfyUI/.venv/Scripts/python.exe" %s <图片> "<问题>"'
            % (e, argv[0]))

    try:
        from transformers.utils import logging as _hflog
        _hflog.disable_progress_bar()
        _hflog.set_verbosity_error()
    except Exception:
        pass

    # 不用 device_map（那要求 accelerate，而这是别人的 venv，不往里塞依赖）
    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        MODEL_DIR, torch_dtype=torch.bfloat16)
    model = model.to("cuda").eval()
    proc = AutoProcessor.from_pretrained(
        MODEL_DIR, min_pixels=256 * 28 * 28, max_pixels=1024 * 28 * 28)

    im = Image.open(img_path).convert("RGB")
    msgs = [{"role": "user", "content": [
        {"type": "image", "image": im},
        {"type": "text", "text": prompt}]}]
    text = proc.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    inputs = proc(text=[text], images=[im], return_tensors="pt").to("cuda")
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=max_new, do_sample=False)
    gen = out[0][inputs["input_ids"].shape[1]:]
    print(proc.decode(gen, skip_special_tokens=True).strip())


if __name__ == "__main__":
    main(sys.argv)
