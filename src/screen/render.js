// ================= 大屏：每种页面怎么画 =================
// 每个页面函数 R[type](s, L, el, X) 画出页面，返回 { cue(c, replay), upd(V), off() }：
//   cue：老师端发来的动作（翻卡、揭晓……）；replay=true 表示刷新页面后重放，不要放声音和动画
//   upd：课堂数据变了（有人答题、写点子……）
// X.ctl(a) 只有能控制的大屏（单机模式、带口令的大屏）才会真的发出去。
const ENGINES = { catch: CatchGame, runner: RunnerGame, whack: WhackGame, home: HomeGame };
const svgSizeX = svgSize;
const teamTag = (t, extra = '') => `<span class="tteam ${t}">${esc(tn(t))}${extra}</span>`;
const tagGreen = t => `<span class="tag" style="background:${C.green}22;color:${CD.green};font-size:28px">${esc(t)}</span>`;
// 精灵演示的按钮：多行的话（表格、格子图）只露第一行，下面画成小表 / 小图
function spellHTML(p) {
  const lines = String(p).split('\n'); if (lines.length < 2) return `<span>${esc(p)}</span>`;
  const rest = lines.slice(1), isMap = rest.every(l => /^[#.SE*^ ]+$/.test(l.trim()));
  return `<span class="spl"><span>${esc(lines[0])}</span>${isMap ? mapMiniHTML(rest.map(l => l.trim())) : `<pre class="dpre">${esc(rest.join('\n'))}</pre>`}</span>`;
}
const blanks = t => esc(t).replace(/___/g, '<span class="blank"></span>');
function tn(t) { return (SC.V && SC.V.teamNames && SC.V.teamNames[t]) || (t === 'o' ? '橙队' : '蓝队'); }
const roster = () => (SC.V && SC.V.roster) || [];
const sdata = () => (SC.V && SC.V.sd) || {};
const ctlBtn = (id, label, cls = '') => SC.canCtl ? `<button class="btn sm ${cls}" id="${id}">${label}</button>` : '';
function bumpEl(n) { if (!n) return; n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }

async function genieCast(box, text, keep) {
  const g = document.createElement('div'); g.className = 'genie';
  g.innerHTML = `${svgSize(IC.genie, 90)}<span>收到！「${esc(String(text).slice(0, 40))}」<br><small style="font-size:24px;color:#5B6683">正在改代码……</small></span>`;
  box.appendChild(g); Snd.magic();
  for (let i = 0; i < 18; i++) {
    const sp = document.createElement('div'); sp.className = 'sparkle'; sp.style.left = '50%'; sp.style.top = '50%';
    sp.style.setProperty('--dx', (Math.random() * 600 - 300) + 'px'); sp.style.setProperty('--dy', (Math.random() * 340 - 170) + 'px');
    sp.style.background = pick([C.yellow, C.pink, C.blue, C.green]); box.appendChild(sp); setTimeout(() => sp.remove(), 1000);
  }
  if (keep) return g;
  await sleep(1300); g.remove();
}
function confetti(n = 70) {
  const app = $('#app');
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div'); c.className = 'confetti';
    c.style.left = Math.random() * 1600 + 'px'; c.style.background = pick([C.orange, C.blue, C.green, C.purple, C.yellow, C.pink]);
    c.style.animationDuration = (1.8 + Math.random() * 1.8) + 's'; c.style.animationDelay = Math.random() * 0.5 + 's';
    app.appendChild(c); setTimeout(() => c.remove(), 4200);
  }
}
async function playSeq(bit, seq, mood, onStep, token) {
  const m = MOODS[mood] || MOODS['开心'];
  bit.className = 'bit ' + m.cls; bit.style.setProperty('--d', m.d + 'ms');
  for (let i = 0; i < seq.length; i++) {
    if (token.stop) break;
    onStep && onStep(i);
    bit.removeAttribute('data-act'); void bit.offsetWidth; bit.setAttribute('data-act', seq[i]);
    if (seq[i] === '叫一声') Snd.bark(); else if (seq[i] !== '等一下') Snd.pop();
    await sleep(m.d + 140);
  }
  bit.removeAttribute('data-act'); bit.className = 'bit idle ' + m.cls; if (!token.stop && onStep) onStep(-1);
}
function timerPanel() { return `<div class="timerpanel"><div class="lbl">任务时间</div><div class="big" data-timer>--:--</div><div class="tpinfo sm" style="color:#B9C3E0">老师端开始计时</div></div>`; }
function progressRow(label, t, n, total) {
  const pct = total ? Math.round(n / total * 100) : 0;
  return `<div class="prow"><span class="pl">${label}</span><div class="pbar ${t}"><i style="width:${pct}%"></i></div><b>${n}/${total}</b></div>`;
}
function bubbleHTML(it, i) {
  return `<div class="bub ${it.team || ''}" data-id="${it.id}" style="animation-delay:${Math.min(i, 12) * 0.04}s"><span class="who">${esc(it.name)}</span>${esc(it.text)}</div>`;
}

// 上台的狗：大屏上一只虚拟狗 + 问答气泡（第 4 节猜性格、第 11 节口令接力）
function stageTalk(el, getCard) {
  let token = { stop: true };
  const bit = $('#ds .bit', el), chat = $('#chat', el), say = $('#dsay', el);
  const line = (cls, html) => { if (!chat) return; chat.insertAdjacentHTML('beforeend', `<div class="msg ${cls}">${html}</div>`); chat.scrollTop = 1e6; };
  return {
    clear() { if (chat) chat.innerHTML = ''; if (say) say.textContent = ''; $$('.crow', el).forEach(r => r.classList.remove('hit')); },
    async cue(k, replay) {
      if (k.n === 'dogThink') { line('kid', esc((k.a.by ? k.a.by + '：' : '') + k.a.q)); $$('.crow', el).forEach(r => r.classList.remove('hit')); if (!replay && say) say.textContent = '……'; }
      if (k.n === 'dogSay') {
        const a = k.a, c = getCard() || {};
        line('gn', `${svgSize(IC.paw, 34)}<span>${esc(a.a)}${a.acts && a.acts.length ? `<small style="display:block;color:#5B6683;font-size:20px">动作：${a.acts.map(esc).join('、')}</small>` : ''}</span>`);
        const hitI = (c.rules || []).findIndex(r => r.when && a.q.includes(r.when)); const row = $(`.crow[data-r="${hitI}"]`, el); if (row) row.classList.add('hit');
        if (replay) return;
        if (say) say.textContent = a.a;
        if (!SC.mini) speakScreen(a.a, c.voice);
        token.stop = true; await sleep(30); token = { stop: false };
        if (!bit) return;
        if (a.acts && a.acts.length) playSeq(bit, a.acts, '开心', null, token); else { bit.classList.add('say'); setTimeout(() => bit.classList.remove('say'), 1500); }
      }
    },
    off() { token.stop = true; try { speechSynthesis.cancel(); } catch (e) { } }
  };
}
function stageInput(el, path) {
  const sin = $('#sin', el), sgo = $('#sgo', el); if (!sgo) return;
  sgo.onclick = () => { const t = sin.value.trim(); if (t) SC.net.post(path, { text: t }).then(r => { if (r && r.err) toast(r.err); }); sin.value = ''; };
  sin.onkeydown = e => { if (e.key === 'Enter') sgo.onclick(); };
}

const R = {
  cover(s, L, el) {
    const title = s.title || L.title, tag = s.tag || '';
    const un = tag.match(/^(.*?今天解锁)：(.+)$/);   // "今天解锁：xxx" 拆成小字 + 大字
    const medal = `<span class="cv-medal">${svgSize(IC.star, 40)}</span>`;
    el.innerHTML = `<div class="cover" style="--c:${L.color}">
      <div class="cv-text"><div class="cv-no">${esc(s.kicker || L.no)}</div>
        <h1 class="t1 cv-t${title.replace(/\n/g, '').length > 7 ? ' long' : ''}">${esc(title)}</h1>
        ${s.sub ? `<p class="lead cv-sub">${esc(s.sub)}</p>` : ''}
        ${!tag ? '' : un ? `<div class="cv-tag">${medal}<span><small>${esc(un[1])}</small><b>${esc(un[2])}</b></span></div>` : `<div class="cv-tag plain">${medal}<b>${esc(tag)}</b></div>`}</div>
      <div class="cv-art"><div class="cv-glow"></div>
        <div class="cv-orbit"><i class="o1"><b>{ }</b></i><i class="o2">${IC.star}</i><i class="o3">${KC_HEART}</i></div>
        ${kcStars([[6, 20, 34, '#FFC83D', 0], [88, 10, 26, '#FF9CC4', -.8], [94, 50, 22, '#8FB8FF', -1.4], [2, 62, 20, '#FFC83D', -.4]])}
        ${kcIsland(420, 'idle')}</div></div>`;
  },

  join(s, L, el) {
    const j = (SC.V && SC.V.join) || {};
    const qu = SC.standalone ? null : SC.net.qrUrl(j.url);
    const qr = !qu ? `<div class="center" style="width:380px;height:380px;gap:16px">${svgSize(IC.tablet, 200)}<div class="lead" style="font-size:30px">${SC.standalone ? '单机模式：没有连接平板' : '试玩版：平板已经连好'}</div></div>`
      : `<img src="${qu}" style="width:380px;height:380px;display:block"><div style="font-size:38px;font-weight:900;letter-spacing:1px">${esc(j.short || '')}</div>`;
    el.innerHTML = `<div class="row grow" style="gap:56px;align-items:center">
      <div class="card center" style="width:470px;flex:none;gap:10px;padding:30px">${qr}</div>
      <div class="grow" style="min-width:0"><h2 class="t1">${esc(s.title)}</h2><p class="lead">${esc(SC.V.nameOnlyJoin ? '扫码或输入网址，输入自己的名字即可加入' : SC.V.publicMode ? '扫码或输入网址，输入昵称和老师发的个人登录码' : s.sub)}</p>
        <div class="sm" id="jc" style="margin:26px 0 12px;font-size:30px;font-weight:800"></div><div class="joined" id="jn"></div></div></div>`;
    const upd = () => {
      const r = roster(), on = r.filter(x => x.online).length;
      $('#jc', el).textContent = r.length ? `已进教室 ${on} / ${r.length} 人` : (SC.V.nameOnlyJoin ? '等待孩子扫码输入名字加入' : SC.V.publicMode ? '等待老师录入昵称名单并发放个人登录码' : '名单还是空的：孩子在平板上输入名字就能进来');
      $('#jn', el).innerHTML = r.map(x => `<span class="jchip ${x.online ? 'on' : ''} ${x.team || ''}">${esc(x.name)}</span>`).join('');
    };
    upd(); return { upd };
  },

  signal(s, L, el, X) {
    el.innerHTML = `<h2 class="t2">集合暗号</h2>
      <div class="row grow" style="align-items:center;gap:40px">
        <div class="card grow center" style="height:430px;gap:20px"><div class="sm" style="font-size:36px">老师喊</div><div style="font-size:124px;font-weight:900">驯狗师！</div></div>
        <div class="card grow center" id="resp" style="height:430px;gap:16px;opacity:.25;transition:opacity .3s"><div class="sm" style="font-size:36px">大家回</div><div style="font-size:112px;font-weight:900;color:${C.orange}">准备就绪！</div><div style="font-size:38px;font-weight:800">双手离开平板 · 眼睛看大屏</div></div>
      </div>
      <div style="display:flex;justify-content:center;margin-top:26px">${ctlBtn('go', IC.play + ' 喊一次')}</div>`;
    let t;
    const go = $('#go', el); if (go) go.onclick = () => X.ctl({ type: 'cue', n: 'call' });
    return {
      cue(c, replay) { if (c.n !== 'call' || replay) return; const r = $('#resp', el); r.style.opacity = .25; clearTimeout(t); t = setTimeout(() => { r.style.opacity = 1; Snd.ding(); }, 700); },
      off() { clearTimeout(t); }
    };
  },

  teams(s, L, el, X) {
    const col = t => `<div class="teamcol ${t}">
        <div class="th">${SC.canCtl ? `<input class="tni" data-t="${t}" value="${esc(tn(t))}" maxlength="6">` : `<span class="tni" data-t="${t}">${esc(tn(t))}</span>`}<span class="cnt" id="c${t}"></span></div>
        <div class="members" id="m${t}"></div></div>`;
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:18px">
        <div><h2 class="t2" style="margin:0">分队</h2><p class="lead" style="margin:6px 0 0;font-size:32px">${esc(s.sub)}</p></div>
        <div style="display:flex;gap:14px">${ctlBtn('split', IC.dice + ' 随机分队')}</div></div>
      <div class="row grow" style="gap:28px;min-height:0">
        <div class="row grow" style="gap:22px;min-width:0">${col('o')}${col('b')}</div>
        <div class="card" style="width:500px;flex:none;padding:26px 30px;display:flex;flex-direction:column;gap:14px">
          <div style="font-size:32px;font-weight:900">怎么得能量</div>
          ${s.rules.map(r => `<div class="rule"><span class="pts">${svgSize(IC.bolt, 26)}+${r.n}</span><span>${esc(r.t)}</span></div>`).join('')}
          <div class="win">${svgSize(IC.crown, 54, 40)}<span>${esc(s.win)}</span></div>
        </div></div>`;
    let rolling = false;
    const draw = (map, roll) => {
      ['o', 'b'].forEach(t => {
        const list = map ? map[t] : roster().filter(r => r.team === t).map(r => r.name);
        $('#m' + t, el).innerHTML = list.length ? list.map(n => `<div class="mem ${roll ? 'roll' : ''}">${esc(n)}</div>`).join('') : '<div class="sm" style="padding:10px 4px">还没分</div>';
        $('#c' + t, el).textContent = list.length ? list.length + ' 人' : '';
      });
      if (!roll) $$('.th .tni', el).forEach(i => { if (document.activeElement !== i) { if (i.tagName === 'INPUT') i.value = tn(i.dataset.t); else i.textContent = tn(i.dataset.t); } });
    };
    draw();
    const sp = $('#split', el); if (sp) sp.onclick = () => X.ctl({ type: 'teams.draw' });
    $$('input.tni', el).forEach(i => i.onchange = () => X.ctl({ type: 'teams.name', t: i.dataset.t, name: i.value }));
    return {
      async cue(c, replay) {
        if (c.n !== 'teamsDrawn' || replay) return;
        rolling = true; const names = roster().map(r => r.name);
        for (let k = 0; k < 8; k++) { const sh = names.slice().sort(() => Math.random() - .5); draw({ o: sh.filter((_, i) => i % 2 === 0), b: sh.filter((_, i) => i % 2 === 1) }, true); Snd.tick(); await sleep(90 + k * 25); }
        rolling = false; draw(); Snd.tada();
      },
      upd() { if (!rolling) draw(); }
    };
  },

  rules(s, L, el) {
    const cols = [C.orange, C.blue, C.green];
    el.innerHTML = `<h2 class="t2">${esc(s.title || '学院守则')}</h2><div class="row grow" style="gap:30px;min-height:0">${s.items.map((it, i) => `
      <div class="card grow center" style="gap:16px;padding:30px">
        <div style="width:220px;height:220px;display:flex;align-items:center;justify-content:center">${it.ic === 'sit' ? bitEl(220, 'sitting') : it.ic === 'lie' ? bitEl(220, 'sleepy sitting') : svgSize(IC[it.ic], 200)}</div>
        <div style="font-size:28px;font-weight:900;color:#fff;background:${cols[i % 3]};border-radius:999px;padding:4px 22px">第 ${i + 1} 条</div>
        <div style="font-size:${s.items.length > 3 ? 40 : 46}px;font-weight:900">${esc(it.t)}</div><div class="lead" style="font-size:${s.items.length > 3 ? 26 : 30}px;margin:0">${esc(it.s)}</div></div>`).join('')}</div>`;
  },

  flow(s, L, el, X) {
    const arrow = i => `<svg class="arrow hid" data-k="${i}" viewBox="0 0 64 64"><path d="M8 32h40M36 18l14 14-14 14" stroke="#E1CBA8" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    const n = s.steps.length;
    el.innerHTML = `<div class="row" style="align-items:center;justify-content:space-between"><h2 class="t2" style="margin:0">${esc(s.title)}${s.term ? `<span class="term">${esc(s.term)}</span>` : ''}</h2>${SC.canCtl ? '<button class="btn sm ghost" id="stepnx">下一步 ›</button>' : ''}</div>
      <div class="flow" style="margin-top:30px">${s.steps.map((st, i) => `${i ? arrow(i) : ''}<div class="step hid peek" data-k="${i}"><div class="ic">${IC[st.ic] || ''}</div><b>${esc(st.b)}</b><span>${esc(st.s)}</span></div>`).join('')}</div>
      ${s.note ? `<div class="flownote hid" style="text-align:center;margin-top:36px"><span class="tag" style="font-size:32px;padding:12px 30px">${s.note}</span></div>` : ''}`;
    let shown = 0;
    const show = (k, replay) => {
      $$(`[data-k="${k}"]`, el).forEach(x => x.classList.remove('hid', 'peek'));
      if (k === n - 1) { const nt = $('.flownote', el); if (nt) nt.classList.remove('hid'); }
      if (!replay) Snd.pop();
    };
    const nx = $('#stepnx', el); if (nx) nx.onclick = () => X.ctl({ type: 'cue', n: 'step', a: Math.min(n, shown + 1) });
    return { cue(c, replay) { if (c.n === 'step') { for (let k = 0; k < c.a; k++) if (k >= shown) show(k, replay || k < c.a - 1); shown = Math.max(shown, c.a); if (nx) nx.disabled = shown >= n; } if (c.n === 'reset') { shown = 0; $$('.step,.arrow', el).forEach(x => x.classList.add('hid')); $$('.step', el).forEach(x => x.classList.add('peek')); const nt = $('.flownote', el); if (nt) nt.classList.add('hid'); if (nx) nx.disabled = false; } } };
  },

  play(s, L, el) {
    const side = s.wall
      ? `<div class="col grow" style="min-width:0;gap:12px"><div style="font-size:32px;font-weight:900">大家发现的线索 <span class="sm" id="wc"></span></div><div class="bubbles" id="bb" style="flex:1"></div></div>`
      : `<div class="card center grow" style="gap:20px">${svgSize(IC.tablet, 190)}<div style="font-size:46px;font-weight:900">在平板上玩一玩</div><div class="lead" style="font-size:30px;margin:0">${esc(s.sub || '')}</div><div class="bigtime" data-timer style="font-size:120px;margin:0">--:--</div></div>`;
    el.innerHTML = `<div class="row" style="align-items:center;justify-content:space-between;margin-bottom:14px"><h2 class="t2" style="margin:0">${esc(s.title)}</h2><span class="tag">${s.wall ? esc(s.sub) : '平板上开玩'}</span></div>
      <div class="row grow" style="gap:28px;min-height:0;align-items:flex-start">
        <div style="width:${s.wall ? 820 : 860}px;flex:none"><div class="gamebox"><canvas></canvas><div class="gamehint">自动演示</div></div></div>${side}</div>`;
    let G = null;
    if (ENGINES[s.engine]) G = ENGINES[s.engine]($('canvas', el), Object.assign({ auto: true }, s.preset || {}));
    else { const gb = $('.gamebox', el); gb.style.aspectRatio = '16/9'; gb.innerHTML = '<iframe class="gframe"></iframe><div class="gamehint">大屏试玩</div>'; const code = typeof STARTERS !== 'undefined' && GAMES[s.game] ? STARTERS[GAMES[s.game].file] : ''; if (code) runGame($('iframe', gb), code); }
    const upd = () => { if (!s.wall) return; const w = (sdata().wall || []); $('#wc', el).textContent = w.length ? `${w.length} 条` : ''; drawBubbles($('#bb', el), w, '玩的时候发现奇怪的地方，就写在平板上'); };
    upd(); return { upd, off() { if (G) G.destroy(); const f = $('iframe', el); if (f && f._errOff) f._errOff(); } };
  },

  ideas(s, L, el, X) {
    const tagc = { 道具: C.green, 变量: C.purple, 背景: C.blue, 角色: C.orange, 规则: C.blue, 得分: C.green, 结束: C.purple, 事件: C.orange, 循环: C.pink, 输入: C.blue, 输出: C.orange };
    const cover = s.reveal !== false;
    el.innerHTML = `<div class="row" style="align-items:center;justify-content:space-between;margin-bottom:16px"><div><h2 class="t2" style="margin:0">${esc(s.title)}</h2><p class="lead" id="ilead" style="margin:4px 0 0;font-size:32px">${esc(s.lead || '')}</p></div></div>
      <div class="ideas ${s.compact ? 'compact' : ''}">${s.cards.map((c, i) => `<div class="idea ${cover ? 'covered' : ''}" data-i="${i}" data-n="${i + 1}" style="animation-delay:${i * .08}s">
        <div class="em"><span class="emoji">${c.from}</span>${c.plus ? `<span class="pl">+</span><span class="emoji">${c.plus}</span>` : ''}${c.to ? `<svg viewBox="0 0 64 64" class="ar"><path d="M8 32h40M36 18l14 14-14 14" stroke="#C9B79A" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="emoji">${c.to}</span>` : ''}</div>
        <b>${esc(c.b)}</b><span>${esc(c.s)}</span>${c.tag ? `<div class="ctag" style="background:${tagc[c.tag] || C.orange}">${esc(c.tag)}</div>` : ''}</div>`).join('')}
        ${s.noAsk ? '' : `<div class="idea ask" style="animation-delay:${s.cards.length * .08}s"><div class="em"><span style="font-size:96px;font-weight:900;color:${C.orange}">?</span></div><b>${esc(s.ask || '你还想到什么？')}</b><span>${esc(s.askSub || '说得出来，就能变出来')}</span></div>`}
      </div>`;
    if (SC.canCtl) $$('.idea.covered', el).forEach(c => c.onclick = () => { if (c.classList.contains('covered')) X.ctl({ type: 'cue', n: 'reveal', a: +c.dataset.i }); });
    const showDone = replay => { const ld = $('#ilead', el); if (s.done && ld && !$('.idea.covered', el)) { ld.innerHTML = `<span class="tag" style="font-size:32px;padding:6px 24px;${replay ? '' : 'animation:popIn .45s both'}">${esc(s.done)}</span>`; if (!replay) Snd.tada(); } };
    return {
      cue(c, replay) {
        if (c.n === 'reveal') {
          const card = $(`.idea[data-i="${c.a}"]`, el); if (!card || !card.classList.contains('covered')) return;
          card.classList.remove('covered'); if (!replay) { card.style.animation = 'none'; void card.offsetWidth; card.style.animation = 'popIn .45s both'; Snd.pop(); }
          showDone(replay);
        }
        if (c.n === 'reset') { $$('.idea[data-i]', el).forEach(x => x.classList.add('covered')); $('#ilead', el).textContent = s.lead || ''; }
      }
    };
  },

  wall(s, L, el) {
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:16px"><div><h2 class="t2" style="margin:0">${esc(s.title)}</h2><p class="lead" style="margin:4px 0 0;font-size:32px">${esc(s.sub || '')}</p></div><div class="tag" id="wc" style="font-size:30px"></div></div>
      <div class="bubbles big" id="bb"></div>`;
    const upd = () => { const w = sdata().wall || []; $('#wc', el).textContent = `${w.length} 个点子`; drawBubbles($('#bb', el), w, SC.standalone ? '单机模式：请孩子把点子说出来' : '在平板上写下你的点子，会出现在这里'); };
    upd(); return { upd };
  },

  compare(s, L, el, X) {
    const side = (o, k, bad) => `<div class="cmp ${s.even ? 'even' : bad ? 'bad' : 'good'}"><span class="tag" style="font-size:26px">${esc(o.tag)}</span>
      <div class="say step" data-k="${k}">${svgSize(IC.mouth, 64)}<span>${esc(o.say)}</span></div>
      <div class="got step" data-k="${k + 1}">${svgSize(IC.genie, 64)}<span>${esc(o.got)}</span></div></div>`;
    el.innerHTML = `<h2 class="t2">${esc(s.title)}${s.term ? `<span class="term">${esc(s.term)}</span>` : ''}</h2>
      <div class="row grow" style="gap:30px;min-height:0">${side(s.left, 0, true)}${side(s.right, 2, false)}</div>
      <div class="cmp-done step" data-k="4"><span class="tag" style="font-size:34px;padding:12px 30px">${esc(s.done)}</span></div>
      ${SC.canCtl ? '<div style="display:flex;justify-content:flex-end;margin-top:8px"><button class="btn sm ghost" id="stepnx">下一步 ›</button></div>' : ''}`;
    let n = 0;
    const show = (k, replay) => { const st = $(`.step[data-k="${k}"]`, el); if (st && !st.classList.contains('on')) { st.classList.add('on'); if (!replay) { k % 2 ? Snd.magic() : Snd.pop(); } } };
    const nx = $('#stepnx', el); if (nx) nx.onclick = () => X.ctl({ type: 'cue', n: 'step', a: n + 1 });
    return { cue(c, replay) { if (c.n === 'step') { for (let k = 0; k < c.a; k++) show(k, replay || k < n); n = Math.max(n, c.a); } if (c.n === 'reset') { n = 0; $$('.step', el).forEach(x => x.classList.remove('on')); } } };
  },

  demo(s, L, el, X) {
    const key = s.slot || s.game;   // 同一个游戏演示两遍时（第 19 节）各用一份
    el.innerHTML = `<div class="row" style="align-items:center;justify-content:space-between;margin-bottom:14px"><h2 class="t2" style="margin:0">${esc(s.title)}</h2><span class="tag">${s.plan ? '先说计划 · ' : ''}精灵演示 · ${esc(GAMES[s.game].name)}</span></div>
      <div class="row grow" style="gap:26px;min-height:0">
        <div style="width:880px;flex:none">
          <div class="gamebox" id="gb" style="aspect-ratio:16/9"><iframe class="gframe"></iframe></div>
          <div id="derr"></div>
          <div class="codeline"><span class="lbl">精灵改的代码</span><code id="code">（还没改）</code></div>
        </div>
        <div class="col grow" style="min-height:0;gap:14px">
          ${s.spec ? `<div class="dspec"><b>📘 游戏说明书 <span class="sm">精灵每次先读</span></b><ol>${s.spec.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
          <div class="chat" id="chat"><div class="sm">${SC.canCtl ? '点下面的话，或者把孩子的点子打进去' : s.plan ? '老师说一句，精灵先说它打算怎么改' : '老师说一句，精灵就来改'}</div></div>
          ${SC.canCtl ? `<div class="spellbar">${(s.spells || []).map((p, i) => `<button class="spell" data-i="${i}">${IC.wand.replace('<svg', '<svg class="wand"')}${spellHTML(p)}</button>`).join('')}</div>
          <div class="row" style="gap:10px"><input class="say-in" id="sin" placeholder="把孩子的点子打在这里"><button class="btn sm" id="sgo">说</button><button class="btn sm ghost" id="srs">${IC.redo}</button></div>` : ''}
        </div></div>`;
    const frame = $('.gframe', el), gb = $('#gb', el);
    let lastId = null, ghost = null, lastErr = null;
    const body = o => Object.assign({ game: s.game, slot: s.slot || undefined, spec: s.spec || undefined, plan: !!s.plan || undefined, mock: !!s.mock || undefined }, o);
    const load = async () => {
      const r = await SC.net.get('work', { sid: '__teacher', proj: 'demo-' + key });
      if (!r || !r.code) return;
      $('#derr', el).innerHTML = ''; lastErr = null;
      runGame(frame, r.code, (msg, line) => {   // 演示的游戏报错了：大屏上红条显示，告诉老师端
        if (lastErr) return; lastErr = msg;
        const lt = line ? String(r.code.split('\n')[line - 1] || '').trim() : '';
        const full = String(msg) + (line ? `（第 ${line} 行${lt ? '：' + lt.slice(0, 90) : ''}）` : '');
        $('#derr', el).innerHTML = `<div class="derr"><span class="grow">游戏出错了：${esc(String(msg).slice(0, 80))}${line ? ` · 第 ${line} 行` : ''}</span>${SC.canCtl ? '<button class="btn sm" id="dfix">把报错交给精灵</button>' : ''}</div>`;
        const fx = $('#dfix', el); if (fx) fx.onclick = () => SC.net.post('demo', body({ prompt: '', error: full, plan: undefined }));
        if (!SC.canCtl || SC.net.local) SC.net.post('demo-error', { key, msg: full, line });
      });
    };
    const say = p => { if (!p) return; SC.net.post('demo', body({ prompt: p })).then(r => { if (r && r.err) Snd.pop(); }); };
    $$('.spell', el).forEach(b => b.onclick = () => { say(s.spells[+b.dataset.i]); b.classList.add('done'); });
    const sgo = $('#sgo', el); if (sgo) { sgo.onclick = () => { say($('#sin', el).value.trim()); $('#sin', el).value = ''; }; $('#sin', el).onkeydown = e => { if (e.key === 'Enter') sgo.onclick(); }; }
    const srs = $('#srs', el); if (srs) srs.onclick = () => { SC.net.post('demo-reset', { game: s.game, slot: s.slot || undefined }); $$('.spell', el).forEach(b => b.classList.remove('done')); };
    const chat = $('#chat', el);
    const upd = async () => {
      const d = SC.V.demo; if (!d || (d.key || d.game) !== key || d.id === lastId) return;
      const first = lastId === null; lastId = d.id;
      const kid = t => String(t || '').includes('\n') ? `<pre class="dpre">${esc(t)}</pre>` : esc(t);
      if (d.busy) {
        chat.innerHTML = `<div class="msg kid">${kid(d.prompt)}</div>`;
        if (ghost) ghost.remove(); ghost = await genieCast(gb, d.prompt.split('\n')[0], true); return;
      }
      if (ghost) { ghost.remove(); ghost = null; }
      if (d.plan) {   // 先说计划：还没改代码，等老师（全班）同意
        chat.innerHTML = `<div class="msg kid">${kid(d.prompt)}</div><div class="msg gn">${svgSize(IC.genie, 44)}<span>${esc(d.reply || '我打算这样改：')}<ol class="dplan">${d.plan.map(x => `<li>${esc(x)}</li>`).join('')}</ol>${SC.canCtl ? '<span class="row" style="gap:10px;margin-top:8px"><button class="btn sm green" id="pok">同意，开始做</button><button class="btn sm ghost" id="pno">不对，重说</button></span>' : '<span class="sm">同意吗？哪一步不是你想的？</span>'}</span></div>`;
        const ok = $('#pok', el); if (ok) ok.onclick = () => SC.net.post('demo', body({ approve: true }));
        const no = $('#pno', el); if (no) no.onclick = () => { chat.innerHTML = '<div class="sm">好，再说清楚一点</div>'; };
        if (!first) Snd.magic && Snd.magic();
        return;
      }
      if (d.prompt) chat.innerHTML = `<div class="msg kid">${kid(d.prompt)}</div><div class="msg gn">${svgSize(IC.genie, 44)}<span>${esc(d.reply || '')}</span></div>`;
      else chat.innerHTML = '<div class="sm">变回原样了</div>';
      const c = $('#code', el);
      if (d.prompt && d.changed) { c.textContent = (d.lines || []).filter(l => !/^\/\//.test(l) && !/=====/.test(l)).slice(0, 2).join('  ') || '（改了几处）'; c.parentElement.classList.remove('flash'); void c.offsetWidth; c.parentElement.classList.add('flash'); }
      else if (!d.prompt) c.textContent = '（还没改）';
      if (!first) Snd.ding();
      load();
    };
    load(); upd();
    return { upd, off() { if (frame._errOff) frame._errOff(); } };
  },

  mission(s, L, el, X) {
    if (s.kind === 'dance') return R.dancework(s, L, el, X);
    if (s.kind === 'persona') return s.own ? R.mydogwork(s, L, el, X) : R.personawork(s, L, el, X);
    if (s.kind === 'design') return R.designwork(s, L, el, X);
    if (s.kind === 'npc' || s.kind === 'gate') return R.npcwork(s, L, el, X);
    const lv = { 1: '★ 基础', 2: '★★ 挑战', 3: '★★★ 高手' };
    const bugs = s.claims ? `<div class="bugrow">${s.claims.map((b, i) => `<div class="bugc" data-b="${esc(b)}">${svgSize(bugSVG(['minus', 'space', 'ghost'][i % 3]), 70)}<b>${esc(b)}</b><span class="by"></span></div>`).join('')}</div>` : '';
    el.innerHTML = `<h2 class="t2" style="margin-bottom:16px">${esc(s.title)}<span class="tag" style="margin-left:16px;vertical-align:middle">在平板上做</span></h2>
      <div class="row grow" style="gap:30px;min-height:0"><div class="col grow" style="gap:16px">${s.tasks.map(t => `
        <div class="mission l${t.lv}"><div class="lv">${lv[t.lv]}</div><div class="grow">${t.lv === 3 ? '<span class="sm" style="font-size:24px">做完 ★★ 在平板上解锁：</span>' : ''}${esc(t.t)}</div></div>`).join('')}
        ${bugs}
        <div class="card" style="padding:18px 26px;margin-top:auto"><div style="font-size:26px;font-weight:900;margin-bottom:8px">${svgSize(IC.bolt, 26)} 全队都完成 ★ 的队伍 +3 能量</div><div id="prog"></div>
          ${SC.canCtl ? `<div class="row" style="gap:12px;margin-top:10px"><button class="btn sm tdone" data-t="o">${esc(tn('o'))}完成 +3</button><button class="btn sm blue tdone" data-t="b">${esc(tn('b'))}完成 +3</button></div>` : ''}</div></div>
      ${timerPanel()}</div>`;
    $$('.tdone', el).forEach(b => b.onclick = () => X.ctl({ type: 'task.award', t: b.dataset.t }));
    const upd = () => {
      const d = sdata(), tk = d.tasks || {}, aw = d.awarded || {};
      $('#prog', el).innerHTML = ['o', 'b'].map(t => { const a = tk[t] || [0, 0, 0, roster().filter(r => r.team === t).length]; return progressRow(`${esc(tn(t))} ★`, t, a[0], a[3]) + (aw[t] ? '<span class="tag" style="margin-left:8px">已加 3 分</span>' : ''); }).join('');
      if (s.claims) { const by = d.bugs || {}; $$('.bugc', el).forEach(c => { const b = c.dataset.b; const teams = ['o', 'b'].filter(t => by[t + ':' + b]); c.classList.toggle('got', teams.length > 0); $('.by', c).innerHTML = teams.map(t => teamTag(t)).join(''); }); }
    };
    upd(); return { upd };
  },

  dancework(s, L, el, X) {
    el.innerHTML = `<h2 class="t2" style="margin-bottom:14px">${esc(s.title)}<span class="tag" style="margin-left:16px;vertical-align:middle">${s.own ? (REAL_DOG ? '在平板上编，发给自己的狗' : '在平板上编，发到大屏') : '在平板上编，编舞师发给比特'}</span></h2>
      <div class="row grow" style="gap:26px;min-height:0">
        <div class="dogstage" id="ds" style="width:520px;flex:none"><div class="floor"></div><div style="margin-bottom:56px">${bitEl(360, 'idle')}</div><div class="dsays" id="dsay"></div></div>
        <div class="col grow" style="min-height:0;gap:12px"><div class="glist" id="gl"></div></div>
        ${timerPanel()}</div>`;
    let token = { stop: true };
    const upd = () => {
      if (s.own) {
        const sent = sdata().sent || [], last = {}; sent.forEach(x => { if (x.owner) last[x.owner] = x; });
        $('#gl', el).className = 'dogs'; $('#gl', el).style.flex = '1'; $('#gl', el).style.gridTemplateColumns = 'repeat(2,1fr)';
        $('#gl', el).innerHTML = roster().map(x => { const d = last[x.name]; return `<div class="dogc ${x.team || ''} ${d ? 'on' : ''}"><div class="dn">${svgSize(IC.paw, 22)}${esc(x.dog || x.name + '的狗')}</div><div class="sm">${d ? d.actions.slice(0, 4).map(esc).join('→') + (d.actions.length > 4 ? '…' : '') + (d.repeat > 1 ? ' ×' + d.repeat : '') : esc(x.name) + ' · 还在编'}</div></div>`; }).join('');
        return;
      }
      const g = sdata().groups || [];
      $('#gl', el).innerHTML = g.length ? g.map(x => `<div class="gitem ${x.team}"><b>第 ${x.no} 组</b><span>${esc(x.dog)}</span><span class="sm">${x.members.map(m => esc(m.name) + (m.role === '编舞师' ? '（编舞）' : '')).join('、')}</span></div>`).join('') : '<div class="sm">老师还没分组</div>';
    };
    upd();
    return {
      upd, async cue(c, replay) {
        if (c.n !== 'dogDance' || replay) return;
        const a = c.a; $('#dsay', el).innerHTML = `${a.owner ? esc(dogLabel(a)) : `第 ${a.group || '?'} 组 · ${esc(a.by)}`}：${a.actions.map(esc).join(' → ')}${a.repeat > 1 ? ` ×${a.repeat}` : ''}`;
        token.stop = true; await sleep(30); token = { stop: false }; const full = []; for (let k = 0; k < (a.repeat || 1); k++) full.push(...a.actions);
        playSeq($('#ds .bit', el), full, a.mood, null, token);
      }, off() { token.stop = true; }
    };
  },

  personawork(s, L, el, X) {
    const lv = { 1: '★', 2: '★★', 3: '★★★' };
    el.innerHTML = `<h2 class="t2" style="margin-bottom:14px">${esc(s.title)}<span class="tag" style="margin-left:16px;vertical-align:middle">在平板上填角色卡，设计师发给比特</span></h2>
      <div class="row grow" style="gap:26px;min-height:0">
        <div class="col" style="width:520px;flex:none;gap:14px">
          <div class="dogstage" id="ds" style="height:380px"><div class="floor"></div><div style="margin-bottom:50px">${bitEl(230, 'idle')}</div><div class="dsays" id="dsay"></div></div>
          ${s.tasks.map(t => `<div class="sentence" style="font-size:24px;padding:10px 18px"><div class="k" style="width:auto;min-width:64px;padding:0 10px;font-size:20px;border-radius:22px;background:${[C.orange, C.blue, C.purple][t.lv - 1]}">${lv[t.lv]}</div><span>${esc(t.t)}</span></div>`).join('')}
        </div>
        <div class="col grow" style="min-height:0;gap:12px">
          <div style="font-size:28px;font-weight:900">每组的比特 <span class="sm" id="sentn"></span></div>
          <div class="glist" id="gl" style="flex:1"></div>
          <div class="card" style="padding:14px 22px"><div style="font-size:24px;font-weight:900;margin-bottom:6px">${svgSize(IC.bolt, 24)} 全队都完成 ★ 的队伍 +3 能量</div><div id="prog"></div>
            ${SC.canCtl ? `<div class="row" style="gap:12px;margin-top:8px"><button class="btn sm tdone" data-t="o">${esc(tn('o'))}完成 +3</button><button class="btn sm blue tdone" data-t="b">${esc(tn('b'))}完成 +3</button></div>` : ''}</div>
        </div>
        ${timerPanel()}</div>`;
    $$('.tdone', el).forEach(b => b.onclick = () => X.ctl({ type: 'task.award', t: b.dataset.t }));
    const upd = () => {
      const d = sdata(), g = d.groups || [], tk = d.tasks || {}, aw = d.awarded || {};
      const sent = g.filter(x => x.persona).length;
      $('#sentn', el).textContent = g.length ? `已上线 ${sent} / ${g.length}` : '';
      $('#gl', el).innerHTML = g.length ? g.map(x => {
        const p = x.persona, des = x.members.find(m => m.role === '设计师');
        return `<div class="gitem ${x.team} ${p ? 'on' : ''}"><div class="row" style="gap:12px;align-items:center"><b>第 ${x.no} 组 · ${esc(x.dog)}</b><span class="grow"></span>${p ? '<span class="tag" style="font-size:22px;background:' + C.green + ';color:#fff">已上线</span>' : '<span class="sm" style="font-size:22px">还在设计</span>'}</div>
          ${p ? `<span style="font-size:30px;font-weight:900">「${esc(p.name || '比特')}」${esc(p.identity || '')} · ${esc(p.trait || '')}</span>` : ''}
          <span class="sm" style="font-size:22px">${x.members.map(m => esc(m.name) + '（' + esc(m.role) + '）').join('、')}${des ? '' : ''}</span></div>`;
      }).join('') : `<div class="sm">${SC.standalone ? '单机模式：用纸质角色卡' : '老师还没分组'}</div>`;
      $('#prog', el).innerHTML = ['o', 'b'].map(t => { const a = tk[t] || [0, 0, 0, roster().filter(r => r.team === t).length]; return progressRow(`${esc(tn(t))} ★`, t, a[0], a[3]) + (aw[t] ? '<span class="tag" style="margin-left:8px">已加 3 分</span>' : ''); }).join('');
    };
    upd();
    let tm = null;
    return {
      upd, cue(c, replay) {
        if (c.n !== 'personaSent' || replay) return;
        const a = c.a || {}; const bit = $('#ds .bit', el);
        $('#dsay', el).innerHTML = `第 ${a.group || '?'} 组 · 「${esc(a.name || '比特')}」上线了！${a.identity ? '我是你的' + esc(a.identity) : ''}`;
        bit.className = 'bit idle say'; bit.removeAttribute('data-act'); void bit.offsetWidth; bit.setAttribute('data-act', '摇尾巴');
        Snd.bark(); clearTimeout(tm); tm = setTimeout(() => { bit.removeAttribute('data-act'); bit.className = 'bit idle'; }, 1600);
      }, off() { clearTimeout(tm); }
    };
  },

  designwork(s, L, el, X) {
    const lv = { 1: '★', 2: '★★', 3: '★★★' };
    const blocks = [['角色', C.orange], ['规则', C.blue], ['得分', C.green], ['结束', C.purple]];
    el.innerHTML = `<h2 class="t2" style="margin-bottom:14px">${esc(s.title)}<span class="tag" style="margin-left:16px;vertical-align:middle">在平板上填设计卡，交给精灵</span></h2>
      <div class="row grow" style="gap:26px;min-height:0">
        <div class="col" style="width:520px;flex:none;gap:12px">
          <div class="dblocks">${blocks.map(([b, c]) => `<div class="dblock" style="background:${c}">${b}</div>`).join('')}</div>
          ${s.tasks.map(t => `<div class="sentence" style="font-size:24px;padding:10px 18px"><div class="k" style="width:auto;min-width:64px;padding:0 10px;font-size:20px;border-radius:22px;background:${[C.orange, C.blue, C.purple][t.lv - 1]}">${lv[t.lv]}</div><span>${esc(t.t)}</span></div>`).join('')}
          <div class="card" style="padding:14px 22px;margin-top:auto"><div style="font-size:24px;font-weight:900;margin-bottom:6px">${svgSize(IC.bolt, 24)} 全队都完成 ★ 的队伍 +3 能量</div><div id="prog"></div>
            ${SC.canCtl ? `<div class="row" style="gap:12px;margin-top:8px"><button class="btn sm tdone" data-t="o">${esc(tn('o'))}完成 +3</button><button class="btn sm blue tdone" data-t="b">${esc(tn('b'))}完成 +3</button></div>` : ''}</div>
        </div>
        <div class="col grow" style="min-height:0;gap:12px"><div style="font-size:28px;font-weight:900">做出来的游戏 <span class="sm" id="dn"></span></div><div class="dnames" id="dl"></div></div>
        ${timerPanel()}</div>`;
    $$('.tdone', el).forEach(b => b.onclick = () => X.ctl({ type: 'task.award', t: b.dataset.t }));
    const seen = new Set();
    const upd = () => {
      const d = sdata(), ds = d.designs || {}, tk = d.tasks || {}, aw = d.awarded || {};
      const list = roster().filter(r => ds[r.sid]).sort((a, b) => ds[a.sid].at - ds[b.sid].at);
      $('#dn', el).textContent = `${list.length} / ${roster().length}`;
      $('#dl', el).innerHTML = list.length ? list.map(r => `<div class="dname ${r.team || ''} ${seen.has(r.sid) ? '' : 'new'}"><b>《${esc(ds[r.sid].name || '我的游戏')}》</b><span>${esc(r.name)}</span></div>`).join('') : '<div class="sm">填好设计卡、交给精灵，游戏名字会出现在这里</div>';
      list.forEach(r => { if (!seen.has(r.sid)) { seen.add(r.sid); } });
      $('#prog', el).innerHTML = ['o', 'b'].map(t => { const a = tk[t] || [0, 0, 0, roster().filter(r => r.team === t).length]; return progressRow(`${esc(tn(t))} ★`, t, a[0], a[3]) + (aw[t] ? '<span class="tag" style="margin-left:8px">已加 3 分</span>' : ''); }).join('');
    };
    upd(); return { upd };
  },

  mydogwork(s, L, el, X) {
    const lv = { 1: '★', 2: '★★', 3: '★★★' };
    el.innerHTML = `<div class="row" style="align-items:center;gap:16px;margin-bottom:14px"><h2 class="t2" style="margin:0">${esc(s.title)}</h2><span class="tag">${esc(s.sub || (REAL_DOG ? '在平板上写角色卡，发给自己的狗' : '在平板上写角色卡，让自己的狗上线'))}</span></div>
      <div class="row grow" style="gap:26px;min-height:0">
        <div class="col" style="width:470px;flex:none;gap:12px">
          <div class="dogstage" id="ds" style="height:300px"><div class="floor"></div><div style="margin-bottom:46px">${bitEl(190, 'idle')}</div><div class="dsays" id="dsay"></div></div>
          ${s.tasks.map(t => `<div class="sentence" style="font-size:23px;padding:9px 16px"><div class="k" style="width:auto;min-width:60px;padding:0 10px;font-size:19px;border-radius:22px;background:${[C.orange, C.blue, C.purple][t.lv - 1]}">${lv[t.lv]}</div><span>${esc(t.t)}</span></div>`).join('')}
        </div>
        <div class="col grow" style="min-height:0;gap:12px">
          <div style="font-size:28px;font-weight:900">大家的狗 <span class="sm" id="sentn"></span></div>
          <div class="dogs" id="dg"></div>
          <div class="card" style="padding:12px 20px"><div id="prog"></div>
            ${SC.canCtl ? `<div class="row" style="gap:12px;margin-top:8px"><button class="btn sm tdone" data-t="o">${esc(tn('o'))}完成 +3</button><button class="btn sm blue tdone" data-t="b">${esc(tn('b'))}完成 +3</button></div>` : ''}</div>
        </div>
        ${timerPanel()}</div>`;
    $$('.tdone', el).forEach(b => b.onclick = () => X.ctl({ type: 'task.award', t: b.dataset.t }));
    const upd = () => {
      const d = sdata(), md = d.mydogs || {}, tk = d.tasks || {}, aw = d.awarded || {}, V = SC.V || {};
      const r = roster(); $('#sentn', el).textContent = `已上线 ${r.filter(x => md[x.sid]).length} / ${r.length}`;
      $('#dg', el).innerHTML = r.map(x => { const p = md[x.sid]; const quiet = V.turn && x.team !== V.turn; return `<div class="dogc ${x.team || ''} ${p ? 'on' : ''} ${quiet ? 'quiet' : ''}"><div class="dn">${svgSize(IC.paw, 22)}${esc(x.dog || '还没起名')}</div><div class="sm">${esc(x.name)}${p ? ` · ${esc(p.trait || '')}${p.rules ? ` · ${p.rules} 条口令` : ''}` : ''}</div></div>`; }).join('');
      $('#prog', el).innerHTML = ['o', 'b'].map(t => { const a = tk[t] || [0, 0, 0, r.filter(x => x.team === t).length]; return progressRow(`${esc(tn(t))} ★`, t, a[0], a[3]) + (aw[t] ? '<span class="tag" style="margin-left:8px">已加 3 分</span>' : ''); }).join('');
    };
    upd();
    let tm = null;
    return {
      upd, cue(c, replay) {
        if (c.n !== 'personaSent' || replay) return;
        const a = c.a || {}; const bit = $('#ds .bit', el);
        $('#dsay', el).innerHTML = `${esc(a.owner || a.by || '')}的「${esc(a.name || '')}」上线了！`;
        bit.className = 'bit idle say'; bit.removeAttribute('data-act'); void bit.offsetWidth; bit.setAttribute('data-act', '摇尾巴');
        Snd.pop(); clearTimeout(tm); tm = setTimeout(() => { bit.removeAttribute('data-act'); bit.className = 'bit idle'; }, 1600);
      }, off() { clearTimeout(tm); }
    };
  },

  dogname(s, L, el, X) {
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:16px"><div><h2 class="t2" style="margin:0">${esc(s.title)}</h2><p class="lead" style="margin:4px 0 0;font-size:30px">${esc(s.sub || '')}</p></div><div class="tag" id="dc" style="font-size:30px"></div></div>
      <div class="row grow" style="gap:30px;min-height:0">
        <div class="card" style="width:430px;flex:none;padding:24px 28px;display:flex;flex-direction:column;gap:14px">${(s.tips || []).map((t, i) => `<div class="rule"><span class="pts" style="background:${[C.orange, C.blue, C.green][i % 3]}">${i + 1}</span><span>${esc(t)}</span></div>`).join('')}<div style="margin-top:auto;display:flex;justify-content:center">${bitEl(230, 'idle')}</div></div>
        <div class="tags grow" id="tg"></div></div>`;
    const seen = new Set(); let first = true;
    const upd = () => {
      const r = roster(), named = r.filter(x => x.dog);
      $('#dc', el).textContent = `已起名 ${named.length} / ${r.length}`;
      $('#tg', el).innerHTML = r.map(x => `<div class="dtagc ${x.team || ''} ${x.dog ? 'on' : ''} ${x.dog && !seen.has(x.sid + x.dog) && !first ? 'new' : ''}">${x.dog ? `<b>${esc(x.dog)}</b>` : '<b class="q">?</b>'}<span>${esc(x.name)}的狗</span></div>`).join('') || '<div class="sm">还没有学生</div>';
      if (!first && named.some(x => !seen.has(x.sid + x.dog))) Snd.pop();
      named.forEach(x => seen.add(x.sid + x.dog)); first = false;
    };
    upd(); return { upd };
  },

  dogdemo(s, L, el, X) {
    const c = s.card || {};
    el.innerHTML = `<div class="row" style="align-items:center;justify-content:space-between;margin-bottom:12px"><h2 class="t2" style="margin:0">${esc(s.title)}${s.term ? `<span class="term">${esc(s.term)}</span>` : ''}</h2><span class="tag">示范狗：${esc(c.name || '比特')}</span></div>
      <div class="row grow" style="gap:24px;min-height:0">
        <div class="card" style="width:500px;flex:none;padding:20px 24px;display:flex;flex-direction:column;gap:10px;overflow:hidden">
          <div style="font-size:28px;font-weight:900">${esc(c.name || '比特')} 的口令表</div>
          <div class="sm" style="font-size:22px">${esc([c.identity, c.trait].filter(Boolean).join(' · '))}</div>
          <div class="ctab">${(c.rules || []).map((r, i) => `<div class="crow" data-r="${i}"><span class="w">「${esc(r.when)}」</span><span class="a">${r.do ? esc(r.do) : ''}${r.do && r.say ? ' · ' : ''}${r.say ? '说「' + esc(r.say) + '」' : ''}</span></div>`).join('')}</div>
        </div>
        <div class="dogstage" id="ds" style="width:520px;flex:none"><div class="floor"></div><div style="margin-bottom:56px">${bitEl(330, 'idle')}</div><div class="dsays" id="dsay"></div></div>
        <div class="col grow" style="min-width:0;gap:12px"><div class="chat" id="chat" style="flex:1"><div class="sm">${SC.canCtl ? '点下面的话，或者打孩子说的话' : '孩子说一句，比特照口令表回答'}</div></div>
          ${SC.canCtl ? `<div class="spellbar" style="max-height:220px">${(s.lines || []).map((p, i) => `<button class="spell" data-i="${i}"><span>${esc(p)}</span></button>`).join('')}</div><div class="row" style="gap:10px"><input class="say-in" id="sin" placeholder="打孩子说的话"><button class="btn sm" id="sgo">说</button></div>` : ''}</div></div>`;
    const say = t => { if (t) SC.net.post('dog-demo', { card: c, text: t }); };
    $$('.spell', el).forEach(b => b.onclick = () => { say(s.lines[+b.dataset.i]); b.classList.add('done'); });
    const sgo = $('#sgo', el); if (sgo) { sgo.onclick = () => { say($('#sin', el).value.trim()); $('#sin', el).value = ''; }; $('#sin', el).onkeydown = e => { if (e.key === 'Enter') sgo.onclick(); }; }
    let token = { stop: true };
    const bit = $('#ds .bit', el), chat = $('#chat', el);
    return {
      async cue(k, replay) {
        if (k.n === 'dogThink') { chat.insertAdjacentHTML('beforeend', `<div class="msg kid">${esc(k.a.q)}</div>`); chat.scrollTop = 1e6; $$('.crow', el).forEach(r => r.classList.remove('hit')); if (!replay) { $('#dsay', el).textContent = '……'; } }
        if (k.n === 'dogSay') {
          const a = k.a; chat.insertAdjacentHTML('beforeend', `<div class="msg gn">${svgSize(IC.robot, 40)}<span>${esc(a.a)}${a.acts && a.acts.length ? `<small style="display:block;color:#5B6683;font-size:20px">动作：${a.acts.map(esc).join('、')}</small>` : ''}</span></div>`); chat.scrollTop = 1e6;
          const hitI = (c.rules || []).findIndex(r => r.when && a.q.includes(r.when)); const row = $(`.crow[data-r="${hitI}"]`, el); if (row) row.classList.add('hit');
          if (replay) return;
          $('#dsay', el).textContent = a.a;
          if (!SC.mini) speakScreen(a.a, c.voice);
          token.stop = true; await sleep(30); token = { stop: false };
          if (a.acts && a.acts.length) playSeq(bit, a.acts, '开心', null, token); else { bit.classList.add('say'); setTimeout(() => bit.classList.remove('say'), 1500); }
        }
      },
      off() { token.stop = true; try { speechSynthesis.cancel(); } catch (e) { } }
    };
  },

  activity(s, L, el, X) {
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:16px"><div>${s.badge ? `<span class="tag">${esc(s.badge)}</span>` : ''}<h2 class="t2" style="margin:${s.badge ? '10px' : '0'} 0 0">${esc(s.title)}</h2>${s.sub ? `<p class="lead" style="margin:4px 0 0;font-size:30px">${esc(s.sub)}</p>` : ''}</div>
        <div class="bigtime" data-timer style="font-size:80px;margin:0">--:--</div></div>
      <div class="row grow" style="gap:34px;min-height:0;align-items:stretch">
        <div class="card center" style="width:460px;flex:none;gap:10px;position:relative">${s.art === 'eye' ? `<div style="position:absolute;right:26px;top:26px;width:110px;height:110px;border-radius:55px;background:${C.blue};display:flex;align-items:center;justify-content:center">${svgSize(IC.eye, 76)}</div>${bitEl(320, 'idle')}<div class="sm" style="font-size:26px;font-weight:800">摄像头 = 比特的眼睛</div>` : s.art === 'dog' ? `${bitEl(320, 'idle say')}<div class="sm" style="font-size:26px;font-weight:800">会听 · 会看 · 会说</div>` : svgSize(IC[s.art] || IC.star, 260)}</div>
        <div class="col grow" style="gap:14px;min-width:0">${s.steps.map((t, i) => `<div class="sentence" style="font-size:32px;padding:16px 24px"><div class="k" style="background:${L.color}">${i + 1}</div><span>${esc(t)}</span></div>`).join('')}
          <div class="row" style="gap:20px;margin-top:auto;${s.award === 0 ? 'display:none' : ''}">${['o', 'b'].map(t => `<div class="ascore ${t}"><span class="tteam ${t}">${esc(tn(t))}</span><b id="as${t}">0</b>${SC.canCtl ? `<button class="btn sm ${t === 'b' ? 'blue' : ''} aplus" data-t="${t}">+${s.award || 1}</button>` : ''}</div>`).join('')}</div>
        </div></div>`;
    $$('.aplus', el).forEach(b => b.onclick = () => X.ctl({ type: 'team.score', t: b.dataset.t, d: s.award || 1, why: s.title }));
    if (!s.min) { const bt = $('[data-timer]', el); if (bt) bt.style.display = 'none'; }
    const upd = () => { const sc = sdata().score || { o: 0, b: 0 }; ['o', 'b'].forEach(t => { const n = $('#as' + t, el); if (n && n.textContent !== String(sc[t] || 0)) { n.textContent = sc[t] || 0; bumpEl(n); } }); };
    upd();
    return { upd, cue(c, replay) { if (c.n === 'score' && !replay) Snd.ding(); } };
  },

  rest(s, L, el, X) {
    el.innerHTML = `<div class="row grow" style="align-items:center;gap:60px"><div class="grow">
        <h2 class="t1" style="margin:0 0 26px">${esc(s.title || '屏幕休息')}</h2>
        <div class="col" style="gap:16px">${['平板扣下', '喝口水', '看看窗外，让眼睛休息'].map((t, i) => `<div class="sentence"><div class="k" style="background:${L.color}">${i + 1}</div><span>${t}</span></div>`).join('')}</div>
        <div style="margin-top:28px;display:flex;align-items:center;gap:24px"><div class="bigtime" data-timer style="font-size:110px;margin:0">--:--</div>${ctlBtn('tm', IC.clock + ` 休息 ${s.min || 3} 分钟`, 'green')}</div></div>
      <div style="width:520px;flex:none;display:flex;justify-content:center">${bitEl(460, 'sleepy sitting')}</div></div>`;
    const tm = $('#tm', el); if (tm) tm.onclick = () => X.ctl({ type: 'timer.start', sec: (s.min || 3) * 60, rest: true });
  },

  arena(s, L, el, X) {
    const Eng = ENGINES[s.engine];
    const box = t => `<div class="arenateam ${t}"><div class="ah">${teamTag(t)}${SC.canCtl ? `<button class="btn sm ${t === 'o' ? '' : 'blue'} awin" data-t="${t}">${svgSize(IC.bolt, 28)} +2</button>` : ''}</div><div class="sm" style="font-size:24px">商量 1 分钟，派一人说</div></div>`;
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:8px">
        <div><span class="tag">两队比拼</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2><p class="lead" style="margin:4px 0 0;font-size:30px">${esc(s.sub)}</p></div>
        ${ctlBtn('ans', '看参考答案', 'ghost')}</div>
      <div class="row" style="gap:20px;align-items:center;justify-content:center">
        <div class="mini"><div class="ml">原来</div><canvas id="c1"></canvas></div>
        <svg viewBox="0 0 64 64" style="width:70px;flex:none"><path d="M8 32h40M36 18l14 14-14 14" stroke="#E1CBA8" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <div class="mini"><div class="ml" style="background:${C.orange}">变成</div><canvas id="c2"></canvas></div>
      </div>
      <div class="sentence" id="answer" style="display:none;margin-top:10px;font-size:28px;padding:10px 22px">${svgSize(IC.wand, 44)}<span>${esc(s.answer)}</span></div>
      <div class="row" style="gap:24px;margin-top:10px">${box('o')}${box('b')}</div>`;
    const g1 = Eng($('#c1', el), Object.assign({ auto: true }, s.before)), g2 = Eng($('#c2', el), Object.assign({ auto: true }, s.after));
    const ans = $('#ans', el); if (ans) ans.onclick = () => X.ctl({ type: 'cue', n: 'answer' });
    $$('.awin', el).forEach(b => b.onclick = () => X.ctl({ type: 'arena.award', t: b.dataset.t }));
    return { cue(c, replay) { if (c.n === 'answer') { $('#answer', el).style.display = 'flex'; if (!replay) Snd.magic(); } }, off() { g1.destroy(); g2.destroy(); } };
  },

  duel(s, L, el, X) {
    const left = s.target ? `<div class="duel-tg"><div class="ml" style="background:${C.orange}">目标</div><canvas></canvas></div>`
      : `<div class="duel-big"><div class="k">${esc(s.bigLabel || '')}</div><div class="v">${esc(s.big)}</div><div class="k" id="phase" style="margin-top:12px"></div></div>`;
    el.innerHTML = `<div><span class="tag">两队挑战赛</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2></div>
      <div class="row grow" style="gap:30px;min-height:0;margin-top:14px;align-items:flex-start">${left}
        <div class="col grow" style="gap:12px;min-width:0">${s.steps.map((t, i) => `<div class="sentence" style="font-size:28px;padding:12px 20px"><div class="k" style="background:${L.color}">${i + 1}</div><span>${esc(t)}</span></div>`).join('')}
          <div class="card" style="padding:14px 22px"><div id="prog"></div></div>
          <div class="duel-act"><div class="bigtime" data-timer style="font-size:64px;margin:0 16px 0 0">--:--</div>
            ${SC.canCtl && (s.kind === 'balance' || s.kind === 'report') ? '<button class="btn sm purple" id="swap">交换</button>' : ''}
            ${SC.canCtl ? `<button class="btn sm dwin" data-t="o">${esc(tn('o'))}赢 +2</button><button class="btn sm blue dwin" data-t="b">${esc(tn('b'))}赢 +2</button>` : ''}</div>
        </div></div>`;
    let G = null;
    if (s.target) G = ENGINES[s.engine]($('.duel-tg canvas', el), Object.assign({ auto: true }, s.target));
    const sw = $('#swap', el); if (sw) sw.onclick = () => X.ctl({ type: 'balance.swap' });
    $$('.dwin', el).forEach(b => b.onclick = () => X.ctl({ type: 'duel.award', t: b.dataset.t }));
    const upd = () => {
      const d = sdata(), aw = d.awarded || {};
      const total = t => roster().filter(r => r.team === t).length;
      let html = '';
      if (s.kind === 'report') {
        const b = d.report || { hit: { o: 0, b: 0 }, total: { o: 0, b: 0 } };
        html = ['o', 'b'].map(t => progressRow(`${esc(tn(t))}${esc(s.report.hitLabel || '做得好')}`, t, b.hit[t], b.total[t] || total(t))).join('');
        const ph = $('#phase', el); if (ph) ph.textContent = d.phase === 'swap' ? `已交换：玩对方的游戏，报结果（已报 ${b.reported || 0} 人）` : '先检查自己的游戏';
      } else if (s.kind === 'balance') {
        const b = d.balance || { hit: { o: 0, b: 0 }, total: { o: 0, b: 0 } };
        html = ['o', 'b'].map(t => progressRow(`${esc(tn(t))}的作品落在 10~20`, t, b.hit[t], b.total[t] || total(t))).join('');
        const ph = $('#phase', el); if (ph) ph.textContent = d.phase === 'swap' ? '已交换：玩对方的游戏，报分数' : '先调自己的游戏';
      } else {
        const ok = t => (d.claims || []).filter(c => c.team === t && c.status === 'ok').length;
        html = ['o', 'b'].map(t => progressRow(`${esc(tn(t))}改对了`, t, ok(t), total(t))).join('');
      }
      $('#prog', el).innerHTML = html + ['o', 'b'].filter(t => aw[t]).map(t => `<span class="tag" style="margin-right:8px">${esc(tn(t))}获胜 +2</span>`).join('');
    };
    upd(); return { upd, off() { if (G) G.destroy(); } };
  },

  quiz(s, L, el, X) {
    const Ls = 'ABCD';
    const hints = s.hints ? `<div class="hints">${s.hints.map((h, i) => `<div class="hintc off" data-h="${i}" style="--c:${[C.orange, C.blue, C.green, C.purple][i % 4]}"><b>${esc(h.k)}</b><span>${esc(h.t)}</span><i>?</i></div>`).join('')}</div>` : '';
    const optsH = `<div class="opts ${s.engine || s.show ? 'one' : s.hints ? 'sm' : ''}">${s.opts.map((o, i) => `<div class="opt ${Ls[i]}" data-i="${i}"><div class="L">${Ls[i]}</div><span class="grow">${esc(o)}</span><b class="cnt"></b></div>`).join('')}</div>`;
    const head = `<div class="row" style="align-items:center;gap:16px"><span class="tag">${s.badge ? esc(s.badge) : '在平板上选'}</span><span class="sm">${esc(s.note || (s.hints ? '线索一张张翻开，越早猜对越厉害 · 全队过半答对 +1 能量' : '每队商量 10 秒，再每人在平板上选 · 全队过半答对 +1 能量'))}</span><span class="grow"></span><span class="tag" id="qn" style="font-size:28px"></span>${ctlBtn('rv', '揭晓', 'green')}</div>`;
    const explain = s.explain ? `<div class="sentence qexp" id="qexp" style="display:none;font-size:30px;padding:12px 24px;margin-top:16px">${svgSize(IC.wand, 44)}<span>${esc(s.explain)}</span></div>` : '';
    if (s.engine) {
      el.innerHTML = `${head}<div class="row grow" style="gap:28px;margin-top:14px;min-height:0;align-items:flex-start">
        <div style="width:720px;flex:none"><div class="gamebox"><canvas></canvas><div class="gamehint">${esc(s.gameLabel || '看比特碰到了什么')}</div></div></div>
        <div class="col grow" style="min-width:0;gap:10px"><h2 class="t2" style="margin:0;font-size:${s.q.length > 12 ? 38 : 46}px;line-height:1.25">${esc(s.q)}</h2>${optsH}${explain.replace('margin-top:16px', 'margin-top:4px;font-size:26px')}<div id="qres" class="row" style="gap:12px;justify-content:center;flex-wrap:wrap"></div></div></div>`;
    } else if (s.show) {   // 第二季：左边给大家看精灵的计划、怪兽的样子、代码……
      el.innerHTML = `${head}<div class="row grow" style="gap:30px;margin-top:14px;min-height:0;align-items:flex-start">
        <div style="width:${s.showW || 640}px;flex:none;--qs-font:30px;max-height:100%;overflow:auto">${quizShowHTML(s.show)}</div>
        <div class="col grow" style="min-width:0;gap:10px"><h2 class="t2" style="margin:0;font-size:${s.q.length > 18 ? 38 : 46}px;line-height:1.25">${esc(s.q)}</h2>${optsH}${explain.replace('margin-top:16px', 'margin-top:4px;font-size:26px')}<div id="qres" class="row" style="gap:12px;justify-content:center;flex-wrap:wrap"></div></div></div>`;
    } else {
      el.innerHTML = `${head}<h2 class="t2" style="margin:14px 0 ${s.hints ? 14 : 20}px">${esc(s.q)}</h2>${hints}${optsH}${explain}
      <div id="qres" class="row" style="gap:20px;margin-top:${s.hints ? 14 : 22}px;justify-content:center"></div>`;
    }
    const G = s.engine ? ENGINES[s.engine]($('canvas', el), Object.assign({ auto: true }, s.preset || {})) : null;
    const rv = $('#rv', el); if (rv) rv.onclick = () => X.ctl({ type: 'quiz.reveal' });
    if (SC.canCtl) $$('.hintc', el).forEach(h => h.onclick = () => { if (h.classList.contains('off')) X.ctl({ type: 'cue', n: 'reveal', a: +h.dataset.h }); });
    let shown = false;
    const upd = (v, fromCue) => {
      const q = (sdata().quiz) || { answered: 0, revealed: false };
      $('#qn', el).textContent = SC.standalone ? '' : `已答 ${q.answered} / ${roster().length}`;
      if (q.revealed && !shown) {
        shown = true;
        $$('.opt', el).forEach(x => { const j = +x.dataset.i; if (s.ans != null) { x.classList.toggle('right', j === s.ans); x.classList.toggle('dim', j !== s.ans); } if (q.counts) $('.cnt', x).textContent = q.counts[j] + ' 人'; });
        $$('.hintc', el).forEach(h => h.classList.remove('off'));
        const ex = $('#qexp', el); if (ex) ex.style.display = 'flex';
        if (q.res) $('#qres', el).innerHTML = ['o', 'b'].map(t => { const r = q.res[t]; return r && r.n ? `<div class="tag" style="font-size:30px;padding:10px 22px;background:${r.pass ? C.green + '22' : '#eee'}">${esc(tn(t))}：${r.right}/${r.n} 答对${r.pass ? ' · +1' : ''}</div>` : ''; }).join('');
        if (fromCue !== 'replay') s.ans != null ? Snd.ding() : Snd.pop();
      }
      if (!q.revealed && shown) { shown = false; $$('.opt', el).forEach(x => { x.classList.remove('right', 'dim'); $('.cnt', x).textContent = ''; }); $('#qres', el).innerHTML = ''; const ex = $('#qexp', el); if (ex) ex.style.display = 'none'; }
    };
    upd(null, 'replay');
    return {
      upd, off() { if (G) G.destroy(); },
      cue(c, replay) {
        if (c.n === 'reveal') { const h = $(`.hintc[data-h="${c.a}"]`, el); if (h && h.classList.contains('off')) { h.classList.remove('off'); if (!replay) { h.style.animation = 'none'; void h.offsetWidth; h.style.animation = 'popIn .45s both'; Snd.pop(); } } }
        if (c.n === 'reset') { $$('.hintc', el).forEach(h => h.classList.add('off')); }
      }
    };
  },

  boxes(s, L, el, X) {
    const defs = s.defs, col = Object.fromEntries(defs);
    const icon = (e, n) => e.spr ? sprEl(e.spr, n) : `<span class="spr" style="width:${n}px;height:${n}px;color:${C.navy}">${IC[e.ic] || ''}</span>`;
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between"><div><span class="tag">先猜，再揭晓</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2>
        <p class="lead" style="margin:4px 0 0;font-size:30px">① 选一个道具　② 在平板上猜：变量会变成几？　③ 揭晓</p></div><span class="tag" id="gn" style="font-size:28px"></span></div>
      <div class="vx">
        <div class="vx-ev" id="ev"><span class="ph">老师选一个道具</span></div>
        <div class="vx-vars">${defs.map(([n, c]) => `<div class="vcard" data-n="${n}"><div class="vn">${n}</div><div class="vv" style="color:${c}" id="v-${n}"></div><div class="vf" id="f-${n}"></div></div>`).join('')}</div>
      </div>
      <div class="vx-bar">
        ${SC.canCtl ? `<div class="events">${s.events.map((e, i) => `<button class="evb" data-i="${i}">${icon(e, 52)}<span>${esc(e.t)}</span></button>`).join('')}</div>
        <div class="vx-act"><button class="btn green" id="show">${svgSize(IC.eye.replace('#fff', '#D5F6EA'), 40)} 揭晓</button><button class="btn ghost sm" id="rs">${IC.redo} 重新开始</button></div>` : ''}
        <div id="gres" class="row" style="gap:20px;justify-content:center"></div>
      </div>`;
    $$('.evb', el).forEach(b => b.onclick = () => X.ctl({ type: 'guess.event', i: +b.dataset.i }));
    const sh = $('#show', el); if (sh) sh.onclick = () => X.ctl({ type: 'guess.reveal' });
    const rs = $('#rs', el); if (rs) rs.onclick = () => X.ctl({ type: 'guess.reset' });
    let lastKey = '';
    const upd = (v, mode) => {
      const b = sdata().boxes || { vals: s.init, round: 0 };
      defs.forEach(([n]) => { $('#v-' + n, el).textContent = b.vals[n]; $('#f-' + n, el).textContent = ''; $(`.vcard[data-n="${n}"]`, el).classList.remove('q'); });
      const p = b.pend;
      if (!p) { $('#ev', el).innerHTML = '<span class="ph">老师选一个道具</span>'; $('#gn', el).textContent = ''; $('#gres', el).innerHTML = ''; return; }
      const e = s.events[p.i];
      $('#ev', el).innerHTML = `${icon(e, 130)}<div class="et">${esc(e.t)}</div><div class="rule" style="background:${col[e.k]}">${e.k} ${e.d > 0 ? '+' : '−'}${Math.abs(e.d)}</div>`;
      $('#gn', el).textContent = SC.standalone ? '' : `已猜 ${p.answered} / ${roster().length}`;
      const card = $(`.vcard[data-n="${p.k}"]`, el);
      const key = b.round + ':' + p.revealed;
      if (!p.revealed) { card.classList.add('q'); $('#v-' + p.k, el).textContent = '?'; $('#f-' + p.k, el).textContent = '现在是几？'; $('#gres', el).innerHTML = ''; }
      else {
        $('#v-' + p.k, el).textContent = p.to; $('#f-' + p.k, el).textContent = `${p.from} ${p.d > 0 ? '+' : '−'} ${Math.abs(p.d)} = ${p.to}`;
        if (key !== lastKey && mode !== 'replay') { bumpEl(card); Snd.ding(); }
        $('#gres', el).innerHTML = p.res ? ['o', 'b'].map(t => { const r = p.res[t]; return r && r.n ? `<div class="tag" style="font-size:28px;padding:8px 20px">${esc(tn(t))}：${r.right}/${r.n} 猜对${r.pass ? ' · +1' : ''}</div>` : ''; }).join('') : '';
      }
      lastKey = key;
    };
    upd(null, 'replay'); return { upd };
  },

  gallery(s, L, el) {
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:16px"><div><span class="tag">互相玩一玩</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2>
      <p class="lead" style="margin:4px 0 0;font-size:30px">${s.lead ? esc(s.lead) + `（每人 ${s.stars || 1} 颗星）` : `在平板上点开别人的作品玩一玩，给最想再玩一次的投${s.stars > 1 ? ` ${s.stars} 颗` : '一颗'}星（不能投自己）`}</p></div><div class="bigtime" data-timer style="font-size:80px;margin:0">--:--</div></div>
      <div class="row grow" style="gap:28px;min-height:0"><div class="card grow" style="padding:24px 30px"><div style="font-size:30px;font-weight:900;margin-bottom:12px"><span style="color:${C.yellow};display:inline-flex;vertical-align:-4px">${svgSize(IC.star, 34)}</span> 星星榜 <span class="sm" id="vn"></span></div><div class="stars" id="st"></div></div>
      <div style="width:420px;flex:none;display:flex;align-items:center;justify-content:center">${svgSize(IC.trophy, 380)}</div></div>`;
    const upd = () => {
      const d = sdata(), st = d.stars || {};
      const list = roster().map(r => ({ r, n: st[r.sid] || 0 })).filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 10);
      $('#vn', el).textContent = SC.standalone ? '' : `${d.voters || 0} 人投了星`;
      $('#st', el).innerHTML = list.length ? list.map((x, i) => `<div class="srow ${x.r.team || ''}"><span class="rk">${i + 1}</span><b>${esc(x.r.name)}</b><span class="sv">${'★'.repeat(Math.min(x.n, 12))}</span><span class="sn">${x.n}</span></div>`).join('') : '<div class="sm">还没有人投星</div>';
    };
    upd(); return { upd };
  },

  showcase(s, L, el, X) {
    el.innerHTML = `<div class="row grow" style="gap:40px;align-items:stretch">
      <div class="col grow" style="gap:18px">${s.note ? `<div>${tagGreen(s.note)}</div>` : ''}<h2 class="t2" style="margin:0 0 4px">${esc(s.title)}</h2><div class="sentences">${s.lines.map((t, i) => `<div class="sentence"><div class="k" style="background:${L.color}">${i + 1}</div><span>${blanks(t)}</span></div>`).join('')}</div>
        <div id="prog" style="margin-top:auto"></div></div>
      <div class="card center" style="width:520px;gap:18px;flex:none"><div class="sm" style="font-size:32px">现在上台</div><div class="pickname" id="pn" style="font-size:90px;min-height:150px">?</div>
        ${SC.canCtl ? `<button class="btn" id="pk">${IC.dice} 下一位</button>` : ''}${SC.canCtl && s.applause ? `<button class="btn green" id="ap">掌声</button>` : ''}
        ${SC.canCtl && s.all ? `<div class="row" style="gap:10px"><button class="btn sm pa" data-t="o">${esc(tn('o'))}讲完 +3</button><button class="btn sm blue pa" data-t="b">${esc(tn('b'))}讲完 +3</button></div>` : ''}</div></div>`;
    const pk = $('#pk', el); if (pk) pk.onclick = () => X.ctl({ type: 'present.next' });
    const ap = $('#ap', el); if (ap) ap.onclick = () => X.ctl({ type: 'cue', n: 'applause' });
    $$('.pa', el).forEach(b => b.onclick = () => X.ctl({ type: 'present.award', t: b.dataset.t }));
    let last = null;
    const upd = () => {
      const p = (sdata().present) || { done: [] };
      const cur = p.cur ? roster().find(r => r.sid === p.cur) : null;
      if (cur && cur.sid !== last) { last = cur.sid; $('#pn', el).textContent = cur.name; }
      if (s.all) $('#prog', el).innerHTML = ['o', 'b'].map(t => { const ms = roster().filter(r => r.team === t); return progressRow(`${esc(tn(t))}讲完`, t, ms.filter(r => p.done.includes(r.sid)).length, ms.length); }).join('');
    };
    upd();
    return { upd, cue(c, replay) { if (c.n === 'applause' && !replay) { Snd.applause(); confetti(50); } } };
  },

  wanted(s, L, el, X) {
    el.innerHTML = `<h2 class="t2">${esc(s.title)}</h2><div class="row grow" style="gap:28px;min-height:0">${s.bugs.map((b, i) => `
      <div class="poster covered" data-i="${i}"><div class="ttl">通 缉 令</div>${svgSize(bugSVG(b.k), 210)}<div class="bn">${esc(b.n)}</div><div class="ds">${esc(b.d)}</div><div class="reward">${svgSize(IC.bolt, 24)} 每队抓到一只 +3 能量</div><div class="caught">已抓获</div><div class="pcover">?</div></div>`).join('')}</div>`;
    if (SC.canCtl) $$('.poster', el).forEach(p => p.onclick = () => X.ctl({ type: 'cue', n: p.classList.contains('covered') ? 'reveal' : 'caught', a: +p.dataset.i }));
    return {
      cue(c, replay) {
        const p = $(`.poster[data-i="${c.a}"]`, el); if (!p) return;
        if (c.n === 'reveal') { p.classList.remove('covered'); if (!replay) Snd.pop(); }
        if (c.n === 'caught') { p.classList.remove('covered'); p.classList.toggle('got'); if (!replay && p.classList.contains('got')) { Snd.tada(); confetti(40); } }
      }
    };
  },

  trick(s, L, el, X) {
    el.innerHTML = `<div><span class="tag">两队挑战赛</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2></div>
      <div class="row grow" style="gap:30px;min-height:0;margin-top:14px;align-items:flex-start">
        <div style="width:440px;flex:none;display:flex;flex-direction:column;align-items:center;gap:10px">${svgSize(IC.trick, 360)}<div class="tag" id="phase" style="font-size:30px"></div></div>
        <div class="col grow" style="gap:12px;min-width:0">${s.steps.map((t, i) => `<div class="sentence" style="font-size:28px;padding:12px 20px"><div class="k" style="background:${L.color}">${i + 1}</div><span>${esc(t)}</span></div>`).join('')}
          <div class="card" style="padding:14px 22px"><div id="prog"></div></div>
          <div class="duel-act"><div class="bigtime" data-timer style="font-size:64px;margin:0 16px 0 0">--:--</div>
            ${SC.canCtl ? `<button class="btn sm" id="deal">发牌</button><button class="btn sm purple" id="swap">交换</button><button class="btn sm dwin" data-t="o">${esc(tn('o'))}赢 +2</button><button class="btn sm blue dwin" data-t="b">${esc(tn('b'))}赢 +2</button>` : ''}</div>
        </div></div>`;
    const dl = $('#deal', el); if (dl) dl.onclick = () => X.ctl({ type: 'trick.deal' });
    const sw = $('#swap', el); if (sw) sw.onclick = () => X.ctl({ type: 'balance.swap' });
    $$('.dwin', el).forEach(b => b.onclick = () => X.ctl({ type: 'duel.award', t: b.dataset.t }));
    const upd = () => {
      const d = sdata(), tr = d.trick || { fixed: { o: 0, b: 0 }, n: { o: 0, b: 0 } };
      $('#phase', el).textContent = { none: '老师还没发牌', deal: '已发牌：照卡上的话对精灵说', swap: '已交换：找出虫子，修好它' }[d.phase || 'none'];
      $('#prog', el).innerHTML = ['o', 'b'].map(t => progressRow(`${esc(tn(t))}修好了`, t, tr.fixed[t], tr.n[t])).join('');
    };
    upd(); return { upd };
  },

  dance(s, L, el, X) {
    const mode = s.mode;
    let seq = (s.seq || []).slice(), loops = 1, mood = '开心', token = { stop: true }, shown = mode === 'follow' ? seq : [];
    const right = mode === 'follow'
      ? (SC.canCtl ? `<div class="acts">${ACTS.map(a => `<button class="act" data-a="${a}">${a}</button>`).join('')}</div>` : '<div class="sm">孩子说动作，老师在老师端排</div>')
      : (SC.canCtl ? `<div style="font-size:30px;font-weight:900">对精灵说：</div>
        <div class="col" style="gap:12px">${s.moods.map(m => `<button class="spell" data-m="${m}">${IC.wand.replace('<svg', '<svg class="wand"')}<span>跳一段${m === '困了' ? '困困' : m}的舞</span></button>`).join('')}</div>
        <div class="row" style="gap:10px"><input class="say-in" id="sin" placeholder="把孩子说的话打在这里"><button class="btn sm" id="sgo">说</button></div>` : '<div class="chat" id="chat"></div>');
    el.innerHTML = `<div class="row" style="align-items:center;justify-content:space-between;margin-bottom:14px"><div>${s.badge ? `<span class="tag">${esc(s.badge)}</span>` : ''}
      <h2 class="t2" style="margin:${s.badge ? '10px' : '0'} 0 0">${esc(s.title)}</h2>${s.sub ? `<p class="lead" style="margin:4px 0 0;font-size:30px">${esc(s.sub)}</p>` : ''}</div>${mode === 'genie' ? '<span class="tag">精灵演示</span>' : ''}</div>
      <div class="row grow" style="gap:30px;min-height:0">
        <div class="dogstage" id="ds" style="width:560px;flex:none"><div class="floor"></div><div style="margin-bottom:56px">${bitEl(380, 'idle')}</div></div>
        <div class="col grow" style="min-height:0;gap:16px">
          <div style="font-size:28px;font-weight:900">动作顺序 <span class="term" style="font-size:22px">顺序 Sequence</span> <span class="term" style="font-size:22px">重复 = 循环 Loop</span></div>
          <div class="seq" id="seq"></div><div class="sm" id="reply" style="font-size:26px;min-height:34px"></div>
          ${right}
          <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:auto">
            <b style="font-size:28px">重复</b>${[1, 2, 3].map(n => `<button class="mood loopb" data-n="${n}" style="height:56px;font-size:26px">${n} 次</button>`).join('')}
            <span style="flex:1"></span>
            ${SC.canCtl && mode === 'follow' ? `<button class="btn ghost sm" id="clr">清空</button>` : ''}
            ${SC.canCtl ? `<button class="btn sm" id="play">${IC.play} 跳！</button>` : ''}
          </div>
        </div></div>`;
    const bit = $('#ds .bit', el);
    const drawLoops = () => $$('.loopb', el).forEach(x => x.style.background = +x.dataset.n === loops ? C.navy : '#C9B79A');
    const drawSeq = (now = -1) => { const box = $('#seq', el); box.innerHTML = shown.length ? shown.map((a, i) => `<div class="s ${i === now ? 'now' : ''}" data-i="${i}">${a}${SC.canCtl && mode === 'follow' ? ' <span style="opacity:.5">×</span>' : ''}</div>`).join('') : `<span class="ph">${mode === 'genie' ? '对精灵说一句，它会排好动作' : '点下面的动作卡，排出顺序'}</span>`; if (SC.canCtl && mode === 'follow') $$('.s', box).forEach(c => c.onclick = () => { const n = seq.slice(); n.splice(+c.dataset.i, 1); X.ctl({ type: 'cue', n: 'seq', a: { seq: n, loops } }); }); };
    const run = async (list, md) => { token.stop = true; await sleep(30); token = { stop: false }; const my = token; const full = []; for (let k = 0; k < loops; k++) full.push(...list); await playSeq(bit, full, md, i => drawSeq(i < 0 ? -1 : i % list.length), my); };
    drawSeq(); drawLoops();
    $$('.act', el).forEach(b => b.onclick = () => { if (seq.length >= 10) return; X.ctl({ type: 'cue', n: 'seq', a: { seq: seq.concat([b.dataset.a]), loops } }); });
    $$('[data-m]', el).forEach(b => b.onclick = () => SC.net.post('demo-dance', { mood: b.dataset.m }));
    const sgo = $('#sgo', el); if (sgo) { sgo.onclick = () => { const p = $('#sin', el).value.trim(); if (p) SC.net.post('demo-dance', { prompt: p }); $('#sin', el).value = ''; }; $('#sin', el).onkeydown = e => { if (e.key === 'Enter') sgo.onclick(); }; }
    $$('.loopb', el).forEach(b => b.onclick = () => { if (SC.canCtl) X.ctl({ type: 'cue', n: 'seq', a: { seq, loops: +b.dataset.n } }); });
    const clr = $('#clr', el); if (clr) clr.onclick = () => X.ctl({ type: 'cue', n: 'seq', a: { seq: [], loops } });
    const play = $('#play', el); if (play) play.onclick = () => X.ctl({ type: 'cue', n: 'play' });
    let ghost = null;
    return {
      async cue(c, replay) {
        if (c.n === 'seq') { seq = c.a.seq.slice(); loops = c.a.loops || 1; shown = seq; drawSeq(); drawLoops(); if (!replay) Snd.pop(); }
        if (c.n === 'danceThink' && !replay) { token.stop = true; if (ghost) ghost.remove(); ghost = await genieCast($('#ds', el), c.a.prompt, true); }
        if (c.n === 'dance') {
          if (ghost) { ghost.remove(); ghost = null; }
          seq = c.a.seq.slice(); mood = c.a.mood; loops = c.a.repeat || 1; shown = seq; drawSeq(); drawLoops();
          $('#reply', el).textContent = (c.a.prompt ? `「${c.a.prompt}」→ ` : `${c.a.mood}的舞 → `) + (c.a.reply || '');
          if (!replay) { if (!c.a.prompt) await genieCast($('#ds', el), `跳一段${c.a.mood}的舞`); run(seq, mood); }
        }
        if (c.n === 'play' && !replay && seq.length) run(seq, mood);
      },
      off() { token.stop = true; }
    };
  },

  countdown(s, L, el, X) {
    el.innerHTML = `<div class="center grow" style="gap:8px"><h2 class="t1" id="h">${esc(s.title)}</h2><p class="lead" id="sub">${esc(s.sub)}</p>
      <div class="bigq" id="n" style="font-size:260px;margin:10px 0">?</div><div id="dog" style="display:none;margin-top:100px">${bitEl(400, 'sleepy sitting')}</div>
      ${ctlBtn('go', IC.play + ' 开箱')}</div>`;
    let alive = true;
    const go = $('#go', el); if (go) go.onclick = () => X.ctl({ type: 'cue', n: 'open' });
    const showDog = () => { $('#n', el).style.display = 'none'; const d = $('#dog', el); d.style.display = 'block'; $('#sub', el).textContent = ''; $('.bit', d).className = 'bit idle say'; $('#h', el).textContent = s.done || '你好，我是比特'; if (go) go.style.display = 'none'; };
    return {
      async cue(c, replay) {
        if (c.n !== 'open') return;
        if (replay) return showDog();
        if (go) go.style.display = 'none'; const n = $('#n', el);
        for (const k of ['3', '2', '1']) { if (!alive) return; n.textContent = k; Snd.tick(); n.style.animation = 'none'; void n.offsetWidth; n.style.animation = 'bump .6s'; await sleep(1000); }
        n.style.display = 'none'; const d = $('#dog', el); d.style.display = 'block'; $('#sub', el).textContent = ''; await sleep(800);
        if (!alive) return; showDog(); Snd.bark(); confetti();
      },
      off() { alive = false; }
    };
  },

  groups(s, L, el, X) {
    el.innerHTML = `<div class="row" style="align-items:center;justify-content:space-between"><h2 class="t2" style="margin:0">${esc(s.title)}</h2><div class="row" style="gap:12px">${ctlBtn('mk', '分组')}${ctlBtn('rot', '换岗', 'purple')}</div></div>
      <div class="roles" style="margin-top:14px">${s.roles.map(r => `<div class="role" style="background:${C[r.c]};min-height:0;padding:20px 24px">${svgSize(IC[r.ic], 80)}<b style="font-size:38px">${esc(r.b)}</b><span style="font-size:26px">${esc(r.s)}</span></div>`).join('')}</div>
      <div class="glist row" id="gl" style="margin-top:18px;flex-wrap:wrap"></div>`;
    const mk = $('#mk', el); if (mk) mk.onclick = () => X.ctl({ type: 'groups.make', size: s.size || 3 });
    const rot = $('#rot', el); if (rot) rot.onclick = () => X.ctl({ type: 'groups.rotate' });
    const upd = () => {
      const g = sdata().groups || [];
      $('#gl', el).innerHTML = g.length ? g.map(x => `<div class="gitem ${x.team}" style="width:calc(33% - 12px)"><b>第 ${x.no} 组 · ${esc(x.dog)}</b><span class="sm" style="font-size:24px">${x.members.map(m => `${esc(m.name)}（${m.role}）`).join('、')}</span></div>`).join('') : `<div class="sm">${SC.standalone ? '单机模式：按纸质角色卡分组' : '老师点「分组」，每个人的平板会显示组号、角色和用哪台狗'}</div>`;
    };
    upd(); return { upd };
  },

  mood(s, L, el) {
    el.innerHTML = `<div class="row grow" style="align-items:center;gap:50px"><div class="grow"><h2 class="t1">${esc(s.title)}</h2><p class="lead">${esc(s.sub)}</p>
      <div class="moods" style="margin-top:30px">${MOOD_CARDS.map(m => `<span class="mood" style="background:${MOODS[m].c};display:flex;align-items:center">${m}</span>`).join('')}</div>
      <div class="glist" id="gl" style="margin-top:30px"></div></div>
      <div class="card center" style="width:520px;height:520px;gap:18px;flex:none"><div>${bitEl(320, 'idle')}</div><div style="font-size:90px;font-weight:900">?</div></div></div>`;
    const upd = () => { const g = sdata().groups || []; $('#gl', el).innerHTML = g.map(x => `<span class="jchip ${x.drawn ? 'on' : ''} ${x.team}">第 ${x.no} 组 ${x.drawn ? '已抽 ✓' : '还没抽'}</span>`).join(''); };
    upd(); return { upd };
  },

  stage(s, L, el, X) {
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:12px"><div><span class="tag">${esc(s.badge || '两队比拼')}</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2>${s.sub ? `<p class="lead" style="margin:4px 0 0;font-size:28px">${esc(s.sub)}</p>` : ''}</div><span class="tag" id="who" style="font-size:28px"></span></div>
      <div class="row grow" style="gap:24px;min-height:0">
        <div class="card" style="width:440px;flex:none;padding:20px 24px;display:flex;flex-direction:column;gap:10px;overflow:hidden"><div style="font-size:28px;font-weight:900" id="ct">口令表</div><div class="sm" id="cs" style="font-size:22px"></div><div class="ctab" id="ctab"></div></div>
        <div class="dogstage" id="ds" style="width:480px;flex:none"><div class="floor"></div><div style="margin-bottom:56px">${bitEl(300, 'idle')}</div><div class="dsays" id="dsay"></div></div>
        <div class="col grow" style="min-width:0;gap:12px"><div class="chat" id="chat" style="flex:1"></div>
          ${SC.canCtl ? `<div class="row" style="gap:10px"><input class="say-in" id="sin" placeholder="替台上的孩子打字"><button class="btn sm" id="sgo">说</button></div><div class="row" id="pick" style="gap:10px;flex-wrap:wrap"></div>` : ''}</div></div>`;
    const st = stageTalk(el, () => (sdata().stage || {}).card);
    stageInput(el, 'stage-chat');
    let lastSid;
    const upd = () => {
      const d = sdata(), g = d.stage, c = g && g.card, pk = $('#pick', el);
      if (pk) {
        const ps = d.performers || [];
        pk.innerHTML = (ps.length ? ps.map(x => `<button class="btn sm ${x.team === 'b' ? 'blue' : ''} ${x.done ? 'ghost' : ''}" data-sid="${x.sid}">${esc(x.name)}的${esc(x.dog || '狗')}</button>`).join('') : '<span class="sm">还没有人让狗上线</span>') + (g ? '<button class="btn sm ghost" data-sid="">请下台</button>' : '');
        $$('[data-sid]', pk).forEach(b => b.onclick = () => SC.net.post('stage-pick', { sid: b.dataset.sid || null }).then(r => { if (r && r.err) toast(r.err); }));
      }
      $('#who', el).textContent = g ? `台上：${g.name}的${g.dog || '狗'}` : '';
      $('#ct', el).textContent = c ? `${c.name || g.dog} 的口令表` : '口令表';
      $('#cs', el).textContent = c ? [c.identity, c.trait].filter(Boolean).join(' · ') : (SC.canCtl ? '点右下角的名字，请一只狗上台' : '等老师请一只狗上台');
      const sid = g ? g.sid + ':' + JSON.stringify((c && c.rules) || []) : null;   // 同一只狗改了口令表再上台，也要刷新
      if (sid !== lastSid) { lastSid = sid; $('#ctab', el).innerHTML = c ? ((c.rules || []).map((r, i) => `<div class="crow" data-r="${i}"><span class="w">「${esc(r.when)}」</span><span class="a">${r.do ? esc(r.do) : ''}${r.do && r.say ? ' · ' : ''}${r.say ? '说「' + esc(r.say) + '」' : ''}</span></div>`).join('') || '<div class="sm">这只狗还没有口令</div>') : ''; }
    };
    upd();
    return { upd, cue(k, replay) { if (k.n === 'stage') st.clear(); return st.cue(k, replay); }, off() { st.off(); } };
  },

  // ================= 第二季样课（第 13、21、22 节） =================
  // 纸片蛇：老师在大屏上一步一步走，孩子在格子纸上跟着摆
  snakeboard(s, L, el, X) {
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:12px"><div><span class="tag">平板扣下 · 两人一组摆纸片</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2><p class="lead" style="margin:4px 0 0;font-size:28px">${esc(s.sub || '')}</p></div><div class="bigtime" data-timer style="font-size:70px;margin:0">--:--</div></div>
      <div class="row grow" style="gap:44px;min-height:0;align-items:center">
        <div id="sg" style="width:470px;flex:none"></div>
        <div class="col grow" style="gap:18px;min-width:0">
          <div class="card" style="padding:20px 28px"><div class="sm" style="font-size:24px">蛇现在</div><div id="len" style="font-size:76px;font-weight:900;line-height:1.1"></div><div id="pos" class="sm" style="font-size:28px;font-weight:800"></div><div id="note" style="font-size:28px;font-weight:800;color:#18A87C;min-height:40px;margin-top:6px"></div></div>
          ${SC.canCtl ? `<div class="card" style="padding:16px 20px"><div class="row" style="gap:10px;flex-wrap:wrap">${['上', '下', '左', '右'].map(d => `<button class="btn" data-d="${d}">往${d}走</button>`).join('')}</div>
            <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:12px;align-items:center"><span class="sm" style="font-size:22px">下一步吃到：</span>${Object.keys(SNAKE_FOOD).map(f => `<button class="btn sm ghost" data-f="${f}">${SNAKE_FOOD[f].icon} ${f}</button>`).join('')}<button class="btn sm ghost" id="rs">${IC.redo} 重来</button></div></div>` : ''}
        </div></div>`;
    $$('[data-d]', el).forEach(b => b.onclick = () => X.ctl({ type: 'snake.step', d: b.dataset.d }));
    $$('[data-f]', el).forEach(b => b.onclick = () => { const cur = (sdata().snake || {}).food; X.ctl({ type: 'snake.food', food: cur === b.dataset.f ? null : b.dataset.f }); });
    const rs = $('#rs', el); if (rs) rs.onclick = () => X.ctl({ type: 'snake.reset' });
    let lastN = null;
    const upd = () => {
      const b = sdata().snake || { cells: s.init, n: 0 };
      const mark = {};
      if (b.n && b.added) mark[b.added.join(',')] = 'new';
      if (b.removed) mark[b.removed.join(',')] = 'gone';
      $('#sg', el).innerHTML = snakeGrid(s.size || 6, b.cells, { labels: s.labels, mark });
      $('#len', el).textContent = `${b.cells.length} 格长`;
      $('#pos', el).textContent = s.labels ? `头在第 ${b.cells[0][0]} 行第 ${b.cells[0][1]} 格` : '';
      const ate = b.ate && SNAKE_FOOD[b.ate];
      $('#note', el).textContent = b.food ? `下一步会吃到${b.food}${SNAKE_FOOD[b.food].icon}`
        : !b.n ? '老师按方向，蛇走一步'
        : ate && ate.剪 ? `吃到${b.ate}${ate.icon}：尾巴剪掉 ${ate.剪} 格`
        : ate ? `吃到${b.ate}${ate.icon}：这一步尾巴不去掉${b.grow ? `，还要长 ${b.grow} 格` : ''}`
        : b.grow ? `还要长 ${b.grow} 格：这一步尾巴不去掉` : '前面加一格，尾巴去掉一格';
      $$('[data-f]', el).forEach(x => x.classList.toggle('dark', x.dataset.f === b.food));
      if (lastN != null && b.n !== lastN) Snd.tick();
      lastN = b.n;
    };
    upd(); return { upd };
  },

  // 蛇身预测赛：出题 → 孩子在平板上答 → 揭晓时一步一步走给大家看
  snakequiz(s, L, el, X) {
    const ASK = { len: '走完以后，蛇有几格长？', head: '走完以后，头在第几行第几格？', cells: '走完以后，蛇在哪几格？' };
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:12px"><div><span class="tag">${esc(s.badge || '两队比拼')}</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2><p class="lead" style="margin:4px 0 0;font-size:28px">${esc(s.sub || '')}</p></div><span class="tag" id="cnt" style="font-size:26px"></span></div>
      <div class="row grow" style="gap:40px;min-height:0;align-items:center">
        <div id="sg" style="width:470px;flex:none"></div>
        <div class="col grow" style="gap:16px;min-width:0;align-self:stretch;justify-content:center">
          <div class="card" style="padding:18px 26px"><div class="sm" style="font-size:24px" id="qn">等老师出题</div><div id="q" style="font-size:40px;font-weight:900;line-height:1.3"></div><div id="steps" class="sqsteps"></div></div>
          <div id="ans" style="font-size:38px;font-weight:900;color:#18A87C;min-height:50px"></div>
          <div id="res" class="row" style="gap:14px;flex-wrap:wrap"></div>
          ${SC.canCtl ? `<div class="row" style="gap:10px;flex-wrap:wrap">${s.rounds.map((r, i) => `<button class="btn sm ghost" data-r="${i}">第 ${i + 1} 题</button>`).join('')}<button class="btn sm green" id="rv">揭晓</button></div>` : ''}
        </div></div>`;
    $$('[data-r]', el).forEach(b => b.onclick = () => X.ctl({ type: 'sq.round', i: +b.dataset.r }));
    const rv = $('#rv', el); if (rv) rv.onclick = () => X.ctl({ type: 'sq.reveal' });
    let shown = '', token = { stop: true };
    const ansText = (r, a) => r.ask === 'len' ? `答案：${a} 格` : r.ask === 'head' ? `答案：第 ${a.split(',')[0]} 行第 ${a.split(',')[1]} 格` : `答案：蛇有 ${a.split('|').length} 格，看格子上的绿框`;
    const drawStep = (r, k) => { $('#steps', el).innerHTML = '口令：' + r.steps.map((st, j) => `<span class="${j < k ? 'done' : j === k ? 'now' : ''}">${esc(snakeStepText(st))}</span>`).join(' → '); };
    const showFinal = (r, q) => {
      const f = q.frames[q.frames.length - 1], mark = {};
      if (r.ask !== 'len') (r.ask === 'head' ? [q.answer] : q.answer.split('|')).forEach(k => { mark[k] = 'ans'; });
      $('#sg', el).innerHTML = snakeGrid(s.size || 6, f.cells, { labels: s.labels, mark });
      drawStep(r, r.steps.length); $('#ans', el).textContent = ansText(r, q.answer);
      $('#res', el).innerHTML = q.res ? ['o', 'b'].map(t => `<span class="tag ${t === 'b' ? 'blue' : ''}" style="font-size:24px">${esc(tn(t))} ${q.res[t].right}/${q.res[t].n} 答对${q.res[t].pass ? ' +1' : ''}</span>`).join('') : '';
    };
    const upd = async (v, mode) => {
      const q = sdata().sq;
      $$('[data-r]', el).forEach(b => b.classList.toggle('dark', !!(q && q.i === +b.dataset.r)));
      if (!q) { $('#sg', el).innerHTML = snakeGrid(s.size || 6, [], { labels: s.labels }); return; }
      const r = s.rounds[q.i];
      $('#qn', el).textContent = `第 ${q.i + 1} 题 · 开始时蛇有 ${r.start.length} 格`;
      $('#q', el).textContent = ASK[r.ask] || '';
      $('#cnt', el).textContent = q.revealed ? '' : `已答 ${q.answered} 人`;
      const key = q.i + ':' + q.revealed;
      if (key === shown) return;
      shown = key; token.stop = true;
      if (!q.revealed) { $('#sg', el).innerHTML = snakeGrid(s.size || 6, r.start, { labels: s.labels, food: q.foodCells }); drawStep(r, -1); $('#ans', el).textContent = ''; $('#res', el).innerHTML = ''; return; }
      if (mode === 'replay') return showFinal(r, q);
      const my = token = { stop: false };   // 一步一步走给大家看
      for (let k = 1; k < q.frames.length; k++) {
        await sleep(k === 1 ? 300 : 900); if (my.stop) return;
        const f = q.frames[k], mark = {};
        if (f.added) mark[f.added.join(',')] = 'new';
        if (f.removed) mark[f.removed.join(',')] = 'gone';
        $('#sg', el).innerHTML = snakeGrid(s.size || 6, f.cells, { labels: s.labels, mark }); drawStep(r, k - 1); Snd.tick();
      }
      await sleep(900); if (my.stop) return;
      showFinal(r, q); Snd.tada();
    };
    upd(null, 'replay');
    return { upd, off() { token.stop = true; } };
  },

  // 会说话的游戏角色：老师在大屏上演示（第 21、22 节）
  npcdemo(s, L, el, X) {
    const c = s.card || {}, gate = s.slot === 'gate';
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:12px"><div><h2 class="t2" style="margin:0">${esc(s.title)}</h2><p class="lead" style="margin:4px 0 0;font-size:28px">${esc(s.sub || '')}</p></div><span class="tag" id="flag">${gate ? '演示门卫' : '演示角色'}：${esc(c.name || '')}</span></div>
      <div class="row grow" style="gap:24px;min-height:0">
        <div id="scene" style="width:760px;flex:none">${npcScene(c, { kind: s.slot })}</div>
        <div class="col grow" style="min-width:0;gap:12px"><div class="chat" id="chat" style="flex:1"><div class="sm">${SC.canCtl ? '点下面的话，或者打孩子说的话' : '孩子说一句，它就回答'}</div></div>
          ${SC.canCtl ? `<div class="spellbar" style="max-height:220px">${(s.lines || []).map((p, i) => `<button class="spell" data-i="${i}"><span>${esc(p)}</span></button>`).join('')}</div><div class="row" style="gap:10px"><input class="say-in" id="sin" placeholder="打孩子说的话"><button class="btn sm" id="sgo">说</button></div>` : ''}</div></div>`;
    const say = t => { if (t) SC.net.post('npc-demo', { card: c, slot: s.slot, text: t }); };
    $$('.spell', el).forEach(b => b.onclick = () => { say(s.lines[+b.dataset.i]); b.classList.add('done'); });
    const sgo = $('#sgo', el); if (sgo) { sgo.onclick = () => { say($('#sin', el).value.trim()); $('#sin', el).value = ''; }; $('#sin', el).onkeydown = e => { if (e.key === 'Enter') sgo.onclick(); }; }
    const chat = $('#chat', el), bub = () => $('.nbub', el);
    return {
      cue(k, replay) {
        if (k.n === 'npcThink') { chat.insertAdjacentHTML('beforeend', `<div class="msg kid">${esc(k.a.q)}</div>`); chat.scrollTop = 1e6; if (!replay) bub().textContent = '……'; }
        if (k.n === 'npcSay') {
          const a = k.a;
          chat.insertAdjacentHTML('beforeend', `<div class="msg gn"><span style="font-size:34px">${esc(c.look || '🧙')}</span><span>${esc(a.a)}${a.open ? '<b class="npcflag ok">门开了</b>' : ''}${a.leaked ? '<b class="npcflag bad">口令漏出来了</b>' : ''}</span></div>`); chat.scrollTop = 1e6;
          bub().textContent = a.a;
          if (gate) $('.npcscene', el).classList.toggle('open', !!a.open);
          if (!replay && (a.open || a.leaked)) Snd.tada();
        }
      }
    };
  },

  // 写角色卡的时候：小镇 / 城门上，开张的角色一个个亮起来
  npcwork(s, L, el, X) {
    const gate = s.kind === 'gate';
    el.innerHTML = `<div class="row" style="align-items:center;gap:16px;margin-bottom:14px"><h2 class="t2" style="margin:0">${esc(s.title)}</h2><span class="tag">${esc(s.sub || '')}</span></div>
      <div class="row grow" style="gap:24px;min-height:0">
        <div class="col grow" style="min-width:0;gap:12px"><div style="font-size:30px;font-weight:900">${gate ? '城门口的门卫' : '小镇上的角色'} <span class="sm" id="pn"></span></div><div class="ntown ${gate ? 'gate' : ''}" id="tw"></div></div>
        <div class="col" style="width:420px;flex:none;gap:14px">${timerPanel()}<div class="card" style="padding:14px 20px"><div id="prog"></div></div></div></div>`;
    const upd = () => {
      const pubs = sdata().npcs || {}, r = roster();
      $('#pn', el).textContent = `${Object.keys(pubs).length}/${r.length} 已${gate ? '上岗' : '开张'}`;
      $('#tw', el).innerHTML = r.map(x => { const p = pubs[x.sid]; return p ? `<div class="ntile on ${x.team || ''}" data-sid="${x.sid}"><div class="face">${esc(p.look || (gate ? '💂' : '🧙'))}</div><b>${esc(p.name || '')}</b><small>${esc(x.name)}${gate ? '的门卫' : p.role ? ' · ' + esc(p.role) : ''}</small><small>${gate ? `${p.rules} 条规矩` : `知道 ${p.knows} 件事 · ${p.rules} 条规矩`}</small></div>` : `<div class="ntile ${x.team || ''}"><div class="face">🏗️</div><b>${gate ? '还没上岗' : '建造中'}</b><small>${esc(x.name)}</small></div>`; }).join('');
      const tk = sdata().tasks || {}, aw = sdata().awarded || {};
      $('#prog', el).innerHTML = ['o', 'b'].map(t => { const a = tk[t] || [0, 0, 0, r.filter(x => x.team === t).length]; return progressRow(`${esc(tn(t))} ★`, t, a[0], a[3]) + (aw[t] ? '<span class="tag" style="margin-left:8px">已加 3 分</span>' : ''); }).join('');
    };
    upd();
    return { upd, cue(k, replay) { if (k.n === 'npcPub' && !replay) { Snd.pop(); const n = $(`.ntile[data-sid="${k.a.sid}"]`, el); bumpEl(n); } } };
  },

  // 攻门赛：两队的门，被攻破的亮红；右边是"怎么被骗开的"
  gate(s, L, el, X) {
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between;margin-bottom:12px"><div><span class="tag">${esc(s.badge || '两队比拼')}</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2><p class="lead" style="margin:4px 0 0;font-size:28px" id="ph"></p></div><div class="bigtime" data-timer style="font-size:70px;margin:0">--:--</div></div>
      <div class="row grow" style="gap:24px;min-height:0">
        <div class="gboard grow" id="gb"></div>
        <div class="col" style="width:540px;flex:none;gap:12px;min-height:0"><div class="card" style="padding:14px 20px;font-size:26px;font-weight:800" id="sc"></div>
          <div style="font-size:26px;font-weight:900">怎么被攻破的</div><div class="chat" id="feed" style="flex:1"></div>
          ${SC.canCtl ? '<div class="row" style="gap:10px"><button class="btn sm" id="go"></button><button class="btn sm purple" id="fx">停，加固规矩</button></div>' : ''}</div></div>`;
    const go = $('#go', el); if (go) go.onclick = () => X.ctl({ type: 'gate.round' });
    const fx = $('#fx', el); if (fx) fx.onclick = () => X.ctl({ type: 'gate.fix' });
    const upd = () => {
      const g = sdata().gate || { round: 0, phase: 'ready', gates: [], breaches: [] };
      $('#ph', el).textContent = g.phase === 'attack' ? `第 ${g.round} 轮攻门：去攻平板上分到的那扇门` : g.phase === 'fix' ? `加固时间：看看你的门是怎么被攻破的，补上规矩（也可以换口令）` : (s.sub || '');
      if (go) go.textContent = g.round ? `开始第 ${g.round + 1} 轮` : '开始攻门';
      if (fx) fx.disabled = g.phase !== 'attack';
      const now = g.breaches.filter(b => b.round === g.round);
      $('#gb', el).innerHTML = ['o', 'b'].map(t => `<div class="gcol ${t}"><div class="gh">${esc(tn(t))}的门</div>${g.gates.filter(x => x.team === t).map(x => { const n = now.filter(b => b.owner === x.sid).length; return `<div class="gtile ${n ? 'broken' : g.round ? 'held' : ''}" data-sid="${x.sid}"><span class="face">${esc(x.look || '💂')}</span><b>${esc(x.dog || '')}</b><small>${esc(x.name)}</small><em>${n ? `被攻破 ×${n}` : g.round ? '守住了' : '待命'}</em></div>`; }).join('') || '<p class="sm">还没有门卫上岗</p>'}</div>`).join('');
      const rounds = [...new Set(g.breaches.map(b => b.round))].sort();
      $('#sc', el).innerHTML = g.round ? Array.from({ length: g.round }, (_, i) => `第 ${i + 1} 轮：被攻破 <b style="color:#E5484D">${g.breaches.filter(b => b.round === i + 1).length}</b> 次`).join('<br>') : '每攻破一扇门，攻门的队 +1';
      $('#feed', el).innerHTML = g.breaches.slice(-8).reverse().map(b => `<div class="msg kid" style="align-self:stretch">${esc(b.byName)}：「${esc(b.text)}」</div><div class="msg gn" style="align-self:stretch">💥 ${esc(b.ownerName)}的门卫被${esc(b.how)}（第 ${b.round} 轮）</div>`).join('') || '<div class="sm">还没有门被攻破</div>';
    };
    upd();
    return { upd, cue(k, replay) { if (k.n === 'breach' && !replay) { Snd.tada(); bumpEl($('#feed', el)); } } };
  },

  guessmood(s, L, el, X) {
    const opts = s.opts || MOOD_CARDS, persona = s.kind === 'persona';
    const pal = [C.orange, C.blue, C.green, C.purple, C.pink, C.red || '#E5484D'];
    const colOf = (m, i) => (MOODS[m] && !persona ? MOODS[m].c : pal[i % pal.length]);
    el.innerHTML = `<div class="row" style="align-items:flex-end;justify-content:space-between"><div><span class="tag">两队比拼</span><h2 class="t2" style="margin:10px 0 0">${esc(s.title)}</h2><p class="lead" style="margin:4px 0 0;font-size:30px">${esc(s.sub)}</p></div><span class="tag" id="gn" style="font-size:28px"></span></div>
      <div class="row grow" style="gap:30px;min-height:0;margin-top:16px">
        <div class="card center" style="width:500px;flex:none;gap:14px"><div class="sm" style="font-size:30px">${persona ? '正在聊天' : '正在表演'}</div><div style="font-size:84px;font-weight:900" id="pg">?</div>${s.own ? `<div class="dogstage" id="ds" style="align-self:stretch;height:280px"><div class="floor"></div><div style="margin-bottom:40px">${bitEl(200, 'idle')}</div><div class="dsays" id="dsay"></div></div>` : ''}<div id="mood" style="font-size:60px;font-weight:900"></div>${ctlBtn('rv', '揭晓', 'green')}</div>
        <div class="col grow" style="gap:14px;min-height:0"><div class="opts" style="grid-template-columns:${opts.length > 4 ? '1fr 1fr 1fr' : '1fr 1fr'};gap:18px">${opts.map((m, i) => `<div class="opt" data-m="${esc(m)}" style="padding:${s.own ? '10px 18px' : '18px 22px'};font-size:30px"><div class="L" style="background:${colOf(m, i)};font-size:${m.length > 3 ? 24 : 30}px;width:${m.length > 3 ? 150 : 120}px;height:${s.own ? 56 : 72}px">${esc(m)}</div><span class="grow"></span><b class="cnt"></b></div>`).join('')}</div>
          ${s.own ? '<div class="chat" id="chat" style="flex:1;min-height:0"></div>' : ''}
          <div id="res" class="row" style="gap:16px;justify-content:center"></div>
          ${s.own && SC.canCtl ? '<div class="row" style="gap:10px"><input class="say-in" id="sin" placeholder="打大家问它的话（孩子也可以在平板上问）"><button class="btn sm" id="sgo">问</button></div>' : ''}
          ${SC.canCtl ? `<div class="row" id="pick" style="gap:10px;flex-wrap:wrap;${s.own ? '' : 'margin-top:auto'}"></div>` : ''}</div></div>`;
    const rv = $('#rv', el); if (rv) rv.onclick = () => X.ctl({ type: 'mood.reveal' });
    const st = s.own ? stageTalk(el, () => null) : null;
    if (st) stageInput(el, 'stage-chat');
    let lastKey = '';
    const upd = (v, mode) => {
      const d = sdata(), p = d.perform, g = d.groups || [];
      const pk = $('#pick', el);
      if (pk && s.own) { const ps = d.performers || []; pk.innerHTML = ps.length ? ps.map(x => `<button class="btn sm ${x.team === 'b' ? 'blue' : ''} ${x.done ? 'ghost' : ''}" data-sid="${x.sid}">${esc(x.name)}的${esc(x.dog || '狗')}</button>`).join('') : '<span class="sm">还没有人发角色卡</span>'; $$('[data-sid]', pk).forEach(b => b.onclick = () => X.ctl({ type: 'mood.perform', sid: b.dataset.sid })); }
      else if (pk) { pk.innerHTML = g.map(x => `<button class="btn sm ${x.team === 'b' ? 'blue' : ''}" data-g="${x.id}" ${persona && !x.persona ? 'disabled title="这组还没发角色卡"' : ''}>第 ${x.no} 组${persona ? '' : '表演'}</button>`).join(''); $$('[data-g]', pk).forEach(b => b.onclick = () => X.ctl({ type: 'mood.perform', gid: b.dataset.g })); }
      if (!p) { $('#pg', el).textContent = '?'; $('#gn', el).textContent = ''; return; }
      $('#pg', el).textContent = p.sid ? (p.dog || p.name + '的狗') : `第 ${p.no} 组`; $('#pg', el).style.fontSize = p.sid ? '72px' : ''; $('#gn', el).textContent = `已猜 ${p.answered} 人${p.sid ? ' · 主人：' + p.name : ''}`;
      const key = p.gid + ':' + p.revealed;
      $$('.opt', el).forEach(x => { x.classList.toggle('right', !!(p.revealed && x.dataset.m === p.mood)); x.classList.toggle('dim', !!(p.revealed && x.dataset.m !== p.mood)); $('.cnt', x).textContent = p.revealed && p.counts ? p.counts[opts.indexOf(x.dataset.m)] + ' 人' : ''; });
      const mi = opts.indexOf(p.mood);
      $('#mood', el).textContent = p.revealed ? p.mood || '（没发角色卡）' : ''; $('#mood', el).style.color = p.revealed && p.mood ? colOf(p.mood, mi < 0 ? 0 : mi) : '';
      $('#res', el).innerHTML = p.revealed && p.n ? `<span class="tag" style="font-size:28px">${p.right}/${p.n} 人猜对</span>` : '';
      if (p.revealed && key !== lastKey && mode !== 'replay') Snd.tada();
      lastKey = key;
    };
    upd(null, 'replay');
    if (!st) return { upd };
    return { upd, cue(k, replay) { if (k.n === 'perform') st.clear(); return st.cue(k, replay); }, off() { st.off(); } };
  },

  import(s, L, el) {
    el.innerHTML = `<h2 class="t2">${esc(s.title)}</h2><p class="lead" style="margin-top:0">${esc(s.sub)}</p>
      <div class="agenda">${[['我的新游戏', '在家用平台做的，打开就在'], ['导入', '用别的工具做的：粘贴代码，或选文件'], ['从头开始', '没做完也没关系：从跑酷或抓虫子开始改']].map((x, i) => `<div class="it"><div class="k" style="background:${[C.orange, C.blue, C.green][i]}">${i + 1}</div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div>
      <div class="center" style="margin-top:20px">${svgSize(IC.tablet, 220)}</div>`;
  },

  speech(s, L, el) {
    el.innerHTML = `<div class="row grow" style="gap:40px;align-items:center"><div class="col grow" style="gap:18px"><h2 class="t2" style="margin:0 0 4px">${esc(s.title)}</h2>
      <div class="sentences">${s.lines.map((t, i) => `<div class="sentence"><div class="k" style="background:${L.color}">${i + 1}</div><span>${esc(t)}</span></div>`).join('')}</div>
      <p class="lead" style="font-size:30px">在平板上写下答案，再对同桌讲一遍</p></div>
      <div class="timerpanel" style="width:420px;height:420px"><div class="lbl">同桌互练</div><div class="big" data-timer>--:--</div></div></div>`;
  },

  beat(s, L, el, X) {
    el.innerHTML = `<div class="row grow" style="gap:40px;align-items:center"><div class="dogstage" style="width:860px;height:600px;flex:none"><div class="floor"></div>
      <div style="display:flex;gap:6px;align-items:flex-end;margin-bottom:46px">${[230, 300, 230].map(w => `<div class="dd">${bitEl(w, 'idle')}</div>`).join('')}</div></div>
      <div class="col grow"><h2 class="t1">${esc(s.title)}</h2><p class="lead">${esc(s.sub)}</p>
      <div style="display:flex;gap:16px;margin-top:24px">${ctlBtn('go', IC.play + ' 音乐响起来')}${ctlBtn('st', IC.pause + ' 停', 'ghost')}</div></div></div>`;
    let token = { stop: true };
    const dance = async my => { const bits = $$('.dd .bit', el); while (!my.stop) { const sq = pick([MOODS.开心.seq, MOODS.欢迎.seq]); await Promise.all(bits.map((b, i) => playSeq(b, i === 1 ? sq : sq.slice().reverse(), '开心', null, my))); } };
    const go = $('#go', el); if (go) go.onclick = () => X.ctl({ type: 'cue', n: 'music', a: true });
    const st = $('#st', el); if (st) st.onclick = () => X.ctl({ type: 'cue', n: 'music', a: false });
    return {
      cue(c, replay) { if (c.n !== 'music' || replay) return; token.stop = true; Snd.beatOff(); if (c.a) { token = { stop: false }; Snd.beatOn(120); dance(token); } },
      off() { token.stop = true; Snd.beatOff(); }
    };
  },

  result(s, L, el, X) {
    const pts = () => s.pack ? packPts(s.pack) : curPts();
    const card = t => `<div class="rteam ${t}" id="r${t}"><div class="crown">${svgSize(IC.crown, 120, 90)}</div>
        <div class="rn">${esc(tn(t))}</div><div class="rp">${svgSize(IC.bolt, 70)}<b id="rp${t}">0</b></div>
        <div class="rm">${esc(roster().filter(r => r.team === t).map(r => r.name).join('、'))}</div></div>`;
    el.innerHTML = `<div class="center" style="gap:4px"><div class="kicker" style="color:${L.color}">${esc(s.kicker || L.no + ' 结算')}</div>
      <h2 class="t1" id="rh" style="font-size:60px">${esc(s.pack ? '谁是' + (s.champ || '总冠军') + '？' : '这节课，哪队的能量多？')}</h2>${s.pack ? `<div class="sm" style="font-size:26px">${esc(s.packLabel || '')}</div>` : ''}</div>
      <div class="row" style="gap:40px;justify-content:center;margin-top:60px">${card('o')}${card('b')}</div>
      <div class="center" style="margin-top:22px;gap:12px">${ctlBtn('go', svgSize(IC.crown, 40, 30) + ' 公布结果')}
        <div id="reward" class="reward" style="display:none"></div>
        <div class="sm" style="font-size:28px">${esc(s.everyone)}</div></div>`;
    const upd = () => { const p = pts(); $('#rpo', el).textContent = p.o; $('#rpb', el).textContent = p.b; ['o', 'b'].forEach(t => { const m = $(`#r${t} .rm`, el); if (m) m.textContent = roster().filter(r => r.team === t).map(r => r.name).join('、'); }); };
    const go = $('#go', el); if (go) go.onclick = () => X.ctl({ type: 'cue', n: 'result' });
    upd();
    return {
      upd, cue(c, replay) {
        if (c.n !== 'result') return;
        upd(); const p = pts(), w = p.o === p.b ? 'tie' : (p.o > p.b ? 'o' : 'b');
        $$('.rteam', el).forEach(x => x.classList.remove('winner', 'tie'));
        if (w === 'tie') { $$('.rteam', el).forEach(x => x.classList.add('tie')); $('#rh', el).textContent = '平局！两队一样强'; }
        else { $('#r' + w, el).classList.add('winner'); $('#rh', el).textContent = (s.pack ? (s.champ || '总冠军') + '：' : '本节获胜：') + tn(w); }
        const r = $('#reward', el); r.style.display = 'flex';
        r.innerHTML = `${svgSize(IC.star, 44)}<span>${w === 'tie' ? '两队全员都获得：' : esc(tn(w)) + ' 全队每人获得：'}${esc(s.reward)}</span>`;
        if (go) go.style.display = 'none';
        if (!replay) { Snd.tada(); confetti(s.pack ? 160 : 90); if (s.pack) setTimeout(() => confetti(100), 900); }
      }
    };
  },

  agenda(s, L, el) {
    const cols = [C.orange, C.blue, C.green, C.purple, C.pink];
    el.innerHTML = `<h2 class="t2">${esc(s.title)}</h2><div class="agenda">${s.items.map((it, i) => `<div class="it"><div class="k" style="background:${cols[i % 5]}">${i + 1}</div><b>${esc(it.b)}</b><span>${esc(it.s)}</span></div>`).join('')}</div>
      <div class="center" style="margin-top:20px">${bitEl(300, 'idle')}</div>`;
  },

  teaser(s, L, el) {
    el.innerHTML = `<div class="row grow" style="align-items:center;gap:50px"><div class="grow"><span class="tag" style="font-size:30px">下一站</span><h2 class="t1" style="margin:18px 0">${esc(s.title)}</h2><p class="lead" style="font-size:44px">${esc(s.sub)}</p></div>
      <div style="position:relative;width:540px;flex:none">${bitEl(500, 'idle shy')}<svg viewBox="0 0 64 64" style="position:absolute;right:0;top:-40px;width:120px"><path d="M32 56S6 40 6 22a13 13 0 0 1 26-4 13 13 0 0 1 26 4c0 18-26 34-26 34z" fill="#FF6FA5"/></svg></div></div>`;
  }
};

function dogLabel(a) { return a.dog && a.owner && !a.dog.startsWith(a.owner) ? a.owner + '的' + a.dog : (a.dog || (a.owner || '') + '的狗'); }
function speakScreen(text, voice) {
  try {
    if (!window.speechSynthesis || !text || window.__MUTE) return;
    const vp = (typeof VOICES !== 'undefined' && VOICES[voice]) || { pitch: 1.3, rate: 1 };
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).slice(0, 160)); u.lang = 'zh-CN'; u.pitch = vp.pitch; u.rate = vp.rate;
    const zh = (speechSynthesis.getVoices() || []).find(x => /zh[-_]CN/i.test(x.lang)); if (zh) u.voice = zh;
    speechSynthesis.speak(u);
  } catch (e) { }
}
function drawBubbles(box, items, empty) {
  if (!box) return;
  if (!items.length) { box.innerHTML = `<div class="sm" style="margin:auto">${esc(empty)}</div>`; box.dataset.n = 0; return; }
  const have = new Set($$('.bub', box).map(b => b.dataset.id));
  if (!box.dataset.n || +box.dataset.n === 0) box.innerHTML = '';
  items.slice(-40).forEach((it, i) => { if (!have.has(it.id)) { box.insertAdjacentHTML('beforeend', bubbleHTML(it, i)); if (box.dataset.n > 0) Snd.pop(); } });
  const ids = new Set(items.map(x => x.id)); $$('.bub', box).forEach(b => { if (!ids.has(b.dataset.id)) b.remove(); });
  box.dataset.n = items.length;
}
