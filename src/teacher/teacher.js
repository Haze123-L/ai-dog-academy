// ================= 老师端 =================
// 左：这一页怎么讲（只有老师看得到）；中：这一页的操作和课堂数据；右：每个学生。
const TC = { net: null, V: null, key: null, status: 'ok', ctlKey: null, kidOpen: null, hubMode: false, preview: true };
const lessonById = id => LESSONS.find(L => L.id === id) || null;
const tn = t => (TC.V && TC.V.teamNames && TC.V.teamNames[t]) || (t === 'o' ? '橙队' : '蓝队');
const act = a => TC.net.act(a).then(r => { if (r && r.err) toast(r.err); return r; });
const cue = (n, a) => act({ type: 'cue', n, a });
const nameOf = sid => ((TC.V.roster || []).find(r => r.sid === sid) || {}).name || '';
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }
const TYPE_NAME = { cover: '封面', activity: '活动', join: '进教室', signal: '暗号', teams: '分队', rules: '守则', play: '玩', ideas: '翻卡', wall: '点子墙', flow: '讲解', compare: '对比', demo: '精灵演示', mission: '动手', rest: '休息', arena: '擂台', duel: '挑战赛', quiz: '答题', boxes: '变量实验', gallery: '作品墙', showcase: '展示', wanted: '通缉令', trick: '捣蛋卡', dance: '编舞', countdown: '开箱', groups: '分组', mood: '心情卡', guessmood: '猜心情', import: '导入', speech: '讲稿', beat: '舞会', result: '结算', agenda: '流程', teaser: '预告', dogname: '起名', dogdemo: '口令演示', stage: '上台', snakeboard: '纸片蛇', snakequiz: '预测赛', npcdemo: '角色演示', gate: '攻门赛' };

// ---------- 顶栏 ----------
function renderHead() {
  const V = TC.V, L = lessonById(V.lesson), p = L ? ((V.pts || {})[L.id] || { o: 0, b: 0 }) : { o: 0, b: 0 };
  const llm = V.llm || {};
  $('#hd').innerHTML = `<span class="logo">AI 驯狗学院 · 老师端</span>
    <button class="lsb ${L ? '' : 'empty'}" id="ls" aria-haspopup="true">${L ? `<i>${esc(L.no)}</i>${esc(L.title)}` : '选一节课'}<span class="car">▾</span></button>
    ${L ? `<span class="tp o">${esc(tn('o'))} <b>${p.o}</b><button data-t="o" data-d="-1">−</button><button data-t="o" data-d="1">+</button></span><span class="tp b">${esc(tn('b'))} <b>${p.b}</b><button data-t="b" data-d="-1">−</button><button data-t="b" data-d="1">+</button></span>` : ''}
    <span class="tmr" id="tmr">${IC.clock.replace('<svg', '<svg style="width:18px;height:18px"')}<span id="tmt">--:--</span></span>
    <button class="hb" id="tm">计时</button>
    <button class="hb ${V.quiet ? 'on' : ''}" id="qt">${V.quiet ? '解除安静' : '安静'}</button>
    <button class="hb" id="pk">点名</button>
    ${L && L.dog && REAL_DOG ? `<button class="hb ${V.sleep ? 'on' : ''}" id="zz" title="真狗回窝趴下，大屏和平板显示「全体趴下」">${V.sleep ? '起来吧' : '全体趴下'}</button><span class="turnbox">轮流：<button class="hb ${V.turn === 'o' ? 'on' : ''}" data-turn="o">${esc(tn('o'))}</button><button class="hb ${V.turn === 'b' ? 'on' : ''}" data-turn="b">${esc(tn('b'))}</button>${V.turn ? '<button class="hb" data-turn="">都可以</button>' : ''}</span>` : ''}
    <span class="sp"></span>
    <span class="hb" title="${esc(llm.lastError ? llm.lastError.msg : '')}"><span class="st ${llm.ready ? (llm.health || 'unknown') : 'off'}"></span>${llm.ready ? '大模型：' + esc(llm.model || llm.provider || '') : (V.aiMode === 'demo' || TC.hubMode ? '演示模式（规则模拟）' : '尚未配置大模型')}</span>
    <span class="hb"><span class="st ${TC.status}"></span>${(V.roster || []).filter(r => r.online).length}/${(V.roster || []).length} 在线</span>
    <button class="hb" id="set">${IC.gear.replace('<svg', '<svg style="width:18px;height:18px"')} 设置</button>`;
  $('#ls').onclick = e => { e.stopPropagation(); lessonPicker(); };
  $$('.tp button').forEach(b => b.onclick = () => act({ type: 'pts.add', t: b.dataset.t, d: +b.dataset.d }));
  $('#tm').onclick = timerPanel; $('#qt').onclick = () => act({ type: 'quiet', on: !V.quiet }); $('#pk').onclick = () => act({ type: 'pick' });
  $('#set').onclick = settings;
  const zz = $('#zz'); if (zz) zz.onclick = () => act({ type: 'dogs.sleep', on: !V.sleep });
  $$('[data-turn]').forEach(b => b.onclick = () => act({ type: 'turn', t: b.dataset.turn || null }));
}
// 选课面板：按月份排的按钮（不用下拉框——有的环境里下拉框点不开）
function lessonPicker() {
  const old = $('.lsp'); if (old) { old.remove(); return; }
  const cur = TC.V.lesson, groups = (typeof MONTHS !== 'undefined' ? MONTHS : [{ t: '全部课', ids: LESSONS.map(x => x.id) }]);
  const d = document.createElement('div'); d.className = 'lsp'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', '选一节课');
  d.innerHTML = groups.map(g => `<div class="lsg"><h4>${esc(g.t)}${g.sub ? `<small>${esc(g.sub)}</small>` : ''}</h4><div class="lsr">${g.ids.map(id => lessonById(id)).filter(Boolean).map(x => `<button class="lsi ${x.id === cur ? 'on' : ''}" data-lid="${x.id}"><i>${esc(x.no)}</i>${esc(x.title)}${x.dog ? '<span class="dg">狗课</span>' : ''}</button>`).join('')}</div></div>`).join('')
    + (cur ? '<div class="lsf"><button class="lsx" data-lid="">回到开课前</button></div>' : '');
  document.body.appendChild(d);
  const r = $('#ls').getBoundingClientRect();
  d.style.left = Math.max(8, Math.min(r.left, innerWidth - d.offsetWidth - 8)) + 'px'; d.style.top = (r.bottom + 6) + 'px';
  d.onclick = e => { const b = e.target.closest('[data-lid]'); if (!b) return; d.remove(); off(); if (b.dataset.lid !== (cur || '')) act({ type: 'go', lesson: b.dataset.lid || null, slide: 0 }); };
  const close = e => { if (!d.contains(e.target)) { d.remove(); off(); } };
  const esc2 = e => { if (e.key === 'Escape') { d.remove(); off(); } };
  const off = () => { document.removeEventListener('pointerdown', close, true); document.removeEventListener('keydown', esc2); };
  setTimeout(() => { document.addEventListener('pointerdown', close, true); document.addEventListener('keydown', esc2); }, 0);
  const on = $('.lsi.on', d); (on || $('.lsi', d)).focus();
}
setInterval(() => {
  const V = TC.V; if (!V) return; const n = $('#tmt'); if (!n) return;
  const on = V.timer && V.timer.total > 0, left = Clock.left(V.timer);
  n.textContent = on ? Clock.fmt(left) + (V.timer.running ? '' : ' ⏸') : '--:--';
  $('#tmr').classList.toggle('warn', on && V.timer.running && left <= 60);
}, 300);
function renderStrip() {
  const V = TC.V, L = lessonById(V.lesson);
  if (!L) {
    $('#strip').innerHTML = `<span class="muted" style="flex:none;font-weight:800">选一节课：</span>${LESSONS.map(x => `<button class="chipS" data-lid="${x.id}">${esc(x.id === 'T' ? x.no : x.no.replace(/第 | 节/g, ''))} · ${esc(x.title)}</button>`).join('')}`;
    $$('#strip [data-lid]').forEach(b => b.onclick = () => act({ type: 'go', lesson: b.dataset.lid, slide: 0 }));
    return;
  }
  $('#strip').innerHTML = `<div class="nav2"><button id="pv">‹ 上一页</button></div>${L.slides.map((s, i) => `<button class="chipS ${i === V.slide ? 'on' : ''}" data-i="${i}"><i>${i + 1}</i>${esc(TYPE_NAME[s.type] || s.type)}${s.stu && s.stu.mode && s.stu.mode !== 'watch' ? '<span class="ic">平板</span>' : ''}</button>`).join('')}<div class="nav2"><button id="nx">下一页 ›</button></div>`;
  $$('.chipS').forEach(b => b.onclick = () => act({ type: 'go', slide: +b.dataset.i }));
  $('#pv').onclick = () => { if (V.slide > 0) act({ type: 'go', slide: V.slide - 1 }); };
  $('#nx').onclick = () => { if (V.slide < L.slides.length - 1) act({ type: 'go', slide: V.slide + 1 }); };
  const on = $('.chipS.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// ---------- 左：讲课提示 ----------
function renderNotes() {
  const V = TC.V, L = lessonById(V.lesson), box = $('#cL');
  if (!L) { box.innerHTML = `<div class="box"><h3>开课前</h3><ol class="note-say"><li>${V.nameOnlyJoin ? '孩子扫码后输入自己的名字即可加入，无需预先录入名单。' : '在「设置」里录入名单、填大模型密钥（不填就用演示精灵）。'}</li><li>大屏打开 <b>${esc(V.screenUrl || (((V.join || {}).url || '') + 'screen'))}</b>，全屏。</li><li>平板打开 <b>${esc((V.join || {}).url || '')}</b>，孩子${V.nameOnlyJoin ? '输入自己的名字即可加入' : V.publicMode ? '输入昵称和老师发的个人登录码' : '点自己的名字'}。</li><li>选一节课开始。</li></ol></div>`; return; }
  const s = L.slides[V.slide];
  let n = ((NOTES[L.id] || {})[s.id]) || {};
  if (V.publicMode && !V.nameOnlyJoin && s.type === 'join') n = Object.assign({}, n, { say: ['「拿起平板，扫码或打开网址，输入昵称和老师发的个人登录码。」', '老师端「学生」里昵称变绿就是进来了；没进来的，助教去帮。'], tip: '老师先在「设置」录入昵称名单，再把每人的四位登录码单独发给本人。新同学也需要先由老师录入。' });
  if (V.nameOnlyJoin && s.type === 'join') n = Object.assign({}, n, { say: ['「拿起平板，扫码或打开网址，输入自己的名字就能进教室。」', '老师端「学生」里名字变绿就是进来了；没进来的，助教去帮。'], tip: '现场扫码后只输名字，无需登录码，也不需要提前录入名单。同名孩子请各加一个能区分的称呼。' });
  const revealed = new Set((V.cues || []).filter(c => c.n === 'reveal').map(c => c.a));
  const steps = Math.max(0, ...(V.cues || []).filter(c => c.n === 'step').map(c => c.a));
  let cards = '';
  if (n.cards) {
    cards = n.cards.map((t, i) => {
      const done = s.type === 'compare' ? i < steps : revealed.has(i);
      const btn = s.type === 'ideas' || s.type === 'wanted' || (s.type === 'quiz' && s.hints) ? `<button class="btn sm ${done ? 'ghost' : ''}" data-rv="${i}" ${done ? 'disabled' : ''}>${done ? '已翻' : '翻开'}</button>` : s.type === 'compare' ? `<button class="btn sm ${done ? 'ghost' : ''}" data-st="${i + 1}" ${done ? 'disabled' : ''}>${done ? '已出' : '出现'}</button>` : '';
      return `<div class="cardline ${done ? 'done' : ''}"><span class="n">${i + 1}</span><span style="flex:1">${esc(t)}</span>${btn}</div>`;
    }).join('');
  }
  box.innerHTML = `<div class="box"><h3>${esc(L.no)} · 第 ${V.slide + 1} 页 · ${esc(TYPE_NAME[s.type] || s.type)}${n.time ? `<span class="tag">${esc(n.time)} 分</span>` : ''}</h3>
    ${n.say ? `<ol class="note-say">${n.say.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '<p class="muted">这一页照大屏讲就行。</p>'}
    ${cards ? `<div style="margin-top:8px">${cards}</div>` : ''}
    ${n.tip ? `<div class="note-tip">${esc(n.tip)}</div>` : ''}</div>
    ${s.stu && s.stu.mode && s.stu.mode !== 'watch' ? `<div class="box"><h3>孩子的平板现在</h3><p class="muted" style="margin:0">${esc(stuText(s))}</p></div>` : ''}`;
  $$('[data-rv]', box).forEach(b => b.onclick = () => cue('reveal', +b.dataset.rv));
  $$('[data-st]', box).forEach(b => b.onclick = () => cue('step', +b.dataset.st));
}
function stuText(s) {
  return ({ join: TC.V.nameOnlyJoin ? '输入自己的名字即可加入' : TC.V.publicMode ? '输入昵称和老师发的个人登录码' : '显示名字列表，点自己的名字进教室', team: '显示自己在哪一队', play: '玩起始游戏' + (s.stu.wall ? '，下面可以写「我发现……」' : ''), wall: '写点子或按住话筒说，提交后上大屏', studio: '和精灵一起改游戏：游戏 + 对话 + 时光机 + 任务', quiz: '四个选项，选完等你揭晓', guess: '你选道具后，孩子在数字键盘上猜', gallery: '看别人的作品、投星', rest: '休息时锁屏', balance: '先调自己的游戏；你点「交换」后，玩对方的游戏并报分', trick: '你发牌后显示捣蛋卡；你点「交换」后修对方的游戏', groups: '显示组号、角色、用哪台狗', mood: '编舞师抽心情卡，只有本组看得到', dance: s.own ? '编舞台：让精灵编舞，自己调顺序和重复，发给自己的狗' : '编舞台：让精灵编舞、自己调、编舞师发给狗', guessmood: s.own ? '跟出场的狗聊天，猜它的性格（狗的主人看到的是自己的秘密）' : '猜正在表演的组是什么心情', speech: '写三个问题的答案', present: '轮到谁，谁的平板提示上台', import: '打开在家做的游戏 / 导入代码 / 从头开始', result: '你公布结果后显示输赢和章', design: '游戏设计卡（角色/规则/得分/结束/还有）→ 交给精灵做出来 → 玩和改', report: '先改自己的游戏；你点「交换」后，玩对方的游戏并报结果', dogname: '给自己的狗起名字（不能和别人重名）', persona: s.own ? '自己的狗的角色卡' + (s.say ? '和口令表' : '') + '，和虚拟狗聊天，发给自己的狗（虚拟狗默认静音）' : '角色卡 + 虚拟比特 + 设计师发给比特' })[s.stu.mode] || '';
}

// ---------- 中：这一页的操作 ----------
function timerBtns(min, rest) { return `<button class="btn green" data-tm="${min}" ${rest ? 'data-rest="1"' : ''}>${rest ? '开始休息' : '开始'} ${min} 分钟</button><button class="btn ghost sm" id="tg">暂停/继续</button><button class="btn ghost sm" id="ta">+1 分钟</button><button class="btn ghost sm" id="tx">结束</button>`; }
function bindTimer(el) {
  $$('[data-tm]', el).forEach(b => b.onclick = () => act({ type: 'timer.start', sec: +b.dataset.tm * 60, rest: !!b.dataset.rest }));
  const g = $('#tg', el); if (g) g.onclick = () => act({ type: 'timer.toggle' });
  const a = $('#ta', el); if (a) a.onclick = () => act({ type: 'timer.add', sec: 60 });
  const x = $('#tx', el); if (x) x.onclick = () => act({ type: 'timer.stop' });
}
function bars(rows) { return `<div class="bars">${rows.map(r => { const pct = r.total ? Math.round(r.n / r.total * 100) : 0; return `<div class="prow"><span style="width:110px">${esc(r.label)}</span><div class="pbar ${r.t}"><i style="width:${pct}%"></i></div><b>${r.n}/${r.total}</b></div>`; }).join('')}</div>`; }
const teamCount = t => (TC.V.roster || []).filter(r => r.team === t).length;
function wallList(items, withDemo) {
  if (!items || !items.length) return '<p class="muted">还没有人写</p>';
  return `<div class="list">${items.slice().reverse().map(x => `<div class="li ${x.hidden ? 'hidden' : ''}"><span class="dot2 ${x.team || 'x'}"></span><span class="grow"><b>${esc(x.name)}</b>：${esc(x.text)}</span>${withDemo ? `<button class="btn sm purple" data-demo="${esc(x.text)}">让精灵变</button>` : ''}<button class="btn sm ghost" data-hide="${x.id}" data-h="${x.hidden ? 0 : 1}">${x.hidden ? '恢复' : '隐藏'}</button></div>`).join('')}</div>`;
}
const C2 = {
  join(s) { const r = TC.V.roster || [], off = r.filter(x => !x.online); return `<div class="box"><h3>进教室<span class="tag g">${r.length - off.length}/${r.length} 在线</span></h3>${off.length ? `<p>还没进来：${off.map(x => esc(x.name)).join('、')}</p>` : (TC.V.nameOnlyJoin && !r.length ? '<p>等待孩子扫码输入名字加入。</p>' : TC.V.publicMode && !r.length ? '<p>请先在「设置」录入昵称名单。</p>' : '<p>全都进来了 ✓</p>')}<p class="muted">${TC.V.nameOnlyJoin ? '孩子扫码后输入自己的名字即可加入，不需要提前录入名单。' : TC.V.publicMode ? '老师在「设置」录入昵称名单并分发个人登录码。孩子输入昵称和老师发的个人登录码。' : '名单在「设置」里改。孩子也可以在平板上直接输入名字进来。'}</p></div>`; },
  signal() { return `<div class="box"><h3>暗号</h3><div class="btns"><button class="btn" data-cue="call">喊一次</button></div></div>`; },
  teams() { return `<div class="box"><h3>分队</h3><div class="btns"><button class="btn" id="draw">随机分队</button></div><div class="grid2" style="margin-top:10px"><label class="f">队名 1<input class="inp" data-tname="o" value="${esc(tn('o'))}"></label><label class="f">队名 2<input class="inp" data-tname="b" value="${esc(tn('b'))}"></label></div><p class="muted">单个孩子换队：在右边点他的名字。</p></div>`; },
  play(s) { return `<div class="box"><h3>玩一玩</h3><div class="btns">${timerBtns(s.min || 2)}</div></div>${s.wall ? `<div class="box"><h3>孩子发现的线索</h3>${wallList((TC.V.sd || {}).wall)}</div>` : ''}`; },
  ideas(s) { const rv = new Set((TC.V.cues || []).filter(c => c.n === 'reveal').map(c => c.a)); return `<div class="box"><h3>翻卡<span class="tag">${rv.size}/${s.cards.length}</span></h3><div class="btns">${s.cards.map((c, i) => `<button class="btn sm ${rv.has(i) ? 'ghost' : ''}" data-rvc="${i}" ${rv.has(i) ? 'disabled' : ''}>${i + 1}. ${esc(c.b)}</button>`).join('')}</div><div class="btns" style="margin-top:8px"><button class="btn sm ghost" data-cue="reset">全部盖回去</button></div></div>${s.stu && s.stu.mode === 'wall' ? `<div class="box"><h3>孩子写的</h3>${wallList((TC.V.sd || {}).wall)}</div>` : ''}`; },
  wall() { return `<div class="box"><h3>点子墙<span class="tag">${((TC.V.sd || {}).wall || []).length} 条</span></h3>${wallList((TC.V.sd || {}).wall)}</div>`; },
  compare(s) { const n = Math.max(0, ...(TC.V.cues || []).filter(c => c.n === 'step').map(c => c.a)); return `<div class="box"><h3>一步一步出现<span class="tag">${n}/5</span></h3><div class="btns"><button class="btn" data-step="${n + 1}" ${n >= 5 ? 'disabled' : ''}>下一步</button><button class="btn sm ghost" data-cue="reset">重来</button></div></div>`; },
  demo(s) {
    const key = s.slot || s.game;
    const d = TC.V.demo && (TC.V.demo.key || TC.V.demo.game) === key ? TC.V.demo : null; const walls = TC.V.walls || [];
    const err = TC.V.demoErr && TC.V.demoErr.key === key ? TC.V.demoErr : null;
    return `<div class="box"><h3>让精灵在大屏上改「${esc(GAMES[s.game].name)}」${s.plan ? '<span class="tag">先说计划</span>' : ''}${s.mock ? '<span class="tag">这一页用演示精灵</span>' : ''}${d && d.busy ? '<span class="tag p">精灵在改…</span>' : ''}</h3>
      ${s.spec ? `<p class="muted" style="margin:0 0 6px">这一页的说明书：${s.spec.map((x, i) => (i + 1) + '. ' + esc(x)).join('　')}</p>` : ''}
      <div class="btns">${s.spells.map((p, i) => `<button class="btn sm purple" data-spell="${i}" style="white-space:pre-wrap;height:auto;min-height:30px;text-align:left;padding:5px 10px;font-family:inherit">${esc(p.length > 160 ? p.slice(0, 160) + '…' : p)}</button>`).join('')}</div>
      <div class="btns" style="margin-top:8px"><input class="inp" id="dp" placeholder="打孩子说的话，回车发给精灵" style="flex:1"><button class="btn purple" id="dgo">说</button><button class="btn ghost sm" id="drs">变回原样</button></div>
      ${d && d.plan ? `<div class="li" style="margin-top:8px;display:block"><b>精灵的计划（还没动手）：</b><ol style="margin:4px 0 6px">${d.plan.map(x => `<li>${esc(x)}</li>`).join('')}</ol><button class="btn sm green" id="dpok">同意，开始做</button> <span class="muted">不同意：换个说法再说一次</span></div>` : d && d.reply ? `<div class="li" style="margin-top:8px"><span class="grow"><b>精灵：</b>${esc(d.reply)}</span></div>` : ''}
      ${err ? `<div class="li" style="margin-top:8px;background:#FFE9E9"><span class="grow"><b>大屏上的游戏报错了：</b>${esc(err.msg)}</span><button class="btn sm" id="derrgo">把报错交给精灵</button></div>` : ''}</div>
      ${walls.length ? `<div class="box"><h3>这节课孩子的点子</h3>${wallList(walls, true)}</div>` : ''}`;
  },
  mission(s) {
    if (s.kind === 'dance') return C2.dancemission(s);
    if (s.kind === 'persona') return s.own ? C2.mydogmission(s) : C2.personamission(s);
    if (s.kind === 'design') return C2.designmission(s);
    if (s.kind === 'npc' || s.kind === 'gate') return C2.npcmission(s);
    const d = TC.V.sd || {}, tk = d.tasks || {}, aw = d.awarded || {};
    const rows = []; ['o', 'b'].forEach(t => { const a = tk[t] || [0, 0, 0, teamCount(t)]; rows.push({ label: tn(t) + ' ★', t, n: a[0], total: a[3] }); rows.push({ label: tn(t) + ' ★★', t, n: a[1], total: a[3] }); });
    const notDone = (TC.V.roster || []).filter(r => !((TC.V.taskBy || {})[r.sid] || [])[0]);
    const claims = (d.claims || []).filter(c => c.status === 'wait');
    return `<div class="box"><h3>动手 · 计时</h3><div class="btns">${timerBtns(s.min || 10)}</div></div>
      <div class="box"><h3>任务进度</h3>${bars(rows)}<div class="btns" style="margin-top:8px">${['o', 'b'].map(t => `<button class="btn sm ${t === 'b' ? 'blue' : ''}" data-award="${t}" ${aw[t] ? 'disabled' : ''}>${esc(tn(t))}全队完成 ★ +3${aw[t] ? '（已加）' : ''}</button>`).join('')}</div>
        ${notDone.length ? `<p class="muted" style="margin:8px 0 0">还没完成 ★：${notDone.map(r => esc(r.name)).join('、')}</p>` : ''}</div>
      ${s.claims ? `<div class="box"><h3>抓虫申请<span class="tag">${claims.length} 个等确认</span></h3>${claimList(d.claims)}<p class="muted" style="margin:6px 0 0">每只虫每队第一次确认 +3。确认前可以点「看游戏」。</p></div>` : ''}`;
  },
  dancemission(s) {
    const d = TC.V.sd || {}, g = d.groups || [];
    if (s.own) {
      const sent = d.sent || [], last = {}; sent.forEach(x => { if (x.owner) last[x.owner] = x; }); const V = TC.V;
      return `<div class="box"><h3>编舞 · 计时</h3><div class="btns">${timerBtns(s.min || 15)}</div>
          ${REAL_DOG ? `<div class="btns" style="margin-top:8px"><b>轮流：</b><button class="btn sm ${V.turn === 'o' ? '' : 'ghost'}" data-turn2="o">${esc(tn('o'))}</button><button class="btn sm blue ${V.turn === 'b' ? '' : 'ghost'}" data-turn2="b">${esc(tn('b'))}</button><button class="btn sm ghost" data-turn2="">都可以</button><button class="btn sm ${V.sleep ? 'red' : 'ghost'}" data-sleep2="1">${V.sleep ? '起来吧' : '全体趴下'}</button></div>
          <p class="muted" style="margin:6px 0 0">狗跳舞比说话安静；「叫一声」多的舞，轮到这队再发。</p>` : '<p class="muted" style="margin:6px 0 0">孩子在平板上编好、预览，按「发到大屏」：大屏上他的狗跳一遍，下面列表能核对顺序和重复。</p>'}</div>
        <div class="box"><h3>发出去的舞<span class="tag">${Object.keys(last).length}/${(V.roster || []).length}</span></h3><div class="list">${(V.roster || []).map(x => { const l = last[x.name]; return `<div class="li"><span class="dot2 ${x.team || 'x'}"></span><span class="grow"><b>${esc(x.dog || x.name + '的狗')}</b> · ${esc(x.name)}${l ? '<br><small>' + l.actions.map(esc).join(' → ') + (l.repeat > 1 ? ' ×' + l.repeat : '') + '</small>' : ' <span class="muted">还没发</span>'}</span></div>`; }).join('')}</div></div>`;
    }
    return `<div class="box"><h3>编舞 · 计时</h3><div class="btns">${timerBtns(s.min || 12)}<button class="btn purple" id="rot">换岗</button></div></div>
      <div class="box"><h3>各组</h3>${g.length ? `<div class="list">${g.map(x => `<div class="li"><span class="dot2 ${x.team}"></span><span class="grow"><b>第 ${x.no} 组 · ${esc(x.dog)}</b>${x.mood ? ` <span class="tag">${esc(x.mood)}</span>` : ''}<br><small>${x.members.map(m => esc(m.name) + '（' + m.role + '）').join('、')}</small></span></div>`).join('')}</div>` : '<p class="muted">还没分组：回到「分组」页点分组</p>'}</div>`;
  },
  personamission(s) {
    const d = TC.V.sd || {}, g = d.groups || [], tk = d.tasks || {}, aw = d.awarded || {};
    const rows = []; ['o', 'b'].forEach(t => { const a = tk[t] || [0, 0, 0, teamCount(t)]; rows.push({ label: tn(t) + ' ★', t, n: a[0], total: a[3] }); rows.push({ label: tn(t) + ' ★★', t, n: a[1], total: a[3] }); });
    return `<div class="box"><h3>设计角色 · 计时</h3><div class="btns">${timerBtns(s.min || 12)}<button class="btn purple" id="rot">换岗</button></div><p class="muted" style="margin:6px 0 0">每人都能填自己的角色卡、和虚拟比特聊天；只有设计师能「发给比特」。换岗后下一个人发自己的卡。</p></div>
      <div class="box"><h3>各组的比特<span class="tag">${g.filter(x => x.persona).length}/${g.length} 已上线</span></h3>${g.length ? `<div class="list">${g.map(x => `<div class="li"><span class="dot2 ${x.team}"></span><span class="grow"><b>第 ${x.no} 组 · ${esc(x.dog)}</b>${x.persona ? `<br>「${esc(x.persona.name || '')}」${esc(x.persona.identity || '')} · <b>${esc(x.persona.trait || '')}</b> <small>（${esc(x.persona.by || '')} 发的）</small>` : ' <span class="tag">还在设计</span>'}<br><small>${x.members.map(m => `<a href="#" data-pkid="${m.sid}">${esc(m.name)}</a>（${m.role}）`).join('、')}</small></span></div>`).join('')}</div>` : '<p class="muted">还没分组：回到「分组」页点分组</p>'}</div>
      <div class="box"><h3>任务进度</h3>${bars(rows)}<div class="btns" style="margin-top:8px">${['o', 'b'].map(t => `<button class="btn sm ${t === 'b' ? 'blue' : ''}" data-award="${t}" ${aw[t] ? 'disabled' : ''}>${esc(tn(t))}全队完成 ★ +3${aw[t] ? '（已加）' : ''}</button>`).join('')}</div></div>`;
  },
  designmission(s) {
    const d = TC.V.sd || {}, ds = d.designs || {}, tk = d.tasks || {}, aw = d.awarded || {};
    const rows = []; ['o', 'b'].forEach(t => { const a = tk[t] || [0, 0, 0, teamCount(t)]; rows.push({ label: tn(t) + ' ★', t, n: a[0], total: a[3] }); rows.push({ label: tn(t) + ' ★★', t, n: a[1], total: a[3] }); });
    const r = TC.V.roster || [];
    return `<div class="box"><h3>设计游戏 · 计时</h3><div class="btns">${timerBtns(s.min || 15)}</div></div>
      <div class="box"><h3>做出来的游戏<span class="tag">${Object.keys(ds).length}/${r.length}</span></h3><div class="list">${r.map(x => `<div class="li"><span class="dot2 ${x.team || 'x'}"></span><span class="grow"><b>${esc(x.name)}</b>${ds[x.sid] ? '：《' + esc(ds[x.sid].name) + '》' : ' <span class="muted">还在填设计卡</span>'}</span><button class="btn sm ghost" data-dk="${x.sid}">设计卡</button><button class="btn sm ghost" data-look="${x.sid}">看游戏</button></div>`).join('')}</div>
        <p class="muted" style="margin:6px 0 0">卡住的孩子：先问「主角是谁？碰到什么会怎样？什么时候结束？」，让他说出来再写。</p></div>
      <div class="box"><h3>任务进度</h3>${bars(rows)}<div class="btns" style="margin-top:8px">${['o', 'b'].map(t => `<button class="btn sm ${t === 'b' ? 'blue' : ''}" data-award="${t}" ${aw[t] ? 'disabled' : ''}>${esc(tn(t))}全队完成 ★ +3${aw[t] ? '（已加）' : ''}</button>`).join('')}</div></div>`;
  },
  mydogmission(s) {
    const d = TC.V.sd || {}, md = d.mydogs || {}, tk = d.tasks || {}, aw = d.awarded || {}, V = TC.V;
    const rows = []; ['o', 'b'].forEach(t => { const a = tk[t] || [0, 0, 0, teamCount(t)]; rows.push({ label: tn(t) + ' ★', t, n: a[0], total: a[3] }); rows.push({ label: tn(t) + ' ★★', t, n: a[1], total: a[3] }); });
    const r = V.roster || [];
    return `<div class="box"><h3>${esc(s.title)} · 计时</h3><div class="btns">${timerBtns(s.min || 15)}</div>
        ${REAL_DOG ? `<div class="btns" style="margin-top:8px"><b>轮流开口：</b><button class="btn sm ${V.turn === 'o' ? '' : 'ghost'}" data-turn2="o">${esc(tn('o'))}</button><button class="btn sm blue ${V.turn === 'b' ? '' : 'ghost'}" data-turn2="b">${esc(tn('b'))}</button><button class="btn sm ghost" data-turn2="">都可以</button><button class="btn sm ${V.sleep ? 'red' : 'ghost'}" data-sleep2="1">${V.sleep ? '起来吧' : '全体趴下'}</button></div>
        <p class="muted" style="margin:6px 0 0">一队跟狗说话时，另一队的狗趴着不说话，孩子在平板上写卡、和虚拟狗聊（静音）。3～4 分钟换一次。</p>` : '<p class="muted" style="margin:6px 0 0">孩子在平板上写卡、和自己的狗聊天（默认静音，看文字）。写好按「让我的狗上线」，大屏「大家的狗」会亮起来。</p>'}</div>
      <div class="box"><h3>每个人的狗<span class="tag">${Object.keys(md).length}/${r.length} 已上线</span></h3><div class="list">${r.map(x => { const p = md[x.sid]; return `<div class="li"><span class="dot2 ${x.team || 'x'}"></span><span class="grow"><b>${esc(x.dog || '（没起名）')}</b> · ${esc(x.name)}${p ? ` · ${esc(p.trait || '')}${p.rules ? ` · ${p.rules} 条口令` : ''}` : ' <span class="muted">还没发</span>'}</span><a href="#" data-pkid="${x.sid}" data-slot="mydog">角色卡</a></div>`; }).join('')}</div></div>
      <div class="box"><h3>任务进度</h3>${bars(rows)}<div class="btns" style="margin-top:8px">${['o', 'b'].map(t => `<button class="btn sm ${t === 'b' ? 'blue' : ''}" data-award="${t}" ${aw[t] ? 'disabled' : ''}>${esc(tn(t))}全队完成 ★ +3${aw[t] ? '（已加）' : ''}</button>`).join('')}</div></div>`;
  },
  dogname(s) {
    const r = TC.V.roster || [], named = r.filter(x => x.dog);
    return `<div class="box"><h3>起名字<span class="tag">${named.length}/${r.length}</span></h3><div class="list">${r.map(x => `<div class="li"><span class="dot2 ${x.team || 'x'}"></span><span class="grow"><b>${esc(x.name)}</b>：${x.dog ? '<b>' + esc(x.dog) + '</b>' : '<span class="muted">还没起</span>'}</span>${x.dog ? `<button class="btn sm ghost" data-dclear="${x.sid}">清掉</button>` : ''}</div>`).join('')}</div>
      <p class="muted" style="margin:6px 0 0">${esc(s.teacherTip || '同名的系统会拦下。名字太长、太难念的，劝他换一个短的。')}</p></div>`;
  },
  // ---------- 第二季样课（第 13、21、22 节） ----------
  snakeboard(s) {
    const b = (TC.V.sd || {}).snake || { cells: s.init || [], n: 0 };
    return `<div class="box"><h3>纸片蛇 · 计时</h3><div class="btns">${timerBtns(s.min || 7)}</div></div>
      <div class="box"><h3>在大屏上走一步<span class="tag">${b.cells.length} 格长${b.grow ? ` · 还要长 ${b.grow}` : ''}</span></h3>
        <div class="btns">${['上', '下', '左', '右'].map(d => `<button class="btn" data-snd="${d}">往${d}走</button>`).join('')}</div>
        <div class="btns" style="margin-top:8px"><b>下一步吃到：</b>${Object.keys(SNAKE_FOOD).map(f => `<button class="btn sm ${b.food === f ? '' : 'ghost'}" data-snf="${f}">${SNAKE_FOOD[f].icon} ${f}</button>`).join('')}<button class="btn sm ghost" id="snr">重来</button></div>
        <p class="muted" style="margin:6px 0 0">先让孩子在纸上挪，再在大屏上走同一步对答案。吃到东西：先点食物，再点方向。</p></div>`;
  },
  snakequiz(s) {
    const q = (TC.V.sd || {}).sq, done = (TC.V.sd || {}).done || [], n = (TC.V.roster || []).length;
    const r = q ? s.rounds[q.i] : null;
    const show = a => !r || a == null ? '' : r.ask === 'len' ? a + ' 格' : r.ask === 'head' ? `第 ${a.split(',')[0]} 行第 ${a.split(',')[1]} 格` : a.split('|').map(k => `(${k})`).join(' ');
    return `<div class="box"><h3>蛇身预测赛</h3><div class="btns">${s.rounds.map((x, i) => `<button class="btn sm ${q && q.i === i ? '' : 'ghost'}" data-sqr="${i}">第 ${i + 1} 题${done.includes(i) ? ' ✓' : ''}</button>`).join('')}<button class="btn green" id="sqrv" ${!q || q.revealed ? 'disabled' : ''}>揭晓（自动加分）</button></div>
      ${q ? `<p style="margin:8px 0 4px">第 ${q.i + 1} 题：${esc(r.steps.map(snakeStepText).join(' → '))} · 已答 ${q.answered}/${n}</p><p style="margin:0">答案（只有你看得到）：<b>${esc(show(q.answer))}</b></p>
        ${q.counts ? `<p class="muted" style="margin:4px 0 0">大家答的：${Object.keys(q.counts).map(k => esc(show(k)) + ' × ' + q.counts[k]).join('；')}</p>` : ''}
        ${q.res ? `<p style="margin:4px 0 0">${['o', 'b'].map(t => `${esc(tn(t))} ${q.res[t].right}/${q.res[t].n}${q.res[t].pass ? ' +1' : ''}`).join(' · ')}</p>` : ''}` : '<p class="muted" style="margin:6px 0 0">点「第 1 题」出题，孩子在平板上答，答完点「揭晓」：大屏一步一步走给大家看。</p>'}</div>`;
  },
  npcdemo(s) {
    const c = s.card || {};
    return `<div class="box"><h3>演示：${esc(c.name || '')}${s.slot === 'gate' ? `（口令「${esc(c.secret || '')}」，只有你看得到）` : ''}</h3><div class="btns">${(s.lines || []).map((p, i) => `<button class="btn sm purple" data-nsay="${i}">${esc(p)}</button>`).join('')}</div>
      <div class="btns" style="margin-top:8px"><input class="inp" id="nsin" placeholder="打孩子说的话，回车" style="flex:1"><button class="btn purple" id="nsgo">说</button></div>
      <p class="muted" style="margin:6px 0 0">${s.slot === 'gate' ? '规矩：' + (c.rules && c.rules.length ? c.rules.map(esc).join('；') : '一条都没有（所以很好骗）') : '它知道：' + (c.knows || []).map(esc).join('；') + '<br>规矩：' + (c.rules || []).map(esc).join('；')}</p></div>`;
  },
  npcmission(s) {
    const d = TC.V.sd || {}, pubs = d.npcs || {}, tk = d.tasks || {}, aw = d.awarded || {}, r = TC.V.roster || [], gate = s.kind === 'gate';
    const rows = []; ['o', 'b'].forEach(t => { const a = tk[t] || [0, 0, 0, teamCount(t)]; rows.push({ label: tn(t) + ' ★', t, n: a[0], total: a[3] }); rows.push({ label: tn(t) + ' ★★', t, n: a[1], total: a[3] }); });
    return `<div class="box"><h3>${esc(s.title)} · 计时</h3><div class="btns">${timerBtns(s.min || 15)}</div><p class="muted" style="margin:6px 0 0">${gate ? '孩子定口令、写规矩，自己先骗一骗；按「派它去守门」才能参加攻门赛。' : '孩子写角色卡，自己先问一问；按「开张」以后别人才能来聊天。'}</p></div>
      <div class="box"><h3>${gate ? '门卫' : '角色'}<span class="tag">${Object.keys(pubs).length}/${r.length} 已${gate ? '上岗' : '开张'}</span></h3><div class="list">${r.map(x => { const p = pubs[x.sid]; return `<div class="li"><span class="dot2 ${x.team || 'x'}"></span><span class="grow"><b>${esc(x.name)}</b>${p ? ` · ${esc(p.look || '')} ${esc(p.name || '')}${p.role ? '（' + esc(p.role) + '）' : ''} · ${gate ? '' : `知道 ${p.knows} 件 · `}${p.rules} 条规矩` : ' <span class="muted">还没' + (gate ? '上岗' : '开张') + '</span>'}</span><a href="#" data-pkid="${x.sid}" data-slot="${gate ? 'gate' : 'npc'}">角色卡</a></div>`; }).join('')}</div></div>
      <div class="box"><h3>任务进度</h3>${bars(rows)}<div class="btns" style="margin-top:8px">${['o', 'b'].map(t => `<button class="btn sm ${t === 'b' ? 'blue' : ''}" data-award="${t}" ${aw[t] ? 'disabled' : ''}>${esc(tn(t))}全队完成 ★ +3${aw[t] ? '（已加）' : ''}</button>`).join('')}</div></div>`;
  },
  gate(s) {
    const g = (TC.V.sd || {}).gate || { round: 0, phase: 'ready', gates: [], breaches: [] };
    const nm = sid => ((TC.V.roster || []).find(x => x.sid === sid) || {}).name || '';
    return `<div class="box"><h3>攻门赛 · ${g.phase === 'attack' ? `第 ${g.round} 轮攻门中` : g.phase === 'fix' ? `第 ${g.round} 轮结束，加固中` : '还没开始'}</h3>
        <div class="btns"><button class="btn green" id="gtr">${g.round ? `开始第 ${g.round + 1} 轮（重新配对）` : '开始第 1 轮攻门'}</button><button class="btn purple" id="gtf" ${g.phase !== 'attack' ? 'disabled' : ''}>停，加固规矩</button></div>
        <div class="btns" style="margin-top:8px">${timerBtns(6)}</div>
        <p class="muted" style="margin:6px 0 0">建议：攻门 6 分钟 → 加固 4 分钟 → 第二轮攻门 6 分钟。每攻破一扇门，攻门的队自动 +1。已上岗 ${g.gates.length} 扇门。</p></div>
      <div class="box"><h3>被攻破的记录<span class="tag">${g.breaches.length}</span></h3>${Array.from({ length: g.round }, (_, i) => `<p style="margin:0 0 4px">第 ${i + 1} 轮：${g.breaches.filter(b => b.round === i + 1).length} 次</p>`).join('')}
        <div class="list">${g.breaches.slice().reverse().map(b => `<div class="li" style="display:block"><b>${esc(b.byName)}</b> ${esc(b.how)} <b>${esc(b.ownerName)}</b> 的门（第 ${b.round} 轮）<br><small>他说：「${esc(b.text)}」</small><br><small>门卫答：「${esc(b.reply || '')}」</small></div>`).join('') || '<p class="muted">还没有</p>'}</div></div>
      ${g.pairs ? `<div class="box"><h3>谁攻谁的门</h3><div class="list">${Object.keys(g.pairs).map(a => `<div class="li"><span class="grow">${esc(nm(a))} → ${esc(nm(g.pairs[a]))} 的门</span><a href="#" data-pkid="${g.pairs[a]}" data-slot="gate">看门卫</a></div>`).join('')}</div></div>` : ''}`;
  },
  dogdemo(s) {
    const c = s.card || {};
    return `<div class="box"><h3>口令演示：${esc(c.name || '')}（大屏上的比特照口令表回答）</h3><div class="btns">${(s.lines || []).map((p, i) => `<button class="btn sm purple" data-dsay="${i}">${esc(p)}</button>`).join('')}</div>
      <div class="btns" style="margin-top:8px"><input class="inp" id="dsin" placeholder="打孩子说的口令或问题，回车" style="flex:1"><button class="btn purple" id="dsgo">说</button></div>
      <p class="muted" style="margin:6px 0 0">口令表：${(c.rules || []).map(r => '「' + esc(r.when) + '」→ ' + esc([r.do, r.say ? '说「' + r.say + '」' : ''].filter(Boolean).join('，'))).join('；')}</p></div>`;
  },
  flow(s) { const n = Math.max(0, ...(TC.V.cues || []).filter(c => c.n === 'step').map(c => c.a)); return `<div class="box"><h3>一步一步出现<span class="tag">${n}/${s.steps.length}</span></h3><div class="btns"><button class="btn" data-step="${n + 1}" ${n >= s.steps.length ? 'disabled' : ''}>下一步${n < s.steps.length ? '：' + esc(s.steps[n].b) : ''}</button><button class="btn sm ghost" data-cue="reset">重来</button></div><p class="muted" style="margin:6px 0 0">先问孩子「下一步会发生什么？」，再点出来。</p></div>`; },
  activity(s) {
    const sc = (TC.V.sd || {}).score || { o: 0, b: 0 };
    if (s.award === 0) return `<div class="box"><h3>${esc(s.title)}</h3><p class="muted" style="margin:0">${(s.steps || []).map(esc).join(' → ')}</p></div>`;
    return `<div class="box"><h3>${esc(s.title)} · 计时</h3><div class="btns">${timerBtns(s.min || 5)}</div></div>
      <div class="box"><h3>加分<span class="tag">${esc(tn('o'))} ${sc.o || 0} · ${esc(tn('b'))} ${sc.b || 0}</span></h3><div class="btns">${['o', 'b'].map(t => `<button class="btn ${t === 'b' ? 'blue' : ''}" data-tscore="${t}">${esc(tn(t))} +${s.award || 1}</button>`).join('')}<button class="btn ghost sm" data-tscore-undo="1">撤销上一次</button></div><p class="muted" style="margin:6px 0 0">${(s.steps || []).map(esc).join(' → ')}</p></div>`;
  },
  rest(s) { return `<div class="box"><h3>屏幕休息</h3><p class="muted">开始后所有平板锁住，时间到自动解锁。</p><div class="btns">${timerBtns(s.min || 3, true)}</div></div>`; },
  arena() { return `<div class="box"><h3>咒语擂台</h3><div class="btns"><button class="btn ghost" data-cue="answer">看参考答案</button><button class="btn" data-arena="o">${esc(tn('o'))} +2</button><button class="btn blue" data-arena="b">${esc(tn('b'))} +2</button></div></div>`; },
  duel(s) {
    const d = TC.V.sd || {}, aw = d.awarded || {};
    let body = '';
    if (s.kind === 'report') {
      const b = d.report || { hit: { o: 0, b: 0 }, total: { o: 0, b: 0 }, reports: {} }, R = s.report;
      body = `<div class="btns" style="margin-bottom:8px"><button class="btn purple" id="swap">${d.phase === 'swap' ? '重新交换' : '交换'}</button><span class="tag">${d.phase === 'swap' ? '已交换' : '还在改自己的游戏'}</span></div>
        ${bars(['o', 'b'].map(t => ({ label: tn(t) + (R.hitLabel || '做得好'), t, n: b.hit[t], total: b.total[t] || teamCount(t) })))}
        <p class="muted" style="margin:6px 0">${R.opts.map((o, i) => esc(o) + ' ' + ((b.counts || [])[i] || 0)).join(' · ')}</p>
        <div class="list">${Object.keys(b.reports || {}).map(p => { const x = b.reports[p]; return `<div class="li"><span class="grow">${esc(nameOf(p))} 玩 ${esc(nameOf(x.target))} 的：<b>${esc(R.opts[x.i] || '')}</b></span><button class="btn sm ghost" data-look="${x.target}">看游戏</button>${R.hit.includes(x.i) ? '<span class="tag g">✓</span>' : ''}</div>`; }).join('') || '<p class="muted">交换后，孩子玩完会报结果</p>'}</div>`;
    } else if (s.kind === 'balance') {
      const b = d.balance || { hit: { o: 0, b: 0 }, total: { o: 0, b: 0 }, scores: {} };
      body = `<div class="btns" style="margin-bottom:8px"><button class="btn purple" id="swap">${d.phase === 'swap' ? '重新交换' : '交换'}</button><span class="tag">${d.phase === 'swap' ? '已交换' : '还在调自己的游戏'}</span></div>
        ${bars(['o', 'b'].map(t => ({ label: tn(t) + '作品落在 10~20', t, n: b.hit[t], total: b.total[t] || teamCount(t) })))}
        <div class="list" style="margin-top:8px">${Object.keys(b.scores || {}).map(p => { const x = b.scores[p]; return `<div class="li"><span class="grow">${esc(nameOf(p))} 玩 ${esc(nameOf(x.target))} 的：<b>${x.score} 分</b></span>${x.score >= 10 && x.score <= 20 ? '<span class="tag g">正好</span>' : ''}</div>`; }).join('') || '<p class="muted">交换后，孩子玩完会报分数</p>'}</div>`;
    } else {
      const ok = t => (d.claims || []).filter(c => c.team === t && c.status === 'ok').length;
      body = bars(['o', 'b'].map(t => ({ label: tn(t) + '改对了', t, n: ok(t), total: teamCount(t) }))) + `<h3 style="margin-top:10px">交上来的</h3>${claimList(d.claims)}`;
    }
    return `<div class="box"><h3>${esc(s.title)} · 计时</h3><div class="btns">${timerBtns(s.min || 10)}</div></div>
      <div class="box"><h3>进度</h3>${body}<div class="btns" style="margin-top:8px">${['o', 'b'].map(t => `<button class="btn sm ${t === 'b' ? 'blue' : ''}" data-duel="${t}" ${aw[t] ? 'disabled' : ''}>${esc(tn(t))}赢 +2</button>`).join('')}</div></div>`;
  },
  quiz(s) {
    const q = (TC.V.sd || {}).quiz || { answered: 0 }, Ls = 'ABCD';
    const hs = new Set((TC.V.cues || []).filter(c => c.n === 'reveal').map(c => c.a));
    const hintBox = s.hints ? `<div class="box"><h3>线索<span class="tag">${hs.size}/${s.hints.length}</span></h3><div class="btns">${s.hints.map((h, i) => `<button class="btn sm ${hs.has(i) ? 'ghost' : ''}" data-rvc="${i}" ${hs.has(i) ? 'disabled' : ''}>${esc(h.k)}：${esc(h.t)}</button>`).join('')}</div><p class="muted" style="margin:6px 0 0">翻一张，问一句「猜到了吗？」，再翻下一张。</p></div>` : '';
    return hintBox + `<div class="box"><h3>${s.engine ? '规则侦探' : '答题'}<span class="tag">已答 ${q.answered}/${(TC.V.roster || []).length}</span></h3>
      <div class="list">${s.opts.map((o, i) => `<div class="li" style="${i === s.ans ? 'background:var(--green-l)' : ''}"><b>${Ls[i]}</b><span class="grow">${esc(o)}</span><b>${q.counts ? q.counts[i] : 0} 人</b></div>`).join('')}</div>
      ${s.explain ? `<p class="muted" style="margin:6px 0 0">揭晓后大屏出现：${esc(s.explain)}</p>` : ''}
      <div class="btns" style="margin-top:8px"><button class="btn green" id="qrv" ${q.revealed ? 'disabled' : ''}>${q.revealed ? '已揭晓' : '揭晓（自动加分）'}</button><button class="btn ghost sm" id="qrs">重来</button></div>
      ${q.res ? `<p style="margin:8px 0 0">${['o', 'b'].map(t => q.res[t] && q.res[t].n ? `${esc(tn(t))} ${q.res[t].right}/${q.res[t].n}${q.res[t].pass ? ' +1' : ''}` : '').filter(Boolean).join('；')}</p>` : ''}
      ${q.ans ? `<p class="muted" style="margin:8px 0 0">还没答：${(TC.V.roster || []).filter(r => q.ans[r.sid] == null).map(r => esc(r.name)).join('、') || '无'}</p>` : ''}</div>`;
  },
  boxes(s) {
    const b = (TC.V.sd || {}).boxes || {}, p = b.pend;
    return `<div class="box"><h3>变量实验${p ? `<span class="tag">已猜 ${p.answered}</span>` : ''}</h3><div class="btns">${s.events.map((e, i) => `<button class="btn sm ${p && p.i === i && !p.revealed ? 'purple' : 'ghost'}" data-ev="${i}">${esc(e.t)}</button>`).join('')}</div>
      <div class="btns" style="margin-top:8px"><button class="btn green" id="grv" ${!p || p.revealed ? 'disabled' : ''}>揭晓（自动加分）</button><button class="btn ghost sm" id="grs">重新开始</button></div>
      ${p ? `<p style="margin:8px 0 0">${esc(p.k)}：${p.from} → <b>${p.to}</b>${p.ans ? '　孩子猜：' + Object.keys(p.ans).map(sid => esc(nameOf(sid)) + ' ' + p.ans[sid]).join('、') : ''}</p>` : ''}</div>`;
  },
  gallery(s) {
    const st = (TC.V.sd || {}).stars || {}; const top = (TC.V.roster || []).map(r => ({ r, n: st[r.sid] || 0 })).sort((a, b) => b.n - a.n).filter(x => x.n).slice(0, 8);
    return `<div class="box"><h3>${esc(s.title)} · 计时</h3><div class="btns">${timerBtns(s.min || 5)}</div></div>
      <div class="box"><h3>星星榜<span class="tag">${(TC.V.sd || {}).voters || 0} 人投了</span></h3><div class="list">${top.map(x => `<div class="li"><span class="dot2 ${x.r.team || 'x'}"></span><span class="grow"><b>${esc(x.r.name)}</b> ★ ${x.n}</span><button class="btn sm" data-spot="${x.r.sid}" data-proj="${s.proj}">投到大屏</button></div>`).join('') || '<p class="muted">还没人投</p>'}</div></div>`;
  },
  showcase(s) {
    const p = (TC.V.sd || {}).present || { done: [] };
    return `<div class="box"><h3>${esc(s.title)}</h3><div class="btns"><button class="btn" id="pnext">下一位（随机）</button><button class="btn green" data-cue="applause">掌声</button><button class="btn ghost sm" id="spx">关掉大屏展示</button></div>
      ${s.all ? bars(['o', 'b'].map(t => ({ label: tn(t) + '讲完', t, n: (TC.V.roster || []).filter(r => r.team === t && p.done.includes(r.sid)).length, total: teamCount(t) }))) + `<div class="btns">${['o', 'b'].map(t => `<button class="btn sm ${t === 'b' ? 'blue' : ''}" data-pa="${t}">${esc(tn(t))}讲完 +3</button>`).join('')}</div>` : ''}
      <h3 style="margin-top:10px">直接点名字上台</h3><div class="btns">${(TC.V.roster || []).map(r => `<button class="btn sm ${p.done.includes(r.sid) ? 'ghost' : r.team === 'b' ? 'blue' : ''}" data-up="${r.sid}">${esc(r.name)}${p.done.includes(r.sid) ? ' ✓' : ''}</button>`).join('')}</div></div>`;
  },
  wanted(s) { const rv = new Set((TC.V.cues || []).filter(c => c.n === 'reveal').map(c => c.a)); return `<div class="box"><h3>通缉令</h3><div class="btns">${s.bugs.map((b, i) => `<button class="btn sm ${rv.has(i) ? 'ghost' : ''}" data-rvc="${i}">${rv.has(i) ? '已翻 ' : '翻开 '}${esc(b.n)}</button><button class="btn sm green" data-caught="${i}">盖「已抓获」</button>`).join('')}</div></div>`; },
  trick(s) {
    const d = TC.V.sd || {}, tr = d.trick || { fixed: { o: 0, b: 0 }, n: { o: 0, b: 0 }, cards: {}, pairs: {}, fixedBy: {} };
    const rows = (TC.V.roster || []).map(r => `<div class="li"><span class="dot2 ${r.team || 'x'}"></span><span class="grow"><b>${esc(r.name)}</b>：${esc((tr.cards || {})[r.sid] || '—')}${(tr.pairs || {})[r.sid] ? `<br><small>在修 ${esc(nameOf(tr.pairs[r.sid]))} 的</small>` : ''}</span>${(tr.fixedBy || {})[r.sid] ? '<span class="tag g">修好了</span>' : ''}</div>`).join('');
    return `<div class="box"><h3>捣蛋卡对决 · 计时</h3><div class="btns">${timerBtns(s.min || 12)}</div><div class="btns" style="margin-top:8px"><button class="btn" id="deal">发牌</button><button class="btn purple" id="swap">交换</button><span class="tag">${{ none: '还没发牌', deal: '已发牌', swap: '已交换' }[d.phase || 'none']}</span></div></div>
      <div class="box"><h3>进度</h3>${bars(['o', 'b'].map(t => ({ label: tn(t) + '修好', t, n: tr.fixed[t], total: tr.n[t] })))}<div class="btns" style="margin-top:8px">${['o', 'b'].map(t => `<button class="btn sm ${t === 'b' ? 'blue' : ''}" data-duel="${t}">${esc(tn(t))}赢 +2</button>`).join('')}</div><div class="list" style="margin-top:8px">${rows}</div></div>`;
  },
  dance(s) {
    if (s.mode === 'follow') {
      const last = (TC.V.cues || []).filter(c => c.n === 'seq').pop(); const seq = last ? last.a.seq : (s.seq || []), loops = last ? last.a.loops : 1;
      TC.followSeq = { seq, loops };
      return `<div class="box"><h3>拆开看：排动作</h3><p style="margin:0 0 6px">现在：${seq.length ? seq.map(esc).join(' → ') : '（空）'}　重复 ${loops} 次</p>
        <div class="btns">${ACTS.map(a => `<button class="btn sm ghost" data-add="${a}">${a}</button>`).join('')}</div>
        <div class="btns" style="margin-top:8px">${[1, 2, 3].map(n => `<button class="btn sm ${n === loops ? 'purple' : 'ghost'}" data-loop="${n}">重复 ${n} 次</button>`).join('')}<button class="btn sm ghost" id="undo">删最后一个</button><button class="btn sm ghost" id="clr">清空</button><button class="btn" data-cue="play">跳！</button></div></div>`;
    }
    return `<div class="box"><h3>精灵编舞（大屏）</h3><div class="btns">${(s.moods || []).map(m => `<button class="btn sm purple" data-mood="${m}">跳一段${m === '困了' ? '困困' : m}的舞</button>`).join('')}</div>
      <div class="btns" style="margin-top:8px"><input class="inp" id="dd" placeholder="打孩子说的话，比如：像机器人一样跳" style="flex:1"><button class="btn purple" id="ddgo">编</button><button class="btn ghost sm" data-cue="play">再跳一遍</button></div></div>`;
  },
  countdown() { return `<div class="box"><h3>开箱</h3><div class="btns"><button class="btn" data-cue="open">开箱（倒数 3 秒）</button></div></div>`; },
  groups(s) {
    const g = (TC.V.sd || {}).groups || [];
    return `<div class="box"><h3>三人小组</h3><div class="btns"><button class="btn" id="mk">${g.length ? '重新分组' : '分组'}</button><button class="btn purple" id="rot">换岗</button></div>
      <div class="list" style="margin-top:8px">${g.map(x => `<div class="li"><span class="dot2 ${x.team}"></span><span class="grow"><b>第 ${x.no} 组 · ${esc(x.dog)}</b><br><small>${x.members.map(m => esc(m.name) + '（' + m.role + '）').join('、')}</small></span></div>`).join('')}</div>
      ${REAL_DOG ? '<p class="muted">狗的名字和真狗的连接在「设置 → 机器狗」里配。</p>' : ''}</div>`;
  },
  mood() { const g = (TC.V.sd || {}).groups || []; return `<div class="box"><h3>心情卡（只有你看得到）</h3><div class="list">${g.map(x => `<div class="li"><span class="dot2 ${x.team}"></span><span class="grow">第 ${x.no} 组</span><b>${x.mood ? esc(x.mood) : '还没抽'}</b></div>`).join('') || '<p class="muted">还没分组</p>'}</div></div>`; },
  guessmood(s) {
    const d = TC.V.sd || {}, g = d.groups || [], p = d.perform, opts = s.opts || MOOD_CARDS, persona = s.kind === 'persona';
    const ans = x => persona ? (x.persona ? x.persona.trait : null) : x.mood;
    if (s.own) {
      const ps = d.performers || [];
      return `<div class="box"><h3>${esc(s.title)}（括号里是答案，只有你看得到）</h3><div class="btns">${ps.map(x => `<button class="btn sm ${x.team === 'b' ? 'blue' : ''} ${x.done ? 'ghost' : ''}" data-perfsid="${x.sid}">${esc(x.name)}的${esc(x.dog || '狗')}（${esc(x.trait || '')}）</button>`).join('') || '<p class="muted">还没有人把角色卡发给狗</p>'}</div>
        ${p ? `<p style="margin:8px 0">${esc(p.name || '')}的狗在聊天 · 已猜 ${p.answered} 人${p.counts ? ' · ' + opts.map((m, i) => m + ' ' + p.counts[i]).join('、') : ''}</p><div class="btns"><button class="btn green" id="mrv" ${p.revealed ? 'disabled' : ''}>揭晓（自动加分）</button></div>` : '<p class="muted">点一个孩子：他的狗出场，其他人跟它聊天，猜性格</p>'}
        ${p ? '<div class="row" style="gap:6px;margin-top:8px"><input class="inp grow" id="stgin" placeholder="替大家问它一句"><button class="btn sm" id="stggo">问</button></div><p class="muted" style="margin:6px 0 0">台下的孩子也可以在自己平板上问（一次一句，主人不能问）。</p>' : ''}
        <p class="muted" style="margin:8px 0 0">已经猜了 ${d.rounds || 0} 只</p></div>`;
    }
    return `<div class="box"><h3>${esc(s.title)}${persona ? '（括号里是答案，只有你看得到）' : ''}</h3><div class="btns">${g.map(x => `<button class="btn sm ${x.team === 'b' ? 'blue' : ''}" data-perf="${x.id}" ${persona && !x.persona ? 'disabled' : ''}>第 ${x.no} 组${persona ? '' : '表演'}${ans(x) ? '（' + esc(ans(x)) + '）' : persona ? '（没发卡）' : ''}</button>`).join('')}</div>
      ${p ? `<p style="margin:8px 0">第 ${p.no} 组${persona ? '的比特在聊天' : '在表演'} · 已猜 ${p.answered} 人${p.counts ? ' · ' + opts.map((m, i) => m + ' ' + p.counts[i]).join('、') : ''}</p><div class="btns"><button class="btn green" id="mrv" ${p.revealed ? 'disabled' : ''}>揭晓（自动加分）</button></div>` : `<p class="muted">点一组开始${persona ? '：这组的比特出场，其他人跟它聊天' : '表演'}</p>`}
      <p class="muted" style="margin:8px 0 0">已经${persona ? '猜' : '表演'}了 ${d.rounds || 0} 组</p></div>`;
  },
  stage(s) {
    const d = TC.V.sd || {}, g = d.stage, ps = d.performers || [];
    return `<div class="box"><h3>${esc(s.title)} · 请一只狗上台</h3><div class="btns">${ps.map(x => `<button class="btn sm ${x.team === 'b' ? 'blue' : ''} ${x.done ? 'ghost' : ''}" data-stg="${x.sid}">${esc(x.name)}的${esc(x.dog || '狗')}</button>`).join('') || '<p class="muted">还没有人让狗上线（第 11 节「做我的口令表」那页按「让我的狗上线」）</p>'}${g ? '<button class="btn sm ghost" data-stg="">请下台</button>' : ''}</div>
      ${g ? `<p style="margin:8px 0">台上：<b>${esc(g.name)}的${esc(g.dog || '狗')}</b>${g.card && g.card.rules ? ` · ${g.card.rules.length} 条口令` : ''}。台上的孩子在自己平板上说口令，大屏上的狗照口令表回答。</p><div class="row" style="gap:6px"><input class="inp grow" id="stgin" placeholder="替台上的孩子打字"><button class="btn sm" id="stggo">说</button></div>` : '<p class="muted">点一个名字：他的狗出现在大屏上</p>'}</div>
      ${s.award ? `<div class="box"><h3>加分</h3><div class="btns">${['o', 'b'].map(t => `<button class="btn sm ${t === 'b' ? 'blue' : ''}" data-tscore="${t}">${esc(tn(t))} +${s.award}</button>`).join('')}<button class="btn sm ghost" data-tscore-undo="1">撤销上一次</button></div></div>` : ''}`;
  },
  speech(s) { const lines = (TC.V.sd || {}).lines || {}; return `<div class="box"><h3>准备讲稿 · 计时</h3><div class="btns">${timerBtns(s.min || 4)}</div><p class="muted">已经写好的：${Object.keys(lines).map(x => esc(nameOf(x))).join('、') || '还没有'}</p></div>`; },
  beat(s) { return `<div class="box"><h3>${esc(s.title || '比特派对')}</h3><div class="btns"><button class="btn" data-music="1">音乐响起来</button><button class="btn ghost" data-music="0">停</button></div><p class="muted">大屏上的比特跟着音乐跳。${REAL_DOG ? '真狗：各组轮流对自己的比特说「跟大家打个招呼」「跳个舞」。' : ''}</p></div>`; },
  result(s) { const P = TC.V.pts || {}; const sum = ids => ids.reduce((a, id) => { const p = P[id] || { o: 0, b: 0 }; return { o: a.o + p.o, b: a.b + p.b }; }, { o: 0, b: 0 }); const t = s.pack ? sum(s.pack) : null; return `<div class="box"><h3>结算${s.pack ? '（' + esc(s.packLabel || '累计') + '）' : ''}</h3>${t ? `<p style="margin:0 0 8px">${esc(tn('o'))} <b>${t.o}</b> · ${esc(tn('b'))} <b>${t.b}</b>（${s.pack.join('、')}）</p>` : ''}<div class="btns"><button class="btn" data-cue="result">公布结果</button></div></div>`; }
};
function claimList(claims) {
  const list = (claims || []).slice().reverse();
  if (!list.length) return '<p class="muted">还没有人交</p>';
  return `<div class="list">${list.map(c => `<div class="li"><span class="dot2 ${c.team || 'x'}"></span><span class="grow"><b>${esc(c.name)}</b>${c.bug ? '：' + esc(c.bug) : '：我改好了'}</span><button class="btn sm ghost" data-look="${c.sid}">看游戏</button>${c.status === 'wait' ? `<button class="btn sm green" data-ok="${c.id}">对</button><button class="btn sm red" data-no="${c.id}">还差点</button>` : `<span class="tag ${c.status === 'ok' ? 'g' : 'r'}">${c.status === 'ok' ? '确认了' : '没通过'}</span>`}</div>`).join('')}</div>`;
}
function renderControls(force) {
  const V = TC.V, L = lessonById(V.lesson), el = $('#cM');
  const prevScroll = el.scrollTop;
  // 操作内容可以刷新；预览容器和 iframe 始终留在原位，避免重新加载大屏。
  let content = $('#ctl-content', el);
  if (!content) {
    el.innerHTML = '<div id="ctl-content" style="display:contents"></div>' + previewBox();
    content = $('#ctl-content', el); bindPreview();
  }
  const s = L ? L.slides[V.slide] : null, f = s && C2[s.type];
  const html = !s ? '' : (f ? f(s) : '<div class="box"><h3>这一页</h3><p class="muted">没有要操作的，照大屏讲就行。</p></div>');
  if (!force && (html === TC.ctlKey || editingIn(content))) return;
  content.innerHTML = html; TC.ctlKey = html;
  if (s) { bindControls(content, s); bindTimer(content); }
  el.scrollTop = prevScroll;
}
function bindControls(el, s) {
  const on2 = (id, f) => { const n = $('#' + id, el); if (n) n.onclick = f; };
  $$('[data-cue]', el).forEach(b => b.onclick = () => cue(b.dataset.cue));
  $$('[data-rvc]', el).forEach(b => b.onclick = () => cue('reveal', +b.dataset.rvc));
  $$('[data-caught]', el).forEach(b => b.onclick = () => cue('caught', +b.dataset.caught));
  $$('[data-step]', el).forEach(b => b.onclick = () => cue('step', +b.dataset.step));
  $$('[data-hide]', el).forEach(b => b.onclick = () => act({ type: 'wall.hide', id: b.dataset.hide, hidden: b.dataset.h === '1' }));
  $$('[data-demo]', el).forEach(b => b.onclick = () => { if (s.type === 'demo') demoSay(s, b.dataset.demo); else toast('翻到「精灵演示」页再用'); });
  $$('[data-award]', el).forEach(b => b.onclick = () => act({ type: 'task.award', t: b.dataset.award }));
  $$('[data-arena]', el).forEach(b => b.onclick = () => act({ type: 'arena.award', t: b.dataset.arena }));
  $$('[data-duel]', el).forEach(b => b.onclick = () => act({ type: 'duel.award', t: b.dataset.duel }));
  $$('[data-ok]', el).forEach(b => b.onclick = () => act({ type: 'claim.verify', id: b.dataset.ok, ok: true }));
  $$('[data-no]', el).forEach(b => b.onclick = () => act({ type: 'claim.verify', id: b.dataset.no, ok: false }));
  $$('[data-look]', el).forEach(b => b.onclick = () => openKid(b.dataset.look, s.proj || (s.stu && s.stu.proj)));
  $$('[data-spot]', el).forEach(b => b.onclick = () => act({ type: 'spot', sid: b.dataset.spot, proj: b.dataset.proj }));
  $$('[data-up]', el).forEach(b => b.onclick = () => { act({ type: 'spot', sid: b.dataset.up, proj: s.proj, show: s.proj === 'fix' ? 'chat' : 'game' }); act({ type: 'present.mark', sid: b.dataset.up }); });
  $$('[data-pa]', el).forEach(b => b.onclick = () => act({ type: 'present.award', t: b.dataset.pa }));
  $$('[data-ev]', el).forEach(b => b.onclick = () => act({ type: 'guess.event', i: +b.dataset.ev }));
  $$('[data-perf]', el).forEach(b => b.onclick = () => act({ type: 'mood.perform', gid: b.dataset.perf }));
  $$('[data-perfsid]', el).forEach(b => b.onclick = () => act({ type: 'mood.perform', sid: b.dataset.perfsid }));
  $$('[data-tscore]', el).forEach(b => b.onclick = () => act({ type: 'team.score', t: b.dataset.tscore, d: s.award || 1, why: s.title }).then(() => { TC.lastScore = b.dataset.tscore; }));
  $$('[data-tscore-undo]', el).forEach(b => b.onclick = () => { if (!TC.lastScore) return toast('还没加过分'); act({ type: 'team.score', t: TC.lastScore, d: -(s.award || 1), why: '撤销' }); TC.lastScore = null; });
  $$('[data-pkid]', el).forEach(b => b.onclick = e => { e.preventDefault(); openKid(b.dataset.pkid, b.dataset.slot || 'persona'); });
  $$('[data-dk]', el).forEach(b => b.onclick = () => openKid(b.dataset.dk, 'design'));
  $$('[data-turn2]', el).forEach(b => b.onclick = () => act({ type: 'turn', t: b.dataset.turn2 || null }));
  $$('[data-sleep2]', el).forEach(b => b.onclick = () => act({ type: 'dogs.sleep', on: !TC.V.sleep }));
  $$('[data-dclear]', el).forEach(b => b.onclick = () => act({ type: 'dog.clear', sid: b.dataset.dclear }));
  $$('[data-dsay]', el).forEach(b => b.onclick = () => TC.net.post('dog-demo', { card: s.card, text: s.lines[+b.dataset.dsay] }));
  on2('dsgo', () => { const i = $('#dsin', el); if (i.value.trim()) TC.net.post('dog-demo', { card: s.card, text: i.value.trim() }); i.value = ''; });
  const dsin = $('#dsin', el); if (dsin) dsin.onkeydown = e => { if (e.key === 'Enter') $('#dsgo', el).click(); };
  $$('[data-stg]', el).forEach(b => b.onclick = () => TC.net.post('stage-pick', { sid: b.dataset.stg || null }).then(r => { if (r && r.err) toast(r.err); }));
  on2('stggo', () => { const i = $('#stgin', el); const t = i.value.trim(); if (t) TC.net.post('stage-chat', { text: t }).then(r => { if (r && r.err) toast(r.err); }); i.value = ''; });
  const stgin = $('#stgin', el); if (stgin) stgin.onkeydown = e => { if (e.key === 'Enter') $('#stggo', el).click(); };
  $$('[data-snd]', el).forEach(b => b.onclick = () => act({ type: 'snake.step', d: b.dataset.snd }));
  $$('[data-snf]', el).forEach(b => b.onclick = () => { const cur = ((TC.V.sd || {}).snake || {}).food; act({ type: 'snake.food', food: cur === b.dataset.snf ? null : b.dataset.snf }); });
  on2('snr', () => act({ type: 'snake.reset' }));
  $$('[data-sqr]', el).forEach(b => b.onclick = () => act({ type: 'sq.round', i: +b.dataset.sqr }));
  on2('sqrv', () => act({ type: 'sq.reveal' }));
  $$('[data-nsay]', el).forEach(b => b.onclick = () => TC.net.post('npc-demo', { card: s.card, slot: s.slot, text: s.lines[+b.dataset.nsay] }));
  on2('nsgo', () => { const i = $('#nsin', el); if (i.value.trim()) TC.net.post('npc-demo', { card: s.card, slot: s.slot, text: i.value.trim() }); i.value = ''; });
  const nsin = $('#nsin', el); if (nsin) nsin.onkeydown = e => { if (e.key === 'Enter') $('#nsgo', el).click(); };
  on2('gtr', () => act({ type: 'gate.round' }));
  on2('gtf', () => act({ type: 'gate.fix' }));
  $$('[data-music]', el).forEach(b => b.onclick = () => cue('music', b.dataset.music === '1'));
  $$('[data-mood]', el).forEach(b => b.onclick = () => TC.net.post('demo-dance', { mood: b.dataset.mood }));
  $$('[data-spell]', el).forEach(b => b.onclick = () => demoSay(s, s.spells[+b.dataset.spell]));
  $$('[data-add]', el).forEach(b => b.onclick = () => { const f = TC.followSeq; if (f.seq.length < 10) cue('seq', { seq: f.seq.concat([b.dataset.add]), loops: f.loops }); });
  $$('[data-loop]', el).forEach(b => b.onclick = () => { const f = TC.followSeq; cue('seq', { seq: f.seq, loops: +b.dataset.loop }); });
  const on = (id, f) => { const n = $('#' + id, el); if (n) n.onclick = f; };
  on('undo', () => { const f = TC.followSeq; cue('seq', { seq: f.seq.slice(0, -1), loops: f.loops }); });
  on('clr', () => { const f = TC.followSeq; cue('seq', { seq: [], loops: f.loops }); });
  on('draw', () => act({ type: 'teams.draw' }));
  $$('[data-tname]', el).forEach(i => i.onchange = () => act({ type: 'teams.name', t: i.dataset.tname, name: i.value }));
  on('qrv', () => act({ type: 'quiz.reveal' })); on('qrs', () => act({ type: 'quiz.reset' }));
  on('grv', () => act({ type: 'guess.reveal' })); on('grs', () => act({ type: 'guess.reset' }));
  on('swap', () => act({ type: 'balance.swap' })); on('deal', () => act({ type: 'trick.deal' }));
  on('mk', () => act({ type: 'groups.make', size: s.size || 3 })); on('rot', () => act({ type: 'groups.rotate' }));
  on('mrv', () => act({ type: 'mood.reveal' }));
  on('pnext', () => act({ type: 'present.next' })); on('spx', () => act({ type: 'spot', sid: null }));
  on('dgo', () => { const i = $('#dp', el); if (i.value.trim()) demoSay(s, i.value.trim()); i.value = ''; });
  const dp = $('#dp', el); if (dp) dp.onkeydown = e => { if (e.key === 'Enter') $('#dgo', el).click(); };
  on('drs', () => TC.net.post('demo-reset', { game: s.game, slot: s.slot || undefined }));
  on('dpok', () => TC.net.post('demo', demoBody(s, { approve: true })).then(r => { if (r && r.err) toast(r.err); }));
  on('derrgo', () => { const e = TC.V.demoErr; if (e) TC.net.post('demo', demoBody(s, { prompt: '', error: e.msg, plan: undefined })).then(r => { if (r && r.err) toast(r.err); }); });
  on('ddgo', () => { const i = $('#dd', el); if (i.value.trim()) TC.net.post('demo-dance', { prompt: i.value.trim() }); i.value = ''; });
  const dd = $('#dd', el); if (dd) dd.onkeydown = e => { if (e.key === 'Enter') $('#ddgo', el).click(); };
}
const demoBody = (s, o) => Object.assign({ game: s.game, slot: s.slot || undefined, spec: s.spec || undefined, plan: !!s.plan || undefined, mock: !!s.mock || undefined }, o);
function demoSay(s, p) { TC.net.post('demo', demoBody(s, { prompt: p })).then(r => { if (r && r.err) toast(r.err); }); toast(s.plan ? '精灵在想计划……' : '精灵在大屏上改……'); }
function previewBox() {
  if (TC.hubMode) return '';
  return `<div class="box" id="preview-box"><h3>大屏预览<button class="btn sm ghost" id="pvt" style="margin-left:auto">${TC.preview ? '收起' : '展开'}</button></h3><div class="preview" id="pvw" style="display:${TC.preview ? '' : 'none'}"></div></div>`;
}
let pvFrame = null;
function scalePreview() {
  const w = $('#pvw'), frame = pvFrame;
  // 延迟回调只处理仍连接在当前容器里的预览。
  if (w && w.isConnected && frame && frame.parentElement === w && TC.preview) frame.style.transform = `scale(${w.clientWidth / 1600})`;
}
function bindPreview() {
  const t = $('#pvt'), w = $('#pvw'); if (!w) return;
  if (!pvFrame) { pvFrame = document.createElement('iframe'); pvFrame.src = '/screen?mini=1' + (TC.V.screenKey ? '&s=' + encodeURIComponent(TC.V.screenKey) : ''); w.appendChild(pvFrame); }
  if (t) t.onclick = () => {
    TC.preview = !TC.preview; t.textContent = TC.preview ? '收起' : '展开';
    w.style.display = TC.preview ? '' : 'none'; scalePreview();
  };
  scalePreview(); setTimeout(scalePreview, 50);
}
addEventListener('resize', scalePreview);

// ---------- 右：学生 ----------
function renderKids() {
  const V = TC.V, el = $('#cR'), r = V.roster || [];
  const busy = new Set(V.busy || []), tb = V.taskBy || {};
  const hands = r.filter(x => x.hand);
  const L = lessonById(V.lesson), s = L ? L.slides[V.slide] : null, isMission = s && (s.type === 'mission');
  el.innerHTML = `<div class="box"><h3>学生<span class="tag">${r.filter(x => x.online).length}/${r.length} 在线</span>${hands.length ? `<span class="tag r">✋ ${hands.length}</span>` : ''}</h3>
    ${hands.length ? `<div class="btns" style="margin-bottom:8px">${hands.map(x => `<button class="btn sm" data-hc="${x.sid}">✋ ${esc(x.name)} 已处理</button>`).join('')}</div>` : ''}
    <div class="kids">${r.map(x => { const t = tb[x.sid] || []; return `<button class="kid ${x.team || ''} ${x.online ? '' : 'off'} ${x.hand ? 'handup' : ''}" data-kid="${x.sid}"><b>${esc(x.name)}</b><small>${x.online ? '在线' : '没连上'}${isMission ? ` <span class="stars3">${[0, 1, 2].map(i => `<span class="${t[i] ? 'on' : ''}">★</span>`).join('')}</span>` : ''}</small>${x.hand ? '<span class="hand">✋</span>' : ''}${busy.has(x.sid) ? '<span class="busy">✨改代码中</span>' : ''}</button>`; }).join('') || (V.nameOnlyJoin ? '<p class="muted">还没有学生。孩子扫码后输入自己的名字即可加入。</p>' : V.publicMode ? '<p class="muted">还没有学生。先在「设置」录入昵称名单，再分发每人的四位登录码；孩子输入昵称和老师发的个人登录码。</p>' : '<p class="muted">还没有学生。在「设置」里录入名单，或让孩子在平板上输入名字。</p>')}</div></div>
    <div class="box"><h3>快捷</h3><div class="btns"><button class="btn ghost sm" id="spx2">关掉大屏展示</button><button class="btn ghost sm" id="rep">成长记录</button></div></div>`;
  $$('[data-kid]', el).forEach(b => b.onclick = () => openKid(b.dataset.kid));
  $$('[data-hc]', el).forEach(b => b.onclick = () => act({ type: 'hand.clear', sid: b.dataset.hc }));
  $('#spx2', el).onclick = () => act({ type: 'spot', sid: null });
  $('#rep', el).onclick = () => { if (TC.hubMode) return toast('试玩版没有成长记录'); window.open('/api/report?k=' + encodeURIComponent(TC.key), '_blank'); };
}
async function openKid(sid, projHint) {
  const r = (TC.V.roster || []).find(x => x.sid === sid); if (!r) return;
  const L = lessonById(TC.V.lesson), s = L ? L.slides[TC.V.slide] : null;
  const proj = projHint || (s && (s.proj || (s.stu && s.stu.proj))) || 'runner';
  const md = document.createElement('div'); md.className = 'modal';
  md.innerHTML = `<div class="panel"><button class="x">×</button><h2>${esc(r.name)} <span class="tag">${esc(tn(r.team))}</span> ${TC.V.nameOnlyJoin ? '' : `<span class="tag">登录码 ${esc(r.code || '')}</span>`}</h2>
    <div class="grid2"><div><div class="btns" style="margin-bottom:8px"><select class="inp" id="pj">${Object.keys(KID_PROJ).map(p => `<option value="${p}" ${p === proj ? 'selected' : ''}>${KID_PROJ[p]}</option>`).join('')}</select><button class="btn" id="sg">作品投到大屏</button><button class="btn purple" id="sc">对话投到大屏</button></div>
      <div class="gameview"><iframe></iframe><div class="pview" id="pv" style="display:none"></div></div><p class="muted" id="vinfo"></p></div>
      <div><h3 style="margin:0 0 6px">他对精灵说过的话</h3><div class="chat" id="tk"><p class="muted">加载中…</p></div>
      <div class="btns" style="margin-top:10px">${r.hand ? '<button class="btn" id="hc">清除举手</button>' : ''}<button class="btn ghost sm" data-team="o">换到${esc(tn('o'))}</button><button class="btn ghost sm" data-team="b">换到${esc(tn('b'))}</button><button class="btn red sm" id="rm">移出名单</button></div></div></div></div>`;
  document.body.appendChild(md);
  const close = () => { const f = $('iframe', md); if (f._errOff) f._errOff(); md.remove(); };
  $('.x', md).onclick = close; md.onclick = e => { if (e.target === md) close(); };
  const loadW = async () => {
    const p = $('#pj', md).value, pv = $('#pv', md), fr = $('iframe', md);
    const card = p === 'persona' || p === 'mydog' || p === 'design' || p === 'npc' || p === 'gate';
    pv.style.display = card ? '' : 'none'; fr.style.display = card ? 'none' : ''; $('#sg', md).disabled = card;
    if (p === 'design') {
      const r = await TC.net.get('design', { sid }); const c = r && r.card;
      pv.innerHTML = c ? `<div class="list">${[['名字', c.name], ['角色', c.hero], ['规则', c.rule], ['得分', c.score], ['结束', c.end], ['还有', c.extra]].filter(x => x[1]).map(x => `<div class="li"><b style="width:60px">${x[0]}</b><span class="grow">${esc(x[1])}</span></div>`).join('')}</div>` : '<p class="muted">还没填设计卡</p>';
      $('#vinfo', md).textContent = ''; return;
    }
    if (p === 'npc' || p === 'gate') {
      const r = await TC.net.get('npc', { sid, slot: p }); const c = r && r.card;
      pv.innerHTML = c ? `<div class="list">${[['状态', r.published ? (p === 'gate' ? '已上岗' : '已开张') : '还没' + (p === 'gate' ? '上岗' : '开张')], ['名字', (c.look || '') + ' ' + (c.name || '')], ['身份', c.role], ['性格', c.trait], ['口令', c.secret], ['开场白', c.hello]].filter(x => x[1]).map(x => `<div class="li"><b style="width:60px">${x[0]}</b><span class="grow">${esc(x[1])}</span></div>`).join('')}${(c.knows || []).filter(Boolean).map(x => `<div class="li"><b style="width:60px">知道</b><span class="grow">${esc(x)}</span></div>`).join('')}${(c.rules || []).filter(Boolean).map(x => `<div class="li"><b style="width:60px">规矩</b><span class="grow">${esc(x)}</span></div>`).join('')}</div>` : '<p class="muted">还没写角色卡</p>';
      $('#vinfo', md).textContent = ''; return;
    }
    if (p === 'persona' || p === 'mydog') {
      const r = await TC.net.get('persona', { sid, slot: p === 'mydog' ? 'mydog' : undefined }); const c = r && r.card;
      pv.innerHTML = c && !r.fresh ? `<div class="list">${[['名字', c.name], ['它是', c.identity], ['性格', c.trait], ['还有', c.extra], ['说话', c.talk], ['口头禅', c.catch], ['声音', c.voice]].filter(x => x[1]).map(x => `<div class="li"><b style="width:60px">${x[0]}</b><span class="grow">${esc(x[1])}</span></div>`).join('')}${(c.rules || []).filter(x => x.when).map(x => `<div class="li"><b style="width:60px">口令</b><span class="grow">「${esc(x.when)}」→ ${esc([x.do, x.say ? '说「' + x.say + '」' : ''].filter(Boolean).join('，'))}</span></div>`).join('')}</div>` : '<p class="muted">还没填角色卡</p>';
      $('#vinfo', md).textContent = r && r.chat && r.chat.length ? `和虚拟${p === 'mydog' ? '狗' : '比特'}聊了 ${r.chat.length} 句` : ''; return;
    }
    const w = await TC.net.get('work', { sid, proj: p }); if (w && w.code) { runGame($('iframe', md), w.code); $('#vinfo', md).textContent = `第 ${w.cur + 1} 版，一共 ${w.n} 版`;
      if (p === 'rules' || p === 'family') {   // 第二季：说明书、需求卡
        const sp = await TC.net.get('spec', { sid, proj: p }), nd = p === 'family' ? await TC.net.get('needs', { sid }) : null, c = nd && nd.card;
        const rules = ((sp && sp.rules) || []).filter(Boolean);
        $('#vinfo', md).innerHTML = esc($('#vinfo', md).textContent) + (c ? `<br><b>需求卡：</b>做给${esc(c.who || '?')}${c.name ? '，「' + esc(c.name) + '」' : ''}；${(c.qa || []).filter(x => x.a).map(x => esc(x.q) + esc(x.a)).join('；')}` : '') + `<br><b>说明书：</b>${rules.length ? rules.map((x, i) => (i + 1) + '. ' + esc(x)).join('　') : '还没写'}`;
      } } else $('#vinfo', md).textContent = (w && w.err) || '还没有这个作品'; };
  $('#pj', md).onchange = loadW; loadW();
  const t = await TC.net.get('talk', { sid });
  $('#tk', md).innerHTML = Array.isArray(t) && t.length ? t.slice(-30).map(m => m.error ? `<div class="msg e">游戏报错：${esc(m.reply)}</div>` : `<div class="msg k">${esc(m.prompt)}</div><div class="msg g">${esc(m.reply || '')}${m.flagged ? ' <span class="tag r">被拦下</span>' : ''}</div>`).join('') : '<p class="muted">还没说过话</p>';
  $('#sg', md).onclick = () => { act({ type: 'spot', sid, proj: $('#pj', md).value, show: 'game' }); toast('已投到大屏'); };
  $('#sc', md).onclick = () => { act({ type: 'spot', sid, proj: $('#pj', md).value, show: 'chat' }); toast('已投到大屏'); };
  const hc = $('#hc', md); if (hc) hc.onclick = () => { act({ type: 'hand.clear', sid }); close(); };
  $$('[data-team]', md).forEach(b => b.onclick = () => { act({ type: 'teams.set', sid, team: b.dataset.team }); close(); });
  $('#rm', md).onclick = () => { if (confirm(`把 ${r.name} 移出名单？他的作品会留着。`)) { act({ type: 'roster.remove', sid }); close(); } };
}

const KID_PROJ = { family: '给家人的游戏', coins: '有虫的接金币', rules: '有说明书的喂饱比特', star: '接星星', boss: '大怪兽', breakout: '打砖块', maze: '比特闯关', monster: '守护狗窝', snake: '贪吃蛇', npc: '游戏角色卡', gate: '门卫角色卡', mygame: '我设计的游戏', move: '比特回家：操作', rule: '比特回家：规则', home: '在家做的游戏', catch: '喂饱比特', runner: '比特跑酷', whack: '抓虫子', buggy: '有虫的跑酷', match1: '看图改游戏', trick: '捣蛋卡', fix: '要修的游戏', design: '游戏设计卡', persona: '第 4 节角色卡', mydog: '自己的狗的角色卡' };
// ---------- 计时器弹窗 ----------
function timerPanel() {
  const md = document.createElement('div'); md.className = 'modal';
  md.innerHTML = `<div class="panel" style="width:560px"><button class="x">×</button><h2>计时器</h2><div class="btns">${[1, 2, 3, 5, 8, 10, 12, 15].map(m => `<button class="btn ghost" data-m="${m}">${m} 分钟</button>`).join('')}</div>
    <div class="btns" style="margin-top:12px"><button class="btn green" id="g">暂停/继续</button><button class="btn ghost" id="a">+1 分钟</button><button class="btn ghost" id="x">结束</button></div></div>`;
  document.body.appendChild(md);
  $('.x', md).onclick = () => md.remove(); md.onclick = e => { if (e.target === md) md.remove(); };
  $$('[data-m]', md).forEach(b => b.onclick = () => { act({ type: 'timer.start', sec: +b.dataset.m * 60 }); md.remove(); });
  $('#g', md).onclick = () => act({ type: 'timer.toggle' }); $('#a', md).onclick = () => act({ type: 'timer.add', sec: 60 }); $('#x', md).onclick = () => { act({ type: 'timer.stop' }); md.remove(); };
}

// ---------- 设置 ----------
const PROVIDERS = {
  siliconflow: { name: '硅基流动', base: 'https://api.siliconflow.cn/v1', model: '' },
  deepseek: { name: 'DeepSeek 官方', base: 'https://api.deepseek.com', model: '' },
  qwen: { name: '通义千问（阿里云百炼）', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: '' },
  doubao: { name: '豆包（火山方舟）', base: 'https://ark.cn-beijing.volces.com/api/v3', model: '' },
  custom: { name: '其他（OpenAI 兼容接口）', base: '', model: '' },
  none: { name: '尚未配置（AI 功能不可用）', base: '', model: '' },
  demo: { name: '演示模式（规则模拟，不调用 AI）', base: '', model: '' }
};
async function settings() {
  if (TC.hubMode) return toast('试玩版不用设置');
  const st = await TC.net.get('settings');
  const md = document.createElement('div'); md.className = 'modal';
  const roster = TC.V.roster || [];
  const prov = st.llm.provider || 'none';
  md.innerHTML = `<div class="panel"><button class="x">×</button><h2>设置</h2>
    <div class="grid2">
      <div class="box" style="box-shadow:none;background:var(--cream)"><h3>名单</h3><textarea class="inp" id="names" rows="8" style="width:100%" placeholder="一行一个名字，或用空格、逗号隔开">${esc(roster.map(r => r.name).join('\n'))}</textarea>
        <div class="btns" style="margin-top:6px"><button class="btn" id="svn">保存名单</button><label class="btns" style="gap:4px"><input type="checkbox" id="nc" ${TC.V.needCode ? 'checked' : ''} ${TC.V.publicMode ? 'disabled' : ''}>${TC.V.nameOnlyJoin ? '现场模式：只输名字即可加入' : '平板要输登录码（部署到网上时打开）'}</label></div>
        ${TC.V.nameOnlyJoin ? '' : `<p class="muted" style="margin:6px 0 0">登录码：${roster.map(r => esc(r.name) + ' ' + esc(r.code || '')).join('、') || '—'}</p>`}</div>
      <div class="box" style="box-shadow:none;background:var(--cream)"><h3>代码精灵用的大模型</h3>
        <label class="f">服务商<select class="inp" id="pv">${Object.keys(PROVIDERS).map(k => `<option value="${k}" ${k === prov ? 'selected' : ''}>${PROVIDERS[k].name}</option>`).join('')}</select></label>
        <label class="f">接口地址<input class="inp" id="base" value="${esc(st.llm.base || '')}"></label>
        <label class="f">密钥 ${st.keySet ? `<span class="tag g">${esc(st.llm.key)}</span>` : ''}<input class="inp" id="key" type="password" autocomplete="new-password" placeholder="${st.keySet ? '不改就留空' : '在服务商后台创建 API Key'}"></label>
        <label class="f">模型名<input class="inp" id="model" value="${esc(st.llm.model || '')}" list="mlist"><datalist id="mlist"></datalist></label>
        <div class="btns" style="margin-top:8px"><button class="btn" id="svl">保存</button><button class="btn ghost" id="lm">列出可用模型</button><button class="btn green" id="lt">试一下</button></div><p id="lmsg" class="muted" style="margin:6px 0 0"></p></div>
      <div class="box" style="box-shadow:none;background:var(--cream)"><h3>网址</h3><p style="margin:0">学生平板：<b>${esc(st.join.url)}</b><br>大屏：<b>${esc(st.screenUrl || (st.join.url + 'screen'))}</b><br>老师端：<b>${esc(st.join.url)}teacher?k=…</b></p>
        <label class="f" style="margin-top:8px">部署到网上时填域名（例如 https://ai.xxx.com）<input class="inp" id="pub" value="${esc(st.publicUrl || '')}"></label><div class="btns" style="margin-top:6px"><button class="btn ghost" id="svp">保存</button></div></div>
      <div class="box" style="box-shadow:none;background:var(--cream);${REAL_DOG ? '' : 'display:none'}"><h3>机器狗</h3><p class="muted" style="margin:0 0 6px">每行一台：狗的名字（或孩子的名字）= 狗的接收地址。没填的狗只在大屏和平板上显示，不会发到真狗。</p><textarea class="inp" id="dogs" rows="5" style="width:100%" placeholder="旺财 = http://192.168.1.50/dance&#10;小明 = http://192.168.1.51/dance">${esc(Object.keys(st.dogs || {}).map(k => k + ' = ' + (st.dogs[k].url || '')).join('\n'))}</textarea><div class="btns" style="margin-top:6px"><button class="btn ghost" id="svd">保存</button></div></div>
    </div>
    <div class="box" style="box-shadow:none;background:#FFE9E9;margin-top:10px"><h3>新开一个班 / 清空</h3><div class="btns"><button class="btn red sm" id="rs1">清空能量和课堂数据（保留名单）</button><button class="btn red sm" id="rs2">全部清空</button></div></div></div>`;
  document.body.appendChild(md);
  $('.x', md).onclick = () => md.remove();
  const msg = t => $('#lmsg', md).textContent = t;
  $('#pv', md).onchange = e => { const p = PROVIDERS[e.target.value]; if (p.base) $('#base', md).value = p.base; $('#model', md).value = p.model || ''; };
  $('#svn', md).onclick = async () => { const names = $('#names', md).value.split(/[\s,，、]+/).map(s => s.trim()).filter(Boolean); await act({ type: 'roster.set', names }); toast(`已保存 ${names.length} 个名字`); md.remove(); };
  $('#nc', md).onchange = e => act({ type: 'roster.needCode', on: e.target.checked });
  const saveL = () => TC.net.post('settings', { llm: { provider: $('#pv', md).value, base: $('#base', md).value, key: $('#key', md).value, model: $('#model', md).value } });
  $('#svl', md).onclick = async () => { await saveL(); msg('保存了'); };
  $('#lm', md).onclick = async () => { msg('查询中…'); const r = await TC.net.post('llm-models', { base: $('#base', md).value, key: $('#key', md).value || undefined }); if (!r.ok) return msg(r.msg); $('#mlist', md).innerHTML = r.models.map(m => `<option value="${esc(m)}">`).join(''); msg(`找到 ${r.models.length} 个模型，点「模型名」可以选`); };
  $('#lt', md).onclick = async () => { await saveL(); msg('正在问大模型…'); const r = await TC.net.post('llm-test', {}); msg(r.ok ? `连上了（${Math.round(r.ms / 100) / 10} 秒）：${r.msg}` : '没连上：' + r.msg); };
  $('#svp', md).onclick = async () => { await TC.net.post('settings', { publicUrl: $('#pub', md).value }); toast('保存了'); };
  $('#svd', md).onclick = async () => { const dogs = {}; $('#dogs', md).value.split('\n').forEach(l => { const m = l.split('='); if (m.length >= 2 && m[0].trim()) dogs[m[0].trim()] = { url: m.slice(1).join('=').trim() }; }); await TC.net.post('settings', { dogs }); toast('保存了'); };
  $('#rs1', md).onclick = () => { if (confirm('清空能量和这一轮课堂数据？名单和作品保留。')) { act({ type: 'class.reset', keepRoster: true }); md.remove(); } };
  $('#rs2', md).onclick = () => { if (confirm('全部清空（包括名单）？作品文件还在服务器的 data 文件夹里。')) { act({ type: 'class.reset', keepRoster: false }); md.remove(); } };
}

// ---------- 启动 ----------
// 区域只在自身数据变化时刷新；时钟由独立定时器更新。
const rendered = {};
function editingIn(el) {
  const n = document.activeElement;
  return !!(el && n && el.contains(n) && (/^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable));
}
function refreshRegion(name, selector, value, render, force) {
  const key = JSON.stringify(value);
  if (!force && (rendered[name] === key || editingIn($(selector)))) return;
  render(); rendered[name] = key;
}
function onView(v) {
  if (!v || v.err) return;
  Clock.sync(v.serverNow);
  const prev = TC.V; TC.V = v;
  const slideChanged = !prev || prev.lesson !== v.lesson || prev.slide !== v.slide;
  const roster = v.roster || [];
  refreshRegion('head', '#hd', [v.lesson, v.teamNames, (v.pts || {})[v.lesson], v.quiet, v.sleep, v.turn, v.llm, TC.status, roster.map(r => !!r.online)], renderHead, slideChanged);
  if (slideChanged) renderStrip();
  refreshRegion('notes', '#cL', [v.lesson, v.slide, v.cues, v.lesson ? null : v.join], renderNotes, slideChanged);
  renderControls(slideChanged);
  refreshRegion('kids', '#cR', [v.lesson, v.slide, roster.map(r => [r.sid, r.name, r.team, r.online, r.hand]), v.busy, v.taskBy], renderKids, slideChanged);
}
// 编辑期间暂缓的更新，在焦点离开后补上，避免输入被课堂推送吞掉。
document.addEventListener('focusout', () => setTimeout(() => { if (TC.V) onView(TC.V); }, 0));

document.addEventListener('keydown', e => {
  if (!TC.V || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || $('.modal')) return;
  const L = lessonById(TC.V.lesson); if (!L) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); if (TC.V.slide < L.slides.length - 1) act({ type: 'go', slide: TC.V.slide + 1 }); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); if (TC.V.slide > 0) act({ type: 'go', slide: TC.V.slide - 1 }); }
});
function startTeacher(opts) {
  opts = opts || {};
  TC.hubMode = !!opts.hub;
  TC.key = opts.key || window.__LOCAL_TEACHER_KEY || new URLSearchParams(location.search).get('k');
  if (!TC.hubMode && !TC.key) {
    document.body.innerHTML = `<div style="max-width:420px;margin:15vh auto;font-family:inherit;text-align:center"><h2>老师端</h2><p>输入启动服务时显示的老师口令</p><input id="k" style="height:44px;font-size:20px;text-align:center;border:2px solid #F0E2CC;border-radius:12px;width:200px"> <button id="go" style="height:44px;padding:0 20px;border-radius:12px;background:#FF8A3D;color:#fff;font-weight:900;font-size:18px">进入</button></div>`;
    document.getElementById('go').onclick = () => { location.search = '?k=' + encodeURIComponent(document.getElementById('k').value.trim()); };
    return;
  }
  TC.net = makeNet({ role: 'teacher', key: TC.key, hub: opts.hub });
  TC.net.connect(onView, st => { if (TC.status !== st) { TC.status = st; if (TC.V) onView(TC.V); } });
}

if (!window.__NO_AUTOSTART) startTeacher();
