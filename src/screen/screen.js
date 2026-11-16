// ================= 大屏：外壳（顶栏、翻页、浮层）和同步 =================
// 服务器模式：老师端控制，大屏只显示（带 ?k=口令 打开的大屏也能点）。
// 单机模式：直接双击 html 打开，没有平板，整套课在这一个页面里跑，像以前的课件一样用键盘翻页。
const SC = { net: null, V: null, canCtl: false, standalone: false, cur: null, seen: new Set(), last: {}, status: 'ok', month: 0, mini: false };
const lessonById = id => LESSONS.find(L => L.id === id) || null;
const curPts = () => { const V = SC.V; if (!V || !V.lesson) return packPts(monthOf(SC.month).pack); return (V.pts || {})[V.lesson] || { o: 0, b: 0 }; };
const monthOf = i => MONTHS[Math.max(0, Math.min(MONTHS.length - 1, i | 0))];
function packPts(ids) { return (ids || PACK).reduce((a, id) => { const p = ((SC.V && SC.V.pts) || {})[id] || { o: 0, b: 0 }; return { o: a.o + p.o, b: a.b + p.b }; }, { o: 0, b: 0 }); }
const X = { ctl: a => SC.canCtl ? SC.net.act(a) : Promise.resolve({ err: '只读' }) };

// ---------- 顶栏 ----------
function renderBar() {
  const V = SC.V || {}, L = lessonById(V.lesson), onMap = !L;
  const team = t => `<div class="team ${t}" id="t${t.toUpperCase()}"><span class="tname">${esc(tn(t))}</span><div class="n">${IC.bolt}<b></b></div>${!onMap && SC.canCtl ? `<button data-t="${t}" data-d="-1">−</button><button data-t="${t}" data-d="1">+</button>` : ''}</div>`;
  $('#bar').innerHTML = `
    ${SC.canCtl ? `<button class="tbtn" id="bMap" title="学院地图（M）">${IC.home}</button>` : ''}
    <div id="lessonPill" style="background:${L ? L.color : 'var(--navy)'}">${L ? esc(L.no) + ' · ' + esc(L.title) : 'AI 驯狗学院'}</div>
    <div class="spacer"></div>
    <div id="miniTimer">${IC.clock}<span class="mt">0:00</span></div>
    <span class="turnpill" id="tpill"></span>
    ${onMap ? `<span class="sm" style="flex:none">${esc(monthOf(SC.month).t)}总能量</span>` : ''}${team('o')}${team('b')}
    ${SC.canCtl ? `<button class="tbtn" id="bTimer" title="计时器（T）">${IC.clock}计时</button><button class="tbtn" id="bPick" title="点名（P）">${IC.dice}点名</button><button class="tbtn" id="bQuiet" title="安静（Q）">${IC.hush}安静</button>`
      : `<span class="conn ${SC.status}" id="conn" title="和老师端的连接"></span>`}`;
  if (SC.canCtl) {
    $('#bMap').onclick = () => X.ctl({ type: 'go', lesson: null, slide: 0 });
    $('#bTimer').onclick = openTimer; $('#bPick').onclick = () => X.ctl({ type: 'pick' }); $('#bQuiet').onclick = () => X.ctl({ type: 'quiet', on: !(SC.V && SC.V.quiet) });
    $$('.team button').forEach(b => b.onclick = () => X.ctl({ type: 'pts.add', t: b.dataset.t, d: +b.dataset.d }));
  }
  updBar();
}
function updBar() {
  const p = curPts();
  ['o', 'b'].forEach(t => { const n = $(`#t${t.toUpperCase()} .n b`); if (n) { if (n.textContent !== '' && +n.textContent < p[t]) { const el = n.closest('.team'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); } n.textContent = p[t]; } const nm = $(`#t${t.toUpperCase()} .tname`); if (nm) nm.textContent = tn(t); });
  const c = $('#conn'); if (c) c.className = 'conn ' + SC.status;
  const tp = $('#tpill'), V = SC.V || {};
  if (tp) { tp.className = 'turnpill ' + (V.sleep ? 'sleep' : V.turn || ''); tp.innerHTML = V.sleep ? `${IC.hush}全体趴下` : V.turn ? `${IC.mic}${esc(tn(V.turn))}开口` : ''; }
}
let lastTick = -1;
setInterval(() => {   // 计时器每 0.25 秒刷新一次
  const V = SC.V; if (!V) return;
  const left = Clock.left(V.timer), on = V.timer && V.timer.total > 0;
  const m = $('#miniTimer');
  if (m) { m.classList.toggle('show', on && !$('[data-timer]', $('#stage'))); m.classList.toggle('warn', on && V.timer.running && left <= 60); $('.mt', m).textContent = Clock.fmt(left); }
  $$('[data-timer]').forEach(n => { n.textContent = on ? Clock.fmt(left) : '--:--'; const p = n.closest('.timerpanel'); if (p) p.classList.toggle('warn', on && V.timer.running && left <= 60); });
  const s = Math.ceil(left); if (on && V.timer.running && s <= 10 && s > 0 && s !== lastTick) { lastTick = s; Snd.tick(); }
  const info = $('.tpinfo'); if (info) info.textContent = on ? (V.timer.running ? '计时中' : '已暂停') : '老师端开始计时';
}, 250);

// ---------- 翻页 ----------
function renderNav() {
  const V = SC.V || {}, L = lessonById(V.lesson);
  if (!L) { $('#nav').innerHTML = `<div class="sm" style="margin:auto">${SC.canCtl ? '点一节课开始 · 键盘 ← → 翻页 · Q 安静 · T 计时 · P 点名 · F 全屏' : '等老师开始上课'}</div>`; return; }
  const n = L.slides.length, s = V.slide;
  $('#nav').innerHTML = `${SC.canCtl ? '<button class="navbtn" id="pv">‹</button>' : '<span></span>'}
    <div id="dots">${L.slides.map((_, i) => `<i class="${i === s ? 'on' : ''}" data-i="${i}"></i>`).join('')}</div>
    ${SC.canCtl ? `<button class="navbtn" id="nx">${s === n - 1 ? '地图' : '›'}</button>` : '<span></span>'}`;
  if (SC.canCtl) { $('#pv').onclick = prev; $('#nx').onclick = next; $$('#dots i').forEach(d => d.onclick = () => X.ctl({ type: 'go', slide: +d.dataset.i })); }
}
function next() { const V = SC.V, L = lessonById(V.lesson); if (!L) return; if (V.slide >= L.slides.length - 1) X.ctl({ type: 'go', lesson: null, slide: 0 }); else X.ctl({ type: 'go', slide: V.slide + 1 }); }
function prev() { const V = SC.V; if (V.lesson && V.slide > 0) X.ctl({ type: 'go', slide: V.slide - 1 }); }

// ---------- 学院地图 ----------
function renderMap(el) {
  const M = monthOf(SC.month), list = M.ids.map(lessonById).filter(Boolean);
  const POS = { 6: [[200, 450], [450, 260], [700, 450], [950, 260], [1200, 450], [1420, 280]], 4: [[260, 440], [600, 260], [940, 440], [1280, 260]], 3: [[320, 430], [760, 260], [1200, 430]] };
  const pos = POS[list.length] || list.map((_, i) => [200 + i * 1200 / Math.max(1, list.length - 1), i % 2 ? 260 : 450]);
  el.style.padding = '0';
  el.innerHTML = `<div class="map">
    <svg class="path" viewBox="0 0 1600 748"><path d="M${pos.map(p => p.join(' ')).join(' L')}" stroke="#E2CDA8" stroke-width="20" fill="none" stroke-dasharray="1 36" stroke-linecap="round"/></svg>
    <div style="position:absolute;left:72px;top:34px"><div class="kicker">${esc(M.kicker || 'AI 驯狗学院 · 第一季度')}</div><h1 class="t1">${esc(M.t)}<span class="msub">${esc(M.sub)}</span></h1></div>
    <div class="months" style="position:absolute;left:72px;bottom:30px">${MONTHS.map((m, i) => `<button class="mtab ${i === SC.month ? 'on' : ''}" data-m="${i}">${esc(m.t)}</button>`).join('')}</div>
    ${SC.canCtl ? `<div style="position:absolute;right:60px;top:40px;display:flex;gap:16px">${SC.standalone ? `<button class="btn ghost sm" id="mSet">${IC.gear} 课前设置</button>` : ''}<button class="btn ghost sm" id="mFull">${IC.full} 全屏</button></div>` : ''}
    ${list.map((L, i) => `<button class="node" style="left:${pos[i][0]}px;top:${pos[i][1]}px" data-id="${L.id}">
      <div class="circle" style="box-shadow:0 10px 0 ${L.color}66">${IC.star.replace('<svg', `<svg style="color:${L.color}"`)}</div>
      <div class="no" style="background:${L.color}">${esc(L.no)}</div><div class="nm">${esc(L.map || L.title)}</div></button>`).join('')}
    <div style="position:absolute;right:30px;bottom:6px">${bitEl(230, 'idle')}</div>
  </div>`;
  $$('.mtab', el).forEach(b => b.onclick = () => { SC.month = +b.dataset.m; renderMap(el); updBar(); renderBar(); });
  if (SC.canCtl) {
    $$('.node', el).forEach(n => n.onclick = () => X.ctl({ type: 'go', lesson: n.dataset.id, slide: 0 }));
    const st = $('#mSet', el); if (st) st.onclick = openSettings;
    $('#mFull', el).onclick = fullscreen;
  }
}

// ---------- 渲染当前页 ----------
function slideKey(V) { return V.lesson ? V.lesson + '/' + V.slide : 'map'; }
function renderSlide() {
  const V = SC.V;
  if (SC.cur && SC.cur.res && SC.cur.res.off) { try { SC.cur.res.off(); } catch (e) { } }
  Snd.beatOff();
  SC.seen = new Set();
  const el = document.createElement('div'); el.className = 'slide';
  $('#stage').innerHTML = ''; $('#stage').appendChild(el);
  let res = null; const L = lessonById(V.lesson);
  if (L) { const mi = MONTHS.findIndex(m => m.ids.includes(L.id)); if (mi >= 0) SC.month = mi; }
  $('#app').dataset.type = L ? (L.slides[V.slide] || {}).type || '' : 'map';   // 大屏背景按页面类型换（休息页是傍晚）
  if (!L) renderMap(el);
  else {
    const s = L.slides[V.slide];
    try { res = (R[s.type] || (() => { el.innerHTML = `<p class="lead">（${esc(s.type)}）</p>`; }))(s, L, el, X) || null; } catch (e) { console.error(e); el.innerHTML = '<p class="lead">这一页出错了</p>'; }
  }
  SC.cur = { key: slideKey(V), res };
  (V.cues || []).forEach(c => { SC.seen.add(c.id); if (res && res.cue) { try { res.cue(c, true); } catch (e) { console.error(e); } } });
  renderBar(); renderNav();
}
function applyCues() {
  const V = SC.V, res = SC.cur && SC.cur.res;
  (V.cues || []).forEach(c => {
    if (SC.seen.has(c.id)) return; SC.seen.add(c.id);
    if (c.n === 'dogDance') dogToast(c.a);
    if (res && res.cue) { try { res.cue(c, false); } catch (e) { console.error(e); } }
  });
}

// ---------- 收到新的课堂数据 ----------
function onView(v) {
  if (!v || v.err) return;
  Clock.sync(v.serverNow);
  const prev = SC.V; SC.V = v;
  if (!prev || slideKey(prev) !== slideKey(v) || !SC.cur) renderSlide();
  else { applyCues(); if (SC.cur.res && SC.cur.res.upd) { try { SC.cur.res.upd(v); } catch (e) { console.error(e); } } updBar(); if (prev.teamNames !== v.teamNames) renderBar(); }
  overlays(prev, v);
}

// ---------- 浮层 ----------
function overlays(prev, v) {
  const q = $('#quiet');
  if (v.quiet && (!q.classList.contains('show') || q.dataset.k === 'sleep')) {
    q.dataset.k = 'quiet';
    q.innerHTML = `<div class="kc-quiet-bit">${bitEl(340, 'sitting')}</div><div class="call">驯狗师！</div><div class="resp" id="qr">准备就绪！</div><div class="sub">双手离开平板，看大屏</div>`;
    q.classList.add('show'); q.onclick = () => X.ctl({ type: 'quiet', on: false });
    setTimeout(() => { if (q.classList.contains('show')) Snd.ding(); }, 900);
  } else if (!v.quiet && q.classList.contains('show') && q.dataset.k !== 'sleep') q.classList.remove('show');
  if (!v.quiet) {
    if (v.sleep && q.dataset.k !== 'sleep') {
      q.dataset.k = 'sleep';
      q.innerHTML = `<div>${bitEl(340, 'sleepy sitting')}</div><div class="call">全体比特，趴下！</div><div class="sub">让狗趴下 · 手离开狗和平板 · 看大屏</div>`;
      q.classList.add('show'); q.onclick = () => X.ctl({ type: 'dogs.sleep', on: false }); Snd.ding();
    } else if (!v.sleep && q.dataset.k === 'sleep') { q.dataset.k = ''; q.classList.remove('show'); }
  }
  if (v.pick && v.pick.id !== SC.last.pick) { const first = SC.last.pick === undefined; SC.last.pick = v.pick.id; if (!first || Clock.now() - v.pick.at < 5000) rollPick(v.pick.name); }
  if (v.pick === null) SC.last.pick = SC.last.pick === undefined ? null : SC.last.pick;
  if (v.flash && v.flash.id !== SC.last.flash) { const first = SC.last.flash === undefined; SC.last.flash = v.flash.id; if (!first || Clock.now() - v.flash.at < 3000) toast(v.flash.text, v.flash.team); }
  if (v.flash === null && SC.last.flash === undefined) SC.last.flash = null;
  if (v.timesUp && v.timesUp.id !== SC.last.timesUp) { const first = SC.last.timesUp === undefined; SC.last.timesUp = v.timesUp.id; if (!first || Clock.now() - v.timesUp.at < 4000) timesUp(); }
  if (!v.timesUp && SC.last.timesUp === undefined) SC.last.timesUp = null;
  const spotId = v.spot ? v.spot.id : null;
  if (spotId !== SC.last.spot) { SC.last.spot = spotId; showSpot(v.spot); }
}
async function rollPick(name) {
  const o = $('#pickOv'); const names = (SC.V.roster || []).map(r => r.name);
  o.innerHTML = `<div class="panel" style="min-width:1000px;text-align:center"><div class="t3">请这位驯狗师</div><div class="pickname rolling" id="pn">?</div></div>`;
  o.classList.add('show'); o.onclick = () => o.classList.remove('show');
  let d = 50; const pn = $('#pn', o);
  for (let i = 0; i < 16 && names.length; i++) { pn.textContent = pick(names); Snd.tick(); await sleep(d); d *= 1.12; }
  pn.textContent = name; pn.classList.remove('rolling'); Snd.tada();
  clearTimeout(o._t); o._t = setTimeout(() => o.classList.remove('show'), 4500);
}
function toast(text, team) {
  const t = document.createElement('div'); t.className = 'toast ' + (team || ''); t.textContent = text;
  $('#app').appendChild(t); Snd.ding(); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3200);
}
function dogToast(a) { if (SC.cur && SC.cur.key && $('.dogs #dsay, #dsay')) return; toast(`${a.owner ? dogLabel(a) : `第 ${a.group || '?'} 组的${a.dog || '比特'}`}在跳：${a.actions.join(' → ')}${a.repeat > 1 ? ' ×' + a.repeat : ''}`); }
function timesUp() {
  const t = $('#timesup');
  t.innerHTML = `<div>${bitEl(300, 'idle')}</div><div>时间到！</div><div style="font-size:44px;font-weight:800">平板扣下，看大屏</div>`;
  t.classList.add('show'); Snd.end(); t.onclick = () => t.classList.remove('show');
  setTimeout(() => t.classList.remove('show'), 5000);
}
async function showSpot(sp) {
  const o = $('#spotOv');
  if (!sp) { o.classList.remove('show'); const f = $('iframe', o); if (f && f._errOff) f._errOff(); o.innerHTML = ''; return; }
  o.innerHTML = `<div class="spot"><div class="spot-h"><span class="tag" style="font-size:30px">${sp.show === 'chat' ? '和精灵的对话' : '大屏展示'}</span><b>${esc(sp.name)}${sp.show === 'chat' ? '' : ' 的作品'}</b>${SC.canCtl ? '<button class="btn sm ghost" id="spx">关闭</button>' : ''}</div>
    <div class="spot-b">${sp.show === 'chat' ? '<div class="chat big" id="spc"></div>' : '<div class="gamebox" style="aspect-ratio:16/9;width:1280px"><iframe class="gframe"></iframe></div>'}</div></div>`;
  o.classList.add('show');
  const x = $('#spx', o); if (x) x.onclick = () => X.ctl({ type: 'spot', sid: null });
  if (sp.show === 'chat') {
    const t = await SC.net.get('talk', { sid: sp.sid }); const list = Array.isArray(t) ? t.filter(m => !sp.proj || m.proj === sp.proj).slice(-8) : [];
    const c = $('#spc', o); if (c) c.innerHTML = list.length ? list.map(m => `<div class="msg kid">${esc(m.prompt)}</div><div class="msg gn">${svgSize(IC.genie, 44)}<span>${esc(m.reply)}</span></div>`).join('') : '<div class="sm">还没有对话</div>';
  } else {
    const r = await SC.net.get('work', { sid: sp.sid, proj: sp.proj });
    const f = $('iframe', o); if (f && r && r.code) runGame(f, r.code); else if (f) f.replaceWith(Object.assign(document.createElement('div'), { className: 'sm', textContent: '还没有作品' }));
  }
}

// ---------- 单机模式才用的：计时器、课前设置 ----------
function openTimer() {
  const o = $('#timerOv');
  o.innerHTML = `<div class="panel" style="min-width:1000px"><button class="close">×</button><div class="t3" style="text-align:center">计时器</div>
    <div class="presets" style="margin-top:30px">${[1, 2, 3, 5, 8, 10, 12, 15].map(m => `<button data-m="${m}">${m} 分钟</button>`).join('')}</div>
    <div class="ctrls"><button class="btn green" id="ts">${IC.play} 暂停 / 继续</button><button class="btn ghost" id="ta">+1 分钟</button><button class="btn ghost" id="tc">${IC.square} 结束</button></div></div>`;
  o.classList.add('show');
  $$('.presets button', o).forEach(b => b.onclick = () => { X.ctl({ type: 'timer.start', sec: +b.dataset.m * 60 }); o.classList.remove('show'); });
  $('#ts', o).onclick = () => X.ctl({ type: 'timer.toggle' }); $('#ta', o).onclick = () => X.ctl({ type: 'timer.add', sec: 60 }); $('#tc', o).onclick = () => X.ctl({ type: 'timer.stop' });
  $('.close', o).onclick = () => o.classList.remove('show');
}
function openSettings() {
  const o = $('#setOv');
  o.innerHTML = `<div class="panel" style="width:1100px"><button class="close">×</button><div class="t3">课前设置（单机模式）</div>
    <p class="sm" style="margin:14px 0 10px">学生名字（用空格、逗号或换行隔开）；分队和点名都会用到</p>
    <textarea class="names" id="nm">${esc((SC.V.roster || []).map(r => r.name).join('\n'))}</textarea>
    <div class="ctrls" style="justify-content:flex-start;margin-top:24px;flex-wrap:wrap">
      <button class="btn green sm" id="sv">保存名字</button><button class="btn ghost sm" id="rb">能量全部清零</button>
    </div><p class="sm" id="msg" style="margin-top:16px;color:var(--green-d)"></p></div>`;
  o.classList.add('show');
  $('#sv', o).onclick = () => { const names = $('#nm', o).value.split(/[\s,，、]+/).map(s => s.trim()).filter(Boolean); X.ctl({ type: 'roster.set', names }); $('#msg', o).textContent = `已保存 ${names.length} 个名字`; };
  $('#rb', o).onclick = () => { X.ctl({ type: 'pts.reset' }); $('#msg', o).textContent = '能量已清零'; };
  $('.close', o).onclick = () => o.classList.remove('show');
}
function fullscreen() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { } }

// ---------- 启动 ----------
function fit() { const s = Math.min(innerWidth / 1600, innerHeight / 900); $('#app').style.transform = `scale(${s})`; }
addEventListener('resize', fit);
document.addEventListener('keydown', e => {
  if (!SC.canCtl || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.key === 'Escape') { $$('.overlay.show').forEach(o => o.classList.remove('show')); return; }
  const k = e.key;
  if (k === 'ArrowRight' || k === 'PageDown') { e.preventDefault(); next(); }
  else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
  else if (k === 'q' || k === 'Q') X.ctl({ type: 'quiet', on: !SC.V.quiet });
  else if ((k === 'z' || k === 'Z') && REAL_DOG) X.ctl({ type: 'dogs.sleep', on: !SC.V.sleep });
  else if (k === 't' || k === 'T') openTimer();
  else if (k === 'p' || k === 'P') X.ctl({ type: 'pick' });
  else if (k === 'm' || k === 'M') X.ctl({ type: 'go', lesson: null, slide: 0 });
  else if (k === 'f' || k === 'F') fullscreen();
});
function startScreen(opts) {
  opts = opts || {};
  fit();
  const qp = new URLSearchParams(location.search);
  const key = qp.get('k'), screenToken = qp.get('s');
  SC.mini = qp.get('mini') === '1'; if (SC.mini) window.__MUTE = 1;
  SC.standalone = opts.standalone || location.protocol === 'file:' || qp.get('local') === '1';
  if (SC.standalone) {
    let saved = null; try { saved = JSON.parse(localStorage.getItem('xgxy2_screen') || 'null'); } catch (e) { }
    const hub = opts.hub || createLocalHub({ starters: typeof STARTERS !== 'undefined' ? STARTERS : {}, saved, persistKey: 'xgxy2_screen' });
    SC.net = makeNet({ role: 'teacher', hub }); SC.canCtl = true;
  } else {
    SC.net = makeNet({ role: key && !screenToken ? 'teacher' : 'screen', key, screenToken }); SC.canCtl = !!key && !screenToken;
  }
  if (opts.hub && !opts.standalone) { SC.net = makeNet({ role: opts.role || 'screen', hub: opts.hub }); SC.canCtl = !!opts.canCtl; }
  SC.net.connect(onView, st => { SC.status = st; const c = $('#conn'); if (c) c.className = 'conn ' + st; });
}

if (!window.__NO_AUTOSTART) startScreen();
