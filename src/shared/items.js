// 游戏里的东西和默认设置（纯数据，服务器也能加载）
const CATCH_DEFAULT = { hero: 'bit', heroSize: 90, fall: 3, sky: '#BDE6FF', ground: '#8FD18F', items: [{ icon: '🦴', score: 1, w: 1 }], grow: false, auto: false };
const CACTUS = { name: '仙人掌', icon: '🌵', eat: false, w: 1 };
const RUN_DEFAULT = { hero: 'bit', heroSize: 90, theme: '白天', speed: 6, jump: 16, gravity: 0.8, items: [CACTUS], showScore: false, step: 1, lives: 0, timer: 0, speedUp: false, energy: false, drain: 5, auto: false, bugLeak: false, bugFloat: false, bugGhost: false };
const BUG = { name: '毛毛虫', sprite: 'worm', score: 1, w: 1 };
const WHACK_DEFAULT = { hero: 'bit', sky: '#BDE6FF', grass: '#9BD77E', rows: 2, cols: 4, every: 1, stay: 1.5, showScore: false, timer: 0, speedUp: false, timeGap: 10, items: [BUG], auto: false };

// 路上的东西
const BATTERY = { name: '电池', icon: '🔋', eat: true, energy: 30, w: 1 };
const DONUT = { name: '甜甜圈', icon: '🍩', eat: true, score: 5, w: 1 };
const MUSH = { name: '蘑菇', icon: '🍄', eat: false, w: 1 };
const BURGER = { name: '汉堡', icon: '🍔', eat: true, score: 3, w: 1 };
const CACTUS2 = Object.assign({}, CACTUS, { w: 2 });
const RUN_V1 = { items: [CACTUS] };
const RUN_V2 = { items: [CACTUS2, BATTERY, DONUT], showScore: true, lives: 3, timer: 60, speedUp: true, energy: true };
const RUN_BUGGY = Object.assign({}, RUN_V2, { bugLeak: true, bugFloat: true, bugGhost: true });
// 抓虫子：洞里冒出来的道具（图案是自己画的，所有电脑上都一样）
const MOSQ = { name: '蚊子', sprite: 'mosq', score: 5, w: 1 };
const BFLY = { name: '蝴蝶', sprite: 'bfly', score: -3, w: 1 };
const ALARM = { name: '闹钟', sprite: 'alarm', score: 0, sec: 5, w: 1 };
const WHACK_V1 = { items: [BUG] };
// 比特回家：场上的东西（hit：碰到会怎样；move：会不会走来走去）
const HOME_DEFAULT = { hero: 'bit', move: false, items: [{ icon: '🦴', n: 5, hit: '' }, { icon: '💧', n: 3, hit: '' }, { icon: '🐱', n: 1, hit: '', move: true }], showScore: false, lives: 0, level: false, auto: true };
const HOME_V0 = {};
const HOME_V1 = { move: true };
const HOME_V2 = { move: true, items: [{ icon: '🦴', n: 5, hit: 'score' }, { icon: '💧', n: 3, hit: 'slow' }, { icon: '🐱', n: 1, hit: 'life', move: true }], showScore: true, lives: 3 };
const HOME_V3 = Object.assign({}, HOME_V2, { level: true });

// ===== 第二季：贪吃蛇格子、会说话的游戏角色 =====
// 贪吃蛇格子图（纸片蛇、蛇身预测赛）：cells 第一个是头；行、列都从 1 开始数
// o.labels 显示行号格号；o.food { 'r,c': 食物名 }；o.mark { 'r,c': 额外的 class }
const SNAKE_FOOD = { 苹果: { icon: '🍎', 长: 1 }, 金苹果: { icon: '🌟', 长: 3 }, 剪刀: { icon: '✂️', 剪: 2 } };
function snakeGrid(size, cells, o) {
  o = o || {};
  const at = {}; (cells || []).forEach((x, i) => { at[x[0] + ',' + x[1]] = i; });
  let h = `<div class="sgrid${o.labels ? ' lab' : ''}${o.cls ? ' ' + o.cls : ''}" style="--n:${size}">`;
  if (o.labels) { h += '<i class="lb"></i>'; for (let c = 1; c <= size; c++) h += `<i class="lb">${c}</i>`; }
  for (let r = 1; r <= size; r++) {
    if (o.labels) h += `<i class="lb">${r}</i>`;
    for (let c = 1; c <= size; c++) {
      const k = r + ',' + c, i = at[k], f = o.food && o.food[k];
      h += `<b class="sc${i === 0 ? ' head' : i != null ? ' body' : ''}${o.mark && o.mark[k] ? ' ' + o.mark[k] : ''}" data-rc="${k}">${i === 0 ? '<span class="hat"></span>' : ''}${f && i == null ? `<span class="fd">${(SNAKE_FOOD[f] || {}).icon || f}</span>` : ''}</b>`;
    }
  }
  return h + '</div>';
}
const snakeStepText = st => st.d + (st.food ? `（吃到${st.food}${(SNAKE_FOOD[st.food] || {}).icon || ''}）` : '');

// 会说话的游戏角色（第二季第 21、22 课）
const NPC_LOOKS = ['🧙', '👵', '👴', '🧑‍🍳', '🦉', '🐻', '🦊', '🤖', '🐲', '🧚'];
const GATE_LOOKS = ['💂', '🛡️', '🦁', '🐉', '🤖', '🐺', '🦉', '🧌'];
const NPC_ROLES = ['店主', '村长', '面包师', '图书管理员', '守林人', '证人'];
const NPC_TRAITS = ['热情', '害羞', '爱讲笑话', '神秘', '凶巴巴', '慢吞吞'];
// 游戏画面：背景 + 角色 + 说话气泡（门卫多一扇门，开门时 o.open）
function npcScene(c, o) {
  c = c || {}; o = o || {};
  const gate = o.kind === 'gate';
  return `<div class="npcscene ${gate ? 'gate' : 'town'}${o.open ? ' open' : ''}${o.cls ? ' ' + o.cls : ''}">
    <div class="bg">${gate ? '<div class="wall"></div><div class="door"><span class="leaf"></span><b>💎</b></div>' : '<div class="house">🏠</div><div class="tree">🌳</div><div class="tree t2">🌲</div>'}</div>
    <div class="who"><div class="face">${esc(c.look || (gate ? '💂' : '🧙'))}</div><div class="nm">${esc(c.name || (gate ? '门卫' : '小镇居民'))}${c.role && !gate ? `<small>${esc(c.role)}</small>` : ''}</div></div>
    <div class="nbub">${esc(o.say != null ? o.say : (c.hello || '……'))}</div></div>`;
}

// 第二季的题目和演示：题目旁边要给孩子看的东西（精灵的计划、怪兽的样子、一段代码、一张表、一张格子图、报错）
const MAP_FACE = { '#': '', '.': '', S: '🚩', E: '🏠', '*': '⭐', '^': '🔺' };
function mapMiniHTML(rows) {
  const w = Math.max(1, ...rows.map(r => r.length));
  return `<div class="qmap" style="grid-template-columns:repeat(${w},1fr)">${rows.map(r => Array.from({ length: w }, (_, j) => { const c = r[j] || '#'; return `<i class="${c === '#' ? 'w' : ''}">${MAP_FACE[c] || ''}</i>`; }).join('')).join('')}</div>`;
}
function quizShowHTML(o) {
  if (!o) return '';
  let h = '';
  if (o.who) h += `<div class="qwho">${esc(o.who)}</div>`;
  if (o.pic) h += `<div class="qpic"><span>${esc(o.pic)}</span>${o.cap ? `<b>${esc(o.cap)}</b>` : ''}</div>`;
  if (o.plan) h += `<div class="qplan"><div class="qlbl">精灵的计划</div><ol>${o.plan.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>`;
  if (o.table) h += `<table class="qtable"><tr>${o.table.head.map(x => `<th>${esc(x)}</th>`).join('')}</tr>${o.table.rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</table>`;
  if (o.map) h += mapMiniHTML(o.map);
  if (o.err) h += `<div class="qerr">${esc(o.err)}</div>`;
  if (o.code) h += `<div class="qcode">${String(o.code).split('\n').map((l, i) => `<div class="${o.hl === (o.from || 1) + i ? 'hot' : ''}"><span>${(o.from || 1) + i}</span>${esc(l) || ' '}</div>`).join('')}</div>`;
  if (o.note) h += `<div class="qnote">${esc(o.note)}</div>`;
  return `<div class="qshow">${h}</div>`;
}
