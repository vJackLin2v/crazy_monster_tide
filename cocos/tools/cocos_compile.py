# -*- coding: utf-8 -*-
"""Trigger Cocos Creator script compilation and confirm it landed.

Background (see docs/known-issues.md KI-008):
  Cocos Creator DOES compile automatically, but NOT while its window is in the
  background (Windows file-watch throttling). Bringing the window to front makes
  it compile within a few seconds. No editor restart is needed.

Usage:
    python tools/cocos_compile.py                          # trigger + short wait
    python tools/cocos_compile.py core/Const.ts ZOOM_MUL   # wait until marker shows up

Exit code 0 = compiled; 1 = timeout.
"""
import json
import os
import subprocess
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
PREVIEW = 'http://127.0.0.1:7456'


def activate():
    """Bring the editor window to front (returns its pid, or 0)."""
    ps1 = os.path.join(HERE, 'activate_cocos.ps1')
    try:
        r = subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps1],
                           capture_output=True, text=True, timeout=30)
        out = (r.stdout or '').strip()
        return out.splitlines()[-1] if out else '0'
    except Exception as e:
        return 'ERR ' + str(e)[:60]


def fetch_chunk(suffix):
    im = json.load(urllib.request.urlopen(PREVIEW + '/scripting/x/import-map.json', timeout=10))['imports']
    for k, v in im.items():
        if k.endswith(suffix):
            url = PREVIEW + '/scripting/x/' + v.lstrip('./')
            return urllib.request.urlopen(url, timeout=10).read().decode('utf-8', 'ignore')
    return ''


def main():
    pid = activate()
    print('[cocos] editor window activated (pid %s)' % pid)
    if len(sys.argv) >= 3:
        suffix, marker = sys.argv[1], sys.argv[2]
        t0 = time.time()
        while time.time() - t0 < 90:
            try:
                if marker in fetch_chunk(suffix):
                    print('[cocos] OK: %s now contains "%s" (%.0fs)' % (suffix, marker, time.time() - t0))
                    return 0
            except Exception as e:
                print('[cocos] poll error:', str(e)[:70])
            time.sleep(3)
        print('[cocos] TIMEOUT waiting for "%s" in %s' % (marker, suffix))
        return 1
    time.sleep(12)
    print('[cocos] waited 12s (no marker given)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
