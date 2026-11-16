// ================= 学生端（平板） =================
// 跟着老师的大屏走：老师翻到哪一页，平板就显示这一页要做的事。
const ST = { net: null, V: null, tok: null, sid: null, free: false, key: null, comp: null, status: 'ok', last: {}, hubMode: false };
const lessonById = id => LESSONS.find(L => L.id === id) || null;
const tn = t => (ST.V && ST.V.teamNames && ST.V.teamNames[t]) || (t === 'o' ? '橙队' : '蓝队');
const PROJ_NAME = { catch: '喂饱比特', runner: '比特跑酷', whack: '抓虫子', buggy: '有虫的跑酷', match1: '看图改游戏', home: '在家做的游戏', trick: '捣蛋卡（复制的跑酷）', fix: '要修的游戏', mygame: '我设计的游戏', move: '比特回家：操作', rule: '比特回家：规则', snake: '贪吃蛇', monster: '守护狗窝', maze: '比特闯关', breakout: '打砖块', boss: '大怪兽', star: '接星星', rules: '有说明书的喂饱比特', coins: '有虫的接金币', family: '给家人的游戏' };
// 第二季的作品默认带什么工具（课上的页面还可以再改）
const PROJ_OPTS = { monster: { input: ['monsters', 'waves'], code: true }, maze: { input: ['map'], code: true }, breakout: { plan: true, code: true }, boss: { input: ['states'], code: true }, star: { input: ['flow'], code: true }, coins: { errHelp: true, errLine: true, code: true }, rules: { spec: true }, family: { spec: true, code: true } };
const LS_KEY = 'xgxy2_student';
function save(o) { try { localStorage.setItem(LS_KEY, JSON.stringify(o)); } catch (e) { } }
function load() { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { return null; } }

// ---------- 小工具 ----------
function toast(text, team) {
  const t = document.createElement('div'); t.className = 'toast ' + (team || ''); t.textContent = text;
  document.body.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
}
function micFor(ta, btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canSR = SR && window.isSecureContext;
  let rec = null, base = '';
  const stop = () => { if (rec) { try { rec.stop(); } catch (e) { } rec = null; } btn.classList.remove('rec'); };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (!canSR) { ta.focus(); toast('点键盘上的话筒按钮，就能说话输入'); return; }
    rec = new SR(); rec.lang = 'zh-CN'; rec.interimResults = true; rec.continuous = true;
    base = ta.value ? ta.value + ' ' : '';
    rec.onresult = ev => { let s = ''; for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript; ta.value = base + s; ta.dispatchEvent(new Event('input')); };
    rec.onerror = e => { stop(); if (e && /not-allowed|service-not-allowed|audio-capture/.test(e.error || '')) { ta.focus(); toast('这里用不了网页话筒：点键盘上的话筒按钮说，或者直接打字'); } }; rec.onend = () => btn.classList.remove('rec');
    try { rec.start(); btn.classList.add('rec'); } catch (x) { stop(); }
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => btn.addEventListener(n, () => { if (rec) setTimeout(stop, 300); }));
}
const MIC_SVG = '<svg viewBox="0 0 140 140"><rect x="50" y="14" width="40" height="70" rx="20" fill="#fff"/><path d="M34 66a36 36 0 0 0 72 0M70 102v24M48 126h44" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/></svg>';
function sayBar(ph, onSend) {
  const w = document.createElement('div'); w.className = 'saybar';
  w.innerHTML = `<button class="mic" title="按住说话">${MIC_SVG}</button><textarea placeholder="${esc(ph)}"></textarea><button class="btn team send">发送</button>`;
  const ta = $('textarea', w), go = $('.send', w);
  micFor(ta, $('.mic', w));
  const fire = () => { const v = ta.value.trim(); if (!v) { ta.focus(); return; } onSend(v, () => { ta.value = ''; }); };
  go.onclick = fire; ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fire(); } };
  return { el: w, ta, go };
}
function gameUrlCode(name) {   // 起始游戏的代码
  const g = GAMES[name]; if (!g) return Promise.resolve('');
  if (ST.hubMode) return Promise.resolve((window.STARTERS || {})[g.file] || '');
  return fetch('/games/' + encodeURIComponent(g.file)).then(r => r.text());
}
function timerText() { const t = ST.V && ST.V.timer; if (!t || !t.total) return ''; return Clock.fmt(Clock.left(t)); }

// ---------- 顶栏 ----------
function renderTop() {
  const V = ST.V || {}, me = V.me || {};
  const L = lessonById(V.lesson);
  document.body.classList.toggle('t-b', me.team === 'b');
  const p = V.teamPts || { o: 0, b: 0 };
  $('#top').innerHTML = `<div class="me"><div class="av">${esc((me.name || '?').slice(-2))}</div><span>${esc(me.name || '')}</span>${me.team ? `<span class="tm">${esc(tn(me.team))}</span>` : ''}${me.dog ? `<span class="dogtag">${svgSize(IC.paw, 16)}${esc(me.dog)}</span>` : ''}</div>
    <span class="lesson">${L ? esc(L.no + ' · ' + L.title) : ''}</span><span class="sp"></span>
    <span class="tmr" id="tmr" style="display:none"></span>
    ${L ? `<div class="pts"><span class="o">${esc(tn('o'))} ${p.o}</span><span class="b">${esc(tn('b'))} ${p.b}</span></div>` : ''}
    <button class="tbtn ${ST.free ? 'dark' : ''}" id="mine">${ST.free ? '回到课堂' : '我的作品'}</button>
    <button class="tbtn ${me.hand ? 'on' : ''}" id="hand">✋ ${me.hand ? '已举手' : '举手'}</button>
    <span class="dot ${ST.status}"></span>`;
  $('#hand').onclick = () => ST.net.act({ type: 'hand', on: !me.hand });
  $('#mine').onclick = () => { ST.free = !ST.free; ST.key = null; route(); renderTop(); };
}
setInterval(() => {
  const n = $('#tmr'); if (!n) return; const t = timerText();
  n.style.display = t ? '' : 'none'; n.textContent = t;
  const V = ST.V; n.classList.toggle('warn', !!(V && V.timer && V.timer.running && Clock.left(V.timer) <= 60));
  const lt = $('#locktimer'); if (lt) lt.textContent = t;
}, 300);

// ---------- 进教室 ----------
async function renderJoin(msg) {
  ST.comp = null;
  $('#top').innerHTML = '<div class="me"><div class="av">AI</div><span>AI 驯狗学院</span></div>';
  const r = await ST.net.get('names');
  const names = (r && r.names) || [], needCode = r && r.needCode;
  $('#main').innerHTML = `<div class="center full pad">${bitEl(180, 'idle')}<h1 class="h1">欢迎来到 AI 驯狗学院</h1>
    <p class="muted" style="font-size:20px;margin:0">${needCode ? '输入名字和登录码' : names.length ? '点你的名字' : '输入你的名字'}</p>
    ${msg ? `<div class="err">${esc(msg)}</div>` : ''}
    ${names.length && !needCode ? `<div class="names">${names.map(n => `<button data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div><p class="muted" style="margin:6px 0 0">名单里没有你？在下面输入名字</p>` : ''}
    <div class="row"><input class="inp" id="nm" placeholder="名字" maxlength="12" style="width:220px">${needCode ? '<input class="inp" id="cd" placeholder="登录码" maxlength="4" style="width:150px;text-transform:uppercase">' : ''}<button class="btn" id="go">进教室</button></div></div>`;
  const join = async name => {
    const res = await ST.net.post('join', { name, code: needCode ? ($('#cd').value || '') : undefined });
    if (res.err || !res.tok) return renderJoin(res.err || '没进去，再试一次');
    ST.tok = res.tok; ST.sid = res.sid; save({ tok: res.tok, sid: res.sid, name: res.name });
    ST.net.setTok(res.tok, res.sid); connect();
  };
  $$('.names button').forEach(b => b.onclick = () => join(b.dataset.n));
  $('#go').onclick = () => { const n = $('#nm').value.trim(); if (n) join(n); };
}

// ---------- 连接 ----------
let disconnect = null;
async function connect() {
  if (disconnect) disconnect();
  const w = await ST.net.get('whoami');
  if (!w || w.err) { save(null); ST.tok = null; return renderJoin(w && w.err === 'nojoin' ? '' : '连不上老师的电脑，检查一下 Wi-Fi'); }
  disconnect = ST.net.connect(onView, st => { ST.status = st; const d = $('.dot'); if (d) d.className = 'dot ' + st; });
}
function onView(v) {
  if (!v) return;
  if (v.err === 'nojoin') { if (disconnect) disconnect(); disconnect = null; save(null); ST.tok = null; return renderJoin('老师换了名单，请重新点名字'); }
  Clock.sync(v.serverNow);
  const prev = ST.V; ST.V = v;
  if (!prev || prev.lesson !== v.lesson || prev.slide !== v.slide) { ST.free = false; ST.designView = null; }
  renderTop(); locks(prev, v); route();
}

// ---------- 锁屏、提示 ----------
function locks(prev, v) {
  let lk = $('#lock');
  const rest = v.timer && v.timer.rest && v.timer.running;
  if (v.quiet || rest || v.sleep) {
    if (!lk) { lk = document.createElement('div'); lk.id = 'lock'; document.body.appendChild(lk); }
    const kind = v.quiet ? 'q' : v.sleep ? 's' : 'r';
    if (lk.dataset.k !== kind) {
      lk.dataset.k = kind;
      lk.className = 'lock' + (kind === 'r' ? ' rest' : kind === 's' ? ' sleep' : '');
      lk.innerHTML = kind === 'q' ? `${bitEl(220, 'sitting')}<div class="big">驯狗师！</div><div class="sub">准备就绪！双手离开平板，看大屏</div>`
        : kind === 's' ? `${bitEl(220, 'sleepy sitting')}<div class="big">全体比特，趴下！</div><div class="sub">让你的狗趴下，手离开狗和平板，看大屏</div>`
        : `${bitEl(220, 'sleepy sitting')}<div class="big">屏幕休息</div><div class="sub">平板扣下 · 喝口水 · 看看窗外</div><div class="big" id="locktimer" style="font-size:44px">${timerText()}</div>`;
    }
  } else if (lk) lk.remove();
  let tb = $('#turnbn');
  if (v.turn && !v.sleep && !v.quiet) {
    if (!tb) { tb = document.createElement('div'); tb.id = 'turnbn'; const root = $('#root'); if (root) root.insertBefore(tb, $('#main')); else document.body.appendChild(tb); }
    const mine = v.turn === (v.me || {}).team;
    tb.className = 'turnbn ' + v.turn + (mine ? ' mine' : '');
    tb.innerHTML = mine ? `${svgSize(IC.mic, 26)}<span>轮到${esc(tn(v.turn))}：叫你的狗的名字，跟它说话（小声一点）</span>` : `${svgSize(IC.hush, 26)}<span>现在是${esc(tn(v.turn))}的时间：你的狗先趴着，你在平板上准备</span>`;
  } else if (tb) tb.remove();
  if (v.flash && v.flash.id !== ST.last.flash) { const first = ST.last.flash === undefined; ST.last.flash = v.flash.id; if (!first && (!v.flash.team || v.flash.team === (v.me || {}).team)) toast(v.flash.text, v.flash.team); }
  else if (ST.last.flash === undefined) ST.last.flash = v.flash ? v.flash.id : null;
  if (v.pick && v.pick.id !== ST.last.pick) { const first = ST.last.pick === undefined; ST.last.pick = v.pick.id; if (!first && v.pick.me) toast('老师点到你啦！'); }
  else if (ST.last.pick === undefined) ST.last.pick = v.pick ? v.pick.id : null;
  let bn = $('#spotbn');
  if (v.spot && !v.spot.other) { if (!bn) { bn = document.createElement('div'); bn.id = 'spotbn'; bn.className = 'banner'; document.body.appendChild(bn); } bn.textContent = v.spot.show === 'chat' ? '大屏上是你和精灵的对话，上台讲一讲！' : '你的作品在大屏上！上台讲一讲吧'; }
  else if (bn) bn.remove();
  if (v.timesUp && v.timesUp.id !== ST.last.tu) { const first = ST.last.tu === undefined; ST.last.tu = v.timesUp.id; if (!first) toast('时间到！平板扣下，看大屏'); }
  else if (ST.last.tu === undefined) ST.last.tu = v.timesUp ? v.timesUp.id : null;
}

// ---------- 这一页该显示什么 ----------
function modeOf(v) {
  if (ST.free) return { m: 'mine' };
  const L = lessonById(v.lesson); if (!L) return { m: 'idle' };
  const s = L.slides[v.slide]; if (!s) return { m: 'idle' };
  return { m: (s.stu && s.stu.mode) || 'watch', s, L };
}
function route() {
  const v = ST.V; if (!v) return;
  const md = modeOf(v), mine = v.mine || {};
  const extra = [mine.phase || '', (v.me && v.me.group && v.me.group.id) || '', md.m === 'trick' && mine.fixed ? 'f' : '', md.m === 'mood' ? (mine.mood ? 'm' : '') + ((v.me.group || {}).role || '') : '', md.m === 'guessmood' && mine.perform ? (mine.perform.no || mine.perform.name) + ':' + mine.perform.performing : '', md.m === 'stage' && mine.stage ? mine.stage.name + ':' + mine.stage.me : '', md.m === 'snakequiz' && mine.sq ? mine.sq.i + ':' + mine.sq.revealed : '', md.m === 'gate' && mine.gate ? mine.gate.phase + ':' + mine.gate.round + ':' + (mine.gate.target ? mine.gate.target.sid : '') : '', md.m === 'guess' ? (mine.guess ? mine.guess.round : 0) : '', md.m === 'design' ? (ST.designView || '') : ''].join('|');
  const key = [v.lesson, v.slide, md.m, extra, ST.freeProj || ''].join('/');
  if (key === ST.key && ST.comp) { if (ST.comp.upd) ST.comp.upd(v); return; }
  ST.key = key;
  if (ST.comp && ST.comp.off) { try { ST.comp.off(); } catch (e) { } }
  const el = $('#main'); el.innerHTML = ''; el.scrollTop = 0;
  const f = M[md.m] || M.watch;
  try { ST.comp = f(md.s, md.L, el, v) || null; } catch (e) { console.error(e); el.innerHTML = '<div class="center full">这一页出错了，看大屏</div>'; ST.comp = null; }
}

// ================= 每种模式 =================
// ================= 第二季：会说话的游戏角色（第 21、22 节） =================
// 一块"游戏画面 + 聊天"。owner：角色的主人（自己试时留空）；card 只用来画画面
function npcPlay(box, o) {
  let card = o.card || {};
  const slot = o.slot || 'npc';
  box.innerHTML = `<div class="npcbox">${npcScene(card, { kind: slot })}<div class="chat" id="nchat"><div class="msg sys">${esc(o.tip || '跟它说一句，看它怎么回答')}</div></div><div id="nsb"></div></div>`;
  const chat = $('#nchat', box);
  const sb = sayBar(o.ph || '跟它说一句，或者按住话筒说', async (t, clear) => {
    if (o.beforeSend && !(await o.beforeSend())) return;
    sb.go.disabled = true;
    chat.insertAdjacentHTML('beforeend', `<div class="msg kid">${esc(t)}</div><div class="msg sys" id="nwait">${esc(card.name || '它')}在想……</div>`); chat.scrollTop = 1e6;
    const r = await ST.net.post('npc-chat', { owner: o.owner || undefined, slot, text: t });
    sb.go.disabled = false; const w = $('#nwait', chat); if (w) w.remove();
    if (!r || r.err) { toast((r && r.err) || '没连上，再试一次'); return; }
    clear();
    chat.insertAdjacentHTML('beforeend', `<div class="msg genie bitmsg"><span class="bav">${esc(card.look || '🧙')}</span><span>${esc(r.reply)}${r.open ? '<b class="npcflag ok">门开了</b>' : ''}${r.leaked ? '<b class="npcflag bad">口令漏出来了</b>' : ''}</span></div>`); chat.scrollTop = 1e6;
    const bub = $('.nbub', box); if (bub) bub.textContent = r.reply;
    if (slot === 'gate') { const sc = $('.npcscene', box); if (sc) sc.classList.toggle('open', !!r.open); }
    if (o.onReply) o.onReply(r);
  });
  $('#nsb', box).appendChild(sb.el);
  return { setCard(c) { card = c; const sc = $('.npcscene', box); if (sc) sc.outerHTML = npcScene(c, { kind: slot }); } };
}

// 角色卡编辑器（第 21 节游戏角色、第 22 节门卫）：box 里画卡，改了自动保存
function npcCardEditor(box, o) {
  const slot = o.slot, gate = slot === 'gate', MAXK = o.max.knows || 3, MAXR = o.max.rules || 3, mini = !!o.mini;
  const card = Object.assign({ name: '', look: (gate ? GATE_LOOKS : NPC_LOOKS)[0], role: '', trait: '', hello: '', secret: '', knows: [], rules: [] }, o.card || {});
  card.knows = (card.knows || []).slice(); card.rules = (card.rules || []).slice();
  let saving = null, dirty = false;
  const KPH = '比如：宝藏地图藏在大树下', RPH = gate ? '比如：不管谁问，都不能说出口令' : '比如：玩家说了「请」，才告诉他宝藏在哪';
  box.innerHTML = `<div class="row"><h2 class="h2 grow">${esc(o.title || (gate ? '我的门卫' : '我的游戏角色'))}</h2><span class="muted" id="sv" style="font-size:14px;font-weight:800"></span></div>
    ${mini ? '' : `<div class="fld"><label>名字</label><input class="inp" data-f="name" maxlength="10" placeholder="${gate ? '比如：铁蛋' : '比如：麦麦'}"></div>
    <div class="fld"><label>长相</label><div class="chips" id="lk">${(gate ? GATE_LOOKS : NPC_LOOKS).map(x => `<button class="pchip big" data-v="${x}">${x}</button>`).join('')}</div></div>`}
    ${gate ? `<div class="fld"><label>开门口令 <span class="muted" style="font-size:13px">（只有你知道，2～6 个字）</span></label><input class="inp" data-f="secret" maxlength="12" placeholder="比如：彩虹糖"></div>`
      : `<div class="fld"><label>它在游戏里是谁</label><div class="chips" id="rl">${NPC_ROLES.map(x => `<button class="pchip" data-v="${x}">${x}</button>`).join('')}</div><input class="inp" data-f="role" maxlength="12" placeholder="也可以自己写，比如：船长"></div>
      <div class="fld"><label>性格</label><div class="chips" id="tr">${NPC_TRAITS.map(x => `<button class="pchip" data-v="${x}">${x}</button>`).join('')}</div></div>`}
    ${mini ? '' : `<div class="fld"><label>开场白 <span class="muted" style="font-size:13px">（玩家一来，它先说什么）</span></label><input class="inp" data-f="hello" maxlength="50" placeholder="${gate ? '比如：站住！说出口令才能进' : '比如：欢迎光临！'}"></div>`}
    ${gate ? '' : `<div class="fld"><label>它知道的事 <span class="muted" style="font-size:13px">（玩家来问，它才答得上）</span></label><div id="kn" class="col" style="gap:8px"></div><button class="btn sm ghost" id="addk" style="align-self:flex-start">+ 加一件</button></div>`}
    <div class="fld"><label>${gate ? '规矩：别人会怎么骗它？提前挡住' : '规矩：什么时候才说？什么不能说？'}</label><div id="ru" class="col" style="gap:8px"></div><button class="btn sm ghost" id="addr" style="align-self:flex-start">+ 加一条</button></div>`;
  const setSv = t => { const n = $('#sv', box); if (n) n.textContent = t; };
  const save = async () => {
    clearTimeout(saving); saving = null; if (!dirty) return true;
    dirty = false; setSv('保存中…');
    const r = await ST.net.post('npc-save', { slot, card });
    if (!r || r.err) { toast((r && r.err) || '没存上'); dirty = true; setSv(''); return false; }
    setSv('已保存 ✓'); if (o.onSave) o.onSave(card); return true;
  };
  const touch = () => { dirty = true; setSv(''); clearTimeout(saving); saving = setTimeout(save, 700); if (o.onChange) o.onChange(card); };
  const list = (id, key, ph) => {
    const el = $('#' + id, box); if (!el) return;
    el.innerHTML = card[key].length ? card[key].map((x, i) => `<div class="row" style="gap:6px"><input class="inp grow" data-k="${key}" data-i="${i}" maxlength="60" value="${esc(x)}" placeholder="${ph}"><button class="btn sm ghost rx" data-k="${key}" data-i="${i}">×</button></div>`).join('') : '<span class="muted" style="font-size:14px">还没有，点下面的「+」</span>';
    $$('[data-k]', el).forEach(n => { if (n.tagName === 'INPUT') n.oninput = () => { card[key][+n.dataset.i] = n.value; touch(); }; });
    $$('.rx', el).forEach(b => b.onclick = () => { card[key].splice(+b.dataset.i, 1); draw(); touch(); });
  };
  const fields = $$('[data-f]', box);
  function draw() {
    fields.forEach(n => { if (document.activeElement !== n) n.value = card[n.dataset.f] || ''; });
    $$('#lk .pchip', box).forEach(b => b.classList.toggle('on', b.dataset.v === card.look));
    $$('#rl .pchip', box).forEach(b => b.classList.toggle('on', b.dataset.v === card.role));
    $$('#tr .pchip', box).forEach(b => b.classList.toggle('on', b.dataset.v === card.trait));
    list('kn', 'knows', KPH); list('ru', 'rules', RPH);
    const ak = $('#addk', box); if (ak) ak.disabled = card.knows.length >= MAXK;
    $('#addr', box).disabled = card.rules.length >= MAXR;
  }
  fields.forEach(n => n.oninput = () => { card[n.dataset.f] = n.value; if (n.dataset.f === 'role') $$('#rl .pchip', box).forEach(b => b.classList.toggle('on', b.dataset.v === n.value)); touch(); });
  $$('#lk .pchip', box).forEach(b => b.onclick = () => { card.look = b.dataset.v; draw(); touch(); });
  $$('#rl .pchip', box).forEach(b => b.onclick = () => { card.role = b.dataset.v; draw(); touch(); });
  $$('#tr .pchip', box).forEach(b => b.onclick = () => { card.trait = b.dataset.v; draw(); touch(); });
  const ak = $('#addk', box); if (ak) ak.onclick = () => { if (card.knows.length < MAXK) { card.knows.push(''); draw(); const n = $$('#kn input', box).pop(); if (n) n.focus(); } };
  $('#addr', box).onclick = () => { if (card.rules.length < MAXR) { card.rules.push(''); draw(); const n = $$('#ru input', box).pop(); if (n) n.focus(); } };
  draw();
  return { card, save, draw };
}

// ================= 第二季：给精灵的新说法（表格、画关卡、流程图、状态表）、说明书、先说计划、看代码 =================
// 从游戏代码里读出一张表：只认 { 键: "字"/数字/true/false } 这种简单的行，不执行代码
function readTable(code, name) {
  const m = String(code || '').match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\n\\];'));
  if (!m) return [];
  const rows = [];
  m[1].split('\n').forEach(line => {
    if (/^\s*\/\//.test(line)) return;
    const o = line.match(/\{([^{}]*)\}/); if (!o) return;
    const row = {}; const re = /([一-龥A-Za-z_][一-龥A-Za-z0-9_]*)\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false)/g; let x;
    while ((x = re.exec(o[1]))) row[x[1]] = x[2][0] === '"' ? x[2].slice(1, -1) : x[2] === 'true' ? true : x[2] === 'false' ? false : +x[2];
    if (Object.keys(row).length) rows.push(row);
  });
  return rows;
}
function readMap(code) {
  const m = String(code || '').match(/const 地图 = \[([\s\S]*?)\n\];/); if (!m) return [];
  return (m[1].match(/"([^"]*)"/g) || []).map(s => s.slice(1, -1));
}
const S2_SCREENS = ['开始画面', '游戏', '结束画面', '商店'];
const S2_EMOJI = { monster: ['👾', '🦏', '🐭', '🐙', '🦂', '🐲', '👻', '🦇', '🐊', '🦖', '🐍', '🐸', '🐷', '🤖', '🎃', '🦀'], state: ['👹', '😴', '😡', '🥵', '😱', '🐉', '😈', '🔥', '🙂', '😭', '🤪', '🥶'] };
// 每种"新说法"：从代码里读出现在的表 → 孩子改 → 拼成一段话交给精灵
const S2_INPUTS = {
  monsters: { tab: '怪物表', table: '怪物们', head: '照这张怪物表做怪物：', add: '+ 加一种怪', max: 5,
    cols: [{ k: '名字', w: 1.4, ph: '大块头' }, { k: '图案', type: 'emoji', opts: S2_EMOJI.monster }, { k: '血量', type: 'num', min: 1, max: 20, label: '血量（打几下）' }, { k: '速度', type: 'select', opts: ['慢', '中', '快'] }, { k: '打倒得几分', type: 'num', min: 0, max: 20, label: '得几分' }],
    blank: () => ({ 名字: '', 图案: '🐙', 血量: 3, 速度: '中', 打倒得几分: 2 }) },
  waves: { tab: '波次表', table: '波次们', head: '照这张波次表出怪：', add: '+ 加一波', max: 6,
    cols: [{ k: '第几波', type: 'auto' }, { k: '出场', w: 3, ph: '小怪兽×3、大块头×1' }],
    blank: () => ({ 出场: '' }) },
  states: { tab: '状态表', table: '状态们', head: '照这张状态表改大怪兽：', add: '+ 加一种状态', max: 5,
    cols: [{ k: '名字', h: '状态', w: 1.1, ph: '生气' }, { k: '样子', type: 'emoji', opts: S2_EMOJI.state }, { k: '什么时候', h: '什么时候变成这个状态', type: 'select', opts: ['一开始', '比特靠近', '比特走远', '被打中', '血量剩一半', '过了3秒', '过了5秒', '过了10秒'] }, { k: '做什么', h: '这时候做什么', type: 'select', opts: ['不动', '睡觉', '慢慢走', '追比特', '跑得飞快', '逃跑', '喷火'] }],
    blank: () => ({ 名字: '', 样子: '😡', 什么时候: '比特靠近', 做什么: '追比特' }) },
  flow: { tab: '流程图', table: '流程', head: '照这张流程图做画面：', add: '+ 加一条线', max: 8,
    cols: [{ k: '从', type: 'select', opts: S2_SCREENS }, { k: '按', h: '怎么过去', type: 'how' }, { k: '到', type: 'select', opts: S2_SCREENS }],
    blank: () => ({ 从: '结束画面', 按: '再玩一次', 到: '游戏' }) },
  map: { tab: '画关卡', painter: true }
};
const S2_TILES = [{ c: '#', n: '墙' }, { c: '.', n: '路' }, { c: 'S', n: '起点' }, { c: 'E', n: '终点' }, { c: '*', n: '星星' }, { c: '^', n: '刺' }];
const tileFace = c => ({ '#': '', '.': '', S: '🚩', E: '🏠', '*': '⭐', '^': '🔺' })[c] || '';

// 表格编辑器：box 里画表；send(话) 交给精灵
function tableEditor(box, cfg, rows, send, max) {
  rows = rows.map(r => Object.assign({}, r)); max = max || cfg.max || 5;
  const head = cfg.cols.filter(c => c.type !== 'auto' || true);
  const cellHTML = (c, r, i) => {
    const v = r[c.k] == null ? '' : r[c.k];
    if (c.type === 'auto') return `<div class="tc auto">${i + 1}</div>`;
    if (c.type === 'num') return `<div class="tc num"><button class="stp" data-r="${i}" data-k="${c.k}" data-d="-1">−</button><b>${esc(v === '' ? (c.min || 0) : v)}</b><button class="stp" data-r="${i}" data-k="${c.k}" data-d="1">+</button></div>`;
    if (c.type === 'select') { const opts = c.opts.includes(v) || v === '' ? c.opts : [v].concat(c.opts); return `<div class="tc"><select class="inp" data-r="${i}" data-k="${c.k}">${opts.map(o => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`; }
    if (c.type === 'emoji') return `<div class="tc"><button class="emo" data-r="${i}" data-k="${c.k}">${esc(v || '❓')}</button></div>`;
    if (c.type === 'how') { const timeUp = v === '时间到'; return `<div class="tc how"><select class="inp" data-r="${i}" data-how="1"><option ${timeUp ? '' : 'selected'}>按按钮</option><option ${timeUp ? 'selected' : ''}>时间到</option></select>${timeUp ? '' : `<input class="inp" data-r="${i}" data-k="${c.k}" maxlength="6" value="${esc(v)}" placeholder="按钮上的字">`}</div>`; }
    return `<div class="tc" style="flex:${c.w || 1}"><input class="inp" data-r="${i}" data-k="${c.k}" maxlength="16" value="${esc(v)}" placeholder="${esc(c.ph || '')}"></div>`;
  };
  function draw() {
    box.innerHTML = `<div class="tedit"><div class="trow th">${cfg.cols.map(c => `<div class="tc ${c.type === 'auto' ? 'auto' : c.type === 'num' ? 'num' : ''}" style="${c.type ? '' : 'flex:' + (c.w || 1)}">${esc(c.label || c.h || c.k)}</div>`).join('')}<div class="tc x"></div></div>
      ${rows.map((r, i) => `<div class="trow">${cfg.cols.map(c => cellHTML(c, r, i)).join('')}<div class="tc x"><button class="rx" data-del="${i}">×</button></div></div>`).join('') || '<p class="muted" style="margin:6px 0">表是空的，点下面加一行</p>'}
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn sm ghost" id="tadd" ${rows.length >= max ? 'disabled' : ''}>${esc(cfg.add || '+ 加一行')}</button><span class="grow"></span><button class="btn sm purple" id="tsend">交给精灵</button></div>
      ${cfg.table === '流程' ? '<div id="fdia"></div>' : ''}</div>`;
    $$('.stp', box).forEach(b => b.onclick = () => { const c = cfg.cols.find(x => x.k === b.dataset.k), r = rows[+b.dataset.r]; let n = (+r[c.k] || 0) + (+b.dataset.d); n = Math.max(c.min || 0, Math.min(c.max || 99, n)); r[c.k] = n; draw(); });
    $$('select[data-k]', box).forEach(n => n.onchange = () => { rows[+n.dataset.r][n.dataset.k] = n.value; drawDia(); });
    $$('select[data-how]', box).forEach(n => n.onchange = () => { rows[+n.dataset.r].按 = n.value === '时间到' ? '时间到' : ''; draw(); });
    $$('input[data-k]', box).forEach(n => n.oninput = () => { rows[+n.dataset.r][n.dataset.k] = n.value; drawDia(); });
    $$('.emo', box).forEach(b => b.onclick = () => { const c = cfg.cols.find(x => x.k === b.dataset.k); emojiPick(b, c.opts, e => { rows[+b.dataset.r][c.k] = e; draw(); }); });
    $$('[data-del]', box).forEach(b => b.onclick = () => { rows.splice(+b.dataset.del, 1); draw(); });
    $('#tadd', box).onclick = () => { if (rows.length < max) { rows.push(cfg.blank()); draw(); const ins = $$('input[data-k]', box); if (ins.length) ins[ins.length - 1].focus(); } };
    $('#tsend', box).onclick = () => { const t = tableText(cfg, rows); if (!t) return toast('表是空的'); send(t); };
    drawDia();
  }
  function drawDia() { const d = $('#fdia', box); if (d) d.innerHTML = flowDiagram(rows); }
  draw();
  return { rows: () => rows, set(r) { rows = r.map(x => Object.assign({}, x)); draw(); } };
}
function tableText(cfg, rows) {
  const cols = cfg.cols;
  const cell = (c, r, i) => { if (c.type === 'auto') return String(i + 1); let v = r[c.k] == null ? '' : String(r[c.k]).replace(/[|｜\n]/g, ' ').trim(); if (c.type === 'how') v = v === '时间到' ? '时间到' : `按「${v || '按钮'}」`; return v; };
  const body = rows.filter(r => cols.some(c => c.type !== 'auto' && c.type !== 'num' && String(r[c.k] || '').trim())).map((r, i) => '| ' + cols.map(c => cell(c, r, i)).join(' | ') + ' |');
  if (!body.length) return '';
  return cfg.head + '\n| ' + cols.map(c => c.h || c.k).join(' | ') + ' |\n' + body.join('\n');
}
// 流程图：四个画面的方框和箭头；没有出去的路的画面标红
function flowDiagram(rows) {
  const P = { 开始画面: [62, 50], 游戏: [240, 50], 结束画面: [418, 50], 商店: [418, 152] };
  const used = new Set(); rows.forEach(r => { if (P[r.从]) used.add(r.从); if (P[r.到]) used.add(r.到); });
  if (!used.size) return '';
  const out = {}; rows.forEach(r => { if (P[r.从] && P[r.到]) out[r.从] = (out[r.从] || 0) + 1; });
  let arrows = '';
  rows.forEach((r, i) => {
    const a = P[r.从], b = P[r.到]; if (!a || !b || a === b) return;
    const back = rows.some((x, j) => j !== i && x.从 === r.到 && x.到 === r.从);
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
    const off = back ? 10 : 0, nx = -uy * off, ny = ux * off;
    const x1 = a[0] + ux * 56 + nx, y1 = a[1] + uy * 24 + ny, x2 = b[0] - ux * 58 + nx, y2 = b[1] - uy * 26 + ny;
    const lab = r.按 === '时间到' ? '时间到' : '「' + (r.按 || '?') + '」';
    arrows += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8B6CFF" stroke-width="3" marker-end="url(#ah)"/><text x="${(x1 + x2) / 2 + nx * 1.6}" y="${(y1 + y2) / 2 + ny * 1.6 - 6}" text-anchor="middle" font-size="12" font-weight="800" fill="#6A4BE0">${esc(lab)}</text>`;
  });
  const nodes = [...used].map(n => { const [x, y] = P[n], dead = !out[n]; return `<rect x="${x - 54}" y="${y - 22}" width="108" height="44" rx="12" fill="${dead ? '#FFE9E9' : '#fff'}" stroke="${dead ? '#E5484D' : '#F0E2CC'}" stroke-width="3"/><text x="${x}" y="${y + 6}" text-anchor="middle" font-size="16" font-weight="900" fill="#1E2A4A">${n}</text>${dead ? `<text x="${x}" y="${y + 38}" text-anchor="middle" font-size="12" font-weight="900" fill="#E5484D">出不去？</text>` : ''}`; }).join('');
  return `<div class="muted" style="font-size:13px;font-weight:800;margin-top:6px">你的流程图（红色 = 进去了没有路出来）</div><svg viewBox="0 0 480 205" style="width:100%;background:#fff;border-radius:14px"><defs><marker id="ah" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8B6CFF"/></marker></defs>${arrows}${nodes}</svg>`;
}
function emojiPick(anchor, opts, done) {
  const old = $('.epick'); if (old) old.remove();
  const p = document.createElement('div'); p.className = 'epick';
  p.innerHTML = opts.map(e => `<button>${e}</button>`).join('');
  document.body.appendChild(p);
  const r = anchor.getBoundingClientRect(); p.style.left = Math.min(innerWidth - 270, Math.max(8, r.left - 100)) + 'px'; p.style.top = Math.min(innerHeight - 200, r.bottom + 6) + 'px';
  $$('button', p).forEach(b => b.onclick = e => { e.stopPropagation(); done(b.textContent); p.remove(); });
  setTimeout(() => document.addEventListener('pointerdown', function off(e) { if (!p.contains(e.target)) { p.remove(); document.removeEventListener('pointerdown', off); } }), 0);
}
// 画关卡：点格子、按住拖着画
function mapPainter(box, rows, send) {
  const R = 7, Cn = 12;
  let g = [];
  const fill = src => { g = []; for (let i = 0; i < R; i++) { const line = (src[i] || ''); const a = []; for (let j = 0; j < Cn; j++) { const ch = line[j]; a.push(i === 0 || j === 0 || i === R - 1 || j === Cn - 1 ? '#' : (S2_TILES.some(t => t.c === ch) ? ch : '.')); } g.push(a); } };
  fill(rows.length ? rows : []);
  let pen = '#', down = false;
  box.innerHTML = `<div class="mpaint"><div class="mpal">${S2_TILES.map(t => `<button class="pchip ${t.c === pen ? 'on' : ''}" data-t="${esc(t.c)}"><span class="mt t${t.c === '#' ? 'w' : t.c === '.' ? 'r' : ''}">${tileFace(t.c)}</span>${t.n}</button>`).join('')}</div>
    <div class="mgrid" id="mg" style="grid-template-columns:repeat(${Cn},1fr)"></div>
    <div class="row" style="gap:8px"><button class="btn sm ghost" id="mclr">清空</button><span class="muted grow" style="font-size:13px;font-weight:700">外圈是墙不能改。起点、终点各只有一个。</span><button class="btn sm purple" id="msend">交给精灵</button></div></div>`;
  const grid = $('#mg', box);
  const drawGrid = () => { grid.innerHTML = g.map((a, i) => a.map((c, j) => `<div class="mc ${c === '#' ? 'w' : ''}" data-i="${i}" data-j="${j}">${tileFace(c)}</div>`).join('')).join(''); };
  const paint = (i, j) => {
    if (i <= 0 || j <= 0 || i >= R - 1 || j >= Cn - 1 || g[i][j] === pen) return;
    if (pen === 'S' || pen === 'E') g.forEach(a => a.forEach((c, k) => { if (c === pen) a[k] = '.'; }));
    g[i][j] = pen; drawGrid();
  };
  const at = e => { const n = document.elementFromPoint(e.clientX, e.clientY); return n && n.classList && n.classList.contains('mc') ? n : null; };
  grid.addEventListener('pointerdown', e => { down = true; const n = at(e); if (n) paint(+n.dataset.i, +n.dataset.j); e.preventDefault(); });
  grid.addEventListener('pointermove', e => { if (!down) return; const n = at(e); if (n) paint(+n.dataset.i, +n.dataset.j); });
  const up = () => { down = false; }; document.addEventListener('pointerup', up);
  $$('.mpal .pchip', box).forEach(b => b.onclick = () => { pen = b.dataset.t; $$('.mpal .pchip', box).forEach(x => x.classList.toggle('on', x === b)); });
  $('#mclr', box).onclick = () => { fill([]); drawGrid(); };
  $('#msend', box).onclick = () => {
    const text = '照这张图做关卡（# 墙  . 路  S 起点  E 终点  * 星星  ^ 刺）：\n' + g.map(a => a.join('')).join('\n');
    if (!g.some(a => a.includes('S'))) toast('还没有起点'); send(text);
  };
  drawGrid();
  return { off() { document.removeEventListener('pointerup', up); }, set(r) { fill(r); drawGrid(); } };
}

// 说明书：精灵每次改之前先读。check：改完以后对照着逐条打勾
function specPanel(box, o) {
  let rules = [], saving = null, open = true, ver = null, ticks = {};
  const max = o.max || 5;
  const save = () => { clearTimeout(saving); saving = setTimeout(async () => { const r = await ST.net.post('spec-save', { proj: o.proj, rules }); if (r && r.err) toast(r.err); }, 600); };
  function draw() {
    const filled = rules.filter(x => String(x).trim());
    box.innerHTML = `<div class="spec ${open ? 'open' : ''}"><button class="spech" id="sph"><span>📘 游戏说明书</span><span class="muted" style="font-size:13px">${filled.length} 条 · 精灵每次先读</span><span class="grow"></span><span>${open ? '▲' : '▼'}</span></button>
      ${open ? `<div class="specb">${rules.map((x, i) => `<div class="row" style="gap:6px"><b class="sn">${i + 1}</b><input class="inp grow" data-i="${i}" maxlength="60" value="${esc(x)}" placeholder="${esc(o.ph || '比如：接到炸弹扣 3 分')}"><button class="rx" data-x="${i}">×</button></div>`).join('') || '<p class="muted" style="margin:0;font-size:14px">还没有规则。把你的游戏一定要有的规则写下来。</p>'}
        <button class="btn sm ghost" id="spa" ${rules.length >= max ? 'disabled' : ''}>+ 加一条规则</button>
        ${o.check && ver != null && filled.length ? `<div class="chk"><div style="font-weight:900">刚改完第 ${ver + 1} 版：对照说明书，一条条试一试</div>${filled.map((x, i) => `<label class="ck"><input type="checkbox" data-c="${i}" ${ticks[i] ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('')}<div class="muted" style="font-size:13px">${Object.values(ticks).filter(Boolean).length === filled.length ? '✓ 条条都还在' : '玩一玩，做到了就打勾；没做到就告诉精灵'}</div></div>` : ''}</div>` : ''}</div>`;
    $('#sph', box).onclick = () => { open = !open; draw(); };
    $$('input[data-i]', box).forEach(n => n.oninput = () => { rules[+n.dataset.i] = n.value; save(); if (o.onChange) o.onChange(rules); });
    $$('[data-x]', box).forEach(b => b.onclick = () => { rules.splice(+b.dataset.x, 1); save(); draw(); });
    $$('input[data-c]', box).forEach(n => n.onchange = () => { ticks[+n.dataset.c] = n.checked; draw(); });
    const a = $('#spa', box); if (a) a.onclick = () => { if (rules.length < max) { rules.push(''); draw(); const ins = $$('input[data-i]', box); ins[ins.length - 1].focus(); } };
  }
  ST.net.get('spec', { proj: o.proj }).then(r => { rules = (r && r.rules) || []; if (!rules.length && o.seed) rules = o.seed.slice(); open = !rules.filter(x => String(x).trim()).length; draw(); });   // 已经写了说明书：先收起来，给聊天留地方
  draw();
  return { changed(v) { if (o.check && v !== ver) { ver = v; ticks = {}; open = true; draw(); } }, rules: () => rules };
}

// 看代码：只能看，不能改。line：高亮那一行
function codeViewer(code, o) {
  o = o || {};
  const lines = String(code || '').split('\n');
  const md = document.createElement('div'); md.className = 'modal';
  md.innerHTML = `<div class="codebox"><div class="row" style="gap:10px"><b style="font-size:20px">${esc(o.title || '游戏的代码')}</b><span class="muted" style="font-size:14px">只能看，不能改</span><span class="grow"></span><input class="inp" id="cq" placeholder="找一找，比如：血量" style="height:42px;font-size:16px;width:200px"><button class="btn sm ghost" id="cx">关上</button></div>
    <div class="code" id="cc">${lines.map((l, i) => `<div class="cl ${o.line === i + 1 ? 'hot' : ''}" data-n="${i + 1}"><span class="ln">${i + 1}</span><span class="lt">${esc(l) || ' '}</span></div>`).join('')}</div></div>`;
  document.body.appendChild(md);
  const cc = $('#cc', md);
  const hot = $('.cl.hot', md); if (hot) setTimeout(() => hot.scrollIntoView({ block: 'center' }), 30);
  $('#cx', md).onclick = () => md.remove();
  $('#cq', md).oninput = e => { const q = e.target.value.trim(); let first = null; $$('.cl', cc).forEach(n => { const on = !!q && n.textContent.includes(q); n.classList.toggle('find', on); if (on && !first) first = n; }); if (first) first.scrollIntoView({ block: 'center' }); };
  if (o.find) { $('#cq', md).value = o.find; $('#cq', md).oninput({ target: $('#cq', md) }); }
}

// ================= 第 23 节：给家人做游戏——先填需求卡，写成说明书，再做 =================
const NEED_QS = [
  { q: '你喜欢什么动物或东西？', rule: a => `主角或道具用：${a}` },
  { q: '你喜欢快的游戏，还是慢慢玩的？', rule: a => `游戏节奏：${a}` },
  { q: '玩一局要多长时间？', rule: a => `一局玩：${a}` },
  { q: '你喜欢什么颜色？', rule: a => `主要颜色：${a}` },
  { q: '游戏里最不想看到什么？', rule: a => `不要出现：${a}` },
  { q: '你想在游戏里当谁？', rule: a => `玩家扮演：${a}` },
  { q: '赢了以后想看到什么？', rule: a => `赢了以后：${a}` }
];
const FAMILY = ['爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆', '哥哥', '姐姐', '弟弟', '妹妹'];
const FAMILY_BASES = ['catch', 'runner', 'whack', 'snake', 'monster', 'maze', 'breakout', 'boss', 'star'];
function needsRules(c) {
  const out = [];
  if (c.who) out.push(`这个游戏做给${c.who}玩`);
  (c.qa || []).forEach(x => { if (!x || !String(x.a || '').trim()) return; const p = NEED_QS.find(n => n.q === x.q); out.push(p ? p.rule(x.a.trim()) : `${String(x.q || '').replace(/[？?]$/, '')}：${x.a.trim()}`); });
  return out.slice(0, 8);
}
function needsStudio(s, el, v) {
  const hi = s.stu.qs >= 5, nq = s.stu.qs || 3;
  let card = null, view = null, comp = null;
  const show = () => {
    if (comp && comp.off) comp.off(); comp = null;
    if (view === 'studio') {
      el.innerHTML = '';
      comp = studio(el, { proj: 'family', title: `给${card.who || '家人'}的游戏${card.name ? '：' + card.name : ''}`, tasks: s.tasks, spec: { max: hi ? 8 : 5, ph: '比如：一局玩 1 分钟' }, check: hi, code: true, needs: true });
      const nb = $('#needsbox', el);
      if (nb) { nb.innerHTML = `<div class="card row" style="padding:8px 12px;gap:8px;background:var(--yellow-l)"><span class="grow" style="font-weight:800;font-size:15px">做给：${esc(card.who || '')} · 问了 ${(card.qa || []).filter(x => x.a).length} 个问题</span><button class="btn sm ghost" id="nedit">需求卡</button></div>`; $('#nedit', nb).onclick = () => { view = 'form'; show(); }; }
      return;
    }
    const qa = (card && card.qa && card.qa.length ? card.qa : NEED_QS.slice(0, nq).map(x => ({ q: x.q, a: '' }))).slice(0, nq);
    while (qa.length < nq) qa.push({ q: NEED_QS[qa.length % NEED_QS.length].q, a: '' });
    const c = Object.assign({ who: '', name: '', base: '' }, card || {}, { qa });
    el.innerHTML = `<div class="pad col needs" style="max-width:900px;margin:0 auto;gap:14px">
      <h1 class="h1" style="margin:0">需求卡：先问清楚，再做</h1><p class="muted" style="margin:0;font-size:18px">把你回家问到的写下来。问到的答案会变成游戏说明书，精灵每次都会先读。</p>
      <div class="fld"><label>做给谁</label><div class="chips">${FAMILY.map(x => `<button class="pchip ${c.who === x ? 'on' : ''}" data-who="${x}">${x}</button>`).join('')}</div><input class="inp" id="nwho" maxlength="8" placeholder="也可以自己写，比如：表哥" value="${esc(FAMILY.includes(c.who) ? '' : c.who)}"></div>
      <div class="fld"><label>问了 ${nq} 个问题，答案是</label>${c.qa.map((x, i) => `<div class="row" style="gap:8px;flex-wrap:wrap"><select class="inp" data-q="${i}" style="width:340px;font-size:17px">${NEED_QS.map(n => `<option ${n.q === x.q ? 'selected' : ''}>${esc(n.q)}</option>`).join('')}${NEED_QS.some(n => n.q === x.q) ? '' : `<option selected>${esc(x.q)}</option>`}</select><input class="inp grow" data-a="${i}" maxlength="60" value="${esc(x.a)}" placeholder="家人的回答"></div>`).join('')}</div>
      <div class="fld"><label>游戏叫什么</label><input class="inp" id="nname" maxlength="16" value="${esc(c.name)}" placeholder="比如：奶奶的花园"></div>
      <div class="fld"><label>从哪个游戏开始改（选最接近家人想要的）</label><div class="chips">${FAMILY_BASES.map(k => `<button class="pchip ${c.base === k ? 'on' : ''}" data-base="${k}">${esc((GAMES[k] || {}).name || k)}</button>`).join('')}</div></div>
      <div class="row" style="gap:12px"><span class="grow muted" id="nmsg" style="font-size:16px;font-weight:800"></span>${card && card.started ? '<button class="btn ghost" id="nback">回到游戏</button>' : ''}<button class="btn team" id="ngo">${card && card.started ? '保存需求卡' : '写成说明书，开始做'}</button></div></div>`;
    $$('[data-who]', el).forEach(b => b.onclick = () => { c.who = b.dataset.who; $('#nwho', el).value = ''; $$('[data-who]', el).forEach(x => x.classList.toggle('on', x === b)); });
    $('#nwho', el).oninput = e => { if (e.target.value.trim()) { c.who = e.target.value.trim(); $$('[data-who]', el).forEach(x => x.classList.remove('on')); } };
    $$('[data-q]', el).forEach(n => n.onchange = () => { c.qa[+n.dataset.q].q = n.value; });
    $$('[data-a]', el).forEach(n => n.oninput = () => { c.qa[+n.dataset.a].a = n.value; });
    $('#nname', el).oninput = e => { c.name = e.target.value; };
    $$('[data-base]', el).forEach(b => b.onclick = () => { c.base = b.dataset.base; $$('[data-base]', el).forEach(x => x.classList.toggle('on', x === b)); });
    const nb = $('#nback', el); if (nb) nb.onclick = () => { view = 'studio'; show(); };
    $('#ngo', el).onclick = async () => {
      const msg = t => { $('#nmsg', el).textContent = t; };
      if (!c.who) return msg('先选做给谁');
      if (c.qa.filter(x => String(x.a || '').trim()).length < Math.min(2, nq)) return msg('至少写 2 个回答');
      if (!c.base) return msg('选一个开始的游戏');
      const first = !(card && card.started);
      const r = await ST.net.post('needs-save', { card: Object.assign({}, c, { started: true }) });
      if (!r || r.err) return msg((r && r.err) || '没存上');
      if (first) {
        const x = await ST.net.post('import', { proj: 'family', from: c.base }); if (x && x.err) return msg(x.err);
        await ST.net.post('spec-save', { proj: 'family', rules: needsRules(c) });
      }
      card = r.card; view = 'studio'; show(); toast(first ? '说明书写好了，可以开始做了' : '需求卡存好了');
    };
  };
  ST.net.get('needs').then(r => { card = r && r.card; view = card && card.started ? 'studio' : 'form'; show(); });
  el.innerHTML = '<div class="center full">读需求卡……</div>';
  return { upd(v) { if (comp && comp.upd) comp.upd(v); }, off() { if (comp && comp.off) comp.off(); } };
}

const M = {
  needs(s, L, el, v) { return needsStudio(s, el, v); },
  idle(s, L, el) {
    el.innerHTML = `<div class="center full pad">${bitEl(220, 'idle')}<h1 class="h1">等老师开始上课</h1><p class="muted" style="font-size:20px">先看看自己的作品吧</p><button class="btn team" id="go">我的作品</button></div>`;
    $('#go', el).onclick = () => { ST.free = true; route(); renderTop(); };
  },
  watch(s, L, el) {
    el.innerHTML = `<div class="center full pad watch">${bitEl(240, 'idle')}<h1 class="h1">看大屏</h1><p class="muted" style="font-size:22px;margin:0">${esc(s ? (s.title || L.title || '').replace(/\n/g, '') : '')}</p></div>`;
  },
  join(s, L, el, v) {
    const upd = v => { el.innerHTML = `<div class="center full pad">${bitEl(200, 'idle')}<h1 class="h1">${esc(v.me.name)}，你进教室了 ✓</h1>${v.me.team ? `<p style="font-size:24px;font-weight:900;margin:0">你在 <span class="tag" style="font-size:22px;background:var(--team);color:#fff">${esc(tn(v.me.team))}</span></p>` : '<p class="muted" style="font-size:20px">等老师分队</p>'}<p class="muted">看大屏</p></div>`; };
    upd(v); return { upd };
  },
  team(s, L, el, v) {
    const upd = v => {
      const t = v.me.team;
      el.innerHTML = t ? `<div class="center full pad" style="background:var(--team-l)"><p style="font-size:24px;font-weight:800;margin:0">你在</p><div style="font-size:72px;font-weight:900;color:var(--team-d)">${esc(tn(t))}</div><p class="muted" style="font-size:20px">这个季度都在这一队。全队一起赢，全队都有奖励。</p></div>`
        : `<div class="center full pad">${bitEl(200, 'idle')}<h1 class="h1">等老师抽签分队</h1></div>`;
    };
    upd(v); return { upd };
  },
  rest(s, L, el) { M.watch(s, L, el); },

  // ---------- 玩起始游戏 ----------
  play(s, L, el) {
    const stu = s.stu;
    el.innerHTML = `<div class="studio"><div class="gamecol"><div class="row"><h2 class="h2 grow">${esc(s.title)}</h2><button class="btn sm ghost" id="fs">全屏玩</button></div>
      <div class="gameframe" id="gf"><iframe></iframe></div></div>
      ${stu.wall ? `<div class="side"><div class="card"><div class="h2">${esc(stu.wall.label)}</div><p class="muted" style="margin:6px 0 0">发现奇怪的地方就写下来，会出现在大屏上</p></div><div id="sb"></div><div class="chat" id="mylist"></div></div>` : ''}</div>`;
    gameUrlCode(stu.game).then(code => runGame($('iframe', el), code));
    fsButton($('#fs', el), $('#gf', el));
    if (stu.wall) return wallInput($('#sb', el), $('#mylist', el), stu.wall.ph);
  },
  wall(s, L, el) {
    const stu = s.stu;
    el.innerHTML = `<div class="pad col" style="max-width:860px;margin:0 auto"><h1 class="h1">${esc(s.title || '')}</h1><div class="card"><div class="h2">${esc(stu.label)}</div><p class="muted" style="margin:6px 0 0">写下来或按住话筒说，会出现在大屏上。想到什么都可以。</p></div><div id="sb"></div><div class="chat" id="mylist" style="min-height:200px"></div></div>`;
    return wallInput($('#sb', el), $('#mylist', el), stu.ph);
  },

  // ---------- 和精灵一起改游戏 ----------
  studio(s, L, el) { const u = s.stu; return studio(el, { proj: s.proj, title: s.title, tasks: s.tasks, claims: s.claims, target: u.target ? s : null, submit: u.submit, alt: u.alt, note: u.note, input: u.input, inputMax: u.inputMax, plan: u.plan, spec: u.spec, check: u.check, errLine: u.errLine, errHelp: u.errHelp, code: u.code, codeFind: u.codeFind }); },
  design(s, L, el, v) { return designStudio(s, el, v); },
  dogname(s, L, el, v) {
    el.innerHTML = `<div class="center full pad"><h1 class="h1">${esc(s.ask || '给你的狗起个名字')}</h1><p class="muted" style="font-size:20px;margin:0">${esc(s.tip || '两三个字，好念，和别人的不一样。叫它的时候，先喊它的名字。')}</p>
      <div class="dogcard" id="dc"></div>
      <div class="row" style="width:min(640px,92vw)"><button class="mic" id="dmic">${MIC_SVG}</button><input class="inp grow" id="dn" maxlength="6" placeholder="它叫……" style="font-size:28px;height:64px"><button class="btn team" id="ok">就叫它</button></div><div id="dm" class="muted" style="font-size:18px;min-height:24px"></div></div>`;
    micFor($('#dn', el), $('#dmic', el));
    const go = async () => { const n = $('#dn', el).value.replace(/\s/g, ''); if (!n) return $('#dn', el).focus(); const r = await ST.net.act({ type: 'dog.name', name: n }); if (r && r.err) { $('#dm', el).textContent = r.err; return; } $('#dm', el).textContent = ''; toast('起好名字了！'); };
    $('#ok', el).onclick = go; $('#dn', el).onkeydown = e => { if (e.key === 'Enter') go(); };
    const upd = v => { const d = v.me.dog; $('#dc', el).innerHTML = d ? `${svgSize(IC.paw, 54)}<div><div class="muted" style="font-size:16px">${esc(v.me.name)}的狗</div><div style="font-size:52px;font-weight:900;letter-spacing:4px">${esc(d)}</div></div>` : `${bitEl(150, 'idle')}<div class="muted" style="font-size:20px">还没起名字</div>`; if (d && !$('#dn', el).value && document.activeElement !== $('#dn', el)) $('#dn', el).placeholder = '想换名字？在这里重新写'; };
    upd(v); return { upd };
  },
  report(s, L, el, v) {
    const m = v.mine || {}, R = s.report || { q: '结果怎样？', opts: [] };
    if (m.phase !== 'swap') return studio(el, { proj: s.proj, title: s.title, note: s.stu.note || '', alt: s.stu.alt });
    if (!m.play) { el.innerHTML = '<div class="center full">看大屏</div>'; return; }
    el.innerHTML = `<div class="studio"><div class="gamecol"><div class="row"><h2 class="h2 grow">玩 ${esc(m.play.name)} 的游戏</h2><button class="btn sm ghost" id="fs">全屏玩</button></div><div class="gameframe" id="gf"><iframe></iframe></div></div>
      <div class="side"><div class="card"><div class="h2">${esc(R.q)}</div><p class="muted" style="margin:6px 0 0">${esc(R.tip || '认真玩，照实说。你是在帮对方测试他的游戏。')}</p></div>
      ${R.spec ? '<div id="pspec" class="card" style="padding:12px 14px"><span class="muted">读说明书……</span></div>' : ''}
      <div class="col" id="ro" style="gap:10px">${R.opts.map((o, i) => `<button class="btn ghost ropt" data-i="${i}" style="height:auto;min-height:56px;font-size:20px;white-space:normal">${esc(o)}</button>`).join('')}</div><div id="st" style="font-size:20px;font-weight:900"></div></div></div>`;
    ST.net.get('work', { sid: m.play.sid, proj: s.proj }).then(r => { if (r && r.code) runGame($('iframe', el), r.code); else $('#gf', el).innerHTML = '<div class="center full">他还没有作品</div>'; });
    if (R.spec) ST.net.get('spec', { sid: m.play.sid, proj: s.proj }).then(r => { const box = $('#pspec', el); if (!box) return; const rules = ((r && r.rules) || []).filter(Boolean); box.innerHTML = `<div style="font-weight:900;margin-bottom:6px">📘 ${esc(m.play.name)} 的说明书：一条条试，做到了就打勾</div>${rules.length ? rules.map((x, i) => `<label class="ck"><input type="checkbox"><span>${i + 1}. ${esc(x)}</span></label>`).join('') : '<span class="muted">他还没写说明书</span>'}`; });
    fsButton($('#fs', el), $('#gf', el));
    $$('.ropt', el).forEach(b => b.onclick = async () => { const r = await ST.net.act({ type: 'report', i: +b.dataset.i }); if (r && r.err) toast(r.err); });
    const upd = v => { const r = (v.mine || {}).reported; $$('.ropt', el).forEach(b => { b.classList.toggle('dark', +b.dataset.i === r); }); $('#st', el).textContent = r != null ? `已报：${R.opts[r]}（可以改）` : ''; };
    upd(v); return { upd };
  },
  mine(s, L, el) {
    if (ST.freeProj) return studio(el, { proj: ST.freeProj, title: PROJ_NAME[ST.freeProj] || ST.freeProj, back: true });
    const list = ['family', 'coins', 'rules', 'star', 'boss', 'breakout', 'maze', 'monster', 'mygame', 'snake', 'move', 'rule', 'home', 'runner', 'whack', 'catch'];
    el.innerHTML = `<div class="pad"><h1 class="h1" style="margin-bottom:14px">我的作品</h1><div class="works">${list.map(p => `<button class="work" data-p="${p}">${svgSize(p === 'home' || p === 'mygame' ? IC.edit : IC.game, 70)}<span>${esc(PROJ_NAME[p])}</span></button>`).join('')}</div>
      <p class="muted" style="margin-top:20px">${!ST.V.nameOnlyJoin && ST.V.me && ST.V.me.code ? `在家登录用：名字「${esc(ST.V.me.name)}」，登录码 <b style="font-size:22px;letter-spacing:3px">${esc(ST.V.me.code)}</b>` : ''}</p></div>`;
    $$('.work', el).forEach(b => b.onclick = () => { ST.freeProj = b.dataset.p; ST.key = null; route(); });
  },

  // ---------- 答题 ----------
  quiz(s, L, el, v) {
    const Ls = 'ABCD';
    el.innerHTML = `<div class="center full pad"><p class="muted" style="margin:0;font-size:18px">${s.hints ? '看大屏上翻开的线索，随时可以选、可以改' : s.engine ? '看大屏上的游戏，再选' : '每队先商量 10 秒，再每人选一个'}</p>${s.show ? `<div style="--qs-font:18px;width:min(720px,94vw)">${quizShowHTML(s.show)}</div>` : ''}<h1 class="h1" style="max-width:980px;line-height:1.4">${esc(s.q)}</h1>${s.hints ? '<div class="hintrow" id="hr"></div>' : ''}
      <div class="qopts">${s.opts.map((o, i) => `<button class="qopt ${Ls[i]}" data-i="${i}"><div class="L">${Ls[i]}</div><span>${esc(o)}</span></button>`).join('')}</div><div id="qs" style="font-size:22px;font-weight:900;min-height:30px"></div></div>`;
    $$('.qopt', el).forEach(b => b.onclick = async () => { const q = (ST.V.mine || {}).quiz || {}; if (q.revealed) return; const r = await ST.net.act({ type: 'quiz.answer', i: +b.dataset.i }); if (r && r.err) toast(r.err); });
    const upd = v => {
      const q = (v.mine || {}).quiz || {};
      if (s.hints) { const hs = (v.mine || {}).hints || []; $('#hr', el).innerHTML = s.hints.map((h, i) => `<div class="hint ${hs.includes(i) || q.revealed ? '' : 'off'}"><b>${esc(h.k)}</b><span>${hs.includes(i) || q.revealed ? esc(h.t) : '?'}</span></div>`).join(''); }
      $$('.qopt', el).forEach(b => { const i = +b.dataset.i; b.classList.toggle('sel', q.mine === i); b.classList.toggle('right', !!(q.revealed && q.ans === i)); b.classList.toggle('wrong', !!(q.revealed && q.mine === i && q.ans !== i)); });
      $('#qs', el).textContent = q.revealed ? (q.ans == null ? '看大屏' : q.mine === q.ans ? '答对了！' : q.mine == null ? '这题没选，看大屏' : '这次没对，看看大屏上为什么') : q.mine != null ? `你选了 ${Ls[q.mine]}，等老师揭晓（可以改）` : '';
    };
    upd(v); return { upd };
  },
  guess(s, L, el, v) {
    const g = (v.mine || {}).guess;
    if (!g) { el.innerHTML = `<div class="center full pad">${bitEl(200, 'idle')}<h1 class="h1">看大屏：老师选一个道具</h1><p class="muted" style="font-size:20px">然后在这里猜：变量会变成几？</p></div>`; return; }
    const e = s.events[g.i];
    let val = g.mine != null ? String(g.mine) : '';
    el.innerHTML = `<div class="center full pad"><div class="tag" style="font-size:20px">${esc(e.t)}：${esc(g.k)} ${g.d > 0 ? '+' : '−'}${Math.abs(g.d)}</div>
      <h1 class="h1">${esc(g.k)}原来是 ${g.from}，现在是几？</h1>
      <div class="row" style="gap:30px"><div class="numshow" id="ns">${esc(val) || '?'}</div><div class="numpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '−', 0, '⌫'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div></div>
      <button class="btn team" id="ok">就猜这个</button><div id="gs" style="font-size:22px;font-weight:900;min-height:30px"></div></div>`;
    const show = () => $('#ns', el).textContent = val || '?';
    $$('.numpad button', el).forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === '⌫') val = val.slice(0, -1); else if (k === '−') val = val.startsWith('-') ? val.slice(1) : '-' + val; else if (val.replace('-', '').length < 4) val += k; show(); });
    $('#ok', el).onclick = async () => { if (val === '' || val === '-') return; const r = await ST.net.act({ type: 'guess', v: Number(val) }); if (r && r.err) toast(r.err); };
    const upd = v => { const g = (v.mine || {}).guess || {}; $('#gs', el).textContent = g.revealed ? (Number(g.mine) === g.to ? `猜对了！是 ${g.to}` : `是 ${g.to}，看大屏上的算式`) : g.mine != null ? `你猜 ${g.mine}，等老师揭晓` : ''; $('#ok', el).disabled = !!g.revealed; };
    upd(v); return { upd };
  },

  // ---------- 作品墙 ----------
  gallery(s, L, el, v) {
    el.innerHTML = `<div class="pad"><div class="row" style="margin-bottom:12px"><h1 class="h1 grow">${esc(s.title)}</h1><span class="tag" id="left" style="font-size:18px"></span></div>
      <p class="muted" style="margin:0 0 12px">点开玩一玩，给最想再玩一次的投星。不能投自己。</p><div class="works" id="ws"></div></div>`;
    const upd = v => {
      const m = v.mine || {}, stars = m.stars || [];
      $('#left', el).textContent = `我的星：${stars.length} / ${s.stars || 1}`;
      $('#ws', el).innerHTML = (m.works || []).map(w => `<button class="work ${w.team || ''}" data-sid="${w.sid}">${svgSize(IC.game, 70)}<span>${esc(w.name)}</span>${stars.includes(w.sid) ? '<span class="st">★</span>' : ''}</button>`).join('') || '<p class="muted">还没有别人的作品</p>';
      $$('.work', el).forEach(b => b.onclick = () => openWork(b.dataset.sid, s.proj, (v.mine.works.find(x => x.sid === b.dataset.sid) || {}).name, s));
    };
    upd(v); return { upd };
  },

  // ---------- 数值平衡赛 ----------
  balance(s, L, el, v) {
    const m = v.mine || {};
    if (m.phase !== 'swap') return studio(el, { proj: s.proj, title: s.title, note: '目标：让对方队的人玩 30 秒，得分正好在 10~20 分。先把倒计时改成 30 秒，再调难度。' });
    if (!m.play) { el.innerHTML = '<div class="center full">看大屏</div>'; return; }
    el.innerHTML = `<div class="studio"><div class="gamecol"><div class="row"><h2 class="h2 grow">玩 ${esc(m.play.name)} 的抓虫子</h2><button class="btn sm ghost" id="fs">全屏玩</button></div><div class="gameframe" id="gf"><iframe></iframe></div></div>
      <div class="side"><div class="card"><div class="h2">认真玩一局，得了几分？</div><p class="muted" style="margin:6px 0 0">落在 10~20 分，就是 ${esc(m.play.name)} 调得好</p></div>
      <div class="row"><input class="inp grow" id="sc" type="number" inputmode="numeric" placeholder="分数"><button class="btn team" id="ok">报分数</button></div><div id="st" style="font-size:20px;font-weight:900"></div></div></div>`;
    ST.net.get('work', { sid: m.play.sid, proj: s.proj }).then(r => { if (r && r.code) runGame($('iframe', el), r.code); });
    fsButton($('#fs', el), $('#gf', el));
    $('#ok', el).onclick = async () => { const n = $('#sc', el).value; if (n === '') return; const r = await ST.net.act({ type: 'balance.score', score: +n }); if (r && r.err) toast(r.err); };
    const upd = v => { const r = (v.mine || {}).reported; $('#st', el).textContent = r != null ? `已报：${r} 分 ${r >= 10 && r <= 20 ? '（正好！）' : ''}` : ''; };
    upd(v); return { upd };
  },

  // ---------- 捣蛋卡 ----------
  trick(s, L, el, v) {
    const m = v.mine || {};
    if (m.phase === 'deal') return studio(el, { proj: 'trick', title: '捣蛋：改坏这个复制的跑酷', card: m.card, note: '照着捣蛋卡上的话对精灵说。改的是复制的跑酷，你原来的不会坏。' });
    if (m.phase === 'swap') {
      if (!m.fix) { el.innerHTML = '<div class="center full">看大屏</div>'; return; }
      return studio(el, { proj: 'fix', title: `修 ${m.fix.name} 的游戏`, note: '玩一玩，找出哪里不对劲，说清楚：我做了什么、想要什么、结果却怎样。', fixed: true });
    }
    el.innerHTML = `<div class="center full pad">${svgSize(IC.trick, 200)}<h1 class="h1">等老师发牌</h1><p class="muted" style="font-size:20px">每人会抽到一张捣蛋卡</p></div>`;
  },

  // ---------- 机器狗 ----------
  groups(s, L, el, v) {
    const upd = v => { const g = v.me.group; el.innerHTML = g ? `<div class="center full pad"><div class="tag" style="font-size:22px">第 ${g.no} 组 · ${esc(g.dog)}</div><h1 class="h1" style="font-size:52px">你是「${esc(g.role)}」</h1><p class="muted" style="font-size:20px">${esc(roleText(g.role))}</p><p style="font-size:20px;font-weight:800">组员：${g.mates.map(esc).join('、')}</p></div>` : `<div class="center full pad">${bitEl(200, 'idle')}<h1 class="h1">等老师分组</h1></div>`; };
    upd(v); return { upd };
  },
  mood(s, L, el, v) {
    const g = v.me.group, m = v.mine || {};
    if (!g) { el.innerHTML = `<div class="center full pad"><h1 class="h1">等老师分组</h1></div>`; return; }
    if (m.mood) { el.innerHTML = `<div class="center full pad"><p class="muted" style="font-size:20px;margin:0">你们组抽到的心情（别让其他组看到）</p><div style="font-size:90px;font-weight:900;color:${MOODS[m.mood].c}">${esc(m.mood)}</div>${bitEl(220, 'idle ' + MOODS[m.mood].cls)}</div>`; return; }
    if (g.role === '编舞师') { el.innerHTML = `<div class="center full pad">${svgSize(IC.dice, 120)}<h1 class="h1">你是编舞师，帮全组抽一张</h1><button class="btn team" id="dr">抽一张心情卡</button></div>`; $('#dr', el).onclick = () => ST.net.act({ type: 'mood.draw' }); return; }
    el.innerHTML = `<div class="center full pad">${bitEl(200, 'idle')}<h1 class="h1">等编舞师抽卡</h1></div>`;
  },
  dance(s, L, el, v) { return danceStudio(s, el, v); },
  persona(s, L, el, v) { return personaStudio(s, el, v); },
  // ---------- 第二季：蛇身预测赛 ----------
  snakequiz(s, L, el, v) {
    const q = (v.mine || {}).sq;
    if (!q) { el.innerHTML = `<div class="center full pad">${bitEl(180, 'idle')}<h1 class="h1">看大屏：等老师出题</h1></div>`; return; }
    const r = s.rounds[q.i], ASK = { len: '走完以后，蛇有几格长？', head: '走完以后，头在第几行第几格？点一格', cells: '走完以后，蛇在哪几格？把它们都点出来' };
    let pick = new Set(q.mine && r.ask !== 'len' ? q.mine.split('|') : []);
    el.innerHTML = `<div class="sqwrap"><div class="sqleft"><div id="sg"></div></div>
      <div class="sqright"><div class="muted" style="font-size:18px;font-weight:800">第 ${q.i + 1} 题 · 开始时蛇有 ${r.start.length} 格</div><h1 class="h1" style="margin:4px 0 6px;font-size:30px">${esc(ASK[r.ask])}</h1>
        <div class="sqsteps">口令：${r.steps.map(st => `<span>${esc(snakeStepText(st))}</span>`).join(' → ')}</div>
        ${r.ask === 'len' ? `<div class="qopts" style="grid-template-columns:1fr 1fr 1fr;margin-top:14px">${r.opts.map(o => `<button class="qopt" data-v="${esc(o)}"><div class="L" style="background:#2ECC9A">${esc(o)}</div><span>格</span></button>`).join('')}</div>`
          : '<div class="row" style="margin-top:14px;gap:10px"><button class="btn sm ghost" id="clr">清空</button><button class="btn green" id="sub">交答案</button></div>'}
        <div id="st" style="font-size:22px;font-weight:900;margin-top:12px"></div></div></div>`;
    const drawGrid = () => {
      const mark = {};
      if (q.revealed && r.ask !== 'len') (r.ask === 'head' ? [q.answer] : q.answer.split('|')).forEach(k => { mark[k] = 'ans'; });
      pick.forEach(k => { mark[k] = (mark[k] ? mark[k] + ' ' : '') + 'pick'; });
      $('#sg', el).innerHTML = snakeGrid(s.size || 6, r.start, { labels: s.labels, food: q.foodCells, mark, cls: r.ask === 'len' ? '' : 'tap' });
      if (r.ask === 'len' || q.revealed) return;
      $$('#sg .sc', el).forEach(c => c.onclick = () => {
        const k = c.dataset.rc;
        if (r.ask === 'head') pick = new Set(pick.has(k) ? [] : [k]); else if (pick.has(k)) pick.delete(k); else pick.add(k);
        drawGrid();
      });
    };
    drawGrid();
    const send = async val => { const res = await ST.net.act({ type: 'sq.answer', v: val }); if (res && res.err) toast(res.err); };
    $$('.qopt', el).forEach(b => b.onclick = () => send(b.dataset.v));
    const clr = $('#clr', el); if (clr) clr.onclick = () => { pick.clear(); drawGrid(); };
    const sub = $('#sub', el); if (sub) sub.onclick = () => { if (!pick.size) return toast('先在格子上点出来'); send([...pick].sort().join('|')); };
    const upd = v => {
      const m = (v.mine || {}).sq || {};
      $$('.qopt', el).forEach(b => { b.classList.toggle('sel', m.mine === b.dataset.v); b.classList.toggle('right', !!(m.revealed && m.answer === b.dataset.v)); });
      $('#st', el).textContent = m.revealed ? (m.right ? '答对了！' : m.mine == null ? '这题没答' : '没答对，看大屏上蛇是怎么走的') : m.mine != null ? '交上了（揭晓前可以改）' : '';
    };
    upd(v); return { upd };
  },

  // ---------- 第二季：写游戏角色 / 门卫的角色卡，自己先试 ----------
  npcstudio(s, L, el, v) {
    const slot = s.stu.slot || 'npc', gate = slot === 'gate';
    el.innerHTML = `<div class="studio"><div class="pcard" id="pc"><div id="ed"></div><div id="pubst"></div><div class="row" style="margin-top:4px"><span class="grow"></span><button class="btn green" id="pub">${gate ? '派它去守门' : '开张'}</button></div></div>
      <div class="side"><div class="tasks" id="tasks"></div><div id="play"></div></div></div>`;
    let ed = null, play = null, published = false;
    const drawPub = () => { $('#pubst', el).innerHTML = published ? `<div class="sentc"><span style="font-size:30px">${esc(ed.card.look)}</span><span>${gate ? '已经去守门了，改了规矩马上生效' : '已经开张了，别人能来找它聊天'}</span></div>` : ''; };
    ST.net.get('npc', { slot }).then(r => {
      published = !!(r && r.published);
      ed = npcCardEditor($('#ed', el), { slot, card: r && r.card, max: s.stu.max || {}, onChange: c => play && play.setCard(c) });
      play = npcPlay($('#play', el), { slot, card: ed.card, beforeSend: () => ed.save(), tip: gate ? '自己先骗一骗：直接问口令、要提示、冒充主人……看它守不守得住' : '自己先问一问：玩家会问它什么？它答得上吗？', ph: gate ? '骗骗你的门卫' : '问它一句', onReply: x => { if (gate && (x.open || x.leaked)) toast('你的门卫被骗了！加一条规矩挡住它'); } });
      drawPub();
    });
    $('#pub', el).onclick = async () => {
      if (!ed) return;
      if (!ed.card.name) return toast('先给它起个名字');
      if (gate && !ed.card.secret) return toast('先定一个开门口令');
      if (!(await ed.save())) return;
      const r = await ST.net.post('npc-publish', { slot });
      if (!r || r.err) return toast((r && r.err) || '没成功');
      published = true; drawPub(); toast(gate ? `「${ed.card.name}」去守门了！` : `「${ed.card.name}」开张了！`);
    };
    const upd = v => {
      const mine = (v.mine || {}).tasks || [false, false, false], box = $('#tasks', el);
      box.innerHTML = (s.tasks || []).map(t => `<button class="task l${t.lv} ${mine[t.lv - 1] ? 'ok' : ''}" data-lv="${t.lv}"><span class="lv">${'★'.repeat(t.lv)}</span><span>${esc(t.t)}</span><span class="ck">✓</span></button>`).join('');
      $$('.task', box).forEach(b => b.onclick = () => { const lv = +b.dataset.lv; ST.net.act({ type: 'task', lv, on: !mine[lv - 1] }); });
    };
    upd(v); return { upd, off() { if (ed) ed.save(); } };
  },

  // ---------- 第二季：小镇串门（去对方队的角色那里聊天，报结果） ----------
  npcvisit(s, L, el, v) {
    const m = v.mine || {}, R = s.report || { q: '', opts: [] }, slot = s.stu.slot || 'npc';
    if (m.phase !== 'swap') {
      el.innerHTML = `<div class="studio"><div class="gamecol"><h2 class="h2">先自己再问一遍：别人第一次来，它会说什么？</h2><div id="play"></div></div><div class="side"><div class="card"><div class="h2">等老师点「交换」</div><p class="muted" style="margin:6px 0 0">交换以后，你会拿到对方队一个人的角色，去找它聊天。</p></div></div></div>`;
      ST.net.get('npc', { slot }).then(r => { if (!r || !r.card) { $('#play', el).innerHTML = '<p class="muted">你还没写角色卡，回上一页写一张</p>'; return; } npcPlay($('#play', el), { slot, card: r.card, ph: '问它一句' }); });
      return;
    }
    if (!m.play) { el.innerHTML = '<div class="center full">看大屏</div>'; return; }
    el.innerHTML = `<div class="studio"><div class="gamecol"><h2 class="h2">去找 ${esc(m.play.name)} 的角色聊天</h2><div id="play"></div></div>
      <div class="side"><div class="card"><div class="h2">${esc(R.q)}</div><p class="muted" style="margin:6px 0 0">${esc(R.tip || '照实说。')}</p></div>
      <div class="col" style="gap:10px">${R.opts.map((o, i) => `<button class="btn ghost ropt" data-i="${i}" style="height:auto;min-height:56px;font-size:20px;white-space:normal">${esc(o)}</button>`).join('')}</div><div id="st" style="font-size:20px;font-weight:900"></div></div></div>`;
    ST.net.get('npc', { sid: m.play.sid, slot }).then(r => {
      if (!r || !r.card) { $('#play', el).innerHTML = '<p class="muted">他还没写角色卡</p>'; return; }
      npcPlay($('#play', el), { owner: m.play.sid, slot, card: r.card, ph: '问它一句：它知道什么？', tip: r.published ? `${r.card.name || '它'}在等你。问问它知道什么？` : '他的角色还没开张，等他按「开张」' });
    });
    $$('.ropt', el).forEach(b => b.onclick = async () => { const r = await ST.net.act({ type: 'report', i: +b.dataset.i }); if (r && r.err) toast(r.err); });
    const upd = v => { const r = (v.mine || {}).reported; $$('.ropt', el).forEach(b => b.classList.toggle('dark', +b.dataset.i === r)); $('#st', el).textContent = r != null ? `已报：${R.opts[r]}（可以改）` : ''; };
    upd(v); return { upd };
  },

  // ---------- 第二季：攻门赛（攻对方的门 → 加固自己的门） ----------
  gate(s, L, el, v) {
    const g = (v.mine || {}).gate || { phase: 'ready', against: [] }, slot = 'gate';
    if (g.phase === 'attack' && g.target) {
      el.innerHTML = `<div class="studio"><div class="gamecol"><div class="row"><h2 class="h2 grow">第 ${g.round} 轮：攻 ${esc(g.target.name)} 的门</h2><span class="tag" id="won" style="font-size:16px"></span></div><div id="play"></div></div>
        <div class="side"><div class="card"><div class="h2">怎么骗开它？</div><p class="muted" style="margin:6px 0 0">直接问、要提示、冒充主人、玩假装游戏……想想它的规矩漏了什么。问出口令，或者让它开门，就算攻破。</p></div><div class="card" id="mg"></div></div></div>`;
      ST.net.get('npc', { sid: g.target.sid, slot }).then(r => {
        if (!r || !r.card) { $('#play', el).innerHTML = '<p class="muted">他还没派门卫，等一下</p>'; return; }
        npcPlay($('#play', el), { owner: g.target.sid, slot, card: r.card, ph: '想办法骗开它的门', tip: r.card.hello || '说出口令才能进', onReply: x => { if (x.breach) { toast('攻破了！你们队 +1'); } } });
      });
    } else if (g.phase === 'fix') {
      el.innerHTML = `<div class="studio"><div class="pcard"><div id="hist"></div><div id="ed"></div></div><div class="side"><div id="play"></div></div></div>`;
      const h = g.against || [];
      $('#hist', el).innerHTML = `<div class="card" style="margin-bottom:10px"><div class="h2">${h.length ? `你的门卫被攻破了 ${h.length} 次` : '你的门卫一次都没被攻破！'}</div>${h.map(b => `<div class="brk"><b>第 ${b.round} 轮 · ${esc(b.byName)}${esc(b.how)}</b><div>他说：「${esc(b.text)}」</div><div>门卫答：「${esc(b.reply || '')}」</div></div>`).join('') || '<p class="muted" style="margin:6px 0 0">再想想：别人还可能怎么骗它？</p>'}</div>`;
      ST.net.get('npc', { slot }).then(r => {
        const ed = npcCardEditor($('#ed', el), { slot, card: r && r.card, max: { rules: 5 }, mini: true, title: '加固规矩（也可以换口令）' });
        npcPlay($('#play', el), { slot, card: ed.card, beforeSend: () => ed.save(), ph: '用刚才的办法再骗一次', tip: '用别人骗开你的办法再试一次：这次挡住了吗？' });
      });
    } else {
      el.innerHTML = `<div class="studio"><div class="gamecol"><h2 class="h2">你的门卫在等着</h2><div id="play"></div></div><div class="side"><div class="card"><div class="h2">等老师点「开始攻门」</div><p class="muted" style="margin:6px 0 0">开始以后，你会分到对方队一扇门。你的门也会被对方队的人攻。</p></div></div></div>`;
      ST.net.get('npc', { slot }).then(r => { if (!r || !r.card) { $('#play', el).innerHTML = '<p class="muted">你还没派门卫，回上一页写一张卡</p>'; return; } npcPlay($('#play', el), { slot, card: r.card, ph: '再自己试一次' }); });
    }
    const upd = v => {
      const m = (v.mine || {}).gate || {};
      const w = $('#won', el); if (w) w.textContent = m.won ? '已攻破 ✓' : '';
      const mg = $('#mg', el); if (mg) { const n = (m.against || []).filter(b => b.round === m.round).length; mg.innerHTML = `<div class="h2">你的门</div><p class="muted" style="margin:6px 0 0">${n ? `这一轮被攻破 ${n} 次，等会儿加固` : '这一轮还没被攻破'}</p>`; }
    };
    upd(v); return { upd };
  },

  stage(s, L, el, v) {
    const st = (v.mine || {}).stage;
    if (!st) { el.innerHTML = `<div class="center full pad">${bitEl(200, 'idle')}<h1 class="h1">看大屏：等老师请一只狗上台</h1></div>`; return; }
    if (!st.me) { el.innerHTML = `<div class="center full pad">${bitEl(200, 'idle')}<h1 class="h1">看大屏：${esc(st.name)}和${esc(st.dog || '他的狗')}</h1><p class="muted" style="font-size:20px">听清楚他说的口令，看狗做对了没有</p></div>`; return; }
    el.innerHTML = `<div class="center full pad"><h1 class="h1">轮到你和${esc(st.dog || '你的狗')}！</h1><p class="muted" style="font-size:20px;margin:0">一次说一句口令，看大屏上的狗做对了没有</p><div id="sb" style="width:min(640px,92%)"></div></div>`;
    const sb = sayBar('说一句口令，或者按住话筒说', async (t, clear) => { sb.go.disabled = true; const r = await ST.net.post('stage-chat', { text: t }); sb.go.disabled = false; if (r && r.err) return toast(r.err); clear(); });
    $('#sb', el).appendChild(sb.el);
  },
  guessmood(s, L, el, v) {
    const p = (v.mine || {}).perform, opts = s.opts || MOOD_CARDS, persona = s.kind === 'persona';
    const pal = ['#FF8A3D', '#3D8BFF', '#2ECC9A', '#8B6CFF', '#FF6FA5', '#E5484D'];
    const colOf = (m, i) => (MOODS[m] && !persona ? MOODS[m].c : pal[i % pal.length]);
    if (!p) { el.innerHTML = `<div class="center full pad">${bitEl(200, 'idle')}<h1 class="h1">${s.own ? '看大屏：等老师请一只狗出场' : persona ? '看大屏：等老师请一组的比特出场' : '看大屏：等一组表演'}</h1></div>`; return; }
    if (p.performing) {
      const sent = (v.mine || {}).sent;
      el.innerHTML = `<div class="center full pad">${bitEl(220, 'idle')}<h1 class="h1">${s.own ? '轮到你的狗！' : persona ? '轮到你们组的比特！' : '你们组在表演！'}</h1><p class="muted" style="font-size:20px">${persona ? '别说出性格，让大家跟比特聊天来猜' : '让比特跳起来'}</p>${persona && sent ? `<div class="tag" style="font-size:20px">${s.own ? '你的秘密' : '你们的秘密'}：${esc(sent.trait || '')}</div>` : ''}</div>`; return;
    }
    el.innerHTML = `<div class="center full pad"><h1 class="h1">${s.own ? `${esc(p.name || '')}的狗「${esc(p.dog || '')}」，是什么性格？` : persona ? `第 ${p.no} 组的比特，是什么性格？` : `第 ${p.no} 组的比特，在跳什么心情？`}</h1><p class="muted" style="margin:0;font-size:18px">${persona ? '跟它聊几句，听它怎么说话' : ''}</p><div class="qopts" style="grid-template-columns:${opts.length > 4 ? '1fr 1fr 1fr' : '1fr 1fr'}">${opts.map((m, i) => `<button class="qopt" data-m="${esc(m)}"><div class="L" style="background:${colOf(m, i)};width:${m.length > 3 ? 120 : 90}px;font-size:${m.length > 3 ? 20 : 24}px">${esc(m)}</div><span></span></button>`).join('')}</div><div id="gs" style="font-size:22px;font-weight:900"></div></div>`;
    $$('.qopt', el).forEach(b => b.onclick = async () => { const r = await ST.net.act({ type: 'mood.guess', mood: b.dataset.m }); if (r && r.err) toast(r.err); });
    if (s.own && !REAL_DOG) {   // 虚拟狗在大屏上：台下的孩子用平板问它
      el.firstElementChild.insertAdjacentHTML('beforeend', '<div id="sb" style="width:min(640px,92%);margin-top:10px"></div>');
      const sb = sayBar('问它一句，听它怎么说', async (t, clear) => { sb.go.disabled = true; const r = await ST.net.post('stage-chat', { text: t }); sb.go.disabled = false; if (r && r.err) return toast(r.err); clear(); });
      $('#sb', el).appendChild(sb.el);
    }
    const upd = v => { const p = (v.mine || {}).perform || {}; $$('.qopt', el).forEach(b => { b.classList.toggle('sel', p.mine === b.dataset.m); b.classList.toggle('right', !!(p.revealed && p.mood === b.dataset.m)); }); $('#gs', el).textContent = p.revealed ? (p.mine === p.mood ? '猜对了！' : `是「${p.mood || '?'}」`) : p.mine ? `你猜「${p.mine}」（可以改）` : ''; };
    upd(v); return { upd };
  },

  // ---------- 发布会 ----------
  speech(s, L, el, v) {
    const lines = ((v.mine || {}).lines) || ['', '', ''];
    el.innerHTML = `<div class="pad col" style="max-width:860px;margin:0 auto"><h1 class="h1">${esc(s.title)}</h1>${s.lines.map((q, i) => `<div class="card"><div class="h2" style="margin-bottom:8px">${i + 1}. ${esc(q)}</div><textarea class="inp" style="width:100%" data-i="${i}">${esc(lines[i] || '')}</textarea></div>`).join('')}<button class="btn team" id="sv">存好了</button></div>`;
    $('#sv', el).onclick = async () => { await ST.net.act({ type: 'speech', lines: $$('textarea', el).map(t => t.value) }); toast('存好了，对同桌讲一遍吧'); };
  },
  present(s, L, el, v) {
    const upd = v => {
      const meSpot = v.spot && !v.spot.other;
      el.innerHTML = meSpot ? `<div class="center full pad" style="background:var(--yellow-l)">${bitEl(220, 'idle say')}<h1 class="h1">轮到你了！</h1><p style="font-size:22px;font-weight:800">${s.lines.map(esc).join('<br>')}</p></div>`
        : `<div class="center full pad">${bitEl(200, 'idle')}<h1 class="h1">${v.spot ? `${esc(v.spot.name)} 在上台` : '看大屏'}</h1><p class="muted" style="font-size:20px">${(v.mine || {}).presented ? '你已经讲过了 ✓' : '认真听，讲完给他鼓掌'}</p></div>`;
    };
    upd(v); return { upd };
  },
  import(s, L, el) {
    el.innerHTML = `<div class="pad col" style="max-width:900px;margin:0 auto"><h1 class="h1">${esc(s.title)}</h1>
      <div class="card row"><div class="grow"><div class="h2">我的新游戏</div><p class="muted" style="margin:4px 0 0" id="hs">在家用平台做的游戏在这里</p></div><button class="btn team" id="open">打开</button></div>
      <div class="card col"><div class="h2">导入别的工具做的游戏</div><textarea class="inp" id="code" placeholder="把游戏代码整个粘贴在这里" style="min-height:120px;font-family:monospace;font-size:14px"></textarea>
        <div class="row"><button class="btn" id="imp">导入代码</button><label class="btn ghost">选文件<input type="file" id="file" accept=".html,.htm,.txt,.js" style="display:none"></label></div></div>
      <div class="card row"><div class="grow"><div class="h2">从头开始</div><p class="muted" style="margin:4px 0 0">没做完也没关系</p></div><button class="btn ghost" data-f="runner">从跑酷开始</button><button class="btn ghost" data-f="whack">从抓虫子开始</button></div></div>`;
    const done = r => { if (r.err) return toast(r.err); toast('导入好了'); ST.freeProj = 'home'; ST.free = true; ST.key = null; route(); renderTop(); };
    ST.net.get('work', { sid: ST.sid, proj: 'home' }).then(r => { if (r && r.summary) $('#hs', el).textContent = r.summary.n > 1 ? `已经改了 ${r.summary.n - 1} 次` : '还是空白的'; });
    $('#open', el).onclick = () => { ST.freeProj = 'home'; ST.free = true; ST.key = null; route(); renderTop(); };
    $('#imp', el).onclick = async () => { const c = $('#code', el).value.trim(); if (!c) return; done(await ST.net.post('import', { proj: 'home', code: c })); };
    $('#file', el).onchange = e => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = async () => done(await ST.net.post('import', { proj: 'home', code: String(rd.result) })); rd.readAsText(f); };
    $$('[data-f]', el).forEach(b => b.onclick = async () => done(await ST.net.post('import', { proj: 'home', from: b.dataset.f })));
  },
  result(s, L, el, v) {
    const upd = v => {
      const r = (v.mine || {}).result || {}, p = r.pts || { o: 0, b: 0 };
      if (!r.revealed) { el.innerHTML = `<div class="center full pad">${bitEl(220, 'idle')}<h1 class="h1">看大屏：公布结果</h1></div>`; return; }
      const w = p.o === p.b ? 'tie' : p.o > p.b ? 'o' : 'b', me = v.me.team;
      el.innerHTML = `<div class="center full pad">${svgSize(IC.trophy, 160)}<h1 class="h1">${w === 'tie' ? '平局！两队一样强' : `${esc(tn(w))} 获胜！`}</h1>
        <p style="font-size:22px;font-weight:800">${w === 'tie' || w === me ? `你们队每人获得：${esc(s.reward)}` : '下节课再追！'}</p>
        <div class="tag" style="font-size:22px;padding:10px 20px">护照盖章：「${esc(s.stamp)}」</div></div>`;
    };
    upd(v); return { upd };
  }
};
function roleText(r) { return { 设计师: '填角色卡，按「发给比特」', 测试员: '跟比特聊天，看它像不像角色卡上写的', 安全员: '盯住比特，快撞到东西就喊「比特，停！」', 编舞师: '跟精灵说清楚想要什么舞，按「发给比特」', 检查员: '先看动作顺序，对了再让狗跳' }[r] || ''; }
function fsButton(btn, frame) {
  btn.onclick = () => {
    frame.classList.add('fs');
    const x = document.createElement('button'); x.className = 'btn sm fsx'; x.textContent = '退出全屏'; document.body.appendChild(x);
    x.onclick = () => { frame.classList.remove('fs'); x.remove(); };
  };
}
function wallInput(box, list, ph) {
  const sb = sayBar(ph || '我的点子', async (v, clear) => { const r = await ST.net.act({ type: 'wall.add', text: v }); if (r && r.err) return toast(r.err); clear(); toast('上墙了！'); });
  box.appendChild(sb.el); sb.go.textContent = '上墙';
  const upd = v => { const mine = (v.mine || {}).wall || []; list.innerHTML = mine.length ? mine.map(t => `<div class="msg kid">${esc(t)}</div>`).join('') : '<div class="msg sys">写好的点子会出现在这里</div>'; };
  upd(ST.V); return { upd };
}
async function openWork(sid, proj, name, s) {
  const md = document.createElement('div'); md.className = 'modal';
  md.innerHTML = `<div class="row" style="width:min(96vw,150vh)"><b style="font-size:26px" class="grow">${esc(name || '')} 的作品</b><button class="btn" id="star">☆ 投一颗星</button><button class="btn ghost" id="x">关闭</button></div><div class="gameframe"><iframe></iframe></div>`;
  document.body.appendChild(md);
  const r = await ST.net.get('work', { sid, proj });
  if (r && r.code) runGame($('iframe', md), r.code); else $('.gameframe', md).innerHTML = '<div class="center full">还没有作品</div>';
  const sync = () => { const has = ((ST.V.mine || {}).stars || []).includes(sid); $('#star', md).textContent = has ? '★ 收回星星' : '☆ 投一颗星'; };
  sync();
  $('#star', md).onclick = async () => { const has = ((ST.V.mine || {}).stars || []).includes(sid); const res = await ST.net.act({ type: 'star', target: sid, on: !has }); if (res && res.err) toast(res.err); setTimeout(sync, 200); };
  $('#x', md).onclick = () => { const f = $('iframe', md); if (f && f._errOff) f._errOff(); md.remove(); };
}

// ================= 工作台：游戏 + 精灵 + 时光机 + 任务 =================
function studio(el, o) {
  const proj = o.proj;
  o = Object.assign({}, PROJ_OPTS[proj] || {}, o);
  const inputs = (Array.isArray(o.input) ? o.input : o.input ? [o.input] : []).filter(k => S2_INPUTS[k]);
  el.innerHTML = `<div class="studio">
    <div class="gamecol">
      <div class="row">${o.back ? '<button class="btn sm ghost" id="back">‹ 作品</button>' : ''}<h2 class="h2 grow">${esc(o.title || PROJ_NAME[proj] || '')}</h2>${o.code ? '<button class="btn sm ghost" id="cv">看代码</button>' : ''}<button class="btn sm ghost" id="fs">全屏玩</button><button class="btn sm ghost" id="rl">重来</button></div>
      ${o.card ? `<div class="card" style="background:var(--purple-l)"><span class="tag">你的捣蛋卡</span><div style="font-size:24px;font-weight:900;margin-top:6px">${esc(o.card)}</div></div>` : ''}
      ${o.note ? `<div class="muted" style="font-size:16px;font-weight:700">${esc(o.note)}</div>` : ''}
      <div id="altbox"></div>
      <div class="gameframe" id="gf"><iframe></iframe></div>
      <div id="errbox"></div>
      ${o.target ? `<div class="row" style="align-items:flex-start"><div class="target" style="width:48%"><div class="ml">目标</div><canvas></canvas></div><div class="muted grow" style="font-size:16px;font-weight:700">把你的游戏改成和左边一模一样：背景、主角、要跳的、能吃的、电量。</div></div>` : ''}
    </div>
    <div class="side">
      ${o.needs ? '<div id="needsbox"></div>' : ''}
      ${o.spec ? '<div id="specbox"></div>' : ''}
      ${o.tasks ? `<div class="tasks" id="tasks"></div>` : ''}
      ${inputs.length ? `<div class="itabs" id="itabs"><button class="itab on" data-tab="">💬 说一句</button>${inputs.map(k => `<button class="itab" data-tab="${k}">${S2_INPUTS[k].painter ? '🎨' : S2_INPUTS[k].table === '流程' ? '🔀' : '📋'} ${S2_INPUTS[k].tab}</button>`).join('')}</div><div id="ibox" class="ibox" style="display:none"></div>` : ''}
      <div class="chat" id="chat"></div>
      <div id="sb"></div>
      <div class="tbar" id="extra"></div>
    </div></div>`;
  const frame = $('iframe', el), chat = $('#chat', el), gf = $('#gf', el);
  let sum = null, pending = false, lastErr = null, G = null, disposed = false, loadId = 0, curCode = '', pend = null, ed = null;
  const spec = o.spec ? specPanel($('#specbox', el), Object.assign({ proj, check: o.check }, typeof o.spec === 'object' ? o.spec : {})) : null;
  // 表格 / 画关卡 / 流程图：从现在的代码里读出表，改好了「交给精灵」
  const showTab = k => {
    $$('.itab', el).forEach(b => b.classList.toggle('on', b.dataset.tab === (k || '')));
    const ib = $('#ibox', el); if (!ib) return;
    if (ed && ed.off) ed.off(); ed = null;
    $('.studio', el).classList.toggle('wide', !!k);
    chat.style.display = k ? 'none' : ''; $('#sb', el).style.display = k ? 'none' : ''; ib.style.display = k ? '' : 'none';
    if (!k) return;
    const cfg = S2_INPUTS[k], send = text => { showTab(''); ask(text); };
    ed = cfg.painter ? mapPainter(ib, readMap(curCode), send) : tableEditor(ib, cfg, cfg.table === '流程' ? readTable(curCode, cfg.table) : readTable(curCode, cfg.table), send, (o.inputMax || {})[k]);
  };
  $$('.itab', el).forEach(b => b.onclick = () => showTab(b.dataset.tab));
  const cv = $('#cv', el); if (cv) cv.onclick = () => codeViewer(curCode, { find: o.codeFind });
  // 切课会复用主容器；旧工作台的异步响应不能再更新新页面。
  const active = () => !disposed && el.contains(frame);
  if (o.target) G = ENGINES[o.target.engine]($('.target canvas', el), Object.assign({ auto: true }, o.target.target));
  fsButton($('#fs', el), gf);
  const bk = $('#back', el); if (bk) bk.onclick = () => { ST.freeProj = null; ST.key = null; route(); };

  const showBusy = on => { let b = $('.busy', gf); if (on && !b) { b = document.createElement('div'); b.className = 'busy'; b.innerHTML = `${IC.genie}<span>精灵正在改代码……</span>`; gf.appendChild(b); } else if (!on && b) b.remove(); };
  const loadGame = async () => {
    if (!active()) return;
    const id = ++loadId;
    const r = await ST.net.get('work', { sid: ST.sid, proj });
    // 连续重载时只接收最新请求，离开工作台后忽略所有响应。
    if (!active() || id !== loadId) return;
    if (!r || r.err) { chat.innerHTML = `<div class="msg sys">${esc((r && r.err) || '打不开')}</div>`; return; }
    sum = r.summary; curCode = r.code || ''; pend = r.pending || null; drawChat();
    if (spec && sum && sum.cur > 0 && sum.versions[sum.cur] && sum.versions[sum.cur].by !== 'import') spec.changed(sum.cur);
    lastErr = null; const errbox = $('#errbox', el);
    if (!errbox) return;
    errbox.innerHTML = '';
    const ab = $('#altbox', el);
    if (ab) {
      ab.innerHTML = o.alt && sum && sum.n <= 1 ? `<div class="card row" style="padding:10px 14px;gap:10px;background:var(--yellow-l)"><span class="grow" style="font-weight:800">还没有自己的游戏？可以先从「${esc((GAMES[o.alt] || {}).name || '')}」开始改</span><button class="btn sm" id="altgo">从它开始</button></div>` : '';
      const ag = $('#altgo', ab); if (ag) ag.onclick = async () => { const x = await ST.net.post('import', { proj, from: o.alt }); if (!active()) return; if (x.err) return toast(x.err); loadGame(); };
    }
    runGame(frame, r.code, (msg, line) => {
      if (!active() || id !== loadId || lastErr) return; lastErr = msg;
      const lt = line ? String((r.code.split('\n')[line - 1]) || '').trim() : '';
      const full = String(msg) + (line ? `（第 ${line} 行${lt ? '：' + lt.slice(0, 90) : ''}）` : '');
      errbox.innerHTML = `<div class="err"><span class="grow">游戏出错了：${esc(String(msg).slice(0, 70))}${o.errLine && line ? `<br><span style="font-size:14px;color:#8A2A2E">报错说：问题出在第 ${line} 行</span>` : ''}</span>${o.errLine && line ? `<button class="btn sm ghost" id="eline">看第 ${line} 行</button>` : ''}<button class="btn sm" id="fix">${o.errHelp ? '把问题告诉精灵' : '让精灵修一修'}</button></div>`;
      $('#fix', errbox).onclick = () => ask('', full);
      const el2 = $('#eline', errbox); if (el2) el2.onclick = () => codeViewer(r.code, { line, title: `报错说：第 ${line} 行` });
      ST.net.post('game-error', { proj, msg: full });
    });
  };
  function drawChat() {
    if (!sum) return;
    const items = [];
    sum.versions.forEach(v => { if (v.prompt) items.push({ t: v.t, kid: v.prompt, genie: v.reply, i: v.i, lines: v.lines }); else if (v.by === 'import') items.push({ t: v.t, sys: v.reply, i: v.i }); else if (v.by === 'start') items.push({ t: v.t, sys: '开始：' + (v.reply || ''), i: v.i }); });
    (sum.talk || []).forEach(x => items.push({ t: x.t, kid: x.prompt, genie: x.reply, plan: x.plan }));
    items.sort((a, b) => a.t - b.t);
    const lastPlan = pend ? items.map(x => !!(x.plan && x.plan.length)).lastIndexOf(true) : -1;
    const kidText = t => String(t || '').includes('\n') ? `<pre class="kpre">${esc(t)}</pre>` : esc(t);
    chat.innerHTML = items.map((x, k) => x.sys ? `<div class="msg sys ${x.i === sum.cur ? 'cur' : ''}">${esc(x.sys)}${x.i != null && x.i !== sum.cur ? ` <button class="tm-back" data-i="${x.i}">回到这里</button>` : ''}</div>`
      : `<div class="msg kid">${kidText(x.kid)}</div><div class="msg genie ${x.i === sum.cur ? 'cur' : ''}">${IC.genie}<span>${esc(x.genie || '')}${x.plan && x.plan.length ? `<ol class="plan">${x.plan.map(p => `<li>${esc(p)}</li>`).join('')}</ol>${k === lastPlan ? '<span class="planbtns"><button class="btn sm green" id="pok">同意，开始做</button><button class="btn sm ghost" id="pno">不对，我再说清楚</button></span>' : ''}` : ''}${x.i != null ? `<span class="ver">第 ${x.i + 1} 版${x.i === sum.cur ? '（现在）' : ` <button class="tm-back" data-i="${x.i}">时光机：回到这一版</button>`}</span>` : ''}</span></div>`).join('')
      || `<div class="msg sys">${o.plan ? '说你想怎么改：精灵会先说计划，你同意了它才动手' : '告诉精灵你想让游戏变成什么样'}</div>`;
    chat.scrollTop = chat.scrollHeight;
    $$('.tm-back', chat).forEach(b => b.onclick = async () => { const r = await ST.net.post('go', { proj, i: +b.dataset.i }); if (!active()) return; if (r.err) return toast(r.err); toast('坐时光机回去了'); loadGame(); });
    const ok = $('#pok', chat); if (ok) ok.onclick = () => decide(true);
    const no = $('#pno', chat); if (no) no.onclick = () => decide(false);
  }
  async function decide(yes) {   // 先说计划：同意就照做，不同意就重说
    if (!active() || pending) return; pending = true; showBusy(yes); sb.go.disabled = true;
    const r = await ST.net.post('genie', yes ? { proj, approve: true } : { proj, reject: true });
    if (!active()) return;
    pending = false; showBusy(false); sb.go.disabled = false; pend = null;
    if (r.err) { toast(r.err); return; }
    if (r.changed) await loadGame(); else { sum = r.summary || sum; drawChat(); if (!yes) sb.el.querySelector('input,textarea') && sb.el.querySelector('input,textarea').focus(); }
  }
  async function ask(prompt, error, clear) {
    if (!active() || pending) return; pending = true; showBusy(!o.plan || !!error); sb.go.disabled = true;
    if (prompt) chat.insertAdjacentHTML('beforeend', `<div class="msg kid">${kidText0(prompt)}</div>${o.plan && !error ? '<div class="msg sys" id="pwait">精灵在想计划……</div>' : ''}`); chat.scrollTop = chat.scrollHeight;
    const r = await ST.net.post('genie', { proj, prompt, error, plan: !!o.plan && !error });
    if (!active()) return;
    pending = false; showBusy(false); sb.go.disabled = false;
    if (r.err) { const w = $('#pwait', chat); if (w) w.remove(); toast(r.err); return; }
    clear && clear();
    if (o.plan && !error) pend = r.plan && r.plan.length ? { plan: r.plan } : null;
    if (r.changed) { await loadGame(); } else { sum = r.summary || sum; drawChat(); }
  }
  const kidText0 = t => String(t || '').includes('\n') ? `<pre class="kpre">${esc(t)}</pre>` : esc(t);
  const sb = sayBar(o.plan ? '说你想怎么改，精灵先说计划' : proj === 'home' && !o.tasks ? '说出你想做的游戏，或者想怎么改' : '告诉精灵你想让游戏变成什么样', (v, clear) => ask(v, null, clear));
  $('#sb', el).appendChild(sb.el);
  $('#rl', el).onclick = () => loadGame();

  // 任务
  const drawTasks = v => {
    const box = $('#tasks', el); if (!box) return;
    const mine = (v.mine || {}).tasks || [false, false, false];
    box.innerHTML = o.tasks.map(t => { const lock = t.lv === 3 && !mine[1]; return `<button class="task l${t.lv} ${mine[t.lv - 1] ? 'ok' : ''} ${lock ? 'locked' : ''}" data-lv="${t.lv}"><span class="lv">${'★'.repeat(t.lv)}</span><span>${lock ? '做完 ★★ 解锁高手任务' : esc(t.t)}</span><span class="ck">✓</span></button>`; }).join('');
    $$('.task', box).forEach(b => b.onclick = () => { if (b.classList.contains('locked')) return toast('先做完 ★★'); const lv = +b.dataset.lv; ST.net.act({ type: 'task', lv, on: !mine[lv - 1] }); });
  };
  // 抓虫、交作品、修好了
  const drawExtra = v => {
    const box = $('#extra', el); const mine = v.mine || {}; let h = '';
    if (o.claims) { const cl = mine.claims || []; h += o.claims.map(b => { const c = cl.filter(x => x.bug === b).pop(); return `<button class="btn sm ${c && c.status === 'ok' ? 'green' : c && c.status === 'wait' ? 'ghost' : 'purple'}" data-bug="${esc(b)}" ${c && c.status !== 'no' ? 'disabled' : ''}>${c ? (c.status === 'ok' ? '✓ ' : c.status === 'wait' ? '等确认 ' : '再试 ') : '我抓到了 '}${esc(b)}</button>`; }).join(''); }
    if (o.submit) { const c = (mine.claims || []).filter(x => !x.bug).pop(); h += `<button class="btn ${c && c.status === 'ok' ? 'green' : ''}" id="sub" ${c && c.status !== 'no' ? 'disabled' : ''}>${c ? (c.status === 'ok' ? '✓ 老师说改对了' : c.status === 'wait' ? '等老师检查' : '还差一点，再改改，再交') : '我改好了'}</button>`; }
    if (o.fixed) h += mine.fixed ? `<div class="card" style="width:100%"><span class="tag">修好了 ✓ 原来的捣蛋卡是</span><div style="font-size:20px;font-weight:900;margin-top:6px">${esc(mine.theirCard || '')}</div></div>` : `<button class="btn green" id="fixed">我修好了</button>`;
    box.innerHTML = h;
    $$('[data-bug]', box).forEach(b => b.onclick = async () => { const r = await ST.net.act({ type: 'claim', bug: b.dataset.bug }); if (r && r.err) toast(r.err); else toast('交上去了，等老师确认'); });
    const sub = $('#sub', box); if (sub) sub.onclick = async () => { const r = await ST.net.act({ type: 'claim' }); if (r && r.err) toast(r.err); };
    const fx = $('#fixed', box); if (fx) fx.onclick = async () => { const r = await ST.net.act({ type: 'trick.fixed' }); if (r && r.err) toast(r.err); };
  };
  const upd = v => { if (!active()) return; if (o.tasks) drawTasks(v); drawExtra(v); showBusy(pending || !!v.busy); };
  loadGame(); upd(ST.V);
  return { upd, off() { disposed = true; ++loadId; if (G) G.destroy(); if (frame._errOff) frame._errOff(); if (ed && ed.off) ed.off(); } };
}

// ================= 编舞台 =================
function danceStudio(s, el, v) {
  const own = !!s.own, g = own ? null : v.me.group;
  el.innerHTML = `<div class="studio">
    <div class="gamecol"><div class="row"><h2 class="h2 grow">${esc(s.title)}</h2>${own && v.me.dog ? `<span class="tag" style="font-size:16px">${esc(v.me.dog)}</span>` : g ? `<span class="tag" style="font-size:16px">第 ${g.no} 组 · ${esc(g.role)}</span>` : ''}<span class="tag" id="md" style="font-size:16px"></span></div>
      <div class="dogbox" id="db"><div class="floor"></div><div style="margin-bottom:30px">${bitEl(240, 'idle')}</div></div>
      <div class="seq" id="seq"></div>
      <div class="acts">${ACTS.map(a => `<button class="act" data-a="${a}">${a}</button>`).join('')}</div>
      <div class="row" style="flex-wrap:wrap"><b>重复</b>${[1, 2, 3].map(n => `<button class="btn sm ghost rp" data-n="${n}">${n} 次</button>`).join('')}<span class="grow"></span><button class="btn sm ghost" id="clr">清空</button><button class="btn sm" id="pv">${IC.play} 预览</button><button class="btn sm green" id="send">发给比特</button></div>
    </div>
    <div class="side"><div class="tasks" id="tasks"></div><div class="chat" id="chat"></div><div id="sb"></div></div></div>`;
  let D = { dances: [], cur: -1 }, seq = [], repeat = 1, mood = '开心', token = { stop: true }, pending = false;
  const bit = $('#db .bit', el);
  const drawSeq = (now = -1) => { $('#seq', el).innerHTML = seq.length ? seq.map((a, i) => `<div class="s ${i === now ? 'now' : ''}" data-i="${i}">${a} <span style="opacity:.5">×</span></div>`).join('') : '<span class="muted">先跟精灵说想要什么舞，或者点下面的动作自己排</span>'; $$('#seq .s', el).forEach(c => c.onclick = () => { seq.splice(+c.dataset.i, 1); drawSeq(); saveEdit(); }); $$('.rp', el).forEach(b => b.classList.toggle('dark', +b.dataset.n === repeat)); $$('.rp', el).forEach(b => b.style.background = +b.dataset.n === repeat ? 'var(--navy)' : ''); $$('.rp', el).forEach(b => b.style.color = +b.dataset.n === repeat ? '#fff' : ''); };
  const drawChat = () => { $('#chat', el).innerHTML = D.dances.length ? D.dances.map((d, i) => `<div class="msg kid">${esc(d.prompt)}</div><div class="msg genie ${i === D.cur ? 'cur' : ''}">${IC.genie}<span>${esc(d.reply || '')}<span class="ver">${d.seq.join(' → ')}${d.repeat > 1 ? ' ×' + d.repeat : ''}</span></span></div>`).join('') : '<div class="msg sys">比如：跳一段像机器人一样的舞，先慢后快，最后鞠躬</div>'; $('#chat', el).scrollTop = 1e6; };
  const useCur = () => { const d = D.dances[D.cur]; if (d) { seq = d.seq.slice(); repeat = d.repeat || 1; mood = d.mood || '开心'; } $('#md', el).textContent = mood + '的样子'; drawSeq(); drawChat(); };
  let et = null;
  const saveEdit = () => { clearTimeout(et); et = setTimeout(async () => { if (!seq.length) return; const r = await ST.net.post('dance-edit', { seq, repeat, mood }); if (r && r.dance) { D = r.dance; drawChat(); } }, 600); };
  const play = async () => { token.stop = true; await sleep(30); token = { stop: false }; const my = token; const full = []; for (let k = 0; k < repeat; k++) full.push(...seq); await playSeq(bit, full, mood, i => drawSeq(i < 0 ? -1 : i % seq.length), my); };
  ST.net.get('dance', {}).then(r => { if (r && r.dances) { D = r; useCur(); } else useCur(); });
  $$('.act', el).forEach(b => b.onclick = () => { if (seq.length >= 12) return; seq.push(b.dataset.a); drawSeq(); saveEdit(); });
  $$('.rp', el).forEach(b => b.onclick = () => { repeat = +b.dataset.n; drawSeq(); saveEdit(); });
  $('#clr', el).onclick = () => { seq = []; drawSeq(); };
  $('#pv', el).onclick = () => { if (seq.length) play(); };
  $('#send', el).onclick = async () => { if (!seq.length) return; clearTimeout(et); if (D.dances[D.cur] && D.dances[D.cur].seq.join() !== seq.join()) await ST.net.post('dance-edit', { seq, repeat, mood }); const r = await ST.net.post('dance-send', { own }); if (r.err) return toast(r.err); toast(!REAL_DOG && own ? '发到大屏了！大屏上你的狗会跳一遍' : r.sent === 'sent' ? (own ? '发给你的狗了！' : '发给比特了！') : '发出去了（没连真狗，大屏上的比特在跳）'); play(); };
  const sb = sayBar('你想让比特跳什么样的舞？', async (p, clear) => {
    if (pending) return; pending = true; sb.go.disabled = true;
    $('#chat', el).insertAdjacentHTML('beforeend', `<div class="msg kid">${esc(p)}</div><div class="msg sys">比特在想……</div>`);
    const r = await ST.net.post('dance', { prompt: p }); pending = false; sb.go.disabled = false;
    if (r.err) { toast(r.err); drawChat(); return; }
    clear(); D = r.dance; useCur(); play();
  });
  $('#sb', el).appendChild(sb.el);
  const upd = v => {
    const mine = (v.mine || {}).tasks || [false, false, false]; const box = $('#tasks', el);
    box.style.display = s.tasks ? '' : 'none';
    box.innerHTML = (s.tasks || []).map(t => `<button class="task l${t.lv} ${mine[t.lv - 1] ? 'ok' : ''}" data-lv="${t.lv}"><span class="lv">${'★'.repeat(t.lv)}</span><span>${esc(t.t)}</span><span class="ck">✓</span></button>`).join('');
    $$('.task', box).forEach(b => b.onclick = () => { const lv = +b.dataset.lv; ST.net.act({ type: 'task', lv, on: !mine[lv - 1] }); });
    const role = v.me.group && v.me.group.role; const sd = $('#send', el);
    if (own) { sd.disabled = false; sd.textContent = REAL_DOG ? '发给我的狗' : '发到大屏'; } else { sd.disabled = role !== '编舞师'; sd.textContent = role === '编舞师' ? '发给比特' : '编舞师才能发'; }
    const m = (v.mine || {}).mood; if (m && !D.dances.length) { $('#md', el).textContent = '你们抽到：' + m; }
  };
  upd(v); return { upd, off() { token.stop = true; } };
}

// ================= 角色卡：给比特设定角色 =================
function speakAs(text, voice) {
  try {
    if (!window.speechSynthesis || !text || window.__MUTE) return;
    const vp = VOICES[voice] || VOICES['正常'];
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/【[^】]*】/g, '').slice(0, 160));
    u.lang = 'zh-CN'; u.pitch = vp.pitch; u.rate = vp.rate;
    const zh = (speechSynthesis.getVoices() || []).find(x => /zh[-_]CN/i.test(x.lang)) || (speechSynthesis.getVoices() || []).find(x => /^zh/i.test(x.lang));
    if (zh) u.voice = zh;
    speechSynthesis.speak(u);
  } catch (e) { }
}
function personaStudio(s, el, v) {
  const own = !!s.own, slot = own ? 'mydog' : undefined, sayMode = !!s.say, MAXR = sayMode ? 6 : 4;
  const blank = { name: '', identity: '', trait: '', extra: '', talk: '', catch: '', voice: '正常', rules: [] };
  let card = Object.assign({}, blank), chat = [], dirty = false, saving = null, pending = false, sound = false, token = { stop: true };
  const DO = (sayMode ? [''] : []).concat(ACTS.filter(a => a !== '等一下'));
  const ruleLabel = sayMode ? '<span class="lvb">口令表</span> 听到什么，就做什么、说什么' : '<span class="lvb">★★★</span> 规则：听到或看到什么，就做什么动作';
  el.innerHTML = `<div class="studio">
    <div class="pcard" id="pc">
      <div class="row"><h2 class="h2 grow">${own ? '我的狗的角色卡' : '比特的角色卡'}</h2><span class="tag" id="gtag" style="font-size:15px"></span><span class="muted" id="sv" style="font-size:14px;font-weight:800"></span></div>
      <div id="sent"></div>
      <div class="fld"><label>名字</label><input class="inp" data-f="name" maxlength="10" placeholder="给它起个名字"></div>
      <div class="fld"><label>它是你的……</label><div class="chips" id="idc">${IDENTITIES.map(x => `<button class="pchip" data-v="${x}">${x}</button>`).join('')}</div><input class="inp" data-f="identity" maxlength="12" placeholder="也可以自己写，比如：太空搭档"></div>
      <div class="fld"><label>性格 <span class="muted" style="font-size:13px">（选一个，「猜性格」要用）</span></label><div class="chips" id="trc">${PERSONALITIES.map(x => `<button class="pchip" data-v="${x}">${x}</button>`).join('')}</div></div>
      <div class="fld"><label>还想让它是什么样？</label><div class="row" style="align-items:flex-end"><textarea class="inp grow" data-f="extra" maxlength="60" placeholder="想到什么写什么：喜欢什么、害怕什么、有什么怪习惯……"></textarea><button class="mic" id="xmic">${MIC_SVG}</button></div></div>
      <div class="row" style="align-items:flex-start"><div class="fld grow"><label>说话的样子</label><input class="inp" data-f="talk" maxlength="40" placeholder="比如：说话很慢、爱用成语"></div><div class="fld grow"><label>口头禅</label><input class="inp" data-f="catch" maxlength="20" placeholder="它常说的一句话"></div></div>
      <div class="fld"><label>声音</label><div class="chips" id="vc">${Object.keys(VOICES).map(x => `<button class="pchip" data-v="${x}">${x}</button>`).join('')}<button class="btn sm ghost" id="try">🔊 试听</button></div></div>
      <div class="fld" id="rulefld"><label>${ruleLabel}</label><div id="rules" class="col" style="gap:8px"></div><button class="btn sm ghost" id="addr" style="align-self:flex-start">+ 加一条${sayMode ? '口令' : '规则'}</button></div>
      <div class="row" style="margin-top:4px"><span class="grow"></span><button class="btn green" id="send">${own ? (REAL_DOG ? '发给我的狗' : '让我的狗上线') : '发给比特'}</button></div>
    </div>
    <div class="side">
      <div class="tasks" id="tasks"></div>
      <div class="dogbox" id="db" style="min-height:170px"><div class="floor"></div><div style="margin-bottom:22px">${bitEl(150, 'idle')}</div><div class="bsay" id="bsay"></div><button class="snd" id="snd" title="虚拟比特的声音（默认关，教室里太吵）">🔇</button></div>
      <div class="chat" id="chat"></div>
      <div id="sb"></div>
    </div></div>`;
  const bit = $('#db .bit', el);
  const fields = $$('[data-f]', el);
  micFor($('[data-f="extra"]', el), $('#xmic', el));
  const drawRules = () => {
    const box = $('#rules', el);
    box.innerHTML = card.rules.length ? card.rules.map((r, i) => `<div class="rrow ${sayMode ? 'say' : ''}"><span>${sayMode ? '听到' : '听到/看到'}</span><input class="inp" data-ri="${i}" data-k="when" maxlength="12" value="${esc(r.when || '')}" placeholder="${sayMode ? '口令，比如：开饭啦' : '比如：下课啦'}"><span>就</span><select class="inp" data-ri="${i}" data-k="do">${DO.map(a => `<option value="${a}" ${a === (r.do || '') ? 'selected' : ''}>${a || '不做动作'}</option>`).join('')}</select>${sayMode ? `<input class="inp" data-ri="${i}" data-k="say" maxlength="24" value="${esc(r.say || '')}" placeholder="还说一句（可以不填）">` : ''}<button class="rx" data-ri="${i}">×</button></div>`).join('') : `<div class="muted" style="font-size:15px">还没有${sayMode ? '口令' : '规则'}</div>`;
    $$('[data-k]', box).forEach(n => { const f = () => { card.rules[+n.dataset.ri][n.dataset.k] = n.value; touch(); }; n.oninput = f; n.onchange = f; });
    $$('.rx', box).forEach(b => b.onclick = () => { card.rules.splice(+b.dataset.ri, 1); drawRules(); touch(); });
    $('#addr', el).disabled = card.rules.length >= MAXR;
  };
  const drawCard = () => {
    fields.forEach(n => { if (document.activeElement !== n) n.value = card[n.dataset.f] || ''; });
    $$('#idc .pchip', el).forEach(b => b.classList.toggle('on', b.dataset.v === card.identity));
    $$('#trc .pchip', el).forEach(b => b.classList.toggle('on', b.dataset.v === card.trait));
    $$('#vc .pchip', el).forEach(b => b.classList.toggle('on', b.dataset.v === (card.voice || '正常')));
    drawRules();
  };
  const drawChat = () => {
    const c = $('#chat', el);
    c.innerHTML = chat.length ? chat.map(m => `<div class="msg kid">${esc(m.q)}</div><div class="msg genie bitmsg"><span class="bav">${esc((card.name || '比特').slice(0, 2))}</span><span>${esc(m.a)}${m.acts && m.acts.length ? `<span class="ver">动作：${m.acts.map(esc).join('、')}</span>` : ''}</span></div>`).join('')
      : `<div class="msg sys">${card.trait ? '跟虚拟比特说句话，看它像不像你设定的样子' : '先填好名字和性格，再跟它聊天'}</div>`;
    c.scrollTop = c.scrollHeight;
  };
  const setSv = t => { const n = $('#sv', el); if (n) n.textContent = t; };
  const save = async () => {
    clearTimeout(saving); saving = null; if (!dirty) return true;
    dirty = false; setSv('保存中…');
    const r = await ST.net.post('persona-save', { card, slot });
    if (r && r.err) { toast(r.err); dirty = true; setSv(''); return false; }
    setSv('已保存 ✓'); return true;
  };
  function touch() { dirty = true; setSv(''); clearTimeout(saving); saving = setTimeout(save, 800); drawChat(); }
  fields.forEach(n => n.oninput = () => { card[n.dataset.f] = n.value; if (n.dataset.f === 'identity') $$('#idc .pchip', el).forEach(b => b.classList.toggle('on', b.dataset.v === n.value)); touch(); });
  $$('#idc .pchip', el).forEach(b => b.onclick = () => { card.identity = b.dataset.v; drawCard(); touch(); });
  $$('#trc .pchip', el).forEach(b => b.onclick = () => { card.trait = b.dataset.v; drawCard(); touch(); });
  $$('#vc .pchip', el).forEach(b => b.onclick = () => { card.voice = b.dataset.v; drawCard(); touch(); speakAs(`你好，我是${card.name || '比特'}`, card.voice); });
  $('#try', el).onclick = () => speakAs(`你好，我是${card.name || '比特'}${card.catch ? '，' + card.catch : ''}`, card.voice);
  $('#addr', el).onclick = () => { if (card.rules.length >= MAXR) return; card.rules.push({ when: '', do: sayMode ? '' : DO[0], say: '' }); drawRules(); };
  $('#snd', el).onclick = () => { sound = !sound; $('#snd', el).textContent = sound ? '🔊' : '🔇'; if (!sound) try { speechSynthesis.cancel(); } catch (e) { } };
  const animate = async (acts, text) => {
    token.stop = true; await sleep(30); token = { stop: false }; const my = token;
    const b = $('#bsay', el); b.textContent = text || ''; b.classList.toggle('on', !!text);
    bit.classList.add('say');
    if (acts && acts.length) await playSeq(bit, acts, '开心', null, my); else await sleep(1600);
    if (!my.stop) { bit.className = 'bit idle'; }
  };
  const sb = sayBar('跟比特说话，或者按住话筒说', async (text, clear) => {
    if (pending) return;
    if (!card.name || !card.trait) { toast('先填名字、选性格'); return; }
    if (!(await save())) return;
    pending = true; sb.go.disabled = true;
    $('#chat', el).insertAdjacentHTML('beforeend', `<div class="msg kid">${esc(text)}</div><div class="msg sys">${esc(card.name)}在想……</div>`); $('#chat', el).scrollTop = 1e6;
    const r = await ST.net.post('persona-chat', { text, slot });
    pending = false; sb.go.disabled = false;
    if (r.err) { toast(r.err); drawChat(); return; }
    clear(); chat = (r.persona && r.persona.chat) || chat.concat([{ q: text, a: r.reply, acts: r.acts }]); drawChat();
    if (sound) speakAs(r.reply, card.voice);
    animate(r.acts, r.reply);
  });
  $('#sb', el).appendChild(sb.el);
  $('#send', el).onclick = async () => {
    if (!card.name || !card.trait) return toast('先填名字、选性格');
    if (!(await save())) return;
    const r = await ST.net.post('persona-send', { slot });
    if (r.err) return toast(r.err);
    toast(!REAL_DOG && own ? `「${card.name}」上线了！大屏上能看到` : r.sent === 'sent' ? `「${card.name}」发给${own ? '你的狗' : '比特'}了！${own && ST.V.turn && ST.V.turn !== ST.V.me.team ? '等轮到你们队再跟它说话' : '去跟它说话吧'}` : r.sent === 'error' ? '没连上真狗，请老师看一下' : '发出去了（没连真狗，大屏上能看到）');
    animate(['摇尾巴', '叫一声'], `我是${card.name}！`);
  };
  ST.net.get('persona', { slot }).then(r => { if (r && r.card) card = Object.assign({}, blank, r.card, { rules: (r.card.rules || []).map(x => Object.assign({}, x)) }); chat = (r && r.chat) || []; if (r && r.fresh) { if (own && v.me.dog) card.name = v.me.dog; touch(); if (r.from) toast('你在第 4 节写过角色卡，先抄过来了，改成你的狗的样子吧'); } drawCard(); drawChat(); });
  drawCard(); drawChat();
  const upd = v => {
    const g = v.me.group, role = g && g.role, mine = (v.mine || {}).tasks || [false, false, false];
    const sd = $('#send', el), sent = (v.mine || {}).sent;
    if (own) {
      $('#gtag', el).textContent = v.me.dog ? `${v.me.dog}` : '还没给狗起名字';
      sd.disabled = false;
      $('#sent', el).innerHTML = sent ? `<div class="sentc">${svgSize(IC.paw, 28)}<span>你的狗现在是「${esc(sent.name || '')}」· ${esc(sent.identity || '')} · ${esc(sent.trait || '')}${sent.rules ? ` · ${sent.rules} 条口令` : ''}</span></div>` : '';
    } else {
      $('#gtag', el).textContent = g ? `第 ${g.no} 组 · ${g.dog} · ${role}` : '还没分组';
      sd.disabled = role !== '设计师'; sd.textContent = role === '设计师' ? '发给比特' : g ? '设计师才能发 · 换岗后轮到你' : '分组后才能发';
      $('#sent', el).innerHTML = sent ? `<div class="sentc">${svgSize(IC.robot, 30)}<span>你们组的比特现在是「${esc(sent.name || '比特')}」· ${esc(sent.identity || '')} · ${esc(sent.trait || '')}<span class="muted">（${esc(sent.by || '')} 发的）</span></span></div>` : '';
    }
    const box = $('#tasks', el);
    box.innerHTML = s.tasks.map(t => { const lock = t.lv === 3 && !mine[1]; return `<button class="task l${t.lv} ${mine[t.lv - 1] ? 'ok' : ''} ${lock ? 'locked' : ''}" data-lv="${t.lv}"><span class="lv">${'★'.repeat(t.lv)}</span><span>${lock ? '做完 ★★ 解锁高手任务' : esc(t.t)}</span><span class="ck">✓</span></button>`; }).join('');
    $$('.task', box).forEach(b => b.onclick = () => { if (b.classList.contains('locked')) return toast('先做完 ★★'); const lv = +b.dataset.lv; ST.net.act({ type: 'task', lv, on: !mine[lv - 1] }); });
  };
  upd(v);
  return { upd, off() { token.stop = true; if (dirty) save(); try { speechSynthesis.cancel(); } catch (e) { } } };
}

// ================= 游戏设计卡（第 6 节）：先想清楚四块，再交给精灵 =================
const DESIGN_FIELDS = [
  { k: 'hero', tag: '角色', c: '#FF8A3D', q: '主角是谁？在什么地方？', ph: '比如：一只会喷火的小恐龙，在火山上' },
  { k: 'rule', tag: '规则', c: '#3D8BFF', q: '怎么玩？碰到什么会怎样？', ph: '想到几条写几条' },
  { k: 'score', tag: '得分', c: '#2ECC9A', q: '怎么得分？怎么算赢？', ph: '' },
  { k: 'end', tag: '结束', c: '#8B6CFF', q: '什么时候结束？', ph: '' },
  { k: 'extra', tag: '还有', c: '#FF6FA5', q: '还想加什么？', ph: '背景、声音、彩蛋……想到什么写什么' }
];
function taskButtons(box, tasks, v) {
  if (!box) return;
  const mine = (v.mine || {}).tasks || [false, false, false];
  box.innerHTML = tasks.map(t => { const lock = t.lv === 3 && !mine[1]; return `<button class="task l${t.lv} ${mine[t.lv - 1] ? 'ok' : ''} ${lock ? 'locked' : ''}" data-lv="${t.lv}"><span class="lv">${'★'.repeat(t.lv)}</span><span>${lock ? '做完 ★★ 解锁高手任务' : esc(t.t)}</span><span class="ck">✓</span></button>`; }).join('');
  $$('.task', box).forEach(b => b.onclick = () => { if (b.classList.contains('locked')) return toast('先做完 ★★'); const lv = +b.dataset.lv; ST.net.act({ type: 'task', lv, on: !mine[lv - 1] }); });
}
function designStudio(s, el, v) {
  const proj = s.proj || 'mygame';
  if (ST.designView === 'game') {
    const r = studio(el, { proj, title: s.title, tasks: s.tasks });
    const row = $('.gamecol .row', el); row.insertAdjacentHTML('afterbegin', '<button class="btn sm ghost" id="dcard">‹ 设计卡</button>');
    $('#dcard', el).onclick = () => { ST.designView = 'card'; ST.key = null; route(); };
    return r;
  }
  el.innerHTML = `<div class="studio">
    <div class="pcard" id="dz">
      <div class="row"><h2 class="h2 grow">我的游戏设计卡</h2><span class="muted" id="sv" style="font-size:14px;font-weight:800"></span></div>
      <div class="fld"><label>游戏叫什么？</label><input class="inp" data-f="name" maxlength="16" placeholder="先空着也行，想好了再填"></div>
      ${DESIGN_FIELDS.map(f => `<div class="fld"><label><span class="dtag" style="background:${f.c}">${f.tag}</span>${esc(f.q)}</label><div class="row" style="align-items:flex-end"><textarea class="inp grow" data-f="${f.k}" maxlength="80" placeholder="${esc(f.ph)}"></textarea><button class="mic" data-mic="${f.k}">${MIC_SVG}</button></div></div>`).join('')}
    </div>
    <div class="side">
      <div class="tasks" id="tasks"></div>
      <div class="card" id="gsay" style="display:none"></div>
      <div class="col" style="gap:10px;margin-top:auto"><button class="btn green" id="make" style="height:64px;font-size:22px">${svgSize(IC.wand, 30)} 交给精灵做出来</button><button class="btn ghost" id="toGame" style="display:none">去玩、去改我的游戏 ›</button>
      <p class="muted" style="margin:0;font-size:15px">四块都想清楚，精灵才做得像你想的。做出来不像？回来改设计卡，或者直接跟精灵说。</p></div>
    </div></div>`;
  let card = { name: '', hero: '', rule: '', score: '', end: '', extra: '' }, dirty = false, saving = null, sum = null, busy = false;
  const fields = $$('[data-f]', el);
  $$('[data-mic]', el).forEach(b => micFor($(`[data-f="${b.dataset.mic}"]`, el), b));
  const setSv = t => { const n = $('#sv', el); if (n) n.textContent = t; };
  const save = async () => { clearTimeout(saving); if (!dirty) return true; dirty = false; setSv('保存中…'); const r = await ST.net.post('design-save', { card }); if (r && r.err) { toast(r.err); dirty = true; setSv(''); return false; } setSv('已保存 ✓'); return true; };
  fields.forEach(n => n.oninput = () => { card[n.dataset.f] = n.value; dirty = true; setSv(''); clearTimeout(saving); saving = setTimeout(save, 800); });
  const draw = () => { fields.forEach(n => { if (document.activeElement !== n) n.value = card[n.dataset.f] || ''; }); };
  const showGame = () => { $('#toGame', el).style.display = sum && sum.n > 1 ? '' : 'none'; $('#make', el).innerHTML = `${svgSize(IC.wand, 30)} ${sum && sum.n > 1 ? '按设计卡重新做一个' : '交给精灵做出来'}`; };
  ST.net.get('design', {}).then(r => { if (r && r.card) card = Object.assign(card, r.card); draw(); });
  ST.net.get('work', { sid: ST.sid, proj }).then(r => { sum = r && r.summary; showGame(); });
  $('#toGame', el).onclick = () => { ST.designView = 'game'; ST.key = null; route(); };
  $('#make', el).onclick = async () => {
    if (busy) return;
    if (!card.hero.trim() || !card.rule.trim()) { toast('至少写好「角色」和「规则」'); return; }
    if (!(await save())) return;
    busy = true; const btn = $('#make', el); btn.disabled = true; btn.textContent = '精灵正在照着设计卡做……';
    const gs = $('#gsay', el); gs.style.display = 'none';
    if (sum && sum.n > 1) { const x = await ST.net.post('import', { proj, from: 'blank' }); if (x.err) { toast(x.err); } }
    const lines = [`做一个新游戏${card.name ? '，名字叫《' + card.name + '》' : ''}。`].concat(DESIGN_FIELDS.filter(f => card[f.k].trim()).map(f => `${f.tag}：${card[f.k].trim()}`));
    const r = await ST.net.post('genie', { proj, prompt: lines.join('\n') });
    busy = false; if (!$('#make', el)) return; btn.disabled = false; showGame();
    if (r.err) { toast(r.err); return; }
    if (r.changed) { ST.net.act({ type: 'design.done', name: card.name || '我的游戏' }); toast('做好了！去玩一玩'); ST.designView = 'game'; ST.key = null; route(); return; }
    gs.style.display = ''; gs.innerHTML = `<div style="display:flex;gap:10px;align-items:flex-start">${svgSize(IC.genie, 40)}<span style="font-size:18px;font-weight:700">${esc(r.reply || '')}</span></div>`;
  };
  const upd = v => taskButtons($('#tasks', el), s.tasks, v);
  upd(v);
  return { upd, off() { if (dirty) save(); } };
}

// ================= 启动 =================
async function playSeq(bit, seq, mood, onStep, token) {
  const m = MOODS[mood] || MOODS['开心'];
  bit.className = 'bit ' + m.cls; bit.style.setProperty('--d', m.d + 'ms');
  for (let i = 0; i < seq.length; i++) {
    if (token.stop) break; onStep && onStep(i);
    bit.removeAttribute('data-act'); void bit.offsetWidth; bit.setAttribute('data-act', seq[i]);
    await sleep(m.d + 140);
  }
  bit.removeAttribute('data-act'); bit.className = 'bit idle ' + m.cls; if (!token.stop && onStep) onStep(-1);
}
const ENGINES = { catch: CatchGame, runner: RunnerGame, whack: WhackGame, home: HomeGame };
function startStudent(opts) {
  opts = opts || {};
  ST.hubMode = !!opts.hub;
  ST.net = makeNet({ role: 'student', hub: opts.hub });
  const saved = opts.hub ? null : load();
  if (opts.join) { ST.net.post('join', { name: opts.join }).then(r => { ST.tok = r.tok; ST.sid = r.sid; ST.net.setTok(r.tok, r.sid); connect(); }); return; }
  if (saved && saved.tok) { ST.tok = saved.tok; ST.sid = saved.sid; ST.net.setTok(saved.tok, saved.sid); connect(); }
  else renderJoin();
}

if (!window.__NO_AUTOSTART) startStudent();
