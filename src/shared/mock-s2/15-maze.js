// 第 15 课「能把关卡画给精灵吗？」：比特闯关（格子迷宫）
// 画给精灵看（一张格子图）→ 一格不差照着做；只用一段话说 → 墙和星星放哪，精灵只能猜
S2PARTS.push(function (H) {
  const MAXR = 8, MAXC = 14;                       // 和游戏一样：最多 8 行 14 列
  const TILE = /^[#.SE*^]+$/;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const FIX = { '#': '#', '.': '.', S: 'S', E: 'E', '*': '*', '^': '^', s: 'S', e: 'E', '＃': '#', '．': '.', '。': '.', 'Ｓ': 'S', 'Ｅ': 'E', '＊': '*', '＾': '^' };

  // ---------- 读图、查图 ----------
  function gridOf(p) {   // 话里的格子图：每行只有 # . S E * ^（前后空格不算），至少两行
    const rows = String(p).split(/\r?\n/).map(s => s.trim()).filter(s => s.length >= 3 && TILE.test(s));
    return rows.length >= 2 ? rows : null;
  }
  function tidy(rows) {   // 和游戏一样整理：切到 8×14，不认识的字当路，短的行补墙，起点只留第一个
    rows = rows.slice(0, MAXR).map(r => Array.from(String(r == null ? '' : r)).slice(0, MAXC).map(ch => FIX[ch] || '.').join(''));
    while (rows.length && !rows[rows.length - 1]) rows.pop();
    const w = Math.max(0, ...rows.map(r => r.length));
    if (!w) return [];
    let seenS = false;
    return rows.map(r => (r + '#'.repeat(w - r.length)).replace(/S/g, () => (seenS ? '.' : (seenS = true, 'S'))));
  }
  const MAP_RE = /const 地图 = \[([^\n]*?)\];|const 地图 = \[([\s\S]*?)\n[ \t]*\];/;
  function mapOf(code) {   // 代码里现在的地图
    const m = code.match(MAP_RE);
    if (!m) return [];
    const body = (m[1] != null ? m[1] : m[2]).replace(/\/\/[^\n]*/g, '');
    return tidy((body.match(/"[^"\n]*"|'[^'\n]*'/g) || []).map(s => s.slice(1, -1)));
  }
  function putMap(code, rows) {   // 整段换掉「地图」
    if (!MAP_RE.test(code)) return null;
    const body = 'const 地图 = [\n' + rows.map(r => '  "' + r + '",').join('\n') + '\n];';
    return code.replace(MAP_RE, () => body);
  }
  const find = (rows, ch) => { for (let r = 0; r < rows.length; r++) { const c = rows[r].indexOf(ch); if (c >= 0) return [r, c]; } return null; };
  const count = (rows, ch) => rows.join('').split(ch).length - 1;
  function startOf(rows) {   // 和游戏一样：有 S 站 S，没有就站第一格路
    const s = find(rows, 'S') || find(rows, '.');
    if (s) return s;
    for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) if (rows[r][c] !== '#') return [r, c];
    return null;
  }
  function reach(rows, from, block) {   // 从 from 出发、不踩 block 里的字，能走到哪些格（到终点就停）
    const seen = new Set([from.join()]), q = [from];
    while (q.length) {
      const [r, c] = q.shift();
      if (rows[r][c] === 'E') continue;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc, k = nr + ',' + nc;
        if (nr < 0 || nc < 0 || nr >= rows.length || nc >= rows[nr].length || seen.has(k) || block.includes(rows[nr][nc])) continue;
        seen.add(k); q.push([nr, nc]);
      }
    }
    return seen;
  }
  function canWin(rows, block) {
    const s = startOf(rows); if (!s) return false;
    const seen = reach(rows, s, block);
    return rows.some((row, r) => Array.from(row).some((ch, c) => ch === 'E' && seen.has(r + ',' + c)));
  }
  function okAll(rows) {   // 能不踩刺走到终点，每颗星星都吃得到
    if (!canWin(rows, '#^')) return false;
    const seen = reach(rows, startOf(rows), '#^E');
    return rows.every((row, r) => Array.from(row).every((ch, c) => ch !== '*' || seen.has(r + ',' + c)));
  }
  const setVal = (code, k) => { const m = code.match(new RegExp('\\n\\s*' + k + ':\\s*([^,\\n]+),')); return m ? m[1].trim() : null; };
  const spikeHurts = code => setVal(code, '刺会扣命') !== 'false';

  // ---------- 1. 照格子图做：一格不差 ----------
  function fromGrid(code, grid) {
    const big = grid.length > MAXR || grid.some(r => r.length > MAXC);
    const rows = tidy(grid);
    const c = putMap(code, rows);
    if (!c) return null;
    const say = [`照你的图做好了：${count(rows, '*')} 颗星、${count(rows, '^')} 个刺。`];
    if (big) say.push(`图太大，只用了左上角 ${MAXR} 行 ${MAXC} 列。`);
    if (!find(rows, 'S')) say.push('图上没有起点 S，比特先站在第一格路上。');
    if (!find(rows, 'E')) say.push('图上没有终点 E，走不到头哦。');
    else if (!canWin(rows, '#')) say.push('从起点走不到终点，被墙堵住了。');
    else if (spikeHurts(c) && !canWin(rows, '#^')) say.push('要踩过刺才能到终点，可踩到刺会回起点哦。');
    return { code: c, reply: say.join('') };
  }

  // ---------- 2. 只用一段话描述：照做，但墙和星星放哪是猜的（同一句话猜得一样） ----------
  function rng(seed) {
    let a = 2166136261;
    for (const ch of String(seed)) a = Math.imul(a ^ ch.codePointAt(0), 16777619);
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(arr, rand) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  function numBefore(p, unit, d) {
    const m = p.match(new RegExp(H.NUM + '\\s*' + unit));
    if (!m) return d;
    const n = H.toNum(m[1]);
    return isNaN(n) ? d : n;
  }
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const CORNER = { 左上: [1, 1], 右上: [1, 10], 左下: [5, 1], 右下: [5, 10], 中间: [3, 5] };
  function cornerOf(p, word) {   // 「起点在左上角」「右下角是终点」
    const m = p.match(new RegExp(word + '[^，,。；;！!]{0,6}?(左上|右上|左下|右下|中间)')) || p.match(new RegExp('(左上|右上|左下|右下|中间)角?[^，,。；;！!]{0,4}?' + word));
    return m ? CORNER[m[1]] : null;
  }
  function makeMaze(p, hard) {   // 7 行 12 列：几堵竖墙，每堵留一个口，口一上一下，路就弯来弯去
    const rand = rng(p), R = 7, C = 12;
    let s = cornerOf(p, '起点') || CORNER.左上, e = cornerOf(p, '终点') || CORNER.右下;
    if (s.join() === e.join()) e = s.join() === CORNER.右下.join() ? CORNER.左上 : CORNER.右下;
    const g = [];
    for (let r = 0; r < R; r++) { g.push([]); for (let c = 0; c < C; c++) g[r].push(r === 0 || c === 0 || r === R - 1 || c === C - 1 ? '#' : '.'); }
    const nWalls = /没有墙|不要墙/.test(p) ? 0 : /很多墙|好多墙/.test(p) ? 4 : clamp(numBefore(p, '[堵面道座]墙', hard ? 4 : 3), 0, 4);
    const cols = [];
    for (const c of shuffle([2, 3, 4, 5, 6, 7, 8, 9], rand)) {
      if (cols.length >= nWalls) break;
      if (c === s[1] || c === e[1] || cols.some(x => Math.abs(x - c) < 2)) continue;
      cols.push(c);
    }
    const topFirst = rand() < 0.5;
    cols.sort((a, b) => a - b).forEach((c, i) => {
      const gap = (i % 2 === 0) === topFirst ? 1 + Math.floor(rand() * 2) : 4 + Math.floor(rand() * 2);
      for (let r = 1; r < R - 1; r++) if (r !== gap) g[r][c] = '#';
    });
    g[s[0]][s[1]] = 'S'; g[e[0]][e[1]] = 'E';
    const nStars = /没有星|不要星/.test(p) ? 0 : clamp(numBefore(p, '[颗个]?\\s*星', 3), 0, 10);
    const nSpikes = /没有刺|不要刺|别放刺/.test(p) ? 0 : clamp(numBefore(p, '[个根排]?\\s*刺', /刺/.test(p) || hard ? 2 : 1), 0, 5);
    const free = [];
    for (let r = 1; r < R - 1; r++) for (let c = 1; c < C - 1; c++) if (g[r][c] === '.') free.push([r, c]);
    shuffle(free, rand);
    let stars = 0, spikes = 0;
    for (const [r, c] of free) { if (stars >= nStars) break; g[r][c] = '*'; stars++; }
    for (const [r, c] of free) {
      if (spikes >= nSpikes) break;
      if (g[r][c] !== '.') continue;
      g[r][c] = '^';
      if (okAll(g.map(x => x.join('')))) spikes++; else g[r][c] = '.';
    }
    return g.map(x => x.join(''));
  }
  function harder(code, p) {   // 在现在的地图上加 2 个刺、2 块墙（放哪是猜的，但还能走到终点）
    const rows = mapOf(code);
    if (!rows.length) return { rows: makeMaze(p, true), spikes: 0, walls: 0, fresh: true };
    const rand = rng(p + '|' + rows.join('/'));
    const g = rows.map(r => Array.from(r)), wasOk = okAll(rows);
    const free = [];
    g.forEach((row, r) => row.forEach((ch, c) => { if (ch === '.') free.push([r, c]); }));
    shuffle(free, rand);
    let spikes = 0, walls = 0;
    for (const [r, c] of free) {
      if (spikes >= 2 && walls >= 2) break;
      for (const t of (spikes < 2 ? ['^'] : []).concat(walls < 2 ? ['#'] : [])) {
        g[r][c] = t;
        if (!wasOk || okAll(g.map(x => x.join('')))) { if (t === '^') spikes++; else walls++; break; }
        g[r][c] = '.';
      }
    }
    return { rows: g.map(x => x.join('')), spikes, walls };
  }

  // ---------- 认识的话 ----------
  const TOOL = /画关卡|编辑器|自己画|画地图|画.{0,4}(工具|关卡|地图)|(工具|编辑).{0,4}画/;
  const NEW_MAP = /(做|来|生成|弄|换|画|造|设计)\s*(一|1)?\s*(个|张|关|幅)?.{0,8}(迷宫|关卡|地图)|新的?(迷宫|关卡|地图)/;

  function run(code, prompt, mode) {
    const p = String(prompt || '');
    // 1. 画给精灵看：格子图
    const grid = gridOf(p);
    if (grid) return fromGrid(code, grid);
    if (/照(着|这|那)?(张|个|幅)?图/.test(p)) return { code: null, reply: '图没收到呀，把格子图再发我一次。' };
    // 2. 画关卡的工具
    if (TOOL.test(p)) {
      if (/\n\s*可以自己画:\s*true,/.test(code)) return { code: null, reply: '「画关卡」按钮已经有了，在右上角，点它就能画。' };
      return { code: H.setSetting(code, '可以自己画', 'true'), reply: '右上角多了「画关卡」按钮：选一种格子，点哪画哪，画好按「试玩」。' };
    }
    if (/画给(你|精灵)|给你画|画一?张图给/.test(p)) return { code: null, reply: '好呀！把格子图画好发给我，我一格一格照着做。' };

    let c = code, mapDone = false; const said = [];
    // 3. 设置：几条命、刺扣不扣命
    const lives = clamp(Math.round(+setVal(c, '有几条命')) || 3, 1, 99);
    let m, n = null;
    if ((m = p.match(new RegExp('(多|加)\\s*' + H.NUM + '\\s*条命')))) n = lives + H.toNum(m[2]);
    else if ((m = p.match(new RegExp(H.NUM + '\\s*条命')))) n = H.toNum(m[1]);
    else if (/命多一?点|多几条命|多给.{0,3}命|命太少/.test(p)) n = lives + 2;
    if (n != null && !isNaN(n)) { n = clamp(n, 1, 99); c = H.setSetting(c, '有几条命', String(n)); said.push(`现在有 ${n} 条命。`); }
    if (/刺.{0,4}(不扣|不会扣|不要扣|不掉|不减|不会死|不死|没事|不疼|不痛)|不怕刺/.test(p)) { c = H.setSetting(c, '刺会扣命', 'false'); said.push('踩到刺不扣命了，也不用回起点。'); }
    else if (/刺.{0,4}(扣命|会死|要死)/.test(p)) { c = H.setSetting(c, '刺会扣命', 'true'); said.push('踩到刺会少一条命，回到起点。'); }

    // 4. 地图：改难、改简单、用一段话描述（都是猜的）
    const isNew = NEW_MAP.test(p);
    const hard = /难/.test(p) && !/太难|不要.{0,2}难/.test(p), easy = /简单|容易|太难/.test(p);
    if (hard && !isNew) {
      const h = harder(c, p);
      if (h.fresh) { c = putMap(c, h.rows) || c; said.push('做了一个难一点的迷宫。墙和刺放在哪，是我猜的。'); mapDone = true; }
      else if (h.spikes + h.walls > 0) { c = putMap(c, h.rows) || c; said.push(`改难了：多了 ${h.spikes} 个刺、${h.walls} 块墙。放在哪，是我猜的。`); mapDone = true; }
      else if (n == null) { const k = Math.max(1, lives - 1); c = H.setSetting(c, '有几条命', String(k)); said.push(`地图没地方加东西了，命少一条：${k} 条。`); }
    } else if (easy && !isNew) {
      const rows = mapOf(c);
      if (count(rows, '^')) { c = putMap(c, rows.map(r => r.replace(/\^/g, '.'))) || c; said.push('刺都拿掉了，简单多了。'); mapDone = true; }
      else if (n == null) { c = H.setSetting(c, '有几条命', String(lives + 2)); said.push(`命多了 2 条：${lives + 2} 条。`); }
    } else if (isNew || /迷宫|关卡|地图|墙|起点|终点|星/.test(p)) {
      const rows = makeMaze(p, hard);
      const nc = putMap(c, rows);
      if (nc) { c = nc; said.push(hard ? '做了一个难一点的迷宫。墙放在哪、星星放在哪，是我猜的。' : '做了一个迷宫。墙放在哪、星星放在哪，是我猜的。'); mapDone = true; }
    }

    if (!said.length) return null;
    if (c === code && !mapDone) return { code: null, reply: '本来就是这样了，玩一玩试试。' };
    return { code: c, reply: said.join('') };
  }

  return {
    key: 'maze',
    is: code => code.includes('const 地图 = [') && code.includes('当前地图'),
    run,
    CAN: '照格子图做关卡（把画好的图发给我，一格不差）、用一段话说迷宫（墙和星星放哪我只能猜）、改难一点／简单一点、做画关卡的工具、几条命、刺扣不扣命'
  };
});
