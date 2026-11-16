// 第二季新游戏的测试工具：在 node 里跑起始游戏（假画布），加载演示精灵的分课规则。
// 用法：const H = require('./s2-harness'); const g = H.loadGame(code); H.frames(g, 60); H.tap(g, 480, 270);
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

function fakeCanvas() {
  const noop = () => { };
  const grad = { addColorStop: noop };
  const base = { measureText: t => ({ width: String(t || '').length * 10 }), createLinearGradient: () => grad, createRadialGradient: () => grad, createPattern: () => null, getImageData: () => ({ data: new Uint8ClampedArray(4) }), isPointInPath: () => false };
  const ctx = new Proxy(base, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
  const handlers = {};
  const on = (type, f) => { (handlers[type] = handlers[type] || []).push(f); };
  const canvas = { width: 960, height: 540, style: {}, getContext: () => ctx, addEventListener: on, removeEventListener: (type, f) => { handlers[type] = (handlers[type] || []).filter(x => x !== f); }, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }), setPointerCapture: noop, releasePointerCapture: noop };
  return { canvas, ctx, handlers };
}

// 跑一个游戏：返回沙盒。游戏里顶层的 let/const 可以用 H.get(g, '表达式') 读、H.run(g, '语句') 改。
function loadGame(code) {
  const m = code.match(/<script>([\s\S]*)<\/script>/);
  if (!m) throw new Error('没找到 <script>');
  const { canvas, handlers } = fakeCanvas();
  const docHandlers = {};
  const errors = [];
  const sb = {
    document: { getElementById: () => canvas, addEventListener: (t, f) => { (docHandlers[t] = docHandlers[t] || []).push(f); }, removeEventListener: () => { }, querySelector: () => null, body: {} },
    requestAnimationFrame: () => 0, cancelAnimationFrame: () => { }, Math, console, Date, JSON,
    __canvas: canvas, __h: handlers, __dh: docHandlers, __errors: errors
  };
  vm.createContext(sb);
  vm.runInContext(m[1], sb, { filename: 'game.js' });
  return sb;
}
const run = (g, src) => vm.runInContext(src, g);
const get = (g, expr) => vm.runInContext('(' + expr + ')', g);
// 跑 n 帧（每帧调一次 游戏循环()，假的 requestAnimationFrame 不会自己跑）
function frames(g, n) { for (let i = 0; i < n; i++) vm.runInContext('游戏循环()', g); }
function fire(g, type, x, y, id) {
  const e = { clientX: x, clientY: y, pointerId: id || 1, button: 0, preventDefault() { }, stopPropagation() { }, stopImmediatePropagation() { } };
  (g.__h[type] || []).forEach(f => f(e));
}
const tap = (g, x, y, id) => { fire(g, 'pointerdown', x, y, id); fire(g, 'pointerup', x, y, id); };
function key(g, k, type) { (g.__dh[type || 'keydown'] || []).forEach(f => f({ key: k, preventDefault() { } })); }

// 演示精灵的通用小工具（和 mock-genie.js 里的一样）
// 不经过 mock-s2.js（别的课的规则可能正写到一半），只拿通用小工具
const Mock = (() => { const mod = { exports: {} }; new Function('module', 'require', fs.readFileSync(path.join(ROOT, 'src', 'shared', 'mock-genie.js'), 'utf8'))(mod, p => p === './mock-s2.js' ? [] : require(p)); return mod.exports; })();
const helpers = Mock.helpers;
// 加载一节课的演示精灵规则：src/shared/mock-s2/<key>.js
function loadPart(key) {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'shared', 'mock-s2', key + '.js'), 'utf8');
  const S2PARTS = [];
  new Function('S2PARTS', src)(S2PARTS);
  if (!S2PARTS.length) throw new Error(key + '.js 没有往 S2PARTS 里放东西');
  return S2PARTS[0](helpers);
}
const starter = file => fs.readFileSync(path.join(ROOT, 'app', 'games', file), 'utf8');
function check(ok, msg) { if (!ok) { console.log('✗ ' + msg); process.exitCode = 1; } else console.log('✓ ' + msg); }

module.exports = { loadGame, run, get, frames, fire, tap, key, loadPart, helpers, starter, check, ROOT };
