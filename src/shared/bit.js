// ================= 比特 =================
// 白色搪胶公仔（设定图）：橙垂耳从头顶外翻下垂、黑面罩+青色像素眼、橙心 </> 、橙手脚环
// 渐变统一放在页面里一份隐藏的 <defs>（kcDefs），每个 fill 都带纯色兜底
const KC_DEFS = `<svg id="kc-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>
  <linearGradient id="kc-org" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB266"/><stop offset=".55" stop-color="#FF8C3F"/><stop offset="1" stop-color="#F2702A"/></linearGradient>
  <linearGradient id="kc-org-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7883B"/><stop offset="1" stop-color="#D9601A"/></linearGradient>
  <linearGradient id="kc-visor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B4A86"/><stop offset="1" stop-color="#1B2450"/></linearGradient>
  <radialGradient id="kc-eye" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#E4FDFF"/><stop offset=".45" stop-color="#78F0FF"/><stop offset="1" stop-color="#2FC3EE"/></radialGradient>
  <radialGradient id="kc-yel" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#FFF0B0"/><stop offset=".5" stop-color="#FFCB45"/><stop offset="1" stop-color="#F0A21C"/></radialGradient>
  <linearGradient id="kc-mint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#62EBC0"/><stop offset="1" stop-color="#1FB384"/></linearGradient>
  <radialGradient id="kc-genie" cx=".38" cy=".3" r=".85"><stop offset="0" stop-color="#D6C6FF"/><stop offset=".45" stop-color="#9C7DFF"/><stop offset="1" stop-color="#6B48EE"/></radialGradient>
  <radialGradient id="kc-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <linearGradient id="kc-white" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#F4F6FA"/><stop offset="1" stop-color="#E4E8F0"/></linearGradient>
  <radialGradient id="kc-white-hl" cx=".32" cy=".28" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs></svg>`;
function kcDefs() {
  if (typeof document === 'undefined' || !document || !document.body || document.getElementById('kc-defs')) return;
  document.body.insertAdjacentHTML('afterbegin', KC_DEFS);
}
kcDefs();

// 用小方格拼一个圆（像素眼）；col 默认青色
function bitPixelEye(cx, cy, r, col = '#5BE0FF') {
  // 低成本像素圆：固定 3×3 网格 + 十字，约 12 格/眼（旧版稠密网格会拖慢三端重绘）
  const cells = [];
  const s = Math.max(2.6, r / 2.2);
  const dots = [
    [0, -1], [-1, 0], [0, 0], [1, 0], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1],
    [-2, 0], [2, 0], [0, -2], [0, 2]
  ];
  for (const [ix, iy] of dots) {
    const x = cx + ix * s * 0.72, y = cy + iy * s * 0.72;
    if (ix * ix + iy * iy <= 4.2)
      cells.push(`<rect x="${(x - s * .38).toFixed(1)}" y="${(y - s * .38).toFixed(1)}" width="${(s * .76).toFixed(1)}" height="${(s * .76).toFixed(1)}" rx=".4" fill="${col}"/>`);
  }
  return cells.join('');
}
function bitPixelMouth(cx, cy, open = false) {
  // 像素小微笑 / 说话张嘴
  if (open) {
    return `<g class="b-mouth">
      <rect x="${cx - 5}" y="${cy}" width="3" height="3" rx=".4" fill="#5BE0FF"/>
      <rect x="${cx - 2}" y="${cy + 2}" width="4" height="3" rx=".4" fill="#5BE0FF"/>
      <rect x="${cx + 2}" y="${cy}" width="3" height="3" rx=".4" fill="#5BE0FF"/>
    </g>`;
  }
  return `<g class="b-mouth">
    <rect x="${cx - 6}" y="${cy}" width="3" height="2.5" rx=".4" fill="#5BE0FF"/>
    <rect x="${cx - 2}" y="${cy + 1.5}" width="4" height="2.5" rx=".4" fill="#5BE0FF"/>
    <rect x="${cx + 3}" y="${cy}" width="3" height="2.5" rx=".4" fill="#5BE0FF"/>
  </g>`;
}

// Build head
let _BIT_HEAD_CACHE = null; /* cheeks ellipses */
function bitHeadSVG() {
  if (_BIT_HEAD_CACHE) return _BIT_HEAD_CACHE;
  const L = bitPixelEye(84, 66, 9);
  const R = bitPixelEye(116, 66, 9);
  const sleepL = [70, 78, 86].map(x => `<rect x="${x}" y="65" width="3.2" height="3.2" rx=".4" fill="#5BE0FF"/>`).join('');
  const sleepR = [102, 110, 118].map(x => `<rect x="${x}" y="65" width="3.2" height="3.2" rx=".4" fill="#5BE0FF"/>`).join('');
  return _BIT_HEAD_CACHE = `
  <g class="b-ear">
    <path d="M62 22c-18-2-34 10-38 32-3 16 6 30 20 34 10 3 18-4 22-16 5-14 8-34-4-50z" fill="#FF8A3D" stroke="#E07020" stroke-width="1.2"/>
    <path d="M58 30c-10 0-20 10-22 22-1 8 3 14 10 16 6 1 11-3 13-10 3-10 5-22-1-28z" fill="#FFC08A" opacity=".75"/>
  </g>
  <path d="M138 22c18-2 34 10 38 32 3 16-6 30-20 34-10 3-18-4-22-16-5-14-8-34 4-50z" fill="#FF8A3D" stroke="#E07020" stroke-width="1.2"/>
  <path d="M142 30c10 0 20 10 22 22 1 8-3 14-10 16-6 1-11-3-13-10-3-10-5-22 1-28z" fill="#FFC08A" opacity=".75"/>
  <g class="b-ant">
    <ellipse cx="100" cy="14" rx="9" ry="5" fill="#FF8A3D"/>
    <path d="M100 14v-18" stroke="#F2F4F8" stroke-width="5" stroke-linecap="round"/>
    <circle class="b-glow" cx="100" cy="-8" r="12" fill="#5BE0FF" opacity=".22"/>
    <circle cx="100" cy="-8" r="7" fill="#FFFFFF" stroke="#D0D6E2" stroke-width="1"/>
    <circle cx="97.5" cy="-10" r="2.2" fill="#fff"/>
  </g>
  <rect x="48" y="18" width="104" height="96" rx="40" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="2"/>
  <ellipse cx="78" cy="40" rx="22" ry="12" fill="#fff" opacity=".55"/>
  <ellipse class="b-mask" cx="100" cy="68" rx="38" ry="30" fill="#141820"/>
  <ellipse cx="100" cy="58" rx="28" ry="8" fill="#fff" opacity=".06"/>
  <g class="b-eyes">
    <g class="open">
      <ellipse cx="84" cy="66" rx="9" ry="9" fill="#5BE0FF" opacity="0"/>
      <ellipse cx="116" cy="66" rx="9" ry="9" fill="#5BE0FF" opacity="0"/>
      <g class="b-pupils">${L}${R}</g>
    </g>
    <g class="sleep">${sleepL}${sleepR}</g>
  </g>
  ${bitPixelMouth(100, 84, false)}
  <g class="b-cheek" opacity="0">
    <ellipse cx="68" cy="84" rx="7" ry="4" fill="#FF7AB0"/>
    <ellipse cx="132" cy="84" rx="7" ry="4" fill="#FF7AB0"/>
  </g>`;
}

const BIT_HEAD = bitHeadSVG();

const BIT_HEART = `
  <g transform="translate(100 148)" aria-hidden="true">
    <path d="M0 14c-16-10-26-22-26-34 0-10 8-16 16-16 6 0 10 3 10 3s4-3 10-3c8 0 16 6 16 16 0 12-10 24-26 34z" fill="#FF8A3D" stroke="#E07020" stroke-width="1"/>
    <!-- 胸口 </> 用路径画，避免 SVG <text> 泄漏进页面 innerText -->
    <g fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M-9 -14 L-15 -8 L-9 -2"/>
      <path d="M-2.5 -14 L2.5 -2"/>
      <path d="M9 -14 L15 -8 L9 -2"/>
    </g>
  </g>`;

let _BIT_SVG_CACHE = null;
function bitSVG() {
  kcDefs();
  if (_BIT_SVG_CACHE) return _BIT_SVG_CACHE;
  const HEAD = bitHeadSVG();
  return _BIT_SVG_CACHE = `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse class="b-shadow" cx="100" cy="208" rx="52" ry="7" fill="rgba(36,48,94,.16)"/>
  <g class="b-stand"><g class="b-all">
    <g class="b-legB">
      <rect x="64" y="168" width="18" height="28" rx="9" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="1.5"/>
      <rect x="118" y="168" width="18" height="28" rx="9" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="1.5"/>
      <rect x="62" y="188" width="22" height="14" rx="6" fill="#FF8A3D"/>
      <rect x="116" y="188" width="22" height="14" rx="6" fill="#FF8A3D"/>
      <rect x="64" y="182" width="18" height="6" rx="3" fill="#FF8A3D"/>
      <rect x="118" y="182" width="18" height="6" rx="3" fill="#FF8A3D"/>
    </g>
    <g class="b-tail">
      <path d="M128 158c18 2 28 16 22 28" stroke="#FF8A3D" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="148" cy="186" r="5" fill="#FFE0C0"/>
    </g>
    <!-- 身体 -->
    <rect x="58" y="112" width="84" height="70" rx="28" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="2"/>
    <ellipse cx="78" cy="128" rx="16" ry="8" fill="#fff" opacity=".5"/>
    ${BIT_HEART}
    <g class="b-legF">
      <rect x="72" y="170" width="16" height="26" rx="8" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="1.5"/>
      <rect x="112" y="170" width="16" height="26" rx="8" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="1.5"/>
      <rect x="70" y="188" width="20" height="13" rx="6" fill="#FF8A3D"/>
      <rect x="110" y="188" width="20" height="13" rx="6" fill="#FF8A3D"/>
      <rect x="72" y="182" width="16" height="5" rx="2.5" fill="#FF8A3D"/>
      <rect x="112" y="182" width="16" height="5" rx="2.5" fill="#FF8A3D"/>
    </g>
    <g class="b-head">${HEAD}</g>
  </g></g>
  <g class="b-sit">
    <g class="b-tail">
      <path d="M130 178c16 4 24 18 18 28" stroke="#FF8A3D" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="146" cy="206" r="5" fill="#FFE0C0"/>
    </g>
    <ellipse cx="100" cy="178" rx="48" ry="32" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="2"/>
    <g transform="translate(0 22)">${BIT_HEART}</g>
    <!-- 坐姿后腿外撇，露出橙脚底 -->
    <ellipse cx="58" cy="196" rx="22" ry="14" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="1.5"/>
    <ellipse cx="142" cy="196" rx="22" ry="14" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="1.5"/>
    <ellipse cx="52" cy="202" rx="14" ry="8" fill="#FF8A3D"/>
    <ellipse cx="148" cy="202" rx="14" ry="8" fill="#FF8A3D"/>
    <rect x="82" y="188" width="14" height="20" rx="7" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="1.5"/>
    <rect x="104" y="188" width="14" height="20" rx="7" fill="#F4F6FA" stroke="#C5CCD8" stroke-width="1.5"/>
    <rect x="80" y="202" width="18" height="10" rx="5" fill="#FF8A3D"/>
    <rect x="102" y="202" width="18" height="10" rx="5" fill="#FF8A3D"/>
    <g transform="translate(0 16)"><g class="b-head">${HEAD}</g></g>
  </g>
  <g class="b-bubble">
    <path d="M148 8l-6 12l14-8z" fill="#fff" stroke="#24305E" stroke-width="3" stroke-linejoin="round"/>
    <rect x="132" y="-40" width="84" height="46" rx="18" fill="#fff" stroke="#24305E" stroke-width="3"/>
    <path d="M142 6.5h12" stroke="#fff" stroke-width="4"/>
    <text x="174" y="-9" font-size="24" font-weight="900" text-anchor="middle" fill="#24305E" font-family="Noto Sans SC,sans-serif">嗨!</text>
  </g>
</svg>`;
}
function bitLogoSVG() {
  kcDefs();
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="96" fill="#FF8A3D"/>
  <circle cx="100" cy="100" r="88" fill="#FFF7EC"/>
  <g transform="translate(100 112) scale(0.95) translate(-100 -70)">
    ${bitHeadSVG()}
  </g>
</svg>`;
}
function bitEl(width, cls = 'idle') {
  // 新狗 viewBox 200×220，旧狗约 220×175。缩宽度使渲染高度≈旧占位，布局不被撑变形。
  const w = Math.max(1, Math.round(Number(width) * 175 * 200 / (220 * 220)));
  return `<div class="bit ${cls}" style="width:${w}px">${bitSVG()}</div>`;
}
function kcIsland(w, cls = 'idle') {
  return `<div class="kc-island" style="width:${w}px">${bitEl(Math.round(w * .92), cls)}<div class="grass"></div><div class="rock"></div></div>`;
}
const KC_STAR_PATH = 'M12 0l3 9 9 3-9 3-3 9-3-9-9-3 9-3z';
function kcStars(spots) {
  return spots.map(([x, y, s, c, d]) => `<i class="kc-star" style="left:${x}%;top:${y}%;--s:${s}px;--dl:${d || 0}s"><svg viewBox="0 0 24 24"><path d="${KC_STAR_PATH}" fill="${c}"/></svg></i>`).join('');
}
const KC_HEART = '<svg viewBox="0 0 64 64"><path d="M32 56S6 40 6 22a13 13 0 0 1 26-6 13 13 0 0 1 26 6c0 18-26 34-26 34z" fill="#FF7AB0"/><ellipse cx="20" cy="20" rx="6" ry="4" fill="#fff" opacity=".5" transform="rotate(-30 20 20)"/></svg>';

function bugSVG(kind) {
  const col = { minus: '#FF6FA5', space: '#3D8BFF', ghost: '#8B6CFF' }[kind] || '#2ECC9A';
  const op = kind === 'ghost' ? 0.45 : 1;
  let extra = '';
  if (kind === 'minus') extra = '<path d="M84 104l-12 16h10l-4 14 14-18h-10l4-12z" fill="#FFC93D"/>';
  if (kind === 'space') extra = '<path d="M30 70q-26-30 -6-54q10 26 30 34z" fill="#DCEAFF"/><path d="M130 70q26-30 6-54q-10 26-30 34z" fill="#DCEAFF"/><path d="M70 128l10 22 10-22z" fill="#FFC93D"/>';
  if (kind === 'ghost') extra = '<path d="M28 100q10 14 20 0t20 0 20 0 20 0 20 0" stroke="#8B6CFF" stroke-width="6" fill="none" opacity=".6"/>';
  return `<svg viewBox="0 0 160 160"><g opacity="${op}">${kind === 'space' ? extra : ''}
  <path d="M60 46Q54 20 38 14M100 46q6-26 22-32" stroke="${col}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="37" cy="13" r="8" fill="${col}"/><circle cx="123" cy="13" r="8" fill="${col}"/>
  <path d="M34 96l-18 10M34 112l-16 16M126 96l18 10M126 112l16 16" stroke="${col}" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="80" cy="92" rx="54" ry="46" fill="${col}"/>
  <ellipse cx="62" cy="64" rx="18" ry="8" fill="#fff" opacity=".3" transform="rotate(-20 62 64)"/>
  <circle cx="62" cy="80" r="15" fill="#fff"/><circle cx="98" cy="80" r="15" fill="#fff"/><circle cx="65" cy="83" r="7" fill="#1E2A4A"/><circle cx="95" cy="83" r="7" fill="#1E2A4A"/><circle cx="62.5" cy="80" r="2.4" fill="#fff"/><circle cx="92.5" cy="80" r="2.4" fill="#fff"/>
  <ellipse cx="50" cy="100" rx="7" ry="4" fill="#fff" opacity=".35"/><ellipse cx="110" cy="100" rx="7" ry="4" fill="#fff" opacity=".35"/>
  <path d="M66 106q14 9 28 0" stroke="#1E2A4A" stroke-width="5" fill="none" stroke-linecap="round"/>${kind !== 'space' ? extra : ''}</g></svg>`;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
}
// canvas 四角星星眼 ✦（对齐参考图 / SVG 观感）
function bitStarEyeCanvas(ctx, cx, cy, r, col) {
  ctx.fillStyle = col;
  ctx.beginPath();
  const outer = r, inner = r * 0.38;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 4;
    const rad = i % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}
// 兼容旧名
function bitPixelEyeCanvas(ctx, cx, cy, r, col) { bitStarEyeCanvas(ctx, cx, cy, r, col); }
// canvas 垂耳：从头两侧下垂的胶囊耳（对齐参考图 / SVG 观感；勿用负旋转否则成翅耳）
function bitDroopyEarsCanvas(ctx) {
  ctx.fillStyle = '#FF8A3D';
  ctx.beginPath(); ctx.ellipse(-48, -48, 13, 30, 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(48, -48, 13, 30, -0.35, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFC08A';
  ctx.beginPath(); ctx.ellipse(-48, -46, 6, 18, 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(48, -46, 6, 18, -0.35, 0, Math.PI * 2); ctx.fill();
}
function drawBit(ctx, x, y, size) { // (x,y)=身体中心；碰撞体积与旧版同量级
  const s = size / 100;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  // 影子
  ctx.fillStyle = 'rgba(36,48,94,.16)'; ctx.beginPath(); ctx.ellipse(0, 54, 40, 6, 0, 0, 7); ctx.fill();
  // 后腿
  ctx.fillStyle = '#F4F6FA'; ctx.strokeStyle = '#C5CCD8'; ctx.lineWidth = 1.5;
  [[-28, 20], [28, 20]].forEach(([lx, ly]) => { rr(ctx, lx - 8, ly, 16, 26, 8); });
  ctx.fillStyle = '#FF8A3D';
  [[-28, 42], [28, 42]].forEach(([lx, ly]) => { rr(ctx, lx - 10, ly, 20, 12, 5); });
  // 尾巴
  ctx.strokeStyle = '#FF8A3D'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(26, 8); ctx.quadraticCurveTo(44, 14, 40, 30); ctx.stroke();
  // 身体
  ctx.fillStyle = '#F4F6FA'; rr(ctx, -34, -18, 68, 56, 22);
  ctx.strokeStyle = '#C5CCD8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-34+22, -18); ctx.arcTo(34,-18,34,38,22); ctx.arcTo(34,38,-34,38,22); ctx.arcTo(-34,38,-34,-18,22); ctx.arcTo(-34,-18,34,-18,22); ctx.closePath(); ctx.stroke();
  // 橙心 </>
  ctx.fillStyle = '#FF8A3D';
  ctx.beginPath();
  ctx.moveTo(0, 22); ctx.bezierCurveTo(-18, 8, -26, -4, -16, -12); ctx.bezierCurveTo(-10, -16, -4, -12, 0, -6);
  ctx.bezierCurveTo(4, -12, 10, -16, 16, -12); ctx.bezierCurveTo(26, -4, 18, 8, 0, 22);
  ctx.fill();
  // 胸口 </> 用路径描边，不进 innerText
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(-9, -14); ctx.lineTo(-15, -8); ctx.lineTo(-9, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-2.5, -14); ctx.lineTo(2.5, -2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(9, -14); ctx.lineTo(15, -8); ctx.lineTo(9, -2); ctx.stroke();
  // 前腿
  ctx.fillStyle = '#F4F6FA';
  [[-16, 24], [16, 24]].forEach(([lx, ly]) => { rr(ctx, lx - 7, ly, 14, 24, 7); });
  ctx.fillStyle = '#FF8A3D';
  [[-16, 44], [16, 44]].forEach(([lx, ly]) => { rr(ctx, lx - 9, ly, 18, 11, 5); });
  // 垂耳（对齐 SVG bitHeadSVG）
  bitDroopyEarsCanvas(ctx);
  // 头
  ctx.fillStyle = '#F4F6FA'; rr(ctx, -40, -88, 80, 72, 30);
  ctx.strokeStyle = '#C5CCD8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-40+30, -88); ctx.arcTo(40,-88,40,-16,30); ctx.arcTo(40,-16,-40,-16,30); ctx.arcTo(-40,-16,-40,-88,30); ctx.arcTo(-40,-88,40,-88,30); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-14, -70, 16, 8, -0.3, 0, 7); ctx.fill();
  // 面罩
  ctx.fillStyle = '#141820'; ctx.beginPath(); ctx.ellipse(0, -52, 28, 22, 0, 0, 7); ctx.fill();
  // 四角星星眼 ✦
  bitStarEyeCanvas(ctx, -12, -54, 9, '#5BE0FF');
  bitStarEyeCanvas(ctx, 12, -54, 9, '#5BE0FF');
  // 像素嘴
  ctx.fillStyle = '#5BE0FF';
  [[-5, -40], [-1, -38], [3, -40]].forEach(([mx, my]) => { rr(ctx, mx, my, 2.6, 2.2, .4); });
  // 天线
  ctx.fillStyle = '#FF8A3D'; ctx.beginPath(); ctx.ellipse(0, -88, 7, 4, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = '#F2F4F8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -88); ctx.lineTo(0, -104); ctx.stroke();
  ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = '#D0D6E2'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, -106, 5.5, 0, 7); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawEmoji(ctx, t, x, y, size) {
  ctx.fillStyle = '#000'; ctx.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
}
function drawText(ctx, t, x, y, size, col, align = 'center') {
  ctx.fillStyle = col; ctx.font = 'bold ' + size + 'px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
}
