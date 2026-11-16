// 第 14 课「怎么一下做出 5 种怪？」：守护狗窝（app/games/守护狗窝.html）
// 东西一多、每种都有自己的血量速度分数，一句话说不清：用表格下指令，或者给一个样例让精灵照着做一批。
// 只说一句"再加 5 种怪"也照做，但做得很平庸（全照抄第一种）——课上的对比页就靠它。
S2PARTS.push(function (H) {
  const MARK = 'const 怪物们 = [';
  const SPEEDS = ['慢', '中', '快'];
  const PX = { 慢: 1.2, 中: 1.8, 快: 2.8 };   // 和游戏里的速度表一样（每帧走几像素）
  const POOL = [['章鱼怪', '🐙'], ['蝎子怪', '🦂'], ['小火龙', '🐲'], ['幽灵', '👻'], ['蝙蝠', '🦇'], ['鳄鱼', '🐊'], ['小恐龙', '🦖'], ['蛇怪', '🐍'], ['蜘蛛怪', '🕷️'], ['外星人', '👽'], ['小恶魔', '😈'], ['南瓜头', '🎃'], ['大螃蟹', '🦀'], ['鱿鱼怪', '🦑'], ['鲨鱼怪', '🦈'], ['野猪怪', '🐗']];
  const ANIMALS = { 青蛙: '🐸', 老虎: '🐯', 狮子: '🦁', 犀牛: '🦏', 老鼠: '🐭', 猫: '🐱', 熊: '🐻', 猪: '🐷', 牛: '🐮', 鸡: '🐔', 兔子: '🐰', 猴子: '🐵', 鬼: '👻', 幽灵: '👻', 龙: '🐲', 恐龙: '🦖', 蛇: '🐍', 章鱼: '🐙', 螃蟹: '🦀', 蜘蛛: '🕷️', 外星人: '👽', 南瓜: '🎃', 机器人: '🤖', 蝙蝠: '🦇', 鱼: '🐟', 鲨鱼: '🦈', 蝎子: '🦂', 鳄鱼: '🐊', 怪兽: '👾', 大象: '🐘', 狼: '🐺', 狐狸: '🦊', 蜜蜂: '🐝', 蜗牛: '🐌', 企鹅: '🐧' };
  const COLORS = { 蓝: '#BDE6FF', 黄: '#FFE9A8', 粉: '#FFD6E5', 紫: '#E3D7FF', 白: '#FFFFFF', 灰: '#E2E4EA', 绿: '#CFEFD8', 橙: '#FFD9B8', 橘: '#FFD9B8', 红: '#FFC9C9', 沙: '#F3DDB3', 土: '#F3DDB3' };
  const EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*/u;
  const N = '(\\d+(?:\\.\\d+)?|[零一两二三四五六七八九十]+)';
  const VERB = '(?:改成|变成|调成|设成|设为|改为|调到|加到|减到|换成)';

  // ---------- 小工具 ----------
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const J = s => JSON.stringify(String(s));
  const uniq = a => a.filter((x, i) => a.indexOf(x) === i);
  const CN = '零一二三四五六七八九';
  function num(s) {   // '12' '1.5' '三' '十二' '二十' → 数字；看不懂 → NaN
    s = String(s == null ? '' : s).trim().replace(/两/g, '二');
    if (/^\d+(\.\d+)?$/.test(s)) return +s;
    if (/^[零一二三四五六七八九]$/.test(s)) return CN.indexOf(s);
    const m = s.match(/^([一二三四五六七八九]?)十([一二三四五六七八九]?)$/);
    return m ? (m[1] ? CN.indexOf(m[1]) : 1) * 10 + (m[2] ? CN.indexOf(m[2]) : 0) : NaN;
  }
  const firstNum = s => { const m = String(s || '').match(new RegExp(N)); return m ? num(m[1]) : NaN; };
  const normalize = s => String(s || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/．/g, '.').replace(/｜/g, '|');
  const round1 = v => Math.round(v * 10) / 10;
  const pxOf = v => SPEEDS.includes(v) ? PX[v] : (+v > 0 ? +v : PX.中);

  // ---------- 读、改代码里的表 ----------
  const blockRe = name => new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\n\\];');
  function parseVal(v) {
    v = v.trim();
    if (/^"(?:[^"\\]|\\.)*"$/.test(v)) { try { return JSON.parse(v); } catch (e) { return v.slice(1, -1); } }
    if (/^'[^']*'$/.test(v)) return v.slice(1, -1);
    if (/^-?\d+(\.\d+)?$/.test(v)) return +v;
    if (v === 'true' || v === 'false') return v === 'true';
    return { raw: v };
  }
  const fmtVal = v => typeof v === 'string' ? J(v) : (v && typeof v === 'object') ? v.raw : String(v);
  const fmtRow = (o, keys) => '{ ' + keys.map(k => k + ': ' + fmtVal(o[k])).join(', ') + ' },';
  function rowsOf(code, name) {   // 表里每一行：{ obj, keys, line }
    const m = code.match(blockRe(name)); if (!m) return null;
    const rows = [];
    for (const line of m[1].split('\n')) {
      const t = line.trim(); if (!/^\{.*\},?$/.test(t)) continue;
      const obj = {}, keys = [], re = /([一-龥A-Za-z_$][\w一-龥$]*)\s*:\s*("(?:[^"\\]|\\.)*"|'[^']*'|[^,}]+)/g; let k;
      while ((k = re.exec(t))) { if (!keys.includes(k[1])) keys.push(k[1]); obj[k[1]] = parseVal(k[2]); }
      rows.push({ obj, keys, line });
    }
    return rows;
  }
  const nameOf = r => String(r.obj.名字 == null ? '' : (typeof r.obj.名字 === 'object' ? r.obj.名字.raw : r.obj.名字));
  function setRows(code, name, lines) { return code.replace(blockRe(name), () => 'const ' + name + ' = [' + lines.map(l => '\n  ' + l).join('') + '\n];'); }
  function editBlock(code, name, f) {
    const m = code.match(blockRe(name)); if (!m) return code;
    return code.slice(0, m.index) + f(m[0]) + code.slice(m.index + m[0].length);
  }
  const editRow = (code, row, obj, keys) => editBlock(code, '怪物们', b => b.replace(row.line, () => row.line.match(/^\s*/)[0] + fmtRow(obj, keys)));
  const dropRow = (code, row) => editBlock(code, '怪物们', b => b.replace('\n' + row.line, () => ''));

  // 波次表的"出场"：和游戏里的「拆出场」一样拆
  function splitOut(s) {
    const out = [];
    for (const seg of String(s == null ? '' : (typeof s === 'object' ? s.raw : s)).split(/[、，,+＋;；\n]/)) {
      const t = seg.trim(); if (!t) continue;
      const m = t.match(/^(.*?)\s*[×xX*＊]\s*(\d+|[零一两二三四五六七八九十]+)\s*[只个]?$/) || t.match(/^(.*?)\s*(\d+|[零一两二三四五六七八九十]+)\s*[只个]$/);
      out.push({ name: (m ? m[1] : t).trim(), n: m ? clamp(Math.round(num(m[2])) || 0, 0, 50) : 1 });
    }
    return out;
  }
  function waveCheck(code) {   // 波次表里写到、怪物表里却没有的名字；一共几只能出来
    const mons = (rowsOf(code, '怪物们') || []).map(nameOf), waves = rowsOf(code, '波次们') || [];
    const parts = [].concat(...waves.map(r => splitOut(r.obj.出场)));
    return { mons, waves, parts, missing: uniq(parts.filter(x => !mons.includes(x.name)).map(x => x.name)), total: parts.filter(x => mons.includes(x.name)).reduce((a, x) => a + x.n, 0) };
  }
  const missingSay = miss => miss.length ? `波次表里的${miss.slice(0, 3).map(x => '「' + x + '」').join('')}在怪物表里没有，那几只不会出来。` : '';

  // 在一句话里找怪物名字（长的先找，找到就挖掉，免得名字里的数字被当成血量）
  function locate(p, rows) {
    let rest = p; const targets = [];
    for (const r of rows.slice().sort((a, b) => nameOf(b).length - nameOf(a).length)) {
      const nm = nameOf(r); if (!nm || !rest.includes(nm)) continue;
      targets.push({ row: r, at: p.indexOf(nm) }); rest = rest.split(nm).join('＠');
    }
    return { targets: targets.sort((a, b) => a.at - b.at).map(t => t.row), rest };
  }

  // ---------- 1、2：照表格做 ----------
  function tablesIn(p) {
    const blocks = []; let cur = null;
    for (const line of p.split(/\r?\n/)) {
      const t = line.trim();
      if (!t.includes('|')) { if (t) cur = null; continue; }
      const cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim());
      if (cells.every(c => c === '' || /^:?-{2,}:?$/.test(c))) continue;   // 分隔线、空行
      if (!cur || (kindOf(cells) && cur.rows.length)) { cur = { head: cells, rows: [] }; blocks.push(cur); }
      else cur.rows.push(cells);
    }
    return blocks;
  }
  const clean = s => String(s).replace(/[\s（）()：:"“”「」]/g, '');
  function kindOf(head) {
    const h = head.map(clean);
    if (h.some(x => /名字|名称/.test(x))) return 'mon';
    if (h.some(x => /出场|第几波|波次|^波$/.test(x))) return 'wave';
    return null;
  }
  const MON_COLS = [['名字', /^(名字|名称|怪物名字?|叫什么)$/], ['图案', /^(图案|样子|长相|emoji|表情|图标)$/i], ['血量', /^(血量|血|几下|要打几下|生命|生命值)$/], ['速度', /^(速度|快慢|走多快)$/], ['打倒得几分', /^(打倒得几分|打倒得分|分数|得分|几分|分)$/]];
  const DEF_SAY = { 图案: '用了👾', 血量: '按 1 血做', 速度: '按「中」做', 打倒得几分: '按 1 分做' };
  function monsterTable(code, t) {
    const idx = {};
    t.head.forEach((h, i) => { const c = MON_COLS.find(([, re]) => re.test(clean(h))); if (c && idx[c[0]] == null) idx[c[0]] = i; });
    const lacks = ['图案', '血量', '速度', '打倒得几分'].filter(k => idx[k] == null);
    const notes = [], made = [], seen = [];
    if (lacks.length) notes.push(`表里没有${lacks.map(k => '「' + k + '」').join('')}，${lacks.length === 1 ? DEF_SAY[lacks[0]] : '用了默认的'}`);
    for (const cells of t.rows) {
      const cell = k => idx[k] == null ? null : String(cells[idx[k]] == null ? '' : cells[idx[k]]).trim();
      const name = (cell('名字') || '').replace(/^["'“”「」]+|["'“”「」]+$/g, '');
      if (!name) { if (cells.some(Boolean)) notes.push('有一行没写名字，跳过了'); continue; }
      if (seen.includes(name)) { notes.push(`「${name}」写了两遍，用了第一行`); continue; }
      seen.push(name);
      const bad = (k, v, how) => notes.push(v === '' ? `${name}的${k === '打倒得几分' ? '分数' : k}没填，${how}` : `${name}的${k === '打倒得几分' ? '分数' : k}「${v}」看不懂，${how}`);
      // 图案
      let icon = '👾'; const ic = cell('图案');
      if (ic) { const e = ic.match(EMOJI); const a = Object.keys(ANIMALS).sort((x, y) => y.length - x.length).find(k => ic.includes(k)); if (e) icon = e[0]; else if (a) icon = ANIMALS[a]; else bad('图案', ic, '用了👾'); }
      else if (ic === '') bad('图案', '', '用了👾');
      // 血量
      let hp = 1; const hc = cell('血量');
      if (hc != null) {
        const v = /^\s*(\d+(?:\.\d+)?|[零一两二三四五六七八九十]+)\s*(下|滴|点|格|血|滴血)?\s*$/.test(hc) ? firstNum(hc) : NaN;
        if (v >= 1) { hp = clamp(Math.round(v), 1, 20); if (hp !== Math.round(v)) notes.push(`${name}的血量最多 20`); } else if (v === 0) notes.push(`${name}的血量最少 1`); else bad('血量', hc, '按 1 血做');
      }
      // 速度
      let sp = '中'; const sc0 = cell('速度');
      if (sc0 != null) {
        if (/不快不慢|中|一般|普通|正常/.test(sc0)) sp = '中';
        else if (/慢/.test(sc0) && !/快/.test(sc0)) sp = '慢';
        else if (/快/.test(sc0) && !/慢/.test(sc0)) sp = '快';
        else if (/^\d+(\.\d+)?$/.test(sc0) && +sc0 > 0) sp = clamp(+sc0, 0.3, 10);
        else bad('速度', sc0, '按「中」做');
      }
      // 分数
      let pt = 1; const pc = cell('打倒得几分');
      if (pc != null) {
        const v = /^\s*(\d+(?:\.\d+)?|[零一两二三四五六七八九十]+)\s*分?\s*$/.test(pc) ? firstNum(pc) : NaN;
        if (v >= 0) { pt = clamp(Math.round(v), 0, 20); if (pt !== Math.round(v)) notes.push(`${name}的分数最多 20`); } else bad('打倒得几分', pc, '按 1 分做');
      }
      made.push({ 名字: name, 图案: icon, 血量: hp, 速度: sp, 打倒得几分: pt });
    }
    if (!made.length) return { code: null, reply: '这张怪物表还没填怪，填几行再给我。' };
    const c = setRows(code, '怪物们', made.map(m => fmtRow(m, ['名字', '图案', '血量', '速度', '打倒得几分'])));
    const top = f => { const best = Math.max(...made.map(f)); const who = made.filter(m => f(m) === best); return made.length > 1 && who.length === 1 ? who[0].名字 : null; };
    const hard = top(m => m.血量), fast = top(m => pxOf(m.速度));
    const sum = hard && hard === fast ? hard + '最难打，也最快' : [hard ? hard + '最难打' : '', fast ? fast + '最快' : ''].filter(Boolean).join('，');
    let reply = `照表做好了 ${made.length} 种怪${sum ? '：' + sum : ''}。`;
    if (notes.length) reply += notes.slice(0, 2).join('；') + (notes.length > 2 ? '……' : '。');
    return { code: c, reply, noted: notes.length > 0 };
  }
  function waveTable(code, t) {
    const h = t.head.map(clean);
    const iW = h.findIndex(x => /第几波|波次|^波$|^第几$/.test(x));
    let iO = h.findIndex(x => /出场|出来|怪物|谁/.test(x));
    if (iO < 0 && h.length === 2 && iW >= 0) iO = 1 - iW;
    if (iO < 0) return { code: null, reply: '波次表要有「出场」这一列：写谁出来、几只。' };
    const lines = [];
    for (const cells of t.rows) {
      const out = String(cells[iO] || '').trim().replace(/^["“]+|["”]+$/g, '');
      if (!out) continue;
      const w = iW >= 0 && firstNum(cells[iW]) > 0 ? Math.round(firstNum(cells[iW])) : lines.length + 1;
      lines.push(`{ 第几波: ${w}, 出场: ${J(out)} },`);
    }
    if (!lines.length) return { code: null, reply: '波次表还没填，填几行再给我。' };
    return { code: setRows(code, '波次们', lines), reply: '' };
  }
  function doTables(code, tables) {
    const mons = tables.filter(t => kindOf(t.head) === 'mon'), waves = tables.filter(t => kindOf(t.head) === 'wave');
    if (!mons.length && !waves.length) return { code: null, reply: '这张表我看不懂：怪物表第一行要有「名字」，波次表第一行要有「出场」。' };
    let c = code; const said = [];
    let noted = false;
    for (const t of mons) { const r = monsterTable(c, t); if (r.code) c = r.code; said.push(r.reply); noted = noted || !!r.noted; }
    let waveDone = false;
    for (const t of waves) { const r = waveTable(c, t); if (r.code) { c = r.code; waveDone = true; } else said.push(r.reply); }
    if (c === code) return { code: null, reply: said.join(' ') };
    const w = waveCheck(c);
    if (waveDone) said.push(`照表排好了 ${w.waves.length} 波，一共 ${w.total} 只怪。`);
    said.push(missingSay(w.missing));
    if (mons.length && !waveDone && w.waves.length && !noted && !w.missing.length) {
      const idle = w.mons.filter(nm => !w.parts.some(x => x.name === nm));
      if (idle.length) said.push(`${idle.slice(0, 2).join('、')}${idle.length > 2 ? '等' : ''}还没写进波次表，不会出场。`);
    }
    return { code: c, reply: said.filter(Boolean).join('') };
  }

  // ---------- 3、4：再做几种怪（给了样例就照样例变；没给就全抄第一种） ----------
  const MORE = new RegExp('(?:做|加|添|来|弄|设计|造|画|变出|编)\\s*(?:' + N + '\\s*(?:种|个|样|类)|(?:几|好几|一些|一批|些)\\s*(?:种|个|样|类)?)[^，。,.!！？?；;\\n]{0,8}?(?:怪|敌人)');
  function pickNew(names, icons, base) {
    let pick = POOL.find(([n, i]) => !names.includes(n) && !icons.includes(i)) || POOL.find(([n]) => !names.includes(n));
    if (!pick) { let k = 2; while (names.includes(base + k + '号')) k++; pick = [base + k + '号', '👾']; }
    names.push(pick[0]); icons.push(pick[1]);
    return pick;
  }
  function makeMore(code, p, m, targets) {
    if (!blockRe('怪物们').test(code)) return { code: null, reply: '代码里找不到怪物表了。' };
    let n = m[1] ? Math.round(num(m[1])) : 3;
    if (!(n >= 1)) n = 3;
    const capped = n > 8; n = clamp(n, 1, 8);
    const rows = rowsOf(code, '怪物们') || [];
    const names = rows.map(nameOf), icons = rows.map(r => String(r.obj.图案));
    const sample = targets[0];
    const marker = /照|仿|像|按|学|参考|样例|样子|那样|一样|模仿|依照|比着/.test(p);
    const hasWaves = (rowsOf(code, '波次们') || []).length > 0;
    let c = code;
    if (sample && (marker || nameOf(sample).length >= 2)) {   // 3. 照样例做一批：属性按样例逐个变化
      const s = sample.obj;
      const hp0 = clamp(Math.round(num(s.血量)) || 1, 1, 20);
      const sc0 = num(s.打倒得几分) >= 0 ? clamp(Math.round(num(s.打倒得几分)), 0, 20) : 1;
      const sp0 = SPEEDS.includes(s.速度) ? s.速度 : num(s.速度) > 0 ? (num(s.速度) < 1.5 ? '慢' : num(s.速度) < 2.4 ? '中' : '快') : '中';
      const harder = /(一种比一种|一个比一个|一只比一只|越来越|越往后越|一级比一级|依次|逐个|逐渐)[^，。]{0,3}(难|厉害|强|硬|凶|耐打|血多|多血)/.test(p);
      const faster = /(一种比一种|一个比一个|一只比一只|越来越|越往后越|依次|逐渐)[^，。]{0,2}快/.test(p);
      const fast = !faster && /快/.test(p) && !/慢/.test(p), slow = !faster && !fast && /慢/.test(p);
      const HP_VAR = [2, -1, 3, 1, 4, -1, 2, 5];
      const keys = sample.keys.slice();
      ['名字', '图案', '血量', '速度', '打倒得几分'].forEach(k => { if (!keys.includes(k)) keys.push(k); });
      const made = [];
      for (let k = 1; k <= n; k++) {
        const [name, icon] = pickNew(names, icons, nameOf(sample));
        const hp = clamp(harder ? hp0 + k : hp0 + HP_VAR[k - 1], 1, 20);
        let sp = harder ? sp0 : ['快', '慢', '中'][(k - 1) % 3];
        if (fast) sp = ['快', '快', '中'][(k - 1) % 3];
        if (slow) sp = ['慢', '慢', '中'][(k - 1) % 3];
        if (faster) sp = SPEEDS[Math.min(2, SPEEDS.indexOf(sp0) + k)];
        const pt = harder ? clamp(sc0 + k, 0, 20) : clamp(Math.round(Math.max(1, sc0) * hp / hp0 + (sp === '快' ? 1 : 0)), 1, 20);
        const o = Object.assign({}, s, { 名字: name, 图案: icon, 血量: hp, 速度: sp, 打倒得几分: pt });
        made.push(o); c = H.addItem(c, '怪物们', fmtRow(o, keys));
      }
      const same = harder || made.every(o => o.速度 === made[0].速度);
      const list = made.slice(0, 3).map(o => `${o.图案}${o.名字} ${o.血量} 血${same ? '' : ' ' + o.速度}`).join('、') + (made.length > 3 ? '……' : '。');
      return { code: c, reply: `照着${nameOf(sample)}做了 ${n} 种：${list}${capped ? '一次最多做 8 种。' : ''}${hasWaves ? '写进波次表就会出场。' : ''}` };
    }
    // 4. 没给表、也没给样例：照做，但全抄第一种，只有名字不一样
    const first = rows[0];
    const base = first ? nameOf(first) || '怪物' : '怪物';
    const keys = first ? first.keys.slice() : ['名字', '图案', '血量', '速度', '打倒得几分'];
    if (!keys.includes('名字')) keys.unshift('名字');
    for (let k = 1, i = 2; k <= n; k++) {
      while (names.includes(base + i + '号')) i++;
      names.push(base + i + '号');
      const o = Object.assign({ 图案: '👾', 血量: 1, 速度: '中', 打倒得几分: 1 }, first ? first.obj : {}, { 名字: base + i + '号' });
      c = H.addItem(c, '怪物们', fmtRow(o, keys));
    }
    return { code: c, reply: first ? `加了 ${n} 种怪，都是照${base}做的，血量、速度都一样。是你想要的吗？` : `加了 ${n} 种怪，血量、速度都一样。是你想要的吗？` };
  }

  // ---------- 5：改一种怪的一个属性 ----------
  function attrsOf(p) {   // p 里的怪物名字已经挖掉了
    const a = {}; let m;
    const emo = p.match(EMOJI);
    if (emo && (/图案|样子|长相|长得|emoji|表情|图标/i.test(p) || new RegExp('(?:换成|变成|改成|换)\\s*' + EMOJI.source, 'u').test(p))) a.icon = emo[0];
    else if (/图案|样子|长相|长得像/.test(p)) { const k = Object.keys(ANIMALS).sort((x, y) => y.length - x.length).find(k => p.includes(k)); if (k) a.icon = ANIMALS[k]; }
    // 血量
    if ((m = p.match(new RegExp('血[^，。,分速图]*?' + VERB + '\\s*' + N)))) a.hp = num(m[1]);
    else if ((m = p.match(new RegExp(N + '\\s*(?:滴|点|格|口)?\\s*血(?!条)')))) a.hp = num(m[1]);
    else if ((m = p.match(new RegExp('打\\s*' + N + '\\s*下')))) a.hp = num(m[1]);
    else if ((m = p.match(new RegExp('血量?\\s*(?:是|为|有|=|：|:)?\\s*' + N)))) a.hp = num(m[1]);
    else if ((m = p.match(new RegExp('血量?\\s*(?:加|多|增加)\\s*' + N)))) a.hpAdd = num(m[1]);
    else if ((m = p.match(new RegExp('血量?\\s*(?:减|少|减少)\\s*' + N)))) a.hpAdd = -num(m[1]);
    else if (/一下就倒|一打就倒|打一下就倒/.test(p)) a.hp = 1;
    else if (/难打|耐打|抗打|结实|血(多|厚)一?(点|些)|血量(多|高)一?(点|些)/.test(p)) a.hpAdd = 2;
    else if (/好打|血(少|薄)一?(点|些)|血量(少|低)一?(点|些)/.test(p)) a.hpAdd = -1;
    // 速度
    if ((m = p.match(new RegExp('速度[^，。,血分图]*?(?:改成|变成|调成|设成|设为|改为|调到|是|为|=|：|:)\\s*["“「]?(慢|中|快|' + N.slice(1, -1) + ')')))) a.sp = SPEEDS.includes(m[1]) ? m[1] : clamp(num(m[1]), 0.3, 10);
    else if (/最快|超快|飞快|特别快|(改成|变成)快/.test(p)) a.sp = '快';
    else if (/最慢|超慢|特别慢|(改成|变成)慢/.test(p)) a.sp = '慢';
    else if (/中速|不快不慢|中等速度|速度中等|(改成|变成)中/.test(p)) a.sp = '中';
    else if (/(变|更|走|跑|再|得)\s*慢|慢\s*(一点|一些|点|些)|慢下来/.test(p)) a.spStep = -1;
    else if (/(变|更|走|跑|再|得)\s*快|快\s*(一点|一些|点|些)/.test(p)) a.spStep = 1;
    else if ((m = p.match(new RegExp('速度\\s*["“「]?(慢|中|快|' + N.slice(1, -1) + ')')))) a.sp = SPEEDS.includes(m[1]) ? m[1] : clamp(num(m[1]), 0.3, 10);
    // 分数
    if ((m = p.match(new RegExp('分[^，。,血速图]*?' + VERB + '\\s*' + N)))) a.pt = num(m[1]);
    else if ((m = p.match(new RegExp(N + '\\s*分(?!钟)')))) a.pt = num(m[1]);
    else if ((m = p.match(new RegExp('分数\\s*(?:是|为|=|：|:)?\\s*' + N)))) a.pt = num(m[1]);
    for (const k of ['hp', 'hpAdd', 'pt', 'sp']) if (k in a && typeof a[k] === 'number' && !Number.isFinite(a[k])) delete a[k];
    return Object.keys(a).length ? a : null;
  }
  function stepSpeed(v, dir) {   // dir：-1 变慢，+1 变快
    if (SPEEDS.includes(v)) { const i = SPEEDS.indexOf(v) + dir; return i >= 0 && i <= 2 ? SPEEDS[i] : (dir < 0 ? 0.8 : 4); }
    const n = +v;
    if (n > 0) return round1(clamp(dir < 0 ? n * 0.7 : n * 1.4, 0.3, 10));
    return dir < 0 ? '慢' : '快';
  }
  const show = v => v == null ? '（没填）' : typeof v === 'object' ? v.raw : String(v);
  function editMonsters(code, a, targets) {
    let c = code; const said = [];
    for (const row of targets) {
      const o = Object.assign({}, row.obj), keys = row.keys.slice(), nm = nameOf(row);
      const set = (k, v, label) => { if (!keys.includes(k)) keys.push(k); if (show(o[k]) !== show(v)) said.push(`${nm}的${label} ${show(o[k])} → ${show(v)}`); o[k] = v; };
      if (a.hp != null || a.hpAdd) { const cur = clamp(Math.round(num(o.血量)) || 1, 1, 20); set('血量', clamp(Math.round(a.hp != null ? a.hp : cur + a.hpAdd), 1, 20), '血量'); }
      if (a.sp != null || a.spStep) set('速度', a.sp != null ? a.sp : stepSpeed(o.速度, a.spStep), '速度');
      if (a.pt != null) set('打倒得几分', clamp(Math.round(a.pt), 0, 20), '分数');
      if (a.icon) set('图案', a.icon, '图案');
      c = editRow(c, row, o, keys);
    }
    if (c === code) return { code: null, reply: `${targets.map(nameOf).join('、')}本来就是这样的，没改。` };
    let reply = said.slice(0, 3).join('，') + (said.length > 3 ? '……' : '。');
    if (targets.length > 1) {   // 一次改好几种：只说改成了什么
      const parts = [];
      if (a.hp != null) parts.push(`血量都改成 ${clamp(Math.round(a.hp), 1, 20)}`); else if (a.hpAdd) parts.push(`血量都${a.hpAdd > 0 ? '加' : '减'}了 ${Math.abs(a.hpAdd)}`);
      if (a.sp != null) parts.push(`速度都改成 ${a.sp}`); else if (a.spStep) parts.push(`都变${a.spStep < 0 ? '慢' : '快'}了`);
      if (a.pt != null) parts.push(`分数都改成 ${clamp(Math.round(a.pt), 0, 20)}`);
      if (a.icon) parts.push(`都换成 ${a.icon}`);
      reply = `${targets.length} 种怪${parts.join('，')}。`;
    }
    if (a.hp > 20 || a.pt > 20) reply += '最多 20。';
    return { code: c, reply };
  }

  // ---------- 6：设置 ----------
  function settings(code, p) {
    let c = code, m; const said = [];
    const cur = (k, d) => { const x = c.match(new RegExp('\\n\\s*' + k + ':\\s*([^,\\n]+),')); const v = x ? +x[1].trim() : NaN; return Number.isFinite(v) ? v : d; };
    const put = (k, v, msg) => { if (H.hasSetting(c, k)) { c = H.setSetting(c, k, v); said.push(msg); } };
    // 心
    if ((m = p.match(new RegExp(N + '\\s*(?:颗|个|条)\\s*(?:心|命|❤)'))) || (m = p.match(new RegExp('(?:心|命)\\s*(?:' + VERB.slice(3, -1) + '|有|是)\\s*' + N)))) {
      const n = clamp(Math.round(num(m[1])) || 1, 1, 20); put('狗窝有几颗心', n, `狗窝现在有 ${n} 颗心。`);
    } else if (/(多|加)[一两几]?(颗|个|条)?(心|命)|心多一?(点|些)/.test(p)) { const n = clamp(cur('狗窝有几颗心', 3) + 2, 1, 20); put('狗窝有几颗心', n, `狗窝现在有 ${n} 颗心。`); }
    // 两波之间休息
    if (/休息|歇/.test(p) || (/波/.test(p) && /间隔|隔/.test(p) && !/每只|一只|只怪|每个怪/.test(p))) {
      let v = null;
      if ((m = p.match(new RegExp(N + '\\s*秒')))) v = num(m[1]);
      else if (/不(要)?休息|别休息|不歇/.test(p)) v = 0;
      else if (/久|长|多/.test(p)) v = cur('每波之间休息几秒', 3) + 2;
      else if (/短|少/.test(p)) v = Math.max(0, cur('每波之间休息几秒', 3) - 1);
      if (v != null && Number.isFinite(v)) { v = round1(clamp(v, 0, 30)); put('每波之间休息几秒', v, `两波之间休息 ${v} 秒。`); }
    } else if (/间隔|隔/.test(p) && (m = p.match(new RegExp(N + '\\s*秒')))) {
      const v = round1(clamp(num(m[1]), 0.2, 10)); if (Number.isFinite(v)) put('每只怪间隔几秒', v, `每隔 ${v} 秒出来一只怪。`);
    } else if (/出(?:怪|来)?得?\s*(?:更|再)?(快|密|勤)/.test(p)) { const v = round1(clamp(cur('每只怪间隔几秒', 1.2) * 0.6, 0.2, 10)); put('每只怪间隔几秒', v, `怪出得更密了：每隔 ${v} 秒一只。`); }
    else if (/出(?:怪|来)?得?\s*(?:更|再)?(慢|稀)/.test(p)) { const v = round1(clamp(cur('每只怪间隔几秒', 1.2) * 1.6, 0.2, 10)); put('每只怪间隔几秒', v, `怪出得慢一点了：每隔 ${v} 秒一只。`); }
    // 血条
    if (/血条/.test(p)) { if (/不要|去掉|关掉|关了|隐藏|拿掉|别|不|取消|删/.test(p)) put('显示血条', 'false', '不画血条了。'); else put('显示血条', 'true', '怪物头上有血条了。'); }
    // 怪物大小
    if ((m = p.match(new RegExp('怪物?大小\\s*(?:' + VERB.slice(3, -1) + '|是)?\\s*' + N)))) { const v = clamp(Math.round(num(m[1])) || 64, 24, 140); put('怪物大小', v, `怪物大小改成 ${v} 了。`); }
    else if (/(怪物?|它们)们?\s*(?:变得?|画得?|再)?\s*大(一?点|一些|些)?/.test(p)) { const v = clamp(cur('怪物大小', 64) + 16, 24, 140); put('怪物大小', v, '怪物画大一点了。'); }
    else if (/(怪物?|它们)们?\s*(?:变得?|画得?|再)?\s*小(一?点|一些|些)?/.test(p)) { const v = clamp(cur('怪物大小', 64) - 12, 24, 140); put('怪物大小', v, '怪物画小一点了。'); }
    // 草地颜色
    if (/天黑|晚上|夜晚|黑夜/.test(p)) put('背景颜色', '"#3B4B6E"', '天黑了。');
    else if (/背景|草地|地面|草坪/.test(p)) { const k = Object.keys(COLORS).find(k => p.includes(k)); if (k) put('背景颜色', J(COLORS[k]), `草地换成${k}色了。`); }
    // 通用：把「设置里的一项」改成数字
    if (!said.length && (m = p.match(/把?\s*([一-龥A-Za-z]{1,10}?)\s*(?:改成|变成|调成|设成|设为|改为|调到)\s*(-?\d+(?:\.\d+)?|true|false)/)) && H.hasSetting(c, m[1])) put(m[1], m[2], `「${m[1]}」改成 ${m[2]} 了。`);
    return said.length ? { code: c, reply: said.join('') } : null;
  }

  function run(code, prompt) {
    const p = normalize(prompt);
    if (!p.trim()) return null;
    // 1、2：话里带着表格
    const tables = tablesIn(p);
    if (tables.length) return doTables(code, tables);
    if (/怪物表|波次表|这张表|这个表|表格/.test(p)) return { code: null, reply: '没看到表格。把表填好，连表一起发给我。' };
    const rows = rowsOf(code, '怪物们') || [];
    const L = locate(p, rows);
    // 3、4：再做几种怪
    const more = p.match(MORE);
    if (more) return makeMore(code, p, more, L.targets);
    // 5：说了哪只怪：改它的属性，或者删掉它
    if (L.targets.length) {
      const a = attrsOf(L.rest);
      if (a) return editMonsters(code, a, L.targets);
      if (L.targets.length === 1 && /删|去掉|不要|拿掉|移除/.test(L.rest) && !/血|速度|分|图案/.test(L.rest)) {
        const nm = nameOf(L.targets[0]); const c = dropRow(code, L.targets[0]);
        return { code: c, reply: `删掉了${nm}。` + missingSay(waveCheck(c).missing) };
      }
    }
    // 6：设置
    const s = settings(code, L.rest);
    if (s) return s;
    // 5：没说哪只怪
    if (!L.targets.length) {
      const a = attrsOf(L.rest);
      if (a) {
        if (!rows.length) return { code: null, reply: '怪物表是空的，先做几种怪。' };
        // 说了一个怪物表里没有的名字（「大块头的血量改成 8」，可表里没有大块头）：别改错了别的怪
        const who = L.rest.match(/^(?:把|给|让|将)?\s*([一-龥A-Za-z0-9]{1,8}?)\s*(?:的|要|打倒得|变|走|跑|换成|改成|速度|血量|图案|分数)/);
        if (who && !/^(怪物?们?|所有的?怪物?|全部的?怪物?|每一?种怪物?|它们?|大家)$/.test(who[1]) && !/血|速度|分|图案|快|慢|＠/.test(who[1])) return { code: null, reply: `怪物表里没有「${who[1]}」。先把它做出来，或者说表里有的名字。` };
        if (rows.length === 1 || /所有|全部|每种|每一种|都/.test(p)) return editMonsters(code, a, rows);
        return { code: null, reply: `改哪种怪？说名字，比如「${nameOf(rows[rows.length - 1])}的血量改成 5」。` };
      }
    }
    return null;
  }

  return {
    key: 'monsters',
    is: code => code.includes(MARK),
    run,
    CAN: '照怪物表做怪（第一行写 名字|图案|血量|速度|打倒得几分）、照波次表出怪（第几波|出场）、照着一只怪再做几种（「照着小怪兽再做 4 种，一种比一种难打」）、再加几种怪、改一种怪的血量/速度/分数/图案、删掉一种怪、狗窝几颗心、两波之间休息几秒、出怪间隔、要不要血条'
  };
});
