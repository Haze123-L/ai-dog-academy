// ================= 孩子的作品：每个项目一串版本（版本时光机） =================
// 服务器把它存在文件里，在线试玩版存在内存里。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Works = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // 项目从哪个起始游戏开始
  const START = { catch: 'catch', runner: 'runner', whack: 'whack', buggy: 'buggy', match1: 'runner', home: 'blank', trick: 'runner', fix: 'runner', mygame: 'blank', move: 'home0', rule: 'home1', snake: 'snake', monster: 'monster', maze: 'maze', breakout: 'breakout', boss: 'boss', star: 'star', coins: 'coins', rules: 'catch', family: 'blank' };
  const MODE = { buggy: 'bug', fix: 'bug', trick: 'trick', coins: 'bug' };
  const MAX = 40;

  function create({ store, starter, core, now, label }) {
    label = label || (s => s);
    now = now || (() => Date.now());
    const k = (sid, proj) => sid + '/' + proj;

    function trickPairs() {   // 当前（或最近一次）捣蛋卡的配对
      const st = core.state.sd; let best = null;
      Object.keys(st).forEach(key => { const m = st[key]; if (m && m.pairs && m.cards && (!best || (m.at || 0) > (best.at || 0))) best = m; });
      return best;
    }
    function initCode(sid, proj) {
      if (proj === 'trick') { const own = get(sid, 'runner'); return { code: own ? curCode(own) : starter('runner'), from: own ? '复制了我的跑酷' : label('runner') }; }
      if (proj === 'fix') {
        const m = trickPairs(); const from = m && m.pairs[sid];
        if (!from) return null;
        const t = get(from, 'trick'); return { code: t ? curCode(t) : starter('runner'), from: '来自 ' + core.nameOf(from) };
      }
      const s = START[proj]; if (!s) return null;
      return { code: starter(s), from: label(s) };
    }
    const curCode = w => { const v = w.versions[w.cur]; return v ? v.code : ''; };
    function get(sid, proj) { return store.get(k(sid, proj)); }
    function open(sid, proj) {
      let w = get(sid, proj);
      if (!w) {
        const init = initCode(sid, proj); if (!init) return null;
        w = { proj, cur: 0, versions: [{ code: init.code, by: 'start', prompt: null, reply: init.from, t: now() }] };
        store.put(k(sid, proj), w);
      }
      return w;
    }
    function add(sid, proj, v) {
      const w = open(sid, proj); if (!w) return null;
      w.versions = w.versions.slice(0, w.cur + 1);   // 回到旧版本后再改：后面的版本作废
      w.versions.push(Object.assign({ t: now() }, v));
      if (w.versions.length > MAX) { w.versions.splice(1, w.versions.length - MAX); }
      w.cur = w.versions.length - 1;
      store.put(k(sid, proj), w); return w;
    }
    function note(sid, proj, v) {   // 只记一句对话，代码不变（精灵反问时）
      const w = open(sid, proj); if (!w) return null;
      w.talk = (w.talk || []).concat([Object.assign({ t: now() }, v)]).slice(-30);
      store.put(k(sid, proj), w); return w;
    }
    function go(sid, proj, i) {
      const w = open(sid, proj); if (!w) return null;
      w.cur = Math.max(0, Math.min(w.versions.length - 1, i | 0)); store.put(k(sid, proj), w); return w;
    }
    function reset(sid, proj) { store.put(k(sid, proj), null); return open(sid, proj); }
    function summary(w) {   // 给平板看的：版本列表不带代码
      if (!w) return null;
      return { proj: w.proj, cur: w.cur, n: w.versions.length, versions: w.versions.map((v, i) => ({ i, by: v.by, prompt: v.prompt, reply: v.reply, t: v.t, lines: v.lines || null })), talk: w.talk || [] };
    }
    function history(w) {   // 给大模型看的最近几句
      const out = [];
      const items = w.versions.filter(v => v.prompt).map(v => ({ prompt: v.prompt, reply: v.reply, t: v.t })).concat((w.talk || []).map(x => ({ prompt: x.prompt, reply: x.reply, t: x.t })));
      items.sort((a, b) => a.t - b.t).slice(-4).forEach(x => out.push(x));
      return out;
    }
    const modeOf = (proj, code) => MODE[proj] || ((proj === 'home' || proj === 'mygame' || proj === 'family') && /<title>我的新游戏<\/title>/.test(code) && code.includes('这是一个空白游戏') ? 'blank' : 'make');
    return { open, get, add, note, go, reset, curCode, summary, history, modeOf, START };
  }
  return { create, START, MODE };
});
