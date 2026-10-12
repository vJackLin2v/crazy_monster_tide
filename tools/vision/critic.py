# -*- coding: utf-8 -*-
"""对我方原型截图做目视评审（UI Critic 的目视部分）。"""
import os, sys, glob, io, time
os.environ.setdefault("HF_HOME", "H:/_vlm_cache"); os.environ.setdefault("HF_HUB_OFFLINE","1")
os.environ.setdefault("TRANSFORMERS_OFFLINE","1"); os.environ.setdefault("TRANSFORMERS_VERBOSITY","error")
try: sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception: pass
import torch
from PIL import Image
from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration
try:
    from transformers.utils import logging as _h; _h.disable_progress_bar(); _h.set_verbosity_error()
except Exception: pass
M = os.environ.get("VLM_MODEL", "H:/_vlm_cache/Qwen2.5-VL-3B-Instruct")
src, out = sys.argv[1], sys.argv[2]
Q = ("这是竖屏手机游戏的界面截图。请以 UI 评审视角回答：\n"
     "1) 这是什么界面，你一眼能否看懂玩家该做什么；\n"
     "2) 信息层级是否清晰（哪块最抢眼、有没有元素互相挡住或重叠）；\n"
     "3) 有没有明显缺陷：文字太小/太挤/被裁掉、按钮不好点、颜色看不清、留白不均；\n"
     "4) 用 1-10 分为整体观感打分，并给出最该改的一处。\n"
     "请具体、简短，只说你真的看到的。")
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(M, torch_dtype=torch.bfloat16).to("cuda").eval()
proc = AutoProcessor.from_pretrained(M, min_pixels=256*28*28, max_pixels=1024*28*28)
buf = ["# 我方原型 · VLM 目视评审记录\n", "\n> 本地 Qwen2.5-VL-3B 自动生成，仅作线索，结论需人工复核。\n"]
for f in sorted(glob.glob(os.path.join(src, "*.png"))):
    t0 = time.time(); im = Image.open(f).convert("RGB")
    msgs=[{"role":"user","content":[{"type":"image","image":im},{"type":"text","text":Q}]}]
    txt = proc.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    inp = proc(text=[txt], images=[im], return_tensors="pt").to("cuda")
    with torch.no_grad(): g = model.generate(**inp, max_new_tokens=400, do_sample=False)
    a = proc.batch_decode([o[len(i):] for o,i in zip(g, inp.input_ids)], skip_special_tokens=True)[0]
    print("[%s] %.0fs" % (os.path.basename(f), time.time()-t0), flush=True)
    buf.append("\n---\n\n## %s\n\n```\n%s\n```\n" % (os.path.basename(f), a.strip()))
    io.open(out,"w",encoding="utf-8",newline="\n").write("".join(buf))
print("DONE", flush=True)
