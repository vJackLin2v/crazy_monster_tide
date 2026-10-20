# -*- coding: utf-8 -*-
"""看图工具 —— 把本地图片发给智谱视觉模型，拿回文字描述。

Agent 自己的工具只能拿到文字、看不到图片，所以所有"画面验收"都要走这里。

用法:
    export ZHIPU_API_KEY=$(powershell -NoProfile -Command \
      "[Environment]::GetEnvironmentVariable('ZHIPU_API_KEY','User')" | tr -d '\r\n')
    VLM_MODEL=glm-4.5v python tools/vision/see_image.py <图片路径> "<问题>"

模型选择：
    glm-4.5v      最强，看细节用它（默认推荐）
    glm-4v-flash  免费，但会自相矛盾

⚠️ 局限：**小尺寸图标经常误读**（把靶心说成箭头、拳头说成面具）。
   看图标必须把图片放大到 80px 以上再看，且结论要回代码/实测复核。
"""
import base64, json, os, sys, urllib.request, urllib.error

def main():
    path = sys.argv[1]
    q = sys.argv[2] if len(sys.argv) > 2 else "请详细描述这张图片：布局、文字、颜色、风格。"
    key = os.environ.get("ZHIPU_API_KEY", "").strip()
    if not key:
        print("ERR: 没有 ZHIPU_API_KEY"); sys.exit(2)
    ext = os.path.splitext(path)[1].lower().lstrip(".")
    mime = {"png":"image/png","jpg":"image/jpeg","jpeg":"image/jpeg",
            "webp":"image/webp","bmp":"image/bmp","gif":"image/gif"}.get(ext,"image/png")
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    payload = {
        "model": os.environ.get("VLM_MODEL","glm-4v-flash"),
        "messages": [{"role":"user","content":[
            {"type":"image_url","image_url":{"url":"data:%s;base64,%s" % (mime, b64)}},
            {"type":"text","text": q},
        ]}],
        "max_tokens": 6000,
    }
    req = urllib.request.Request(
        "https://open.bigmodel.cn/api/paas/v4/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization":"Bearer "+key, "Content-Type":"application/json"},
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            d = json.loads(r.read().decode("utf-8"))
        m=d["choices"][0]["message"]; out=(m.get("content") or "").strip(); print(out if out else "(空回复) raw keys=" + str(list(m.keys()))); print("--finish:", d.get("choices",[{}])[0].get("finish_reason"), "usage:", d.get("usage"))
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read().decode("utf-8", "ignore")[:600])
    except Exception as e:
        print("ERR", type(e).__name__, str(e)[:300])

main()
