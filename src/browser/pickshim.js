// ================= 下拉框替身 =================
// 有的环境（比如嵌在 Claude 应用里的网页）原生下拉框点了不弹出来。
// 网页版里打开 window.__PICKSHIM：点下拉框时换成自己画的选项面板，选完照样触发 change。
(function () {
  if (typeof document === 'undefined') return;
  let open = null;
  function close() { if (open) { open.el.remove(); document.removeEventListener('mousedown', open.out, true); document.removeEventListener('keydown', open.key, true); open = null; } }
  function show(sel) {
    close();
    const cs = getComputedStyle(sel), r = sel.getBoundingClientRect();
    const el = document.createElement('div');
    el.setAttribute('role', 'listbox');
    el.style.cssText = `position:fixed;z-index:9999;background:#fff;border-radius:12px;box-shadow:0 12px 32px rgba(30,42,74,.3);padding:6px;overflow:auto;font-family:${cs.fontFamily};font-size:${cs.fontSize};color:#1E2A4A;min-width:${Math.max(r.width, 140)}px;max-height:${Math.max(160, Math.min(420, innerHeight - 24))}px`;
    Array.from(sel.options).forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = o.textContent; b.disabled = o.disabled;
      b.setAttribute('role', 'option'); b.setAttribute('aria-selected', String(i === sel.selectedIndex));
      b.style.cssText = `display:block;width:100%;text-align:left;border:0;border-radius:8px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;color:inherit;background:${i === sel.selectedIndex ? '#FFE3CF' : 'transparent'}`;
      b.onmouseenter = () => { if (i !== sel.selectedIndex) b.style.background = '#FFF7EC'; };
      b.onmouseleave = () => { if (i !== sel.selectedIndex) b.style.background = 'transparent'; };
      b.onclick = () => { close(); if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } sel.focus(); };
      el.appendChild(b);
    });
    document.body.appendChild(el);
    const h = el.offsetHeight, below = innerHeight - r.bottom - 8;
    el.style.left = Math.max(8, Math.min(r.left, innerWidth - el.offsetWidth - 8)) + 'px';
    el.style.top = (below >= h || below >= r.top ? r.bottom + 4 : Math.max(8, r.top - h - 4)) + 'px';
    const out = e => { if (!el.contains(e.target)) close(); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); close(); sel.focus(); } };
    open = { el, out, key };
    setTimeout(() => { if (open && open.el === el) { document.addEventListener('mousedown', out, true); document.addEventListener('keydown', key, true); } }, 0);
    const cur = el.querySelector('[aria-selected="true"]'); if (cur) cur.scrollIntoView({ block: 'nearest' });
  }
  document.addEventListener('mousedown', e => {
    if (!window.__PICKSHIM || e.button !== 0) return;
    const sel = e.target && e.target.closest && e.target.closest('select');
    if (!sel || sel.disabled || sel.multiple) return;
    e.preventDefault(); sel.focus();
    if (open) { close(); return; }
    show(sel);
  }, true);
  window.addEventListener('blur', close);
  window.addEventListener('resize', close);
})();
