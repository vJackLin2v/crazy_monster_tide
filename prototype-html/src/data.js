/* ============================================================
   疯狂怪潮 · 数据层
   ⚠️ 所有像素精灵均为本工程用字符画程序化生成，未使用任何第三方美术素材。
      参考对象（Möbelmon）只提供「布局 / 信息层级 / 配色」参考，不进游戏资产。
   ============================================================ */
'use strict';

/* ---------- 调色板 ---------- */
const PAL = {
  k:'#12101C', s:'#F2C79B', S:'#D89B6A', h:'#3A2A22', e:'#FFFFFF',
  b:'#4C6FE0', B:'#2F4AA8', r:'#E04060', R:'#B32C48', g:'#5FB79C',
  G:'#3E8C74', p:'#8C63CF', P:'#6842A7', o:'#FFA84B', O:'#E08020',
  w:'#F7E9E0', m:'#9AA7C2', M:'#6A7690', y:'#FFD166', d:'#2B3350',
  n:'#88D6BC', c:'#0D1732', u:'#F2F2F2', t:'#D9C7A0'
};

/* ---------- 精灵（每个字符串行长度必须一致） ---------- */
const SPR = {
  heroA:[ // 战士：宽肩 + 头盔
    '....kkkk....',
    '...kmmmmk...',
    '..kmmmmmmk..',
    '..kmsseemk..',
    '..kmsssemk..',
    '...kssssk...',
    '..kbbbbbbk..',
    '.kbbobbobbk.',
    '.kbkbbbbkbk.',
    '.kkbbbbbbkk.',
    '..kkk..kkk..',
    '..kmm..mmk..'
  ],
  heroB:[ // 法师：尖帽 + 长袍
    '.....kk.....',
    '....kppk....',
    '...kppppk...',
    '..kpppppppk.',
    '..kpsssspk..',
    '..ksesesek..',
    '...kssssk...',
    '..kPPPPPPk..',
    '..kPpPPpPk..',
    '..kPPPPPPk..',
    '..kkkkkkkk..',
    '...kk..kk...'
  ],
  heroC:[ // 游侠：兜帽 + 弓
    '...kkkk.....',
    '..kggggk....',
    '..kgssgk....',
    '..kgsesgk...',
    '..ksssssk...',
    '...ksskk....',
    '..kbbbbk....',
    '.kbbGbbbkk..',
    '.kbGbbbbkk..',
    '.kkbbbbk....',
    '..kk.kk.....',
    '..kk..kk....'
  ],
  slime:[
    '............',
    '............',
    '....kkkk....',
    '..kkggggkk..',
    '.kgnnnnnngk.',
    '.kgneegnegk.',
    '.kgnnnnnngk.',
    'kgnnnnnnnngk',
    'kgnnnnnnnngk',
    'kggnnnnnnggk',
    '.kggggggggk.',
    '..kkkkkkkk..'
  ],
  goblin:[
    '............',
    '..k......k..',
    '.kgk....kgk.',
    '.kggkkkkggk.',
    '..kgssssgk..',
    '..kseseesk..',
    '...ksssk....',
    '..ktttttk...',
    '.ktttttttk..',
    '.ktktttktk..',
    '..kk..kk....',
    '..kk..kk....'
  ],
  skel:[
    '............',
    '...kkkk.....',
    '..kuuuuk....',
    '..kkueek....',
    '..kuuuuk....',
    '...kukuk....',
    '....kuk.....',
    '..kuuuuuk...',
    '.kuukukuk...',
    '.kuk.uk.kk..',
    '....kk......',
    '...kk.kk....'
  ],
  bat:[
    '............',
    '............',
    'kk........kk',
    'kpkk....kkpk',
    'kpppkkkkpppk',
    '.kpprrrrppk.',
    '..kpkrekrpk.',
    '..kpprrrrpk.',
    '...kppppk...',
    '....kkkk....',
    '.....kk.....',
    '............'
  ],
  elite:[
    '...kkkkkk...',
    '..kRRRRRRk..',
    '.kRRRRRRRRk.',
    '.kRwRRRRwRk.',
    '.kRRrrrrRRk.',
    '.kRRRRRRRRk.',
    '..kRRRRRRk..',
    '.kRRRRRRRRk.',
    'kRRkRRRRkRRk',
    'kRkkRRRRkkRk',
    '.kk.kRRk.kk.',
    '....kkkk....'
  ],
  boss:[
    '..kkkkkkkk..',
    '.kPPPPPPPPk.',
    'kPPppppppPPk',
    'kPpPPyyPpPPk',
    'kPpPyyPyPpPk',
    'kPpPPPPPPpPk',
    'kPPppppppPPk',
    '.kPPPPPPPPk.',
    'kPPPPPPPPPPk',
    'kPPkPPPPkPPk',
    'kPk.kPPk.kPk',
    'kk...kk...kk'
  ],
  gem:[
    '............',
    '............',
    '............',
    '....kkkk....',
    '...kyyyyk...',
    '..kywwwwyk..',
    '..kywwwyyk..',
    '...kyyyyk...',
    '....kyyk....',
    '.....kk.....',
    '............',
    '............'
  ]
};

/* ---------- 技能（首版演示 12 个；需求建议 16，MVP 取子集） ---------- */
const SKILLS = {
  fireball:   {name:'火球',      icon:'🔥', type:'projectile', tags:['fire','projectile'],   cd:0.85, dmg:12, spd:190, color:'#FFA84B', size:5},
  ice_spear:  {name:'冰晶矛',    icon:'❄',  type:'projectile', tags:['ice','projectile','pierceable'], cd:1.05, dmg:10, spd:250, color:'#88D6BC', size:4},
  arcane:     {name:'奥术飞弹',  icon:'✦',  type:'projectile', tags:['arcane','projectile','homing'], cd:0.55, dmg:6,  spd:220, color:'#8C63CF', size:4},
  blade:      {name:'回旋刃',    icon:'✧', type:'projectile', tags:['physical','projectile','return'], cd:1.25, dmg:11, spd:200, color:'#F7E9E0', size:5},
  shockwave:  {name:'震荡波',    icon:'◎',  type:'pulse',      tags:['physical','area','pulse'],      cd:2.4,  dmg:14, spd:0,   color:'#FFD166', size:26},
  chain:      {name:'连锁闪电',  icon:'⚡', type:'chain',      tags:['lightning','chain'],            cd:1.8,  dmg:9,  spd:0,   color:'#9BE7FF', size:0},
  poison:     {name:'毒雾',      icon:'☁',  type:'area',       tags:['poison','area','dot'],          cd:2.8,  dmg:5,  spd:0,   color:'#5FB79C', size:30},
  sentry:     {name:'守卫图腾',  icon:'♜',  type:'summon',     tags:['summon','arcane'],              cd:3.6,  dmg:9,  spd:0,   color:'#FFC98A', size:0},
  frostnova:  {name:'霜爆',      icon:'✳',  type:'pulse',      tags:['ice','area','pulse','slow'],    cd:3.2,  dmg:8,  spd:0,   color:'#B6F0DC', size:34},
  blade_storm:{name:'刃暴',      icon:'🌀', type:'area',       tags:['physical','area','dot'],        cd:3.0,  dmg:6,  spd:0,   color:'#D9C7A0', size:26},
  holybolt:   {name:'圣光弹',    icon:'☀',  type:'projectile', tags:['holy','projectile','pierceable'],cd:1.4, dmg:9,  spd:210, color:'#FFF3C4', size:6},
  thorn:      {name:'荆棘环',    icon:'✽',  type:'pulse',      tags:['nature','area','pulse'],        cd:2.6,  dmg:10, spd:0,   color:'#8FE07A', size:30},
  orb:        {name:'雷球',      icon:'◉',  type:'projectile', tags:['lightning','projectile','homing'], cd:0.95, dmg:8, spd:175, color:'#9BE7FF', size:6},
  spike:      {name:'地刺',      icon:'▲',  type:'area',       tags:['nature','area','dot'],           cd:2.9,  dmg:6, spd:0,   color:'#A8E06A', size:24},
  frostring:  {name:'寒冰环',    icon:'❋',  type:'pulse',      tags:['ice','area','pulse','slow'],     cd:2.5,  dmg:9, spd:0,   color:'#CFEFFF', size:30},
  spirit:     {name:'灵能箭',    icon:'➤',  type:'projectile', tags:['arcane','projectile','pierceable'], cd:0.9, dmg:9, spd:265, color:'#C3A8FF', size:5}
};

/* ---------- 行为模块（叠加规则按需求 §2；MVP 12 个） ---------- */
const MODULES = {
  multi:   {name:'多重',   icon:'≡', stack:'additive', max:4, requires:['projectile'], desc:'一次施放多生成 1 个攻击实例'},
  fan:     {name:'扇射',   icon:'⋔', stack:'additive', max:2, requires:['projectile'], desc:'以固定扇面同时发射，扩大覆盖'},
  split:   {name:'分裂',   icon:'⋉', stack:'additive', max:3, requires:['projectile'], desc:'命中/结束后分裂出 2 枚小子弹'},
  bounce:  {name:'反弹',   icon:'↺', stack:'additive', max:3, requires:['projectile'], desc:'命中后在附近目标间弹射 +1 次'},
  pierce:  {name:'穿透',   icon:'⇢', stack:'additive', max:3, requires:['projectile'], desc:'可额外穿透 +1 个目标'},
  orbit:   {name:'环绕',   icon:'◌', stack:'additive', max:3, requires:['projectile'], desc:'额外生成 1 个绕身旋转的弹体'},
  giant:   {name:'巨大',   icon:'⬤', stack:'additive', max:3, requires:['projectile','area','pulse'], desc:'体积/范围 +30%'},
  rapid:   {name:'急速',   icon:'»', stack:'tier',     max:3, requires:['projectile','pulse','chain'], desc:'冷却 -12%（乘区叠加）'},
  echo:    {name:'回响',   icon:'↻', stack:'tier',     max:2, requires:['area','pulse'], desc:'施放后 0.4s 追加一次 60% 伤害'},
  burn:    {name:'灼烧',   icon:'✹', stack:'tier',     max:3, requires:['fire','lightning','holy'], desc:'命中附加持续伤害'},
  frost:   {name:'冰缓',   icon:'✽', stack:'tier',     max:2, requires:['ice'], desc:'命中减速 35%，持续 1.2s'},
  vamp:    {name:'吸血',   icon:'♥', stack:'unique',   max:1, requires:['physical','poison'], desc:'伤害的 6% 回复自身生命'},
  chain:   {name:'连锁',   icon:'⛓', stack:'tier',   max:2, requires:['projectile','chain'],            desc:'命中后跳向附近另一个目标'},
  snipe:   {name:'狙击',   icon:'⌖', stack:'tier',   max:2, requires:['projectile'],                     desc:'弹速 +40%，伤害 +15%'},
  harvest: {name:'收割',   icon:'✂', stack:'unique', max:1, requires:['physical','fire','poison'],        desc:'每次击杀回复 1 点生命'},
  thunder: {name:'雷鸣',   icon:'⚡', stack:'tier',   max:2, requires:['lightning','arcane','holy'],       desc:'命中时 15% 概率落雷，造成范围伤害'},
  thornmail:{name:'荆棘',  icon:'✜', stack:'unique', max:1, requires:['nature','physical'],               desc:'受击时反弹 8 点伤害给攻击者'},
  overload:{name:'超载',   icon:'⚠', stack:'tier',   max:2, requires:['projectile','area','pulse'],       desc:'伤害 +25%，但范围 -10%'}
};

/* ---------- 属性 ---------- */
const ATTRS = {
  power:   {name:'攻击力',   icon:'⚔', base:1.0, step:0.08, fmt:v=>'+'+Math.round((v-1)*100)+'%'},
  haste:   {name:'攻速',     icon:'»', base:1.0, step:0.07, fmt:v=>'+'+Math.round((v-1)*100)+'%'},
  area:    {name:'范围',     icon:'◎', base:1.0, step:0.09, fmt:v=>'+'+Math.round((v-1)*100)+'%'},
  maxhp:   {name:'生命上限', icon:'♥', base:100, step:12,   fmt:v=>'+'+v+' HP'},
  speed:   {name:'移动速度', icon:'➤', base:62,  step:3,    fmt:v=>v+' px/s'},
  crit:    {name:'暴击率',   icon:'✹', base:0.05,step:0.05, fmt:v=>Math.round(v*100)+'%'},
  critdmg: {name:'暴击伤害', icon:'✦', base:1.5, step:0.15, fmt:v=>Math.round(v*100)+'%'},
  pickup:  {name:'拾取范围', icon:'◎', base:26,  step:9,    fmt:v=>'+'+v},
  armor:   {name:'减伤',     icon:'🛡', base:0,   step:0.04, fmt:v=>Math.round(v*100)+'%'},
  regen:   {name:'生命回复', icon:'✚', base:0,   step:0.35, fmt:v=>v.toFixed(2)+'/s'}
};

/* ---------- 道具（MVP 10 个；需求建议首版 50，此处仅演示规则） ---------- */
const ITEMS = {
  glove:    {name:'铁匠手套', icon:'🧤', tier:1, desc:'攻击力 +12%',                  apply:s=>{s.power*=1.12}},
  boots:    {name:'轻羽靴',   icon:'👟', tier:1, desc:'移动速度 +10%',                apply:s=>{s.speed*=1.10}},
  lens:     {name:'放大镜',   icon:'🔍', tier:1, desc:'范围 +12%',                    apply:s=>{s.area*=1.12}},
  ring:     {name:'疾风戒',   icon:'💍', tier:1, desc:'攻速 +12%',                    apply:s=>{s.haste*=1.12}},
  magnet:   {name:'吸铁石',   icon:'🧲', tier:1, desc:'拾取范围 +10',                 apply:s=>{s.pickup+=10}},
  plate:    {name:'铁胸甲',   icon:'🛡', tier:1, desc:'减伤 +6%',                     apply:s=>{s.armor+=0.06}},
  heart:    {name:'生命护符', icon:'💗', tier:2, desc:'生命上限 +25 并立即回满',       apply:s=>{s.maxhp+=25;s.hp=s.maxhp}},
  ember:    {name:'余烬核心', icon:'🔥', tier:2, desc:'火/圣标签伤害 +25%',           apply:s=>{s.tagBonus=s.tagBonus||{};s.tagBonus.fire=(s.tagBonus.fire||0)+0.25}},
  shard:    {name:'寒霜碎片', icon:'🧊', tier:2, desc:'冰标签技能冷却 -18%',          apply:s=>{s.tagCdr=s.tagCdr||{};s.tagCdr.ice=(s.tagCdr.ice||0)+0.18}},
  coin:     {name:'贪婪硬币', icon:'🪙', tier:2, desc:'金币获取 +30%',                apply:s=>{s.greed=(s.greed||0)+0.3}},
  whet:     {name:'磨刀石',   icon:'🪨', tier:1, desc:'攻击力 +10%',             apply:s=>{s.power*=1.10}},
  battery:  {name:'电池',     icon:'🔋', tier:1, desc:'攻速 +10%',               apply:s=>{s.haste*=1.10}},
  biglens:  {name:'广角镜',   icon:'🔭', tier:1, desc:'范围 +10%',               apply:s=>{s.area*=1.10}},
  boots2:   {name:'疾风靴',   icon:'👢', tier:1, desc:'移动速度 +8%',            apply:s=>{s.speed*=1.08}},
  alloy:    {name:'合金板',   icon:'⬛', tier:1, desc:'减伤 +5%',                apply:s=>{s.armor+=0.05}},
  fang:     {name:'獠牙',     icon:'🦷', tier:1, desc:'暴击率 +6%',              apply:s=>{s.crit+=0.06}},
  scope:    {name:'瞄准镜',   icon:'🎯', tier:1, desc:'暴击伤害 +25%',           apply:s=>{s.critdmg+=0.25}},
  magnet2:  {name:'强磁铁',   icon:'🧲', tier:1, desc:'拾取范围 +12',            apply:s=>{s.pickup+=12}},
  medkit:   {name:'急救包',   icon:'🧰', tier:1, desc:'生命上限 +10 并立即回满', apply:s=>{s.maxhp+=10;s.hp=s.maxhp}},
  prism:    {name:'棱镜',     icon:'🔮', tier:2, desc:'全部标签伤害 +8%',        apply:s=>{s.tagAll=(s.tagAll||0)+0.08}}
};
const ELITE_POOL = ['heart','ember','shard','coin'];

/* ---------- 角色（需求 §6：6 角色 + 正负天赋 + 初始技能） ---------- */
const CHARS = [
  {id:'knight', name:'铁拳骑士', spr:'heroA', col:'b',
   pos:'受击后 2s 内攻击力 +20%', neg:'移动速度 -10%',
   start:'fireball', stats:{power:1.0,speedMul:0.90,maxhp:120}},
  {id:'mage', name:'秘术学徒', spr:'heroB', col:'p',
   pos:'行为模块冷却效果 +25%', neg:'生命上限 -20',
   start:'arcane', stats:{power:1.1,maxhp:80}},
  {id:'ranger', name:'荒野游侠', spr:'heroC', col:'g',
   pos:'投射物速度 +25%，拾取范围 +50%', neg:'减伤 -5%（更脆）',
   start:'ice_spear', stats:{power:0.95,speedMul:1.15,maxhp:90,projSpd:1.25,pickup:39}},
  {id:'monk', name:'苦行僧', spr:'heroA', col:'t',
   pos:'生命回复 +0.5/s', neg:'攻击力 -12%',
   start:'thorn', stats:{power:0.88,regen:0.5,maxhp:110}},
  {id:'summoner', name:'图腾师', spr:'heroB', col:'g',
   pos:'召唤类技能冷却 -30%', neg:'主动技能伤害 -10%',
   start:'sentry', stats:{power:0.9,maxhp:95}},
  {id:'zealot', name:'狂信者', spr:'heroA', col:'r',
   pos:'暴击率 +12%，暴击伤害 +40%', neg:'受到伤害 +15%',
   start:'holybolt', stats:{power:1.05,crit:0.17,critdmg:1.9,maxhp:90,armor:-0.15}}
];

/* ---------- 闯关配置（土豆兄弟式波次） ----------
   用户指令 2026-10-12：去掉树形地图，改为波次闯关（见 decisions.md D-11） */
const RUN = {
  waves: 20,          // 一局总波数（土豆兄弟式）
  bossEvery: 10,      // 每 N 波一个 BOSS 波（10、20、30…）
  eliteEvery: 3,      // 每 N 波出精英（BOSS 波除外）
  eliteDoubleFrom: 12,// 从第 N 波起精英出 2 只
  baseTime: 18,       // 第 1 波时长（秒）
  timeStep: 3,        // 每几个波加一次时长
  timeEvery: 3,
  canContinue: true   // 打通 20 波后可以选择继续（无限）
};
function waveTime(n){ return RUN.baseTime + Math.floor((n-1)/RUN.timeEvery) * RUN.timeStep; }
function isBossWave(n){ return n % RUN.bossEvery === 0; }
function isEliteWave(n){ return !isBossWave(n) && n % RUN.eliteEvery === 0; }
function eliteCount(n){ return n >= RUN.eliteDoubleFrom ? 2 : 1; }
