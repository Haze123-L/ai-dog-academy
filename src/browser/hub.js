// ================= 本地课堂：整套课跑在一个页面里 =================
// 大屏单机模式（没有服务器）和在线试玩版用它。接口和服务器一样。
function createLocalHub({ starters, llm, saved, persistKey, storeKey }) {
  const mem = new Map();
  // 网页版：孩子的作品、对话也存在这台电脑的浏览器里，刷新、换窗口不丢（存不下就只放内存）
  if (storeKey) { try { const o = JSON.parse(localStorage.getItem(storeKey) || 'null'); if (o) Object.keys(o).forEach(k => mem.set(k, o[k])); } catch (e) { } }
  let st = null, dead = false;
  const saveStore = () => { if (!storeKey || st || dead) return; st = setTimeout(() => { st = null; try { localStorage.setItem(storeKey, JSON.stringify(Object.fromEntries(mem))); } catch (e) { } }, 400); };
  const store = { get: k => mem.has(k) ? mem.get(k) : null, put: (k, v) => { if (v == null) mem.delete(k); else mem.set(k, v); saveStore(); } };
  const core = ClassCore.create({ lessons: LESSONS, saved });
  const starter = name => { const g = GAMES[name]; return g ? starters[g.file] || '' : ''; };
  const svc = Service.create({ core, store, starter, llm: llm || null, dog: null, filter: null, ACTS, MOODS, GAMES });
  const conns = new Set();
  let t = null;
  core.onChange(() => {
    if (t) return;
    t = setTimeout(() => {
      t = null;
      conns.forEach(c => { try { const v = viewFor(c.who); const s = JSON.stringify(v); if (s !== c.last) { c.last = s; c.fn(v); } } catch (e) { console.error(e); } });
      if (persistKey && !dead) { try { localStorage.setItem(persistKey, JSON.stringify(core.snapshot())); } catch (e) { } }
    }, 30);
  });
  const tk = setInterval(() => core.tick(), 500);
  function viewFor(who) {
    const v = core.view(who);
    if (who.role === 'teacher') { v.busy = core.state.cls.roster.filter(r => svc.isBusy(r.sid)).map(r => r.sid); v.llm = { ready: !!llm, provider: llm ? 'claude' : 'none', health: svc.health.llm }; v.join = { url: '（本机）', short: '本机演示' }; }
    if (who.role === 'screen') v.join = { url: '', short: '' };
    if (who.role === 'student') v.busy = svc.isBusy(who.sid);
    return v;
  }
  const P = {
    join: (who, b) => core.join(b.name, b.code),
    genie: (who, b) => svc.genie(who.sid, b), go: (who, b) => svc.go(who.sid, b), 'reset-work': (who, b) => svc.resetWork(who.sid, b),
    import: (who, b) => svc.importWork(who.sid, b), 'game-error': (who, b) => svc.gameError(who.sid, b),
    dance: (who, b) => svc.dance(who.sid, b), 'dance-edit': (who, b) => svc.danceEdit(who.sid, b), 'dance-send': (who, b) => svc.danceSend(who, b),
    summary: (who, b) => ({ summary: svc.summary(who.sid, b.proj) }),
    'persona-save': (who, b) => svc.personaSave(who.sid, b), 'persona-chat': (who, b) => svc.personaChat(who.sid, b), 'persona-send': (who, b) => svc.personaSend(who, b),
    'design-save': (who, b) => svc.designSave(who.sid, b), 'spec-save': (who, b) => svc.specSave(who.sid, b), 'needs-save': (who, b) => svc.needsSave(who.sid, b), 'dog-demo': (who, b) => svc.demoPersona(b),
    'stage-pick': (who, b) => svc.stagePick(b),
    'npc-save': (who, b) => svc.npcSave(who.sid, b), 'npc-publish': (who, b) => svc.npcPublish(who.sid, b), 'npc-chat': (who, b) => svc.npcChat(who.role === 'screen' ? { role: 'teacher' } : who, b), 'npc-demo': (who, b) => svc.npcDemo(b), 'stage-chat': (who, b) => svc.stageChat(who.role === 'screen' ? { role: 'teacher' } : who, b),
    demo: (who, b) => svc.demo(b), 'demo-reset': (who, b) => svc.demoReset(b), 'demo-error': (who, b) => svc.demoError(b), 'demo-dance': (who, b) => svc.demoDance(b)
  };
  return {
    core, svc,
    stop() { this.flush(); dead = true; clearInterval(tk); conns.clear(); },
    flush() { if (dead) return; if (st) { clearTimeout(st); st = null; } if (storeKey) { try { localStorage.setItem(storeKey, JSON.stringify(Object.fromEntries(mem))); } catch (e) { } } if (persistKey) { try { localStorage.setItem(persistKey, JSON.stringify(core.snapshot())); } catch (e) { } } },
    connect(who, fn) { const c = { who, fn, last: null }; conns.add(c); if (who.role === 'student') core.setOnline(who.sid, 1); setTimeout(() => { const v = viewFor(who); c.last = JSON.stringify(v); fn(v); }, 0); return () => { conns.delete(c); if (who.role === 'student') core.setOnline(who.sid, -1); }; },
    act(who, a) { if (who.role === 'screen') who = { role: 'teacher' }; return core.act(who, a); },
    async post(who, p, b) { const f = P[p]; if (!f) return { err: '没有这个功能' }; try { return await f(who, b); } catch (e) { console.error(e); return { err: String(e.message || e) }; } },
    async get(who, p, q) {
      if (p === 'work') { if (q.sid === Service.TEACHER) return { code: svc.demoCode(q.proj.replace(/^demo-/, '')), name: '老师' }; return svc.work(who.role === 'screen' ? { role: 'teacher' } : who, q.sid || who.sid, q.proj, q.v == null ? null : +q.v); }
      if (p === 'dance') return svc.danceOf(q.sid || who.sid);
      if (p === 'persona') return svc.personaOf(q.sid || who.sid, q.slot);
      if (p === 'npc') return svc.npcOf(who.role === 'screen' ? { role: 'teacher' } : who, q.sid || who.sid, q.slot);
      if (p === 'design') return svc.designOf(q.sid || who.sid);
      if (p === 'spec') return svc.specOf(who.role === 'student' ? who : { role: 'teacher' }, q.sid || who.sid, q.proj);
      if (p === 'needs') return svc.needsOf(q.sid || who.sid);
      if (p === 'names') return { names: core.state.cls.roster.map(r => r.name), needCode: false };
      if (p === 'whoami') return who.sid && core.stu(who.sid) ? { sid: who.sid } : { err: 'nojoin' };
      if (p === 'talk') return svc.talkOf(q.sid);
      return { err: '没有这个功能' };
    }
  };
}
