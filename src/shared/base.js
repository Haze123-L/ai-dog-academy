// 通用小工具和颜色（浏览器和服务器都能加载）
// ================= 工具 =================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pick = a => a[Math.floor(Math.random() * a.length)];
const Store = {
  get(k, d) { try { const v = localStorage.getItem('xgxy_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('xgxy_' + k, JSON.stringify(v)); } catch (e) { } }
};
const C = { orange: '#FF8A3D', blue: '#3D8BFF', green: '#2ECC9A', purple: '#8B6CFF', yellow: '#FFC93D', red: '#E5484D', pink: '#FF6FA5', navy: '#1E2A4A' };
const CD = { orange: '#E0681C', blue: '#2366D1', green: '#18A87C', purple: '#6A4BE0', yellow: '#D9A200', red: '#B8333A', pink: '#D94E86', navy: '#0F1830' };
