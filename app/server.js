// ================= AI 驯狗学院 · 课堂服务 =================
// 用法：在老师电脑上运行 `node server.js`，平板和大屏连同一个 Wi-Fi 打开屏幕上显示的网址。
// 不需要安装任何依赖包（Node 22 以上）。
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { URL } = require('url');

const PUBLIC_MODE = process.env.XGXY_PUBLIC !== '0';
// 仅用户明确启用的现场课堂允许扫码后只输名字。
const NAME_ONLY_JOIN = PUBLIC_MODE && process.env.XGXY_NAME_ONLY_JOIN === '1';
if (PUBLIC_MODE && process.env.XGXY_REVIEW === '1') throw new Error('公网模式不能启用自动登录的本机预览');
const ROOT = __dirname;
const DATA = process.env.XGXY_DATA || path.join(ROOT, 'data');
const PUB = path.join(ROOT, 'public');
const GAMES_DIR = path.join(ROOT, 'games');
// 开源版仅使用部署者自己的兼容 API；显式预览模式使用本地模拟。
const LOCAL_REVIEW = process.env.XGXY_REVIEW === '1';
// 本机预览默认只给这台电脑用；XGXY_LAN=1 时同一 Wi-Fi 的平板也能连（老师端自动进入仍只限本机）
const REVIEW_LAN = LOCAL_REVIEW && process.env.XGXY_LAN === '1';
fs.mkdirSync(path.join(DATA, 'works'), { recursive: true });

const ClassCore = require('./lib/core-state.js');
const Service = require('./lib/service.js');
const qrcode = require('./lib/qrcode.js');
const LESSONS_PACK = require('./lib/lessons-pack.js');   // { LESSONS, GAMES, ACTS, MOODS }

// ---------- 配置 ----------
const CFG_FILE = path.join(DATA, 'config.json');
const DEFAULT_CFG = {
  port: 8080,
  teacherKey: PUBLIC_MODE ? crypto.randomBytes(24).toString('hex') : String(crypto.randomInt(100000, 999999)),
  llm: { provider: 'none', base: '', key: '', model: '', timeout: 90 },
  asr: { base: '', key: '', model: '' },
  dogs: {}   // 可选机器狗接收地址，由部署者自行配置
};
function loadJSON(f, d) { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } }
const cfg = Object.assign({}, DEFAULT_CFG, loadJSON(CFG_FILE, {}));
if (PUBLIC_MODE) {
  if (process.env.XGXY_TEACHER_KEY) cfg.teacherKey = process.env.XGXY_TEACHER_KEY;
  if (!/^[A-Za-z0-9_-]{32,}$/.test(cfg.teacherKey)) throw new Error('公网老师口令至少需要 32 位随机字母数字；请在独立配置或 XGXY_TEACHER_KEY 中设置');
  if (!cfg.screenKey) cfg.screenKey = crypto.randomBytes(24).toString('hex');
  if (!/^[A-Za-z0-9_-]{32,}$/.test(cfg.screenKey)) throw new Error('公网大屏口令至少需要 32 位随机字母数字');
}
cfg.llm = Object.assign({}, DEFAULT_CFG.llm, cfg.llm || {});
for (const [field, env] of Object.entries({ provider: 'XGXY_LLM_PROVIDER', base: 'XGXY_LLM_BASE', model: 'XGXY_LLM_MODEL', key: 'XGXY_LLM_KEY' })) { if (process.env[env] != null) cfg.llm[field] = process.env[env]; }
const saveCfg = () => { const out = Object.assign({}, cfg, { port: cfg.savedPort || cfg.port }); delete out.savedPort; fs.writeFileSync(CFG_FILE, JSON.stringify(out, null, 2), { mode: 0o600 }); };
saveCfg();
if (process.env.PORT) { cfg.savedPort = cfg.port; cfg.port = +process.env.PORT; }

// ---------- 存数据 ----------
const STATE_FILE = path.join(DATA, 'class.json');
let saveTimer = null;
function saveState() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { fs.writeFileSync(STATE_FILE + '.tmp', JSON.stringify(core.snapshot())); fs.renameSync(STATE_FILE + '.tmp', STATE_FILE); } catch (e) { console.error('存档失败', e.message); } }, 400); }
const safe = s => String(s).replace(/[^a-zA-Z0-9_\-一-龥]/g, '_');
const store = {   // 作品：data/works/<学生>/<项目>.json
  cache: new Map(),
  file(k) { const [a, b] = k.split('/'); return path.join(DATA, 'works', safe(a), safe(b) + '.json'); },
  get(k) { if (this.cache.has(k)) return this.cache.get(k); const v = loadJSON(this.file(k), null); this.cache.set(k, v); return v; },
  put(k, v) {
    this.cache.set(k, v); const f = this.file(k);
    try { if (v == null) { try { fs.unlinkSync(f); } catch (e) { } return; } /* 不用 fs.rmSync：Node 24 在 Windows 上删中文路径的文件会让整个进程崩掉 */ fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v)); } catch (e) { console.error('存作品失败', e.message); }
  }
};

// ---------- 内容过滤（大模型那边还会再把关） ----------
const BAD = ['血腥', '砍头', '自杀', '色情', '裸体', '傻逼', '傻B', '操你', '他妈的', '妈的', '去死', '尼玛', '草泥马', 'fuck', 'shit', '鸡巴', '婊子', '贱人', '弱智', '脑残'];
const filter = t => { const s = String(t || '').toLowerCase(); return BAD.some(w => s.includes(w.toLowerCase())); };

// ---------- 起始游戏 ----------
const starterCache = {};
function starter(name) {
  const g = LESSONS_PACK.GAMES[name]; if (!g) return '';
  if (!starterCache[name]) starterCache[name] = fs.readFileSync(path.join(GAMES_DIR, g.file), 'utf8');
  return starterCache[name];
}

// ---------- 大模型（OpenAI 兼容接口：DeepSeek、通义千问、豆包、硅基流动都行） ----------
function endpoint(value) {
  let u; try { u = new URL(value); } catch { throw new Error('接口地址格式无效'); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.search || u.hash) throw new Error('接口地址只接受 HTTP/HTTPS，不能包含账号、查询参数或片段');
  return u;
}
function postJSON(urlStr, body, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = endpoint(urlStr), lib = u.protocol === 'https:' ? https : http;
    const data = Buffer.from(JSON.stringify(body));
    const req = lib.request({ method: 'POST', hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': data.length }, headers), timeout: timeoutMs }, res => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => { const t = Buffer.concat(chunks).toString('utf8'); if (res.statusCode >= 300) return reject(new Error(`大模型接口返回 HTTP ${res.statusCode}，请老师核对密钥、额度和模型设置`)); try { resolve(JSON.parse(t)); } catch (e) { reject(new Error('大模型返回的不是 JSON')); } });
    });
    req.on('timeout', () => req.destroy(new Error('大模型太久没回应')));
    req.on('error', () => reject(new Error('模型服务连接失败或超时，请老师检查网络和接口设置'))); req.write(data); req.end();
  });
}
function getJSON(urlStr, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = endpoint(urlStr), lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({ method: 'GET', hostname: u.hostname, port: u.port || undefined, path: u.pathname + u.search, headers, timeout: timeoutMs }, res => {
      const chunks = []; res.on('data', c => chunks.push(c));
      res.on('end', () => { const t = Buffer.concat(chunks).toString('utf8'); if (res.statusCode >= 300) return reject(new Error(`模型列表接口返回 HTTP ${res.statusCode}，请核对服务商设置`)); try { resolve(JSON.parse(t)); } catch (e) { reject(new Error('返回的不是 JSON')); } });
    });
    req.on('timeout', () => req.destroy(new Error('超时'))); req.on('error', () => reject(new Error('模型服务连接失败或超时，请老师检查网络和接口设置'))); req.end();
  });
}
const llmReady = () => !LOCAL_REVIEW && !['none', 'demo'].includes(cfg.llm.provider) && cfg.llm.base && cfg.llm.key && cfg.llm.model;
async function llm(messages, opt) {
  const base = cfg.llm.base.replace(/\/+$/, '');
  const body = { model: cfg.llm.model, messages, temperature: opt && opt.kind === 'dance' ? 0.8 : 0.3, max_tokens: opt && opt.kind === 'dance' ? 400 : 8000, stream: false };
  const r = await postJSON(base + '/chat/completions', body, { Authorization: 'Bearer ' + cfg.llm.key }, (cfg.llm.timeout || 90) * 1000);
  const c = r && r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content;
  if (!c) throw new Error('大模型没有给出回答');
  return cfg.llm.key ? String(c).split(cfg.llm.key).join('[密钥已隐藏]') : c;
}

// ---------- 机器狗 ----------
async function dog(payload) {
  if (LOCAL_REVIEW) return 'sim';
  const d = cfg.dogs && (cfg.dogs[payload.dog] || (payload.owner && cfg.dogs[payload.owner]));
  if (!d || !d.url) return 'sim';
  await postJSON(d.url, payload, {}, 8000);
  return 'sent';
}

// ---------- 核心 ----------
const core = ClassCore.create({ rand: PUBLIC_MODE ? () => crypto.randomInt(0, 2 ** 48 - 1) / (2 ** 48 - 1) : undefined, lessons: LESSONS_PACK.LESSONS, saved: loadJSON(STATE_FILE, null), filter });
if (PUBLIC_MODE) core.state.cls.needCode = !NAME_ONLY_JOIN;
const svc = Service.create({ strictLLM: true, core, store, starter, llm: (m, o) => llmReady() ? llm(m, o) : Promise.reject(new Error('尚未配置大模型，请老师在设置中填写自己的接口、密钥和模型名')), dog, filter, ACTS: LESSONS_PACK.ACTS, MOODS: LESSONS_PACK.MOODS, GAMES: LESSONS_PACK.GAMES, log: m => console.log(m) });
// 只有明确选中演示模式才允许模拟；真实 API 失败不回退。
const svcLLM = () => llmReady();
const svcMock = Service.create({ core, store, starter, llm: null, dog, filter, ACTS: LESSONS_PACK.ACTS, MOODS: LESSONS_PACK.MOODS, GAMES: LESSONS_PACK.GAMES });
const demoMode = () => LOCAL_REVIEW || cfg.llm.provider === 'demo';
const S = () => demoMode() ? svcMock : svc;
core.onChange(() => { if (PUBLIC_MODE) core.state.cls.needCode = !NAME_ONLY_JOIN; saveState(); scheduleBroadcast(); dogsFollow(); });
// 全体趴下、轮流开口：告诉配置了地址的真狗（狗的名字或主人的名字 = 地址）
let dogMode = '';
function dogsFollow() {
  if (LOCAL_REVIEW) return;
  const L = core.state.live, mode = (L.sleep ? 'all' : '') + '|' + (L.turn || '');
  if (mode === dogMode) return; dogMode = mode;
  const teamOf = {}; core.state.cls.roster.forEach(r => { teamOf[r.name] = r.team; const dn = core.state.cls.dogs[r.sid]; if (dn) teamOf[dn] = r.team; });
  Object.keys(cfg.dogs || {}).forEach(name => {
    const d = cfg.dogs[name]; if (!d || !d.url) return;
    const sleep = !!L.sleep || (!!L.turn && teamOf[name] && teamOf[name] !== L.turn);
    postJSON(d.url, { type: 'sleep', dog: name, on: sleep }, {}, 5000).catch(() => { });
  });
}
setInterval(() => core.tick(), 500);

// ---------- 实时推送（SSE） ----------
const clients = new Set();
let bTimer = null;
function scheduleBroadcast() { if (bTimer) return; bTimer = setTimeout(() => { bTimer = null; broadcast(); }, 60); }
function viewFor(c) {
  const v = core.view(c.who);
  v.nameOnlyJoin = NAME_ONLY_JOIN;
  v.aiMode = demoMode() ? 'demo' : llmReady() ? 'api' : 'unconfigured';
  if (c.who.role === 'teacher') {
    v.busy = core.state.cls.roster.filter(r => S().isBusy(r.sid)).map(r => r.sid);
    v.llm = { ready: !!llmReady(), provider: cfg.llm.provider, model: cfg.llm.model, health: svc.health.llm, lastError: svc.health.lastError };
    v.join = joinInfo();
    if (PUBLIC_MODE) { v.screenUrl = v.join.url + 'screen?s=' + encodeURIComponent(cfg.screenKey); v.screenKey = cfg.screenKey; v.publicMode = true; }
  } else if (c.who.role === 'screen') { v.join = joinInfo(); v.publicMode = PUBLIC_MODE; }
  else if (c.who.role === 'student') v.busy = S().isBusy(c.who.sid);
  return v;
}
function broadcast() {
  for (const c of clients) {
    let s; try { s = JSON.stringify(viewFor(c)); } catch (e) { continue; }
    if (s === c.last) continue; c.last = s;
    try { c.res.write('data: ' + s + '\n\n'); } catch (e) { }
  }
}
setInterval(() => { for (const c of clients) { try { c.res.write(': ping\n\n'); } catch (e) { } } }, 20000);

// ---------- 网址和二维码 ----------
function lanAddrs() {
  const out = []; const ifs = os.networkInterfaces();
  Object.keys(ifs).forEach(n => (ifs[n] || []).forEach(a => { if (a.family === 'IPv4' && !a.internal) out.push(a.address); }));
  return out.sort((a, b) => (/^192\.168\./.test(b) - /^192\.168\./.test(a)));
}
function joinInfo() {
  const base = LOCAL_REVIEW && !REVIEW_LAN ? `http://127.0.0.1:${cfg.port}` : REVIEW_LAN && lanAddrs()[0] ? `http://${lanAddrs()[0]}:${cfg.port}` : cfg.publicUrl || (lanAddrs()[0] ? `http://${lanAddrs()[0]}:${cfg.port}` : `http://localhost:${cfg.port}`);
  return { url: base.replace(/\/+$/, '') + '/', short: base.replace(/^https?:\/\//, '').replace(/\/+$/, '') };
}
function qrSvg(text) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
}

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function send(res, code, body, type) { res.setHeader('Referrer-Policy', 'no-referrer'); res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body)); }
function readBody(req, limit = 2e6) {
  return new Promise((resolve, reject) => { let n = 0; const ch = []; req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('太大了')); req.destroy(); } else ch.push(c); }); req.on('end', () => { const t = Buffer.concat(ch).toString('utf8'); try { resolve(t ? JSON.parse(t) : {}); } catch (e) { resolve({ raw: t }); } }); req.on('error', () => reject(new Error('模型服务连接失败或超时，请老师检查网络和接口设置'))); });
}
function whoOf(req, u, body) {
  const key = u.searchParams.get('k') || (body && body.k) || req.headers['x-key'];
  const screen = u.searchParams.get('role') === 'screen' || (body && body.role === 'screen');
  if (key && key === cfg.teacherKey) return { role: PUBLIC_MODE && screen ? 'screen' : 'teacher' };
  const tok = u.searchParams.get('t') || (body && body.t) || req.headers['x-tok'];
  if (tok) { const sid = core.auth(tok); if (sid) return { role: 'student', sid }; }
  const screenKey = u.searchParams.get('s') || (body && body.s) || req.headers['x-screen-key'];
  if (screen && (!PUBLIC_MODE || (screenKey && screenKey === cfg.screenKey))) return { role: 'screen' };
  return { role: 'guest' };
}
function serveFile(res, file) {
  fs.readFile(file, (err, buf) => { if (err) return send(res, 404, '没有这个页面', 'text/plain; charset=utf-8'); send(res, 200, buf, MIME[path.extname(file)] || 'application/octet-stream'); });
}

// 只信任回环反代传来的来源；代理应覆盖 X-Forwarded-For，不能透传客户端值。
const loginFailures = new Map();
function loginBuckets(req, name) {
  let ip = req.socket.remoteAddress || '';
  if (['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip) && process.env.XGXY_TRUST_PROXY === '1') {
    ip = String(req.headers['x-forwarded-for'] || ip).split(',').pop().trim();
  }
  const now = Date.now();
  for (const [k, v] of loginFailures) if (v.until <= now) loginFailures.delete(k);
  return [{ key: ip, max: 120 }, { key: ip + '/' + String(name || '').trim().slice(0, 12), max: 10 }];
}
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  let p; try { p = decodeURIComponent(u.pathname); } catch (_) { return send(res, 400, { err: '网址格式错误' }); }
  try {
    // ----- 页面 -----
    if (req.method === 'GET') {
      if (p === '/' || p === '/index.html') return serveFile(res, path.join(PUB, 'student.html'));
      if (p === '/screen' || p === '/screen.html') return serveFile(res, path.join(PUB, 'screen.html'));
      if (p === '/teacher' || p === '/teacher.html') {
        const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
        if (LOCAL_REVIEW && local) {
          const page = fs.readFileSync(path.join(PUB, 'teacher.html'), 'utf8');
          const key = JSON.stringify(cfg.teacherKey).replace(/</g, '\\u003c');
          return send(res, 200, page.replace('<head>', `<head><script>window.__LOCAL_TEACHER_KEY=${key};</script>`), MIME['.html']);
        }
        return serveFile(res, path.join(PUB, 'teacher.html'));
      }
      if (p === '/preview') return serveFile(res, path.join(PUB, 'preview.html'));
      if (p === '/materials/offline') return serveFile(res, path.join(ROOT, '..', '课程资料', '驯狗学院-大屏课件（单机版）.html'));
      if (p === '/materials/print') return serveFile(res, path.join(ROOT, '..', '课程资料', '驯狗学院-打印物料.html'));
      if (p === '/api/recovery') return send(res, 200, { ok: true, title: 'AI驯狗学院', localReview: LOCAL_REVIEW, source: 'open-source', simulated: demoMode(), modelMode: demoMode() ? 'demo' : llmReady() ? 'api' : 'unconfigured', model: null, dogSimulated: LOCAL_REVIEW });
      if (p === '/api/catalog') return send(res, 200, {
        lessons: LESSONS_PACK.LESSONS.map(l => ({ id: l.id, no: l.no, title: l.title, slides: l.slides.length })),
        games: fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.html'))
      });
      if (p.startsWith('/games/')) return serveFile(res, path.join(GAMES_DIR, path.basename(p)));
      if (p.startsWith('/assets/')) return serveFile(res, path.join(PUB, 'assets', path.basename(p)));
      if (p === '/api/qr') return send(res, 200, qrSvg(u.searchParams.get('u') || joinInfo().url), 'image/svg+xml');
      if (p === '/api/hello') return send(res, 200, { ok: true, join: joinInfo() });
      if (p === '/api/names') return send(res, 200, { names: PUBLIC_MODE ? [] : core.state.cls.roster.map(r => r.name), needCode: PUBLIC_MODE ? !NAME_ONLY_JOIN : core.state.cls.needCode });
      if (p === '/api/whoami') { const who = whoOf(req, u); return send(res, who.role === 'student' ? 200 : 401, who.role === 'student' ? { sid: who.sid, name: core.nameOf(who.sid) } : { err: 'nojoin' }); }
      if (p === '/api/stream') {
        const who = whoOf(req, u);
        if (who.role === 'guest') return send(res, 401, { err: 'nojoin' });
        res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write('retry: 2000\n\n');
        const c = { res, who, last: null }; clients.add(c);
        if (who.role === 'student') core.setOnline(who.sid, +1);
        c.last = null; const s = JSON.stringify(viewFor(c)); c.last = s; res.write('data: ' + s + '\n\n');
        req.on('close', () => { clients.delete(c); if (who.role === 'student') core.setOnline(who.sid, -1); });
        return;
      }
      if (p === '/api/work') {
        const who = whoOf(req, u); const sid = u.searchParams.get('sid'), proj = u.searchParams.get('proj'), v = u.searchParams.get('v');
        if (who.role === 'guest') return send(res, 401, { err: '请先进教室' });
        if (sid === Service.TEACHER && proj && proj.startsWith('demo-')) { const g = proj.slice(5); return send(res, 200, { code: S().demoCode(g), name: '老师' }); }
        return send(res, 200, S().work(who, sid || who.sid, proj, v == null ? null : +v));
      }
      if (p === '/api/persona') { const who = whoOf(req, u); if (who.role !== 'student' && who.role !== 'teacher') return send(res, 401, {}); return send(res, 200, S().personaOf(who.role === 'teacher' ? u.searchParams.get('sid') : who.sid, u.searchParams.get('slot'))); }
      if (p === '/api/npc') { const who = whoOf(req, u); if (who.role !== 'student' && who.role !== 'teacher') return send(res, 401, {}); return send(res, 200, S().npcOf(who, u.searchParams.get('sid') || who.sid, u.searchParams.get('slot'))); }
      if (p === '/api/spec') { const who = whoOf(req, u); if (who.role === 'guest') return send(res, 401, {}); return send(res, 200, S().specOf(who.role === 'student' ? who : { role: 'teacher' }, u.searchParams.get('sid') || who.sid, u.searchParams.get('proj'))); }
      if (p === '/api/needs') { const who = whoOf(req, u); if (who.role !== 'student' && who.role !== 'teacher') return send(res, 401, {}); return send(res, 200, S().needsOf(who.role === 'teacher' ? u.searchParams.get('sid') : who.sid)); }
      if (p === '/api/design') { const who = whoOf(req, u); if (who.role !== 'student' && who.role !== 'teacher') return send(res, 401, {}); return send(res, 200, S().designOf(who.role === 'teacher' ? u.searchParams.get('sid') : who.sid)); }
      if (p === '/api/dance') { const who = whoOf(req, u); if (who.role !== 'student' && who.role !== 'teacher') return send(res, 401, {}); return send(res, 200, S().danceOf(u.searchParams.get('sid') || who.sid)); }
      if (p === '/api/talk') { const who = whoOf(req, u); if (who.role !== 'teacher' && who.role !== 'screen') return send(res, 401, {}); return send(res, 200, S().talkOf(u.searchParams.get('sid'))); }
      if (p === '/api/settings') { const who = whoOf(req, u); if (who.role !== 'teacher') return send(res, 401, {}); return send(res, 200, settingsOut()); }
      if (p === '/api/report') { const who = whoOf(req, u); if (who.role !== 'teacher') return send(res, 401, {}); return send(res, 200, report(), 'text/html; charset=utf-8'); }
      if (p === '/favicon.ico') return send(res, 204, '');
      return send(res, 404, '没有这个页面', 'text/plain; charset=utf-8');
    }
    if (req.method !== 'POST') return send(res, 405, {});
    const body = await readBody(req, p === '/api/import' ? 3e6 : 1e6);
    const who = whoOf(req, u, body);
    if (!demoMode()) body.mock = false;

    if (p === '/api/join') {
      const buckets = PUBLIC_MODE ? loginBuckets(req, body.name) : [];
      if (buckets.some(b => (loginFailures.get(b.key) || {}).n >= b.max) || loginFailures.size > 10000) return send(res, 429, { err: '登录尝试太多，请稍后再试或联系老师' });
      if (PUBLIC_MODE) core.state.cls.needCode = !NAME_ONLY_JOIN;
      const r = core.join(body.name, body.code);
      if (r.err) buckets.forEach(b => { const v = loginFailures.get(b.key) || { n: 0, until: Date.now() + 5 * 60 * 1000 }; v.n++; loginFailures.set(b.key, v); });
      else if (PUBLIC_MODE) loginFailures.delete(buckets[1].key);
      return send(res, r.err ? 400 : 200, r);
    }
    if (p === '/api/act') {
      if (who.role !== 'teacher' && who.role !== 'student') return send(res, 401, { err: '请先进教室' });
      const action = body.a || body;
      if (PUBLIC_MODE && action.type === 'roster.needCode' && !!action.on !== !NAME_ONLY_JOIN) return send(res, 400, { err: NAME_ONLY_JOIN ? '现场课堂使用名字加入，无需登录码' : '公网课堂必须使用个人登录码' });
      const r = core.act(who, action); return send(res, r.err ? 400 : 200, r);
    }
    if (p === '/api/demo-error') { if (who.role !== 'teacher' && (PUBLIC_MODE || who.role !== 'screen')) return send(res, 401, {}); return send(res, 200, S().demoError(body)); }
    if (who.role === 'student') {
      const sid = who.sid;
      if (p === '/api/genie') return send(res, 200, await S().genie(sid, body));
      if (p === '/api/go') return send(res, 200, S().go(sid, body));
      if (p === '/api/reset-work') return send(res, 200, S().resetWork(sid, body));
      if (p === '/api/import') return send(res, 200, S().importWork(sid, body));
      if (p === '/api/game-error') return send(res, 200, S().gameError(sid, body));
      if (p === '/api/dance') return send(res, 200, await S().dance(sid, body));
      if (p === '/api/dance-edit') return send(res, 200, S().danceEdit(sid, body));
      if (p === '/api/dance-send') return send(res, 200, await S().danceSend(who, body));
      if (p === '/api/summary') return send(res, 200, { summary: S().summary(sid, body.proj) });
      if (p === '/api/persona-save') return send(res, 200, S().personaSave(sid, body));
      if (p === '/api/persona-chat') return send(res, 200, await S().personaChat(sid, body));
      if (p === '/api/persona-send') return send(res, 200, await S().personaSend(who, body));
      if (p === '/api/design-save') return send(res, 200, S().designSave(sid, body));
      if (p === '/api/spec-save') return send(res, 200, S().specSave(sid, body));
      if (p === '/api/needs-save') return send(res, 200, S().needsSave(sid, body));
      if (p === '/api/stage-chat') return send(res, 200, await S().stageChat(who, body));
      if (p === '/api/npc-save') return send(res, 200, S().npcSave(sid, body));
      if (p === '/api/npc-publish') return send(res, 200, S().npcPublish(sid, body));
      if (p === '/api/npc-chat') return send(res, 200, await S().npcChat(who, body));
    }
    if (who.role === 'teacher') {
      if (p === '/api/dog-demo') return send(res, 200, await S().demoPersona(body));
      if (p === '/api/stage-pick') return send(res, 200, S().stagePick(body));
      if (p === '/api/npc-chat') return send(res, 200, await S().npcChat(who, body));
      if (p === '/api/npc-demo') return send(res, 200, await S().npcDemo(body));
      if (p === '/api/stage-chat') return send(res, 200, await S().stageChat(who, body));
      if (p === '/api/demo') return send(res, 200, await S().demo(body));
      if (p === '/api/demo-reset') return send(res, 200, S().demoReset(body));
      if (p === '/api/demo-dance') return send(res, 200, await S().demoDance(body));
      if (p === '/api/dance-send') return send(res, 200, await S().danceSend(who, body));
      if (p === '/api/persona-send') return send(res, 200, await S().personaSend(who, body));
      if (p === '/api/settings') return send(res, 200, saveSettings(body));
      if (p === '/api/llm-test') return send(res, 200, await llmTest(body));
      if (p === '/api/llm-models') return send(res, 200, await modelModels(body));
    }
    return send(res, 401, { err: '没有权限' });
  } catch (e) {
    console.error(e); send(res, 500, { err: '服务器出错：' + e.message });
  }
});

// ---------- 设置 ----------
function settingsOut() {
  return { publicMode: PUBLIC_MODE, nameOnlyJoin: NAME_ONLY_JOIN, screenUrl: PUBLIC_MODE ? joinInfo().url + 'screen?s=' + encodeURIComponent(cfg.screenKey) : null, llm: Object.assign({}, cfg.llm, { key: cfg.llm.key ? '已配置（不会回传密钥）' : '' }), keySet: !!cfg.llm.key, dogs: cfg.dogs, publicUrl: cfg.publicUrl || '', join: joinInfo(), lan: lanAddrs(), port: cfg.port };
}
function saveSettings(b) {
  if (b.llm) {
    if (b.llm.base) endpoint(String(b.llm.base));
    ['provider', 'base', 'model'].forEach(k => { if (b.llm[k] != null) cfg.llm[k] = String(b.llm[k]).trim(); });
    if (b.llm.key) cfg.llm.key = String(b.llm.key).trim();
    if (b.llm.timeout) cfg.llm.timeout = Math.max(20, Math.min(240, +b.llm.timeout || 90));
  }
  if (b.dogs && typeof b.dogs === 'object') cfg.dogs = b.dogs;
  if (b.publicUrl != null) { const value = String(b.publicUrl).trim(); if (value) endpoint(value); cfg.publicUrl = value; }
  saveCfg(); svc.health.llm = 'unknown'; scheduleBroadcast();
  return settingsOut();
}
async function llmTest() {
  if (LOCAL_REVIEW) return { ok: false, msg: '本轮恢复预览使用演示精灵，未调用真实大模型' };
  if (!llmReady()) return { ok: false, msg: '还没填完：服务商地址、密钥、模型名' };
  const t0 = Date.now();
  try { const c = await llm([{ role: 'user', content: '用一句话跟 9 岁的孩子打招呼，不超过 15 个字。' }], { kind: 'dance' }); svc.health.llm = 'ok'; svc.health.lastError = null; scheduleBroadcast(); return { ok: true, msg: c.trim().slice(0, 80), ms: Date.now() - t0 }; }
  catch (e) { svc.health.llm = 'error'; svc.health.lastError = { at: Date.now(), msg: e.message }; scheduleBroadcast(); return { ok: false, msg: e.message }; }
}
async function modelModels(b) {
  if (LOCAL_REVIEW) return { ok: false, msg: '本轮恢复预览未连接真实大模型服务' };
  const base = String((b && b.base) || cfg.llm.base).replace(/\/+$/, ''), key = (b && b.key) || cfg.llm.key;
  if (!base || !key) return { ok: false, msg: '先填地址和密钥' };
  try { const r = await getJSON(base + '/models', { Authorization: 'Bearer ' + key }, 15000); return { ok: true, models: (r.data || []).map(m => m.id).slice(0, 200) }; }
  catch (e) { return { ok: false, msg: e.message }; }
}

// ---------- 成长记录（给家长的素材） ----------
function report() {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rows = core.state.cls.roster.map(r => {
    const talk = S().talkOf(r.sid).filter(x => x.prompt && !x.error);
    return `<section><h2>${esc(r.name)} <small>${esc(core.state.cls.teamNames[r.team] || '')}</small></h2><p>一共对精灵说了 ${talk.length} 句。</p><ol>${talk.map(x => `<li><b>${esc(x.prompt)}</b><br><span>${esc(x.reply)}</span> <i>${new Date(x.t).toLocaleString('zh-CN')}</i></li>`).join('')}</ol></section>`;
  }).join('');
  return `<!doctype html><meta charset="utf-8"><title>成长记录</title><style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;max-width:900px;margin:30px auto;padding:0 20px;color:#1E2A4A}section{border-bottom:2px solid #F0E2CC;padding:10px 0}li{margin:8px 0}span{color:#5B6683}i{color:#9AA3B8;font-size:12px}</style><h1>AI 驯狗学院 · 每个孩子对精灵说过的话</h1>${rows}`;
}

server.listen(cfg.port, LOCAL_REVIEW && !REVIEW_LAN ? '127.0.0.1' : process.env.HOST || process.env.XGXY_HOST, () => {
  const j = joinInfo();
  console.log('\n==============================================');
  console.log(' AI 驯狗学院 · 课堂服务已启动');
  console.log('----------------------------------------------');
  console.log(' 学生平板打开：  ' + j.url);
  console.log(' 大屏打开：      ' + j.url + 'screen');
  console.log(' 老师端打开：    ' + j.url + 'teacher');
  console.log(LOCAL_REVIEW ? ' 本机恢复预览：自动进入老师端；真实大模型和机器狗连接已关闭。' : ' 老师口令保存在 data/config.json，仅老师查看。');
  console.log(' 大模型：        ' + (llmReady() ? cfg.llm.provider + ' / ' + cfg.llm.model : (demoMode() ? '演示模式（规则模拟，无真实 AI）' : '尚未配置，请在老师端设置自己的接口')));
  console.log(' 关掉这个窗口，课堂就停了；上课时别关。');
  console.log('==============================================\n');
  if (process.argv.includes('--open')) {   // 启动脚本带 --open：自动在这台电脑上打开老师端和大屏
    const { exec } = require('child_process');
    const open = u => exec(process.platform === 'win32' ? `start "" "${u}"` : process.platform === 'darwin' ? `open "${u}"` : `xdg-open "${u}"`, () => { });
    const base = 'http://localhost:' + cfg.port + '/';
    open(base + 'teacher?k=' + cfg.teacherKey); setTimeout(() => open(base + 'screen' + (PUBLIC_MODE ? '?s=' + cfg.screenKey : '')), 800);
  }
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.log('\n端口 ' + cfg.port + ' 被占用了：可能课堂服务已经开着一个窗口。关掉旧窗口再启动，或者在 data/config.json 里改 port。\n');
  else console.log(e);
});
module.exports = { server, core, cfg };
