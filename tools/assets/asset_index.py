#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""素材索引与检索（本地、无外部服务、不调用任何付费 API）。

用途：把 H 盘分散的素材（项目 resources、素材工坊各池、母本 kit）整理成
一份可检索的索引，让 Agent 能用中文/英文关键词按"画面内容"挑素材，
而不是靠文件名猜。

子命令：
    scan      扫描 roots → assets_index/index.jsonl + summary.json
    sheets    生成带编号的对照页（供视觉模型逐格描述/核对）
    describe  合并视觉描述 → assets_index/descriptions.json
    search    关键词检索（支持中英同义词、类别过滤、JSON 输出）
    pick      复制素材到目标路径，打印授权提示（不自动改文档）
    recolor   单图改造：色相旋转 / 限色板（演示"改造现有素材"）
    stats     索引统计

设计原则：
    1. 只读扫描；不移动、不改名任何原始素材。
    2. 能代码量的不问模型：尺寸/透明度/主色/重复一律脚本算。
    3. 视觉模型只补"文件名看不出内容"的那一小撮（relic-001 这类）。
    4. 授权状态只做标注，不自动放行；最终以 docs/assets/asset_license.md 为准。
"""

import argparse
import hashlib
import json
import os
import re
import sys
from collections import Counter, defaultdict

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # pragma: no cover
    Image = None

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT_DIR = os.path.join(ROOT, 'assets_index')
INDEX_PATH = os.path.join(OUT_DIR, 'index.jsonl')
DESC_PATH = os.path.join(OUT_DIR, 'descriptions.json')
SHEET_DIR = os.path.join(OUT_DIR, 'sheets')
SHEET_MAP = os.path.join(OUT_DIR, 'sheet_map.json')

# ---------------------------------------------------------------- 扫描配置

ROOTS = [
    # label, path, kind
    ('project', os.path.join(ROOT, 'cocos/assets/resources/art'), 'project'),
    ('pool-icons', r'H:\AI-game\素材工坊\图标素材', 'pool'),
    ('pool-vfx', r'H:\AI-game\素材工坊\技能特效', 'pool'),
    ('pool-ui', r'H:\AI-game\素材工坊\界面UI', 'pool'),
    ('pool-units', r'H:\AI-game\素材工坊\人物素材', 'pool'),
    ('pool-items', r'H:\AI-game\素材工坊\道具素材', 'pool'),
    ('pool-bg', r'H:\AI-game\素材工坊\背景素材', 'pool'),
    ('pool-audio', r'H:\AI-game\素材工坊\音效素材', 'pool'),
    ('kit', r'H:\AI-game\pixel_roguelike_wechat_agent_kit\assets', 'kit'),
    # H 盘全盘普查后新增（2026-10-20，见 docs/assets/hdrive_inventory.md）
    ('cc0-packs', r'H:\job_prep\免费素材', 'pool'),
    ('prev-pixel', r'H:\AI-game\Pixel Resonance Expedition\asset-catalog', 'pool'),
    ('crew-assets', r'H:\rougelike_crew\assets', 'pool'),
    ('crew-ai', r'H:\rougelike_crew\ai-material-factory\outputs', 'pool'),
]

EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.svg', '.ttf', '.otf', '.wav', '.ogg', '.mp3', '.gif'}

# 路径 → (cat, sub)。先匹配先赢。
CAT_RULES = [
    ('art/icons', 'icon', ''),
    ('art/units', 'unit', ''),
    ('art/vfx', 'vfx', ''),
    ('art/audio', 'audio', ''),
    ('art/ui', 'ui', ''),
    ('免费素材/Game Icons', 'icon-svg', ''),
    ('免费素材', 'unit', ''),
    ('ai-material-factory', 'vfx', ''),
    ('Pixel Resonance Expedition', 'asset', ''),
    ('图标素材/矢量图标', 'icon-svg', ''),
    ('图标素材/技能图标', 'icon', 'skill'),
    ('图标素材/状态与Buff图标', 'icon', 'buff'),
    ('图标素材/物品图标', 'icon', 'item'),
    ('图标素材/游戏图标', 'icon', 'game'),
    ('图标素材', 'icon', ''),
    ('人物素材', 'unit', ''),
    ('技能特效', 'vfx', ''),
    ('界面UI', 'ui', ''),
    ('音效素材', 'audio', ''),
    ('背景素材', 'bg', ''),
    ('场景素材', 'bg', ''),
    ('道具素材', 'item', ''),
    ('approved/icons', 'icon', ''),
    ('approved/vfx', 'vfx', ''),
    ('approved/ui', 'ui', ''),
    ('approved/bg', 'bg', ''),
    ('approved/fonts', 'font', ''),
    ('internal/icons', 'icon', ''),
    ('internal/sprites', 'unit', ''),
    ('internal/portraits', 'portrait', ''),
    ('approved', 'asset', ''),
]

# 授权标注（只做提示，不改变 Asset Gate）
LICENSE_RULES = [
    (r'pixel_roguelike_wechat_agent_kit/assets/internal', 'blocked', 'SlotBound 解包：禁商用/禁再分发'),
    (r'cocos/assets/resources/art/(icons|units)', 'user-approved', 'D-26 用户批准；上架前需替换（见 asset_license.md）'),
    (r'cocos/assets/resources/art/vfx', 'ok-attribution', '多为 CC0/可商用；spell-fx 需署名'),
    (r'免费素材/Game Icons', 'attribution', 'GameIcons CC BY 3.0：需署名'),
    (r'免费素材', 'ok-attribution', 'Kenney/CC0 包：按包核对 LICENSE，多数 CC0'),
    (r'Pixel Resonance Expedition', 'unverified', '另一项目的素材目录：来源待核'),
    (r'rougelike_crew/assets', 'unverified', '来源待核'),
    (r'ai-material-factory/outputs', 'unverified', 'AI 生成物：需登记工具与提示词'),
    (r'图标素材/矢量图标', 'attribution', 'GameIcons CC BY 3.0：需按作者署名'),
    (r'图标素材', 'unverified', '未逐包核验：用前查 asset_license.md'),
    (r'人物素材|技能特效|界面UI|道具素材|背景素材|场景素材|音效素材', 'unverified', '未逐包核验：用前查 asset_license.md'),
]

STOPWORDS = {'png', 'svg', 'icon', 'icons', 'img', 'image', 'sprite', 'sprites', 'set',
             'pack', 'asset', 'assets', 'copy', 'final', 'new', 'old', 'transparent'}

ANIM_DIRS = {'idle', 'walk', 'attack', 'death', 'run', 'hit', 'hurt', 'cast', 'move',
             'die', 'idle_loop', 'attack1', 'attack2', 'walking', 'attacking', 'dying'}


def group_key(rel, cat):
    """动画类素材按"组"聚合：一个单位/一个特效组件一行，避免几万帧刷屏。"""
    d = os.path.dirname(rel)
    base = os.path.basename(d).lower()
    if cat == 'unit' and base in ANIM_DIRS:
        return os.path.dirname(d)
    return d

# ---------------------------------------------------------------- 基础工具


def rel_posix(path, base):
    return os.path.relpath(path, base).replace('\\', '/')


def classify(rel, root_kind):
    r = rel.replace('\\', '/')
    for pat, cat, sub in CAT_RULES:
        if pat in r:
            return cat, sub
    return ('asset' if root_kind != 'kit' else 'asset'), ''


def license_of(full, rel):
    p = full.replace('\\', '/')
    for pat, status, note in LICENSE_RULES:
        if re.search(pat, p):
            return status, note
    return 'unverified', '未核验'


def png_header(path):
    try:
        with open(path, 'rb') as f:
            head = f.read(33)
        if head[:8] != b'\x89PNG\r\n\x1a\n':
            return None
        return {'w': int.from_bytes(head[16:20], 'big'),
                'h': int.from_bytes(head[20:24], 'big'),
                'ctype': head[25]}
    except Exception:
        return None


def sha1(path, limit=300000):
    try:
        if os.path.getsize(path) > limit:
            return ''
        h = hashlib.sha1()
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                h.update(chunk)
        return h.hexdigest()
    except Exception:
        return ''


def img_stats(path):
    """返回 alpha 占比 + 主色，失败返回 ({}, [])。用 getcolors，避免 getdata 弃用。"""
    if Image is None:
        return {}, []
    try:
        im = Image.open(path).convert('RGBA')
        if im.width * im.height > 256 * 256:
            im.thumbnail((256, 256))
        total = im.width * im.height
        cols = im.getcolors(maxcolors=1 << 22) or []
        opaque = [(c, rgb) for c, rgb in cols if rgb[3] > 24]
        alpha = round(sum(c for c, _ in opaque) / total, 3) if total else 0
        if not opaque:
            return {'alpha': alpha}, []
        opaque.sort(key=lambda x: -x[0])
        palette = ['#%02x%02x%02x' % rgb[:3] for _c, rgb in opaque[:6]]
        return {'alpha': alpha}, palette
    except Exception:
        return {}, []


def tokenize(name):
    s = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)
    s = re.sub(r'[^0-9A-Za-z\u4e00-\u9fff]+', ' ', s)
    out = []
    for t in s.lower().split():
        if t in STOPWORDS or t.isdigit():
            continue
        if len(t) == 1 and not ('\u4e00' <= t <= '\u9fff'):
            continue
        out.append(t)
    return out


def is_opaque(name):
    """文件名是否"看不出内容"（纯编号 / relic-001 / img-3 之类）。"""
    toks = tokenize(name)
    if not toks:
        return True
    if all(re.fullmatch(r'(relic|icon|item|img|image|sprite|frame|bg|ui|asset|tmp|untitled)\d*', t) for t in toks):
        return True
    return False


# ---------------------------------------------------------------- 词表

# 每组内的词互为同义（中英混合）。查询任一词会扩展到整组。
LEXICON = [
    ['冰', '冰霜', '寒冰', 'ice', 'frost', 'chill', 'freeze', 'frozen', 'snow', 'cold'],
    ['火', '火焰', 'fire', 'flame', 'burn', 'burning', 'inferno', 'magma', 'lava'],
    ['雷', '闪电', '雷霆', '电弧', '电', 'lightning', 'thunder', 'bolt', 'shock', 'zap', 'electric'],
    ['毒', 'poison', 'venom', 'toxic', 'acid'],
    ['风', 'wind', 'gale', 'gust', 'cyclone', 'tornado'],
    ['光', 'holy', 'light', 'divine', 'radiance', 'sacred'],
    ['暗', 'dark', 'shadow', 'void', 'black', 'necro', 'death'],
    ['血', 'blood', 'bleed', 'lifesteal', 'leech', 'vampire'],
    ['奥术', 'arcane', 'magic', 'magical', 'spell', 'rune'],
    ['地球', 'earth', 'stone', 'rock', 'quake', 'meteor'],
    ['攻击', 'attack', 'damage', 'dmg', 'atk', 'strike', 'hit'],
    ['暴击', 'crit', 'critical', 'critdamage'],
    ['攻速', 'attackspeed', 'aspd', 'haste', 'speed'],
    ['移速', 'movespeed', 'movement', 'swift', 'runspeed'],
    ['生命', 'hp', 'health', 'life', 'vitality', 'maxhp'],
    ['防御', 'defense', 'armor', 'armour', 'def', 'guard', 'block'],
    ['护盾', 'shield', 'barrier', 'bubble', 'ward'],
    ['治疗', 'heal', 'healing', 'regen', 'restore', 'mend'],
    ['吸血', 'lifesteal', 'leech', 'drain', 'vampiric'],
    ['击退', 'knockback', 'push', 'repel'],
    ['穿透', 'pierce', 'piercing', 'penetrate', 'armorpen'],
    ['弹射', 'bounce', 'ricochet', 'chain', 'chainlightning'],
    ['多重', 'multi', 'multishot', 'multiple', 'triple', 'double'],
    ['范围', 'area', 'aoe', 'radius', 'blast', 'explosion', 'boom'],
    ['召唤', 'summon', 'minion', 'totem', 'turret', 'pet'],
    ['冷却', 'cooldown', 'cd', 'recharge', 'haste'],
    ['经验', 'exp', 'experience', 'xp', 'level'],
    ['金币', 'gold', 'coin', 'money', 'loot', 'greed'],
    ['拾取', 'pickup', 'collect', 'magnet', 'vacuum'],
    ['药水', 'potion', 'flask', 'elixir', 'bottle', 'vial'],
    ['剑', 'sword', 'blade', 'saber', 'katana', 'longsword'],
    ['弓', 'bow', 'arrow', 'archer', 'quiver'],
    ['斧', 'axe', 'hatchet', 'cleaver'],
    ['匕首', 'dagger', 'knife', 'stiletto'],
    ['锤', 'hammer', 'mace', 'club', 'maul'],
    ['法杖', 'staff', 'wand', 'scepter', 'rod'],
    ['长矛', 'spear', 'lance', 'pike', 'halberd'],
    ['镰刀', 'scythe', 'sickle'],
    ['戒指', 'ring', 'band'],
    ['项链', 'amulet', 'necklace', 'pendant', 'talisman'],
    ['靴', 'boot', 'boots', 'shoe', 'greaves'],
    ['头盔', 'helmet', 'helm', 'hood', 'crown'],
    ['盔甲', 'armor', 'armour', 'chest', 'plate', 'mail'],
    ['手套', 'glove', 'gloves', 'gauntlet', 'fist'],
    ['书', 'book', 'tome', 'grimoire', 'manual'],
    ['卷轴', 'scroll', 'parchment', 'map'],
    ['钥匙', 'key', 'lockpick'],
    ['宝石', 'gem', 'jewel', 'crystal', 'diamond', 'ruby', 'emerald'],
    ['宝箱', 'chest', 'treasure', 'box', 'crate'],
    ['骷髅', 'skull', 'bone', 'skeleton'],
    ['心脏', 'heart', 'core'],
    ['眼睛', 'eye', 'eyes', 'vision', 'sight'],
    ['沙漏', 'hourglass', 'time', 'timer', 'clock'],
    ['手', 'hand', 'palm', 'fist', 'grip'],
    ['翅膀', 'wing', 'wings', 'feather', 'fly'],
    ['爪', 'claw', 'claws', 'talon', 'scratch'],
    ['牙', 'fang', 'tooth', 'teeth', 'bite'],
    ['角', 'horn', 'horns', 'antler'],
    ['尾巴', 'tail', 'sting'],
    ['魔法阵', 'circle', 'sigil', 'pentagram', 'rune', 'glyph'],
    ['闪电链', 'chain', 'chainlightning', 'arc'],
    ['冲击波', 'shockwave', 'wave', 'ripple', 'pulse'],
    ['爆炸', 'explosion', 'explode', 'boom', 'blast', 'burst'],
    ['流星', 'meteor', 'comet', 'fallingstar'],
    ['地震', 'earthquake', 'quake', 'tremor'],
    ['图腾', 'totem', 'idol', 'pillar'],
    ['陷阱', 'trap', 'mine', 'snare'],
    ['旗帜', 'flag', 'banner', 'standard'],
    ['增益', 'buff', 'boost', 'up', 'increase', 'amplify', 'empower'],
    ['减益', 'debuff', 'down', 'decrease', 'weaken', 'curse'],
    ['强化', 'amplify', 'enhance', 'upgrade', 'boost', 'fortify'],
    ['连锁', 'chain', 'link', 'relentless'],
    ['处决', 'execute', 'execution', 'annihilate', 'annihilation'],
    ['恐惧', 'fear', 'terror', 'flee'],
    ['致盲', 'blind', 'blinding', 'dazzle'],
    ['隐身', 'stealth', 'invisible', 'invisibility', 'shadow'],
    ['传送', 'teleport', 'blink', 'warp', 'portal'],
    ['冻结', 'freeze', 'frozen', 'chill', 'ice'],
    ['减速', 'slow', 'slowing', 'chill', 'snare'],
    ['眩晕', 'stun', 'daze', 'concuss'],
    ['反伤', 'reflect', 'thorns', 'retaliate'],
    ['闪避', 'dodge', 'evasion', 'evade'],
    ['运气', 'luck', 'fortune', 'clover'],
    ['商店', 'shop', 'store', 'merchant', 'vendor'],
    ['重roll', 'reroll', 'refresh', 'reset'],
    ['锁定', 'lock', 'locked', 'padlock'],
    ['解锁', 'unlock', 'unlocked', 'open'],
    ['宝箱', 'chest', 'treasure', 'loot'],
    ['属性', 'stat', 'stats', 'attribute', 'option', 'randomoption'],
    ['技能', 'skill', 'ability', 'spell', 'power'],
    ['模块', 'module', 'imprint', 'rune', 'socket'],
    ['道具', 'item', 'relic', 'artifact', 'trinket'],
    ['角色', 'character', 'class', 'hero', 'unit'],
    ['敌人', 'enemy', 'monster', 'mob', 'creature', 'boss'],
    ['玩家', 'player', 'hero', 'avatar'],
    ['界面', 'ui', 'interface', 'hud', 'panel', 'frame', 'border'],
    ['图标', 'icon', 'icons', 'symbol', 'glyph'],
    ['背景', 'bg', 'background', 'backdrop', 'parallax'],
    ['音效', 'sfx', 'sound', 'audio', 'effect'],
    ['音乐', 'bgm', 'music', 'theme', 'track'],
    # 生物 / 职业（单位检索用）
    ['狼', 'wolf', 'wolves', 'direwolf', 'werewolf'],
    ['哥布林', 'goblin', 'goblins', 'hobgoblin'],
    ['兽人', 'orc', 'orcs', 'orcish'],
    ['蝙蝠', 'bat', 'bats', 'eyebat', 'stingerbat'],
    ['蛇', 'snake', 'serpent', 'basilisk', 'viper', 'cobra'],
    ['史莱姆', 'slime', 'ooze', 'blob'],
    ['骷髅', 'skeleton', 'skull', 'bone', 'undead'],
    ['恶魔', 'demon', 'devil', 'fiend', 'imp', 'infernal'],
    ['巫妖', 'lich', 'necromancer', 'warlock'],
    ['龙', 'dragon', 'drake', 'wyrm', 'wyvern'],
    ['蜘蛛', 'spider', 'arachnid', 'web'],
    ['鼠', 'rat', 'mouse', 'rodent'],
    ['野猪', 'boar', 'pig', 'swine'],
    ['鹰', 'eagle', 'hawk', 'bird', 'raven', 'crow'],
    ['熊', 'bear', 'ursine'],
    ['幽灵', 'ghost', 'spirit', 'wraith', 'specter', 'phantom'],
    ['僵尸', 'zombie', 'corpse', 'undead'],
    ['巨魔', 'troll', 'ogre', 'giant'],
    ['妖精', 'fairy', 'pixie', 'sprite'],
    ['精灵', 'elf', 'elven', 'sylph'],
    ['矮人', 'dwarf', 'dwarven'],
    ['骑士', 'knight', 'paladin', 'cavalier', 'rider'],
    ['法师', 'mage', 'wizard', 'sorcerer', 'witch'],
    ['弓箭手', 'archer', 'bowman', 'ranger', 'hunter'],
    ['盗贼', 'rogue', 'thief', 'assassin', 'bandit'],
    ['牧师', 'priest', 'cleric', 'healer', 'monk'],
    ['圣骑', 'paladin', 'templar', 'crusader'],
    ['术士', 'warlock', 'sorcerer', 'occultist'],
    ['萨满', 'shaman', 'witchdoctor', 'totem'],
    ['刺客', 'assassin', 'ninja'],
    ['战士', 'warrior', 'fighter', 'soldier', 'mercenary'],
    ['狂战士', 'berserker', 'barbarian', 'rage'],
    ['国王', 'king', 'queen', 'royal', 'crown'],
    ['海妖', 'siren', 'mermaid', 'succubus', 'naga'],
    ['蜥蜴', 'lizard', 'reptile', 'saurian', 'axolotl'],
    ['鬣狗', 'hyena', 'jackal'],
    ['水母', 'jellyfish', 'jelly'],
    ['眼球', 'eyeball', 'beholder'],
    ['投射物', 'missile', 'projectile', 'bullet', 'shot'],
    # 界面 / 音频动作
    ['菜单', 'menu', 'mainmenu', 'options', 'settings', 'navigation'],
    ['按钮', 'button', 'btn', 'press', 'click', 'tap'],
    ['面板', 'panel', 'frame', 'border', 'window', 'dialog'],
    ['血条', 'healthbar', 'hpbar', 'bar'],
    ['顶栏', 'topbar', 'header', 'hud'],
    ['弹窗', 'popup', 'modal', 'dialog'],
    ['箭头', 'arrow', 'pointer', 'cursor'],
    ['数字', 'number', 'digit', 'font'],
    ['点击', 'click', 'tap', 'press', 'button'],
    ['命中', 'hit', 'impact', 'strike'],
    ['受伤', 'hurt', 'damage', 'pain'],
    ['升级', 'levelup', 'level_up', 'level', 'upgrade', 'rank'],
    ['胜利', 'win', 'victory', 'success'],
    ['失败', 'lose', 'defeat', 'fail', 'gameover'],
    ['循环', 'loop', 'looping', 'repeat'],
    ['施法', 'cast', 'casting', 'spellcast'],
    ['死亡', 'death', 'die', 'dead', 'kill'],
]


CAT_HINTS = [
    ('图标', 'icon'), ('icon', 'icon'),
    ('音效', 'audio'), ('音乐', 'audio'), ('audio', 'audio'),
    ('单位', 'unit'), ('怪物', 'unit'), ('敌人', 'unit'), ('角色', 'unit'), ('unit', 'unit'),
    ('背景', 'bg'), ('bg', 'bg'),
    ('界面', 'ui'), ('ui', 'ui'),
    ('立绘', 'portrait'),
    ('特效', 'vfx'), ('vfx', 'vfx'),
]


def hint_cat(query):
    q = query.lower()
    for word, cat in CAT_HINTS:
        if word in q:
            return cat
    return None


GENERIC_TERMS = {
    '图标', '技能', '道具', '物品', '单位', '角色', '敌人', '怪物', '特效', '背景', '音效', '界面',
    'icon', 'icons', 'skill', 'item', 'unit', 'enemy', 'character', 'vfx', 'bg', 'audio', 'ui',
    'asset', 'sprite', 'game',
}


def build_lexicon():
    idx = {}
    for gi, group in enumerate(LEXICON):
        for w in group:
            idx.setdefault(w.lower(), set()).add(gi)
    return idx


TERM_GROUP = build_lexicon()
GROUP_WORDS = [set(g) for g in LEXICON]


def expand(term):
    """查询词 → 同义组内所有词。"""
    t = term.lower().strip()
    groups = TERM_GROUP.get(t)
    if groups:
        out = set()
        for gi in groups:
            out |= GROUP_WORDS[gi]
        return out
    return {t}


# ---------------------------------------------------------------- 扫描


def iter_assets(base):
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames.sort()
        for fn in sorted(filenames):
            ext = os.path.splitext(fn)[1].lower()
            if ext in EXTS:
                yield os.path.join(dirpath, fn), fn, ext


def cmd_scan(args):
    os.makedirs(OUT_DIR, exist_ok=True)
    roots = ROOTS
    if args.root:
        roots = []
        for spec in args.root:
            label, path = spec.split('=', 1)
            roots.append((label, path, 'pool'))
    rows = []
    agg = {}
    seen_hash = {}
    for label, base, kind in roots:
        if not os.path.isdir(base):
            print('[skip] 不存在:', base, file=sys.stderr)
            continue
        n = 0
        for full, fn, ext in iter_assets(base):
            rel = rel_posix(full, base)
            cat, sub = classify(full.replace('\\', '/'), kind)
            n += 1

            # 单位 / 特效：按组聚合，一行代表一个单位或一个特效组件
            if cat in ('unit', 'vfx'):
                gkey = group_key(rel, cat)
                gid = '%s:%s' % (label, gkey)
                g = agg.get(gid)
                if g is None:
                    info = png_header(full) if ext == '.png' else None
                    name = os.path.basename(gkey) or os.path.basename(base)
                    toks = tokenize(name) + tokenize(os.path.basename(os.path.dirname(gkey)))
                    status, note = license_of(full, gkey)
                    g = {
                        'id': gid, 'root': label, 'path': full, 'rel': gkey,
                        'cat': cat, 'sub': sub, 'ext': ext, 'bytes': 0,
                        'w': info['w'] if info else 0, 'h': info['h'] if info else 0,
                        'name': name, 'tokens': toks, 'frames': 0, 'is_group': True,
                        'license': status, 'license_note': note,
                    }
                    agg[gid] = g
                    rows.append(g)
                g['frames'] += 1
                g['bytes'] += os.path.getsize(full)
                continue

            name = os.path.splitext(fn)[0]
            toks = tokenize(name)
            info = png_header(full) if ext == '.png' else None
            h = sha1(full) if cat.startswith('icon') and ext == '.png' else ''
            row = {
                'id': '%s:%s' % (label, rel),
                'root': label, 'path': full, 'rel': rel,
                'cat': cat, 'sub': sub, 'ext': ext,
                'bytes': os.path.getsize(full),
                'w': info['w'] if info else 0, 'h': info['h'] if info else 0,
                'name': name, 'tokens': toks,
            }
            status, note = license_of(full, rel)
            row['license'] = status
            row['license_note'] = note
            if h:
                row['sha1'] = h
                if h in seen_hash:
                    row['dup_of'] = seen_hash[h]
                else:
                    seen_hash[h] = row['id']
            rows.append(row)
            if n % 4000 == 0:
                print('  %s: %d ...' % (label, n), flush=True)
        print('[scan] %-12s %6d  %s' % (label, n, base))

    # 图标补 alpha/主色（只对 icon 且 png，且尺寸 <= 128 的做，避免大图拖慢）
    if args.stats:
        print('[stats] 统计图标 alpha/主色 ...', flush=True)
        for r in rows:
            if r['cat'] not in ('icon', 'icon-svg') or r['ext'] != '.png':
                continue
            if not (0 < r['w'] <= 128 and 0 < r['h'] <= 128):
                continue
            st, colors = img_stats(r['path'])
            if st:
                r.update(st)
                r['palette'] = colors

    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    by_cat = Counter(r['cat'] for r in rows)
    summary = {
        'files': len(rows),
        'mb': round(sum(r['bytes'] for r in rows) / 1048576, 2),
        'by_cat': dict(by_cat.most_common()),
        'by_root': dict(Counter(r['root'] for r in rows).most_common()),
        'by_license': dict(Counter(r['license'] for r in rows).most_common()),
        'dups': sum(1 for r in rows if r.get('dup_of')),
        'opaque_icons': sum(1 for r in rows if r['cat'].startswith('icon') and is_opaque(r['name'])),
    }
    with open(os.path.join(OUT_DIR, 'summary.json'), 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


# ---------------------------------------------------------------- 描述


def load_index():
    rows = []
    with open(INDEX_PATH, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def load_desc():
    if os.path.exists(DESC_PATH):
        with open(DESC_PATH, encoding='utf-8') as f:
            return json.load(f)
    return {}


def load_blocklist():
    p = os.path.join(OUT_DIR, 'blocklist.json')
    if not os.path.exists(p):
        return set()
    with open(p, encoding='utf-8') as f:
        return set(json.load(f).get('ids', []))


def cmd_describe(args):
    desc = load_desc()
    if args.file:
        with open(args.file, encoding='utf-8') as f:
            incoming = json.load(f)
        desc.update(incoming)
        with open(DESC_PATH, 'w', encoding='utf-8') as f:
            json.dump(desc, f, ensure_ascii=False, indent=1)
        print('并入 %d 条，总计 %d 条' % (len(incoming), len(desc)))
        return 0
    rows = load_index()
    pending = [r for r in rows if r['cat'].startswith('icon') and is_opaque(r['name']) and r['id'] not in desc]
    print('待描述（文件名看不出内容）: %d' % len(pending))
    for r in pending[:20]:
        print('  ', r['id'])
    return 0


# ---------------------------------------------------------------- 对照页


def fit_cell(im, cell):
    im = im.convert('RGBA')
    w, h = im.size
    if w == 0 or h == 0:
        return Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
    scale = max(1, min((cell - 10) // w, (cell - 10) // h))
    im = im.resize((w * scale, h * scale), Image.NEAREST)
    canvas = Image.new('RGBA', (cell, cell), (0, 0, 0, 0))
    canvas.paste(im, ((cell - im.width) // 2, (cell - im.height) // 2), im)
    return canvas


def checker(w, h, size=8):
    bg = Image.new('RGB', (w, h), (34, 34, 40))
    d = ImageDraw.Draw(bg)
    for y in range(0, h, size):
        for x in range(0, w, size):
            if (x // size + y // size) % 2 == 0:
                d.rectangle([x, y, x + size - 1, y + size - 1], fill=(44, 44, 52))
    return bg


def cmd_sheets(args):
    if Image is None:
        print('需要 Pillow', file=sys.stderr)
        return 2
    desc = load_desc()
    rows = load_index()
    if args.query:
        roots = args.roots.split(',') if args.roots else None
        hits = search_rows(rows, desc, args.query, cat=args.cat, limit=args.limit, roots=roots)
        picked = [r for r, _s in hits]
    elif args.pending:
        picked = [r for r in rows if r['cat'].startswith('icon') and is_opaque(r['name']) and r['id'] not in desc]
        picked = picked[:args.limit] if args.limit else picked
    elif args.ids:
        want = [x for x in args.ids.split(',') if x]
        by_id = {r['id']: r for r in rows}
        picked = [by_id[x] for x in want if x in by_id]
    else:
        print('需要 --query / --pending / --ids', file=sys.stderr)
        return 2
    if not picked:
        print('没有命中')
        return 1
    os.makedirs(SHEET_DIR, exist_ok=True)
    cols = args.cols
    cell = args.cell
    per_sheet = args.per_sheet
    maps = {}
    for si in range(0, len(picked), per_sheet):
        chunk = picked[si:si + per_sheet]
        rows_n = (len(chunk) + cols - 1) // cols
        img = checker(cols * cell, rows_n * cell)
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.load_default(size=13)
        except Exception:
            font = ImageFont.load_default()
        for i, r in enumerate(chunk):
            cx, cy = (i % cols) * cell, (i // cols) * cell
            try:
                pic = Image.open(r['path'])
                img.paste(fit_cell(pic, cell), (cx, cy), fit_cell(pic, cell))
            except Exception:
                pass
            idx = si + i
            draw.text((cx + 3, cy + 1), '#' + str(idx), fill=(255, 220, 80), font=font)
        name = os.path.join(SHEET_DIR, '%s-%03d.png' % (args.prefix or 'sheet', (si // per_sheet + 1)))
        img.convert('RGB').save(name, quality=90)
        maps[os.path.basename(name)] = [r['id'] for r in chunk]
        print('sheet ->', name, len(chunk))
    old = {}
    if os.path.exists(SHEET_MAP):
        with open(SHEET_MAP, encoding='utf-8') as f:
            old = json.load(f)
    old.update(maps)
    with open(SHEET_MAP, 'w', encoding='utf-8') as f:
        json.dump(old, f, ensure_ascii=False, indent=1)
    return 0


# ---------------------------------------------------------------- 检索


def text_has(text, term):
    """英文按词边界匹配（避免 Price 命中 ice），中文按子串。"""
    t = term.lower()
    if re.fullmatch(r'[a-z0-9][a-z0-9 _\-]*', t):
        return re.search(r'(?<![a-z0-9])' + re.escape(t) + r'(?![a-z0-9])', text) is not None
    return t in text


def row_text(r):
    parts = [r.get('name', ''), ' '.join(r.get('tokens', [])), r.get('desc', ''),
             ' '.join(r.get('tags', [])), r.get('rel', '')]
    if r.get('sub'):
        parts.append(r['sub'])
    return ' '.join(parts).lower()


def search_rows(rows, desc, query, cat=None, limit=20, roots=None, size=None, include_dup=False,
                hint=None, block=None, include_risk=False):
    terms = [t for t in re.split(r'[\s,，、/]+', query.strip()) if t]
    if not terms:
        return []
    expanded = []
    for t in terms:
        expanded.append((t, expand(t)))
    scored = []
    for r in rows:
        if cat and not r['cat'].startswith(cat):
            continue
        if roots and r['root'] not in roots:
            continue
        if size and not (r.get('w') == size and r.get('h') == size):
            continue
        if r.get('dup_of') and not include_dup:
            continue
        if block and r['id'] in block and not include_risk:
            continue
        d = desc.get(r['id'], {})
        rr = dict(r)
        if d:
            rr['desc'] = d.get('desc', '')
            rr['tags'] = d.get('tags', [])
        text = row_text(rr)
        name = rr.get('name', '').lower()
        tags = [x.lower() for x in rr.get('tags', [])]
        score = 0.0
        hit_all = True
        for term, variants in expanded:
            best = 0.0
            for v in variants:
                v = v.lower()
                if text_has(text, v):
                    best = max(best, 3.0 if v == term.lower() else 2.0)
                if text_has(name, v):
                    best = max(best, 4.0)
                if v in tags:
                    best = max(best, 4.5)
            if best == 0:
                hit_all = False
            score += best * (0.3 if term.lower() in GENERIC_TERMS else 1.0)
        if score <= 0:
            continue
        if hit_all:
            score += 2.0
        if 0 < rr.get('w', 0) <= 64:
            score += 0.5
        if rr.get('ext') == '.png':
            score += 0.3
        if not rr.get('w'):
            score -= 1.5
        if rr['root'] == 'project':
            score += 0.3
        if hint and rr['cat'].startswith(hint):
            score += 1.5
        if rr['license'] in ('user-approved', 'ok-attribution', 'attribution'):
            score += 0.2
        scored.append((score, rr))
    scored.sort(key=lambda x: (-x[0], x[1].get('bytes', 0)))
    return [(r, s) for s, r in scored[:limit]]


def cmd_search(args):
    rows = load_index()
    desc = load_desc()
    roots = args.roots.split(',') if args.roots else None
    block = load_blocklist()
    hits = search_rows(rows, desc, args.query, cat=args.cat, limit=args.limit,
                       roots=roots, size=args.size, include_dup=args.all,
                       hint=None if args.cat else hint_cat(args.query),
                       block=block, include_risk=args.risk)
    if args.json and not hits:
        print('[]')
        return 0
    if not hits:
        print('没有命中：', args.query)
        return 1
    if args.json:
        out = []
        for r, s in hits:
            out.append({'id': r['id'], 'score': round(s, 2), 'desc': r.get('desc', ''),
                        'tags': r.get('tags', []), 'path': r['path'],
                        'size': '%dx%d' % (r.get('w', 0), r.get('h', 0)),
                        'license': r['license'], 'license_note': r['license_note'],
                        'risk': r['id'] in block})
        print(json.dumps(out, ensure_ascii=False, indent=1))
        return 0
    for i, (r, s) in enumerate(hits, 1):
        d = desc.get(r['id'], {})
        desc_txt = d.get('desc') or '(无描述，按文件名)'
        extra = ''
        if r.get('frames'):
            extra = ' 组·%d帧' % r['frames']
        risk = '⚠风险 ' if r['id'] in block else ''
        print('%2d. %-6.1f %s%s  [%s]  %dx%d%s' % (i, s, risk, r['id'], r['license'], r.get('w', 0), r.get('h', 0), extra))
        print('    %s' % desc_txt)
        print('    %s' % r['path'])
        if r.get('dup_of'):
            print('    ⚠ 重复于', r['dup_of'])
    return 0


# ---------------------------------------------------------------- 取用


def cmd_pick(args):
    rows = {r['id']: r for r in load_index()}
    desc = load_desc()
    r = rows.get(args.id)
    if not r:
        print('找不到 id:', args.id, file=sys.stderr)
        return 2
    dst = args.dest
    if os.path.isdir(dst) or dst.endswith(('\\', '/')):
        dst = os.path.join(dst, os.path.basename(r['path']))
    os.makedirs(os.path.dirname(os.path.abspath(dst)), exist_ok=True)
    with open(r['path'], 'rb') as f, open(dst, 'wb') as g:
        g.write(f.read())
    d = desc.get(r['id'], {})
    print('已复制 ->', dst)
    print('授权：%s — %s' % (r['license'], r['license_note']))
    if d:
        print('画面：', d.get('desc'))
    print('提示：进生产路径前，先在 docs/assets/asset_license.md 登记。')
    with open(os.path.join(OUT_DIR, 'picked.jsonl'), 'a', encoding='utf-8') as f:
        f.write(json.dumps({'id': r['id'], 'dest': dst, 'license': r['license']}, ensure_ascii=False) + '\n')
    return 0


# ---------------------------------------------------------------- 改造


def cmd_recolor(args):
    if Image is None:
        print('需要 Pillow', file=sys.stderr)
        return 2
    im = Image.open(args.src).convert('RGBA')
    r, g, b, a = im.split()
    rgb = Image.merge('RGB', (r, g, b)).convert('HSV')
    h, s, v = rgb.split()
    h = h.point(lambda x: (x + int(args.hue * 255 / 360)) % 256)
    if args.grayscale:
        s = s.point(lambda x: int(x * 0.4))
    rgb2 = Image.merge('HSV', (h, s, v)).convert('RGB')
    out = Image.merge('RGBA', (*rgb2.split(), a))
    if args.quantize:
        alpha = out.getchannel('A')
        q = out.convert('RGB').quantize(colors=args.quantize, method=Image.Quantize.MEDIANCUT).convert('RGB')
        out = Image.merge('RGBA', (*q.split(), alpha))
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    out.save(args.out)
    print('已输出 ->', args.out)
    return 0


def cmd_stats(args):
    summary_path = os.path.join(OUT_DIR, 'summary.json')
    if not os.path.exists(summary_path):
        print('先跑 scan')
        return 2
    with open(summary_path, encoding='utf-8') as f:
        print(json.dumps(json.load(f), ensure_ascii=False, indent=2))
    return 0


# ---------------------------------------------------------------- 成品目录

CATALOG_PATH = os.path.join(OUT_DIR, 'catalog.jsonl')
CATALOG_MD = os.path.join(OUT_DIR, 'CATALOG.md')
CATALOG_SUMMARY = os.path.join(OUT_DIR, 'catalog_summary.json')

USABLE_LICENSES = ('user-approved', 'ok-attribution', 'attribution')
LICENSE_RANK = {'user-approved': 0, 'ok-attribution': 1, 'attribution': 2,
                'unverified': 3, 'blocked': 9}
CATALOG_CATS = ('icon', 'icon-svg', 'unit', 'vfx', 'ui', 'item', 'bg', 'portrait')


def fit_of(r):
    """与 32x32 像素网格的契合度。"""
    w, h = r.get('w') or 0, r.get('h') or 0
    if not w or not h:
        return 'unknown'
    if w == h and w in (16, 24, 32, 48, 64):
        return 'native'
    if w >= 96 or h >= 96:
        return 'big'
    return 'offgrid'


def gate_of(r):
    lic = r.get('license')
    if lic == 'user-approved':
        return 'replace-before-launch'
    if lic == 'attribution':
        return 'attribution-required'
    if lic == 'ok-attribution':
        return 'ok'
    return 'check'


def svg_size(path):
    """SVG 没有像素尺寸，读 viewBox 拿宽高比，统一记成 64x64 的矢量源。"""
    try:
        with open(path, 'rb') as f:
            head = f.read(2048).decode('utf-8', 'ignore')
    except Exception:
        return 0, 0
    m = re.search(r'viewBox\s*=\s*["\']([\d.+-]+)[ ,]+([\d.+-]+)[ ,]+([\d.+-]+)[ ,]+([\d.+-]+)', head)
    if m:
        w, h = float(m.group(3)), float(m.group(4))
        if w > 0 and h > 0:
            return 64, 64 if abs(w - h) < 0.01 else 64
    return 64, 64


def cmd_catalog(args):
    rows = load_index()
    desc = load_desc()
    cats = set(args.cats.split(',')) if args.cats else set(CATALOG_CATS)
    seen = set()
    out = []
    for r in rows:
        if r.get('cat') not in cats:
            continue
        if not args.include_pending and r.get('license') not in USABLE_LICENSES:
            continue
        if r.get('dup_of'):
            continue
        key = r.get('sha1') or '%s|%s|%s|%s|%s' % (r.get('cat'), r.get('name'), r.get('w'), r.get('h'), r.get('bytes'))
        if key in seen:
            continue
        seen.add(key)
        d = desc.get(r['id'], {})
        tags = list(dict.fromkeys(list(r.get('tokens') or []) + list(d.get('tags') or [])))
        w, h = r.get('w') or 0, r.get('h') or 0
        if (r.get('ext') or '') == '.svg' and not (w and h):
            w, h = svg_size(r.get('path') or '')
        fit = 'vector' if (r.get('ext') or '') == '.svg' else fit_of(r)
        out.append({
            'id': r['id'], 'cat': r.get('cat'), 'sub': r.get('sub'),
            'root': r.get('root'), 'rel': r.get('rel'), 'path': r.get('path'),
            'w': w, 'h': h, 'frames': r.get('frames'),
            'license': r.get('license'), 'gate': gate_of(r), 'fit': fit,
            'tokens': tags, 'desc': d.get('desc', ''),
        })
    FIT_RANK = {'native': 0, 'vector': 1, 'offgrid': 2, 'big': 3, 'unknown': 4}
    out.sort(key=lambda x: (x['cat'], LICENSE_RANK.get(x['license'], 9),
                            FIT_RANK.get(x['fit'], 9), x['id']))
    with open(CATALOG_PATH, 'w', encoding='utf-8') as f:
        for x in out:
            f.write(json.dumps(x, ensure_ascii=False) + '\n')

    by_cat = Counter(x['cat'] for x in out)
    by_gate = Counter(x['gate'] for x in out)
    by_fit = Counter(x['fit'] for x in out)
    by_lic = Counter(x['license'] for x in out)
    summary = {'entries': len(out), 'by_cat': dict(by_cat.most_common()),
               'by_gate': dict(by_gate.most_common()), 'by_fit': dict(by_fit.most_common()),
               'by_license': dict(by_lic.most_common())}
    with open(CATALOG_SUMMARY, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    fence = chr(96) * 3
    lines = []
    lines.append('# 成品素材目录（给 Agent 用）')
    lines.append('')
    lines.append('> 由 tools/assets/asset_index.py catalog 生成，**只收授权可用**的条目。')
    lines.append('> 原始全量见 index.jsonl；本目录是"可以直接拿来做东西"的子集。')
    lines.append('')
    lines.append('## 门槛')
    lines.append('')
    lines.append('| gate | 含义 | 能不能进正式包 |')
    lines.append('|---|---|---|')
    lines.append('| ok | 可商用（CC0 / 可商用且已标注） | 可以直接用 |')
    lines.append('| attribution-required | 可商用但需署名（GameIcons CC BY 3.0 等） | 用，但要在致谢里署名 |')
    lines.append('| replace-before-launch | 用户已批准，但上架前必须替换（D-26） | 原型可以，上线不行 |')
    lines.append('')
    lines.append('## 统计')
    lines.append('')
    lines.append('| 维度 | 分布 |')
    lines.append('|---|---|')
    lines.append('| 条目 | %d |' % len(out))
    lines.append('| 类别 | %s |' % ', '.join('%s %d' % (k, v) for k, v in by_cat.most_common()))
    lines.append('| 授权 | %s |' % ', '.join('%s %d' % (k, v) for k, v in by_lic.most_common()))
    lines.append('| 网格契合 | %s |' % ', '.join('%s %d' % (k, v) for k, v in by_fit.most_common()))
    lines.append('')
    lines.append('## 怎么查')
    lines.append('')
    lines.append(fence)
    lines.append('# 找可用的 32px 技能图标')
    lines.append('python tools/assets/asset_index.py search "火 技能" --cat icon --size 32')
    lines.append('# 重新生成成品目录（按类别）')
    lines.append('python tools/assets/asset_index.py catalog --cats icon,icon-svg')
    lines.append('# 取单条（会打印授权提示）')
    lines.append('python tools/assets/asset_index.py pick "pool-icons:技能图标/fire-01.png" --dest .tmp/out')
    lines.append(fence)
    lines.append('')
    lines.append('## 给 Agent 的规则')
    lines.append('')
    lines.append('1. 先查 catalog.jsonl，再查 index.jsonl；catalog 里没有 = 授权没过，别用。')
    lines.append('2. fit=big 的素材不是不能用，是要按 1/2、1/4 **整数倍缩小**，否则像素会糊。')
    lines.append('3. gate=replace-before-launch 只用于原型；上线前替换清单见 docs/assets/asset_license.md。')
    lines.append('4. 新素材入库前必须先登记授权，再跑 scan + catalog。')
    with open(CATALOG_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print('-> %s\n-> %s' % (CATALOG_PATH, CATALOG_MD))
    return 0


# ---------------------------------------------------------------- CLI


def main(argv=None):
    ap = argparse.ArgumentParser(description='素材索引与检索')
    sub = ap.add_subparsers(dest='cmd', required=True)

    p = sub.add_parser('scan', help='扫描并生成索引')
    p.add_argument('--root', action='append', help='label=path，可多次；省略则用内置 ROOTS')
    p.add_argument('--no-stats', dest='stats', action='store_false', help='跳过 alpha/主色统计')
    p.set_defaults(func=cmd_scan, stats=True)

    p = sub.add_parser('search', help='关键词检索')
    p.add_argument('query')
    p.add_argument('--cat', default=None, help='icon / unit / vfx / ui / audio / bg ...')
    p.add_argument('--roots', default=None, help='project,pool-icons,...')
    p.add_argument('--size', type=int, default=None, help='只要指定正方形边长，如 32')
    p.add_argument('--all', action='store_true', help='包含重复副本')
    p.add_argument('--risk', action='store_true', help='包含赌博语义黑名单素材（默认跳过）')
    p.add_argument('--limit', type=int, default=12)
    p.add_argument('--json', action='store_true')
    p.set_defaults(func=cmd_search)

    p = sub.add_parser('sheets', help='生成对照页')
    p.add_argument('--query', default=None)
    p.add_argument('--pending', action='store_true', help='文件名看不出内容的图标')
    p.add_argument('--ids', default=None, help='逗号分隔的 id')
    p.add_argument('--cat', default=None)
    p.add_argument('--roots', default=None)
    p.add_argument('--limit', type=int, default=64)
    p.add_argument('--cols', type=int, default=8)
    p.add_argument('--cell', type=int, default=72)
    p.add_argument('--per-sheet', type=int, default=64)
    p.add_argument('--prefix', default='sheet')
    p.set_defaults(func=cmd_sheets)

    p = sub.add_parser('describe', help='并入视觉描述')
    p.add_argument('--file', default=None, help='JSON: {id: {desc, tags}}')
    p.set_defaults(func=cmd_describe)

    p = sub.add_parser('pick', help='复制素材并打印授权')
    p.add_argument('id')
    p.add_argument('--dest', required=True)
    p.set_defaults(func=cmd_pick)

    p = sub.add_parser('recolor', help='色相/限色改造')
    p.add_argument('src')
    p.add_argument('--out', required=True)
    p.add_argument('--hue', type=float, default=120)
    p.add_argument('--quantize', type=int, default=0)
    p.add_argument('--grayscale', action='store_true')
    p.set_defaults(func=cmd_recolor)

    p = sub.add_parser('catalog', help='生成只含授权可用素材的成品目录')
    p.add_argument('--cats', default=None, help='逗号分隔，默认 icon,icon-svg,unit,vfx,ui,item,bg,portrait')
    p.add_argument('--include-pending', action='store_true', help='把 unverified 也收进来（默认不收）')
    p.set_defaults(func=cmd_catalog)

    p = sub.add_parser('stats', help='查看索引统计')
    p.set_defaults(func=cmd_stats)

    args = ap.parse_args(argv)
    return args.func(args)


if __name__ == '__main__':
    sys.exit(main())
