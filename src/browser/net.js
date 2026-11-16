// 三端明确标注模拟或尚未配置，避免把规则响应当成真实模型。
function showModelStatus(view) {
  const mode = view.aiMode || 'demo';
  let banner = document.getElementById('model-status-notice');
  if (!banner) { banner = document.createElement('div'); banner.id = 'model-status-notice'; banner.setAttribute('role', 'status'); banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:10000;text-align:center;background:#fff0c9;color:#594320;font:13px sans-serif;padding:5px;pointer-events:none'; document.body.appendChild(banner); }
  banner.hidden = mode === 'api';
  banner.textContent = mode === 'demo' ? '演示模式：规则模拟，未调用真实 AI' : '尚未配置 AI：请老师在设置中填写模型接口';
}
// ================= 三端通信 =================
// 连服务器：实时推送用 SSE，操作用 fetch。
// 连本地：大屏单机模式、在线试玩版，课堂就跑在同一个页面里（window.LocalHub）。
function makeNet({ role, key, tok, hub, sid, screenToken }) {
  const who = { role, sid };
  if (hub) {
    return {
      role, local: true, hub,
      setTok(t, s) { tok = t; who.sid = s; },
      connect(onView, onStatus) { onStatus && onStatus('ok'); return hub.connect(who, v => { showModelStatus({ aiMode: 'demo' }); onView(v); }); },
      act(a) { return Promise.resolve(hub.act(who, a)); },
      post(p, body) { return hub.post(who, p, body || {}); },
      get(p, q) { return hub.get(who, p, q || {}); },
      qrUrl() { return null; }
    };
  }
  const auth = () => role === 'teacher' ? { k: key } : role === 'student' ? { t: tok } : { role: 'screen', s: screenToken };
  const qs = o => Object.keys(o).filter(k => o[k] != null).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(o[k])).join('&');
  async function req(method, p, body, q) {
    const url = '/api/' + p + (method === 'GET' ? '?' + qs(Object.assign({}, q, auth())) : '');
    const r = await fetch(url, method === 'GET' ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({}, body, auth())) });
    let j = {}; try { j = await r.json(); } catch (e) { }
    if (!r.ok && !j.err) j.err = '网络出错（' + r.status + '）';
    return j;
  }
  return {
    role, local: false,
    setTok(t, s) { tok = t; who.sid = s; },
    connect(onView, onStatus) {
      let es = null, dead = false, retry = 0;
      const open = () => {
        if (dead) return;
        es = new EventSource('/api/stream?' + qs(auth()));
        es.onmessage = e => { retry = 0; onStatus && onStatus('ok'); try { const view = JSON.parse(e.data); showModelStatus(view); onView(view); } catch (x) { console.error(x); } };
        es.onerror = () => {
          onStatus && onStatus('lost');
          if (es.readyState === 2) { es.close(); setTimeout(open, Math.min(8000, 1000 * ++retry)); }
        };
      };
      open();
      return () => { dead = true; if (es) es.close(); };
    },
    act(a) { return req('POST', 'act', { a }); },
    post(p, body) { return req('POST', p, body || {}); },
    get(p, q) { return req('GET', p, null, q || {}); },
    qrUrl(u) { return '/api/qr?u=' + encodeURIComponent(u); }
  };
}

// 服务器时间和本机时间差一点也没关系：倒计时按服务器给的「还剩几秒」算
const Clock = {
  off: 0,
  sync(serverNow) { if (serverNow) this.off = serverNow - Date.now(); },
  now() { return Date.now() + this.off; },
  left(t) { if (!t) return 0; return t.running ? Math.max(0, (t.endsAt - this.now()) / 1000) : (t.left || 0); },
  fmt(sec) { const s = Math.ceil(sec); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
};

// 在 iframe 里安全地跑一个孩子的游戏
function runGame(frame, code, onError) {
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.srcdoc = GenieCore.wrapForRun(code);
  if (frame._errOff) frame._errOff();
  const h = e => { if (e.source === frame.contentWindow && e.data && e.data.gameError) onError && onError(e.data.gameError, e.data.line); };
  window.addEventListener('message', h);
  frame._errOff = () => window.removeEventListener('message', h);
}
