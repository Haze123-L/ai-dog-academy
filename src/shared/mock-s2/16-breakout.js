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
