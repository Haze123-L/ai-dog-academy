// ================= 课堂服务：精灵、编舞、作品 =================
// 把「课堂状态核心」「作品」「代码精灵」接在一起。服务器和在线试玩版共用；
// 真正去问大模型（llm）、发给机器狗（dog）、存数据（store）由外面传进来。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./genie-core.js'), require('./mock-genie.js'), require('./works.js'));
  else root.Service = factory(root.GenieCore, root.MockGenie, root.Works);
})(typeof self !== 'undefined' ? self : this, function (GenieCore, MockGenie, Works) {
  'use strict';
  const TEACHER = '__teacher';

  function create({ core, store, starter, llm, dog, filter, ACTS, MOODS, GAMES, log, strictLLM = false }) {
    const works = Works.create({ store, starter, core, now: core.now, label: s => (GAMES[s] || {}).name || s });
    const busy = {};
    let demoBusy = false;
    const health = { llm: llm ? 'unknown' : 'off', lastError: null, lastOk: null };
    log = log || (() => { });
    const talkKey = sid => '__talk/' + sid;
    function talk(sid, item) {
      const list = store.get(talkKey(sid)) || [];
      list.push(Object.assign({ t: core.now() }, item));
      store.put(talkKey(sid), list.slice(-60));
    }
    const gameName = code => (code.match(/<title>([^<]*)<\/title>/) || [])[1] || '小游戏';
    const specRules = (sid, proj) => { const p = store.get(sid + '/spec-' + proj); return p && p.rules ? p.rules.filter(Boolean) : []; };

    // 先说计划：不改代码，返回 { reply, plan: [一步一句] }（plan 为空表示精灵在反问）
    async function askPlan(code, prompt, history, spec, mock) {
      if (llm && !mock) {
        try {
          const r = GenieCore.parsePlan(await llm(GenieCore.buildPlanMessages({ game: gameName(code), code, prompt, history, spec }), { kind: 'code' }));
          health.llm = 'ok'; health.lastError = null; health.lastOk = core.now();
          return r;
        } catch (e) {
          health.llm = 'error'; health.lastError = { at: core.now(), msg: String(e && e.message || e).slice(0, 200) };
          log('大模型出错：' + health.lastError.msg);
          if (strictLLM) throw e;
        }
      }
      return MockGenie.plan({ code, prompt });
    }

    async function askGenie(code, prompt, mode, history, error, version, extra) {
      const spec = extra && extra.spec, plan = extra && extra.plan;
      if (llm && !(extra && extra.mock)) {
        try {
          const messages = GenieCore.buildMessages({ game: gameName(code), code, prompt, history, mode, error, version, spec, plan });
          for (let attempt = 0; attempt < 2; attempt++) {
            const text = await llm(messages, { kind: 'code' });
            health.llm = 'ok'; health.lastError = null; health.lastOk = core.now();
            const r = GenieCore.parseReply(text);
            if (r.file) { const bad = GenieCore.validate(r.file) || (attempt === 0 && GenieCore.emojiTrap(prompt, code, r.file)); if (!bad) return { reply: r.reply || '改好了！', code: r.file }; messages.push({ role: 'assistant', content: text }, { role: 'user', content: `完整文件有问题：${bad}。请重新输出。` }); continue; }
            if (!r.edits.length) { const trap = attempt === 0 && GenieCore.emojiTrap(prompt, code, code); if (trap) { messages.push({ role: 'assistant', content: text }, { role: 'user', content: trap }); continue; } return { reply: (/改好|换成|加了|变成|修好/.test(r.reply || '') ? '（这次代码其实没变）' : '') + (r.reply || '你想让游戏变成什么样？'), code: null }; }
            const a = GenieCore.applyEdits(code, r.edits);
            if (!a.failed.length) { const bad = GenieCore.validate(a.code) || (attempt === 0 && GenieCore.emojiTrap(prompt, code, a.code)); if (!bad) return { reply: r.reply || '改好了！', code: a.code }; if (attempt === 0) { messages.push({ role: 'assistant', content: text }, { role: 'user', content: bad }); continue; } }
            if (a.failed.length < r.edits.length && attempt === 1) { return { reply: r.reply || '改好了一部分。', code: a.code }; }
            messages.push({ role: 'assistant', content: text }, { role: 'user', content: `第 ${a.failed.map(i => i + 1).join('、')} 个 <edit> 的 <find> 在代码里找不到（必须和原文一模一样）。请对照最上面的代码，重新输出全部修改。` });
          }
          return { reply: '精灵这次没改好。再说一遍试试？', code: null, fail: true };
        } catch (e) {
          health.llm = 'error'; health.lastError = { at: core.now(), msg: String(e && e.message || e).slice(0, 200) };
          log('大模型出错：' + health.lastError.msg);
          if (strictLLM) throw e;
          const m = MockGenie.run({ code, prompt, mode, starter, error, spec });
          if (m.code) return { reply: '（网络不好，先用演示精灵）' + m.reply, code: m.code };
          return { reply: '精灵现在连不上，请老师看一下网络。', code: null, fail: true };
        }
      }
      return MockGenie.run({ code, prompt, mode, starter, error, spec });
    }

    function canOpen(who, sid, proj) {
      if (who.role === 'teacher' || who.role === 'screen') return true;
      if (who.role !== 'student') return false;
      if (who.sid === sid) return true;
      const s = core.curSlide(); if (!s) return false;
      const m = core.slideData(core.curKey()) || {};
      if (s.type === 'gallery' && proj === s.proj) return true;
      if (s.type === 'duel' && m.pairs && m.pairs[who.sid] === sid && proj === s.proj) return true;
      return false;
    }

    const pkey = (sid, slot) => sid + (slot === 'mydog' ? '/mydog' : '/persona');
    async function personaReply(card, chat, text) {
      let r = null;
      if (llm) {
        try {
          const msgs = [{ role: 'system', content: GenieCore.buildPersona(card, ACTS) }];
          (chat || []).slice(-6).forEach(m => msgs.push({ role: 'user', content: m.q }, { role: 'assistant', content: m.a }));
          msgs.push({ role: 'user', content: text });
          r = GenieCore.parsePersonaReply(await llm(msgs, { kind: 'dance' }), ACTS); if (strictLLM && !r) throw new Error('模型没有返回有效角色回应，请重试'); health.llm = 'ok'; health.lastError = null;
        } catch (e) { health.llm = 'error'; health.lastError = { at: core.now(), msg: String(e && e.message || e).slice(0, 200) }; if (strictLLM) throw e; }
      }
      return r || MockGenie.persona(card, text, ACTS);
    }

    // ---------- 会说话的游戏角色（第二季第 21、22 课） ----------
    const npcSlot = s => s === 'gate' ? 'gate' : 'npc';
    async function npcReply(card, slot, chat, text) {
      let raw = null;
      if (llm) {
        try {
          const msgs = [{ role: 'system', content: GenieCore.buildNpc(card, slot) }];
          (chat || []).slice(-6).forEach(m => msgs.push({ role: 'user', content: m.q }, { role: 'assistant', content: m.a }));
          msgs.push({ role: 'user', content: text });
          raw = await llm(msgs, { kind: 'npc' }); health.llm = 'ok'; health.lastError = null;
        } catch (e) { health.llm = 'error'; health.lastError = { at: core.now(), msg: String(e && e.message || e).slice(0, 200) }; if (strictLLM) throw e; }
      }
      if (raw == null) raw = MockGenie.npc(card, text, slot).reply;
      return GenieCore.parseNpcReply(raw, card, slot);
    }
    function npcPublic(c) { return { name: c.name, look: c.look, role: c.role, hello: c.hello }; }
    function npcRec(sid, slot, c) {   // 开张以后记在这节课里：大屏、老师端能看到
      const lid = core.state.live.lesson; if (!lid) return;
      const k = lid + '/' + slot; const m = core.state.sd[k] = core.state.sd[k] || {};
      m[sid] = { name: c.name, look: c.look, role: c.role || '', knows: (c.knows || []).filter(Boolean).length, rules: (c.rules || []).filter(Boolean).length, at: core.now() };
    }
    function recordBreach(k, m, owner, by, text, r) {   // 攻门赛：攻破一扇门（每人每轮每扇门只算一次）
      m.breaches = m.breaches || [];
      const round = m.round || 1;
      if (m.breaches.some(b => b.owner === owner && b.by === by && b.round === round)) return null;
      const b = { owner, by, round, how: r.leaked ? '问出了口令' : '骗开了门', text, reply: r.reply, at: core.now() };
      m.breaches.push(b);
      const t = (core.stu(by) || {}).team; if (t) core.act({ role: 'teacher' }, { type: 'team.score', t, d: 1, why: '攻破一扇门' });
      core.state.live.cues.push({ n: 'breach', a: { owner: core.nameOf(owner), by: core.nameOf(by), team: t || null, how: b.how, text }, at: core.now(), id: ++core.state.live.seq });
      return b;
    }

    const api = {
      works, health, TEACHER,
      // 读作品：v 为空时读当前版本
      work(who, sid, proj, v) {
        if (!canOpen(who, sid, proj)) return { err: '不能看' };
        const w = sid === TEACHER ? works.get(sid, proj) : works.open(sid, proj);
        if (!w) return { err: '还没有这个作品' };
        const i = v == null ? w.cur : Math.max(0, Math.min(w.versions.length - 1, v | 0));
        return { code: w.versions[i].code, ver: i, cur: w.cur, n: w.versions.length, name: core.nameOf(sid) || '老师', summary: who.sid === sid || who.role === 'teacher' ? works.summary(w) : null, pending: who.sid === sid ? store.get(sid + '/plan-' + proj) || null : null };
      },
      summary(sid, proj) { return works.summary(works.open(sid, proj)); },
      // plan：先说计划，不改代码；approve：照刚才的计划改；reject：不要这个计划
      async genie(sid, { proj, prompt, error, plan, approve, reject }) {
        prompt = String(prompt || '').trim().slice(0, 1500);
        const pk = sid + '/plan-' + proj, pend = store.get(pk);
        if (reject) { store.put(pk, null); works.note(sid, proj, { prompt: '（不对，我再说清楚）', reply: '好，你再说一遍，我重新想计划。' }); core.changed(); return { changed: false, summary: works.summary(works.open(sid, proj)) }; }
        if (approve && !pend) return { err: '没有等你同意的计划' };
        if (!approve && !prompt && !error) return { err: '先说点什么吧' };
        if (busy[sid]) return { err: '精灵还在改上一句，等一下' };
        if (filter && prompt && filter(prompt)) { talk(sid, { proj, prompt, reply: '换一个吧', flagged: true }); core.changed(); return { reply: '这个精灵不能做。换一个点子吧！', changed: false, summary: works.summary(works.open(sid, proj)) }; }
        const w = works.open(sid, proj); if (!w) return { err: '还没有这个作品' };
        busy[sid] = true; core.changed();
        try {
          const code = works.curCode(w), mode = works.modeOf(proj, code), spec = specRules(sid, proj);
          if (plan && !approve) {
            const r = await askPlan(code, prompt, works.history(w), spec);
            store.put(pk, r.plan && r.plan.length ? { prompt, plan: r.plan, t: core.now() } : null);
            works.note(sid, proj, { prompt, reply: r.reply, plan: r.plan || null });
            talk(sid, { proj, prompt: '（先说计划）' + prompt, reply: r.reply + (r.plan ? ' ' + r.plan.map((x, i) => (i + 1) + '. ' + x).join(' ') : '') });
            return { reply: r.reply, plan: r.plan, changed: false, summary: works.summary(works.open(sid, proj)) };
          }
          const ask = approve ? pend.prompt : (prompt || '游戏出错了，帮我修好');
          if (approve) store.put(pk, null);
          const r = await askGenie(code, ask, mode, works.history(w), error, w.cur + 1, { spec, plan: approve ? pend.plan : null });
          let changed = false;
          if (r.code && r.code !== code) {
            const lines = GenieCore.changedLines(code, r.code);
            works.add(sid, proj, { code: r.code, by: error && !prompt ? 'fix' : 'genie', prompt: approve ? '（同意计划）' + ask : ask, reply: r.reply, lines: lines.lines.slice(0, 4).map(x => x.t.trim().slice(0, 80)), err: error ? String(error).slice(0, 120) : undefined });
            changed = true;
          } else works.note(sid, proj, { prompt: ask, reply: r.reply });
          talk(sid, { proj, prompt: (error ? '（带上报错：' + String(error).slice(0, 60) + '）' : '') + (approve ? '（同意计划）' : '') + ask, reply: r.reply, changed, fail: !!r.fail });
          return { reply: r.reply, changed, summary: works.summary(works.open(sid, proj)) };
        } finally { busy[sid] = false; core.changed(); }
      },
      planOf: (sid, proj) => store.get(sid + '/plan-' + proj) || null,

      // ---------- 游戏说明书（第 19 节起）：精灵每次先读 ----------
      specOf(who, sid, proj) {
        sid = sid || who.sid;
        if (who.role === 'student' && who.sid !== sid) {   // 守规则赛、互测：能看配给你的那个人的说明书
          const m = core.slideData(core.curKey()) || {};
          if (!(m.pairs && m.pairs[who.sid] === sid)) return { err: '不能看' };
        }
        const p = store.get(sid + '/spec-' + proj);
        return { rules: (p && p.rules) || [], name: core.nameOf(sid), t: p ? p.t : null };
      },
      specSave(sid, { proj, rules }) {
        if (!proj) return { err: '没有作品' };
        const list = (Array.isArray(rules) ? rules : []).slice(0, 8).map(x => String(x == null ? '' : x).trim().slice(0, 60));
        if (filter && filter(list.join('；'))) return { err: '说明书里有不合适的话，换一个吧' };
        const k = sid + '/spec-' + proj, old = store.get(k);
        store.put(k, { rules: list, t: core.now() });
        if (!old || JSON.stringify(old.rules) !== JSON.stringify(list.filter(Boolean))) talk(sid, { proj, prompt: '（说明书）' + list.filter(Boolean).map((x, i) => (i + 1) + '. ' + x).join(' '), reply: '' });
        core.changed(); return { ok: true, rules: list };
      },

      // ---------- 需求卡（第 23 节）：给家人做游戏前，先问清楚 ----------
      needsOf: sid => store.get(sid + '/needs') || { card: null },
      needsSave(sid, { card }) {
        card = card || {};
        const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
        const c = { who: t(card.who, 8), name: t(card.name, 16), base: t(card.base, 12), started: !!card.started, qa: (Array.isArray(card.qa) ? card.qa : []).slice(0, 6).map(x => ({ q: t(x && x.q, 30), a: t(x && x.a, 60) })) };
        if (filter && filter(JSON.stringify(c))) return { err: '需求卡里有不合适的话，换一个吧' };
        store.put(sid + '/needs', { card: c, t: core.now() }); core.changed(); return { card: c };
      },
      isBusy: sid => !!busy[sid],
      go(sid, { proj, i }) { const w = works.go(sid, proj, i); return w ? { summary: works.summary(w) } : { err: '没有这个作品' }; },
      resetWork(sid, { proj }) { const w = works.reset(sid, proj); return w ? { summary: works.summary(w) } : { err: '没有这个作品' }; },
      importWork(sid, { proj, code, from }) {
        if (from) { const g = Works.START[from] !== undefined ? Works.START[from] : (GAMES[from] ? from : null); if (g) { code = starter(g); from = g; } else from = null; }
        code = String(code || '');
        if (!/<script/i.test(code)) {   // 只贴了 JS：包一层
          if (/function|const |let |canvas/.test(code)) code = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>我的游戏</title></head><body style="margin:0;background:#FFF7EC"><canvas id="game" width="960" height="540" style="width:100%"></canvas><script>\n${code}\n<\/script></body></html>`;
          else return { err: '这好像不是游戏代码' };
        }
        const bad = GenieCore.validate(code); if (bad) return { err: bad };
        works.add(sid, proj, { code, by: 'import', prompt: null, reply: from ? '从「' + ((GAMES[from] || {}).name || from) + '」开始' : '导入了在家做的游戏' });
        talk(sid, { proj, prompt: '（导入游戏）', reply: '', changed: true }); core.changed();
        return { summary: works.summary(works.open(sid, proj)) };
      },
      gameError(sid, { proj, msg }) { talk(sid, { proj, prompt: '（游戏报错）', reply: String(msg || '').slice(0, 120), error: true }); core.changed(); return {}; },
      talkOf: sid => store.get(talkKey(sid)) || [],

      // ---------- 大屏上的精灵演示（老师用） ----------
      // slot：同一个游戏要演示两遍（比如第 19 节有没有说明书）时各用一份；spec：这一页的说明书；plan/approve：先说计划；error：把报错交给精灵
      async demo({ game, prompt, slot, spec, plan, approve, error, mock }) {   // mock：这一页按剧本用演示精灵（第 19 节演示「忘规则」）
        if (strictLLM && demoBusy) return { err: '精灵还在处理上一句，请稍后再试。' };
        const key = slot || game, proj = 'demo-' + key;
        let w = works.get(TEACHER, proj);
        if (!w) { w = { proj, cur: 0, versions: [{ code: starter(game), by: 'start', t: core.now() }] }; store.put(TEACHER + '/' + proj, w); }
        const live = core.state.live, prev = live.demo && live.demo.key === key ? live.demo : null;
        if (approve) { if (!prev || !prev.plan) return { err: '没有等着同意的计划' }; prompt = prev.planPrompt; }
        prompt = String(prompt || '').trim().slice(0, 1500);
        if (!prompt && !error) return { err: '先说点什么吧' };
        if (!prompt) prompt = '游戏出错了，帮我修好';
        live.demoErr = null;
        live.demo = Object.assign({}, live.demo || {}, { game, key, busy: true, prompt, reply: null, plan: null, error: error || null, id: ++live.seq }); core.changed();
        const code = works.curCode(w);
        const mode = game === 'buggy' || game === 'coins' ? 'bug' : works.modeOf(game === 'blank' ? 'mygame' : 'demo', code);
        demoBusy = true;
        let r;
        try {
          if (plan && !approve) {
            r = await askPlan(code, prompt, works.history(w), spec, mock);
            works.note(TEACHER, proj, { prompt, reply: r.reply, plan: r.plan || null });
            live.demo = { game, key, busy: false, prompt, reply: r.reply, plan: r.plan || null, planPrompt: r.plan ? prompt : null, changed: false, lines: [], ver: w.cur, n: w.versions.length, id: ++live.seq };
            core.changed(); return { reply: r.reply, plan: r.plan };
          }
          r = await askGenie(code, prompt, mode, works.history(w), error || null, w.cur + 1, { spec, plan: approve ? prev.plan : null, mock });
        }
        catch (e) { live.demo = { game, key, busy: false, prompt, reply: e.message, changed: false, lines: [], ver: w.cur, n: w.versions.length, id: ++live.seq }; core.changed(); throw e; }
        finally { demoBusy = false; }
        let lines = null;
        if (r.code && r.code !== code) { lines = GenieCore.changedLines(code, r.code); works.add(TEACHER, proj, { code: r.code, by: 'genie', prompt, reply: r.reply }); }
        else works.note(TEACHER, proj, { prompt, reply: r.reply });
        const w2 = works.get(TEACHER, proj);
        live.demo = { game, key, busy: false, prompt: (approve ? '（同意计划）' : '') + (error && prompt === '游戏出错了，帮我修好' ? '（把报错交给精灵）' : '') + prompt, reply: r.reply, changed: !!lines, lines: lines ? lines.lines.map(x => x.t.trim()) : [], ver: w2.cur, n: w2.versions.length, id: ++live.seq };
        core.changed(); return { reply: r.reply };
      },
      // 大屏上演示的游戏报错了：记下来，老师端可以一键「把报错交给精灵」
      demoError({ key, msg, line }) {
        msg = String(msg || '').slice(0, 200); if (!msg) return {};
        const live = core.state.live, d = live.demo;
        if (d && d.busy) return {};
        live.demoErr = { key: String(key || ''), msg, line: (line | 0) || null, at: core.now(), id: ++live.seq }; core.changed(); return {};
      },
      demoReset({ game, slot }) {
        const key = slot || game;
        store.put(TEACHER + '/demo-' + key, null); core.state.live.demoErr = null;
        core.state.live.demo = { game, key, busy: false, prompt: null, reply: null, ver: 0, n: 1, id: ++core.state.live.seq };
        core.changed(); return {};
      },
      demoCode(key) { const w = works.get(TEACHER, 'demo-' + key); return w ? works.curCode(w) : starter(String(key).split('@')[0]); },   // key：游戏名，或「游戏名@第几份」

      // ---------- 角色卡：第 4 节给小组的比特，第 10 节起给自己的狗（slot = 'mydog'） ----------
      personaOf(sid, slot) {
        const p = store.get(pkey(sid, slot));
        if (p && p.card) return p;
        if (slot === 'mydog') {   // 第一次给自己的狗写：从第 4 节的角色卡抄一份，名字换成狗的名字
          const old = store.get(pkey(sid)); const dn = core.state.cls.dogs[sid] || '';
          const card = Object.assign({ name: '', identity: '', trait: '', extra: '', talk: '', catch: '', voice: '正常', rules: [] }, old && old.card ? JSON.parse(JSON.stringify(old.card)) : {}, { name: dn || (old && old.card ? old.card.name : '') });
          return { card, chat: [], fresh: true, from: old && old.card ? 'L4' : null };
        }
        return p || { card: null, chat: [] };
      },
      personaSave(sid, { card, slot }) {
        if (!card || typeof card !== 'object') return { err: '角色卡是空的' };
        const c = { name: String(card.name || '').slice(0, 10), identity: String(card.identity || '').slice(0, 12), trait: String(card.trait || '').slice(0, 8), extra: String(card.extra || '').slice(0, 60), talk: String(card.talk || '').slice(0, 40), catch: String(card.catch || '').slice(0, 20), voice: String(card.voice || '正常').slice(0, 8), rules: (card.rules || []).slice(0, 6).map(r => ({ when: String(r.when || '').slice(0, 12), do: String(r.do || '').slice(0, 6), say: String(r.say || '').slice(0, 24) })) };
        if (filter && filter(JSON.stringify(c))) return { err: '角色卡里有不合适的话，换一个吧' };
        const k = pkey(sid, slot); const p = store.get(k) || { chat: [] }; p.card = c; store.put(k, p);
        talk(sid, { proj: slot === 'mydog' ? 'mydog' : 'persona', prompt: '（角色卡）' + c.name + '：' + c.identity + '，' + c.trait + (c.rules.length ? '，口令 ' + c.rules.filter(r => r.when).map(r => r.when).join('/') : ''), reply: '', changed: true });
        core.changed(); return { persona: p };
      },
      async personaChat(sid, { text, slot }) {
        text = String(text || '').trim().slice(0, 200); if (!text) return { err: '说点什么吧' };
        const k = pkey(sid, slot);
        const p = store.get(k) || { card: null, chat: [] };
        if (!p.card) return { err: '先填角色卡' };
        if (filter && filter(text)) return { reply: '这个我们不聊，换一个吧！', acts: [] };
        if (busy[sid]) return { err: '比特还在想' };
        busy[sid] = true; core.changed();
        try {
          const r = await personaReply(p.card, p.chat, text);
          p.chat = (p.chat || []).concat([{ q: text, a: r.reply, acts: r.acts, t: core.now() }]).slice(-20); store.put(k, p);
          talk(sid, { proj: slot === 'mydog' ? 'mydog' : 'persona', prompt: text, reply: r.reply + (r.acts.length ? '（' + r.acts.join('、') + '）' : '') });
          return { reply: r.reply, acts: r.acts, persona: p };
        } finally { busy[sid] = false; core.changed(); }
      },
      async personaSend(who, { sid, slot }) {
        const me = who.role === 'teacher' ? sid : who.sid;
        const own = slot === 'mydog';
        const p = store.get(pkey(me, slot)); if (!p || !p.card) return { err: '先填角色卡' };
        const g = own ? null : core.myGroup(me);
        if (who.role === 'student' && !own) {
          if (!g) return { err: '还没分组' };
          const role = (core.view({ role: 'student', sid: me }).me.group || {}).role;
          if (role !== '设计师') return { err: '只有设计师能发给比特，换岗后就轮到你' };
        }
        const owner = core.nameOf(me), dogName = own ? (core.state.cls.dogs[me] || p.card.name || owner + '的狗') : (g ? g.dog : null);
        const payload = { type: 'persona', dog: dogName, owner: own ? owner : null, group: g ? g.no : null, by: owner, name: p.card.name, voice: p.card.voice, prompt: GenieCore.buildPersona(p.card, ACTS) };
        let sent = 'sim';
        if (dog && payload.dog) { try { sent = await dog(payload) || 'sim'; } catch (e) { sent = 'error'; } }
        const lid = core.state.live.lesson;
        const rec = { trait: p.card.trait, name: p.card.name, identity: p.card.identity, by: owner, rules: (p.card.rules || []).filter(r => r.when).length, at: core.now() };
        if (lid && own) { const k = lid + '/mydog'; const m = core.state.sd[k] = core.state.sd[k] || {}; m[me] = rec; }
        else if (lid && g) { const k = lid + '/persona'; const m = core.state.sd[k] = core.state.sd[k] || {}; m[g.id] = rec; }
        core.state.live.cues.push({ n: 'personaSent', a: { own, group: g ? g.no : null, owner: own ? owner : null, team: own ? (core.stu(me) || {}).team : (g ? g.team : null), name: p.card.name, identity: p.card.identity, by: owner, sent }, at: core.now(), id: ++core.state.live.seq });
        core.changed(); return { sent };
      },
      // 大屏上的口令演示（第 11 节）：老师用一张示范角色卡，孩子说一句，大屏上的比特照规则回答
      async demoPersona({ card, text }) {
        text = String(text || '').trim().slice(0, 120); if (!text || !card) return { err: '说点什么吧' };
        const live = core.state.live;
        live.cues.push({ n: 'dogThink', a: { q: text }, at: core.now(), id: ++live.seq }); core.changed();
        const k = TEACHER + '/dogdemo'; const p = store.get(k) || { chat: [] };
        let r;
        try { r = await personaReply(card, p.chat, text); }
        catch (e) { live.cues.push({ n: 'dogSay', a: { q: text, a: e.message, acts: [] }, at: core.now(), id: ++live.seq }); core.changed(); throw e; }
        p.chat = (p.chat || []).concat([{ q: text, a: r.reply, acts: r.acts, t: core.now() }]).slice(-8); store.put(k, p);
        live.cues.push({ n: 'dogSay', a: { q: text, a: r.reply, acts: r.acts }, at: core.now(), id: ++live.seq });
        core.changed(); return { reply: r.reply, acts: r.acts };
      },

      // ---------- 会说话的游戏角色（第二季第 21、22 课） ----------
      npcOf(who, sid, slot) {
        slot = npcSlot(slot); sid = sid || who.sid;
        const p = store.get(sid + '/' + slot), c = p && p.card;
        if (!c) return { card: null, published: false };
        const mine = who.role === 'teacher' || who.sid === sid;
        return { card: mine ? c : npcPublic(c), published: !!p.published, name: core.nameOf(sid) };
      },
      npcSave(sid, { slot, card }) {
        slot = npcSlot(slot); card = card || {};
        const t = (v, n) => String(v == null ? '' : v).trim().slice(0, n || 60);
        const c = { name: t(card.name, 10), look: t(card.look, 8), role: t(card.role, 12), trait: t(card.trait, 8), talk: t(card.talk, 40), hello: t(card.hello, 50), secret: t(card.secret, 12),
          knows: (Array.isArray(card.knows) ? card.knows : []).slice(0, 3).map(x => t(x)), rules: (Array.isArray(card.rules) ? card.rules : []).slice(0, 5).map(x => t(x)) };
        if (filter && filter(JSON.stringify(c))) return { err: '角色卡里有不合适的话，换一个吧' };
        const k = sid + '/' + slot, p = store.get(k) || {};
        p.card = c; store.put(k, p);
        if (p.published) { npcRec(sid, slot, c); core.changed(); }
        return { ok: true };
      },
      npcPublish(sid, { slot }) {
        slot = npcSlot(slot);
        const k = sid + '/' + slot, p = store.get(k);
        if (!p || !p.card || !p.card.name) return { err: '先给它起个名字' };
        if (slot === 'gate' && !p.card.secret) return { err: '先定一个开门口令' };
        p.published = true; store.put(k, p);
        npcRec(sid, slot, p.card);
        core.state.live.cues.push({ n: 'npcPub', a: { sid, name: p.card.name, look: p.card.look, owner: core.nameOf(sid) }, at: core.now(), id: ++core.state.live.seq });
        talk(sid, { proj: slot, prompt: '（' + (slot === 'gate' ? '派门卫去守门' : '角色开张') + '）' + p.card.name, reply: '', changed: true });
        core.changed(); return { ok: true };
      },
      async npcChat(who, { owner, slot, text }) {
        slot = npcSlot(slot); text = String(text || '').trim().slice(0, 120);
        if (!text) return { err: '说点什么吧' };
        const me = who.role === 'teacher' ? TEACHER : who.sid;
        owner = owner || me;
        const p = store.get(owner + '/' + slot); if (!p || !p.card) return { err: '这个角色还没有角色卡' };
        const self = owner === me;
        if (!self && who.role === 'student' && !p.published) return { err: '这个角色还没开张' };
        const s = core.curSlide(), k = core.curKey(), m = (k && core.state.sd[k]) || {};
        const atGate = slot === 'gate' && s && s.type === 'gate';
        if (atGate && who.role === 'student' && !self) {   // 攻门赛：只能攻配给你的那扇门
          if (m.phase !== 'attack') return { err: '现在不是攻门时间' };
          if ((m.pairs || {})[me] !== owner) return { err: '这不是你要攻的门' };
        }
        if (filter && filter(text)) return { reply: '这个我们不聊，换一个吧！', open: false, leaked: false };
        if (busy[me]) return { err: '它还在想，等一下' };
        busy[me] = true;
        const hk = owner + '/' + slot + '-chat-' + me, h = store.get(hk) || { chat: [] };
        try {
          const r = await npcReply(p.card, slot, h.chat, text);
          h.chat = (h.chat || []).concat([{ q: text, a: r.reply, t: core.now() }]).slice(-10); store.put(hk, h);
          if (me !== TEACHER) talk(me, { proj: slot, prompt: (self ? '（自己试）' : '（对' + core.nameOf(owner) + '的' + (slot === 'gate' ? '门卫' : '角色') + '）') + text, reply: r.reply + (r.open ? '【开门】' : '') });
          const breach = (r.leaked || r.open) && !self && atGate && who.role === 'student' && m.phase === 'attack' ? recordBreach(k, m, owner, me, text, r) : null;
          return { reply: r.reply, open: r.open, leaked: r.leaked, breach: !!breach };
        } finally { busy[me] = false; core.changed(); }
      },
      async npcDemo({ card, slot, text }) {   // 大屏上的角色演示（老师用）
        slot = npcSlot(slot); text = String(text || '').trim().slice(0, 120);
        if (!text || !card) return { err: '说点什么吧' };
        const live = core.state.live;
        live.cues.push({ n: 'npcThink', a: { q: text }, at: core.now(), id: ++live.seq }); core.changed();
        const k = TEACHER + '/npcdemo-' + slot, h = store.get(k) || { chat: [] };
        const r = await npcReply(card, slot, h.chat, text);
        h.chat = (h.chat || []).concat([{ q: text, a: r.reply, t: core.now() }]).slice(-8); store.put(k, h);
        live.cues.push({ n: 'npcSay', a: { q: text, a: r.reply, open: r.open, leaked: r.leaked }, at: core.now(), id: ++live.seq });
        core.changed(); return r;
      },

      // ---------- 上台的狗（不用实体狗时）：老师请一个孩子的虚拟狗上大屏，大家用平板跟它说话 ----------
      stagePick({ sid }) {
        if (!sid) { core.act({ role: 'teacher' }, { type: 'stage.pick', sid: null }); return { ok: true }; }
        const p = store.get(pkey(sid, 'mydog'));
        if (!p || !p.card) return { err: '这只狗还没有角色卡' };
        const c = p.card;
        core.act({ role: 'teacher' }, { type: 'stage.pick', sid, card: { name: c.name, identity: c.identity, trait: c.trait, voice: c.voice, rules: (c.rules || []).filter(r => r.when) } });
        return { ok: true };
      },
      async stageChat(who, { text }) {
        text = String(text || '').trim().slice(0, 120); if (!text) return { err: '说点什么吧' };
        const s = core.curSlide(), k = core.curKey(), m = (k && core.state.sd[k]) || {}, c = m.cur;
        if (!s || !c || !c.sid) return { err: '还没有狗上台' };
        if (who.role === 'student') {
          if (s.type === 'stage' && who.sid !== c.sid) return { err: '台上的同学在跟狗说话，先看大屏' };
          if (s.type === 'guessmood' && who.sid === c.sid) return { err: '你的狗在台上，让大家来问它' };
          if (s.type === 'guessmood' && c.revealed) return { err: '已经揭晓了，等下一只狗' };
        }
        if (filter && filter(text)) return { err: '这个我们不聊，换一个吧' };
        const p = store.get(pkey(c.sid, 'mydog')); if (!p || !p.card) return { err: '这只狗还没有角色卡' };
        if (busy.__stage) return { err: '它还在想，等一下' };
        busy.__stage = true;
        const live = core.state.live, by = who.role === 'student' ? core.nameOf(who.sid) : '';
        live.cues.push({ n: 'dogThink', a: { q: text, by }, at: core.now(), id: ++live.seq }); core.changed();
        const hk = c.sid + '/stage', h = store.get(hk) || { chat: [] };
        try {
          const r = await personaReply(p.card, h.chat, text);
          h.chat = (h.chat || []).concat([{ q: text, a: r.reply, acts: r.acts, t: core.now() }]).slice(-8); store.put(hk, h);
          live.cues.push({ n: 'dogSay', a: { q: text, a: r.reply, acts: r.acts, by }, at: core.now(), id: ++live.seq });
          return { reply: r.reply, acts: r.acts };
        } catch (e) {
          live.cues.push({ n: 'dogSay', a: { q: text, a: '我没听清，再说一遍？', acts: [], by }, at: core.now(), id: ++live.seq });
          return { err: '它没回答上来，再试一次' };
        } finally { busy.__stage = false; core.changed(); }
      },

      // ---------- 游戏设计卡（第 6 节） ----------
      designOf: sid => store.get(sid + '/design') || { card: null },
      designSave(sid, { card }) {
        if (!card || typeof card !== 'object') return { err: '设计卡是空的' };
        const f = k => String(card[k] || '').slice(0, 80);
        const c = { name: String(card.name || '').slice(0, 16), hero: f('hero'), rule: f('rule'), score: f('score'), end: f('end'), extra: f('extra') };
        if (filter && filter(JSON.stringify(c))) return { err: '设计卡里有不合适的话，换一个吧' };
        store.put(sid + '/design', { card: c, t: core.now() }); core.changed(); return { card: c };
      },

      // ---------- 大屏上的编舞演示（老师用） ----------
      async demoDance({ prompt, mood }) {
        let r = null;
        if (mood && MOODS[mood]) r = { reply: '', seq: MOODS[mood].seq.slice(), mood, repeat: 1 };
        else {
          prompt = String(prompt || '').trim().slice(0, 200); if (!prompt) return { err: '先说想要什么舞' };
          core.state.live.cues.push({ n: 'danceThink', a: { prompt }, at: core.now(), id: ++core.state.live.seq }); core.changed();
          if (llm) { try { r = GenieCore.parseDance(await llm(GenieCore.buildDanceMessages({ prompt }), { kind: 'dance' }), ACTS, MOODS); if (strictLLM && !r) throw new Error('模型没有返回有效舞步，请换个说法重试。'); health.llm = 'ok'; health.lastError = null; } catch (e) { health.llm = 'error'; health.lastError = { at: core.now(), msg: String(e.message).slice(0, 200) }; if (strictLLM) { core.state.live.cues.push({ n: 'dance', a: { prompt, reply: e.message, seq: [], mood: '', repeat: 1 }, at: core.now(), id: ++core.state.live.seq }); core.changed(); throw e; } } }
          if (!r) r = MockGenie.dance(prompt, MOODS);
        }
        core.state.live.cues.push({ n: 'dance', a: { prompt: prompt || null, reply: r.reply, seq: r.seq, mood: r.mood, repeat: r.repeat }, at: core.now(), id: ++core.state.live.seq });
        core.changed(); return { dance: r };
      },
      // ---------- 编舞 ----------
      async dance(sid, { prompt }) {
        prompt = String(prompt || '').trim().slice(0, 200); if (!prompt) return { err: '先说想要什么舞' };
        if (filter && filter(prompt)) return { reply: '换一个说法吧！' };
        if (busy[sid]) return { err: '比特还在想，等一下' };
        busy[sid] = true; core.changed();
        try {
          const key = sid + '/dance'; const d = store.get(key) || { dances: [], cur: -1 };
          let r = null;
          if (llm) {
            try { r = GenieCore.parseDance(await llm(GenieCore.buildDanceMessages({ prompt, history: d.dances }), { kind: 'dance' }), ACTS, MOODS); if (strictLLM && !r) throw new Error('模型没有返回有效舞步，请换个说法重试。'); health.llm = 'ok'; health.lastError = null; }
            catch (e) { health.llm = 'error'; health.lastError = { at: core.now(), msg: String(e && e.message || e).slice(0, 200) }; if (strictLLM) throw e; }
          }
          if (!r) r = MockGenie.dance(prompt, MOODS);
          d.dances.push({ prompt, reply: r.reply, seq: r.seq, mood: r.mood, repeat: r.repeat, t: core.now() }); d.dances = d.dances.slice(-20); d.cur = d.dances.length - 1;
          store.put(key, d); talk(sid, { proj: 'dance', prompt, reply: r.reply + ' ' + r.seq.join('、'), changed: true });
          return { dance: d };
        } finally { busy[sid] = false; core.changed(); }
      },
      danceEdit(sid, { seq, repeat, mood }) {   // 孩子自己调顺序、重复
        const key = sid + '/dance'; const d = store.get(key) || { dances: [], cur: -1 };
        const s = (seq || []).filter(a => ACTS.includes(a)).slice(0, 12); if (!s.length) return { err: '至少要有一个动作' };
        const base = d.dances[d.cur] || { prompt: '我自己排的', reply: '' };
        d.dances.push({ prompt: base.prompt, reply: '自己调过', seq: s, mood: MOODS[mood] ? mood : (base.mood || '开心'), repeat: Math.max(1, Math.min(4, repeat | 0 || 1)), t: core.now(), edited: true });
        d.dances = d.dances.slice(-20); d.cur = d.dances.length - 1; store.put(key, d); core.changed();
        return { dance: d };
      },
      danceOf: sid => store.get(sid + '/dance') || { dances: [], cur: -1 },
      async danceSend(who, { sid, i, own }) {
        const me = who.role === 'teacher' ? sid : who.sid;
        const d = store.get(me + '/dance'); const one = d && d.dances[i == null ? d.cur : i];
        if (!one) return { err: '还没编舞' };
        const g = own ? null : core.myGroup(me);
        if (own) {   // 发给自己的狗
          const owner = core.nameOf(me), dogName = core.state.cls.dogs[me] || owner + '的狗';
          const payload = { dog: dogName, owner, group: null, by: owner, actions: one.seq, mood: one.mood, repeat: one.repeat };
          let sent = 'sim';
          if (dog) { try { sent = await dog(payload) || 'sim'; } catch (e) { sent = 'error'; } }
          core.state.live.cues.push({ n: 'dogDance', a: Object.assign({ sent, team: (core.stu(me) || {}).team }, payload), at: core.now(), id: ++core.state.live.seq });
          const k = core.curKey(); if (k) { const m = core.state.sd[k] = core.state.sd[k] || {}; m.sent = (m.sent || []).concat([Object.assign({ at: core.now() }, payload)]).slice(-40); }
          core.changed(); return { sent };
        }
        if (who.role === 'student') {
          if (!g) return { err: '还没分组' };
          const role = (core.view({ role: 'student', sid: me }).me.group || {}).role;
          if (role !== '设计师') return { err: '只有设计师能发给比特，换岗后就轮到你' };
        }
        const payload = { dog: g ? g.dog : null, group: g ? g.no : null, by: core.nameOf(me), actions: one.seq, mood: one.mood, repeat: one.repeat };
        let sent = 'sim';
        if (dog && payload.dog) { try { sent = await dog(payload) || 'sim'; } catch (e) { sent = 'error'; } }
        core.state.live.cues.push({ n: 'dogDance', a: Object.assign({ sent }, payload), at: core.now(), id: ++core.state.live.seq });
        const k = core.curKey(); if (k) { const m = core.state.sd[k] = core.state.sd[k] || {}; m.sent = (m.sent || []).concat([Object.assign({ at: core.now() }, payload)]).slice(-40); }
        core.changed();
        return { sent };
      }
    };
    return api;
  }
  return { create, TEACHER };
});
