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
