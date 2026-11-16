// ================= 游戏一：喂饱比特 =================
// items: [{ icon, score, w }]  score 可以是负数（炸弹）
function CatchGame(canvas, cfg) {
  const W = 960, H = 540; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const st = { cfg: Object.assign({}, CATCH_DEFAULT, cfg), x: W / 2, items: [], pops: [], score: 0, f: 0, raf: 0, keys: {}, size: 0 };
  st.size = st.cfg.heroSize;
  const toLocal = e => { const r = canvas.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
  canvas.addEventListener('pointerdown', e => { st.x = toLocal(e); });
  canvas.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') st.x = toLocal(e); });
  function choose() {
    const list = st.cfg.items; let t = 0; list.forEach(i => t += i.w || 1); let r = Math.random() * t;
    for (const i of list) { r -= i.w || 1; if (r <= 0) return i; } return list[0];
  }
  function loop() {
    const c = st.cfg; st.f++;
    if (st.keys.ArrowLeft) st.x -= 12; if (st.keys.ArrowRight) st.x += 12;
    if (st.f % Math.max(14, 48 - c.fall * 4) === 0) { const it = choose(); st.items.push({ x: 40 + Math.random() * (W - 80), y: -30, icon: it.icon, score: it.score, v: c.fall * (0.8 + Math.random() * 0.5) }); }
    if (c.auto) {
      const good = st.items.filter(i => i.score > 0 && i.y > 60).sort((a, b) => b.y - a.y)[0];
      if (good) st.x += Math.max(-9, Math.min(9, good.x - st.x));
    }
    st.x = Math.max(50, Math.min(W - 50, st.x));
    const hs = st.size, hy = H - 70 - hs * 0.25;
    for (const it of st.items) {
      it.y += it.v;
      if (!it.gone && Math.abs(it.x - st.x) < hs * 0.6 && Math.abs(it.y - (hy - hs * 0.3)) < hs * 0.5) {
        it.gone = true; st.score += it.score;
        if (c.grow && it.score > 0) st.size = Math.min(170, st.size + 6);
        st.pops.push({ x: it.x, y: it.y, t: (it.score > 0 ? '+' : '') + it.score, col: it.score > 0 ? '#18A87C' : '#E5484D', life: 40 });
      }
    }
    st.items = st.items.filter(it => !it.gone && it.y < H);
    ctx.fillStyle = c.sky; ctx.fillRect(0, 0, W, H);
    if (c.sky === '#1E2A4A') { ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53) % 420, 3, 3); ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(840, 80, 34, 0, 7); ctx.fill(); }
    ctx.fillStyle = c.ground; ctx.fillRect(0, H - 70, W, 70);
    for (const it of st.items) drawEmoji(ctx, it.icon, it.x, it.y, 50);
    if (c.hero === 'bit') drawBit(ctx, st.x, hy, hs); else drawEmoji(ctx, c.hero, st.x, hy - hs * 0.2, hs);
    for (const p of st.pops) { ctx.globalAlpha = p.life / 40; drawText(ctx, p.t, p.x, p.y, 36, p.col); p.y -= 1.5; p.life--; ctx.globalAlpha = 1; }
    st.pops = st.pops.filter(p => p.life > 0);
    drawText(ctx, '分数 ' + st.score, 24, 40, 36, c.sky === '#1E2A4A' ? '#fff' : '#1E2A4A', 'left');
    st.raf = requestAnimationFrame(loop);
  }
  loop();
  return {
    set(c) { c = Object.assign({}, c); const add = c.addItems, sw = c.swapGood; delete c.addItems; delete c.swapGood;
      Object.assign(st.cfg, c); if (add) st.cfg.items = st.cfg.items.concat(add); if (sw) st.cfg.items = st.cfg.items.map(i => i.score > 0 ? Object.assign({}, i, sw) : i);
      if (c.heroSize) st.size = c.heroSize; },
    reset(c) { st.cfg = Object.assign({}, CATCH_DEFAULT, c); st.items = []; st.score = 0; st.size = st.cfg.heroSize; },
    key(e, down) { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { st.keys[e.key] = down; return true; } return false; },
    destroy() { cancelAnimationFrame(st.raf); }
  };
}

// ================= 游戏二：比特跑酷 =================
// items: [{ name, icon, eat(能不能吃), score(吃了加分), energy(吃了加电量), w(出现机会) }]
function RunnerGame(canvas, cfg) {
  const W = 960, H = 540, GY = H - 90; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const st = { cfg: Object.assign({}, RUN_DEFAULT, cfg), state: 'ready', score: 0, lives: 0, time: 0, power: 100, dist: 0, obs: [], next: 300, blink: 0, why: '', raf: 0, pops: [], dog: { x: 170, y: GY, vy: 0 } };
  function restart() {
    const c = st.cfg; st.score = 0; st.lives = c.lives; st.time = c.timer; st.power = 100; st.dist = 0; st.obs = []; st.next = 300; st.blink = 0; st.pops = [];
    st.dog.y = GY; st.dog.vy = 0; st.state = 'run';
  }
  if (st.cfg.auto) restart();
  function press() {
    if (st.cfg.auto) return;
    if (st.state !== 'run') { restart(); return; }
    if (st.dog.y >= GY) st.dog.vy = -st.cfg.jump;
  }
  canvas.addEventListener('pointerdown', press);
  function choose() {
    const list = st.cfg.items; let t = 0; list.forEach(i => t += i.w || 1); let r = Math.random() * t;
    for (const i of list) { r -= i.w || 1; if (r <= 0) return i; } return list[0];
  }
  const hit = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  const pop = (t, x, y, col) => st.pops.push({ t, x, y, col, life: 45 });
  function touch(o) {
    const c = st.cfg;
    if (o.eat) {
      o.gone = true;
      if (o.score) { st.score += o.score; if (c.showScore) pop('+' + o.score + ' 分', o.x, GY - 100, '#18A87C'); }
      if (c.energy && o.energy) { st.power = Math.max(0, Math.min(100, st.power + (c.bugLeak ? -o.energy : o.energy))); pop('电量 +' + o.energy, o.x, GY - 140, '#2366D1'); }
      if (!(o.score && c.showScore) && !(c.energy && o.energy)) pop('好吃！', o.x, GY - 100, '#18A87C');
      Snd.pop(); return;
    }
    if (c.bugGhost || c.auto) { o.hit = !c.bugGhost && c.auto; return; }
    o.hit = true;
    if (c.lives > 0) { st.lives--; st.blink = 40; Snd.buzz(); if (st.lives <= 0) { st.state = 'over'; st.why = '没有生命了'; } }
    else { st.state = 'over'; st.why = '撞到' + o.name + '了'; Snd.buzz(); }
  }
  function update() {
    if (st.state !== 'run') return;
    const c = st.cfg, sp = c.speedUp ? c.speed + Math.floor(Math.max(0, st.score) / 5) * 0.6 : c.speed, d = st.dog;
    st.dist += sp;
    d.y += d.vy; d.vy += c.bugFloat ? c.gravity / 10 : c.gravity;
    if (d.y >= GY) { d.y = GY; d.vy = 0; }
    st.next -= sp;
    if (st.next <= 0) { st.obs.push(Object.assign({ x: W + 40 }, choose())); st.next = 260 + Math.random() * 300; }
    const s = c.heroSize / 100, db = { l: d.x - 45 * s, r: d.x + 70 * s, t: d.y - 95 * s, b: d.y - 4 };
    if (c.auto && d.y >= GY && st.obs.some(o => !o.eat && o.x > d.x && o.x - d.x < 70 + 90 * s + sp * 8)) d.vy = -c.jump;
    for (const o of st.obs) {
      o.x -= sp;
      if (!o.gone && !o.hit && hit(db, { l: o.x - 20, r: o.x + 20, t: GY - 50, b: GY })) touch(o);
      if (!o.eat && !o.passed && o.x + 20 < db.l) { o.passed = true; if (c.showScore && !o.hit) st.score += c.step; }
    }
    st.obs = st.obs.filter(o => o.x > -60 && !o.gone);
    if (c.energy) { st.power -= c.drain / 60; if (st.power <= 0) { if (c.auto) st.power = 100; else { st.power = 0; st.state = 'over'; st.why = '没电了'; } } }
    if (c.timer > 0 && !c.auto) { st.time -= 1 / 60; if (st.time <= 0) { st.time = 0; st.state = 'over'; st.why = '时间到'; } }
    if (st.blink > 0) st.blink--;
  }
  function cloud(x, y) { ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.arc(x + 30, y - 12, 32, 0, 7); ctx.arc(x + 64, y, 24, 0, 7); ctx.fill(); }
  function draw() {
    const c = st.cfg, th = { 白天: ['#BDE6FF', '#F2C48D'], 夜晚: ['#1E2A4A', '#3B4B6E'], 太空: ['#140C33', '#4B3F72'] }[c.theme] || ['#BDE6FF', '#F2C48D'];
    ctx.fillStyle = th[0]; ctx.fillRect(0, 0, W, H);
    const off = st.dist * 0.2;
    if (c.theme === '白天') {
      ctx.fillStyle = '#FFC93D'; ctx.beginPath(); ctx.arc(860, 120, 40, 0, 7); ctx.fill(); ctx.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) cloud(((i * 300 - off) % 1200 + 1200) % 1200 - 120, 110 + (i % 2) * 60);
    } else {
      ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) ctx.fillRect(((i * 97 - off * .5) % W + W) % W, (i * 53) % (GY - 40), 3, 3);
      if (c.theme === '夜晚') { ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(840, 120, 36, 0, 7); ctx.fill(); }
      if (c.theme === '太空') { ctx.fillStyle = '#8B6CFF'; ctx.beginPath(); ctx.arc(800, 140, 50, 0, 7); ctx.fill(); ctx.strokeStyle = '#FFC93D'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(800, 140, 80, 18, -.3, 0, 7); ctx.stroke(); }
    }
    ctx.fillStyle = th[1]; ctx.fillRect(0, GY, W, H - GY);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 12; i++) ctx.fillRect(((i * 90 - st.dist) % 1080 + 1080) % 1080 - 60, GY + 22, 40, 6);
    for (const o of st.obs) drawEmoji(ctx, o.icon, o.x, GY - 28, 58);
    if (st.blink === 0 || Math.floor(st.blink / 5) % 2 === 0) {
      const s = c.heroSize / 100;
      if (c.hero === 'bit') drawBit(ctx, st.dog.x, st.dog.y - 44 * s, c.heroSize); else drawEmoji(ctx, c.hero, st.dog.x, st.dog.y - c.heroSize * .45, c.heroSize);
    }
    for (const p of st.pops) { ctx.globalAlpha = p.life / 45; drawText(ctx, p.t, p.x, p.y, 30, p.col); p.y -= 1.2; p.life--; ctx.globalAlpha = 1; }
    st.pops = st.pops.filter(p => p.life > 0);
    const tc = c.theme === '白天' ? '#1E2A4A' : '#fff';
    if (st.state !== 'ready') {
      if (c.showScore) drawText(ctx, '分数 ' + st.score, 24, 40, 36, tc, 'left');
      if (c.lives > 0) drawText(ctx, '生命 ' + '♥'.repeat(Math.max(0, st.lives)), 24, 86, 32, '#E5484D', 'left');
      if (c.timer > 0 && !c.auto) drawText(ctx, '倒计时 ' + Math.ceil(st.time), W - 24, 40, 36, tc, 'right');
      if (c.energy) {
        const x = W / 2 - 130, y = 22, w = 260, h = 36;
        ctx.fillStyle = 'rgba(255,255,255,.9)'; rr(ctx, x, y, w, h, 12);
        const len = (w - 8) * st.power / 100;
        if (len > 16) { ctx.fillStyle = st.power > 30 ? '#2ECC9A' : '#E5484D'; rr(ctx, x + 4, y + 4, len, h - 8, 8); }
        drawText(ctx, '电量 ' + Math.ceil(st.power), W / 2, y + h / 2, 22, '#1E2A4A');
      }
    }
    if (st.state === 'ready') drawText(ctx, '点一下，开始跑！', W / 2, H / 2 - 40, 54, tc);
    if (st.state === 'over') {
      ctx.fillStyle = 'rgba(30,42,74,.55)'; ctx.fillRect(0, 0, W, H);
      drawText(ctx, st.why + '！', W / 2, H / 2 - 50, 66, '#fff');
      if (c.showScore) drawText(ctx, '得分 ' + st.score, W / 2, H / 2 + 22, 46, '#FFC93D');
      drawText(ctx, '点一下，再来一次', W / 2, H / 2 + 84, 32, '#fff');
    }
  }
  function loop() { update(); draw(); st.raf = requestAnimationFrame(loop); }
  loop();
  return {
    set(c) { c = Object.assign({}, c); const add = c.addItems, sw = c.swapBlock; delete c.addItems; delete c.swapBlock;
      const wl = st.cfg.lives, wt = st.cfg.timer; Object.assign(st.cfg, c); if (add) st.cfg.items = st.cfg.items.concat(add); if (sw) st.cfg.items = st.cfg.items.map(i => i.eat ? i : sw); if (st.cfg.lives !== wl) st.lives = st.cfg.lives; if (st.cfg.timer !== wt) st.time = st.cfg.timer; if (c.energy) st.power = 100; },
    reset(c) { st.cfg = Object.assign({}, RUN_DEFAULT, c); st.obs = []; st.dist = 0; st.dog.y = GY; st.dog.vy = 0; st.score = 0; st.pops = []; if (st.cfg.auto) restart(); else st.state = 'ready'; },
    key(e, down) { if ((e.code === 'Space' || e.key === 'ArrowUp') && down) { press(); return true; } return e.code === 'Space' || e.key === 'ArrowUp'; },
    destroy() { cancelAnimationFrame(st.raf); }
  };
}

// ================= 游戏三：抓虫子 =================
// items: [{ name, sprite(画好的图案) 或 icon(表情), score(点到加几分，可为负), sec(点到加几秒), w(出现机会) }]
function WhackGame(canvas, cfg) {
  const W = 960, H = 540; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const st = { cfg: Object.assign({}, WHACK_DEFAULT, cfg), state: 'ready', score: 0, time: 0, clock: 0, lastSec: -99, holes: [], pops: [], t: 0, hop: 0, bump: 0, raf: 0 };
  function layout() {
    const c = st.cfg, top = 205, bot = H - 70; st.holes = [];
    for (let r = 0; r < c.rows; r++) for (let k = 0; k < c.cols; k++)
      st.holes.push({ x: 60 + 680 * (k + .5) / c.cols, y: c.rows === 1 ? (top + bot) / 2 : top + (bot - top) * r / (c.rows - 1), it: null });
  }
  function restart() { st.score = 0; st.time = st.cfg.timer; st.t = 0; st.clock = 0; st.lastSec = -99; st.pops = []; layout(); st.state = 'play'; }
  function choose() {
    // 能加时间的道具，至少隔 timeGap 秒才出现一次，不然手快就能一直玩下去
    const c = st.cfg, list = c.items.filter(i => !(i.sec && c.timer > 0 && st.clock - st.lastSec < c.timeGap));
    const pool = list.length ? list : c.items; let t = 0; pool.forEach(i => t += i.w || 1); let r = Math.random() * t;
    for (const i of pool) { r -= i.w || 1; if (r <= 0) return i; } return pool[0];
  }
  const level = () => st.cfg.speedUp ? Math.floor(Math.max(0, st.score) / 5) : 0;
  const interval = () => Math.max(.35, st.cfg.every * Math.pow(.88, level()));
  const stayNow = () => Math.max(.6, st.cfg.stay * Math.pow(.93, level()));
  function hit(h) {
    const it = h.it, c = st.cfg, sc = it.score || 0; h.it = null; st.score += sc;
    if (sc) st.bump = 14;
    if (c.showScore && sc) st.pops.push({ x: h.x, y: h.y - 100, t: (sc > 0 ? '+' : '') + sc, col: sc > 0 ? '#18A87C' : '#E5484D', life: 40 });
    else if (!c.showScore) st.pops.push({ x: h.x, y: h.y - 100, t: '抓到了！', col: '#18A87C', life: 40 });
    if (c.timer > 0 && it.sec) { st.time += it.sec; st.pops.push({ x: h.x, y: h.y - 140, t: '+' + it.sec + ' 秒', col: '#2366D1', life: 40 }); }
    if (sc >= 0) st.hop = 18;
  }
  canvas.addEventListener('pointerdown', e => {
    if (st.cfg.auto) return;
    if (st.state !== 'play') { restart(); return; }
    const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    const h = st.holes.find(h => h.it && Math.abs(x - h.x) < 64 && y > h.y - 120 && y < h.y + 28);
    if (h) hit(h);
  });
  function drawItem(it, x, y, size) { if (it.sprite) drawSprite(ctx, it.sprite, x, y, size); else drawEmoji(ctx, it.icon, x, y, size * .9); }
  function drawHole(h) {
    ctx.fillStyle = '#7A5230'; ctx.beginPath(); ctx.ellipse(h.x, h.y, 68, 22, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3A2614'; ctx.beginPath(); ctx.ellipse(h.x, h.y + 2, 56, 15, 0, 0, 7); ctx.fill();
    if (h.it) {
      const a = h.it.age, up = Math.max(0, Math.min(1, a / .15, (h.it.stay - a) / .15));
      ctx.save(); ctx.beginPath(); ctx.rect(h.x - 80, h.y - 170, 160, 170); ctx.clip();
      drawItem(h.it, h.x, h.y + 50 - up * 104, 112); ctx.restore();
    }
    ctx.fillStyle = '#946A40'; ctx.beginPath(); ctx.ellipse(h.x, h.y + 4, 68, 16, 0, 0, Math.PI); ctx.fill();
  }
  function pill(text, x, y, bg, fg, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
    ctx.font = 'bold 40px "PingFang SC","Microsoft YaHei",sans-serif'; const w = ctx.measureText(text).width + 52;
    ctx.fillStyle = bg; rr(ctx, -w / 2, -32, w, 64, 32); drawText(ctx, text, 0, 2, 40, fg); ctx.restore();
  }
  function loop() {
    const c = st.cfg, dt = 1 / 60;
    if (c.auto && st.state !== 'play') restart();
    if (st.state === 'play') {
      st.t += dt; st.clock += dt;
      if (st.t >= interval()) { st.t = 0; const free = st.holes.filter(h => !h.it); if (free.length) { const h = pick(free), it = choose(); if (it.sec) st.lastSec = st.clock; h.it = Object.assign({ age: 0, stay: stayNow() }, it); h.it.tap = h.it.stay * (.35 + Math.random() * .35); } }
      for (const h of st.holes) if (h.it) {
        h.it.age += dt;
        if (c.auto && h.it.age > h.it.tap && ((h.it.score || 0) > 0 || h.it.sec)) { hit(h); continue; }
        if (h.it.age >= h.it.stay) h.it = null;
      }
      if (c.timer > 0 && !c.auto) { st.time -= dt; if (st.time <= 0) { st.time = 0; st.state = 'over'; } }
    }
    if (st.hop > 0) st.hop--; if (st.bump > 0) st.bump--;
    const dark = c.sky === '#1E2A4A';
    ctx.fillStyle = c.sky; ctx.fillRect(0, 0, W, 120);
    if (dark) { ctx.fillStyle = '#fff'; for (let i = 0; i < 26; i++) ctx.fillRect((i * 97) % W, 10 + (i * 37) % 96, 3, 3); ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(890, 60, 30, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#FFC93D'; ctx.beginPath(); ctx.arc(890, 58, 32, 0, 7); ctx.fill(); }
    ctx.fillStyle = c.grass; ctx.fillRect(0, 120, W, H - 120);
    ctx.fillStyle = 'rgba(0,0,0,.07)'; for (let i = 0; i < 16; i++) rr(ctx, (i * 173) % 900 + 20, 140 + (i * 97) % 370, 28, 8, 4);
    for (const h of st.holes) drawHole(h);
    const hy = H - 84 - Math.sin(st.hop / 18 * Math.PI) * 30;
    if (c.hero === 'bit') drawBit(ctx, W - 96, hy, 100); else drawEmoji(ctx, c.hero, W - 96, hy - 10, 96);
    for (const p of st.pops) { ctx.globalAlpha = p.life / 40; drawText(ctx, p.t, p.x, p.y, 34, p.col); p.y -= 1.4; p.life--; ctx.globalAlpha = 1; }
    st.pops = st.pops.filter(p => p.life > 0);
    if (st.state !== 'ready') {
      if (c.showScore) pill('分数 ' + st.score, W / 2 - (c.timer > 0 && !c.auto ? 130 : 0), 60, '#fff', st.score < 0 ? '#E5484D' : '#1E2A4A', 1 + Math.sin(st.bump / 14 * Math.PI) * .18);
      if (c.timer > 0 && !c.auto) pill('剩 ' + Math.ceil(st.time) + ' 秒', W / 2 + 140, 60, st.time <= 10 ? '#E5484D' : '#1E2A4A', '#fff', 1);
    }
    if (st.state === 'ready') { ctx.fillStyle = 'rgba(30,42,74,.35)'; ctx.fillRect(0, 0, W, H); drawText(ctx, '点一下，开始抓虫！', W / 2, H / 2, 54, '#fff'); }
    if (st.state === 'over') { ctx.fillStyle = 'rgba(30,42,74,.55)'; ctx.fillRect(0, 0, W, H); drawText(ctx, '时间到！', W / 2, H / 2 - 50, 64, '#fff'); if (c.showScore) drawText(ctx, '总分 ' + st.score, W / 2, H / 2 + 20, 48, '#FFC93D'); drawText(ctx, '点一下，再来一次', W / 2, H / 2 + 84, 30, '#fff'); }
    st.raf = requestAnimationFrame(loop);
  }
  layout(); loop();
  return {
    set(c) { c = Object.assign({}, c); const add = c.addItems; delete c.addItems;
      const wt = st.cfg.timer, wl = st.cfg.rows + 'x' + st.cfg.cols; Object.assign(st.cfg, c); if (add) st.cfg.items = st.cfg.items.concat(add);
      if (st.cfg.timer !== wt) { st.time = st.cfg.timer; if (st.state === 'over') restart(); }
      if (st.cfg.rows + 'x' + st.cfg.cols !== wl) layout(); },
    reset(c) { st.cfg = Object.assign({}, WHACK_DEFAULT, c); st.score = 0; st.pops = []; layout(); st.state = st.cfg.auto ? 'play' : 'ready'; st.time = st.cfg.timer; },
    key() { return false; },
    destroy() { cancelAnimationFrame(st.raf); }
  };
}

// ================= 游戏四：比特回家（大屏自动演示） =================
// items: [{ icon, n(个数), hit('' | 'score' | 'slow' | 'life'), move(会不会动) }]
function HomeGame(canvas, cfg) {
  const W = 960, H = 540; canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const home = { x: W - 90, y: 90 }, start = { x: 90, y: H - 80 };
  const st = { cfg: Object.assign({}, HOME_DEFAULT, cfg), dog: { x: start.x, y: start.y }, things: [], pops: [], score: 0, lives: 0, level: 1, slow: 0, fast: 0, blink: 0, f: 0, raf: 0, path: [], banner: 0 };
  function place() {
    st.things = [];
    for (const it of st.cfg.items) {
      const n = (it.n || 1) + (st.cfg.level && it.move ? st.level - 1 : 0);
      for (let i = 0; i < n; i++) {
        let x, y, k = 0;
        do { x = 120 + Math.random() * (W - 240); y = 100 + Math.random() * (H - 200); k++; } while (k < 40 && (Math.hypot(x - start.x, y - start.y) < 160 || Math.hypot(x - home.x, y - home.y) < 150));
        const a = Math.random() * 6.28, sp = 1.4 + (st.cfg.level ? (st.level - 1) * 0.6 : 0);
        st.things.push(Object.assign({}, it, { x, y, vx: it.move ? Math.cos(a) * sp : 0, vy: it.move ? Math.sin(a) * sp : 0 }));
      }
    }
    // 自动演示：经过几根骨头再回家；tour：把场上每样不动的东西都碰一遍（规则侦探用）
    let stops;
    if (st.cfg.tour) {
      const left = st.things.filter(t => !t.move); stops = []; let cur = { x: start.x, y: start.y - 25 };
      while (left.length) { left.sort((a, b) => Math.hypot(a.x - cur.x, a.y - cur.y) - Math.hypot(b.x - cur.x, b.y - cur.y)); cur = left.shift(); stops.push(cur); }
    } else stops = st.things.filter(t => !t.move && t.icon === '🦴').sort((a, b) => (a.x + (H - a.y)) - (b.x + (H - b.y))).slice(0, 3);
    st.path = stops.map(b => ({ x: b.x, y: b.y + 25 })).concat([{ x: home.x, y: home.y + 25 }]);
  }
  function restart() { st.dog = { x: start.x, y: start.y }; st.score = 0; st.lives = st.cfg.lives; st.level = 1; place(); st.banner = st.cfg.level ? 80 : 0; }
  function pop(t, x, y, col) { st.pops.push({ t, x, y, col, life: 45 }); }
  function loop() {
    const c = st.cfg; st.f++;
    for (const t of st.things) { if (!t.move) continue; t.x += t.vx; t.y += t.vy; if (t.x < 40 || t.x > W - 40) t.vx *= -1; if (t.y < 50 || t.y > H - 40) t.vy *= -1; }
    if (c.move && c.auto && st.path.length) {
      const p = st.path[0], sp = st.slow > 0 ? 1.6 : st.fast > 0 ? 6 : 3.4, d = Math.hypot(p.x - st.dog.x, p.y - st.dog.y);
      if (d < sp) st.path.shift(); else { st.dog.x += (p.x - st.dog.x) / d * sp; st.dog.y += (p.y - st.dog.y) / d * sp; }
    }
    if (st.slow > 0) st.slow--; if (st.fast > 0) st.fast--; if (st.blink > 0) st.blink--; if (st.banner > 0) st.banner--;
    for (const t of st.things) {
      if (t.gone || Math.hypot(t.x - st.dog.x, t.y - (st.dog.y - 25)) > 46) continue;
      if (t.hit === 'score') { t.gone = true; st.score += 1; pop('+1', t.x, t.y - 30, '#18A87C'); }
      else if (t.hit === 'slow') { if (st.slow <= 0) pop('变慢了', st.dog.x, st.dog.y - 90, '#2366D1'); st.slow = 120; st.fast = 0; }
      else if (t.hit === 'fast') { t.gone = true; pop('变快了', st.dog.x, st.dog.y - 90, '#8B6CFF'); st.fast = 150; st.slow = 0; }
      else if (t.hit === 'life' && st.blink <= 0) { st.blink = 80; st.lives = Math.max(0, st.lives - 1); pop('−1 命', t.x, t.y - 30, '#E5484D'); }
    }
    st.things = st.things.filter(t => !t.gone);
    if (c.move && Math.hypot(home.x - st.dog.x, home.y - (st.dog.y - 25)) < 56) {
      if (c.level && st.level < 3) { st.level++; st.dog = { x: start.x, y: start.y }; place(); st.banner = 80; }
      else { pop(c.level ? '通关！' : '回家了！', W / 2, H / 2, '#FF8A3D'); setTimeout(restart, 0); }
    }
    // 画
    ctx.fillStyle = '#BFE6A8'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#A9D891';
    for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc((i * 151) % W, (i * 89) % H, 18 + (i % 3) * 6, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#E0681C'; ctx.beginPath(); ctx.moveTo(home.x - 66, home.y - 6); ctx.lineTo(home.x, home.y - 62); ctx.lineTo(home.x + 66, home.y - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFB27A'; rr(ctx, home.x - 52, home.y - 10, 104, 56, 8); ctx.fillStyle = '#1E2A4A'; rr(ctx, home.x - 20, home.y + 6, 40, 40, 18);
    drawText(ctx, '家', home.x, home.y - 26, 22, '#fff');
    for (const t of st.things) drawEmoji(ctx, t.icon, t.x, t.y, 48);
    if (st.blink === 0 || Math.floor(st.blink / 6) % 2 === 0) drawBit(ctx, st.dog.x, st.dog.y - 31, 70);
    if (!c.move) {
      const by = st.dog.y - 120 + Math.sin(st.f / 15) * 4;
      ctx.fillStyle = '#fff'; rr(ctx, st.dog.x - 26, by - 26, 52, 52, 18); drawText(ctx, '?', st.dog.x, by + 1, 36, '#FF8A3D');
    }
    for (const p of st.pops) { ctx.globalAlpha = p.life / 45; drawText(ctx, p.t, p.x, p.y, 32, p.col); p.y -= 1; p.life--; ctx.globalAlpha = 1; }
    st.pops = st.pops.filter(p => p.life > 0);
    if (c.showScore) drawText(ctx, '分数 ' + st.score, 24, 36, 32, '#1E2A4A', 'left');
    if (c.lives > 0) drawText(ctx, '生命 ' + '♥'.repeat(st.lives), 24, 76, 28, '#E5484D', 'left');
    if (c.level) { drawText(ctx, '第 ' + st.level + ' 关', W - 190, 36, 30, '#1E2A4A', 'right'); if (st.banner > 0) { ctx.globalAlpha = Math.min(1, st.banner / 30); drawText(ctx, '第 ' + st.level + ' 关', W / 2, H / 2 - 20, 72, '#FF8A3D'); ctx.globalAlpha = 1; } }
    st.raf = requestAnimationFrame(loop);
  }
  restart(); loop();
  return {
    set(c) { Object.assign(st.cfg, c); restart(); },
    reset(c) { st.cfg = Object.assign({}, HOME_DEFAULT, c); restart(); },
    key() { return false; },
    destroy() { cancelAnimationFrame(st.raf); }
  };
}
