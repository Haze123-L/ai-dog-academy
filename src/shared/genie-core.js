// ================= 代码精灵：给大模型的话、读懂回答、把修改套到代码上 =================
// 服务器和在线试玩版共用。真正去调大模型的部分在 server/genie.js（试玩版里在页面上）。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GenieCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SYSTEM = `你是「代码精灵」，AI 驯狗学院里帮 8～12 岁孩子改小游戏的编程助手。孩子用口语告诉你想让游戏变成什么样，你直接改代码。

怎么做：
1. 孩子想到的都尽量做出来：激光、二段跳、下雪、会飞的蛋糕都可以。一律卡通化，不做血腥、恐怖、脏话，也不放真实人名。遇到不合适的要求，就做一个合适的版本，并在回复里说明换成了什么。
2. 孩子说得模糊时，按最可能的意思做出来，再在回复里用半句话问「是不是想要……」。完全猜不出来才不改代码、只提问。
3. 只改需要改的地方，改完游戏必须还能玩。不要引用外部文件、网络地址、图片链接；图案用 emoji 或 canvas 画。
   emoji 里没有的东西，不要拿长得不一样的 emoji 凑数，要用 canvas 画出它真正的样子。比如「金元宝」= 中国古代船形金锭（金黄色，底部像小船，两端向上翘起，中间隆起一个圆顶），不要用 💰（钱袋）、🪙（硬币）或黄色圆形代替；游戏里有 画金元宝() 就直接用它（东西写 画法: "金元宝"）。同理：灯笼、粽子、月饼、红包等没有准确 emoji 的，也用 canvas 画。
4. 游戏在平板上玩，没有键盘：新的操作必须能用手指点（比如在画面上画一个按钮），可以同时支持键盘。
5. 代码保持现在的中文命名和注释风格；新加的可调数值放进「设置」并写中文注释，方便孩子以后说「把 xx 改成 3」。
6. 给孩子的回复：一到两句口语，说清楚改了什么、怎么玩，不超过 50 个字；不说「小朋友」，不说教。`;

  const MODES = {
    make: '',
    bug: `
【抓虫模式】孩子在找游戏里的虫子（bug）。
- 如果他没说清楚哪里不对（他做了什么、想要什么、结果却怎样），不要改代码，只用一句话反问他，例如「哪里不对呀？你做了什么、想要它怎样、结果却怎样？」。
- 说清楚了才修，而且只修他说的那一个问题，别的虫子不要顺手修掉。修好后告诉他再测一遍。`,
    trick: `
【捣蛋卡模式】孩子抽到一张捣蛋卡，要按卡上的话故意把自己的游戏改出一个问题，让对方队的同学来找。照他说的改，不要修别的，也不要在代码注释里写出改了什么。回复只说「捣蛋成功！交换以后看对方能不能找到」。`,
    blank: `
【新游戏模式】这是一个空白游戏。孩子描述想做的游戏时，直接给出完整文件（用 <file>），做一个能在平板上用手指玩的单文件 HTML 小游戏：一个 960×540 的 canvas，有开始、得分和结束；顶部 <h1> 写游戏名字。`
  };

  const FORMAT = `
输出格式（严格遵守，不要加别的说明文字）：
<reply>给孩子的话</reply>
然后是一个或多个修改块：
<edit>
<find>原代码里连续的一段，和原文一模一样（包括空格和换行），要长到在文件里只出现一次</find>
<replace>改成的新内容</replace>
</edit>
改动特别大时（比如从头做新游戏），不用 edit，直接给完整文件：
<file>完整的 HTML</file>
只提问、不改代码时，只输出 <reply>，而且回复里不能说「改好了 / 换成了 / 加了」。`;

  // 游戏说明书（第 19 节起）：孩子写下的规则，精灵每次先读，改完逐条对照
  const SPEC = `
【游戏说明书】孩子给这个游戏写了说明书（见下面）。每次改之前先读一遍；这次的改动不能弄坏说明书上的任何一条。改完在心里逐条对照，回复里用半句话说"说明书上的规则都还在"；如果孩子这次要的和说明书冲突，先照这次的做，并在回复里提醒他改说明书。`;
  const specText = spec => (spec || []).map(x => String(x || '').trim()).filter(Boolean).map((x, i) => `${i + 1}. ${x}`).join('\n');
  function buildMessages({ game, code, prompt, history, mode, error, version, spec, plan }) {
    const st = specText(spec);
    const sys = SYSTEM + (MODES[mode] || '') + (st ? SPEC : '') + FORMAT;
    const hist = (history || []).slice(-4).map(h => `- 孩子：${h.prompt}\n  精灵：${h.reply}`).join('\n');
    let user = `【游戏】${game || '小游戏'}（现在是第 ${version || 1} 版）\n<code>\n${code}\n</code>\n`;
    if (st) user += `【游戏说明书】\n${st}\n`;
    if (hist) user += `【之前的对话】\n${hist}\n`;
    if (error) user += `【游戏运行时报错】${error}\n`;
    if (plan && plan.length) user += `【孩子已经同意的计划：照这几步改，不多做也不少做】\n${plan.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n`;
    user += `【孩子现在说】${prompt}`;
    return [{ role: 'system', content: sys }, { role: 'user', content: user }];
  }

  // 先说计划（第 16 节起）：不改代码，先用几步说清打算怎么改，孩子同意了再动手
  const PLAN_FORMAT = `
【先说计划】这一次先不要改代码。用 2～4 步说你打算怎么改，每一步一句孩子听得懂的话（不说代码词，比如"把红砖改成要打 3 下才碎"），写清楚改哪里、改成什么。孩子说得模糊时，按你最可能的理解写计划，让孩子来判断对不对。
输出格式（严格遵守，不要加别的说明文字）：
<reply>一句话，比如"我打算这样改，你看行不行？"</reply>
<plan>
<step>第一步</step>
<step>第二步</step>
</plan>
完全猜不出孩子想要什么时，只输出 <reply> 反问他。`;
  function buildPlanMessages({ game, code, prompt, history, spec }) {
    const m = buildMessages({ game, code, prompt, history, mode: 'make', spec });
    m[0].content = SYSTEM + (specText(spec) ? SPEC : '') + PLAN_FORMAT;
    return m;
  }
  function parsePlan(text) {
    text = String(text || '');
    const r = text.match(/<reply>([\s\S]*?)<\/reply>/);
    const steps = []; const re = /<step>([\s\S]*?)<\/step>/g; let m;
    while ((m = re.exec(text))) { const s = m[1].trim(); if (s) steps.push(s.slice(0, 80)); }
    return { reply: (r ? r[1] : text.replace(/<[^>]+>/g, '')).trim().slice(0, 120), plan: steps.length ? steps.slice(0, 5) : null };
  }

  function stripFence(t) {
    t = String(t || '');
    const m = t.match(/^\s*```[a-zA-Z]*\n([\s\S]*?)\n```\s*$/);
    return m ? m[1] : t;
  }
  function unescapeEntities(t) {   // 有些模型会把 < > 转义
    return /&lt;|&gt;/.test(t) && !/[<>]/.test(t) ? t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : t;
  }

  function parseReply(text) {
    text = String(text || '');
    const out = { reply: '', edits: [], file: null };
    const r = text.match(/<reply>([\s\S]*?)<\/reply>/);
    out.reply = (r ? r[1] : text.replace(/<edit>[\s\S]*?<\/edit>/g, '').replace(/<file>[\s\S]*?<\/file>/g, '')).trim().slice(0, 200);
    const re = /<edit>\s*<find>([\s\S]*?)<\/find>\s*<replace>([\s\S]*?)<\/replace>\s*<\/edit>/g;
    let m;
    while ((m = re.exec(text))) out.edits.push({ find: unescapeEntities(trimNl(m[1])), replace: unescapeEntities(trimNl(m[2])) });
    const f = text.match(/<file>([\s\S]*?)<\/file>/) || text.match(/<file>([\s\S]*)$/);
    if (f) out.file = stripFence(f[1]).trim();
    if (!r && !out.edits.length && !out.file && /<html|<!doctype/i.test(text)) { out.file = stripFence(text.slice(text.search(/<!doctype|<html/i))).trim(); out.reply = '我重新写了游戏。'; }
    return out;
  }
  function trimNl(s) { return s.replace(/^\n/, '').replace(/\n$/, ''); }

  // 把一段修改套到代码上：先找一模一样的；找不到就忽略每行首尾空格再找
  function applyOne(code, e) {
    if (!e.find) return null;
    let i = code.indexOf(e.find);
    if (i >= 0) return code.slice(0, i) + e.replace + code.slice(i + e.find.length);
    const lines = code.split('\n'), want = e.find.split('\n').map(l => l.trim()).filter((l, k, a) => !(l === '' && (k === 0 || k === a.length - 1)));
    if (!want.length) return null;
    for (let a = 0; a + want.length <= lines.length; a++) {
      let ok = true;
      for (let k = 0; k < want.length; k++) if (lines[a + k].trim() !== want[k]) { ok = false; break; }
      if (ok) {
        const indent = (lines[a].match(/^\s*/) || [''])[0];
        const rep = e.replace.split('\n').map((l, k) => k === 0 ? indent + l.replace(/^\s*/, '') : l);
        return lines.slice(0, a).concat(rep, lines.slice(a + want.length)).join('\n');
      }
    }
    return null;
  }
  function applyEdits(code, edits) {
    const failed = []; let cur = code;
    edits.forEach((e, i) => { const n = applyOne(cur, e); if (n == null) failed.push(i); else cur = n; });
    return { code: cur, failed };
  }

  function validate(code) {
    if (!code || code.length < 80) return '代码是空的';
    if (code.length > 400000) return '代码太长了';
    if (!/<script/i.test(code)) return '代码里没有程序';
    return null;
  }

  // 改了哪些行（给大屏的「精灵改的代码」用）
  function changedLines(a, b, max = 6) {
    const A = a.split('\n'), B = b.split('\n');
    let s = 0; while (s < A.length && s < B.length && A[s] === B[s]) s++;
    let ea = A.length - 1, eb = B.length - 1;
    while (ea >= s && eb >= s && A[ea] === B[eb]) { ea--; eb--; }
    const setA = new Set(A.slice(s, ea + 1));
    const added = [];
    for (let i = s; i <= eb; i++) if (!setA.has(B[i]) && B[i].trim()) added.push({ n: i + 1, t: B[i] });
    return { from: s + 1, to: eb + 1, count: added.length, lines: added.slice(0, max) };
  }

  // 编舞：把一句话变成一串动作
  const DANCE_SYSTEM = `你是机器狗「比特」的编舞大脑。孩子用一句话描述想要的舞，你从下面的动作里挑，排成一段舞。
能用的动作（只能用这些）：站起来、坐下、趴下、摇尾巴、转圈、握手、跳一跳、鞠躬、叫一声、等一下。
心情只能是：开心、困了、生气、害羞、欢迎（决定快慢和表情）。
一段舞 3～8 个动作；孩子说「重复几次」就写 repeat。不合适的要求就编一段合适的舞。
输出格式（严格遵守）：
<reply>一句话告诉孩子你编了什么，不超过 30 个字</reply>
<dance mood="开心" repeat="1">跳一跳, 摇尾巴, 转圈</dance>`;
  function buildDanceMessages({ prompt, history }) {
    const hist = (history || []).slice(-3).map(h => `- 孩子：${h.prompt}\n  比特：${h.seq.join('、')}`).join('\n');
    return [{ role: 'system', content: DANCE_SYSTEM }, { role: 'user', content: (hist ? `之前编过：\n${hist}\n` : '') + `孩子说：${prompt}` }];
  }
  function parseDance(text, ACTS, MOODS) {
    text = String(text || '');
    const r = text.match(/<reply>([\s\S]*?)<\/reply>/), d = text.match(/<dance([^>]*)>([\s\S]*?)<\/dance>/);
    if (!d) return null;
    const attrs = d[1], mood = (attrs.match(/mood="([^"]+)"/) || [])[1], rep = +((attrs.match(/repeat="(\d+)"/) || [])[1] || 1);
    const seq = d[2].split(/[,，、\s]+/).map(s => s.trim()).filter(s => ACTS.includes(s)).slice(0, 12);
    if (!seq.length) return null;
    return { reply: (r ? r[1] : '').trim().slice(0, 80), seq, mood: MOODS[mood] ? mood : '开心', repeat: Math.max(1, Math.min(4, rep)) };
  }

  // 平板上运行游戏时套的一层：禁止联网；出错时告诉外面
  const CSP = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'">`;
  const ERR = `<script>window.onerror=function(m,s,l){try{parent.postMessage({gameError:String(m),line:l},'*')}catch(e){}};window.addEventListener('unhandledrejection',function(e){try{parent.postMessage({gameError:String(e.reason)},'*')}catch(x){}});<\/script>`;
  function wrapForRun(code) {
    // 可信策略必须先于任何用户内容，不能依赖用户提供的 head 标签位置。
    return '<!doctype html><html><head>' + CSP + ERR + '</head><body>' + code + '</body></html>';
  }

  // 角色卡 → 给机器狗大脑的系统提示词
  function buildPersona(c, ACTS) {
    c = c || {};
    const rules = (c.rules || []).filter(r => r && r.when && (r.do || r.say)).map(r => `- 听到/看到「${r.when}」：${r.do ? `做「${r.do}」` : ''}${r.do && r.say ? '，' : ''}${r.say ? `说「${r.say}」` : ''}`).join('\n');
    return `你是一只叫「${c.name || '比特'}」的 AI 机器狗，是孩子的${c.identity || '好朋友'}。
性格：${c.trait || '活泼'}。
${c.extra ? '其他设定：' + c.extra.replace(/[。.！!？?]?$/, '。') + '\n' : ''}${c.talk ? '说话方式：' + c.talk + '。\n' : ''}${c.catch ? '口头禅：「' + c.catch + '」（偶尔说，别每句都说）。\n' : ''}${rules ? '你的口令规则（一定照做；听到相近的说法也算）：\n' + rules + '\n' : ''}和你聊天的是 8～12 岁的孩子。每次只说一两句，口语、有趣，符合你的性格。
孩子问知识问题，用孩子听得懂的话简单回答；不知道就说不知道，不要编。
不说脏话，不讲吓人、危险的内容，不问孩子的家庭住址、电话等隐私。
你能做的动作：${(ACTS || []).join('、')}。想做动作时，在回答最后写【动作：动作名】，一次最多两个。`;
  }
  function parsePersonaReply(text, ACTS) {
    text = String(text || '').trim();
    const acts = []; const re = /【动作[:：]\s*([^】]+)】/g; let m;
    while ((m = re.exec(text))) m[1].split(/[,，、\s]+/).forEach(a => { if ((ACTS || []).includes(a.trim())) acts.push(a.trim()); });
    return { reply: text.replace(re, '').trim().slice(0, 200), acts: acts.slice(0, 3) };
  }

  // ---------- 会说话的游戏角色（第二季第 21、22 课）：孩子写的角色卡 → 给大模型的系统提示词 ----------
  function buildNpc(c, kind) {
    c = c || {};
    const list = a => (a || []).map(x => String(x || '').trim()).filter(Boolean).map(x => '- ' + x).join('\n');
    const base = `来跟你说话的是玩游戏的孩子。用一两句话回答，不超过 40 个字。
始终用这个角色的身份说话，不说自己是 AI、模型或程序。
不说脏话，不讲吓人、危险的内容，不问玩家的家庭住址、电话、学校等隐私。`;
    if (kind === 'gate') {
      const rules = list(c.rules);
      return `你在一个孩子做的小游戏里，扮演守门的「${c.name || '门卫'}」。门后面是宝藏。
你心里记着开门口令：「${c.secret || ''}」。玩家完整说出口令，你就开门，并在回答最后写【开门】。
${c.hello ? '你的开场白：' + c.hello + '\n' : ''}${rules ? '你的主人给你定的规矩（一定要遵守）：\n' + rules + '\n' : ''}${base}`;
    }
    const knows = list(c.knows), rules = list(c.rules);
    return `你在一个孩子做的小游戏里，扮演「${c.name || '小镇居民'}」，身份是${c.role || '小镇居民'}，性格${c.trait || '热情'}。
${c.talk ? '说话的样子：' + c.talk + '。\n' : ''}${c.hello ? '开场白：' + c.hello + '\n' : ''}${knows ? '你知道这些事：\n' + knows + '\n' : ''}${rules ? '你的规矩（一定要遵守）：\n' + rules + '\n' : ''}只说你知道的事；不知道的，用角色的口气说不知道，不要编。
${base}`;
  }
  const npcNorm = s => String(s || '').replace(/[\s，。！？、,.!?「」“”"'：:；;（）()【】\-—~～·]/g, '').toLowerCase();
  function parseNpcReply(text, c, kind) {
    text = String(text || '').trim();
    const open = kind === 'gate' && /【开门】/.test(text);
    const reply = text.replace(/【开门】/g, '').trim().slice(0, 160);
    const leaked = kind === 'gate' && !!(c && c.secret) && npcNorm(reply).includes(npcNorm(c.secret));
    return { reply, open, leaked };
  }


  // 没有对应 emoji 的东西：仅对这次新增的替代符号重试，避免已有无关钱袋触发误报
  const EMOJI_TRAPS = [
    { word: /元宝/, bad: ['💰', '🪙', '💴', '💵', '🟡'], tip: '金元宝是船形金锭（底部像小船、两端向上翘、中间隆起圆顶），请用 canvas 画（游戏里有 画金元宝() 就用它），不要用钱袋、硬币或黄色圆形 emoji' }
  ];
  function emojiTrap(prompt, oldCode, newCode) {
    const p = String(prompt || '');
    for (const t of EMOJI_TRAPS) {
      if (!t.word.test(p)) continue;
      const count = (text, emoji) => String(text || '').split(emoji).length - 1;
      const hit = t.bad.filter(e => count(newCode, e) > count(oldCode, e));
      if (hit.length) return `孩子说的是「${p.slice(0, 30)}」，你用了 ${hit.join(' ')} 来代替。${t.tip}。请重新输出修改。`;
    }
    return null;
  }

  return { emojiTrap, SYSTEM, MODES, buildMessages, buildPlanMessages, parsePlan, specText, buildNpc, parseNpcReply, npcNorm, buildPersona, parsePersonaReply, parseReply, applyEdits, validate, changedLines, buildDanceMessages, parseDance, wrapForRun };
});
