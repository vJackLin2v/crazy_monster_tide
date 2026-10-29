
import os
for k in ("HTTP_PROXY","HTTPS_PROXY","ALL_PROXY","NO_PROXY","http_proxy","https_proxy","all_proxy","no_proxy"):
    os.environ.pop(k, None)
os.environ["HF_ENDPOINT"]="https://hf-mirror.com"; os.environ["HF_HOME"]=r"H:\AI-game\hf-cache"
import torch, numpy as np
from diffusers import StableDiffusionXLPipeline, EulerAncestralDiscreteScheduler
from PIL import Image, ImageDraw, ImageFont
CKPT=r"H:\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\models\checkpoints\sd_xl_base_1.0.safetensors"
LORA=r"H:\Comfy-Desktop\ComfyUI-Installs\ComfyUI\ComfyUI\models\loras\pixel-art-xl.safetensors"
GEN=r"H:\AI-game\crazy_monster_tide\.tmp\gen"; DOC=r"H:\AI-game\crazy_monster_tide\docs\design\options"
os.makedirs(DOC,exist_ok=True)
pipe=StableDiffusionXLPipeline.from_single_file(CKPT, torch_dtype=torch.float16, use_safetensors=True, add_watermarker=False)
pipe.scheduler=EulerAncestralDiscreteScheduler.from_config(pipe.scheduler.config)
pipe.load_lora_weights(LORA); pipe.enable_model_cpu_offload()
BASE=("pixel art game background, dark fantasy, dusk, deep blue purple night sky, warm torchlight, "
      "distant mountains, fog, limited palette, flat shading, dithering, low detail, moody, no text, no characters, no ui")
NEG=("text, watermark, signature, ui, hud, characters, people, bright daylight, neon, blurry, photo, 3d render, "
     "oversaturated, cluttered, busy foreground, duplicate, mirrored")
V=[(501,"ruined watchtower on a hill above a misty valley"),
   (502,"graveyard with broken tombstones under a huge moon"),
   (503,"stone bridge over a dark chasm, distant castle"),
   (504,"ruined courtyard with banners and braziers at dusk")]

def grade(im):
    w,h=im.size; im=im.crop(((w-720)//2,0,(w-720)//2+720,h)).resize((360,640), Image.BOX)
    a=np.asarray(im).astype(np.float32)/255.0
    luma=(a*[0.299,0.587,0.114]).sum(axis=2,keepdims=True)
    shadow=np.array([0.13,0.11,0.20],np.float32); hi=np.array([0.42,0.26,0.14],np.float32)
    a=a*(1-0.18)+ (shadow*(1-luma)+hi*luma)*0.18
    a=np.clip((a-0.5)*1.10+0.5,0,1)
    out=(a*255).astype(np.uint8)
    for y in range(300): out[y]= (out[y]*(0.55+0.45*y/300)).astype(np.uint8)
    return Image.fromarray(out,"RGB").quantize(colors=48, method=Image.Quantize.MEDIANCUT).convert("RGB")

sheets=[]
for seed, extra in V:
    g=torch.Generator(device="cpu").manual_seed(seed)
    img=pipe(prompt=BASE+", "+extra, negative_prompt=NEG, width=768, height=1280,
             num_inference_steps=26, guidance_scale=7.0, generator=g).images[0]
    s=grade(img); s.save(os.path.join(DOC,"opt-%d.png"%seed))
    s.resize((720,1280), Image.NEAREST).save(os.path.join(DOC,"opt-%d@2x.png"%seed))
    sheets.append((seed,s)); print("done",seed,flush=True)

# 对照图 2x2
CW,CH=360,640; cv=Image.new("RGB",(CW*4+20,CH+34),(14,13,20)); dd=ImageDraw.Draw(cv)
f=ImageFont.truetype(r"C:\Windows\Fonts\msyhbd.ttc",15)
for i,(seed,s) in enumerate(sheets):
    cv.paste(s,(i*(CW+6),30))
    dd.text((i*(CW+6)+8,8),"选项 %d"%seed,font=f,fill=(230,225,240))
cv.save(os.path.join(DOC,"options-4up.png"))
print("sheet ok")
