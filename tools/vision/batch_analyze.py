# -*- coding: utf-8 -*-
"""批量目视确认：模型只加载一次，逐图提问，结果落盘。
用法: <带torch的python> tools/vision/batch_analyze.py <图片目录> <输出md> [glob]
"""
import os, sys, glob, io, time
os.environ.setdefault("HF_HOME", "H:/_vlm_cache")
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception: pass

import torch
from PIL import Image
from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration
try:
    from transformers.utils import logging as _hflog
    _hflog.disable_progress_bar(); _hflog.set_verbosity_error()
except Exception: pass

MODEL_DIR = os.environ.get("VLM_MODEL", "H:/_vlm_cache/Qwen2.5-VL-3B-Instruct")
src, out = sys.argv[1], sys.argv[2]
pattern = sys.argv[3] if len(sys.argv) > 3 else "screen-*.jpg"

Q = ("这是竖屏手机游戏 UI 截图。请用中文简洁回答四点，每点一个换行：\n"
     "A) 界面类型：从[主菜单/角色选择/地图/战斗/升级三选一/背包或构建面板/商店/事件/结算/设置]中选一个最接近的；\n"
     "B) UI 元素清单：自上而下列出你能看到的主要元素（名称+大致位置+相对大小）；\n"
     "C) 配色：列出 3-5 个主要颜色（颜色名或十六进制）；\n"
     "D) 交互控件：有哪些可点击/可拖动的控件，大致在屏幕什么位置。\n"
     "只描述你真实看到的，不要猜测游戏规则。")

print("loading model ...", flush=True)
t0 = time.time()
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(MODEL_DIR, torch_dtype=torch.bfloat16).to("cuda").eval()
proc = AutoProcessor.from_pretrained(MODEL_DIR, min_pixels=256*28*28, max_pixels=1024*28*28)
print("model ready in %.1fs" % (time.time()-t0), flush=True)

files = sorted(glob.glob(os.path.join(src, pattern)))
buf = ["# Möbelmon UI 参考 · VLM 目视确认原始记录\n",
       "\n> 由 `tools/vision/batch_analyze.py` 自动生成（本地 Qwen2.5-VL-3B，离线）。",
       "\n> ⚠️ 3B 模型会看错细节、会编，此文件只作**线索**，结论必须人工复核。\n"]
for i, f in enumerate(files, 1):
    t = time.time()
    im = Image.open(f).convert("RGB")
    msgs = [{"role":"user","content":[{"type":"image","image":im},{"type":"text","text":Q}]}]
    text = proc.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    inp = proc(text=[text], images=[im], return_tensors="pt").to("cuda")
    with torch.no_grad():
        g = model.generate(**inp, max_new_tokens=320, do_sample=False)
    ans = proc.batch_decode([o[len(i2):] for o, i2 in zip(g, inp.input_ids)], skip_special_tokens=True)[0]
    dt = time.time()-t
    print("[%d/%d] %s  %.1fs" % (i, len(files), os.path.basename(f), dt), flush=True)
    buf.append("\n---\n\n## %s\n\n```\n%s\n```\n" % (os.path.basename(f), ans.strip()))
    io.open(out, "w", encoding="utf-8", newline="\n").write("".join(buf))
print("DONE ->", out, flush=True)
