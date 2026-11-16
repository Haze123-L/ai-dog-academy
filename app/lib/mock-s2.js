// ================= 第二季：各节课的演示精灵规则（由 tools/build.js 从 src/shared/mock-s2/ 拼成，不要直接改） =================
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MockS2 = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const S2PARTS = [];
// ----- mock-s2/00-readme.js -----
// 每个文件往 S2PARTS 里放一个函数 (H) => ({ key, is(code), run(code, prompt, mode, error), plan?(code, prompt), CAN })
// H：setSetting, addItem, upsertBlock, removeBlock, rep, hasSetting, gameOf, toNum, NUM（见 mock-genie.js）
// ----- mock-s2/14-monsters.js -----
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
// ----- mock-s2/15-maze.js -----
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
// ----- mock-s2/16-breakout.js -----
// 第 16 课「精灵打算怎么做？」：打砖块。精灵先说计划（plan），同意了再动手（run）。
// plan 和 run 用同一份「步骤」：每一步 = { 说: 计划里的一句话, 改: 代码 => 新代码 }，所以说的就是做的。
// 说清楚的：计划只改那一处，最后一句说明哪些不动；说得模糊的：也照做，但计划里会混进一步"你多半不想要"的改动。
S2PARTS.push(function (H) {
  const NUM = H.NUM, toNum = H.toNum;
  const 颜色们 = { 红: '#FF5A5F', 黄: '#FFC93D', 绿: '#2ECC9A', 金: '#E8A317', 蓝: '#4D8DFF', 紫: '#9B6BFF', 橙: '#FF8A3D', 粉: '#FF7EB6', 白: '#F2F2F2', 银: '#B8C2D1', 灰: '#8D99AE', 黑: '#4A4F5C', 青: '#22C7C7' };
  const 色字 = Object.keys(颜色们).join('');
  const 掉落说法 = { 变长: '变长 10 秒', 多一个球: '多一个球', 加一条命: '多一条命' };

  // ---------- 读表格、改表格 ----------
  const 种类块 = /const 砖块种类 = \[([^\]]*)\];/;
  const 排列块 = /const 砖块排列 = \[([^\]]*)\];/;
  function 读种类(code) {
    const m = code.match(种类块); if (!m) return null;
    return m[1].split('\n').filter(l => /\{.*\}/.test(l) && !/^\s*\/\//.test(l)).map(l => {
      const 取 = (k, d) => { const mm = l.match(new RegExp(k + ':\\s*("[^"]*"|[^,}\\s]+)')); if (!mm) return d; return mm[1][0] === '"' ? mm[1].slice(1, -1) : mm[1]; };
      return { line: l, 记号: 取('记号', ''), 打几下才碎: 取('打几下才碎', '1'), 得几分: 取('得几分', '1'), 碎了掉出: 取('碎了掉出', '') };
    }).filter(k => k.记号);
  }
  const 记号们 = code => (读种类(code) || []).map(k => Array.from(k.记号)[0]).filter(k => k && k !== '.');
  const 种类行 = k => `{ 记号: "${k.记号}", 颜色: "${k.颜色}", 打几下才碎: ${k.打几下才碎}, 得几分: ${k.得几分}, 碎了掉出: "${k.碎了掉出}" },`;
  function 加种类(code, k) {
    return code.replace(种类块, (m, 身体) => 'const 砖块种类 = [' + 身体.replace(/\s*$/, '') + '\n  ' + 种类行(k) + '\n];');
  }
  // 改一种砖的几列；这种砖还没有，就加一行
  function 改种类(code, 记号, 改) {
    const 旧 = (读种类(code) || []).find(k => k.记号 === 记号);
    if (!旧) return 加种类(code, Object.assign({ 记号, 颜色: 颜色们[记号] || '#FFC93D', 打几下才碎: 1, 得几分: 1, 碎了掉出: '' }, 改));
    let 行 = 旧.line;
    for (const 列 of Object.keys(改)) {
      const 值 = typeof 改[列] === 'string' ? `"${改[列]}"` : String(改[列]);
      const re = new RegExp('(' + 列 + ':\\s*)("[^"]*"|[^,}\\s]+)');
      行 = re.test(行) ? 行.replace(re, (m, a) => a + 值) : 行.replace(/\s*\}\s*,/, `, ${列}: ${值} },`);
    }
    return code.replace(种类块, m => m.replace(旧.line, () => 行));
  }
  function 读排列(code) {
    const m = code.match(排列块); if (!m) return null;
    return m[1].split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//')).map(l => (l.match(/^["'`](.*?)["'`]\s*,?/) || [])[1]).filter(x => x != null);
  }
  const 写排列 = (code, 排们) => code.replace(排列块, () => 'const 砖块排列 = [' + 排们.map(r => `\n  "${r}",`).join('') + '\n];');
  const 最长 = 排们 => Math.max(0, ...排们.map(r => Array.from(r).length));
  function 读设置(code, 键, 默认) { const m = code.match(new RegExp('\\n\\s*' + 键 + ':\\s*([^,\\n]+),')); const v = m ? +m[1].trim() : NaN; return Number.isFinite(v) ? v : 默认; }

  // ---------- 一步一步的改动 ----------
  const 步打几下 = (记号, n) => ({ 说: `把${记号}砖改成要打 ${n} 下才碎`, 改: c => 改种类(c, 记号, { 打几下才碎: n }) });
  const 步全部打几下 = n => ({ 说: `所有砖都要打 ${n} 下才碎`, 改: c => 记号们(c).reduce((c2, k) => 改种类(c2, k, { 打几下才碎: n }), c) });
  function 步球速(怎样) {
    const 新 = v => 怎样 === '快一倍' ? v * 2 : 怎样 === '慢一半' ? Math.max(1, Math.round(v / 2)) : 怎样 === '快一点' ? v + 2 : 怎样 === '慢一点' ? Math.max(1, v - 2) : 怎样;
    return {
      说: c => { const v = 读设置(c, '球的速度', 6); return typeof 怎样 === 'number' ? `球的速度从 ${v} 改成 ${新(v)}` : `球的速度变${怎样}（从 ${v} 变成 ${新(v)}）`; },
      改: c => H.setSetting(c, '球的速度', String(新(读设置(c, '球的速度', 6))))
    };
  }
  function 步挡板(怎样) {
    const 新 = v => 怎样 === '长一倍' ? v * 2 : 怎样 === '短一半' ? Math.max(40, Math.round(v / 2)) : 怎样 === '长一点' ? v + 60 : 怎样 === '短一点' ? Math.max(40, v - 40) : 怎样;
    return {
      说: c => { const v = 读设置(c, '挡板宽度', 160); return typeof 怎样 === 'number' ? `挡板宽度从 ${v} 改成 ${新(v)}` : `挡板变${怎样}（宽度从 ${v} 变成 ${新(v)}）`; },
      改: c => H.setSetting(c, '挡板宽度', String(新(读设置(c, '挡板宽度', 160))))
    };
  }
  const 步球数 = n => ({ 说: c => `一局${n === 1 ? '只' : ''}有 ${n} 个球（原来 ${读设置(c, '有几个球', 3)} 个）`, 改: c => H.setSetting(c, '有几个球', String(n)) });
  const 步保护墙 = { 说: '在挡板下面加一道保护墙：球掉下去能挡住一次，挡过一次墙就没了', 改: c => H.setSetting(c, '底下有保护墙', 'true') };
  function 步加种类(记号, 掉, 分, 几下) {
    const 掉了 = 掉 ? `，碎了掉出"${掉}"道具（挡板接到就${掉落说法[掉]}）` : '，碎了什么都不掉';
    const 碎 = 几下 === 1 ? '打 1 下就碎' : `打 ${几下} 下才碎`;
    return {
      说: c => 记号们(c).includes(记号) ? `把${记号}砖改成：${碎}，得 ${分} 分${掉了}` : `加一种${记号}砖：${记号}色，${碎}，得 ${分} 分${掉了}`,
      改: c => 改种类(c, 记号, { 打几下才碎: 几下, 得几分: 分, 碎了掉出: 掉 })
    };
  }
  // 把中间那排正中间的几块换成某种砖（排列是空的就加一排）
  function 步放中间(记号) {
    const 算 = c => { const 排们 = 读排列(c) || []; if (!排们.length) return null; const i = Math.floor((排们.length - 1) / 2), 字们 = Array.from(排们[i]), n = Math.min(4, 字们.length), 起 = Math.floor((字们.length - n) / 2); return { 排们, i, 字们, n, 起 }; };
    return {
      说: c => { const a = 算(c); return a ? `把第 ${a.i + 1} 排正中间的 ${a.n} 块砖换成${记号}砖` : `砖块排列是空的，先加一排${记号}砖（10 块）`; },
      改: c => { const a = 算(c); if (!a) return 写排列(c, [记号.repeat(10)]); for (let j = a.起; j < a.起 + a.n; j++) a.字们[j] = 记号; a.排们[a.i] = a.字们.join(''); return 写排列(c, a.排们); }
    };
  }
  function 步加排(n, 记号) {
    const 宽 = c => 最长(读排列(c) || []) || 10;
    const 用 = (c, i) => 记号 || 记号们(c)[((读排列(c) || []).length + i) % 记号们(c).length];
    return {
      说: c => n === 1 ? `在最下面加一排${用(c, 0)}砖（${宽(c)} 块）` : `在最下面加 ${n} 排砖（${Array.from({ length: n }, (x, i) => 用(c, i)).join('、')}，每排 ${宽(c)} 块）`,
      改: c => { const 排们 = 读排列(c) || [], w = 宽(c), 新排 = Array.from({ length: n }, (x, i) => 用(c, i).repeat(w)); return 写排列(c, 排们.concat(新排)); }
    };
  }
  const 金字塔 = ks => Array.from({ length: 5 }, (x, i) => { const n = 2 + i * 2, 空 = '.'.repeat((10 - n) / 2); return 空 + ks[i % ks.length].repeat(n) + 空; });
  const 步金字塔 = { 说: c => `把砖块重新排成金字塔：5 排，最上面 2 块，往下每排多 2 块，一排一种颜色（${金字塔(记号们(c)).map(r => r.replace(/\./g, '')[0]).join('、')}）；原来的排列不要了`, 改: c => 写排列(c, 金字塔(记号们(c))) };
  const 爱心 = k => ['.XXX.XXX.', 'XXXXXXXXX', 'XXXXXXXXX', '.XXXXXXX.', '..XXXXX..', '...XXX...', '....X....'].map(r => r.replace(/X/g, k));
  const 爱心用 = c => 记号们(c).includes('红') ? '红' : 记号们(c)[0];
  const 步爱心 = { 说: c => `把砖块重新排成一个爱心：一共 7 排，全用${爱心用(c)}砖（原来的排列不要了）`, 改: c => 写排列(c, 爱心(爱心用(c))) };
  const 斜着排 = ks => Array.from({ length: 4 }, (x, r) => Array.from({ length: 10 }, (y, j) => ks[(r + j) % ks.length]).join(''));
  const 步全部重排 = { 说: c => `把砖块排列全部重新排过：${记号们(c).join('、')}砖斜着轮流排 4 排（原来的排列就不见了）`, 改: c => 写排列(c, 斜着排(记号们(c))) };

  // ---------- 听懂孩子的话：变成几步 ----------
  // 返回 { 步骤, 不动?, 回复 }；{ 已经是: true }；{ 问: '反问的话' }；听不懂返回 null
  function 掉什么(p) { return /变长|变宽|挡板.{0,4}(长|宽|大)/.test(p) ? '变长' : /多一个球|多个球|多一颗球|多出一个球|分身|多球/.test(p) ? '多一个球' : /命/.test(p) ? '加一条命' : ''; }
  function 分析(code, prompt) {
    const p = String(prompt || '').replace(/\s+/g, ' ');
    if (!p.trim()) return null;
    const 种们 = 读种类(code), 排们 = 读排列(code);
    if (!种们 || !排们) return { 问: '找不到「砖块种类」或「砖块排列」了，先把它们加回来吧。' };
    const 有 = 记号们(code);
    const 没有这种 = k => ({ 问: `现在没有${k}砖，只有${有.join('、')}砖。要先加一种${k}砖吗？` });
    let m;

    // 游戏已经是这样了
    if (!/不|别|没|墙|加|改成|变/.test(p) && /(往|向)(左|右)边?飞|左边.{0,8}往左|右边.{0,8}往右|碰到.{0,8}(反弹|弹回|弹开)/.test(p)) return { 已经是: true };

    // ===== 说清楚的：只改那一处 =====
    if ((m = p.match(new RegExp('(加|多|添)\\s*' + NUM + '?\\s*排')))) {
      const n = Math.max(1, Math.min(5, m[2] ? toNum(m[2]) : 1));
      const k = (p.match(new RegExp('([' + 色字 + '])色?的?砖')) || [])[1];
      if (k && !有.includes(k)) return 没有这种(k);
      if (!有.length) return { 问: '「砖块种类」是空的，先加一种砖吧。' };
      return { 步骤: [步加排(n, k)], 不动: `原来的${排们.length ? ' ' + 排们.length + ' 排' : ''}砖不动，球和挡板也不动`, 回复: `加好了，最下面多了${n === 1 ? '一' : ' ' + n + ' '}排砖。` };
    }
    if (/金字塔|三角形/.test(p)) {
      if (!有.length) return { 问: '「砖块种类」是空的，先加一种砖吧。' };
      return { 步骤: [步金字塔], 不动: '砖块种类不动，球和挡板也不动', 回复: '砖块排成金字塔了！' };
    }
    if (/爱心|心形|❤|♥/.test(p)) {
      if (!有.length) return { 问: '「砖块种类」是空的，先加一种砖吧。' };
      return { 步骤: [步爱心], 不动: '砖块种类不动，球和挡板也不动', 回复: '砖块排成一个爱心了！' };
    }
    if ((m = p.match(new RegExp('(加|多|新|添)[^，。,.!！]{0,6}?([' + 色字 + '])色?的?砖')))) {
      const k = m[2], 掉 = 掉什么(p);
      if (!掉 && /道具|掉/.test(p)) return { 问: `打碎${k}砖掉出什么？挡板变长、多一个球，还是加一条命？` };
      const 分 = (m = p.match(new RegExp('(得|加)\\s*' + NUM + '\\s*分'))) ? toNum(m[2]) : 5;
      const 几下 = (m = p.match(new RegExp('打\\s*' + NUM + '\\s*(下|次)'))) ? Math.max(1, Math.min(9, toNum(m[1]))) : 1;
      const 已有 = 有.includes(k), 已摆 = 排们.some(r => r.includes(k));
      const 步骤 = [步加种类(k, 掉, 分, 几下)];
      if (!已摆) 步骤.push(步放中间(k));
      return { 步骤, 不动: '别的砖、球和挡板都不动', 回复: `${已有 ? '改好了' : '加了' + k + '砖'}${已摆 ? '' : '，放在中间那排'}${掉 ? '，打碎掉出「' + 掉 + '」道具' : ''}。` };
    }
    if ((m = p.match(new RegExp('打\\s*' + NUM + '\\s*(下|次)')))) {
      const n = Math.max(1, Math.min(9, toNum(m[1])));
      const 说到的 = [...new Set(p.match(new RegExp('[' + 色字 + ']', 'g')) || [])];
      if (!说到的.length) {
        if (!有.length) return { 问: '「砖块种类」是空的，先加一种砖吧。' };
        return { 步骤: [步全部打几下(n)], 不动: '砖块排列、球和挡板都不动', 回复: `改好了，所有砖都要打 ${n} 下才碎。` };
      }
      const 不认识 = 说到的.find(k => !有.includes(k)); if (不认识) return 没有这种(不认识);
      const 别的 = 有.filter(k => !说到的.includes(k));
      return { 步骤: 说到的.map(k => 步打几下(k, n)), 不动: 别的.length ? `${别的.join('、')}砖不动，球和挡板也不动` : '球和挡板都不动', 回复: `改好了，${说到的.join('、')}砖要打 ${n} 下才碎。` };
    }
    if (/保护墙|底下.{0,6}墙|墙.{0,6}(挡|接)/.test(p)) {
      if (/底下有保护墙:\s*true,/.test(code)) return { 已经是: true };
      return { 步骤: [步保护墙], 不动: '砖块、球和挡板都不动', 回复: '底下加了一道保护墙，能挡住一次。' };
    }
    if (/球/.test(p) && (m = p.match(new RegExp('速度\\D{0,4}' + NUM)))) {
      const n = Math.max(1, Math.min(30, toNum(m[1])));
      return { 步骤: [步球速(n)], 不动: '挡板和砖块都不动', 回复: `球的速度改成 ${n} 了。` };
    }
    if ((m = p.match(/球.{0,6}(快|慢)|(快|慢).{0,3}的?球/))) {
      const 快 = (m[1] || m[2]) === '快', 怎样 = 快 ? (/一倍|两倍|2 ?倍|翻倍/.test(p) ? '快一倍' : '快一点') : (/一半/.test(p) ? '慢一半' : '慢一点');
      return { 步骤: [步球速(怎样)], 不动: '挡板和砖块都不动', 回复: `球变${怎样}了。` };
    }
    if (/挡板/.test(p) && (m = p.match(/(宽度|宽|长度)\D{0,4}(\d+)/))) {
      const n = Math.max(40, Math.min(900, +m[2]));
      return { 步骤: [步挡板(n)], 不动: '球和砖块都不动', 回复: `挡板宽度改成 ${n} 了。` };
    }
    if ((m = p.match(/挡板.{0,6}?(长|宽|大|短|窄|小)/))) {
      const 长 = /长|宽|大/.test(m[1]), 怎样 = 长 ? (/一倍|两倍|2 ?倍|翻倍/.test(p) ? '长一倍' : '长一点') : (/一半/.test(p) ? '短一半' : '短一点');
      return { 步骤: [步挡板(怎样)], 不动: '球和砖块都不动', 回复: `挡板变${怎样}了。` };
    }
    if ((m = p.match(new RegExp('(加|多|再)?\\s*' + NUM + '\\s*(个球|颗球|条命)')))) {
      const 原来 = 读设置(code, '有几个球', 3);
      const n = Math.max(1, Math.min(20, m[1] ? 原来 + toNum(m[2]) : toNum(m[2])));   // 「多一个球」是在原来上面加
      if (原来 === n) return { 已经是: true };
      return { 步骤: [步球数(n)], 不动: '砖块、球速和挡板都不动', 回复: `一局有 ${n} 个球了。` };
    }

    // ===== 说得模糊的：照做，但会多改你没说的地方 =====
    if (/砖.{0,6}厉害|厉害.{0,4}砖/.test(p)) {
      if (!有.length) return { 问: '「砖块种类」是空的，先加一种砖吧。' };
      return { 步骤: [步全部打几下(2), 步球速('快一倍'), 步挡板('短一点')], 回复: '改好了：砖要打 2 下，球快了一倍，挡板也短了一点。' };
    }
    if (/好玩|有趣|有意思/.test(p)) {
      return { 步骤: [步加种类('金', '多一个球', 5, 1), 步金字塔, 步球速('快一倍')], 回复: '改好了：加了金砖（碎了多一个球），排成金字塔，球快了一倍。' };
    }
    if (/难一?点|更难|变难|难些|太简单|难度/.test(p)) {
      if (!有.length) return { 问: '「砖块种类」是空的，先加一种砖吧。' };
      return { 步骤: [步挡板('短一半'), 步球数(1), 步全部打几下(3)], 回复: '改好了：挡板短了一半，只有 1 个球，砖都要打 3 下。' };
    }
    if (/道具/.test(p)) {
      return { 步骤: [步加种类('金', '变长', 5, 1), 步加种类('蓝', '多一个球', 5, 1), 步全部重排], 回复: '改好了：加了金砖和蓝砖，砖块也全部重新排了。' };
    }
    return null;
  }

  function run(code, prompt) {
    const r = 分析(code, prompt);
    if (!r) return null;
    if (r.已经是) return { code: null, reply: '已经是这样了，试试看！' };
    if (r.问) return { code: null, reply: r.问 };
    let c = code;
    for (const 步 of r.步骤) c = 步.改(c);
    return { code: c, reply: r.回复 };
  }

  function plan(code, prompt) {
    const r = 分析(code, prompt);
    if (!r) return { reply: '没太听懂，你想让游戏哪里变？', plan: null };
    if (r.已经是) return { reply: '这个游戏已经是这样了，不用改。', plan: [] };
    if (r.问) return { reply: r.问, plan: null };
    let c = code; const 说 = [];
    for (const 步 of r.步骤) { 说.push(typeof 步.说 === 'function' ? 步.说(c) : 步.说); c = 步.改(c); }
    if (r.不动) 说.push(r.不动);
    return { reply: '我打算这样改：', plan: 说 };
  }

  return {
    key: 'breakout',
    is: code => String(code || '').includes('const 砖块排列 = ['),
    run, plan,
    CAN: '红砖要打 3 下才碎、加一种金砖（碎了掉出变长／多一个球／加一条命）、底下加保护墙、球快一点／慢一点、挡板变长／变短、有 5 个球、再加一排砖、排成金字塔／爱心；说得模糊也行（让砖块更厉害、更好玩、难一点、加点道具），但先看计划里有没有你不想要的'
  };
});
// ----- mock-s2/17-boss.js -----
// 第 17 课「怪兽怎么会换招？」：大怪兽。孩子用"状态表"下指令：有几种状态、什么时候换、每种做什么。
// 认识：① 贴来的状态表（整张换掉）② 只说"让怪兽会生气"（什么时候是猜的）③ 一句话说清一个状态 ④ 改设置 ⑤ 删掉一个状态 ⑥ 问"怎么不换"
// 读"什么时候""做什么"的规则和游戏里的 读什么时候 / 读做什么 一样，所以精灵说"不认识"的，游戏里也会标"?"。
S2PARTS.push(function (H) {
  const 记号 = 'const 状态们 = [';
  const 表块 = /const 状态们 = \[([\s\S]*?)\n\];/;

  // ---------- 和游戏里一样的读法 ----------
  const 中文数字 = { 零: 0, 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  function 读数(字) {
    if (/^\d/.test(字)) return parseFloat(字);
    if (字.includes('十')) { const 段 = 字.split('十'); return (段[0] ? 中文数字[段[0]] || 0 : 1) * 10 + (段[1] ? 中文数字[段[1]] || 0 : 0); }
    return 中文数字[字] || 0;
  }
  const 数字 = '(\\d+(?:\\.\\d+)?|[零一两二三四五六七八九十]+)';
  function 读什么时候(字) {
    const 文 = String(字 == null ? '' : 字).replace(/\s/g, '');
    if (!文) return null;
    if (/一开始|开始|开局/.test(文)) return { 类型: '一开始' };
    if (/一半|半血/.test(文)) return { 类型: '血量剩一半' };
    if (/打中|被打|挨打|砸中|受伤/.test(文)) return { 类型: '被打中' };
    const m = 文.match(new RegExp(数字 + '秒'));
    if (m) { const 秒 = 读数(m[1]); return 秒 > 0 ? { 类型: '过了', 秒 } : null; }
    if (/走远|离开|跑远|远离|走开|离远/.test(文)) return { 类型: '比特走远' };
    if (/靠近|走近|接近|过来|很近/.test(文)) return { 类型: '比特靠近' };
    return null;
  }
  const 做法们 = [
    ['喷火', /喷火|吐火|火球|放火/],
    ['睡觉', /睡/],
    ['不动', /不动|站着|站住|停|不追/],
    ['逃跑', /逃|躲|跑开|害怕/],
    ['跑得飞快', /飞快|冲|快速|狂奔|很快|快跑|加速/],
    ['追比特', /追/],
    ['慢慢走', /慢慢|散步|巡逻|走来走去|随便走|闲逛|溜达/],
  ];
  function 读做什么(字) {
    const 文 = String(字 == null ? '' : 字).replace(/\s/g, '');
    for (const [做法, 认] of 做法们) if (认.test(文)) return 做法;
    return null;
  }

  // ---------- 状态名字、样子 ----------
  const 名字们 = {   // 名字 → [样子, 没说做什么时默认做什么]
    生气: ['👹', '追比特'], 睡觉: ['😴', '睡觉'], 喷火: ['🐲', '喷火'], 逃跑: ['😱', '逃跑'], 害怕: ['😨', '逃跑'],
    累了: ['🥵', '不动'], 发疯: ['👺', '跑得飞快'], 狂暴: ['👺', '跑得飞快'], 暴怒: ['👺', '跑得飞快'], 冲刺: ['👺', '跑得飞快'],
    发呆: ['😶', '不动'], 休息: ['😌', '不动'], 巡逻: ['👹', '慢慢走'], 散步: ['👹', '慢慢走'], 晕了: ['😵‍💫', '不动'],
  };
  const 别名 = { 发火: '生气', 愤怒: '生气', 生起气: '生气', 睡着: '睡觉', 打瞌睡: '睡觉', 逃走: '逃跑', 吐火: '喷火', 发狂: '发疯', 晕倒: '晕了' };
  const 做法的名字 = { 追比特: '生气', 跑得飞快: '狂暴', 逃跑: '逃跑', 喷火: '喷火', 睡觉: '睡觉', 不动: '发呆', 慢慢走: '巡逻' };
  const 做法的样子 = { 追比特: '👹', 跑得飞快: '👺', 逃跑: '😱', 喷火: '🐲', 睡觉: '😴', 不动: '😶', 慢慢走: '👹' };
  const 做法的说法 = { 追比特: '追你', 跑得飞快: '飞快地冲向你', 逃跑: '逃跑', 喷火: '朝你喷火', 睡觉: '睡觉', 不动: '站着不动', 慢慢走: '慢慢走' };
  let 是表情;
  try { 是表情 = new RegExp('\\p{Extended_Pictographic}', 'u'); } catch (e) { 是表情 = /[☀-➿\uD83C-\uDBFF]/; }
  function 找名字(文) {
    const 全部 = Object.keys(名字们).concat(Object.keys(别名)).sort((a, b) => b.length - a.length);
    const k = 全部.find(n => 文.includes(n));
    return k ? (别名[k] || k) : null;
  }
  const 时候说法 = 时 => 时.类型 === '过了' ? `过 ${时.秒} 秒就` : 时.类型 === '一开始' ? '一开始就' : 时.类型 === '被打中' ? '被雪球打中就' : 时.类型 + '就';
  const 时候短 = 时 => 时.类型 === '过了' ? `过${时.秒}秒` : 时.类型;
  const 自己说清了 = ['巡逻', '散步', '睡觉', '逃跑', '发呆', '休息'];   // 名字本身就是做法，不用再说一遍
  function 做的说法(名字, 做) {
    const 说 = 做法的说法[做] || 做;
    if (说.includes(名字) || (自己说清了.includes(名字) && 名字们[名字][1] === 做)) return 说.includes(名字) ? 说 : 名字;
    return 名字 + (/了$|呆$/.test(名字) ? '，' : '') + 说;
  }

  // ---------- 读表、写表 ----------
  const 引 = s => JSON.stringify(String(s));
  const 行文字 = r => `{ 名字: ${引(r.名字)}, 样子: ${引(r.样子)}, 什么时候: ${引(r.什么时候)}, 做什么: ${引(r.做什么)} },`;
  function 读表(code) {
    const m = code.match(表块); if (!m) return null;
    return m[1].split('\n').filter(l => /^\s*\{/.test(l)).map(l => {
      const 取 = k => { const x = l.match(new RegExp(k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"')); if (!x) return ''; try { return JSON.parse('"' + x[1] + '"'); } catch (e) { return x[1]; } };
      return { 名字: 取('名字'), 样子: 取('样子'), 什么时候: 取('什么时候'), 做什么: 取('做什么') };
    });
  }
  function 换整张表(code, 行们) {
    const 身体 = 行们.map(r => '\n  ' + 行文字(r)).join('');
    return code.replace(表块, () => 'const 状态们 = [' + 身体 + '\n];');
  }
  // 名字一样的那一行换掉；没有就加在最后（放最前面：一开始的状态）
  function 放一行(code, 行, 放最前面) {
    const m = code.match(表块);
    const 行们 = m[1].split('\n');
    const i = 行们.findIndex(l => /^\s*\{/.test(l) && (l.match(/名字:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] === 行.名字);
    const 新 = '  ' + 行文字(行);
    if (i >= 0) 行们[i] = 新;
    else if (放最前面) 行们.splice(1, 0, 新);
    else 行们.push(新);
    return { code: code.replace(表块, () => 'const 状态们 = [' + 行们.join('\n') + '\n];'), 换掉了: i >= 0 };
  }
  function 删一行(code, 名字) {
    const m = code.match(表块);
    const 行们 = m[1].split('\n').filter(l => !(/^\s*\{/.test(l) && (l.match(/名字:\s*"((?:[^"\\]|\\.)*)"/) || [])[1] === 名字));
    return code.replace(表块, () => 'const 状态们 = [' + 行们.join('\n') + '\n];');
  }

  // 看看表能不能用：哪一行是一开始、哪些行能换进去、哪些写法不认识
  function 看表(行们) {
    const 时们 = 行们.map(r => 读什么时候(r.什么时候)), 做们 = 行们.map(r => 读做什么(r.做什么));
    let 起点 = 时们.findIndex(t => t && t.类型 === '一开始'); if (起点 < 0) 起点 = 0;
    const 能进 = 行们.map((r, i) => i !== 起点 && !!时们[i] && 时们[i].类型 !== '一开始');
    return { 时们, 做们, 起点, 能进, 有能进的: 能进.some(Boolean) };
  }
  function 提醒(行们, 看) {
    const 话 = [];
    const 不会做 = 行们.filter((r, i) => !看.做们[i]);
    if (不会做.length) {
      const 有字 = 不会做.filter(r => r.做什么).map(r => `「${r.做什么}」`);
      话.push(有字.length ? `${[...new Set(有字)].join('')}我不会，先当成不动。` : `「${不会做[0].名字}」没写做什么，先当成不动。`);
    }
    const 看不懂 = 行们.filter((r, i) => i !== 看.起点 && !看.时们[i]);
    if (看不懂.length) {
      const 有字 = 看不懂.filter(r => r.什么时候).map(r => `「${r.什么时候}」`);
      话.push(有字.length ? `${[...new Set(有字)].join('')}我看不懂，那行换不过去。` : `「${看不懂[0].名字}」没写什么时候，换不过去。`);
    }
    if (!看.有能进的 && !看不懂.length) 话.push(行们.length === 1 ? '只有一种状态，怪兽不会换。再加一行吧。' : `除了「${行们[看.起点].名字}」，别的行都换不过去，写清什么时候换。`);
    else {
      const 多余 = 行们.filter((r, i) => i !== 看.起点 && 看.时们[i] && 看.时们[i].类型 === '一开始');
      if (多余.length) 话.push(`「${多余[0].名字}」也写一开始，只有第一个算。`);
    }
    return 话.slice(0, 2).join('');
  }

  // ---------- ① 贴来的状态表 ----------
  function 读贴的表(p) {
    const 线们 = p.split(/\r?\n/).map(s => s.trim()).filter(s => s.includes('|'));
    if (线们.length < 2) return null;
    const 格 = l => { let s = l; if (s.startsWith('|')) s = s.slice(1); if (s.endsWith('|')) s = s.slice(0, -1); return s.split('|').map(c => c.trim()); };
    const 头 = 线们.findIndex(l => /状态|名字/.test(l));
    if (头 < 0) return { 错: '表头要有「状态」或「名字」这一列，我才看得懂。' };
    const 列 = { 名字: -1, 样子: -1, 什么时候: -1, 做什么: -1 };
    格(线们[头]).forEach((h, i) => {
      if (列.做什么 < 0 && /做什么|做啥|干什么|干啥|动作/.test(h)) 列.做什么 = i;
      else if (列.什么时候 < 0 && /什么时候|时候|何时|条件/.test(h)) 列.什么时候 = i;
      else if (列.样子 < 0 && /样子|长相|图案|表情|长什么样|外形/.test(h)) 列.样子 = i;
      else if (列.名字 < 0 && /名字|状态|叫什么/.test(h)) 列.名字 = i;
    });
    if (列.名字 < 0) 列.名字 = [0, 1, 2, 3].find(i => !Object.values(列).includes(i));
    const 行们 = [];
    for (const l of 线们.slice(头 + 1)) {
      const c = 格(l);
      if (c.every(x => /^:?-*:?$/.test(x))) continue;   // 分隔行、空行
      const 取 = k => 列[k] >= 0 ? (c[列[k]] || '').trim() : '';
      const r = { 名字: 取('名字') || '状态' + (行们.length + 1), 样子: 取('样子'), 什么时候: 取('什么时候'), 做什么: 取('做什么') };
      if (!是表情.test(r.样子)) {
        const 做 = 读做什么(r.做什么), 名 = 名字们[r.名字] || 名字们[别名[r.名字]];
        r.样子 = 名 ? 名[0] : 做 ? 做法的样子[做] : '👹';
      }
      行们.push(r);
    }
    return { 行们 };
  }

  // ---------- ③ 一句话里的"什么时候" ----------
  const 时候们 = [
    ['一开始', /一开始|刚开始|开局|开始的时候/],
    ['血量剩一半', /一半|半血/],
    ['被打中', /被打中|打中|被打|挨打|砸中|被雪球|受伤/],
    ['比特走远', /走远|离开|跑远|远离|离.{0,5}远/],
    ['比特靠近', /靠近|走近|接近|过来|离.{0,5}近|很近/],
    ['过了', new RegExp('(?:过了?|等了?)?' + 数字 + '秒钟?(?:以后|之后|后)?')],
  ];
  function 找时候(t) {
    let 最早 = null;
    for (const [类型, re] of 时候们) {
      const m = t.match(re); if (!m) continue;
      if (类型 === '过了' && !(读数(m[1]) > 0)) continue;
      if (!最早 || m.index < 最早.m.index) 最早 = { 类型, m };
    }
    if (!最早) return null;
    const 时 = 最早.类型 === '过了' ? { 类型: '过了', 秒: 读数(最早.m[1]) } : { 类型: 最早.类型 };
    const 剩下 = t.slice(0, 最早.m.index) + ' ' + t.slice(最早.m.index + 最早.m[0].length);
    return { 时, 写法: 时.类型 === '过了' ? `过了${时.秒}秒` : 时.类型, 剩下 };
  }
  const 去掉不要的 = s => s.replace(/(不要|别|不再)再?(追|喷火|喷|睡觉|睡|逃跑|逃|跑|冲|巡逻)了?/g, ' ');

  // ---------- ④ 设置 ----------
  const 数2 = '(\\d+|[零一两二三四五六七八九十]+)';
  const 改成 = '(?:改成|变成|设成|调成|调到|改为|设为|换成|是|有|=|:|：)?';
  const 设置们 = [
    { 键: '怪兽血量', 最小: 1, 最大: 99, 认: [new RegExp('血量?' + 改成 + 数2 + '(?!秒)'), new RegExp(数2 + '(?:滴|点|格)?血')], 说: v => `怪兽血量改成 ${v} 了。` },
    { 键: '星星有几颗', 最小: 0, 最大: 20, 认: [new RegExp('(?:星星?|⭐)' + 改成 + 数2), new RegExp(数2 + '(?:颗|个)?(?:星星?|⭐)')], 说: v => `现在有 ${v} 颗星星。` },
    { 键: '比特有几颗心', 最小: 1, 最大: 10, 认: [new RegExp(数2 + '(?:颗|条|个)?(?:心|命|生命|❤)'), new RegExp('(?:心|命|生命)' + 改成 + 数2)], 说: v => `比特有 ${v} 颗心了。` },
    { 键: '靠近是多近', 最小: 20, 最大: 900, 认: [new RegExp('(?:靠近是多近|多近算靠近|靠近的距离|靠近距离)' + 改成 + 数2), new RegExp(数2 + '(?:像素|格)?(?:以内)?(?:就算|算|叫)靠近')], 说: v => `离怪兽 ${v} 以内算靠近。` },
  ];
  function 改设置(code, t) {
    let c = code; const 说 = [];
    for (const s of 设置们) {
      let m = null;
      for (const re of s.认) if ((m = t.match(re))) break;
      if (!m) continue;
      const v = Math.min(s.最大, Math.max(s.最小, Math.round(读数(m[1]))));
      c = H.setSetting(c, s.键, String(v)); 说.push(s.说(v));
    }
    if (/(不能|不可以|不让|不准|不许|不要|别|没有|去掉|关掉|取消)(比特)?再?扔?雪球/.test(t)) { c = H.setSetting(c, '可以扔雪球', 'false'); 说.push('不能扔雪球了，只能收星星赢。'); }
    else if (/(能|可以|会|要)扔雪球|加上?雪球|打开雪球|有雪球/.test(t)) { c = H.setSetting(c, '可以扔雪球', 'true'); 说.push('可以扔雪球了。'); }
    return 说.length ? { code: c, reply: 说.join('') } : null;
  }

  // ---------- 问"怎么不换" ----------
  function 讲表(行们) {
    if (!行们.length) return '状态表是空的，怪兽只会站着。加一行试试。';
    const 看 = 看表(行们);
    if (!看.有能进的) return `只有「${行们[看.起点].名字}」用得上，怪兽换不了。再加一行，写清什么时候换。`;
    const 怎么换 = 行们.map((r, i) => 看.能进[i] ? `${时候短(看.时们[i])}→${r.名字}` : null).filter(Boolean).slice(0, 3);
    return `表能用：${怎么换.join('，')}。试试看！`;
  }

  function run(code, prompt, mode, error) {
    if (!code.includes(记号)) return null;
    const p = String(prompt || '').replace(/[０-９]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFEE0)).replace(/｜/g, '|');
    const t = p.replace(/\s+/g, '');
    const 现在的表 = 读表(code) || [];

    // ① 状态表：整张换掉
    const 贴的 = 读贴的表(p);
    if (贴的) {
      if (贴的.错) return { code: null, reply: 贴的.错 };
      if (!贴的.行们.length) return { code: null, reply: '表里还没填状态，填好一行再发我。' };
      const 行们 = 贴的.行们;
      return { code: 换整张表(code, 行们), reply: `照表改好了：怪兽有 ${行们.length} 种状态。` + 提醒(行们, 看表(行们)) };
    }

    const 时 = 找时候(t);

    // ⑤ 删掉一个状态
    if (!时 && /(删掉|去掉|删除|拿掉|不要|取消)/.test(t)) {
      const 名 = 现在的表.map(r => r.名字).filter(Boolean).sort((a, b) => b.length - a.length).find(n => t.includes(n));
      if (名) {
        const c = 删一行(code, 名), 剩 = 读表(c);
        return { code: c, reply: `删掉了「${名}」。` + (剩.length ? 提醒(剩, 看表(剩)) : '表空了，怪兽只会站着。') };
      }
    }

    // ③ 一句话说清一个状态：什么时候 + 做什么（或名字）
    if (时) {
      const 剩下 = 去掉不要的(时.剩下);
      const 做 = 读做什么(剩下), 名0 = 找名字(剩下);
      if (做 || 名0) {
        const 名 = 名0 || 做法的名字[做], 真做 = 做 || 名字们[名][1];
        const 旧 = 现在的表.find(r => r.名字 === 名);
        const 行 = { 名字: 名, 样子: 旧 && 旧.样子 ? 旧.样子 : (名字们[名] ? 名字们[名][0] : 做法的样子[真做]), 什么时候: 时.写法, 做什么: 真做 };
        const 一开始 = 时.时.类型 === '一开始';
        const 放 = 放一行(code, 行, 一开始 && !旧);
        let 话 = `${放.换掉了 ? '改好了' : '加了'}「${名}」：${时候说法(时.时)}${做的说法(名, 真做)}。`;
        const 表 = 读表(放.code), 看 = 看表(表);
        if (一开始 && 表[看.起点].名字 !== 名) 话 += `可「${表[看.起点].名字}」排在前面，只有第一个算。`;
        else if (一开始) { const 原来 = 表.find((r, i) => i !== 看.起点 && 看.时们[i] && 看.时们[i].类型 === '一开始'); if (原来) 话 += `「${原来.名字}」就用不上了，要的话说说什么时候${原来.名字}。`; }
        if ((时.时.类型 === '被打中' || 时.时.类型 === '血量剩一半') && /\n\s*可以扔雪球:\s*false/.test(code)) 话 += '可现在不能扔雪球，打不中它。';
        return { code: 放.code, reply: 话 };
      }
    }

    // ④ 设置
    const 设 = 改设置(code, t);
    if (设) return 设;

    if (时) return { code: null, reply: `${时.写法}的时候，怪兽做什么？追你、逃跑、喷火、睡觉……说清楚我再加。` };

    // 问：怎么不换？
    if (/为什么|怎么不|怎么没|不换|没换|不变|没变|检查|对不对/.test(t)) return { code: null, reply: 讲表(现在的表) };

    // ② 只说一句话，不说什么时候：时候是猜的
    if (!时 && !/太|一点|多一些|少一些|别|不要|不会|不能/.test(t) && (/怪兽|它|boss/i.test(t) || !/比特/.test(t))) {
      const 剩下 = 去掉不要的(t);
      const 做 = 读做什么(剩下), 名0 = 找名字(剩下);
      if ((做 || 名0) && /怪兽|它|boss|让|会|加/i.test(t)) {
        const 名 = 名0 || 做法的名字[做], 真做 = 做 || 名字们[名][1];
        if (现在的表.some(r => r.名字 === 名)) return { code: null, reply: `表里已经有「${名}」了。想换什么时候${名}，就说「比特靠近的时候${名}」。` };
        const 行 = { 名字: 名, 样子: 名字们[名] ? 名字们[名][0] : 做法的样子[真做], 什么时候: '过了5秒', 做什么: 真做 };
        return { code: 放一行(code, 行, false).code, reply: `加了「${名}」：过 5 秒就${做的说法(名, 真做)}。什么时候${名}，是我猜的。` };
      }
    }

    // 「把 xx 改成 3」
    const g = t.match(/把?([一-龥]{1,8}?)(?:改成|变成|调成|设成|设为|改为|调到)(-?\d+)/);
    if (g && H.hasSetting(code, g[1])) return { code: H.setSetting(code, g[1], g[2]), reply: `「${g[1]}」改成 ${g[2]} 了。` };
    return null;
  }

  return {
    key: 'boss',
    is: code => code.includes(记号),
    run,
    CAN: '贴状态表（照表改怪兽）、让怪兽会生气／睡觉、一句话加一个状态（比特靠近的时候怪兽生气追比特、血量剩一半的时候喷火、被打中以后逃跑）、删掉某个状态、改怪兽血量／星星／心、不能扔雪球',
  };
});
// ----- mock-s2/18-flow.js -----
// ---------- 第二季第 18 课《游戏只有一个画面吗？》：接星星 ----------
// 孩子画流程图（从哪个画面、按什么、到哪个画面），精灵照着改「流程」表；没说清楚的地方就会走不通。
S2PARTS.push(function (H) {
  const SCREENS = ['开始画面', '游戏', '结束画面', '商店'];
  const FLAG = { 开始画面: '有开始画面', 结束画面: '有结束画面', 商店: '有商店' };
  const EFFECTS = ['篮子变大', '星星掉得慢', '星星自己飞过来', '挡一次石头'];
  const CAN = '照流程图做画面（从哪、怎么过去、到哪）、加一个开始画面／结束画面／商店、加一个再玩一次的按钮、商店里加一个回去的按钮、商店里卖东西（比如护盾，5 个金币）、一局几秒';
  const STUCK = /出不来|出不去|回不去|回不来|卡住|卡在|走不通|没有按钮|没按钮|进不去/;

  // ---- 读写「流程」表 ----
  const FLOW_RE = /(const 流程 = \[)([\s\S]*?)(\n\];)/;
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const clean = s => String(s == null ? '' : s).replace(/["\\\n\r`]/g, '').trim();
  const rowLine = r => `{ 从: "${r.从}", 按: "${r.按}", 到: "${r.到}" },`;
  const withBlock = (code, f) => code.replace(FLOW_RE, (m, a, b, c) => a + f(b) + c);
  function readFlow(code) {
    const m = code.match(FLOW_RE), rows = [];
    if (!m) return rows;
    for (const line of m[2].split('\n')) {
      if (/^\s*\/\//.test(line)) continue;
      const g = k => { const mm = line.match(new RegExp(k + ':\\s*"([^"]*)"')); return mm ? mm[1].trim() : ''; };
      const r = { 从: g('从'), 按: g('按'), 到: g('到') };
      if (SCREENS.includes(r.从) && SCREENS.includes(r.到) && r.按) rows.push(r);
    }
    return rows;
  }
  const addRow = (code, r) => readFlow(code).some(x => x.从 === r.从 && x.按 === r.按 && x.到 === r.到) ? code : H.addItem(code, '流程', rowLine(r));
  const hasButton = (code, from, to) => readFlow(code).some(x => x.从 === from && x.按 !== '时间到' && (!to || x.到 === to));
  const timeUpOf = code => readFlow(code).find(x => x.从 === '游戏' && x.按 === '时间到');
  // 「游戏 → 时间到」只留一行，去 to
  function setTimeUp(code, to) {
    const now = timeUpOf(code);
    if (now && now.到 === to) return code;
    if (!now) return H.addItem(code, '流程', rowLine({ 从: '游戏', 按: '时间到', 到: to }));
    return withBlock(code, b => b.replace(/\{\s*从:\s*"游戏",\s*按:\s*"时间到",\s*到:\s*"[^"]*"\s*\},/, rowLine({ 从: '游戏', 按: '时间到', 到: to })));
  }
  const isOn = (code, s) => s === '游戏' || new RegExp('\\n\\s*' + FLAG[s] + ':\\s*true\\s*,').test(code);
  const turnOn = (code, s) => s === '游戏' ? code : H.setSetting(code, FLAG[s], 'true');
  // 没有结束画面：打开它，再让时间到了去结束画面
  function ensureEnd(code) {
    let c = code;
    if (!isOn(c, '结束画面')) c = turnOn(c, '结束画面');
    if (!timeUpOf(c)) c = setTimeUp(c, '结束画面');
    return c;
  }

  // ---- 一句话加画面、加按钮 ----
  function addStart(code) {
    let c = turnOn(code, '开始画面');
    if (!hasButton(c, '开始画面', '游戏')) c = addRow(c, { 从: '开始画面', 按: '开始', 到: '游戏' });
    if (c === code) return { code: null, reply: '已经有开始画面了，按上面的按钮进游戏。' };
    return { code: c, reply: '加好了开始画面，按「开始」进游戏。' };
  }
  function addEnd(code) {   // 只加「时间到 → 结束画面」，不加「再玩一次」：结束画面上没按钮，让孩子自己发现走不通
    const c = setTimeUp(turnOn(code, '结束画面'), '结束画面');
    if (c === code) return { code: null, reply: '已经有结束画面了，时间到就会过去。' };
    return { code: c, reply: '加好了结束画面，时间到就显示分数。' };
  }
  function addShop(code) {   // 不加从商店回去的按钮
    let c = ensureEnd(turnOn(code, '商店'));
    if (!hasButton(c, '结束画面', '商店')) c = addRow(c, { 从: '结束画面', 按: '商店', 到: '商店' });
    if (c === code) return { code: null, reply: '已经有商店了，结束画面上点「商店」进去。' };
    return { code: c, reply: '加了商店：结束画面上有「商店」按钮，钱够才能买。' };
  }
  function addReplay(code) {
    const hadEnd = isOn(code, '结束画面');
    let c = ensureEnd(code);
    if (!hasButton(c, '结束画面', '游戏')) c = addRow(c, { 从: '结束画面', 按: '再玩一次', 到: '游戏' });
    if (c === code) return { code: null, reply: '结束画面上已经有回到游戏的按钮了。' };
    return { code: c, reply: hadEnd ? '结束画面上加了「再玩一次」，点了重新玩一局。' : '加了结束画面和「再玩一次」：时间到看分数，点了重新玩。' };
  }
  function addBack(code) {
    if (!isOn(code, '商店')) return { code: null, reply: '还没有商店呢，先说「加一个商店」。' };
    if (hasButton(code, '商店')) return { code: null, reply: '商店里已经有出去的按钮了。' };
    const to = isOn(code, '结束画面') ? '结束画面' : isOn(code, '开始画面') ? '开始画面' : '游戏';
    return { code: addRow(code, { 从: '商店', 按: '回去', 到: to }), reply: `商店里加了「回去」按钮，点了回到${to}。` };
  }

  // ---- 流程图 ----
  function screenOf(s) {
    s = String(s || '').replace(/[「」“”"'《》『』\s]/g, '');
    if (/^(开始画面|开始页面?|开始界面|开始)$/.test(s)) return '开始画面';
    if (/^(游戏|游戏画面|游戏中|玩游戏)$/.test(s)) return '游戏';
    if (/^(结束画面|结束页面?|结束界面|结束)$/.test(s)) return '结束画面';
    if (/^(商店|商店画面|商城|小卖部)$/.test(s)) return '商店';
    return null;
  }
  function howOf(s) {
    s = String(s || '').trim();
    if (/时间到/.test(s)) return '时间到';
    const q = s.match(/[「“"『《']([^」”"』》']+)[」”"』》']/);
    let t = q ? q[1] : s.replace(/^(点一下|按一下|点击|按下|点|按)\s*/, '').replace(/\s*(按钮|键)$/, '');
    t = clean(t).replace(/[<>]/g, '').slice(0, 8);
    return t || null;
  }
  function parseChart(p) {
    const lines = p.split(/\r?\n/).filter(l => (l.match(/[|｜]/g) || []).length >= 2);
    if (!lines.length) return null;
    const rows = [], bad = [];
    for (const l of lines) {
      const cells = l.trim().replace(/^[|｜]/, '').replace(/[|｜]$/, '').split(/[|｜]/).map(x => x.trim());
      if (cells.every(x => /^[-:：\s]*$/.test(x))) continue;                 // 表格的分隔线
      if (!screenOf(cells[0]) && /从/.test(cells[0])) continue;              // 表头
      const r = { 从: screenOf(cells[0]), 按: howOf(cells[1]), 到: screenOf(cells[2]) };
      if (cells.length < 3 || !r.从 || !r.按 || !r.到) { bad.push(l.trim()); continue; }
      if (!rows.some(x => x.从 === r.从 && x.按 === r.按 && x.到 === r.到)) rows.push(r);
    }
    return { rows: rows.slice(0, 12), bad };
  }
  // 走不通检查：从开头的画面出发能不能走到每个画面；哪个画面出不去；时间到了去哪
  const TIP = {
    开始画面: '开始画面没有按钮，出不去，要不要加一个「开始」？',
    结束画面: '结束画面没有按钮，出不去，要不要加一个「再玩一次」？',
    商店: '商店进去了出不来，要不要加一个回去的按钮？',
    游戏: '游戏时间到了不知道去哪，要不要加一行「时间到」？'
  };
  function problems(rows, open) {
    const out = [];
    const first = open.has('开始画面') ? '开始画面' : '游戏';
    const ways = rows.filter(r => r.按 !== '时间到' || r.从 === '游戏');
    const seen = new Set([first]), todo = [first];
    while (todo.length) { const s = todo.shift(); for (const r of ways) if (r.从 === s && open.has(r.到) && !seen.has(r.到)) { seen.add(r.到); todo.push(r.到); } }
    for (const s of SCREENS) {
      if (!open.has(s)) continue;
      if (s === '游戏' ? !rows.some(r => r.从 === '游戏' && r.按 === '时间到') : !rows.some(r => r.从 === s && r.按 !== '时间到')) out.push(TIP[s]);
    }
    for (const s of SCREENS) if (open.has(s) && !seen.has(s)) out.push(`${s}没有路能走到，要不要从别的画面加个按钮过去？`);
    return out;
  }
  const openOf = rows => { const o = new Set(['游戏']); rows.forEach(r => { o.add(r.从); o.add(r.到); }); return o; };
  function doChart(code, p) {
    const ch = parseChart(p);
    if (!ch) return null;
    if (!ch.rows.length) return { code: null, reply: '流程图我没看懂。每行要写：从哪个画面、怎么过去、到哪个画面。' };
    let c = withBlock(code, () => ch.rows.map(r => '\n  ' + rowLine(r)).join(''));
    const open = openOf(ch.rows);
    for (const s of ['开始画面', '结束画面', '商店']) c = H.setSetting(c, FLAG[s], open.has(s) ? 'true' : 'false');
    const pr = problems(ch.rows, open);
    let reply = `做好了：${SCREENS.filter(s => open.has(s)).join('、')}。`;
    reply += pr.length ? `不过${pr[0]}${pr.length > 1 ? `还有 ${pr.length - 1} 处走不通。` : ''}` : '每个画面都走得通。';
    if (ch.bad.length) reply += `有 ${ch.bad.length} 行没看懂，跳过了。`;
    return { code: c, reply, problems: pr };
  }

  // ---- 商店卖东西 ----
  const KNOWN = { 护盾: ['🛡️', '挡一次石头'], 盾牌: ['🛡️', '挡一次石头'], 大篮子: ['🧺', '篮子变大'], 慢动作: ['🐢', '星星掉得慢'], 乌龟: ['🐢', '星星掉得慢'], 磁铁: ['🧲', '星星自己飞过来'], 吸铁石: ['🧲', '星星自己飞过来'] };
  const ICONS = { 火箭: '🚀', 时钟: '⏰', 闹钟: '⏰', 翅膀: '🪽', 帽子: '🎩', 糖果: '🍬', 宝石: '💎', 钥匙: '🔑', 魔法棒: '🪄', 药水: '🧪', 雨伞: '☂️', 伞: '☂️' };
  const SAY_EFFECT = { 挡一次石头: '能挡一次石头', 篮子变大: '买了篮子变大', 星星掉得慢: '买了星星掉得慢', 星星自己飞过来: '买了星星自己飞过来' };
  function cnNum(s) {
    if (/^\d+$/.test(s)) return +s;
    const d = { 零: 0, 一: 1, 两: 2, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    let m = s.match(/^([一两二三四五六七八九])?十([一二三四五六七八九])?$/);
    if (m) return (m[1] ? d[m[1]] : 1) * 10 + (m[2] ? d[m[2]] : 0);
    if ((m = s.match(/^([一两二三四五六七八九])百$/))) return d[m[1]] * 100;
    return s.length === 1 && d[s] != null ? d[s] : NaN;
  }
  const CN = '(\\d+|[零一两二三四五六七八九十百]+)';
  function effectOf(s) {
    if (/挡|护盾|盾|保护|不扣分/.test(s)) return '挡一次石头';
    if (/篮子.{0,3}(大|宽)|大篮子|变大/.test(s)) return '篮子变大';
    if (/慢/.test(s)) return '星星掉得慢';
    if (/飞过来|吸|磁/.test(s)) return '星星自己飞过来';
    return null;
  }
  const SHOP_RE = /(const 商品们 = \[)([\s\S]*?)(\n\];)/;
  function doProduct(code, p) {
    const known = Object.keys(KNOWN).sort((a, b) => b.length - a.length).find(k => p.includes(k));
    if (!/卖|上架|商品/.test(p) && !(known && /商店|金币|买/.test(p))) return null;
    let name = known;
    if (!name) {
      const m = p.match(/(?:卖|上架)(?:一个|一种|一件|一把|一块|一瓶|一双|个|种|件|把|块|瓶)?\s*([^\s，,。、：:；;！!？?\d]+)/);
      name = m ? m[1].replace(/(要|价钱|价格|只要|买了|花|值).*$/, '').replace(/[零一两二三四五六七八九十百]+\s*(个|枚|块).*$/, '').replace(/的$/, '') : '';
      name = clean(name).slice(0, 6);
    }
    if (!name) return { code: null, reply: '卖什么呀？说清楚名字、几个金币、买了会怎样。' };
    const effect = effectOf(p.split(name).join('')) || (KNOWN[name] && KNOWN[name][1]);
    if (!effect) return { code: null, reply: `${name}买了以后会怎样？可以选：${EFFECTS.join('、')}。` };
    const block = (code.match(SHOP_RE) || [])[2] || '';
    const oldLine = block.split('\n').find(l => new RegExp('名字:\\s*"' + esc(name) + '"').test(l));
    const old = k => { const mm = oldLine && oldLine.match(new RegExp(k + ':\\s*("[^"]*"|[^,}]+)')); return mm ? mm[1].trim().replace(/^"|"$/g, '') : null; };
    const pm = p.match(new RegExp(CN + '\\s*(?:个|枚)?\\s*(?:金币|币|块|元)')) || p.match(new RegExp('(?:价钱|价格|要|花)\\s*(?:是|为)?\\s*' + CN));
    let price = pm ? cnNum(pm[1]) : NaN;
    const oldPrice = old('价钱');
    if (!(price >= 0)) price = oldPrice != null && +oldPrice >= 0 ? +oldPrice : 5;
    price = Math.min(999, Math.round(price));
    const icon = old('图案') || (KNOWN[name] && KNOWN[name][0]) || ICONS[name] || '🎁';
    const line = `{ 名字: "${name}", 图案: "${icon}", 价钱: ${price}, 效果: "${effect}" },`;
    let c = oldLine ? code.replace(SHOP_RE, (m, a, b, z) => a + b.replace(oldLine, '  ' + line) + z) : H.addItem(code, '商品们', line);
    if (c === code) return { code: null, reply: `商店里已经有${name}了，${price} 个金币。` };
    if (!isOn(c, '商店') && /(加|做|开|要)(一)?(个|家)?商店/.test(p)) { const s = addShop(c); return { code: s.code || c, reply: s.reply + `里面卖${name}${icon}，${price} 个金币。` }; }
    const said = oldLine ? `${name}${icon}改好了：${price} 个金币，${SAY_EFFECT[effect]}。` : `商店里上架了${name}${icon}，${price} 个金币，${SAY_EFFECT[effect]}。`;
    return { code: c, reply: said + (isOn(c, '商店') ? '' : '还没有商店画面，记得加一个。') };
  }

  // ---- 一局几秒；「把 xx 改成 3」 ----
  function doTime(code, p) {
    const m = p.match(new RegExp(CN + '\\s*(秒|分钟)'));
    if (!m || !/局|时间|倒计时|玩/.test(p)) return null;
    let n = cnNum(m[1]) * (m[2] === '分钟' ? 60 : 1);
    if (!(n > 0)) return null;
    n = Math.max(5, Math.min(600, Math.round(n)));
    return { code: H.setSetting(code, '一局几秒', String(n)), reply: `一局改成 ${n} 秒了。` };
  }
  function doGeneric(code, p) {
    const m = p.match(/把?\s*([一-龥A-Za-z]{1,8}?)\s*(?:改成|变成|调成|设成|设为|改为|调到)\s*(-?\d+(?:\.\d+)?)/);
    if (m && new RegExp('\\n\\s*' + esc(m[1]) + ':\\s*-?\\d').test(code)) return { code: H.setSetting(code, m[1], m[2]), reply: `「${m[1]}」改成 ${m[2]} 了。` };
    return null;
  }

  function run(code, prompt) {
    const p = String(prompt || '').trim();
    if (!p) return null;
    const chart = doChart(code, p); if (chart) return chart;
    const prod = doProduct(code, p); if (prod) return prod;
    const back = /(回去|返回|回到|退出|离开|出来)/.test(p);
    if ((/商店|商城/.test(p) && (back || STUCK.test(p))) || (/(回去|返回)的?按钮/.test(p) && isOn(code, '商店'))) return addBack(code);
    if (/再玩一次|再来一[次局]|再玩一[局次]|重新玩|重玩/.test(p) || (/结束画面|结束页|结束界面/.test(p) && STUCK.test(p))) return addReplay(code);
    if (/时间到/.test(p) && STUCK.test(p)) return addEnd(code);
    // 一句话里要好几个画面：「加开始画面、结束画面和商店」
    const want = [/开始画面|开始页|开始界面|封面/.test(p) && addStart, /结束画面|结束页|结束界面|结算|(结束|时间到).{0,6}(显示|看到?)(分数|得分)/.test(p) && addEnd, /商店|商城|小卖部/.test(p) && addShop].filter(Boolean);
    if (want.length) {
      let c = code; const said = [];
      for (const f of want) { const r = f(c); if (r.code) c = r.code; said.push(r.reply); }
      return { code: c === code ? null : c, reply: said.join('') };
    }
    return doTime(code, p) || doGeneric(code, p);
  }

  // 先说计划：照流程图的话，一行一步
  function plan(code, prompt) {
    const ch = parseChart(String(prompt || ''));
    if (!ch || !ch.rows.length) return null;
    const open = openOf(ch.rows), pr = problems(ch.rows, open);
    const steps = ['做这几个画面：' + SCREENS.filter(s => open.has(s)).join('、')].concat(ch.rows.map(r => `${r.从}：${r.按 === '时间到' ? '时间到' : '按「' + r.按 + '」'} → ${r.到}`));
    if (pr.length) steps.push('注意：' + pr[0]);
    return { reply: '我打算照流程图这样做，你看行不行？', plan: steps };
  }

  return { key: 'flow', is: code => code.includes('const 流程 = ['), run, plan, CAN };
});
// ----- mock-s2/20-coins.js -----
// 第 20 课《有虫的接金币》：游戏卡住了、白屏了怎么办？
// 三只虫只在极端情况才出现（0 条命、钱不够、两个键一起按）。孩子说清楚了、或者把报错交给精灵，才修那一只；别的不动。
S2PARTS.push(function (H) {
  'use strict';
  const N = H.NUM, CN = '零一两二三四五六七八九十';
  const lineOf = (c, s) => { const i = c.indexOf(s); return i < 0 ? -1 : c.slice(0, i).split('\n').length; };

  // ---------- 三只虫：还在不在、在第几行、怎么修 ----------
  const BUG1 = /(\n[ \t]*)心们\[心们\.length - 1\]\.跳一下 = 20;/;
  const BUG2 = /(\n[ \t]*)金币 = 金币 - 设置\.护盾价钱;/;
  const BUG3 = 'const 方向表 = { 左: -1, 右: 1 };';
  const BUGS = {
    1: {
      has: c => BUG1.test(c),
      line: c => lineOf(c, '心们[心们.length - 1].跳一下 = 20;'),
      fix: c => c.replace(BUG1, (m, a) => a + 'if (心们.length > 0) 心们[心们.length - 1].跳一下 = 20;'),
      reply: '找到了：最后一颗心去掉以后，程序还想让『最后一颗心』跳一下，可是已经一颗都没有了。改好了，再试一次 0 条命。'
    },
    2: {
      has: c => BUG2.test(c) && !c.includes('if (金币 < 设置.护盾价钱)'),
      line: c => lineOf(c, '金币 = 金币 - 设置.护盾价钱;'),
      fix: c => c.replace(BUG2, (m, a) => a + 'if (金币 < 设置.护盾价钱) { 说一句("钱不够，还差 " + (设置.护盾价钱 - 金币) + " 个金币"); return; }' + a + '金币 = 金币 - 设置.护盾价钱;'),
      reply: '找到了：买护盾时没先看钱够不够就付了钱。现在钱不够会告诉你还差几个，再用 0 个金币试试。'
    },
    3: {
      has: c => c.includes(BUG3),
      line: c => lineOf(c, 'const 方向表 = {'),
      fix: c => c.replace(BUG3, 'const 方向表 = { 左: -1, 右: 1, 左右: 0 };'),
      reply: '找到了：两个键一起按时，方向表里查不到「左右」，比特的位置就算坏了。现在一起按会站着不动。'
    }
  };
  const DONE = '这个已经修好了，再试一次看看。';
  const ASK = '哪里不对？你做了什么、结果怎样？要是有红色的报错，把它也告诉我。';
  function fixOne(code, n) {
    const b = BUGS[n];
    if (!b.has(code)) return { code: null, reply: DONE };
    return { code: b.fix(code), reply: b.reply };
  }

  // ---------- 孩子怎么描述这三只虫 ----------
  const PASTED = /TypeError|ReferenceError|SyntaxError|RangeError|Uncaught|Cannot (set|read) propert|undefined|is not an object|is not a function|is not defined|跳一下/i;
  const ERR1 = /跳一下|Cannot set propert|undefined/i;
  const SAY1 = /命没了|命都没了|心没了|心都没了|没命|没有命|命用完|命掉光|心掉光|没有心|最后一[条颗个]?(命|心)|(^|[^\d])[0零]\s*[条颗个]?\s*(命|心)|命.{0,6}(没了|没有了|用完|掉光|[为是成]\s*[0零])|心.{0,6}(没了|没有了|掉光|不见)/;
  const SAY1_WEAK = /卡住|卡死|卡了|卡在|不动了|动不了|白屏|黑屏|死机|定住|冻住|停住|画面不动|没反应/;
  const SAY2 = /钱不够|没钱|不够钱|没有钱|金币不够|没有金币|负数|负的|变成?负|-\s*\d|欠|也能买|还能买|照样能?买|也可以买|还可以买/;
  const SAY3 = /两个(键|按钮|方向键?|箭头)|两(根|个|只)手指|一起按|同时按|一块按|一齐按|左右.{0,6}(一起|同时)|(一起|同时).{0,6}(左右|◀|▶)|(比特|小狗|狗|主角)[^，。,！!命心]{0,6}(不见|消失|看不见|找不到|跑丢|隐身|跑没)|NaN/i;
  const SAY3_LOOSE = /(不见|消失)了/;
  const VAGUE = /坏了|有\s*bug|有虫|有问题|不对劲?|出错|出问题|修一?下|修好|帮我修|修修|不好玩|不正常|怪怪的|奇怪|不行/i;

  function whichBugs(p) {
    const s = [];
    if (SAY1.test(p)) s.push(1);
    if (SAY2.test(p)) s.push(2);
    if (SAY3.test(p) || (SAY3_LOOSE.test(p) && !/心|命|金币|钱|护盾|炸弹/.test(p))) s.push(3);
    if (!s.length && SAY1_WEAK.test(p)) s.push(1);
    return s;
  }

  // ---------- 设置：一开始几条命、护盾价钱、走路快慢、炸弹多少、掉得多少 ----------
  function settings(code, p) {
    let c = code, m; const said = [];
    const gap = '[^，。,！!\\d' + CN + ']{0,4}';
    if ((m = p.match(new RegExp('(?:一开始|开局|开始|改成|变成|设成|调成|换成|给|要|有)' + gap + N + '\\s*[条颗个]\\s*(?:命|心)'))) ||
        (m = p.match(new RegExp('(?:命|心)[^，。,！!]{0,6}?(?:改成|变成|设成|调成|换成|有)\\s*' + N))) ||
        (m = p.match(new RegExp('^\\s*' + N + '\\s*条命\\s*[。！!]?\\s*$')))) {
      const n = Math.max(1, Math.min(20, H.toNum(m[1]) || 3));
      c = H.setSetting(c, '一开始几条命', String(n)); said.push(`一开始有 ${n} 条命了。`);
    }
    if ((m = p.match(new RegExp('护盾[^，。,！!\\d' + CN + ']{0,8}' + N + '\\s*[个块枚]?\\s*(?:金币|钱|块)?'))) && /价|钱|金币|块|卖|改|变|要/.test(p)) {
      const n = Math.max(0, Math.min(99, H.toNum(m[1]) || 0));
      c = H.setSetting(c, '护盾价钱', String(n)); said.push(`护盾现在要 ${n} 个金币。`);
    } else if (/护盾[^，。,！!]{0,6}(便宜|太贵)/.test(p)) { c = H.setSetting(c, '护盾价钱', '3'); said.push('护盾便宜了，3 个金币一个。'); }
    else if (/护盾[^，。,！!]{0,6}(贵一点|贵点|太便宜)/.test(p)) { c = H.setSetting(c, '护盾价钱', '8'); said.push('护盾贵了，8 个金币一个。'); }
    if (/(走|跑|移动|比特|速度)[^，。,！!]{0,6}(快一点|快点|快些|更快|太慢)/.test(p)) { c = H.setSetting(c, '移动速度', '12'); said.push('比特走得快一点了。'); }
    else if (/(走|跑|移动|比特|速度)[^，。,！!]{0,6}(慢一点|慢点|慢些|更慢|太快)/.test(p)) { c = H.setSetting(c, '移动速度', '5'); said.push('比特走得慢一点了。'); }
    if (/不要炸弹|没有炸弹|去掉炸弹|炸弹去掉/.test(p)) { c = H.setSetting(c, '炸弹出现机会', '0'); said.push('不掉炸弹了。'); }
    else if (/炸弹[^，。,！!]{0,6}(多一点|多点|多些|更多|太少)/.test(p)) { c = H.setSetting(c, '炸弹出现机会', '0.5'); said.push('炸弹多了，一半是炸弹。'); }
    else if (/炸弹[^，。,！!]{0,6}(少一点|少点|少些|更少|太多)/.test(p)) { c = H.setSetting(c, '炸弹出现机会', '0.15'); said.push('炸弹少一点了。'); }
    if (!/炸弹/.test(p)) {
      if (/掉(得|的)?[^，。,！!]{0,4}(多一点|快一点|多点|快点|更多|更快)|东西[^，。,！!]{0,4}(多一点|多点)/.test(p)) { c = H.setSetting(c, '掉东西间隔帧', '25'); said.push('东西掉得多一点了。'); }
      else if (/掉(得|的)?[^，。,！!]{0,4}(少一点|慢一点|少点|慢点)|东西[^，。,！!]{0,4}(少一点|少点)/.test(p)) { c = H.setSetting(c, '掉东西间隔帧', '60'); said.push('东西掉得少一点了。'); }
    }
    if (!said.length && (m = p.match(/把?\s*([一-龥]{1,8}?)\s*(?:改成|变成|调成|设成|设为|改为|调到)\s*(-?\d+(?:\.\d+)?)/)) && H.hasSetting(c, m[1])) {
      c = H.setSetting(c, m[1], m[2]); said.push(`「${m[1]}」改成 ${m[2]} 了。`);
    }
    return said.length && c !== code ? { code: c, reply: said.join(' ') } : null;
  }

  function run(code, prompt, mode, error) {
    const p = String(prompt || ''), err = String(error || '').trim();
    // 1. 带着报错来的：看报错说了什么
    if (err || PASTED.test(p)) {
      if (ERR1.test(err + '\n' + p)) return fixOne(code, 1);
      return { code: null, reply: '这个报错我还看不懂。你做了什么、结果怎样？说给我听听。' };
    }
    // 2. 说了第几行（报错里写的行号）
    const ln = p.match(/第\s*(\d+)\s*行/);
    if (ln) {
      const at = [1, 2, 3].filter(n => BUGS[n].line(code) > 0 && Math.abs(BUGS[n].line(code) - +ln[1]) <= 1);
      if (at.length === 1) return fixOne(code, at[0]);
    }
    // 3. 说清楚了是哪只虫
    const s = whichBugs(p);
    if (s.length > 1) return { code: null, reply: '你说了好几个问题，一次修一个吧：先修哪一个？' };
    if (s.length === 1) return fixOne(code, s[0]);
    // 4. 改设置
    const st = settings(code, p);
    if (st) return st;
    // 5. 太模糊：反问
    if (VAGUE.test(p)) return { code: null, reply: ASK };
    return null;
  }

  return {
    key: 'coins',
    is: code => code.includes('function 买护盾()'),
    run,
    CAN: '修虫（说清楚做了什么、结果怎样，或者把红色报错告诉我）：0 条命卡住、钱不够也能买护盾、两个键一起按比特不见；改设置：一开始几条命、护盾几个金币、走快走慢、炸弹多少、东西掉得多少'
  };
});
  return S2PARTS;
});
