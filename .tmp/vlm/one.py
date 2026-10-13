# -*- coding: utf-8 -*-
"""单图目视确认：模型只加载一次，只跑一张图（省资源）"""
import os, sys, io, time
# 关键：所有临时目录指向 H 盘，不碰 C 盘
os.environ['TEMP'] = r'H:\AI-game\crazy_monster_tide\.tmp\vlm'
os.environ['TMP'] = os.environ['TEMP']
os.environ['TMPDIR'] = os.environ['TEMP']
os.environ.setdefault('HF_HOME', 'H:/_vlm_cache')
os.environ.setdefault('HF_HUB_OFFLINE', '1')
os.environ.setdefault('TRANSFORMERS_OFFLINE', '1')
os.environ.setdefault('TRANSFORMERS_VERBOSITY', 'error')
try: sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception: pass

import torch
from PIL import Image
from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration
try:
    from transformers.utils import logging as H
    H.disable_progress_bar(); H.set_verbosity_error()
except Exception: pass

MODEL = 'H:/_vlm_cache/Qwen2.5-VL-3B-Instruct'
img_path, question = sys.argv[1], sys.argv[2]
out_path = sys.argv[3] if len(sys.argv) > 3 else ''

t0 = time.time()
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(MODEL, torch_dtype=torch.bfloat16).to('cuda').eval()
proc = AutoProcessor.from_pretrained(MODEL, min_pixels=256*28*28, max_pixels=1024*28*28)
print('模型加载 %.1fs' % (time.time()-t0), flush=True)

im = Image.open(img_path).convert('RGB')
print('图片 %s %s' % (img_path, im.size), flush=True)
msgs = [{'role':'user','content':[{'type':'image','image':im},{'type':'text','text':question}]}]
text = proc.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
inp = proc(text=[text], images=[im], return_tensors='pt').to('cuda')
with torch.no_grad():
    g = model.generate(**inp, max_new_tokens=500, do_sample=False)
ans = proc.batch_decode([o[len(i):] for o, i in zip(g, inp.input_ids)], skip_special_tokens=True)[0]
print('推理 %.1fs' % (time.time()-t0), flush=True)
print('=' * 64)
print(ans.strip())
if out_path:
    io.open(out_path, 'w', encoding='utf-8', newline='\n').write(ans.strip() + '\n')
