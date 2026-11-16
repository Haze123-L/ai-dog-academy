// ================= 课堂状态核心 =================
// 一节课里所有人看到的东西都从这里来：老师端发指令，学生端发操作，大屏只看。
// 不依赖浏览器也不依赖 Node：服务器（server.js）用它，在线试玩版也直接在浏览器里跑它。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ClassCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const TEAMS = ['o', 'b'];
  const clone = o => JSON.parse(JSON.stringify(o));

  function fresh() {
    return {
      v: 2,
      cls: { teamNames: { o: '橙队', b: '蓝队' }, roster: [], needCode: false, dogs: {} },
      live: { lesson: null, slide: 0, cues: [], quiet: false, sleep: false, turn: null, timer: { total: 0, left: 0, endsAt: 0, running: false }, pick: null, spot: null, flash: null, seq: 0 },
      pts: {},
      sd: {},
      picked: []
    };
  }

  function create(opts) {
    const lessons = opts.lessons || [];
    const now = opts.now || (() => Date.now());
    const rand = opts.rand || Math.random;
    const S = opts.saved && opts.saved.v === 2 ? opts.saved : fresh();
    S.cls.dogs = S.cls.dogs || {};   // 孩子给自己的狗起的名字（第 9、10 节起），整个季度都在
    const online = {};           // sid -> 连接数（不存盘）
    const subs = new Set();
    let ver = 0;

    // ---------- 小工具 ----------
    const rid = (n = 6) => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.floor(rand() * a.length)]; return s; };
    const code4 = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(rand() * a.length)]; return s; };
    const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const lessonOf = id => lessons.find(L => L.id === id) || null;
    const curLesson = () => lessonOf(S.live.lesson);
    const curSlide = () => { const L = curLesson(); return L ? L.slides[S.live.slide] || null : null; };
    const keyOf = (lid, sid) => lid + '/' + sid;
    const curKey = () => { const s = curSlide(); return s ? keyOf(S.live.lesson, s.id) : null; };
    const sd = (k, init) => { if (!S.sd[k]) S.sd[k] = init(); return S.sd[k]; };
    const stu = sid => S.cls.roster.find(r => r.sid === sid) || null;
    const members = t => S.cls.roster.filter(r => r.team === t);
    const nameOf = sid => { const r = stu(sid); return r ? r.name : ''; };
    const teamName = t => S.cls.teamNames[t] || (t === 'o' ? '橙队' : '蓝队');
    const lp = lid => { if (!S.pts[lid]) S.pts[lid] = { o: 0, b: 0 }; return S.pts[lid]; };
    function addPts(t, d, why, lid) {
      if (!TEAMS.includes(t)) return;
      lid = lid || S.live.lesson; if (!lid) return;
      const p = lp(lid); p[t] = Math.max(0, p[t] + d);
      if (why) flash(`${teamName(t)} ${d > 0 ? '+' : ''}${d}：${why}`, t);
    }
    function flash(text, t) { S.live.flash = { text, team: t || null, at: now(), id: ++S.live.seq }; }
    function cue(n, a) { S.live.cues.push({ n, a: a === undefined ? null : a, at: now(), id: ++S.live.seq }); }
    function changed() { ver++; subs.forEach(f => { try { f(ver); } catch (e) { } }); }

    // ---------- 计时器 ----------
    function timerLeft() { const t = S.live.timer; return t.running ? Math.max(0, (t.endsAt - now()) / 1000) : t.left; }
    function tick() {   // 服务器每秒调一次：时间到就停，休息结束就解锁
      const t = S.live.timer;
      if (t.running && now() >= t.endsAt) { t.running = false; t.left = 0; t.total = 0; t.endsAt = 0; if (t.rest) { t.rest = false; } S.live.timesUp = { at: now(), id: ++S.live.seq }; changed(); }
    }

    // ---------- 加入 ----------
    function join(name, code) {
      name = String(name || '').trim().slice(0, 12);
      if (!name) return { err: '请输入名字' };
      let r = S.cls.roster.find(x => x.name === name);
      if (S.cls.needCode) { if (!r || String(code || '').toUpperCase() !== r.code) return { err: '登录码不对' }; }
      if (!r) {
        r = { sid: rid(), name, team: null, code: code4(), tok: rid(16) };
        const drawn = S.cls.roster.some(x => x.team);
        if (drawn) { const no = members('o').length, nb = members('b').length; r.team = no <= nb ? 'o' : 'b'; }
        S.cls.roster.push(r);
      }
      changed();
      return { sid: r.sid, tok: r.tok, name: r.name };
    }
    const auth = tok => { const r = S.cls.roster.find(x => x.tok === tok); return r ? r.sid : null; };
    function setOnline(sid, d) { online[sid] = Math.max(0, (online[sid] || 0) + d); changed(); }

    // ---------- 当前页的数据 ----------
    function slideData(k) { return S.sd[k] || null; }
    const quizMajority = (answers, t, ok) => {
      const ms = members(t).map(r => r.sid).filter(s => answers[s] != null);
      if (!ms.length) return { n: 0, right: 0, pass: false };
      const right = ms.filter(s => ok(answers[s])).length;
      return { n: ms.length, right, pass: right * 2 > ms.length };
    };
    const groupsOf = lid => (S.sd[keyOf(lid, 'groups')] || {}).list || [];
    const myGroup = (lid, sid) => groupsOf(lid).find(g => g.members.includes(sid)) || null;
    const roleOf = (g, sid) => { if (!g) return null; const i = g.members.indexOf(sid); const k = (i + (g.rot || 0)) % 3; return ['设计师', '测试员', '安全员'][k]; };

    // ---------- 第二季：贪吃蛇（和游戏里一样：前面加一格；吃到东西；去掉尾巴，还要长时这一步不去） ----------
    const SNAKE_DIRS = { 上: [-1, 0], 下: [1, 0], 左: [0, -1], 右: [0, 1] };
    const SNAKE_FOOD_FX = { 苹果: { 长: 1 }, 金苹果: { 长: 3 }, 剪刀: { 剪: 2 } };
    function snakeStep(cells, grow, st) {
      const d = SNAKE_DIRS[st.d] || [0, 0], h = cells[0];
      const c = [[h[0] + d[0], h[1] + d[1]]].concat(cells.map(x => x.slice()));
      const f = SNAKE_FOOD_FX[st.food] || {};
      grow += f.长 || 0;
      for (let i = 0; i < (f.剪 || 0) && c.length > 3; i++) c.pop();
      let removed = null;
      if (grow > 0) grow--; else removed = c.pop();
      return { cells: c, grow, added: c[0], removed };
    }
    function snakeRun(round) {   // 一轮预测赛：从开始走完每一步，返回每一步的样子
      let cur = { cells: round.start.map(x => x.slice()), grow: 0, added: null, removed: null };
      const frames = [cur];
      (round.steps || []).forEach(st => { cur = snakeStep(cur.cells, cur.grow, st); frames.push(cur); });
      return frames;
    }
    const cellKey = x => x[0] + ',' + x[1];
    function snakeAnswer(round) {
      const end = snakeRun(round).slice(-1)[0].cells;
      if (round.ask === 'len') return String(end.length);
      if (round.ask === 'head') return cellKey(end[0]);
      return end.map(cellKey).sort().join('|');
    }
    function snakeFoodCells(round) {   // 预测题上要画出食物：吃到东西的那一步，头走到的格子
      const out = {}; let cur = { cells: round.start, grow: 0 };
      (round.steps || []).forEach(st => { const nx = snakeStep(cur.cells, cur.grow, st); if (st.food) out[cellKey(nx.added)] = st.food; cur = nx; });
      return out;
    }

    // ---------- 老师的指令 ----------
    const T = {
      go({ lesson, slide }) {
        if (lesson !== undefined) S.live.lesson = lesson;
        const L = curLesson(); S.live.slide = L ? Math.max(0, Math.min(L.slides.length - 1, slide | 0)) : 0;
        S.live.cues = []; S.live.spot = null; S.live.pick = null; S.live.demoErr = null;
        if (S.live.timer.rest) { S.live.timer = { total: 0, left: 0, endsAt: 0, running: false }; }
      },
      cue({ n, a }) { cue(n, a); },
      quiet({ on }) { S.live.quiet = !!on; },
      'dogs.sleep'({ on }) { S.live.sleep = !!on; },   // 全体趴下：真狗回窝趴下，平板和大屏显示趴下的比特
      turn({ t }) { S.live.turn = TEAMS.includes(t) ? t : null; },   // 轮流开口：只有这一队跟狗说话
      'dog.clear'({ sid }) { delete S.cls.dogs[sid]; },
      'timer.start'({ sec, rest }) { sec = Math.max(1, sec | 0); S.live.timer = { total: sec, left: sec, endsAt: now() + sec * 1000, running: true, rest: !!rest }; },
      'timer.toggle'() { const t = S.live.timer; if (t.total <= 0) return; if (t.running) { t.left = timerLeft(); t.running = false; } else if (t.left > 0) { t.endsAt = now() + t.left * 1000; t.running = true; } },
      'timer.add'({ sec }) { const t = S.live.timer; if (t.total <= 0) return; if (t.running) t.endsAt += sec * 1000; else t.left += sec; t.total += sec; },
      'timer.stop'() { S.live.timer = { total: 0, left: 0, endsAt: 0, running: false }; },
      pick() {
        let pool = S.cls.roster.filter(r => !S.picked.includes(r.sid));
        if (!pool.length) { S.picked = []; pool = S.cls.roster.slice(); }
        if (!pool.length) return;
        const r = pool[Math.floor(rand() * pool.length)]; S.picked.push(r.sid);
        S.live.pick = { sid: r.sid, name: r.name, at: now(), id: ++S.live.seq };
      },
      'pick.clear'() { S.live.pick = null; },
      'pts.add'({ t, d }) { addPts(t, d | 0); },
      'pts.reset'() { S.pts = {}; },
      'teams.draw'() {
        const sh = shuffle(S.cls.roster);
        sh.forEach((r, i) => r.team = TEAMS[i % 2]);
        cue('teamsDrawn', sh.map(r => r.sid));
      },
      'teams.name'({ t, name }) { if (TEAMS.includes(t)) S.cls.teamNames[t] = String(name || '').trim().slice(0, 6) || (t === 'o' ? '橙队' : '蓝队'); },
      'teams.set'({ sid, team }) { const r = stu(sid); if (r && (team === null || TEAMS.includes(team))) r.team = team; },
      'roster.set'({ names }) {
        const list = (names || []).map(s => String(s).trim().slice(0, 12)).filter(Boolean);
        const keep = S.cls.roster.filter(r => list.includes(r.name));
        list.forEach(n => { if (!keep.find(r => r.name === n)) keep.push({ sid: rid(), name: n, team: null, code: code4(), tok: rid(16) }); });
        keep.sort((a, b) => list.indexOf(a.name) - list.indexOf(b.name));
        S.cls.roster = keep;
      },
      'roster.remove'({ sid }) { S.cls.roster = S.cls.roster.filter(r => r.sid !== sid); },
      'roster.needCode'({ on }) { S.cls.needCode = !!on; },
      'hand.clear'({ sid }) { const r = stu(sid); if (r) r.hand = false; },
      spot({ sid, proj, show }) { S.live.spot = sid ? { sid, name: nameOf(sid), proj: proj || null, show: show || 'game', at: now(), id: ++S.live.seq } : null; },
      'quiz.reveal'() {
        const s = curSlide(), k = curKey(); if (!s || !k) return;
        const q = sd(k, () => ({ ans: {}, revealed: false }));
        if (q.revealed) return; q.revealed = true;
        if (s.ans == null) return;
        const res = {};
        TEAMS.forEach(t => { res[t] = quizMajority(q.ans, t, v => v === s.ans); if (res[t].pass) addPts(t, 1, `过半答对（${res[t].right}/${res[t].n}）`); });
        q.res = res; cue('reveal');
      },
      'quiz.reset'() { const k = curKey(); if (k) S.sd[k] = { ans: {}, revealed: false }; cue('reset'); },
      'guess.event'({ i }) {   // 变量实验：选一个道具，开始猜
        const s = curSlide(), k = curKey(); if (!s || s.type !== 'boxes') return;
        const g = sd(k, () => ({ vals: Object.assign({}, s.init), round: 0 }));
        if (g.pend && !g.pend.revealed) { g.vals[g.pend.k] = g.pend.to; }
        const e = s.events[i]; if (!e) return;
        const from = g.vals[e.k], to = e.k === '时间' ? Math.max(0, from + e.d) : from + e.d;
        g.round++; g.pend = { i, k: e.k, from, d: e.d, to, revealed: false, ans: {} };
        cue('event', { i, from, to, round: g.round });
      },
      'guess.reveal'() {
        const k = curKey(); const g = k && S.sd[k]; if (!g || !g.pend || g.pend.revealed) return;
        const p = g.pend; p.revealed = true; g.vals[p.k] = p.to;
        const res = {};
        TEAMS.forEach(t => { res[t] = quizMajority(p.ans, t, v => Number(v) === p.to); if (res[t].pass) addPts(t, 1, `过半猜对（${res[t].right}/${res[t].n}）`); });
        p.res = res; cue('guessReveal', { round: g.round });
      },
      'guess.reset'() { const s = curSlide(), k = curKey(); if (!k) return; S.sd[k] = { vals: Object.assign({}, s.init || {}), round: 0 }; cue('reset'); },
      'wall.hide'({ id, hidden }) { const k = curKey(); const w = k && S.sd[k]; if (!w || !w.wall) return; const it = w.wall.find(x => x.id === id); if (it) it.hidden = hidden !== false; },
      'task.award'({ t }) {
        const k = curKey(); if (!k) return; const m = sd(k, () => ({}));
        m.awarded = m.awarded || {}; if (m.awarded[t]) return; m.awarded[t] = true;
        addPts(t, 3, '全队完成 ★');
      },
      'claim.verify'({ id, ok }) {   // 抓虫申请、看图改游戏、捣蛋卡修好
        const k = curKey(); const m = k && S.sd[k]; if (!m || !m.claims) return;
        const c = m.claims.find(x => x.id === id); if (!c || c.status !== 'wait') return;
        c.status = ok ? 'ok' : 'no';
        const r = stu(c.sid); if (!r) return;
        if (ok && c.bug) {   // 每只虫每队第一次 +3
          m.bugs = m.bugs || {}; const kk = r.team + ':' + c.bug;
          if (r.team && !m.bugs[kk]) { m.bugs[kk] = c.sid; addPts(r.team, 3, `抓到${c.bug}`); }
        }
      },
      'duel.award'({ t }) {
        const k = curKey(); if (!k) return; const m = sd(k, () => ({}));
        m.awarded = m.awarded || {}; if (m.awarded[t]) return; m.awarded[t] = true;
        addPts(t, 2, '挑战赛获胜');
      },
      'arena.award'({ t }) { addPts(t, 2, '咒语擂台说得更清楚'); },
      'team.score'({ t, d, why }) {
        if (!TEAMS.includes(t)) return; d = (d | 0) || 1;
        const k = curKey(); if (k) { const m = sd(k, () => ({})); m.score = m.score || { o: 0, b: 0 }; m.score[t] = Math.max(0, (m.score[t] || 0) + d); }
        addPts(t, d, why || ''); cue('score', { t, d });
      },
      'balance.swap'() {   // 数值平衡赛 / 捣蛋卡：每人拿到对方队一个人的作品
        const k = curKey(); if (!k) return; const m = sd(k, () => ({}));
        m.pairs = pairAcross(); m.phase = 'swap'; m.at = now(); cue('swap');
      },
      'trick.deal'() {
        const s = curSlide(), k = curKey(); if (!s || s.type !== 'trick') return;
        const m = sd(k, () => ({}));
        const deck = shuffle(s.cards); m.cards = {};
        S.cls.roster.forEach((r, i) => { m.cards[r.sid] = deck[i % deck.length]; });
        m.phase = 'deal'; m.at = now(); cue('deal');
      },
      'groups.make'({ size }) {
        const lid = S.live.lesson; if (!lid) return;
        size = size || 3; const list = []; let n = 1;
        S.cls.roster.filter(r => !TEAMS.includes(r.team)).forEach(r => { r.team = members('o').length <= members('b').length ? 'o' : 'b'; });   // 还没分队的人：补到人少的队
        TEAMS.forEach(t => {
          const ms = shuffle(members(t).map(r => r.sid));
          const k = Math.max(1, Math.round(ms.length / size));
          for (let i = 0; i < k; i++) list.push({ id: 'g' + n, no: n++, team: t, members: [], rot: 0, dog: null });
          const mine = list.filter(g => g.team === t);
          ms.forEach((sid, i) => mine[i % mine.length].members.push(sid));
        });
        list.forEach((g, i) => g.dog = '比特 ' + (i + 1) + ' 号');
        S.sd[keyOf(lid, 'groups')] = { list };
        cue('groups');
      },
      'groups.rotate'() { groupsOf(S.live.lesson).forEach(g => g.rot = (g.rot || 0) + 1); cue('rotate'); flash('换岗！'); },
      'mood.perform'({ gid, sid }) {
        const s = curSlide(), k = curKey(); if (!k) return; const m = sd(k, () => ({ rounds: [] }));
        const lid = S.live.lesson, moods = S.sd[keyOf(lid, 'mood')] || {}, per = S.sd[keyOf(lid, 'persona')] || {};
        if (sid) {   // 每人一只狗：请一个孩子的狗出场
          const r = stu(sid); if (!r) return; const mine = (S.sd[keyOf(lid, 'mydog')] || {})[sid];
          m.cur = { sid, name: r.name, dog: S.cls.dogs[sid] || (mine && mine.name) || '', team: r.team, mood: mine ? mine.trait : null, ans: {}, revealed: false, at: now() };
          cue('perform', { sid }); return;
        }
        const g = groupsOf(lid).find(x => x.id === gid); if (!g) return;
        const answer = s && s.kind === 'persona' ? (per[gid] ? per[gid].trait : null) : (moods[gid] || null);
        m.cur = { gid, no: g.no, team: g.team, mood: answer, ans: {}, revealed: false, at: now() };
        cue('perform', { gid, no: g.no });
      },
      'stage.pick'({ sid, card }) {   // 上台的狗：请一个孩子的虚拟狗上大屏（card 由服务端从作品里读出）
        const k = curKey(); if (!k) return; const m = sd(k, () => ({ done: [] }));
        if (!sid) { m.cur = null; return; }
        const r = stu(sid); if (!r) return;
        m.cur = { sid, name: r.name, dog: S.cls.dogs[sid] || (card && card.name) || '', team: r.team, card: card || null, at: now() };
        m.done = m.done || []; if (!m.done.includes(sid)) m.done.push(sid);
        cue('stage', { sid });
      },
      'snake.step'({ d }) {   // 纸片蛇：老师在大屏上走一步
        const s = curSlide(), k = curKey(); if (!s || s.type !== 'snakeboard' || !SNAKE_DIRS[d]) return;
        const m = sd(k, () => ({})); const b = m.board || { cells: (s.init || [[3, 3], [3, 2], [3, 1]]).map(x => x.slice()), grow: 0, n: 0 };
        const r = snakeStep(b.cells, b.grow, { d, food: b.food });
        m.board = { cells: r.cells, grow: r.grow, n: (b.n || 0) + 1, added: r.added, removed: r.removed, ate: b.food || null, food: null };
        cue('snake', { n: m.board.n });
      },
      'snake.food'({ food }) { const s = curSlide(), k = curKey(); if (!s || s.type !== 'snakeboard') return; const m = sd(k, () => ({})); const b = m.board || { cells: (s.init || [[3, 3], [3, 2], [3, 1]]).map(x => x.slice()), grow: 0, n: 0 }; b.food = SNAKE_FOOD_FX[food] ? food : null; m.board = b; },
      'snake.reset'() { const k = curKey(); if (!k) return; const m = sd(k, () => ({})); m.board = null; cue('snake', { n: 0 }); },
      'sq.round'({ i }) {   // 蛇身预测赛：出第 i 题
        const s = curSlide(), k = curKey(); if (!s || s.type !== 'snakequiz' || !(s.rounds || [])[i]) return;
        const m = sd(k, () => ({})); m.cur = { i, ans: {}, revealed: false, at: now() }; cue('sqRound', { i });
      },
      'sq.reveal'() {
        const s = curSlide(), k = curKey(); const m = k && S.sd[k]; if (!s || !m || !m.cur || m.cur.revealed) return;
        const round = s.rounds[m.cur.i], ans = snakeAnswer(round);
        m.cur.revealed = true; m.cur.answer = ans;
        const res = {};
        TEAMS.forEach(t => { res[t] = quizMajority(m.cur.ans, t, v => v === ans); if (res[t].pass) addPts(t, 1, `预测赛过半答对（${res[t].right}/${res[t].n}）`); });
        m.cur.res = res; m.done = (m.done || []).concat([m.cur.i]); cue('sqReveal', { i: m.cur.i });
      },
      'gate.round'() {   // 攻门赛：开始新一轮，重新配对
        const s = curSlide(), k = curKey(); if (!s || s.type !== 'gate') return;
        const m = sd(k, () => ({ breaches: [] }));
        m.round = (m.round || 0) + 1; m.pairs = pairAcross(); m.phase = 'attack'; m.at = now(); cue('gateRound', { round: m.round });
      },
      'gate.fix'() { const s = curSlide(), k = curKey(); if (!s || s.type !== 'gate') return; const m = sd(k, () => ({ breaches: [] })); m.phase = 'fix'; cue('gateFix', { round: m.round || 0 }); },
      'mood.reveal'() {
        const k = curKey(); const m = k && S.sd[k]; if (!m || !m.cur || m.cur.revealed) return;
        const c = m.cur; c.revealed = true;
        const g = c.sid ? null : groupsOf(S.live.lesson).find(x => x.id === c.gid);
        const guessers = Object.keys(c.ans).filter(s => s !== c.sid && !(g && g.members.includes(s)));
        const right = guessers.filter(s => c.ans[s] === c.mood);
        TEAMS.forEach(t => {
          const tg = guessers.filter(s => (stu(s) || {}).team === t), tr = tg.filter(s => c.ans[s] === c.mood);
          if (tg.length && tr.length * 2 > tg.length) addPts(t, 1, `猜对心情（${tr.length}/${tg.length}）`);
        });
        const s0 = curSlide();
        if (guessers.length && right.length * 2 > guessers.length && c.sid && c.team) addPts(c.team, 1, `${c.name}的${c.dog || '狗'}演得像`);
        else if (guessers.length && right.length * 2 > guessers.length && g) addPts(g.team, 1, s0 && s0.kind === 'persona' ? `第 ${g.no} 组的比特演得像` : `第 ${g.no} 组的舞被猜中了`);
        c.right = right.length; c.n = guessers.length; m.rounds.push(c); cue('moodReveal');
      },
      'present.next'() {
        const s = curSlide(), k = curKey(); if (!s || !k) return; const m = sd(k, () => ({ done: [] }));
        const order = TEAMS.slice();   // 上节课获胜队先上（老师也可以直接点名字）
        let pool = S.cls.roster.filter(r => !m.done.includes(r.sid));
        if (!pool.length) return;
        const firstTeam = pool.find(r => r.team === order[0]) ? order[0] : order[1];
        const tp = pool.filter(r => r.team === firstTeam); if (tp.length) pool = tp;
        const r = pool[Math.floor(rand() * pool.length)];
        m.done.push(r.sid); m.cur = r.sid;
        S.live.spot = { sid: r.sid, name: r.name, proj: s.proj || null, show: s.proj === 'fix' ? 'chat' : 'game', at: now(), id: ++S.live.seq };
      },
      'present.mark'({ sid }) { const k = curKey(); if (!k) return; const m = sd(k, () => ({ done: [] })); if (!m.done.includes(sid)) m.done.push(sid); },
      'present.award'({ t }) { const k = curKey(); if (!k) return; const m = sd(k, () => ({ done: [] })); m.awarded = m.awarded || {}; if (m.awarded[t]) return; m.awarded[t] = true; addPts(t, 3, '全队都讲完了'); },
      'slide.reset'() { const k = curKey(); if (k) delete S.sd[k]; S.live.cues = []; },
      'class.reset'({ keepRoster }) {
        const roster = S.cls.roster, tn = S.cls.teamNames;
        const f = fresh(); Object.keys(S).forEach(k => delete S[k]); Object.assign(S, f);
        if (keepRoster) { S.cls.roster = roster.map(r => Object.assign(r, { hand: false })); S.cls.teamNames = tn; }
      }
    };

    function pairAcross() {   // 把每个人配给对方队的一个人（人数不一样时有人会被两个人玩）
      const pairs = {};
      const o = shuffle(members('o').map(r => r.sid)), b = shuffle(members('b').map(r => r.sid));
      if (!o.length || !b.length) { const all = shuffle(S.cls.roster.map(r => r.sid)); all.forEach((s, i) => pairs[s] = all[(i + 1) % all.length]); return pairs; }
      o.forEach((s, i) => pairs[s] = b[i % b.length]);
      b.forEach((s, i) => pairs[s] = o[i % o.length]);
      return pairs;
    }

    // ---------- 学生的操作 ----------
    const U = {
      hand(sid, { on }) { const r = stu(sid); if (r) r.hand = !!on; },
      'quiz.answer'(sid, { i }) {
        const s = curSlide(), k = curKey(); if (!s || s.type !== 'quiz' || !k) return { err: '现在不是答题时间' };
        const q = sd(k, () => ({ ans: {}, revealed: false })); if (q.revealed) return { err: '已经揭晓了' };
        q.ans[sid] = i | 0;
      },
      guess(sid, { v }) {
        const k = curKey(); const g = k && S.sd[k]; if (!g || !g.pend || g.pend.revealed) return { err: '还没开始猜' };
        const n = Number(v); if (!isFinite(n)) return { err: '填一个数字' };
        g.pend.ans[sid] = n;
      },
      'wall.add'(sid, { text }) {
        const s = curSlide(), k = curKey(); if (!s || !k) return;
        text = String(text || '').trim().slice(0, 60); if (!text) return { err: '写点什么吧' };
        const w = sd(k, () => ({})); w.wall = w.wall || [];
        if (w.wall.filter(x => x.sid === sid).length >= 5) return { err: '每人最多写 5 条' };
        const r = stu(sid);
        w.wall.push({ id: rid(), sid, name: r ? r.name : '', team: r ? r.team : null, text, hidden: !!opts.filter && opts.filter(text), at: now() });
      },
      task(sid, { lv, on }) {
        const k = curKey(); if (!k) return; const m = sd(k, () => ({}));
        m.tasks = m.tasks || {}; const t = m.tasks[sid] = m.tasks[sid] || [false, false, false];
        if (lv >= 1 && lv <= 3) t[lv - 1] = !!on;
      },
      claim(sid, { bug, note }) {   // 抓虫：我抓到了 xx；看图改游戏/捣蛋卡：我改好了
        const k = curKey(); if (!k) return; const m = sd(k, () => ({}));
        m.claims = m.claims || [];
        if (m.claims.find(c => c.sid === sid && c.bug === (bug || null) && c.status !== 'no')) return { err: '已经交过了，等老师确认' };
        m.claims.push({ id: rid(), sid, bug: bug || null, note: String(note || '').slice(0, 80), status: 'wait', at: now() });
      },
      star(sid, { target, on }) {
        const s = curSlide(), k = curKey(); if (!s || s.type !== 'gallery' || !k) return;
        if (target === sid) return { err: '不能投给自己' };
        const g = sd(k, () => ({ stars: {} })); const mine = g.stars[sid] = g.stars[sid] || [];
        const i = mine.indexOf(target);
        if (on === false) { if (i >= 0) mine.splice(i, 1); return; }
        if (i >= 0) return;
        if (mine.length >= (s.stars || 1)) { if ((s.stars || 1) === 1) mine.length = 0; else return { err: `每人只有 ${s.stars} 颗星` }; }
        mine.push(target);
      },
      'balance.score'(sid, { score }) {
        const k = curKey(); const m = k && S.sd[k]; if (!m || !m.pairs) return { err: '还没交换' };
        const target = m.pairs[sid]; if (!target) return;
        m.scores = m.scores || {}; m.scores[sid] = { target, score: Number(score) || 0, at: now() };
      },
      'trick.fixed'(sid, { note }) {
        const k = curKey(); const m = k && S.sd[k]; if (!m || m.phase !== 'swap') return { err: '还没交换' };
        m.fixed = m.fixed || {}; m.fixed[sid] = { note: String(note || '').slice(0, 80), at: now() };
      },
      'mood.draw'(sid) {
        const lid = S.live.lesson; const g = myGroup(lid, sid); if (!g) return { err: '还没分组' };
        const mk = keyOf(lid, 'mood'); const m = S.sd[mk] = S.sd[mk] || {};
        if (m[g.id]) return;
        const used = Object.values(m); const left = ['开心', '困了', '生气', '害羞'].filter(x => !used.includes(x));
        const pool = left.length ? left : ['开心', '困了', '生气', '害羞'];
        m[g.id] = pool[Math.floor(rand() * pool.length)];
      },
      'mood.guess'(sid, { mood }) {
        const k = curKey(); const m = k && S.sd[k]; if (!m || !m.cur || m.cur.revealed) return { err: '还没开始' };
        if (m.cur.sid === sid) return { err: '你的狗在表演' };
        const g = groupsOf(S.live.lesson).find(x => x.id === m.cur.gid);
        if (g && g.members.includes(sid)) return { err: '你们组在表演' };
        m.cur.ans[sid] = mood;
      },
      'dog.name'(sid, { name }) {
        name = String(name || '').replace(/\s/g, '').slice(0, 6);
        if (!name) return { err: '先想一个名字' };
        if (opts.filter && opts.filter(name)) return { err: '换一个名字吧' };
        const dup = Object.keys(S.cls.dogs).find(k => k !== sid && S.cls.dogs[k] === name);
        if (dup) return { err: `${nameOf(dup)}的狗已经叫「${name}」了，换一个吧` };
        S.cls.dogs[sid] = name;
      },
      'sq.answer'(sid, { v }) {
        const s = curSlide(), k = curKey(); const m = k && S.sd[k]; if (!s || s.type !== 'snakequiz' || !m || !m.cur) return { err: '还没出题' };
        if (m.cur.revealed) return { err: '已经揭晓了' };
        m.cur.ans[sid] = String(v == null ? '' : v).slice(0, 200);
      },
      report(sid, { i }) {   // 闯关报告：玩完对方的游戏，报结果
        const s = curSlide(), k = curKey(); const m = k && S.sd[k]; if (!s || !m || !m.pairs) return { err: '还没交换' };
        const target = m.pairs[sid]; if (!target) return;
        const n = ((s.report || {}).opts || []).length; i = i | 0; if (i < 0 || i >= n) return;
        m.reports = m.reports || {}; m.reports[sid] = { target, i, at: now() };
      },
      'design.done'(sid, { name }) {   // 设计卡交给精灵了
        const k = curKey(); if (!k) return; const m = sd(k, () => ({}));
        name = String(name || '').trim().slice(0, 16);
        m.designs = m.designs || {}; m.designs[sid] = { name: opts.filter && opts.filter(name) ? '我的游戏' : name, at: now() };
      },
      speech(sid, { lines }) {
        const k = curKey(); if (!k) return; const m = sd(k, () => ({}));
        m.lines = m.lines || {}; m.lines[sid] = (lines || []).slice(0, 3).map(s => String(s || '').slice(0, 80));
      }
    };

    // ---------- 入口 ----------
    function act(who, a) {
      a = a || {};
      let res;
      if (who.role === 'teacher') { const f = T[a.type]; if (!f) return { err: '未知指令' }; res = f(a) || {}; }
      else if (who.role === 'student') {
        if (!stu(who.sid)) return { err: '请先进教室' };
        const f = U[a.type]; if (!f) return { err: '未知操作' };
        res = f(who.sid, a) || {};
      } else return { err: '没有权限' };
      if (!res.err) changed();
      return res;
    }

    // ---------- 给不同角色看的视图 ----------
    function pub() {
      const L = curLesson(), s = curSlide();
      return {
        lesson: S.live.lesson, slide: S.live.slide, slideId: s ? s.id : null, slideType: s ? s.type : null,
        cues: S.live.cues, quiet: S.live.quiet, sleep: !!S.live.sleep, turn: S.live.turn || null, pick: S.live.pick, spot: S.live.spot, flash: S.live.flash, timesUp: S.live.timesUp || null, demo: S.live.demo || null, demoErr: S.live.demoErr || null,
        timer: Object.assign({}, S.live.timer, { left: timerLeft() }), serverNow: now(),
        teamNames: S.cls.teamNames, pts: S.pts, lessonTitle: L ? L.title : null
      };
    }
    function rosterPub(full) {
      return S.cls.roster.map(r => {
        const o = { sid: r.sid, name: r.name, team: r.team, online: (online[r.sid] || 0) > 0, hand: !!r.hand, dog: S.cls.dogs[r.sid] || null };
        if (full) o.code = r.code;
        return o;
      });
    }
    function slidePub(forTeacher) {   // 当前页的数据，大屏和老师端能看的部分
      const s = curSlide(), k = curKey(); if (!s || !k) return null;
      const m = S.sd[k] || {};
      const out = { key: k };
      if (m.wall) out.wall = m.wall.filter(x => forTeacher || !x.hidden).map(x => ({ id: x.id, sid: x.sid, name: x.name, team: x.team, text: x.text, hidden: !!x.hidden }));
      if (s.type === 'quiz') {
        const q = m.ans ? m : { ans: {}, revealed: false };
        const counts = (s.opts || []).map((_, i) => Object.values(q.ans).filter(v => v === i).length);
        out.quiz = { answered: Object.keys(q.ans).length, revealed: !!q.revealed, counts: q.revealed || forTeacher ? counts : null, res: q.res || null };
        if (forTeacher) out.quiz.ans = q.ans;
      }
      if (s.type === 'boxes') {
        out.boxes = { vals: m.vals || s.init, round: m.round || 0 };
        if (m.pend) { const p = m.pend; out.boxes.pend = { i: p.i, k: p.k, from: p.from, d: p.d, to: p.revealed ? p.to : null, revealed: p.revealed, answered: Object.keys(p.ans).length, res: p.res || null }; if (forTeacher) { out.boxes.pend.to = p.to; out.boxes.pend.ans = p.ans; } }
      }
      if (m.tasks || s.type === 'mission') {
        const tasks = m.tasks || {};
        out.tasks = {}; TEAMS.forEach(t => { const ms = members(t); out.tasks[t] = [0, 1, 2].map(i => ms.filter(r => tasks[r.sid] && tasks[r.sid][i]).length).concat(ms.length); });
        out.awarded = m.awarded || {};
        if (forTeacher) out.taskBy = tasks;
      }
      if (s.type === 'mission' && s.kind === 'design') out.designs = m.designs || {};
      if (s.kind === 'persona' && s.own) out.mydogs = S.sd[keyOf(S.live.lesson, 'mydog')] || {};
      if (m.claims) {
        out.claims = m.claims.map(c => ({ id: c.id, sid: c.sid, name: nameOf(c.sid), team: (stu(c.sid) || {}).team, bug: c.bug, note: c.note, status: c.status, at: c.at }));
        if (m.bugs) out.bugs = m.bugs;
      }
      if (s.type === 'duel') {
        out.awarded = m.awarded || {}; out.phase = m.phase || 'design';
        if (s.kind === 'report') {   // 玩对方的游戏，报结果；结果落在 hit 里的算「做得好」，记给做游戏的人的队
          const rp = m.reports || {}, hitSet = (s.report || {}).hit || [0]; const hit = { o: 0, b: 0 }, total = { o: 0, b: 0 };
          const counts = ((s.report || {}).opts || []).map(() => 0);
          Object.values(rp).forEach(x => { const r = stu(x.target); counts[x.i] = (counts[x.i] || 0) + 1; if (!r || !r.team) return; total[r.team]++; if (hitSet.includes(x.i)) hit[r.team]++; });
          out.report = { hit, total, counts, reported: Object.keys(rp).length };
          if (forTeacher) { out.report.reports = rp; out.report.pairs = m.pairs || null; }
        }
        if (s.kind === 'balance') {
          const sc = m.scores || {}; const hit = { o: 0, b: 0 }, total = { o: 0, b: 0 };
          Object.values(sc).forEach(x => { const r = stu(x.target); if (!r || !r.team) return; total[r.team]++; if (x.score >= 10 && x.score <= 20) hit[r.team]++; });
          out.balance = { hit, total, reported: Object.keys(sc).length };
          if (forTeacher) { out.balance.scores = sc; out.balance.pairs = m.pairs || null; }
        }
      }
      if (s.type === 'trick') {
        out.phase = m.phase || 'none';
        const fixed = m.fixed || {}; const by = { o: 0, b: 0 }, n = { o: 0, b: 0 };
        S.cls.roster.forEach(r => { if (!r.team) return; n[r.team]++; if (fixed[r.sid]) by[r.team]++; });
        out.trick = { fixed: by, n, awarded: m.awarded || {} };
        if (forTeacher) { out.trick.cards = m.cards || {}; out.trick.pairs = m.pairs || {}; out.trick.fixedBy = fixed; }
      }
      if (s.type === 'gallery') {
        const st = m.stars || {}; const count = {};
        Object.values(st).forEach(list => list.forEach(t => count[t] = (count[t] || 0) + 1));
        out.stars = count; out.voters = Object.keys(st).filter(v => st[v].length).length;
      }
      if (s.type === 'showcase') { out.present = { done: m.done || [], cur: m.cur || null, awarded: m.awarded || {} }; }
      if (s.type === 'groups' || s.type === 'mood' || s.type === 'guessmood' || (s.type === 'mission' && (s.kind === 'dance' || s.kind === 'persona'))) {
        const moods = S.sd[keyOf(S.live.lesson, 'mood')] || {}, per = S.sd[keyOf(S.live.lesson, 'persona')] || {};
        const secret = s.kind === 'persona' && s.type === 'guessmood';
        out.groups = groupsOf(S.live.lesson).map(g => {
          const p = per[g.id];
          return { id: g.id, no: g.no, team: g.team, dog: g.dog, rot: g.rot, members: g.members.map(x => ({ sid: x, name: nameOf(x), role: roleOf(g, x) })), drawn: !!moods[g.id], mood: forTeacher ? moods[g.id] || null : null,
            persona: p ? { name: secret && !forTeacher ? null : p.name, identity: secret && !forTeacher ? null : p.identity, trait: forTeacher || !secret ? p.trait : null, by: p.by, at: p.at } : null };
        });
      }
      if (s.type === 'guessmood') {
        const c = m.cur;
        const opts = s.opts || ['开心', '困了', '生气', '害羞'];
        out.perform = c ? { gid: c.gid, no: c.no, sid: c.sid || null, name: c.name || null, dog: c.dog || null, team: c.team, answered: Object.keys(c.ans).length, revealed: c.revealed, mood: c.revealed || forTeacher ? c.mood : null, counts: c.revealed || forTeacher ? opts.map(x => Object.values(c.ans).filter(v => v === x).length) : null, right: c.right, n: c.n } : null;
        out.rounds = (m.rounds || []).length;
        if (s.own) { const md = S.sd[keyOf(S.live.lesson, 'mydog')] || {}; out.performers = S.cls.roster.filter(r => md[r.sid]).map(r => ({ sid: r.sid, name: r.name, team: r.team, dog: S.cls.dogs[r.sid] || md[r.sid].name || '', trait: forTeacher ? md[r.sid].trait : null, done: (m.rounds || []).some(x => x.sid === r.sid) })); }
      }
      if (s.type === 'stage') {
        const c = m.cur, md = {};   // 任何一节课里让狗上线过的孩子都能上台（第 4、11 节写角色卡）
        Object.keys(S.sd).forEach(x => { if (x.endsWith('/mydog')) Object.assign(md, S.sd[x]); });
        out.stage = c ? { sid: c.sid, name: c.name, dog: c.dog, team: c.team, card: c.card } : null;
        out.performers = S.cls.roster.filter(r => md[r.sid]).map(r => ({ sid: r.sid, name: r.name, team: r.team, dog: S.cls.dogs[r.sid] || md[r.sid].name || '', done: (m.done || []).includes(r.sid) }));
      }
      if (s.type === 'snakeboard') { const b = m.board; out.snake = b ? { cells: b.cells, grow: b.grow, n: b.n, added: b.added || null, removed: b.removed || null, ate: b.ate || null, food: b.food || null } : { cells: s.init || [[3, 3], [3, 2], [3, 1]], grow: 0, n: 0, food: null }; }
      if (s.type === 'snakequiz') {
        const c = m.cur, round = c ? s.rounds[c.i] : null;
        out.sq = c ? { i: c.i, revealed: c.revealed, answered: Object.keys(c.ans).length, foodCells: snakeFoodCells(round), answer: c.revealed || forTeacher ? snakeAnswer(round) : null, frames: c.revealed ? snakeRun(round).map(f => ({ cells: f.cells, added: f.added, removed: f.removed })) : null, res: c.res || null,
          counts: c.revealed || forTeacher ? Object.values(c.ans).reduce((a, v) => { a[v] = (a[v] || 0) + 1; return a; }, {}) : null } : null;
        out.done = m.done || [];
      }
      if (s.type === 'mission' && (s.kind === 'npc' || s.kind === 'gate')) out.npcs = S.sd[keyOf(S.live.lesson, s.kind)] || {};
      if (s.type === 'gate') {
        const bs = m.breaches || [], pubs = S.sd[keyOf(S.live.lesson, 'gate')] || {};
        out.gate = { round: m.round || 0, phase: m.phase || 'ready', gates: Object.keys(pubs).map(sid => ({ sid, name: nameOf(sid), team: (stu(sid) || {}).team, look: pubs[sid].look, dog: pubs[sid].name })),
          breaches: bs.map(b => ({ owner: b.owner, ownerName: nameOf(b.owner), by: b.by, byName: nameOf(b.by), team: (stu(b.by) || {}).team, round: b.round, how: b.how, text: b.text, reply: forTeacher ? b.reply : null, at: b.at })) };
        if (forTeacher) out.gate.pairs = m.pairs || null;
      }
      if (m.sent) out.sent = m.sent.slice(-40).map(x => ({ dog: x.dog, owner: x.owner || null, by: x.by, actions: x.actions, repeat: x.repeat, at: x.at }));
      if (s.type === 'speech' && forTeacher) out.lines = m.lines || {};
      if (m.score) out.score = m.score;
      return out;
    }
    function viewScreen() { return Object.assign(pub(), { roster: rosterPub(false), sd: slidePub(false) }); }
    function lessonWalls() {
      const lid = S.live.lesson; if (!lid) return [];
      const out = []; Object.keys(S.sd).forEach(k => { if (k.startsWith(lid + '/') && S.sd[k] && S.sd[k].wall) S.sd[k].wall.forEach(x => { if (!x.hidden) out.push({ id: x.id, name: x.name, text: x.text, team: x.team }); }); });
      return out.slice(-60);
    }
    function viewTeacher() {
      const v = Object.assign(pub(), { roster: rosterPub(true), sd: slidePub(true), needCode: S.cls.needCode, picked: S.picked, walls: lessonWalls() });
      const s = curSlide(), m = (curKey() && S.sd[curKey()]) || {};
      v.taskBy = m.tasks || {};
      return v;
    }
    function viewStudent(sid) {
      const r = stu(sid); if (!r) return { err: 'nojoin' };
      const s = curSlide(), k = curKey(), m = (k && S.sd[k]) || {};
      const lid = S.live.lesson;
      const me = { sid, name: r.name, team: r.team, code: r.code, hand: !!r.hand, dog: S.cls.dogs[sid] || null };
      const g = lid ? myGroup(lid, sid) : null;
      if (g) { me.group = { id: g.id, no: g.no, dog: g.dog, role: roleOf(g, sid), mates: g.members.filter(x => x !== sid).map(nameOf) }; }
      const v = Object.assign(pub(), { me, slideKey: k });
      v.spot = S.live.spot && S.live.spot.sid === sid ? S.live.spot : (S.live.spot ? { other: true, name: S.live.spot.name } : null);
      v.pick = S.live.pick ? { name: S.live.pick.name, me: S.live.pick.sid === sid, id: S.live.pick.id } : null;
      v.cues = undefined; v.flash = S.live.flash;
      const mine = {};
      if (s) {
        if (s.type === 'quiz') { const q = m.ans ? m : { ans: {} }; mine.quiz = { mine: q.ans[sid] != null ? q.ans[sid] : null, revealed: !!q.revealed, ans: q.revealed ? s.ans : null }; if (s.hints) mine.hints = S.live.cues.filter(c => c.n === 'reveal').map(c => c.a); }
        if (s.type === 'boxes' && m.pend) { const p = m.pend; mine.guess = { i: p.i, k: p.k, from: p.from, d: p.d, round: m.round, mine: p.ans[sid] != null ? p.ans[sid] : null, revealed: p.revealed, to: p.revealed ? p.to : null }; }
        if (m.wall) mine.wall = m.wall.filter(x => x.sid === sid).map(x => x.text);
        if (m.tasks && m.tasks[sid]) mine.tasks = m.tasks[sid];
        if (m.claims) mine.claims = m.claims.filter(c => c.sid === sid).map(c => ({ bug: c.bug, status: c.status }));
        if (s.type === 'gallery') {
          mine.stars = ((m.stars || {})[sid]) || [];
          mine.works = S.cls.roster.filter(x => x.sid !== sid).map(x => ({ sid: x.sid, name: x.name, team: x.team }));
        }
        if (s.type === 'duel' && s.kind === 'report') {
          mine.phase = m.phase || 'design';
          if (m.pairs && m.pairs[sid]) mine.play = { sid: m.pairs[sid], name: nameOf(m.pairs[sid]) };
          if (m.reports && m.reports[sid]) mine.reported = m.reports[sid].i;
        }
        if (s.type === 'mission' && s.kind === 'design') mine.design = (m.designs || {})[sid] || null;
        if (s.type === 'duel' && s.kind === 'balance') {
          mine.phase = m.phase || 'design';
          if (m.pairs && m.pairs[sid]) { mine.play = { sid: m.pairs[sid], name: nameOf(m.pairs[sid]) }; }
          if (m.scores && m.scores[sid]) mine.reported = m.scores[sid].score;
        }
        if (s.type === 'trick') {
          mine.phase = m.phase || 'none';
          if (m.cards) mine.card = m.cards[sid] || null;
          if (m.pairs && m.pairs[sid]) { const from = m.pairs[sid]; mine.fix = { sid: from, name: nameOf(from) }; if (m.fixed && m.fixed[sid]) { mine.fixed = true; mine.theirCard = (m.cards || {})[from] || null; } }
        }
        if (s.type === 'mood' || (s.type === 'mission' && s.kind === 'dance') || s.type === 'guessmood') {
          const moods = S.sd[keyOf(lid, 'mood')] || {};
          if (g) mine.mood = moods[g.id] || null;
        }
        if (s.kind === 'persona' && s.own) { const per = S.sd[keyOf(lid, 'mydog')] || {}; mine.sent = per[sid] || null; }
        else if (s.kind === 'persona' && g) { const per = S.sd[keyOf(lid, 'persona')] || {}; mine.sent = per[g.id] || null; }
        if (s.type === 'guessmood' && m.cur) {
          const c = m.cur; mine.perform = { no: c.no, name: c.name || null, dog: c.dog || null, mine: c.ans[sid] || null, revealed: c.revealed, mood: c.revealed ? c.mood : null, performing: c.sid ? c.sid === sid : !!(g && g.id === c.gid) };
        }
        if (s.type === 'stage' && m.cur) { const c = m.cur; mine.stage = { name: c.name, dog: c.dog, me: c.sid === sid }; }
        if (s.type === 'snakequiz' && m.cur) { const c = m.cur; mine.sq = { i: c.i, foodCells: snakeFoodCells(s.rounds[c.i]), mine: c.ans[sid] != null ? c.ans[sid] : null, revealed: c.revealed, right: c.revealed ? c.ans[sid] === c.answer : null, answer: c.revealed ? c.answer : null }; }
        if (s.type === 'gate') {
          const t = (m.pairs || {})[sid];
          mine.gate = { phase: m.phase || 'ready', round: m.round || 0, target: t ? { sid: t, name: nameOf(t) } : null,
            won: (m.breaches || []).some(b => b.by === sid && b.round === (m.round || 0)),
            against: (m.breaches || []).filter(b => b.owner === sid).map(b => ({ byName: nameOf(b.by), round: b.round, how: b.how, text: b.text, reply: b.reply })) };
        }
        if (s.type === 'speech') mine.lines = ((m.lines || {})[sid]) || null;
        if (s.type === 'showcase') { const pm = m.done || []; mine.presented = pm.includes(sid); }
        if (s.type === 'result') { const p = s.pack ? packPts(s.pack) : lp(lid); mine.result = { pts: p, revealed: S.live.cues.some(c => c.n === 'result') }; }
      }
      v.mine = mine;
      v.teamPts = lid ? lp(lid) : { o: 0, b: 0 };
      return v;
    }
    function packPts(ids) { return (ids || []).reduce((a, id) => { const p = S.pts[id] || { o: 0, b: 0 }; return { o: a.o + p.o, b: a.b + p.b }; }, { o: 0, b: 0 }); }

    return {
      state: S, act, join, auth, setOnline, tick,
      view(who) { if (who.role === 'teacher') return viewTeacher(); if (who.role === 'student') return viewStudent(who.sid); return viewScreen(); },
      onChange(f) { subs.add(f); return () => subs.delete(f); },
      changed, stu, nameOf, curSlide, curKey, lessonOf, myGroup: sid => myGroup(S.live.lesson, sid), groupsOf,
      slideData, snapshot: () => clone(S), ver: () => ver, now
    };
  }

  return { create, fresh };
});
